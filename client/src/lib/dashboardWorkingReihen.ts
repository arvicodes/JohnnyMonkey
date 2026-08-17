/** Arbeits-Reihen im Dashboard-Tab „Reihen“ — localStorage + Server-DB. */

import { isWochenaufgabenFolderName } from './wochenaufgabenFolder';

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

/** Mac-/Absolutpfade → git-intern/… für Schule + lokal. */
export function toPortableWorkingReihePath(raw: string): string {
  let p = normalizePath(raw);
  if (!p) return '';
  const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
  for (const m of markers) {
    const i = p.indexOf(m);
    if (i >= 0) {
      const rest = p.slice(i + m.length).replace(/^\/+/, '');
      return rest ? `git-intern/${rest}` : 'git-intern';
    }
  }
  if (p.startsWith('/app/J-M-Reihen/')) {
    return `git-intern/${p.slice('/app/J-M-Reihen/'.length)}`;
  }
  if (p.startsWith('Mathe/') || p.startsWith('Informatik/')) {
    return `git-intern/${p}`;
  }
  return p;
}

export function loadWorkingReihenPaths(): string[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_WORKING_REIHEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of parsed) {
      const p = toPortableWorkingReihePath(String(item));
      if (!p || seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveWorkingReihenPaths(paths: string[]): void {
  try {
    const normalized = paths.map(toPortableWorkingReihePath).filter(Boolean);
    localStorage.setItem(DASHBOARD_WORKING_REIHEN_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
}

/** Vom Server laden und mit lokalem Stand mergen (Union, portable Pfade). */
export async function fetchAndCacheWorkingReihenPaths(): Promise<string[]> {
  const local = loadWorkingReihenPaths();
  try {
    const res = await fetch('/api/teacher-dashboard-prefs/working-reihen', {
      credentials: 'include',
    });
    if (!res.ok) return local;
    const data = (await res.json()) as { paths?: unknown };
    const remoteRaw = Array.isArray(data.paths) ? data.paths : [];
    const remote = remoteRaw.map((p) => toPortableWorkingReihePath(String(p))).filter(Boolean);
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const p of [...remote, ...local]) {
      if (!p || seen.has(p)) continue;
      seen.add(p);
      merged.push(p);
    }
    saveWorkingReihenPaths(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function persistWorkingReihenPaths(paths: string[]): Promise<string[]> {
  const next = paths.map(toPortableWorkingReihePath).filter(Boolean);
  saveWorkingReihenPaths(next);
  try {
    const res = await fetch('/api/teacher-dashboard-prefs/working-reihen', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: next }),
    });
    if (res.ok) {
      const data = (await res.json()) as { paths?: unknown };
      if (Array.isArray(data.paths)) {
        const server = data.paths.map((p) => toPortableWorkingReihePath(String(p))).filter(Boolean);
        saveWorkingReihenPaths(server);
        return server;
      }
    }
  } catch {
    /* offline: localStorage reicht */
  }
  return next;
}

export function reiheLabelFromPath(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

type FsNode = { name?: string; path?: string; type?: string; children?: FsNode[] };

function isKlasseOrKursBlockName(name: string): boolean {
  const t = (name || '').trim();
  if (!t) return false;
  if (/^Klasse\s*\d+/i.test(t)) return true;
  if (/^MSS\b/i.test(t)) return true;
  if (/^\d{1,2}\s*[a-z]?$/i.test(t)) return true;
  return false;
}

/**
 * Sammelt Unterrichtsreihen unter J-M-Reihen:
 * Fach → Klasse/Block → Reihe
 * Plus Klassen-/Kurs-Blöcke (z. B. „Klasse 5“), wenn sie selbst Inhalt haben.
 */
export function collectReihenFromJmTree(root: FsNode | null | undefined): WorkingReiheOption[] {
  if (!root?.children?.length) return [];
  const out: WorkingReiheOption[] = [];
  const seen = new Set<string>();

  const add = (path: string, label: string, subject?: string) => {
    const p = toPortableWorkingReihePath(path) || normalizePath(path);
    if (!p || seen.has(p)) return;
    if (isWochenaufgabenFolderName(label)) return;
    seen.add(p);
    out.push({ path: p, label: label.trim() || reiheLabelFromPath(p), subject });
  };

  for (const subject of root.children) {
    if (subject.type !== 'directory') continue;
    const subjectName = (subject.name || '').trim();
    if (!subjectName || SKIP_TOP.has(subjectName)) continue;

    for (const block of subject.children || []) {
      if (block.type !== 'directory') continue;
      const blockName = (block.name || '').trim();
      const blockPath = normalizePath(
        block.path || `${subject.path || subjectName}/${blockName}`,
      );

      // Klasse 5 / MSS … als wählbare „Reihe“ (gesamter Jahrgangsordner)
      if (isKlasseOrKursBlockName(blockName)) {
        add(blockPath, blockName, subjectName);
      }

      for (const unit of block.children || []) {
        if (unit.type !== 'directory') continue;
        if (isWochenaufgabenFolderName(unit.name || '')) continue;
        const path = normalizePath(unit.path || `${blockPath}/${unit.name}`);
        add(path, unit.name || reiheLabelFromPath(path), subjectName);
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
  for (const o of discovered) {
    const path = toPortableWorkingReihePath(o.path) || normalizePath(o.path);
    map.set(path, { ...o, path });
  }
  for (const raw of assignedPaths) {
    const path = toPortableWorkingReihePath(raw) || normalizePath(raw);
    if (!path || map.has(path)) continue;
    if (isWochenaufgabenFolderName(reiheLabelFromPath(path))) continue;
    map.set(path, { path, label: reiheLabelFromPath(path) });
  }
  return Array.from(map.values()).sort((a, b) => {
    const s = (a.subject || '').localeCompare(b.subject || '', 'de');
    if (s !== 0) return s;
    return a.label.localeCompare(b.label, 'de');
  });
}
