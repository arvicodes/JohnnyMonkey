/**
 * Interaktive Übungen auf Folien (Anton-ähnlich): Themenliste, Multiple Choice,
 * rot/grün-Feedback, Sterne-Fortschritt.
 */
import type { PresentationSlide } from './presentationDeck';

/** Gelb-Orange — deutlich von HA (#EF6C00) und Prüfung (#c62828) getrennt. */
export const INTERACTIVE_EXERCISE_ACCENT = '#FF8F00';
export const INTERACTIVE_EXERCISE_FILL = 'rgba(255,143,0,0.14)';
export const INTERACTIVE_EXERCISE_BORDER = '#FF8F00';

/** Prüfungsfolien: rot umrandet + rötlich transparent. */
export const EXAM_SLIDE_ACCENT = '#c62828';
export const EXAM_SLIDE_FILL = 'rgba(198,40,40,0.12)';
export const EXAM_SLIDE_BORDER = '#c62828';

export type InteractiveExerciseChoice = {
  id: string;
  label: string;
};

export type InteractiveExerciseQuestion = {
  id: string;
  prompt: string;
  /** Große Aufgabe (z. B. römische Zahl). */
  challenge?: string;
  showRomanTable?: boolean;
  choices: InteractiveExerciseChoice[];
  correctChoiceId: string;
};

export type InteractiveExerciseTopic = {
  id: string;
  title: string;
  kind: 'practice' | 'test';
  questions: InteractiveExerciseQuestion[];
};

export type SlideInteractiveExercise = {
  id: string;
  title: string;
  /** Eingebaute Pakete, z. B. „roman-numerals“. */
  packId?: string;
  topics: InteractiveExerciseTopic[];
};

export type InteractiveExerciseTopicProgress = {
  topicId: string;
  /** 0–3 Sterne (bzw. Pokale bei Tests). */
  stars: number;
  answers?: Array<'correct' | 'wrong' | null>;
  completedAt?: string;
};

export type InteractiveExerciseProgress = {
  exerciseId: string;
  topics: InteractiveExerciseTopicProgress[];
  updatedAt: string;
};

const ROMAN_TABLE: Array<{ roman: string; value: string }> = [
  { roman: 'I', value: '1' },
  { roman: 'V', value: '5' },
  { roman: 'X', value: '10' },
  { roman: 'L', value: '50' },
  { roman: 'C', value: '100' },
  { roman: 'D', value: '500' },
  { roman: 'M', value: '1000' },
];

export function romanNumeralTable(): Array<{ roman: string; value: string }> {
  return ROMAN_TABLE;
}

function q(
  id: string,
  challenge: string,
  correct: string,
  distractors: string[],
): InteractiveExerciseQuestion {
  const choices = [correct, ...distractors].map((label, i) => ({
    id: `${id}-c${i}`,
    label,
  }));
  // leichte Mischung, aber deterministisch über id
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed + id.charCodeAt(i) * (i + 1)) % 97;
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed + i * 7) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const correctChoice = shuffled.find((c) => c.label === correct)!;
  return {
    id,
    prompt: 'Um welche Zahl handelt es sich?',
    challenge,
    showRomanTable: true,
    choices: shuffled,
    correctChoiceId: correctChoice.id,
  };
}

