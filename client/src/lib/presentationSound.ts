/** Präsentations-Sound: Einstellungen (localStorage) + Abspielen über Web Audio. */

export type PresentationSoundCategory = 'attention' | 'bells' | 'gentle' | 'quirky';

export type PresentationSoundId =
  | 'attention'
  | 'alert'
  | 'classbell'
  | 'double'
  | 'chime'
  | 'singingbowl'
  | 'gong'
  | 'temple'
  | 'windchime'
  | 'soft'
  | 'ping'
  | 'wood'
  | 'rise'
  | 'boing'
  | 'ufo'
  | 'retro'
  | 'magic'
  | 'fanfare';

export type PresentationSoundDuration = 'normal' | 'long' | 'extra';

export type PresentationSoundEvent = 'startSlide' | 'entryDone' | 'hotkey';

export type PresentationSoundSettings = {
  /** Startfolie + Taste S */
  soundId: PresentationSoundId;
  /** Entry Ticket „Erledigt“ */
  entryDoneSoundId: PresentationSoundId;
  /** 0–1 */
  volume: number;
  duration: PresentationSoundDuration;
  favoriteIds: PresentationSoundId[];
};

export const PRESENTATION_SOUND_STORAGE_KEY = 'jm-presentation-sound-v2';
const LEGACY_STORAGE_KEY = 'jm-presentation-sound-v1';

export const PRESENTATION_SOUND_CATEGORIES: Array<{
  id: PresentationSoundCategory;
  label: string;
  hint: string;
}> = [
  { id: 'attention', label: 'Aufmerksamkeit', hint: 'Klar und durchsetzungsstark' },
  { id: 'bells', label: 'Glocken & Klänge', hint: 'Klangschale, Gong, sanfte Resonanz' },
  { id: 'gentle', label: 'Sanft & Natur', hint: 'Gedämpft, warm, unaufdringlich' },
  { id: 'quirky', label: 'Abgedreht & Fun', hint: 'Überraschung, Humor, Retro' },
];

export const PRESENTATION_SOUND_PRESETS: Array<{
  id: PresentationSoundId;
  label: string;
  hint: string;
  category: PresentationSoundCategory;
}> = [
  { id: 'attention', label: 'Aufmerksamkeit', hint: 'Stark, aufsteigend', category: 'attention' },
  { id: 'alert', label: 'Alarm', hint: 'Wiederholt, laut', category: 'attention' },
  { id: 'classbell', label: 'Schulglocke', hint: 'Lang, durchdringend', category: 'attention' },
  { id: 'double', label: 'Doppel', hint: 'Zwei kräftige Töne', category: 'attention' },
  { id: 'chime', label: 'Glocke', hint: 'Klar und hell', category: 'bells' },
  { id: 'singingbowl', label: 'Klangschale', hint: 'Langer, meditativer Nachklang', category: 'bells' },
  { id: 'gong', label: 'Gong', hint: 'Tief, voll, lang ausklingend', category: 'bells' },
  { id: 'temple', label: 'Tempelglocke', hint: 'Warm und feierlich', category: 'bells' },
  { id: 'windchime', label: 'Windspiel', hint: 'Leicht, luftig, mehrere Töne', category: 'bells' },
  { id: 'soft', label: 'Sanft', hint: 'Gedämpft, länger', category: 'gentle' },
  { id: 'ping', label: 'Ping', hint: 'Ein klarer Ton', category: 'gentle' },
  { id: 'wood', label: 'Holz', hint: 'Deutliches Klacken', category: 'gentle' },
  { id: 'rise', label: 'Anstieg', hint: 'Langes Glissando', category: 'gentle' },
  { id: 'boing', label: 'Boing', hint: 'Cartoon-Feder — springt', category: 'quirky' },
  { id: 'ufo', label: 'UFO', hint: 'Sci-Fi-Wabern', category: 'quirky' },
  { id: 'retro', label: 'Retro-Beep', hint: '8-Bit-Spielsound', category: 'quirky' },
  { id: 'magic', label: 'Zauberstaub', hint: 'Funkelnde Aufsteiger', category: 'quirky' },
  { id: 'fanfare', label: 'Fanfare', hint: 'Kurz und triumphierend', category: 'quirky' },
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
  entryDoneSoundId: 'fanfare',
  volume: 0.9,
  duration: 'long',
  favoriteIds: [],
};

