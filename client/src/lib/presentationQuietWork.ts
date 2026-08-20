/** Stillarbeit in der Präsentation: Timer, sanfte Ambient-Klänge, optional Spotify-Link. */

export type QuietWorkBuiltInTrackId = 'pad' | 'rain' | 'forest' | 'bowl';
export type QuietWorkTrackId = QuietWorkBuiltInTrackId | 'spotify';

export type QuietWorkSettings = {
  durationMin: number;
  musicOn: boolean;
  trackId: QuietWorkTrackId;
  volume: number;
  spotifyUrl: string;
};

export const QUIET_WORK_DURATION_MINS = [5, 8, 10, 15, 20, 30] as const;

export const QUIET_WORK_TRACKS: Array<{
  id: QuietWorkTrackId;
  label: string;
  hint: string;
}> = [
  { id: 'pad', label: 'Klangteppich', hint: 'Weiche Töne, ruhig' },
  { id: 'rain', label: 'Regen', hint: 'Sanftes Rauschen' },
  { id: 'forest', label: 'Wald', hint: 'Regen und leichte Vögel' },
  { id: 'bowl', label: 'Klangschale', hint: 'Tiefer, meditativer Ton' },
  { id: 'spotify', label: 'Spotify', hint: 'Eigene Playlist / Track' },
];

const STORAGE_KEY = 'jm-presentation-quiet-work-v1';

const DEFAULT_SETTINGS: QuietWorkSettings = {
  durationMin: 10,
  musicOn: true,
  trackId: 'pad',
  volume: 0.28,
  spotifyUrl: '',
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0.04, v));
}

function isTrackId(v: unknown): v is QuietWorkTrackId {
  return typeof v === 'string' && QUIET_WORK_TRACKS.some((t) => t.id === v);
}

function sanitizeDuration(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.durationMin;
  if ((QUIET_WORK_DURATION_MINS as readonly number[]).includes(Math.round(n))) return Math.round(n);
  return Math.min(60, Math.max(1, Math.round(n)));
}

export function loadQuietWorkSettings(): QuietWorkSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<QuietWorkSettings>;
    return {
      durationMin: sanitizeDuration(parsed.durationMin),
      musicOn: parsed.musicOn !== false,
      trackId: isTrackId(parsed.trackId) ? parsed.trackId : DEFAULT_SETTINGS.trackId,
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume),
      spotifyUrl: typeof parsed.spotifyUrl === 'string' ? parsed.spotifyUrl.trim().slice(0, 400) : '',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveQuietWorkSettings(patch: Partial<QuietWorkSettings>): QuietWorkSettings {
  const next: QuietWorkSettings = { ...loadQuietWorkSettings(), ...patch };
  next.durationMin = sanitizeDuration(next.durationMin);
  next.volume = clampVolume(next.volume);
  next.spotifyUrl = (next.spotifyUrl || '').trim().slice(0, 400);
  if (!isTrackId(next.trackId)) next.trackId = DEFAULT_SETTINGS.trackId;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function formatQuietWorkClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** open.spotify.com/… oder spotify:… → Embed-URL, sonst null. */
export function spotifyEmbedUrl(raw: string): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  const proto = v.match(/^spotify:(playlist|track|album|episode|show):([A-Za-z0-9]+)/i);
  if (proto) {
    return `https://open.spotify.com/embed/${proto[1].toLowerCase()}/${proto[2]}?utm_source=generator&theme=0`;
  }
  try {
    const u = new URL(v);
    if (!/open\.spotify\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const kind = (parts[0] || '').toLowerCase();
    const id = (parts[1] || '').split('?')[0];
    if (!id || !/^(playlist|track|album|episode|show)$/.test(kind)) return null;
    return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

function whiteNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function startNoise(
  ctx: AudioContext,
  dest: AudioNode,
  opts: { volume: number; freq: number; q?: number; type?: BiquadFilterType },
): AudioNode[] {
  const src = ctx.createBufferSource();
  src.buffer = whiteNoiseBuffer(ctx, 2.5);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.type || 'lowpass';
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 0.7;
  const g = ctx.createGain();
  g.gain.value = opts.volume;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest);
  src.start();
  return [src, filter, g];
}

function startDrone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  volume: number,
  type: OscillatorType = 'sine',
): AudioNode[] {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = volume;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.07 + Math.random() * 0.04;
  const lfoG = ctx.createGain();
  lfoG.gain.value = volume * 0.35;
  lfo.connect(lfoG);
  lfoG.connect(g.gain);
  osc.connect(g);
  g.connect(dest);
  osc.start();
  lfo.start();
  return [osc, g, lfo, lfoG];
}

type AmbientHandle = {
  ctx: AudioContext;
  master: GainNode;
  nodes: AudioNode[];
  birds: number | null;
};

let ambient: AmbientHandle | null = null;

function stopBirds(handle: AmbientHandle | null) {
  if (handle?.birds != null) {
    window.clearInterval(handle.birds);
    handle.birds = null;
  }
}

export function stopQuietWorkAmbient(): void {
  if (!ambient) return;
  stopBirds(ambient);
  const { ctx, master, nodes } = ambient;
  const now = ctx.currentTime;
  try {
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0001, now + 0.45);
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    for (const n of nodes) {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    ctx.close().catch(() => {});
  }, 500);
  ambient = null;
}

export function setQuietWorkAmbientVolume(volume: number): void {
  if (!ambient) return;
  const v = clampVolume(volume);
  try {
    ambient.master.gain.setTargetAtTime(v, ambient.ctx.currentTime, 0.08);
  } catch {
    /* ignore */
  }
}

export async function startQuietWorkAmbient(
  trackId: QuietWorkBuiltInTrackId,
  volume: number,
): Promise<void> {
  stopQuietWorkAmbient();
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const nodes: AudioNode[] = [master];
  const v = clampVolume(volume);

  if (trackId === 'pad') {
    nodes.push(...startDrone(ctx, master, 110, 0.55));
    nodes.push(...startDrone(ctx, master, 164.8, 0.32));
    nodes.push(...startDrone(ctx, master, 246.9, 0.14, 'triangle'));
  } else if (trackId === 'rain') {
    nodes.push(...startNoise(ctx, master, { volume: 0.9, freq: 920, q: 0.5 }));
    nodes.push(...startNoise(ctx, master, { volume: 0.25, freq: 2400, type: 'highpass' }));
  } else if (trackId === 'forest') {
    nodes.push(...startNoise(ctx, master, { volume: 0.55, freq: 780 }));
    nodes.push(...startDrone(ctx, master, 98, 0.18));
  } else {
    nodes.push(...startDrone(ctx, master, 220, 0.5));
    nodes.push(...startDrone(ctx, master, 330, 0.22));
    nodes.push(...startDrone(ctx, master, 440, 0.08, 'triangle'));
  }

  const handle: AmbientHandle = { ctx, master, nodes, birds: null };
  if (trackId === 'forest') {
    handle.birds = window.setInterval(() => {
      if (ctx.state === 'closed') return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const f = 1400 + Math.random() * 900;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(Math.min(3200, f * 1.4), t0 + 0.18);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + 0.28);
    }, 4200);
  }

  master.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.7);
  ambient = handle;
}

export function quietWorkTrackLabel(id: QuietWorkTrackId): string {
  return QUIET_WORK_TRACKS.find((t) => t.id === id)?.label || id;
}
