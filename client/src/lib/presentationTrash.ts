import { htmlToPlain, normalizeSlide, PresentationDeck, PresentationSlide } from './presentationDeck';

export type TrashItemType = 'slide' | 'notes';

export interface PresentationTrashItem {
  id: string;
  type: TrashItemType;
  deletedAt: string;
  label: string;
  slide?: PresentationSlide;
  slideId?: string;
  slideOrder?: number;
  notesField?: 'preparationHtml' | 'speakerNotesHtml';
  preparationHtml?: string;
  preparationNotes?: string;
  speakerNotesHtml?: string;
  speakerNotes?: string;
}

export const MAX_TRASH_ITEMS = 40;

export function normalizeTrash(deck: PresentationDeck): PresentationTrashItem[] {
  return Array.isArray(deck.trash) ? deck.trash : [];
}

function capTrash(items: PresentationTrashItem[]): PresentationTrashItem[] {
  return items.slice(0, MAX_TRASH_ITEMS);
}

export function createSlideTrashItem(slide: PresentationSlide): PresentationTrashItem {
  const normalized = normalizeSlide(slide);
  return {
    id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'slide',
    deletedAt: new Date().toISOString(),
    label: normalized.title?.trim() || `Folie ${normalized.order + 1}`,
    slide: JSON.parse(JSON.stringify(normalized)),
    slideId: normalized.id,
    slideOrder: normalized.order,
    preparationHtml: normalized.preparationHtml,
    preparationNotes: normalized.preparationNotes,
    speakerNotesHtml: normalized.speakerNotesHtml,
    speakerNotes: normalized.speakerNotes,
  };
}

export function createNotesTrashItem(
  slide: PresentationSlide,
  field: 'preparationHtml' | 'speakerNotesHtml'
): PresentationTrashItem | null {
  const normalized = normalizeSlide(slide);
  const isPrep = field === 'preparationHtml';
  const html = isPrep ? normalized.preparationHtml : normalized.speakerNotesHtml;
  const plain = isPrep ? normalized.preparationNotes : normalized.speakerNotes;
  if (!html?.replace(/<[^>]+>/g, '').trim() && !plain?.trim()) return null;

  return {
    id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'notes',
    deletedAt: new Date().toISOString(),
    label: isPrep
      ? `Vorbereitung — ${normalized.title || `Folie ${normalized.order + 1}`}`
      : `Sprechakte — ${normalized.title || `Folie ${normalized.order + 1}`}`,
    slideId: normalized.id,
    slideOrder: normalized.order,
    notesField: field,
    preparationHtml: isPrep ? normalized.preparationHtml : undefined,
    preparationNotes: isPrep ? normalized.preparationNotes : undefined,
    speakerNotesHtml: !isPrep ? normalized.speakerNotesHtml : undefined,
    speakerNotes: !isPrep ? normalized.speakerNotes : undefined,
  };
}

export function addTrashItem(
  deck: PresentationDeck,
  item: PresentationTrashItem
): PresentationTrashItem[] {
  return capTrash([item, ...normalizeTrash(deck)]);
}

export function removeTrashItem(deck: PresentationDeck, itemId: string): PresentationTrashItem[] {
  return normalizeTrash(deck).filter((item) => item.id !== itemId);
}

export function restoreSlideFromTrash(
  deck: PresentationDeck,
  itemId: string
): { deck: PresentationDeck; restoredId: string | null } {
  const item = normalizeTrash(deck).find((entry) => entry.id === itemId && entry.type === 'slide');
  if (!item?.slide) return { deck, restoredId: null };

  const restored = normalizeSlide({
    ...item.slide,
    id: `slide-${Date.now()}`,
    order: deck.slides.length,
  });

  return {
    deck: {
      ...deck,
      slides: [...deck.slides, restored].map((slide, index) => ({ ...slide, order: index })),
      trash: removeTrashItem(deck, itemId),
    },
    restoredId: restored.id,
  };
}

export function restoreNotesFromTrash(
  deck: PresentationDeck,
  itemId: string,
  targetSlideId?: string | null
): PresentationDeck {
  const item = normalizeTrash(deck).find((entry) => entry.id === itemId && entry.type === 'notes');
  if (!item?.notesField) return deck;

  const slideId = targetSlideId || item.slideId;
  const slides = deck.slides.map((slide) => {
    if (slide.id !== slideId) return slide;
    if (item.notesField === 'preparationHtml') {
      return normalizeSlide({
        ...slide,
        preparationHtml: item.preparationHtml || '',
        preparationNotes: item.preparationNotes || htmlToPlain(item.preparationHtml || ''),
      });
    }
    return normalizeSlide({
      ...slide,
      speakerNotesHtml: item.speakerNotesHtml || '',
      speakerNotes: item.speakerNotes || htmlToPlain(item.speakerNotesHtml || ''),
    });
  });

  return {
    ...deck,
    slides,
    trash: removeTrashItem(deck, itemId),
  };
}
