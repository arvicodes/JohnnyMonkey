/** Arbeits-Reihen im Dashboard-Tab „Reihen“ (localStorage). */

export const DASHBOARD_WORKING_REIHEN_KEY = 'jm-dashboard-working-reihen-v1';

/** Virtuelle groupId nur für Content-Cache im Reihen-Tab. */
export const DASHBOARD_REIHEN_CONTENT_GROUP = '__dashboard_reihen__';

export type WorkingReiheOption = {
  path: string;
  label: string;
  subject?: string;
};

const SKIP_TOP = new Set([
  'Grafiken',
  'Folien - ALLE - BACKUP',
  'Wall-of-fame',
  'Erasmus',
  'Ankündigungen & Briefe',
  'Ankündigungen & Briefe',
  'Mini-Projekte',
]);

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export function loadWorkingReihenPaths(): string[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_WORKING_REIHEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => normalizePath(String(p))).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveWorkingReihenPaths(paths: string[]): void {
  try {
    localStorage.setItem(
      DASHBOARD_WORKING_REIHEN_KEY,
      JSON.stringify(paths.map(normalizePath).filter(Boolean)),
    );
  } catch {
    /* ignore */
  }
}

export function reiheLabelFromPath(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

type FsNode = { name?: string; path?: string; type?: string; children?: FsNode[] };

/**
 * Sammelt Unterrichtsreihen unter J-M-Reihen:
 * Fach → Klasse/Block → Reihe
 */
export function collectReihenFromJmTree(root: FsNode | null | undefined): WorkingReiheOption[] {
  if (!root?.children?.length) return [];
  const out: WorkingReiheOption[] = [];
  const seen = new Set<string>();

  for (const subject of root.children) {
    if (subject.type !== 'directory') continue;
    const subjectName = (subject.name || '').trim();
    if (!subjectName || SKIP_TOP.has(subjectName)) continue;

    for (const block of subject.children || []) {
      if (block.type !== 'directory') continue;
      for (const unit of block.children || []) {
        if (unit.type !== 'directory') continue;
        const path = normalizePath(unit.path || `${subject.path || subjectName}/${block.name}/${unit.name}`);
        if (!path || seen.has(path)) continue;
        seen.add(path);
        out.push({
          path,
          label: (unit.name || reiheLabelFromPath(path)).trim(),
          subject: subjectName,
        });
      }
    }
  }

  out.sort((a, b) => {
    const s = (a.subject || '').localeCompare(b.subject || '', 'de');
    if (s !== 0) return s;
    return a.label.localeCompare(b.label, 'de');
  });
  return out;
}

export function mergeReihenOptions(
  discovered: WorkingReiheOption[],
  assignedPaths: string[],
): WorkingReiheOption[] {
  const map = new Map<string, WorkingReiheOption>();
  for (const o of discovered) map.set(normalizePath(o.path), o);
  for (const raw of assignedPaths) {
    const path = normalizePath(raw);
    if (!path || map.has(path)) continue;
    map.set(path, { path, label: reiheLabelFromPath(path) });
  }
  return Array.from(map.values()).sort((a, b) => {
    const s = (a.subject || '').localeCompare(b.subject || '', 'de');
    if (s !== 0) return s;
    return a.label.localeCompare(b.label, 'de');
  });
}