const START_SOUND_ARM_KEY = 'jm-play-start-sound';

let sharedAudioCtx: AudioContext | null = null;

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

function sanitizeFavoriteIds(raw: unknown): PresentationSoundId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<PresentationSoundId>();
  const out: PresentationSoundId[] = [];
  for (const id of raw) {
    if (!isSoundId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function durationFactor(d: PresentationSoundDuration): number {
  return PRESENTATION_SOUND_DURATIONS.find((x) => x.id === d)?.factor ?? 1;
}

function parseStoredSettings(raw: string | null): PresentationSoundSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PresentationSoundSettings>;
    return {
      soundId: isSoundId(parsed.soundId) ? parsed.soundId : DEFAULT_SETTINGS.soundId,
      entryDoneSoundId: isSoundId(parsed.entryDoneSoundId)
        ? parsed.entryDoneSoundId
        : DEFAULT_SETTINGS.entryDoneSoundId,
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume),
      duration: isDuration(parsed.duration) ? parsed.duration : DEFAULT_SETTINGS.duration,
      favoriteIds: sanitizeFavoriteIds(parsed.favoriteIds),
    };
  } catch {
    return null;
  }
}

export function loadPresentationSoundSettings(): PresentationSoundSettings {
  try {
    const current = parseStoredSettings(localStorage.getItem(PRESENTATION_SOUND_STORAGE_KEY));
    if (current) return current;

    const legacy = parseStoredSettings(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy) {
      savePresentationSoundSettings(legacy);
      return legacy;
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function savePresentationSoundSettings(next: PresentationSoundSettings): void {
  const clean: PresentationSoundSettings = {
    soundId: isSoundId(next.soundId) ? next.soundId : DEFAULT_SETTINGS.soundId,
    entryDoneSoundId: isSoundId(next.entryDoneSoundId)
      ? next.entryDoneSoundId
      : DEFAULT_SETTINGS.entryDoneSoundId,
    volume: clampVolume(next.volume),
    duration: isDuration(next.duration) ? next.duration : DEFAULT_SETTINGS.duration,
    favoriteIds: sanitizeFavoriteIds(next.favoriteIds),
  };
  try {
    localStorage.setItem(PRESENTATION_SOUND_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('jm-presentation-sound-changed', { detail: clean }));
  } catch {
    // ignore quota / private mode
  }
}

export function isPresentationSoundFavorite(id: PresentationSoundId): boolean {
  return loadPresentationSoundSettings().favoriteIds.includes(id);
}

export function togglePresentationSoundFavorite(id: PresentationSoundId): PresentationSoundSettings {
  const current = loadPresentationSoundSettings();
  const has = current.favoriteIds.includes(id);
  const favoriteIds = has
    ? current.favoriteIds.filter((x) => x !== id)
    : [...current.favoriteIds, id];
  const next = { ...current, favoriteIds };
  savePresentationSoundSettings(next);
  return next;
}

export function presetsForCategory(category: PresentationSoundCategory) {
  return PRESENTATION_SOUND_PRESETS.filter((p) => p.category === category);
}

export function favoritePresets() {
  const fav = new Set(loadPresentationSoundSettings().favoriteIds);
  return PRESENTATION_SOUND_PRESETS.filter((p) => fav.has(p.id));
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
    case 'singingbowl':
      return [
        { f: 220, start: 0, dur: 2.4, type: 'sine', peak: 1 },
        { f: 440, start: 0.03, dur: 2.1, type: 'sine', peak: 0.42 },
        { f: 660, start: 0.06, dur: 1.7, type: 'triangle', peak: 0.22 },
        { f: 880, start: 0.1, dur: 1.35, type: 'sine', peak: 0.14 },
      ];
    case 'gong':
      return [
        { f: 98, start: 0, dur: 2.2, type: 'sine', peak: 1 },
        { f: 147, start: 0.06, dur: 1.85, type: 'triangle', peak: 0.55 },
        { f: 220, start: 0.1, dur: 1.5, type: 'sine', peak: 0.35 },
        { f: 311, start: 0.14, dur: 1.1, type: 'triangle', peak: 0.22 },
      ];
    case 'temple':
      return [
        { f: 392, start: 0, dur: 1.35, peak: 1 },
        { f: 587.33, start: 0.05, dur: 1.15, peak: 0.55 },
        { f: 784, start: 0.1, dur: 0.95, peak: 0.32 },
        { f: 988, start: 0.18, dur: 0.75, peak: 0.2 },
      ];
    case 'windchime':
      return [
        { f: 523.25, start: 0, dur: 0.85, type: 'triangle', peak: 0.55 },
        { f: 659.25, start: 0.18, dur: 0.95, type: 'triangle', peak: 0.48 },
        { f: 783.99, start: 0.38, dur: 1.05, type: 'triangle', peak: 0.42 },
        { f: 987.77, start: 0.62, dur: 1.15, type: 'triangle', peak: 0.36 },
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
    case 'boing':
      return [
        { f: 110, start: 0, dur: 0.32, type: 'sine', rampTo: 620, peak: 1 },
        { f: 620, start: 0.36, dur: 0.28, type: 'sine', rampTo: 160, peak: 0.92 },
        { f: 160, start: 0.68, dur: 0.24, type: 'sine', rampTo: 420, peak: 0.75 },
        { f: 420, start: 0.96, dur: 0.2, type: 'sine', rampTo: 200, peak: 0.55 },
      ];
    case 'ufo':
      return [
        { f: 180, start: 0, dur: 0.35, type: 'sawtooth', rampTo: 720, peak: 0.65 },
        { f: 720, start: 0.38, dur: 0.32, type: 'sawtooth', rampTo: 260, peak: 0.7 },
        { f: 260, start: 0.74, dur: 0.38, type: 'sawtooth', rampTo: 880, peak: 0.8 },
        { f: 880, start: 1.16, dur: 0.45, type: 'sawtooth', rampTo: 320, peak: 0.6 },
      ];
    case 'retro':
      return [
        { f: 440, start: 0, dur: 0.07, type: 'square', peak: 0.75 },
        { f: 554.37, start: 0.11, dur: 0.07, type: 'square', peak: 0.78 },
        { f: 659.25, start: 0.22, dur: 0.07, type: 'square', peak: 0.82 },
        { f: 880, start: 0.33, dur: 0.12, type: 'square', peak: 1 },
        { f: 1108.73, start: 0.5, dur: 0.18, type: 'square', peak: 0.9 },
      ];
    case 'magic':
      return [
        { f: 880, start: 0, dur: 0.14, peak: 0.45 },
        { f: 1046.5, start: 0.09, dur: 0.16, peak: 0.55 },
        { f: 1318.5, start: 0.2, dur: 0.18, peak: 0.65 },
        { f: 1568, start: 0.34, dur: 0.22, peak: 0.78 },
        { f: 1975.53, start: 0.52, dur: 0.35, peak: 1 },
        { f: 2349.32, start: 0.72, dur: 0.4, peak: 0.7 },
      ];
    case 'fanfare':
      return [
        { f: 392, start: 0, dur: 0.18, type: 'square', peak: 0.72 },
        { f: 523.25, start: 0.2, dur: 0.18, type: 'square', peak: 0.78 },
        { f: 659.25, start: 0.42, dur: 0.28, type: 'square', peak: 0.92 },
        { f: 783.99, start: 0.74, dur: 0.42, type: 'square', peak: 1 },
        { f: 1046.5, start: 1.22, dur: 0.35, type: 'square', peak: 0.85 },
      ];
    case 'chime':
    default:
      return [
        { f: 784, start: 0, dur: 0.55, peak: 1 },
        { f: 1046.5, start: 0.12, dur: 0.75, peak: 0.95 },
        { f: 1318.5, start: 0.28, dur: 0.9, peak: 0.7 },
      ];
  }
}

const LAYERED_SOUNDS = new Set<PresentationSoundId>([
  'attention',
  'alert',
  'classbell',
  'gong',
  'singingbowl',
  'temple',
  'fanfare',
]);

function audioContextCtor(): typeof AudioContext | null {
  const Win = typeof window !== 'undefined' ? window : null;
  if (!Win) return null;
  return Win.AudioContext || (Win as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

/** Safari: Audio darf erst nach einer User-Geste starten — beim Play-Klick aufrufen. */
export function unlockPresentationAudio(): void {
  const AC = audioContextCtor();
  if (!AC) return;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AC();
    } catch {
      sharedAudioCtx = null;
      return;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
}

function getSoundContext(): AudioContext | null {
  unlockPresentationAudio();
  return sharedAudioCtx;
}

/** Beim Start der Präsentation: Audio entsperren + Startfolien-Ton merken. */
export function preparePresentationAudioForPlay(): void {
  unlockPresentationAudio();
  try {
    sessionStorage.setItem(START_SOUND_ARM_KEY, '1');
  } catch {
    // ignore
  }
}

export function isPresentationStartSoundArmed(): boolean {
  try {
    return sessionStorage.getItem(START_SOUND_ARM_KEY) === '1';
  } catch {
    return false;
  }
}

function clearArmedStartSlideSound(): void {
  try {
    sessionStorage.removeItem(START_SOUND_ARM_KEY);
  } catch {
    // ignore
  }
}

/** Startfolien-Ton, wenn Play ihn vorbereitet hat. Safari: bei Bedarf nach erstem Tippen erneut. */
export function tryPlayArmedStartSlideSound(): boolean {
  if (!isPresentationStartSoundArmed()) return false;
  unlockPresentationAudio();
  playPresentationSoundFor('startSlide');
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') return false;
  clearArmedStartSlideSound();
  return true;
}

export function playPresentationSoundFor(event: PresentationSoundEvent): void {
  const settings = loadPresentationSoundSettings();
  const soundId = event === 'entryDone' ? settings.entryDoneSoundId : settings.soundId;
  playPresentationSound({ soundId });
}

/** Spielt den konfigurierten (oder übergebenen) Präsentations-Sound. */
export function playPresentationSound(override?: Partial<PresentationSoundSettings>): void {
  const ctx = getSoundContext();
  if (!ctx) return;

  const settings = { ...loadPresentationSoundSettings(), ...override };
  const volume = clampVolume(settings.volume);
  if (volume <= 0.001) return;

  const master = ctx.createGain();
  master.gain.value = 0.18 + volume * 0.77;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime;
  const factor = durationFactor(settings.duration);
  const steps = scaleSteps(buildSteps(settings.soundId), factor);

  try {
    if (LAYERED_SOUNDS.has(settings.soundId)) {
      const layer = ctx.createGain();
      layer.gain.value = settings.soundId === 'gong' || settings.soundId === 'singingbowl' ? 0.45 : 0.55;
      layer.connect(master);
      playPattern(
        ctx,
        layer,
        t0,
        steps.map((s) => ({ ...s, type: s.type || 'triangle', peak: (s.peak ?? 1) * 0.65 })),
      );
    }
    playPattern(ctx, master, t0, steps);
  } catch {
    // ignore
  }

  const endMs = Math.ceil((Math.max(...steps.map((s) => s.start + s.dur), 0.4) + 0.25) * 1000);
  window.setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      // ignore
    }
  }, endMs);
}

export function presentationSoundLabel(id: PresentationSoundId): string {
  return PRESENTATION_SOUND_PRESETS.find((p) => p.id === id)?.label || id;
}

function isSoundHotkeyTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
    return true;
  }
  return Boolean(t.isContentEditable || t.closest('[contenteditable="true"]'));
}

function onPresentationSoundHotkey(e: KeyboardEvent) {
  if (e.key !== 's' && e.key !== 'S') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (isSoundHotkeyTypingTarget(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  playPresentationSound();
}

let soundHotkeyUsers = 0;

/** Taste S — global für Lehrer (Dashboard, Editor, Präsentation). */
export function ensurePresentationSoundHotkey(): () => void {
  if (typeof window === 'undefined') return () => {};
  soundHotkeyUsers += 1;
  if (soundHotkeyUsers === 1) {
    window.addEventListener('keydown', onPresentationSoundHotkey, true);
  }
  return () => {
    soundHotkeyUsers = Math.max(0, soundHotkeyUsers - 1);
    if (soundHotkeyUsers === 0) {
      window.removeEventListener('keydown', onPresentationSoundHotkey, true);
    }
  };
}
