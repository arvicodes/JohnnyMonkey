import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Pause as PauseIcon, PlayArrow as PlayArrowIcon, Replay as ReplayIcon, Stop as StopIcon } from '@mui/icons-material';
import { formatTabataSeconds, type TabataConfig } from '../lib/tabata';

type TimerPhase = 'idle' | 'work' | 'rest' | 'done';

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
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [round, setRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(config.workSeconds);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setRound(1);
    setSecondsLeft(config.workSeconds);
  }, [clearTick, config.workSeconds]);

  useEffect(() => reset, [config.workSeconds, config.restSeconds, config.rounds, reset]);

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

    if (phase === 'work') {
      if (round >= config.rounds) {
        setPhase('done');
        setRunning(false);
        setSecondsLeft(0);
        return;
      }
      if (config.restSeconds > 0) {
        setPhase('rest');
        setSecondsLeft(config.restSeconds);
      } else {
        setPhase('work');
        setRound((r) => r + 1);
        setSecondsLeft(config.workSeconds);
      }
      return;
    }

    if (phase === 'rest') {
      setPhase('work');
      setRound((r) => r + 1);
      setSecondsLeft(config.workSeconds);
    }
  }, [running, secondsLeft, phase, round, config]);

  const start = () => {
    if (phase === 'done') reset();
    if (phase === 'idle') {
      setPhase('work');
      setRound(1);
      setSecondsLeft(config.workSeconds);
    }
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const phaseLabel =
    phase === 'work' ? 'ARBEIT' : phase === 'rest' ? 'PAUSE' : phase === 'done' ? 'FERTIG' : 'BEREIT';

  const phaseBg =
    phase === 'work'
      ? accentColor
      : phase === 'rest'
        ? 'rgba(15, 23, 42, 0.12)'
        : phase === 'done'
          ? 'rgba(46, 125, 50, 0.85)'
          : 'rgba(15, 23, 42, 0.06)';

  const phaseTextColor = phase === 'work' || phase === 'done' ? '#fff' : labelColor;

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
        <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.07em', opacity: 0.9, mb: 0.5 }}>
          TABATA · {phaseLabel}
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: '3.1rem', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {formatTabataSeconds(secondsLeft)}
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: '0.82rem', fontWeight: 700, opacity: 0.92 }}>
          {Math.min(round, config.rounds)} / {config.rounds}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.35, fontSize: '0.68rem', opacity: 0.8 }}>
          {config.workSeconds}s · {config.restSeconds}s
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
