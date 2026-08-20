import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import {
  MusicNote as MusicOnIcon,
  MusicOff as MusicOffIcon,
  SelfImprovement as QuietIcon,
} from '@mui/icons-material';
import { playPresentationSound } from '../../lib/presentationSound';
import {
  QUIET_WORK_DURATION_MINS,
  QUIET_WORK_TRACKS,
  formatQuietWorkClock,
  loadQuietWorkSettings,
  saveQuietWorkSettings,
  setQuietWorkAmbientVolume,
  spotifyEmbedUrl,
  startQuietWorkAmbient,
  stopQuietWorkAmbient,
  type QuietWorkBuiltInTrackId,
  type QuietWorkSettings,
  type QuietWorkTrackId,
} from '../../lib/presentationQuietWork';
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

export type QuietWorkController = {
  running: boolean;
  finished: boolean;
  pickerOpen: boolean;
  remainingSec: number;
  settings: QuietWorkSettings;
  togglePicker: () => void;
  start: (minutes: number) => void;
  stop: () => void;
  setMusicOn: (on: boolean) => void;
  setTrackId: (id: QuietWorkTrackId) => void;
  setVolume: (v: number) => void;
  setSpotifyUrl: (url: string) => void;
};

export function useQuietWorkController(): QuietWorkController {
  const [settings, setSettings] = useState<QuietWorkSettings>(() => loadQuietWorkSettings());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remainingSec, setRemainingSec] = useState(0);
  const endedRef = useRef(false);

  const persist = useCallback((patch: Partial<QuietWorkSettings>) => {
    const next = saveQuietWorkSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const stopAudio = useCallback(() => {
    stopQuietWorkAmbient();
  }, []);

  const syncAudio = useCallback(
    (next: QuietWorkSettings, active: boolean) => {
      if (!active || !next.musicOn || next.trackId === 'spotify') {
        stopQuietWorkAmbient();
        return;
      }
      void startQuietWorkAmbient(next.trackId as QuietWorkBuiltInTrackId, next.volume);
    },
    [],
  );

  const stop = useCallback(() => {
    endedRef.current = true;
    setRunning(false);
    setFinished(false);
    setEndsAt(null);
    setRemainingSec(0);
    setPickerOpen(false);
    stopAudio();
  }, [stopAudio]);

  const start = useCallback(
    (minutes: number) => {
      const next = persist({ durationMin: minutes });
      const ms = Math.max(1, minutes) * 60 * 1000;
      endedRef.current = false;
      setFinished(false);
      setEndsAt(Date.now() + ms);
      setRemainingSec(Math.round(ms / 1000));
      setRunning(true);
      setPickerOpen(false);
      syncAudio(next, true);
    },
    [persist, syncAudio],
  );

  useEffect(() => {
    if (!running || endsAt == null) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0 && !endedRef.current) {
        endedRef.current = true;
        setFinished(true);
        setRunning(false);
        stopAudio();
        playPresentationSound({ soundId: 'singingbowl' });
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, endsAt, stopAudio]);

  useEffect(() => () => stopQuietWorkAmbient(), []);

  const setMusicOn = useCallback(
    (on: boolean) => {
      const next = persist({ musicOn: on });
      if (running || finished) syncAudio(next, running);
    },
    [finished, persist, running, syncAudio],
  );

  const setTrackId = useCallback(
    (id: QuietWorkTrackId) => {
      const next = persist({ trackId: id });
      if (running) syncAudio(next, true);
    },
    [persist, running, syncAudio],
  );

  const setVolume = useCallback(
    (v: number) => {
      const next = persist({ volume: v });
      setQuietWorkAmbientVolume(next.volume);
    },
    [persist],
  );

  const setSpotifyUrl = useCallback(
    (url: string) => {
      persist({ spotifyUrl: url, trackId: 'spotify' });
    },
    [persist],
  );

  const togglePicker = useCallback(() => {
    if (running || finished) {
      stop();
      return;
    }
    setPickerOpen((v) => !v);
  }, [finished, running, stop]);

  return {
    running,
    finished,
    pickerOpen,
    remainingSec,
    settings,
    togglePicker,
    start,
    stop,
    setMusicOn,
    setTrackId,
    setVolume,
    setSpotifyUrl,
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

export function QuietWorkToolbarPanel({ quietWork }: { quietWork: QuietWorkController }) {
  const { settings, start, setMusicOn, setTrackId, setSpotifyUrl } = quietWork;
  const embed = spotifyEmbedUrl(settings.spotifyUrl);

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
        maxWidth: 'min(520px, calc(100vw - 24px))',
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)', px: 0.2 }}>
        Stillarbeit — Dauer
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
        {QUIET_WORK_DURATION_MINS.map((m) => (
          <Box
            key={m}
            role="button"
            tabIndex={0}
            aria-label={`${m} Minuten Stillarbeit`}
            onClick={() => start(m)}
            {...stylusTap(() => start(m))}
            sx={{
              ...CHIP,
              bgcolor: settings.durationMin === m ? 'rgba(255,152,0,0.22)' : 'transparent',
              borderColor: settings.durationMin === m ? 'rgba(255,152,0,0.5)' : 'rgba(255,255,255,0.16)',
              color: settings.durationMin === m ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.9)',
            }}
          >
            {m} Min
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)', px: 0.2, mt: 0.15 }}>
        Hintergrundmusik
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.4 }}>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setMusicOn(!settings.musicOn)}
          {...stylusTap(() => setMusicOn(!settings.musicOn))}
          sx={{
            ...CHIP,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            bgcolor: settings.musicOn ? 'rgba(46,125,50,0.28)' : 'transparent',
          }}
        >
          {settings.musicOn ? <MusicOnIcon sx={{ fontSize: 14 }} /> : <MusicOffIcon sx={{ fontSize: 14 }} />}
          {settings.musicOn ? 'An' : 'Aus'}
        </Box>
        {QUIET_WORK_TRACKS.map((t) => (
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
      {settings.trackId === 'spotify' && (
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
      {settings.trackId === 'spotify' && !embed && settings.spotifyUrl.trim() && (
        <Typography sx={{ fontSize: 10, color: '#ef9a9a' }}>
          Bitte einen Spotify-Playlist- oder Track-Link verwenden.
        </Typography>
      )}
    </Box>
  );
}

export default function PresentationQuietWorkOverlay({
  quietWork,
}: {
  quietWork: QuietWorkController;
}) {
  const { running, finished, remainingSec, settings, stop, setMusicOn, setTrackId } = quietWork;
  if (!running && !finished) return null;
  const embed = settings.trackId === 'spotify' ? spotifyEmbedUrl(settings.spotifyUrl) : null;
  const showSpotify = Boolean(settings.musicOn && embed);

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
        bgcolor: 'rgba(12, 18, 16, 0.82)',
        color: '#fff',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Box
        sx={{
          width: { xs: 120, sm: 160 },
          height: { xs: 120, sm: 160 },
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(46,125,50,0.22)',
          border: '3px solid rgba(102,187,106,0.55)',
          mb: 1.5,
        }}
      >
        <QuietIcon sx={{ fontSize: { xs: 72, sm: 96 }, color: '#C8E6C9' }} />
      </Box>
      <Typography
        sx={{
          fontSize: { xs: '1.35rem', sm: '1.7rem' },
          fontWeight: 800,
          letterSpacing: 0.6,
          color: '#E8F5E9',
        }}
      >
        {finished ? 'Zeit um' : 'Ruhig arbeiten'}
      </Typography>
      <Typography
        sx={{
          mt: 0.4,
          fontSize: { xs: '3.2rem', sm: '4.4rem' },
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          color: finished ? JOHNNY_PRESENTATION.warm : '#fff',
        }}
      >
        {finished ? '0:00' : formatQuietWorkClock(remainingSec)}
      </Typography>
      <Typography sx={{ mt: 1, fontSize: 13, color: 'rgba(255,255,255,0.62)', fontWeight: 600 }}>
        {finished ? 'Stillarbeit beendet' : 'Leise · konzentriert · für sich'}
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.6, mt: 2.2 }}>
        <IconButton
          aria-label={settings.musicOn ? 'Musik aus' : 'Musik an'}
          onClick={() => setMusicOn(!settings.musicOn)}
          {...stylusTap(() => setMusicOn(!settings.musicOn))}
          sx={{
            color: '#fff',
            bgcolor: settings.musicOn ? 'rgba(46,125,50,0.45)' : 'rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
          }}
        >
          {settings.musicOn ? <MusicOnIcon /> : <MusicOffIcon />}
        </IconButton>
        {QUIET_WORK_TRACKS.filter((t) => t.id !== 'spotify').map((t) => (
          <Box
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => setTrackId(t.id)}
            {...stylusTap(() => setTrackId(t.id))}
            sx={{
              ...CHIP,
              alignSelf: 'center',
              bgcolor: settings.trackId === t.id ? 'rgba(255,152,0,0.28)' : 'rgba(255,255,255,0.08)',
              color: settings.trackId === t.id ? JOHNNY_PRESENTATION.warm : '#fff',
            }}
          >
            {t.label}
          </Box>
        ))}
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setTrackId('spotify')}
          {...stylusTap(() => setTrackId('spotify'))}
          sx={{
            ...CHIP,
            alignSelf: 'center',
            bgcolor: settings.trackId === 'spotify' ? 'rgba(255,152,0,0.28)' : 'rgba(255,255,255,0.08)',
            color: settings.trackId === 'spotify' ? JOHNNY_PRESENTATION.warm : '#fff',
          }}
        >
          Spotify
        </Box>
        <Box
          role="button"
          tabIndex={0}
          onClick={stop}
          {...stylusTap(stop)}
          sx={{
            ...CHIP,
            alignSelf: 'center',
            px: 1.1,
            bgcolor: 'rgba(255,255,255,0.12)',
          }}
        >
          Beenden
        </Box>
      </Box>

      {showSpotify && embed && (
        <Box sx={{ mt: 2, width: 'min(420px, calc(100% - 32px))', borderRadius: 1.5, overflow: 'hidden' }}>
          <iframe
            title="Spotify"
            src={embed}
            width="100%"
            height="80"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ border: 0, display: 'block' }}
          />
        </Box>
      )}
    </Box>
  );
}
