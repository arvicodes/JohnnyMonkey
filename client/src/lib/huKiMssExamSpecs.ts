import type { ExamGridTaskSpec } from './examGridTaskBuilder';

const TURING_TEST_ORDERED = [
  'Ein Prüfer führt ein Gespräch mit zwei Partnern.',
  'Einer der Partner ist ein Mensch, der andere eine Maschine.',
  'Der Prüfer weiß nicht, welcher Partner der Mensch und welcher die Maschine ist.',
  'Der Prüfer vergleicht die Antworten der beiden Partner.',
  'Die Maschine gilt als intelligent, wenn der Prüfer sie nicht zuverlässig vom Menschen unterscheiden kann.',
].join('|');

const TURING_TEST_SCRAMBLED = [
  'Der Prüfer vergleicht die Antworten der beiden Partner.',
  'Die Maschine gilt als intelligent, wenn der Prüfer sie nicht zuverlässig vom Menschen unterscheiden kann.',
  'Ein Prüfer führt ein Gespräch mit zwei Partnern.',
  'Einer der Partner ist ein Mensch, der andere eine Maschine.',
  'Der Prüfer weiß nicht, welcher Partner der Mensch und welcher die Maschine ist.',
].join('|');

const RL_FIVE_ORDERED = [
  'Der Computer befindet sich in einer Spielsituation.',
  'Ein möglicher Zug wird ausgewählt.',
  'Der Zug wird ausgeführt.',
  'Das Ergebnis wird bewertet.',
  'Die Wahrscheinlichkeit zukünftiger Entscheidungen wird angepasst.',
].join('|');

const RL_FIVE_SCRAMBLED = [
  'Das Ergebnis wird bewertet.',
  'Die Wahrscheinlichkeit zukünftiger Entscheidungen wird angepasst.',
  'Ein möglicher Zug wird ausgewählt.',
  'Der Zug wird ausgeführt.',
  'Der Computer befindet sich in einer Spielsituation.',
].join('|');

const SNAP_IMAGE_SRC =
  '/api/file-system-paths/read-image?filePath=git-intern%2FInformatik%2FMSS%20Grundthemen%2F11-04%20KI%2Fhu-ki-mss-13-snap-belohnung.png';

/** Freitext: Musterlösung für Lehreransicht (keine exakte Auto-Bewertung erwartet). */
const MSS11_SCHACH_MODEL =
  'Verstärkendes Lernen (Reinforcement Learning): viele Partien, Belohnungen für gute Züge, Strategie wird durch Erfahrung verbessert.';
const MSS11_HUND_MODEL =
  'Bilderkennung braucht beschriftete Beispielbilder (überwachtes/beschriftetes Lernen), nicht Belohnungen für Aktionen in einer Umgebung.';
const MSS13_SNAP_MODEL =
  'Belohnung −10 bei Fass, sonst +1 → verstärkendes Lernen wie Bananenjagd. Spam: beschriftetes Lernen mit markierten E-Mails.';

const MSS11_WF: { text: string; solution: 'W' | 'F' }[] = [
  { text: 'Alle heutigen KI-Systeme sind als „schwache KI“ klassifiziert.', solution: 'W' },
  { text: 'Beim maschinellen Lernen erkennen Computer Muster.', solution: 'W' },
  {
    text:
      'Beim verstärkenden Lernen probiert ein Computer verschiedene Aktionen aus und bewertet deren Folgen.',
    solution: 'W',
  },
  {
    text:
      'Ein Computerspiel, bei dem eine KI durch Punkte für gute Aktionen lernt, ist ein Beispiel für ein klassisches KI-System.',
    solution: 'F',
  },
  { text: 'Beim verstärkenden Lernen lernt der Agent durch Belohnung und Bestrafung.', solution: 'W' },
  {
    text: 'Für den Turing Test ist vor allem das beobachtbare Verhalten der Maschine entscheidend.',
    solution: 'W',
  },
  {
    text:
      'Eine Maschine kann beim Turing Test auch dann überzeugend wirken, wenn einzelne Antworten sachlich falsch sind.',
    solution: 'W',
  },
  { text: 'Die KI muss beim Lernen immer die Aktion mit dem höchsten Q-Wert auswählen.', solution: 'F' },
  {
    text: 'Eine Q-Tabelle enthält direkt die vollständigen Spielregeln des Nim-Spiels.',
    solution: 'F',
  },
  {
    text:
      'Eine hohe Learning Rate bedeutet, dass neue Erfahrungen die bestehenden Q-Werte stärker verändern.',
    solution: 'W',
  },
  {
    text:
      'Bei einer überschaubaren Anzahl möglicher Zustände kann der Agent schneller Erfahrungen sammeln.',
    solution: 'W',
  },
  {
    text:
      'Der Agent kann trotz seines Wissens, dass die Aktion „springen“ meist erfolgreich ist, eine andere Aktion ausprobieren, wenn die Explorationsrate dies zulässt.',
    solution: 'W',
  },
  {
    text:
      'Ein selbstlernendes Äffchen soll in einem Spiel über Fässer springen. Beim Reinforcement Learning bezeichnet man das Fass, weil es die Umgebung verändert, als Agenten.',
    solution: 'F',
  },
];

