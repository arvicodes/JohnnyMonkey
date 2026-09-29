import type { ExamGridTaskSpec } from './examGridTaskBuilder';

/** Aufgabe 1 — Turing-Test & Captcha (ohne inhaltliche Dopplungen). */
export function ki1QuizTask1(): ExamGridTaskSpec {
  return {
    taskNumber: 1,
    points: 3,
    afbLevel: 1,
    layout: 'stack',
    subsections: [
      {
        id: 'ki1-intro',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        variant: 'instruction',
        text: 'Kreuze jeweils die richtige Antwort an.',
      },
      {
        id: 'ki1-a',
        letter: 'A',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt: 'Welche Aussage beschreibt die Idee des Turing Tests am besten?',
        options: [
          {
            value: 'A',
            label: 'Eine Maschine gilt als intelligent, wenn sie schneller rechnet als ein Mensch.',
          },
          {
            value: 'B',
            label:
              'Eine Maschine zeigt intelligentes Verhalten, wenn sie in einem Gespräch nicht zuverlässig von einem Menschen unterschieden werden kann.',
          },
          {
            value: 'C',
            label: 'Eine Maschine gilt als intelligent, sobald sie Sprache erzeugen kann.',
          },
          {
            value: 'D',
            label: 'Eine Maschine gilt als intelligent, wenn sie menschliche Gefühle besitzt.',
          },
        ],
        solution: 'B',
      },
      {
        id: 'ki1-b',
        letter: 'B',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Warum wird ein Captcha manchmal als „umgekehrter Turing Test“ bezeichnet?',
        options: [
          {
            value: 'A',
            label: 'Ein Computer versucht herauszufinden, ob ein anderer Computer intelligent ist.',
          },
          {
            value: 'B',
            label: 'Ein Mensch soll beweisen, dass er kein Computerprogramm ist.',
          },
          {
            value: 'C',
            label: 'Zwei Computer vergleichen ihre Rechengeschwindigkeit.',
          },
          {
            value: 'D',
            label:
              'Menschen müssen Aufgaben lösen, die Computer grundsätzlich niemals lösen können.',
          },
        ],
        solution: 'B',
      },
      {
        id: 'ki1-c',
        letter: 'C',
        title: '',
        quadrant: 'tl',
        kind: 'choice',
        prompt:
          'Welche Captcha-Aufgabe erfüllt die Grundidee eines Captchas am besten?',
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
