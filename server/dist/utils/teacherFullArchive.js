"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDownloadsDir = ensureDownloadsDir;
exports.writeExtraNotesTicketsCopy = writeExtraNotesTicketsCopy;
exports.buildTeacherFullArchive = buildTeacherFullArchive;
exports.teacherFullArchiveDownloadName = teacherFullArchiveDownloadName;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const jmTeacherBackup_1 = require("./jmTeacherBackup");
const folienAlleBackup_1 = require("./folienAlleBackup");
const teacherScratchPadStore_1 = require("./teacherScratchPadStore");
const simpleTextPdf_1 = require("./simpleTextPdf");
const simpleTextPptx_1 = require("./simpleTextPptx");
const DOWNLOADS_DIR_NAME = 'Backup - Downloads';
const MAX_COPY_BYTES = 40 * 1024 * 1024;
const DECK_NAME = 'Praesentation.deck.json';
const DECK_ORIGINAL = 'Praesentation.deck.original.json';
const ANNOTATIONS = 'Praesentation.annotations.json';
const PLAY_VARIANTS = 'Praesentation.play-variants.json';
const DOC_EXT = new Set([
    '.pdf',
    '.pptx',
    '.ppt',
    '.odp',
    '.html',
    '.htm',
]);
function projectRoot() {
    const fromEnv = process.env.LOCAL_MATERIALS_PATH;
    if (fromEnv && fs_1.default.existsSync(fromEnv))
        return fromEnv;
    return path_1.default.resolve(__dirname, '../../..');
}
function jmReihenRoot() {
    if (process.env.JM_REIHEN_PATH && fs_1.default.existsSync(process.env.JM_REIHEN_PATH)) {
        return process.env.JM_REIHEN_PATH;
    }
    const base = process.env.LOCAL_MATERIALS_PATH;
    if (base) {
        const candidate = path_1.default.join(base, 'J-M-Reihen');
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    return path_1.default.join(projectRoot(), 'J-M-Reihen');
}
function berlinStamp(d = new Date()) {
    const fmt = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const get = (type) => { var _a; return ((_a = parts.find((p) => p.type === type)) === null || _a === void 0 ? void 0 : _a.value) || ''; };
    return `${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}`;
}
function zipSafe(rel) {
    return String(rel || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\.\.\//g, '')
        .replace(/\/{2,}/g, '/');
}
function htmlToPlain(html) {
    return String(html || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<img[^>]*>/gi, ' [Bild] ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}
function readJson(file) {
    try {
        return JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
function copyFileIntoZip(zip, abs, zipPath, seen) {
    const dest = zipSafe(zipPath);
    if (!dest || seen.has(dest))
        return false;
    try {
        const st = fs_1.default.statSync(abs);
        if (!st.isFile() || st.size <= 0 || st.size > MAX_COPY_BYTES)
            return false;
        zip.addLocalFile(abs, path_1.default.posix.dirname(dest), path_1.default.posix.basename(dest));
        seen.add(dest);
        return true;
    }
    catch {
        return false;
    }
}
function addBuffer(zip, zipPath, buf, seen) {
    const dest = zipSafe(zipPath);
    if (!dest || seen.has(dest))
        return;
    zip.addFile(dest, buf);
    seen.add(dest);
}
function walkFiles(dir, acc, depth = 0) {
    if (depth > 12 || !fs_1.default.existsSync(dir))
        return;
    let names = [];
    try {
        names = fs_1.default.readdirSync(dir);
    }
    catch {
        return;
    }
    for (const name of names) {
        if (name.startsWith('.') || name === 'node_modules')
            continue;
        const full = path_1.default.join(dir, name);
        let st;
        try {
            st = fs_1.default.statSync(full);
        }
        catch {
            continue;
        }
        if (st.isDirectory())
            walkFiles(full, acc, depth + 1);
        else if (st.isFile())
            acc.push(full);
    }
}
function newestFiles(files, keep) {
    return files
        .map((full) => {
        try {
            return { full, mtime: fs_1.default.statSync(full).mtimeMs };
        }
        catch {
            return { full, mtime: 0 };
        }
    })
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, keep)
        .map((x) => x.full);
}
function slidePlain(slide, index) {
    const title = htmlToPlain(slide.titleHtml || '') ||
        String(slide.title || '').trim() ||
        `Folie ${index + 1}`;
    const parts = [
        htmlToPlain(slide.subtitleHtml || '') || slide.subtitle,
        htmlToPlain(slide.bodyHtml || '') || slide.body,
        htmlToPlain(slide.bodyLeftHtml || '') || slide.bodyLeft,
        htmlToPlain(slide.bodyRightHtml || '') || slide.bodyRight,
        ...(slide.elements || []).map((el) => [htmlToPlain(el.titleHtml || ''), htmlToPlain(el.html || '')].filter(Boolean).join('\n')),
        htmlToPlain(slide.speakerNotesHtml || '') || slide.speakerNotes
            ? `Notizen:\n${htmlToPlain(slide.speakerNotesHtml || '') || slide.speakerNotes}`
            : '',
    ]
        .map((s) => String(s || '').trim())
        .filter(Boolean);
    return { title, body: parts.join('\n\n') };
}
function findLiveDecks(jmRoot) {
    const skip = new Set([
        jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.notes,
        jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.slides,
        jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.tickets,
        DOWNLOADS_DIR_NAME,
        folienAlleBackup_1.FOLIEN_ALLE_BACKUP_DIR_NAME,
        teacherScratchPadStore_1.SCRATCH_PAD_LIVE_DIR_NAME,
        'Backup - Folien',
    ]);
    const found = [];
    const walk = (dir, depth) => {
        if (depth > 10)
            return;
        let names = [];
        try {
            names = fs_1.default.readdirSync(dir);
        }
        catch {
            return;
        }
        for (const name of names) {
            if (name.startsWith('.'))
                continue;
            const full = path_1.default.join(dir, name);
            let st;
            try {
                st = fs_1.default.statSync(full);
            }
            catch {
                continue;
            }
            if (st.isDirectory()) {
                if (depth === 0 && skip.has(name))
                    continue;
                walk(full, depth + 1);
            }
            else if (name === DECK_NAME) {
                found.push(full);
            }
        }
    };
    walk(jmRoot, 0);
    return found.sort();
}
function lessonZipFolder(jmRoot, deckFile) {
    const rel = path_1.default.relative(jmRoot, path_1.default.dirname(deckFile)).replace(/\\/g, '/');
    return zipSafe(`Praesentationen/${rel || 'ohne-fach'}`);
}
function addExistingDocs(zip, lessonDir, zipFolder, seen) {
    let n = 0;
    let names = [];
    try {
        names = fs_1.default.readdirSync(lessonDir);
    }
    catch {
        return 0;
    }
    for (const name of names) {
        const ext = path_1.default.extname(name).toLowerCase();
        if (!DOC_EXT.has(ext))
            continue;
        if (copyFileIntoZip(zip, path_1.default.join(lessonDir, name), `${zipFolder}/${name}`, seen))
            n += 1;
    }
    return n;
}
function addGeneratedDeckExports(zip, deckFile, zipFolder, seen) {
    const raw = readJson(deckFile);
    const slides = Array.isArray(raw === null || raw === void 0 ? void 0 : raw.slides) ? raw.slides : [];
    const title = String((raw === null || raw === void 0 ? void 0 : raw.title) || path_1.default.basename(path_1.default.dirname(deckFile)) || 'Präsentation');
    const pptSlides = slides.length
        ? slides.map((s, i) => slidePlain(s, i))
        : [{ title, body: 'Keine Folien in der Datei.' }];
    const pdfBlocks = [
        { title: 'Pfad', body: String((raw === null || raw === void 0 ? void 0 : raw.lessonPath) || path_1.default.dirname(deckFile)) },
        ...pptSlides.map((s) => ({ title: s.title, body: s.body })),
    ];
    addBuffer(zip, `${zipFolder}/Praesentation-Text.pdf`, (0, simpleTextPdf_1.buildTextPdf)(title, pdfBlocks), seen);
    addBuffer(zip, `${zipFolder}/Praesentation-Text.pptx`, (0, simpleTextPptx_1.buildTextPptx)(pptSlides), seen);
}
function notesBlocks(payload, fallbackTitle) {
    const pages = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.pages) ? payload.pages : [];
    if (!pages.length)
        return [{ title: fallbackTitle, body: 'Keine Notizen gefunden.' }];
    return pages.map((p, i) => ({
        title: String(p.title || '').trim() || `Notiz ${i + 1}`,
        body: htmlToPlain(p.text || '') || '(leer)',
    }));
}
function notesPptx(payload) {
    return notesBlocks(payload, 'Notizen').map((b) => ({
        title: b.title || 'Notiz',
        body: b.body || '',
    }));
}
function notesHtml(payload) {
    const pages = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.pages) ? payload.pages : [];
    const when = (payload === null || payload === void 0 ? void 0 : payload.savedAt) || (payload === null || payload === void 0 ? void 0 : payload.updatedAt) || '';
    const inner = pages
        .map((p, i) => {
        const title = String(p.title || '').trim() || `Notiz ${i + 1}`;
        return `<section><h2>${escapeHtml(title)}</h2>${p.text || '<p>(leer)</p>'}</section>`;
    })
        .join('\n');
    return (`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/>` +
        `<title>Lehrer-Notizen</title>` +
        `<style>body{font-family:Georgia,serif;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.45}` +
        `h1{font-size:1.4rem}h2{margin-top:2rem;border-bottom:1px solid #ccc}` +
        `img{max-width:100%}</style></head><body>` +
        `<h1>Lehrer-Notizen</h1>` +
        (when ? `<p>Stand: ${escapeHtml(when)}</p>` : '') +
        inner +
        `</body></html>`);
}
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function ticketBlocks(payload) {
    const sets = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.sets) ? payload.sets : [];
    if (!sets.length)
        return [{ title: 'Entry Tickets', body: 'Keine Sets gefunden.' }];
    const blocks = [];
    for (const set of sets) {
        const lessons = Array.isArray(set.lessons) ? set.lessons : [];
        const notes = htmlToPlain(set.notes || '');
        blocks.push({
            title: set.name || 'Set',
            body: notes ? `Lehrer-Notizen zum Set:\n${notes}` : `${lessons.length} Stunden`,
        });
        for (const lesson of lessons) {
            const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
            if (!tasks.length)
                continue;
            const body = tasks
                .map((t, i) => {
                const q = htmlToPlain(t.prompt || '');
                const a = htmlToPlain(t.solution || '');
                return `${i + 1}. [${t.category || 'Frage'}] ${q}${a ? `\n   Lösung: ${a}` : ''}`;
            })
                .join('\n\n');
            blocks.push({
                title: `${set.name || 'Set'} · ${lesson.topicName ? `${lesson.topicName} · ` : ''}${lesson.lessonName || 'Stunde'}`,
                body,
            });
        }
    }
    return blocks;
}
function ticketPptx(payload) {
    return ticketBlocks(payload).map((b) => ({ title: b.title || 'Ticket', body: b.body || '' }));
}
function addDirFiles(zip, dir, zipPrefix, seen, opts) {
    if (!fs_1.default.existsSync(dir))
        return 0;
    const files = [];
    walkFiles(dir, files);
    let list = files;
    if (opts === null || opts === void 0 ? void 0 : opts.onlyExt) {
        const allow = new Set(opts.onlyExt.map((e) => e.toLowerCase()));
        list = list.filter((f) => allow.has(path_1.default.extname(f).toLowerCase()));
    }
    if (opts === null || opts === void 0 ? void 0 : opts.nameIncludes) {
        const needle = opts.nameIncludes.toLowerCase();
        list = list.filter((f) => path_1.default.basename(f).toLowerCase().includes(needle));
    }
    if (opts === null || opts === void 0 ? void 0 : opts.keepNewest)
        list = newestFiles(list, opts.keepNewest);
    let n = 0;
    for (const full of list) {
        const rel = path_1.default.relative(dir, full).replace(/\\/g, '/');
        if (copyFileIntoZip(zip, full, `${zipPrefix}/${rel}`, seen))
            n += 1;
    }
    return n;
}
function ensureDownloadsDir() {
    const dir = path_1.default.join(jmReihenRoot(), DOWNLOADS_DIR_NAME);
    fs_1.default.mkdirSync(dir, { recursive: true });
    const readme = path_1.default.join(dir, 'README.txt');
    if (!fs_1.default.existsSync(readme)) {
        fs_1.default.writeFileSync(readme, 'Zusätzliche Sicherungen: ZIP vom Dashboard-Button „Alles sichern“\n' +
            'und Extra-Kopien der Notizen/Tickets.\n' +
            'Die Live-Dateien (Lehrer-Schnellnotizen, Präsentationen) werden hier nur kopiert, nie überschrieben.\n', 'utf8');
    }
    return dir;
}
/** Extra-Kopie der aktuellen Notizen und Tickets — Live-Dateien bleiben unberührt. */
function writeExtraNotesTicketsCopy() {
    const stamp = berlinStamp();
    const dest = path_1.default.join(ensureDownloadsDir(), `${stamp}_extra`);
    fs_1.default.mkdirSync(dest, { recursive: true });
    const jm = jmReihenRoot();
    const notesLive = path_1.default.join(jm, teacherScratchPadStore_1.SCRATCH_PAD_LIVE_DIR_NAME);
    const ticketsLive = path_1.default.join(jm, jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.tickets, 'latest.json');
    const notesBackup = path_1.default.join(projectRoot(), teacherScratchPadStore_1.SCRATCH_PAD_BACKUP_ROOT_NAME);
    const copyIf = (from, toName) => {
        if (!fs_1.default.existsSync(from) || !fs_1.default.statSync(from).isFile())
            return;
        fs_1.default.copyFileSync(from, path_1.default.join(dest, toName));
    };
    if (fs_1.default.existsSync(notesLive)) {
        const liveNotes = [];
        walkFiles(notesLive, liveNotes);
        liveNotes.forEach((full) => {
            if (path_1.default.basename(full) !== 'latest.json')
                return;
            const rel = path_1.default.relative(notesLive, full).replace(/[\\/]/g, '__');
            fs_1.default.copyFileSync(full, path_1.default.join(dest, `Notizen-live__${rel}`));
        });
    }
    copyIf(ticketsLive, 'Tickets-latest.json');
    if (fs_1.default.existsSync(notesBackup)) {
        const files = [];
        walkFiles(notesBackup, files);
        for (const full of files) {
            if (path_1.default.basename(full) !== 'latest.json')
                continue;
            if (full.includes(`${path_1.default.sep}_extra-sicherung`))
                continue;
            const rel = path_1.default.relative(notesBackup, full).replace(/[\\/]/g, '__');
            fs_1.default.copyFileSync(full, path_1.default.join(dest, `Notizen-sicherheit__${rel}`));
        }
    }
    fs_1.default.writeFileSync(path_1.default.join(dest, 'LESE-MICH.txt'), `Extra-Kopie ${stamp} (Europe/Berlin).\n` +
        'Nur Kopien. Die gelben Notizen und die Präsentationen wurden nicht überschrieben.\n', 'utf8');
    return dest;
}
async function buildTeacherFullArchive() {
    const extraCopyDir = writeExtraNotesTicketsCopy();
    const jm = jmReihenRoot();
    const root = projectRoot();
    const zip = new adm_zip_1.default();
    const seen = new Set();
    const stamp = berlinStamp();
    const fileName = `JohnnyMonkey-Alles_${stamp}.zip`;
    const decks = findLiveDecks(jm);
    let existingDocs = 0;
    for (const deckFile of decks) {
        const zipFolder = lessonZipFolder(jm, deckFile);
        const lessonDir = path_1.default.dirname(deckFile);
        copyFileIntoZip(zip, deckFile, `${zipFolder}/${DECK_NAME}`, seen);
        copyFileIntoZip(zip, path_1.default.join(lessonDir, DECK_ORIGINAL), `${zipFolder}/${DECK_ORIGINAL}`, seen);
        copyFileIntoZip(zip, path_1.default.join(lessonDir, ANNOTATIONS), `${zipFolder}/${ANNOTATIONS}`, seen);
        copyFileIntoZip(zip, path_1.default.join(lessonDir, PLAY_VARIANTS), `${zipFolder}/${PLAY_VARIANTS}`, seen);
        existingDocs += addExistingDocs(zip, lessonDir, zipFolder, seen);
        addGeneratedDeckExports(zip, deckFile, zipFolder, seen);
    }
    const notesLiveDir = path_1.default.join(jm, teacherScratchPadStore_1.SCRATCH_PAD_LIVE_DIR_NAME);
    let notesFiles = addDirFiles(zip, notesLiveDir, 'Notizen/live', seen, { onlyExt: ['.json'] });
    notesFiles += addDirFiles(zip, path_1.default.join(root, teacherScratchPadStore_1.SCRATCH_PAD_BACKUP_ROOT_NAME), 'Notizen/Sicherheitskopien', seen, {
        onlyExt: ['.json'],
    });
    notesFiles += addDirFiles(zip, path_1.default.join(jm, jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.notes), 'Notizen/Backup-Notizen', seen, {
        onlyExt: ['.json', '.txt'],
    });
    const liveNotesFiles = [];
    if (fs_1.default.existsSync(notesLiveDir))
        walkFiles(notesLiveDir, liveNotesFiles);
    const firstNotes = liveNotesFiles.find((f) => path_1.default.basename(f) === 'latest.json');
    const notesPayload = (firstNotes ? readJson(firstNotes) : null);
    addBuffer(zip, 'Notizen/Notizen.pdf', (0, simpleTextPdf_1.buildTextPdf)('Lehrer-Notizen', notesBlocks(notesPayload, 'Notizen')), seen);
    addBuffer(zip, 'Notizen/Notizen.pptx', (0, simpleTextPptx_1.buildTextPptx)(notesPptx(notesPayload)), seen);
    addBuffer(zip, 'Notizen/Notizen.html', Buffer.from(notesHtml(notesPayload), 'utf8'), seen);
    const ticketsDir = path_1.default.join(jm, jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.tickets);
    let ticketFiles = addDirFiles(zip, ticketsDir, 'Entry-Tickets/Backup', seen, { onlyExt: ['.json', '.txt'] });
    const ticketsLatest = path_1.default.join(ticketsDir, 'latest.json');
    const ticketsPayload = (fs_1.default.existsSync(ticketsLatest) ? readJson(ticketsLatest) : null);
    addBuffer(zip, 'Entry-Tickets/Entry-Tickets.pdf', (0, simpleTextPdf_1.buildTextPdf)('Entry Tickets', ticketBlocks(ticketsPayload)), seen);
    addBuffer(zip, 'Entry-Tickets/Entry-Tickets.pptx', (0, simpleTextPptx_1.buildTextPptx)(ticketPptx(ticketsPayload)), seen);
    addDirFiles(zip, path_1.default.join(jm, folienAlleBackup_1.FOLIEN_ALLE_BACKUP_DIR_NAME), 'Praesentationen/_Folien-ALLE-BACKUP', seen, {
        onlyExt: ['.json'],
        keepNewest: 40,
    });
    addDirFiles(zip, path_1.default.join(jm, jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.slides), 'Praesentationen/_Backup-Folien', seen, {
        onlyExt: ['.json'],
        keepNewest: 20,
    });
    addDirFiles(zip, path_1.default.join(root, 'Presentation-Sicherheitskopien'), 'Praesentationen/_Sicherheitskopien', seen, {
        onlyExt: ['.json'],
        nameIncludes: 'latest',
    });
    const inhalt = `JohnnyMonkey — Alles sichern (${stamp}, Europe/Berlin)\n\n` +
        `Präsentationen (live): ${decks.length}\n` +
        `Bereits vorhandene PDF/PPTX aus den Stundenordnern: ${existingDocs}\n` +
        `Zusätzlich je Präsentation: Praesentation-Text.pdf und Praesentation-Text.pptx (Text der Folien).\n` +
        `Notizen-Dateien: ${notesFiles}\n` +
        `Entry-Ticket-Dateien: ${ticketFiles}\n\n` +
        `Ordner:\n` +
        `  Praesentationen/   Live-Decks + Text-PDF/PPTX + vorhandene PDF/PPTX\n` +
        `  Notizen/           PDF, PPTX, HTML + live JSON + Sicherheitskopien\n` +
        `  Entry-Tickets/     PDF, PPTX + Backup-JSON\n\n` +
        `Eine Extra-Kopie liegt außerdem hier auf dem Rechner:\n` +
        `  ${extraCopyDir}\n\n` +
        `Die Live-Notizen und Live-Folien wurden beim Packen nicht überschrieben.\n`;
    addBuffer(zip, '00-INHALT.txt', Buffer.from(inhalt, 'utf8'), seen);
    const downloads = ensureDownloadsDir();
    const zipPath = path_1.default.join(downloads, fileName);
    zip.writeZip(zipPath);
    const tmp = path_1.default.join(os_1.default.tmpdir(), fileName);
    try {
        fs_1.default.copyFileSync(zipPath, tmp);
    }
    catch {
        /* tmp optional */
    }
    return {
        zipPath,
        fileName,
        extraCopyDir,
        counts: {
            presentations: decks.length,
            notesFiles,
            ticketFiles,
            existingDocs,
        },
    };
}
function teacherFullArchiveDownloadName() {
    return `JohnnyMonkey-Alles_${berlinStamp()}.zip`;
}
//# sourceMappingURL=teacherFullArchive.js.map