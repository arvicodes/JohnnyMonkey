"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitTicketController = exports.EXIT_TICKET_LEGACY_PATH = void 0;
const client_1 = require("@prisma/client");
const EntryTicketController_1 = require("./EntryTicketController");
const prisma = new client_1.PrismaClient();
/** Global pro Lehrkraft (Exit-Ticket-Seite ohne Gruppenkontext) */
exports.EXIT_TICKET_LEGACY_PATH = '__exit_ticket_active__';
const exitTicketPathForGroup = (groupId) => `__exit_ticket_g_${groupId}__`;
const parsePayload = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.template)
            return null;
        if (!Array.isArray(parsed.responses)) {
            parsed.responses = [];
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
/**
 * Nur gruppenspezifische Freigaben (Stunde mit learningGroupId). Kein globales Legacy
 * (__exit_ticket_active__), damit SuS nicht dauernd ein altes „3-Fragen-Feedback“ aus der
 * Lehrer-Exit-Ticket-Seite sehen. Mehrere Gruppen: neuestes publishedAt.
 */
const resolveStudentExitTicket = async (studentId) => {
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
        const tid = g.teacherId;
        const tname = g.teacher.name;
        const pathScoped = exitTicketPathForGroup(g.id);
        const rowScoped = await prisma.teacherLessonInstruction.findUnique({
            where: {
                teacherId_lessonPath: { teacherId: tid, lessonPath: pathScoped },
            },
            select: { content: true },
        });
        const scoped = parsePayload(rowScoped === null || rowScoped === void 0 ? void 0 : rowScoped.content);
        if ((scoped === null || scoped === void 0 ? void 0 : scoped.template) && scoped.publishedAt) {
            candidates.push({
                teacherId: tid,
                teacherName: tname,
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
const assertStudentCanAccessExitTicketRow = async (studentId, teacherId, lessonPath) => {
    if (lessonPath === exports.EXIT_TICKET_LEGACY_PATH) {
        const g = await prisma.learningGroup.findFirst({
            where: { teacherId, students: { some: { id: studentId } } },
            select: { id: true },
        });
        return Boolean(g);
    }
    const m = lessonPath.match(/^__exit_ticket_g_(.+?)__$/);
    const groupId = m === null || m === void 0 ? void 0 : m[1];
    if (!groupId)
        return false;
    const g = await prisma.learningGroup.findFirst({
        where: { id: groupId, teacherId, students: { some: { id: studentId } } },
        select: { id: true },
    });
    return Boolean(g);
};
class ExitTicketController {
    static async publish(req, res) {
        var _a, _b;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte dürfen veröffentlichen' });
            const template = (_a = req.body) === null || _a === void 0 ? void 0 : _a.template;
            if (!template || !template.id || !template.title || !Array.isArray(template.questions)) {
                return res.status(400).json({ error: 'Ungültige Vorlage' });
            }
            const learningGroupId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.learningGroupId) === 'string' ? req.body.learningGroupId.trim() : '';
            const publishedAt = new Date().toISOString();
            /** Beim erneuten Freigeben Vorlage + Zeit aktualisieren, aber SuS-Antworten dauerhaft behalten */
            const buildContentPreservingResponses = async (teacherId, lessonPath) => {
                const existing = await prisma.teacherLessonInstruction.findUnique({
                    where: { teacherId_lessonPath: { teacherId, lessonPath } },
                    select: { content: true },
                });
                const prev = parsePayload(existing === null || existing === void 0 ? void 0 : existing.content);
                const preserved = Array.isArray(prev === null || prev === void 0 ? void 0 : prev.responses) ? prev.responses : [];
                const payload = {
                    template,
                    publishedAt,
                    responses: preserved,
                };
                return JSON.stringify(payload);
            };
            const upsertRow = async (teacherId, lessonPath) => {
                const content = await buildContentPreservingResponses(teacherId, lessonPath);
                await prisma.teacherLessonInstruction.upsert({
                    where: {
                        teacherId_lessonPath: { teacherId, lessonPath },
                    },
                    create: {
                        teacherId,
                        lessonPath,
                        content,
                    },
                    update: { content },
                });
            };
            /** Nur eine Klasse (Stunde): nur dieser gruppenspezifische Pfad — SuS lesen ausschließlich diese Pfade. */
            if (learningGroupId) {
                const owned = await prisma.learningGroup.findFirst({
                    where: { id: learningGroupId, teacherId: user.id },
                    select: { id: true },
                });
                if (owned) {
                    const path = exitTicketPathForGroup(owned.id);
                    await upsertRow(user.id, path);
                    return res.json({ success: true, template, publishedAt, lessonPath: path });
                }
                console.warn('[exit-ticket/publish] learningGroupId nicht nutzbar, schreibe global + alle Gruppen:', learningGroupId);
            }
            // Lehrer-Exit-Ticket-Seite (ohne Gruppe) oder ungültige Gruppe: Legacy für die Lehrer-Ansicht
            // + dieselbe Vorlage in JEDE Lerngruppe — SuS nutzen nur Gruppen-Pfade, nie das reine Legacy.
            await upsertRow(user.id, exports.EXIT_TICKET_LEGACY_PATH);
            const allGroups = await prisma.learningGroup.findMany({
                where: { teacherId: user.id },
                select: { id: true },
            });
            for (const g of allGroups) {
                await upsertRow(user.id, exitTicketPathForGroup(g.id));
            }
            return res.json({ success: true, template, publishedAt, lessonPath: exports.EXIT_TICKET_LEGACY_PATH });
        }
        catch (error) {
            console.error('ExitTicket publish error:', error);
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
            let teacherId = user.id;
            let teacherName = user.name;
            const entryHero = (_a = (await (0, EntryTicketController_1.resolveActiveEntryHeroImageIndexForUser)(user.id, user.role))) !== null && _a !== void 0 ? _a : 0;
            if (user.role === 'STUDENT') {
                const resolved = await resolveStudentExitTicket(user.id);
                if (!resolved) {
                    const groups = await prisma.learningGroup.findMany({
                        where: { students: { some: { id: user.id } } },
                        select: { teacherId: true, teacher: { select: { name: true } } },
                        take: 1,
                    });
                    if (groups.length === 0)
                        return res.status(404).json({ error: 'Kein zuständiger Lehrer gefunden' });
                    return res.json({
                        template: null,
                        publishedAt: null,
                        teacherId: groups[0].teacherId,
                        teacherName: groups[0].teacher.name,
                        lessonPath: null,
                        heroImageIndex: entryHero,
                    });
                }
                return res.json({
                    template: resolved.payload.template,
                    publishedAt: resolved.payload.publishedAt,
                    teacherId: resolved.teacherId,
                    teacherName: resolved.teacherName,
                    lessonPath: resolved.lessonPath,
                    heroImageIndex: entryHero,
                });
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: {
                        teacherId,
                        lessonPath: exports.EXIT_TICKET_LEGACY_PATH,
                    },
                },
                select: { content: true, updatedAt: true },
            });
            const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
            if (!payload) {
                return res.json({
                    template: null,
                    publishedAt: null,
                    teacherId,
                    teacherName,
                    lessonPath: exports.EXIT_TICKET_LEGACY_PATH,
                    heroImageIndex: entryHero,
                });
            }
            return res.json({
                template: payload.template,
                publishedAt: payload.publishedAt,
                teacherId,
                teacherName,
                lessonPath: exports.EXIT_TICKET_LEGACY_PATH,
                heroImageIndex: entryHero,
            });
        }
        catch (error) {
            console.error('ExitTicket getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden des ExitTickets' });
        }
    }
    /**
     * SuS: eigene Abgabe zur gruppenspezifischen Exit-Ticket-Zeile (für dauerhafte Anzeige z. B. im Stundenbaum).
     */
    static async getMySubmission(req, res) {
        var _a;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur für Schülerinnen und Schüler' });
            const groupId = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
            if (!groupId)
                return res.status(400).json({ error: 'groupId ist erforderlich' });
            const group = await prisma.learningGroup.findFirst({
                where: { id: groupId, students: { some: { id: user.id } } },
                select: { teacherId: true, teacher: { select: { name: true } } },
            });
            if (!group)
                return res.status(403).json({ error: 'Keine Berechtigung für diese Gruppe' });
            const lessonPath = exitTicketPathForGroup(groupId);
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: { teacherId: group.teacherId, lessonPath },
                },
                select: { content: true },
            });
            const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
            if (!(payload === null || payload === void 0 ? void 0 : payload.template) || !payload.publishedAt) {
                return res.json({
                    template: null,
                    publishedAt: null,
                    myResponse: null,
                    teacherName: group.teacher.name,
                    lessonPath,
                });
            }
            const mine = payload.responses.filter((r) => r.studentId === user.id);
            mine.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            const myResponse = (_a = mine[0]) !== null && _a !== void 0 ? _a : null;
            return res.json({
                template: payload.template,
                publishedAt: payload.publishedAt,
                myResponse,
                teacherName: group.teacher.name,
                lessonPath,
            });
        }
        catch (error) {
            console.error('ExitTicket getMySubmission error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden deiner Exit-Ticket-Abgabe' });
        }
    }
    static async submit(req, res) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur Schüler können antworten' });
            const answers = Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.answers) ? req.body.answers : null;
            const drawingDataUrl = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.drawingDataUrl) === 'string' ? req.body.drawingDataUrl : undefined;
            const photoDataUrl = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.photoDataUrl) === 'string' ? req.body.photoDataUrl : undefined;
            const completionOnly = Boolean((_d = req.body) === null || _d === void 0 ? void 0 : _d.completionOnly);
            if (!answers)
                return res.status(400).json({ error: 'answers ist erforderlich' });
            const bodyTeacherId = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            const bodyLessonPath = typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.lessonPath) === 'string' ? req.body.lessonPath.trim() : '';
            let teacherId;
            let lessonPath;
            if (bodyTeacherId && bodyLessonPath) {
                const ok = await assertStudentCanAccessExitTicketRow(user.id, bodyTeacherId, bodyLessonPath);
                if (!ok)
                    return res.status(403).json({ error: 'Kein Zugriff auf dieses Exit Ticket' });
                teacherId = bodyTeacherId;
                lessonPath = bodyLessonPath;
            }
            else {
                const resolved = await resolveStudentExitTicket(user.id);
                if (!((_g = resolved === null || resolved === void 0 ? void 0 : resolved.payload) === null || _g === void 0 ? void 0 : _g.template)) {
                    return res.status(404).json({ error: 'Kein aktives ExitTicket vorhanden' });
                }
                teacherId = resolved.teacherId;
                lessonPath = resolved.lessonPath;
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: {
                        teacherId,
                        lessonPath,
                    },
                },
                select: { content: true },
            });
            const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
            if (!(payload === null || payload === void 0 ? void 0 : payload.template)) {
                return res.status(404).json({ error: 'Kein aktives ExitTicket vorhanden' });
            }
            if (!payload.publishedAt) {
                return res.status(403).json({ error: 'Exit Ticket ist noch nicht freigegeben' });
            }
            const nextResponses = payload.responses.filter((item) => item.studentId !== user.id);
            nextResponses.push({
                studentId: user.id,
                studentName: user.name,
                answers,
                drawingDataUrl,
                photoDataUrl,
                completionOnly,
                submittedAt: new Date().toISOString(),
            });
            const nextPayload = {
                ...payload,
                responses: nextResponses,
            };
            await prisma.teacherLessonInstruction.update({
                where: {
                    teacherId_lessonPath: {
                        teacherId,
                        lessonPath,
                    },
                },
                data: {
                    content: JSON.stringify(nextPayload),
                },
            });
            return res.json({ success: true });
        }
        catch (error) {
            console.error('ExitTicket submit error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern der Antwort' });
        }
    }
    static async getResponses(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte haben Zugriff' });
            const lessonPathQ = typeof req.query.lessonPath === 'string' ? req.query.lessonPath.trim() : '';
            if (lessonPathQ) {
                const isLegacy = lessonPathQ === exports.EXIT_TICKET_LEGACY_PATH;
                const isGroupScoped = lessonPathQ.startsWith('__exit_ticket_g_') && lessonPathQ.endsWith('__') && lessonPathQ.length > 20;
                if (!isLegacy && !isGroupScoped) {
                    return res.status(400).json({ error: 'Ungültiger lessonPath' });
                }
                const row = await prisma.teacherLessonInstruction.findUnique({
                    where: {
                        teacherId_lessonPath: { teacherId: user.id, lessonPath: lessonPathQ },
                    },
                    select: { content: true },
                });
                const payload = parsePayload(row === null || row === void 0 ? void 0 : row.content);
                if (!(payload === null || payload === void 0 ? void 0 : payload.template)) {
                    return res.json({ template: null, publishedAt: null, responses: [], lessonPath: lessonPathQ });
                }
                const responses = [...payload.responses].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                return res.json({
                    template: payload.template,
                    publishedAt: payload.publishedAt,
                    responses,
                    lessonPath: lessonPathQ,
                });
            }
            const rows = await prisma.teacherLessonInstruction.findMany({
                where: {
                    teacherId: user.id,
                    OR: [{ lessonPath: exports.EXIT_TICKET_LEGACY_PATH }, { lessonPath: { startsWith: '__exit_ticket_g_' } }],
                },
                select: { content: true, lessonPath: true },
            });
            let bestTemplate = null;
            let bestPublishedAt = null;
            let bestMs = -1;
            const merged = [];
            for (const row of rows) {
                const payload = parsePayload(row.content);
                if (!(payload === null || payload === void 0 ? void 0 : payload.template))
                    continue;
                const ms = new Date(payload.publishedAt).getTime();
                if (!Number.isNaN(ms) && ms > bestMs) {
                    bestMs = ms;
                    bestTemplate = payload.template;
                    bestPublishedAt = payload.publishedAt;
                }
                merged.push(...payload.responses);
            }
            if (!bestTemplate) {
                return res.json({ template: null, responses: [] });
            }
            const seen = new Set();
            const responses = merged
                .filter((r) => {
                const key = `${r.studentId}|${r.submittedAt}`;
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            })
                .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            return res.json({
                template: bestTemplate,
                publishedAt: bestPublishedAt,
                responses,
            });
        }
        catch (error) {
            console.error('ExitTicket getResponses error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden der Antworten' });
        }
    }
}
exports.ExitTicketController = ExitTicketController;
//# sourceMappingURL=ExitTicketController.js.map