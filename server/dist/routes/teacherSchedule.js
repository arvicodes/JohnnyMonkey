"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const periodTimes_1 = require("../lib/periodTimes");
const autoLessonScheduler_1 = require("../services/autoLessonScheduler");
const lessonFolderShareSync_1 = require("../services/lessonFolderShareSync");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/** periodNumber 0 = manuell gestartete Stunde (Play-Button im Dashboard) */
const MANUAL_PERIOD_NUMBER = 0;
const MANUAL_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
(0, autoLessonScheduler_1.ensureTimetableUploadDir)();
function normalizeLessonPathKey(p) {
    return String(p !== null && p !== void 0 ? p : '')
        .normalize('NFC')
        .trim()
        .replace(/\\/g, '/')
        .replace(/\/+/g, '/')
        .replace(/^\/+|\/+$/g, '');
}
/** Stunden-Geschwister wie im Client (previousLessonFolder). */
function isLessonSiblingFolderName(name) {
    const t = (name || '').trim();
    if (!t || t.startsWith('.'))
        return false;
    if (/^Rohdat/i.test(t) || /Sicherheitskopie/i.test(t) || /BACKUP/i.test(t))
        return false;
    // Themenblock „01 Basiswissen“ — keine Stunde
    if (/^\d+\s+/.test(t) && !/^\d+\.\d+/.test(t))
        return false;
    if (/^Kapitel\b/i.test(t))
        return false;
    if (/wochenaufgaben?/i.test(t.toLowerCase()))
        return false;
    return true;
}
/**
 * Play freigibt Stunde N → SuS sehen auch 01…N−1 im selben Ordner
 * (sonst fehlt z. B. 01.01, wenn nur 01.02/01.03 per Play gestartet wurden).
 */
