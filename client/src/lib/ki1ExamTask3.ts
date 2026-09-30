import type { ExamGridTaskSpec } from './examGridTaskBuilder';

const RL_TERM_OPTS = [
  { value: 'A', label: 'Aktion' },
  { value: 'B', label: 'Belohnung' },
  { value: 'C', label: 'Zustand' },
  { value: 'D', label: 'Modell' },
];

/** Aufgabe 3 — Q-Learning / Reinforcement Learning */
export function ki1QuizTask3(): ExamGridTaskSpec {
  return {
    taskNumber: 3,
    points: 13,
    afbLevel: 2,
    layout: 'stack',
    subsections: [
      {
        id: 'ki3-intro',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        variant: 'instruction',
        text: 'Kreuze jeweils eine oder mehrere richtige Antworten an.',
      },
      {
        id: 'ki3-a',
        letter: 'A',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Ein selbstlernendes Äffchen soll in einem Spiel über Fässer springen. Was bezeichnet man beim Reinforcement Learning als Agenten?',
        options: [
          { value: 'A', label: 'Das Fass, weil es die Umgebung verändert' },
          {
            value: 'B',
            label: 'Das Äffchen beziehungsweise das Programm, das Entscheidungen trifft',
          },
          { value: 'C', label: 'Die Punktzahl, weil sie das Verhalten bewertet' },
          { value: 'D', label: 'Die gesamte Spielwelt mit allen Hindernissen' },
        ],
        solution: 'B',
      },
      {
        id: 'ki3-b',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: '1. „Das Fass ist noch 80 Pixel entfernt.“',
        options: RL_TERM_OPTS,
        solution: 'C',
      },
      {
        id: 'ki3-c',
        letter: 'C',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: '2. „Springen“',
        options: RL_TERM_OPTS,
        solution: 'A',
      },
      {
        id: 'ki3-d',
        letter: 'D',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: '3. „+10 Punkte“',
        options: RL_TERM_OPTS,
        solution: 'B',
      },
      {
        id: 'ki3-e',
        letter: 'E',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: '4. Die gespeicherten Erfahrungen des Agenten',
        options: RL_TERM_OPTS,
        solution: 'D',
      },
      {
        id: 'ki3-g',
        letter: 'F',
        title: 'Ein Agent spielt ein einfaches Spiel. Nun wird seine Explorationsrate verändert. Beurteile die Aussagen:',
        quadrant: 'tl',
        kind: 'wahr-falsch-group',
        items: [
          {
            text: 'Bei einer Explorationsrate von 0 werden keine zufälligen Aktionen aufgrund der Exploration gewählt.',
            solution: 'W',
          },
          {
            text: 'Eine hohe Explorationsrate kann dazu führen, dass ein bereits recht guter Agent trotzdem ungewöhnliche Aktionen ausprobiert.',
            solution: 'W',
          },
          {
            text: 'Je höher die Explorationsrate ist, desto häufiger wählt der Agent automatisch die momentan beste bekannte Aktion.',
            solution: 'F',
          },
          {
            text: 'Exploration kann sinnvoll sein, weil der Agent dadurch neue Handlungsalternativen entdeckt.',
            solution: 'W',
          },
        ],
      },
      {
        id: 'ki3-h',
        letter: 'G',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Für einen Zustand enthält eine vereinfachte Q-Tabelle folgende Werte: <em>Fass 20 Pixel entfernt</em> — links: 2, rechts: 1, springen: 8. Der Agent nutzt gerade keine zufällige Exploration. Welche Aktion sollte er auswählen?',
        options: [
          { value: 'A', label: 'links' },
          { value: 'B', label: 'rechts' },
          { value: 'C', label: 'springen' },
          { value: 'D', label: 'Eine zufällige Aktion, weil alle drei Aktionen möglich sind' },
        ],
        solution: 'C',
      },
      {
        id: 'ki3-i',
        letter: 'H',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Das ursprüngliche Spiel besitzt nur gleich große Fässer. Nun gibt es plötzlich kleine und große Fässer. Für große Fässer ist ein anderer Sprung notwendig. Welche Veränderungen könnten sinnvoll sein?',
        options: [
          { value: 'A', label: 'Die Größe des Fasses wird Teil des Zustands.' },
          {
            value: 'B',
            label: 'Der Agent erhält Informationen darüber, wie weit das Fass entfernt ist.',
          },
          { value: 'C', label: 'Man entfernt alle Informationen über die Position des Fasses.' },
          {
            value: 'D',
            label: 'Jeder Zustand erhält unabhängig vom Verhalten dieselbe Belohnung.',
          },
        ],
        solution: 'A|B',
      },
      {
        id: 'ki3-j',
        letter: 'I',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Bei Pong kann eine Q-Tabelle noch relativ klein bleiben. Ein komplexes Spiel besitzt dagegen Millionen möglicher Situationen. Warum kann eine klassische Q-Tabelle dabei problematisch werden?',
        options: [
          { value: 'A', label: 'Eine Q-Tabelle kann grundsätzlich höchstens 100 Zustände enthalten.' },
          {
            value: 'B',
            label:
              'Jeder neue Zustand benötigt zusätzliche Einträge. Bei sehr vielen möglichen Zuständen wird das Lernen dadurch extrem aufwendig.',
          },
          { value: 'C', label: 'Q-Learning funktioniert ausschließlich bei Spielen ohne Grafik.' },
          {
            value: 'D',
            label: 'Reinforcement Learning erlaubt grundsätzlich nur drei verschiedene Aktionen.',
          },
        ],
        solution: 'B',
      },
      {
        id: 'ki3-k',
        letter: 'J',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Zusatzfrage: Welcher Ansatz kann bei solchen sehr großen Zustandsräumen eingesetzt werden?',
        options: [
          { value: 'A', label: 'Deep Q-Learning mit einem neuronalen Netz' },
          { value: 'B', label: 'Ausschließlich eine größere Schriftart in der Q-Tabelle' },
          { value: 'C', label: 'Das zufällige Löschen alter Zustände' },
          { value: 'D', label: 'Das Abschalten sämtlicher Sensoren' },
        ],
        solution: 'A',
      },
    ],
  };
}
