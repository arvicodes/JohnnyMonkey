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
  const folded = foldUmlauts((s || '').normalize('NFC').toLowerCase().trim());
  return folded
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  if (studentLast === want) return true;
  if (want.length >= 3 && studentLast.length >= 3) {
    if (studentLast.startsWith(want) || want.startsWith(studentLast)) return true;
  }
  return tokens.some((t) => {
    if (t === want) return true;
    if (want.length >= 3 && t.length >= 3 && (t.startsWith(want) || want.startsWith(t))) return true;
    return false;
  });
}

function firstNameMatches(studentFirst: string, tokens: string[], hintFirst: string): boolean {
  if (!hintFirst) return false;
  if (studentFirst === hintFirst || tokens.includes(hintFirst)) return true;
  // Nur fast-gleiche Kürzel (Theo/Theodor), nicht Leon/Leonard.
  if (studentFirst.length >= 3 && hintFirst.length >= 3) {
    const a = studentFirst.length >= hintFirst.length ? studentFirst : hintFirst;
    const b = studentFirst.length >= hintFirst.length ? hintFirst : studentFirst;
    if (a.startsWith(b) && a.length - b.length <= 2) return true;
  }
  return false;
}

function scoreMatch(student: SeatingStudent, hint: NonNullable<SeatHint>): number {
  const { first, last, tokens } = nameParts(student.name);
  const firsts = hintFirsts(hint);
  const firstHit = firsts.some((f) => firstNameMatches(first, tokens, f));
  if (!firstHit) return 0;
  if (hint.last && lastMatches(last, tokens, hint.last)) return 3;
  if (!hint.last) return 2;
  return 1;
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
    [{ first: 'leon', last: 'fernandez', also: ['leon'] }, { first: 'leonard', last: 'schmitt' }],
  ],
  [
    [{ first: 'tim', last: 'simon' }, { first: 'casper', last: 'neubusch' }],
    [{ first: 'elisabeth', last: 'eming', also: ['elli', 'eni'] }, { first: 'melissa', last: 'fandino', also: ['melli', 'mellli'] }],
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

/** Lerngruppenname → Sitzplan-Foto (5a / 5c). */
export function detectKlasse5SeatingKey(name: string): Klasse5SeatingKey | null {
  const n = (name || '').toLowerCase();
  if (/(^|[^0-9a-z])5a([^0-9a-z]|$)/i.test(n)) return '5a';
  if (/(^|[^0-9a-z])5c([^0-9a-z]|$)/i.test(n)) return '5c';
  return null;
}

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
    if (best && bestScore >= 2) {
      unused.delete(best.id);
      return best.id;
    }
    const firsts = hintFirsts(hint);
    const unique = students.filter((student) => {
      if (!unused.has(student.id)) return false;
      const { first, tokens } = nameParts(student.name);
      return firsts.some((f) => first === f || tokens.includes(f));
    });
    if (unique.length === 1) {
      unused.delete(unique[0].id);
      return unique[0].id;
    }
    return null;
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
