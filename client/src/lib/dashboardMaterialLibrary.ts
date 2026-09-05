/**
 * Dashboard-Tabs „Prüfungen“ / „Interaktive Übungen“:
 * Materialien unter Arbeits-Reihen und zugeordneten Ordnern finden.
 */

import { isLessonCorrectionFileName } from './openLessonFolderFile';
import { DECK_FILENAME, presentationEditorUrl, presentationPresentUrl } from './presentationDeck';
import { slideHasInteractiveExercise } from './presentationInteractiveExercise';

export type LibraryExamItem = {
  name: string;
  path: string;
  lessonFolder: string;
  lessonLabel: string;
};

export type LibraryExerciseItem = {
  title: string;
  lessonPath: string;
  lessonLabel: string;
  slideId: string;
  slideIndex: number;
};

function normalizeFsPath(path: string): string {
  return (path || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
}

function parentDir(path: string): string {
  const p = normalizeFsPath(path);
  const i = p.lastIndexOf('/');
  return i > 0 ? p.slice(0, i) : p;
}

function lessonLabelFromPath(path: string): string {
  const parts = normalizeFsPath(path).split('/').filter(Boolean);
  const last = parts[parts.length - 1] || path;
  const kap = parts.find((p) => /^Kap\b/i.test(p) || /^Klasse\b/i.test(p));
  if (kap && last !== kap) return `${kap} · ${last}`;
  return last;
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
  if (Array.isArray(data)) return data as FsNode[];
  if (Array.isArray(data?.children)) return data.children as FsNode[];
  if (Array.isArray(data?.items)) return data.items as FsNode[];
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

export async function scanLibraryExams(rootPaths: string[]): Promise<LibraryExamItem[]> {
  const roots = [...new Set(rootPaths.map(normalizeFsPath).filter(Boolean))];
  const byPath = new Map<string, LibraryExamItem>();
  await Promise.all(
    roots.map(async (root) => {
      const files = flattenFiles(await readTree(root));
      for (const f of files) {
        if (!/\.(html|htm)$/i.test(f.name)) continue;
        if (!isLessonCorrectionFileName(f.name)) continue;
        const lessonFolder = parentDir(f.path);
        byPath.set(f.path, {
          name: f.name,
          path: f.path,
          lessonFolder,
          lessonLabel: lessonLabelFromPath(lessonFolder),
        });
      }
    }),
  );
  return [...byPath.values()].sort((a, b) =>
    a.lessonLabel.localeCompare(b.lessonLabel, 'de', { sensitivity: 'base', numeric: true }) ||
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }),
  );
}

export async function scanLibraryInteractiveExercises(
  rootPaths: string[],
): Promise<LibraryExerciseItem[]> {
  const roots = [...new Set(rootPaths.map(normalizeFsPath).filter(Boolean))];
  const out: LibraryExerciseItem[] = [];
  const deckPaths: string[] = [];
  await Promise.all(
    roots.map(async (root) => {
      const files = flattenFiles(await readTree(root));
      for (const f of files) {
        if (f.name === DECK_FILENAME) deckPaths.push(f.path);
      }
    }),
  );
  const uniqueDecks = [...new Set(deckPaths)];
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
        if (!slideHasInteractiveExercise(slide as { slideInteractiveExercise?: unknown })) return;
        const title =
          (slide.slideInteractiveExercise as { title?: string } | undefined)?.title?.trim() ||
          slide.title?.trim() ||
          `Übung Folie ${idx + 1}`;
        out.push({
          title,
          lessonPath,
          lessonLabel: lessonLabelFromPath(lessonPath),
          slideId: String(slide.id || ''),
          slideIndex: idx + 1,
        });
      });
    }),
  );
  return out.sort(
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
