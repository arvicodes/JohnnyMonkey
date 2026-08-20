/** Stopptanz / Musikspiel: aktive Loops, Spotify-Presets, zufällige Stops 3–10 s. */

export type MusicGameBuiltInId = 'beat' | 'bounce' | 'march' | 'funk';
export type MusicGameSpotifyId = 'hits' | 'dance' | 'boost' | 'kids';
export type MusicGameTrackId = MusicGameBuiltInId | MusicGameSpotifyId;

export const MUSIC_GAME_ACTIVE_TRACKS: Array<{
  id: MusicGameBuiltInId;
  label: string;
  hint: string;
}> = [
  { id: 'beat', label: 'Beat', hint: 'Klopfender Dance-Beat' },
  { id: 'bounce', label: 'Bounce', hint: 'Hüpfig, fröhlich' },
  { id: 'march', label: 'Marsch', hint: 'Klarer Marschrhythmus' },
  { id: 'funk', label: 'Funk', hint: 'Synkopiert, aktiv' },
];

export const MUSIC_GAME_SPOTIFY_PRESETS: Array<{
  id: MusicGameSpotifyId;
  label: string;
  hint: string;
  uri: string;
}> = [
  {
    id: 'hits',
    label: 'Top Hits',
    hint: 'Aktuelle Spotify-Hits',
    uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  },
  {
    id: 'dance',
    label: 'Dance Party',
    hint: 'Zum Bewegen',
    uri: 'spotify:playlist:37i9dQZF1DXaXB8fQg7xif',
  },
  {
    id: 'boost',
    label: 'Stimmung',
    hint: 'Gute Laune',
    uri: 'spotify:playlist:37i9dQZF1DX3rxVfibe1L0',
  },
  {
    id: 'kids',
    label: 'Kids Hits',
    hint: 'Kinder-Party',
    uri: 'spotify:playlist:37i9dQZF1DX8f6LwxNQIY1',
  },
];

export const MUSIC_GAME_TRACKS: Array<{ id: MusicGameTrackId; label: string; hint: string }> = [
  ...MUSIC_GAME_ACTIVE_TRACKS,
  ...MUSIC_GAME_SPOTIFY_PRESETS.map((p) => ({ id: p.id, label: p.label, hint: p.hint })),
];

export type MusicGameSettings = {
  trackId: MusicGameTrackId;
  volume: number;
};

const STORAGE_KEY = 'jm-presentation-music-game-v1';
const DEFAULT_SETTINGS: MusicGameSettings = { trackId: 'beat', volume: 0.42 };

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0.06, v));
}

function isTrackId(v: unknown): v is MusicGameTrackId {
  return typeof v === 'string' && MUSIC_GAME_TRACKS.some((t) => t.id === v);
}

export function isMusicGameSpotifyTrack(id: MusicGameTrackId): id is MusicGameSpotifyId {
  return MUSIC_GAME_SPOTIFY_PRESETS.some((p) => p.id === id);
}

export function musicGameSpotifyUri(id: MusicGameTrackId): string | null {
  return MUSIC_GAME_SPOTIFY_PRESETS.find((p) => p.id === id)?.uri ?? null;
}

export function musicGameSpotifyEmbedUrl(id: MusicGameTrackId): string | null {
  const uri = musicGameSpotifyUri(id);
  if (!uri) return null;
  const proto = uri.match(/^spotify:(playlist|track|album|episode|show):([A-Za-z0-9]+)/i);
  if (!proto) return null;
  return `https://open.spotify.com/embed/${proto[1].toLowerCase()}/${proto[2]}?utm_source=generator&theme=0`;
}

