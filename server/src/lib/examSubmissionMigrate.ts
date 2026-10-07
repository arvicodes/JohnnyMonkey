import { PrismaClient } from '@prisma/client';
import { getPossibleKaSubmissionPaths } from './examSubmissionPathVariants';

export async function migrateKaSubmissionsAfterExamRename(
  prisma: PrismaClient,
  fromPath: string,
  toPath: string,
): Promise<number> {
  const fromCandidates = getPossibleKaSubmissionPaths(fromPath);
  const toBasename = (toPath.replace(/\\/g, '/').split('/').pop() || toPath).trim();
  if (!toBasename) return 0;

  const subs = await prisma.kASubmission.findMany({
    where: { OR: fromCandidates.map((kaFilePath) => ({ kaFilePath })) },
  });
  let migrated = 0;
  for (const sub of subs) {
    if (sub.kaFilePath === toBasename) continue;
    const conflict = await prisma.kASubmission.findUnique({
      where: {
        kaFilePath_studentId: { kaFilePath: toBasename, studentId: sub.studentId },
      },
    });
    if (conflict && conflict.id !== sub.id) continue;
    await prisma.kASubmission.update({
      where: { id: sub.id },
      data: { kaFilePath: toBasename },
    });
    migrated += 1;
  }
  return migrated;
}
