"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryTicketController = void 0;
exports.resolveActiveEntryHeroImageIndexForUser = resolveActiveEntryHeroImageIndexForUser;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const ENTRY_TICKET_LEGACY_PATH = '__entry_ticket_active__';
const entryTicketPathForGroup = (groupId) => `__entry_ticket_g_${groupId}__`;
const clampHeroIndex = (n) => {
    if (typeof n !== 'number' || !Number.isInteger(n))
        return 0;
    return Math.min(9, Math.max(0, n));
};
const parsePayload = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.startedAt !== 'string')
            return null;
        return {
            startedAt: parsed.startedAt,
            heroImageIndex: clampHeroIndex(parsed.heroImageIndex),
        };
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
const resolveStudentEntryTicket = async (studentId) => {
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
    const legacyCheckedForTeacher = new Set();
    for (const g of groups) {
        const tid = g.teacherId;
        const tname = g.teacher.name;
        const pathScoped = entryTicketPathForGroup(g.id);
        const rowScoped = await prisma.teacherLessonInstruction.findUnique({
            where: {
                teacherId_lessonPath: { teacherId: tid, lessonPath: pathScoped },
            },
            select: { content: true },
        });
        const scoped = parsePayload(rowScoped === null || rowScoped === void 0 ? void 0 : rowScoped.content);
        if (scoped === null || scoped === void 0 ? void 0 : scoped.startedAt) {
            candidates.push({
                teacherId: tid,
                teacherName: tname,
                lessonPath: pathScoped,
                payload: scoped,
            });
        }
        /** Fallback: Signal hat nur Legacy-Zeile geschrieben (Randfälle) – gleicher Lehrer wie die Gruppe */
        if (!legacyCheckedForTeacher.has(tid)) {
            legacyCheckedForTeacher.add(tid);
            const rowLegacy = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: { teacherId: tid, lessonPath: ENTRY_TICKET_LEGACY_PATH },
                },
                select: { content: true },
            });
            const leg = parsePayload(rowLegacy === null || rowLegacy === void 0 ? void 0 : rowLegacy.content);
            if (leg === null || leg === void 0 ? void 0 : leg.startedAt) {
                candidates.push({
                    teacherId: tid,
                    teacherName: tname,
                    lessonPath: ENTRY_TICKET_LEGACY_PATH,
                    payload: leg,
                });
            }
        }
    }
    if (candidates.length === 0)
        return null;
    let best = candidates[0];
    let bestMs = new Date(best.payload.startedAt).getTime();
    for (let i = 1; i < candidates.length; i++) {
        const c = candidates[i];
        const ms = new Date(c.payload.startedAt).getTime();
        if (!Number.isNaN(ms) && ms > bestMs) {
            best = c;
            bestMs = ms;
        }
    }
    return best;
};
const resolveLatestEntryTicketForTeacher = async (teacherId) => {
    const rows = await prisma.teacherLessonInstruction.findMany({
        where: {
            teacherId,
            OR: [{ lessonPath: ENTRY_TICKET_LEGACY_PATH }, { lessonPath: { startsWith: '__entry_ticket_g_' } }],
        },
        select: { content: true, lessonPath: true },
    });
    let best = null;
    let bestMs = -1;
    for (const row of rows) {
        const p = parsePayload(row.content);
        if (!(p === null || p === void 0 ? void 0 : p.startedAt))
            continue;
        const ms = new Date(p.startedAt).getTime();
        if (!Number.isNaN(ms) && ms > bestMs) {
            bestMs = ms;
            best = {
                teacherId,
                teacherName: '',
                lessonPath: row.lessonPath,
                payload: p,
            };
        }
    }
    return best;
};
class EntryTicketController {
    /** Lehrkraft startet Entry Ticket (Schüler sehen Hinweis-Popup) */
    static async signal(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const learningGroupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.learningGroupId) === 'string' ? req.body.learningGroupId.trim() : '';
            const heroImageIndex = Math.floor(Math.random() * 10);
            const payload = {
                startedAt: new Date().toISOString(),
                heroImageIndex,
            };
            const content = JSON.stringify(payload);
            const upsertRow = async (teacherId, lessonPath) => {
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
            if (learningGroupId) {
                const owned = await prisma.learningGroup.findFirst({
                    where: { id: learningGroupId, teacherId: user.id },
                    select: { id: true },
                });
                if (owned) {
                    const path = entryTicketPathForGroup(owned.id);
                    await upsertRow(user.id, path);
                    /** Gleicher Zeitstempel auch in Legacy-Zeile: Auflösung pro Lehrkraft im Schüler-GET nutzt Legacy als Fallback — sonst fehlt das Signal, wenn nur der Gruppenpfad geschrieben wurde und die Zuordnung/ID nicht passt. */
                    await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH);
                    return res.json({
                        success: true,
                        startedAt: payload.startedAt,
                        lessonPath: path,
                        heroImageIndex: payload.heroImageIndex,
                    });
                }
            }
            await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH);
            const allGroups = await prisma.learningGroup.findMany({
                where: { teacherId: user.id },
                select: { id: true },
            });
            for (const g of allGroups) {
                await upsertRow(user.id, entryTicketPathForGroup(g.id));
            }
            return res.json({
                success: true,
                startedAt: payload.startedAt,
                lessonPath: ENTRY_TICKET_LEGACY_PATH,
                heroImageIndex: payload.heroImageIndex,
            });
        }
        catch (error) {
            console.error('EntryTicket signal error:', error);
            return res.status(500).json({ error: 'Fehler beim Signalisieren' });
        }
    }
    static async getCurrent(req, res) {
        var _a, _b, _c;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role === 'STUDENT') {
                const resolved = await resolveStudentEntryTicket(user.id);
                if (!resolved) {
                    const groups = await prisma.learningGroup.findMany({
                        where: { students: { some: { id: user.id } } },
                        select: { teacherId: true, teacher: { select: { name: true } } },
                        take: 1,
                    });
                    if (groups.length === 0) {
                        return res.json({
                            startedAt: null,
                            teacherId: null,
                            teacherName: null,
                            lessonPath: null,
                            heroImageIndex: null,
                        });
                    }
                    return res.json({
                        startedAt: null,
                        teacherId: groups[0].teacherId,
                        teacherName: groups[0].teacher.name,
                        lessonPath: null,
                        heroImageIndex: null,
                    });
                }
                return res.json({
                    startedAt: resolved.payload.startedAt,
                    teacherId: resolved.teacherId,
                    teacherName: resolved.teacherName,
                    lessonPath: resolved.lessonPath,
                    heroImageIndex: (_a = resolved.payload.heroImageIndex) !== null && _a !== void 0 ? _a : 0,
                });
            }
            const teacherResolved = await resolveLatestEntryTicketForTeacher(user.id);
            if (!((_b = teacherResolved === null || teacherResolved === void 0 ? void 0 : teacherResolved.payload) === null || _b === void 0 ? void 0 : _b.startedAt)) {
                return res.json({
                    startedAt: null,
                    teacherId: user.id,
                    teacherName: user.name,
                    lessonPath: null,
                    heroImageIndex: null,
                });
            }
            return res.json({
                startedAt: teacherResolved.payload.startedAt,
                teacherId: user.id,
                teacherName: user.name,
                lessonPath: teacherResolved.lessonPath,
                heroImageIndex: (_c = teacherResolved.payload.heroImageIndex) !== null && _c !== void 0 ? _c : 0,
            });
        }
        catch (error) {
            console.error('EntryTicket getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
}
exports.EntryTicketController = EntryTicketController;
/** Gleiches Motiv wie aktuelles Entry-Ticket (für Exit-Ticket-UI in derselben Stunde) */
async function resolveActiveEntryHeroImageIndexForUser(userId, role) {
    var _a, _b, _c, _d;
    if (role === 'STUDENT') {
        const r = await resolveStudentEntryTicket(userId);
        if (!((_a = r === null || r === void 0 ? void 0 : r.payload) === null || _a === void 0 ? void 0 : _a.startedAt))
            return null;
        return (_b = r.payload.heroImageIndex) !== null && _b !== void 0 ? _b : 0;
    }
    if (role === 'TEACHER') {
        const r = await resolveLatestEntryTicketForTeacher(userId);
        if (!((_c = r === null || r === void 0 ? void 0 : r.payload) === null || _c === void 0 ? void 0 : _c.startedAt))
            return null;
        return (_d = r.payload.heroImageIndex) !== null && _d !== void 0 ? _d : 0;
    }
    return null;
}
//# sourceMappingURL=EntryTicketController.js.map