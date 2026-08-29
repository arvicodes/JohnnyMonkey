"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryTicketController = void 0;
exports.resolveActiveEntryHeroImageIndexForUser = resolveActiveEntryHeroImageIndexForUser;
const client_1 = require("@prisma/client");
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const jmTeacherBackup_1 = require("../utils/jmTeacherBackup");
const teacherTicketStand_1 = require("../utils/teacherTicketStand");
const teacherScratchPadStore_1 = require("../utils/teacherScratchPadStore");
const prisma = new client_1.PrismaClient();
const ENTRY_TICKET_LEGACY_PATH = '__entry_ticket_active__';
/** Persistente eigene Fragensets der Lehrkraft (nicht nur Browser-localStorage). */
const ENTRY_TICKET_CUSTOM_SETS_PATH = '__entry_ticket_custom_sets__';
const entryTicketPathForGroup = (groupId) => `__entry_ticket_g_${groupId}__`;
const entryTicketDonePathForGroup = (groupId) => `__entry_ticket_done_g_${groupId}__`;
const groupIdFromEntryTicketPath = (path) => {
    var _a;
    if (!path)
        return null;
    const m = /^__entry_ticket_g_(.+)__$/.exec(path);
    return (_a = m === null || m === void 0 ? void 0 : m[1]) !== null && _a !== void 0 ? _a : null;
};
const clampHeroIndex = (n) => {
    if (typeof n !== 'number' || !Number.isInteger(n))
        return 0;
    return Math.min(9, Math.max(0, n));
};
const normalizeGradeParam = (raw) => {
    if (typeof raw !== 'string')
        return undefined;
    const g = raw.trim();
    if (!g || g.length > 120)
        return undefined;
    return g;
};
const normalizeTaskSeed = (raw) => {
    if (typeof raw !== 'number' || !Number.isFinite(raw))
        return undefined;
    return (Math.floor(raw) >>> 0);
};
const normalizeMaterialLessonPath = (raw) => {
    if (raw === null)
        return null;
    if (typeof raw !== 'string')
        return undefined;
    let p = raw.trim().replace(/\\/g, '/').replace(/\/+$/, '');
    if (!p || p.startsWith('__'))
        return null;
    // Absolute / gemischte Pfade → kanonisch „J-M-Reihen/…“
    if (p.startsWith('git-intern/')) {
        p = `J-M-Reihen/${p.slice('git-intern/'.length)}`;
    }
    else {
        const marker = 'J-M-Reihen/';
        const idx = p.indexOf(marker);
        if (idx >= 0)
            p = p.slice(idx);
    }
    return p || null;
};
const sameLessonPath = (a, b) => {
    const na = normalizeMaterialLessonPath(a) || '';
    const nb = normalizeMaterialLessonPath(b) || '';
    if (!na || !nb)
        return false;
    if (na === nb)
        return true;
    // Fallback: ein Pfad endet mit dem anderen (verschiedene Präfixe)
    return na.endsWith(`/${nb}`) || nb.endsWith(`/${na}`) || na.endsWith(nb) || nb.endsWith(na);
};
/** Play-Runde: begrenzt. Fragenset-Speicher: höher, sonst gehen neue Karten (z. B. Mathe 5) verloren. */
const PLAY_TASK_LIMIT = 80;
const CUSTOM_SET_TASK_LIMIT = 400;
const CUSTOM_SET_LESSON_LIMIT = 200;
const PLAY_FIELD_LIMIT = 8000;
/** Bilder in Fragenset-Karten (data-URL) brauchen deutlich mehr als die Play-Grenze. */
const CUSTOM_SET_FIELD_LIMIT = 400000;
const PLAY_INK_STROKE_LIMIT = 400;
const PLAY_INK_KEY_LIMIT = 80;
const sanitizeInkStrokes = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0)
        return undefined;
    return raw.slice(0, PLAY_INK_STROKE_LIMIT);
};
const sanitizePlayInkByKey = (raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return undefined;
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!key || key.length > 200)
            continue;
        const strokes = sanitizeInkStrokes(value);
        if (!strokes)
            continue;
        out[key] = strokes;
        if (Object.keys(out).length >= PLAY_INK_KEY_LIMIT)
            break;
    }
    return Object.keys(out).length > 0 ? out : undefined;
};
const normalizeTasksPayload = (raw, limit = PLAY_TASK_LIMIT, fieldLimit = PLAY_FIELD_LIMIT) => {
    if (!Array.isArray(raw))
        return undefined;
    const out = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object')
            continue;
        const r = row;
        const prompt = typeof r.prompt === 'string' ? r.prompt.trim() : '';
        const solution = typeof r.solution === 'string' ? r.solution.trim() : '';
        if (!prompt || !solution)
            continue;
        const sourceKey = typeof r.sourceKey === 'string' && r.sourceKey.trim().startsWith('c:')
            ? r.sourceKey.trim().slice(0, 160)
            : undefined;
        const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 80) : undefined;
        const ink = sanitizeInkStrokes(r.ink);
        out.push({
            category: typeof r.category === 'string' && r.category.trim() ? r.category.trim().slice(0, 80) : 'Eigen',
            prompt: prompt.slice(0, fieldLimit),
            solution: solution.slice(0, fieldLimit),
            ...(sourceKey ? { sourceKey } : {}),
            ...(id ? { id } : {}),
            ...(ink ? { ink } : {}),
        });
        if (out.length >= limit)
            break;
    }
    return out.length > 0 ? out : undefined;
};
const normalizeCustomSetPayload = (raw) => {
    var _a;
    if (!raw || typeof raw !== 'object')
        return undefined;
    const row = raw;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!id.startsWith('c_') || id.length < 4)
        return undefined;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim().slice(0, 120) : 'Fragenset';
    const lessonsRaw = Array.isArray(row.lessons) ? row.lessons : [];
    const lessons = [];
    for (const lessonRaw of lessonsRaw) {
        if (!lessonRaw || typeof lessonRaw !== 'object')
            continue;
        const lesson = lessonRaw;
        const lessonName = typeof lesson.lessonName === 'string' && lesson.lessonName.trim()
            ? lesson.lessonName.trim().slice(0, 160)
            : '';
        if (!lessonName)
            continue;
        const tasks = (_a = normalizeTasksPayload(lesson.tasks, CUSTOM_SET_TASK_LIMIT, CUSTOM_SET_FIELD_LIMIT)) !== null && _a !== void 0 ? _a : [];
        lessons.push({
            id: typeof lesson.id === 'string' && lesson.id.trim()
                ? lesson.id.trim().slice(0, 80)
                : `ls_${lessons.length + 1}`,
            lessonName,
            ...(typeof lesson.lessonKey === 'string' && lesson.lessonKey.trim()
                ? { lessonKey: lesson.lessonKey.trim().replace(/\\/g, '/').slice(0, 500) }
                : {}),
            ...(typeof lesson.topicName === 'string' && lesson.topicName.trim()
                ? { topicName: lesson.topicName.trim().slice(0, 120) }
                : {}),
            tasks,
        });
        if (lessons.length >= CUSTOM_SET_LESSON_LIMIT)
            break;
    }
    const wissen11 = lessons.filter((l) => /^wissen(\s+aus\s+der)?\s+11/i.test(l.lessonName));
    if (wissen11.length > 0) {
        const rest = lessons.filter((l) => !/^wissen(\s+aus\s+der)?\s+11/i.test(l.lessonName));
        let general = rest.find((l) => l.lessonKey === '__allgemein__' || /^allgemein(es)?$/i.test(l.lessonName));
        if (!general) {
            general = {
                id: 'ls_allgemein',
                lessonName: 'Allgemein',
                lessonKey: '__allgemein__',
                topicName: 'Allgemein',
                tasks: [],
            };
            rest.unshift(general);
        }
        const seen = new Set(general.tasks.map((t) => `${t.prompt}\n${t.solution}`));
        for (const lesson of wissen11) {
            for (const t of lesson.tasks) {
                const k = `${t.prompt}\n${t.solution}`;
                if (seen.has(k))
                    continue;
                seen.add(k);
                general.tasks.push(t);
            }
        }
        lessons.length = 0;
        lessons.push(...rest);
    }
    if (lessons.length === 0)
        return undefined;
    const reihePath = typeof row.reihePath === 'string' && row.reihePath.trim()
        ? row.reihePath.trim().replace(/\\/g, '/').slice(0, 500)
        : undefined;
    const reihePaths = [];
    const addReihe = (raw) => {
        if (typeof raw !== 'string' || !raw.trim())
            return;
        const n = raw.trim().replace(/\\/g, '/').slice(0, 500);
        if (n && !reihePaths.includes(n))
            reihePaths.push(n);
    };
    if (Array.isArray(row.reihePaths)) {
        for (const item of row.reihePaths)
            addReihe(item);
    }
    addReihe(reihePath);
    const notes = typeof row.notes === 'string' && row.notes.trim()
        ? row.notes.replace(/\r\n/g, '\n').slice(0, 4000)
        : undefined;
    const playInkByKey = sanitizePlayInkByKey(row.playInkByKey);
    return {
        id,
        name,
        ...(reihePaths[0] ? { reihePath: reihePaths[0] } : {}),
        ...(reihePaths.length > 0 ? { reihePaths } : {}),
        ...(notes ? { notes } : {}),
        ...(playInkByKey ? { playInkByKey } : {}),
        lessons,
    };
};
/** Lehrer-Notizen nie in Play-/SuS-Payloads (nur im privaten Fragenset-Speicher). */
function withoutCustomSetNotes(set) {
    if (!set)
        return undefined;
    const { notes: _omit, ...rest } = set;
    return rest;
}
const parsePayload = (raw) => {
    var _a;
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.startedAt !== 'string')
            return null;
        return {
            startedAt: parsed.startedAt,
            heroImageIndex: clampHeroIndex(parsed.heroImageIndex),
            grade: normalizeGradeParam(parsed.grade),
            taskSeed: normalizeTaskSeed(parsed.taskSeed),
            materialLessonPath: (_a = normalizeMaterialLessonPath(parsed.materialLessonPath)) !== null && _a !== void 0 ? _a : undefined,
            tasks: normalizeTasksPayload(parsed.tasks),
            customSet: withoutCustomSetNotes(normalizeCustomSetPayload(parsed.customSet)),
            ...(typeof parsed.completedAt === 'string' && parsed.completedAt.trim()
                ? { completedAt: parsed.completedAt.trim() }
                : {}),
        };
    }
    catch {
        return null;
    }
};
function archiveSetName(a) {
    var _a;
    return ((((_a = a.customSet) === null || _a === void 0 ? void 0 : _a.name) && a.customSet.name.trim()) ||
        (typeof a.grade === 'string' && a.grade.startsWith('c_')
            ? 'Fragenset'
            : a.grade
                ? `Klasse ${a.grade}`
                : 'Entry Ticket'));
}
function archiveCustomSetId(a) {
    var _a;
    return ((((_a = a.customSet) === null || _a === void 0 ? void 0 : _a.id) && a.customSet.id.trim()) ||
        (typeof a.grade === 'string' && a.grade.startsWith('c_') ? a.grade : null));
}
/** Erledigte Durchläufe, 1 = zuerst (ältestes completedAt). */
function numberedArchives(store) {
    const rows = store.archives
        .filter((a) => Array.isArray(a.tasks) && a.tasks.length > 0)
        .map((a) => {
        const completedAt = a.completedAt || a.startedAt;
        const sortMs = new Date(completedAt).getTime();
        return {
            ...a,
            completedAt,
            sortMs: Number.isFinite(sortMs) ? sortMs : 0,
        };
    });
    rows.sort((a, b) => a.sortMs - b.sortMs || a.startedAt.localeCompare(b.startedAt));
    return rows.map(({ sortMs: _sortMs, ...row }, i) => ({ ...row, index: i + 1 }));
}
const parseArchiveStore = (raw) => {
    if (!raw)
        return { archives: [] };
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.archives)) {
            const archives = parsed.archives
                .map((row) => {
                if (!row || typeof row !== 'object')
                    return null;
                const asPayload = parsePayload(JSON.stringify(row));
                if (!asPayload)
                    return null;
                const completedAt = typeof row.completedAt === 'string'
                    ? row.completedAt
                    : undefined;
                return completedAt ? { ...asPayload, completedAt } : asPayload;
            })
                .filter(Boolean);
            return { archives };
        }
        // Legacy: einzelne Payload-Zeile statt Store
        const single = parsePayload(raw);
        return single ? { archives: [single] } : { archives: [] };
    }
    catch {
        return { archives: [] };
    }
};
async function upsertArchiveForGroup(teacherId, groupId, payload) {
    var _a;
    const lessonPath = entryTicketDonePathForGroup(groupId);
    const row = await prisma.teacherLessonInstruction.findUnique({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        select: { content: true },
    });
    const store = parseArchiveStore(row === null || row === void 0 ? void 0 : row.content);
    const completedAt = new Date().toISOString();
    const entry = {
        ...payload,
        completedAt,
        materialLessonPath: (_a = normalizeMaterialLessonPath(payload.materialLessonPath)) !== null && _a !== void 0 ? _a : null,
    };
    // Append-only Historie: jedes „Erledigt“ behalten (1. Set, 2. Set, …).
    // getCompleted nutzt weiterhin den neuesten Treffer je Stundenpfad (.find auf unshift-Liste).
    let archives = [entry, ...store.archives];
    archives = archives.slice(0, 200);
    const content = JSON.stringify({ archives });
    await prisma.teacherLessonInstruction.upsert({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        create: { teacherId, lessonPath, content },
        update: { content },
    });
}
async function saveArchiveStore(teacherId, groupId, store) {
    const lessonPath = entryTicketDonePathForGroup(groupId);
    const content = JSON.stringify({ archives: store.archives.slice(0, 200) });
    await prisma.teacherLessonInstruction.upsert({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        create: { teacherId, lessonPath, content },
        update: { content },
    });
}
function countCustomSetTasks(set) {
    return (set.lessons || []).reduce((n, l) => { var _a; return n + (((_a = l.tasks) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
}
function mergeCustomSetMaps(into, set) {
    var _a;
    if (!(set === null || set === void 0 ? void 0 : set.id) || !set.id.startsWith('c_'))
        return;
    const prev = into.get(set.id);
    if (!prev || countCustomSetTasks(set) >= countCustomSetTasks(prev)) {
        const reihePaths = [
            ...(Array.isArray(set.reihePaths) ? set.reihePaths : []),
            ...(Array.isArray(prev === null || prev === void 0 ? void 0 : prev.reihePaths) ? prev.reihePaths : []),
            set.reihePath,
            prev === null || prev === void 0 ? void 0 : prev.reihePath,
        ].filter((p, i, a) => typeof p === 'string' && Boolean(p) && a.indexOf(p) === i);
        into.set(set.id, {
            id: set.id,
            name: set.name || 'Fragenset',
            lessons: Array.isArray(set.lessons) ? set.lessons : [],
            ...(reihePaths[0] ? { reihePath: reihePaths[0] } : {}),
            ...(reihePaths.length > 0 ? { reihePaths } : {}),
            ...(set.notes || (prev === null || prev === void 0 ? void 0 : prev.notes) ? { notes: (_a = set.notes) !== null && _a !== void 0 ? _a : prev === null || prev === void 0 ? void 0 : prev.notes } : {}),
        });
    }
}
async function loadStoredCustomSets(teacherId) {
    const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
            teacherId_lessonPath: { teacherId, lessonPath: ENTRY_TICKET_CUSTOM_SETS_PATH },
        },
        select: { content: true },
    });
    if (!(row === null || row === void 0 ? void 0 : row.content))
        return [];
    try {
        const parsed = JSON.parse(row.content);
        if (!Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.sets))
            return [];
        return parsed.sets
            .map((raw) => normalizeCustomSetPayload(raw))
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
function lessonFolderKey(lesson) {
    const raw = (lesson.lessonKey || lesson.lessonName || '').replace(/\\/g, '/').replace(/\/+$/, '');
    const name = raw.split('/').pop() || raw;
    return name.trim().toLowerCase();
}
function taskTextLen(task) {
    return ((task === null || task === void 0 ? void 0 : task.prompt) || '').length + ((task === null || task === void 0 ? void 0 : task.solution) || '').length;
}
/** Kürzerer Text derselben Karte (typisch: alter Tab) darf den längeren Stand nicht ersetzen. */
function preserveRicherTasks(existing, incoming) {
    const prevById = new Map(existing.map((s) => [s.id, s]));
    return incoming.map((set) => {
        const prev = prevById.get(set.id);
        if (!prev)
            return set;
        const prevTask = new Map();
        for (const lesson of prev.lessons) {
            for (const task of lesson.tasks || []) {
                if (task.id)
                    prevTask.set(task.id, task);
            }
        }
        const lessons = set.lessons.map((lesson) => ({
            ...lesson,
            tasks: (lesson.tasks || []).map((task) => {
                if (!task.id)
                    return task;
                const stored = prevTask.get(task.id);
                if (!stored)
                    return task;
                if (taskTextLen(stored) <= taskTextLen(task))
                    return task;
                return {
                    ...task,
                    prompt: (stored.prompt || '').length >= (task.prompt || '').length ? stored.prompt : task.prompt,
                    solution: (stored.solution || '').length >= (task.solution || '').length ? stored.solution : task.solution,
                };
            }),
        }));
        return { ...set, lessons };
    });
}
/** Leere Stunden im PUT dürfen gespeicherte Karten nicht löschen. */
function preserveNonEmptyLessons(existing, incoming) {
    const prevById = new Map(existing.map((s) => [s.id, s]));
    return incoming.map((set) => {
        const prev = prevById.get(set.id);
        if (!prev)
            return set;
        const prevLesson = new Map(prev.lessons.map((l) => [lessonFolderKey(l), l]));
        const lessons = set.lessons.map((lesson) => {
            var _a, _b;
            const stored = prevLesson.get(lessonFolderKey(lesson));
            if (stored && (((_a = lesson.tasks) === null || _a === void 0 ? void 0 : _a.length) || 0) === 0 && (((_b = stored.tasks) === null || _b === void 0 ? void 0 : _b.length) || 0) > 0) {
                return { ...lesson, tasks: stored.tasks };
            }
            return lesson;
        });
        return { ...set, lessons };
    });
}
async function saveStoredCustomSets(teacherId, sets, options) {
    const cleaned = sets
        .map((s) => normalizeCustomSetPayload(s))
        .filter(Boolean);
    const existing = await loadStoredCustomSets(teacherId);
    const merged = preserveRicherTasks(existing, preserveNonEmptyLessons(existing, cleaned));
    const payload = { sets: merged, savedAt: new Date().toISOString(), teacherId };
    await prisma.teacherLessonInstruction.upsert({
        where: {
            teacherId_lessonPath: { teacherId, lessonPath: ENTRY_TICKET_CUSTOM_SETS_PATH },
        },
        create: {
            teacherId,
            lessonPath: ENTRY_TICKET_CUSTOM_SETS_PATH,
            content: JSON.stringify({ sets: merged }),
        },
        update: { content: JSON.stringify({ sets: merged }) },
    });
    (0, jmTeacherBackup_1.writeTeacherLatestBackup)({ kind: 'tickets', payload });
    if ((options === null || options === void 0 ? void 0 : options.stamp) !== false) {
        (0, jmTeacherBackup_1.writeTeacherTimestampedBackup)({
            kind: 'tickets',
            label: teacherId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'tickets',
            payload,
            force: Boolean(options === null || options === void 0 ? void 0 : options.forceBackup),
        });
    }
}
/** Aus aktiven Signalen / Archiven Fragensets einsammeln (Wiederherstellung nach leerem localStorage). */
async function recoverCustomSetsFromSignals(teacherId) {
    const rows = await prisma.teacherLessonInstruction.findMany({
        where: {
            teacherId,
            OR: [
                { lessonPath: ENTRY_TICKET_LEGACY_PATH },
                { lessonPath: { startsWith: '__entry_ticket_g_' } },
                { lessonPath: { startsWith: '__entry_ticket_done_' } },
            ],
        },
        select: { content: true },
    });
    const byId = new Map();
    for (const row of rows) {
        try {
            const parsed = JSON.parse(row.content);
            mergeCustomSetMaps(byId, normalizeCustomSetPayload(parsed.customSet));
            if (Array.isArray(parsed.archives)) {
                for (const a of parsed.archives) {
                    mergeCustomSetMaps(byId, normalizeCustomSetPayload(a === null || a === void 0 ? void 0 : a.customSet));
                }
            }
        }
        catch {
            /* ignore */
        }
    }
    return Array.from(byId.values());
}
const getUserByLoginCode = async (req) => {
    const raw = req.headers['x-login-code'];
    if (!String(raw !== null && raw !== void 0 ? raw : '').trim())
        return null;
    return (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, raw);
};
const entryTicketGroupIdFromPath = (lessonPath) => {
    const m = /^__entry_ticket_g_(.+)__$/.exec(String(lessonPath || '').trim());
    return (m === null || m === void 0 ? void 0 : m[1]) || null;
};
async function resolveModeratorContext(studentId, opts) {
    const moderated = await prisma.learningGroup.findMany({
        where: { moderatorStudentId: studentId },
        select: { id: true, name: true, teacherId: true },
    });
    if (moderated.length === 0) {
        return { isModerator: false, learningGroupId: null, groupName: null };
    }
    const fromPath = (opts === null || opts === void 0 ? void 0 : opts.lessonPath) ? entryTicketGroupIdFromPath(opts.lessonPath) : null;
    if (fromPath) {
        const hit = moderated.find((g) => g.id === fromPath);
        if (hit) {
            return { isModerator: true, learningGroupId: hit.id, groupName: hit.name };
        }
        // Scoped-Signal für andere Gruppe → kein Moderator-Recht für dieses Ticket
        return { isModerator: false, learningGroupId: null, groupName: null };
    }
    if (opts === null || opts === void 0 ? void 0 : opts.teacherId) {
        const hit = moderated.find((g) => g.teacherId === opts.teacherId);
        if (hit) {
            return { isModerator: true, learningGroupId: hit.id, groupName: hit.name };
        }
        return { isModerator: false, learningGroupId: null, groupName: null };
    }
    // Ohne aktives Ticket: allgemeiner Moderator-Status (für Seiten-Gate)
    return {
        isModerator: true,
        learningGroupId: moderated[0].id,
        groupName: moderated[0].name,
    };
}
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
                learningGroupId: g.id,
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
                    learningGroupId: g.id,
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const learningGroupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.learningGroupId) === 'string' ? req.body.learningGroupId.trim() : '';
            const grade = normalizeGradeParam((_b = req.body) === null || _b === void 0 ? void 0 : _b.grade);
            const taskSeed = normalizeTaskSeed(typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.taskSeed) === 'string' ? Number(req.body.taskSeed) : (_d = req.body) === null || _d === void 0 ? void 0 : _d.taskSeed);
            const materialLessonPath = (_h = normalizeMaterialLessonPath((_f = (_e = req.body) === null || _e === void 0 ? void 0 : _e.lessonPath) !== null && _f !== void 0 ? _f : (_g = req.body) === null || _g === void 0 ? void 0 : _g.materialLessonPath)) !== null && _h !== void 0 ? _h : null;
            const tasks = normalizeTasksPayload((_j = req.body) === null || _j === void 0 ? void 0 : _j.tasks);
            const customSet = withoutCustomSetNotes(normalizeCustomSetPayload((_k = req.body) === null || _k === void 0 ? void 0 : _k.customSet));
            const syncTasks = ((_l = req.body) === null || _l === void 0 ? void 0 : _l.syncTasks) === true || ((_m = req.body) === null || _m === void 0 ? void 0 : _m.preserveSession) === true;
            const resolveExisting = async (lessonPath) => {
                const row = await prisma.teacherLessonInstruction.findUnique({
                    where: { teacherId_lessonPath: { teacherId: user.id, lessonPath } },
                    select: { content: true },
                });
                return parsePayload(row === null || row === void 0 ? void 0 : row.content);
            };
            const buildPayload = (existing) => {
                const keepSession = Boolean(syncTasks && (existing === null || existing === void 0 ? void 0 : existing.startedAt));
                return {
                    startedAt: keepSession ? existing.startedAt : new Date().toISOString(),
                    heroImageIndex: keepSession
                        ? clampHeroIndex(existing.heroImageIndex)
                        : Math.floor(Math.random() * 10),
                    ...(grade
                        ? { grade }
                        : (existing === null || existing === void 0 ? void 0 : existing.grade)
                            ? { grade: existing.grade }
                            : {}),
                    ...(taskSeed != null
                        ? { taskSeed }
                        : (existing === null || existing === void 0 ? void 0 : existing.taskSeed) != null
                            ? { taskSeed: existing.taskSeed }
                            : {}),
                    ...(materialLessonPath
                        ? { materialLessonPath }
                        : (existing === null || existing === void 0 ? void 0 : existing.materialLessonPath)
                            ? { materialLessonPath: existing.materialLessonPath }
                            : {}),
                    ...(tasks
                        ? { tasks }
                        : (existing === null || existing === void 0 ? void 0 : existing.tasks)
                            ? { tasks: existing.tasks }
                            : {}),
                    ...(customSet
                        ? { customSet }
                        : (existing === null || existing === void 0 ? void 0 : existing.customSet)
                            ? { customSet: existing.customSet }
                            : {}),
                };
            };
            const upsertRow = async (teacherId, lessonPath, payload) => {
                await prisma.teacherLessonInstruction.upsert({
                    where: {
                        teacherId_lessonPath: { teacherId, lessonPath },
                    },
                    create: {
                        teacherId,
                        lessonPath,
                        content: JSON.stringify(payload),
                    },
                    update: { content: JSON.stringify(payload) },
                });
            };
            if (learningGroupId) {
                const owned = await prisma.learningGroup.findFirst({
                    where: { id: learningGroupId, teacherId: user.id },
                    select: { id: true },
                });
                if (owned) {
                    const path = entryTicketPathForGroup(owned.id);
                    const existing = await resolveExisting(path);
                    const payload = buildPayload(existing);
                    await upsertRow(user.id, path, payload);
                    /** Gleicher Zeitstempel auch in Legacy-Zeile: Auflösung pro Lehrkraft im Schüler-GET nutzt Legacy als Fallback — sonst fehlt das Signal, wenn nur der Gruppenpfad geschrieben wurde und die Zuordnung/ID nicht passt. */
                    await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH, payload);
                    return res.json({
                        success: true,
                        startedAt: payload.startedAt,
                        lessonPath: path,
                        heroImageIndex: payload.heroImageIndex,
                        grade: (_o = payload.grade) !== null && _o !== void 0 ? _o : null,
                        taskSeed: (_p = payload.taskSeed) !== null && _p !== void 0 ? _p : null,
                        materialLessonPath: (_q = payload.materialLessonPath) !== null && _q !== void 0 ? _q : null,
                        tasks: (_r = payload.tasks) !== null && _r !== void 0 ? _r : null,
                        customSet: (_s = payload.customSet) !== null && _s !== void 0 ? _s : null,
                    });
                }
            }
            const existingLegacy = await resolveExisting(ENTRY_TICKET_LEGACY_PATH);
            const payload = buildPayload(existingLegacy);
            await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH, payload);
            const allGroups = await prisma.learningGroup.findMany({
                where: { teacherId: user.id },
                select: { id: true },
            });
            for (const g of allGroups) {
                await upsertRow(user.id, entryTicketPathForGroup(g.id), payload);
            }
            return res.json({
                success: true,
                startedAt: payload.startedAt,
                lessonPath: ENTRY_TICKET_LEGACY_PATH,
                heroImageIndex: payload.heroImageIndex,
                grade: (_t = payload.grade) !== null && _t !== void 0 ? _t : null,
                taskSeed: (_u = payload.taskSeed) !== null && _u !== void 0 ? _u : null,
                materialLessonPath: (_v = payload.materialLessonPath) !== null && _v !== void 0 ? _v : null,
                tasks: (_w = payload.tasks) !== null && _w !== void 0 ? _w : null,
                customSet: (_x = payload.customSet) !== null && _x !== void 0 ? _x : null,
            });
        }
        catch (error) {
            console.error('EntryTicket signal error:', error);
            return res.status(500).json({ error: 'Fehler beim Signalisieren' });
        }
    }
    /** Lehrer oder Klassen-Moderator: Entry Ticket beenden → archivieren für SuS-Materialien, Signal löschen */
    static async complete(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            let teacherId = null;
            let learningGroupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.learningGroupId) === 'string' ? req.body.learningGroupId.trim() : '';
            if (user.role === 'TEACHER') {
                teacherId = user.id;
                if (learningGroupId) {
                    const owned = await prisma.learningGroup.findFirst({
                        where: { id: learningGroupId, teacherId: user.id },
                        select: { id: true },
                    });
                    if (!owned) {
                        return res.status(403).json({ error: 'Lerngruppe nicht gefunden' });
                    }
                }
            }
            else if (user.role === 'STUDENT') {
                const mod = await resolveModeratorContext(user.id, learningGroupId
                    ? { lessonPath: entryTicketPathForGroup(learningGroupId) }
                    : undefined);
                if (!mod.isModerator || !mod.learningGroupId) {
                    return res.status(403).json({ error: 'Nur Lehrkräfte oder Klassen-Moderatoren' });
                }
                learningGroupId = mod.learningGroupId;
                const group = await prisma.learningGroup.findUnique({
                    where: { id: learningGroupId },
                    select: { teacherId: true },
                });
                teacherId = (_b = group === null || group === void 0 ? void 0 : group.teacherId) !== null && _b !== void 0 ? _b : null;
            }
            else {
                return res.status(403).json({ error: 'Nur Lehrkräfte oder Klassen-Moderatoren' });
            }
            if (!teacherId) {
                return res.status(400).json({ error: 'Lehrer nicht gefunden' });
            }
            const bodyTasks = normalizeTasksPayload((_c = req.body) === null || _c === void 0 ? void 0 : _c.tasks);
            const bodyMaterial = (_g = normalizeMaterialLessonPath((_e = (_d = req.body) === null || _d === void 0 ? void 0 : _d.materialLessonPath) !== null && _e !== void 0 ? _e : (_f = req.body) === null || _f === void 0 ? void 0 : _f.lessonPath)) !== null && _g !== void 0 ? _g : null;
            const bodyGrade = normalizeGradeParam((_h = req.body) === null || _h === void 0 ? void 0 : _h.grade);
            const bodySeed = normalizeTaskSeed(typeof ((_j = req.body) === null || _j === void 0 ? void 0 : _j.taskSeed) === 'string' ? Number(req.body.taskSeed) : (_k = req.body) === null || _k === void 0 ? void 0 : _k.taskSeed);
            const bodyHero = typeof ((_l = req.body) === null || _l === void 0 ? void 0 : _l.heroImageIndex) === 'number' || typeof ((_m = req.body) === null || _m === void 0 ? void 0 : _m.heroImageIndex) === 'string'
                ? clampHeroIndex(Number(req.body.heroImageIndex))
                : undefined;
            const bodyCustomSet = withoutCustomSetNotes(normalizeCustomSetPayload((_o = req.body) === null || _o === void 0 ? void 0 : _o.customSet));
            const enrichPayload = (base) => {
                const startedAt = (base === null || base === void 0 ? void 0 : base.startedAt) || new Date().toISOString();
                return {
                    startedAt,
                    heroImageIndex: bodyHero != null
                        ? bodyHero
                        : (base === null || base === void 0 ? void 0 : base.heroImageIndex) != null
                            ? clampHeroIndex(base.heroImageIndex)
                            : 0,
                    ...(bodyGrade
                        ? { grade: bodyGrade }
                        : (base === null || base === void 0 ? void 0 : base.grade)
                            ? { grade: base.grade }
                            : {}),
                    ...(bodySeed != null
                        ? { taskSeed: bodySeed }
                        : (base === null || base === void 0 ? void 0 : base.taskSeed) != null
                            ? { taskSeed: base.taskSeed }
                            : {}),
                    ...(bodyMaterial
                        ? { materialLessonPath: bodyMaterial }
                        : (base === null || base === void 0 ? void 0 : base.materialLessonPath)
                            ? { materialLessonPath: base.materialLessonPath }
                            : {}),
                    ...(bodyTasks
                        ? { tasks: bodyTasks }
                        : (base === null || base === void 0 ? void 0 : base.tasks)
                            ? { tasks: base.tasks }
                            : {}),
                    ...(bodyCustomSet
                        ? { customSet: bodyCustomSet }
                        : (base === null || base === void 0 ? void 0 : base.customSet)
                            ? { customSet: base.customSet }
                            : {}),
                };
            };
            const activeRows = await prisma.teacherLessonInstruction.findMany({
                where: {
                    teacherId,
                    OR: [
                        { lessonPath: ENTRY_TICKET_LEGACY_PATH },
                        { lessonPath: { startsWith: '__entry_ticket_g_' } },
                    ],
                },
                select: { lessonPath: true, content: true },
            });
            const byGroup = new Map();
            let legacyPayload = null;
            for (const row of activeRows) {
                const parsed = parsePayload(row.content);
                if (!(parsed === null || parsed === void 0 ? void 0 : parsed.startedAt))
                    continue;
                const gid = entryTicketGroupIdFromPath(row.lessonPath);
                if (gid) {
                    byGroup.set(gid, enrichPayload(parsed));
                }
                else if (row.lessonPath === ENTRY_TICKET_LEGACY_PATH) {
                    legacyPayload = enrichPayload(parsed);
                }
            }
            if (legacyPayload) {
                if (learningGroupId) {
                    if (!byGroup.has(learningGroupId))
                        byGroup.set(learningGroupId, legacyPayload);
                }
                else {
                    const allGroups = await prisma.learningGroup.findMany({
                        where: { teacherId },
                        select: { id: true },
                    });
                    for (const g of allGroups) {
                        if (!byGroup.has(g.id))
                            byGroup.set(g.id, legacyPayload);
                    }
                }
            }
            if (byGroup.size === 0 && learningGroupId) {
                const fallback = enrichPayload(null);
                if (((_p = fallback.tasks) === null || _p === void 0 ? void 0 : _p.length) || fallback.materialLessonPath) {
                    byGroup.set(learningGroupId, fallback);
                }
            }
            for (const [gid, payload] of byGroup.entries()) {
                // Immer archivieren, sobald Karten oder Stundenpfad da sind (SuS-Materialien)
                if (!((_q = payload.tasks) === null || _q === void 0 ? void 0 : _q.length) && !payload.materialLessonPath)
                    continue;
                await upsertArchiveForGroup(teacherId, gid, {
                    ...payload,
                    materialLessonPath: (_s = (_r = normalizeMaterialLessonPath(payload.materialLessonPath)) !== null && _r !== void 0 ? _r : normalizeMaterialLessonPath(bodyMaterial)) !== null && _s !== void 0 ? _s : null,
                });
            }
            /** Nur aktive Signale löschen — Archive (__entry_ticket_done_…) bleiben. */
            await prisma.teacherLessonInstruction.deleteMany({
                where: {
                    teacherId,
                    AND: [
                        {
                            OR: [
                                { lessonPath: ENTRY_TICKET_LEGACY_PATH },
                                { lessonPath: { startsWith: '__entry_ticket_g_' } },
                            ],
                        },
                        { NOT: { lessonPath: { startsWith: '__entry_ticket_done_' } } },
                    ],
                },
            });
            return res.json({
                success: true,
                learningGroupId: learningGroupId || null,
                archivedGroups: Array.from(byGroup.keys()),
            });
        }
        catch (error) {
            console.error('EntryTicket complete error:', error);
            return res.status(500).json({ error: 'Fehler beim Beenden' });
        }
    }
    /**
     * Abgeschlossenes Entry Ticket (für SuS-Materialien inkl. Lösungen).
     * Query: groupId, und lessonPath und/oder index (1 = zuerst erledigt).
     * Ohne index: neuestes Archiv dieser Stunde.
     */
    static async getCompleted(req, res) {
        var _a, _b, _c, _d, _e, _f;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            const lessonPathRaw = normalizeMaterialLessonPath(req.query.lessonPath);
            const groupId = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
            const indexRaw = typeof req.query.index === 'string' ? Number.parseInt(req.query.index, 10) : NaN;
            const archiveIndex = Number.isInteger(indexRaw) && indexRaw >= 1 ? indexRaw : null;
            if (!groupId || (!lessonPathRaw && !archiveIndex)) {
                return res.status(400).json({ error: 'groupId und lessonPath oder index erforderlich' });
            }
            const lessonPath = lessonPathRaw || '';
            const group = await prisma.learningGroup.findUnique({
                where: { id: groupId },
                select: {
                    id: true,
                    name: true,
                    teacherId: true,
                    students: { where: { id: user.id }, select: { id: true }, take: 1 },
                },
            });
            if (!group)
                return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
            const isTeacherOwner = user.role === 'TEACHER' && user.id === group.teacherId;
            const isStudentMember = user.role === 'STUDENT' && group.students.length > 0;
            if (!isTeacherOwner && !isStudentMember) {
                return res.status(403).json({ error: 'Kein Zugriff' });
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: {
                        teacherId: group.teacherId,
                        lessonPath: entryTicketDonePathForGroup(groupId),
                    },
                },
                select: { content: true },
            });
            const store = parseArchiveStore(row === null || row === void 0 ? void 0 : row.content);
            const numbered = numberedArchives(store);
            const hit = archiveIndex
                ? numbered.find((a) => a.index === archiveIndex) || null
                : numbered.filter((a) => sameLessonPath(a.materialLessonPath, lessonPath)).at(-1) ||
                    null;
            if (!hit || !((_a = hit.tasks) === null || _a === void 0 ? void 0 : _a.length)) {
                return res.json({
                    completed: false,
                    index: archiveIndex,
                    lessonPath: lessonPath || null,
                    learningGroupId: groupId,
                    groupName: group.name,
                    startedAt: null,
                    completedAt: null,
                    heroImageIndex: null,
                    grade: null,
                    taskSeed: null,
                    materialLessonPath: null,
                    tasks: null,
                    customSet: null,
                });
            }
            return res.json({
                completed: true,
                index: hit.index,
                lessonPath: hit.materialLessonPath || lessonPath || null,
                learningGroupId: groupId,
                groupName: group.name,
                startedAt: hit.startedAt,
                completedAt: hit.completedAt || null,
                heroImageIndex: (_b = hit.heroImageIndex) !== null && _b !== void 0 ? _b : 0,
                grade: (_c = hit.grade) !== null && _c !== void 0 ? _c : null,
                taskSeed: (_d = hit.taskSeed) !== null && _d !== void 0 ? _d : null,
                materialLessonPath: hit.materialLessonPath || lessonPath || null,
                tasks: (_e = hit.tasks) !== null && _e !== void 0 ? _e : null,
                customSet: (_f = hit.customSet) !== null && _f !== void 0 ? _f : null,
            });
        }
        catch (error) {
            console.error('EntryTicket getCompleted error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    /**
     * Alle erledigten Entry Tickets einer Lerngruppe (SuS-Dashboard).
     * Query: groupId — Nummerierung 1 = zuerst erledigt.
     */
    static async getCompletedList(req, res) {
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            const groupId = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
            if (!groupId) {
                return res.status(400).json({ error: 'groupId erforderlich' });
            }
            const group = await prisma.learningGroup.findUnique({
                where: { id: groupId },
                select: {
                    id: true,
                    name: true,
                    teacherId: true,
                    students: { where: { id: user.id }, select: { id: true }, take: 1 },
                },
            });
            if (!group)
                return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
            const isTeacherOwner = user.role === 'TEACHER' && user.id === group.teacherId;
            const isStudentMember = user.role === 'STUDENT' && group.students.length > 0;
            if (!isTeacherOwner && !isStudentMember) {
                return res.status(403).json({ error: 'Kein Zugriff' });
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: {
                        teacherId: group.teacherId,
                        lessonPath: entryTicketDonePathForGroup(groupId),
                    },
                },
                select: { content: true },
            });
            const items = numberedArchives(parseArchiveStore(row === null || row === void 0 ? void 0 : row.content)).map((a) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    index: a.index,
                    startedAt: a.startedAt,
                    completedAt: a.completedAt,
                    grade: (_a = a.grade) !== null && _a !== void 0 ? _a : null,
                    customSetId: archiveCustomSetId(a),
                    setName: archiveSetName(a),
                    reihePath: (_c = (_b = a.customSet) === null || _b === void 0 ? void 0 : _b.reihePath) !== null && _c !== void 0 ? _c : null,
                    materialLessonPath: (_d = a.materialLessonPath) !== null && _d !== void 0 ? _d : null,
                    taskCount: (_f = (_e = a.tasks) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0,
                });
            });
            return res.json({
                items,
                learningGroupId: groupId,
                groupName: group.name,
            });
        }
        catch (error) {
            console.error('EntryTicket getCompletedList error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    /**
     * Lehrkraft: erledigtes Entry Ticket aus der gemeinsamen Liste entfernen.
     * Body/Query: groupId, index (1 = zuerst erledigt).
     */
    static async deleteCompleted(req, res) {
        var _a, _b, _c, _d;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            }
            const groupId = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) || req.query.groupId || '').trim();
            const indexRaw = Number.parseInt(String((_d = (_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : req.query.index) !== null && _d !== void 0 ? _d : ''), 10);
            const archiveIndex = Number.isInteger(indexRaw) && indexRaw >= 1 ? indexRaw : null;
            if (!groupId || !archiveIndex) {
                return res.status(400).json({ error: 'groupId und index erforderlich' });
            }
            const group = await prisma.learningGroup.findUnique({
                where: { id: groupId },
                select: { id: true, name: true, teacherId: true },
            });
            if (!group)
                return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
            if (group.teacherId !== user.id) {
                return res.status(403).json({ error: 'Kein Zugriff' });
            }
            const row = await prisma.teacherLessonInstruction.findUnique({
                where: {
                    teacherId_lessonPath: {
                        teacherId: group.teacherId,
                        lessonPath: entryTicketDonePathForGroup(groupId),
                    },
                },
                select: { content: true },
            });
            const store = parseArchiveStore(row === null || row === void 0 ? void 0 : row.content);
            const numbered = numberedArchives(store);
            const hit = numbered.find((a) => a.index === archiveIndex);
            if (!hit) {
                return res.status(404).json({ error: 'Entry Ticket nicht gefunden' });
            }
            let removed = false;
            const archives = store.archives.filter((a) => {
                if (removed)
                    return true;
                const sameStart = a.startedAt === hit.startedAt;
                const sameDone = (a.completedAt || a.startedAt) === hit.completedAt;
                if (sameStart && sameDone) {
                    removed = true;
                    return false;
                }
                return true;
            });
            await saveArchiveStore(group.teacherId, groupId, { archives });
            const items = numberedArchives({ archives }).map((a) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    index: a.index,
                    startedAt: a.startedAt,
                    completedAt: a.completedAt,
                    grade: (_a = a.grade) !== null && _a !== void 0 ? _a : null,
                    customSetId: archiveCustomSetId(a),
                    setName: archiveSetName(a),
                    reihePath: (_c = (_b = a.customSet) === null || _b === void 0 ? void 0 : _b.reihePath) !== null && _c !== void 0 ? _c : null,
                    materialLessonPath: (_d = a.materialLessonPath) !== null && _d !== void 0 ? _d : null,
                    taskCount: (_f = (_e = a.tasks) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0,
                });
            });
            return res.json({
                success: true,
                items,
                learningGroupId: groupId,
                groupName: group.name,
            });
        }
        catch (error) {
            console.error('EntryTicket deleteCompleted error:', error);
            return res.status(500).json({ error: 'Fehler beim Entfernen' });
        }
    }
    /**
     * Lehrer-Historie: erledigte Entry-Ticket-Durchläufe.
     * Query optional: groupId, setId (Fragenset) — Nummerierung jeweils 1 = zuerst.
     */
    static async getHistory(req, res) {
        var _a, _b, _c, _d;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            }
            const groupIdFilter = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
            const setIdFilter = typeof req.query.setId === 'string' ? req.query.setId.trim() : '';
            const groups = await prisma.learningGroup.findMany({
                where: {
                    teacherId: user.id,
                    ...(groupIdFilter ? { id: groupIdFilter } : {}),
                },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            });
            const raw = [];
            for (const g of groups) {
                const row = await prisma.teacherLessonInstruction.findUnique({
                    where: {
                        teacherId_lessonPath: {
                            teacherId: user.id,
                            lessonPath: entryTicketDonePathForGroup(g.id),
                        },
                    },
                    select: { content: true },
                });
                const store = parseArchiveStore(row === null || row === void 0 ? void 0 : row.content);
                for (const a of store.archives) {
                    if (!((_a = a.tasks) === null || _a === void 0 ? void 0 : _a.length))
                        continue;
                    const completedAt = a.completedAt || a.startedAt;
                    const sortMs = new Date(completedAt).getTime();
                    const customSetId = (((_b = a.customSet) === null || _b === void 0 ? void 0 : _b.id) && a.customSet.id.trim()) ||
                        (typeof a.grade === 'string' && a.grade.startsWith('c_') ? a.grade : null);
                    if (setIdFilter && customSetId !== setIdFilter && a.grade !== setIdFilter) {
                        continue;
                    }
                    raw.push({
                        learningGroupId: g.id,
                        groupName: g.name,
                        startedAt: a.startedAt,
                        completedAt,
                        grade: a.grade,
                        customSetId,
                        setName: (((_c = a.customSet) === null || _c === void 0 ? void 0 : _c.name) && a.customSet.name.trim()) ||
                            (typeof a.grade === 'string' && a.grade.startsWith('c_')
                                ? 'Fragenset'
                                : a.grade
                                    ? `Klasse ${a.grade}`
                                    : 'Entry Ticket'),
                        materialLessonPath: (_d = a.materialLessonPath) !== null && _d !== void 0 ? _d : null,
                        tasks: a.tasks,
                        sortMs: Number.isFinite(sortMs) ? sortMs : 0,
                    });
                }
            }
            raw.sort((a, b) => a.sortMs - b.sortMs || a.startedAt.localeCompare(b.startedAt));
            const items = raw.map((row, i) => {
                var _a;
                return ({
                    index: i + 1,
                    learningGroupId: row.learningGroupId,
                    groupName: row.groupName,
                    startedAt: row.startedAt,
                    completedAt: row.completedAt,
                    grade: (_a = row.grade) !== null && _a !== void 0 ? _a : null,
                    customSetId: row.customSetId,
                    setName: row.setName,
                    materialLessonPath: row.materialLessonPath,
                    tasks: row.tasks,
                });
            });
            return res.json({
                items,
                learningGroupId: groupIdFilter || null,
                setId: setIdFilter || null,
            });
        }
        catch (error) {
            console.error('EntryTicket getHistory error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden der Historie' });
        }
    }
    static async getCurrent(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
                    const mod = await resolveModeratorContext(user.id);
                    if (groups.length === 0) {
                        return res.json({
                            startedAt: null,
                            teacherId: null,
                            teacherName: null,
                            lessonPath: null,
                            heroImageIndex: null,
                            grade: null,
                            taskSeed: null,
                            materialLessonPath: null,
                            tasks: null,
                            customSet: null,
                            isModerator: mod.isModerator,
                            learningGroupId: mod.learningGroupId,
                            groupName: mod.groupName,
                        });
                    }
                    return res.json({
                        startedAt: null,
                        teacherId: groups[0].teacherId,
                        teacherName: groups[0].teacher.name,
                        lessonPath: null,
                        heroImageIndex: null,
                        grade: null,
                        taskSeed: null,
                        materialLessonPath: null,
                        tasks: null,
                        customSet: null,
                        isModerator: mod.isModerator,
                        learningGroupId: mod.learningGroupId,
                        groupName: mod.groupName,
                    });
                }
                const mod = await resolveModeratorContext(user.id, {
                    lessonPath: resolved.lessonPath,
                    teacherId: resolved.teacherId,
                });
                return res.json({
                    startedAt: resolved.payload.startedAt,
                    teacherId: resolved.teacherId,
                    teacherName: resolved.teacherName,
                    lessonPath: resolved.lessonPath,
                    heroImageIndex: (_a = resolved.payload.heroImageIndex) !== null && _a !== void 0 ? _a : 0,
                    grade: (_b = resolved.payload.grade) !== null && _b !== void 0 ? _b : null,
                    taskSeed: (_c = resolved.payload.taskSeed) !== null && _c !== void 0 ? _c : null,
                    materialLessonPath: (_d = resolved.payload.materialLessonPath) !== null && _d !== void 0 ? _d : null,
                    tasks: (_e = resolved.payload.tasks) !== null && _e !== void 0 ? _e : null,
                    customSet: (_f = resolved.payload.customSet) !== null && _f !== void 0 ? _f : null,
                    isModerator: mod.isModerator,
                    learningGroupId: mod.learningGroupId || resolved.learningGroupId || null,
                    groupName: mod.groupName,
                });
            }
            const teacherResolved = await resolveLatestEntryTicketForTeacher(user.id);
            if (!((_g = teacherResolved === null || teacherResolved === void 0 ? void 0 : teacherResolved.payload) === null || _g === void 0 ? void 0 : _g.startedAt)) {
                return res.json({
                    startedAt: null,
                    teacherId: user.id,
                    teacherName: user.name,
                    lessonPath: null,
                    heroImageIndex: null,
                    grade: null,
                    taskSeed: null,
                    materialLessonPath: null,
                    tasks: null,
                    customSet: null,
                    learningGroupId: null,
                });
            }
            return res.json({
                startedAt: teacherResolved.payload.startedAt,
                teacherId: user.id,
                teacherName: user.name,
                lessonPath: teacherResolved.lessonPath,
                heroImageIndex: (_h = teacherResolved.payload.heroImageIndex) !== null && _h !== void 0 ? _h : 0,
                grade: (_j = teacherResolved.payload.grade) !== null && _j !== void 0 ? _j : null,
                taskSeed: (_k = teacherResolved.payload.taskSeed) !== null && _k !== void 0 ? _k : null,
                materialLessonPath: (_l = teacherResolved.payload.materialLessonPath) !== null && _l !== void 0 ? _l : null,
                tasks: (_m = teacherResolved.payload.tasks) !== null && _m !== void 0 ? _m : null,
                customSet: (_o = teacherResolved.payload.customSet) !== null && _o !== void 0 ? _o : null,
                learningGroupId: groupIdFromEntryTicketPath(teacherResolved.lessonPath),
            });
        }
        catch (error) {
            console.error('EntryTicket getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    /** Eigene Fragensets der Lehrkraft (Server-Backup + Wiederherstellung aus Signalen). */
    static async getCustomSets(req, res) {
        var _a;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            }
            const fromFile = (0, teacherTicketStand_1.readTicketsLatest)();
            if ((0, teacherScratchPadStore_1.standPulledRecently)() && ((_a = fromFile === null || fromFile === void 0 ? void 0 : fromFile.sets) === null || _a === void 0 ? void 0 : _a.length)) {
                const fileSets = fromFile.sets
                    .map((s) => normalizeCustomSetPayload(s))
                    .filter(Boolean);
                if (fileSets.length > 0) {
                    return res.json({ sets: fileSets, standPulled: (0, teacherScratchPadStore_1.standPulledRecently)() });
                }
            }
            let sets = await loadStoredCustomSets(user.id);
            if (sets.length === 0) {
                const recovered = await recoverCustomSetsFromSignals(user.id);
                if (recovered.length > 0) {
                    await saveStoredCustomSets(user.id, recovered);
                    sets = recovered;
                }
            }
            else {
                // Fehlende Sets aus laufenden Signalen nachziehen (z. B. KI / Analysis)
                const recovered = await recoverCustomSetsFromSignals(user.id);
                if (recovered.length > 0) {
                    const byId = new Map(sets.map((s) => [s.id, s]));
                    let changed = false;
                    for (const s of recovered) {
                        const prev = byId.get(s.id);
                        if (!prev || countCustomSetTasks(s) > countCustomSetTasks(prev)) {
                            byId.set(s.id, s);
                            changed = true;
                        }
                    }
                    if (changed) {
                        sets = Array.from(byId.values());
                        await saveStoredCustomSets(user.id, sets);
                    }
                }
            }
            return res.json({ sets });
        }
        catch (error) {
            console.error('EntryTicket getCustomSets error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden der Fragensets' });
        }
    }
    static async saveCustomSets(req, res) {
        var _a, _b, _c, _d;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            }
            if ((0, teacherScratchPadStore_1.standPulledRecently)() && !((_a = req.body) === null || _a === void 0 ? void 0 : _a.seenStandPull)) {
                const existing = await loadStoredCustomSets(user.id);
                const fromFile = (0, teacherTicketStand_1.readTicketsLatest)();
                return res.json({
                    success: true,
                    kept: true,
                    count: ((_b = fromFile === null || fromFile === void 0 ? void 0 : fromFile.sets) === null || _b === void 0 ? void 0 : _b.length) || existing.length,
                });
            }
            const rawSets = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.sets) ? req.body.sets : [];
            const sets = rawSets
                .map((s) => normalizeCustomSetPayload(s))
                .filter(Boolean);
            if (sets.length === 0) {
                const existing = await loadStoredCustomSets(user.id);
                if (existing.length > 0) {
                    return res.json({ success: true, count: existing.length, kept: true });
                }
            }
            await saveStoredCustomSets(user.id, sets, {
                forceBackup: Boolean((_d = req.body) === null || _d === void 0 ? void 0 : _d.forceBackup),
            });
            return res.json({ success: true, count: sets.length });
        }
        catch (error) {
            console.error('EntryTicket saveCustomSets error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern der Fragensets' });
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