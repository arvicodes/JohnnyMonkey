import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import {
  DeleteOutline as DeleteIcon,
  FiberManualRecord as RecordIcon,
  Mic as MicIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import type { SlideAudioTrack } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import {
  formatSlideAudioDuration,
  pickRecorderMime,
  recorderErrorMessage,
  saveSlideAudioFile,
  slideAudioIsSupported,
  slideAudioUrl,
  SLIDE_AUDIO_MAX_MS,
} from '../../lib/presentationSlideAudio';

type RecorderState = 'idle' | 'recording' | 'saving';

type PresentationSlideAudioRecorderProps = {
  slideId: string;
  lessonPath?: string;
  track?: SlideAudioTrack;
  disabled?: boolean;
  onChange: (track: SlideAudioTrack | undefined) => void;
  onError?: (message: string) => void;
};

const BTN_SX = {
  width: 26,
  height: 26,
  p: 0.2,
  color: PRES_EDITOR_UI.textMuted,
  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
  '&.Mui-disabled': { color: 'rgba(95,99,104,0.35)' },
} as const;

export default function PresentationSlideAudioRecorder({
  slideId,
  lessonPath,
  track,
  disabled,
  onChange,
  onError,
}: PresentationSlideAudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const mimeRef = useRef('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const supported = slideAudioIsSupported();
  const src = slideAudioUrl(track);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
  }, []);

  const finishRecording = useCallback(
    async (blob: Blob, durationMs: number) => {
      if (!lessonPath) {
        onError?.('Kein Stundenordner — Aufnahme nicht gespeichert.');
        setState('idle');
        return;
      }
      setState('saving');
      try {
        const path = await saveSlideAudioFile(lessonPath, slideId, blob, blob.type || mimeRef.current);
        onChange({
          path,
          durationMs: Math.max(400, Math.round(durationMs)),
          recordedAt: new Date().toISOString(),
        });
      } catch (err) {
        onError?.(recorderErrorMessage(err));
      } finally {
        setState('idle');
        setElapsedMs(0);
      }
    },
    [lessonPath, onChange, onError, slideId],
  );

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle' || !supported) return;
    if (!lessonPath) {
      onError?.('Bitte die Präsentation über eine Stunde öffnen.');
      return;
    }
    stopPlayback();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const picked = pickRecorderMime();
      mimeRef.current = picked.mimeType;
      const rec = picked.mimeType
        ? new MediaRecorder(stream, { mimeType: picked.mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onerror = () => {
        stopStream();
        stopTick();
        setState('idle');
        onError?.('Aufnahme fehlgeschlagen.');
      };
      rec.onstop = () => {
        const durationMs = Math.min(Date.now() - startedAtRef.current, SLIDE_AUDIO_MAX_MS);
        stopStream();
        stopTick();
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeRef.current || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size < 80) {
          setState('idle');
          setElapsedMs(0);
          onError?.('Aufnahme war zu kurz.');
          return;
        }
        void finishRecording(blob, durationMs);
      };
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setState('recording');
      rec.start(250);
      stopTick();
      tickRef.current = window.setInterval(() => {
        const next = Date.now() - startedAtRef.current;
        setElapsedMs(next);
        if (next >= SLIDE_AUDIO_MAX_MS) stopRecording();
      }, 200);
    } catch (err) {
      stopStream();
      setState('idle');
      onError?.(recorderErrorMessage(err));
    }
  }, [disabled, finishRecording, lessonPath, onError, state, stopPlayback, stopStream, stopTick, stopRecording, supported]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      stopStream();
      stopTick();
    };
  }, [stopStream, stopTick]);

  useEffect(() => {
    setPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true)).catch(() => {
      setPlaying(false);
      onError?.('Audio konnte nicht abgespielt werden.');
    });
  };

  const busy = state === 'saving';
  const recording = state === 'recording';
  const hasTrack = Boolean(track?.path);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.35,
        minWidth: 0,
        px: 1,
        py: 0.4,
        borderBottom: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        bgcolor: recording ? 'rgba(211,47,47,0.06)' : '#fff',
      }}
    >
      {src ? (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      ) : null}

      {recording ? (
        <>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: '#d32f2f',
              flexShrink: 0,
              animation: 'jm-audio-pulse 1.1s ease-in-out infinite',
              '@keyframes jm-audio-pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.35 },
              },
            }}
          />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#c62828', minWidth: 36 }}>
            {formatSlideAudioDuration(elapsedMs)}
          </Typography>
          <Tooltip title="Aufnahme stoppen">
            <IconButton size="small" onClick={stopRecording} aria-label="Aufnahme stoppen" sx={{ ...BTN_SX, color: '#c62828' }}>
              <StopIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </>
      ) : busy ? (
        <>
          <CircularProgress size={14} sx={{ color: PRES_EDITOR_UI.accent }} />
          <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.textMuted }}>Speichern…</Typography>
        </>
      ) : hasTrack ? (
        <>
          <Tooltip title={playing ? 'Pause' : 'Abspielen'}>
            <span>
              <IconButton
                size="small"
                onClick={togglePlay}
                disabled={disabled}
                aria-label={playing ? 'Pause' : 'Audio abspielen'}
                sx={{ ...BTN_SX, color: PRES_EDITOR_UI.accent }}
              >
                {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRES_EDITOR_UI.text, minWidth: 32 }}>
            {formatSlideAudioDuration(track?.durationMs)}
          </Typography>
          <Tooltip title={supported ? 'Neu einsprechen' : 'Aufnahme nicht unterstützt'}>
            <span>
              <IconButton
                size="small"
                onClick={() => void startRecording()}
                disabled={disabled || !supported}
                aria-label="Neu einsprechen"
                sx={BTN_SX}
              >
                <RecordIcon sx={{ fontSize: 16, color: '#d32f2f' }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Ton löschen">
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  stopPlayback();
                  onChange(undefined);
                }}
                disabled={disabled}
                aria-label="Ton löschen"
                sx={BTN_SX}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip
            title={
              !supported
                ? 'Aufnahme nicht unterstützt'
                : disabled
                  ? 'Nicht bearbeitbar'
                  : 'Einsprechen'
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={() => void startRecording()}
                disabled={disabled || !supported}
                aria-label="Einsprechen"
                sx={BTN_SX}
              >
                <MicIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Typography sx={{ fontSize: 11, color: PRES_EDITOR_UI.textMuted, fontWeight: 600 }}>
            Einsprechen
          </Typography>
        </>
      )}
    </Box>
  );
}
