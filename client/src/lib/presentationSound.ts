/** Präsentations-Sound: Einstellungen (localStorage) + Abspielen über Web Audio. */

export type PresentationSoundId =
  | 'chime'
  | 'ping'
  | 'double'
  | 'attention'
  | 'alert'
  | 'soft'
  | 'wood'
  | 'rise'
  | 'classbell';

export type PresentationSoundDuration = 'normal' | 'long' | 'extra';

export type PresentationSoundSettings = {
  soundId: PresentationSoundId;
  /** 0–1 */
  volume: number;
  duration: PresentationSoundDuration;
};

export const PRESENTATION_SOUND_STORAGE_KEY = 'jm-presentation-sound-v1';

export const PRESENTATION_SOUND_PRESETS: Array<{
  id: PresentationSoundId;
  label: string;
  hint: string;
}> = [
  { id: 'attention', label: 'Aufmerksamkeit', hint: 'Stark, aufsteigend' },
  { id: 'alert', label: 'Alarm', hint: 'Wiederholt, laut' },
  { id: 'classbell', label: 'Schulglocke', hint: 'Lang, durchdringend' },
  { id: 'chime', label: 'Glocke', hint: 'Klar und hell' },
  { id: 'double', label: 'Doppel', hint: 'Zwei kräftige Töne' },
  { id: 'ping', label: 'Ping', hint: 'Ein langer Ton' },
  { id: 'rise', label: 'Anstieg', hint: 'Langes Glissando' },
  { id: 'soft', label: 'Sanft', hint: 'Gedämpft, länger' },
  { id: 'wood', label: 'Holz', hint: 'Deutliches Klacken' },
];

export const PRESENTATION_SOUND_DURATIONS: Array<{
  id: PresentationSoundDuration;
  label: string;
  factor: number;
}> = [
  { id: 'normal', label: 'Normal', factor: 1 },
  { id: 'long', label: 'Lang', factor: 1.75 },
  { id: 'extra', label: 'Sehr lang', factor: 2.6 },
];

const DEFAULT_SETTINGS: PresentationSoundSettings = {
  soundId: 'attention',
  volume: 0.9,
  duration: 'long',
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0, v));
}

function isSoundId(v: unknown): v is PresentationSoundId {
  return typeof v === 'string' && PRESENTATION_SOUND_PRESETS.some((p) => p.id === v);
}

function isDuration(v: unknown): v is PresentationSoundDuration {
  return v === 'normal' || v === 'long' || v === 'extra';
}

function durationFactor(d: PresentationSoundDuration): number {
  return PRESENTATION_SOUND_DURATIONS.find((x) => x.id === d)?.factor ?? 1;
}

