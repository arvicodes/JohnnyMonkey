import type { ExamGridTaskSpec } from './examGridTaskBuilder';

const RL_BEGRIFF_OPTS = [
  { value: 'A', label: 'Agent' },
  { value: 'B', label: 'Zustand' },
  { value: 'C', label: 'Aktion' },
  { value: 'D', label: 'Belohnung' },
];

/** Aufgabe 3 — Q-Learning am Äffchen (getrennte Prüfaspekte). */
export function ki1QuizTask3(): ExamGridTaskSpec {
  return {
    taskNumber: 3,
    points: 8,
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
        text: 'Kreuze jeweils die richtige Antwort an.',
      },
      {
        id: 'ki3-a-intro',
        letter: 'A',
        title: 'Ordne jedem Beispiel den passenden Begriff zu.',
        quadrant: 'tl',
        kind: 'paragraph',
        text: 'Agent · Zustand · Aktion · Belohnung',
      },
      {
        id: 'ki3-a1',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt: 'Das Äffchen beziehungsweise das steuernde Programm',
        options: RL_BEGRIFF_OPTS,
        solution: 'A',
      },
      {
        id: 'ki3-a2',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt: '„Das Fass ist noch 80 Pixel entfernt.“',
        options: RL_BEGRIFF_OPTS,
        solution: 'B',
      },
      {
        id: 'ki3-a3',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt: '„Springen“',
        options: RL_BEGRIFF_OPTS,
        solution: 'C',
      },
      {
        id: 'ki3-a4',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt: '„+10 Punkte“',
        options: RL_BEGRIFF_OPTS,
        solution: 'D',
      },
      {
        id: 'ki3-b',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Nach mehreren Trainingsrunden kann das Äffchen die Fässer schon meistens überspringen. Trotzdem probiert es gelegentlich einen anderen Zug aus. Warum kann das sinnvoll sein?',
        options: [
          {
            value: 'A',
            label: 'Es könnte dadurch noch eine bessere Strategie entdecken.',
          },
          { value: 'B', label: 'Es muss nach jedem Erfolg sein Wissen zurücksetzen.' },
          {
            value: 'C',
            label: 'Es darf dieselbe Aktion niemals zweimal hintereinander wählen.',
          },
          { value: 'D', label: 'Seine bisher gelernten Werte werden dadurch gelöscht.' },
        ],
        solution: 'A',
      },
      {
        id: 'ki3-c',
        letter: 'C',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Gegeben sei der Zustand „Fass 20 Pixel entfernt“. In der vereinfachten Q-Tabelle stehen dafür die Q-Werte: links = 2, rechts = 1, springen = 8. Der Agent nutzt gerade nur Exploitation (keine zufällige Exploration). Welche Aktion wählt er?',
        options: [
          { value: 'A', label: 'links (Q = 2)' },
          { value: 'B', label: 'rechts (Q = 1)' },
          { value: 'C', label: 'springen (Q = 8)' },
          { value: 'D', label: 'eine zufällige der drei Aktionen' },
        ],
        solution: 'C',
      },
      {
        id: 'ki3-d',
        letter: 'D',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Jetzt gibt es kleine und große Fässer. Für große Fässer ist ein anderer Sprung notwendig. Welche Veränderung ist sinnvoll?',
        options: [
          { value: 'A', label: 'Die Fassgröße wird Bestandteil des Zustands.' },
          { value: 'B', label: 'Die Fassgröße wird Bestandteil der Belohnung.' },
          { value: 'C', label: 'Die Fassgröße wird als mögliche Aktion gespeichert.' },
          {
            value: 'D',
            label:
              'Die Fassgröße spielt keine Rolle, solange die Entfernung bekannt ist.',
          },
        ],
        solution: 'A',
      },
      {
        id: 'ki3-e',
        letter: 'E',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Warum kann eine Q-Tabelle bei Millionen möglicher Spielsituationen problematisch werden?',
        options: [
          {
            value: 'A',
            label:
              'Für sehr viele Zustände und Aktionen müssen entsprechend viele Werte gespeichert und gelernt werden.',
          },
          {
            value: 'B',
            label:
              'Mit zunehmender Zahl an Zuständen kann jede Aktion nur noch einmal ausprobiert werden.',
          },
          {
            value: 'C',
            label: 'Eine Q-Tabelle kann nur Zustände mit Zahlenwerten speichern.',
          },
          {
            value: 'D',
            label: 'Bei mehr als zwei möglichen Aktionen können keine Q-Werte mehr berechnet werden.',
          },
        ],
        solution: 'A',
      },
    ],
  };
}
