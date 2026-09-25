/**
 * Interaktive Übungen auf Folien (Anton-ähnlich): Themenliste, Multiple Choice,
 * rot/grün-Feedback, Sterne-Fortschritt.
 */
import type { PresentationSlide } from './presentationDeck';

/** Gelb — deutlich von HA (#EF6C00) und Prüfung (#c62828) getrennt. */
export const INTERACTIVE_EXERCISE_ACCENT = '#F9A825';
export const INTERACTIVE_EXERCISE_FILL = '#FFF8E1';
export const INTERACTIVE_EXERCISE_BORDER = '#F9A825';

/** Prüfungsfolien: rot umrandet + rötlich transparent. */
export const EXAM_SLIDE_ACCENT = '#c62828';
export const EXAM_SLIDE_FILL = 'rgba(198,40,40,0.12)';
export const EXAM_SLIDE_BORDER = '#c62828';

export type InteractiveExerciseChoice = {
  id: string;
  label: string;
};

/** Teil einer Rechnung oder eines Lückentexts: fester Text oder Eingabelücke. */
export type EquationPart =
  | { type: 'text'; text: string }
  | { type: 'blank'; correct: string };

/** Ein Paar für Zuordnen (linker Text ↔ rechte Kachel). */
export type MatchPair = {
  id: string;
  left: string;
  right: string;
};

/** Abschnitt in einer Vergleichen-Aufgabe (Anton-Stil). */
export type CompareBlock =
  | {
      type: 'convert';
      /** „Schreibe mit arabischen Ziffern.“ */
      items: Array<{ roman: string; arabic: string }>;
    }
  | {
      type: 'compare';
      /** „Setze nun das passende Vergleichszeichen ein.“ */
      left: string;
      right: string;
      sign: '<' | '>' | '=';
    };

