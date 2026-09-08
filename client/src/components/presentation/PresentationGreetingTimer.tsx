import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  formatGreetingClock,
  loadGreetingBest,
  saveGreetingResult,
  type GreetingBestRecord,
} from '../../lib/presentationGreetingTimer';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';
import { playPresentationSoundFor, unlockPresentationAudio } from '../../lib/presentationSound';

export type PresentationGreetingTimerProps = {
  active: boolean;
  lessonPath: string;
  /** Nach Stopp: weiter zur NOW-Folie */
  onContinue?: () => void;
  compact?: boolean;
};

/**
 * Stoppuhr auf der Startfolie (Play): startet mit der Folie,
 * läuft bis Stopp → Fanfare + Bestzeit; Ziel = möglichst kurz.
 */
export default function PresentationGreetingTimer({
  active,
  lessonPath,
  onContinue,
  compact = false,
}: PresentationGreetingTimerProps) {
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [best, setBest] = useState<GreetingBestRecord | null>(() => loadGreetingBest(lessonPath));
  const [isNewBest, setIsNewBest] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  const stopTick = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const tick = useCallback(() => {
    const started = startedAtRef.current;
    if (started == null) return;
    setElapsedMs(Math.max(0, performance.now() - started));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    unlockPresentationAudio();
    stopTick();
    startedAtRef.current = performance.now();
    setElapsedMs(0);
    setFinished(false);
    setIsNewBest(false);
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTick, tick]);

  const stop = useCallback(() => {
    if (!running && !startedAtRef.current) return;
    stopTick();
    const started = startedAtRef.current;
    const ms = started != null ? Math.max(0, performance.now() - started) : elapsedMs;
    startedAtRef.current = null;
    setElapsedMs(ms);
    setRunning(false);
    setFinished(true);
    playPresentationSoundFor('entryDone');
    if (lessonPath) {
      const { record, isNewBest: neu } = saveGreetingResult(lessonPath, ms);
      setBest(record);
      setIsNewBest(neu);
    }
  }, [elapsedMs, lessonPath, running, stopTick]);

  // Folie aktiv → Timer frisch starten
  useEffect(() => {
    if (!active || !lessonPath) {
      stopTick();
      setRunning(false);
      setFinished(false);
      setElapsedMs(0);
      startedAtRef.current = null;
      return undefined;
    }
    setBest(loadGreetingBest(lessonPath));
    unlockPresentationAudio();
    stopTick();
    startedAtRef.current = performance.now();
    setElapsedMs(0);
    setFinished(false);
    setIsNewBest(false);
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
    return () => stopTick();
  }, [active, lessonPath, stopTick, tick]);

  useEffect(() => () => stopTick(), [stopTick]);

  if (!active) return null;

  const clock = formatGreetingClock(elapsedMs, !finished || running);
  const bestLabel = best ? formatGreetingClock(best.bestMs, false) : null;

  return (
    <Box
      data-pres-greeting-timer=""
      data-pres-toolbar=""
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      sx={{
        position: 'absolute',
        left: '50%',
        bottom: compact ? 10 : 18,
        transform: 'translateX(-50%)',
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 0.6 : 0.9,
        px: compact ? 1.25 : 1.75,
        py: compact ? 0.85 : 1.15,
        borderRadius: 2,
        bgcolor: finished
          ? 'rgba(46, 125, 50, 0.92)'
          : 'rgba(27, 29, 33, 0.88)',
        color: '#fff',
        boxShadow: '0 6px 22px rgba(0,0,0,0.35)',
        border: finished
          ? '2px solid rgba(255,255,255,0.35)'
          : `2px solid ${JOHNNY_PRESENTATION.warm}`,
        minWidth: compact ? 168 : 220,
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <Typography
        sx={{
          fontSize: compact ? '0.62rem' : '0.72rem',
          fontWeight: 700,
          letterSpacing: 0.08,
          textTransform: 'uppercase',
          opacity: 0.88,
          lineHeight: 1,
        }}
      >
        {finished ? (isNewBest ? 'Neuer Rekord!' : 'Fertig zur Begrüßung') : 'Bereit zur Begrüßung'}
      </Typography>
      <Typography
        sx={{
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: compact ? '1.85rem' : '2.55rem',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 0.04,
          color: finished ? '#fff' : JOHNNY_PRESENTATION.warm,
        }}
      >
        {clock}
      </Typography>
      {bestLabel ? (
        <Typography sx={{ fontSize: compact ? '0.65rem' : '0.72rem', opacity: 0.85, lineHeight: 1.2 }}>
          Bestzeit: {bestLabel}
          {finished && !isNewBest ? ` · diesmal ${formatGreetingClock(elapsedMs, false)}` : ''}
        </Typography>
      ) : null}
      {running ? (
        <Button
          type="button"
          variant="contained"
          onClick={stop}
          sx={{
            mt: 0.25,
            minWidth: 0,
            px: 2,
            py: 0.55,
            fontWeight: 800,
            fontSize: compact ? '0.78rem' : '0.88rem',
            textTransform: 'none',
            borderRadius: 1.5,
            bgcolor: JOHNNY_PRESENTATION.warm,
            color: '#1b1d21',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#FFB74D', boxShadow: 'none' },
          }}
        >
          Stopp
        </Button>
      ) : finished ? (
        <Button
          type="button"
          variant="contained"
          onClick={() => onContinue?.()}
          sx={{
            mt: 0.25,
            minWidth: 0,
            px: 2,
            py: 0.55,
            fontWeight: 800,
            fontSize: compact ? '0.78rem' : '0.88rem',
            textTransform: 'none',
            borderRadius: 1.5,
            bgcolor: '#fff',
            color: '#1b5e20',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#E8F5E9', boxShadow: 'none' },
          }}
        >
          Weiter zur Stunde
        </Button>
      ) : (
        <Button
          type="button"
          variant="outlined"
          onClick={start}
          sx={{
            mt: 0.25,
            minWidth: 0,
            px: 2,
            py: 0.45,
            fontWeight: 700,
            fontSize: '0.78rem',
            textTransform: 'none',
            borderRadius: 1.5,
            borderColor: 'rgba(255,255,255,0.45)',
            color: '#fff',
            '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          Nochmal
        </Button>
      )}
    </Box>
  );
}
