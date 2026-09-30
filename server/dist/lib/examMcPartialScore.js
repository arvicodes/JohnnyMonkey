"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.examUsesMcPartialScoring = examUsesMcPartialScoring;
exports.examAnswerScoreFraction = examAnswerScoreFraction;
function normalizeLoose(raw) {
    if (raw === null || raw === undefined)
        return '';
    return String(raw)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/[₂₁₀]/g, '')
        .replace(/[_\-–—]/g, '')
        .replace(/[()]/g, '');
}
function examAnswerMatches(expected, student) {
    if (expected === undefined || expected === null)
        return false;
    const studentN = normalizeLoose(student);
    if (!studentN)
        return false;
    const normalizePipeSet = (raw) => raw
        .split(/[|,;/]/)
        .map((p) => normalizeLoose(p))
        .filter(Boolean)
        .sort()
        .join('|');
    const studentPipe = /[|,;]/.test(String(student)) ? normalizePipeSet(String(student)) : studentN;
    const accepted = Array.isArray(expected) ? expected : [expected];
    return accepted.some((a) => {
        const n = normalizeLoose(a);
        if (!n)
            return false;
        if (/[|,;]/.test(String(a))) {
            return normalizePipeSet(String(a)) === studentPipe;
        }
        if (n === studentN)
            return true;
        if (typeof expected === 'number' || (typeof a === 'number' && String(a).includes('.'))) {
            const sn = parseFloat(String(student));
            const cn = parseFloat(String(a));
            return !Number.isNaN(sn) && !Number.isNaN(cn) && sn === cn;
        }
        return false;
    });
}
function parseMcLetterSet(raw) {
    const parts = Array.isArray(raw) ? raw.map(String) : [String(raw !== null && raw !== void 0 ? raw : '')];
    const letters = new Set();
    for (const p of parts) {
        const s = String(p).trim();
        if (!s)
            continue;
        if (/[|,;]/.test(s)) {
            s.split(/[|,;/]/)
                .map((x) => x.trim().toUpperCase())
                .filter((x) => /^[A-Z]$/.test(x))
                .forEach((x) => letters.add(x));
        }
        else if (/^[A-Za-z]$/.test(s)) {
            letters.add(s.toUpperCase());
        }
    }
    return [...letters].sort();
}
function examUsesMcPartialScoring(expected) {
    const letters = parseMcLetterSet(expected);
    if (!letters.length)
        return false;
    if (letters.some((l) => l === 'W' || l === 'F'))
        return false;
    return letters.every((l) => /^[A-Z]$/.test(l));
}
function examAnswerScoreFraction(expected, student) {
    if (!examUsesMcPartialScoring(expected)) {
        return examAnswerMatches(expected, student) ? 1 : 0;
    }
    const correct = parseMcLetterSet(expected);
    if (!correct.length)
        return 0;
    const studentStr = String(student !== null && student !== void 0 ? student : '').trim();
    if (!studentStr)
        return 0;
    const studentSet = new Set();
    if (/[|,;]/.test(studentStr)) {
        studentStr
            .split(/[|,;/]/)
            .map((x) => x.trim().toUpperCase())
            .filter((x) => /^[A-Z]$/.test(x))
            .forEach((x) => studentSet.add(x));
    }
    else if (/^[A-Za-z]$/.test(studentStr)) {
        studentSet.add(studentStr.toUpperCase());
    }
    else {
        return examAnswerMatches(expected, student) ? 1 : 0;
    }
    let right = 0;
    let wrong = 0;
    studentSet.forEach((l) => {
        if (correct.includes(l))
            right += 1;
        else
            wrong += 1;
    });
    return Math.max(0, (right - wrong) / correct.length);
}
//# sourceMappingURL=examMcPartialScore.js.map