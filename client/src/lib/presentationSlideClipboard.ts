import { htmlToPlain, normalizeSlide, type PresentationSlide } from './presentationDeck';

/** Globale Folien-Zwischenablage (über alle Präsentationen, Browser-localStorage). */

export const SLIDE_CLIPBOARD_STORAGE_KEY = 'jm-presentation-slide-clipboard-v1';
export const MAX_SLIDE_CLIPBOARD_ITEMS = 5;

export type PresentationSlideClipboardItem = {
  id: string;
  addedAt: string;
  label: string;
  /** Herkunftsstunde (Anzeige). */
  sourceLesson?: string;
  slide: PresentationSlide;
};

function lessonFolderName(lessonPath?: string): string | undefined {
  if (!lessonPath?.trim()) return undefined;
  const n = lessonPath.replace(/\\/g, '/').replace(/\/+$/, '');
  return n.split('/').pop() || undefined;
}

function slideLabel(slide: PresentationSlide): string {
  const title =
    slide.title?.trim() ||
    htmlToPlain(slide.titleHtml || '').trim() ||
    htmlToPlain(slide.bodyHtml || '').trim().slice(0, 40);
  return title || `Folie ${(slide.order ?? 0) + 1}`;
}

export function loadSlideClipboard(): PresentationSlideClipboardItem[] {
  try {
    const raw = localStorage.getItem(SLIDE_CLIPBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row): PresentationSlideClipboardItem | null => {
        if (!row || typeof row !== 'object') return null;
        const r = row as Record<string, unknown>;
        if (!r.slide || typeof r.slide !== 'object') return null;
        const slide = normalizeSlide(r.slide as PresentationSlide);
        return {
          id: typeof r.id === 'string' && r.id ? r.id : `clip-${Date.now()}`,
          addedAt: typeof r.addedAt === 'string' ? r.addedAt : new Date().toISOString(),
          label: typeof r.label === 'string' && r.label.trim() ? r.label.trim() : slideLabel(slide),
          sourceLesson:
            typeof r.sourceLesson === 'string' && r.sourceLesson.trim()
              ? r.sourceLesson.trim()
              : undefined,
          slide,
        };
      })
      .filter((x): x is PresentationSlideClipboardItem => Boolean(x))
      .slice(0, MAX_SLIDE_CLIPBOARD_ITEMS);
  } catch {
    return [];
  }
}

export function saveSlideClipboard(items: PresentationSlideClipboardItem[]): void {
  try {
    localStorage.setItem(
      SLIDE_CLIPBOARD_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_SLIDE_CLIPBOARD_ITEMS)),
    );
  } catch {
    // quota / private mode
  }
}

/** Folie vorne einreihen; ältere Einträge über MAX fallen weg. */
export function pushSlideToClipboard(
  slide: PresentationSlide,
  lessonPath?: string,
): PresentationSlideClipboardItem[] {
  const normalized = normalizeSlide(JSON.parse(JSON.stringify(slide)) as PresentationSlide);
  const item: PresentationSlideClipboardItem = {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString(),
    label: slideLabel(normalized),
    sourceLesson: lessonFolderName(lessonPath),
    slide: normalized,
  };
  const next = [item, ...loadSlideClipboard().filter((x) => x.id !== item.id)].slice(
    0,
    MAX_SLIDE_CLIPBOARD_ITEMS,
  );
  saveSlideClipboard(next);
  return next;
}

export function removeSlideFromClipboard(itemId: string): PresentationSlideClipboardItem[] {
  const next = loadSlideClipboard().filter((x) => x.id !== itemId);
  saveSlideClipboard(next);
  return next;
}

export function clearSlideClipboard(): PresentationSlideClipboardItem[] {
  saveSlideClipboard([]);
  return [];
}

/** Kopie mit neuen IDs zum Einfügen in ein Deck. */
export function cloneClipboardSlideForInsert(
  slide: PresentationSlide,
  order: number,
): PresentationSlide {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const base = normalizeSlide(JSON.parse(JSON.stringify(slide)) as PresentationSlide);
  return normalizeSlide({
    ...base,
    id: `slide-${stamp}`,
    order,
    elements: (base.elements || []).map((el, i) => ({
      ...el,
      id: `el-${stamp}-${i}`,
    })),
  });
}
