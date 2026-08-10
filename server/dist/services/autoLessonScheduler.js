"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIMETABLE_UPLOAD_DIR = void 0;
exports.runAutoLessonSchedulerTick = runAutoLessonSchedulerTick;
exports.startAutoLessonScheduler = startAutoLessonScheduler;
exports.ensureTimetableUploadDir = ensureTimetableUploadDir;
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const periodTimes_1 = require("../lib/periodTimes");
const lessonFolderShareSync_1 = require("./lessonFolderShareSync");
const prisma = new client_1.PrismaClient();
async function shareLessonFolder(groupId, lessonPath) {
    await (0, lessonFolderShareSync_1.syncLessonFolderShares)(groupId, lessonPath);
}
async function shareGroupAssignedMaterials(groupId) {
    const assignments = await prisma.groupAssignment.findMany({
        where: { groupId, type: 'FOLDER' },
    });
    for (const assignment of assignments) {
        await (0, lessonFolderShareSync_1.revokeNonMaterialSharesInTree)(groupId, assignment.refId);
    }
}
async function shareLessonForSlot(groupId, lessonPath) {
    if (lessonPath) {
        await shareLessonFolder(groupId, lessonPath);
    }
    else {
        await shareGroupAssignedMaterials(groupId);
    }
}
async function activateSession(sessionId, _groupId, _lessonPath) {
    await prisma.autoLessonSession.update({
        where: { id: sessionId },
        data: { status: 'ACTIVE', updatedAt: new Date() },
    });
}
async function closeSession(sessionId) {
    await prisma.autoLessonSession.update({
        where: { id: sessionId },
        data: { status: 'CLOSED', updatedAt: new Date() },
    });
}
async function runAutoLessonSchedulerTick() {
    var _a;
    const { date, dayOfWeek, now } = (0, periodTimes_1.getBerlinNow)();
    if (dayOfWeek < 1 || dayOfWeek > 5)
        return;
    // Prisma-Client kann unvollständig sein, wenn schema.prisma vom DB-Volume überdeckt wurde
    if (!((_a = prisma.teacherScheduleSettings) === null || _a === void 0 ? void 0 : _a.findMany)) {
        console.warn('[AutoLesson] teacherScheduleSettings fehlt im Prisma-Client — Tick übersprungen (DB-Volume darf prisma/ nicht mounten).');
        return;
    }
    const teachers = await prisma.teacherScheduleSettings.findMany({
        include: {
            teacher: {
                include: {
                    scheduleSlots: {
                        where: { dayOfWeek },
                        include: { group: true },
                    },
                },
            },
        },
    });
    for (const settings of teachers) {
        const periods = (0, periodTimes_1.parsePeriodTimes)(settings.periodTimes);
        const startWindow = settings.startWindowMinutes;
        const endWindow = settings.endWindowMinutes;
        for (const slot of settings.teacher.scheduleSlots) {
            const period = periods.find((p) => p.period === slot.periodNumber);
            if (!period)
                continue;
            const startsAt = (0, periodTimes_1.berlinDateTime)(date, period.start);
            const endsAt = (0, periodTimes_1.berlinDateTime)(date, period.end);
            const opensAt = new Date(startsAt.getTime() - startWindow * 60000);
            const closesAt = endsAt;
            if (now < opensAt || now >= endsAt) {
                const existing = await prisma.autoLessonSession.findUnique({
                    where: {
                        groupId_sessionDate_periodNumber: {
                            groupId: slot.groupId,
                            sessionDate: date,
                            periodNumber: slot.periodNumber,
                        },
                    },
                });
                if (existing && existing.status !== 'CLOSED' && now >= endsAt) {
                    await closeSession(existing.id);
                }
                continue;
            }
            let session = await prisma.autoLessonSession.findUnique({
                where: {
                    groupId_sessionDate_periodNumber: {
                        groupId: slot.groupId,
                        sessionDate: date,
                        periodNumber: slot.periodNumber,
                    },
                },
            });
            if (!session) {
                session = await prisma.autoLessonSession.create({
                    data: {
                        teacherId: settings.teacherId,
                        groupId: slot.groupId,
                        sessionDate: date,
                        dayOfWeek: slot.dayOfWeek,
                        periodNumber: slot.periodNumber,
                        lessonPath: slot.lessonPath,
                        opensAt,
                        startsAt,
                        endsAt,
                        closesAt,
                        status: 'OPEN',
                    },
                });
                await shareLessonForSlot(slot.groupId, slot.lessonPath);
            }
            if (session.status === 'OPEN' && now >= startsAt) {
                await activateSession(session.id, slot.groupId, null);
            }
            else if (session.status === 'ACTIVE' && now >= endsAt) {
                await closeSession(session.id);
            }
        }
    }
}
function startAutoLessonScheduler() {
    const tick = () => {
        runAutoLessonSchedulerTick().catch((err) => {
            console.error('[AutoLesson] Scheduler tick failed:', err);
        });
    };
    tick();
    setInterval(tick, 30000);
}
exports.TIMETABLE_UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/timetables');
function ensureTimetableUploadDir() {
    if (!fs_1.default.existsSync(exports.TIMETABLE_UPLOAD_DIR)) {
        fs_1.default.mkdirSync(exports.TIMETABLE_UPLOAD_DIR, { recursive: true });
    }
}
//# sourceMappingURL=autoLessonScheduler.js.map