/** Paket „Römische Zahlen“ — Fragen wie in typischen Lernapps. */
export function createRomanNumeralsExercise(): SlideInteractiveExercise {
  const convertQuestions: InteractiveExerciseQuestion[] = [
    q('rn-1', 'CCXX', '220', ['80', '120']),
    q('rn-2', 'LXXXVIII', '88', ['888', '8 883', '83']),
    q('rn-3', 'MVII', '1 007', ['1 070', '107', '17']),
    q('rn-4', 'DXLVI', '546', ['146', '544', '644']),
    q('rn-5', 'DCXXXVII', '637', ['373', '6 337', '633']),
    q('rn-6', 'MDCXL', '1 640', ['1 460', '1 560', '1 440']),
    q('rn-7', 'MCMLXXX', '1 980', ['2 180', '1 970', '1 890']),
    q('rn-8', 'XLII', '42', ['52', '62', '40']),
    q('rn-9', 'XIX', '19', ['21', '29', '14']),
    q('rn-10', 'CM', '900', ['1100', '90', '1900']),
    q('rn-11', 'CD', '400', ['600', '40', '1400']),
    q('rn-12', 'XCIX', '99', ['49', '89', '109']),
  ];

  const compareQuestions: InteractiveExerciseQuestion[] = [
    q('rn-cmp-1', 'XIV  ?  XVI', 'XIV < XVI', ['XIV > XVI', 'XIV = XVI', 'XIV ≤ XII']),
    q('rn-cmp-2', 'XL  ?  XXXIX', 'XL > XXXIX', ['XL < XXXIX', 'XL = XXXIX', 'XL ≤ XX']),
    q('rn-cmp-3', 'C  ?  XC', 'C > XC', ['C < XC', 'C = XC', 'C ≤ L']),
    q('rn-cmp-4', 'VIII  ?  VIII', 'VIII = VIII', ['VIII < VIII', 'VIII > VIII', 'VIII ≠ VIII']),
  ];

  const orderQuestions: InteractiveExerciseQuestion[] = [
    {
      id: 'rn-ord-1',
      prompt: 'Welche Reihenfolge ist richtig (klein → groß)?',
      challenge: 'V · X · I',
      showRomanTable: true,
      choices: [
        { id: 'rn-ord-1-a', label: 'I · V · X' },
        { id: 'rn-ord-1-b', label: 'V · I · X' },
        { id: 'rn-ord-1-c', label: 'X · V · I' },
        { id: 'rn-ord-1-d', label: 'I · X · V' },
      ],
      correctChoiceId: 'rn-ord-1-a',
    },
    {
      id: 'rn-ord-2',
      prompt: 'Welche Reihenfolge ist richtig (klein → groß)?',
      challenge: 'L · C · XL',
      showRomanTable: true,
      choices: [
        { id: 'rn-ord-2-a', label: 'XL · L · C' },
        { id: 'rn-ord-2-b', label: 'L · XL · C' },
        { id: 'rn-ord-2-c', label: 'C · L · XL' },
        { id: 'rn-ord-2-d', label: 'XL · C · L' },
      ],
      correctChoiceId: 'rn-ord-2-a',
    },
    {
      id: 'rn-ord-3',
      prompt: 'Welche Reihenfolge ist richtig (klein → groß)?',
      challenge: 'IX · XI · X',
      showRomanTable: true,
      choices: [
        { id: 'rn-ord-3-a', label: 'IX · X · XI' },
        { id: 'rn-ord-3-b', label: 'X · IX · XI' },
        { id: 'rn-ord-3-c', label: 'XI · X · IX' },
        { id: 'rn-ord-3-d', label: 'IX · XI · X' },
      ],
      correctChoiceId: 'rn-ord-3-a',
    },
  ];

  const writeQuestions: InteractiveExerciseQuestion[] = [
    q('rn-w-1', 'Schreibe 44 römisch', 'XLIV', ['XXXXIIII', 'XLIIII', 'IL']),
    q('rn-w-2', 'Schreibe 99 römisch', 'XCIX', ['IC', 'LXXXXIX', 'XIC']),
    q('rn-w-3', 'Schreibe 9 römisch', 'IX', ['VIIII', 'XI', 'IV']),
    q('rn-w-4', 'Schreibe 40 römisch', 'XL', ['XXXX', 'LX', 'IL']),
  ];

  return {
    id: 'ex-roman-numerals',
    title: 'Römische Zahlen',
    packId: 'roman-numerals',
    topics: [
      {
        id: 'roman-convert',
        title: 'Römische Zahlen umwandeln',
        kind: 'practice',
        questions: convertQuestions,
      },
      {
        id: 'roman-calc',
        title: 'Mit römischen Zahlen rechnen',
        kind: 'practice',
        questions: [
          q('rn-calc-1', 'VII + V', 'XII', ['XI', 'XIII', 'X']),
          q('rn-calc-2', 'X − III', 'VII', ['VIII', 'VI', 'XIII']),
          q('rn-calc-3', 'IV + VI', 'X', ['IX', 'XI', 'VIII']),
          q('rn-calc-4', 'XX − IX', 'XI', ['X', 'XII', 'XIX']),
          q('rn-calc-5', 'L + XXV', 'LXXV', ['LXV', 'C', 'LXX']),
          q('rn-calc-6', 'C − XL', 'LX', ['XL', 'LXXX', 'CXL']),
        ],
      },
      {
        id: 'roman-rules',
        title: 'Regeln für römische Zahlen',
        kind: 'practice',
        questions: [
          {
            id: 'rn-rule-1',
            prompt: 'Welche Schreibweise ist richtig für 49?',
            challenge: '49 = ?',
            showRomanTable: true,
            choices: [
              { id: 'rn-rule-1-a', label: 'XLIX' },
              { id: 'rn-rule-1-b', label: 'IL' },
              { id: 'rn-rule-1-c', label: 'XXXXVIIII' },
              { id: 'rn-rule-1-d', label: 'VLIV' },
            ],
            correctChoiceId: 'rn-rule-1-a',
          },
          {
            id: 'rn-rule-2',
            prompt: 'Darf man I vor V und X stellen?',
            challenge: 'Subtraktionsregel',
            showRomanTable: true,
            choices: [
              { id: 'rn-rule-2-a', label: 'Ja (IV, IX)' },
              { id: 'rn-rule-2-b', label: 'Nein' },
              { id: 'rn-rule-2-c', label: 'Nur vor L' },
              { id: 'rn-rule-2-d', label: 'Nur vor C' },
            ],
            correctChoiceId: 'rn-rule-2-a',
          },
          {
            id: 'rn-rule-3',
            prompt: 'Wie oft darf man höchstens hintereinander dasselbe Zeichen schreiben?',
            challenge: 'Wiederholungsregel',
            showRomanTable: true,
            choices: [
              { id: 'rn-rule-3-a', label: 'Dreimal (z. B. III, XXX)' },
              { id: 'rn-rule-3-b', label: 'Einmal' },
              { id: 'rn-rule-3-c', label: 'Fünfmal' },
              { id: 'rn-rule-3-d', label: 'Beliebig oft' },
            ],
            correctChoiceId: 'rn-rule-3-a',
          },
          {
            id: 'rn-rule-4',
            prompt: 'Welche Zahl steht für D?',
            challenge: 'D = ?',
            showRomanTable: true,
            choices: [
              { id: 'rn-rule-4-a', label: '500' },
              { id: 'rn-rule-4-b', label: '50' },
              { id: 'rn-rule-4-c', label: '1000' },
              { id: 'rn-rule-4-d', label: '100' },
            ],
            correctChoiceId: 'rn-rule-4-a',
          },
        ],
      },
      {
        id: 'roman-order',
        title: 'Römische Zahlen ordnen',
        kind: 'practice',
        questions: orderQuestions,
      },
      {
        id: 'roman-write',
        title: 'Römische Zahlen schreiben',
        kind: 'practice',
        questions: writeQuestions,
      },
      {
        id: 'roman-match',
        title: 'Römische Zahlen zuordnen',
        kind: 'practice',
        questions: [
          q('rn-m-1', 'M', '1000', ['100', '500', '50']),
          q('rn-m-2', 'L', '50', ['5', '100', '500']),
          q('rn-m-3', 'C', '100', ['10', '1000', '50']),
          q('rn-m-4', 'V', '5', ['1', '10', '50']),
          q('rn-m-5', 'X', '10', ['1', '5', '100']),
          q('rn-m-6', 'D', '500', ['50', '100', '1000']),
        ],
      },
      {
        id: 'roman-compare',
        title: 'Römische Zahlen vergleichen',
        kind: 'practice',
        questions: compareQuestions,
      },
      {
        id: 'roman-test',
        title: 'Test',
        kind: 'test',
        questions: [
          ...convertQuestions.slice(0, 4),
          ...writeQuestions.slice(0, 2),
          ...compareQuestions.slice(0, 2),
        ],
      },
    ],
  };
}

