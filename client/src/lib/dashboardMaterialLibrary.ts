/**
 * Dashboard-Tabs „Prüfungen“ / „Interaktive Übungen“:
 * Materialien unter Arbeits-Reihen und zugeordneten Ordnern finden.
 */

import { isLessonCorrectionFileName } from './openLessonFolderFile';
import {
  DECK_FILENAME,
  presentationEditorUrl,
  presentationPresentUrl,
  sanitizeSlideExam,
} from './presentationDeck';
import {
  resolveInteractiveExercise,
} from './presentationInteractiveExercise';
import { parseReadApiChildren } from './wochenaufgabenFolder';

export type LibraryExamItem = {
  name: string;
  path: string;
  lessonFolder: string;
  lessonLabel: string;
  subject: string;
  stufe: string;
  reihe: string;
};

export type LibraryExerciseItem = {
  title: string;
  lessonPath: string;
  lessonLabel: string;
  slideId: string;
  slideIndex: number;
  subject: string;
  stufe: string;
  reihe: string;
};

function normalizeFsPath(path: string): string {
  return (path || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
}

/** Pfade vergleichbar machen (git-intern ↔ J-M-Reihen). */
function canonicalLibraryPath(path: string): string {
  let p = normalizeFsPath(path);
  if (p.startsWith('git-intern/')) p = `J-M-Reihen/${p.slice('git-intern/'.length)}`;
  if (p.startsWith('/git-intern/')) p = `J-M-Reihen/${p.slice('/git-intern/'.length)}`;
  return p;
}

function parentDir(path: string): string {
  const p = normalizeFsPath(path);
  const i = p.lastIndexOf('/');
  return i > 0 ? p.slice(0, i) : p;
}

/** Fach / Stufe / Reihe / Lektion aus Materialpfad. */
export function libraryPathHierarchy(path: string): {
  subject: string;
  stufe: string;
  reihe: string;
  lessonLabel: string;
} {
  const parts = canonicalLibraryPath(path)
    .replace(/^J-M-Reihen\//, '')
    .split('/')
    .filter(Boolean);
  const subject = parts[0] || '';
  const stufe = parts[1] || subject || 'Sonstiges';
  const reihe = parts[2] || stufe;
  const lesson = parts.length > 3 ? parts[parts.length - 1] : reihe;
  const lessonLabel =
    lesson && lesson !== reihe ? `${reihe} · ${lesson}` : reihe || stufe || path;
  return { subject, stufe, reihe, lessonLabel };
}

type FsNode = {
  name?: string;
  path?: string;
  type?: string;
  children?: FsNode[];
};

function flattenFiles(nodes: FsNode[], out: Array<{ name: string; path: string }> = []): Array<{ name: string; path: string }> {
  for (const n of nodes || []) {
    const name = String(n.name || '');
    const path = normalizeFsPath(String(n.path || ''));
    const type = String(n.type || '').toLowerCase();
    if ((type === 'file' || (!type && path && name.includes('.'))) && path) {
      out.push({ name, path });
    }
    if (Array.isArray(n.children) && n.children.length) flattenFiles(n.children, out);
  }
  return out;
}

async function readTree(folderPath: string): Promise<FsNode[]> {
  const folder = normalizeFsPath(folderPath);
  if (!folder) return [];
  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(folder)}&recursive=true&t=${Date.now()}`,
    {
      cache: 'no-cache',
      headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
    },
  );
  if (!res.ok) return [];
  const data = await res.json();
  // API liefert { path, root: { children: [...] } } — nicht ein Array.
  const fromHelper = parseReadApiChildren(data) as FsNode[];
  if (fromHelper.length) return fromHelper;
  if (Array.isArray(data)) return data as FsNode[];
  if (Array.isArray(data?.children)) return data.children as FsNode[];
  if (Array.isArray(data?.root?.children)) return data.root.children as FsNode[];
  if (data?.root && Array.isArray(data.root)) return data.root as FsNode[];
  return [];
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const res = await fetch(
      `/api/file-system-paths/load-whiteboard?filePath=${encodeURIComponent(filePath)}&t=${Date.now()}`,
      {
        cache: 'no-cache',
        headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function collectDeckPaths(rootPaths: string[], filesByRoot: Array<{ name: string; path: string }>[]): string[] {
  const deckPaths: string[] = [];
  for (const files of filesByRoot) {
    for (const f of files) {
      if (f.name === DECK_FILENAME) deckPaths.push(f.path);
    }
  }
  // Falls Ordner selbst eine Stunde/Kap ist und Deck direkt liegt — bereits in flatten.
  // Zusätzlich: bekannte Deck-Pfade unter Roots annehmen.
  for (const root of rootPaths) {
    const guess = `${normalizeFsPath(root)}/${DECK_FILENAME}`;
    deckPaths.push(guess);
  }
  return [...new Set(deckPaths.map(normalizeFsPath))];
}

export async function scanLibraryExams(rootPaths: string[]): Promise<LibraryExamItem[]> {
  const roots = [...new Set(rootPaths.map(normalizeFsPath).filter(Boolean))];
  const byKey = new Map<string, LibraryExamItem>();

  const addExam = (name: string, path: string, lessonFolder?: string) => {
    const fullPath = normalizeFsPath(path);
    if (!fullPath || !name) return;
    const folder = lessonFolder ? normalizeFsPath(lessonFolder) : parentDir(fullPath);
    const key = canonicalLibraryPath(fullPath).toLowerCase();
    if (byKey.has(key)) return;
    const h = libraryPathHierarchy(folder);
    byKey.set(key, {
      name,
      path: fullPath,
      lessonFolder: folder,
      lessonLabel: h.lessonLabel,
      subject: h.subject,
      stufe: h.stufe,
      reihe: h.reihe,
    });
  };

  const trees = await Promise.all(roots.map((root) => readTree(root)));
  const filesByRoot = trees.map((t) => flattenFiles(t));

  for (const files of filesByRoot) {
    for (const f of files) {
      if (!/\.(html|htm)$/i.test(f.name)) continue;
      if (!isLessonCorrectionFileName(f.name)) continue;
      addExam(f.name, f.path, parentDir(f.path));
    }
  }

  // Prüfungen, die an Folien hängen (slideExam), auch ohne Dateibaum-Treffer
  const deckPaths = collectDeckPaths(roots, filesByRoot);
  await Promise.all(
    deckPaths.map(async (deckPath) => {
      const lessonPath = parentDir(deckPath);
      const deck = await readJsonFile<{
        slides?: Array<{ slideExam?: unknown }>;
      }>(deckPath);
      if (!deck?.slides?.length) return;
      for (const slide of deck.slides) {
        const exam = sanitizeSlideExam(slide.slideExam as Parameters<typeof sanitizeSlideExam>[0]);
        if (!exam) continue;
        addExam(exam.name, exam.path, lessonPath);
      }
    }),
  );

  return [...byKey.values()].sort(
    (a, b) =>
      a.lessonLabel.localeCompare(b.lessonLabel, 'de', { sensitivity: 'base', numeric: true }) ||
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
  );
}

export async function scanLibraryInteractiveExercises(
  rootPaths: string[],
): Promise<LibraryExerciseItem[]> {
  const roots = [...new Set(rootPaths.map(normalizeFsPath).filter(Boolean))];
  const out: LibraryExerciseItem[] = [];
  const trees = await Promise.all(roots.map((root) => readTree(root)));
  const filesByRoot = trees.map((t) => flattenFiles(t));
  const uniqueDecks = collectDeckPaths(roots, filesByRoot);

  await Promise.all(
    uniqueDecks.map(async (deckPath) => {
      const lessonPath = parentDir(deckPath);
      const deck = await readJsonFile<{
        slides?: Array<{
          id?: string;
          title?: string;
          order?: number;
          slideInteractiveExercise?: unknown;
        }>;
      }>(deckPath);
      if (!deck?.slides?.length) return;
      const slides = [...deck.slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      slides.forEach((slide, idx) => {
        const exercise = resolveInteractiveExercise(
          slide.slideInteractiveExercise as Parameters<typeof resolveInteractiveExercise>[0],
        );
        if (!exercise) return;
        const title = exercise.title?.trim() || slide.title?.trim() || `Übung Folie ${idx + 1}`;
        const h = libraryPathHierarchy(lessonPath);
        out.push({
          title,
          lessonPath,
          lessonLabel: h.lessonLabel,
          slideId: String(slide.id || ''),
          slideIndex: idx + 1,
          subject: h.subject,
          stufe: h.stufe,
          reihe: h.reihe,
        });
      });
    }),
  );

  // Deduplizieren (gleiches Deck ggf. doppelt geraten)
  const seen = new Set<string>();
  const deduped = out.filter((item) => {
    const key = `${canonicalLibraryPath(item.lessonPath)}:${item.slideId || item.slideIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort(
    (a, b) =>
      a.lessonLabel.localeCompare(b.lessonLabel, 'de', { sensitivity: 'base', numeric: true }) ||
      a.slideIndex - b.slideIndex,
  );
}

export function examOpenUrl(filePath: string): string {
  return `/api/file-system-paths/read-html?filePath=${encodeURIComponent(filePath)}`;
}

export function exerciseEditorUrl(lessonPath: string, slideId?: string, groupId?: string): string {
  return presentationEditorUrl(lessonPath, groupId, undefined, slideId || null);
}

export function exercisePresentUrl(lessonPath: string, slideId?: string, groupId?: string): string {
  return presentationPresentUrl(lessonPath, groupId, undefined, undefined, undefined, slideId || null);
}
