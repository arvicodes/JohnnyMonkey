/** Stopptanz / Musikspiel: aktive Loops, Spotify-Presets, zufällige Stops. */

export type MusicGameBuiltInId =
  | 'beat'
  | 'bounce'
  | 'march'
  | 'funk'
  | 'disco'
  | 'techno'
  | 'samba'
  | 'claps'
  | 'rockbeat'
  | 'boom';
export type MusicGameSpotifyPresetId =
  | 'hits'
  | 'dance'
  | 'boost'
  | 'happy'
  | 'germany'
  | 'kids'
  | 'car'
  | 'workout'
  | 'hiphop'
  | 'latino'
  | 'rock'
  | 'eighties'
  | 'nineties'
  | 'electro';
export type MusicGameSpotifyId = MusicGameSpotifyPresetId | 'custom';
export type MusicGameTrackId = MusicGameBuiltInId | MusicGameSpotifyId;
export type MusicGameBurstId = 'short' | 'normal' | 'long';

export const MUSIC_GAME_ACTIVE_TRACKS: Array<{
  id: MusicGameBuiltInId;
  label: string;
  hint: string;
}> = [
  { id: 'beat', label: 'Beat', hint: 'Klopfender Dance-Beat' },
  { id: 'bounce', label: 'Bounce', hint: 'Hüpfig, fröhlich' },
  { id: 'disco', label: 'Disco', hint: 'Four-on-the-floor' },
  { id: 'techno', label: 'Techno', hint: 'Schnell, treibend' },
  { id: 'funk', label: 'Funk', hint: 'Synkopiert, aktiv' },
  { id: 'samba', label: 'Samba', hint: 'Perkussiv, lebendig' },
  { id: 'claps', label: 'Klatschen', hint: 'Klatsch-Rhythmus' },
  { id: 'march', label: 'Marsch', hint: 'Klarer Marschrhythmus' },
  { id: 'rockbeat', label: 'Rock', hint: 'Kick-Snare, sportlich' },
  { id: 'boom', label: 'Boom Bap', hint: 'Hip-Hop-Groove' },
];

