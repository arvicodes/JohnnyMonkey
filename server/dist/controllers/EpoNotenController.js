"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpoNotenController = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const webUntisStudentList_1 = require("../utils/webUntisStudentList");
const epoNotenVariants_1 = require("../lib/epoNotenVariants");
const epoNotenVariantPresets_1 = require("../lib/epoNotenVariantPresets");
const epoNotenScoring_1 = require("../lib/epoNotenScoring");
const gradeScale_1 = require("../lib/gradeScale");
const epoNotenGradingSchemaIntegrate_1 = require("../lib/epoNotenGradingSchemaIntegrate");
const prisma = new client_1.PrismaClient();
const INDEX_PATH = '__epo_noten_index__';
const roundDataPath = (roundId) => `__epo_noten_e_${roundId}__`;
const groupActivePath = (groupId) => `__epo_noten_g_${groupId}__`;
const CATEGORY_COUNT = 5;
const EPO_NOTEN_MAX_POINTS = 15;
const gradeFromTotalPoints = (total) => (0, gradeScale_1.pointsOnScaleToGradeTendency)(total, EPO_NOTEN_MAX_POINTS);
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
const groupWorkflow = (payload, groupId) => {
    var _a, _b, _c, _d;
    const w = (_b = (_a = payload.groupMeta) === null || _a === void 0 ? void 0 : _a[groupId]) === null || _b === void 0 ? void 0 : _b.workflow;
    if (w === 'teacher_raster' || w === 'self_no_raster' || w === 'teacher_only')
        return w;
    if ((_d = (_c = payload.groupMeta) === null || _c === void 0 ? void 0 : _c[groupId]) === null || _d === void 0 ? void 0 : _d.selfAssessmentOnly)
        return 'self_no_raster';
    return 'standard';
};
const groupSelfAssessmentOnly = (payload, groupId) => groupWorkflow(payload, groupId) === 'self_no_raster';
const groupTeacherUsesRaster = (payload, groupId) => {
    var _a, _b, _c;
    const m = (_a = payload.groupMeta) === null || _a === void 0 ? void 0 : _a[groupId];
    if ((m === null || m === void 0 ? void 0 : m.teacherRasterEnabled) === false)
        return false;
    if ((m === null || m === void 0 ? void 0 : m.selfAssessmentEnabled) === false && (m === null || m === void 0 ? void 0 : m.teacherRasterEnabled) !== true)
        return false;
    if (groupWorkflow(payload, groupId) === 'teacher_only')
        return false;
    const variantId = (_c = (_b = payload.variantIdByGroup) === null || _b === void 0 ? void 0 : _b[groupId]) !== null && _c !== void 0 ? _c : payload.variantId;
    return variantId != null && variantId !== epoNotenVariantPresets_1.EPO_NO_VARIANT_ID;
};
const effectiveTeacherGrade = (payload, groupId, entry, mode, weightsPercent) => {
    var _a;
    const trimmed = (_a = entry.teacherGrade) === null || _a === void 0 ? void 0 : _a.trim();
    if (trimmed)
        return trimmed;
    if (!groupTeacherUsesRaster(payload, groupId))
        return '';
    const scores = normalizeCategoryScores(entry.teacherScores);
    if (!allCategoriesSelected(scores))
        return '';
    return rasterResultFromTotal(mode, (0, epoNotenScoring_1.epoRoundedPoints)(scores, weightsPercent));
};
const priorEpoGradesForGroup = async (teacherId, currentRoundId, groupId, groups) => {
    var _a, _b;
    const index = await loadTeacherIndex(teacherId);
    const chron = [...index.rounds]
        .filter((r) => r.groupIds.includes(groupId))
        .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0)
            return byDate;
        return a.createdAt.localeCompare(b.createdAt);
    });
    const curIdx = chron.findIndex((r) => r.id === currentRoundId);
    if (curIdx <= 0)
        return {};
    const groupName = (_a = groups.find((g) => g.id === groupId)) === null || _a === void 0 ? void 0 : _a.name;
    const out = {};
    for (const meta of chron.slice(0, curIdx)) {
        const payload = await loadRound(teacherId, meta.id);
        if (!payload)
            continue;
        const variantCats = await roundCategoryTexts(teacherId, payload, groupId);
        const mode = assessmentModeForGroup(payload, groupId, groupName);
        const group = groups.find((g) => g.id === groupId);
        if (!group)
            continue;
        for (const s of group.students) {
            const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
            const entry = findEntry(payload, s.id, groupId, gidsInRound);
            if (!entry)
                continue;
            const grade = effectiveTeacherGrade(payload, groupId, entry, mode, variantCats.categoryWeightsPercent);
            if (!grade.trim())
                continue;
            const list = (_b = out[s.id]) !== null && _b !== void 0 ? _b : [];
            list.push({
                roundTitle: payload.title,
                roundDate: payload.date,
                grade,
                assessmentMode: mode,
            });
            out[s.id] = list;
        }
    }
    return out;
};
const entryRequiresStudentSelf = (payload, groupId, entry) => {
    var _a;
    if ((entry === null || entry === void 0 ? void 0 : entry.withoutSelfAssessment) || (entry === null || entry === void 0 ? void 0 : entry.teacherGradeOnly))
        return false;
    const gm = (_a = payload.groupMeta) === null || _a === void 0 ? void 0 : _a[groupId];
    if ((gm === null || gm === void 0 ? void 0 : gm.selfAssessmentEnabled) === false)
        return false;
    if (groupWorkflow(payload, groupId) === 'teacher_only')
        return false;
    return true;
};
const entryStudentUsesSelfRaster = (payload, groupId, entry, useRaster) => {
    var _a;
    if (!entryRequiresStudentSelf(payload, groupId, entry))
        return false;
    if (!useRaster)
        return false;
    if ((entry === null || entry === void 0 ? void 0 : entry.selfUsesRaster) === false)
        return false;
    if ((entry === null || entry === void 0 ? void 0 : entry.selfUsesRaster) === true)
        return true;
    const gm = (_a = payload.groupMeta) === null || _a === void 0 ? void 0 : _a[groupId];
    const wf = groupWorkflow(payload, groupId);
    if (wf === 'self_no_raster' || wf === 'teacher_only')
        return false;
    if ((gm === null || gm === void 0 ? void 0 : gm.teacherRasterEnabled) === false)
        return false;
    return true;
};
const applyGroupEpoFeaturesToStudents = (payload, groupId, flags, groups) => {
    var _a, _b, _c, _d;
    const group = groups.find((g) => g.id === groupId);
    if (!group)
        return;
    if (!payload.variantIdByGroup || typeof payload.variantIdByGroup !== 'object') {
        payload.variantIdByGroup = {};
    }
    if (!flags.self && !flags.raster) {
        payload.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_NO_VARIANT_ID;
    }
    else if (flags.raster) {
        const cur = payload.variantIdByGroup[groupId];
        if (!cur || cur === epoNotenVariantPresets_1.EPO_NO_VARIANT_ID) {
            payload.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_VARIANT2_ID;
        }
    }
    else {
        payload.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_NO_VARIANT_ID;
    }
    const fields = {
        withoutSelfAssessment: !flags.self,
        teacherGradeOnly: !flags.self && !flags.raster,
        goalsWaived: !flags.goals,
        selfUsesRaster: flags.self && flags.raster ? true : flags.self && !flags.raster ? false : undefined,
    };
    for (const s of group.students) {
        const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
        const existing = findEntry(payload, s.id, groupId, gidsInRound);
        if (existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt)
            continue;
        const keepRasterScores = flags.raster || Boolean(existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt);
        const entry = {
            studentId: s.id,
            groupId,
            studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
            suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
            suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
            justification: existing === null || existing === void 0 ? void 0 : existing.justification,
            selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
            selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
            studentSubmittedAt: (_a = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _a !== void 0 ? _a : null,
            teacherScores: keepRasterScores ? existing === null || existing === void 0 ? void 0 : existing.teacherScores : undefined,
            teacherGrade: (_b = existing === null || existing === void 0 ? void 0 : existing.teacherGrade) !== null && _b !== void 0 ? _b : '',
            teacherReleasedAt: (_c = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _c !== void 0 ? _c : null,
            goal: existing === null || existing === void 0 ? void 0 : existing.goal,
            goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
            goalsSubmittedAt: (_d = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _d !== void 0 ? _d : null,
            teacherJustification: existing === null || existing === void 0 ? void 0 : existing.teacherJustification,
            ...fields,
        };
        upsertEntry(payload, entry);
    }
};
const applyGroupWorkflowToStudents = (payload, groupId, workflow, groups) => {
    var _a, _b, _c;
    const group = groups.find((g) => g.id === groupId);
    if (!group)
        return;
    if (!payload.variantIdByGroup || typeof payload.variantIdByGroup !== 'object') {
        payload.variantIdByGroup = {};
    }
    if (workflow === 'teacher_only') {
        payload.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_NO_VARIANT_ID;
    }
    else {
        const cur = payload.variantIdByGroup[groupId];
        if (!cur || cur === epoNotenVariantPresets_1.EPO_NO_VARIANT_ID) {
            payload.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_VARIANT2_ID;
        }
    }
    for (const s of group.students) {
        const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
        const existing = findEntry(payload, s.id, groupId, gidsInRound);
        if (existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt)
            continue;
        const entry = {
            studentId: s.id,
            groupId,
            studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
            suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
            suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
            justification: existing === null || existing === void 0 ? void 0 : existing.justification,
            selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
            selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
            studentSubmittedAt: (_a = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _a !== void 0 ? _a : null,
            teacherScores: existing === null || existing === void 0 ? void 0 : existing.teacherScores,
            teacherGrade: existing === null || existing === void 0 ? void 0 : existing.teacherGrade,
            teacherReleasedAt: (_b = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _b !== void 0 ? _b : null,
            goal: existing === null || existing === void 0 ? void 0 : existing.goal,
            goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
            goalsSubmittedAt: (_c = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _c !== void 0 ? _c : null,
            withoutSelfAssessment: workflow === 'teacher_raster',
            teacherGradeOnly: workflow === 'teacher_only',
            goalsWaived: workflow === 'self_no_raster' || workflow === 'teacher_only',
            teacherJustification: existing === null || existing === void 0 ? void 0 : existing.teacherJustification,
        };
        if (workflow === 'standard') {
            entry.withoutSelfAssessment = false;
            entry.teacherGradeOnly = false;
            entry.goalsWaived = Boolean(existing === null || existing === void 0 ? void 0 : existing.goalsWaived);
        }
        upsertEntry(payload, entry);
    }
};
const entryGoalsWaived = (payload, groupId, entry) => {
    var _a, _b;
    return Boolean(entry === null || entry === void 0 ? void 0 : entry.goalsWaived) ||
        groupSelfAssessmentOnly(payload, groupId) ||
        ((_b = (_a = payload.groupMeta) === null || _a === void 0 ? void 0 : _a[groupId]) === null || _b === void 0 ? void 0 : _b.goalsEnabled) === false;
};
const usesPerGroupPublish = (payload) => {
    const meta = payload.groupMeta;
    if (!meta || typeof meta !== 'object')
        return false;
    return Object.entries(meta).some(([gid, m]) => payload.groupIds.includes(gid) && Boolean(m === null || m === void 0 ? void 0 : m.publishedAt));
};
const isGroupPublishedForStudents = (payload, groupId) => {
    var _a;
    if (!payload.groupIds.includes(groupId))
        return false;
    const gm = (_a = payload.groupMeta) === null || _a === void 0 ? void 0 : _a[groupId];
    if (gm === null || gm === void 0 ? void 0 : gm.publishedAt)
        return true;
    if (usesPerGroupPublish(payload))
        return false;
    return Boolean(payload.publishedAt);
};
const ensureGroupMeta = (payload) => {
    if (!payload.groupMeta || typeof payload.groupMeta !== 'object')
        payload.groupMeta = {};
    return payload.groupMeta;
};
const markGroupsPublished = (payload, groupIds, publishedAt) => {
    const meta = ensureGroupMeta(payload);
    for (const gid of groupIds) {
        meta[gid] = { ...meta[gid], publishedAt };
    }
};
const clearAllGroupPublishMeta = (payload) => {
    const meta = ensureGroupMeta(payload);
    for (const gid of payload.groupIds) {
        if (meta[gid])
            meta[gid] = { ...meta[gid], publishedAt: null };
    }
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
        if (!parsed.groupMeta || typeof parsed.groupMeta !== 'object')
            parsed.groupMeta = {};
        if (parsed.variantId != null && typeof parsed.variantId !== 'string')
            parsed.variantId = null;
        if (!parsed.variantIdByGroup || typeof parsed.variantIdByGroup !== 'object')
            parsed.variantIdByGroup = {};
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
const loadRound = async (teacherId, roundId) => {
    const round = parseRound(await readRow(teacherId, roundDataPath(roundId)));
    if (!round)
        return null;
    const groups = await loadTeacherGroupsWithStudents(teacherId);
    if (normalizeMultiGroupEntries(round, groups)) {
        await saveRound(teacherId, round);
    }
    return round;
};
const saveRound = async (teacherId, data) => {
    data.updatedAt = new Date().toISOString();
    await writeRow(teacherId, roundDataPath(data.id), JSON.stringify(data));
    return data;
};
const loadVariantsStore = async (teacherId) => (0, epoNotenVariants_1.parseVariantsStore)(await readRow(teacherId, epoNotenVariants_1.EPO_VARIANTS_PATH));
const saveVariantsStore = async (teacherId, store) => {
    await writeRow(teacherId, epoNotenVariants_1.EPO_VARIANTS_PATH, JSON.stringify(store));
};
const roundCategoryTexts = async (teacherId, payload, groupId) => {
    const effectiveId = (0, epoNotenVariants_1.effectiveEpoVariantIdForGroup)(payload, groupId);
    if (!effectiveId) {
        return {
            variantId: null,
            variantName: null,
            useRaster: false,
            categoryTitles: [],
            categoryWeightsPercent: undefined,
            studentCategories: [],
            teacherCategories: [],
        };
    }
    const store = await loadVariantsStore(teacherId);
    const variant = (0, epoNotenVariants_1.resolveVariant)(store, effectiveId);
    return {
        variantId: variant.id,
        variantName: variant.name,
        useRaster: true,
        categoryTitles: variant.categoryTitles,
        categoryWeightsPercent: variant.categoryWeightsPercent,
        studentCategories: variant.studentCategories,
        teacherCategories: variant.teacherCategories,
    };
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
const epoGroupUsesNoteByDefault = (groupName) => {
    if (!(groupName === null || groupName === void 0 ? void 0 : groupName.trim()))
        return false;
    const n = groupName.trim().toLowerCase();
    return /\b5a\b/.test(n) || /\b5c\b/.test(n);
};
const epoGroupUsesMssPoints = (groupName) => {
    if (!(groupName === null || groupName === void 0 ? void 0 : groupName.trim()))
        return false;
    if (epoGroupUsesNoteByDefault(groupName))
        return false;
    const n = groupName.trim().toLowerCase();
    if (n.includes('stammkurs'))
        return true;
    if (n.includes('informatik'))
        return true;
    return false;
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
const groupIdsForStudentInRound = (round, studentId, teacherGroups) => round.groupIds.filter((gid) => {
    const g = teacherGroups.find((x) => x.id === gid);
    return g === null || g === void 0 ? void 0 : g.students.some((s) => s.id === studentId);
});
const findEntry = (round, studentId, groupId, studentGroupIdsInRound) => {
    const scoped = round.entries.find((e) => e.studentId === studentId && e.groupId === groupId);
    if (scoped)
        return scoped;
    const legacy = round.entries.find((e) => e.studentId === studentId && !e.groupId);
    if (!legacy)
        return null;
    const gids = studentGroupIdsInRound !== null && studentGroupIdsInRound !== void 0 ? studentGroupIdsInRound : [];
    const hasScopedForStudent = round.entries.some((e) => e.studentId === studentId && Boolean(e.groupId));
    if (hasScopedForStudent)
        return null;
    if (gids.length !== 1 || gids[0] !== groupId)
        return null;
    return legacy;
};
const blankScopedEntryForGroup = (studentId, groupId, studentName, flagsFrom) => ({
    studentId,
    groupId,
    studentName,
    studentSubmittedAt: null,
    goalsSubmittedAt: null,
    teacherReleasedAt: null,
    teacherGrade: '',
    withoutSelfAssessment: flagsFrom === null || flagsFrom === void 0 ? void 0 : flagsFrom.withoutSelfAssessment,
    teacherGradeOnly: flagsFrom === null || flagsFrom === void 0 ? void 0 : flagsFrom.teacherGradeOnly,
    goalsWaived: flagsFrom === null || flagsFrom === void 0 ? void 0 : flagsFrom.goalsWaived,
    selfUsesRaster: flagsFrom === null || flagsFrom === void 0 ? void 0 : flagsFrom.selfUsesRaster,
});
/** Legacy entries without groupId must not be shared across multiple courses in one round. */
const normalizeMultiGroupEntries = (round, groups) => {
    var _a, _b, _c, _d, _e;
    let changed = false;
    const gidsByStudent = new Map();
    for (const gid of round.groupIds) {
        const group = groups.find((g) => g.id === gid);
        if (!group)
            continue;
        for (const s of group.students) {
            const list = (_a = gidsByStudent.get(s.id)) !== null && _a !== void 0 ? _a : [];
            if (!list.includes(gid))
                list.push(gid);
            gidsByStudent.set(s.id, list);
        }
    }
    for (const [studentId, gids] of gidsByStudent) {
        const ordered = [...gids].sort((a, b) => round.groupIds.indexOf(a) - round.groupIds.indexOf(b));
        const legacy = round.entries.find((e) => e.studentId === studentId && !e.groupId);
        if (legacy) {
            round.entries = round.entries.filter((e) => !(e.studentId === studentId && !e.groupId));
            changed = true;
            const hasScoped = round.entries.some((e) => e.studentId === studentId && e.groupId);
            if (!hasScoped) {
                const primary = ordered[0];
                if (primary)
                    upsertEntry(round, { ...legacy, groupId: primary });
                const flagsSource = { ...legacy, groupId: primary };
                for (const gid of ordered.slice(1)) {
                    upsertEntry(round, blankScopedEntryForGroup(studentId, gid, legacy.studentName, flagsSource));
                }
            }
        }
        if (ordered.length <= 1)
            continue;
        const name = (_c = (_b = round.entries.find((e) => e.studentId === studentId)) === null || _b === void 0 ? void 0 : _b.studentName) !== null && _c !== void 0 ? _c : (0, webUntisStudentList_1.stripMiddleNames)((_e = (_d = groups.flatMap((g) => g.students).find((s) => s.id === studentId)) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : '');
        const template = round.entries.find((e) => e.studentId === studentId && e.groupId);
        for (const gid of ordered) {
            if (round.entries.some((e) => e.studentId === studentId && e.groupId === gid))
                continue;
            upsertEntry(round, blankScopedEntryForGroup(studentId, gid, name, template));
            changed = true;
        }
    }
    return changed;
};
const upsertEntry = (round, entry) => {
    const gid = entry.groupId;
    round.entries = round.entries.filter((e) => {
        if (e.studentId !== entry.studentId)
            return true;
        if (gid) {
            if (e.groupId === gid)
                return false;
            if (!e.groupId)
                return false;
            return true;
        }
        return !e.groupId;
    });
    round.entries.push(entry);
};
const resolveStudentRounds = async (studentId) => {
    var _a, _b, _c;
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
            const studentGidsInRound = teacherGroups
                .filter((tg) => payload.groupIds.includes(tg.id))
                .map((tg) => tg.id);
            for (const g of teacherGroups) {
                if (!payload.groupIds.includes(g.id))
                    continue;
                const entry = findEntry(payload, studentId, g.id, studentGidsInRound);
                const hasHistory = Boolean(entry === null || entry === void 0 ? void 0 : entry.studentSubmittedAt) ||
                    Boolean(entry === null || entry === void 0 ? void 0 : entry.teacherReleasedAt) ||
                    Boolean(entry === null || entry === void 0 ? void 0 : entry.goalsSubmittedAt);
                const publishedForGroup = isGroupPublishedForStudents(payload, g.id);
                if (!publishedForGroup && !hasHistory)
                    continue;
                const key = `${meta.id}:${g.id}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                const groupCompleted = Boolean((_c = (_b = payload.groupMeta) === null || _b === void 0 ? void 0 : _b[g.id]) === null || _c === void 0 ? void 0 : _c.completedAt);
                const isActiveForGroup = isGroupPublishedForStudents(payload, g.id) &&
                    index.activeByGroup[g.id] === meta.id &&
                    !groupCompleted;
                results.push({
                    teacherId,
                    teacherName: g.teacher.name,
                    roundId: meta.id,
                    payload,
                    groupId: g.id,
                    groupName: g.name,
                    isActiveForGroup,
                    studentGroupIdsInRound: studentGidsInRound,
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
const studentSessionDto = (resolved, studentId, studentGroupIdsInRound) => {
    const entry = findEntry(resolved.payload, studentId, resolved.groupId, studentGroupIdsInRound);
    const published = isGroupPublishedForStudents(resolved.payload, resolved.groupId);
    const isActive = resolved.isActiveForGroup;
    const teacherReleased = Boolean(entry === null || entry === void 0 ? void 0 : entry.teacherReleasedAt);
    const studentSubmitted = Boolean(entry === null || entry === void 0 ? void 0 : entry.studentSubmittedAt);
    const goalsSubmitted = Boolean(entry === null || entry === void 0 ? void 0 : entry.goalsSubmittedAt);
    const usesRaster = (0, epoNotenVariants_1.effectiveEpoVariantIdForGroup)(resolved.payload, resolved.groupId) !== null;
    const goalsWaived = entryGoalsWaived(resolved.payload, resolved.groupId, entry);
    const noteOnlyFlow = Boolean((entry === null || entry === void 0 ? void 0 : entry.teacherGradeOnly) || !usesRaster);
    const selfPartDone = Boolean(entry === null || entry === void 0 ? void 0 : entry.teacherGradeOnly) ||
        Boolean(entry === null || entry === void 0 ? void 0 : entry.withoutSelfAssessment) ||
        !usesRaster ||
        studentSubmitted;
    const goalsPartDone = noteOnlyFlow || goalsWaived || goalsSubmitted;
    const workflowComplete = teacherReleased && selfPartDone && goalsPartDone;
    const needsSelfAssessment = isActive &&
        published &&
        !teacherReleased &&
        usesRaster &&
        !studentSubmitted &&
        !(entry === null || entry === void 0 ? void 0 : entry.withoutSelfAssessment) &&
        !(entry === null || entry === void 0 ? void 0 : entry.teacherGradeOnly);
    const needsGoals = isActive &&
        teacherReleased &&
        !goalsPartDone &&
        !noteOnlyFlow;
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
                var _a, _b;
                const round = await loadRound(user.id, meta.id);
                const stats = round ? roundStats(round) : { submitted: 0, graded: 0, released: 0, goals: 0 };
                const activeGroups = groups
                    .filter((g) => index.activeByGroup[g.id] === meta.id)
                    .map((g) => ({ id: g.id, name: g.name }));
                return {
                    ...meta,
                    stats,
                    activeGroups,
                    variantId: (_a = round === null || round === void 0 ? void 0 : round.variantId) !== null && _a !== void 0 ? _a : null,
                    groupMeta: (_b = round === null || round === void 0 ? void 0 : round.groupMeta) !== null && _b !== void 0 ? _b : {},
                };
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
        var _a;
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
            const groupIdQ = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
            const categoryGroupId = groupIdQ && round.groupIds.includes(groupIdQ) ? groupIdQ : (_a = round.groupIds[0]) !== null && _a !== void 0 ? _a : null;
            const categories = await roundCategoryTexts(user.id, round, categoryGroupId);
            const students = [];
            for (const g of groups) {
                if (!round.groupIds.includes(g.id))
                    continue;
                for (const s of g.students) {
                    const gidsInRound = groupIdsForStudentInRound(round, s.id, groups);
                    const existing = findEntry(round, s.id, g.id, gidsInRound);
                    const selfOnlyDefault = groupSelfAssessmentOnly(round, g.id);
                    const row = existing !== null && existing !== void 0 ? existing : {
                        studentId: s.id,
                        studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
                        groupId: g.id,
                        ...(selfOnlyDefault ? { goalsWaived: true } : {}),
                    };
                    students.push({
                        ...row,
                        studentId: s.id,
                        studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
                        groupId: g.id,
                        avatarEmoji: s.avatarEmoji,
                        avatarUrl: s.avatarUrl,
                    });
                }
            }
            const merged = [...students].sort((a, b) => {
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
                    const gid = e.groupId;
                    const groupLive = gid ? isGroupPublishedForStudents(round, gid) : Boolean(round.publishedAt);
                    if (passive || !groupLive)
                        return false;
                    const usesRaster = gid ? (0, epoNotenVariants_1.effectiveEpoVariantIdForGroup)(round, gid) !== null : false;
                    const waived = entryGoalsWaived(round, gid !== null && gid !== void 0 ? gid : '', e);
                    if (usesRaster && !e.studentSubmittedAt && !e.withoutSelfAssessment && !e.teacherGradeOnly) {
                        return true;
                    }
                    if (e.teacherReleasedAt && !e.goalsSubmittedAt && !waived)
                        return true;
                    return false;
                };
                const liveA = ea.groupId
                    ? isGroupPublishedForStudents(round, ea.groupId)
                    : Boolean(round.publishedAt);
                const liveB = eb.groupId
                    ? isGroupPublishedForStudents(round, eb.groupId)
                    : Boolean(round.publishedAt);
                const pendA = pend(ea, pa);
                const pendB = pend(eb, pb);
                const fertA = !pa && liveA && !pendA;
                const fertB = !pb && liveB && !pendB;
                if (fertA !== fertB)
                    return fertA ? -1 : 1;
                if (pendA !== pendB)
                    return pendA ? -1 : 1;
                return ea.studentName.localeCompare(eb.studentName, 'de');
            });
            const priorEpoGrades = {};
            for (const gid of round.groupIds) {
                const partial = await priorEpoGradesForGroup(user.id, roundId, gid, groups);
                for (const [studentId, items] of Object.entries(partial)) {
                    priorEpoGrades[`${studentId}:${gid}`] = items;
                }
            }
            return res.json({
                round,
                students: merged,
                stats: roundStats(round),
                priorEpoGrades,
                variantId: categories.variantId,
                variantName: categories.variantName,
                useRaster: categories.useRaster,
                categoryTitles: categories.categoryTitles,
                categoryWeightsPercent: categories.categoryWeightsPercent,
                studentCategories: categories.studentCategories,
                teacherCategories: categories.teacherCategories,
            });
        }
        catch (error) {
            console.error('EpoNoten getById error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async create(req, res) {
        var _a, _b, _c, _d;
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
            const variantIdRaw = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.variantId) === 'string' ? req.body.variantId.trim() : '';
            const store = await loadVariantsStore(user.id);
            let roundVariantId = epoNotenVariantPresets_1.EPO_VARIANT2_ID;
            if (variantIdRaw && variantIdRaw !== epoNotenVariantPresets_1.EPO_NO_VARIANT_ID) {
                roundVariantId = (0, epoNotenVariants_1.resolveVariant)(store, variantIdRaw).id;
            }
            else if (variantIdRaw === epoNotenVariantPresets_1.EPO_NO_VARIANT_ID) {
                roundVariantId = null;
            }
            const data = {
                id,
                title,
                date: typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.date) === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10),
                groupIds,
                assessmentModeByGroup: Object.fromEntries(groupIds.map((gid) => {
                    const g = owned.find((x) => x.id === gid);
                    return [gid, defaultAssessmentModeForGroupName(g === null || g === void 0 ? void 0 : g.name)];
                })),
                groupMeta: {},
                variantId: roundVariantId,
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
        var _a, _b, _c, _d, _e, _f, _g;
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
            let variantId = (_d = existing.variantId) !== null && _d !== void 0 ? _d : null;
            if (typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.variantId) === 'string') {
                const store = await loadVariantsStore(user.id);
                variantId = (0, epoNotenVariants_1.resolveVariant)(store, req.body.variantId.trim()).id;
            }
            const next = {
                ...existing,
                title,
                date: typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.date) === 'string' ? req.body.date.trim() : existing.date,
                groupIds,
                assessmentModeByGroup,
                variantId,
            };
            await saveRound(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            const bodyKeys = Object.keys((_g = req.body) !== null && _g !== void 0 ? _g : {});
            const onlyVariantPatch = bodyKeys.length === 1 && bodyKeys[0] === 'variantId';
            if (next.publishedAt && !onlyVariantPatch) {
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
            markGroupsPublished(next, groupIds, publishedAt);
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
    /** Einzelnen Kurs freischalten (und ggf. zur Runde hinzufügen) */
    static async publishGroupById(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            if (!groupId)
                return res.status(400).json({ error: 'groupId fehlt' });
            const existing = await loadRound(user.id, roundId);
            if (!existing)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const owned = await loadTeacherGroupsWithStudents(user.id);
            const group = owned.find((g) => g.id === groupId);
            if (!group)
                return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
            const publishedAt = new Date().toISOString();
            const next = { ...existing };
            if (!next.groupIds.includes(groupId)) {
                next.groupIds = [...next.groupIds, groupId];
                next.assessmentModeByGroup = normalizeAssessmentModes(next);
                next.assessmentModeByGroup[groupId] = defaultAssessmentModeForGroupName(group.name);
            }
            if (!next.publishedAt)
                next.publishedAt = publishedAt;
            markGroupsPublished(next, [groupId], publishedAt);
            await saveRound(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            await syncPublishedGroups(user.id, next, [groupId], index, owned.map((g) => g.id));
            await saveIndex(user.id, index);
            return res.json({ success: true, publishedAt, groupId, round: next });
        }
        catch (error) {
            console.error('EpoNoten publishGroup error:', error);
            return res.status(500).json({ error: 'Fehler beim Freigeben' });
        }
    }
    /** Kurs als „fertig“ markieren (Lehrkraft) */
    static async patchGroupMeta(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            if (!groupId)
                return res.status(400).json({ error: 'groupId fehlt' });
            const existing = await loadRound(user.id, roundId);
            if (!existing)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            if (!existing.groupIds.includes(groupId)) {
                return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
            }
            const meta = ensureGroupMeta(existing);
            const prev = (_b = meta[groupId]) !== null && _b !== void 0 ? _b : {};
            if (typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.completed) === 'boolean') {
                const completedAt = req.body.completed ? new Date().toISOString() : null;
                meta[groupId] = {
                    ...prev,
                    completedAt,
                    ...(req.body.completed ? { publishedAt: null } : {}),
                };
            }
            if (typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.variantId) === 'string') {
                const raw = req.body.variantId.trim();
                if (!existing.variantIdByGroup || typeof existing.variantIdByGroup !== 'object') {
                    existing.variantIdByGroup = {};
                }
                if (!raw || raw === epoNotenVariantPresets_1.EPO_NO_VARIANT_ID) {
                    existing.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_NO_VARIANT_ID;
                }
                else {
                    const store = await loadVariantsStore(user.id);
                    existing.variantIdByGroup[groupId] = (0, epoNotenVariants_1.resolveVariant)(store, raw).id;
                }
            }
            if (typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.workflow) === 'string') {
                const wf = req.body.workflow;
                const allowed = [
                    'standard',
                    'teacher_raster',
                    'self_no_raster',
                    'teacher_only',
                ];
                if (!allowed.includes(wf)) {
                    return res.status(400).json({ error: 'Ungültiger workflow' });
                }
                meta[groupId] = {
                    ...(_f = meta[groupId]) !== null && _f !== void 0 ? _f : prev,
                    workflow: wf === 'standard' ? undefined : wf,
                    selfAssessmentOnly: wf === 'self_no_raster',
                };
                const groups = await loadTeacherGroupsWithStudents(user.id);
                applyGroupWorkflowToStudents(existing, groupId, wf, groups);
            }
            const bodyFeatures = (_g = req.body) === null || _g === void 0 ? void 0 : _g.epoFeatures;
            if (bodyFeatures && typeof bodyFeatures === 'object') {
                const flags = {
                    self: bodyFeatures.self !== false,
                    raster: bodyFeatures.raster !== false,
                    goals: bodyFeatures.goals !== false,
                };
                meta[groupId] = {
                    ...(_h = meta[groupId]) !== null && _h !== void 0 ? _h : prev,
                    selfAssessmentEnabled: flags.self,
                    teacherRasterEnabled: flags.raster,
                    goalsEnabled: flags.goals,
                    workflow: undefined,
                    selfAssessmentOnly: flags.self && !flags.raster && !flags.goals,
                };
                const groups = await loadTeacherGroupsWithStudents(user.id);
                applyGroupEpoFeaturesToStudents(existing, groupId, flags, groups);
            }
            if (typeof ((_j = req.body) === null || _j === void 0 ? void 0 : _j.active) === 'boolean') {
                if (req.body.active) {
                    if (((_k = meta[groupId]) === null || _k === void 0 ? void 0 : _k.completedAt) || prev.completedAt) {
                        return res.status(400).json({ error: 'Kurs ist fertig — „aktiv“ ist deaktiviert.' });
                    }
                    const publishedAt = new Date().toISOString();
                    meta[groupId] = { ...(_l = meta[groupId]) !== null && _l !== void 0 ? _l : prev, publishedAt };
                    markGroupsPublished(existing, [groupId], publishedAt);
                    const owned = await loadTeacherGroupsWithStudents(user.id);
                    const index = await loadTeacherIndex(user.id);
                    syncIndexEntry(index, existing);
                    await syncPublishedGroups(user.id, existing, [groupId], index, owned.map((g) => g.id));
                    await saveIndex(user.id, index);
                }
                else {
                    meta[groupId] = { ...prev, publishedAt: null };
                }
            }
            await saveRound(user.id, existing);
            return res.json({ success: true, groupMeta: meta[groupId], round: existing });
        }
        catch (error) {
            console.error('EpoNoten patchGroupMeta error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async listVariants(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const store = await loadVariantsStore(user.id);
            return res.json(store);
        }
        catch (error) {
            console.error('EpoNoten listVariants error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async saveVariant(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const variantId = String(req.params.variantId || '').trim();
            if (!variantId)
                return res.status(400).json({ error: 'variantId fehlt' });
            if (variantId === epoNotenVariants_1.DEFAULT_EPO_VARIANT_ID || variantId === epoNotenVariantPresets_1.EPO_VARIANT2_ID) {
                return res.status(400).json({ error: 'Eingebaute Varianten sind fest vorgegeben' });
            }
            const store = await loadVariantsStore(user.id);
            const idx = store.variants.findIndex((v) => v.id === variantId);
            if (idx < 0)
                return res.status(404).json({ error: 'Variante nicht gefunden' });
            const cur = store.variants[idx];
            const name = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.name) === 'string' ? req.body.name.trim() : cur.name;
            const studentCategories = Array.isArray((_b = req.body) === null || _b === void 0 ? void 0 : _b.studentCategories)
                ? req.body.studentCategories
                : cur.studentCategories;
            const teacherCategories = Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.teacherCategories)
                ? req.body.teacherCategories
                : cur.teacherCategories;
            const categoryTitles = Array.isArray((_d = req.body) === null || _d === void 0 ? void 0 : _d.categoryTitles)
                ? req.body.categoryTitles
                : cur.categoryTitles;
            const categoryWeightsPercent = Array.isArray((_e = req.body) === null || _e === void 0 ? void 0 : _e.categoryWeightsPercent)
                ? req.body.categoryWeightsPercent
                : cur.categoryWeightsPercent;
            store.variants[idx] = (0, epoNotenVariants_1.normalizeVariantSheet)({
                id: cur.id,
                name: name || cur.name,
                categoryTitles,
                categoryWeightsPercent,
                studentCategories,
                teacherCategories,
            });
            await saveVariantsStore(user.id, store);
            return res.json({ success: true, variant: store.variants[idx] });
        }
        catch (error) {
            console.error('EpoNoten saveVariant error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async createVariant(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const template = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.template) === 'string' ? req.body.template.trim() : '';
            const name = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.name) === 'string'
                ? req.body.name.trim()
                : template === 'variant2'
                    ? epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.name
                    : 'Neue Variante';
            const copyFromId = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.copyFromId) === 'string' ? req.body.copyFromId.trim() : undefined;
            const store = await loadVariantsStore(user.id);
            const variant = template === 'variant2'
                ? (0, epoNotenVariants_1.normalizeVariantSheet)({
                    id: epoNotenVariantPresets_1.EPO_VARIANT2_ID,
                    name: epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.name,
                    ...epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET,
                })
                : (0, epoNotenVariants_1.createVariantFromBase)(store, name, copyFromId);
            store.variants.push(variant);
            await saveVariantsStore(user.id, store);
            return res.json({ success: true, variant });
        }
        catch (error) {
            console.error('EpoNoten createVariant error:', error);
            return res.status(500).json({ error: 'Fehler beim Erstellen' });
        }
    }
    static async deleteVariant(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const variantId = String(req.params.variantId || '').trim();
            if (!variantId || variantId === epoNotenVariants_1.DEFAULT_EPO_VARIANT_ID || variantId === epoNotenVariantPresets_1.EPO_VARIANT2_ID) {
                return res.status(400).json({ error: 'Eingebaute Varianten können nicht gelöscht werden' });
            }
            const store = await loadVariantsStore(user.id);
            const before = store.variants.length;
            store.variants = store.variants.filter((v) => v.id !== variantId);
            if (store.variants.length === before) {
                return res.status(404).json({ error: 'Variante nicht gefunden' });
            }
            await saveVariantsStore(user.id, store);
            return res.json({ success: true });
        }
        catch (error) {
            console.error('EpoNoten deleteVariant error:', error);
            return res.status(500).json({ error: 'Fehler beim Löschen' });
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
            clearAllGroupPublishMeta(next);
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
        var _a, _b, _c, _d, _e, _f, _g;
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role === 'STUDENT') {
                const roundIdQ = typeof req.query.roundId === 'string' ? req.query.roundId.trim() : '';
                const groupIdQ = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
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
                let resolved;
                if (roundIdQ && groupIdQ) {
                    resolved = all.find((r) => r.roundId === roundIdQ && r.groupId === groupIdQ);
                }
                else if (roundIdQ) {
                    resolved = all.find((r) => r.roundId === roundIdQ);
                }
                else if (groupIdQ) {
                    resolved = all.find((r) => r.groupId === groupIdQ);
                }
                else {
                    resolved = all[0];
                }
                if (!resolved) {
                    const groups = await prisma.learningGroup.findMany({
                        where: { students: { some: { id: user.id } } },
                        select: { teacherId: true, teacher: { select: { name: true } } },
                        take: 1,
                    });
                    return res.json({
                        sessions: all.map((r) => studentSessionDto(r, user.id, r.studentGroupIdsInRound)),
                        round: null,
                        myEntry: null,
                        canEditSelf: false,
                        canEditGoals: false,
                        teacherId: (_b = (_a = groups[0]) === null || _a === void 0 ? void 0 : _a.teacherId) !== null && _b !== void 0 ? _b : '',
                        teacherName: (_d = (_c = groups[0]) === null || _c === void 0 ? void 0 : _c.teacher.name) !== null && _d !== void 0 ? _d : '',
                        roundId: roundIdQ || null,
                    });
                }
                const myEntry = findEntry(resolved.payload, user.id, resolved.groupId, resolved.studentGroupIdsInRound);
                const categories = await roundCategoryTexts(resolved.teacherId, resolved.payload, resolved.groupId);
                const groupPublished = isGroupPublishedForStudents(resolved.payload, resolved.groupId);
                const studentSelfRaster = entryStudentUsesSelfRaster(resolved.payload, resolved.groupId, myEntry, categories.useRaster);
                const selfRequired = entryRequiresStudentSelf(resolved.payload, resolved.groupId, myEntry);
                const canEditSelf = groupPublished &&
                    selfRequired &&
                    !(myEntry === null || myEntry === void 0 ? void 0 : myEntry.studentSubmittedAt);
                const canEditGoals = resolved.isActiveForGroup &&
                    Boolean(myEntry === null || myEntry === void 0 ? void 0 : myEntry.teacherReleasedAt) &&
                    !(myEntry === null || myEntry === void 0 ? void 0 : myEntry.goalsSubmittedAt) &&
                    !entryGoalsWaived(resolved.payload, resolved.groupId, myEntry);
                return res.json({
                    sessions: all.map((r) => studentSessionDto(r, user.id, r.studentGroupIdsInRound)),
                    round: {
                        id: resolved.roundId,
                        title: resolved.payload.title,
                        date: resolved.payload.date,
                        publishedAt: groupPublished ? (_g = (_f = (_e = resolved.payload.groupMeta) === null || _e === void 0 ? void 0 : _e[resolved.groupId]) === null || _f === void 0 ? void 0 : _f.publishedAt) !== null && _g !== void 0 ? _g : resolved.payload.publishedAt : null,
                        groupId: resolved.groupId,
                        groupName: resolved.groupName,
                        assessmentMode: assessmentModeForGroup(resolved.payload, resolved.groupId, resolved.groupName),
                        studentCategories: categories.studentCategories,
                        teacherCategories: categories.teacherCategories,
                        categoryTitles: categories.categoryTitles,
                        categoryWeightsPercent: categories.categoryWeightsPercent,
                        variantId: categories.variantId,
                        useRaster: categories.useRaster,
                        selfAssessmentOnly: groupSelfAssessmentOnly(resolved.payload, resolved.groupId),
                        workflow: groupWorkflow(resolved.payload, resolved.groupId),
                        studentUsesSelfRaster: studentSelfRaster,
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur Schüler' });
            let teacherId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            let roundId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.roundId) === 'string' ? req.body.roundId.trim() : '';
            let groupId = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.groupId) === 'string' ? req.body.groupId.trim() : '';
            const allRounds = await resolveStudentRounds(user.id);
            if (!teacherId || !roundId) {
                const first = roundId
                    ? groupId
                        ? allRounds.find((r) => r.roundId === roundId && r.groupId === groupId)
                        : allRounds.find((r) => r.roundId === roundId)
                    : groupId
                        ? allRounds.find((r) => r.groupId === groupId)
                        : allRounds[0];
                if (!first || !isGroupPublishedForStudents(first.payload, first.groupId)) {
                    return res.status(404).json({ error: 'Keine freigegebene EPO-Runde' });
                }
                teacherId = first.teacherId;
                roundId = first.roundId;
                groupId = groupId || first.groupId;
            }
            const resolvedRound = allRounds.find((r) => r.roundId === roundId &&
                r.teacherId === teacherId &&
                (!groupId || r.groupId === groupId));
            const payload = await loadRound(teacherId, roundId);
            if (!payload) {
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            }
            const submitGroupId = (_d = resolvedRound === null || resolvedRound === void 0 ? void 0 : resolvedRound.groupId) !== null && _d !== void 0 ? _d : groupId;
            if (!submitGroupId || !isGroupPublishedForStudents(payload, submitGroupId)) {
                return res.status(403).json({ error: 'EPO-Runde ist nicht freigegeben' });
            }
            const groups = await loadTeacherGroupsWithStudents(teacherId);
            const gidsInRound = groupIdsForStudentInRound(payload, user.id, groups);
            const existing = findEntry(payload, user.id, submitGroupId, gidsInRound);
            if (existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) {
                return res.status(403).json({ error: 'Selbsteinschätzung bereits abgegeben — keine Änderung mehr möglich' });
            }
            if ((existing === null || existing === void 0 ? void 0 : existing.withoutSelfAssessment) || (existing === null || existing === void 0 ? void 0 : existing.teacherGradeOnly)) {
                return res.status(403).json({ error: 'Für dich ist keine Selbsteinschätzung vorgesehen' });
            }
            const variantCats = await roundCategoryTexts(teacherId, payload, submitGroupId);
            const selfRequired = entryRequiresStudentSelf(payload, submitGroupId, existing);
            if (!selfRequired) {
                return res.status(403).json({ error: 'Für diese Runde ist keine Selbsteinschätzung vorgesehen' });
            }
            const studentSelfRaster = entryStudentUsesSelfRaster(payload, submitGroupId, existing, variantCats.useRaster);
            const selfScores = normalizeCategoryScores((_e = req.body) === null || _e === void 0 ? void 0 : _e.selfScores);
            const total = (0, epoNotenScoring_1.epoRoundedPoints)(selfScores, variantCats.categoryWeightsPercent);
            const submitGroup = groups.find((g) => g.id === submitGroupId);
            const mode = assessmentModeForGroup(payload, submitGroupId, (_f = resolvedRound === null || resolvedRound === void 0 ? void 0 : resolvedRound.groupName) !== null && _f !== void 0 ? _f : submitGroup === null || submitGroup === void 0 ? void 0 : submitGroup.name);
            const selfGradeFromTable = typeof ((_g = req.body) === null || _g === void 0 ? void 0 : _g.selfGradeFromTable) === 'string' && req.body.selfGradeFromTable.trim()
                ? req.body.selfGradeFromTable.trim()
                : rasterResultFromTotal(mode, total);
            const suggestedGradeMode = mode;
            const entry = {
                studentId: user.id,
                groupId: submitGroupId,
                studentName: (0, webUntisStudentList_1.stripMiddleNames)(user.name),
                suggestedGrade: typeof ((_h = req.body) === null || _h === void 0 ? void 0 : _h.suggestedGrade) === 'string' ? req.body.suggestedGrade.trim() : '',
                suggestedGradeMode,
                justification: typeof ((_j = req.body) === null || _j === void 0 ? void 0 : _j.justification) === 'string' ? req.body.justification.trim() : '',
                selfScores,
                selfGradeFromTable,
                studentSubmittedAt: new Date().toISOString(),
                teacherScores: existing === null || existing === void 0 ? void 0 : existing.teacherScores,
                teacherGrade: existing === null || existing === void 0 ? void 0 : existing.teacherGrade,
                teacherReleasedAt: (_k = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _k !== void 0 ? _k : null,
                goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                goalsSubmittedAt: (_l = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _l !== void 0 ? _l : null,
                goalsWaived: existing === null || existing === void 0 ? void 0 : existing.goalsWaived,
                withoutSelfAssessment: existing === null || existing === void 0 ? void 0 : existing.withoutSelfAssessment,
                teacherGradeOnly: existing === null || existing === void 0 ? void 0 : existing.teacherGradeOnly,
                teacherJustification: existing === null || existing === void 0 ? void 0 : existing.teacherJustification,
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
        var _a, _b, _c, _d, _e;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'STUDENT')
                return res.status(403).json({ error: 'Nur Schüler' });
            let teacherId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            let roundId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.roundId) === 'string' ? req.body.roundId.trim() : '';
            let groupId = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.groupId) === 'string' ? req.body.groupId.trim() : '';
            const allRounds = await resolveStudentRounds(user.id);
            if (!teacherId || !roundId) {
                const first = allRounds[0];
                if (!first)
                    return res.status(404).json({ error: 'Keine EPO-Runde' });
                teacherId = first.teacherId;
                roundId = first.roundId;
                groupId = first.groupId;
            }
            const resolved = allRounds.find((r) => r.roundId === roundId &&
                r.teacherId === teacherId &&
                (!groupId || r.groupId === groupId));
            if (!resolved)
                return res.status(404).json({ error: 'EPO-Runde nicht gefunden' });
            groupId = resolved.groupId;
            const payload = await loadRound(teacherId, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            const groups = await loadTeacherGroupsWithStudents(teacherId);
            const gidsInRound = groupIdsForStudentInRound(payload, user.id, groups);
            const existing = findEntry(payload, user.id, groupId, gidsInRound);
            if (!(existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt)) {
                return res.status(403).json({ error: 'Lehrerbewertung noch nicht freigegeben' });
            }
            if (existing === null || existing === void 0 ? void 0 : existing.goalsWaived) {
                return res.status(403).json({ error: 'Für dich sind keine Ziele erforderlich' });
            }
            const goal = typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.goal) === 'string' ? req.body.goal.trim() : '';
            const goalAction = typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.goalAction) === 'string' ? req.body.goalAction.trim() : '';
            if (!goal || !goalAction) {
                return res.status(400).json({ error: 'Ziel und Handlung sind erforderlich' });
            }
            const entry = {
                ...existing,
                groupId,
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
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
            const groupIdBody = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            const studentGroupsInRound = groupIdsForStudentInRound(payload, studentId, groups);
            let entryGroupId = groupIdBody && payload.groupIds.includes(groupIdBody) ? groupIdBody : '';
            if (!entryGroupId || !studentGroupsInRound.includes(entryGroupId)) {
                if (studentGroupsInRound.length === 1)
                    entryGroupId = studentGroupsInRound[0];
                else if (!entryGroupId) {
                    return res.status(400).json({ error: 'groupId ist erforderlich (SuS in mehreren Kursen dieser Runde)' });
                }
            }
            const existing = findEntry(payload, studentId, entryGroupId, studentGroupsInRound);
            const teacherScores = normalizeCategoryScores((_b = req.body) === null || _b === void 0 ? void 0 : _b.teacherScores);
            const variantCats = await roundCategoryTexts(user.id, payload, entryGroupId);
            const total = (0, epoNotenScoring_1.epoRoundedPoints)(teacherScores, variantCats.categoryWeightsPercent);
            const computed = gradeFromTotalPoints(total);
            const teacherGrade = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.teacherGrade) === 'string' ? req.body.teacherGrade.trim() : (_d = existing === null || existing === void 0 ? void 0 : existing.teacherGrade) !== null && _d !== void 0 ? _d : '';
            let withoutSelfAssessment = Boolean(existing === null || existing === void 0 ? void 0 : existing.withoutSelfAssessment);
            if (typeof ((_e = req.body) === null || _e === void 0 ? void 0 : _e.withoutSelfAssessment) === 'boolean') {
                withoutSelfAssessment = req.body.withoutSelfAssessment;
            }
            let teacherGradeOnly = Boolean(existing === null || existing === void 0 ? void 0 : existing.teacherGradeOnly);
            if (typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.teacherGradeOnly) === 'boolean') {
                teacherGradeOnly = req.body.teacherGradeOnly;
            }
            let goalsWaived = Boolean(existing === null || existing === void 0 ? void 0 : existing.goalsWaived);
            if (typeof ((_g = req.body) === null || _g === void 0 ? void 0 : _g.goalsWaived) === 'boolean') {
                goalsWaived = req.body.goalsWaived;
            }
            let selfUsesRaster = existing === null || existing === void 0 ? void 0 : existing.selfUsesRaster;
            if (typeof ((_h = req.body) === null || _h === void 0 ? void 0 : _h.selfUsesRaster) === 'boolean') {
                selfUsesRaster = req.body.selfUsesRaster;
            }
            const teacherJustification = typeof ((_j = req.body) === null || _j === void 0 ? void 0 : _j.teacherJustification) === 'string'
                ? req.body.teacherJustification.trim()
                : (_k = existing === null || existing === void 0 ? void 0 : existing.teacherJustification) !== null && _k !== void 0 ? _k : '';
            const revokeRelease = ((_l = req.body) === null || _l === void 0 ? void 0 : _l.revokeRelease) === true;
            const entry = {
                studentId,
                groupId: entryGroupId,
                studentName: (0, webUntisStudentList_1.stripMiddleNames)(student.name),
                suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
                suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
                justification: existing === null || existing === void 0 ? void 0 : existing.justification,
                selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
                selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
                studentSubmittedAt: (_m = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _m !== void 0 ? _m : null,
                teacherScores,
                teacherGrade,
                teacherReleasedAt: revokeRelease ? null : (_o = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _o !== void 0 ? _o : null,
                goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                goalsSubmittedAt: (_p = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _p !== void 0 ? _p : null,
                goalsWaived,
                withoutSelfAssessment: teacherGradeOnly ? false : withoutSelfAssessment,
                teacherGradeOnly,
                teacherJustification,
                selfUsesRaster,
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
        var _a, _b, _c, _d, _e, _f;
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
            const studentToGroups = new Map();
            for (const g of groups) {
                if (!payload.groupIds.includes(g.id))
                    continue;
                for (const s of g.students) {
                    const list = (_d = studentToGroups.get(s.id)) !== null && _d !== void 0 ? _d : [];
                    list.push(g.id);
                    studentToGroups.set(s.id, list);
                }
            }
            const now = new Date().toISOString();
            let count = 0;
            const groupsToIntegrate = new Set();
            for (const entry of payload.entries) {
                const gids = (_e = studentToGroups.get(entry.studentId)) !== null && _e !== void 0 ? _e : [];
                const entryGroupId = (_f = entry.groupId) !== null && _f !== void 0 ? _f : (gids.length === 1 ? gids[0] : null);
                if (!entryGroupId)
                    continue;
                if (groupId && entryGroupId !== groupId)
                    continue;
                if (!all && studentIds.length > 0 && !studentIds.includes(entry.studentId))
                    continue;
                const variantCats = await roundCategoryTexts(user.id, payload, entryGroupId !== null && entryGroupId !== void 0 ? entryGroupId : null);
                const mode = entryGroupId
                    ? assessmentModeForGroup(payload, entryGroupId, groupNameById.get(entryGroupId))
                    : 'note';
                const grade = effectiveTeacherGrade(payload, entryGroupId, entry, mode, variantCats.categoryWeightsPercent);
                if (!grade)
                    continue;
                if (entryRequiresStudentSelf(payload, entryGroupId, entry) &&
                    !entry.studentSubmittedAt) {
                    continue;
                }
                entry.teacherGrade = grade;
                entry.teacherReleasedAt = now;
                count += 1;
                groupsToIntegrate.add(entryGroupId);
            }
            await saveRound(user.id, payload);
            for (const gid of groupsToIntegrate) {
                const group = groups.find((g) => g.id === gid);
                if (!group)
                    continue;
                const mode = assessmentModeForGroup(payload, gid, groupNameById.get(gid));
                try {
                    await (0, epoNotenGradingSchemaIntegrate_1.integrateReleasedEpoRoundIntoGradingSchema)(prisma, {
                        groupId: gid,
                        roundTitle: payload.title,
                        assessmentMode: mode,
                        entries: payload.entries,
                        studentIdsInGroup: group.students.map((s) => s.id),
                    });
                }
                catch (integrateErr) {
                    console.warn('EPO auto integrate grading schema failed for group', gid, integrateErr);
                }
            }
            return res.json({ success: true, releasedCount: count });
        }
        catch (error) {
            console.error('EpoNoten release error:', error);
            return res.status(500).json({ error: 'Fehler bei der Freigabe' });
        }
    }
    /** Lehrkraft: ganze Lerngruppe auf „Nur Note“ (oder zurück auf Standard) */
    static async bulkGradeOnlyForGroup(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            const enabled = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.enabled) !== false;
            if (!groupId)
                return res.status(400).json({ error: 'groupId erforderlich' });
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            if (!payload.groupIds.includes(groupId)) {
                return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
            }
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const group = groups.find((g) => g.id === groupId);
            if (!group)
                return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
            let updatedCount = 0;
            let skippedCount = 0;
            for (const s of group.students) {
                const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
                const existing = findEntry(payload, s.id, groupId, gidsInRound);
                if ((existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) || (existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt)) {
                    skippedCount += 1;
                    continue;
                }
                const entry = {
                    studentId: s.id,
                    groupId,
                    studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
                    suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
                    suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
                    justification: existing === null || existing === void 0 ? void 0 : existing.justification,
                    selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
                    selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
                    studentSubmittedAt: (_c = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _c !== void 0 ? _c : null,
                    teacherScores: existing === null || existing === void 0 ? void 0 : existing.teacherScores,
                    teacherGrade: existing === null || existing === void 0 ? void 0 : existing.teacherGrade,
                    teacherReleasedAt: (_d = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _d !== void 0 ? _d : null,
                    goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                    goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                    goalsSubmittedAt: (_e = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _e !== void 0 ? _e : null,
                    goalsWaived: existing === null || existing === void 0 ? void 0 : existing.goalsWaived,
                    withoutSelfAssessment: enabled ? false : Boolean(existing === null || existing === void 0 ? void 0 : existing.withoutSelfAssessment),
                    teacherGradeOnly: enabled,
                    teacherJustification: existing === null || existing === void 0 ? void 0 : existing.teacherJustification,
                };
                upsertEntry(payload, entry);
                updatedCount += 1;
            }
            if (enabled) {
                if (!payload.variantIdByGroup || typeof payload.variantIdByGroup !== 'object') {
                    payload.variantIdByGroup = {};
                }
                payload.variantIdByGroup[groupId] = epoNotenVariantPresets_1.EPO_NO_VARIANT_ID;
            }
            await saveRound(user.id, payload);
            return res.json({ success: true, updatedCount, skippedCount, enabled });
        }
        catch (error) {
            console.error('EpoNoten bulkGradeOnlyForGroup error:', error);
            return res.status(500).json({ error: 'Fehler beim Setzen' });
        }
    }
    /** Lehrkraft: ganze Lerngruppe „Keine Ziele nötig“ */
    static async bulkGoalsWaivedForGroup(req, res) {
        var _a, _b, _c, _d, _e;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            const waived = ((_b = req.body) === null || _b === void 0 ? void 0 : _b.waived) !== false;
            if (!groupId)
                return res.status(400).json({ error: 'groupId erforderlich' });
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            if (!payload.groupIds.includes(groupId)) {
                return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
            }
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const group = groups.find((g) => g.id === groupId);
            if (!group)
                return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
            let updatedCount = 0;
            let skippedCount = 0;
            for (const s of group.students) {
                const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
                const existing = findEntry(payload, s.id, groupId, gidsInRound);
                if (existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) {
                    skippedCount += 1;
                    continue;
                }
                const entry = {
                    studentId: s.id,
                    groupId,
                    studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
                    suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
                    suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
                    justification: existing === null || existing === void 0 ? void 0 : existing.justification,
                    selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
                    selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
                    studentSubmittedAt: (_c = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _c !== void 0 ? _c : null,
                    teacherScores: existing === null || existing === void 0 ? void 0 : existing.teacherScores,
                    teacherGrade: existing === null || existing === void 0 ? void 0 : existing.teacherGrade,
                    teacherReleasedAt: (_d = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _d !== void 0 ? _d : null,
                    goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                    goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                    goalsSubmittedAt: (_e = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _e !== void 0 ? _e : null,
                    goalsWaived: waived,
                    withoutSelfAssessment: existing === null || existing === void 0 ? void 0 : existing.withoutSelfAssessment,
                    teacherGradeOnly: existing === null || existing === void 0 ? void 0 : existing.teacherGradeOnly,
                    teacherJustification: existing === null || existing === void 0 ? void 0 : existing.teacherJustification,
                };
                upsertEntry(payload, entry);
                updatedCount += 1;
            }
            await saveRound(user.id, payload);
            return res.json({ success: true, updatedCount, skippedCount, waived });
        }
        catch (error) {
            console.error('EpoNoten bulkGoalsWaivedForGroup error:', error);
            return res.status(500).json({ error: 'Fehler beim Setzen' });
        }
    }
    /** Lehrkraft: ganze Lerngruppe „Nur Einschätzung“ (Teil 1, keine Ziele) */
    static async bulkSelfAssessmentOnlyForGroup(req, res) {
        var _a, _b, _c, _d;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            if (!groupId)
                return res.status(400).json({ error: 'groupId erforderlich' });
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            if (!payload.groupIds.includes(groupId)) {
                return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
            }
            const meta = ensureGroupMeta(payload);
            meta[groupId] = { ...meta[groupId], selfAssessmentOnly: true };
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const group = groups.find((g) => g.id === groupId);
            if (!group)
                return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
            let updatedCount = 0;
            let skippedCount = 0;
            for (const s of group.students) {
                const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
                const existing = findEntry(payload, s.id, groupId, gidsInRound);
                if (existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) {
                    skippedCount += 1;
                    continue;
                }
                const entry = {
                    studentId: s.id,
                    groupId,
                    studentName: (0, webUntisStudentList_1.stripMiddleNames)(s.name),
                    suggestedGrade: existing === null || existing === void 0 ? void 0 : existing.suggestedGrade,
                    suggestedGradeMode: existing === null || existing === void 0 ? void 0 : existing.suggestedGradeMode,
                    justification: existing === null || existing === void 0 ? void 0 : existing.justification,
                    selfScores: existing === null || existing === void 0 ? void 0 : existing.selfScores,
                    selfGradeFromTable: existing === null || existing === void 0 ? void 0 : existing.selfGradeFromTable,
                    studentSubmittedAt: (_b = existing === null || existing === void 0 ? void 0 : existing.studentSubmittedAt) !== null && _b !== void 0 ? _b : null,
                    teacherScores: existing === null || existing === void 0 ? void 0 : existing.teacherScores,
                    teacherGrade: existing === null || existing === void 0 ? void 0 : existing.teacherGrade,
                    teacherReleasedAt: (_c = existing === null || existing === void 0 ? void 0 : existing.teacherReleasedAt) !== null && _c !== void 0 ? _c : null,
                    goal: existing === null || existing === void 0 ? void 0 : existing.goal,
                    goalAction: existing === null || existing === void 0 ? void 0 : existing.goalAction,
                    goalsSubmittedAt: (_d = existing === null || existing === void 0 ? void 0 : existing.goalsSubmittedAt) !== null && _d !== void 0 ? _d : null,
                    goalsWaived: true,
                    withoutSelfAssessment: false,
                    teacherGradeOnly: false,
                    teacherJustification: existing === null || existing === void 0 ? void 0 : existing.teacherJustification,
                };
                upsertEntry(payload, entry);
                updatedCount += 1;
            }
            await saveRound(user.id, payload);
            return res.json({ success: true, updatedCount, skippedCount, selfAssessmentOnly: true });
        }
        catch (error) {
            console.error('EpoNoten bulkSelfAssessmentOnlyForGroup error:', error);
            return res.status(500).json({ error: 'Fehler beim Setzen' });
        }
    }
    /** Freigegebene EPO-Noten einer Lerngruppe ins Notenschema übernehmen (Kategorie = Rundentitel). */
    static async integrateGradingSchema(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const roundId = String(req.params.id || '').trim();
            const groupId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.groupId) === 'string' ? req.body.groupId.trim() : '';
            if (!groupId)
                return res.status(400).json({ error: 'groupId erforderlich' });
            const payload = await loadRound(user.id, roundId);
            if (!payload)
                return res.status(404).json({ error: 'Runde nicht gefunden' });
            if (!payload.groupIds.includes(groupId)) {
                return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
            }
            const groups = await loadTeacherGroupsWithStudents(user.id);
            const group = groups.find((g) => g.id === groupId);
            if (!group)
                return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
            const mode = assessmentModeForGroup(payload, groupId, group.name);
            const result = await (0, epoNotenGradingSchemaIntegrate_1.integrateReleasedEpoRoundIntoGradingSchema)(prisma, {
                groupId,
                roundTitle: payload.title,
                assessmentMode: mode,
                entries: payload.entries,
                studentIdsInGroup: group.students.map((s) => s.id),
            });
            if (!result) {
                return res.status(400).json({ error: 'Für diese Lerngruppe gibt es noch kein Notenschema.' });
            }
            if (result.count === 0) {
                return res.status(400).json({
                    error: 'Keine freigegebenen Noten zum Übertragen (Note eintragen und freigeben).',
                });
            }
            const meta = ensureGroupMeta(payload);
            meta[groupId] = {
                ...meta[groupId],
                schemaIntegratedAt: new Date().toISOString(),
            };
            payload.groupMeta = meta;
            await saveRound(user.id, payload);
            return res.json({
                success: true,
                count: result.count,
                categoryName: result.categoryName,
                schemaId: result.schemaId,
            });
        }
        catch (error) {
            console.error('EpoNoten integrateGradingSchema error:', error);
            return res.status(500).json({ error: 'Fehler beim Übertragen ins Notenschema' });
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
                payload.entries = payload.entries.filter((e) => {
                    if (!studentIds.has(e.studentId))
                        return true;
                    if (e.groupId === groupId)
                        return false;
                    if (!e.groupId) {
                        const gids = groupIdsForStudentInRound(payload, e.studentId, groups);
                        if (gids.length === 1 && gids[0] === groupId)
                            return false;
                    }
                    return true;
                });
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