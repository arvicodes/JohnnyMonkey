"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_SUBMISSION_ALIASES_RE = void 0;
exports.parseExamSubmissionAliases = parseExamSubmissionAliases;
exports.appendExamSubmissionAlias = appendExamSubmissionAlias;
exports.expandSubmissionAliasPaths = expandSubmissionAliasPaths;
exports.storedKaPathMatchesRequest = storedKaPathMatchesRequest;
const examVersionPaths_1 = require("./examVersionPaths");
exports.EXAM_SUBMISSION_ALIASES_RE = /<!--\s*EXAM_SUBMISSION_ALIASES\s*(\[[\s\S]*?\])\s*-->/;
function parseExamSubmissionAliases(html) {
    const m = html.match(exports.EXAM_SUBMISSION_ALIASES_RE);
    if (!m)
        return [];
    try {
        const parsed = JSON.parse(m[1]);
        if (!Array.isArray(parsed))
            return [];
        return parsed.map((x) => String(x || '').trim()).filter(Boolean);
    }
    catch {
        return [];
    }
}
function appendExamSubmissionAlias(html, aliasPath) {
    const alias = String(aliasPath || '').trim().replace(/\\/g, '/');
    if (!alias)
        return html;
    const existing = parseExamSubmissionAliases(html);
    const lower = new Set(existing.flatMap((a) => {
        const n = a.replace(/\\/g, '/');
        const base = n.split('/').pop() || n;
        return [n.toLowerCase(), base.toLowerCase()];
    }));
    const base = alias.split('/').pop() || alias;
    if (lower.has(alias.toLowerCase()) || lower.has(base.toLowerCase()))
        return html;
    const next = [...existing, alias];
    const comment = `<!-- EXAM_SUBMISSION_ALIASES ${JSON.stringify(next)} -->`;
    if (exports.EXAM_SUBMISSION_ALIASES_RE.test(html)) {
        return html.replace(exports.EXAM_SUBMISSION_ALIASES_RE, comment);
    }
    if (examVersionPaths_1.EXAM_VERSIONS_META_RE.test(html)) {
        return html.replace(examVersionPaths_1.EXAM_VERSIONS_META_RE, (m) => `${m}\n    ${comment}`);
    }
    return html.replace(/<head>/i, `<head>\n    ${comment}`);
}
function expandSubmissionAliasPaths(aliases) {
    const out = new Set();
    for (const raw of aliases) {
        const n = String(raw || '').trim().replace(/\\/g, '/');
        if (!n)
            continue;
        out.add(n);
        out.add(n.toLowerCase());
        const base = n.split('/').pop() || n;
        out.add(base);
        out.add(base.toLowerCase());
        const noExt = base.replace(/\.(html|htm)$/i, '');
        out.add(noExt);
        out.add(noExt.toLowerCase());
    }
    return [...out];
}
function storedKaPathMatchesRequest(requestPath, storedPath, aliases, pathMatches) {
    if (pathMatches(storedPath))
        return true;
    const storedNorm = (storedPath || '').replace(/\\/g, '/');
    const storedBase = (storedNorm.split('/').pop() || storedNorm).toLowerCase();
    for (const alias of expandSubmissionAliasPaths(aliases)) {
        const a = alias.toLowerCase();
        if (storedNorm.toLowerCase() === a || storedBase === a)
            return true;
        if (storedNorm.toLowerCase().endsWith('/' + a))
            return true;
        if (pathMatches(alias))
            return true;
    }
    return false;
}
//# sourceMappingURL=examSubmissionAliases.js.map