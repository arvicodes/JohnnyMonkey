-- CreateTable
CREATE TABLE "GradingSchema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GradingSchema_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
