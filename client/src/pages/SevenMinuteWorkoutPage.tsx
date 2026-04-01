import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { determinateLinearProgressSx } from '../lib/muiLinearProgressSx';
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FastForward as SkipIcon,
} from '@mui/icons-material';
import { ExerciseAnimation, type ExerciseAnimId } from './SevenMinuteExerciseAnimation';

const WORK_SEC = 30;
const REST_SEC = 10;
const PREP_SEC = 5;

const EXERCISES: { name: string; hint: string; animId: ExerciseAnimId }[] = [
  { name: 'Hampelmänner', hint: 'Arme und Beine im Rhythmus öffnen und schließen.', animId: 'jumping-jacks' },
  { name: 'Wandsitzen', hint: 'Rücken an die Wand, Oberschenkel parallel zum Boden.', animId: 'wall-sit' },
  { name: 'Liegestütze', hint: 'Körper gestreckt, Brust Richtung Boden – Knie ablegen wenn nötig.', animId: 'push-up' },
  { name: 'Bauch einrollen', hint: 'Oberkörper leicht anheben, Nacken entspannt.', animId: 'crunch' },
  { name: 'Step-ups', hint: 'Abwechselnd auf einen stabilen Stuhl treten, langsam und sicher.', animId: 'step-up' },
  { name: 'Kniebeugen', hint: 'Fersen bleiben am Boden, Knie nicht über die Zehen schieben.', animId: 'squat' },
  { name: 'Trizeps am Stuhl', hint: 'Hände am Sitz, Ellbogen gebeugt nach hinten unten.', animId: 'triceps-dip' },
  { name: 'Unterarmstütz (Plank)', hint: 'Körper lang, Bauch fest, blicke leicht nach vorn.', animId: 'plank' },
  { name: 'Ausfallschritte', hint: 'Abwechselnd vortreten, vorderes Knie über dem Fuß.', animId: 'lunge' },
  { name: 'Seitenstütz links', hint: 'Gewicht auf Unterarm und Seitenkante des Fußes.', animId: 'side-plank-left' },
  { name: 'Seitenstütz rechts', hint: 'Seite wechseln, Hüfte hoch.', animId: 'side-plank-right' },
  { name: 'Auf der Stelle', hint: 'Knie locker hoch, Arme mitbewegen – Tempo, das für dich passt.', animId: 'high-knees' },
];

type Phase = 'menu' | 'prep' | 'session' | 'done';
type Mode = 'work' | 'rest';

interface SessionState {
  phase: Phase;
  mode: Mode;
  exerciseIndex: number;
  remaining: number;
}

const initialSession: SessionState = {
  phase: 'menu',
  mode: 'work',
  exerciseIndex: 0,
  remaining: WORK_SEC,
};

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.94) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const tickPulse = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
`;

const leafWind = keyframes`
  0% { transform: translateX(-10px) translateY(2px) rotate(-6deg); opacity: 0; }
  12% { opacity: 0.35; }
  55% { transform: translateX(38px) translateY(-10px) rotate(6deg); opacity: 0.3; }
  100% { transform: translateX(78px) translateY(-18px) rotate(10deg); opacity: 0; }
