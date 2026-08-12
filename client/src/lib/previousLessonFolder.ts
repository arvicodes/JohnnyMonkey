import { parentDirGitPath } from './folienVersions';

type DirItem = { name?: string; path?: string; type?: string };

export type LessonFolderRef = { path: string; name: string };

function isLessonSiblingFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (!t || t.startsWith('.')) return false;
  if (/^Rohdat/i.test(t) || /Sicherheitskopie/i.test(t) || /BACKUP/i.test(t)) return false;
  // Themenblock „01 Basiswissen“ — keine Stunde
  if (/^\d+\s+/.test(t) && !/^\d+\.\d+/.test(t)) return false;
  // Kapitel-Überschriften o. ä.
  if (/^Kapitel\b/i.test(t)) return false;
  return true;
}

export async function listLessonSiblingFolders(lessonPath: string): Promise<LessonFolderRef[]> {
  const current = (lessonPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!current) return [];
  const parent = parentDirGitPath(current);
  if (!parent) return [];

  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(parent)}&recursive=false&t=${Date.now()}`,
    { credentials: 'include' },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const items: DirItem[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.root?.children)
      ? data.root.children
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.children)
          ? data.children
          : [];

  return items
    .filter((i) => (i.type === 'directory' || i.type === 'folder') && isLessonSiblingFolderName(i.name || ''))
    .map((i) => ({
      name: (i.name || '').trim(),
      path: ((i.path || `${parent}/${i.name}`) as string).replace(/\\/g, '/').replace(/\/+$/, ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
}

function indexOfLesson(siblings: LessonFolderRef[], lessonPath: string): number {
  const current = (lessonPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const currentName = current.split('/').pop() || '';
  return siblings.findIndex(
    (s) => s.path === current || s.name === currentName || s.path.endsWith(`/${currentName}`),
  );
}

/**
 * Vorherige und nächste Stunde im selben Elternordner (nach Name sortiert, z. B. 01.01 → 01.02).
 */
export async function resolveAdjacentLessonFolders(
  lessonPath: string,
): Promise<{ prev: LessonFolderRef | null; next: LessonFolderRef | null }> {
  const siblings = await listLessonSiblingFolders(lessonPath);
  const idx = indexOfLesson(siblings, lessonPath);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
  };
}

/**
 * Vorherige Stunde im selben Elternordner (nach Name sortiert, z. B. 01.01 → 01.02).
 */
export async function resolvePreviousLessonFolder(
  lessonPath: string,
): Promise<LessonFolderRef | null> {
  const { prev } = await resolveAdjacentLessonFolders(lessonPath);
  return prev;
}

/** lessonPath aus virtuellem H_Hausaufgabe-Pfad. */
export function lessonPathFromHomeworkAssignmentPath(filePath: string): string | null {
  const n = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!n.endsWith('/H_Hausaufgabe')) return null;
  return n.slice(0, -'/H_Hausaufgabe'.length) || null;
}
