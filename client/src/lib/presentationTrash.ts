import { htmlToPlain, normalizeSlide, PresentationDeck, PresentationSlide, type PresentationNotesInkStroke } from './presentationDeck';

export type TrashItemType = 'slide' | 'notes';

export type NotesTrashField = 'materialHtml' | 'preparationHtml' | 'speakerNotesHtml';

export interface PresentationTrashItem {
  id: string;
  type: TrashItemType;
  deletedAt: string;
  label: string;
  slide?: PresentationSlide;
  slideId?: string;
  slideOrder?: number;
  notesField?: NotesTrashField;
  materialHtml?: string;
  materialNotes?: string;
  preparationHtml?: string;
  preparationNotes?: string;
  speakerNotesHtml?: string;
  speakerNotes?: string;
  speakerNotesInk?: PresentationNotesInkStroke[];
}

export const MAX_TRASH_ITEMS = 40;

export function normalizeTrash(deck: PresentationDeck): PresentationTrashItem[] {
  return Array.isArray(deck.trash) ? deck.trash : [];
}

function capTrash(items: PresentationTrashItem[]): PresentationTrashItem[] {
  return items.slice(0, MAX_TRASH_ITEMS);
}

function notesFieldLabel(field: NotesTrashField): string {
  switch (field) {
    case 'materialHtml':
      return 'Notizen (Material)';
    case 'preparationHtml':
      return 'Notizen (Setup)';
    default:
      return 'Notizen';
  }
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
    materialHtml: normalized.materialHtml,
    materialNotes: normalized.materialNotes,
    preparationHtml: normalized.preparationHtml,
    preparationNotes: normalized.preparationNotes,
    speakerNotesHtml: normalized.speakerNotesHtml,
    speakerNotes: normalized.speakerNotes,
    speakerNotesInk: normalized.speakerNotesInk,
  };
}

export function createNotesTrashItem(
  slide: PresentationSlide,
  field: NotesTrashField
): PresentationTrashItem | null {
  const normalized = normalizeSlide(slide);
  const html =
    field === 'materialHtml'
      ? normalized.materialHtml
      : field === 'preparationHtml'
        ? normalized.preparationHtml
        : normalized.speakerNotesHtml;
  const plain =
    field === 'materialHtml'
      ? normalized.materialNotes
      : field === 'preparationHtml'
        ? normalized.preparationNotes
        : normalized.speakerNotes;
  const ink = field === 'speakerNotesHtml' ? normalized.speakerNotesInk : undefined;
  if (!html?.replace(/<[^>]+>/g, '').trim() && !plain?.trim() && !(ink?.length)) return null;

  return {
    id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'notes',
    deletedAt: new Date().toISOString(),
    label: `${notesFieldLabel(field)} — ${normalized.title || `Folie ${normalized.order + 1}`}`,
    slideId: normalized.id,
    slideOrder: normalized.order,
    notesField: field,
    materialHtml: field === 'materialHtml' ? normalized.materialHtml : undefined,
    materialNotes: field === 'materialHtml' ? normalized.materialNotes : undefined,
    preparationHtml: field === 'preparationHtml' ? normalized.preparationHtml : undefined,
    preparationNotes: field === 'preparationHtml' ? normalized.preparationNotes : undefined,
    speakerNotesHtml: field === 'speakerNotesHtml' ? normalized.speakerNotesHtml : undefined,
    speakerNotes: field === 'speakerNotesHtml' ? normalized.speakerNotes : undefined,
    speakerNotesInk: field === 'speakerNotesHtml' ? normalized.speakerNotesInk : undefined,
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
    // Alte Papierkorb-Einträge (Material/Setup) → in das eine Notizfeld mergen
    if (item.notesField === 'materialHtml') {
      return normalizeSlide({
        ...slide,
        materialHtml: item.materialHtml || '',
        materialNotes: item.materialNotes || htmlToPlain(item.materialHtml || ''),
      });
    }
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
      speakerNotesInk: item.speakerNotesInk,
    });
  });

  return {
    ...deck,
    slides,
    trash: removeTrashItem(deck, itemId),
  };
}
