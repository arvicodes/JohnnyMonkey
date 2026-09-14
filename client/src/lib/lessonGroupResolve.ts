import { folderPathCovers, folderPathsEquivalent } from './dashboardWorkingReihen';

export function resolveGroupIdsForLessonPath(
  lessonPath: string,
  groups: Array<{ id: string }>,
  assignedFolders: Record<string, string[]>,
  fallbackGroupId?: string,
): string[] {
  const want = lessonPath || '';
  const ids = groups
    .filter((g) =>
      (assignedFolders[g.id] || []).some(
        (p) => folderPathsEquivalent(p, want) || folderPathCovers(p, want),
      ),
    )
    .map((g) => g.id);
  if (ids.length) return ids;
  const fb = (fallbackGroupId || '').trim();
  return fb ? [fb] : [];
}
