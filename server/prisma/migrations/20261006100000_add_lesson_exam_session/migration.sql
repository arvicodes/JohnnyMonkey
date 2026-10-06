-- CreateTable
CREATE TABLE "LessonExamSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lessonPath" TEXT NOT NULL DEFAULT '',
    "beaconId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "LessonExamSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LessonExamSession_filePath_idx" ON "LessonExamSession"("filePath");

-- CreateIndex
CREATE INDEX "LessonExamSession_groupId_idx" ON "LessonExamSession"("groupId");

-- CreateIndex
CREATE INDEX "LessonExamSession_startedAt_idx" ON "LessonExamSession"("startedAt");
