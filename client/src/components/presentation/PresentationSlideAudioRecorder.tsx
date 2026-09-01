import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import {
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  Mic as MicIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material';
import type { SlideAudioTrack } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import {
  formatSlideAudioDuration,
  openMicStream,
  openScreenStream,
  pickRecorderMime,
  pickScreenRecorderMime,
  recorderErrorMessage,
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
  defaultKind?: SlideRecordKind;
  disabled?: boolean;
  onAudioChange: (track: SlideAudioTrack | undefined, slideId: string) => void;
  onScreenChange: (track: SlideAudioTrack | undefined, slideId: string) => void;
  onError?: (message: string) => void;
  onSessionChange?: (active: boolean) => void;
  onClose?: () => void;
};

const BTN = {
  textTransform: 'none' as const,
  fontWeight: 800,
  fontSize: 12,
  minHeight: 30,
  px: 1.25,
  borderRadius: 1.25,
};

export default function PresentationSlideAudioRecorder({
  slideId,
  lessonPath,
  audioTrack,
  screenTrack,
  defaultKind = 'audio',
  disabled,
  onAudioChange,
  onScreenChange,
  onError,
  onSessionChange,
  onClose,
}: PresentationSlideAudioRecorderProps) {
  const [kind, setKind] = useState<SlideRecordKind>(defaultKind);
  const [session, setSession] = useState<Session>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
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
  const tickRef = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const pauseOk = slideAudioPauseSupported();
  const screenOk = slideScreenIsSupported();
  const track = kind === 'screen' ? screenTrack : audioTrack;
  const src = slideAudioUrl(track);
  const maxMs = kind === 'screen' ? SLIDE_SCREEN_MAX_MS : SLIDE_AUDIO_MAX_MS;

  sessionRef.current = session;
  kindRef.current = kind;

  useEffect(() => {
    if (sessionRef.current === 'idle') setKind(defaultKind);
  }, [defaultKind]);

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
    if (!media) return;
    media.pause();
    media.currentTime = 0;
    setPlaying(false);
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
        const path = await saveSlideAudioFile(
          lessonPath,
          targetSlideId,
          blob,
          blob.type || mimeRef.current,
          recordKind,
        );
        if (!aliveRef.current) return;
        const next = {
          path,
          durationMs: Math.max(400, Math.round(durationMs)),
          recordedAt: new Date().toISOString(),
        };
        if (recordKind === 'screen') onScreenChange(next, targetSlideId);
        else onAudioChange(next, targetSlideId);
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
    [lessonPath, onAudioChange, onScreenChange, onSessionChange, report],
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
    const media = mediaRef.current;
    if (media) {
      media.pause();
      media.currentTime = 0;
    }
  }, [src, kind]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media || !src) return;
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

  const busy = session === 'saving' || session === 'requesting';
  const live = session === 'recording' || session === 'paused';
  const hasTrack = Boolean(track?.path);
  const canClose = !live && session !== 'saving' && session !== 'requesting';
  const kindLocked = live || busy;

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.75,
        px: 1.25,
        py: 0.75,
        bgcolor: session === 'recording' ? 'rgba(211,47,47,0.08)' : session === 'paused' ? 'rgba(255,152,0,0.1)' : '#fff',
        borderBottom: `1px solid ${PRES_EDITOR_UI.barBorder}`,
      }}
    >
      {src && kind === 'audio' ? (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={src}
          preload="metadata"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      ) : null}
      {src && kind === 'screen' ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          src={src}
          preload="metadata"
          playsInline
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          style={{ width: 72, height: 40, borderRadius: 4, background: '#111', objectFit: 'cover' }}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
          borderRadius: 1.25,
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
            minHeight: 28,
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
            minHeight: 28,
            borderRadius: 0,
            bgcolor: kind === 'screen' ? PRES_EDITOR_UI.accentSoft : 'transparent',
            color: kind === 'screen' ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
          }}
        >
          Bildschirm
        </Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mr: 0.5 }}>
        {kind === 'screen' ? (
          <VideocamIcon sx={{ fontSize: 18, color: session === 'recording' ? '#c62828' : PRES_EDITOR_UI.accent }} />
        ) : (
          <MicIcon sx={{ fontSize: 18, color: session === 'recording' ? '#c62828' : PRES_EDITOR_UI.accent }} />
        )}
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: PRES_EDITOR_UI.text }}>
          {session === 'recording'
            ? 'Aufnahme läuft'
            : session === 'paused'
              ? 'Pause'
              : session === 'requesting'
                ? kind === 'screen'
                  ? 'Fenster wählen…'
                  : 'Mikrofon…'
                : session === 'saving'
                  ? 'Speichern…'
                  : kind === 'screen'
                    ? 'Bildschirm'
                    : 'Einsprechen'}
        </Typography>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: session === 'recording' ? '#c62828' : PRES_EDITOR_UI.text,
            minWidth: 40,
          }}
        >
          {formatSlideAudioDuration(live ? elapsedMs : track?.durationMs)}
        </Typography>
      </Box>

      {session === 'requesting' || session === 'saving' ? (
        <CircularProgress size={16} sx={{ color: PRES_EDITOR_UI.accent }} />
      ) : live ? (
        <>
          {pauseOk && session === 'recording' ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PauseIcon sx={{ fontSize: 16 }} />}
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
              startIcon={<PlayIcon sx={{ fontSize: 16 }} />}
              onClick={resumeRecording}
              sx={{ ...BTN, bgcolor: PRES_EDITOR_UI.accent, '&:hover': { bgcolor: '#2e7d32' } }}
            >
              Weiter
            </Button>
          ) : null}
          <Button
            size="small"
            variant="contained"
            startIcon={<StopIcon sx={{ fontSize: 16 }} />}
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
            startIcon={
              kind === 'screen' ? <VideocamIcon sx={{ fontSize: 16 }} /> : <MicIcon sx={{ fontSize: 16 }} />
            }
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
                startIcon={playing ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayIcon sx={{ fontSize: 16 }} />}
                onClick={togglePlay}
                sx={{ ...BTN, borderColor: PRES_EDITOR_UI.accent, color: PRES_EDITOR_UI.accent }}
              >
                {playing ? 'Pause' : 'Abspielen'}
              </Button>
              <Tooltip title="Aufnahme löschen">
                <IconButton
                  size="small"
                  disabled={disabled}
                  aria-label="Aufnahme löschen"
                  onClick={() => {
                    stopPlayback();
                    if (kind === 'screen') onScreenChange(undefined, slideId);
                    else onAudioChange(undefined, slideId);
                  }}
                  sx={{ color: PRES_EDITOR_UI.textMuted }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </>
          ) : null}
        </>
      )}

      {error ? (
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#c62828', flex: '1 1 160px' }}>
          {error}
        </Typography>
      ) : !live && kind === 'screen' ? (
        <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.textMuted }}>
          Fenster oder Tab wählen — Stimme wird mit aufgenommen. Max. {Math.round(maxMs / 60000)} Min.
        </Typography>
      ) : null}

      {canClose && onClose ? (
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Aufnahmeleiste schließen"
          sx={{ ml: 'auto', color: PRES_EDITOR_UI.textMuted }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      ) : null}
    </Box>
  );
}
