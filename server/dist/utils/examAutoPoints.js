"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.examAnswerMatches = examAnswerMatches;
exports.parseExamAnswerKey = parseExamAnswerKey;
exports.resolveExamHtmlPath = resolveExamHtmlPath;
exports.readExamHtml = readExamHtml;
exports.replaceCorrectAnswersInHtml = replaceCorrectAnswersInHtml;
exports.writeExamHtml = writeExamHtml;
exports.calculateAutoPoints = calculateAutoPoints;
exports.computeSubmissionTotal = computeSubmissionTotal;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storageManager_1 = require("./storageManager");
const examHtmlBasenameCache = new Map();
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
    const accepted = Array.isArray(expected) ? expected : [expected];
    return accepted.some((a) => {
        const n = normalizeLoose(a);
        if (!n)
            return false;
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
function parseExamAnswerKey(html) {
    var _a, _b;
    const empty = { answers: {}, points: {}, maxPoints: 0, isGeometry: false };
    if (!html)
        return empty;
    const blockMatch = html.match(/const\s+correctAnswers\s*=\s*(\{[\s\S]*?\});/);
    if (!blockMatch)
        return empty;
    const answers = {};
    const body = blockMatch[1];
    const arrayRe = /([a-zA-Z_]\w*)\s*:\s*\[([^\]]*)\]/g;
    let m;
    while ((m = arrayRe.exec(body)) !== null) {
        const vals = m[2]
            .split(',')
            .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
            .filter(Boolean);
        if (vals.length)
            answers[m[1]] = vals;
    }
    const scalarRe = /([a-zA-Z_]\w*)\s*:\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?))/g;
    while ((m = scalarRe.exec(body)) !== null) {
        if (answers[m[1]] !== undefined)
            continue;
        if (m[4] !== undefined)
            answers[m[1]] = Number(m[4]);
        else
            answers[m[1]] = (_b = (_a = m[2]) !== null && _a !== void 0 ? _a : m[3]) !== null && _b !== void 0 ? _b : '';
    }
    const keys = Object.keys(answers);
    const isGeometry = keys.some((k) => /_[xy]$/.test(k));
    const points = {};
    keys.forEach((k) => {
        points[k] = isGeometry && /_[xy]$/.test(k) ? 0.25 : 1;
    });
    const totalMatch = html.match(/id="totalPoints"[^>]*>(\d+)/);
    const maxFromHtml = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    const maxPoints = maxFromHtml || keys.reduce((s, k) => s + (points[k] || 0), 0);
    return { answers, points, maxPoints, isGeometry };
}
function findExamHtmlByBasename(basename) {
    const want = (basename || '').trim().toLowerCase();
    if (!want || !/^(ka_|ku_|hü_|hu_|qz_)/i.test(basename))
        return null;
    const cached = examHtmlBasenameCache.get(want);
    if (cached && fs_1.default.existsSync(cached))
        return cached;
    const resolved = storageManager_1.StorageManager.resolveFilePath(basename);
    if (resolved && fs_1.default.existsSync(resolved)) {
        examHtmlBasenameCache.set(want, resolved);
        return resolved;
    }
    const root = storageManager_1.StorageManager.resolveGitInternRelativePath('');
    const walk = (dir, depth) => {
        if (depth > 14)
            return null;
        let entries;
        try {
            entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return null;
        }
        for (const e of entries) {
            const full = path_1.default.join(dir, e.name);
            if (e.isFile() && e.name.toLowerCase() === want)
                return full;
            if (e.isDirectory() &&
                !e.name.startsWith('.') &&
                e.name !== 'node_modules' &&
                e.name !== 'Presentation-Sicherheitskopien') {
                const nested = walk(full, depth + 1);
                if (nested)
                    return nested;
            }
        }
        return null;
    };
    const found = walk(root, 0);
    if (found)
        examHtmlBasenameCache.set(want, found);
    return found;
}
function resolveExamHtmlPath(filePath) {
    const fp = (filePath || '').replace(/\\/g, '/').trim();
    const tryPath = (full) => full && fs_1.default.existsSync(full) ? full : null;
    if (fp.startsWith('git-intern/')) {
        const relativePath = fp.replace(/^git-intern\//, '');
        const full = storageManager_1.StorageManager.resolveGitInternRelativePath(relativePath);
        const hit = tryPath(full);
        if (hit)
            return hit;
    }
    else if (fp.startsWith('J-M-Reihen/')) {
        const relativePath = fp.replace(/^J-M-Reihen\//, '');
        const full = storageManager_1.StorageManager.resolveGitInternRelativePath(relativePath);
        const hit = tryPath(full);
        if (hit)
            return hit;
    }
    else {
        const resolved = storageManager_1.StorageManager.resolveFilePath(fp);
        const hit = resolved ? tryPath(resolved) : null;
        if (hit)
            return hit;
        const abs = path_1.default.resolve(fp);
        const hitAbs = tryPath(abs);
        if (hitAbs)
            return hitAbs;
    }
    const base = fp.split('/').pop() || fp;
    const byName = findExamHtmlByBasename(base);
    if (byName)
        return byName;
    if (fp.startsWith('git-intern/')) {
        const relativePath = fp.replace(/^git-intern\//, '');
        return storageManager_1.StorageManager.resolveGitInternRelativePath(relativePath);
    }
    if (fp.startsWith('J-M-Reihen/')) {
        const relativePath = fp.replace(/^J-M-Reihen\//, '');
        return storageManager_1.StorageManager.resolveGitInternRelativePath(relativePath);
    }
    return path_1.default.resolve(fp);
}
function readExamHtml(filePath) {
    const full = resolveExamHtmlPath(filePath);
    return fs_1.default.readFileSync(full, 'utf-8');
}
function serializeAnswerValue(value) {
    if (Array.isArray(value)) {
        return `[${value.map((v) => `'${String(v).replace(/'/g, "\\'")}'`).join(', ')}]`;
    }
    if (typeof value === 'number')
        return String(value);
    return `'${String(value).replace(/'/g, "\\'")}'`;
}
function replaceCorrectAnswersInHtml(html, updates) {
    const parsed = parseExamAnswerKey(html);
    const merged = { ...parsed.answers, ...updates };
    const lines = Object.entries(merged).map(([k, v]) => `            ${k}: ${serializeAnswerValue(v)}`);
    const block = `const correctAnswers = {\n${lines.join(',\n')}\n        };`;
    return html.replace(/const\s+correctAnswers\s*=\s*\{[\s\S]*?\};/, block);
}
function writeExamHtml(filePath, html) {
    const full = resolveExamHtmlPath(filePath);
    fs_1.default.writeFileSync(full, html, 'utf-8');
}
function calculateAutoPoints(answers, key) {
    let total = 0;
    for (const taskId of Object.keys(key.answers)) {
        if (examAnswerMatches(key.answers[taskId], answers[taskId])) {
            total += key.points[taskId] || 1;
        }
    }
    return total;
}
/** Gesamtpunkte: pro Feld Override oder Auto; Geometrie behält Zusatz-Manualpunkte. */
function computeSubmissionTotal(answersJson, key, corrections) {
    const answers = JSON.parse(answersJson || '{}');
    const autoPoints = calculateAutoPoints(answers, key);
    const corrMap = new Map(corrections.map((c) => [c.taskNumber, c]));
    if (key.isGeometry) {
        const manualSum = corrections
            .filter((c) => !Object.keys(key.answers).includes(c.taskNumber) &&
            c.taskNumber !== '__review_complete__')
            .reduce((s, c) => { var _a; return s + ((_a = c.manualPoints) !== null && _a !== void 0 ? _a : 0); }, 0);
        return { autoPoints, totalPoints: autoPoints + manualSum };
    }
    let totalPoints = 0;
    for (const taskId of Object.keys(key.answers)) {
        const corr = corrMap.get(taskId);
        if ((corr === null || corr === void 0 ? void 0 : corr.manualPoints) != null && !Number.isNaN(corr.manualPoints)) {
            totalPoints += corr.manualPoints;
        }
        else if (examAnswerMatches(key.answers[taskId], answers[taskId])) {
            totalPoints += key.points[taskId] || 1;
        }
    }
    const legacyManual = corrections
        .filter((c) => !Object.keys(key.answers).includes(c.taskNumber) &&
        c.taskNumber !== '3_comment' &&
        c.taskNumber !== '__review_complete__' &&
        c.taskNumber !== '__general_comment__')
        .reduce((s, c) => { var _a; return s + ((_a = c.manualPoints) !== null && _a !== void 0 ? _a : 0); }, 0);
    if (legacyManual > 0 && totalPoints === autoPoints) {
        totalPoints += legacyManual;
    }
    return { autoPoints, totalPoints };
}
//# sourceMappingURL=examAutoPoints.js.map