"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcursionProtocolController = exports.EXCURSION_PROTOCOL_LEGACY_PATH = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/** Legacy — wird bei Migration gelesen */
exports.EXCURSION_PROTOCOL_LEGACY_PATH = '__excursion_protocol_active__';
const EXCURSION_INDEX_PATH = '__excursion_protocol_index__';
const excursionPathForGroup = (groupId) => `__excursion_protocol_g_${groupId}__`;
const excursionDataPath = (excursionId) => `__excursion_protocol_e_${excursionId}__`;
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
const emptyIndex = () => ({
    version: 2,
    excursions: [],
    activeByGroup: {},
});
const parseIndex = (raw) => {
    if (!raw)
        return emptyIndex();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.excursions))
            return emptyIndex();
        if (!parsed.activeByGroup || typeof parsed.activeByGroup !== 'object')
            parsed.activeByGroup = {};
        return parsed;
    }
    catch {
        return emptyIndex();
    }
};
const parseGroupPublishRef = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.excursionId !== 'string' || !parsed.publishedAt)
            return null;
        if (typeof parsed.title !== 'string')
            return null;
        return parsed;
    }
    catch {
        return null;
    }
};
const parseLegacyPayload = (raw) => {
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
const parseExcursionData = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.id !== 'string' || typeof parsed.title !== 'string')
            return null;
        if (!Array.isArray(parsed.submissions))
            parsed.submissions = [];
        if (!Array.isArray(parsed.groupIds))
            parsed.groupIds = [];
        if (!Array.isArray(parsed.ratingCriteria) || parsed.ratingCriteria.length === 0) {
            parsed.ratingCriteria = [...DEFAULT_RATING_CRITERIA];
        }
        if (!Array.isArray(parsed.reflectionQuestions) || parsed.reflectionQuestions.length !== 3) {
            parsed.reflectionQuestions = [...DEFAULT_REFLECTION_QUESTIONS];
        }
        if (parsed.editDeadline !== null && parsed.editDeadline !== undefined && typeof parsed.editDeadline !== 'string') {
            parsed.editDeadline = null;
        }
        if (parsed.editDeadline === undefined)
            parsed.editDeadline = null;
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
const loadTeacherGroupsWithStudents = async (teacherId) => prisma.learningGroup.findMany({
    where: { teacherId },
    select: {
        id: true,
        name: true,
        students: {
            where: { role: 'STUDENT' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        },
    },
    orderBy: { name: 'asc' },
});
const countUniqueStudentsInGroups = (groups, groupIds) => {
    const idSet = new Set(groupIds);
    const ids = new Set();
    for (const g of groups) {
        if (groupIds.length > 0 && !idSet.has(g.id))
            continue;
        for (const s of g.students)
            ids.add(s.id);
    }
    return ids.size;
};
const readRow = async (teacherId, lessonPath) => {
    var _a;
    const row = await prisma.teacherLessonInstruction.findUnique({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        select: { content: true },
    });
    return (_a = row === null || row === void 0 ? void 0 : row.content) !== null && _a !== void 0 ? _a : null;
};
const writeRow = async (teacherId, lessonPath, content) => {
    await prisma.teacherLessonInstruction.upsert({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        create: { teacherId, lessonPath, content },
        update: { content },
    });
};
const saveIndex = async (teacherId, index) => {
    await writeRow(teacherId, EXCURSION_INDEX_PATH, JSON.stringify(index));
};
const saveExcursion = async (teacherId, data) => {
    data.updatedAt = new Date().toISOString();
    await writeRow(teacherId, excursionDataPath(data.id), JSON.stringify(data));
    return data;
};
const deleteRow = async (teacherId, lessonPath) => {
    await prisma.teacherLessonInstruction.deleteMany({
        where: { teacherId, lessonPath },
    });
};
/** Gruppenspezifische Freigabe schreiben (wie Exit-Ticket) + Index synchronisieren */
const syncPublishedGroups = async (teacherId, data, groupIds, index, ownedGroupIds) => {
    const publishedAt = data.publishedAt || new Date().toISOString();
    const ref = {
        excursionId: data.id,
        title: data.title,
        date: data.date,
        publishedAt,
        reflectionQuestions: data.reflectionQuestions,
        ratingCriteria: data.ratingCriteria,
    };
    const refJson = JSON.stringify(ref);
    for (const gid of groupIds) {
        await writeRow(teacherId, excursionPathForGroup(gid), refJson);
        index.activeByGroup[gid] = data.id;
    }
    const ownedSet = new Set(ownedGroupIds);
    for (const gid of ownedGroupIds) {
        if (groupIds.includes(gid))
            continue;
        if (index.activeByGroup[gid] !== data.id)
            continue;
        delete index.activeByGroup[gid];
        const raw = await readRow(teacherId, excursionPathForGroup(gid));
        const scoped = parseGroupPublishRef(raw);
        const legacy = parseLegacyPayload(raw);
        if ((scoped === null || scoped === void 0 ? void 0 : scoped.excursionId) === data.id || legacy) {
            await deleteRow(teacherId, excursionPathForGroup(gid));
        }
    }
};
const loadExcursion = async (teacherId, excursionId) => {
    const raw = await readRow(teacherId, excursionDataPath(excursionId));
    return parseExcursionData(raw);
};
const syncIndexEntry = (index, data) => {
    const entry = {
        id: data.id,
        title: data.title,
        date: data.date,
        groupIds: data.groupIds,
        publishedAt: data.publishedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
    const i = index.excursions.findIndex((e) => e.id === data.id);
    if (i >= 0)
        index.excursions[i] = entry;
    else
        index.excursions.push(entry);
    index.excursions.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};
/** Alte gruppenspezifische Zeilen → Index v2 */
const migrateLegacyIfNeeded = async (teacherId) => {
    let index = parseIndex(await readRow(teacherId, EXCURSION_INDEX_PATH));
    if (index.excursions.length > 0)
        return index;
    const groups = await prisma.learningGroup.findMany({
        where: { teacherId },
        select: { id: true },
    });
    const legacyByKey = new Map();
    const ingestLegacy = (groupId, payload) => {
        if (!payload.publishedAt)
            return;
        const key = `${payload.title}::${payload.date}::${payload.publishedAt}`;
        const existing = legacyByKey.get(key);
        if (existing) {
            if (groupId)
                existing.groupIds.push(groupId);
            return;
        }
        legacyByKey.set(key, {
            groupIds: groupId ? [groupId] : groups.map((g) => g.id),
            payload,
        });
    };
    for (const g of groups) {
        const raw = await readRow(teacherId, excursionPathForGroup(g.id));
        const payload = parseLegacyPayload(raw);
        if (payload)
            ingestLegacy(g.id, payload);
    }
    const legacyActive = parseLegacyPayload(await readRow(teacherId, exports.EXCURSION_PROTOCOL_LEGACY_PATH));
    if (legacyActive)
        ingestLegacy(null, legacyActive);
    if (legacyByKey.size === 0)
        return index;
    const now = new Date().toISOString();
    for (const { groupIds, payload } of legacyByKey.values()) {
        const id = (0, crypto_1.randomUUID)();
        const data = {
            id,
            title: payload.title,
            date: payload.date,
            groupIds: [...new Set(groupIds)],
            publishedAt: payload.publishedAt,
            editDeadline: null,
            reflectionQuestions: payload.reflectionQuestions,
            ratingCriteria: payload.ratingCriteria,
            submissions: payload.submissions,
            createdAt: now,
            updatedAt: now,
        };
        await saveExcursion(teacherId, data);
        syncIndexEntry(index, data);
        for (const gid of data.groupIds) {
            index.activeByGroup[gid] = id;
        }
    }
    await saveIndex(teacherId, index);
    return index;
};
const loadTeacherIndex = async (teacherId) => migrateLegacyIfNeeded(teacherId);
const resolveExcursionForStudentGroup = async (teacherId, groupId) => {
    const raw = await readRow(teacherId, excursionPathForGroup(groupId));
    const scoped = parseGroupPublishRef(raw);
    if ((scoped === null || scoped === void 0 ? void 0 : scoped.excursionId) && scoped.publishedAt) {
        return { excursionId: scoped.excursionId, publishedAt: scoped.publishedAt };
    }
    const legacy = parseLegacyPayload(raw);
    if (legacy === null || legacy === void 0 ? void 0 : legacy.publishedAt) {
        const index = await loadTeacherIndex(teacherId);
        const excursionId = index.activeByGroup[groupId];
        if (excursionId)
            return { excursionId, publishedAt: legacy.publishedAt };
    }
    const index = await loadTeacherIndex(teacherId);
    const excursionId = index.activeByGroup[groupId];
    if (!excursionId)
        return null;
    const payload = await loadExcursion(teacherId, excursionId);
    if (!(payload === null || payload === void 0 ? void 0 : payload.publishedAt))
        return null;
    if (payload.groupIds.length > 0 && !payload.groupIds.includes(groupId))
        return null;
    return { excursionId, publishedAt: payload.publishedAt };
};
const resolveStudentExcursions = async (studentId) => {
    var _a;
    const groups = await prisma.learningGroup.findMany({
        where: { students: { some: { id: studentId } } },
        select: {
            id: true,
            name: true,
            teacherId: true,
            teacher: { select: { id: true, name: true } },
        },
    });
    if (groups.length === 0)
        return [];
    const results = [];
    const seen = new Set();
    const byTeacher = new Map();
    for (const g of groups) {
        const list = (_a = byTeacher.get(g.teacherId)) !== null && _a !== void 0 ? _a : [];
        list.push(g);
        byTeacher.set(g.teacherId, list);
    }
    for (const [teacherId, teacherGroups] of byTeacher) {
        const index = await loadTeacherIndex(teacherId);
        for (const meta of index.excursions) {
            if (!meta.publishedAt)
                continue;
            const payload = await loadExcursion(teacherId, meta.id);
            if (!(payload === null || payload === void 0 ? void 0 : payload.publishedAt))
                continue;
            for (const g of teacherGroups) {
                if (payload.groupIds.length > 0 && !payload.groupIds.includes(g.id))
                    continue;
                const key = `${meta.id}:${g.id}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                results.push({
                    teacherId,
                    teacherName: g.teacher.name,
                    excursionId: meta.id,
                    lessonPath: excursionDataPath(meta.id),
                    payload,
                    groupId: g.id,
                    groupName: g.name,
                });
            }
        }
    }
    results.sort((a, b) => {
        const ams = new Date(a.payload.publishedAt || 0).getTime();
        const bms = new Date(b.payload.publishedAt || 0).getTime();
        return bms - ams;
    });
    return results;
};
const assertStudentCanAccessExcursion = async (studentId, teacherId, excursionId) => {
    const payload = await loadExcursion(teacherId, excursionId);
    if (!(payload === null || payload === void 0 ? void 0 : payload.publishedAt))
        return false;
    const studentGroups = await prisma.learningGroup.findMany({
        where: { teacherId, students: { some: { id: studentId } } },
        select: { id: true },
    });
    if (payload.groupIds.length === 0)
        return true;
    return studentGroups.some((g) => payload.groupIds.includes(g.id));
};
const normalizeReflection = (raw) => {
    const arr = Array.isArray(raw) ? raw.map((q) => String(q).trim()).filter(Boolean) : [];
    return [
        arr[0] || DEFAULT_REFLECTION_QUESTIONS[0],
        arr[1] || DEFAULT_REFLECTION_QUESTIONS[1],
        arr[2] || DEFAULT_REFLECTION_QUESTIONS[2],
    ];
};
const normalizeCriteria = (raw) => {
    const arr = Array.isArray(raw) ? raw.map((c) => String(c).trim()).filter(Boolean) : [];
    return arr.length > 0 ? arr : [...DEFAULT_RATING_CRITERIA];
};
const normalizeEditDeadline = (raw, existing = null) => {
    if (raw === null || raw === '')
        return null;
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t)
            return null;
        const d = new Date(t);
        if (Number.isNaN(d.getTime()))
            return existing;
        return d.toISOString();
    }
    return existing;
};
const canStudentEditSubmission = (payload, hasSubmission) => {
    if (!hasSubmission)
        return true;
    if (!payload.editDeadline)
        return true;
    return Date.now() <= new Date(payload.editDeadline).getTime();
};
const sessionDto = (payload) => {
    var _a;
    return ({
        id: payload.id,
        title: payload.title,
        date: payload.date,
        groupIds: payload.groupIds,
        editDeadline: (_a = payload.editDeadline) !== null && _a !== void 0 ? _a : null,
        reflectionQuestions: payload.reflectionQuestions,
        ratingCriteria: payload.ratingCriteria,
    });
};
class ExcursionProtocolController {
    /** Lehrkraft: alle Protokolle */
    static async list(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const index = await loadTeacherIndex(user.id);
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
            const items = await Promise.all(index.excursions.map(async (meta) => {
                var _a, _b, _c, _d;
                const data = await loadExcursion(user.id, meta.id);
                const submissionCount = (_a = data === null || data === void 0 ? void 0 : data.submissions.length) !== null && _a !== void 0 ? _a : 0;
                const targetGroups = meta.groupIds.length > 0 ? meta.groupIds : groups.map((g) => g.id);
                return {
                    ...meta,
                    groupNames: targetGroups.map((id) => groupNameById.get(id) || id),
                    ratingCriteria: (_b = data === null || data === void 0 ? void 0 : data.ratingCriteria) !== null && _b !== void 0 ? _b : [...DEFAULT_RATING_CRITERIA],
                    reflectionQuestions: (_c = data === null || data === void 0 ? void 0 : data.reflectionQuestions) !== null && _c !== void 0 ? _c : [...DEFAULT_REFLECTION_QUESTIONS],
                    editDeadline: (_d = data === null || data === void 0 ? void 0 : data.editDeadline) !== null && _d !== void 0 ? _d : null,
                    submissionCount,
                    totalStudents: countUniqueStudentsInGroups(groups, targetGroups),
                    isPublished: Boolean(meta.publishedAt),
                };
            }));
            return res.json({
                excursions: items,
                groups: groups.map((g) => ({ id: g.id, name: g.name, studentCount: g.students.length })),
            });
        }
        catch (error) {
            console.error('ExcursionProtocol list error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden der Protokolle' });
        }
    }
    /** Lehrkraft: neues Protokoll (Entwurf) */
    static async create(req, res) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : '';
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const date = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.date) === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10);
            const groupIds = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.groupIds)
                ? req.body.groupIds.map((g) => String(g).trim()).filter(Boolean)
                : [];
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            const validGroupIds = groupIds.filter((id) => ownedIds.has(id));
            const now = new Date().toISOString();
            const id = (0, crypto_1.randomUUID)();
            const data = {
                id,
                title,
                date,
                groupIds: validGroupIds,
                publishedAt: null,
                editDeadline: normalizeEditDeadline((_d = req.body) === null || _d === void 0 ? void 0 : _d.editDeadline, null),
                reflectionQuestions: normalizeReflection((_e = req.body) === null || _e === void 0 ? void 0 : _e.reflectionQuestions),
                ratingCriteria: normalizeCriteria((_f = req.body) === null || _f === void 0 ? void 0 : _f.ratingCriteria),
                submissions: [],
                createdAt: now,
                updatedAt: now,
            };
            await saveExcursion(user.id, data);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, data);
            await saveIndex(user.id, index);
            return res.json({ success: true, excursion: data });
        }
        catch (error) {
            console.error('ExcursionProtocol create error:', error);
            return res.status(500).json({ error: 'Fehler beim Erstellen' });
        }
    }
    /** Lehrkraft: Protokoll bearbeiten */
    static async update(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const excursionId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
            if (!excursionId)
                return res.status(400).json({ error: 'ID fehlt' });
            const existing = await loadExcursion(user.id, excursionId);
            if (!existing)
                return res.status(404).json({ error: 'Protokoll nicht gefunden' });
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : existing.title;
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            let groupIds = existing.groupIds;
            if (Array.isArray((_b = req.body) === null || _b === void 0 ? void 0 : _b.groupIds)) {
                groupIds = req.body.groupIds.map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
            }
            const next = {
                ...existing,
                title,
                date: typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.date) === 'string' ? req.body.date.trim() : existing.date,
                groupIds,
                reflectionQuestions: ((_d = req.body) === null || _d === void 0 ? void 0 : _d.reflectionQuestions)
                    ? normalizeReflection(req.body.reflectionQuestions)
                    : existing.reflectionQuestions,
                ratingCriteria: ((_e = req.body) === null || _e === void 0 ? void 0 : _e.ratingCriteria)
                    ? normalizeCriteria(req.body.ratingCriteria)
                    : existing.ratingCriteria,
                editDeadline: ((_f = req.body) === null || _f === void 0 ? void 0 : _f.editDeadline) !== undefined
                    ? normalizeEditDeadline(req.body.editDeadline, (_g = existing.editDeadline) !== null && _g !== void 0 ? _g : null)
                    : (_h = existing.editDeadline) !== null && _h !== void 0 ? _h : null,
            };
            await saveExcursion(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            if (next.publishedAt) {
                const owned = await loadTeacherGroupsWithStudents(user.id);
                await syncPublishedGroups(user.id, next, next.groupIds.length > 0 ? next.groupIds : owned.map((g) => g.id), index, owned.map((g) => g.id));
            }
            await saveIndex(user.id, index);
            return res.json({ success: true, excursion: next });
        }
        catch (error) {
            console.error('ExcursionProtocol update error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    /** Lehrkraft: freigeben für gewählte Gruppen */
    static async publishById(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const excursionId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
            if (!excursionId)
                return res.status(400).json({ error: 'ID fehlt' });
            const existing = await loadExcursion(user.id, excursionId);
            if (!existing)
                return res.status(404).json({ error: 'Protokoll nicht gefunden' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            let groupIds = existing.groupIds;
            if (Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupIds)) {
                groupIds = req.body.groupIds.map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
            }
            if (groupIds.length === 0) {
                return res.status(400).json({ error: 'Mindestens eine Lerngruppe auswählen' });
            }
            const publishedAt = new Date().toISOString();
            const next = {
                ...existing,
                groupIds,
                publishedAt,
            };
            await saveExcursion(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            await syncPublishedGroups(user.id, next, groupIds, index, owned.map((g) => g.id));
            await saveIndex(user.id, index);
            return res.json({
                success: true,
                publishedAt,
                excursionId,
                groupIds,
                groupNames: owned.filter((g) => groupIds.includes(g.id)).map((g) => g.name),
                lessonPath: excursionDataPath(excursionId),
            });
        }
        catch (error) {
            console.error('ExcursionProtocol publishById error:', error);
            return res.status(500).json({ error: 'Fehler beim Freigeben' });
        }
    }
    /** Lehrkraft: Protokoll löschen */
    static async remove(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const excursionId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
            if (!excursionId)
                return res.status(400).json({ error: 'ID fehlt' });
            const index = await loadTeacherIndex(user.id);
            index.excursions = index.excursions.filter((e) => e.id !== excursionId);
            for (const [gid, eid] of Object.entries(index.activeByGroup)) {
                if (eid === excursionId)
                    delete index.activeByGroup[gid];
            }
            await saveIndex(user.id, index);
            await prisma.teacherLessonInstruction.deleteMany({
                where: { teacherId: user.id, lessonPath: excursionDataPath(excursionId) },
            });
            return res.json({ success: true });
        }
        catch (error) {
            console.error('ExcursionProtocol remove error:', error);
            return res.status(500).json({ error: 'Fehler beim Löschen' });
        }
    }
    /** Legacy publish — create + publish in einem Schritt */
    static async publish(req, res) {
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const excursionId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.excursionId) === 'string' ? req.body.excursionId.trim() : '';
            if (excursionId) {
                req.params = { id: excursionId };
                return ExcursionProtocolController.publishById(req, res);
            }
            const title = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.title) === 'string' ? req.body.title.trim() : '';
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            let groupIds = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.groupIds)
                ? req.body.groupIds.map((g) => String(g).trim()).filter((id) => ownedIds.has(id))
                : owned.map((g) => g.id);
            if (groupIds.length === 0)
                groupIds = owned.map((g) => g.id);
            const now = new Date().toISOString();
            const id = (0, crypto_1.randomUUID)();
            const publishedAt = now;
            const data = {
                id,
                title,
                date: typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.date) === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10),
                groupIds,
                publishedAt,
                editDeadline: normalizeEditDeadline((_e = req.body) === null || _e === void 0 ? void 0 : _e.editDeadline, null),
                reflectionQuestions: normalizeReflection((_f = req.body) === null || _f === void 0 ? void 0 : _f.reflectionQuestions),
                ratingCriteria: normalizeCriteria((_g = req.body) === null || _g === void 0 ? void 0 : _g.ratingCriteria),
                submissions: [],
                createdAt: now,
                updatedAt: now,
            };
            await saveExcursion(user.id, data);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, data);
            await syncPublishedGroups(user.id, data, groupIds, index, owned.map((g) => g.id));
            await saveIndex(user.id, index);
            return res.json({
                success: true,
                publishedAt,
                excursionId: id,
                groupIds,
                groupNames: owned.filter((g) => groupIds.includes(g.id)).map((g) => g.name),
                lessonPath: excursionDataPath(id),
            });
        }
        catch (error) {
            console.error('ExcursionProtocol publish error:', error);
            return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
        }
    }
    static async getCurrent(req, res) {
        var _a, _b;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role === 'STUDENT') {
                const excursionIdQ = typeof req.query.excursionId === 'string' ? req.query.excursionId.trim() : '';
                const all = await resolveStudentExcursions(user.id);
                if (all.length === 0) {
                    const groups = await prisma.learningGroup.findMany({
                        where: { students: { some: { id: user.id } } },
                        select: { teacherId: true, teacher: { select: { name: true } } },
                        take: 1,
                    });
                    if (groups.length === 0)
                        return res.status(404).json({ error: 'Keine Lerngruppe gefunden' });
                    return res.json({
                        session: null,
                        sessions: [],
                        publishedAt: null,
                        teacherId: groups[0].teacherId,
                        teacherName: groups[0].teacher.name,
                        excursionId: null,
                        lessonPath: null,
                    });
                }
                const resolved = excursionIdQ
                    ? all.find((e) => e.excursionId === excursionIdQ) || all[0]
                    : all[0];
                const mine = resolved.payload.submissions.filter((s) => s.studentId === user.id);
                mine.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                const mySubmission = (_a = mine[0]) !== null && _a !== void 0 ? _a : null;
                const hasSubmission = Boolean(mySubmission);
                return res.json({
                    session: sessionDto(resolved.payload),
                    sessions: all.map((e) => {
                        var _a;
                        const sub = e.payload.submissions.find((s) => s.studentId === user.id);
                        const submitted = Boolean(sub);
                        return {
                            ...sessionDto(e.payload),
                            publishedAt: e.payload.publishedAt,
                            teacherId: e.teacherId,
                            teacherName: e.teacherName,
                            groupId: e.groupId,
                            groupName: e.groupName,
                            lessonPath: e.lessonPath,
                            studentSubmitted: submitted,
                            studentSubmittedAt: (_a = sub === null || sub === void 0 ? void 0 : sub.submittedAt) !== null && _a !== void 0 ? _a : null,
                            studentCanEdit: canStudentEditSubmission(e.payload, submitted),
                        };
                    }),
                    publishedAt: resolved.payload.publishedAt,
                    editDeadline: (_b = resolved.payload.editDeadline) !== null && _b !== void 0 ? _b : null,
                    canEdit: canStudentEditSubmission(resolved.payload, hasSubmission),
                    teacherId: resolved.teacherId,
                    teacherName: resolved.teacherName,
                    excursionId: resolved.excursionId,
                    lessonPath: resolved.lessonPath,
                    groupId: resolved.groupId,
                    groupName: resolved.groupName,
                    mySubmission,
                });
            }
            const index = await loadTeacherIndex(user.id);
            const groups = await loadTeacherGroupsWithStudents(user.id);
            return res.json({
                teacherId: user.id,
                teacherName: user.name,
                excursionCount: index.excursions.length,
                publishedCount: index.excursions.filter((e) => e.publishedAt).length,
                groupCount: groups.length,
            });
        }
        catch (error) {
            console.error('ExcursionProtocol getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async submit(req, res) {
        var _a, _b, _c, _d, _e, _f, _g;
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
            const bodyExcursionId = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.excursionId) === 'string' ? req.body.excursionId.trim() : '';
            const bodyLessonPath = typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.lessonPath) === 'string' ? req.body.lessonPath.trim() : '';
            let teacherId;
            let excursionId;
            if (bodyExcursionId && bodyTeacherId) {
                const ok = await assertStudentCanAccessExcursion(user.id, bodyTeacherId, bodyExcursionId);
                if (!ok)
                    return res.status(403).json({ error: 'Kein Zugriff auf dieses Protokoll' });
                teacherId = bodyTeacherId;
                excursionId = bodyExcursionId;
            }
            else if ((bodyLessonPath === null || bodyLessonPath === void 0 ? void 0 : bodyLessonPath.startsWith('__excursion_protocol_e_')) && bodyTeacherId) {
                const m = bodyLessonPath.match(/^__excursion_protocol_e_(.+?)__$/);
                excursionId = (m === null || m === void 0 ? void 0 : m[1]) || '';
                if (!excursionId)
                    return res.status(400).json({ error: 'Ungültiger Pfad' });
                const ok = await assertStudentCanAccessExcursion(user.id, bodyTeacherId, excursionId);
                if (!ok)
                    return res.status(403).json({ error: 'Kein Zugriff' });
                teacherId = bodyTeacherId;
            }
            else {
                const resolved = (await resolveStudentExcursions(user.id))[0];
                if (!((_g = resolved === null || resolved === void 0 ? void 0 : resolved.payload) === null || _g === void 0 ? void 0 : _g.publishedAt)) {
                    return res.status(404).json({ error: 'Kein aktives Exkursionsprotokoll vorhanden' });
                }
                teacherId = resolved.teacherId;
                excursionId = resolved.excursionId;
            }
            const payload = await loadExcursion(teacherId, excursionId);
            if (!(payload === null || payload === void 0 ? void 0 : payload.publishedAt)) {
                return res.status(403).json({ error: 'Protokoll ist noch nicht freigegeben' });
            }
            const existingSubmission = payload.submissions.find((item) => item.studentId === user.id);
            if (existingSubmission && !canStudentEditSubmission(payload, true)) {
                return res.status(403).json({ error: 'Bearbeitungszeitraum ist abgelaufen.' });
            }
            const nextSubmissions = payload.submissions.filter((item) => item.studentId !== user.id);
            nextSubmissions.push({
                studentId: user.id,
                studentName: user.name,
                activities: activities.map((a) => ({
                    content: String(a.content || '').trim(),
                    imageDataUrl: typeof a.imageDataUrl === 'string' ? a.imageDataUrl : undefined,
                    activityRating: typeof a.activityRating === 'number'
                        ? Math.min(5, Math.max(1, Math.round(a.activityRating)))
                        : undefined,
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
            await saveExcursion(teacherId, { ...payload, submissions: nextSubmissions });
            return res.json({ success: true });
        }
        catch (error) {
            console.error('ExcursionProtocol submit error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async getSubmissions(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte haben Zugriff' });
            const excursionIdQ = typeof req.query.excursionId === 'string'
                ? req.query.excursionId.trim()
                : typeof req.query.lessonPath === 'string'
                    ? ((_a = req.query.lessonPath.match(/^__excursion_protocol_e_(.+?)__$/)) === null || _a === void 0 ? void 0 : _a[1]) || ''
                    : '';
            if (!excursionIdQ) {
                return res.status(400).json({ error: 'excursionId ist erforderlich' });
            }
            const payload = await loadExcursion(user.id, excursionIdQ);
            const groups = await loadTeacherGroupsWithStudents(user.id);
            if (!payload) {
                return res.json({ session: null, submissions: [], roster: [], totalStudents: 0 });
            }
            const targetGroupIds = payload.groupIds.length > 0 ? payload.groupIds : groups.map((g) => g.id);
            const targetGroups = groups.filter((g) => targetGroupIds.includes(g.id));
            const submissionByStudent = new Map(payload.submissions.map((s) => [s.studentId, s]));
            const roster = [];
            for (const g of targetGroups) {
                for (const student of g.students) {
                    const submission = (_b = submissionByStudent.get(student.id)) !== null && _b !== void 0 ? _b : null;
                    roster.push({
                        studentId: student.id,
                        studentName: student.name,
                        groupId: g.id,
                        groupName: g.name,
                        submitted: Boolean(submission),
                        submittedAt: (_c = submission === null || submission === void 0 ? void 0 : submission.submittedAt) !== null && _c !== void 0 ? _c : null,
                        submission,
                    });
                }
            }
            roster.sort((a, b) => {
                if (a.submitted !== b.submitted)
                    return a.submitted ? -1 : 1;
                return a.studentName.localeCompare(b.studentName, 'de');
            });
            return res.json({
                session: sessionDto(payload),
                publishedAt: payload.publishedAt,
                excursionId: payload.id,
                submissions: payload.submissions,
                roster,
                totalStudents: countUniqueStudentsInGroups(groups, targetGroupIds),
                submittedCount: payload.submissions.length,
                pendingCount: roster.filter((r) => !r.submitted).length,
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