/*
  Warnings:

  - You are about to drop the column `elementId` on the `GroupAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `elementType` on the `GroupAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GroupAssignment` table. All the data in the column will be lost.
  - Added the required column `refId` to the `GroupAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `GroupAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroupAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GroupAssignment" ("createdAt", "groupId", "id") SELECT "createdAt", "groupId", "id" FROM "GroupAssignment";
DROP TABLE "GroupAssignment";
ALTER TABLE "new_GroupAssignment" RENAME TO "GroupAssignment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
