/**
 * Eine Präsentation pro Oberordner (Kap 1, 01 Basiswissen, …):
 * Startfolie vorn, danach die Stundeninhalte, jede Stunde mit ihrer Endfolie.
 */

import {
  ANNOTATIONS_FILENAME,
  DECK_FILENAME,
  DECK_ORIGINAL_FILENAME,
  createEmptyAnnotations,
  lessonFolderPath,
  loadJsonFile,
  normalizeDeck,
  saveJsonFile,
  sortSlides,
  stripOriginalFreezeMeta,
  type PresentationAnnotations,
  type PresentationDeck,
  type PresentationSlide,
} from './presentationDeck';
import {
  PLAY_VARIANTS_FILENAME,
  createEmptyPlayVariants,
  stripPlayLayerFromSlide,
  type PresentationPlayVariants,
} from './presentationPlayVariants';
import { isHomeworkSlide, slideHasEntryTicketButton } from './presentationSlideTemplates';
import { lessonFolderDisplayName } from './presentationSlideFooter';
import { isWochenaufgabenFolderName, isPresentationInternalFolderName } from './wochenaufgabenFolder';

export type CombinedChapterPresentation = {
  deck: PresentationDeck;
  original: PresentationDeck;
  annotations: PresentationAnnotations;
  variants: PresentationPlayVariants;
};

type DirNode = {
  name?: string;
  path?: string;
  type?: string;
  children?: DirNode[];
};

type HourSource = {
  name: string;
  path: string;
  deck: PresentationDeck;
  original: PresentationDeck;
  annotations: PresentationAnnotations;
  variants: PresentationPlayVariants;
};

export function isChapterHeadingFolderName(name: string): boolean {
  return /^(Kap\.?\s*\d+|Kapitel\s*\d+)/i.test((name || '').trim());
}

export function isSeriesHeadingFolderName(name: string): boolean {
  return /^\d{1,2}[-–\s]\d{2}(\b|\s|$)/.test((name || '').trim());
}

export function isTopicSectionFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (/^\d+\.\d+/.test(t)) return false;
  return /^\d+\s+/.test(t);
}

export function isPresentationUnitFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (!t) return false;
  return isChapterHeadingFolderName(t) || isTopicSectionFolderName(t);
}

function isHourFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (!t || t.startsWith('.')) return false;
  if (isPresentationInternalFolderName(t)) return false;
  if (isWochenaufgabenFolderName(t)) return false;
  if (isChapterHeadingFolderName(t)) return false;
  if (isSeriesHeadingFolderName(t)) return false;
  if (isTopicSectionFolderName(t)) return false;
  if (/^Rohdat/i.test(t) || /Sicherheitskopie/i.test(t) || /BACKUP/i.test(t)) return false;
  return true;
}

export function isStartSlide(slide: PresentationSlide | null | undefined): boolean {
  if (!slide) return false;
  if (slideHasEntryTicketButton(slide)) return true;
  const title = `${slide.title || ''} ${slide.titleHtml || ''}`.toLowerCase();
  if (slide.layout === 'title-slide' && /guten morgen/.test(title)) return true;
  return false;
}

