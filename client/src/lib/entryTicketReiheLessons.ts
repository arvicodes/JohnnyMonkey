/** Stunden einer Unterrichtsreihe unter J-M-Reihen für Entry-Ticket-Fragensets finden. */

import { isWochenaufgabenFolderName } from './wochenaufgabenFolder';
import {
  collectReihenFromJmTree,
  mergeReihenOptions,
  type WorkingReiheOption,
} from './dashboardWorkingReihen';

export type DiscoveredReiheLesson = {
  lessonName: string;
  lessonKey: string;
  /** z. B. „01 Basiswissen“ */
  topicName?: string;
};

type DirNode = {
  name?: string;
  path?: string;
  type?: string;
  children?: DirNode[];
};

const FOLDER_CACHE_TTL_MS = 90_000;
const folderCache = new Map<string, { at: number; nodes: DirNode[] }>();
let catalogPromise: Promise<WorkingReiheOption[]> | null = null;

const CATALOG_SKIP_TOP = new Set([
  'Grafiken',
  'Folien - ALLE - BACKUP',
  'Wall-of-fame',
  'Erasmus',
  'Ankündigungen & Briefe',
  'Mini-Projekte',
]);

function normalizeFolderLabel(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
}

function isChapterHeadingFolderName(name: string): boolean {
  return /^(Kap\.?\s*\d+|Kapitel\s*\d+)/i.test((name || '').trim());
}

function isSeriesHeadingFolderName(name: string): boolean {
  return /^\d{1,2}[-–\s]\d{2}(\b|\s|$)/.test((name || '').trim());
}

function isTopicSectionFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (/^\d+\.\d+/.test(t)) return false;
  return /^\d+\s+/.test(t);
}

function isLessonRohdatArchiveFolderName(name: string): boolean {
  return (
    /^Rohdat/i.test((name || '').trim()) ||
    /Sicherheitskopie/i.test((name || '').trim()) ||
    /BACKUP/i.test((name || '').trim())
  );
}

/** Wie TeacherDashboard: klickbare Stundenordner. */
export function isStundeFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (!t || t.startsWith('.')) return false;
  if (isChapterHeadingFolderName(t)) return false;
  if (isSeriesHeadingFolderName(t)) return false;
  if (isTopicSectionFolderName(t)) return false;
  if (isLessonRohdatArchiveFolderName(t)) return false;
  if (isWochenaufgabenFolderName(t)) return false;
  return true;
}

function extractChildren(data: unknown): DirNode[] {
  if (Array.isArray(data)) return data as DirNode[];
  if (!data || typeof data !== 'object') return [];
  const row = data as Record<string, unknown>;
  if (row.root && typeof row.root === 'object') {
    const root = row.root as DirNode;
    if (Array.isArray(root.children)) return root.children;
  }
  if (Array.isArray(row.items)) return row.items as DirNode[];
  if (Array.isArray(row.children)) return row.children as DirNode[];
  return [];
}