const MSS13_WF: { text: string; solution: 'W' | 'F' }[] = [
  {
    text:
      'KI-Systeme, die sich nur auf bestimmte Anwendungsgebiete spezialisieren, z. B. Chatbots, sind als „starke KI“ klassifiziert.',
    solution: 'F',
  },
  {
    text: 'Beim maschinellen Lernen können erkannte Muster genutzt werden, um neue Daten einzuordnen.',
    solution: 'W',
  },
  {
    text:
      'Beim beschrifteten Lernen erhält der Computer für seine Aktionen Belohnungen oder Bestrafungen.',
    solution: 'F',
  },
  {
    text:
      'Ein Computerspiel, bei dem eine KI durch Punkte für gute Aktionen lernt, ist ein Beispiel für verstärkendes Lernen.',
    solution: 'W',
  },
  {
    text: 'Beispieldaten, bei denen die richtige Beschriftung bekannt ist, nennt man Testdaten.',
    solution: 'F',
  },
  {
    text:
      'Eine Maschine besteht den Turing Test automatisch, wenn sie alle gestellten Fragen richtig beantwortet.',
    solution: 'F',
  },
  {
    text:
      'Beim Turing Test spielt es keine Rolle, mit welchem Verfahren die Maschine ihre Antworten erzeugt.',
    solution: 'W',
  },
  { text: 'Das Nim-Spiel ist ein klassisches Beispiel für beschriftetes Lernen.', solution: 'F' },
  {
    text:
      'Eine hohe Explorationsrate bedeutet, dass besonders häufig neue oder zufällige Aktionen ausprobiert werden.',
    solution: 'W',
  },
  {
    text:
      'Eine hohe Learning Rate bedeutet, dass besonders häufig neue oder zufällige Aktionen ausprobiert werden.',
    solution: 'F',
  },
  {
    text: 'In der Q-Tabelle wird gezählt, wie oft der Agent ein Spiel bereits gespielt hat.',
    solution: 'F',
  },
  {
    text: 'Wenn die Explorationsrate sehr hoch ist, werden alle Werte in der Q-Tabelle gleich groß.',
    solution: 'F',
  },
  {
    text:
      'Alan Turing schlug im Zusammenhang mit KI eine operative Definition anhand beobachtbaren Verhaltens vor.',
    solution: 'W',
  },
];

function wfTask1(items: { text: string; solution: 'W' | 'F' }[], idPrefix: string): ExamGridTaskSpec {
  return {
    taskNumber: 1,
    points: 13,
    layout: 'stack',
    subsections: [
      {
        id: `${idPrefix}-intro`,
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        variant: 'instruction',
        text:
          'Kreuze an. Korrekte Kreuze geben einen Pluspunkt, falsche Kreuze einen Minuspunkt. Es gibt keine Minuspunkte über diese Aufgabe hinaus.',
      },
      {
        id: `${idPrefix}-wf`,
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'wahr-falsch-group',
        tableLayout: true,
        items,
      },
    ],
  };
}

export function huKiMss11Task1(): ExamGridTaskSpec {
  return wfTask1(MSS11_WF, 'hu11');
}