export const MUSIC_GAME_SPOTIFY_PRESETS: Array<{
  id: MusicGameSpotifyPresetId;
  label: string;
  hint: string;
  uri: string;
}> = [
  { id: 'hits', label: 'Top Hits', hint: 'Aktuelle Spotify-Hits', uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M' },
  { id: 'dance', label: 'Dance', hint: 'Zum Bewegen', uri: 'spotify:playlist:37i9dQZF1DXaXB8fQg7xif' },
  { id: 'boost', label: 'Stimmung', hint: 'Gute Laune', uri: 'spotify:playlist:37i9dQZF1DX3rxVfibe1L0' },
  { id: 'happy', label: 'Happy', hint: 'Happy Hits', uri: 'spotify:playlist:37i9dQZF1DXdPec7aLTmlC' },
  { id: 'germany', label: 'Hits DE', hint: 'Hot Hits Deutschland', uri: 'spotify:playlist:37i9dQZF1DX4jP4eebSWR9' },
  { id: 'kids', label: 'Kids', hint: 'Kinder-Party', uri: 'spotify:playlist:37i9dQZF1DX8f6LwxNQIY1' },
  { id: 'car', label: 'Mitsingen', hint: 'Songs zum Mitsingen', uri: 'spotify:playlist:37i9dQZF1DWWMOmoXUqFXh' },
  { id: 'workout', label: 'Workout', hint: 'Sportlich, laut', uri: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP' },
  { id: 'hiphop', label: 'Hip-Hop', hint: 'RapCaviar', uri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd' },
  { id: 'latino', label: 'Latino', hint: 'Viva Latino', uri: 'spotify:playlist:37i9dQZF1DX10zKzsJ2jva' },
  { id: 'rock', label: 'Rock', hint: 'Rock Classics', uri: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U' },
  { id: 'eighties', label: '80er', hint: 'All Out 80s', uri: 'spotify:playlist:37i9dQZF1DX4UtSsGT1Sbe' },
  { id: 'nineties', label: '90er', hint: 'All Out 90s', uri: 'spotify:playlist:37i9dQZF1DXbTxeAdrVG2l' },
  { id: 'electro', label: 'Electro', hint: 'mint / elektronisch', uri: 'spotify:playlist:37i9dQZF1DX4dyzvuaRJ0n' },
];

export const MUSIC_GAME_BURSTS: Array<{
  id: MusicGameBurstId;
  label: string;
  hint: string;
  minMs: number;
  maxMs: number;
}> = [
  { id: 'short', label: 'Kurz', hint: '2–5 Sekunden', minMs: 2000, maxMs: 5000 },
  { id: 'normal', label: 'Normal', hint: '3–10 Sekunden', minMs: 3000, maxMs: 10000 },
  { id: 'long', label: 'Lang', hint: '6–18 Sekunden', minMs: 6000, maxMs: 18000 },
];

export const MUSIC_GAME_TRACKS: Array<{ id: MusicGameTrackId; label: string; hint: string }> = [
  ...MUSIC_GAME_ACTIVE_TRACKS,
  ...MUSIC_GAME_SPOTIFY_PRESETS.map((p) => ({ id: p.id, label: p.label, hint: p.hint })),
  { id: 'custom', label: 'Eigene', hint: 'Playlist oder Track einfügen' },
];

export type MusicGameSettings = {
  trackId: MusicGameTrackId;
  volume: number;
  burst: MusicGameBurstId;
  spotifyUrl: string;
};

const STORAGE_KEY = 'jm-presentation-music-game-v1';
const DEFAULT_SETTINGS: MusicGameSettings = {
  trackId: 'beat',
  volume: 0.42,
  burst: 'normal',
  spotifyUrl: '',
};

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0.06, v));
}

function isTrackId(v: unknown): v is MusicGameTrackId {
  return typeof v === 'string' && MUSIC_GAME_TRACKS.some((t) => t.id === v);
}

function isBurstId(v: unknown): v is MusicGameBurstId {
  return typeof v === 'string' && MUSIC_GAME_BURSTS.some((b) => b.id === v);
}

export function isMusicGameSpotifyTrack(id: MusicGameTrackId): id is MusicGameSpotifyId {
  return id === 'custom' || MUSIC_GAME_SPOTIFY_PRESETS.some((p) => p.id === id);
}

export function parseSpotifyUri(raw: string): string | null {
  const v = (raw || '').trim();
  if (!v) return null;
  const proto = v.match(/^spotify:(playlist|track|album|episode|show):([A-Za-z0-9]+)/i);
  if (proto) return `spotify:${proto[1].toLowerCase()}:${proto[2]}`;
  try {
    const u = new URL(v);
    if (!/open\.spotify\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const kind = (parts[0] || '').toLowerCase();
    const id = (parts[1] || '').split('?')[0];
    if (!id || !/^(playlist|track|album|episode|show)$/.test(kind)) return null;
    return `spotify:${kind}:${id}`;
  } catch {
    return null;
  }
}

export function musicGameSpotifyUri(id: MusicGameTrackId, spotifyUrl = ''): string | null {
  if (id === 'custom') return parseSpotifyUri(spotifyUrl);
  return MUSIC_GAME_SPOTIFY_PRESETS.find((p) => p.id === id)?.uri ?? null;
}

export function musicGameActiveUri(settings: MusicGameSettings): string | null {
  return isMusicGameSpotifyTrack(settings.trackId)
    ? musicGameSpotifyUri(settings.trackId, settings.spotifyUrl)
    : null;
}

export function musicGameSpotifyEmbedUrl(id: MusicGameTrackId, spotifyUrl = ''): string | null {
  const uri = musicGameSpotifyUri(id, spotifyUrl);
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
      burst: isBurstId(parsed.burst) ? parsed.burst : DEFAULT_SETTINGS.burst,
      spotifyUrl: typeof parsed.spotifyUrl === 'string' ? parsed.spotifyUrl.trim().slice(0, 400) : '',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveMusicGameSettings(patch: Partial<MusicGameSettings>): MusicGameSettings {
  const next: MusicGameSettings = { ...loadMusicGameSettings(), ...patch };
  next.volume = clampVolume(next.volume);
  next.spotifyUrl = (next.spotifyUrl || '').trim().slice(0, 400);
  if (!isTrackId(next.trackId)) next.trackId = DEFAULT_SETTINGS.trackId;
  if (!isBurstId(next.burst)) next.burst = DEFAULT_SETTINGS.burst;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Immer eine neue Zufallszeit im gewählten Intervall. */
export function randomMusicGameBurstMs(burst?: MusicGameBurstId): number {
  const id = burst && isBurstId(burst) ? burst : loadMusicGameSettings().burst;
  const spec = MUSIC_GAME_BURSTS.find((b) => b.id === id) ?? MUSIC_GAME_BURSTS[1];
  return Math.round(spec.minMs + Math.random() * (spec.maxMs - spec.minMs));
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

function ping(ctx: AudioContext, dest: AudioNode, t: number, freq: number, gain: number, dur = 0.07) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(Math.max(0.001, gain), t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function bpmFor(id: MusicGameBuiltInId): number {
  if (id === 'bounce') return 108;
  if (id === 'march') return 100;
  if (id === 'funk') return 116;
  if (id === 'disco') return 122;
  if (id === 'techno') return 132;
  if (id === 'samba') return 118;
  if (id === 'claps') return 112;
  if (id === 'rockbeat') return 140;
  if (id === 'boom') return 92;
  return 126;
}

function scheduleBar(h: LoopHandle, barStart: number) {
  const beat = 60 / bpmFor(h.trackId);
  const dest = h.gate;
  const { ctx, noise, trackId } = h;
  for (let i = 0; i < 8; i += 1) {
    const t = barStart + i * (beat / 2);
    switch (trackId) {
      case 'beat':
        if (i % 2 === 0) kick(ctx, dest, t, 0.95);
        hat(ctx, dest, noise, t, i % 2 === 0 ? 0.12 : 0.22);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.55);
        break;
      case 'bounce':
        if (i === 0 || i === 4) kick(ctx, dest, t, 0.9);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.42);
        if (i % 2 === 1) bass(ctx, dest, t, i === 1 || i === 5 ? 98 : 130.8, 0.18);
        hat(ctx, dest, noise, t, 0.16);
        break;
      case 'march':
        if (i % 2 === 0) kick(ctx, dest, t, 0.85);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.8);
        hat(ctx, dest, noise, t, i % 2 === 0 ? 0.08 : 0.2);
        break;
      case 'funk':
        if (i === 0 || i === 3 || i === 4) kick(ctx, dest, t, 0.88);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.5);
        if (i === 1 || i === 5 || i === 7) bass(ctx, dest, t, i === 7 ? 146.8 : 110, 0.16);
        hat(ctx, dest, noise, t, 0.14, 0.035);
        break;
      case 'disco':
        if (i % 2 === 0) kick(ctx, dest, t, 0.9);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.48);
        if (i === 0 || i === 4) bass(ctx, dest, t, 98, 0.2);
        if (i === 3 || i === 7) bass(ctx, dest, t, 130.8, 0.16);
        hat(ctx, dest, noise, t, i % 2 === 0 ? 0.1 : 0.24);
        break;
      case 'techno':
        if (i % 2 === 0) kick(ctx, dest, t, 0.98);
        hat(ctx, dest, noise, t, i % 2 === 1 ? 0.28 : 0.08, 0.03);
        if (i === 6) snare(ctx, dest, noise, t, 0.28);
        if (i === 0) bass(ctx, dest, t, 55, 0.22);
        break;
      case 'samba':
        if (i === 0 || i === 3 || i === 4 || i === 6) kick(ctx, dest, t, 0.82);
        if (i === 2 || i === 5 || i === 7) snare(ctx, dest, noise, t, 0.38);
        hat(ctx, dest, noise, t, 0.18, 0.03);
        if (i === 1 || i === 5) ping(ctx, dest, t, 880, 0.12, 0.05);
        break;
      case 'claps':
        if (i === 0 || i === 4) kick(ctx, dest, t, 0.7);
        snare(ctx, dest, noise, t, i % 2 === 0 ? 0.62 : 0.28);
        hat(ctx, dest, noise, t, 0.1, 0.025);
        break;
      case 'rockbeat':
        if (i === 0 || i === 3 || i === 4) kick(ctx, dest, t, 0.92);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.7);
        hat(ctx, dest, noise, t, 0.2);
        if (i === 0 || i === 4) bass(ctx, dest, t, 82.4, 0.18);
        break;
      case 'boom':
        if (i === 0 || i === 3 || i === 5) kick(ctx, dest, t, 0.95);
        if (i === 2 || i === 6) snare(ctx, dest, noise, t, 0.58);
        hat(ctx, dest, noise, t, i % 2 === 0 ? 0.08 : 0.16, 0.04);
        if (i === 0 || i === 4) bass(ctx, dest, t, 73.4, 0.22);
        break;
      default:
        if (i % 2 === 0) kick(ctx, dest, t, 0.9);
        hat(ctx, dest, noise, t, 0.16);
        break;
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
