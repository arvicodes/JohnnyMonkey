"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const teacherScratchPadStore_1 = require("../utils/teacherScratchPadStore");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateUser, auth_1.requireTeacher);
function padUpdatedMs(pad) {
    if (!pad)
        return 0;
    const raw = String(pad.updatedAt || pad.savedAt || '').trim();
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : 0;
}
function normalizePad(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw;
    if (!Array.isArray(o.pages))
        return null;
    return {
        pages: o.pages,
        pageIndex: typeof o.pageIndex === 'number' ? o.pageIndex : 0,
        updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
        userId: typeof o.userId === 'string' ? o.userId : undefined,
        userName: typeof o.userName === 'string' ? o.userName : undefined,
        savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined,
    };
}
async function readScratchPadFromDb(teacherId) {
    const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
            teacherId_lessonPath: { teacherId, lessonPath: teacherScratchPadStore_1.SCRATCH_PAD_DB_PATH },
        },
    });
    if (!(row === null || row === void 0 ? void 0 : row.content))
        return null;
    try {
        return normalizePad(JSON.parse(row.content));
    }
    catch {
        return null;
    }
}
async function writeScratchPadToDb(teacherId, payload) {
    await prisma.teacherLessonInstruction.upsert({
        where: {
            teacherId_lessonPath: { teacherId, lessonPath: teacherScratchPadStore_1.SCRATCH_PAD_DB_PATH },
        },
        create: {
            teacherId,
            lessonPath: teacherScratchPadStore_1.SCRATCH_PAD_DB_PATH,
            content: JSON.stringify(payload),
        },
        update: {
            content: JSON.stringify(payload),
        },
    });
}
/** Stellt sicher, dass Live- und Backup-Wurzelordner existieren. */
router.get('/roots', (_req, res) => {
    try {
        const roots = (0, teacherScratchPadStore_1.ensureScratchPadRoots)();
        res.json({ ok: true, ...roots });
    }
    catch (e) {
        console.error('Scratch pad roots failed:', e);
        res.status(500).json({ error: 'Ordner konnten nicht angelegt werden' });
    }
});
/** Aktueller Stand: DB zuerst, Datei als Fallback (und einmalig in DB nachziehen). */
router.get('/', async (req, res) => {
    try {
        const user = req.user;
        const key = (0, teacherScratchPadStore_1.scratchPadUserFolderKey)(user.id, user.name);
        (0, teacherScratchPadStore_1.ensureScratchPadRoots)();
        const fromDb = await readScratchPadFromDb(user.id);
        const fromFile = (0, teacherScratchPadStore_1.readScratchPadLive)(key);
        let data = null;
        if ((0, teacherScratchPadStore_1.standPulledRecently)() && fromFile) {
            data = fromFile;
        }
        else if (fromDb && fromFile) {
            const dbLen = (0, teacherScratchPadStore_1.scratchPadContentLen)(fromDb);
            const fileLen = (0, teacherScratchPadStore_1.scratchPadContentLen)(fromFile);
            const dbRaw = (0, teacherScratchPadStore_1.scratchPadRawLen)(fromDb);
            const fileRaw = (0, teacherScratchPadStore_1.scratchPadRawLen)(fromFile);
            if (fileLen >= 40 && dbLen < 12)
                data = fromFile;
            else if (dbLen >= 40 && fileLen < 12)
                data = fromDb;
            else if (fileRaw >= dbRaw + 80)
                data = fromFile;
            else if (dbRaw >= fileRaw + 80)
                data = fromDb;
            else
                data = padUpdatedMs(fromFile) > padUpdatedMs(fromDb) ? fromFile : fromDb;
        }
        else {
            data = fromDb || fromFile;
        }
        res.setHeader('Cache-Control', 'no-store');
        if (!data) {
            return res.json({ ok: true, found: false, pad: null, userKey: key, source: null });
        }
        // Sync: neuerer Stand in DB + Datei schreiben
        try {
            await writeScratchPadToDb(user.id, data);
            (0, teacherScratchPadStore_1.writeScratchPad)(key, data, { timestamped: false });
        }
        catch (syncErr) {
            console.warn('Scratch pad sync after GET failed:', syncErr);
        }
        return res.json({
            ok: true,
            found: true,
            pad: data,
            userKey: key,
            standPulled: (0, teacherScratchPadStore_1.standPulledRecently)(),
            source: (0, teacherScratchPadStore_1.standPulledRecently)()
                ? 'file'
                : fromDb && padUpdatedMs(fromDb) >= padUpdatedMs(fromFile)
                    ? 'db'
                    : 'file',
        });
    }
    catch (e) {
        console.error('Scratch pad GET failed:', e);
        res.status(500).json({ error: 'Notizen konnten nicht geladen werden' });
    }
});
/** Speichern in DB (+ Datei-Sicherheitskopie). */
router.put('/', async (req, res) => {
    var _a;
    try {
        const user = req.user;
        const body = req.body;
        if (!body || !Array.isArray(body.pages)) {
            return res.status(400).json({ error: 'Ungültige Notizdaten (pages fehlt)' });
        }
        const key = (0, teacherScratchPadStore_1.scratchPadUserFolderKey)(user.id, user.name);
        const payload = {
            pages: body.pages,
            pageIndex: typeof body.pageIndex === 'number' ? body.pageIndex : 0,
            updatedAt: typeof body.updatedAt === 'string' && body.updatedAt
                ? body.updatedAt
                : new Date().toISOString(),
            userId: user.id,
            userName: user.name,
        };
        const existingDb = await readScratchPadFromDb(user.id);
        const existingFile = (0, teacherScratchPadStore_1.readScratchPadLive)(key);
        const existing = (0, teacherScratchPadStore_1.scratchPadContentLen)(existingFile) >= (0, teacherScratchPadStore_1.scratchPadContentLen)(existingDb) ? existingFile : existingDb;
        const incomingMs = padUpdatedMs(payload);
        const existingMs = padUpdatedMs(existing);
        const pulledMs = (0, teacherScratchPadStore_1.standPulledAtMs)();
        if ((0, teacherScratchPadStore_1.standPulledRecently)() && !body.seenStandPull) {
            return res.json({
                ok: true,
                keptExisting: true,
                userKey: key,
                storedIn: 'db',
                updatedAt: existing === null || existing === void 0 ? void 0 : existing.updatedAt,
            });
        }
        if ((pulledMs && incomingMs && incomingMs < pulledMs) ||
            (existingMs && incomingMs && incomingMs < existingMs)) {
            return res.json({
                ok: true,
                keptExisting: true,
                userKey: key,
                storedIn: 'db',
                updatedAt: existing === null || existing === void 0 ? void 0 : existing.updatedAt,
            });
        }
        if ((0, teacherScratchPadStore_1.wouldWipeScratchPad)(existing, payload) || (0, teacherScratchPadStore_1.wouldShrinkScratchPad)(existing, payload)) {
            return res.json({
                ok: true,
                keptExisting: true,
                userKey: key,
                storedIn: 'db',
                updatedAt: existing === null || existing === void 0 ? void 0 : existing.updatedAt,
            });
        }
        await writeScratchPadToDb(user.id, payload);
        const forceStamp = Boolean((_a = req.body) === null || _a === void 0 ? void 0 : _a.forceBackup);
        const written = (0, teacherScratchPadStore_1.writeScratchPad)(key, payload, { timestamped: true, forceStamp });
        res.json({
            ok: true,
            userKey: key,
            storedIn: 'db',
            live: written.live,
            backupLatest: written.backupLatest,
            backupStamp: written.backupStamp,
            teacherBackup: written.teacherBackup,
            updatedAt: payload.updatedAt,
        });
    }
    catch (e) {
        console.error('Scratch pad PUT failed:', e);
        res.status(500).json({ error: 'Notizen konnten nicht gespeichert werden' });
    }
});
exports.default = router;
//# sourceMappingURL=teacherScratchPad.js.map