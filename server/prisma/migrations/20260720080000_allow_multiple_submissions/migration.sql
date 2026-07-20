-- Mehrere Dateien pro Schüler und Assignment erlauben
DROP INDEX IF EXISTS "Submission_assignmentId_studentId_key";
CREATE INDEX IF NOT EXISTS "Submission_assignmentId_studentId_idx" ON "Submission"("assignmentId", "studentId");
