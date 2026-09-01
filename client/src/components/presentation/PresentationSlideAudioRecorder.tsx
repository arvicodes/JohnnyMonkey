import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  Mic as MicIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material';
import type { SlideAudioTrack } from '../../lib/presentationDeck';
import { MAX_SLIDE_MEDIA_VERSIONS } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  formatSlideAudioDuration,
  openMicStream,
  openScreenStream,
  pickRecorderMime,
  pickScreenRecorderMime,
  recorderErrorMessage,
  newSlideMediaVersionId,
  saveSlideAudioFile,
  slideAudioPauseSupported,
  slideAudioUrl,
  slideScreenIsSupported,
  SLIDE_AUDIO_MAX_MS,
  SLIDE_SCREEN_MAX_MS,
  type SlideRecordKind,
} from '../../lib/presentationSlideAudio';

type Session = 'idle' | 'requesting' | 'recording' | 'paused' | 'saving';

type PresentationSlideAudioRecorderProps = {
  slideId: string;
  lessonPath?: string;
  audioTrack?: SlideAudioTrack;
  screenTrack?: SlideAudioTrack;
  audioTracks?: SlideAudioTrack[];
  screenTracks?: SlideAudioTrack[];
  activeAudioIndex?: number;
  activeScreenIndex?: number;
  defaultKind?: SlideRecordKind;
  disabled?: boolean;
  onAudioTracksChange: (tracks: SlideAudioTrack[], activeIndex: number, slideId: string) => void;
  onScreenTracksChange: (tracks: SlideAudioTrack[], activeIndex: number, slideId: string) => void;
  onError?: (message: string) => void;
  onSessionChange?: (active: boolean) => void;
  onClose?: () => void;
};

const BTN = {
  textTransform: 'none' as const,
  fontWeight: 700,
  fontSize: 11,
  minHeight: 22,
  minWidth: 0,
  width: 'auto',
  flexShrink: 0,
  lineHeight: 1.1,
  px: 0.85,
  py: 0,
  borderRadius: 1,
};

const ICON_BTN = {
  width: 22,
  height: 22,
  minWidth: 22,
  p: 0,
  flexShrink: 0,
  color: PRES_EDITOR_UI.textMuted,
};

