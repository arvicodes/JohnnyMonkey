import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import {
  MusicNote as MusicIcon,
  PauseCircle as PauseIcon,
} from '@mui/icons-material';
import { playPresentationSound } from '../../lib/presentationSound';
import {
  MUSIC_GAME_ACTIVE_TRACKS,
  MUSIC_GAME_BURSTS,
  MUSIC_GAME_SPOTIFY_PRESETS,
  createSpotifyGameController,
  isMusicGameSpotifyTrack,
  loadMusicGameSettings,
  musicGameActiveUri,
  musicGameSpotifyEmbedUrl,
  parseSpotifyUri,
  randomMusicGameBurstMs,
  saveMusicGameSettings,
  setMusicGameLoopMuted,
  spotifyGamePause,
  spotifyGamePlay,
  startMusicGameLoop,
  stopMusicGameLoop,
  type MusicGameBuiltInId,
  type MusicGameBurstId,
  type MusicGameSettings,
  type MusicGameTrackId,
  type SpotifyEmbedController,
} from '../../lib/presentationMusicGame';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';

function stylusTap(action: () => void) {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      e.preventDefault();
      e.stopPropagation();
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      e.preventDefault();
      e.stopPropagation();
      action();
    },
  };
}

export type MusicGameController = {
  running: boolean;
  frozen: boolean;
  pickerOpen: boolean;
  settings: MusicGameSettings;
  togglePicker: () => void;
  start: () => void;
  resume: () => void;
  freeze: () => void;
  stop: () => void;
  setTrackId: (id: MusicGameTrackId) => void;
  setBurst: (id: MusicGameBurstId) => void;
  setSpotifyUrl: (url: string) => void;
  spotifyRef: React.MutableRefObject<SpotifyEmbedController | null>;
};

