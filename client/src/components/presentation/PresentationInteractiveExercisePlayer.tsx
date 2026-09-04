import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import {
  encouragementForStars,
  loadInteractiveExerciseProgress,
  romanNumeralTable,
  resolveInteractiveExercise,
  saveInteractiveExerciseProgress,
  starsFromAnswers,
  topicStars,
  type InteractiveExerciseProgress,
  type InteractiveExerciseQuestion,
  type InteractiveExerciseTopic,
  type SlideInteractiveExercise,
} from '../../lib/presentationInteractiveExercise';

type Phase = 'hub' | 'play' | 'result';

type Props = {
  exercise: SlideInteractiveExercise;
  scale?: number;
  interactive?: boolean;
  lessonPath?: string;
  groupId?: string;
  studentId?: string;
  /** Kompakt für Filmstreifen / Editor-Vorschau. */
  preview?: boolean;
};

function speakGerman(text: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

function ProgressSegments({
  answers,
  total,
  scale,
}: {
  answers: Array<'correct' | 'wrong' | null>;
  total: number;
  scale: number;
}) {
  const n = Math.max(1, total);
  return (
    <Box
      sx={{
        display: 'flex',
        gap: `${2 * scale}px`,
        width: '100%',
        height: `${10 * scale}px`,
        px: `${4 * scale}px`,
      }}
    >
      {Array.from({ length: n }, (_, i) => {
        const a = answers[i];
        const color =
          a === 'correct' ? '#43A047' : a === 'wrong' ? '#E53935' : 'rgba(0,0,0,0.12)';
        return (
          <Box
            key={i}
            sx={{
              flex: 1,
              borderRadius: `${4 * scale}px`,
              bgcolor: color,
              minWidth: 0,
            }}
          />
        );
      })}
    </Box>
  );
}

function StarRow({
  filled,
  scale,
  trophy,
}: {
  filled: number;
  scale: number;
  trophy?: boolean;
}) {
  const Icon = trophy ? EmojiEventsIcon : StarIcon;
  return (
    <Box sx={{ display: 'flex', gap: `${4 * scale}px`, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <Icon
          key={i}
          sx={{
            fontSize: `${(trophy ? 22 : 26) * scale}px`,
            color: i < filled ? '#43A047' : 'rgba(0,0,0,0.18)',
          }}
        />
      ))}
    </Box>
  );
}

function RomanTable({ scale }: { scale: number }) {
  const rows = romanNumeralTable();
  return (
    <Box
      sx={{
        width: `${140 * scale}px`,
        mx: 'auto',
        borderTop: `${1.5 * scale}px solid #111`,
        borderBottom: `${1.5 * scale}px solid #111`,
      }}
    >
      {rows.map((row, idx) => (
        <Box
          key={row.roman}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            borderBottom: idx < rows.length - 1 ? `${1 * scale}px solid #111` : 'none',
            fontSize: `${18 * scale}px`,
            fontWeight: 600,
            lineHeight: 1.55,
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              borderRight: `${1 * scale}px solid #111`,
              py: `${2 * scale}px`,
            }}
          >
            {row.roman}
          </Box>
          <Box sx={{ textAlign: 'center', py: `${2 * scale}px` }}>{row.value}</Box>
        </Box>
      ))}
    </Box>
  );
}

