"use strict";
/** WebUntis „Schüler*innen im Unterricht“-PDF/Text → SuS-Namen (ohne Mittelnamen). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentDisplayName = studentDisplayName;
exports.stripMiddleNames = stripMiddleNames;
exports.generateLoginCode = generateLoginCode;
exports.normalizeLoginCode = normalizeLoginCode;
exports.groupNumberFromName = groupNumberFromName;
exports.parseWebUntisStudentListText = parseWebUntisStudentListText;
const HEADER_SKIP = /^(Vorname|Familienname|Schüler|Klasse|D-|JOHANNES|Schuljahr|WebUntis|Untis|Seite|christvera|\d{2}\.\d{2}\.\d{4})/i;
/** Nur erster Vorname + Nachname. */
function studentDisplayName(firstName, lastName) {
    const first = (firstName || '').trim().split(/\s+/).filter(Boolean)[0] || '';
    const last = (lastName || '').trim().split(/\s+/).filter(Boolean).pop() || '';
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
    const lastNameFirst = lastName.substring(0, 1).toUpperCase();
    const lastNameRest = lastName.substring(1, 3).toLowerCase().padEnd(2, lastName[1] || lastName[0] || 'x');
    const firstNameFirst = firstName.substring(0, 1).toUpperCase();
    const firstNameRest = firstName.substring(1, 3).toLowerCase().padEnd(2, firstName[1] || firstName[0] || 'x');
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
        .replace(/ß/g, 'ss');
}
/** Ziffern aus Gruppennamen, z. B. „Informatik GK 11“ → „11“. */
function groupNumberFromName(groupName, fallback = '00') {
    const m = (groupName || '').match(/(\d{1,2})(?!.*\d)/);
    return m ? m[1] : fallback;
}
/**
 * pdf-parse liefert Zeilen wie „AbasMateo111“ / „BröderLevi Shaman311“.
 * Tab-getrennte Exports: „Abas Mateo\\t1 11“.
 */
function parseWebUntisStudentListText(rawText) {
    var _a, _b, _c, _d, _e;
    const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const klasse = (_a = text.match(/Klasse:\s*(\d+)/i)) === null || _a === void 0 ? void 0 : _a[1];
    const fach = (_c = (_b = text.match(/Fach:\s*([^,\n]+)/i)) === null || _b === void 0 ? void 0 : _b[1]) === null || _c === void 0 ? void 0 : _c.trim();
    const schuelergruppe = (_e = (_d = text.match(/Schülergruppe:\s*([^\n]+)/i)) === null || _d === void 0 ? void 0 : _d[1]) === null || _e === void 0 ? void 0 : _e.trim();
    const grade = klasse || '11';
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
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line || HEADER_SKIP.test(line))
            continue;
        // Tab / Mehrfachleerzeichen: „Nachname Vorname(n)  12 11“
        const spaced = line.match(/^([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+)\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]*(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]*)*)\s+(\d+)\s+(\d{1,2})\s*$/);
        if (spaced) {
            pushStudent(spaced[1], spaced[2], Number(spaced[3]));
            continue;
        }
        // pdf-parse: „NachnameVorname(n){idx}{klasse}“
        const glued = line.match(new RegExp(`^([A-ZÄÖÜ][a-zäöüß]*)([A-ZÄÖÜ][\\sA-Za-zÄÖÜäöüß\\-]*)(\\d+)${grade}$`));
        if (glued) {
            pushStudent(glued[1], glued[2], Number(glued[3]));
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