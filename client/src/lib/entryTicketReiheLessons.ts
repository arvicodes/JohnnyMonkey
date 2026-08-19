/** Stunden einer Unterrichtsreihe unter J-M-Reihen für Entry-Ticket-Fragensets finden. */

import { isWochenaufgabenFolderName } from './wochenaufgabenFolder';

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
  if (Array.isArray(row.root) && row.root) {
    /* fall through */
  }
  if (row.root && typeof row.root === 'object') {
    const root = row.root as DirNode;
    if (Array.isArray(root.children)) return root.children;
  }
  if (Array.isArray(row.items)) return row.items as DirNode[];
  if (Array.isArray(row.children)) return row.children as DirNode[];
  return [];
}

function walkFindSeriesFolder(nodes: DirNode[], wantNorm: string, parentPath = ''): DirNode | null {
  for (const node of nodes) {
    const name = (node.name || '').trim();
    const path = ((node.path || `${parentPath}/${name}`) as string).replace(/\\/g, '/').replace(/\/+$/, '');
    const isDir = node.type === 'directory' || node.type === 'folder' || Array.isArray(node.children);
    if (!isDir) continue;
    if (normalizeFolderLabel(name) === wantNorm) return { ...node, path, name };
    if (node.children?.length) {
      const hit = walkFindSeriesFolder(node.children, wantNorm, path);
      if (hit) return hit;
    }
  }
  return null;
}

function collectStundeFolders(
  nodes: DirNode[],
  parentPath: string,
  topicName: string | undefined,
  out: DiscoveredReiheLesson[],
): void {
  for (const node of nodes) {
    const name = (node.name || '').trim();
    if (!name || name.startsWith('.')) continue;
    const path = ((node.path || `${parentPath}/${name}`) as string).replace(/\\/g, '/').replace(/\/+$/, '');
    const isDir = node.type === 'directory' || node.type === 'folder' || Array.isArray(node.children);
    if (!isDir) continue;

    if (isTopicSectionFolderName(name) || isChapterHeadingFolderName(name) || isSeriesHeadingFolderName(name)) {
      if (node.children?.length) {
        collectStundeFolders(node.children, path, name, out);
      }
      continue;
    }

    if (isWochenaufgabenFolderName(name) || /^Grafiken$/i.test(name) || isLessonRohdatArchiveFolderName(name)) {
      continue;
    }

    if (isStundeFolderName(name)) {
      out.push({
        lessonName: name,
        lessonKey: path,
        topicName,
      });
      continue;
    }

    if (node.children?.length) {
      collectStundeFolders(node.children, path, topicName, out);
    }
  }
}

async function readFolderTree(folderPath: string): Promise<DirNode[]> {
  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=true&t=${Date.now()}`,
    { credentials: 'include' },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return extractChildren(data);
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
  if (/^lk\s*mathe$/i.test(reiheName) || /^matrizen$/i.test(reiheName)) {
    out.push('git-intern/Mathe/MSS 12 LK/12-01 Matrizen');
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
  // „Mathe 5“ / „M5“ → Ordner „Klasse 5“
  const matheKlasse = lower.match(/^(?:mathe|m)\s*(\d{1,2})$/);
  if (matheKlasse) out.push(`Klasse ${matheKlasse[1]}`);
  if (/^klasse\s*\d+/i.test(want)) out.push(want.replace(/^klasse\s*/i, 'Klasse '));
  // „LK Mathe“ / „Matrizen“ oft unter MSS 12 LK
  if (/^lk\s*mathe$/i.test(want) || /^matrizen$/i.test(want)) {
    out.push('12-01 Matrizen', 'Matrizen');
  }
  if (/^ki$/i.test(want)) out.push('11-04 KI');
  return out.filter((v, i, a) => a.findIndex((x) => normalizeFolderLabel(x) === normalizeFolderLabel(v)) === i);
}

function lessonsFromSeriesFolder(
  seriesPath: string,
  children: DirNode[],
): { reihePath: string; lessons: DiscoveredReiheLesson[] } {
  const reihePath = toGitInternPath(seriesPath);
  const lessons: DiscoveredReiheLesson[] = [];
  collectStundeFolders(children, reihePath, undefined, lessons);
  for (const lesson of lessons) {
    lesson.lessonKey = toGitInternPath(lesson.lessonKey);
  }
  lessons.sort((a, b) => a.lessonName.localeCompare(b.lessonName, 'de', { numeric: true }));
  return { reihePath, lessons };
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
    const children = await readFolderTree(direct);
    if (children.length === 0) continue;
    return lessonsFromSeriesFolder(direct, children);
  }

  const candidates = reiheNameLookupCandidates(reiheName);
  if (candidates.length === 0) return { reihePath: null, lessons: [] };

  let rootPath = 'git-intern';
  try {
    const pathRes = await fetch('/api/file-system-paths/jm-reihen-path', { credentials: 'include' });
    if (pathRes.ok) {
      const data = (await pathRes.json()) as { path?: string };
      if (data.path) rootPath = toGitInternPath(data.path) || 'git-intern';
    }
  } catch {
    // fallback rootPath
  }

  const tree = await readFolderTree(rootPath);
  let series: DirNode | null = null;
  for (const cand of candidates) {
    series = walkFindSeriesFolder(tree, normalizeFolderLabel(cand), rootPath);
    if (series?.path) break;
  }
  if (!series?.path) {
    return { reihePath: null, lessons: [] };
  }

  const children = series.children?.length ? series.children : await readFolderTree(series.path);
  if (children.length === 0) return { reihePath: toGitInternPath(series.path), lessons: [] };
  return lessonsFromSeriesFolder(series.path, children);
}
