import type { ExamGridTaskSpec } from './examGridTaskBuilder';

const RL_STEPS_ORDERED = [
  'Der Computer befindet sich in einer Spielsituation.',
  'Ein möglicher Zug wird ausgewählt.',
  'Der Zug wird ausgeführt.',
  'Das Ergebnis wird bewertet.',
  'Die Wahrscheinlichkeit zukünftiger Entscheidungen wird angepasst.',
].join('|');

const RL_STEPS_SCRAMBLED = [
  'Das Ergebnis wird bewertet.',
  'Die Wahrscheinlichkeit zukünftiger Entscheidungen wird angepasst.',
  'Ein möglicher Zug wird ausgewählt.',
  'Der Zug wird ausgeführt.',
  'Der Computer befindet sich in einer Spielsituation.',
].join('|');

/** Aufgabe 2 — Verstärkendes Lernen am Minischach (bereinigt, je Teil ein Prüfaspekt). */
export function ki1QuizTask2(): ExamGridTaskSpec {
  return {
    taskNumber: 2,
    points: 7,
    afbLevel: 2,
    layout: 'stack',
    subsections: [
      {
        id: 'ki2-intro',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        variant: 'instruction',
        text: 'Kreuze jeweils eine oder mehrere richtige Antworten an.',
      },
      {
        id: 'ki2-a',
        letter: 'A',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Zu Beginn liegen für eine Spielsituation gleich viele rote und blaue Tokens in der Box. Was bedeutet das?',
        options: [
          {
            value: 'A',
            label: 'Beide Züge werden zunächst mit gleicher Wahrscheinlichkeit ausgewählt.',
          },
          { value: 'B', label: 'Der Computer kennt bereits den besseren Zug.' },
          { value: 'C', label: 'Beide Züge führen garantiert zum gleichen Ergebnis.' },
          { value: 'D', label: 'Der Computer führt beide Züge nacheinander aus.' },
        ],
        solution: 'A',
      },
      {
        id: 'ki2-b',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'In der Box liegen 🔴 🔴 🔴 🔴 🔵. Der Computer zieht 🔴 und gewinnt. Danach wird ein weiteres rotes Token hinzugefügt. Welche Folge hat diese Veränderung?',
        options: [
          {
            value: 'A',
            label: 'Rot wird beim nächsten Auftreten dieser Situation wahrscheinlicher ausgewählt.',
          },
          { value: 'B', label: 'Rot wird von nun an immer gewählt.' },
          { value: 'C', label: 'Blau wird automatisch gelöscht.' },
          {
            value: 'D',
            label: 'Der Computer kennt dadurch bereits die optimale Strategie für das gesamte Spiel.',
          },
        ],
        solution: 'A',
      },
      {
        id: 'ki2-c',
        letter: 'C',
        title: 'Ordne die Schritte des Lernprozesses in die richtige Reihenfolge:',
        quadrant: 'tl',
        kind: 'sort',
        interaction: 'drag',
        sortJoin: 'pipe',
        sortLayout: 'steps',
        given: RL_STEPS_SCRAMBLED,
        solution: RL_STEPS_ORDERED,
      },
      {
        id: 'ki2-d',
        letter: 'D',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt: 'Was unterscheidet dieses Verfahren von klassischer KI?',
        options: [
          { value: 'A', label: 'Bei klassischer KI muss der Computer nicht programmiert werden.' },
          {
            value: 'B',
            label:
              'Bei klassischer KI werden Wissen und Lösungsweg stärker vom Menschen vorgegeben, während das lernende System seine Strategie durch Erfahrungen verändert.',
          },
          { value: 'C', label: 'Maschinelles Lernen benötigt überhaupt keine Vorgaben vom Menschen.' },
          { value: 'D', label: 'Nur klassische KI kann Entscheidungen treffen.' },
        ],
        solution: 'B',
      },
      {
        id: 'ki2-e',
        letter: 'E',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Eine Schülerin schlägt vor: „Wenn ein Zug einmal zu einer Niederlage führt, sollte die KI ihn für immer löschen.“ Warum wäre das problematisch?',
        options: [
          { value: 'A', label: 'Der Computer könnte dadurch langsamer rechnen.' },
          {
            value: 'B',
            label:
              'Ein Zug kann in einer Situation zu einer Niederlage geführt haben, obwohl er grundsätzlich trotzdem sinnvoll sein kann.',
          },
          { value: 'C', label: 'Eine KI darf keine Züge löschen.' },
          { value: 'D', label: 'Dann würde der Mensch automatisch verlieren.' },
        ],
        solution: 'B',
      },
      {
        id: 'ki2-f',
        letter: 'F',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Welche Situationen führen nach den Regeln von Minischach zu einem Sieg? (Mehrere Antworten sind richtig.)',
        options: [
          { value: 'A', label: 'Eine eigene Figur erreicht die gegenüberliegende Seite.' },
          { value: 'B', label: 'Alle gegnerischen Figuren wurden geschlagen.' },
          { value: 'C', label: 'Der Gegner kann keinen gültigen Zug mehr ausführen.' },
          { value: 'D', label: 'Man besitzt nach fünf Zügen mehr Figuren als der Gegner.' },
          { value: 'E', label: 'Man hat als Erste*r zwei gegnerische Figuren geschlagen.' },
        ],
        solution: 'A|B|C',
      },
      {
        id: 'ki2-g',
        letter: 'G',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Welche der folgenden Situationen eignen sich grundsätzlich für verstärkendes Lernen? (Mehrere Antworten sind richtig.)',
        options: [
          {
            value: 'A',
            label:
              'Eine Spielfigur probiert verschiedene Wege durch ein Labyrinth und erhält eine Belohnung, wenn sie das Ziel erreicht.',
          },
          {
            value: 'B',
            label:
              'Ein Roboter probiert unterschiedliche Bewegungen und erhält eine positive Rückmeldung, wenn er einen Gegenstand erfolgreich greift.',
          },
          {
            value: 'C',
            label:
              'Ein Programm bekommt 5.000 Bilder, auf denen bereits „Hund“ oder „Katze“ steht, und lernt daraus die Unterscheidung.',
          },
          {
            value: 'D',
            label: 'Eine Spielfigur erhält Punkte dafür, möglichst weit durch ein Computerspiel zu kommen.',
          },
          {
            value: 'E',
            label:
              'Ein Programm bekommt feste Regeln wie „Wenn Temperatur unter 18 Grad, dann Heizung einschalten“ und führt diese unverändert aus.',
          },
        ],
        solution: 'A|B|D',
      },
    ],
  };
}