`;

export default function SevenMinuteWorkoutPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<SessionState>(initialSession);

  const tick = useCallback(() => {
    setState((prev) => {
      if (prev.phase === 'menu' || prev.phase === 'done') return prev;
      if (prev.remaining > 1) {
        return { ...prev, remaining: prev.remaining - 1 };
      }
      if (prev.phase === 'prep') {
        return {
          phase: 'session',
          mode: 'work',
          exerciseIndex: 0,
          remaining: WORK_SEC,
        };
      }
      if (prev.phase === 'session') {
        if (prev.mode === 'work') {
          if (prev.exerciseIndex >= EXERCISES.length - 1) {
            return { phase: 'done', mode: 'work', exerciseIndex: prev.exerciseIndex, remaining: 0 };
          }
          return { ...prev, mode: 'rest', remaining: REST_SEC };
        }
        return {
          ...prev,
          mode: 'work',
          exerciseIndex: prev.exerciseIndex + 1,
          remaining: WORK_SEC,
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (state.phase !== 'prep' && state.phase !== 'session') return undefined;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [state.phase, tick]);

  const goNextSegment = useCallback(() => {
    setState((prev) => {
      if (prev.phase === 'prep') {
        return { phase: 'session', mode: 'work', exerciseIndex: 0, remaining: WORK_SEC };
      }
      if (prev.phase !== 'session') return prev;
      if (prev.mode === 'work') {
        if (prev.exerciseIndex >= EXERCISES.length - 1) {
          return { phase: 'done', mode: 'work', exerciseIndex: prev.exerciseIndex, remaining: 0 };
        }
        return { ...prev, mode: 'rest', remaining: REST_SEC };
      }
      return { ...prev, mode: 'work', exerciseIndex: prev.exerciseIndex + 1, remaining: WORK_SEC };
    });
  }, []);

  const goPrevSegment = useCallback(() => {
    setState((prev) => {
      if (prev.phase === 'prep') return initialSession;
      if (prev.phase === 'session') {
        if (prev.mode === 'rest') {
          return { ...prev, mode: 'work', remaining: WORK_SEC };
        }
        if (prev.exerciseIndex === 0) {
          return { phase: 'prep', mode: 'work', exerciseIndex: 0, remaining: PREP_SEC };
        }
        return {
          ...prev,
          mode: 'rest',
          exerciseIndex: prev.exerciseIndex - 1,
          remaining: REST_SEC,
        };
      }
      return prev;
    });
  }, []);

  /** Nächste Übung: Pause dazwischen auslassen (von Arbeit direkt zur nächsten Übung). */
  const skipToNextExercise = useCallback(() => {
    setState((prev) => {
      if (prev.phase === 'prep') {
        return { phase: 'session', mode: 'work', exerciseIndex: 0, remaining: WORK_SEC };
      }
      if (prev.phase !== 'session') return prev;
      if (prev.mode === 'rest') {
        return { ...prev, mode: 'work', exerciseIndex: prev.exerciseIndex + 1, remaining: WORK_SEC };
      }
      if (prev.exerciseIndex >= EXERCISES.length - 1) {
        return { phase: 'done', mode: 'work', exerciseIndex: prev.exerciseIndex, remaining: 0 };
      }
      return { ...prev, exerciseIndex: prev.exerciseIndex + 1, mode: 'work', remaining: WORK_SEC };
    });
  }, []);

  const start = () => {
    setState({ phase: 'prep', mode: 'work', exerciseIndex: 0, remaining: PREP_SEC });
  };

  const stop = () => {
    setState(initialSession);
  };

  // Keyboard controls (Pfeiltasten) für Workouts.
  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Tab') return;
      if (isTypingTarget(e.target)) return;

      // Wir wollen keine Page-Scrolls durch Pfeiltasten.
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'Escape'];
      if (!keys.includes(e.key)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        stop();
        return;
      }

      if (state.phase === 'menu') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          start();
        }
        return;
      }

      if (state.phase === 'prep' || state.phase === 'session') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goPrevSegment();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goNextSegment();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          skipToNextExercise();
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNextSegment, goPrevSegment, skipToNextExercise, start, stop, state.phase]);

  const totalSegments = EXERCISES.length * 2 - 1;
  const currentSegment = (() => {
    if (state.phase !== 'session') return 0;
    return state.mode === 'work' ? state.exerciseIndex * 2 : state.exerciseIndex * 2 + 1;
  })();
  const progress = state.phase === 'session' ? ((currentSegment + 1) / totalSegments) * 100 : 0;

  const title =
    state.phase === 'prep'
      ? 'Gleich geht’s los'
      : state.phase === 'session' && state.mode === 'rest'
        ? 'Pause'
        : state.phase === 'session'
          ? EXERCISES[state.exerciseIndex]?.name ?? ''
          : '';

  const subtitle =
    state.phase === 'prep'
      ? 'Mach dich bereit …'
      : state.phase === 'session' && state.mode === 'rest'
        ? 'Kurz durchatmen.'
        : state.phase === 'session'
          ? EXERCISES[state.exerciseIndex]?.hint ?? ''
          : '';

  const segmentAnimKey = `${state.phase}-${state.exerciseIndex}-${state.mode}`;
  const showControls = state.phase === 'prep' || state.phase === 'session';
  const isRestPhase = state.phase === 'session' && state.mode === 'rest';
  const workoutGradient = 'linear-gradient(160deg, #1a535c 0%, #4ecdc4 45%, #ff6b6b 100%)';
  const restGradient =
    'linear-gradient(160deg, #1b5e20 0%, #2e7d32 38%, #43a047 72%, #81c784 100%)';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#eceff1',
      }}
    >
      <Box
        sx={{
          background: isRestPhase ? restGradient : workoutGradient,
          transition: 'background 0.45s ease',
          py: 2,
          px: { xs: 1.5, sm: 3 },
        }}
      >
        <Box
          sx={{
            width: 520,
            maxWidth: '100%',
            mx: 'auto',
            boxSizing: 'border-box',
          }}
        >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', mb: 2 }}>
          <Tooltip title="Zurück">
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              sx={{
                p: 0,
                minWidth: 28,
                width: 28,
                height: 28,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.22)',
                alignSelf: 'flex-start',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.38)' },
              }}
              aria-label="Zurück"
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Card sx={{ borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {state.phase === 'menu' && (
              <>
                <Typography variant="h5" gutterBottom fontWeight={700} color="text.primary">
                  Kurzes Ganzkörper-Training
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {EXERCISES.length} Übungen à {WORK_SEC}s, dazwischen {REST_SEC}s Pause – wie bei
                  klassischen 7-Minuten-Apps. Nur eigene Körpermasse, eine Matte reicht.
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
                  Bei Schmerzen oder Unsicherheit abbrechen. Nicht geeignet als Ersatz für ärztlichen
                  Rat.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<PlayIcon />}
                  onClick={start}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(90deg, #ff6b35, #f7931e)',
                    fontWeight: 700,
                  }}
                >
                  Start
                </Button>
              </>
            )}

            {(state.phase === 'prep' || state.phase === 'session') && (
              <>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    ...determinateLinearProgressSx(
                      isRestPhase
                        ? 'linear-gradient(90deg, #c8e6c9 0%, #66bb6a 40%, #1b5e20 100%)'
                        : 'linear-gradient(90deg, #80deea 0%, #26a69a 42%, #00695c 100%)',
                      {
                        height: 11,
                        barGlow: isRestPhase ? 'rgba(46, 125, 50, 0.35)' : 'rgba(0, 137, 123, 0.35)',
                      }
                    ),
                    mb: 2,
                  }}
                />
                {state.phase === 'session' && state.mode === 'work' && (
                  <Box sx={{ mb: 1 }}>
                    <ExerciseAnimation exerciseId={EXERCISES[state.exerciseIndex].animId} />
                  </Box>
                )}
                {state.phase === 'session' && state.mode === 'rest' && (
                  <Box
                    sx={{
                      mb: 1,
                      height: 192,
                      borderRadius: 2,
                      background:
                        'linear-gradient(160deg, rgba(27,94,32,0.95) 0%, rgba(67,160,71,0.9) 60%, rgba(129,199,132,0.9) 100%)',
                      border: '1px solid',
                      borderColor: 'rgba(27,94,32,0.25)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    aria-hidden
                  >
                    {/* Blätter im Wind */}
                    {[
                      { left: '10%', top: '64%', size: 16, delay: '-0.8s', opacity: 0.3 },
                      { left: '38%', top: '34%', size: 13, delay: '-1.6s', opacity: 0.22 },
                      { left: '64%', top: '58%', size: 17, delay: '-2.4s', opacity: 0.28 },
                    ].map((leaf, idx) => (
                      <Box
                        // eslint-disable-next-line react/no-array-index-key
                        key={idx}
                        component="span"
                        sx={{
                          position: 'absolute',
                          left: leaf.left,
                          top: leaf.top,
                          fontSize: leaf.size,
                          opacity: leaf.opacity,
                          animation: `${leafWind} ${8.2 + idx * 0.9}s ease-in-out infinite`,
                          animationDelay: leaf.delay,
                          willChange: 'transform, opacity',
                          pointerEvents: 'none',
                          userSelect: 'none',
                          filter: 'blur(0.2px)',
                          '@media (prefers-reduced-motion: reduce)': {
                            animation: 'none',
                          },
                        }}
                      >
                        🍃
                      </Box>
                    ))}
                  </Box>
                )}
                {state.phase === 'prep' && (
                  <Box sx={{ mb: 1, opacity: 0.95 }}>
                    <ExerciseAnimation exerciseId={EXERCISES[0].animId} />
                  </Box>
                )}
                <Typography
                  align="center"
                  variant="overline"
                  sx={{ letterSpacing: 2, color: 'text.secondary' }}
                >
                  {state.phase === 'prep'
                    ? 'Start in'
                    : state.phase === 'session' && state.mode === 'rest'
                      ? 'Pause'
                      : `Übung ${state.exerciseIndex + 1} / ${EXERCISES.length}`}
                </Typography>
                <Box
                  key={segmentAnimKey}
                  sx={{
                    animation: `${popIn} 0.45s ease-out`,
                  }}
                >
                  <Typography
                    align="center"
                    component="div"
                    key={state.remaining}
                    sx={{
                      fontWeight: 800,
                      my: 1,
                      fontSize: { xs: '3.5rem', sm: '4.5rem' },
                      lineHeight: 1.1,
                      color:
                        state.phase === 'prep'
                          ? 'warning.main'
                          : state.mode === 'rest'
                            ? 'info.main'
                            : 'primary.main',
                      animation: `${tickPulse} 0.42s ease-out`,
                    }}
                  >
                    {state.remaining}
                  </Typography>
                  <Typography align="center" variant="h5" fontWeight={700} gutterBottom>
                    {title}
                  </Typography>
                  <Typography align="center" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {subtitle}
                  </Typography>
                </Box>

                {showControls && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.75,
                      flexWrap: 'wrap',
                      mb: 2,
                    }}
                  >
                    <Tooltip title="Vorheriger Abschnitt (vom Start zum Menü)">
                      <IconButton
                        onClick={goPrevSegment}
                        size="small"
                        sx={{
                          p: 0,
                          width: 36,
                          height: 36,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        aria-label="Vorheriger Abschnitt"
                      >
                        <ChevronLeftIcon sx={{ fontSize: 22 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Nächster Abschnitt">
                      <IconButton
                        onClick={goNextSegment}
                        size="small"
                        sx={{
                          p: 0,
                          width: 36,
                          height: 36,
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        aria-label="Nächster Abschnitt"
                      >
                        <ChevronRightIcon sx={{ fontSize: 22 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Nächste Übung (Pause überspringen)">
                      <IconButton
                        onClick={skipToNextExercise}
                        size="small"
                        color="primary"
                        sx={{
                          p: 0,
                          width: 36,
                          height: 36,
                          border: '1px solid',
                          borderColor: 'primary.light',
                        }}
                        aria-label="Überspringen zur nächsten Übung"
                      >
                        <SkipIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<StopIcon />}
                  onClick={stop}
                >
                  Beenden
                </Button>
              </>
            )}

            {state.phase === 'done' && (
              <>
                <Typography variant="h5" fontWeight={700} gutterBottom align="center">
                  Geschafft!
                </Typography>
                <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 2 }}>
                  Du hast alle {EXERCISES.length} Übungen durchgespielt.
                </Typography>
                <Button variant="contained" fullWidth onClick={start} sx={{ mb: 1 }}>
                  Noch einmal
                </Button>
                <Button variant="text" fullWidth onClick={() => navigate('/dashboard')}>
                  Zum Dashboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        </Box>
      </Box>
    </Box>
  );
}
