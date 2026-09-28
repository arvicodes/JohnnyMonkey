import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import {
  encouragementForStars,
  loadInteractiveExerciseProgress,
  romanNumeralTable,
  resolveInteractiveExercise,
  saveInteractiveExerciseProgress,
  starsFromAnswers,
  topicStars,
  type EquationPart,
  type InteractiveExerciseProgress,
  type InteractiveExerciseQuestion,
  type InteractiveExerciseTopic,
  type MatchPair,
  type SlideInteractiveExercise,
} from '../../lib/presentationInteractiveExercise';
import {
  ExerciseDiagram,
  MeasureText,
  SortRowHandle,
  EXERCISE_CLOZE_TEXT_MAX_WIDTH,
  clozeBlankSx,
  exerciseInputFieldSx,
  exercisePlaySurfaceSx,
  exercisePromptSubSx,
  exercisePromptSx,
  matchTileSx,
  sortRowCardSx,
  wordBankChipSx,
  wordBankRowSx,
} from './presentationInteractiveExerciseVisuals';

type Phase = 'hub' | 'play' | 'result';
type CompareSign = '<' | '>' | '=';

type MatchTile = {
  key: string;
  pairId: string;
  side: 'left' | 'right';
  text: string;
};

function seedFromId(id: string): number {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed + id.charCodeAt(i) * (i + 1)) % 97;
  return seed || 1;
}

function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function buildMatchTiles(pairs: MatchPair[], questionId: string): MatchTile[] {
  const tiles: MatchTile[] = [];
  for (const p of pairs) {
    tiles.push({ key: `L:${p.id}`, pairId: p.id, side: 'left', text: p.left });
    tiles.push({ key: `R:${p.id}`, pairId: p.id, side: 'right', text: p.right });
  }
  return shuffleDeterministic(tiles, seedFromId(questionId));
}

function flattenCompareBlocks(q: InteractiveExerciseQuestion): {
  convertItems: Array<{ roman: string; arabic: string }>;
  compareItems: Array<{ left: string; right: string; sign: CompareSign }>;
} {
  const convertItems: Array<{ roman: string; arabic: string }> = [];
  const compareItems: Array<{ left: string; right: string; sign: CompareSign }> = [];
  for (const b of q.compareBlocks || []) {
    if (b.type === 'convert') convertItems.push(...b.items);
    else compareItems.push({ left: b.left, right: b.right, sign: b.sign });
  }
  return { convertItems, compareItems };
}

function normalizeArabicInput(v: string): string {
  return v.replace(/\s+/g, '').replace(/\./g, '');
}

type Props = {
  exercise: SlideInteractiveExercise;
  scale?: number;
  interactive?: boolean;
  lessonPath?: string;
  groupId?: string;
  studentId?: string;
  preview?: boolean;
  /** Vorschau-Dialog schließen (nur auf der Themenliste). */
  onDismiss?: () => void;
};

const chromeIconBtnSx = (scale: number) => ({
  border: 'none',
  bgcolor: 'rgba(0,0,0,0.06)',
  borderRadius: `${6 * scale}px`,
  cursor: 'pointer',
  p: 0,
  lineHeight: 0,
  color: '#555',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: `${26 * scale}px`,
  height: `${26 * scale}px`,
  flexShrink: 0,
  '&:hover': { bgcolor: 'rgba(0,0,0,0.1)', color: '#222' },
  '&:disabled': { opacity: 0.45, cursor: 'default' },
});

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
    <>
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
              height: '100%',
            }}
          />
        );
      })}
    </>
  );
}

function ExerciseProgressToolbar({
  scale,
  interactive,
  tip,
  showClose,
  closeLabel,
  onClose,
  answers,
  total,
  showProgress,
}: {
  scale: number;
  interactive: boolean;
  tip?: string;
  showClose: boolean;
  closeLabel: string;
  onClose: () => void;
  answers?: Array<'correct' | 'wrong' | null>;
  total?: number;
  showProgress?: boolean;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const iconPx = `${16 * scale}px`;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: `${6 * scale}px`,
        px: `${8 * scale}px`,
        py: `${6 * scale}px`,
        flexShrink: 0,
        minHeight: `${30 * scale}px`,
      }}
    >
      {showProgress && answers && total != null ? (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            gap: `${2 * scale}px`,
            height: `${10 * scale}px`,
            alignItems: 'stretch',
          }}
        >
          <ProgressSegments answers={answers} total={total} scale={scale} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }} />
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: `${4 * scale}px`,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {tip ? (
          <>
            <Box
              component="button"
              type="button"
              disabled={!interactive}
              onClick={() => setTipOpen((v) => !v)}
              aria-label="Tipp"
              aria-expanded={tipOpen}
              sx={chromeIconBtnSx(scale)}
            >
              <LightbulbOutlinedIcon sx={{ fontSize: iconPx }} />
            </Box>
            {tipOpen ? (
              <Box
                sx={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  mt: `${4 * scale}px`,
                  p: `${10 * scale}px`,
                  width: `${Math.min(220 * scale, 280)}px`,
                  maxWidth: 'min(92vw, 280px)',
                  bgcolor: '#fff',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: `${8 * scale}px`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  fontSize: `${13 * scale}px`,
                  color: '#333',
                  lineHeight: 1.35,
                  zIndex: 4,
                }}
              >
                {tip}
              </Box>
            ) : null}
          </>
        ) : null}
        {showClose ? (
          <Box
            component="button"
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            sx={chromeIconBtnSx(scale)}
          >
            <CloseIcon sx={{ fontSize: iconPx }} />
          </Box>
        ) : null}
      </Box>
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

