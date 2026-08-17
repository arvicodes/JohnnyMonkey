"use strict";
/** WebUntis „Schüler*innen im Unterricht“-PDF/Text → SuS-Namen (ohne Mittelnamen). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentDisplayName = studentDisplayName;
exports.stripMiddleNames = stripMiddleNames;
exports.generateLoginCode = generateLoginCode;
exports.normalizeLoginCode = normalizeLoginCode;
exports.groupNumberFromName = groupNumberFromName;
exports.loginGroupNumberFromKlasse = loginGroupNumberFromKlasse;
exports.splitGluedLastFirst = splitGluedLastFirst;
exports.parseWebUntisStudentListText = parseWebUntisStudentListText;
/** Nur echte Kopfzeilen — nicht Namen wie „SchülerFelix…“. */
const HEADER_SKIP = /^(VornameFamilienname|Vorname\b|Familienname\b|Schüler\*innen|Schülergruppe:|Klasse:|Klasse$|D-\d|JOHANNES|Schuljahr|WebUntis|Untis\b|Seite\b|christvera|\d{2}\.\d{2}\.\d{4})/i;
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Erster Vorname + vollständiger Nachname (Mittelnamen nur beim Vornamen streichen). */
function studentDisplayName(firstName, lastName) {
    const first = (firstName || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const last = (lastName || '').trim();
    return [first, last].filter(Boolean).join(' ');
}
/** Mittelname(n) aus „Vorname … Nachname“ streichen. */
function stripMiddleNames(fullName) {
    const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1)
        return parts[0] || '';
    return `${parts[0]} ${parts[parts.length - 1]}`;
}
function generateLoginCode(firstName, lastName, groupNumber) {
    const lastForCode = (lastName || '').trim().split(/\s+/).filter(Boolean).pop() || lastName || '';
    const firstForCode = (firstName || '').trim().split(/\s+/).filter(Boolean)[0] || firstName || '';
    const lastNameFirst = lastForCode.substring(0, 1).toUpperCase();
    const lastNameRest = lastForCode
        .substring(1, 3)
        .toLowerCase()
        .padEnd(2, lastForCode[1] || lastForCode[0] || 'x');
    const firstNameFirst = firstForCode.substring(0, 1).toUpperCase();
    const firstNameRest = firstForCode
        .substring(1, 3)
        .toLowerCase()
        .padEnd(2, firstForCode[1] || firstForCode[0] || 'x');
    return normalizeLoginCode(`${lastNameFirst}${lastNameRest}${firstNameFirst}${firstNameRest}${groupNumber}`);
}
function normalizeLoginCode(code) {
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
function groupNumberFromName(groupName, fallback = '00') {
    const m = (groupName || '').match(/(\d{1,2})(?!.*\d)/);
    return m ? m[1] : fallback;
}
/** Login-Code-Suffix: nur Ziffern aus „05a“ → „05“. */
function loginGroupNumberFromKlasse(klasse, fallback = '00') {
    var _a;
    const digits = (_a = (klasse || '').match(/\d{1,2}/)) === null || _a === void 0 ? void 0 : _a[0];
    return digits || fallback;
}
/** „NachnameVorname(n)“ an CamelCase-Grenze (Unicode) trennen. */
function splitGluedLastFirst(namePart) {
    const s = (namePart || '').trim();
    if (!s)
        return null;
    // erstes Kleinbuchstaben → Großbuchstaben (Nachname endet, Vorname beginnt)
    const m = s.match(/^(.+\p{Ll})(\p{Lu}.*)$/u);
    if (!m)
        return null;
    const lastName = m[1].trim();
    const firstName = m[2].trim();
    if (!lastName || !firstName)
        return null;
    return { lastName, firstName };
}
/**
 * pdf-parse liefert Zeilen wie „BaumeisterDamian105a“ / „BröderLevi Shaman311“.
 * Tab-getrennte Exports: „Abas Mateo\\t1 11“.
 */
function parseWebUntisStudentListText(rawText) {
    var _a, _b, _c, _d, _e, _f;
    const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // „Klasse: 05a“ / „Klasse: 11“ / „Klasse: 5“
    const klasse = (_a = text.match(/Klasse:\s*([0-9]{1,2}[a-zA-Z]?)/i)) === null || _a === void 0 ? void 0 : _a[1];
    const fach = (_c = (_b = text.match(/Fach:\s*([^,\n]+)/i)) === null || _b === void 0 ? void 0 : _b[1]) === null || _c === void 0 ? void 0 : _c.trim();
    const schuelergruppe = (_e = (_d = text.match(/Schülergruppe:\s*([^\n]+)/i)) === null || _d === void 0 ? void 0 : _d[1]) === null || _e === void 0 ? void 0 : _e.trim();
    const students = [];
    const seen = new Set();
    const pushStudent = (lastName, firstNameRaw, listIndex) => {
        const firstName = (firstNameRaw || '').trim().split(/\s+/).filter(Boolean)[0] || '';
        const last = (lastName || '').trim();
        if (!firstName || !last)
            return;
        const fullName = studentDisplayName(firstName, last);
        const key = fullName.toLowerCase();
        if (seen.has(key))
            return;
        seen.add(key);
        students.push({ firstName, lastName: last, fullName, listIndex });
    };
    const tryGluedWithKlasse = (line, klasseToken) => {
        const m = line.match(new RegExp(`^(.+?)(\\d+)${escapeRegExp(klasseToken)}$`, 'u'));
        if (!m)
            return false;
        const split = splitGluedLastFirst(m[1]);
        if (!split)
            return false;
        pushStudent(split.lastName, split.firstName, Number(m[2]));
        return true;
    };
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line || HEADER_SKIP.test(line))
            continue;
        // Tab / Mehrfachleerzeichen: „Nachname Vorname(n)  12 11“ bzw. „… 12 05a“
        const spaced = line.match(/^(\p{Lu}[\p{L}\-]*(?:\s+\p{L}[\p{L}\-]*)*)\s+(\p{Lu}[\p{L}\-]*(?:\s+\p{Lu}[\p{L}\-]*)*)\s+(\d+)\s+([0-9]{1,2}[a-zA-Z]?)\s*$/u);
        if (spaced) {
            pushStudent(spaced[1], spaced[2], Number(spaced[3]));
            continue;
        }
        // pdf-parse: „NachnameVorname(n){idx}{klasse}“ — zuerst mit erkanntem Klassen-Token
        if (klasse && tryGluedWithKlasse(line, klasse))
            continue;
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
            const digitsOnly = klasse.match(/^\d+$/) ? klasse : (_f = klasse.match(/\d{1,2}/)) === null || _f === void 0 ? void 0 : _f[0];
            if (digitsOnly && digitsOnly !== klasse && tryGluedWithKlasse(line, digitsOnly))
                continue;
        }
    }
    students.sort((a, b) => {
        var _a, _b;
        const ia = (_a = a.listIndex) !== null && _a !== void 0 ? _a : 9999;
        const ib = (_b = b.listIndex) !== null && _b !== void 0 ? _b : 9999;
        if (ia !== ib)
            return ia - ib;
        return a.fullName.localeCompare(b.fullName, 'de');
    });
    return { students, klasse, fach, schuelergruppe };
}
//# sourceMappingURL=webUntisStudentList.js.map