const PresentationInteractiveExercisePlayer: React.FC<Props> = ({
  exercise: rawExercise,
  scale = 1,
  interactive = true,
  lessonPath = '',
  groupId = '',
  studentId = '',
  preview = false,
}) => {
  const exercise = useMemo(
    () => resolveInteractiveExercise(rawExercise) || rawExercise,
    [rawExercise],
  );

  const [progress, setProgress] = useState<InteractiveExerciseProgress | null>(null);
  const [phase, setPhase] = useState<Phase>('hub');
  const [topic, setTopic] = useState<InteractiveExerciseTopic | null>(null);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Array<'correct' | 'wrong' | null>>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [resultStars, setResultStars] = useState(0);

  useEffect(() => {
    if (!exercise?.id) return;
    setProgress(
      loadInteractiveExerciseProgress(exercise.id, lessonPath, groupId, studentId),
    );
  }, [exercise?.id, lessonPath, groupId, studentId]);

  const persistTopic = useCallback(
    (topicId: string, stars: number, ans: Array<'correct' | 'wrong' | null>) => {
      if (!exercise?.id) return;
      const prev =
        loadInteractiveExerciseProgress(exercise.id, lessonPath, groupId, studentId) || {
          exerciseId: exercise.id,
          topics: [],
          updatedAt: new Date().toISOString(),
        };
      const others = prev.topics.filter((t) => t.topicId !== topicId);
      const next: InteractiveExerciseProgress = {
        exerciseId: exercise.id,
        updatedAt: new Date().toISOString(),
        topics: [
          ...others,
          {
            topicId,
            stars,
            answers: ans,
            completedAt: new Date().toISOString(),
          },
        ],
      };
      saveInteractiveExerciseProgress(next, lessonPath, groupId, studentId);
      setProgress(next);
    },
    [exercise?.id, lessonPath, groupId, studentId],
  );

  const startTopic = (t: InteractiveExerciseTopic) => {
    if (!interactive || preview) return;
    if (!t.questions.length) return;
    setTopic(t);
    setQi(0);
    setAnswers(t.questions.map(() => null));
    setPickedId(null);
    setLocked(false);
    setPhase('play');
  };

  const currentQ: InteractiveExerciseQuestion | null =
    topic && topic.questions[qi] ? topic.questions[qi] : null;

  const pickChoice = (choiceId: string) => {
    if (!interactive || locked || !topic || !currentQ) return;
    const correct = choiceId === currentQ.correctChoiceId;
    setPickedId(choiceId);
    setLocked(true);
    const nextAnswers = [...answers];
    nextAnswers[qi] = correct ? 'correct' : 'wrong';
    setAnswers(nextAnswers);

    window.setTimeout(() => {
      const nextIndex = qi + 1;
      if (nextIndex >= topic.questions.length) {
        const stars = starsFromAnswers(nextAnswers);
        setResultStars(stars);
        persistTopic(topic.id, stars, nextAnswers);
        setPhase('result');
        setLocked(false);
        setPickedId(null);
      } else {
        setQi(nextIndex);
        setPickedId(null);
        setLocked(false);
      }
    }, correct ? 550 : 850);
  };

  const backToHub = () => {
    setPhase('hub');
    setTopic(null);
    setQi(0);
    setAnswers([]);
    setPickedId(null);
    setLocked(false);
  };

  const retryTopic = () => {
    if (!topic) return;
    startTopic(topic);
  };

  if (!exercise) return null;

  const s = scale;

  if (phase === 'result' && topic) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#fff',
          px: `${24 * s}px`,
          boxSizing: 'border-box',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      >
        <Typography
          sx={{
            fontSize: `${22 * s}px`,
            fontWeight: 600,
            textAlign: 'center',
            mb: `${18 * s}px`,
            color: '#1a1a2e',
            maxWidth: `${420 * s}px`,
          }}
        >
          {encouragementForStars(resultStars)}
        </Typography>
        <StarRow filled={resultStars} scale={s * 1.4} trophy={topic.kind === 'test'} />
        <Typography
          sx={{
            mt: `${20 * s}px`,
            fontSize: `${15 * s}px`,
            color: '#1565C0',
            fontWeight: 600,
            cursor: interactive ? 'pointer' : 'default',
          }}
          onClick={() => {
            /* Platzhalter für detaillierte Auswertung */
          }}
        >
          Meine Ergebnisse ›
        </Typography>
        <Box sx={{ display: 'flex', gap: `${12 * s}px`, mt: `${28 * s}px` }}>
          <Button
            disabled={!interactive}
            onClick={retryTopic}
            sx={{
              minWidth: `${52 * s}px`,
              height: `${48 * s}px`,
              bgcolor: 'rgba(0,0,0,0.08)',
              color: '#333',
              borderRadius: `${10 * s}px`,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.12)' },
            }}
          >
            <RefreshIcon sx={{ fontSize: `${26 * s}px` }} />
          </Button>
          <Button
            disabled={!interactive}
            onClick={backToHub}
            sx={{
              minWidth: `${140 * s}px`,
              height: `${48 * s}px`,
              bgcolor: 'rgba(0,0,0,0.08)',
              color: '#333',
              fontWeight: 700,
              borderRadius: `${10 * s}px`,
              fontSize: `${16 * s}px`,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.12)' },
            }}
          >
            Weiter ›
          </Button>
        </Box>
      </Box>
    );
  }

  if (phase === 'play' && topic && currentQ) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fff',
          boxSizing: 'border-box',
          pt: `${10 * s}px`,
          pb: `${16 * s}px`,
          pointerEvents: interactive ? 'auto' : 'none',
          position: 'relative',
        }}
      >
        {interactive ? (
          <Box
            component="button"
            type="button"
            onClick={backToHub}
            aria-label="Schließen"
            sx={{
              position: 'absolute',
              top: `${8 * s}px`,
              left: `${10 * s}px`,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              p: `${4 * s}px`,
              lineHeight: 1,
              color: '#444',
            }}
          >
            <CloseIcon sx={{ fontSize: `${22 * s}px` }} />
          </Box>
        ) : null}

        <ProgressSegments answers={answers} total={topic.questions.length} scale={s} />

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: `${28 * s}px`,
            gap: `${14 * s}px`,
            minHeight: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${8 * s}px` }}>
            {interactive ? (
              <Box
                component="button"
                type="button"
                onClick={() => speakGerman(currentQ.prompt)}
                aria-label="Vorlesen"
                sx={{
                  border: 'none',
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  p: 0,
                  display: 'flex',
                  color: '#222',
                }}
              >
                <VolumeUpIcon sx={{ fontSize: `${22 * s}px` }} />
              </Box>
            ) : (
              <VolumeUpIcon sx={{ fontSize: `${22 * s}px`, color: '#222' }} />
            )}
            <Typography sx={{ fontSize: `${22 * s}px`, fontWeight: 600, color: '#1a1a2e' }}>
              {currentQ.prompt}
            </Typography>
          </Box>

          {currentQ.showRomanTable ? <RomanTable scale={s} /> : null}

          {currentQ.challenge ? (
            <Typography
              sx={{
                fontSize: `${36 * s}px`,
                fontWeight: 800,
                color: '#111',
                letterSpacing: `${1 * s}px`,
                mt: `${4 * s}px`,
              }}
            >
              {currentQ.challenge}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: `${10 * s}px`,
            px: `${20 * s}px`,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {currentQ.choices.map((c) => {
            let bg = 'rgba(0,0,0,0.08)';
            let color = '#111';
            if (pickedId) {
              if (c.id === currentQ.correctChoiceId) {
                bg = '#43A047';
                color = '#fff';
              } else if (c.id === pickedId) {
                bg = '#E53935';
                color = '#fff';
              }
            }
            return (
              <Button
                key={c.id}
                disabled={!interactive || locked}
                onClick={() => pickChoice(c.id)}
                sx={{
                  flex: `1 1 ${110 * s}px`,
                  maxWidth: `${160 * s}px`,
                  minHeight: `${52 * s}px`,
                  bgcolor: bg,
                  color,
                  fontWeight: 700,
                  fontSize: `${18 * s}px`,
                  borderRadius: `${10 * s}px`,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: pickedId ? bg : 'rgba(0,0,0,0.14)',
                  },
                  '&.Mui-disabled': { bgcolor: bg, color, opacity: 1 },
                }}
              >
                {c.label}
              </Button>
            );
          })}
        </Box>
      </Box>
    );
  }

  // Hub
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        boxSizing: 'border-box',
        pointerEvents: interactive && !preview ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    >
      <Typography
        sx={{
          fontSize: `${(preview ? 16 : 22) * s}px`,
          fontWeight: 800,
          color: '#1a1a2e',
          px: `${20 * s}px`,
          pt: `${14 * s}px`,
          pb: `${8 * s}px`,
        }}
      >
        {exercise.title}
      </Typography>
      <Box sx={{ flex: 1, overflow: preview ? 'hidden' : 'auto', minHeight: 0 }}>
        {exercise.topics.map((t, idx) => {
          const stars = topicStars(progress, t.id);
          const lastStarted =
            progress?.topics?.some((p) => p.topicId === t.id) && stars > 0
              ? stars === Math.max(
                  ...exercise.topics.map((x) => topicStars(progress, x.id)),
                  0,
                )
              : false;
          return (
            <Box
              key={t.id}
              onClick={() => startTopic(t)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: `${20 * s}px`,
                py: `${(preview ? 8 : 12) * s}px`,
                borderTop: idx === 0 ? `1px solid rgba(0,0,0,0.08)` : undefined,
                borderBottom: `1px solid rgba(0,0,0,0.08)`,
                cursor: interactive && !preview && t.questions.length ? 'pointer' : 'default',
                '&:hover':
                  interactive && !preview
                    ? { bgcolor: 'rgba(255,143,0,0.06)' }
                    : undefined,
              }}
            >
              <Typography
                sx={{
                  fontSize: `${(preview ? 13 : 17) * s}px`,
                  fontWeight: 700,
                  color: '#111',
                }}
              >
                {t.title}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {lastStarted && !preview ? (
                  <Typography
                    sx={{
                      fontSize: `${10 * s}px`,
                      color: 'rgba(0,0,0,0.45)',
                      mb: `${2 * s}px`,
                    }}
                  >
                    Zuletzt gestartet
                  </Typography>
                ) : null}
                <StarRow filled={stars} scale={preview ? s * 0.7 : s} trophy={t.kind === 'test'} />
              </Box>
            </Box>
          );
        })}
      </Box>
      {!interactive || preview ? (
        <Typography
          sx={{
            fontSize: `${11 * s}px`,
            color: 'rgba(0,0,0,0.45)',
            textAlign: 'center',
            py: `${8 * s}px`,
          }}
        >
          Rechts „START“ tippen — öffnet die Übung bei den SuS
        </Typography>
      ) : null}
    </Box>
  );
};

export default PresentationInteractiveExercisePlayer;
