"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateKaSubmissionsAfterExamRename = migrateKaSubmissionsAfterExamRename;
const examSubmissionPathVariants_1 = require("./examSubmissionPathVariants");
async function migrateKaSubmissionsAfterExamRename(prisma, fromPath, toPath) {
    const fromCandidates = (0, examSubmissionPathVariants_1.getPossibleKaSubmissionPaths)(fromPath);
    const toBasename = (toPath.replace(/\\/g, '/').split('/').pop() || toPath).trim();
    if (!toBasename)
        return 0;
    const subs = await prisma.kASubmission.findMany({
        where: { OR: fromCandidates.map((kaFilePath) => ({ kaFilePath })) },
    });
    let migrated = 0;
    for (const sub of subs) {
        if (sub.kaFilePath === toBasename)
            continue;
        const conflict = await prisma.kASubmission.findUnique({
            where: {
                kaFilePath_studentId: { kaFilePath: toBasename, studentId: sub.studentId },
            },
        });
        if (conflict && conflict.id !== sub.id)
            continue;
        await prisma.kASubmission.update({
            where: { id: sub.id },
            data: { kaFilePath: toBasename },
        });
        migrated += 1;
    }
    return migrated;
}
//# sourceMappingURL=examSubmissionMigrate.js.map