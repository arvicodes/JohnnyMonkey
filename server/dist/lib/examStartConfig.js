"use strict";
/** Einstellungen beim Prüfungsstart (pro Lerngruppe, in LessonExamBeacon.configJson). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExamBeaconGroupConfig = parseExamBeaconGroupConfig;
exports.normalizeVersionCount = normalizeVersionCount;
exports.activeVersionLetters = activeVersionLetters;
exports.resolveStudentVersionLetter = resolveStudentVersionLetter;
exports.studentAllowedInBeacon = studentAllowedInBeacon;
function parseExamBeaconGroupConfig(raw) {
    if (!(raw === null || raw === void 0 ? void 0 : raw.trim()))
        return {};
    try {
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object')
            return {};
        return o;
    }
    catch {
        return {};
    }
}
function normalizeVersionCount(n) {
    const v = Number(n);
    if (v === 3)
        return 3;
    if (v === 2)
        return 2;
    return 1;
}
const DEFAULT_VARIANT_LETTERS = ['A', 'B', 'C'];
function activeVersionLetters(allLetters, versionCount) {
    const fromFile = [...new Set(allLetters.map((L) => L.trim().toUpperCase()).filter(Boolean))].sort();
    const pool = fromFile.length > 1 ? fromFile : DEFAULT_VARIANT_LETTERS;
    return pool.slice(0, versionCount);
}
function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function resolveStudentVersionLetter(studentId, beaconId, letters, assignments) {
    var _a;
    const pool = letters.length ? letters : ['A'];
    const manual = (_a = assignments === null || assignments === void 0 ? void 0 : assignments[studentId]) === null || _a === void 0 ? void 0 : _a.trim().toUpperCase();
    if (manual && pool.includes(manual))
        return manual;
    const idx = hash32(`${studentId}|${beaconId}|exam-version-v1`) % pool.length;
    return pool[idx];
}
function studentAllowedInBeacon(studentId, cfg) {
    const ids = cfg.studentIds;
    if (!(ids === null || ids === void 0 ? void 0 : ids.length))
        return true;
    return ids.includes(studentId);
}
//# sourceMappingURL=examStartConfig.js.map