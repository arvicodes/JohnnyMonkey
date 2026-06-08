"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcursionProtocolController = exports.EXCURSION_PROTOCOL_LEGACY_PATH = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.EXCURSION_PROTOCOL_LEGACY_PATH = '__excursion_protocol_active__';
const excursionPathForGroup = (groupId) => `__excursion_protocol_g_${groupId}__`;
const DEFAULT_REFLECTION_QUESTIONS = [
    'Was habe ich heute gelernt oder neu kennengelernt?',
    'Was hat mir besonders gut gefallen – und warum?',
    'Was würde ich beim nächsten Mal anders machen oder noch genauer wissen wollen?',
];
const DEFAULT_RATING_CRITERIA = [
    'Organisation',
    'Inhalte & Lernangebot',
    'Gruppenstimmung',
    'Betreuung',
    'Gesamteindruck',
];
const parsePayload = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.title !== 'string')
            return null;
        if (!Array.isArray(parsed.submissions))
            parsed.submissions = [];
        if (!Array.isArray(parsed.ratingCriteria) || parsed.ratingCriteria.length === 0) {
            parsed.ratingCriteria = [...DEFAULT_RATING_CRITERIA];
        }
        if (!Array.isArray(parsed.reflectionQuestions) || parsed.reflectionQuestions.length !== 3) {
            parsed.reflectionQuestions = [...DEFAULT_REFLECTION_QUESTIONS];
        }
        return parsed;
    }
    catch {
        return null;
    }
};
const getUserByLoginCode = async (req) => {
    var _a;
    const raw = req.headers['x-login-code'];
    const loginCode = typeof raw === 'string' ? raw.trim() : '';
    if (!loginCode)
        return null;
    let user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, name: true, role: true },
    });
    if (!user) {
        const rows = await prisma.$queryRaw(client_1.Prisma.sql `SELECT id, name, role FROM User WHERE lower(loginCode) = lower(${loginCode}) LIMIT 1`);
        user = (_a = rows[0]) !== null && _a !== void 0 ? _a : null;
    }
    return user;
};
const resolveStudentExcursion = async (studentId) => {
    const groups = await prisma.learningGroup.findMany({
        where: { students: { some: { id: studentId } } },
        select: {
            id: true,
            teacherId: true,
            teacher: { select: { id: true, name: true } },
        },
    });
    if (groups.length === 0)
        return null;
    const candidates = [];
    for (const g of groups) {
        const pathScoped = excursionPathForGroup(g.id);
        const rowScoped = await prisma.teacherLessonInstruction.findUnique({
            where: {
                teacherId_lessonPath: { teacherId: g.teacherId, lessonPath: pathScoped },
            },
            select: { content: true },
        });
        const scoped = parsePayload(rowScoped === null || rowScoped === void 0 ? void 0 : rowScoped.content);
        if (scoped === null || scoped === void 0 ? void 0 : scoped.publishedAt) {
            candidates.push({
                teacherId: g.teacherId,
                teacherName: g.teacher.name,
                lessonPath: pathScoped,
                payload: scoped,
            });
        }
    }
    if (candidates.length === 0)
        return null;
    let best = candidates[0];
    let bestMs = new Date(best.payload.publishedAt).getTime();
    for (let i = 1; i < candidates.length; i++) {
        const c = candidates[i];
        const ms = new Date(c.payload.publishedAt).getTime();
        if (!Number.isNaN(ms) && ms > bestMs) {
            best = c;
            bestMs = ms;
        }
    }
    return best;
};
const assertStudentCanAccessRow = async (studentId, teacherId, lessonPath) => {
    if (lessonPath === exports.EXCURSION_PROTOCOL_LEGACY_PATH) {
        const g = await prisma.learningGroup.findFirst({
            where: { teacherId, students: { some: { id: studentId } } },
            select: { id: true },
        });
        return Boolean(g);
    }
    const m = lessonPath.match(/^__excursion_protocol_g_(.+?)__$/);
    const groupId = m === null || m === void 0 ? void 0 : m[1];
    if (!groupId)
        return false;
    const g = await prisma.learningGroup.findFirst({
        where: { id: groupId, teacherId, students: { some: { id: studentId } } },
        select: { id: true },
    });
    return Boolean(g);
};
class ExcursionProtocolController {
    static async publish(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte dürfen veröffentlichen' });
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : '';
            const date = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.date) === 'string' ? req.body.date.trim() : '';
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const reflectionQuestions = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.reflectionQuestions)
                ? req.body.reflectionQuestions.map((q) => String(q).trim()).filter(Boolean)
                : [...DEFAULT_REFLECTION_QUESTIONS];
            const ratingCriteria = Array.isArray((_d = req.body) === null || _d === void 0 ? void 0 : _d.ratingCriteria)
                ? req.body.ratingCriteria.map((c) => String(c).trim()).filter(Boolean)
                : [...DEFAULT_RATING_CRITERIA];
            const learningGroupId = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.learningGroupId) === 'string' ? req.body.learningGroupId.trim() : '';
            const publishedAt = new Date().toISOString();
            const buildContentPreservingSubmissions = async (teacherId, lessonPath) => {
                const existing = await prisma.teacherLessonInstruction.findUnique({
                    where: { teacherId_lessonPath: { teacherId, lessonPath } },
                    select: { content: true },
                });
                const prev = parsePayload(existing === null || existing === void 0 ? void 0 : existing.content);
                const preserved = Array.isArray(prev === null || prev === void 0 ? void 0 : prev.submissions) ? prev.submissions : [];
                const payload = {
                    title,
                    date: date || new Date().toISOString().slice(0, 10),
                    publishedAt,
                    reflectionQuestions: [
                        reflectionQuestions[0] || DEFAULT_REFLECTION_QUESTIONS[0],
                        reflectionQuestions[1] || DEFAULT_REFLECTION_QUESTIONS[1],
                        reflectionQuestions[2] || DEFAULT_REFLECTION_QUESTIONS[2],
                    ],
                    ratingCriteria: ratingCriteria.length > 0 ? ratingCriteria : [...DEFAULT_RATING_CRITERIA],
                    submissions: preserved,
                };
                return JSON.stringify(payload);
            };
            const upsertRow = async (teacherId, lessonPath) => {
                const content = await buildContentPreservingSubmissions(teacherId, lessonPath);
                await prisma.teacherLessonInstruction.upsert({
                    where: { teacherId_lessonPath: { teacherId, lessonPath } },
                    create: { teacherId, lessonPath, content },
                    update: { content },
                });
            };
            if (learningGroupId) {
                const owned = await prisma.learningGroup.findFirst({
                    where: { id: learningGroupId, teacherId: user.id },
                    select: { id: true },
                });
                if (owned) {
                    const path = excursionPathForGroup(owned.id);
                    await upsertRow(user.id, path);
                    return res.json({ success: true, publishedAt, lessonPath: path });
                }
            }
            await upsertRow(user.id, exports.EXCURSION_PROTOCOL_LEGACY_PATH);
            const allGroups = await prisma.learningGroup.findMany({
                where: { teacherId: user.id },
                select: { id: true },
            });
            for (const g of allGroups) {
                await upsertRow(user.id, excursionPathForGroup(g.id));
            }
            return res.json({ success: true, publishedAt, lessonPath: exports.EXCURSION_PROTOCOL_LEGACY_PATH });
        }
        catch (error) {
            console.error('ExcursionProtocol publish error:', error);
            return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
        }
    }
    static async getCurrent(req, res) {
        var _a;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role === 'STUDENT') {
                const resolved = await resolveStudentExcursion(user.id);
                if (!resolved) {
                    const groups = await prisma.learningGroup.findMany({
                        where: { students: { some: { id: user.id } } },
                        select: { teacherId: true, teacher: { select: { name: true } } },
                        take: 1,
                    });
                    if (groups.length === 0)
                        return res.status(404).json({ error: 'Keine Lerngruppe gefunden' });
                    return res.json({
                        session: null,
                        publishedAt: null,
                        teacherId: groups[0].teacherId,
                        teacherName: groups[0].teacher.name,
                        lessonPath: null,
                    });
                }
                const mine = resolved.payload.submissions.filter((s) => s.studentId === user.id);
                mine.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                return res.json({
                    session: {
                        title: resolved.payload.title,
                        date: resolved.payload.date,
                        reflectionQuestions: resolved.payload.reflectionQuestions,
                        ratingCriteria: resolved.payload.ratingCriteria,
                    },
                    publishedAt: resolved.payload.publishedAt,
                    teacherId: resolved.teacherId,
                    teacherName: resolved.teacherName,
                    lessonPath: resolved.lessonPath,
                    mySubmission: (_a = mine[0]) !== null && _a !== void 0 ? _a : null,
                });
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: {
                        teacherId: user.id,
                        lessonPath: exports.EXCURSION_PROTOCOL_LEGACY_PATH,
                    },
                },
                select: { content: true },
            });
            const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
            if (!payload) {
                return res.json({
                    session: null,
                    publishedAt: null,
                    teacherId: user.id,
                    teacherName: user.name,
                    lessonPath: exports.EXCURSION_PROTOCOL_LEGACY_PATH,
                });
            }
            return res.json({
                session: {
                    title: payload.title,
                    date: payload.date,
                    reflectionQuestions: payload.reflectionQuestions,
                    ratingCriteria: payload.ratingCriteria,
                },
                publishedAt: payload.publishedAt,
                teacherId: user.id,
                teacherName: user.name,
                lessonPath: exports.EXCURSION_PROTOCOL_LEGACY_PATH,
                submissionCount: payload.submissions.length,
            });
        }
        catch (error) {
            console.error('ExcursionProtocol getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async submit(req, res) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur Schüler können protokollieren' });
            const activities = Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.activities) ? req.body.activities : null;
            const reflection = (_b = req.body) === null || _b === void 0 ? void 0 : _b.reflection;
            const ratings = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.ratings) ? req.body.ratings : null;
            if (!activities || activities.length === 0) {
                return res.status(400).json({ error: 'Mindestens eine Aktivität ist erforderlich' });
            }
            if (!reflection || typeof reflection.learned !== 'string') {
                return res.status(400).json({ error: 'Reflexion ist erforderlich' });
            }
            if (!ratings || ratings.length === 0) {
                return res.status(400).json({ error: 'Bewertung ist erforderlich' });
            }
            const bodyTeacherId = typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            const bodyLessonPath = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.lessonPath) === 'string' ? req.body.lessonPath.trim() : '';
            let teacherId;
            let lessonPath;
            if (bodyTeacherId && bodyLessonPath) {
                const ok = await assertStudentCanAccessRow(user.id, bodyTeacherId, bodyLessonPath);
                if (!ok)
                    return res.status(403).json({ error: 'Kein Zugriff auf dieses Protokoll' });
                teacherId = bodyTeacherId;
                lessonPath = bodyLessonPath;
            }
            else {
                const resolved = await resolveStudentExcursion(user.id);
                if (!((_f = resolved === null || resolved === void 0 ? void 0 : resolved.payload) === null || _f === void 0 ? void 0 : _f.publishedAt)) {
                    return res.status(404).json({ error: 'Kein aktives Exkursionsprotokoll vorhanden' });
                }
                teacherId = resolved.teacherId;
                lessonPath = resolved.lessonPath;
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: { teacherId_lessonPath: { teacherId, lessonPath } },
                select: { content: true },
            });
            const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
            if (!(payload === null || payload === void 0 ? void 0 : payload.publishedAt)) {
                return res.status(403).json({ error: 'Protokoll ist noch nicht freigegeben' });
            }
            const nextSubmissions = payload.submissions.filter((item) => item.studentId !== user.id);
            nextSubmissions.push({
                studentId: user.id,
                studentName: user.name,
                activities: activities.map((a) => ({
                    content: String(a.content || '').trim(),
                    imageDataUrl: typeof a.imageDataUrl === 'string' ? a.imageDataUrl : undefined,
                })),
                reflection: {
                    learned: String(reflection.learned || '').trim(),
                    highlight: String(reflection.highlight || '').trim(),
                    openQuestion: String(reflection.openQuestion || '').trim(),
                },
                ratings: ratings.map((r) => ({
                    criterion: String(r.criterion || '').trim(),
                    score: Math.min(5, Math.max(1, Number(r.score) || 0)),
                })),
                submittedAt: new Date().toISOString(),
            });
            const nextPayload = { ...payload, submissions: nextSubmissions };
            await prisma.teacherLessonInstruction.update({
                where: { teacherId_lessonPath: { teacherId, lessonPath } },
                data: { content: JSON.stringify(nextPayload) },
            });
            return res.json({ success: true });
        }
        catch (error) {
            console.error('ExcursionProtocol submit error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async getSubmissions(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte haben Zugriff' });
            const lessonPathQ = typeof req.query.lessonPath === 'string' ? req.query.lessonPath.trim() : '';
            const lessonPath = lessonPathQ || exports.EXCURSION_PROTOCOL_LEGACY_PATH;
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: { teacherId_lessonPath: { teacherId: user.id, lessonPath } },
                select: { content: true },
            });
            const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
            if (!payload) {
                return res.json({ session: null, submissions: [] });
            }
            return res.json({
                session: {
                    title: payload.title,
                    date: payload.date,
                    reflectionQuestions: payload.reflectionQuestions,
                    ratingCriteria: payload.ratingCriteria,
                },
                publishedAt: payload.publishedAt,
                submissions: payload.submissions,
            });
        }
        catch (error) {
            console.error('ExcursionProtocol getSubmissions error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden der Abgaben' });
        }
    }
}
exports.ExcursionProtocolController = ExcursionProtocolController;
//# sourceMappingURL=ExcursionProtocolController.js.map