"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKING_REIHEN_DB_PATH = void 0;
exports.toPortableReihePath = toPortableReihePath;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
/** Dashboard-Tab „Reihen“: ausgewählte Arbeits-Reihen (früher nur localStorage). */
exports.WORKING_REIHEN_DB_PATH = '__dashboard_working_reihen__';
router.use(auth_1.authenticateUser, auth_1.requireTeacher);
function normalizePath(p) {
    return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}
/** Mac-/Schul-Absolutpfade → portabler Relativpfad unter git-intern/. */
function toPortableReihePath(raw) {
    let p = normalizePath(raw);
    if (!p)
        return '';
    const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
    for (const m of markers) {
        const i = p.indexOf(m);
        if (i >= 0) {
            const rest = p.slice(i + m.length).replace(/^\/+/, '');
            return rest ? `git-intern/${rest}` : 'git-intern';
        }
    }
    if (p.startsWith('/app/J-M-Reihen/')) {
        return `git-intern/${p.slice('/app/J-M-Reihen/'.length)}`;
    }
    if (p.startsWith('Mathe/') || p.startsWith('Informatik/')) {
        return `git-intern/${p}`;
    }
    return p;
}
function parsePaths(raw) {
    if (!raw || typeof raw !== 'object')
        return [];
    const o = raw;
    if (!Array.isArray(o.paths))
        return [];
    const seen = new Set();
    const out = [];
    for (const item of o.paths) {
        const p = toPortableReihePath(String(item || ''));
        if (!p || seen.has(p))
            continue;
        seen.add(p);
        out.push(p);
    }
    return out;
}
router.get('/working-reihen', async (req, res) => {
    try {
        const teacherId = req.user.id;
        const row = await prisma.teacherLessonInstruction.findUnique({
            where: {
                teacherId_lessonPath: { teacherId, lessonPath: exports.WORKING_REIHEN_DB_PATH },
            },
            select: { content: true },
        });
        let paths = [];
        if (row === null || row === void 0 ? void 0 : row.content) {
            try {
                paths = parsePaths(JSON.parse(row.content));
            }
            catch {
                paths = [];
            }
        }
        return res.json({ ok: true, paths });
    }
    catch (e) {
        console.error('working-reihen GET failed:', e);
        return res.status(500).json({ error: 'Arbeits-Reihen konnten nicht geladen werden' });
    }
});
router.put('/working-reihen', async (req, res) => {
    var _a;
    try {
        const teacherId = req.user.id;
        const paths = parsePaths({ paths: (_a = req.body) === null || _a === void 0 ? void 0 : _a.paths });
        const content = JSON.stringify({ paths, updatedAt: new Date().toISOString() });
        await prisma.teacherLessonInstruction.upsert({
            where: {
                teacherId_lessonPath: { teacherId, lessonPath: exports.WORKING_REIHEN_DB_PATH },
            },
            create: {
                teacherId,
                lessonPath: exports.WORKING_REIHEN_DB_PATH,
                content,
            },
            update: { content },
        });
        return res.json({ ok: true, paths });
    }
    catch (e) {
        console.error('working-reihen PUT failed:', e);
        return res.status(500).json({ error: 'Arbeits-Reihen konnten nicht gespeichert werden' });
    }
});
exports.default = router;
//# sourceMappingURL=teacherDashboardPrefs.js.map