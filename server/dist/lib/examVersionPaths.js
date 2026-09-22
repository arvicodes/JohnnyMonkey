"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_VERSION_LETTERS_JS_RE = exports.EXAM_VERSIONS_META_RE = void 0;
exports.normalizeVersionLetter = normalizeVersionLetter;
exports.defaultExamVersionLetters = defaultExamVersionLetters;
exports.parseExamVersionsMeta = parseExamVersionsMeta;
exports.writeExamVersionsMeta = writeExamVersionsMeta;
exports.syncExamVersionLettersJs = syncExamVersionLettersJs;
exports.fileStemFromName = fileStemFromName;
exports.versionLetterFromStem = versionLetterFromStem;
exports.baseStemFromStem = baseStemFromStem;
exports.variantStem = variantStem;
exports.gitPathVariant = gitPathVariant;
exports.examFamilyStemFromKaPath = examFamilyStemFromKaPath;
exports.kaPathsMatchFamily = kaPathsMatchFamily;
exports.versionLetterFromKaPath = versionLetterFromKaPath;
exports.ensureVersionLetterMarkup = ensureVersionLetterMarkup;
exports.patchKaKeyInHtml = patchKaKeyInHtml;
exports.applyVersionsToExamHtml = applyVersionsToExamHtml;
exports.resolveFullPathFromGitIntern = resolveFullPathFromGitIntern;
exports.readExamHtmlFullPath = readExamHtmlFullPath;
exports.writeExamHtmlFullPath = writeExamHtmlFullPath;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.EXAM_VERSIONS_META_RE = /<!--\s*EXAM_VERSIONS\s*(\{[\s\S]*?\})\s*-->/;
exports.EXAM_VERSION_LETTERS_JS_RE = /const\s+EXAM_VERSION_LETTERS\s*=\s*\[(.*?)\]\s*;/s;
const VERSION_SUFFIX_RE = /__([A-Z])$/i;
function normalizeVersionLetter(raw) {
    const l = String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
    if (!l || l.length !== 1)
        return null;
    return l;
}
function defaultExamVersionLetters() {
    return ['A'];
}
function parseExamVersionsMeta(html) {
    const m = html.match(exports.EXAM_VERSIONS_META_RE);
    if (!m)
        return { letters: defaultExamVersionLetters() };
    try {
        const parsed = JSON.parse(m[1]);
        const letters = Array.isArray(parsed.letters)
            ? parsed.letters
                .map((x) => normalizeVersionLetter(String(x)))
                .filter((x) => Boolean(x))
            : [];
        const uniq = [...new Set(letters.length ? letters : defaultExamVersionLetters())];
        if (!uniq.includes('A'))
            uniq.unshift('A');
        return { letters: uniq };
    }
    catch {
        return { letters: defaultExamVersionLetters() };
    }
}
function writeExamVersionsMeta(html, letters) {
    const normalized = [...new Set(letters.map((l) => normalizeVersionLetter(l)).filter(Boolean))];
    if (!normalized.includes('A'))
        normalized.unshift('A');
    const payload = JSON.stringify({ letters: normalized });
    const comment = `<!-- EXAM_VERSIONS ${payload} -->`;
    if (exports.EXAM_VERSIONS_META_RE.test(html)) {
        return html.replace(exports.EXAM_VERSIONS_META_RE, comment);
    }
    if (html.includes('<head>')) {
        return html.replace('<head>', `<head>\n    ${comment}`);
    }
    return `${comment}\n${html}`;
}
function syncExamVersionLettersJs(html, letters) {
    const list = letters.map((l) => `'${l}'`).join(', ');
    const line = `const EXAM_VERSION_LETTERS = [${list}];`;
    if (exports.EXAM_VERSION_LETTERS_JS_RE.test(html)) {
        return html.replace(exports.EXAM_VERSION_LETTERS_JS_RE, line);
    }
    if (/const KA_KEY = /.test(html)) {
        return html.replace(/(const KA_KEY = ['"][^'"]+['"];)/, `$1\n        ${line}`);
    }
    return html;
}
function fileStemFromName(fileName) {
    return fileName.replace(/\.(html|htm)$/i, '');
}
function versionLetterFromStem(stem) {
    const m = stem.match(VERSION_SUFFIX_RE);
    return m ? m[1].toUpperCase() : 'A';
}
function baseStemFromStem(stem) {
    return stem.replace(VERSION_SUFFIX_RE, '');
}
function variantStem(baseStem, letter) {
    const L = normalizeVersionLetter(letter);
    if (!L || L === 'A')
        return baseStem;
    return `${baseStem}__${L}`;
}
function gitPathVariant(baseGitPath, letter) {
    const p = baseGitPath.replace(/\\/g, '/');
    const slash = p.lastIndexOf('/');
    const dir = slash >= 0 ? p.slice(0, slash + 1) : '';
    const file = slash >= 0 ? p.slice(slash + 1) : p;
    const stem = fileStemFromName(file);
    const baseStem = baseStemFromStem(stem);
    const nextStem = variantStem(baseStem, letter);
    return `${dir}${nextStem}.html`;
}
function examFamilyStemFromKaPath(kaPath) {
    const fileName = (kaPath.split(/[/\\]/).pop() || kaPath).trim();
    return baseStemFromStem(fileStemFromName(fileName)).toLowerCase();
}
function kaPathsMatchFamily(requestPath, storedPath) {
    return examFamilyStemFromKaPath(requestPath) === examFamilyStemFromKaPath(storedPath);
}
function versionLetterFromKaPath(kaPath) {
    const fileName = kaPath.split(/[/\\]/).pop() || kaPath;
    return versionLetterFromStem(fileStemFromName(fileName));
}
const VERSION_LETTER_CSS = `
        .exam-version-letter {
            display: none;
            position: absolute;
            top: 8px;
            right: 12px;
            font-size: 42px;
            font-weight: 900;
            color: #1565c0;
            line-height: 1;
            z-index: 5;
            pointer-events: none;
            user-select: none;
        }
        .exam-paper.exam-multi-version .exam-version-letter {
            display: block;
        }
        .exam-paper {
            position: relative;
        }`;