function blankCount(parts?: EquationPart[]): number {
  return (parts || []).filter((p) => p.type === 'blank').length;
}

function WrongBanner({
  scale,
  tip,
  onRetry,
  onSolve,
}: {
  scale: number;
  tip?: string;
  onRetry: () => void;
  onSolve: () => void;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: `${420 * scale}px`,
        bgcolor: '#fff',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: `${10 * scale}px`,
        p: `${12 * scale}px`,
        mb: `${10 * scale}px`,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: `${15 * scale}px`, mb: `${8 * scale}px` }}>
        Ups, deine Lösung war falsch.
      </Typography>
      <Box sx={{ display: 'flex', gap: `${8 * scale}px`, mb: tip ? `${10 * scale}px` : 0 }}>
        <Button
          onClick={onRetry}
          sx={{
            flex: 1,
            bgcolor: 'rgba(0,0,0,0.08)',
            color: '#222',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: `${8 * scale}px`,
          }}
        >
          Nochmal probieren
        </Button>
        <Button
          onClick={onSolve}
          sx={{
            flex: 1,
            bgcolor: 'rgba(0,0,0,0.08)',
            color: '#222',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: `${8 * scale}px`,
          }}
        >
          Lösen
        </Button>
      </Box>
      {tip ? (
        <Typography sx={{ fontSize: `${12 * scale}px`, color: '#555', pt: `${8 * scale}px`, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <b>Merke dir:</b> {tip}
        </Typography>
      ) : null}
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
  onDismiss,
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
  const [fillValues, setFillValues] = useState<string[]>([]);
  const [fillStatuses, setFillStatuses] = useState<Array<'idle' | 'correct' | 'wrong' | 'revealed'>>(
    [],
  );
  const [activeBlank, setActiveBlank] = useState(0);
  const [showWrongBanner, setShowWrongBanner] = useState(false);
  const [sortPlaced, setSortPlaced] = useState<Array<string | null>>([]);
  const [sortPool, setSortPool] = useState<string[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typedStatus, setTypedStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>(
    'idle',
  );
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [matchSelectedKey, setMatchSelectedKey] = useState<string | null>(null);
  const [matchWrongKeys, setMatchWrongKeys] = useState<string[]>([]);
  const [matchHadWrong, setMatchHadWrong] = useState(false);
  const [convertValues, setConvertValues] = useState<string[]>([]);
  const [convertStatuses, setConvertStatuses] = useState<
    Array<'idle' | 'correct' | 'wrong' | 'revealed'>
  >([]);
  const [compareValues, setCompareValues] = useState<Array<CompareSign | ''>>([]);
  const [compareStatuses, setCompareStatuses] = useState<
    Array<'idle' | 'correct' | 'wrong' | 'revealed'>
  >([]);
  const [activeCompareIdx, setActiveCompareIdx] = useState(0);

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

  const resetQuestionLocal = (q: InteractiveExerciseQuestion) => {
    setPickedId(null);
    setLocked(false);
    setShowWrongBanner(false);
    setActiveBlank(0);
    setMatchSelectedKey(null);
    setMatchWrongKeys([]);
    setMatchHadWrong(false);
    if (q.mode === 'equation') {
      const n = blankCount(q.equationParts);
      setFillValues(Array.from({ length: n }, () => ''));
      setFillStatuses(Array.from({ length: n }, () => 'idle'));
      setSortPlaced([]);
      setSortPool([]);
      setMatchTiles([]);
      setMatchedPairIds([]);
    } else if (q.mode === 'cloze') {
      const n = blankCount(q.clozeParts);
      setFillValues(Array.from({ length: n }, () => ''));
      setFillStatuses(Array.from({ length: n }, () => 'idle'));
      setSortPlaced([]);
      setSortPool([]);
      setMatchTiles([]);
      setMatchedPairIds([]);
    } else if (q.mode === 'sort') {
      const items = [...(q.sortItems || [])];
      setSortPool(items);
      setSortPlaced(Array.from({ length: items.length }, () => null));
      setFillValues([]);
      setFillStatuses([]);
      setTypedAnswer('');
      setTypedStatus('idle');
      setMatchTiles([]);
      setMatchedPairIds([]);
    } else if (q.mode === 'write') {
      setTypedAnswer('');
      setTypedStatus('idle');
      setFillValues([]);
      setFillStatuses([]);
      setSortPlaced([]);
      setSortPool([]);
      setMatchTiles([]);
      setMatchedPairIds([]);
    } else if (q.mode === 'match') {
      setMatchTiles(buildMatchTiles(q.matchPairs || [], q.id));
      setMatchedPairIds([]);
      setFillValues([]);
      setFillStatuses([]);
      setSortPlaced([]);
      setSortPool([]);
      setTypedAnswer('');
      setTypedStatus('idle');
      setConvertValues([]);
      setConvertStatuses([]);
      setCompareValues([]);
      setCompareStatuses([]);
    } else if (q.mode === 'compare') {
      const { convertItems, compareItems } = flattenCompareBlocks(q);
      setConvertValues(Array.from({ length: convertItems.length }, () => ''));
      setConvertStatuses(Array.from({ length: convertItems.length }, () => 'idle'));
      setCompareValues(Array.from({ length: compareItems.length }, () => ''));
      setCompareStatuses(Array.from({ length: compareItems.length }, () => 'idle'));
      setActiveCompareIdx(0);
      setFillValues([]);
      setFillStatuses([]);
      setSortPlaced([]);
      setSortPool([]);
      setTypedAnswer('');
      setTypedStatus('idle');
      setMatchTiles([]);
      setMatchedPairIds([]);
    } else {
      setFillValues([]);
      setFillStatuses([]);
      setSortPlaced([]);
      setSortPool([]);
      setTypedAnswer('');
      setTypedStatus('idle');
      setMatchTiles([]);
      setMatchedPairIds([]);
      setConvertValues([]);
      setConvertStatuses([]);
      setCompareValues([]);
      setCompareStatuses([]);
    }
  };

  const startTopic = (t: InteractiveExerciseTopic) => {
    if (!interactive || preview) return;
    if (!t.questions.length) return;
    setTopic(t);
    setQi(0);
    setAnswers(t.questions.map(() => null));
    setResultStars(0);
    setPhase('play');
    resetQuestionLocal(t.questions[0]);
  };

  const currentQ: InteractiveExerciseQuestion | null =
    topic && topic.questions[qi] ? topic.questions[qi] : null;

  const advanceAfterAnswer = (nextAnswers: Array<'correct' | 'wrong' | null>) => {
    if (!topic) return;
    const nextIndex = qi + 1;
    if (nextIndex >= topic.questions.length) {
      const stars = starsFromAnswers(nextAnswers);
      setResultStars(stars);
      persistTopic(topic.id, stars, nextAnswers);
      setPhase('result');
      setLocked(false);
      setPickedId(null);
      setShowWrongBanner(false);
    } else {
      setQi(nextIndex);
      resetQuestionLocal(topic.questions[nextIndex]);
    }
  };

  const markAndAdvance = (ok: boolean, delayMs = 700) => {
    if (!topic) return;
    const nextAnswers = [...answers];
    nextAnswers[qi] = ok ? 'correct' : 'wrong';
    setAnswers(nextAnswers);
    setLocked(true);
    window.setTimeout(() => {
      advanceAfterAnswer(nextAnswers);
    }, delayMs);
  };

  const pickChoice = (choiceId: string) => {
    if (!interactive || locked || !topic || !currentQ) return;
    if ((currentQ.mode || 'choice') !== 'choice') return;
    const correct = choiceId === currentQ.correctChoiceId;
    setPickedId(choiceId);
    markAndAdvance(correct, correct ? 550 : 850);
  };

  const submitFills = (parts: EquationPart[] | undefined, values: string[]) => {
    if (!parts || !interactive || locked) return;
    const blanks = parts.filter((p) => p.type === 'blank') as Array<{
      type: 'blank';
      correct: string;
    }>;
    const statuses = blanks.map((b, i) => {
      const got = (values[i] || '').trim();
      return got === b.correct ? ('correct' as const) : ('wrong' as const);
    });
    setFillStatuses(statuses);
    const allOk = statuses.every((s) => s === 'correct');
    if (allOk) {
      setShowWrongBanner(false);
      markAndAdvance(true, 600);
    } else {
      setShowWrongBanner(true);
      setLocked(true);
    }
  };

  const retryFills = () => {
    if (!currentQ) return;
    setLocked(false);
    setShowWrongBanner(false);
    if (currentQ.mode === 'equation') {
      const n = blankCount(currentQ.equationParts);
      setFillValues(Array.from({ length: n }, () => ''));
      setFillStatuses(Array.from({ length: n }, () => 'idle'));
    } else if (currentQ.mode === 'cloze') {
      const n = blankCount(currentQ.clozeParts);
      setFillValues(Array.from({ length: n }, () => ''));
      setFillStatuses(Array.from({ length: n }, () => 'idle'));
    }
    setActiveBlank(0);
  };

  const solveFills = (parts: EquationPart[] | undefined) => {
    if (!parts) return;
    const blanks = parts.filter((p) => p.type === 'blank') as Array<{
      type: 'blank';
      correct: string;
    }>;
    setFillValues(blanks.map((b) => b.correct));
    setFillStatuses(blanks.map(() => 'revealed'));
    setShowWrongBanner(false);
    markAndAdvance(false, 900);
  };

  const placeClozeOption = (option: string) => {
    if (!interactive || locked || !currentQ || currentQ.mode !== 'cloze') return;
    const next = [...fillValues];
    let idx = activeBlank;
    if (idx < 0 || idx >= next.length || next[idx]) {
      idx = next.findIndex((v) => !v);
    }
    if (idx < 0) return;
    next[idx] = option;
    setFillValues(next);
    const nextEmpty = next.findIndex((v, i) => i > idx && !v);
    setActiveBlank(nextEmpty >= 0 ? nextEmpty : idx);
    if (next.every((v) => v)) {
      submitFills(currentQ.clozeParts, next);
    }
  };

  const submitWrite = () => {
    if (!interactive || locked || !currentQ || currentQ.mode !== 'write') return;
    const arabic = currentQ.answerKind === 'arabic';
    const got = arabic
      ? normalizeArabicInput(typedAnswer)
      : typedAnswer.replace(/\s+/g, '').toUpperCase();
    const want = arabic
      ? normalizeArabicInput(currentQ.correctAnswer || '')
      : (currentQ.correctAnswer || '').replace(/\s+/g, '').toUpperCase();
    if (!got) return;
    if (got === want) {
      setTypedStatus('correct');
      setShowWrongBanner(false);
      markAndAdvance(true, 600);
    } else {
      setTypedStatus('wrong');
      setShowWrongBanner(true);
      setLocked(true);
    }
  };

  const retryWrite = () => {
    setLocked(false);
    setShowWrongBanner(false);
    setTypedAnswer('');
    setTypedStatus('idle');
  };

  const solveWrite = () => {
    if (!currentQ?.correctAnswer) return;
    setTypedAnswer(currentQ.correctAnswer);
    setTypedStatus('revealed');
    setShowWrongBanner(false);
    markAndAdvance(false, 900);
  };

  const placeSortItem = (item: string) => {
    if (!interactive || locked || !currentQ || currentQ.mode !== 'sort') return;
    const slot = sortPlaced.findIndex((v) => v == null);
    if (slot < 0) return;
    const nextPlaced = [...sortPlaced];
    nextPlaced[slot] = item;
    setSortPlaced(nextPlaced);
    setSortPool((pool) => pool.filter((x) => x !== item));
    if (nextPlaced.every((v) => v != null)) {
      const correct = (currentQ.sortCorrectOrder || []).every((v, i) => nextPlaced[i] === v);
      if (correct) {
        markAndAdvance(true, 650);
      } else {
        setShowWrongBanner(true);
        setLocked(true);
      }
    }
  };

  const retrySort = () => {
    if (!currentQ || currentQ.mode !== 'sort') return;
    setLocked(false);
    setShowWrongBanner(false);
    setSortPool([...(currentQ.sortItems || [])]);
    setSortPlaced(Array.from({ length: currentQ.sortItems?.length || 0 }, () => null));
  };

  const solveSort = () => {
    if (!currentQ || currentQ.mode !== 'sort') return;
    setSortPlaced([...(currentQ.sortCorrectOrder || [])]);
    setSortPool([]);
    setShowWrongBanner(false);
    markAndAdvance(false, 900);
  };

  const clickMatchTile = (tile: MatchTile) => {
    if (!interactive || locked || !currentQ || currentQ.mode !== 'match') return;
    if (matchedPairIds.includes(tile.pairId)) return;
    if (matchWrongKeys.length) return;

    if (!matchSelectedKey) {
      setMatchSelectedKey(tile.key);
      return;
    }
    if (matchSelectedKey === tile.key) {
      setMatchSelectedKey(null);
      return;
    }

    const selected = matchTiles.find((t) => t.key === matchSelectedKey);
    if (!selected) {
      setMatchSelectedKey(tile.key);
      return;
    }
    if (selected.side === tile.side) {
      setMatchSelectedKey(tile.key);
      return;
    }

    if (selected.pairId === tile.pairId) {
      const nextMatched = [...matchedPairIds, tile.pairId];
      setMatchedPairIds(nextMatched);
      setMatchSelectedKey(null);
      const total = currentQ.matchPairs?.length || 0;
      if (total > 0 && nextMatched.length >= total) {
        markAndAdvance(!matchHadWrong, 650);
      }
      return;
    }

    setMatchHadWrong(true);
    setMatchWrongKeys([selected.key, tile.key]);
    setMatchSelectedKey(null);
    setShowWrongBanner(true);
    setLocked(true);
  };

  const retryMatch = () => {
    if (!currentQ || currentQ.mode !== 'match') return;
    setLocked(false);
    setShowWrongBanner(false);
    setMatchSelectedKey(null);
    setMatchWrongKeys([]);
    setMatchedPairIds([]);
    setMatchHadWrong(false);
    setMatchTiles(buildMatchTiles(currentQ.matchPairs || [], currentQ.id));
  };

  const solveMatch = () => {
    if (!currentQ || currentQ.mode !== 'match') return;
    setMatchedPairIds((currentQ.matchPairs || []).map((p) => p.id));
    setMatchSelectedKey(null);
    setMatchWrongKeys([]);
    setShowWrongBanner(false);
    markAndAdvance(false, 900);
  };

  const submitCompare = () => {
    if (!interactive || locked || !currentQ || currentQ.mode !== 'compare') return;
    const { convertItems, compareItems } = flattenCompareBlocks(currentQ);
    const cStatuses = convertItems.map((it, i) =>
      normalizeArabicInput(convertValues[i] || '') === normalizeArabicInput(it.arabic)
        ? ('correct' as const)
        : ('wrong' as const),
    );
    const sStatuses = compareItems.map((it, i) =>
      compareValues[i] === it.sign ? ('correct' as const) : ('wrong' as const),
    );
    setConvertStatuses(cStatuses);
    setCompareStatuses(sStatuses);
    const allOk =
      cStatuses.every((s) => s === 'correct') && sStatuses.every((s) => s === 'correct');
    if (allOk) {
      setShowWrongBanner(false);
      markAndAdvance(true, 650);
    } else {
      setShowWrongBanner(true);
      setLocked(true);
    }
  };

  const retryCompare = () => {
    if (!currentQ || currentQ.mode !== 'compare') return;
    const { convertItems, compareItems } = flattenCompareBlocks(currentQ);
    setLocked(false);
    setShowWrongBanner(false);
    setConvertValues(Array.from({ length: convertItems.length }, () => ''));
    setConvertStatuses(Array.from({ length: convertItems.length }, () => 'idle'));
    setCompareValues(Array.from({ length: compareItems.length }, () => ''));
    setCompareStatuses(Array.from({ length: compareItems.length }, () => 'idle'));
    setActiveCompareIdx(0);
  };

  const solveCompare = () => {
    if (!currentQ || currentQ.mode !== 'compare') return;
    const { convertItems, compareItems } = flattenCompareBlocks(currentQ);
    setConvertValues(convertItems.map((it) => it.arabic));
    setConvertStatuses(convertItems.map(() => 'revealed'));
    setCompareValues(compareItems.map((it) => it.sign));
    setCompareStatuses(compareItems.map(() => 'revealed'));
    setShowWrongBanner(false);
    markAndAdvance(false, 900);
  };

  const pickCompareSign = (sign: CompareSign) => {
    if (!interactive || locked || !currentQ || currentQ.mode !== 'compare') return;
    if (!compareValues.length) return;
    let idx = activeCompareIdx;
    if (idx < 0 || idx >= compareValues.length) {
      idx = compareValues.findIndex((v) => !v);
    }
    if (idx < 0) idx = 0;
    const next = [...compareValues];
    next[idx] = sign;
    setCompareValues(next);
    setCompareStatuses((st) => st.map((s, i) => (i === idx ? 'idle' : s)));
    const nextEmpty = next.findIndex((v, i) => i > idx && !v);
    setActiveCompareIdx(nextEmpty >= 0 ? nextEmpty : idx);
  };

  const backToHub = () => {
    setPhase('hub');
    setTopic(null);
    setQi(0);
    setAnswers([]);
    setPickedId(null);
    setLocked(false);
    setShowWrongBanner(false);
  };

  const retryTopic = () => {
    if (!topic) return;
    startTopic(topic);
  };

  if (!exercise) return null;
  const s = scale;

  const handleTopClose = () => {
    if (phase === 'hub') onDismiss?.();
    else backToHub();
  };

  const showTopClose = Boolean(interactive && (phase !== 'hub' || onDismiss));
  const topCloseLabel = phase === 'hub' ? 'Schließen' : 'Zurück zur Themenliste';

  if (phase === 'result' && topic) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fff',
          boxSizing: 'border-box',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      >
        <ExerciseProgressToolbar
          scale={s}
          interactive={Boolean(interactive)}
          showClose={showTopClose}
          closeLabel={topCloseLabel}
          onClose={handleTopClose}
        />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: `${24 * s}px`,
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
              textTransform: 'none',
            }}
          >
            Weiter ›
          </Button>
        </Box>
        </Box>
      </Box>
    );
  }

  if (phase === 'play' && topic && currentQ) {
    const mode = currentQ.mode || 'choice';

    const showRuleBox = mode === 'choice' || mode === 'equation';

    const promptBlock = (
      <Box sx={{ width: '100%', maxWidth: `${560 * s}px` }}>
        <Typography sx={exercisePromptSx(s)}>{currentQ.prompt}</Typography>
        {currentQ.promptSubline ? (
          <Typography sx={exercisePromptSubSx(s)}>{currentQ.promptSubline}</Typography>
        ) : null}
        <ExerciseDiagram kind={currentQ.exerciseDiagram} scale={s} />
      </Box>
    );

    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          ...exercisePlaySurfaceSx,
          boxSizing: 'border-box',
          pb: `${16 * s}px`,
          pointerEvents: interactive ? 'auto' : 'none',
          overflow: 'hidden',
        }}
      >
        <ExerciseProgressToolbar
          scale={s}
          interactive={Boolean(interactive)}
          tip={currentQ.tip}
          showClose={showTopClose}
          closeLabel={topCloseLabel}
          onClose={handleTopClose}
          showProgress
          answers={answers}
          total={topic.questions.length}
        />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: `${12 * s}px`,
            pt: `${10 * s}px`,
            px: `${12 * s}px`,
          }}
        >
          {showWrongBanner ? (
            <WrongBanner
              scale={s}
              tip={currentQ.tip}
              onRetry={
                mode === 'sort'
                  ? retrySort
                  : mode === 'match'
                    ? retryMatch
                    : mode === 'compare'
                      ? retryCompare
                      : mode === 'write'
                        ? retryWrite
                        : mode === 'equation'
                          ? retryFills
                          : mode === 'cloze'
                            ? retryFills
                            : () => {}
              }
              onSolve={
                mode === 'sort'
                  ? solveSort
                  : mode === 'match'
                    ? solveMatch
                    : mode === 'compare'
                      ? solveCompare
                      : mode === 'write'
                        ? solveWrite
                        : mode === 'equation'
                          ? () => solveFills(currentQ.equationParts)
                          : mode === 'cloze'
                            ? () => solveFills(currentQ.clozeParts)
                            : () => {}
              }
            />
          ) : null}

          {showRuleBox && currentQ.ruleText ? (
            <Box
              sx={{
                width: '100%',
                maxWidth: `${520 * s}px`,
                bgcolor: '#fafafa',
                borderRadius: `${10 * s}px`,
                p: `${12 * s}px`,
                fontSize: `${15 * s}px`,
                lineHeight: 1.4,
                color: '#222',
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              {currentQ.ruleText}
            </Box>
          ) : null}

          {promptBlock}
          {currentQ.showRomanTable ? <RomanTable scale={s} /> : null}

          {/* Choice */}
          {mode === 'choice' ? (
            <>
              {currentQ.challenge ? (
                <Typography sx={{ fontSize: `${34 * s}px`, fontWeight: 800, color: '#111' }}>
                  {currentQ.challenge}
                </Typography>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  gap: `${10 * s}px`,
                  px: `${8 * s}px`,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  width: '100%',
                  mt: 'auto',
                }}
              >
                {(currentQ.choices || []).map((c) => {
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
                        flex: `0 1 auto`,
                        maxWidth: `${120 * s}px`,
                        minWidth: `${48 * s}px`,
                        minHeight: `${40 * s}px`,
                        px: `${8 * s}px`,
                        bgcolor: bg,
                        color,
                        fontWeight: 700,
                        fontSize: `${18 * s}px`,
                        borderRadius: `${10 * s}px`,
                        textTransform: 'none',
                        '&.Mui-disabled': { bgcolor: bg, color, opacity: 1 },
                      }}
                    >
                      {c.label}
                    </Button>
                  );
                })}
              </Box>
            </>
          ) : null}

          {/* Equation */}
          {mode === 'equation' ? (
            <Box sx={{ width: '100%', maxWidth: `${520 * s}px`, mt: `${4 * s}px` }}>
              {currentQ.exampleLine ? (
                <Typography
                  sx={{
                    fontSize: `${18 * s}px`,
                    color: '#333',
                    mb: `${10 * s}px`,
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  {currentQ.exampleLine}
                </Typography>
              ) : null}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: `${4 * s}px`,
                  fontSize: `${20 * s}px`,
                  fontWeight: 700,
                }}
              >
                <Box component="span">{currentQ.roman}</Box>
                <Box component="span">=</Box>
                {(() => {
                  let bi = 0;
                  return (currentQ.equationParts || []).map((part, idx) => {
                    if (part.type === 'text') {
                      return (
                        <Box key={idx} component="span">
                          {part.text}
                        </Box>
                      );
                    }
                    if (part.type === 'break') return null;
                    if (part.type !== 'blank') return null;
                    const i = bi++;
                    const val = fillValues[i] || '';
                    const st = fillStatuses[i] || 'idle';
                    const color =
                      st === 'correct' || st === 'revealed'
                        ? '#2E7D32'
                        : st === 'wrong'
                          ? '#C62828'
                          : '#111';
                    return (
                      <Box
                        key={idx}
                        component="input"
                        value={val}
                        disabled={!interactive || locked}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const next = [...fillValues];
                          next[i] = e.target.value.replace(/[^\d]/g, '');
                          setFillValues(next);
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') submitFills(currentQ.equationParts, fillValues);
                        }}
                        sx={exerciseInputFieldSx(s, val || part.correct, {
                          color,
                          textDecoration: st === 'wrong' ? 'line-through' : 'none',
                        })}
                      />
                    );
                  });
                })()}
              </Box>
              {interactive && !locked ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: `${14 * s}px` }}>
                  <Button
                    onClick={() => submitFills(currentQ.equationParts, fillValues)}
                    sx={{
                      bgcolor: '#FF8F00',
                      color: '#fff',
                      fontWeight: 800,
                      textTransform: 'none',
                      px: `${18 * s}px`,
                      borderRadius: `${8 * s}px`,
                      '&:hover': { bgcolor: '#F57C00' },
                    }}
                  >
                    Prüfen
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {/* Cloze */}
          {mode === 'cloze' ? (
            <Box
              sx={{
                width: '100%',
                maxWidth: `${EXERCISE_CLOZE_TEXT_MAX_WIDTH * s}px`,
                mx: 'auto',
              }}
            >
              <Box
                component="p"
                sx={{
                  m: 0,
                  width: '100%',
                  fontSize: `${17 * s}px`,
                  lineHeight: 1.75,
                  color: '#222',
                  px: `${4 * s}px`,
                  textAlign: 'left',
                }}
              >
                {(() => {
                  let bi = 0;
                  return (currentQ.clozeParts || []).map((part, idx) => {
                    if (part.type === 'break') {
                      return <br key={idx} />;
                    }
                    if (part.type === 'text') {
                      return (
                        <Box key={idx} component="span" sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                          {part.text}
                        </Box>
                      );
                    }
                    const i = bi++;
                    const val = fillValues[i] || '';
                    const st = fillStatuses[i] || 'idle';
                    const selected = activeBlank === i;
                    return (
                      <Box
                        key={idx}
                        component="button"
                        type="button"
                        disabled={!interactive || locked}
                        onClick={() => setActiveBlank(i)}
                        sx={clozeBlankSx(s, {
                          selected,
                          status: st,
                          label: val || part.correct,
                        })}
                      >
                        {val || '\u00a0'}
                      </Box>
                    );
                  });
                })()}
              </Box>
              <Box sx={{ ...wordBankRowSx(s), mt: `${28 * s}px` }}>
                {(currentQ.clozeOptions || []).map((opt) => {
                  const used = fillValues.includes(opt);
                  return (
                    <Box
                      key={opt}
                      component="button"
                      type="button"
                      disabled={!interactive || locked || used}
                      onClick={() => placeClozeOption(opt)}
                      sx={wordBankChipSx(s, used, Boolean(interactive), opt)}
                    >
                      {opt}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : null}

          {/* Match */}
          {mode === 'match' ? (
            <Box
              sx={{
                width: '100%',
                maxWidth: `${560 * s}px`,
                display: 'flex',
                flexWrap: 'wrap',
                gap: `${10 * s}px`,
                justifyContent: 'center',
                alignItems: 'center',
                py: `${8 * s}px`,
              }}
            >
              {matchTiles.map((tile) => {
                const isMatched = matchedPairIds.includes(tile.pairId);
                const isSelected = matchSelectedKey === tile.key;
                const isWrong = matchWrongKeys.includes(tile.key);
                const borderColor = isMatched
                  ? '#43A047'
                  : isWrong
                    ? '#E53935'
                    : isSelected
                      ? '#FF8F00'
                      : 'transparent';
                return (
                  <Box
                    key={tile.key}
                    component="button"
                    type="button"
                    disabled={!interactive || locked || isMatched}
                    onClick={() => clickMatchTile(tile)}
                    sx={{
                      ...matchTileSx(s, borderColor, tile.side),
                      cursor: interactive && !locked && !isMatched ? 'pointer' : 'default',
                      maxWidth: tile.side === 'left' ? `${280 * s}px` : undefined,
                      opacity: isMatched ? 0.88 : 1,
                    }}
                  >
                    {tile.text}
                  </Box>
                );
              })}
            </Box>
          ) : null}

          {/* Compare */}
          {mode === 'compare' ? (
            <Box sx={{ width: '100%', maxWidth: `${480 * s}px` }}>
              {(() => {
                let convertOffset = 0;
                let compareOffset = 0;
                return (currentQ.compareBlocks || []).map((block, bi) => {
                  const sep =
                    bi > 0 ? (
                      <Box
                        key={`sep-${bi}`}
                        sx={{
                          height: `${1 * s}px`,
                          bgcolor: 'rgba(0,0,0,0.12)',
                          my: `${14 * s}px`,
                        }}
                      />
                    ) : null;
                  if (block.type === 'convert') {
                    const start = convertOffset;
                    convertOffset += block.items.length;
                    return (
                      <Box key={`cv-${bi}`}>
                        {sep}
                        <Typography
                          sx={{
                            fontSize: `${15 * s}px`,
                            fontWeight: 700,
                            mb: `${10 * s}px`,
                            textAlign: 'center',
                          }}
                        >
                          Schreibe mit arabischen Ziffern.
                        </Typography>
                        {block.items.map((it, ii) => {
                          const idx = start + ii;
                          const st = convertStatuses[idx] || 'idle';
                          return (
                            <Box
                              key={`${it.roman}-${idx}`}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: `${10 * s}px`,
                                mb: `${8 * s}px`,
                                fontSize: `${20 * s}px`,
                                fontWeight: 800,
                              }}
                            >
                              <Box component="span">{it.roman}</Box>
                              <Box component="span">=</Box>
                              <Box
                                component="input"
                                value={convertValues[idx] || ''}
                                disabled={!interactive || locked}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const next = [...convertValues];
                                  next[idx] = e.target.value.replace(/[^\d\s]/g, '');
                                  setConvertValues(next);
                                  setConvertStatuses((ss) =>
                                    ss.map((s0, i) => (i === idx ? 'idle' : s0)),
                                  );
                                }}
                                sx={{
                                  ...exerciseInputFieldSx(
                                    s,
                                    convertValues[idx] || it.arabic,
                                    {
                                      fontSize: `${16 * s}px`,
                                      color:
                                        st === 'correct' || st === 'revealed'
                                          ? '#2E7D32'
                                          : st === 'wrong'
                                            ? '#C62828'
                                            : '#111',
                                      textDecoration: st === 'wrong' ? 'line-through' : 'none',
                                    },
                                  ),
                                }}
                              />
                              {st === 'wrong' ? (
                                <Typography sx={{ color: '#666', fontWeight: 700, fontSize: `${16 * s}px` }}>
                                  {it.arabic}
                                </Typography>
                              ) : null}
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  }
                  const cIdx = compareOffset;
                  compareOffset += 1;
                  const st = compareStatuses[cIdx] || 'idle';
                  const active = activeCompareIdx === cIdx;
                  return (
                    <Box key={`cp-${bi}`}>
                      {sep}
                      <Typography
                        sx={{
                          fontSize: `${15 * s}px`,
                          fontWeight: 700,
                          mb: `${10 * s}px`,
                          textAlign: 'center',
                        }}
                      >
                        Setze nun das passende Vergleichszeichen ein.
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: `${12 * s}px`,
                          fontSize: `${22 * s}px`,
                          fontWeight: 800,
                        }}
                      >
                        <Box component="span">{block.left}</Box>
                        <Box
                          component="button"
                          type="button"
                          disabled={!interactive || locked}
                          onClick={() => setActiveCompareIdx(cIdx)}
                          sx={{
                            width: `${34 * s}px`,
                            height: `${34 * s}px`,
                            border: active ? `${2 * s}px solid #FF8F00` : 'none',
                            borderRadius: `${6 * s}px`,
                            bgcolor: 'rgba(0,0,0,0.08)',
                            fontSize: `${22 * s}px`,
                            fontWeight: 800,
                            color:
                              st === 'correct' || st === 'revealed'
                                ? '#2E7D32'
                                : st === 'wrong'
                                  ? '#C62828'
                                  : '#111',
                            cursor: interactive && !locked ? 'pointer' : 'default',
                          }}
                        >
                          {compareValues[cIdx] || ''}
                        </Box>
                        <Box component="span">{block.right}</Box>
                        {st === 'wrong' ? (
                          <Typography sx={{ color: '#666', fontWeight: 700, fontSize: `${18 * s}px` }}>
                            {block.sign}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  );
                });
              })()}
              {interactive && !locked ? (
                <Box
                  sx={{
                    mt: `${18 * s}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${12 * s}px`,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: `${10 * s}px` }}>
                    {(['>', '=', '<'] as CompareSign[]).map((sign) => (
                      <Button
                        key={sign}
                        onClick={() => pickCompareSign(sign)}
                        sx={{
                          minWidth: `${48 * s}px`,
                          height: `${44 * s}px`,
                          bgcolor: 'rgba(0,0,0,0.08)',
                          color: '#111',
                          fontWeight: 900,
                          fontSize: `${22 * s}px`,
                          borderRadius: `${8 * s}px`,
                        }}
                      >
                        {sign}
                      </Button>
                    ))}
                  </Box>
                  <Button
                    onClick={submitCompare}
                    sx={{
                      bgcolor: '#FF8F00',
                      color: '#fff',
                      fontWeight: 800,
                      textTransform: 'none',
                      px: `${18 * s}px`,
                      borderRadius: `${8 * s}px`,
                      '&:hover': { bgcolor: '#F57C00' },
                    }}
                  >
                    Prüfen
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {/* Write */}
          {mode === 'write' ? (
            <Box sx={{ width: '100%', maxWidth: `${480 * s}px`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: `${22 * s}px`, fontWeight: 700, color: '#111', my: `${16 * s}px` }}>
                <MeasureText value={currentQ.challenge || ''} scale={s} />
              </Typography>
              <Box
                sx={{
                  height: `${2 * s}px`,
                  bgcolor: 'rgba(0,0,0,0.12)',
                  width: '70%',
                  mx: 'auto',
                  mb: `${14 * s}px`,
                }}
              />
              <Box
                component="input"
                value={typedAnswer}
                disabled={!interactive || locked}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const arabic = currentQ.answerKind === 'arabic';
                  const raw = e.target.value;
                  setTypedAnswer(
                    arabic
                      ? raw.replace(/[^\d\s]/g, '')
                      : raw.toUpperCase().replace(/[^IVXLCDM]/gi, ''),
                  );
                  setTypedStatus('idle');
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') submitWrite();
                }}
                placeholder="…"
                sx={{
                  ...exerciseInputFieldSx(
                    s,
                    typedAnswer || currentQ.correctAnswer || '00',
                    {
                      height: `${34 * s}px`,
                      fontSize: `${18 * s}px`,
                      letterSpacing: `${0.5 * s}px`,
                      color:
                        typedStatus === 'correct' || typedStatus === 'revealed'
                          ? '#2E7D32'
                          : typedStatus === 'wrong'
                            ? '#C62828'
                            : '#111',
                      textDecoration: typedStatus === 'wrong' ? 'line-through' : 'none',
                    },
                  ),
                }}
              />
              {typedStatus === 'wrong' && currentQ.correctAnswer ? (
                <Typography
                  sx={{
                    mt: `${8 * s}px`,
                    color: '#666',
                    fontWeight: 700,
                    fontSize: `${18 * s}px`,
                  }}
                >
                  {currentQ.correctAnswer}
                </Typography>
              ) : null}
              {interactive && !locked ? (
                <Box sx={{ mt: `${14 * s}px` }}>
                  <Button
                    onClick={submitWrite}
                    sx={{
                      bgcolor: '#FF8F00',
                      color: '#fff',
                      fontWeight: 800,
                      textTransform: 'none',
                      px: `${18 * s}px`,
                      borderRadius: `${8 * s}px`,
                      '&:hover': { bgcolor: '#F57C00' },
                    }}
                  >
                    Prüfen
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : null}

          {/* Sort */}
          {mode === 'sort' ? (
            <Box sx={{ width: '100%', maxWidth: `${440 * s}px` }}>
              {sortPlaced.map((val, i) => {
                const isNext = val == null && sortPlaced.findIndex((x) => x == null) === i;
                const filled = Boolean(val);
                return (
                  <Box key={i} sx={sortRowCardSx(s, filled || isNext)}>
                    <SortRowHandle scale={s} />
                    <Box sx={{ flex: 1, textAlign: 'center', py: `${8 * s}px`, pr: `${10 * s}px` }}>
                      {val ? (
                        <MeasureText value={val} scale={s} />
                      ) : isNext ? (
                        <Typography sx={{ fontSize: `${18 * s}px`, fontWeight: 700, color: '#888' }}>
                          ???
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                );
              })}
              {sortPool.length > 0 ? (
                <Box sx={{ ...wordBankRowSx(s), mt: `${20 * s}px` }}>
                  {sortPool.map((item) => (
                    <Box
                      key={item}
                      component="button"
                      type="button"
                      disabled={!interactive || locked}
                      onClick={() => placeSortItem(item)}
                      sx={wordBankChipSx(s, false, Boolean(interactive), item)}
                    >
                      <MeasureText value={item} scale={s} />
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>
          ) : null}
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
      <ExerciseProgressToolbar
        scale={s}
        interactive={Boolean(interactive)}
        showClose={showTopClose}
        closeLabel={topCloseLabel}
        onClose={handleTopClose}
      />
      <Typography
        sx={{
          fontSize: `${(preview ? 16 : 22) * s}px`,
          fontWeight: 800,
          color: '#1a1a2e',
          px: `${20 * s}px`,
          pt: `${2 * s}px`,
          pb: `${8 * s}px`,
        }}
      >
        {exercise.title}
      </Typography>
      <Box sx={{ flex: 1, overflow: preview ? 'hidden' : 'auto', minHeight: 0 }}>
        {exercise.topics.map((t, idx) => {
          const stars = topicStars(progress, t.id);
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
                  interactive && !preview ? { bgcolor: 'rgba(255,143,0,0.06)' } : undefined,
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
              <StarRow filled={stars} scale={preview ? s * 0.7 : s} trophy={t.kind === 'test'} />
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
