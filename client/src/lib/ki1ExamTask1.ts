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

/** Aufgabe 1 — Turing-Test & Captcha */
export function ki1QuizTask1(): ExamGridTaskSpec {
  return {
    taskNumber: 1,
    points: 4,
    layout: 'stack',
    subsections: [
      {
        id: 'ki1-intro',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        variant: 'instruction',
        text: 'Kreuze jeweils eine oder mehrere richtige Antworten an.',
      },
      {
        id: 'ki1-a',
        letter: 'A',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: 'Alan Turing schlug … im Zusammenhang mit künstlicher Intelligenz vor.',
        options: [
          { value: 'A', label: 'eine feste Liste intelligenter Programme' },
          {
            value: 'B',
            label: 'eine operative Definition anhand beobachtbaren Verhaltens',
          },
          { value: 'C', label: 'einen Intelligenzquotienten für Computer' },
          { value: 'D', label: 'einen Test der Rechengeschwindigkeit' },
        ],
        solution: 'B',
      },
      {
        id: 'ki1-b',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: 'Welche Aussage beschreibt Turings Idee am besten?',
        options: [
          {
            value: 'A',
            label: 'Eine Maschine ist intelligent, wenn sie schneller rechnet als ein Mensch.',
          },
          {
            value: 'B',
            label:
              'Eine Maschine ist intelligent, wenn ihr Verhalten in einem Gespräch nicht zuverlässig von dem eines Menschen unterschieden werden kann.',
          },
          { value: 'C', label: 'Eine Maschine ist intelligent, wenn sie Gefühle besitzt.' },
          {
            value: 'D',
            label: 'Eine Maschine ist intelligent, sobald sie Sprache erzeugen kann.',
          },
        ],
        solution: 'B',
      },
      {
        id: 'ki1-c',
        letter: 'C',
        title:
          'Im folgenden Ablauf sind die Schritte durcheinander geraten. Ordne sie von 1 bis 5.',
        quadrant: 'tl',
        kind: 'sort',
        interaction: 'drag',
        sortJoin: 'pipe',
        sortLayout: 'steps',
        given: TURING_TEST_SCRAMBLED,
        solution: TURING_TEST_ORDERED,
      },
      {
        id: 'ki1-e',
        letter: 'E',
        title: '',
        quadrant: 'tl',
        kind: 'multi-select',
        prompt: 'Welche Captcha-Aufgabe erfüllt die Grundidee eines Captchas am besten?',
        options: [
          {
            value: 'A',
            label:
              'Eine zufällig erzeugte Rechenaufgabe, die Menschen und Computerprogramme gleichermaßen schnell lösen können.',
          },
          {
            value: 'B',
            label:
              'Eine Aufgabe, die für Menschen meist leicht verständlich ist, Computerprogramme aber möglichst zuverlässig vor Probleme stellt.',
          },
          {
            value: 'C',
            label:
              'Eine Aufgabe, die für Menschen besonders schwierig ist, damit nur sehr aufmerksame Nutzer*innen Zugang erhalten.',
          },
          {
            value: 'D',
            label:
              'Eine Aufgabe, bei der ein Computer entscheidet, ob die Antwort inhaltlich richtig oder falsch ist.',
          },
        ],
        solution: 'B',
      },
    ],
  };
}