export function isEndSlide(slide: PresentationSlide | null | undefined): boolean {
  if (!slide) return false;
  if (isHomeworkSlide(slide)) return true;
  const title = `${slide.title || ''} ${slide.titleHtml || ''}`.toLowerCase();
  if (/bis zur n(ä|ae)chsten stunde/.test(title)) return true;
  return (slide.elements || []).some((el) => {
    if (el.type !== 'image' || !el.src) return false;
    return /(?:^|\/)Endroboter\.png$/i.test(el.src.replace(/\\/g, '/'));
  });
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function nodePath(node: DirNode, parentPath: string): string {
  const name = (node.name || '').trim();
  return ((node.path || `${parentPath}/${name}`) as string).replace(/\\/g, '/').replace(/\/+$/, '');
}

function hourSlidesForCombine(slides: PresentationSlide[], hourIndex: number): PresentationSlide[] {
  const sorted = sortSlides(slides);
  if (!sorted.length) return [];
  if (hourIndex > 0 && isStartSlide(sorted[0])) return sorted.slice(1);
  return sorted;
}

function remapSlideId(slideId: string, hourKey: string, used: Set<string>): string {
  if (!used.has(slideId)) {
    used.add(slideId);
    return slideId;
  }
  let next = `${hourKey}__${slideId}`;
  let n = 2;
  while (used.has(next)) {
    next = `${hourKey}__${slideId}__${n}`;
    n += 1;
  }
  used.add(next);
  return next;
}

function tagSlide(
  slide: PresentationSlide,
  order: number,
  id: string,
  hour: Pick<HourSource, 'name' | 'path'>,
): PresentationSlide {
  return {
    ...stripPlayLayerFromSlide(cloneJson(slide)),
    id,
    order,
    sourceLessonName: hour.name,
    sourceLessonPath: hour.path,
  };
}

export function combineHourPresentations(
  parentPath: string,
  hours: HourSource[],
): CombinedChapterPresentation {
  const folder = lessonFolderPath(parentPath);
  const usedIds = new Set<string>();
  const slides: PresentationSlide[] = [];
  const originalSlides: PresentationSlide[] = [];
  const bySlideId: PresentationAnnotations['bySlideId'] = {};
  const variantById: PresentationPlayVariants['bySlideId'] = {};
  const combinedFrom: NonNullable<PresentationDeck['combinedFrom']> = [];

  hours.forEach((hour, hourIndex) => {
    combinedFrom.push({
      lessonPath: hour.path,
      lessonName: hour.name,
      updatedAt: hour.deck.updatedAt,
    });
    const idMap = new Map<string, string>();
    const working = hourSlidesForCombine(hour.deck.slides || [], hourIndex);
    const originals = hourSlidesForCombine(hour.original.slides || [], hourIndex);
    const originalByOldId = new Map(originals.map((s) => [s.id, s]));

    for (const slide of working) {
      const newId = remapSlideId(slide.id, `h${hourIndex}`, usedIds);
      idMap.set(slide.id, newId);
      slides.push(tagSlide(slide, slides.length, newId, hour));
      const orig = originalByOldId.get(slide.id) ?? slide;
      originalSlides.push(tagSlide(orig, originalSlides.length, newId, hour));
    }

    for (const orig of originals) {
      if (idMap.has(orig.id)) continue;
      const newId = remapSlideId(orig.id, `h${hourIndex}`, usedIds);
      idMap.set(orig.id, newId);
      originalSlides.push(tagSlide(orig, originalSlides.length, newId, hour));
    }

    for (const [oldId, strokes] of Object.entries(hour.annotations.bySlideId || {})) {
      if (!strokes?.length) continue;
      const newId = idMap.get(oldId) ?? remapSlideId(oldId, `h${hourIndex}`, usedIds);
      bySlideId[newId] = cloneJson(strokes);
    }
    for (const [oldId, variant] of Object.entries(hour.variants.bySlideId || {})) {
      if (!variant?.slide) continue;
      const newId = idMap.get(oldId) ?? remapSlideId(oldId, `h${hourIndex}`, usedIds);
      variantById[newId] = {
        ...cloneJson(variant),
        slide: {
          ...cloneJson(variant.slide),
          id: newId,
          sourceLessonName: hour.name,
          sourceLessonPath: hour.path,
        },
      };
    }
  });

  const first = hours[0]?.deck;
  const title = lessonFolderDisplayName(folder) || first?.title || 'Präsentation';
  const now = new Date().toISOString();
  const deck: PresentationDeck = normalizeDeck({
    version: 1,
    title,
    lessonPath: folder,
    updatedAt: now,
    slides,
    defaultTransition: first?.defaultTransition ?? 'fade',
    showSlideNumbers: first?.showSlideNumbers,
    showSlideFooter: first?.showSlideFooter,
    slideFooter: first?.slideFooter,
    combinedFrom,
  });
  const original: PresentationDeck = normalizeDeck({
    ...stripOriginalFreezeMeta(deck),
    slides: originalSlides,
    updatedAt: now,
    combinedFrom,
  });
  const annotations: PresentationAnnotations = {
    version: 1,
    lessonPath: folder,
    updatedAt: now,
    bySlideId,
  };
  const variants: PresentationPlayVariants = {
    version: 1,
    lessonPath: folder,
    updatedAt: now,
    bySlideId: variantById,
  };
  return { deck, original, annotations, variants };
}

async function readFolderShallow(folderPath: string): Promise<DirNode[]> {
  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=false&t=${Date.now()}`,
    { credentials: 'include', cache: 'no-store' },
  );
  if (!res.ok) return [];
  return extractChildren(await res.json());
}

async function loadHourSource(path: string, name: string): Promise<HourSource | null> {
  const deck = await loadJsonFile<PresentationDeck>(`${path}/${DECK_FILENAME}`);
  if (!deck?.slides?.length) return null;
  const original =
    (await loadJsonFile<PresentationDeck>(`${path}/${DECK_ORIGINAL_FILENAME}`)) ?? deck;
  const annotations =
    (await loadJsonFile<PresentationAnnotations>(`${path}/${ANNOTATIONS_FILENAME}`)) ??
    createEmptyAnnotations(path);
  const variants =
    (await loadJsonFile<PresentationPlayVariants>(`${path}/${PLAY_VARIANTS_FILENAME}`)) ??
    createEmptyPlayVariants(path);
  return {
    name,
    path: lessonFolderPath(path),
    deck,
    original: original?.slides?.length ? original : deck,
    annotations: annotations?.bySlideId ? annotations : createEmptyAnnotations(path),
    variants: variants?.bySlideId ? variants : createEmptyPlayVariants(path),
  };
}

export async function listChildHourFolders(
  parentPath: string,
): Promise<{ name: string; path: string }[]> {
  const parent = lessonFolderPath(parentPath);
  const children = await readFolderShallow(parent);
  return children
    .filter((node) => {
      const name = (node.name || '').trim();
      const isDir = node.type === 'directory' || node.type === 'folder' || Array.isArray(node.children);
      return isDir && isHourFolderName(name);
    })
    .map((node) => ({
      name: (node.name || '').trim(),
      path: nodePath(node, parent),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
}

export async function tryCombineChildHourPresentations(
  parentPath: string,
): Promise<CombinedChapterPresentation | null> {
  const parent = lessonFolderPath(parentPath);
  const parentName = lessonFolderDisplayName(parent);
  if (isWochenaufgabenFolderName(parentName) || isPresentationInternalFolderName(parentName)) {
    return null;
  }

  const folders = await listChildHourFolders(parent);
  if (!folders.length) return null;

  const hours: HourSource[] = [];
  for (const folder of folders) {
    const hour = await loadHourSource(folder.path, folder.name);
    if (hour) hours.push(hour);
  }
  if (!hours.length) return null;

  const combined = combineHourPresentations(parent, hours);
  await saveJsonFile(parent, DECK_FILENAME, combined.deck);
  await saveJsonFile(parent, DECK_ORIGINAL_FILENAME, combined.original);
  await saveJsonFile(parent, ANNOTATIONS_FILENAME, combined.annotations);
  await saveJsonFile(parent, PLAY_VARIANTS_FILENAME, combined.variants);
  return combined;
}