export function resolveInteractiveExercise(
  raw: SlideInteractiveExercise | null | undefined,
): SlideInteractiveExercise | undefined {
  const base = sanitizeSlideInteractiveExercise(raw);
  if (!base) return undefined;
  if (base.packId === 'roman-numerals' && (!base.topics || base.topics.length === 0)) {
    return createRomanNumeralsExercise();
  }
  if (base.packId === 'roman-numerals' && base.topics.length > 0) {
    // Titel vom Paket behalten, aber gespeicherte Themen nutzen
    return base;
  }
  return base;
}

export function sanitizeSlideInteractiveExercise(
  raw?: SlideInteractiveExercise | null,
): SlideInteractiveExercise | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const packId = typeof raw.packId === 'string' ? raw.packId.trim() : '';
  if (!id && !packId && !title) return undefined;

  const topicsIn = Array.isArray(raw.topics) ? raw.topics : [];
  const topics: InteractiveExerciseTopic[] = [];
  for (const t of topicsIn) {
    if (!t || typeof t !== 'object') continue;
    const tid = typeof t.id === 'string' ? t.id.trim() : '';
    const ttitle = typeof t.title === 'string' ? t.title.trim() : '';
    if (!tid || !ttitle) continue;
    const questions: InteractiveExerciseQuestion[] = [];
    for (const qq of Array.isArray(t.questions) ? t.questions : []) {
      if (!qq || typeof qq !== 'object') continue;
      const qid = typeof qq.id === 'string' ? qq.id.trim() : '';
      const prompt = typeof qq.prompt === 'string' ? qq.prompt.trim() : '';
      const correctChoiceId =
        typeof qq.correctChoiceId === 'string' ? qq.correctChoiceId.trim() : '';
      const choicesRaw = Array.isArray(qq.choices) ? qq.choices : [];
      const choices: InteractiveExerciseChoice[] = [];
      for (const c of choicesRaw) {
        if (!c || typeof c !== 'object') continue;
        const cid = typeof c.id === 'string' ? c.id.trim() : '';
        const label = typeof c.label === 'string' ? c.label.trim() : '';
        if (!cid || !label) continue;
        choices.push({ id: cid, label });
      }
      if (!qid || !prompt || choices.length < 2 || !correctChoiceId) continue;
      if (!choices.some((c) => c.id === correctChoiceId)) continue;
      questions.push({
        id: qid,
        prompt,
        ...(typeof qq.challenge === 'string' && qq.challenge.trim()
          ? { challenge: qq.challenge.trim() }
          : {}),
        ...(qq.showRomanTable ? { showRomanTable: true } : {}),
        choices,
        correctChoiceId,
      });
    }
    topics.push({
      id: tid,
      title: ttitle,
      kind: t.kind === 'test' ? 'test' : 'practice',
      questions,
    });
  }

  if (packId === 'roman-numerals' && topics.length === 0) {
    return {
      id: id || 'ex-roman-numerals',
      title: title || 'Römische Zahlen',
      packId: 'roman-numerals',
      topics: [],
    };
  }

  if (!id || topics.length === 0) return undefined;
  return {
    id,
    title: title || 'Interaktive Übung',
    ...(packId ? { packId } : {}),
    topics,
  };
}

