-- CreateTable
CREATE TABLE "TeacherScheduleSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "startWindowMinutes" INTEGER NOT NULL DEFAULT 5,
    "endWindowMinutes" INTEGER NOT NULL DEFAULT 5,
    "periodTimes" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeacherScheduleSettings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherTimetableUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherTimetableUpload_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "lessonPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleSlot_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduleSlot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutoLessonSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "lessonPath" TEXT,
    "opensAt" DATETIME NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "closesAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutoLessonSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutoLessonSession_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherScheduleSettings_teacherId_key" ON "TeacherScheduleSettings"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherTimetableUpload_teacherId_idx" ON "TeacherTimetableUpload"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlot_teacherId_dayOfWeek_periodNumber_key" ON "ScheduleSlot"("teacherId", "dayOfWeek", "periodNumber");

-- CreateIndex
CREATE INDEX "ScheduleSlot_teacherId_idx" ON "ScheduleSlot"("teacherId");

-- CreateIndex
CREATE INDEX "ScheduleSlot_groupId_idx" ON "ScheduleSlot"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoLessonSession_groupId_sessionDate_periodNumber_key" ON "AutoLessonSession"("groupId", "sessionDate", "periodNumber");

-- CreateIndex
CREATE INDEX "AutoLessonSession_teacherId_sessionDate_idx" ON "AutoLessonSession"("teacherId", "sessionDate");

-- CreateIndex
CREATE INDEX "AutoLessonSession_groupId_status_idx" ON "AutoLessonSession"("groupId", "status");

-- CreateIndex
CREATE INDEX "AutoLessonSession_status_opensAt_idx" ON "AutoLessonSession"("status", "opensAt");
