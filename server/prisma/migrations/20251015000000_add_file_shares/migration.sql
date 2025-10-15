-- CreateTable
CREATE TABLE "FileShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FileShare_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FileShare_filePath_groupId_key" ON "FileShare"("filePath", "groupId");