export type InteractiveExerciseQuestion = {
  id: string;
  prompt: string;
  /** Große Aufgabe (z. B. römische Zahl) — nur Choice-Modus. */
  challenge?: string;
  showRomanTable?: boolean;
  /** Oben: Merksatz / Regel (z. B. bei Rechnen). */
  ruleText?: string;
  /** Kurzer Tipp (Tipp-Button / Merke-dir). */
  tip?: string;
  /** Beispielzeile über der Aufgabe, z. B. „VIII = 5 + 1 + 1 + 1 = 8“. */
  exampleLine?: string;
  /**
   * `choice` = Multiple Choice (Standard).
   * `equation` = Rechnung mit Lücken (Mit römischen Zahlen rechnen).
   * `cloze` = Lückentext mit Wortbank (Regeln).
   * `sort` = Der Größe nach ordnen (Ordnen).
   * `write` = Arabische Zahl → römisch tippen (Schreiben).
   * `match` = Kacheln zuordnen (Zuordnen).
   * `compare` = Umrechnen + Vergleichszeichen (Vergleichen).
   */
  mode?: 'choice' | 'equation' | 'cloze' | 'sort' | 'write' | 'match' | 'compare';
  /** Für mode=equation: römische Zahl links, dann Parts. */
  roman?: string;
  equationParts?: EquationPart[];
  /** Für mode=cloze: Textteile inkl. Lücken. */
  clozeParts?: EquationPart[];
  /** Wortbank unter dem Lückentext. */
  clozeOptions?: string[];
  /** Für mode=sort: angezeigte (gemischte) Kacheln. */
  sortItems?: string[];
  /** Für mode=sort: richtige Reihenfolge (größte zuerst). */
  sortCorrectOrder?: string[];
  /** Für mode=write: richtige römische Schreibweise. */
  correctAnswer?: string;
  /** Für mode=write: Eingabe römisch (Standard) oder arabisch. */
  answerKind?: 'roman' | 'arabic';
  /** Für mode=match: Paare zum Zuordnen. */
  matchPairs?: MatchPair[];
  /** Für mode=compare: Abschnitte (Umrechnen / Vergleichszeichen). */
  compareBlocks?: CompareBlock[];
  choices?: InteractiveExerciseChoice[];
  correctChoiceId?: string;
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

function equationQ(
  id: string,
  roman: string,
  exampleLine: string,
  parts: EquationPart[],
  tip?: string,
): InteractiveExerciseQuestion {
  return {
    id,
    mode: 'equation',
    prompt:
      'Schreibe die Rechnung zur römischen Zahl. Die jeweils darüber stehende römische Zahl kann dir helfen.',
    showRomanTable: true,
    ruleText:
      'Steht ein Zahlzeichen neben einem gleichen oder höheren, wird addiert. Steht das Zeichen für eine kleinere Zahl links von einer größeren, wird die kleinere von der größeren Zahl subtrahiert.',
    tip:
      tip ||
      'Ein Zahlzeichen schreibt man maximal dreimal hintereinander. Die Zeichen V, L, D dürfen nur einmal in einer Zahl vorkommen.',
    exampleLine,
    roman,
    equationParts: parts,
    choices: [],
  };
}

function blank(correct: string): EquationPart {
  return { type: 'blank', correct };
}

function txt(text: string): EquationPart {
  return { type: 'text', text };
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

  const calcQuestions: InteractiveExerciseQuestion[] = [
    equationQ('rn-calc-1', 'XII', 'VIII = 5 + 1 + 1 + 1 = 8', [
      blank('10'),
      txt(' + '),
      blank('1'),
      txt(' + '),
      blank('1'),
      txt(' = '),
      blank('12'),
    ]),
    equationQ('rn-calc-2', 'XV', 'III = 1 + 1 + 1 = 3', [
      blank('10'),
      txt(' + '),
      blank('5'),
      txt(' = '),
      blank('15'),
    ]),
    equationQ('rn-calc-3', 'XXVI', 'VI = 5 + 1 = 6', [
      blank('10'),
      txt(' + '),
      blank('10'),
      txt(' + '),
      blank('5'),
      txt(' + '),
      blank('1'),
      txt(' = '),
      blank('26'),
    ]),
    equationQ('rn-calc-4', 'XC', 'IX = 10 − 1 = 9', [
      blank('100'),
      txt(' − '),
      blank('10'),
      txt(' = '),
      blank('90'),
    ]),
    equationQ('rn-calc-5', 'XL', 'IV = 5 − 1 = 4', [
      blank('50'),
      txt(' − '),
      blank('10'),
      txt(' = '),
      blank('40'),
    ]),
    equationQ('rn-calc-6', 'CD', 'XL = 50 − 10 = 40', [
      blank('500'),
      txt(' − '),
      blank('100'),
      txt(' = '),
      blank('400'),
    ]),
    equationQ('rn-calc-7', 'CMIV', 'CMXL = 1000 − 100 + 50 − 10 = 940', [
      blank('1000'),
      txt(' − '),
      blank('100'),
      txt(' + '),
      blank('5'),
      txt(' − '),
      blank('1'),
      txt(' = '),
      blank('904'),
    ]),
    equationQ('rn-calc-8', 'XIV', 'VI = 5 + 1 = 6', [
      blank('10'),
      txt(' − '),
      blank('1'),
      txt(' + '),
      blank('5'),
      txt(' = '),
      blank('14'),
    ]),
  ];

  const compareQuestions: InteractiveExerciseQuestion[] = [
    {
      id: 'rn-cmp-1',
      mode: 'compare',
      prompt: 'Vergleiche römische Zahlen.',
      tip: 'Zuerst in arabische Zahlen umrechnen, dann vergleichen.',
      compareBlocks: [
        {
          type: 'convert',
          items: [
            { roman: 'IV', arabic: '4' },
            { roman: 'VII', arabic: '7' },
          ],
        },
        { type: 'compare', left: 'IV', right: 'VII', sign: '<' },
      ],
      choices: [],
    },
    {
      id: 'rn-cmp-2',
      mode: 'compare',
      prompt: 'Vergleiche römische Zahlen.',
      tip: 'D = 500, M = 1000.',
      compareBlocks: [
        {
          type: 'convert',
          items: [
            { roman: 'D', arabic: '500' },
            { roman: 'M', arabic: '1000' },
          ],
        },
        { type: 'compare', left: 'D', right: 'M', sign: '<' },
      ],
      choices: [],
    },
    {
      id: 'rn-cmp-3',
      mode: 'compare',
      prompt: 'Vergleiche römische Zahlen.',
      tip: 'DCV = 605, XII = 12.',
      compareBlocks: [
        {
          type: 'convert',
          items: [
            { roman: 'DCV', arabic: '605' },
            { roman: 'XII', arabic: '12' },
          ],
        },
        { type: 'compare', left: 'DCV', right: 'XII', sign: '>' },
        {
          type: 'convert',
          items: [
            { roman: 'V', arabic: '5' },
            { roman: 'XV', arabic: '15' },
          ],
        },
        { type: 'compare', left: 'V', right: 'XV', sign: '<' },
      ],
      choices: [],
    },
    {
      id: 'rn-cmp-4',
      mode: 'compare',
      prompt: 'Vergleiche römische Zahlen.',
      tip: 'MMMDC = 3600, MMDCC = 2700.',
      compareBlocks: [
        {
          type: 'convert',
          items: [
            { roman: 'MMMDC', arabic: '3600' },
            { roman: 'MMDCC', arabic: '2700' },
          ],
        },
        { type: 'compare', left: 'MMMDC', right: 'MMDCC', sign: '>' },
        {
          type: 'convert',
          items: [
            { roman: 'CCCLXI', arabic: '361' },
            { roman: 'CCCXCV', arabic: '395' },
          ],
        },
        { type: 'compare', left: 'CCCLXI', right: 'CCCXCV', sign: '<' },
      ],
      choices: [],
    },
    {
      id: 'rn-cmp-5',
      mode: 'compare',
      prompt: 'Vergleiche römische Zahlen.',
      tip: 'MMC = 2100, MCM = 1900 (CM = 900).',
      compareBlocks: [
        {
          type: 'convert',
          items: [
            { roman: 'MMC', arabic: '2100' },
            { roman: 'MCM', arabic: '1900' },
          ],
        },
        { type: 'compare', left: 'MMC', right: 'MCM', sign: '>' },
      ],
      choices: [],
    },
  ];

  const orderQuestions: InteractiveExerciseQuestion[] = [
    {
      id: 'rn-ord-1',
      mode: 'sort',
      prompt: 'Sortiere die römischen Zahlen der Größe nach. Beginne mit der Größten.',
      tip: 'M = 1000, D = 500, C = 100, L = 50, X = 10, V = 5, I = 1',
      sortItems: ['D', 'I', 'X', 'C', 'L', 'M', 'V'],
      sortCorrectOrder: ['M', 'D', 'C', 'L', 'X', 'V', 'I'],
      choices: [],
    },
    {
      id: 'rn-ord-2',
      mode: 'sort',
      prompt: 'Sortiere die römischen Zahlen der Größe nach. Beginne mit der Größten.',
      tip: 'Zusammengesetzte Zahlen zuerst in arabische Zahlen umrechnen.',
      sortItems: ['L', 'CL', 'C', 'D', 'XL', 'VI', 'IV', 'MDC', 'DCC'],
      sortCorrectOrder: ['MDC', 'DCC', 'D', 'CL', 'C', 'L', 'XL', 'VI', 'IV'],
      choices: [],
    },
    {
      id: 'rn-ord-3',
      mode: 'sort',
      prompt: 'Sortiere die römischen Zahlen der Größe nach. Beginne mit der Größten.',
      tip: 'XC = 90, IX = 9, XI = 11',
      sortItems: ['IX', 'XL', 'XI', 'XC', 'XX', 'LX', 'VIII'],
      sortCorrectOrder: ['XC', 'LX', 'XL', 'XX', 'XI', 'IX', 'VIII'],
      choices: [],
    },
    {
      id: 'rn-ord-4',
      mode: 'sort',
      prompt: 'Sortiere die römischen Zahlen der Größe nach. Beginne mit der Größten.',
      tip: 'CM = 900, CD = 400, MM = 2000',
      sortItems: ['CD', 'CM', 'M', 'D', 'MM', 'C'],
      sortCorrectOrder: ['MM', 'M', 'CM', 'D', 'CD', 'C'],
      choices: [],
    },
  ];

  const writeRule =
    'Römische Zahlen werden in absteigender Reihenfolge geschrieben. Ein Zahlzeichen schreibt man maximal dreimal hintereinander. Die Zeichen V, L, D dürfen nur einmal in einer Zahl vorkommen.';

  const writeQ = (id: string, arabic: string, roman: string): InteractiveExerciseQuestion => ({
    id,
    mode: 'write',
    prompt: 'Schreibe mit römischen Zahlen.',
    showRomanTable: true,
    ruleText: writeRule,
    tip: 'Nur I vor V/X, X vor L/C, C vor D/M. V, L, D nie wiederholen.',
    challenge: arabic,
    correctAnswer: roman,
    choices: [],
  });

  const writeQuestions: InteractiveExerciseQuestion[] = [
    writeQ('rn-w-1', '230', 'CCXXX'),
    writeQ('rn-w-2', '455', 'CDLV'),
    writeQ('rn-w-3', '641', 'DCXLI'),
    writeQ('rn-w-4', '1 450', 'MCDL'),
    writeQ('rn-w-5', '2 018', 'MMXVIII'),
    writeQ('rn-w-6', '49', 'XLIX'),
    writeQ('rn-w-7', '94', 'XCIV'),
    writeQ('rn-w-8', '444', 'CDXLIV'),
    writeQ('rn-w-9', '999', 'CMXCIX'),
    writeQ('rn-w-10', '1 666', 'MDCLXVI'),
  ];

  const readQ = (id: string, roman: string, arabic: string): InteractiveExerciseQuestion => ({
    id,
    mode: 'write',
    answerKind: 'arabic',
    prompt: 'Schreibe mit arabischen Ziffern.',
    showRomanTable: true,
    tip: 'Addiere von links nach rechts. Klein vor groß bedeutet abziehen (z. B. IV = 4).',
    challenge: roman,
    correctAnswer: arabic,
    choices: [],
  });

  const testQuestions: InteractiveExerciseQuestion[] = [
    {
      id: 'rn-t-rule-1',
      mode: 'cloze',
      prompt: 'Fülle die Lücken.',
      tip: 'Groß nach klein → addieren. Klein links neben groß → subtrahieren.',
      clozeParts: [
        txt('Wenn die Zeichen von groß nach klein geordnet sind, werden sie '),
        blank('addiert'),
        txt('. Wenn eine kleinere Zahl links neben einer größeren steht, wird die kleinere von der größeren '),
        blank('abgezogen'),
        txt('.'),
      ],
      clozeOptions: ['addiert', 'abgezogen', 'multipliziert', 'geteilt'],
      choices: [],
    },
    {
      id: 'rn-t-rule-2',
      mode: 'cloze',
      prompt: 'Fülle die Lücken.',
      showRomanTable: true,
      tip: 'I, X, C, M höchstens dreimal; V, L, D nur einmal.',
      clozeParts: [
        txt('Die Zeichen I, X, C und M dürfen nur '),
        blank('dreimal'),
        txt(' hintereinander in einer Zahl vorkommen, die Zeichen V, L, D sogar nur '),
        blank('einmal'),
        txt('.'),
      ],
      clozeOptions: ['dreimal', 'zehnmal', 'einmal'],
      choices: [],
    },
    readQ('rn-t-r-1', 'DLXIII', '563'),
    readQ('rn-t-r-2', 'DCCCXII', '812'),
    readQ('rn-t-r-3', 'LXXVI', '76'),
    readQ('rn-t-r-4', 'DXCV', '595'),
    readQ('rn-t-r-5', 'LXIV', '64'),
    readQ('rn-t-r-6', 'MMXVIII', '2018'),
    {
      id: 'rn-t-date-1',
      mode: 'cloze',
      prompt: 'Wie lautet das Datum?',
      tip: 'IV = 4, MDCCLXXVI = 1776.',
      ruleText:
        'Du siehst die Tafel, die die New Yorker Freiheitsstatue trägt und auf der das Datum der amerikanischen Unabhängigkeitserklärung steht. Die Tageszahl ist IV, die Jahreszahl ist MDCCLXXVI.',
      clozeParts: [blank('4'), txt('. Juli '), blank('1776')],
      clozeOptions: ['4', '14', '1776', '1766', '6', '1976'],
      choices: [],
    },
    compareQuestions[0],
    writeQ('rn-t-w-1', '49', 'XLIX'),
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
        questions: calcQuestions,
      },
      {
        id: 'roman-rules',
        title: 'Regeln für römische Zahlen',
        kind: 'practice',
        questions: [
          {
            id: 'rn-rule-1',
            mode: 'cloze',
            prompt: 'Fülle die Lücken im Text.',
            tip: 'Rechts neben einer größeren Zahl → addieren. Links davon → subtrahieren.',
            clozeParts: [
              txt('Steht eine kleinere Zahl rechts neben einer größeren, dann werden sie '),
              blank('addiert'),
              txt('. Wenn eine kleinere Zahl '),
              blank('links'),
              txt(' von einer größeren Zahl steht, wird die kleinere von der größeren Zahl subtrahiert.'),
            ],
            clozeOptions: ['addiert', 'subtrahiert', 'links', 'rechts'],
            choices: [],
          },
          {
            id: 'rn-rule-2',
            mode: 'cloze',
            prompt: 'Fülle die Lücken im Text.',
            tip: 'I, X, C und M dürfen höchstens dreimal hintereinander stehen.',
            clozeParts: [
              txt('Auch für die '),
              blank('römischen'),
              txt(' Zahlen gibt es bestimmte Regeln. So dürfen die Zeichen I, X, C und M nur maximal '),
              blank('dreimal'),
              txt(' hintereinanderstehen.'),
            ],
            clozeOptions: ['römischen', 'arabischen', 'dreimal', 'zweimal', 'viermal'],
            choices: [],
          },
          {
            id: 'rn-rule-3',
            mode: 'cloze',
            prompt: 'Fülle die Lücken im Text.',
            tip: 'V, L und D stehen nie mehrfach in einer Zahl.',
            clozeParts: [
              txt('Die Zahlzeichen V, L und D dürfen '),
              blank('nur einmal'),
              txt(' in einer Zahl vorkommen.'),
            ],
            clozeOptions: ['gar nicht', 'nur einmal', 'zweimal', 'dreimal'],
            choices: [],
          },
          {
            id: 'rn-rule-4',
            mode: 'cloze',
            prompt: 'Fülle die Lücken im Text.',
            tip: 'Nur I vor V/X, X vor L/C, C vor D/M.',
            clozeParts: [
              txt('Nur '),
              blank('I'),
              txt(' darf vor V und X stehen, nur '),
              blank('X'),
              txt(' vor L und C, und nur '),
              blank('C'),
              txt(' vor D und M.'),
            ],
            clozeOptions: ['I', 'V', 'X', 'L', 'C', 'D', 'M'],
            choices: [],
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
          {
            id: 'rn-m-1',
            prompt: 'Ordne zu.',
            mode: 'match',
            tip: 'Tippe zuerst auf einen Satz, dann auf die passende römische Zahl.',
            matchPairs: [
              { id: 'm1a', left: 'Die Uhr zeigt zwölf Uhr.', right: 'XII' },
              { id: 'm1b', left: 'Die Mannschaft hat 33 Punkte erzielt.', right: 'XXXIII' },
              { id: 'm1c', left: 'Papst Benedikt der Achte', right: 'VIII' },
              { id: 'm1d', left: 'Das Buch hat siebzehn Kapitel.', right: 'XVII' },
            ],
            choices: [],
          },
          {
            id: 'rn-m-2',
            prompt:
              'Römische Zahlen findet man häufig an alten Bauwerken oder auf Gedenktafeln für wichtige Ereignisse. Ordne die Zahlen den passenden Ereignissen zu.',
            mode: 'match',
            tip: 'Rechne die römische Zahl in eine Jahreszahl um und finde das passende Ereignis.',
            matchPairs: [
              { id: 'm2a', left: 'Kolumbus entdeckt Amerika', right: 'MCDXCII' },
              { id: 'm2b', left: 'Eröffnung des Eiffelturms', right: 'MDCCCLXXXIX' },
              { id: 'm2c', left: 'Markteinführung des ersten iPhones', right: 'MMVII' },
              { id: 'm2d', left: 'Gründung von Berlin', right: 'MCCXXXVII' },
            ],
            choices: [],
          },
          {
            id: 'rn-m-3',
            prompt: 'Ordne die Zeichen den Werten zu.',
            mode: 'match',
            tip: 'Nutze die Wertetabelle: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.',
            matchPairs: [
              { id: 'm3a', left: 'I', right: '1' },
              { id: 'm3b', left: 'V', right: '5' },
              { id: 'm3c', left: 'X', right: '10' },
              { id: 'm3d', left: 'L', right: '50' },
              { id: 'm3e', left: 'C', right: '100' },
              { id: 'm3f', left: 'D', right: '500' },
              { id: 'm3g', left: 'M', right: '1000' },
            ],
            choices: [],
          },
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
        questions: testQuestions,
      },
    ],
  };
}

/** Eingebaute Pakete (packId auf der Folie). */
export const INTERACTIVE_EXERCISE_PACKS: Array<{ packId: string; title: string; exerciseId: string }> = [
  { packId: 'roman-numerals', title: 'Römische Zahlen', exerciseId: 'ex-roman-numerals' },
  { packId: 'lengths-class-5', title: 'Rechnen mit Längen (Klasse 5)', exerciseId: 'ex-lengths-class-5' },
];

const LENGTH_RULE_TEXT =
  '1 km = 1 000 m · 1 m = 10 dm = 100 cm = 1 000 mm · 1 dm = 10 cm · 1 cm = 10 mm';

function lengthWrite(
  id: string,
  challenge: string,
  correctAnswer: string,
  tip?: string,
): InteractiveExerciseQuestion {
  return {
    id,
    mode: 'write',
    answerKind: 'arabic',
    prompt: 'Ergänze die fehlende Maßzahl.',
    ruleText: LENGTH_RULE_TEXT,
    tip,
    challenge,
    correctAnswer,
    choices: [],
  };
}

function lengthSignChoice(
  id: string,
  left: string,
  right: string,
  sign: '<' | '>' | '=',
): InteractiveExerciseQuestion {
  const choices = [
    { id: `${id}-lt`, label: '<' },
    { id: `${id}-gt`, label: '>' },
    { id: `${id}-eq`, label: '=' },
  ];
  const correctChoiceId = sign === '<' ? `${id}-lt` : sign === '>' ? `${id}-gt` : `${id}-eq`;
  return {
    id,
    mode: 'choice',
    prompt: 'Welches Vergleichszeichen passt?',
    ruleText: LENGTH_RULE_TEXT,
    tip: 'Wandle beide Längen in dieselbe Einheit um.',
    challenge: `${left}  ?  ${right}`,
    choices,
    correctChoiceId,
  };
}

function lengthSort(
  id: string,
  prompt: string,
  sortItems: string[],
  sortCorrectOrder: string[],
  tip: string,
): InteractiveExerciseQuestion {
  return {
    id,
    mode: 'sort',
    prompt,
    ruleText: LENGTH_RULE_TEXT,
    tip,
    sortItems,
    sortCorrectOrder,
    choices: [],
  };
}

/** Paket „Rechnen mit Längen“ (Klasse 5) — Inhalte aus Übungssammlung Längen. */
export function createLengthsClass5Exercise(): SlideInteractiveExercise {
  const clozeQuestions: InteractiveExerciseQuestion[] = [
    {
      id: 'len-cloze-1',
      mode: 'cloze',
      prompt: 'Fülle die Lücken.',
      ruleText: LENGTH_RULE_TEXT,
      tip: 'Maßzahl und Maßeinheit gehören zusammen.',
      clozeParts: [
        txt('Eine Längenangabe besteht aus einer '),
        blank('Maßzahl'),
        txt(' und einer '),
        blank('Maßeinheit'),
        txt('.'),
      ],
      clozeOptions: ['Maßzahl', 'Maßeinheit', 'Kommazahl', 'Einheit'],
      choices: [],
    },
    {
      id: 'len-cloze-2',
      mode: 'cloze',
      prompt: 'Fülle die Lücken.',
      ruleText: LENGTH_RULE_TEXT,
      tip: 'Kleinere Einheit → größere Maßzahl.',
      clozeParts: [
        txt('Bei der Umwandlung von m in cm wird die Einheit '),
        blank('kleiner'),
        txt(' und die Maßzahl '),
        blank('größer'),
        txt('.'),
      ],
      clozeOptions: ['kleiner', 'größer', 'gleich', 'halbiert'],
      choices: [],
    },
    {
      id: 'len-cloze-3',
      mode: 'cloze',
      prompt: 'Fülle die Lücken.',
      ruleText: LENGTH_RULE_TEXT,
      clozeParts: [
        txt('Von cm in m teilst du die Maßzahl durch '),
        blank('100'),
        txt('. Von km in m multiplizierst du mit '),
        blank('1 000'),
        txt('.'),
      ],
      clozeOptions: ['10', '100', '1 000', '1 000 000'],
      choices: [],
    },
    {
      id: 'len-cloze-4',
      mode: 'cloze',
      prompt: 'Fülle die Lücken.',
      ruleText: LENGTH_RULE_TEXT,
      tip: 'm → mm: drei Stellen nach rechts.',
      clozeParts: [
        txt('Von m in mm verschiebst du das Komma um '),
        blank('drei'),
        txt(' Stellen nach '),
        blank('rechts'),
        txt('.'),
      ],
      clozeOptions: ['zwei', 'drei', 'vier', 'links', 'rechts'],
      choices: [],
    },
  ];

  const sortSmallQuestions: InteractiveExerciseQuestion[] = [
    lengthSort(
      'len-sort-s-1',
      'Ordne von klein nach groß.',
      ['8 dm', '750 mm', '0,9 m', '82 cm', '0,075 km'],
      ['750 mm', '8 dm', '82 cm', '0,9 m', '0,075 km'],
      'Wandle z. B. alles in cm um: 750 mm = 75 cm, 8 dm = 80 cm.',
    ),
    lengthSort(
      'len-sort-s-2',
      'Ordne von klein nach groß.',
      ['1,05 m', '105 cm', '1 040 mm', '11 dm', '0,001 km'],
      ['0,001 km', '1 040 mm', '1,05 m', '105 cm', '11 dm'],
      '0,001 km = 1 m.',
    ),
    lengthSort(
      'len-sort-s-3',
      'Ordne von klein nach groß.',
      ['3,02 km', '3 019 m', '302 000 cm', '30 200 dm'],
      ['3 019 m', '3,02 km', '302 000 cm', '30 200 dm'],
      '3,02 km = 3 020 m.',
    ),
    lengthSort(
      'len-sort-s-4',
      'Ordne von klein nach groß.',
      ['7,8 cm', '78 mm', '0,79 dm', '0,0785 m'],
      ['7,8 cm', '78 mm', '0,0785 m', '0,79 dm'],
      '78 mm = 7,8 cm.',
    ),
  ];

  const sortLargeQuestions: InteractiveExerciseQuestion[] = [
    lengthSort(
      'len-sort-l-1',
      'Ordne von groß nach klein.',
      ['1,4 m', '145 cm', '14 dm', '1 390 mm', '0,0015 km'],
      ['0,0015 km', '145 cm', '1,4 m', '14 dm', '1 390 mm'],
      '0,0015 km = 1,5 m.',
    ),
    lengthSort(
      'len-sort-l-2',
      'Ordne von groß nach klein.',
      ['0,5 km', '505 m', '50 000 cm', '5 100 dm'],
      ['5 100 dm', '505 m', '0,5 km', '50 000 cm'],
      '0,5 km = 500 m.',
    ),
    lengthSort(
      'len-sort-l-3',
      'Ordne von groß nach klein.',
      ['2 000 mm', '20 dm', '201 cm', '1,99 m'],
      ['201 cm', '2 000 mm', '20 dm', '1,99 m'],
      '20 dm = 2 m = 2 000 mm.',
    ),
  ];

  const toSmallerQuestions: InteractiveExerciseQuestion[] = [
    lengthWrite('len-sm-1', '6 dm = ? cm', '60'),
    lengthWrite('len-sm-2', '2 m = ? cm', '200'),
    lengthWrite('len-sm-3', '4,5 cm = ? mm', '45'),
    lengthWrite('len-sm-4', '0,7 m = ? mm', '700'),
    lengthWrite('len-sm-5', '12 dm = ? mm', '1200'),
    lengthWrite('len-sm-6', '1,25 km = ? m', '1250'),
    lengthWrite('len-sm-7', '3,08 m = ? cm', '308'),
    lengthWrite('len-sm-8', '0,04 km = ? m', '40'),
    lengthWrite('len-sm-9', '0,32 m = ? mm', '320'),
    lengthWrite('len-sm-10', '2,006 km = ? m', '2006'),
  ];

  const toLargerQuestions: InteractiveExerciseQuestion[] = [
    lengthWrite('len-lg-1', '360 cm = ? m', '3,6', 'Komma verschieben oder durch 100 teilen.'),
    lengthWrite('len-lg-2', '85 mm = ? cm', '8,5'),
    lengthWrite('len-lg-3', '470 dm = ? m', '47'),
    lengthWrite('len-lg-4', '2 500 m = ? km', '2,5'),
    lengthWrite('len-lg-5', '9 000 mm = ? m', '9'),
    lengthWrite('len-lg-6', '75 cm = ? dm', '7,5'),
    lengthWrite('len-lg-7', '6 400 cm = ? m', '64'),
    lengthWrite('len-lg-8', '125 m = ? km', '0,125'),
    lengthWrite('len-lg-9', '8 mm = ? m', '0,008'),
    lengthWrite('len-lg-10', '92 000 cm = ? km', '0,92'),
  ];

  const compareQuestions: InteractiveExerciseQuestion[] = [
    lengthSignChoice('len-cmp-1', '0,8 m', '79 cm', '>'),
    lengthSignChoice('len-cmp-2', '2,5 km', '2 500 m', '='),
    lengthSignChoice('len-cmp-3', '750 mm', '8 dm', '<'),
    lengthSignChoice('len-cmp-4', '1,05 m', '105 cm', '='),
    lengthSignChoice('len-cmp-5', '3 019 m', '3,02 km', '<'),
  ];

  const mixedQuestions: InteractiveExerciseQuestion[] = [
    lengthWrite('len-mix-1', '4 m 35 cm = ? cm', '435', 'Zuerst die Meter in cm umrechnen.'),
    lengthWrite('len-mix-2', '7 cm 8 mm = ? mm', '78'),
    lengthWrite('len-mix-3', '2 km 450 m = ? m', '2450'),
    lengthWrite('len-mix-4', '6 m 4 cm = ? cm', '604'),
    lengthWrite('len-mix-5', '0,008 km = ? m', '8'),
    lengthWrite('len-mix-6', '1,24 m = ? mm', '1240', 'Zuerst in cm, dann in mm.'),
  ];

  const roundQuestions: InteractiveExerciseQuestion[] = [
    lengthWrite('len-rnd-1', '3,76 m auf ganze Meter (Zahl)', '4'),
    lengthWrite('len-rnd-2', '842 cm auf ganze Meter (Zahl)', '8'),
    lengthWrite('len-rnd-3', '1 649 m auf ganze Kilometer (Zahl)', '2'),
    lengthWrite('len-rnd-4', '96 mm auf ganze Zentimeter (Zahl)', '10'),
    lengthWrite('len-rnd-5', '2,349 m auf ganze Zentimeter (Zahl)', '235'),
  ];

  const testQuestions: InteractiveExerciseQuestion[] = [
    lengthSignChoice('len-t-1', '0,8 m', '79 cm', '>'),
    lengthSignChoice('len-t-2', '2,5 km', '2 500 m', '='),
    lengthWrite('len-t-3', '4,07 m = ? cm', '407'),
    lengthWrite('len-t-4', '68 mm = ? cm', '6,8'),
    lengthSort(
      'len-t-5',
      'Ordne von klein nach groß.',
      ['1,02 m', '98 cm', '1 005 mm'],
      ['98 cm', '1 005 mm', '1,02 m'],
      '98 cm = 980 mm.',
    ),
    {
      id: 'len-t-6',
      mode: 'choice',
      prompt: 'Wie viele Zentimeter bleiben?',
      ruleText: LENGTH_RULE_TEXT,
      tip: '3 m = 300 cm. Zuerst 85 cm, dann 1,2 m = 120 cm abziehen.',
      challenge: 'Ein Band ist 3 m lang. Es werden 85 cm und danach 1,2 m abgeschnitten.',
      choices: [
        { id: 'len-t-6-a', label: '95 cm' },
        { id: 'len-t-6-b', label: '115 cm' },
        { id: 'len-t-6-c', label: '185 cm' },
      ],
      correctChoiceId: 'len-t-6-a',
    },
    lengthWrite('len-t-7', '1,35 km Hin- und Rückweg = ? m', '2700'),
    lengthWrite('len-t-8', '2 549 m auf ganze Kilometer (Zahl)', '3'),
  ];

  return {
    id: 'ex-lengths-class-5',
    title: 'Rechnen mit Längen',
    packId: 'lengths-class-5',
    topics: [
      { id: 'len-cloze', title: 'Lückentext & Merke', kind: 'practice', questions: clozeQuestions },
      { id: 'len-sort-small', title: 'Ordnen (klein → groß)', kind: 'practice', questions: sortSmallQuestions },
      { id: 'len-sort-large', title: 'Ordnen (groß → klein)', kind: 'practice', questions: sortLargeQuestions },
      { id: 'len-smaller', title: 'In kleinere Einheiten', kind: 'practice', questions: toSmallerQuestions },
      { id: 'len-larger', title: 'In größere Einheiten', kind: 'practice', questions: toLargerQuestions },
      { id: 'len-compare', title: 'Vergleichen', kind: 'practice', questions: compareQuestions },
      { id: 'len-mixed', title: 'Gemischte Aufgaben', kind: 'practice', questions: mixedQuestions },
      { id: 'len-round', title: 'Längen runden', kind: 'practice', questions: roundQuestions },
      { id: 'len-test', title: 'Abschlusstest', kind: 'test', questions: testQuestions },
    ],
  };
}

export function resolveInteractiveExercise(
  raw: SlideInteractiveExercise | null | undefined,
): SlideInteractiveExercise | undefined {
  const base = sanitizeSlideInteractiveExercise(raw);
  if (!base) return undefined;
  // Eingebaute Pakete immer frisch auflösen, damit Inhalts-Updates greifen.
  if (base.packId === 'roman-numerals') {
    return createRomanNumeralsExercise();
  }
  if (base.packId === 'lengths-class-5') {
    return createLengthsClass5Exercise();
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
      if (!qid || !prompt) continue;

      const mode =
        qq.mode === 'equation' ||
        qq.mode === 'cloze' ||
        qq.mode === 'choice' ||
        qq.mode === 'sort' ||
        qq.mode === 'write' ||
        qq.mode === 'match' ||
        qq.mode === 'compare'
          ? qq.mode
          : 'choice';

      const parseParts = (rawParts: unknown): EquationPart[] => {
        if (!Array.isArray(rawParts)) return [];
        const out: EquationPart[] = [];
        for (const p of rawParts) {
          if (!p || typeof p !== 'object') continue;
          if ((p as EquationPart).type === 'text' && typeof (p as { text?: string }).text === 'string') {
            out.push({ type: 'text', text: String((p as { text: string }).text) });
          } else if (
            (p as EquationPart).type === 'blank' &&
            typeof (p as { correct?: string }).correct === 'string' &&
            String((p as { correct: string }).correct).trim()
          ) {
            out.push({ type: 'blank', correct: String((p as { correct: string }).correct).trim() });
          }
        }
        return out;
      };

      if (mode === 'equation') {
        const equationParts = parseParts(qq.equationParts);
        const blanks = equationParts.filter((p) => p.type === 'blank');
        if (blanks.length < 1) continue;
        questions.push({
          id: qid,
          prompt,
          mode: 'equation',
          ...(typeof qq.challenge === 'string' && qq.challenge.trim()
            ? { challenge: qq.challenge.trim() }
            : {}),
          ...(qq.showRomanTable ? { showRomanTable: true } : {}),
          ...(typeof qq.ruleText === 'string' && qq.ruleText.trim()
            ? { ruleText: qq.ruleText.trim() }
            : {}),
          ...(typeof qq.tip === 'string' && qq.tip.trim() ? { tip: qq.tip.trim() } : {}),
          ...(typeof qq.exampleLine === 'string' && qq.exampleLine.trim()
            ? { exampleLine: qq.exampleLine.trim() }
            : {}),
          ...(typeof qq.roman === 'string' && qq.roman.trim() ? { roman: qq.roman.trim() } : {}),
          equationParts,
          choices: [],
        });
        continue;
      }

      if (mode === 'cloze') {
        const clozeParts = parseParts(qq.clozeParts);
        const blanks = clozeParts.filter((p) => p.type === 'blank');
        const clozeOptions = Array.isArray(qq.clozeOptions)
          ? qq.clozeOptions
              .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
              .map((o) => o.trim())
          : [];
        if (blanks.length < 1 || clozeOptions.length < 1) continue;
        questions.push({
          id: qid,
          prompt,
          mode: 'cloze',
          ...(qq.showRomanTable ? { showRomanTable: true } : {}),
          ...(typeof qq.ruleText === 'string' && qq.ruleText.trim()
            ? { ruleText: qq.ruleText.trim() }
            : {}),
          ...(typeof qq.tip === 'string' && qq.tip.trim() ? { tip: qq.tip.trim() } : {}),
          clozeParts,
          clozeOptions,
          choices: [],
        });
        continue;
      }

      if (mode === 'sort') {
        const sortItems = Array.isArray(qq.sortItems)
          ? qq.sortItems
              .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
              .map((o) => o.trim())
          : [];
        const sortCorrectOrder = Array.isArray(qq.sortCorrectOrder)
          ? qq.sortCorrectOrder
              .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
              .map((o) => o.trim())
          : [];
        if (sortItems.length < 2 || sortCorrectOrder.length !== sortItems.length) continue;
        questions.push({
          id: qid,
          prompt,
          mode: 'sort',
          ...(typeof qq.tip === 'string' && qq.tip.trim() ? { tip: qq.tip.trim() } : {}),
          sortItems,
          sortCorrectOrder,
          choices: [],
        });
        continue;
      }

      if (mode === 'write') {
        const answerKind = qq.answerKind === 'arabic' ? 'arabic' : 'roman';
        const rawAnswer =
          typeof qq.correctAnswer === 'string' ? qq.correctAnswer.trim() : '';
        const correctAnswer =
          answerKind === 'arabic'
            ? rawAnswer.replace(/\s+/g, '')
            : rawAnswer.toUpperCase();
        if (!correctAnswer) continue;
        questions.push({
          id: qid,
          prompt,
          mode: 'write',
          answerKind,
          ...(typeof qq.challenge === 'string' && qq.challenge.trim()
            ? { challenge: qq.challenge.trim() }
            : {}),
          ...(qq.showRomanTable ? { showRomanTable: true } : {}),
          ...(typeof qq.ruleText === 'string' && qq.ruleText.trim()
            ? { ruleText: qq.ruleText.trim() }
            : {}),
          ...(typeof qq.tip === 'string' && qq.tip.trim() ? { tip: qq.tip.trim() } : {}),
          correctAnswer,
          choices: [],
        });
        continue;
      }

      if (mode === 'match') {
        const matchPairsRaw = Array.isArray(qq.matchPairs) ? qq.matchPairs : [];
        const matchPairs: MatchPair[] = [];
        for (const p of matchPairsRaw) {
          if (!p || typeof p !== 'object') continue;
          const pid = typeof p.id === 'string' ? p.id.trim() : '';
          const left = typeof p.left === 'string' ? p.left.trim() : '';
          const right = typeof p.right === 'string' ? p.right.trim() : '';
          if (!pid || !left || !right) continue;
          matchPairs.push({ id: pid, left, right });
        }
        if (matchPairs.length < 2) continue;
        questions.push({
          id: qid,
          prompt,
          mode: 'match',
          ...(typeof qq.tip === 'string' && qq.tip.trim() ? { tip: qq.tip.trim() } : {}),
          matchPairs,
          choices: [],
        });
        continue;
      }

      if (mode === 'compare') {
        const blocksRaw = Array.isArray(qq.compareBlocks) ? qq.compareBlocks : [];
        const compareBlocks: CompareBlock[] = [];
        for (const b of blocksRaw) {
          if (!b || typeof b !== 'object') continue;
          if ((b as CompareBlock).type === 'convert') {
            const itemsRaw = Array.isArray((b as { items?: unknown }).items)
              ? (b as { items: unknown[] }).items
              : [];
            const items: Array<{ roman: string; arabic: string }> = [];
            for (const it of itemsRaw) {
              if (!it || typeof it !== 'object') continue;
              const roman = typeof (it as { roman?: string }).roman === 'string'
                ? String((it as { roman: string }).roman).trim()
                : '';
              const arabic = typeof (it as { arabic?: string }).arabic === 'string'
                ? String((it as { arabic: string }).arabic).trim().replace(/\s+/g, '')
                : '';
              if (!roman || !arabic) continue;
              items.push({ roman, arabic });
            }
            if (items.length < 1) continue;
            compareBlocks.push({ type: 'convert', items });
          } else if ((b as CompareBlock).type === 'compare') {
            const left = typeof (b as { left?: string }).left === 'string'
              ? String((b as { left: string }).left).trim()
              : '';
            const right = typeof (b as { right?: string }).right === 'string'
              ? String((b as { right: string }).right).trim()
              : '';
            const sign = (b as { sign?: string }).sign;
            if (!left || !right || (sign !== '<' && sign !== '>' && sign !== '=')) continue;
            compareBlocks.push({ type: 'compare', left, right, sign });
          }
        }
        if (compareBlocks.length < 1) continue;
        questions.push({
          id: qid,
          prompt,
          mode: 'compare',
          ...(typeof qq.tip === 'string' && qq.tip.trim() ? { tip: qq.tip.trim() } : {}),
          compareBlocks,
          choices: [],
        });
        continue;
      }

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
      if (choices.length < 2 || !correctChoiceId) continue;
      if (!choices.some((c) => c.id === correctChoiceId)) continue;
      questions.push({
        id: qid,
        prompt,
        mode: 'choice',
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

  if (packId === 'lengths-class-5' && topics.length === 0) {
    return {
      id: id || 'ex-lengths-class-5',
      title: title || 'Rechnen mit Längen',
      packId: 'lengths-class-5',
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
