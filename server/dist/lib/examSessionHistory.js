"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordExamSessionStarts = recordExamSessionStarts;
exports.closeOpenExamSessionsForGroups = closeOpenExamSessionsForGroups;
exports.getExamSessionHistoryForTeacher = getExamSessionHistoryForTeacher;
const examVersionPaths_1 = require("./examVersionPaths");
async function recordExamSessionStarts(prisma, entries) {
    if (!entries.length)
        return;
    await prisma.$transaction(entries.map((e) => prisma.lessonExamSession.create({
        data: {
            groupId: e.groupId,
            filePath: e.filePath.replace(/\\/g, '/').trim(),
            lessonPath: (e.lessonPath || '').replace(/\\/g, '/').trim(),
            beaconId: e.beaconId,
        },
    })));
}
async function closeOpenExamSessionsForGroups(prisma, groupIds) {
    const ids = [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))];
    if (!ids.length)
        return;
    const now = new Date();
    await prisma.lessonExamSession.updateMany({
        where: { groupId: { in: ids }, endedAt: null },
        data: { endedAt: now },
    });
}
async function countSubmissionsInWindow(prisma, examFilePath, groupId, startedAt, endedAt) {
    const group = await prisma.learningGroup.findUnique({
        where: { id: groupId },
        select: { students: { select: { id: true } } },
    });
    const studentIds = ((group === null || group === void 0 ? void 0 : group.students) || []).map((s) => s.id);
    if (!studentIds.length)
        return 0;
    const subs = await prisma.kASubmission.findMany({
        where: {
            studentId: { in: studentIds },
            submittedAt: { gte: startedAt, lte: endedAt },
        },
        select: { kaFilePath: true },
    });
    return subs.filter((s) => (0, examVersionPaths_1.kaPathsMatchFamily)(examFilePath, s.kaFilePath)).length;
}
async function getExamSessionHistoryForTeacher(prisma, teacherId, filePathRaw, limit = 80) {
    var _a;
    const teacher = teacherId.trim();
    const filePath = String(filePathRaw || '').replace(/\\/g, '/').trim();
    if (!teacher || !filePath)
        return [];
    const sessions = await prisma.lessonExamSession.findMany({
        where: { group: { teacherId: teacher } },
        include: { group: { select: { name: true } } },
        orderBy: { startedAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 200),
    });
    const filtered = sessions.filter((s) => (0, examVersionPaths_1.kaPathsMatchFamily)(filePath, s.filePath));
    const now = Date.now();
    const rows = [];
    for (const s of filtered) {
        const end = (_a = s.endedAt) !== null && _a !== void 0 ? _a : new Date(now);
        const durationMs = Math.max(0, end.getTime() - s.startedAt.getTime());
        const submissionCount = await countSubmissionsInWindow(prisma, s.filePath, s.groupId, s.startedAt, end);
        rows.push({
            id: s.id,
            groupId: s.groupId,
            groupName: s.group.name || 'Lerngruppe',
            startedAt: s.startedAt.toISOString(),
            endedAt: s.endedAt ? s.endedAt.toISOString() : null,
            durationMs,
            submissionCount,
            running: !s.endedAt,
        });
    }
    return rows;
}
//# sourceMappingURL=examSessionHistory.js.map