export function huKiMss11Task2(): ExamGridTaskSpec {
  return {
    taskNumber: 2,
    points: 6,
    layout: 'stack',
    subsections: [
      {
        id: 'hu11-sort',
        letter: 'A',
        title: 'Im folgenden Ablauf sind die Schritte durcheinander geraten. Ordne sie.',
        quadrant: 'tl',
        kind: 'sort',
        interaction: 'drag',
        sortJoin: 'pipe',
        sortLayout: 'steps',
        given: TURING_TEST_SCRAMBLED,
        solution: TURING_TEST_ORDERED,
      },
      {
        id: 'hu11-q',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Für einen Zustand enthält eine vereinfachte Q-Tabelle folgende Werte: <em>Fass 20 Pixel entfernt</em> — links: 2, rechts: 1, springen: 8. Der Agent nutzt gerade keine zufällige Exploration. Welche Aktion sollte er auswählen?',
        options: [
          { value: 'A', label: 'links' },
          { value: 'B', label: 'rechts' },
          { value: 'C', label: 'springen' },
          {
            value: 'D',
            label: 'Eine zufällige Aktion, weil alle drei Aktionen möglich sind',
          },
        ],
        solution: 'C',
      },
      {
        id: 'hu11-schach',
        letter: 'C',
        title: '',
        quadrant: 'tl',
        kind: 'one-line',
        prompt:
          'Erläutere die Lernart, die sich am besten eignet, um einem Computer das Schachspielen beizubringen. (2 P)',
        solution: MSS11_SCHACH_MODEL,
        answerId: 'a2c1',
      },
      {
        id: 'hu11-schach-2',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'one-line',
        prompt: '',
        solution: MSS11_SCHACH_MODEL,
        answerId: 'a2c2',
      },
      {
        id: 'hu11-hund',
        letter: 'D',
        title: '',
        quadrant: 'tl',
        kind: 'one-line',
        prompt:
          'Bewerte, warum diese Lernart nicht dafür geeignet ist, einem Computer beizubringen, in Bildern Hunde und Katzen zu unterscheiden. (2 P)',
        solution: MSS11_HUND_MODEL,
        answerId: 'a2d1',
      },
      {
        id: 'hu11-hund-2',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'one-line',
        prompt: '',
        solution: MSS11_HUND_MODEL,
        answerId: 'a2d2',
      },
    ],
  };
}

export function huKiMss13Task1(): ExamGridTaskSpec {
  return wfTask1(MSS13_WF, 'hu13');
}

export function huKiMss13Task2(): ExamGridTaskSpec {
  return {
    taskNumber: 2,
    points: 4,
    layout: 'stack',
    subsections: [
      {
        id: 'hu13-sort',
        letter: 'A',
        title:
          'Bringe die Schritte des verstärkenden Lernens in eine sinnvolle Reihenfolge.',
        quadrant: 'tl',
        kind: 'sort',
        interaction: 'drag',
        sortJoin: 'pipe',
        sortLayout: 'steps',
        given: RL_FIVE_SCRAMBLED,
        solution: RL_FIVE_ORDERED,
      },
      {
        id: 'hu13-train',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Eine KI soll Äpfel und Birnen unterscheiden. Es stehen 1.000 beschriftete Bilder zur Verfügung. Nach dem Training erzielt die KI bei genau diesen 1.000 Bildern eine Trefferquote von 99 Prozent. Kreuze die sinnvollste Schlussfolgerung an.',
        options: [
          { value: 'A', label: 'Die KI erkennt Äpfel und Birnen definitiv zuverlässig.' },
          {
            value: 'B',
            label: 'Die 1.000 Bilder sollten zusätzlich als Testdaten verwendet werden.',
          },
          {
            value: 'C',
            label:
              'Für eine sinnvolle Überprüfung sollten bisher nicht zum Training verwendete Bilder eingesetzt werden.',
          },
          { value: 'D', label: 'Die KI benötigt nun keine weiteren Daten mehr.' },
        ],
        solution: 'C',
      },
      {
        id: 'hu13-snap-intro',
        letter: 'C',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        text:
          'Erläutere diesen Snap-Baustein im Bezug auf das Spiel Bananenjagd und die dort verwendete Lernart. Erläutere, welche Lernart sich am besten eignet, um Spam-E-Mails zu erkennen. (2 P)',
      },
      {
        id: 'hu13-snap-img',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'standalone-image',
        src: SNAP_IMAGE_SRC,
        alt: 'Snap-Baustein: Belohnung abhängig vom Berühren eines Fasses',
        size: 'compact',
      },
      {
        id: 'hu13-snap-1',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'one-line',
        prompt: '',
        solution: MSS13_SNAP_MODEL,
        answerId: 'a2c1',
      },
      {
        id: 'hu13-snap-2',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'one-line',
        prompt: '',
        solution: MSS13_SNAP_MODEL,
        answerId: 'a2c2',
      },
    ],
  };
}

export const HU_KI_MSS_EXAMS = [
  {
    key: 'HU_KI MSS 11',
    fileName: 'HU_KI MSS 11.html',
    title: 'Hausaufgabenüberprüfung (HÜ): Künstliche Intelligenz – MSS 11',
    shortTitle: 'HÜ KI – MSS 11',
    mssClass: 'MSS 11 INFORMATIK',
    task1: huKiMss11Task1,
    task2: huKiMss11Task2,
  },
  {
    key: 'HU_KI MSS 13',
    fileName: 'HU_KI MSS 13.html',
    title: 'Hausaufgabenüberprüfung (HÜ): Künstliche Intelligenz – MSS 13',
    shortTitle: 'HÜ KI – MSS 13',
    mssClass: 'MSS 13 INFORMATIK',
    task1: huKiMss13Task1,
    task2: huKiMss13Task2,
  },
] as const;