function toGitInternPath(p: string): string {
  const n = (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (!n) return n;
  if (n === 'git-intern' || n.startsWith('git-intern/')) return n;
  const marker = '/J-M-Reihen/';
  const idx = n.indexOf(marker);
  if (idx >= 0) return `git-intern/${n.slice(idx + marker.length)}`;
  if (n.endsWith('/J-M-Reihen')) return 'git-intern';
  if (n === 'J-M-Reihen') return 'git-intern';
  if (n.startsWith('J-M-Reihen/')) return `git-intern/${n.slice('J-M-Reihen/'.length)}`;
  return n;
}

function folderCacheKey(folderPath: string): string {
  return toGitInternPath(folderPath) || folderPath;
}

/** Nur eine Ebene — kein rekursiver Baum mit allen Dateien. */
async function readFolderShallow(folderPath: string): Promise<DirNode[]> {
  const key = folderCacheKey(folderPath);
  const hit = folderCache.get(key);
  if (hit && Date.now() - hit.at < FOLDER_CACHE_TTL_MS) return hit.nodes;

  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=false`,
    { credentials: 'include' },
  );
  if (!res.ok) return [];
  const data = await res.json();
  const nodes = extractChildren(data);
  folderCache.set(key, { at: Date.now(), nodes });
  return nodes;
}

function klasseNumberFromReiheName(reiheName: string): string | null {
  const m = (reiheName || '').trim().match(/^(?:mathe|m|klasse)\s*0*(\d{1,2})$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 5 || n > 13) return null;
  return String(n);
}

/** Direkte Reihen-Pfade, ohne den ganzen J-M-Reihen-Baum zu durchsuchen. */
function reiheDirectPathCandidates(reiheName: string, knownReihePath?: string | null): string[] {
  const out: string[] = [];
  if (knownReihePath?.trim()) out.push(toGitInternPath(knownReihePath.trim()));
  const klasse = klasseNumberFromReiheName(reiheName);
  if (klasse) {
    out.push(`git-intern/Mathe/Klasse ${klasse}`);
    out.push(`J-M-Reihen/Mathe/Klasse ${klasse}`);
  }
  const lower = (reiheName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (
    /^lk\s*mathe$/i.test(reiheName) ||
    /^mathe\s*lk$/i.test(reiheName) ||
    /^matrizen$/i.test(reiheName) ||
    /^analysis$/i.test(reiheName)
  ) {
    out.push('git-intern/Mathe/MSS 12 LK/12-01 Matrizen');
    out.push('J-M-Reihen/Mathe/MSS 12 LK/12-01 Matrizen');
  }
  if (lower === 'ki') out.push('git-intern/Informatik/MSS Grundthemen/11-04 KI');
  return out.filter((v, i, a) => v && a.indexOf(v) === i);
}

/** Anzeigenamen → Ordnernamen unter J-M-Reihen (Entry-Ticket-Sets). */
function reiheNameLookupCandidates(reiheName: string): string[] {
  const want = (reiheName || '').trim();
  if (!want) return [];
  const out: string[] = [want];
  const lower = want.toLowerCase().replace(/\s+/g, ' ');
  const matheKlasse = lower.match(/^(?:mathe|m)\s*(\d{1,2})$/);
  if (matheKlasse) out.push(`Klasse ${matheKlasse[1]}`);
  if (/^klasse\s*\d+/i.test(want)) out.push(want.replace(/^klasse\s*/i, 'Klasse '));
  if (
    /^lk\s*mathe$/i.test(want) ||
    /^mathe\s*lk$/i.test(want) ||
    /^matrizen$/i.test(want) ||
    /^analysis$/i.test(want)
  ) {
    out.push('12-01 Matrizen', 'Matrizen', 'MSS 12 LK');
  }
  if (/^ki$/i.test(want)) out.push('11-04 KI');
  return out.filter((v, i, a) => a.findIndex((x) => normalizeFolderLabel(x) === normalizeFolderLabel(v)) === i);
}

function nodePath(node: DirNode, parentPath: string): string {
  const name = (node.name || '').trim();
  return ((node.path || `${parentPath}/${name}`) as string).replace(/\\/g, '/').replace(/\/+$/, '');
}

function isDirNode(node: DirNode): boolean {
  return node.type === 'directory' || node.type === 'folder' || Array.isArray(node.children);
}

/**
 * Stundenordner flach einsammeln — stoppt in der Stunde, lädt also keine Folien/PDFs.
 * Vorhandene children (API liefert oft 2 Ebenen) werden ohne Extra-Request genutzt.
 */
async function walkStundeFolders(
  folderPath: string,
  topicName: string | undefined,
  out: DiscoveredReiheLesson[],
  depth: number,
  knownChildren?: DirNode[],
): Promise<void> {
  if (depth > 5) return;
  const children = knownChildren ?? (await readFolderShallow(folderPath));
  const nested: Promise<void>[] = [];
  for (const node of children) {
    const name = (node.name || '').trim();
    if (!name || name.startsWith('.') || !isDirNode(node)) continue;
    const path = nodePath(node, folderPath);

    if (isTopicSectionFolderName(name) || isChapterHeadingFolderName(name) || isSeriesHeadingFolderName(name)) {
      nested.push(walkStundeFolders(path, name, out, depth + 1, node.children));
      continue;
    }

    if (isWochenaufgabenFolderName(name) || /^Grafiken$/i.test(name) || isLessonRohdatArchiveFolderName(name)) {
      continue;
    }

    if (isStundeFolderName(name)) {
      out.push({
        lessonName: name,
        lessonKey: toGitInternPath(path),
        topicName,
      });
      continue;
    }

    nested.push(walkStundeFolders(path, topicName, out, depth + 1, node.children));
  }
  if (nested.length) await Promise.all(nested);
}

async function lessonsFromSeriesPath(
  seriesPath: string,
): Promise<{ reihePath: string; lessons: DiscoveredReiheLesson[] }> {
  const reihePath = toGitInternPath(seriesPath);
  const lessons: DiscoveredReiheLesson[] = [];
  await walkStundeFolders(reihePath, undefined, lessons, 0);
  lessons.sort((a, b) => a.lessonName.localeCompare(b.lessonName, 'de', { numeric: true }));
  return { reihePath, lessons };
}

async function loadCatalogTree(): Promise<WorkingReiheOption[]> {
  let subjects = await readFolderShallow('J-M-Reihen');
  let rootName = 'J-M-Reihen';
  if (subjects.length === 0) {
    subjects = await readFolderShallow('git-intern');
    rootName = 'git-intern';
  }

  const treeChildren = await Promise.all(
    subjects
      .filter((subj) => isDirNode(subj) && subj.name && !CATALOG_SKIP_TOP.has(subj.name))
      .map(async (subj) => {
        const subjPath = nodePath(subj, rootName);
        // Ein Read pro Fach: Blöcke + Einheiten (API liefert zwei Ebenen).
        const blocks = await readFolderShallow(subjPath);
        return {
          ...subj,
          path: subjPath,
          type: 'directory',
          children: blocks
            .filter((block) => isDirNode(block) && block.name)
            .map((block) => {
              const blockPath = nodePath(block, subjPath);
              return {
                ...block,
                path: blockPath,
                type: 'directory',
                children: (block.children || []).filter(
                  (u) => isDirNode(u) && u.name && !isWochenaufgabenFolderName(u.name || ''),
                ),
              };
            }),
        };
      }),
  );

  return collectReihenFromJmTree({
    type: 'directory',
    name: rootName,
    path: rootName,
    children: treeChildren,
  });
}

/**
 * Sucht unter J-M-Reihen den Ordner mit dem Reihennamen und liefert alle Stundenordner
 * (z. B. „01.01 KI sucht Mensch“ oder „1.0 Zählen …“) in Anzeigereihenfolge.
 */
export async function discoverLessonsForReiheName(
  reiheName: string,
  knownReihePath?: string | null,
): Promise<{
  reihePath: string | null;
  lessons: DiscoveredReiheLesson[];
}> {
  for (const direct of reiheDirectPathCandidates(reiheName, knownReihePath)) {
    const found = await lessonsFromSeriesPath(direct);
    if (found.lessons.length > 0) return found;
  }

  const candidates = reiheNameLookupCandidates(reiheName);
  if (candidates.length === 0) return { reihePath: null, lessons: [] };

  const wantNorms = new Set(candidates.map((c) => normalizeFolderLabel(c)));
  try {
    const catalog = await loadEntryTicketReihenCatalog();
    const match = catalog.find((o) => {
      const label = normalizeFolderLabel(o.label);
      const leaf = normalizeFolderLabel((o.path.split('/').pop() || ''));
      return wantNorms.has(label) || wantNorms.has(leaf);
    });
    if (match?.path) return lessonsFromSeriesPath(match.path);
  } catch {
    /* Katalog optional */
  }

  return { reihePath: null, lessons: [] };
}

/** Stunden aller zugeordneten Unterrichtsreihen (ohne Namenssuche, wenn Pfade gesetzt sind). */
export async function discoverLessonsForCustomSet(set: {
  name: string;
  reihePath?: string;
  reihePaths?: string[];
}): Promise<{ reihePath: string | null; lessons: DiscoveredReiheLesson[] }> {
  const rawPaths = Array.isArray(set.reihePaths) ? set.reihePaths : [];
  const paths = [...rawPaths, set.reihePath || '']
    .map((p) => toGitInternPath(String(p || '').trim()))
    .filter((p, i, a) => Boolean(p) && a.indexOf(p) === i);

  if (paths.length === 0) {
    return discoverLessonsForReiheName(set.name, set.reihePath);
  }

  const batches = await Promise.all(paths.map((path) => lessonsFromSeriesPath(path)));
  const all: DiscoveredReiheLesson[] = [];
  const seen = new Set<string>();
  for (const found of batches) {
    for (const lesson of found.lessons) {
      const key = `${lesson.lessonKey}\n${lesson.lessonName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(lesson);
    }
  }
  return { reihePath: paths[0] ?? null, lessons: all };
}

/** Katalog aller Unterrichtsreihen unter J-M-Reihen für die Zuordnung am Kartenset. */
export async function loadEntryTicketReihenCatalog(
  extraPaths: string[] = [],
): Promise<WorkingReiheOption[]> {
  if (!catalogPromise) {
    catalogPromise = loadCatalogTree().catch((err) => {
      catalogPromise = null;
      throw err;
    });
  }
  const discovered = await catalogPromise;
  return mergeReihenOptions(discovered, extraPaths);
}
