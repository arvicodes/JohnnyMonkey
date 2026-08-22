/** Sitzpläne 5a / 5c, abgelesen von den Papierfotos im Zwischenspeicher. */

export type Klasse5SeatingKey = '5a' | '5c';

export type SeatHint = {
  first: string;
  last?: string;
  also?: string[];
} | null;

export type SeatingStudent = { id: string; name: string };

const GRID_COLS = 4;
const GRID_ROWS = 5;
const SLOT_COUNT = GRID_COLS * GRID_ROWS * 2;

function foldUmlauts(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[šś]/g, 's')
    .replace(/[čć]/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/ñ/g, 'n')
    .replace(/đ/g, 'd');
}

function normalizeName(s: string): string {
  return foldUmlauts((s || '').normalize('NFC').toLowerCase().trim())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameParts(fullName: string): { first: string; last: string; tokens: string[] } {
  const tokens = normalizeName(fullName).split(' ').filter(Boolean);
  return {
    first: tokens[0] || '',
    last: tokens.length > 1 ? tokens[tokens.length - 1] : '',
    tokens,
  };
}

function hintFirsts(hint: NonNullable<SeatHint>): string[] {
  return [hint.first, ...(hint.also || [])].map((n) => normalizeName(n)).filter(Boolean);
}

function lastMatches(studentLast: string, tokens: string[], hintLast?: string): boolean {
  if (!hintLast) return true;
  const want = normalizeName(hintLast);
  if (!want) return true;
  if (studentLast === want || studentLast.startsWith(want) || want.startsWith(studentLast)) return true;
  return tokens.some((t) => t === want || t.startsWith(want) || want.startsWith(t));
}

function scoreMatch(student: SeatingStudent, hint: NonNullable<SeatHint>): number {
  const { first, last, tokens } = nameParts(student.name);
  const firsts = hintFirsts(hint);
  const firstHit = firsts.some((f) => first === f || first.startsWith(f) || f.startsWith(first) || tokens.includes(f));
  if (!firstHit) return 0;
  if (hint.last && lastMatches(last, tokens, hint.last)) return 3;
  if (!hint.last) return 2;
  return 0;
}

/** 5a: Pult unten, zwei Vierer-Blöcke je Reihe (hinten = oben). */
const PLAN_5A: SeatHint[][][] = [
  [
    [{ first: 'laura', last: 'huke' }, { first: 'eva', last: 'ruenz' }],
    [{ first: 'maxima', last: 'diehl' }, { first: 'henriette', last: 'mueller' }],
    [{ first: 'yutatsu', last: 'long', also: ['yu'] }, { first: 'damian', last: 'baumeister' }],
    [{ first: 'theodor', also: ['franz'] }, { first: 'samuel', last: 'klepzig' }],
  ],
  [
    [{ first: 'theo', last: 'winkels' }, { first: 'filip', last: 'glura' }],
    [{ first: 'mats', last: 'wirges' }, { first: 'sebastian', last: 'zander' }],
    [{ first: 'louisa', last: 'mitscherling' }, { first: 'aurelia', last: 'hamm' }],
    [{ first: 'isabel', last: 'chartier' }, { first: 'ida', last: 'weyrich' }],
  ],
  [
    [{ first: 'ida', last: 'schell' }, { first: 'eva', last: 'geis' }],
    [{ first: 'clara', last: 'gross' }, { first: 'skadi', last: 'unkelbach' }],
    [{ first: 'felix', last: 'schueler' }, { first: 'matteo', last: 'donatis' }],
    [{ first: 'levin', last: 'dormann' }, { first: 'jonathan', last: 'schwarz' }],
  ],
  [
    [null, { first: 'luca', last: 'boshoven' }],
    [{ first: 'mats', last: 'kuhn' }, { first: 'adrian', last: 'busch' }],
    [{ first: 'katharina', last: 'brandt' }, { first: 'charlotta', last: 'maier' }],
    [{ first: 'mila', last: 'sasic' }, { first: 'elli', last: 'woell' }],
  ],
  [[null, null], [null, null], [null, null], [null, null]],
];

/** 5c: vier Reihen à vier Zweier-Tische, Pult-Seite = unten. */
const PLAN_5C: SeatHint[][][] = [
  [
    [{ first: 'laura', last: 'malina' }, { first: 'enie', last: 'kluetsch', also: ['ernie'] }],
    [{ first: 'eric', last: 'foehlinger' }, { first: 'felix', last: 'pohl' }],
    [{ first: 'benno', last: 'noll' }, { first: 'jan', last: 'pfefferl' }],
    [{ first: 'leon', last: 'fernandez', also: ['leonie'] }, { first: 'leonard', last: 'schmitt' }],
  ],
  [
    [{ first: 'tim', last: 'simon' }, { first: 'casper', last: 'neubusch' }],
    [{ first: 'elisabeth', last: 'eming', also: ['elli'] }, { first: 'melissa', last: 'fandino', also: ['melli'] }],
    [{ first: 'elisabeth', last: 'croonenberg' }, { first: 'fraenzi', last: 'broeder', also: ['franzi'] }],
    [{ first: 'oskar', last: 'mueller' }, { first: 'david', last: 'nguyen' }],
  ],
  [
    [{ first: 'luthien', last: 'thome', also: ['cathleen'] }, { first: 'emily', last: 'mueller' }],
    [{ first: 'david', last: 'schulte' }, { first: 'julius', last: 'weyer' }],
    [{ first: 'julien', last: 'schmidt', also: ['julian'] }, { first: 'lennard', last: 'sunaga' }],
    [{ first: 'nele', last: 'koch' }, { first: 'frida', last: 'bittner' }],
  ],
  [
    [{ first: 'ben', last: 'sonntag' }, { first: 'levin', last: 'demirci' }],
    [{ first: 'marie', last: 'sprechert' }, { first: 'magdalena', last: 'hessel' }],
    [{ first: 'greta', last: 'nacke' }, { first: 'marleen', last: 'hannes', also: ['marlene'] }],
    [{ first: 'philipp', last: 'beuler' }, { first: 'elias', last: 'muno' }],
  ],
  [[null, null], [null, null], [null, null], [null, null]],
];

const PLANS: Record<Klasse5SeatingKey, SeatHint[][][]> = {
  '5a': PLAN_5A,
  '5c': PLAN_5C,
};

export function buildKlasse5SeatingOrder(
  students: SeatingStudent[],
  klass: Klasse5SeatingKey,
): {
  order: Array<string | null>;
  deskPositions: Array<{ deskId: number; gridRow: number; gridCol: number }>;
  matched: number;
  missing: number;
} {
  const plan = PLANS[klass];
  const unused = new Set(students.map((s) => s.id));
  const order: Array<string | null> = Array.from({ length: SLOT_COUNT }, () => null);
  const deskPositions: Array<{ deskId: number; gridRow: number; gridCol: number }> = [];
  let deskId = 0;
  let matched = 0;
  let missing = 0;

  const takeBest = (hint: NonNullable<SeatHint>): string | null => {
    let best: SeatingStudent | null = null;
    let bestScore = 0;
    for (const student of students) {
      if (!unused.has(student.id)) continue;
      const score = scoreMatch(student, hint);
      if (score > bestScore) {
        bestScore = score;
        best = student;
      }
    }
    if (!best || bestScore < 2) return null;
    unused.delete(best.id);
    return best.id;
  };

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const pair = plan[row]?.[col] || [null, null];
      const left = pair[0] ? takeBest(pair[0]) : null;
      const right = pair[1] ? takeBest(pair[1]) : null;
      if (pair[0]) {
        if (left) matched += 1;
        else missing += 1;
      }
      if (pair[1]) {
        if (right) matched += 1;
        else missing += 1;
      }
      if (left || right || pair[0] || pair[1]) {
        const slot0 = (row * GRID_COLS + col) * 2;
        order[slot0] = left;
        order[slot0 + 1] = right;
        deskPositions.push({ deskId, gridRow: row, gridCol: col });
        deskId += 1;
      }
    }
  }

  return { order, deskPositions, matched, missing };
}