export function useMusicGameController(): MusicGameController {
  const [settings, setSettings] = useState<MusicGameSettings>(() => loadMusicGameSettings());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const burstTimerRef = useRef<number | null>(null);
  const spotifyRef = useRef<SpotifyEmbedController | null>(null);
  const runningRef = useRef(false);
  const frozenRef = useRef(false);
  runningRef.current = running;
  frozenRef.current = frozen;

  const persist = useCallback((patch: Partial<MusicGameSettings>) => {
    const next = saveMusicGameSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const clearBurst = useCallback(() => {
    if (burstTimerRef.current != null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  }, []);

  const silence = useCallback(() => {
    setMusicGameLoopMuted(true);
    spotifyGamePause(spotifyRef.current);
  }, []);

  const soundOn = useCallback(() => {
    setMusicGameLoopMuted(false);
    spotifyGamePlay(spotifyRef.current);
  }, []);

  const teardownAudio = useCallback(() => {
    clearBurst();
    stopMusicGameLoop();
    spotifyGamePause(spotifyRef.current);
  }, [clearBurst]);

  const freeze = useCallback(() => {
    if (!runningRef.current || frozenRef.current) return;
    clearBurst();
    silence();
    frozenRef.current = true;
    setFrozen(true);
    playPresentationSound({ soundId: 'wood' });
  }, [clearBurst, silence]);

  const armBurst = useCallback(() => {
    clearBurst();
    burstTimerRef.current = window.setTimeout(() => {
      burstTimerRef.current = null;
      freeze();
    }, randomMusicGameBurstMs());
  }, [clearBurst, freeze]);

  const beginPlayback = useCallback(
    async (trackId: MusicGameTrackId) => {
      if (isMusicGameSpotifyTrack(trackId)) {
        stopMusicGameLoop();
        soundOn();
        return;
      }
      spotifyGamePause(spotifyRef.current);
      await startMusicGameLoop(trackId as MusicGameBuiltInId, loadMusicGameSettings().volume);
      setMusicGameLoopMuted(false);
    },
    [soundOn],
  );

  const stop = useCallback(() => {
    runningRef.current = false;
    frozenRef.current = false;
    clearBurst();
    teardownAudio();
    setRunning(false);
    setFrozen(false);
    setPickerOpen(false);
  }, [clearBurst, teardownAudio]);

  const start = useCallback(() => {
    window.dispatchEvent(new Event('jm-stop-quiet-work'));
    const next = loadMusicGameSettings();
    runningRef.current = true;
    frozenRef.current = false;
    setPickerOpen(false);
    setFrozen(false);
    setRunning(true);
    void beginPlayback(next.trackId).then(() => {
      if (!runningRef.current) return;
      armBurst();
    });
  }, [armBurst, beginPlayback]);

  const resume = useCallback(() => {
    if (!runningRef.current) {
      start();
      return;
    }
    frozenRef.current = false;
    setFrozen(false);
    soundOn();
    armBurst();
  }, [armBurst, soundOn, start]);

  const setTrackId = useCallback(
    (id: MusicGameTrackId) => {
      persist({ trackId: id });
      if (!runningRef.current) return;
      frozenRef.current = false;
      setFrozen(false);
      void beginPlayback(id).then(() => {
        if (runningRef.current) armBurst();
      });
    },
    [armBurst, beginPlayback, persist],
  );

  const setBurst = useCallback(
    (id: MusicGameBurstId) => {
      persist({ burst: id });
      if (runningRef.current && !frozenRef.current) armBurst();
    },
    [armBurst, persist],
  );

  const setSpotifyUrl = useCallback(
    (url: string) => {
      persist({ spotifyUrl: url, trackId: 'custom' });
      if (!runningRef.current) return;
      frozenRef.current = false;
      setFrozen(false);
      void beginPlayback('custom').then(() => {
        if (runningRef.current) armBurst();
      });
    },
    [armBurst, beginPlayback, persist],
  );

  const togglePicker = useCallback(() => {
    if (running) {
      stop();
      return;
    }
    setPickerOpen((v) => !v);
  }, [running, stop]);

  useEffect(() => {
    const onForeignStop = () => stop();
    window.addEventListener('jm-stop-music-game', onForeignStop);
    return () => window.removeEventListener('jm-stop-music-game', onForeignStop);
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    running,
    frozen,
    pickerOpen,
    settings,
    togglePicker,
    start,
    resume,
    freeze,
    stop,
    setTrackId,
    setBurst,
    setSpotifyUrl,
    spotifyRef,
  };
}

const CHIP = {
  px: 0.7,
  py: 0.32,
  borderRadius: 1.2,
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(255,255,255,0.16)',
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
  touchAction: 'manipulation' as const,
};

export function MusicGameToolbarPanel({ musicGame }: { musicGame: MusicGameController }) {
  const { settings, setTrackId, setBurst, setSpotifyUrl, start } = musicGame;
  const customOk = Boolean(parseSpotifyUri(settings.spotifyUrl));
  return (
    <Box
      data-pres-chrome=""
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.4,
        bgcolor: 'rgba(22,24,28,0.94)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
        px: 0.7,
        py: 0.5,
        maxWidth: 'min(640px, calc(100vw - 24px))',
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)', px: 0.2 }}>
        Stop-Intervall
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
        {MUSIC_GAME_BURSTS.map((b) => (
          <Box
            key={b.id}
            role="button"
            tabIndex={0}
            title={b.hint}
            onClick={() => setBurst(b.id)}
            {...stylusTap(() => setBurst(b.id))}
            sx={{
              ...CHIP,
              bgcolor: settings.burst === b.id ? 'rgba(255,152,0,0.22)' : 'transparent',
              borderColor: settings.burst === b.id ? 'rgba(255,152,0,0.5)' : 'rgba(255,255,255,0.16)',
              color: settings.burst === b.id ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.9)',
            }}
          >
            {b.label}
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)', px: 0.2, mt: 0.15 }}>
        Aktive Klänge
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
        {MUSIC_GAME_ACTIVE_TRACKS.map((t) => (
          <Box
            key={t.id}
            role="button"
            tabIndex={0}
            title={t.hint}
            onClick={() => setTrackId(t.id)}
            {...stylusTap(() => setTrackId(t.id))}
            sx={{
              ...CHIP,
              bgcolor: settings.trackId === t.id ? 'rgba(255,152,0,0.22)' : 'transparent',
              borderColor: settings.trackId === t.id ? 'rgba(255,152,0,0.5)' : 'rgba(255,255,255,0.16)',
              color: settings.trackId === t.id ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.9)',
            }}
          >
            {t.label}
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)', px: 0.2, mt: 0.15 }}>
        Spotify
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
        {MUSIC_GAME_SPOTIFY_PRESETS.map((t) => (
          <Box
            key={t.id}
            role="button"
            tabIndex={0}
            title={t.hint}
            onClick={() => setTrackId(t.id)}
            {...stylusTap(() => setTrackId(t.id))}
            sx={{
              ...CHIP,
              bgcolor: settings.trackId === t.id ? 'rgba(255,152,0,0.22)' : 'transparent',
              borderColor: settings.trackId === t.id ? 'rgba(255,152,0,0.5)' : 'rgba(255,255,255,0.16)',
              color: settings.trackId === t.id ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.9)',
            }}
          >
            {t.label}
          </Box>
        ))}
        <Box
          role="button"
          tabIndex={0}
          title="Eigene Playlist oder Track"
          onClick={() => setTrackId('custom')}
          {...stylusTap(() => setTrackId('custom'))}
          sx={{
            ...CHIP,
            bgcolor: settings.trackId === 'custom' ? 'rgba(255,152,0,0.22)' : 'transparent',
            borderColor: settings.trackId === 'custom' ? 'rgba(255,152,0,0.5)' : 'rgba(255,255,255,0.16)',
            color: settings.trackId === 'custom' ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.9)',
          }}
        >
          Eigene
        </Box>
      </Box>
      {settings.trackId === 'custom' && (
        <TextField
          size="small"
          placeholder="Spotify-Link (Playlist oder Track) einfügen"
          value={settings.spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          sx={{
            mt: 0.2,
            '& .MuiInputBase-root': {
              color: '#fff',
              fontSize: 12,
              bgcolor: 'rgba(255,255,255,0.06)',
            },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.18)' },
          }}
        />
      )}
      {settings.trackId === 'custom' && settings.spotifyUrl.trim() && !customOk && (
        <Typography sx={{ fontSize: 10, color: '#ef9a9a' }}>
          Bitte einen Spotify-Playlist- oder Track-Link verwenden.
        </Typography>
      )}
      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', px: 0.2 }}>
        Musik stoppt zufällig im gewählten Intervall. Stop hält sofort an.
      </Typography>
      <Box
        role="button"
        tabIndex={0}
        onClick={start}
        {...stylusTap(start)}
        sx={{
          ...CHIP,
          alignSelf: 'flex-start',
          mt: 0.2,
          px: 1.2,
          bgcolor: 'rgba(46,125,50,0.4)',
          borderColor: 'rgba(102,187,106,0.55)',
          color: '#C8E6C9',
        }}
      >
        Start
      </Box>
    </Box>
  );
}

function mountFallbackEmbed(host: HTMLElement, settings: MusicGameSettings) {
  const embed = musicGameSpotifyEmbedUrl(settings.trackId, settings.spotifyUrl);
  if (!embed) return;
  host.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = embed;
  iframe.width = '100%';
  iframe.height = '80';
  iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  iframe.style.border = '0';
  iframe.title = 'Spotify';
  host.appendChild(iframe);
}

export default function PresentationMusicGameOverlay({
  musicGame,
}: {
  musicGame: MusicGameController;
}) {
  const { running, frozen, settings, resume, freeze, stop, spotifyRef } = musicGame;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const frozenRef = useRef(frozen);
  const spotifySetupRef = useRef<'wait' | 'api' | 'fallback'>('wait');
  frozenRef.current = frozen;
  const uri = musicGameActiveUri(settings);

  useEffect(() => {
    if (!running || !uri || !hostRef.current) return undefined;
    const host = hostRef.current;
    host.innerHTML = '';
    spotifySetupRef.current = 'wait';
    let alive = true;
    void createSpotifyGameController(host, uri).then((controller) => {
      if (!alive) return;
      if (controller) {
        spotifySetupRef.current = 'api';
        spotifyRef.current = controller;
        if (!frozenRef.current) spotifyGamePlay(controller);
        return;
      }
      spotifySetupRef.current = 'fallback';
      if (!frozenRef.current) mountFallbackEmbed(host, settings);
    });
    return () => {
      alive = false;
      spotifySetupRef.current = 'wait';
      try {
        spotifyRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      spotifyRef.current = null;
      host.innerHTML = '';
    };
  }, [running, settings.spotifyUrl, settings.trackId, spotifyRef, uri]);

  useEffect(() => {
    if (!running || !uri) return;
    if (spotifySetupRef.current === 'api' && spotifyRef.current) {
      if (frozen) spotifyGamePause(spotifyRef.current);
      else spotifyGamePlay(spotifyRef.current);
      return;
    }
    if (spotifySetupRef.current !== 'fallback') return;
    const host = hostRef.current;
    if (!host) return;
    if (frozen) host.innerHTML = '';
    else if (!host.querySelector('iframe')) mountFallbackEmbed(host, settings);
  }, [frozen, running, settings.spotifyUrl, settings.trackId, spotifyRef, uri]);

  if (!running) return null;

  return (
    <Box
      data-pres-chrome=""
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pb: 'max(72px, calc(58px + env(safe-area-inset-bottom)))',
        bgcolor: frozen ? 'rgba(90, 18, 18, 0.86)' : 'rgba(14, 28, 18, 0.78)',
        color: '#fff',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={frozen ? resume : freeze}
        {...stylusTap(frozen ? resume : freeze)}
        sx={{
          width: { xs: 120, sm: 168 },
          height: { xs: 120, sm: 168 },
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: frozen ? 'rgba(198,40,40,0.35)' : 'rgba(46,125,50,0.28)',
          border: frozen ? '4px solid #ef9a9a' : '4px solid rgba(102,187,106,0.7)',
          mb: 1.5,
          cursor: 'pointer',
        }}
      >
        {frozen ? (
          <PauseIcon sx={{ fontSize: { xs: 78, sm: 104 }, color: '#ffcdd2' }} />
        ) : (
          <MusicIcon sx={{ fontSize: { xs: 78, sm: 104 }, color: '#C8E6C9' }} />
        )}
      </Box>
      <Typography
        sx={{
          fontSize: { xs: '2.4rem', sm: '3.6rem' },
          fontWeight: 900,
          letterSpacing: frozen ? 4 : 1,
          lineHeight: 1,
          color: frozen ? '#ffcdd2' : '#E8F5E9',
        }}
      >
        {frozen ? 'STOP' : 'Musik'}
      </Typography>
      <Typography sx={{ mt: 0.8, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.72)' }}>
        {frozen ? 'Einfrieren — Start für die nächste Runde' : 'Bewegt euch, bis die Musik stoppt'}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.7, mt: 2.2 }}>
        {frozen ? (
          <Box
            role="button"
            tabIndex={0}
            onClick={resume}
            {...stylusTap(resume)}
            sx={{
              ...CHIP,
              px: 1.4,
              py: 0.55,
              fontSize: 13,
              bgcolor: 'rgba(46,125,50,0.5)',
              borderColor: 'rgba(102,187,106,0.7)',
              color: '#C8E6C9',
            }}
          >
            Start
          </Box>
        ) : (
          <Box
            role="button"
            tabIndex={0}
            onClick={freeze}
            {...stylusTap(freeze)}
            sx={{
              ...CHIP,
              px: 1.4,
              py: 0.55,
              fontSize: 13,
              bgcolor: 'rgba(198,40,40,0.45)',
              borderColor: 'rgba(239,154,154,0.7)',
              color: '#ffcdd2',
            }}
          >
            Stop
          </Box>
        )}
        <Box
          role="button"
          tabIndex={0}
          onClick={stop}
          {...stylusTap(stop)}
          sx={{
            ...CHIP,
            px: 1.4,
            py: 0.55,
            fontSize: 13,
            bgcolor: 'rgba(255,255,255,0.12)',
          }}
        >
          Beenden
        </Box>
      </Box>

      {uri ? (
        <>
          <Box
            ref={hostRef}
            sx={{
              mt: 2,
              width: 'min(380px, calc(100% - 32px))',
              minHeight: 80,
              borderRadius: 1.5,
              overflow: 'hidden',
              opacity: frozen ? 0.35 : 1,
              pointerEvents: frozen ? 'none' : 'auto',
            }}
          />
          <Typography sx={{ mt: 0.6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            Falls nichts spielt: Play im Spotify-Fenster tippen.
          </Typography>
        </>
      ) : null}
    </Box>
  );
}