export function slideHasInteractiveExercise(
  slide: PresentationSlide | null | undefined,
): boolean {
  return Boolean(resolveInteractiveExercise(slide?.slideInteractiveExercise));
}

/** Sterne aus Antwortliste (Anteil richtig → 0–3). */
export function starsFromAnswers(answers: Array<'correct' | 'wrong' | null>): number {
  const done = answers.filter((a) => a === 'correct' || a === 'wrong');
  if (done.length === 0) return 0;
  const correct = done.filter((a) => a === 'correct').length;
  const ratio = correct / done.length;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  if (ratio >= 0.3) return 1;
  return 0;
}

export function encouragementForStars(stars: number): string {
  if (stars >= 3) return 'Super gemacht! Du kennst dich richtig gut aus.';
  if (stars === 2) return 'Gut gemacht! Mit etwas Übung wird es noch besser.';
  if (stars === 1) return 'Jetzt nur nicht aufgeben! Das bekommst du noch besser hin.';
  return 'Kein Problem — übe noch einmal, dann klappt es bestimmt!';
}

function progressStorageKey(
  exerciseId: string,
  lessonPath: string,
  groupId?: string,
  studentId?: string,
): string {
  const g = (groupId || 'local').trim() || 'local';
  const s = (studentId || 'self').trim() || 'self';
  const lesson = (lessonPath || '').replace(/\\/g, '/');
  return `jm-ix-progress:${g}:${s}:${lesson}:${exerciseId}`;
}

export function loadInteractiveExerciseProgress(
  exerciseId: string,
  lessonPath: string,
  groupId?: string,
  studentId?: string,
): InteractiveExerciseProgress | null {
  try {
    const raw = localStorage.getItem(
      progressStorageKey(exerciseId, lessonPath, groupId, studentId),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InteractiveExerciseProgress;
    if (!parsed || parsed.exerciseId !== exerciseId || !Array.isArray(parsed.topics)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveInteractiveExerciseProgress(
  progress: InteractiveExerciseProgress,
  lessonPath: string,
  groupId?: string,
  studentId?: string,
): void {
  try {
    localStorage.setItem(
      progressStorageKey(progress.exerciseId, lessonPath, groupId, studentId),
      JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore quota */
  }
}

export function topicStars(
  progress: InteractiveExerciseProgress | null | undefined,
  topicId: string,
): number {
  const t = progress?.topics?.find((x) => x.topicId === topicId);
  return Math.max(0, Math.min(3, Number(t?.stars) || 0));
}
