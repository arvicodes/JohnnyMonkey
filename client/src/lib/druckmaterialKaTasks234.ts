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
      return {
        ...sub,
        gaps: sub.gaps.map((g) => ({
          ...g,
          solution: hydrateField(g.solution, answers, g.answerId),
        })),
      };
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
            lines: '* XXV.X.\nMDCCCLXXXI',
            answerId: 'a2a',
            solution: '25.10.1881',
          },
          {
            heading: 'Leonardo da Vinci',
            lines: '*15.4.1452',
            answerId: 'a2b',
            solution: '15.4.1452',
          },
        ],
      },
      {
        id: 'k2-b',
        letter: 'B',
        title: 'Fülle die Lücken wie im unten stehenden Beispiel aus.',
        quadrant: 'tl',
        kind: 'roman-table',
        examples: [
          { roman: 'XXIX', decimal: '29' },
          { roman: 'XXX', decimal: '30' },
          { roman: 'XXXI', decimal: '31' },
        ],
        gaps: [
          { roman: 'L', answerId: 'a2f', solution: '50' },
          { roman: 'XCIV', answerId: 'a2g', solution: '94' },
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
          { type: 'p', text: 'Entschlüssle die Binärzahlen und schreibe als Dezimalzahl:' },
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
              '1) Nenne alle Ziffern, die das Alien in seinem Zahlensystem überhaupt benutzen kann:',
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
              '2) Das Oktalsystem basiert auf der Zahl 8. Trage die Zahl 12 auch in diese Stellenwerttafel ein:',
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
        step: 3,
        bg: druckKaImageUrl('image5.jpeg'),
        fixed: [
          { value: 12, answerId: 'a4c1', solution: '12' },
          { value: 24, answerId: 'a4c2', solution: '24' },
          { value: 63, answerId: 'a4c3', solution: '63' },
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
        step: 100,
        bg: druckKaImageUrl('image6.jpeg'),
        fixed: [
          { value: 50800, answerId: 'a4d1', solution: '50800' },
          { value: 52600, answerId: 'a4d2', solution: '52600' },
          { value: 54300, answerId: 'a4d3', solution: '54300' },
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
