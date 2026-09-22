import type { ExamGridTaskSpec, GridSubsection } from './examGridTaskBuilder';
import { druckKaImageUrl } from './examDruckmaterialFlowTasks';

function hydrateField(solution: string, answers: Record<string, string[]>, answerId: string): string {
  const fromMap = answers[answerId]?.[0];
  return fromMap ?? solution;
}

function hydrateSubsections(
  subs: GridSubsection[],
  answers: Record<string, string[]>,
): GridSubsection[] {
  return subs.map((sub) => {
    if (sub.kind === 'life-dates') {
      return {
        ...sub,
        entries: sub.entries.map((e) => ({
          ...e,
          solution: hydrateField(e.solution, answers, e.answerId),
        })),
      };
    }
    if (sub.kind === 'roman-table') {
      const hydratedGaps = sub.gaps?.map((g) => ({
        ...g,
        solution: hydrateField(g.solution, answers, g.answerId),
      }));
      const hydrateSlot = (
        slot:
          | { kind: 'empty' }
          | { kind: 'roman'; text: string }
          | { kind: 'decimal'; text: string }
          | { kind: 'input-roman'; answerId: string; solution: string }
          | { kind: 'input-decimal'; answerId: string; solution: string },
      ) => {
        if (slot.kind === 'input-roman' || slot.kind === 'input-decimal') {
          return { ...slot, solution: hydrateField(slot.solution, answers, slot.answerId) };
        }
        return slot;
      };
      const hydratedGridRows = sub.gridRows?.map((row) => ({
        cells: row.cells.map((c) => {
          if (c.kind === 'input-roman' || c.kind === 'input-decimal') {
            return { ...c, solution: hydrateField(c.solution, answers, c.answerId) };
          }
          if (c.kind === 'pair') {
            return { ...c, left: hydrateSlot(c.left), right: hydrateSlot(c.right) };
          }
          return c;
        }),
      }));
      return { ...sub, gaps: hydratedGaps, gridRows: hydratedGridRows };
    }
    if (sub.kind === 'rich-part') {
      return {
        ...sub,
        blocks: sub.blocks.map((b) => {
          if (b.type === 'field') {
            return { ...b, solution: hydrateField(b.solution, answers, b.answerId) };
          }
          if (b.type === 'place-table') {
            return {
              ...b,
              cells: b.cells.map((c) => ({
                ...c,
                solution: hydrateField(c.solution, answers, c.answerId),
              })),
            };
          }
          if (b.type === 'inline-field') {
            return { ...b, solution: hydrateField(b.solution, answers, b.answerId) };
          }
          return b;
        }),
      };
    }
    if (sub.kind === 'one-line' || sub.kind === 'round-lines' || sub.kind === 'bullet-blanks') {
      return sub;
    }
    if (sub.kind === 'number-line') {
      return {
        ...sub,
        fixed: sub.fixed.map((f) => ({
          ...f,
          solution: hydrateField(f.solution, answers, f.answerId),
        })),
        chips: sub.chips.map((c) => ({
          ...c,
          solution: hydrateField(c.solution, answers, c.answerId),
        })),
      };
    }
    return sub;
  });
}

export function druckmaterialKlassenarbeit2(): ExamGridTaskSpec {
  return {
    taskNumber: 2,
    points: 10,
    afbLevel: 1,
    layout: 'stack',
    subsections: [
      {
        id: 'k2-a',
        letter: 'A',
        title: 'Übersetze die Lebensdaten.',
        quadrant: 'tl',
        kind: 'life-dates',
        entries: [
          {
            heading: 'Pablo Picasso',
            lines: '* XXV.X. MDCCCLXXXI',
            answerId: 'a2a',
            solution: '25.10.1881',
            inputLabel: 'in Arabischen Ziffern',
          },
          {
            heading: 'Leonardo da Vinci',
            lines: '*15.4.1452',
            answerId: 'a2b',
            solution: '15.4.1452',
            inputLabel: 'Mit römischen Zahlzeichen',
          },
        ],
      },
      {
        id: 'k2-b',
        letter: 'B',
        title: 'Fülle die Lücken wie im unten stehenden Beispiel aus.',
        quadrant: 'tl',
        kind: 'roman-table',
        layout: 'triple-grid',
        examples: [
          { roman: 'XXIX', decimal: '29' },
          { roman: 'XXX', decimal: '30' },
          { roman: 'XXXI', decimal: '31' },
        ],
        gridRows: [
          {
            cells: [
              {
                kind: 'pair',
                left: { kind: 'input-roman', answerId: 'a2c', solution: 'XXXII' },
                right: { kind: 'input-decimal', answerId: 'a2d', solution: '32' },
              },
              {
                kind: 'pair',
                left: { kind: 'input-roman', answerId: 'a2e', solution: 'XXXIII' },
                right: { kind: 'input-decimal', answerId: 'a2h', solution: '33' },
              },
              {
                kind: 'pair',
                left: { kind: 'input-roman', answerId: 'a2f', solution: 'L' },
                right: { kind: 'decimal', text: '50' },
              },
            ],
          },
          {
            cells: [
              {
                kind: 'pair',
                left: { kind: 'roman', text: 'XCIV' },
                right: { kind: 'input-decimal', answerId: 'a2g', solution: '94' },
              },
              { kind: 'empty' },
              { kind: 'empty' },
            ],
          },
        ],
      },
    ],
  };
}

