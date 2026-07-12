import { parentDirGitPath } from './folienVersions';
import { JOHNNY_PRESENTATION } from './presentationTheme';
import type { PresentationTrashItem } from './presentationTrash';
import {
  normalizeSlideTransition,
  SLIDE_TRANSITIONS,
  type SlideTransition,
} from './presentationTransitions';
export type { SlideTransition } from './presentationTransitions';
export { SLIDE_TRANSITIONS };

export const DECK_FILENAME = 'Praesentation.deck.json';
export const ANNOTATIONS_FILENAME = 'Praesentation.annotations.json';

export const SLIDE_REF_WIDTH = 1920;
export const SLIDE_REF_HEIGHT = 1080;

export type SlideLayout =
  | 'title-slide'
  | 'title-content'
  | 'section'
  | 'two-column'
  | 'image-right'
  | 'image-left'
  | 'quote'
  | 'blank';

export type BodyStyle = 'plain' | 'bullets' | 'numbered';

/** Frei platzierbare Elemente — Basis für Bilder, Animationen etc. */
export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video';
  x: number;
  y: number;
  w: number;
  h: number;
  html?: string;
  src?: string;
  revealStep?: number;
  /** True wenn Animations-Schritt im Editor explizit gesetzt wurde (auch 0). */
  animationSet?: boolean;
  zIndex: number;
  imageFit?: 'contain' | 'cover';
}

export type PresentationStrokeMode = 'pen' | 'marker';

export type PresentationShapeKind = 'line' | 'rect' | 'ellipse' | 'arrow';

export interface PresentationStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  mode?: PresentationStrokeMode;
  markerOpacity?: number;
  shape?: PresentationShapeKind;
  /** Rotation in radians for box shapes (rect, ellipse). */
  rotation?: number;
}

export interface PresentationSlide {
  id: string;
  title: string;
  body: string;
  speakerNotes: string;
  preparationNotes?: string;
  materialNotes?: string;
  order: number;
  layout?: SlideLayout;
  subtitle?: string;
  bodyLeft?: string;
  bodyRight?: string;
  imagePath?: string;
  imageCaption?: string;
  bodyStyle?: BodyStyle;
  titleAlign?: 'left' | 'center';
  accentColor?: string;
  titleHtml?: string;
  bodyHtml?: string;
  subtitleHtml?: string;
  bodyLeftHtml?: string;
  bodyRightHtml?: string;
  imageCaptionHtml?: string;
  speakerNotesHtml?: string;
  preparationHtml?: string;
  materialHtml?: string;
  elements?: SlideElement[];
  transition?: SlideTransition;
  revealEnabled?: boolean;
  /** Einblend-Schritt pro Layout-Bereich (0 = sofort sichtbar). */
  zoneRevealSteps?: Partial<Record<string, number>>;
}

/** Inhalt der Folien-Fußleiste (deck-weit, auf jeder Folie). */
export interface PresentationSlideFooter {
  /** Linke Zeile — z. B. Stundentitel (leer = Präsentationstitel). */
  title?: string;
  /** Rechts — z. B. Schule, Datum, Fach. */
  right?: string;
}

export interface PresentationDeck {
  version: 1;
  title: string;
  lessonPath: string;
  updatedAt: string;
  slides: PresentationSlide[];
  defaultTransition?: SlideTransition;
  trash?: PresentationTrashItem[];
  /** Foliennummer unten rechts auf jeder Folie anzeigen. */
  showSlideNumbers?: boolean;
  /** Fußleiste mit Titel und Foliennummer. */
  showSlideFooter?: boolean;
  slideFooter?: PresentationSlideFooter;
}

export interface PresentationAnnotations {
  version: 1;
  lessonPath: string;
  updatedAt: string;
  bySlideId: Record<string, PresentationStroke[]>;
}

export function deckFilePath(lessonPath: string): string {
  const base = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  return `${base}/${DECK_FILENAME}`;
}

export function annotationsFilePath(lessonPath: string): string {
  const base = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  return `${base}/${ANNOTATIONS_FILENAME}`;
}

export function deckOriginalFilePath(lessonPath: string): string {
  const base = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  return `${base}/Praesentation.deck.original.json`;
}

export function lessonFolderPath(lessonPath: string): string {
  return lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function textToHtml(text: string): string {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split('\n')
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : '<p><br></p>'))
    .join('');
}

export function htmlToPlain(html: string): string {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\u00a0/g, ' ').trim();
}

export function slideImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `/api/file-system-paths/read-image?filePath=${encodeURIComponent(imagePath)}`;
}

