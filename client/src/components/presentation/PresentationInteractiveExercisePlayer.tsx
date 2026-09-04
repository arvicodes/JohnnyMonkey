import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
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

function TipButton({
  tip,
  scale,
  interactive,
}: {
  tip?: string;
  scale: number;
  interactive: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!tip) return null;
  return (
    <Box sx={{ position: 'absolute', top: `${8 * scale}px`, right: `${10 * scale}px`, zIndex: 2 }}>
      <Button
        size="small"
        disabled={!interactive}
        onClick={() => setOpen((v) => !v)}
        sx={{
          minWidth: 0,
          px: `${8 * scale}px`,
          py: `${4 * scale}px`,
          bgcolor: '#fff',
          border: '1px solid rgba(0,0,0,0.15)',
          color: '#333',
          fontWeight: 700,
          fontSize: `${12 * scale}px`,
          textTransform: 'none',
          borderRadius: `${8 * scale}px`,
          gap: `${4 * scale}px`,
        }}
      >
        Tipp
        <LightbulbOutlinedIcon sx={{ fontSize: `${16 * scale}px` }} />
      </Button>
      {open ? (
        <Box
          sx={{
            mt: `${6 * scale}px`,
            p: `${10 * scale}px`,
            width: `${220 * scale}px`,
            bgcolor: '#fff',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: `${8 * scale}px`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontSize: `${13 * scale}px`,
            color: '#333',
            lineHeight: 1.35,
          }}
        >
          {tip}
        </Box>
      ) : null}
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
    );
  }

  if (phase === 'play' && topic && currentQ) {
    const mode = currentQ.mode || 'choice';

    const promptRow = (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: `${8 * s}px`, px: `${16 * s}px` }}>
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
              mt: `${2 * s}px`,
            }}
          >
            <VolumeUpIcon sx={{ fontSize: `${22 * s}px` }} />
          </Box>
        ) : (
          <VolumeUpIcon sx={{ fontSize: `${22 * s}px`, color: '#222', mt: `${2 * s}px` }} />
        )}
        <Typography sx={{ fontSize: `${18 * s}px`, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.35 }}>
          {currentQ.prompt}
        </Typography>
      </Box>
    );

    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f7f7f7',
          boxSizing: 'border-box',
          pt: `${10 * s}px`,
          pb: `${16 * s}px`,
          pointerEvents: interactive ? 'auto' : 'none',
          position: 'relative',
          overflow: 'hidden',
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
              zIndex: 2,
            }}
          >
            <CloseIcon sx={{ fontSize: `${22 * s}px` }} />
          </Box>
        ) : null}
        <TipButton tip={currentQ.tip} scale={s} interactive={Boolean(interactive)} />

        <ProgressSegments answers={answers} total={topic.questions.length} scale={s} />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: `${12 * s}px`,
            pt: `${14 * s}px`,
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

          {currentQ.ruleText ? (
            <Box
              sx={{
                width: '100%',
                maxWidth: `${520 * s}px`,
                bgcolor: '#fff',
                borderRadius: `${10 * s}px`,
                p: `${12 * s}px`,
                fontSize: `${15 * s}px`,
                lineHeight: 1.4,
                color: '#222',
              }}
            >
              {currentQ.ruleText}
            </Box>
          ) : null}

          {promptRow}
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
                        flex: `1 1 ${110 * s}px`,
                        maxWidth: `${160 * s}px`,
                        minHeight: `${52 * s}px`,
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
                        sx={{
                          width: `${Math.max(36, 18 * String(part.correct).length) * s}px`,
                          height: `${36 * s}px`,
                          textAlign: 'center',
                          border: 'none',
                          borderRadius: `${6 * s}px`,
                          bgcolor: 'rgba(0,0,0,0.08)',
                          fontSize: `${18 * s}px`,
                          fontWeight: 700,
                          color,
                          textDecoration: st === 'wrong' ? 'line-through' : 'none',
                          outline: 'none',
                        }}
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
            <Box sx={{ width: '100%', maxWidth: `${520 * s}px` }}>
              <Typography
                sx={{
                  fontSize: `${18 * s}px`,
                  lineHeight: 1.7,
                  color: '#222',
                  textAlign: 'center',
                  px: `${8 * s}px`,
                }}
              >
                {(() => {
                  let bi = 0;
                  return (currentQ.clozeParts || []).map((part, idx) => {
                    if (part.type === 'text') {
                      return <Box key={idx} component="span">{part.text}</Box>;
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
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: `${Math.max(56, (val.length || 4) * 12) * s}px`,
                          height: `${30 * s}px`,
                          mx: `${3 * s}px`,
                          px: `${6 * s}px`,
                          border: selected ? '2px solid #FF8F00' : '1px solid rgba(0,0,0,0.2)',
                          borderRadius: `${6 * s}px`,
                          bgcolor: 'rgba(0,0,0,0.06)',
                          color:
                            st === 'correct' || st === 'revealed'
                              ? '#2E7D32'
                              : st === 'wrong'
                                ? '#C62828'
                                : '#111',
                          fontWeight: 700,
                          fontSize: `${16 * s}px`,
                          cursor: interactive && !locked ? 'pointer' : 'default',
                          verticalAlign: 'middle',
                        }}
                      >
                        {val || '\u00a0'}
                      </Box>
                    );
                  });
                })()}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: `${8 * s}px`,
                  justifyContent: 'center',
                  mt: `${22 * s}px`,
                }}
              >
                {(currentQ.clozeOptions || []).map((opt) => {
                  const used = fillValues.includes(opt);
                  return (
                    <Button
                      key={opt}
                      disabled={!interactive || locked || used}
                      onClick={() => placeClozeOption(opt)}
                      sx={{
                        minWidth: `${88 * s}px`,
                        bgcolor: used ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.1)',
                        color: used ? 'rgba(0,0,0,0.3)' : '#111',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: `${8 * s}px`,
                        fontSize: `${15 * s}px`,
                      }}
                    >
                      {opt}
                    </Button>
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
                      border: `${2 * s}px solid ${borderColor}`,
                      bgcolor: 'rgba(0,0,0,0.07)',
                      color: '#111',
                      borderRadius: `${8 * s}px`,
                      px: `${14 * s}px`,
                      py: `${10 * s}px`,
                      fontSize: `${(tile.side === 'right' ? 18 : 15) * s}px`,
                      fontWeight: tile.side === 'right' ? 800 : 700,
                      textAlign: 'center',
                      cursor: interactive && !locked && !isMatched ? 'pointer' : 'default',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      maxWidth: tile.side === 'left' ? `${260 * s}px` : `${140 * s}px`,
                      minWidth: tile.side === 'right' ? `${72 * s}px` : undefined,
                      lineHeight: 1.25,
                      opacity: isMatched ? 0.95 : 1,
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
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: `${6 * s}px`,
                            mb: `${10 * s}px`,
                            justifyContent: 'center',
                          }}
                        >
                          <VolumeUpIcon
                            sx={{ fontSize: `${16 * s}px`, color: '#555', cursor: 'pointer' }}
                            onClick={() => speakGerman('Schreibe mit arabischen Ziffern.')}
                          />
                          <Typography sx={{ fontSize: `${15 * s}px`, fontWeight: 700 }}>
                            Schreibe mit arabischen Ziffern.
                          </Typography>
                        </Box>
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
                                  width: `${88 * s}px`,
                                  height: `${36 * s}px`,
                                  textAlign: 'center',
                                  border: 'none',
                                  borderRadius: `${6 * s}px`,
                                  bgcolor: 'rgba(0,0,0,0.08)',
                                  fontSize: `${18 * s}px`,
                                  fontWeight: 800,
                                  color:
                                    st === 'correct' || st === 'revealed'
                                      ? '#2E7D32'
                                      : st === 'wrong'
                                        ? '#C62828'
                                        : '#111',
                                  textDecoration: st === 'wrong' ? 'line-through' : 'none',
                                  outline: 'none',
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
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: `${6 * s}px`,
                          mb: `${10 * s}px`,
                          justifyContent: 'center',
                        }}
                      >
                        <VolumeUpIcon
                          sx={{ fontSize: `${16 * s}px`, color: '#555', cursor: 'pointer' }}
                          onClick={() =>
                            speakGerman('Setze nun das passende Vergleichszeichen ein.')
                          }
                        />
                        <Typography sx={{ fontSize: `${15 * s}px`, fontWeight: 700 }}>
                          Setze nun das passende Vergleichszeichen ein.
                        </Typography>
                      </Box>
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
                            width: `${44 * s}px`,
                            height: `${44 * s}px`,
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
            <Box sx={{ width: '100%', maxWidth: `${420 * s}px`, textAlign: 'center' }}>
              <Typography sx={{ fontSize: `${36 * s}px`, fontWeight: 800, color: '#111', my: `${10 * s}px` }}>
                {currentQ.challenge}
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
                  width: `${220 * s}px`,
                  height: `${48 * s}px`,
                  textAlign: 'center',
                  border: 'none',
                  borderRadius: `${8 * s}px`,
                  bgcolor: 'rgba(0,0,0,0.08)',
                  fontSize: `${22 * s}px`,
                  fontWeight: 800,
                  color:
                    typedStatus === 'correct' || typedStatus === 'revealed'
                      ? '#2E7D32'
                      : typedStatus === 'wrong'
                        ? '#C62828'
                        : '#111',
                  textDecoration: typedStatus === 'wrong' ? 'line-through' : 'none',
                  outline: 'none',
                  letterSpacing: `${1 * s}px`,
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
            <Box
              sx={{
                width: '100%',
                maxWidth: `${420 * s}px`,
                display: 'flex',
                gap: `${18 * s}px`,
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ flex: 1 }}>
                {sortPlaced.map((val, i) => {
                  const isNext = val == null && sortPlaced.findIndex((x) => x == null) === i;
                  return (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: `${10 * s}px`,
                        mb: `${8 * s}px`,
                        color: val ? '#111' : 'rgba(0,0,0,0.28)',
                        fontSize: `${18 * s}px`,
                        fontWeight: 700,
                      }}
                    >
                      <Box sx={{ width: `${28 * s}px`, textAlign: 'right' }}>{i + 1}.</Box>
                      <Box
                        sx={{
                          minWidth: `${72 * s}px`,
                          height: `${36 * s}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: val || isNext ? 'rgba(0,0,0,0.08)' : 'transparent',
                          borderRadius: `${6 * s}px`,
                          color: isNext && !val ? '#888' : '#111',
                          fontWeight: 800,
                        }}
                      >
                        {val || (isNext ? '???' : '')}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${8 * s}px` }}>
                {sortPool.map((item) => (
                  <Button
                    key={item}
                    disabled={!interactive || locked}
                    onClick={() => placeSortItem(item)}
                    sx={{
                      minWidth: `${64 * s}px`,
                      height: `${40 * s}px`,
                      bgcolor: '#fff',
                      border: '1px solid rgba(0,0,0,0.15)',
                      color: '#111',
                      fontWeight: 800,
                      fontSize: `${18 * s}px`,
                      textTransform: 'none',
                      borderRadius: `${8 * s}px`,
                    }}
                  >
                    {item}
                  </Button>
                ))}
              </Box>
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
