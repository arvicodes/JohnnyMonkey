"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const teacherScratchPadStore_1 = require("../utils/teacherScratchPadStore");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser, auth_1.requireTeacher);
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
/** Aktueller Stand der Schnellnotizen (Server-Datei). */
router.get('/', (req, res) => {
    try {
        const user = req.user;
        const key = (0, teacherScratchPadStore_1.scratchPadUserFolderKey)(user.id, user.name);
        (0, teacherScratchPadStore_1.ensureScratchPadRoots)();
        const data = (0, teacherScratchPadStore_1.readScratchPadLive)(key);
        if (!data) {
            return res.json({ ok: true, found: false, pad: null, userKey: key });
        }
        return res.json({ ok: true, found: true, pad: data, userKey: key });
    }
    catch (e) {
        console.error('Scratch pad GET failed:', e);
        res.status(500).json({ error: 'Notizen konnten nicht geladen werden' });
    }
});
/** Speichern + Sicherheitskopie. */
router.put('/', (req, res) => {
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
        const written = (0, teacherScratchPadStore_1.writeScratchPad)(key, payload);
        res.json({
            ok: true,
            userKey: key,
            live: written.live,
            backupLatest: written.backupLatest,
            backupStamp: written.backupStamp,
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