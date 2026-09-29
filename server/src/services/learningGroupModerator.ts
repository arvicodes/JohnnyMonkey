import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Pro Lerngruppe genau ein Moderator — sonst kann kein SuS das live Entry Ticket öffnen. */
export async function ensureDefaultModeratorForGroup(groupId: string): Promise<string | null> {
  const group = await prisma.learningGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      moderatorStudentId: true,
      students: { orderBy: { name: 'asc' }, select: { id: true }, take: 1 },
    },
  });
  if (!group || group.moderatorStudentId) return group?.moderatorStudentId ?? null;
  const first = group.students[0];
  if (!first) return null;
  await prisma.learningGroup.update({
    where: { id: groupId },
    data: { moderatorStudentId: first.id },
  });
  return first.id;
}

export async function ensureDefaultModeratorsForGroups(groupIds: string[]): Promise<void> {
  for (const gid of groupIds) {
    try {
      await ensureDefaultModeratorForGroup(gid);
    } catch (err) {
      console.warn('[ensureDefaultModerator] group', gid, err);
    }
  }
}
