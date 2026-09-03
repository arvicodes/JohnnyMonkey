"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const teacherFullArchive_1 = require("../utils/teacherFullArchive");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser, auth_1.requireTeacher);
router.get('/download', async (req, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    try {
        const archive = await (0, teacherFullArchive_1.buildTeacherFullArchive)();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${archive.fileName}"`);
        res.setHeader('X-Archive-Presentations', String(archive.counts.presentations));
        res.setHeader('X-Archive-Notes', String(archive.counts.notesFiles));
        res.setHeader('X-Archive-Tickets', String(archive.counts.ticketFiles));
        res.download(archive.zipPath, archive.fileName, (err) => {
            if (err && !res.headersSent) {
                console.error('teacher-full-archive send:', err);
                res.status(500).json({ error: 'ZIP konnte nicht gesendet werden.' });
            }
        });
    }
    catch (error) {
        console.error('teacher-full-archive:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Archiv konnte nicht gebaut werden.' });
        }
    }
});
router.post('/extra-copy', (_req, res) => {
    try {
        const dir = (0, teacherFullArchive_1.writeExtraNotesTicketsCopy)();
        res.json({ ok: true, dir });
    }
    catch (error) {
        console.error('teacher-full-archive extra-copy:', error);
        res.status(500).json({ ok: false, error: 'Extra-Kopie fehlgeschlagen.' });
    }
});
exports.default = router;
//# sourceMappingURL=teacherFullArchive.js.map