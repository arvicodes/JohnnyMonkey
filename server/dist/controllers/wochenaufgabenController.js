"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimWochenaufgabeVideo = exports.activateWochenaufgabe = exports.listWochenaufgabeStates = exports.WA_KEYS = exports.WA_PHASE3_DAYS = exports.WA_PHASE2_DAYS = exports.WA_PHASE1_DAYS = void 0;
exports.waVirtualPath = waVirtualPath;
exports.computePhase = computePhase;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const DAY_MS = 86400000;
exports.WA_PHASE1_DAYS = 5;
exports.WA_PHASE2_DAYS = 2;
exports.WA_PHASE3_DAYS = 2;
function normalizePath(p) {
    return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}
function waVirtualPath(lessonPath, key) {
    return `${normalizePath(lessonPath)}/${key}`;
}
exports.WA_KEYS = {
    solution: 'WA_L1_loesung',
    video: 'WA_V_erklaervideo',
    audio: 'WA_L3_audio',
    correction: 'WA_L5_korrektur',
};
function computePhase(activatedAt, now = new Date()) {
    if (!activatedAt)
        return 'draft';
    const elapsed = now.getTime() - activatedAt.getTime();
    if (elapsed < exports.WA_PHASE1_DAYS * DAY_MS)
        return 'phase1';
    if (elapsed < (exports.WA_PHASE1_DAYS + exports.WA_PHASE2_DAYS) * DAY_MS)
        return 'phase2';
    if (elapsed < (exports.WA_PHASE1_DAYS + exports.WA_PHASE2_DAYS + exports.WA_PHASE3_DAYS) * DAY_MS)
        return 'phase3';
    return 'completed';
}
function phaseEndAt(activatedAt, phase) {
    if (phase === 'draft' || phase === 'completed')
        return null;
    if (phase === 'phase1')
        return new Date(activatedAt.getTime() + exports.WA_PHASE1_DAYS * DAY_MS);
    if (phase === 'phase2')
        return new Date(activatedAt.getTime() + (exports.WA_PHASE1_DAYS + exports.WA_PHASE2_DAYS) * DAY_MS);
    return new Date(activatedAt.getTime() + (exports.WA_PHASE1_DAYS + exports.WA_PHASE2_DAYS + exports.WA_PHASE3_DAYS) * DAY_MS);
}
async function getTeacherIdForGroup(groupId) {
    var _a;
    const group = await prisma.learningGroup.findUnique({
        where: { id: groupId },
        select: { teacherId: true },
    });
    return (_a = group === null || group === void 0 ? void 0 : group.teacherId) !== null && _a !== void 0 ? _a : null;
}
async function requireLearningGroup(groupId) {
    const group = await prisma.learningGroup.findUnique({
        where: { id: groupId },
        select: { id: true, teacherId: true },
    });
    if (!group) {
        const err = new Error('Lerngruppe nicht gefunden');
        err.status = 404;
        throw err;
    }
    return group;
}
async function findSubmission(teacherId, virtualFilePath, fileName, studentId) {
    const assignment = await prisma.assignment.findFirst({
        where: { filePath: virtualFilePath, teacherId, fileName },
    });
    if (!assignment)
        return null;
    return prisma.submission.findFirst({
        where: { assignmentId: assignment.id, studentId },
        orderBy: { submittedAt: 'desc' },
    });
}
async function listSubmissionsForKey(teacherId, lessonPath, fileName) {
    var _a;
    const virtualFilePath = waVirtualPath(lessonPath, fileName);
    const assignment = await prisma.assignment.findFirst({
        where: { filePath: virtualFilePath, teacherId, fileName },
        include: {
            submissions: {
                include: { student: { select: { id: true, name: true, avatarEmoji: true } } },
            },
        },
    });
    return (_a = assignment === null || assignment === void 0 ? void 0 : assignment.submissions) !== null && _a !== void 0 ? _a : [];
}
/** Zufällige Kreis-Zuordnung: jeder bekommt die Lösung eines anderen. */
function buildPeerCycle(studentIds) {
    if (studentIds.length < 2)
        return new Map();
    const shuffled = [...studentIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const map = new Map();
    for (let i = 0; i < shuffled.length; i++) {
        map.set(shuffled[i], shuffled[(i + 1) % shuffled.length]);
    }
    return map;
}
async function ensurePeerPairs(task) {
    if (task.peerAssignedAt)
        return;
    const teacherId = await getTeacherIdForGroup(task.groupId);
    if (!teacherId)
        return;
    const submissions = await listSubmissionsForKey(teacherId, task.lessonPath, exports.WA_KEYS.solution);
    const studentIds = [...new Set(submissions.map((s) => s.studentId))];
    if (studentIds.length < 2)
        return;
    const pairs = buildPeerCycle(studentIds);
    const rows = [...pairs.entries()].map(([reviewerStudentId, solutionStudentId]) => ({
        taskId: task.id,
        reviewerStudentId,
        solutionStudentId,
    }));
    await prisma.$transaction([
        ...rows.map((row) => prisma.wochenaufgabePeerPair.create({ data: row })),
        prisma.wochenaufgabeTask.update({
            where: { id: task.id },
            data: { peerAssignedAt: new Date() },
        }),
    ]);
}
async function buildTaskState(task, teacherId, studentId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const now = new Date();
    const phase = computePhase(task.activatedAt, now);
    const phaseEndsAt = task.activatedAt ? phaseEndAt(task.activatedAt, phase) : null;
    const remainingMs = phaseEndsAt ? Math.max(0, phaseEndsAt.getTime() - now.getTime()) : null;
    if (task.activatedAt &&
        (phase === 'phase2' || phase === 'phase3' || phase === 'completed') &&
        !task.peerAssignedAt) {
        await ensurePeerPairs(task);
        const refreshed = await prisma.wochenaufgabeTask.findUnique({
            where: { id: task.id },
            include: {
                videoClaimStudent: { select: { id: true, name: true, avatarEmoji: true } },
                peerPairs: {
                    include: {
                        solutionOwner: { select: { id: true, name: true, avatarEmoji: true } },
                    },
                },
            },
        });
        if (refreshed)
            return buildTaskState(refreshed, teacherId, studentId);
    }
    let videoSubmission = null;
    if (task.videoClaimStudentId) {
        videoSubmission = await findSubmission(teacherId, waVirtualPath(task.lessonPath, exports.WA_KEYS.video), exports.WA_KEYS.video, task.videoClaimStudentId);
    }
    let mySolutionSubmission = null;
    let peerSolutionSubmission = null;
    let myAudioSubmission = null;
    let receivedAudioSubmission = null;
    let myCorrectionSubmission = null;
    if (studentId) {
        mySolutionSubmission = await findSubmission(teacherId, waVirtualPath(task.lessonPath, exports.WA_KEYS.solution), exports.WA_KEYS.solution, studentId);
        myAudioSubmission = await findSubmission(teacherId, waVirtualPath(task.lessonPath, exports.WA_KEYS.audio), exports.WA_KEYS.audio, studentId);
        myCorrectionSubmission = await findSubmission(teacherId, waVirtualPath(task.lessonPath, exports.WA_KEYS.correction), exports.WA_KEYS.correction, studentId);
        const asReviewer = (_a = task.peerPairs) === null || _a === void 0 ? void 0 : _a.find((p) => p.reviewerStudentId === studentId);
        if (asReviewer) {
            const peerSub = await findSubmission(teacherId, waVirtualPath(task.lessonPath, exports.WA_KEYS.solution), exports.WA_KEYS.solution, asReviewer.solutionStudentId);
            if (peerSub) {
                peerSolutionSubmission = {
                    id: peerSub.id,
                    student: (_b = asReviewer.solutionOwner) !== null && _b !== void 0 ? _b : undefined,
                };
            }
        }
        const asOwner = (_c = task.peerPairs) === null || _c === void 0 ? void 0 : _c.find((p) => p.solutionStudentId === studentId);
        if (asOwner && phase !== 'phase1' && phase !== 'draft') {
            const phase2Ended = task.activatedAt &&
                now.getTime() >= task.activatedAt.getTime() + (exports.WA_PHASE1_DAYS + exports.WA_PHASE2_DAYS) * DAY_MS;
            if (phase2Ended) {
                receivedAudioSubmission = await findSubmission(teacherId, waVirtualPath(task.lessonPath, exports.WA_KEYS.audio), exports.WA_KEYS.audio, asOwner.reviewerStudentId);
            }
        }
    }
    const phase1Ended = task.activatedAt &&
        now.getTime() >= task.activatedAt.getTime() + exports.WA_PHASE1_DAYS * DAY_MS;
    return {
        lessonPath: task.lessonPath,
        activatedAt: task.activatedAt,
        phase,
        phaseEndsAt,
        remainingMs,
        videoClaimStudentId: task.videoClaimStudentId,
        videoClaimStudentName: (_e = (_d = task.videoClaimStudent) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : null,
        isVideoClaimMine: Boolean(studentId && task.videoClaimStudentId === studentId),
        canClaimVideo: phase === 'phase1' && !task.videoClaimStudentId && Boolean(studentId),
        hasVideo: Boolean(videoSubmission),
        videoSubmissionId: (_f = videoSubmission === null || videoSubmission === void 0 ? void 0 : videoSubmission.id) !== null && _f !== void 0 ? _f : null,
        videoVisibleToAll: Boolean(phase1Ended && videoSubmission),
        mySolutionSubmissionId: (_g = mySolutionSubmission === null || mySolutionSubmission === void 0 ? void 0 : mySolutionSubmission.id) !== null && _g !== void 0 ? _g : null,
        peerSolutionSubmissionId: (_h = peerSolutionSubmission === null || peerSolutionSubmission === void 0 ? void 0 : peerSolutionSubmission.id) !== null && _h !== void 0 ? _h : null,
        peerSolutionStudentName: (_k = (_j = peerSolutionSubmission === null || peerSolutionSubmission === void 0 ? void 0 : peerSolutionSubmission.student) === null || _j === void 0 ? void 0 : _j.name) !== null && _k !== void 0 ? _k : null,
        myAudioSubmissionId: (_l = myAudioSubmission === null || myAudioSubmission === void 0 ? void 0 : myAudioSubmission.id) !== null && _l !== void 0 ? _l : null,
        receivedAudioSubmissionId: (_m = receivedAudioSubmission === null || receivedAudioSubmission === void 0 ? void 0 : receivedAudioSubmission.id) !== null && _m !== void 0 ? _m : null,
        myCorrectionSubmissionId: (_o = myCorrectionSubmission === null || myCorrectionSubmission === void 0 ? void 0 : myCorrectionSubmission.id) !== null && _o !== void 0 ? _o : null,
    };
}
/** Status aller Wochenaufgaben in einem Ordner. */
const listWochenaufgabeStates = async (req, res) => {
    try {
        const { groupId } = req.params;
        if (groupId.startsWith('__')) {
            return res.json({ states: [], teacherId: null });
        }
        const parentPath = normalizePath(String(req.query.parentPath || ''));
        const studentId = req.query.studentId ? String(req.query.studentId) : undefined;
        const group = await requireLearningGroup(groupId);
        const teacherId = group.teacherId;
        const whereParent = parentPath ? { startsWith: `${parentPath}/` } : undefined;
        const tasks = await prisma.wochenaufgabeTask.findMany({
            where: {
                groupId,
                ...(whereParent ? { lessonPath: whereParent } : {}),
            },
            include: {
                videoClaimStudent: { select: { id: true, name: true, avatarEmoji: true } },
                peerPairs: {
                    include: {
                        solutionOwner: { select: { id: true, name: true, avatarEmoji: true } },
                    },
                },
            },
            orderBy: { lessonPath: 'asc' },
        });
        const states = await Promise.all(tasks.map((task) => buildTaskState(task, teacherId, studentId)));
        res.json({ states, teacherId });
    }
    catch (error) {
        const status = error === null || error === void 0 ? void 0 : error.status;
        if (status === 404) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Wochenaufgaben-Status:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.listWochenaufgabeStates = listWochenaufgabeStates;
/** Lehrer schaltet Wochenaufgabe frei (grau → gelb). Legt DB-Eintrag an bzw. setzt Phase zurück. */
const activateWochenaufgabe = async (req, res) => {
    try {
        const { groupId, lessonPath } = req.body;
        if (!groupId || !lessonPath) {
            return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
        }
        if (groupId.startsWith('__')) {
            return res.status(400).json({
                error: 'Reihe ist keiner Lerngruppe zugeordnet — bitte zuerst im Reihen-Tab freischalten.',
            });
        }
        const path = normalizePath(lessonPath);
        const group = await requireLearningGroup(groupId);
        const task = await prisma.wochenaufgabeTask.upsert({
            where: { groupId_lessonPath: { groupId, lessonPath: path } },
            create: { groupId, lessonPath: path, activatedAt: new Date() },
            update: {
                activatedAt: new Date(),
                peerAssignedAt: null,
                videoClaimStudentId: null,
                videoClaimedAt: null,
            },
        });
        await prisma.wochenaufgabePeerPair.deleteMany({ where: { taskId: task.id } });
        const state = await buildTaskState(task, group.teacherId);
        res.json({ task, state });
    }
    catch (error) {
        const prismaCode = error === null || error === void 0 ? void 0 : error.code;
        if (prismaCode === 'P2003') {
            return res.status(400).json({ error: 'Ungültige Lerngruppe — bitte Seite neu laden.' });
        }
        const status = error === null || error === void 0 ? void 0 : error.status;
        if (status === 404) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Wochenaufgabe aktivieren:', error);
        const detail = error instanceof Error ? error.message : String(error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            detail: process.env.NODE_ENV !== 'production' ? detail : undefined,
        });
    }
};
exports.activateWochenaufgabe = activateWochenaufgabe;
/** Schüler reserviert V (Erklärvideo). */
const claimWochenaufgabeVideo = async (req, res) => {
    var _a;
    try {
        const { groupId, lessonPath, studentId } = req.body;
        if (!groupId || !lessonPath || !studentId) {
            return res.status(400).json({ error: 'groupId, lessonPath und studentId sind erforderlich' });
        }
        const path = normalizePath(lessonPath);
        const task = await prisma.wochenaufgabeTask.findUnique({
            where: { groupId_lessonPath: { groupId, lessonPath: path } },
        });
        if (!(task === null || task === void 0 ? void 0 : task.activatedAt)) {
            return res.status(400).json({ error: 'Wochenaufgabe ist noch nicht freigegeben' });
        }
        if (computePhase(task.activatedAt) !== 'phase1') {
            return res.status(400).json({ error: 'Reservierung nur in Phase 1 möglich' });
        }
        if (task.videoClaimStudentId && task.videoClaimStudentId !== studentId) {
            return res.status(409).json({ error: 'Erklärvideo wurde bereits reserviert' });
        }
        const updated = await prisma.wochenaufgabeTask.update({
            where: { id: task.id },
            data: {
                videoClaimStudentId: studentId,
                videoClaimedAt: (_a = task.videoClaimedAt) !== null && _a !== void 0 ? _a : new Date(),
            },
            include: {
                videoClaimStudent: { select: { id: true, name: true, avatarEmoji: true } },
                peerPairs: {
                    include: {
                        solutionOwner: { select: { id: true, name: true, avatarEmoji: true } },
                    },
                },
            },
        });
        const teacherId = await getTeacherIdForGroup(groupId);
        const state = teacherId ? await buildTaskState(updated, teacherId, studentId) : null;
        res.json({ state });
    }
    catch (error) {
        console.error('Video reservieren:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.claimWochenaufgabeVideo = claimWochenaufgabeVideo;
//# sourceMappingURL=wochenaufgabenController.js.map