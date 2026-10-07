import type { PrismaClient } from '@prisma/client';
export declare function recordExamSessionStarts(prisma: PrismaClient, entries: Array<{
    groupId: string;
    filePath: string;
    lessonPath: string;
    beaconId: string;
}>): Promise<void>;
export declare function closeOpenExamSessionsForGroups(prisma: PrismaClient, groupIds: string[]): Promise<void>;
export type ExamSessionHistoryEntry = {
    id: string;
    groupId: string;
    groupName: string;
    startedAt: string;
    endedAt: string | null;
    durationMs: number;
    submissionCount: number;
    running: boolean;
};
export declare function getExamSessionHistoryForTeacher(prisma: PrismaClient, teacherId: string, filePathRaw: string, limit?: number): Promise<ExamSessionHistoryEntry[]>;
//# sourceMappingURL=examSessionHistory.d.ts.map