function ensureVersionLetterMarkup(html, letter) {
    let out = html;
    if (!out.includes('.exam-version-letter')) {
        if (out.includes('</style>')) {
            out = out.replace('</style>', `${VERSION_LETTER_CSS}\n    </style>`);
        }
    }
    if (!out.includes('id="examVersionLetter"')) {
        out = out.replace(/<div class="exam-paper">/, `<div class="exam-paper">\n    <div class="exam-version-letter" id="examVersionLetter" aria-hidden="true">${letter}</div>`);
    }
    else {
        out = out.replace(/(<div class="exam-version-letter" id="examVersionLetter"[^>]*>)[^<]*(<\/div>)/, `$1${letter}$2`);
    }
    return out;
}
function patchKaKeyInHtml(html, kaKey) {
    let out = html.replace(/const KA_KEY = ['"](.*?)['"]/g, `const KA_KEY = '${kaKey}'`);
    out = out.replace(/KA_KEY = ['"](.*?)['"]/g, `KA_KEY = '${kaKey}'`);
    return out;
}
function applyVersionsToExamHtml(html, letters, fileLetter) {
    let out = writeExamVersionsMeta(html, letters);
    out = syncExamVersionLettersJs(out, letters);
    if (letters.length > 1) {
        out = ensureVersionLetterMarkup(out, fileLetter);
        out = out.replace(/<div class="exam-paper">/, `<div class="exam-paper exam-multi-version">`);
        if (!out.includes('exam-multi-version')) {
            out = out.replace(/class="exam-paper"/, 'class="exam-paper exam-multi-version"');
        }
    }
    else {
        out = out.replace(/\s*exam-multi-version/g, '');
    }
    return out;
}
function resolveFullPathFromGitIntern(gitInternPath, devProjectRoot) {
    if (gitInternPath.startsWith('git-intern/')) {
        const relativePath = gitInternPath.replace('git-intern/', '');
        if (process.env.NODE_ENV === 'production') {
            const jmReihenPath = path_1.default.join(process.cwd(), 'J-M-Reihen');
            return path_1.default.join(jmReihenPath, relativePath);
        }
        return path_1.default.join(devProjectRoot, 'J-M-Reihen', relativePath);
    }
    return path_1.default.resolve(gitInternPath);
}
function readExamHtmlFullPath(fullFilePath) {
    return fs_1.default.readFileSync(fullFilePath, 'utf-8');
}
function writeExamHtmlFullPath(fullFilePath, html) {
    fs_1.default.writeFileSync(fullFilePath, html, 'utf-8');
}
//# sourceMappingURL=examVersionPaths.js.map