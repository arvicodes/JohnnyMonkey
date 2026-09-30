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

/** Aufgabe 2 — Verstärkendes Lernen */
export function ki1QuizTask2(): ExamGridTaskSpec {
  return {
    taskNumber: 2,
    points: 12,
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
        kind: 'multi-select',
        prompt:
          'Verstärkendes Lernen: Zu Beginn hat der Computer noch keine erfolgreiche Strategie gelernt. Wie entscheidet er, welchen Zug er macht?',
        options: [
          { value: 'A', label: 'Er berechnet sofort den besten Zug.' },
          { value: 'B', label: 'Er wählt zufällig einen der möglichen Züge aus.' },
          { value: 'C', label: 'Er kopiert den letzten Zug des Menschen.' },
          { value: 'D', label: 'Er wählt immer den kürzesten Weg zum Ziel.' },
        ],
        solution: 'B',
      },
      {
        id: 'ki2-b',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Für eine Spielsituation liegen in der Box: 🔴 🔴 🔴 🔴 🔵. Der Computer zieht 🔴 und gewinnt anschließend das Spiel. Was passiert? (Danach: 🔴 🔴 🔴 🔴 🔴 🔵)',
        options: [
          { value: 'A', label: 'Ein rotes Token wird entfernt.' },
          { value: 'B', label: 'Ein blaues Token wird hinzugefügt.' },
          { value: 'C', label: 'Ein weiteres rotes Token wird hinzugefügt.' },
          { value: 'D', label: 'Alle Tokens werden neu gemischt.' },
        ],
        solution: 'C',
      },
      {
        id: 'ki2-d',
        letter: 'C',
        title: 'Bringe die Schritte in die richtige Reihenfolge:',
        quadrant: 'tl',
        kind: 'sort',
        interaction: 'drag',
        sortJoin: 'pipe',
        sortLayout: 'steps',
        given: RL_STEPS_SCRAMBLED,
        solution: RL_STEPS_ORDERED,
      },
      {
        id: 'ki2-e',
        letter: 'D',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Was unterscheidet das Verfahren von klassischer KI? (AFB II) Welche Aussage beschreibt den wichtigsten Unterschied passend?',
        options: [
          { value: 'A', label: 'Bei klassischer KI muss der Computer nicht programmiert werden.' },
          {
            value: 'B',
            label:
              'Bei klassischer KI werden Wissen und Lösungsweg stärker vom Menschen vorgegeben, während das lernende System seine Strategie durch Erfahrungen verändert.',
          },
          {
            value: 'C',
            label: 'Maschinelles Lernen benötigt überhaupt keine Vorgaben vom Menschen.',
          },
          { value: 'D', label: 'Nur klassische KI kann Entscheidungen treffen.' },
        ],
        solution: 'B',
      },
      {
        id: 'ki2-f',
        letter: 'E',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Eine Schülerin schlägt vor: „Wenn ein Zug einmal zu einer Niederlage führt, sollte die KI diesen Zug einfach für immer löschen.“ Was spricht am stärksten dagegen?',
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
        id: 'ki2-g',
        letter: 'F',
        title: '',
        quadrant: 'tl',
        kind: 'wahr-falsch-group',
        items: [
          {
            text: 'Der Computer beginnt jede Partie mit einer bereits festgelegten optimalen Strategie.',
            solution: 'F',
          },
          {
            text: 'Die Farbe eines gezogenen Tokens bestimmt den Zug des Computers.',
            solution: 'W',
          },
          {
            text: 'Ein Zug, der zum Sieg führt, wird beim nächsten Auftreten der Situation wahrscheinlicher.',
            solution: 'W',
          },
          {
            text: 'Nach jeder Niederlage werden alle bisher gelernten Informationen gelöscht.',
            solution: 'F',
          },
        ],
      },
      {
        id: 'ki2-k',
        letter: 'G',
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
        id: 'ki2-l',
        letter: 'H',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'In einer Spielsituation liegen zunächst gleich viele rote und blaue Tokens vor. Rot führt mehrfach zum Sieg, Blau mehrfach zur Niederlage. Welche Aussagen können daraus folgen? (Mehrere Antworten sind richtig.)',
        options: [
          {
            value: 'A',
            label: 'Rot wird mit zunehmendem Training wahrscheinlich häufiger ausgewählt.',
          },
          { value: 'B', label: 'Blau muss nach der ersten Niederlage vollständig ausgeschlossen werden.' },
          {
            value: 'C',
            label: 'Die Wahrscheinlichkeit der verschiedenen Züge kann sich durch Erfahrungen verändern.',
          },
          { value: 'D', label: 'Rot wird irgendwann zwangsläufig bei jeder Partie zum Sieg führen.' },
          {
            value: 'E',
            label: 'Das Verhalten des Computers kann sich verändern, obwohl die Spielregeln gleich bleiben.',
          },
        ],
        solution: 'A|C|E',
      },
      {
        id: 'ki2-n',
        letter: 'I',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt:
          'Ein anderes KI-System soll ebenfalls durch verstärkendes Lernen trainiert werden. Welche Szenarien passen grundsätzlich zu diesem Prinzip? (Mehrere Antworten sind richtig.)',
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
