"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLessonMaterialPath = normalizeLessonMaterialPath;
exports.lessonMaterialPathsEqual = lessonMaterialPathsEqual;
/** Gleiche Kanonisierung wie client/src/lib/lessonFileSharePath.ts — für Stunden-Freigaben. */
function normalizeLessonMaterialPath(path) {
    const p = String(path !== null && path !== void 0 ? path : '')
        .normalize('NFC')
        .trim()
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/\/+$/, '');
    if (!p)
        return '';
    if (p.startsWith('git-intern/')) {
        return p.slice('git-intern/'.length);
    }
    const marker = 'J-M-Reihen/';
    const idx = p.indexOf(marker);
    if (idx >= 0)
        return p.slice(idx + marker.length);
    return p;
}
function lessonMaterialPathsEqual(a, b) {
    const na = normalizeLessonMaterialPath(a);
    const nb = normalizeLessonMaterialPath(b);
    return Boolean(na && nb && na === nb);
}
//# sourceMappingURL=lessonMaterialPath.js.map