import { randomInt } from 'crypto';

/** WebUntis „Schüler*innen im Unterricht“-PDF/Text → SuS-Namen (ohne Mittelnamen). */

export type ParsedWebUntisStudent = {
  firstName: string;
  lastName: string;
  /** Vorname + Nachname, ohne Mittelname */
  fullName: string;
  /** Laufende Nummer aus der Liste (falls erkannt) */
  listIndex?: number;
};

export type WebUntisParseResult = {
  students: ParsedWebUntisStudent[];
  /** z. B. „05a“, „11“ */
  klasse?: string;
  fach?: string;
  schuelergruppe?: string;
};

/** Nur echte Kopfzeilen — nicht Namen wie „SchülerFelix…“. */
const HEADER_SKIP =
  /^(VornameFamilienname|Vorname\b|Familienname\b|Schüler\*innen|Schülergruppe:|Klasse:|Klasse$|D-\d|JOHANNES|Schuljahr|WebUntis|Untis\b|Seite\b|christvera|\d{2}\.\d{2}\.\d{4})/i;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Erster Vorname + vollständiger Nachname (Mittelnamen nur beim Vornamen streichen). */
export function studentDisplayName(firstName: string, lastName: string): string {
  const first = (firstName || '').trim().split(/\s+/).filter(Boolean)[0] || '';
  const last = (lastName || '').trim();
  return [first, last].filter(Boolean).join(' ');
}

/** Mittelname(n) aus „Vorname … Nachname“ streichen. */
export function stripMiddleNames(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

const LOGIN_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOGIN_LOWER = 'abcdefghijkmnpqrstuvwxyz';
const LOGIN_DIGIT = '23456789';
const LOGIN_SPECIAL = '!?@#';

function randomLoginChar(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

function randomLoginBlock(): string {
  const chars = [
    randomLoginChar(LOGIN_UPPER),
    randomLoginChar(LOGIN_LOWER),
    randomLoginChar(LOGIN_DIGIT),
    randomLoginChar(LOGIN_SPECIAL),
  ];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Zwei Blöcke à 4 Zeichen (Groß/Klein/Ziffer/!?#@), unabhängig vom Namen. */
export function generateTwoBlockLoginCode(): string {
  return `${randomLoginBlock()}-${randomLoginBlock()}`;
}

export function generateLoginCode(_firstName: string, _lastName: string, _groupNumber: string): string {
  return generateTwoBlockLoginCode();
}

export function normalizeLoginCode(code: string): string {
  return code
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '');
}

/** Ziffern aus Gruppennamen, z. B. „Informatik GK 11“ → „11“. */
export function groupNumberFromName(groupName: string, fallback = '00'): string {
  const m = (groupName || '').match(/(\d{1,2})(?!.*\d)/);
  return m ? m[1] : fallback;
}

/** Login-Code-Suffix: nur Ziffern aus „05a“ → „05“. */
export function loginGroupNumberFromKlasse(klasse: string | undefined, fallback = '00'): string {
  const digits = (klasse || '').match(/\d{1,2}/)?.[0];
  return digits || fallback;
}

/** „NachnameVorname(n)“ an CamelCase-Grenze (Unicode) trennen. */
export function splitGluedLastFirst(namePart: string): { lastName: string; firstName: string } | null {
  const s = (namePart || '').trim();
  if (!s) return null;
  // erstes Kleinbuchstaben → Großbuchstaben (Nachname endet, Vorname beginnt)
  const m = s.match(/^(.+\p{Ll})(\p{Lu}.*)$/u);
  if (!m) return null;
  const lastName = m[1].trim();
  const firstName = m[2].trim();
  if (!lastName || !firstName) return null;
  return { lastName, firstName };
}

/**
 * pdf-parse liefert Zeilen wie „BaumeisterDamian105a“ / „BröderLevi Shaman311“.
 * Tab-getrennte Exports: „Abas Mateo\\t1 11“.
 */
export function parseWebUntisStudentListText(rawText: string): WebUntisParseResult {
  const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // „Klasse: 05a“ / „Klasse: 11“ / „Klasse: 5“
  const klasse = text.match(/Klasse:\s*([0-9]{1,2}[a-zA-Z]?)/i)?.[1];
  const fach = text.match(/Fach:\s*([^,\n]+)/i)?.[1]?.trim();
  const schuelergruppe = text.match(/Schülergruppe:\s*([^\n]+)/i)?.[1]?.trim();

  const students: ParsedWebUntisStudent[] = [];
  const seen = new Set<string>();

  const pushStudent = (lastName: string, firstNameRaw: string, listIndex?: number) => {
    const firstName = (firstNameRaw || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const last = (lastName || '').trim();
    if (!firstName || !last) return;
    const fullName = studentDisplayName(firstName, last);
    const key = fullName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    students.push({ firstName, lastName: last, fullName, listIndex });
  };

  const tryGluedWithKlasse = (line: string, klasseToken: string): boolean => {
    const m = line.match(new RegExp(`^(.+?)(\\d+)${escapeRegExp(klasseToken)}$`, 'u'));
    if (!m) return false;
    const split = splitGluedLastFirst(m[1]);
    if (!split) return false;
    pushStudent(split.lastName, split.firstName, Number(m[2]));
    return true;
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || HEADER_SKIP.test(line)) continue;

    // Tab / Mehrfachleerzeichen: „Nachname Vorname(n)  12 11“ bzw. „… 12 05a“
    const spaced = line.match(
      /^(\p{Lu}[\p{L}\-]*(?:\s+\p{L}[\p{L}\-]*)*)\s+(\p{Lu}[\p{L}\-]*(?:\s+\p{Lu}[\p{L}\-]*)*)\s+(\d+)\s+([0-9]{1,2}[a-zA-Z]?)\s*$/u,
    );
    if (spaced) {
      pushStudent(spaced[1], spaced[2], Number(spaced[3]));
      continue;
    }

    // pdf-parse: „NachnameVorname(n){idx}{klasse}“ — zuerst mit erkanntem Klassen-Token
    if (klasse && tryGluedWithKlasse(line, klasse)) continue;

    // Fallback: Klassen-Suffix am Zeilenende (z. B. 05a / 11), falls Header fehlt/anders
    const fallback = line.match(/^(.+?)(\d+)([0-9]{2}[a-zA-Z]|[0-9]{1,2}[a-zA-Z]|[0-9]{1,2})$/u);
    if (fallback) {
      const split = splitGluedLastFirst(fallback[1]);
      if (split) {
        pushStudent(split.lastName, split.firstName, Number(fallback[2]));
        continue;
      }
    }

    // Älteres Format ohne Buchstaben in der Klasse, grade aus Header-Ziffern
    if (klasse) {
      const digitsOnly = klasse.match(/^\d+$/) ? klasse : klasse.match(/\d{1,2}/)?.[0];
      if (digitsOnly && digitsOnly !== klasse && tryGluedWithKlasse(line, digitsOnly)) continue;
    }
  }

  students.sort((a, b) => {
    const ia = a.listIndex ?? 9999;
    const ib = b.listIndex ?? 9999;
    if (ia !== ib) return ia - ib;
    return a.fullName.localeCompare(b.fullName, 'de');
  });

  return { students, klasse, fach, schuelergruppe };
}