function expandWithPreviousLessonFolders(lessonPath) {
    const raw = String(lessonPath || '')
        .replace(/\\/g, '/')
        .replace(/\/+$/, '');
    if (!raw)
        return [];
    const parent = path_1.default.dirname(raw);
    const currentName = path_1.default.basename(raw);
    if (!parent || parent === '.' || parent === raw)
        return [raw];
    let names = [];
    try {
        if (!fs_1.default.existsSync(parent))
            return [raw];
        names = fs_1.default
            .readdirSync(parent, { withFileTypes: true })
            .filter((e) => e.isDirectory() && isLessonSiblingFolderName(e.name))
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
    }
    catch {
        return [raw];
    }
    const idx = names.indexOf(currentName);
    if (idx < 0)
        return [raw];
    return names.slice(0, idx + 1).map((name) => path_1.default.join(parent, name).replace(/\\/g, '/'));
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        (0, autoLessonScheduler_1.ensureTimetableUploadDir)();
        cb(null, autoLessonScheduler_1.TIMETABLE_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}_${safe}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('Nur PDF oder Bilddateien erlaubt'));
        }
    },
});
async function getTeacherIdFromLogin(req) {
    const loginCode = req.headers['x-login-code'];
    if (!loginCode)
        return null;
    const user = await prisma.user.findUnique({ where: { loginCode } });
    if (!user || user.role !== 'TEACHER')
        return null;
    return user.id;
}
async function getOrCreateSettings(teacherId) {
    let settings = await prisma.teacherScheduleSettings.findUnique({ where: { teacherId } });
    if (!settings) {
        settings = await prisma.teacherScheduleSettings.create({
            data: {
                teacherId,
                periodTimes: (0, periodTimes_1.periodTimesToJson)(periodTimes_1.DEFAULT_JOHNNY_PERIOD_TIMES),
            },
        });
    }
    return settings;
}
router.get('/settings', async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const settings = await getOrCreateSettings(teacherId);
        const uploads = await prisma.teacherTimetableUpload.findMany({
            where: { teacherId },
            orderBy: { uploadedAt: 'desc' },
        });
        const slots = await prisma.scheduleSlot.findMany({
            where: { teacherId },
            include: {
                group: {
                    select: { id: true, name: true, iconEmoji: true, color: true, isArchived: true },
                },
            },
        });
        res.json({
            settings: {
                startWindowMinutes: settings.startWindowMinutes,
                endWindowMinutes: settings.endWindowMinutes,
                periodTimes: (0, periodTimes_1.parsePeriodTimes)(settings.periodTimes),
            },
            uploads,
            slots: slots.map((s) => ({
                id: s.id,
                groupId: s.groupId,
                dayOfWeek: s.dayOfWeek,
                periodNumber: s.periodNumber,
                lessonPath: s.lessonPath,
                group: s.group,
            })),
        });
    }
    catch (error) {
        console.error('GET /teacher-schedule/settings:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.put('/settings', async (req, res) => {
    var _a, _b, _c;
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const { startWindowMinutes, endWindowMinutes, periodTimes } = req.body;
        const data = {};
        if (typeof startWindowMinutes === 'number')
            data.startWindowMinutes = Math.max(0, startWindowMinutes);
        if (typeof endWindowMinutes === 'number')
            data.endWindowMinutes = Math.max(0, endWindowMinutes);
        if (Array.isArray(periodTimes)) {
            data.periodTimes = (0, periodTimes_1.periodTimesToJson)(periodTimes);
        }
        const settings = await prisma.teacherScheduleSettings.upsert({
            where: { teacherId },
            create: {
                teacherId,
                startWindowMinutes: (_a = data.startWindowMinutes) !== null && _a !== void 0 ? _a : 5,
                endWindowMinutes: (_b = data.endWindowMinutes) !== null && _b !== void 0 ? _b : 5,
                periodTimes: (_c = data.periodTimes) !== null && _c !== void 0 ? _c : (0, periodTimes_1.periodTimesToJson)(periodTimes_1.DEFAULT_JOHNNY_PERIOD_TIMES),
            },
            update: data,
        });
        res.json({
            startWindowMinutes: settings.startWindowMinutes,
            endWindowMinutes: settings.endWindowMinutes,
            periodTimes: (0, periodTimes_1.parsePeriodTimes)(settings.periodTimes),
        });
    }
    catch (error) {
        console.error('PUT /teacher-schedule/settings:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.put('/slots', async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const { slots } = req.body;
        if (!Array.isArray(slots)) {
            return res.status(400).json({ error: 'slots Array erforderlich' });
        }
        await prisma.scheduleSlot.deleteMany({ where: { teacherId } });
        const created = [];
        for (const slot of slots) {
            if (!slot.groupId || !slot.dayOfWeek || !slot.periodNumber)
                continue;
            if (slot.dayOfWeek < 1 || slot.dayOfWeek > 5)
                continue;
            if (slot.periodNumber < 1 || slot.periodNumber > 10)
                continue;
            const group = await prisma.learningGroup.findFirst({
                where: { id: slot.groupId, teacherId },
            });
            if (!group)
                continue;
            const row = await prisma.scheduleSlot.create({
                data: {
                    teacherId,
                    groupId: slot.groupId,
                    dayOfWeek: slot.dayOfWeek,
                    periodNumber: slot.periodNumber,
                    lessonPath: slot.lessonPath || null,
                },
                include: {
                    group: { select: { id: true, name: true, iconEmoji: true, color: true } },
                },
            });
            created.push(row);
        }
        res.json({ slots: created });
    }
    catch (error) {
        console.error('PUT /teacher-schedule/slots:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.post('/uploads', upload.single('file'), async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        if (!req.file)
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        const upload = await prisma.teacherTimetableUpload.create({
            data: {
                teacherId,
                filename: req.file.originalname,
                filePath: req.file.filename,
            },
        });
        res.json(upload);
    }
    catch (error) {
        console.error('POST /teacher-schedule/uploads:', error);
        res.status(500).json({ error: 'Upload fehlgeschlagen' });
    }
});
router.put('/uploads/:id/current', async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const upload = await prisma.teacherTimetableUpload.findFirst({
            where: { id: req.params.id, teacherId },
        });
        if (!upload)
            return res.status(404).json({ error: 'Nicht gefunden' });
        await prisma.teacherTimetableUpload.updateMany({
            where: { teacherId },
            data: { isCurrent: false },
        });
        const updated = await prisma.teacherTimetableUpload.update({
            where: { id: upload.id },
            data: { isCurrent: true },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('PUT /teacher-schedule/uploads/:id/current:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.delete('/uploads/:id', async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const upload = await prisma.teacherTimetableUpload.findFirst({
            where: { id: req.params.id, teacherId },
        });
        if (!upload)
            return res.status(404).json({ error: 'Nicht gefunden' });
        const filePath = path_1.default.join(autoLessonScheduler_1.TIMETABLE_UPLOAD_DIR, upload.filePath);
        if (fs_1.default.existsSync(filePath))
            fs_1.default.unlinkSync(filePath);
        await prisma.teacherTimetableUpload.delete({ where: { id: upload.id } });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('DELETE /teacher-schedule/uploads/:id:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.get('/uploads/:id/file', async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const upload = await prisma.teacherTimetableUpload.findFirst({
            where: { id: req.params.id, teacherId },
        });
        if (!upload)
            return res.status(404).json({ error: 'Nicht gefunden' });
        const filePath = path_1.default.join(autoLessonScheduler_1.TIMETABLE_UPLOAD_DIR, upload.filePath);
        if (!fs_1.default.existsSync(filePath))
            return res.status(404).json({ error: 'Datei nicht gefunden' });
        res.sendFile(filePath);
    }
    catch (error) {
        console.error('GET /teacher-schedule/uploads/:id/file:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.get('/active-lessons/student', async (req, res) => {
    try {
        const loginCode = req.headers['x-login-code'];
        if (!loginCode)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const student = await prisma.user.findUnique({
            where: { loginCode },
            include: { learningGroups: { select: { id: true } } },
        });
        if (!student || student.role !== 'STUDENT') {
            return res.status(401).json({ error: 'Nicht autorisiert' });
        }
        const groupIds = student.learningGroups.map((g) => g.id);
        if (groupIds.length === 0)
            return res.json({ sessions: [] });
        const now = new Date();
        const sessions = await prisma.autoLessonSession.findMany({
            where: {
                groupId: { in: groupIds },
                status: { in: ['OPEN', 'ACTIVE'] },
                opensAt: { lte: now },
                endsAt: { gt: now },
            },
            include: {
                group: { select: { id: true, name: true, iconEmoji: true, color: true } },
            },
        });
        res.json({ sessions });
    }
    catch (error) {
        console.error('GET /teacher-schedule/active-lessons/student:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
router.get('/active-lessons/teacher', async (req, res) => {
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const now = new Date();
        const sessions = await prisma.autoLessonSession.findMany({
            where: {
                teacherId,
                status: { in: ['OPEN', 'ACTIVE'] },
                opensAt: { lte: now },
                endsAt: { gt: now },
            },
            include: {
                group: { select: { id: true, name: true, iconEmoji: true, color: true } },
            },
        });
        res.json({ sessions });
    }
    catch (error) {
        console.error('GET /teacher-schedule/active-lessons/teacher:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
/**
 * Für Schüler: welche Stundenordner bereits gestartet wurden (Play / Scheduler).
 * ACTIVE + CLOSED → sichtbar; OPEN noch nicht. Ohne Sessions → Fallback auf FileShares.
 */
router.get('/released-lessons/student', async (req, res) => {
    try {
        const loginCode = req.headers['x-login-code'];
        if (!loginCode)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const student = await prisma.user.findUnique({
            where: { loginCode },
            include: { learningGroups: { select: { id: true } } },
        });
        if (!student || student.role !== 'STUDENT') {
            return res.status(401).json({ error: 'Nicht autorisiert' });
        }
        const groupIds = student.learningGroups.map((g) => g.id);
        if (groupIds.length === 0) {
            return res.json({ byGroup: {} });
        }
        const sessions = await prisma.autoLessonSession.findMany({
            where: {
                groupId: { in: groupIds },
                status: { in: ['ACTIVE', 'CLOSED'] },
                lessonPath: { not: null },
            },
            select: { groupId: true, lessonPath: true, status: true },
        });
        const byGroup = {};
        for (const gid of groupIds) {
            byGroup[gid] = { lessonPaths: [], useShareFallback: true };
        }
        const pathSets = {};
        for (const s of sessions) {
            if (!s.lessonPath)
                continue;
            const expanded = expandWithPreviousLessonFolders(s.lessonPath);
            if (!pathSets[s.groupId])
                pathSets[s.groupId] = new Set();
            for (const lessonFolder of expanded) {
                const norm = normalizeLessonPathKey(lessonFolder);
                if (norm)
                    pathSets[s.groupId].add(norm);
            }
            // Sobald eine Gruppe mindestens eine gestartete Stunde hat → kein Share-Fallback mehr
            if (byGroup[s.groupId] && expanded.length > 0) {
                byGroup[s.groupId].useShareFallback = false;
            }
        }
        for (const gid of Object.keys(pathSets)) {
            byGroup[gid] = {
                lessonPaths: Array.from(pathSets[gid]),
                useShareFallback: false,
            };
        }
        res.json({ byGroup });
    }
    catch (error) {
        console.error('GET /teacher-schedule/released-lessons/student:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
/** Manueller Stundenstart (Play-Button): Session ACTIVE + Materialien freigeben */
router.post('/lessons/start', async (req, res) => {
    var _a, _b;
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
        const lessonPath = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.lessonPath) === 'string' ? req.body.lessonPath.trim() : '';
        if (!groupId || !lessonPath) {
            return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
        }
        const group = await prisma.learningGroup.findFirst({
            where: { id: groupId, teacherId },
            select: { id: true, name: true },
        });
        if (!group)
            return res.status(403).json({ error: 'Gruppe nicht gefunden' });
        const { date, dayOfWeek } = (0, periodTimes_1.getBerlinNow)();
        const now = new Date();
        const endsAt = new Date(now.getTime() + MANUAL_SESSION_DURATION_MS);
        const session = await prisma.autoLessonSession.upsert({
            where: {
                groupId_sessionDate_periodNumber: {
                    groupId,
                    sessionDate: date,
                    periodNumber: MANUAL_PERIOD_NUMBER,
                },
            },
            create: {
                teacherId,
                groupId,
                sessionDate: date,
                dayOfWeek: dayOfWeek >= 1 && dayOfWeek <= 7 ? dayOfWeek : 1,
                periodNumber: MANUAL_PERIOD_NUMBER,
                lessonPath,
                opensAt: now,
                startsAt: now,
                endsAt,
                closesAt: endsAt,
                status: 'ACTIVE',
            },
            update: {
                teacherId,
                lessonPath,
                opensAt: now,
                startsAt: now,
                endsAt,
                closesAt: endsAt,
                status: 'ACTIVE',
                updatedAt: now,
            },
            include: {
                group: { select: { id: true, name: true, iconEmoji: true, color: true } },
            },
        });
        try {
            await (0, lessonFolderShareSync_1.syncLessonFolderShares)(groupId, lessonPath);
        }
        catch (shareErr) {
            console.error('POST /teacher-schedule/lessons/start share sync:', shareErr);
        }
        res.json({ session });
    }
    catch (error) {
        console.error('POST /teacher-schedule/lessons/start:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
/** Manuelles Stundenende (Stop-Button) */
router.post('/lessons/end', async (req, res) => {
    var _a, _b, _c;
    try {
        const teacherId = await getTeacherIdFromLogin(req);
        if (!teacherId)
            return res.status(401).json({ error: 'Nicht autorisiert' });
        const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
        const lessonPathRaw = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.lessonPath) === 'string' ? req.body.lessonPath.trim() : '';
        const sessionId = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.sessionId) === 'string' ? req.body.sessionId.trim() : '';
        if (!sessionId && !groupId) {
            return res.status(400).json({ error: 'sessionId oder groupId ist erforderlich' });
        }
        let session = sessionId
            ? await prisma.autoLessonSession.findFirst({
                where: { id: sessionId, teacherId, status: { in: ['OPEN', 'ACTIVE'] } },
            })
            : null;
        if (!session && groupId) {
            const { date } = (0, periodTimes_1.getBerlinNow)();
            const want = lessonPathRaw ? normalizeLessonPathKey(lessonPathRaw) : '';
            const candidates = await prisma.autoLessonSession.findMany({
                where: {
                    teacherId,
                    groupId,
                    status: { in: ['OPEN', 'ACTIVE'] },
                },
                orderBy: { updatedAt: 'desc' },
            });
            session =
                candidates.find((s) => s.periodNumber === MANUAL_PERIOD_NUMBER &&
                    s.sessionDate === date &&
                    (!want || normalizeLessonPathKey(s.lessonPath || '') === want)) ||
                    candidates.find((s) => want && normalizeLessonPathKey(s.lessonPath || '') === want) ||
                    candidates.find((s) => s.periodNumber === MANUAL_PERIOD_NUMBER && s.sessionDate === date) ||
                    null;
        }
        if (!session) {
            return res.status(404).json({ error: 'Keine laufende Stunde gefunden' });
        }
        const updated = await prisma.autoLessonSession.update({
            where: { id: session.id },
            data: { status: 'CLOSED', updatedAt: new Date(), closesAt: new Date() },
            include: {
                group: { select: { id: true, name: true, iconEmoji: true, color: true } },
            },
        });
        res.json({ session: updated });
    }
    catch (error) {
        console.error('POST /teacher-schedule/lessons/end:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});
exports.default = router;
//# sourceMappingURL=teacherSchedule.js.map