export function normalizeSlide(slide: PresentationSlide): PresentationSlide {
  const layout = slide.layout ?? 'title-content';
  const centerLayouts: SlideLayout[] = ['title-slide', 'section', 'quote'];
  return {
    ...slide,
    layout,
    subtitle: slide.subtitle ?? '',
    bodyLeft: slide.bodyLeft ?? '',
    bodyRight: slide.bodyRight ?? '',
    imagePath: slide.imagePath ?? '',
    imageCaption: slide.imageCaption ?? '',
    bodyStyle: slide.bodyStyle ?? 'plain',
    titleAlign:
      slide.titleAlign ?? (centerLayouts.includes(layout) ? 'center' : 'left'),
    accentColor: slide.accentColor ?? JOHNNY_PRESENTATION.primary,
    titleHtml: slide.titleHtml ?? textToHtml(slide.title || ''),
    bodyHtml: slide.bodyHtml ?? textToHtml(slide.body || ''),
    subtitleHtml: slide.subtitleHtml ?? textToHtml(slide.subtitle || ''),
    bodyLeftHtml: slide.bodyLeftHtml ?? textToHtml(slide.bodyLeft || ''),
    bodyRightHtml: slide.bodyRightHtml ?? textToHtml(slide.bodyRight || ''),
    imageCaptionHtml: slide.imageCaptionHtml ?? textToHtml(slide.imageCaption || ''),
    speakerNotesHtml: slide.speakerNotesHtml ?? textToHtml(slide.speakerNotes || ''),
    preparationNotes: slide.preparationNotes ?? '',
    preparationHtml: slide.preparationHtml ?? textToHtml(slide.preparationNotes || ''),
    materialNotes: slide.materialNotes ?? '',
    materialHtml: slide.materialHtml ?? textToHtml(slide.materialNotes || ''),
    elements: slide.elements ?? [],
    transition: normalizeSlideTransition(slide.transition),
    revealEnabled: slide.revealEnabled !== false,
    zoneRevealSteps: slide.zoneRevealSteps ?? {},
  };
}

export function normalizeDeck(deck: PresentationDeck): PresentationDeck {
  return {
    ...deck,
    defaultTransition: deck.defaultTransition ?? 'fade',
    slides: sortSlides(deck.slides.map(normalizeSlide)),
    trash: Array.isArray(deck.trash) ? deck.trash : [],
    showSlideNumbers: deck.showSlideNumbers !== false,
    showSlideFooter: deck.showSlideFooter !== false,
    slideFooter: deck.slideFooter ?? {},
  };
}

export function createEmptyDeck(lessonPath: string, title?: string): PresentationDeck {
  return normalizeDeck({
    version: 1,
    title: title || 'Präsentation',
    lessonPath,
    updatedAt: new Date().toISOString(),
    defaultTransition: 'fade',
    slides: [
      {
        id: `slide-${Date.now()}`,
        title: 'Folie 1',
        body: '',
        speakerNotes: '',
        order: 0,
        layout: 'title-content',
      },
    ],
  });
}

export function createEmptyAnnotations(lessonPath: string): PresentationAnnotations {
  return {
    version: 1,
    lessonPath,
    updatedAt: new Date().toISOString(),
    bySlideId: {},
  };
}

export function sortSlides(slides: PresentationSlide[]): PresentationSlide[] {
  return [...slides].sort((a, b) => a.order - b.order);
}

export async function loadJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const res = await fetch(
      `/api/file-system-paths/load-whiteboard?filePath=${encodeURIComponent(filePath)}`
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function saveJsonFile(
  lessonPath: string,
  filename: string,
  data: unknown
): Promise<void> {
  const targetPath = lessonFolderPath(lessonPath);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('targetPath', targetPath);
  const res = await fetch('/api/file-system-paths/save-file', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Speichern fehlgeschlagen');
  }
}

export async function loadPresentationDeck(lessonPath: string): Promise<PresentationDeck> {
  const path = deckFilePath(lessonPath);
  const loaded = await loadJsonFile<PresentationDeck>(path);
  if (loaded?.slides?.length) {
    return normalizeDeck({ ...loaded, slides: sortSlides(loaded.slides) });
  }
  const { createDefaultTemplatesStore, createSlideFromTemplateKind } = await import(
    './presentationSlideTemplates'
  );
  const store = createDefaultTemplatesStore();
  const start = createSlideFromTemplateKind('start', 0, lessonPath, store);
  const ha = createSlideFromTemplateKind('ha', 1, lessonPath, store);
  const slides = [start, ha].filter((s): s is PresentationSlide => Boolean(s));
  const deck = normalizeDeck({
    version: 1,
    title: 'Präsentation',
    lessonPath,
    updatedAt: new Date().toISOString(),
    defaultTransition: 'fade',
    slides: slides.length
      ? slides
      : [
          {
            id: `slide-${Date.now()}`,
            title: 'Folie 1',
            body: '',
            speakerNotes: '',
            order: 0,
            layout: 'title-content',
          },
        ],
  });
  await saveJsonFile(lessonPath, DECK_FILENAME, deck);
  return deck;
}

export async function loadPresentationAnnotations(
  lessonPath: string
): Promise<PresentationAnnotations> {
  const path = annotationsFilePath(lessonPath);
  const loaded = await loadJsonFile<PresentationAnnotations>(path);
  if (loaded?.bySlideId) return loaded;
  const ann = createEmptyAnnotations(lessonPath);
  await saveJsonFile(lessonPath, ANNOTATIONS_FILENAME, ann);
  return ann;
}

export function presentationEditorUrl(lessonPath: string, groupId?: string): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  return `/presentation/edit?${qs.toString()}`;
}

export function presentationPresentUrl(lessonPath: string, groupId?: string): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  return `/presentation/present?${qs.toString()}`;
}

export function presentationReviewUrl(lessonPath: string, groupId?: string): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  return `/presentation/review?${qs.toString()}`;
}

/** @deprecated use lessonFolderPath */
export { parentDirGitPath };
