import { parentDirGitPath } from './folienVersions';

type DirItem = { name?: string; path?: string; type?: string };

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

/**
 * Vorherige Stunde im selben Elternordner (nach Name sortiert, z. B. 01.01 → 01.02).
 */
export async function resolvePreviousLessonFolder(
  lessonPath: string
): Promise<{ path: string; name: string } | null> {
  const current = (lessonPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!current) return null;
  const parent = parentDirGitPath(current);
  if (!parent) return null;
  const currentName = current.split('/').pop() || '';

  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(parent)}&recursive=false&t=${Date.now()}`,
    { credentials: 'include' }
  );
  if (!res.ok) return null;
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

  const siblings = items
    .filter((i) => (i.type === 'directory' || i.type === 'folder') && isLessonSiblingFolderName(i.name || ''))
    .map((i) => ({
      name: (i.name || '').trim(),
      path: ((i.path || `${parent}/${i.name}`) as string).replace(/\\/g, '/').replace(/\/+$/, ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));

  const idx = siblings.findIndex(
    (s) => s.path === current || s.name === currentName || s.path.endsWith(`/${currentName}`)
  );
  if (idx <= 0) return null;
  return siblings[idx - 1];
}

/** lessonPath aus virtuellem H_Hausaufgabe-Pfad. */
export function lessonPathFromHomeworkAssignmentPath(filePath: string): string | null {
  const n = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!n.endsWith('/H_Hausaufgabe')) return null;
  return n.slice(0, -'/H_Hausaufgabe'.length) || null;
}
