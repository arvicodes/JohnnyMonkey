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
  klasse?: string;
  fach?: string;
  schuelergruppe?: string;
};

const HEADER_SKIP =
  /^(Vorname|Familienname|Schüler|Klasse|D-|JOHANNES|Schuljahr|WebUntis|Untis|Seite|christvera|\d{2}\.\d{2}\.\d{4})/i;

/** Nur erster Vorname + Nachname. */
export function studentDisplayName(firstName: string, lastName: string): string {
  const first = (firstName || '').trim().split(/\s+/).filter(Boolean)[0] || '';
  const last = (lastName || '').trim().split(/\s+/).filter(Boolean).pop() || '';
  return [first, last].filter(Boolean).join(' ');
}

/** Mittelname(n) aus „Vorname … Nachname“ streichen. */
export function stripMiddleNames(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function generateLoginCode(firstName: string, lastName: string, groupNumber: string): string {
  const lastNameFirst = lastName.substring(0, 1).toUpperCase();
  const lastNameRest = lastName.substring(1, 3).toLowerCase().padEnd(2, lastName[1] || lastName[0] || 'x');
  const firstNameFirst = firstName.substring(0, 1).toUpperCase();
  const firstNameRest = firstName.substring(1, 3).toLowerCase().padEnd(2, firstName[1] || firstName[0] || 'x');
  return normalizeLoginCode(`${lastNameFirst}${lastNameRest}${firstNameFirst}${firstNameRest}${groupNumber}`);
}

export function normalizeLoginCode(code: string): string {
  return code
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

/** Ziffern aus Gruppennamen, z. B. „Informatik GK 11“ → „11“. */
export function groupNumberFromName(groupName: string, fallback = '00'): string {
  const m = (groupName || '').match(/(\d{1,2})(?!.*\d)/);
  return m ? m[1] : fallback;
}

/**
 * pdf-parse liefert Zeilen wie „AbasMateo111“ / „BröderLevi Shaman311“.
 * Tab-getrennte Exports: „Abas Mateo\\t1 11“.
 */
export function parseWebUntisStudentListText(rawText: string): WebUntisParseResult {
  const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const klasse = text.match(/Klasse:\s*(\d+)/i)?.[1];
  const fach = text.match(/Fach:\s*([^,\n]+)/i)?.[1]?.trim();
  const schuelergruppe = text.match(/Schülergruppe:\s*([^\n]+)/i)?.[1]?.trim();
  const grade = klasse || '11';

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

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || HEADER_SKIP.test(line)) continue;

    // Tab / Mehrfachleerzeichen: „Nachname Vorname(n)  12 11“
    const spaced = line.match(
      /^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]*(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]*)*)\s+(\d+)\s+(\d{1,2})\s*$/,
    );
    if (spaced) {
      pushStudent(spaced[1], spaced[2], Number(spaced[3]));
      continue;
    }

    // pdf-parse: „NachnameVorname(n){idx}{klasse}“
    const glued = line.match(
      new RegExp(
        `^([A-ZÄÖÜ][a-zäöüß]*)([A-ZÄÖÜ][\\sA-Za-zÄÖÜäöüß\\-]*)(\\d+)${grade}$`,
      ),
    );
    if (glued) {
      pushStudent(glued[1], glued[2], Number(glued[3]));
      continue;
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
