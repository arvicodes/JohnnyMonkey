"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpoNotenController = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const prisma = new client_1.PrismaClient();
const INDEX_PATH = '__epo_noten_index__';
const roundDataPath = (roundId) => `__epo_noten_e_${roundId}__`;
const groupActivePath = (groupId) => `__epo_noten_g_${groupId}__`;
const CATEGORY_COUNT = 5;
const GRADE_TABLE = [
    { minPoints: 14, grade: '1' },
    { minPoints: 13, grade: '1−' },
    { minPoints: 12, grade: '2+' },
    { minPoints: 11, grade: '2' },
    { minPoints: 10, grade: '2−' },
    { minPoints: 9, grade: '3+' },
    { minPoints: 8, grade: '3' },
    { minPoints: 7, grade: '3−' },
    { minPoints: 6, grade: '4+' },
    { minPoints: 5, grade: '4' },
    { minPoints: 4, grade: '4−' },
    { minPoints: 3, grade: '5+' },
    { minPoints: 0, grade: '5' },
];
const gradeFromTotalPoints = (total) => {
    const t = Math.max(0, Math.min(15, Math.round(total)));
    const table = [...GRADE_TABLE].sort((a, b) => b.minPoints - a.minPoints);
    for (const row of table) {
        if (t >= row.minPoints)
            return row.grade;
    }
    return '5';
};
/** Wie Client: -1 = noch nicht gewählt, 0–3 = gewählt */
const normalizeCategoryScores = (raw) => {
    const base = Array.isArray(raw) ? raw : [];
    return Array.from({ length: CATEGORY_COUNT }, (_, i) => {
        const n = Number(base[i]);
        if (!Number.isFinite(n) || n < 0)
            return -1;
        return Math.min(3, Math.max(0, Math.round(n)));
    });
};
const sumCategoryScores = (scores) => scores.reduce((a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0), 0);
const allCategoriesSelected = (scores) => normalizeCategoryScores(scores).every((s) => s >= 0);
const rasterResultFromTotal = (mode, total) => {
    const t = Math.max(0, Math.min(15, Math.round(total)));
    if (mode === 'mss')
        return String(t);
    return gradeFromTotalPoints(t);
};
const effectiveTeacherGrade = (entry, mode) => {
    var _a;
    const trimmed = (_a = entry.teacherGrade) === null || _a === void 0 ? void 0 : _a.trim();
    if (trimmed)
        return trimmed;
    const scores = normalizeCategoryScores(entry.teacherScores);
    if (!allCategoriesSelected(scores))
        return '';
    return rasterResultFromTotal(mode, sumCategoryScores(scores));
};
const normalizeAssessmentModes = (payload, groupNamesById) => {
    const raw = payload.assessmentModeByGroup && typeof payload.assessmentModeByGroup === 'object'
        ? payload.assessmentModeByGroup
        : {};
    const modes = {};
    for (const gid of payload.groupIds) {
        const gName = groupNamesById === null || groupNamesById === void 0 ? void 0 : groupNamesById.get(gid);
        if (epoGroupUsesMssPoints(gName)) {
            modes[gid] = 'mss';
            continue;
        }
        modes[gid] = raw[gid] === 'mss' ? 'mss' : 'note';
    }
    return modes;
};
const assessmentModeForGroup = (payload, groupId, groupName) => {
    if (epoGroupUsesMssPoints(groupName))
        return 'mss';
    return normalizeAssessmentModes(payload)[groupId] === 'mss' ? 'mss' : 'note';
};
const emptyIndex = () => ({
    version: 1,
    rounds: [],
    activeByGroup: {},
});
const parseIndex = (raw) => {
    if (!raw)
        return emptyIndex();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.rounds))
            return emptyIndex();
        if (!parsed.activeByGroup || typeof parsed.activeByGroup !== 'object')
            parsed.activeByGroup = {};
        return parsed;
    }
    catch {
        return emptyIndex();
    }
};
const parseRound = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.id !== 'string' || typeof parsed.title !== 'string')
            return null;
        if (!Array.isArray(parsed.entries))
            parsed.entries = [];
        if (!Array.isArray(parsed.groupIds))
            parsed.groupIds = [];
        parsed.assessmentModeByGroup = normalizeAssessmentModes(parsed);
        return parsed;
    }
    catch {
        return null;
    }
};
const parseGroupRef = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!(parsed === null || parsed === void 0 ? void 0 : parsed.roundId) || !parsed.publishedAt)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
};
const getUserByLoginCode = async (req) => {
    const raw = req.headers['x-login-code'];
    if (!String(raw !== null && raw !== void 0 ? raw : '').trim())
        return null;
    return (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, raw);
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
const deleteRow = async (teacherId, lessonPath) => {
    await prisma.teacherLessonInstruction.deleteMany({
        where: { teacherId, lessonPath },
    });
};
const loadTeacherIndex = async (teacherId) => parseIndex(await readRow(teacherId, INDEX_PATH));
const saveIndex = async (teacherId, index) => {
    await writeRow(teacherId, INDEX_PATH, JSON.stringify(index));
};
const loadRound = async (teacherId, roundId) => parseRound(await readRow(teacherId, roundDataPath(roundId)));
const saveRound = async (teacherId, data) => {
    data.updatedAt = new Date().toISOString();
    await writeRow(teacherId, roundDataPath(data.id), JSON.stringify(data));
    return data;
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
    const i = index.rounds.findIndex((r) => r.id === data.id);
    if (i >= 0)
        index.rounds[i] = entry;
    else
        index.rounds.push(entry);
    index.rounds.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};
const loadTeacherGroupsWithStudents = async (teacherId) => prisma.learningGroup.findMany({
    where: { teacherId },
    select: {
        id: true,
        name: true,
        passiveStudentIds: true,
        students: {
            where: { role: 'STUDENT' },
            select: { id: true, name: true, avatarEmoji: true, avatarUrl: true },
            orderBy: { name: 'asc' },
        },
    },
    orderBy: { name: 'asc' },
});
const parsePassiveStudentIds = (raw) => {
    if (!(raw === null || raw === void 0 ? void 0 : raw.trim()))
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        return parsed.map((id) => String(id)).filter(Boolean);
    }
    catch {
        return [];
    }
};
const epoGroupUsesMssPoints = (groupName) => {
    if (!(groupName === null || groupName === void 0 ? void 0 : groupName.trim()))
        return false;
    const n = groupName.trim().toLowerCase();
    if (!n.includes('informatik'))
        return false;
    return /\bgk\s*11\b/.test(n);
};
const defaultAssessmentModeForGroupName = (groupName) => epoGroupUsesMssPoints(groupName) ? 'mss' : 'note';
const syncPublishedGroups = async (teacherId, data, groupIds, index, ownedGroupIds) => {
    const publishedAt = data.publishedAt || new Date().toISOString();
    const ref = {
        roundId: data.id,
        title: data.title,
        date: data.date,
        publishedAt,
    };
    const refJson = JSON.stringify(ref);
    for (const gid of groupIds) {
        await writeRow(teacherId, groupActivePath(gid), refJson);
        index.activeByGroup[gid] = data.id;
    }
    const ownedSet = new Set(ownedGroupIds);
    for (const gid of ownedGroupIds) {
        if (!ownedSet.has(gid))
            continue;
        if (groupIds.includes(gid))
            continue;
        if (index.activeByGroup[gid] !== data.id)
            continue;
        delete index.activeByGroup[gid];
        const scoped = parseGroupRef(await readRow(teacherId, groupActivePath(gid)));
        if ((scoped === null || scoped === void 0 ? void 0 : scoped.roundId) === data.id) {
            await deleteRow(teacherId, groupActivePath(gid));
        }
    }
};
const clearPublishedGroups = async (teacherId, roundId, index, ownedGroupIds) => {
    for (const gid of ownedGroupIds) {
        if (index.activeByGroup[gid] !== roundId)
            continue;
        delete index.activeByGroup[gid];
        const scoped = parseGroupRef(await readRow(teacherId, groupActivePath(gid)));
        if ((scoped === null || scoped === void 0 ? void 0 : scoped.roundId) === roundId) {
            await deleteRow(teacherId, groupActivePath(gid));
        }
    }
};
const findEntry = (round, studentId) => { var _a; return (_a = round.entries.find((e) => e.studentId === studentId)) !== null && _a !== void 0 ? _a : null; };
const upsertEntry = (round, entry) => {
    const rest = round.entries.filter((e) => e.studentId !== entry.studentId);
    rest.push(entry);
    round.entries = rest;
};
const resolveStudentRounds = async (studentId) => {
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
        for (const meta of index.rounds) {
            const payload = await loadRound(teacherId, meta.id);
            if (!payload)
                continue;
            for (const g of teacherGroups) {
                if (!payload.groupIds.includes(g.id))
                    continue;
                const entry = findEntry(payload, studentId);
                const hasHistory = Boolean(entry === null || entry === void 0 ? void 0 : entry.studentSubmittedAt) ||
                    Boolean(entry === null || entry === void 0 ? void 0 : entry.teacherReleasedAt) ||
                    Boolean(entry === null || entry === void 0 ? void 0 : entry.goalsSubmittedAt);
                const publishedForGroup = Boolean(payload.publishedAt) && payload.groupIds.includes(g.id);
                if (!publishedForGroup && !hasHistory)
                    continue;
                const key = `${meta.id}:${g.id}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                const isActiveForGroup = Boolean(payload.publishedAt) && index.activeByGroup[g.id] === meta.id;
                results.push({
                    teacherId,
                    teacherName: g.teacher.name,
                    roundId: meta.id,
                    payload,
                    groupId: g.id,
                    groupName: g.name,
                    isActiveForGroup,
                });
            }
        }
    }
    results.sort((a, b) => (a.payload.updatedAt < b.payload.updatedAt ? 1 : -1));
    return results;
};
const roundStats = (round) => {
    let submitted = 0;
    let graded = 0;
    let released = 0;
    let goals = 0;
    for (const e of round.entries) {
        if (e.studentSubmittedAt)
            submitted += 1;
        if (e.teacherGrade)
            graded += 1;
        if (e.teacherReleasedAt)
            released += 1;
        if (e.goalsSubmittedAt)
            goals += 1;
    }
    return { submitted, graded, released, goals };
};
const studentSessionDto = (resolved, studentId) => {
    const entry = findEntry(resolved.payload, studentId);
    const published = Boolean(resolved.payload.publishedAt);
    const isActive = resolved.isActiveForGroup;
    const teacherReleased = Boolean(entry === null || entry === void 0 ? void 0 : entry.teacherReleasedAt);
    const studentSubmitted = Boolean(entry === null || entry === void 0 ? void 0 : entry.studentSubmittedAt);
    const goalsSubmitted = Boolean(entry === null || entry === void 0 ? void 0 : entry.goalsSubmittedAt);
    const needsSelfAssessment = isActive && published && !studentSubmitted;
    const needsGoals = isActive && teacherReleased && !goalsSubmitted;
    const actionRequired = needsSelfAssessment || needsGoals;
    return {
        id: resolved.roundId,
        title: resolved.payload.title,
        date: resolved.payload.date,
        groupId: resolved.groupId,
        groupName: resolved.groupName,
        assessmentMode: assessmentModeForGroup(resolved.payload, resolved.groupId, resolved.groupName),
        publishedAt: resolved.payload.publishedAt,
        isActive,
        isArchived: !isActive,
        actionRequired,
        teacherReleased,
        studentSubmitted,
        goalsSubmitted,
        needsSelfAssessment,
        needsGoals,
    };
};
class EpoNotenController {
    static async list(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const index = await loadTeacherIndex(user.id);
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const items = await Promise.all(index.rounds.map(async (meta) => {
                const round = await loadRound(user.id, meta.id);
                const stats = round ? roundStats(round) : { submitted: 0, graded: 0, released: 0, goals: 0 };
                const activeGroups = groups
                    .filter((g) => index.activeByGroup[g.id] === meta.id)
                    .map((g) => ({ id: g.id, name: g.name }));
                return { ...meta, stats, activeGroups };
            }));
            return res.json({
                rounds: items,
                groups: groups.map((g) => ({
                    id: g.id,
                    name: g.name,
                    studentCount: g.students.length,
                    passiveStudentIds: parsePassiveStudentIds(g.passiveStudentIds),
                    students: g.students.map((s) => ({ id: s.id, name: s.name })),
                })),
            });
        }
        catch (error) {
            console.error('EpoNoten list error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async getById(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const round = await loadRound(user.id, roundId);
            if (!round)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
            round.assessmentModeByGroup = normalizeAssessmentModes(round, groupNameById);
            const passiveByGroup = new Map(groups.map((g) => [g.id, new Set(parsePassiveStudentIds(g.passiveStudentIds))]));
            const roundPublished = Boolean(round.publishedAt);
            const students = [];
            for (const g of groups) {
                if (!round.groupIds.includes(g.id))
                    continue;
                for (const s of g.students) {
                    const existing = findEntry(round, s.id);
                    const row = existing !== null && existing !== void 0 ? existing : {
                        studentId: s.id,
                        studentName: s.name,
                    };
                    students.push({
                        ...row,
                        studentId: s.id,
                        studentName: s.name,
                        avatarEmoji: s.avatarEmoji,
                        avatarUrl: s.avatarUrl,
                        groupId: g.id,
                    });
                }
            }
            const byId = new Map(students.map((s) => [s.studentId, s]));
            const merged = [...byId.values()].sort((a, b) => {
                const ea = a;
                const eb = b;
                const passiveIds = (gid) => {
                    var _a;
                    if (!gid)
                        return new Set();
                    return (_a = passiveByGroup.get(gid)) !== null && _a !== void 0 ? _a : new Set();
                };
                const pa = ea.groupId ? passiveIds(ea.groupId).has(ea.studentId) : false;
                const pb = eb.groupId ? passiveIds(eb.groupId).has(eb.studentId) : false;
                if (pa !== pb)
                    return pa ? 1 : -1;
                const pend = (e, passive) => {
                    if (passive || !roundPublished)
                        return false;
                    if (!e.studentSubmittedAt)
                        return true;
                    if (e.teacherReleasedAt && !e.goalsSubmittedAt)
                        return true;
                    return false;
                };
                const pendA = pend(ea, pa);
                const pendB = pend(eb, pb);
                if (pendA !== pendB)
                    return pendA ? -1 : 1;
                return ea.studentName.localeCompare(eb.studentName, 'de');
            });
            return res.json({ round, students: merged, stats: roundStats(round) });
        }
        catch (error) {
            console.error('EpoNoten getById error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async create(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : '';
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            const groupIds = Array.isArray((_b = req.body) === null || _b === void 0 ? void 0 : _b.groupIds)
                ? req.body.groupIds.map((g) => String(g).trim()).filter((id) => ownedIds.has(id))
                : [];
            const now = new Date().toISOString();
            const id = (0, crypto_1.randomUUID)();
            const data = {
                id,
                title,
                date: typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.date) === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10),
                groupIds,
                assessmentModeByGroup: Object.fromEntries(groupIds.map((gid) => {
                    const g = owned.find((x) => x.id === gid);
                    return [gid, defaultAssessmentModeForGroupName(g === null || g === void 0 ? void 0 : g.name)];
                })),
                publishedAt: null,
                entries: [],
                createdAt: now,
                updatedAt: now,
            };
            await saveRound(user.id, data);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, data);
            await saveIndex(user.id, index);
            return res.json({ success: true, round: data });
        }
        catch (error) {
            console.error('EpoNoten create error:', error);
            return res.status(500).json({ error: 'Fehler beim Erstellen' });
        }
    }
    static async update(req, res) {
        var _a, _b, _c, _d;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const existing = await loadRound(user.id, roundId);
            if (!existing)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            const groupNameById = new Map(owned.map((g) => [g.id, g.name]));
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : existing.title;
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            let groupIds = existing.groupIds;
            if (Array.isArray((_b = req.body) === null || _b === void 0 ? void 0 : _b.groupIds)) {
                groupIds = req.body.groupIds.map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
            }
            let assessmentModeByGroup = normalizeAssessmentModes({ ...existing, groupIds }, groupNameById);
            if (((_c = req.body) === null || _c === void 0 ? void 0 : _c.assessmentModeByGroup) && typeof req.body.assessmentModeByGroup === 'object') {
                const patch = req.body.assessmentModeByGroup;
                for (const gid of groupIds) {
                    const v = patch[gid];
                    if (v === 'mss' || v === 'note')
                        assessmentModeByGroup[gid] = v;
                }
            }
            for (const gid of groupIds) {
                if (epoGroupUsesMssPoints(groupNameById.get(gid))) {
                    assessmentModeByGroup[gid] = 'mss';
                }
            }
            const next = {
                ...existing,
                title,
                date: typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.date) === 'string' ? req.body.date.trim() : existing.date,
                groupIds,
                assessmentModeByGroup,
            };
            await saveRound(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            if (next.publishedAt) {
                await syncPublishedGroups(user.id, next, next.groupIds, index, owned.map((g) => g.id));
            }
            await saveIndex(user.id, index);
            return res.json({ success: true, round: next });
        }
        catch (error) {
            console.error('EpoNoten update error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async publishById(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const existing = await loadRound(user.id, roundId);
            if (!existing)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const ownedIds = new Set(owned.map((g) => g.id));
            let groupIds = existing.groupIds;
            if (Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupIds) && req.body.groupIds.length > 0) {
                groupIds = req.body.groupIds.map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
            }
            if (groupIds.length === 0) {
                return res.status(400).json({
                    error: 'Mindestens eine Lerngruppe auswählen (Häkchen bei der Gruppe setzen, dann freischalten).',
                });
            }
            const publishedAt = new Date().toISOString();
            const next = {
                ...existing,
                groupIds,
                publishedAt,
            };
            await saveRound(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            await syncPublishedGroups(user.id, next, groupIds, index, owned.map((g) => g.id));
            await saveIndex(user.id, index);
            return res.json({
                success: true,
                publishedAt,
                roundId,
                groupIds,
                groupNames: owned.filter((g) => groupIds.includes(g.id)).map((g) => g.name),
            });
        }
        catch (error) {
            console.error('EpoNoten publish error:', error);
            return res.status(500).json({ error: 'Fehler beim Freigeben' });
        }
    }
    static async unpublishById(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const existing = await loadRound(user.id, roundId);
            if (!existing)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const next = { ...existing, publishedAt: null };
            await saveRound(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            await clearPublishedGroups(user.id, roundId, index, owned.map((g) => g.id));
            await saveIndex(user.id, index);
            return res.json({ success: true });
        }
        catch (error) {
            console.error('EpoNoten unpublish error:', error);
            return res.status(500).json({ error: 'Fehler beim Zurücknehmen' });
        }
    }
    static async remove(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const index = await loadTeacherIndex(user.id);
            index.rounds = index.rounds.filter((r) => r.id !== roundId);
            for (const [gid, rid] of Object.entries(index.activeByGroup)) {
                if (rid === roundId)
                    delete index.activeByGroup[gid];
            }
            await saveIndex(user.id, index);
            await deleteRow(user.id, roundDataPath(roundId));
            const owned = await loadTeacherGroupsWithStudents(user.id);
            for (const g of owned) {
                const ref = parseGroupRef(await readRow(user.id, groupActivePath(g.id)));
                if ((ref === null || ref === void 0 ? void 0 : ref.roundId) === roundId)
                    await deleteRow(user.id, groupActivePath(g.id));
            }
            return res.json({ success: true });
        }
        catch (error) {
            console.error('EpoNoten remove error:', error);
            return res.status(500).json({ error: 'Fehler beim Löschen' });
        }
    }
    static async getCurrent(req, res) {
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role === 'STUDENT') {
                const roundIdQ = typeof req.query.roundId === 'string' ? req.query.roundId.trim() : '';
                const all = await resolveStudentRounds(user.id);
                if (all.length === 0) {
                    const groups = await prisma.learningGroup.findMany({
                        where: { students: { some: { id: user.id } } },
                        select: { teacherId: true, teacher: { select: { name: true } } },
                        take: 1,
                    });
                    if (groups.length === 0)
                        return res.status(404).json({ error: 'Keine Lerngruppe gefunden' });
                    return res.json({
                        sessions: [],
                        round: null,
                        myEntry: null,
                        teacherId: groups[0].teacherId,
                        teacherName: groups[0].teacher.name,
                    });
                }
                const resolved = roundIdQ
                    ? all.find((r) => r.roundId === roundIdQ) || all[0]
                    : all[0];
                const myEntry = findEntry(resolved.payload, user.id);
                const canEditSelf = resolved.isActiveForGroup &&
                    Boolean(resolved.payload.publishedAt) &&
                    !(myEntry === null || myEntry === void 0 ? void 0 : myEntry.teacherReleasedAt);
                const canEditGoals = resolved.isActiveForGroup && Boolean(myEntry === null || myEntry === void 0 ? void 0 : myEntry.teacherReleasedAt) && !(myEntry === null || myEntry === void 0 ? void 0 : myEntry.goalsSubmittedAt);
                return res.json({
                    sessions: all.map((r) => studentSessionDto(r, user.id)),
                    round: {
                        id: resolved.roundId,
                        title: resolved.payload.title,
                        date: resolved.payload.date,
                        publishedAt: resolved.payload.publishedAt,
                        groupId: resolved.groupId,
                        groupName: resolved.groupName,
                        assessmentMode: assessmentModeForGroup(resolved.payload, resolved.groupId, resolved.groupName),
                    },
                    myEntry,
                    canEditSelf,
                    canEditGoals,
                    teacherId: resolved.teacherId,
                    teacherName: resolved.teacherName,
                    roundId: resolved.roundId,
                });
            }
            const index = await loadTeacherIndex(user.id);
            const groups = await loadTeacherGroupsWithStudents(user.id);
            return res.json({
                teacherId: user.id,
                roundCount: index.rounds.length,
                publishedCount: index.rounds.filter((r) => r.publishedAt).length,
                groupCount: groups.length,
            });
        }
        catch (error) {
            console.error('EpoNoten getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async submitSelf(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur Schüler' });
            let teacherId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            let roundId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.roundId) === 'string' ? req.body.roundId.trim() : '';
            const allRounds = await resolveStudentRounds(user.id);
            if (!teacherId || !roundId) {
                const first = roundId ? allRounds.find((r) => r.roundId === roundId) : allRounds[0];
                if (!((_c = first === null || first === void 0 ? void 0 : first.payload) === null || _c === void 0 ? void 0 : _c.publishedAt)) {
                    return res.status(404).json({ error: 'Keine freigegebene EPO-Runde' });
                }
                teacherId = first.teacherId;
                roundId = first.roundId;
            }
            const resolvedRound = allRounds.find((r) => r.roundId === roundId && r.teacherId === teacherId);
            if (!(resolvedRound === null || resolvedRound === void 0 ? void 0 : resolvedRound.isActiveForGroup)) {
                return res.status(403).json({ error: 'Diese EPO-Runde ist nicht mehr aktiv' });
            }
            const payload = await loadRound(teacherId, roundId);
            if (!(payload === null || payload === void 0 ? void 0 : payload.publishedAt)) {
                return res.status(403).json({ error: 'EPO-Runde ist nicht freigegeben' });
            }
            const existing = findEntry(payload, user.id);
            if (existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) {
                return res.status(403).json({ error: 'Bewertung bereits freigegeben — keine Änderung mehr möglich' });
            }
            const selfScores = normalizeCategoryScores((_d = req.body) === null || _d === void 0 ? void 0 : _d.selfScores);
            const total = sumCategoryScores(selfScores);
            const mode = assessmentModeForGroup(payload, resolvedRound.groupId, resolvedRound.groupName);
            const selfGradeFromTable = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.selfGradeFromTable) === 'string' && req.body.selfGradeFromTable.trim()
                ? req.body.selfGradeFromTable.trim()
                : rasterResultFromTotal(mode, total);
            const suggestedGradeMode = mode;
            const entry = {
                studentId: user.id,
                studentName: user.name,
                suggestedGrade: typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.suggestedGrade) === 'string' ? req.body.suggestedGrade.trim() : '',
                suggestedGradeMode,
                justification: typeof ((_g = req.body) === null || _g === void 0 ? void 0 : _g.justification) === 'string' ? req.body.justification.trim() : '',
                selfScores,
                selfGradeFromTable,
                studentSubmittedAt: new Date().toISOString(),
                teacherScores: existing === null || existing === void 0 ? void 0 : existing.teacherScores,
                teacherGrade: existing === null || existing === void 0 ? void 0 : existing.teacherGrade,
                teacherReleasedAt: (_h = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _h !== void 0 ? _h : null,
                goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                goalsSubmittedAt: (_j = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _j !== void 0 ? _j : null,
            };
            upsertEntry(payload, entry);
            await saveRound(teacherId, payload);
            return res.json({ success: true, entry, totalPoints: total, selfGradeFromTable });
        }
        catch (error) {
            console.error('EpoNoten submitSelf error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async submitGoals(req, res) {
        var _a, _b, _c, _d;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur Schüler' });
            let teacherId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            let roundId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.roundId) === 'string' ? req.body.roundId.trim() : '';
            if (!teacherId || !roundId) {
                const first = (await resolveStudentRounds(user.id))[0];
                if (!first)
                    return res.status(404).json({ error: 'Keine EPO-Runde' });
                teacherId = first.teacherId;
                roundId = first.roundId;
            }
            const payload = await loadRound(teacherId, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const existing = findEntry(payload, user.id);
            if (!(existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt)) {
                return res.status(403).json({ error: 'Lehrerbewertung noch nicht freigegeben' });
            }
            const goal = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.goal) === 'string' ? req.body.goal.trim() : '';
            const goalAction = typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.goalAction) === 'string' ? req.body.goalAction.trim() : '';
            if (!goal || !goalAction) {
                return res.status(400).json({ error: 'Ziel und Handlung sind erforderlich' });
            }
            const entry = {
                ...existing,
                goal,
                goalAction,
                goalsSubmittedAt: new Date().toISOString(),
            };
            upsertEntry(payload, entry);
            await saveRound(teacherId, payload);
            return res.json({ success: true, entry });
        }
        catch (error) {
            console.error('EpoNoten submitGoals error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async saveTeacherEntry(req, res) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const studentId = String(req.params.studentId || '').trim();
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const student = groups.flatMap((g) => g.students).find((s) => s.id === studentId);
            if (!student)
                return res.status(404).json({ error: 'Schüler nicht gefunden' });
            const existing = findEntry(payload, studentId);
            const teacherScores = normalizeCategoryScores((_a = req.body) === null || _a === void 0 ? void 0 : _a.teacherScores);
            const total = sumCategoryScores(teacherScores);
            const computed = gradeFromTotalPoints(total);
            const teacherGrade = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.teacherGrade) === 'string' ? req.body.teacherGrade.trim() : (_c = existing === null || existing === void 0 ? void 0 : existing.teacherGrade) !== null && _c !== void 0 ? _c : '';
            const entry = {
                studentId,
                studentName: student.name,
                suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
                suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
                justification: existing === null || existing === void 0 ? void 0 : existing.justification,
                selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
                selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
                studentSubmittedAt: (_d = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _d !== void 0 ? _d : null,
                teacherScores,
                teacherGrade,
                teacherReleasedAt: (_e = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _e !== void 0 ? _e : null,
                goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                goalsSubmittedAt: (_f = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _f !== void 0 ? _f : null,
            };
            upsertEntry(payload, entry);
            await saveRound(user.id, payload);
            return res.json({ success: true, entry, totalPoints: total, computedGrade: computed });
        }
        catch (error) {
            console.error('EpoNoten saveTeacherEntry error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async releaseToStudents(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const all = Boolean((_a = req.body) === null || _a === void 0 ? void 0 : _a.all);
            const groupId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.groupId) === 'string' ? req.body.groupId.trim() : '';
            const studentIds = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.studentIds)
                ? req.body.studentIds.map((id) => String(id).trim()).filter(Boolean)
                : [];
            if (!all && !groupId && studentIds.length === 0) {
                return res.status(400).json({ error: 'studentIds, groupId oder all erforderlich' });
            }
            if (groupId && !payload.groupIds.includes(groupId)) {
                return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
            }
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
            const studentToGroup = new Map();
            for (const g of groups) {
                if (!payload.groupIds.includes(g.id))
                    continue;
                for (const s of g.students) {
                    studentToGroup.set(s.id, g.id);
                }
            }
            const now = new Date().toISOString();
            let count = 0;
            for (const entry of payload.entries) {
                if (entry.teacherReleasedAt)
                    continue;
                const entryGroupId = studentToGroup.get(entry.studentId);
                if (groupId && entryGroupId !== groupId)
                    continue;
                if (!all && studentIds.length > 0 && !studentIds.includes(entry.studentId))
                    continue;
                const mode = entryGroupId
                    ? assessmentModeForGroup(payload, entryGroupId, groupNameById.get(entryGroupId))
                    : 'note';
                const grade = effectiveTeacherGrade(entry, mode);
                if (!grade)
                    continue;
                entry.teacherGrade = grade;
                entry.teacherReleasedAt = now;
                count += 1;
            }
            await saveRound(user.id, payload);
            return res.json({ success: true, releasedCount: count });
        }
        catch (error) {
            console.error('EpoNoten release error:', error);
            return res.status(500).json({ error: 'Fehler bei der Freigabe' });
        }
    }
    /** Lehrkraft: Einträge löschen (ganze Runde oder eine Lerngruppe) */
    static async resetAllEntries(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            if (groupId) {
                if (!payload.groupIds.includes(groupId)) {
                    return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
                }
                const groups = await loadTeacherGroupsWithStudents(user.id);
                const group = groups.find((g) => g.id === groupId);
                if (!group)
                    return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
                const studentIds = new Set(group.students.map((s) => s.id));
                const before = payload.entries.length;
                payload.entries = payload.entries.filter((e) => !studentIds.has(e.studentId));
                const removed = before - payload.entries.length;
                await saveRound(user.id, payload);
                return res.json({ success: true, removedCount: removed, groupId });
            }
            const removed = payload.entries.length;
            payload.entries = [];
            await saveRound(user.id, payload);
            return res.json({ success: true, removedCount: removed });
        }
        catch (error) {
            console.error('EpoNoten resetAllEntries error:', error);
            return res.status(500).json({ error: 'Fehler beim Zurücksetzen' });
        }
    }
}
exports.EpoNotenController = EpoNotenController;
//# sourceMappingURL=EpoNotenController.js.map