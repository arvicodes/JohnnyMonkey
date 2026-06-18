import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Pause as PauseIcon, PlayArrow as PlayArrowIcon, Replay as ReplayIcon, Stop as StopIcon } from '@mui/icons-material';
import { formatTabataSeconds, getPyramidSet, type TabataConfig } from '../lib/tabata';
import { TabataBoxingBagIcon, TabataPyramidIcon } from './BeAHeroTabataIcons';

type TimerPhase = 'idle' | 'work' | 'rest' | 'roundRest' | 'setRest' | 'done';

type Props = {
  config: TabataConfig;
  accentColor: string;
  labelColor: string;
  borderColor: string;
};

const iconBtnSx = (borderColor: string) => ({
  width: 36,
  height: 36,
  border: '1px solid',
  borderColor,
  p: 0,
});

export function BeAHeroTabataTimer({ config, accentColor, labelColor, borderColor }: Props) {
  const isPyramid = config.mode === 'pyramid';
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [setIndex, setSetIndex] = useState(1);
  const [round, setRound] = useState(1);
  const [exercise, setExercise] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(
    isPyramid ? getPyramidSet(config, 1).workSeconds : config.workSeconds,
  );
  const [running, setRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const exerciseTotal = isPyramid ? config.exercisesPerSet : config.exercisesPerRound;
  const roundTotal = isPyramid ? config.roundsPerSet : config.rounds;
  const setTotal = config.pyramidSets.length;

  const activeSet = useMemo(() => getPyramidSet(config, setIndex), [config, setIndex]);

  const workSeconds = isPyramid ? activeSet.workSeconds : config.workSeconds;
  const restSeconds = isPyramid ? activeSet.restSeconds : config.restSeconds;
  const roundRestSeconds = isPyramid ? config.setRoundRestSeconds : config.roundRestSeconds;

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTick();
    setRunning(false);
    setPhase('idle');
    setSetIndex(1);
    setRound(1);
    setExercise(1);
    setSecondsLeft(isPyramid ? getPyramidSet(config, 1).workSeconds : config.workSeconds);
  }, [clearTick, config, isPyramid]);

  useEffect(() => reset(), [config, reset]);

  useEffect(() => () => clearTick(), [clearTick]);

  useEffect(() => {
    if (!running) {
      clearTick();
      return;
    }
    clearTick();
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return clearTick;
  }, [running, clearTick]);

  useEffect(() => {
    if (!running || secondsLeft > 0) return;

    if (isPyramid) {
      const isLastExercise = exercise >= exerciseTotal;
      const isLastRound = round >= roundTotal;
      const isLastSet = setIndex >= setTotal;

      if (phase === 'work') {
        if (isLastExercise && isLastRound && isLastSet) {
          setPhase('done');
          setRunning(false);
          setSecondsLeft(0);
          return;
        }

        if (isLastExercise && isLastRound && setIndex < setTotal) {
          if (config.setRestSeconds > 0) {
            setPhase('setRest');
            setSecondsLeft(config.setRestSeconds);
            return;
          }
          setSetIndex(setIndex + 1);
          setRound(1);
          setExercise(1);
          setPhase('work');
          setSecondsLeft(getPyramidSet(config, setIndex + 1).workSeconds);
          return;
        }

        if (isLastExercise && round < roundTotal) {
          if (roundRestSeconds > 0) {
            setPhase('roundRest');
            setSecondsLeft(roundRestSeconds);
            return;
          }
          setRound(round + 1);
          setExercise(1);
          setPhase('work');
          setSecondsLeft(workSeconds);
          return;
        }

        if (restSeconds > 0) {
          setPhase('rest');
          setSecondsLeft(restSeconds);
          return;
        }

        setExercise(exercise + 1);
        setPhase('work');
        setSecondsLeft(workSeconds);
        return;
      }

      if (phase === 'rest') {
        setExercise(exercise + 1);
        setPhase('work');
        setSecondsLeft(workSeconds);
        return;
      }

      if (phase === 'roundRest') {
        setRound(round + 1);
        setExercise(1);
        setPhase('work');
        setSecondsLeft(workSeconds);
        return;
      }

      if (phase === 'setRest') {
        setSetIndex(setIndex + 1);
        setRound(1);
        setExercise(1);
        setPhase('work');
        setSecondsLeft(getPyramidSet(config, setIndex + 1).workSeconds);
      }
      return;
    }

    if (phase === 'work') {
      if (round >= roundTotal && exercise >= exerciseTotal) {
        setPhase('done');
        setRunning(false);
        setSecondsLeft(0);
        return;
      }

      const isLastExerciseInRound = exercise >= exerciseTotal;

      if (isLastExerciseInRound && round < roundTotal) {
        if (roundRestSeconds > 0) {
          setPhase('roundRest');
          setSecondsLeft(roundRestSeconds);
          return;
        }
        setRound(round + 1);
        setExercise(1);
        setPhase('work');
        setSecondsLeft(workSeconds);
        return;
      }

      if (restSeconds > 0) {
        setPhase('rest');
        setSecondsLeft(restSeconds);
        return;
      }

      setExercise(exercise + 1);
      setPhase('work');
      setSecondsLeft(workSeconds);
      return;
    }

    if (phase === 'rest') {
      setExercise(exercise + 1);
      setPhase('work');
      setSecondsLeft(workSeconds);
      return;
    }

    if (phase === 'roundRest') {
      setRound(round + 1);
      setExercise(1);
      setPhase('work');
      setSecondsLeft(workSeconds);
    }
  }, [
    running,
    secondsLeft,
    phase,
    setIndex,
    round,
    exercise,
    config,
    isPyramid,
    exerciseTotal,
    roundTotal,
    setTotal,
    workSeconds,
    restSeconds,
    roundRestSeconds,
  ]);

  const start = useCallback(() => {
    const initialWork = isPyramid ? getPyramidSet(config, 1).workSeconds : config.workSeconds;
    if (phase === 'done') {
      clearTick();
      setPhase('work');
      setSetIndex(1);
      setRound(1);
      setExercise(1);
      setSecondsLeft(initialWork);
      setRunning(true);
      return;
    }
    if (phase === 'idle') {
      setPhase('work');
      setSetIndex(1);
      setRound(1);
      setExercise(1);
      setSecondsLeft(initialWork);
    }
    setRunning(true);
  }, [phase, clearTick, config, isPyramid]);

  const pause = useCallback(() => setRunning(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;

      if (running) return;

      e.preventDefault();
      start();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [running, start]);

  const phaseLabel =
    phase === 'work'
      ? isPyramid
        ? 'BELASTUNG'
        : 'ARBEIT'
      : phase === 'rest'
        ? isPyramid
          ? 'WECHSEL'
          : 'PAUSE · ÜBUNG'
        : phase === 'roundRest'
          ? 'PAUSE · RUNDE'
          : phase === 'setRest'
            ? 'PAUSE · SATZ'
            : phase === 'done'
              ? 'FERTIG'
              : 'BEREIT';

  const phaseBg =
    phase === 'work'
      ? accentColor
      : phase === 'rest' || phase === 'roundRest' || phase === 'setRest'
        ? phase === 'setRest'
          ? 'rgba(25, 118, 210, 0.22)'
          : phase === 'roundRest'
            ? 'rgba(25, 118, 210, 0.18)'
            : 'rgba(15, 23, 42, 0.12)'
        : phase === 'done'
          ? 'rgba(46, 125, 50, 0.85)'
          : 'rgba(15, 23, 42, 0.06)';

  const phaseTextColor = phase === 'work' || phase === 'done' ? '#fff' : labelColor;

  const timingHint = isPyramid
    ? `${workSeconds}s Belastung · ${restSeconds}s Wechsel`
    : `${workSeconds}s Arbeit · ${restSeconds}s Üb.${
        roundRestSeconds > 0 ? ` · ${roundRestSeconds}s Rdn.` : ''
      }`;

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor,
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 2,
          minHeight: 168,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          bgcolor: phaseBg,
          color: phaseTextColor,
          transition: 'background-color 0.25s ease',
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
          {isPyramid ? (
            <TabataPyramidIcon sx={{ fontSize: 18, color: 'inherit', display: 'block' }} />
          ) : (
            <TabataBoxingBagIcon sx={{ fontSize: 18, color: 'inherit', display: 'block' }} />
          )}
          <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.07em', opacity: 0.9 }}>
            {isPyramid ? 'PYRAMIDE' : 'TAE BO'} · {phaseLabel}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: '3.1rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {formatTabataSeconds(secondsLeft)}
        </Typography>
        {isPyramid ? (
          <Typography sx={{ mt: 0.75, fontSize: '0.82rem', fontWeight: 700, opacity: 0.92 }}>
            Satz {Math.min(setIndex, setTotal)} / {setTotal}
          </Typography>
        ) : null}
        <Typography sx={{ mt: isPyramid ? 0.25 : 0.75, fontSize: '0.82rem', fontWeight: 700, opacity: 0.92 }}>
          Übung {Math.min(exercise, exerciseTotal)} / {exerciseTotal}
        </Typography>
        <Typography sx={{ mt: 0.25, fontSize: '0.78rem', fontWeight: 700, opacity: 0.88 }}>
          Runde {Math.min(round, roundTotal)} / {roundTotal}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.35, fontSize: '0.68rem', opacity: 0.8 }}>
          {timingHint}
          {phase === 'idle' ? ' · Enter zum Starten' : ''}
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.65} justifyContent="center" alignItems="center" sx={{ py: 1, px: 0.75 }}>
        {running ? (
          <Tooltip title="Pause">
            <IconButton
              size="small"
              onClick={pause}
              aria-label="Pause"
              sx={{
                ...iconBtnSx(borderColor),
                bgcolor: accentColor,
                color: '#fff',
                '&:hover': { bgcolor: accentColor, filter: 'brightness(0.92)' },
              }}
            >
              <PauseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={phase === 'done' ? 'Nochmal' : 'Start'}>
            <IconButton
              size="small"
              onClick={start}
              aria-label={phase === 'done' ? 'Nochmal' : 'Start'}
              sx={{
                ...iconBtnSx(borderColor),
                bgcolor: accentColor,
                color: '#fff',
                '&:hover': { bgcolor: accentColor, filter: 'brightness(0.92)' },
              }}
            >
              <PlayArrowIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Zurücksetzen">
          <IconButton size="small" onClick={reset} aria-label="Zurücksetzen" sx={iconBtnSx(borderColor)}>
            <ReplayIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        {running || phase !== 'idle' ? (
          <Tooltip title="Stop">
            <IconButton size="small" onClick={reset} aria-label="Stop" sx={iconBtnSx(borderColor)}>
              <StopIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Box>
  );
}