export function loadPresentationSoundSettings(): PresentationSoundSettings {
  try {
    const raw = localStorage.getItem(PRESENTATION_SOUND_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PresentationSoundSettings>;
    return {
      soundId: isSoundId(parsed.soundId) ? parsed.soundId : DEFAULT_SETTINGS.soundId,
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume),
      duration: isDuration(parsed.duration) ? parsed.duration : DEFAULT_SETTINGS.duration,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function savePresentationSoundSettings(next: PresentationSoundSettings): void {
  const clean: PresentationSoundSettings = {
    soundId: isSoundId(next.soundId) ? next.soundId : DEFAULT_SETTINGS.soundId,
    volume: clampVolume(next.volume),
    duration: isDuration(next.duration) ? next.duration : DEFAULT_SETTINGS.duration,
  };
  try {
    localStorage.setItem(PRESENTATION_SOUND_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('jm-presentation-sound-changed', { detail: clean }));
  } catch {
    // ignore quota / private mode
  }
}

type OscType = OscillatorType;

type Step = {
  f: number;
  start: number;
  dur: number;
  type?: OscType;
  rampTo?: number;
  /** relative peak 0–1 within the step envelope */
  peak?: number;
};

function playPattern(ctx: AudioContext, master: GainNode, t0: number, steps: Step[]) {
  for (const s of steps) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const peak = Math.max(0.15, Math.min(1, s.peak ?? 1));
    o.type = s.type || 'sine';
    o.frequency.setValueAtTime(s.f, t0 + s.start);
    if (s.rampTo != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, s.rampTo), t0 + s.start + s.dur);
    }
    const attack = Math.min(0.04, s.dur * 0.12);
    const release = Math.min(0.18, s.dur * 0.35);
    g.gain.setValueAtTime(0.0001, t0 + s.start);
    g.gain.exponentialRampToValueAtTime(peak, t0 + s.start + attack);
    g.gain.setValueAtTime(peak, t0 + s.start + Math.max(attack, s.dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.start + s.dur);
    o.connect(g);
    g.connect(master);
    o.start(t0 + s.start);
    o.stop(t0 + s.start + s.dur + 0.04);
  }
}

function scaleSteps(steps: Step[], factor: number): Step[] {
  if (factor === 1) return steps;
  return steps.map((s) => ({
    ...s,
    start: s.start * factor,
    dur: s.dur * factor,
  }));
}

function buildSteps(id: PresentationSoundId): Step[] {
  switch (id) {
    case 'ping':
      return [{ f: 932, start: 0, dur: 0.55, peak: 1 }];
    case 'double':
      return [
        { f: 698.46, start: 0, dur: 0.28, peak: 1 },
        { f: 932, start: 0.34, dur: 0.42, peak: 1 },
      ];
    case 'attention':
      return [
        { f: 392, start: 0, dur: 0.22, peak: 0.85 },
        { f: 523.25, start: 0.24, dur: 0.24, peak: 0.95 },
        { f: 659.25, start: 0.5, dur: 0.28, peak: 1 },
        { f: 784, start: 0.82, dur: 0.55, peak: 1 },
        { f: 784, start: 1.5, dur: 0.45, peak: 0.9 },
      ];
    case 'alert':
      return [
        { f: 880, start: 0, dur: 0.22, type: 'square', peak: 0.85 },
        { f: 660, start: 0.26, dur: 0.22, type: 'square', peak: 0.85 },
        { f: 880, start: 0.52, dur: 0.22, type: 'square', peak: 0.9 },
        { f: 660, start: 0.78, dur: 0.22, type: 'square', peak: 0.9 },
        { f: 988, start: 1.1, dur: 0.55, type: 'square', peak: 1 },
      ];
    case 'classbell':
      return [
        { f: 1046.5, start: 0, dur: 0.7, peak: 1 },
        { f: 1318.5, start: 0.12, dur: 0.85, peak: 0.75 },
        { f: 1046.5, start: 1.05, dur: 0.7, peak: 1 },
        { f: 1318.5, start: 1.18, dur: 0.95, peak: 0.7 },
      ];
    case 'soft':
      return [{ f: 523.25, start: 0, dur: 0.85, type: 'triangle', peak: 0.7 }];
    case 'wood':
      return [
        { f: 240, start: 0, dur: 0.12, type: 'square', peak: 1 },
        { f: 190, start: 0.14, dur: 0.14, type: 'square', peak: 0.9 },
        { f: 240, start: 0.34, dur: 0.16, type: 'square', peak: 1 },
      ];
    case 'rise':
      return [{ f: 180, start: 0, dur: 1.1, type: 'sine', rampTo: 880, peak: 1 }];
    case 'chime':
    default:
      return [
        { f: 784, start: 0, dur: 0.55, peak: 1 },
        { f: 1046.5, start: 0.12, dur: 0.75, peak: 0.95 },
        { f: 1318.5, start: 0.28, dur: 0.9, peak: 0.7 },
      ];
  }
}

/** Spielt den konfigurierten (oder übergebenen) Präsentations-Sound. */
export function playPresentationSound(override?: Partial<PresentationSoundSettings>): void {
  const Win = typeof window !== 'undefined' ? window : null;
  if (!Win) return;
  const AC = Win.AudioContext || (Win as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;

  const settings = { ...loadPresentationSoundSettings(), ...override };
  const volume = clampVolume(settings.volume);
  if (volume <= 0.001) return;

  const ctx = new AC();
  const master = ctx.createGain();
  // Deutlich lauter: bis ~0.95 bei voller Lautstärke
  master.gain.value = 0.18 + volume * 0.77;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime;
  const factor = durationFactor(settings.duration);
  const steps = scaleSteps(buildSteps(settings.soundId), factor);

  try {
    // Bei Aufmerksamkeit/Alarm zusätzlich eine zweite Schicht für Durchsetzungskraft
    if (settings.soundId === 'attention' || settings.soundId === 'alert' || settings.soundId === 'classbell') {
      const layer = ctx.createGain();
      layer.gain.value = 0.55;
      layer.connect(master);
      playPattern(ctx, layer, t0, steps.map((s) => ({ ...s, type: s.type || 'triangle', peak: (s.peak ?? 1) * 0.7 })));
    }
    playPattern(ctx, master, t0, steps);
  } catch {
    // ignore
  }

  const endMs = Math.ceil((Math.max(...steps.map((s) => s.start + s.dur), 0.4) + 0.25) * 1000);
  window.setTimeout(() => {
    ctx.close().catch(() => {});
  }, endMs);
}

export function presentationSoundLabel(id: PresentationSoundId): string {
  return PRESENTATION_SOUND_PRESETS.find((p) => p.id === id)?.label || id;
}
