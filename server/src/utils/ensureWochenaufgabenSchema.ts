import { PrismaClient } from '@prisma/client';

/** Legt Wochenaufgaben-Tabellen an, falls die DB aus backup_latest.db stammt (altes Schema). */
export async function ensureWochenaufgabenSchema(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WochenaufgabeTask" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "groupId" TEXT NOT NULL,
        "lessonPath" TEXT NOT NULL,
        "activatedAt" DATETIME,
        "videoClaimStudentId" TEXT,
        "videoClaimedAt" DATETIME,
        "peerAssignedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "WochenaufgabeTask_groupId_fkey"
          FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "WochenaufgabeTask_videoClaimStudentId_fkey"
          FOREIGN KEY ("videoClaimStudentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WochenaufgabeTask_groupId_lessonPath_key"
        ON "WochenaufgabeTask"("groupId", "lessonPath")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WochenaufgabeTask_groupId_idx"
        ON "WochenaufgabeTask"("groupId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WochenaufgabePeerPair" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "taskId" TEXT NOT NULL,
        "reviewerStudentId" TEXT NOT NULL,
        "solutionStudentId" TEXT NOT NULL,
        CONSTRAINT "WochenaufgabePeerPair_taskId_fkey"
          FOREIGN KEY ("taskId") REFERENCES "WochenaufgabeTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "WochenaufgabePeerPair_reviewerStudentId_fkey"
          FOREIGN KEY ("reviewerStudentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "WochenaufgabePeerPair_solutionStudentId_fkey"
          FOREIGN KEY ("solutionStudentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WochenaufgabePeerPair_taskId_reviewerStudentId_key"
        ON "WochenaufgabePeerPair"("taskId", "reviewerStudentId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WochenaufgabePeerPair_taskId_idx"
        ON "WochenaufgabePeerPair"("taskId")
    `);
  } catch (error) {
    console.error('Wochenaufgaben-Schema konnte nicht angelegt werden:', error);
    throw error;
  }
}