export function loadMusicGameSettings(): MusicGameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MusicGameSettings>;
    return {
      trackId: isTrackId(parsed.trackId) ? parsed.trackId : DEFAULT_SETTINGS.trackId,
      volume: clampVolume(typeof parsed.volume === 'number' ? parsed.volume : DEFAULT_SETTINGS.volume),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveMusicGameSettings(patch: Partial<MusicGameSettings>): MusicGameSettings {
  const next: MusicGameSettings = { ...loadMusicGameSettings(), ...patch };
  next.volume = clampVolume(next.volume);
  if (!isTrackId(next.trackId)) next.trackId = DEFAULT_SETTINGS.trackId;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Immer eine neue Zufallszeit zwischen 3 und 10 Sekunden. */
export function randomMusicGameBurstMs(): number {
  return Math.round(3000 + Math.random() * 7000);
}

export function musicGameTrackLabel(id: MusicGameTrackId): string {
  return MUSIC_GAME_TRACKS.find((t) => t.id === id)?.label || id;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function kick(ctx: AudioContext, dest: AudioNode, t: number, gain: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  g.gain.setValueAtTime(Math.max(0.001, gain), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.18);
}

function hat(ctx: AudioContext, dest: AudioNode, buf: AudioBuffer, t: number, gain: number, dur = 0.04) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(0.001, gain), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur + 0.01);
}

function snare(ctx: AudioContext, dest: AudioNode, buf: AudioBuffer, t: number, gain: number) {
  hat(ctx, dest, buf, t, gain * 0.9, 0.1);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(190, t);
  g.gain.setValueAtTime(Math.max(0.001, gain * 0.45), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.1);
}

function bass(ctx: AudioContext, dest: AudioNode, t: number, freq: number, gain: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(Math.max(0.001, gain), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.2);
}

type LoopHandle = {
  ctx: AudioContext;
  master: GainNode;
  gate: GainNode;
  timer: number | null;
  next: number;
  noise: AudioBuffer;
  trackId: MusicGameBuiltInId;
};

let loop: LoopHandle | null = null;

function bpmFor(id: MusicGameBuiltInId): number {
  if (id === 'bounce') return 108;
  if (id === 'march') return 100;
  if (id === 'funk') return 116;
  return 126;
}

function scheduleBar(h: LoopHandle, barStart: number) {
  const beat = 60 / bpmFor(h.trackId);
  const dest = h.gate;
  const { ctx, noise, trackId } = h;
  for (let i = 0; i < 8; i += 1) {
    const t = barStart + i * (beat / 2);
    if (trackId === 'beat') {
      if (i % 2 === 0) kick(ctx, dest, t, 0.95);
      hat(ctx, dest, noise, t, i % 2 === 0 ? 0.12 : 0.22);
      if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.55);
    } else if (trackId === 'bounce') {
      if (i === 0 || i === 4) kick(ctx, dest, t, 0.9);
      if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.42);
      if (i % 2 === 1) bass(ctx, dest, t, i === 1 || i === 5 ? 98 : 130.8, 0.18);
      hat(ctx, dest, noise, t, 0.16);
    } else if (trackId === 'march') {
      if (i % 2 === 0) kick(ctx, dest, t, 0.85);
      if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.8);
      hat(ctx, dest, noise, t, i % 2 === 0 ? 0.08 : 0.2);
    } else {
      if (i === 0 || i === 3 || i === 4) kick(ctx, dest, t, 0.88);
      if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.5);
      if (i === 1 || i === 5 || i === 7) bass(ctx, dest, t, i === 7 ? 146.8 : 110, 0.16);
      hat(ctx, dest, noise, t, 0.14, 0.035);
    }
  }
}

function pumpLoop() {
  if (!loop) return;
  const h = loop;
  const horizon = h.ctx.currentTime + 0.28;
  const bar = (60 / bpmFor(h.trackId)) * 4;
  while (h.next < horizon) {
    scheduleBar(h, h.next);
    h.next += bar;
  }
  h.timer = window.setTimeout(pumpLoop, 80);
}