export function druckmaterialKlassenarbeit3(): ExamGridTaskSpec {
  const img2 = druckKaImageUrl('image2.png');
  const img3 = druckKaImageUrl('image3.png');
  return {
    taskNumber: 3,
    points: 7,
    afbLevel: 2,
    layout: 'stack',
    subsections: [
      {
        id: 'k3-a',
        letter: 'A',
        title: 'Geburtstagsrätsel',
        quadrant: 'tl',
        kind: 'rich-part',
        image: { src: img2, align: 'left' },
        blocks: [
          {
            type: 'quote',
            text:
              '„Ich habe schon bald Geburtstag. Nur noch wenige Tage! Im Moment bin ich gerade einmal 100000002 Jahre alt. Aber am 111102. 10012. 111111010102 ist es endlich so weit. Dann feiere ich einen robotertastischen Geburtstag und werde ein Jahr älter!“',
          },
          {
            type: 'p',
            text: '<strong>Entschlüssle die Binärzahlen und schreibe als Dezimalzahl:</strong>',
          },
          {
            type: 'field',
            label: 'Wie alt unser Roboter wird:',
            answerId: 'a3a',
            solution: '66',
            wide: true,
          },
          {
            type: 'field',
            label: 'Das Datum seines Geburtstags:',
            answerId: 'a3b',
            solution: '30.11.2010',
            wide: true,
          },
        ],
      },
      {
        id: 'k3-b',
        letter: 'B',
        title: 'Besucher aus der Oktalwelt',
        quadrant: 'tl',
        kind: 'rich-part',
        image: { src: img3, align: 'right' },
        blocks: [
          {
            type: 'quote',
            text:
              '„Wo bin ich denn hier gelandet? Was habt ihr denn für komische Zahlen? Bei mir zu Hause rechnen wir ganz anders. Wir benutzen das Oktalsystem. Das beruht auf der Zahl 8.“',
          },
          {
            type: 'quote',
            text: '„In meiner Welt bin ich 15 Jahre alt. Wie alt bin ich denn bei euch Menschen?“',
          },
          { type: 'p', text: 'Hilf dem kleinen Alien, sein Alter im Dezimalsystem herauszufinden.' },
          {
            type: 'p',
            text:
              '<strong>1) Nenne alle Ziffern, die das Alien in seinem Zahlensystem überhaupt benutzen kann:</strong>',
          },
          {
            type: 'field',
            label: '',
            answerId: 'a3c',
            solution: '0, 1, 2, 3, 4, 5, 6, 7',
            wide: true,
          },
          {
            type: 'p',
            text:
              '<strong>2) Das Oktalsystem basiert auf der Zahl 8. Trage die Zahl 12 auch in diese Stellenwerttafel ein:</strong>',
          },
          {
            type: 'place-table',
            headers: ['512', '64', '8', '1'],
            cells: [
              { answerId: 'a3e1', solution: '0' },
              { answerId: 'a3e2', solution: '0' },
              { answerId: 'a3e3', solution: '1' },
              { answerId: 'a3e4', solution: '4' },
            ],
          },
          {
            type: 'inline-field',
            before: 'Das Alien ist bei uns Menschen also ',
            after: ' Jahre alt.',
            answerId: 'a3d',
            solution: '13',
          },
          {
            type: 'help',
            title: 'Kleine Hilfestellung:',
            paragraphs: [
              'Das Dezimalsystem basiert auf der Zahl 10. In der Stellenwerttafel tragen wir die 12 wie folgt ein:',
              'Das Binärsystem basiert auf der Zahl 2. In der Stellenwerttafel tragen wir die 12 wie folgt ein:',
            ],
            tables: [
              { headers: ['10000', '1000', '100', '10', '1'], row: ['1', '0', '0', '1', '2'] },
              { headers: ['8', '4', '2', '1'], row: ['1', '1', '0', '0'] },
            ],
          },
        ],
      },
    ],
  };
}

