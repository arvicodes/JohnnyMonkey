export interface AssignedFolderEntry {
  path: string;
  displayOrder?: number;
  id?: string;
}

export function sortAssignedFolderPaths(folders: AssignedFolderEntry[]): string[] {
  return [...folders]
    .sort((a, b) => {
      const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.path.localeCompare(b.path, 'de');
    })
    .map((f) => f.path);
}

/** Normalisierter Pfadvergleich für Zuordnungen. */
export function normalizeAssignedFolderPath(path: string): string {
  let p = String(path || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const jm = p.indexOf('J-M-Reihen/');
  if (jm >= 0) p = p.slice(jm);
  if (p.startsWith('git-intern/')) {
    p = `J-M-Reihen/${p.slice('git-intern/'.length)}`;
  }
  return p;
}

/**
 * Unterordner-Zuordnungen ausblenden, wenn der Elternordner bereits zugewiesen ist
 * (z. B. „MSS 12 LK“ + „MSS 12 LK/12-01 Matrizen“ → nur Elternkarte).
 */
export function filterOutNestedAssignedFolderPaths(paths: string[]): string[] {
  const normalized = paths.map((p) => normalizeAssignedFolderPath(p));
  const seen = new Set<string>();
  return paths.filter((path, i) => {
    const n = normalized[i];
    if (!n || seen.has(n)) return false;
    const nestedUnderOther = normalized.some((other, j) => {
      if (i === j || !other || other === n) return false;
      return n.startsWith(`${other}/`);
    });
    if (nestedUnderOther) return false;
    seen.add(n);
    return true;
  });
}

/** Anzeigename für zugeordnete Ordner, z. B. „Informatik > 11-04 KI“. */
export function assignedFolderDisplayLabel(path: string): string {
  const parts = normalizeAssignedFolderPath(path).split('/').filter(Boolean);
  const base = parts[parts.length - 1] || path;
  if (!base) return path;
  const hasInformatik = parts.some((p) => /^Informatik$/i.test(p));
  if (hasInformatik && !/^Informatik$/i.test(base)) {
    return `Informatik > ${base}`;
  }
  return base;
}

export function assignedFolderSortableId(groupId: string, folderPath: string): string {
  return `assignedFolder:${groupId}:${folderPath}`;
}

export function parseAssignedFolderSortableId(id: string): { groupId: string; folderPath: string } | null {
  const prefix = 'assignedFolder:';
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  const sep = rest.indexOf(':');
  if (sep <= 0) return null;
  return {
    groupId: rest.slice(0, sep),
    folderPath: rest.slice(sep + 1),
  };
}

/** Schlüssel für auf-/zuklappbare Ordnerknoten (Root oder Unterordner). */
export function folderTreeNodeKey(groupId: string, rootPath: string, nodePath?: string): string {
  const root = rootPath.replace(/\\/g, '/');
  if (!nodePath || nodePath === '__root__') return `r:${groupId}:${root}`;
  return `b:${groupId}:${root}:${nodePath.replace(/\\/g, '/')}`;
}

export function isFolderTreeNodeExpanded(
  expanded: Record<string, boolean>,
  key: string,
  defaultExpanded = true
): boolean {
  if (expanded[key] === undefined) return defaultExpanded;
  return expanded[key];
}