export function stopMusicGameLoop(): void {
  if (!loop) return;
  const h = loop;
  loop = null;
  if (h.timer != null) window.clearTimeout(h.timer);
  try {
    h.master.gain.setTargetAtTime(0.0001, h.ctx.currentTime, 0.04);
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    try {
      h.gate.disconnect();
      h.master.disconnect();
    } catch {
      /* ignore */
    }
    h.ctx.close().catch(() => {});
  }, 180);
}

export function setMusicGameLoopMuted(muted: boolean): void {
  if (!loop) return;
  const now = loop.ctx.currentTime;
  try {
    loop.gate.gain.cancelScheduledValues(now);
    loop.gate.gain.setValueAtTime(muted ? 0.0001 : 1, now);
  } catch {
    /* ignore */
  }
}

export async function startMusicGameLoop(
  trackId: MusicGameBuiltInId,
  volume: number,
): Promise<void> {
  stopMusicGameLoop();
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
  master.gain.value = clampVolume(volume);
  master.connect(ctx.destination);
  const gate = ctx.createGain();
  gate.gain.value = 1;
  gate.connect(master);
  loop = {
    ctx,
    master,
    gate,
    timer: null,
    next: ctx.currentTime + 0.05,
    noise: noiseBuffer(ctx),
    trackId,
  };
  pumpLoop();
}

type SpotifyEmbedApi = {
  createController: (
    el: HTMLElement,
    opts: { uri: string; width?: string | number; height?: string | number },
    cb: (controller: SpotifyEmbedController) => void,
  ) => void;
};

export type SpotifyEmbedController = {
  play?: () => void;
  pause?: () => void;
  togglePlay?: () => void;
  resume?: () => void;
  destroy?: () => void;
  loadUri?: (uri: string) => void;
};

let spotifyApi: SpotifyEmbedApi | null = null;
const spotifyWaiters: Array<(api: SpotifyEmbedApi) => void> = [];

function notifySpotifyApi(api: SpotifyEmbedApi) {
  spotifyApi = api;
  spotifyWaiters.splice(0).forEach((w) => w(api));
}

export function ensureSpotifyIframeApi(): Promise<SpotifyEmbedApi> {
  if (spotifyApi) return Promise.resolve(spotifyApi);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      const idx = spotifyWaiters.indexOf(waiter);
      if (idx >= 0) spotifyWaiters.splice(idx, 1);
      reject(new Error('spotify iframe timeout'));
    }, 8000);
    const waiter = (api: SpotifyEmbedApi) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(api);
    };
    spotifyWaiters.push(waiter);
    const w = window as unknown as {
      onSpotifyIframeApiReady?: (api: SpotifyEmbedApi) => void;
    };
    const prev = w.onSpotifyIframeApiReady;
    w.onSpotifyIframeApiReady = (api) => {
      prev?.(api);
      notifySpotifyApi(api);
    };
    if (!document.querySelector('script[data-jm-spotify-iframe]')) {
      const s = document.createElement('script');
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.async = true;
      s.dataset.jmSpotifyIframe = '1';
      document.head.appendChild(s);
    }
  });
}

export async function createSpotifyGameController(
  host: HTMLElement,
  uri: string,
): Promise<SpotifyEmbedController | null> {
  try {
    const api = await ensureSpotifyIframeApi();
    return await new Promise((resolve) => {
      api.createController(host, { uri, width: '100%', height: 80 }, (controller) => {
        resolve(controller);
      });
    });
  } catch {
    return null;
  }
}

export function spotifyGamePlay(controller: SpotifyEmbedController | null) {
  if (!controller) return;
  try {
    if (typeof controller.resume === 'function') controller.resume();
    else if (typeof controller.play === 'function') controller.play();
    else controller.togglePlay?.();
  } catch {
    /* ignore */
  }
}

export function spotifyGamePause(controller: SpotifyEmbedController | null) {
  if (!controller) return;
  try {
    if (typeof controller.pause === 'function') controller.pause();
    else controller.togglePlay?.();
  } catch {
    /* ignore */
  }
}