export function druckmaterialKlassenarbeit4(): ExamGridTaskSpec {
  return {
    taskNumber: 4,
    points: 12,
    afbLevel: 2,
    layout: 'stack',
    subsections: [
      {
        id: 'k4-intro',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'paragraph',
        text:
          'In der Tierwelt gibt es wahre Hochleistungssportler. Für viele Tier ist Geschwindigkeit überlebenswichtig. Einige Tiere können sogar längere Zeit sehr schnell laufen oder schwimmen. Pferde, Gazellen, Delfine und Wale sind sehr ausdauernd. Die meisten Tiere sind allerdings keine Marathonläufer, sondern eher Sprinter. Die Höchstgeschwindigkeiten einiger Lebewesen sind in dem Säulendiagramm dargestellt.',
      },
      {
        id: 'k4-img',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'standalone-image',
        src: druckKaImageUrl('image4.png'),
        alt: 'Säulendiagramm Höchstgeschwindigkeiten',
        size: 'compact',
      },
      {
        id: 'k4-a',
        letter: 'A',
        title: 'Nenne die Geschwindigkeit des schnellsten Lebewesens:',
        quadrant: 'tl',
        kind: 'one-line',
        prompt: '',
        solution: '180',
        answerId: 'a4a',
        suffix: 'km/h',
      },
      {
        id: 'k4-b',
        letter: 'B',
        title: 'Berechne die Differenz vom schnellsten zum Langsamsten Lebewesen:',
        quadrant: 'tl',
        kind: 'one-line',
        prompt: '',
        solution: '160',
        answerId: 'a4b',
        suffix: 'km/h',
      },
      {
        id: 'k4-c-t',
        letter: 'C',
        title:
          'Auf dem Zahlenstrahl sind bereits einige Geschwindigkeiten durch Pfeile markiert. Lies die markierten Geschwindigkeiten ab. Trage anschließend auf demselben Zahlenstrahl die Geschwindigkeiten von Pferd und Biene ein und beschrifte die Punkte mit den passenden Namen.',
        quadrant: 'tl',
        kind: 'paragraph',
        text: '',
      },
      {
        id: 'k4-c-nl',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'number-line',
        hint:
          'Klicke auf einen roten Pfeil und trage die abgelesene Geschwindigkeit ein. Wähle „Pferd“ oder „Biene“, klicke auf den Zahlenstrahl und beschrifte den Punkt.',
        min: 0,
        max: 72,
        step: 4,
        bg: druckKaImageUrl('image5.jpeg'),
        bgAspect: 1602 / 109,
        axis: [
          { value: 0, pct: 0.37 },
          { value: 24, pct: 29.0 },
          { value: 48, pct: 58.1 },
          { value: 72, pct: 87.1 },
        ],
        fixed: [
          { value: 12, answerId: 'a4c1', solution: '12', positionPct: 9.99 },
          { value: 24, answerId: 'a4c2', solution: '24', positionPct: 31.84 },
          { value: 63, answerId: 'a4c3', solution: '63', positionPct: 65.92 },
        ],
        chips: [
          { label: 'Pferd', value: 70, answerId: 'a4c4', solution: '70' },
          { label: 'Biene', value: 20, answerId: 'a4c5', solution: '20' },
        ],
      },
      {
        id: 'k4-d-t',
        letter: 'D',
        title: 'Im Tierpark wird gezählt',
        quadrant: 'tl',
        kind: 'paragraph',
        text:
          'Im Tierpark wurden an mehreren Tagen die Besucherzahlen notiert. Auf dem Zahlenstrahl sind einige Besucherzahlen bereits durch rote Pfeile markiert. Lies die markierten Zahlen ab. Trage außerdem die Besucherzahlen von gestern (52 400) und von heute (54 640) auch in den Zahlenstrahl ein.',
      },
      {
        id: 'k4-d-nl',
        letter: '',
        title: '',
        quadrant: 'tl',
        kind: 'number-line',
        hint:
          'Klicke auf einen roten Pfeil und trage die Besucherzahl ein. Wähle „gestern“ oder „heute“, klicke auf den Zahlenstrahl und beschrifte den Punkt.',
        min: 50000,
        max: 56000,
        step: 20,
        bg: druckKaImageUrl('image6.jpeg'),
        bgAspect: 1593 / 105,
        axis: [
          { value: 50000, pct: 6.6 },
          { value: 52000, pct: 43.8 },
          { value: 54000, pct: 80.7 },
          { value: 56000, pct: 97.5 },
        ],
        fixed: [
          { value: 50800, answerId: 'a4d1', solution: '50800', positionPct: 17.26 },
          { value: 52600, answerId: 'a4d2', solution: '52600', positionPct: 60.95 },
          { value: 54300, answerId: 'a4d3', solution: '54300', positionPct: 81.61 },
        ],
        chips: [
          { label: 'gestern', value: 52400, answerId: 'a4d4', solution: '52400', display: 'gestern (52 400)' },
          { label: 'heute', value: 54640, answerId: 'a4d5', solution: '54640', display: 'heute (54 640)' },
        ],
      },
    ],
  };
}

export function getDruckmaterialPreset(taskNumber: number): ExamGridTaskSpec | null {
  if (taskNumber === 2) return druckmaterialKlassenarbeit2();
  if (taskNumber === 3) return druckmaterialKlassenarbeit3();
  if (taskNumber === 4) return druckmaterialKlassenarbeit4();
  return null;
}

export function hydrateDruckmaterialSpec(
  spec: ExamGridTaskSpec,
  answers: Record<string, string[]>,
  meta?: { points?: number; afbLevel?: 1 | 2 | 3 },
): ExamGridTaskSpec {
  return {
    ...spec,
    points: meta?.points ?? spec.points,
    afbLevel: meta?.afbLevel ?? spec.afbLevel,
    subsections: hydrateSubsections(spec.subsections, answers),
  };
}