export default function PresentationSlideAudioRecorder({
  slideId,
  lessonPath,
  audioTrack,
  screenTrack,
  audioTracks,
  screenTracks,
  activeAudioIndex,
  activeScreenIndex,
  defaultKind = 'audio',
  disabled,
  onAudioTracksChange,
  onScreenTracksChange,
  onError,
  onSessionChange,
  onClose,
}: PresentationSlideAudioRecorderProps) {
  const [kind, setKind] = useState<SlideRecordKind>(defaultKind);
  const [session, setSession] = useState<Session>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [deleteAsk, setDeleteAsk] = useState(false);
  const [versionIndex, setVersionIndex] = useState(0);
  const [recordAsNew, setRecordAsNew] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef('');
  const kindRef = useRef<SlideRecordKind>(kind);
  const recordingSlideIdRef = useRef(slideId);
  const accumulatedMsRef = useRef(0);
  const segmentStartedAtRef = useRef(0);
  const sessionRef = useRef<Session>('idle');
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const pauseOk = slideAudioPauseSupported();
  const screenOk = slideScreenIsSupported();
  const audioList = audioTracks?.length ? audioTracks : audioTrack?.path ? [audioTrack] : [];
  const screenList = screenTracks?.length ? screenTracks : screenTrack?.path ? [screenTrack] : [];
  const tracks = kind === 'screen' ? screenList : audioList;
  const selectedIndex = recordAsNew ? tracks.length : Math.min(versionIndex, Math.max(0, tracks.length - 1));
  const track = recordAsNew ? undefined : tracks[selectedIndex];
  const audioSrc = kind === 'audio' ? slideAudioUrl(track) : '';
  const screenSrc = slideAudioUrl(kind === 'screen' ? track : undefined, { video: true });
  const src = kind === 'screen' ? screenSrc : audioSrc;
  const versionIndexRef = useRef(0);
  const recordAsNewRef = useRef(false);
  const tracksRef = useRef<SlideAudioTrack[]>([]);
  versionIndexRef.current = selectedIndex;
  recordAsNewRef.current = recordAsNew;
  tracksRef.current = tracks;

  sessionRef.current = session;
  kindRef.current = kind;

  useEffect(() => {
    if (sessionRef.current === 'idle') setKind(defaultKind);
  }, [defaultKind]);

  useEffect(() => {
    setRecordAsNew(false);
    setVersionIndex(kind === 'screen' ? activeScreenIndex ?? 0 : activeAudioIndex ?? 0);
  }, [slideId, kind, activeAudioIndex, activeScreenIndex]);

  const currentElapsed = useCallback(() => {
    if (sessionRef.current === 'recording') {
      return accumulatedMsRef.current + (Date.now() - segmentStartedAtRef.current);
    }
    return accumulatedMsRef.current;
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    tickRef.current = window.setInterval(() => {
      const limit = kindRef.current === 'screen' ? SLIDE_SCREEN_MAX_MS : SLIDE_AUDIO_MAX_MS;
      const next = Math.min(currentElapsed(), limit);
      setElapsedMs(next);
      if (next >= limit && recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
    }, 200);
  }, [currentElapsed, stopTick]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      media.pause();
      media.currentTime = 0;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setPlaying(false);
    setPlayerOpen(false);
  }, []);

  const report = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const finishRecording = useCallback(
    async (blob: Blob, durationMs: number, recordKind: SlideRecordKind) => {
      const targetSlideId = recordingSlideIdRef.current;
      if (!lessonPath) {
        report('Kein Stundenordner — Aufnahme nicht gespeichert.');
        setSession('idle');
        onSessionChange?.(false);
        return;
      }
      setSession('saving');
      try {
        const existing = recordAsNewRef.current ? undefined : tracksRef.current[versionIndexRef.current];
        const versionId = existing?.id || newSlideMediaVersionId();
        const path = await saveSlideAudioFile(
          lessonPath,
          targetSlideId,
          blob,
          blob.type || mimeRef.current,
          recordKind,
          versionId,
        );
        if (!aliveRef.current) return;
        const next = {
          path,
          durationMs: Math.max(400, Math.round(durationMs)),
          recordedAt: new Date().toISOString(),
          id: versionId,
        };
        let list = [...tracksRef.current];
        let idx = versionIndexRef.current;
        if (recordAsNewRef.current || idx >= list.length) {
          list = [...list, next].slice(0, MAX_SLIDE_MEDIA_VERSIONS);
          idx = list.length - 1;
        } else {
          list[idx] = next;
        }
        if (recordKind === 'screen') onScreenTracksChange(list, idx, targetSlideId);
        else onAudioTracksChange(list, idx, targetSlideId);
        setRecordAsNew(false);
        setVersionIndex(idx);
        setError('');
      } catch (err) {
        if (aliveRef.current) report(recorderErrorMessage(err, recordKind));
      } finally {
        if (aliveRef.current) {
          setSession('idle');
          setElapsedMs(0);
          accumulatedMsRef.current = 0;
          onSessionChange?.(false);
        }
      }
    },
    [lessonPath, onAudioTracksChange, onScreenTracksChange, onSessionChange, report],
  );

  const startRecording = useCallback(async () => {
    if (disabled || sessionRef.current === 'requesting' || sessionRef.current === 'saving') return;
    if (sessionRef.current === 'recording' || sessionRef.current === 'paused') return;
    if (!lessonPath) {
      report('Bitte die Präsentation über eine Stunde öffnen.');
      return;
    }
    const recordKind = kindRef.current;
    if (recordKind === 'screen' && !screenOk) {
      report('Bildschirm-Aufnahme wird in diesem Browser nicht unterstützt.');
      return;
    }
    stopPlayback();
    setError('');
    setSession('requesting');
    onSessionChange?.(true);
    try {
      const stream = recordKind === 'screen' ? await openScreenStream() : await openMicStream();
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      recordingSlideIdRef.current = slideId;
      streamRef.current = stream;
      const picked = recordKind === 'screen' ? pickScreenRecorderMime() : pickRecorderMime();
      mimeRef.current = picked.mimeType;
      const rec = picked.mimeType
        ? new MediaRecorder(stream, {
            mimeType: picked.mimeType,
            ...(recordKind === 'screen'
              ? { videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 64_000 }
              : {}),
          })
        : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onerror = () => {
        stopStream();
        stopTick();
        setSession('idle');
        onSessionChange?.(false);
        report('Aufnahme fehlgeschlagen.');
      };
      rec.onstop = () => {
        const limit = recordKind === 'screen' ? SLIDE_SCREEN_MAX_MS : SLIDE_AUDIO_MAX_MS;
        const durationMs = Math.min(currentElapsed(), limit);
        stopStream();
        stopTick();
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || mimeRef.current || (recordKind === 'screen' ? 'video/webm' : 'audio/webm'),
        });
        chunksRef.current = [];
        if (blob.size < 80) {
          setSession('idle');
          setElapsedMs(0);
          accumulatedMsRef.current = 0;
          onSessionChange?.(false);
          report('Aufnahme war zu kurz.');
          return;
        }
        void finishRecording(blob, durationMs, recordKind);
      };
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
          }
        });
      });
      accumulatedMsRef.current = 0;
      segmentStartedAtRef.current = Date.now();
      setElapsedMs(0);
      setSession('recording');
      try {
        rec.start(250);
      } catch {
        rec.start();
      }
      startTick();
    } catch (err) {
      stopStream();
      setSession('idle');
      onSessionChange?.(false);
      report(recorderErrorMessage(err, recordKind));
    }
  }, [
    currentElapsed,
    disabled,
    finishRecording,
    lessonPath,
    onSessionChange,
    report,
    screenOk,
    slideId,
    startTick,
    stopPlayback,
    stopStream,
    stopTick,
  ]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording' || !pauseOk) return;
    try {
      rec.pause();
      accumulatedMsRef.current = currentElapsed();
      stopTick();
      setElapsedMs(accumulatedMsRef.current);
      setSession('paused');
    } catch (err) {
      report(recorderErrorMessage(err, kindRef.current));
    }
  }, [currentElapsed, pauseOk, report, stopTick]);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'paused') return;
    try {
      rec.resume();
      segmentStartedAtRef.current = Date.now();
      setSession('recording');
      startTick();
    } catch (err) {
      report(recorderErrorMessage(err, kindRef.current));
    }
  }, [report, startTick]);

  const finish = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    if (rec.state === 'paused') {
      accumulatedMsRef.current = currentElapsed();
      try {
        rec.resume();
      } catch {
        /* stop still works from paused in most browsers */
      }
    }
    rec.stop();
  }, [currentElapsed]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.onstop = null;
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      stopStream();
      stopTick();
    };
  }, [stopStream, stopTick]);

  useEffect(() => {
    setPlaying(false);
    setPlayerOpen(false);
    setDeleteAsk(false);
    const media = mediaRef.current;
    if (media) {
      media.pause();
      media.currentTime = 0;
    }
  }, [src, kind]);

  const togglePlay = () => {
    if (kind === 'screen') {
      if (!screenSrc) return;
      setPlayerOpen(true);
      return;
    }
    const media = mediaRef.current;
    if (!media || !audioSrc) return;
    if (playing) {
      media.pause();
      setPlaying(false);
      return;
    }
    void media
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false);
        report('Aufnahme konnte nicht abgespielt werden.');
      });
  };

  const closePlayer = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    setPlayerOpen(false);
    setPlaying(false);
  };

  const confirmDelete = () => {
    stopPlayback();
    const list = tracks.filter((_, i) => i !== selectedIndex);
    const idx = Math.min(selectedIndex, Math.max(0, list.length - 1));
    if (kind === 'screen') onScreenTracksChange(list, idx, slideId);
    else onAudioTracksChange(list, idx, slideId);
    setVersionIndex(idx);
    setRecordAsNew(false);
    setDeleteAsk(false);
  };

  const busy = session === 'saving' || session === 'requesting';
  const live = session === 'recording' || session === 'paused';
  const hasTrack = Boolean(track?.path);
  const canClose = !live && session !== 'saving' && session !== 'requesting';
  const kindLocked = live || busy;

  return (
    <>
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.45,
        px: 1,
        py: 0.35,
        bgcolor: session === 'recording' ? 'rgba(211,47,47,0.08)' : session === 'paused' ? 'rgba(255,152,0,0.1)' : '#fff',
        borderBottom: `1px solid ${PRES_EDITOR_UI.barBorder}`,
      }}
    >
      {audioSrc && kind === 'audio' ? (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={audioSrc}
          preload="metadata"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
          borderRadius: 1,
          overflow: 'hidden',
          opacity: kindLocked ? 0.55 : 1,
          pointerEvents: kindLocked ? 'none' : 'auto',
        }}
      >
        <Button
          size="small"
          onClick={() => setKind('audio')}
          sx={{
            ...BTN,
            borderRadius: 0,
            bgcolor: kind === 'audio' ? PRES_EDITOR_UI.accentSoft : 'transparent',
            color: kind === 'audio' ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
          }}
        >
          Ton
        </Button>
        <Button
          size="small"
          disabled={!screenOk}
          onClick={() => setKind('screen')}
          sx={{
            ...BTN,
            borderRadius: 0,
            bgcolor: kind === 'screen' ? PRES_EDITOR_UI.accentSoft : 'transparent',
            color: kind === 'screen' ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
          }}
        >
          Bildschirm
        </Button>
      </Box>

      {(tracks.length > 0 || recordAsNew) && !live ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
            borderRadius: 1,
            overflow: 'hidden',
            opacity: kindLocked ? 0.55 : 1,
            pointerEvents: kindLocked ? 'none' : 'auto',
          }}
        >
          {tracks.map((_, i) => (
            <Button
              key={`v-${i}`}
              size="small"
              onClick={() => {
                setRecordAsNew(false);
                setVersionIndex(i);
                if (kind === 'screen') onScreenTracksChange(tracks, i, slideId);
                else onAudioTracksChange(tracks, i, slideId);
              }}
              sx={{
                ...BTN,
                px: 0.7,
                borderRadius: 0,
                bgcolor: !recordAsNew && selectedIndex === i ? PRES_EDITOR_UI.accentSoft : 'transparent',
                color: !recordAsNew && selectedIndex === i ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
              }}
            >
              {`V${i + 1}`}
            </Button>
          ))}
          {tracks.length < MAX_SLIDE_MEDIA_VERSIONS ? (
            <Button
              size="small"
              onClick={() => setRecordAsNew(true)}
              sx={{
                ...BTN,
                px: 0.7,
                borderRadius: 0,
                bgcolor: recordAsNew ? PRES_EDITOR_UI.accentSoft : 'transparent',
                color: recordAsNew ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
              }}
            >
              +
            </Button>
          ) : null}
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
        {kind === 'screen' ? (
          <VideocamIcon sx={{ fontSize: 14, color: session === 'recording' ? '#c62828' : PRES_EDITOR_UI.accent }} />
        ) : (
          <MicIcon sx={{ fontSize: 14, color: session === 'recording' ? '#c62828' : PRES_EDITOR_UI.accent }} />
        )}
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: session === 'recording' ? '#c62828' : PRES_EDITOR_UI.text,
            minWidth: 34,
          }}
        >
          {formatSlideAudioDuration(live ? elapsedMs : track?.durationMs)}
        </Typography>
        {session === 'requesting' || session === 'saving' || session === 'paused' ? (
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRES_EDITOR_UI.textMuted }}>
            {session === 'paused'
              ? 'Pause'
              : session === 'requesting'
                ? kind === 'screen'
                  ? 'Fenster…'
                  : 'Mikro…'
                : 'Speichern…'}
          </Typography>
        ) : null}
      </Box>

      {session === 'requesting' || session === 'saving' ? (
        <CircularProgress size={12} sx={{ color: PRES_EDITOR_UI.accent }} />
      ) : live ? (
        <>
          {pauseOk && session === 'recording' ? (
            <Button
              size="small"
              variant="outlined"
              onClick={pauseRecording}
              sx={{ ...BTN, borderColor: '#fb8c00', color: '#e65100' }}
            >
              Pause
            </Button>
          ) : null}
          {pauseOk && session === 'paused' ? (
            <Button
              size="small"
              variant="contained"
              onClick={resumeRecording}
              sx={{ ...BTN, bgcolor: PRES_EDITOR_UI.accent, '&:hover': { bgcolor: '#2e7d32' } }}
            >
              Weiter
            </Button>
          ) : null}
          <Button
            size="small"
            variant="contained"
            onClick={finish}
            sx={{ ...BTN, bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
          >
            Fertig
          </Button>
        </>
      ) : (
        <>
          <Button
            size="small"
            variant="contained"
            disabled={disabled || busy || (kind === 'screen' && !screenOk)}
            onClick={() => void startRecording()}
            sx={{ ...BTN, bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
          >
            Start
          </Button>
          {hasTrack ? (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={disabled}
                onClick={togglePlay}
                sx={{ ...BTN, borderColor: PRES_EDITOR_UI.accent, color: PRES_EDITOR_UI.accent }}
              >
                {kind === 'screen' ? 'Ansehen' : playing ? 'Pause' : 'Abspielen'}
              </Button>
              <Tooltip title="Aufnahme löschen">
                <span>
                  <IconButton
                    size="small"
                    disabled={disabled}
                    aria-label="Aufnahme löschen"
                    onClick={() => setDeleteAsk(true)}
                    sx={ICON_BTN}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          ) : null}
        </>
      )}

      {error ? (
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#c62828', flex: '1 1 140px' }}>
          {error}
        </Typography>
      ) : null}

      {canClose && onClose ? (
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Aufnahmeleiste schließen"
          sx={{ ...ICON_BTN, ml: 'auto' }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      ) : null}
    </Box>

    <Dialog open={deleteAsk} onClose={() => setDeleteAsk(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 800, py: 1.25 }}>
        {kind === 'screen' ? 'Bildschirm-Aufnahme löschen?' : 'Tonaufnahme löschen?'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Die Aufnahme dieser Folie wird entfernt. Das lässt sich nicht rückgängig machen.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 1.5, gap: 0.5 }}>
        <Button size="small" onClick={() => setDeleteAsk(false)} sx={BTN}>
          Abbrechen
        </Button>
        <Button size="small" color="error" variant="contained" onClick={confirmDelete} sx={BTN}>
          Löschen
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={playerOpen} onClose={closePlayer} maxWidth="md" fullWidth>
      <DialogTitle sx={{ ...dialogCloseTitleSx, fontSize: 16, fontWeight: 800, py: 1.25 }}>
        Bildschirm-Aufnahme
        <DialogCloseIconButton onClose={closePlayer} />
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 2, px: 2 }}>
        {screenSrc ? (
          <video
            ref={videoRef}
            src={screenSrc}
            controls
            autoPlay
            playsInline
            style={{ width: '100%', maxHeight: '70vh', background: '#111', borderRadius: 8, display: 'block' }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
