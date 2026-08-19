import { normalizeSlideHeroImageElements } from './presentationImageUtils';
import { sanitizeStoredFooter, lessonFolderDisplayName } from './presentationSlideFooter';
import { parentDirGitPath } from './folienVersions';
import { JOHNNY_PRESENTATION } from './presentationTheme';
import type { PresentationTrashItem } from './presentationTrash';
import { namedVersionSnapshotFilename } from './presentationLessonAssets';
import type { SlideImageFrame } from './presentationImageFrames';
import {
  normalizeSlideTransition,
  SLIDE_TRANSITIONS,
  type SlideTransition,
} from './presentationTransitions';
export type { SlideTransition } from './presentationTransitions';
export { SLIDE_TRANSITIONS };

export const DECK_FILENAME = 'Praesentation.deck.json';
export const ANNOTATIONS_FILENAME = 'Praesentation.annotations.json';
export const DECK_ORIGINAL_FILENAME = 'Praesentation.deck.original.json';

/** SuS/Review: Original (Erstell-Stand) vs. bearbeitet (Live inkl. Striche). */
export type PresentationViewerVariant = 'original' | 'edited';

export const SLIDE_REF_WIDTH = 1920;
export const SLIDE_REF_HEIGHT = 1080;

/** Skalierung, damit die komplette Folie (16:9) in den Viewport passt — nicht nur nach Breite. */
export function slideFitScale(
  viewportWidth: number,
  viewportHeight: number,
  reserveBottom = 0,
): number {
  const w = Math.max(viewportWidth, 0);
  const h = Math.max(viewportHeight - reserveBottom, 0);
  if (w < 40 || h < 40) return 0;
  return Math.min(w / SLIDE_REF_WIDTH, h / SLIDE_REF_HEIGHT);
}

/** Play-Modus: komplette Folie in der Bühne (Toolbar liegt im Layout darunter). */
export function slidePresentScale(viewportWidth: number, viewportHeight: number): number {
  return slideFitScale(viewportWidth, viewportHeight, 0);
}

const SCALE_EPSILON = 1e-4;

/** Setzt Viewport-Skalierung nur bei echter Änderung (verhindert ResizeObserver-Schleifen). */
export function nextViewportScale(prev: number, viewportWidth: number, viewportHeight: number, mode: 'fit' | 'present' = 'fit'): number {
  const compute = mode === 'present' ? slidePresentScale : slideFitScale;
  const next = compute(viewportWidth, viewportHeight);
  if (next <= 0) return prev;
  return Math.abs(prev - next) < SCALE_EPSILON ? prev : next;
}

export type SlideLayout =
  | 'title-slide'
  | 'title-content'
  | 'section'
  | 'two-column'
  | 'image-right'
  | 'image-left'
  | 'quote'
  | 'blank'
  /** Freie Fläche ohne Logo/Fußzeile/Akzentlinie. */
  | 'blank-full';

export type BodyStyle = 'plain' | 'bullets' | 'numbered';

export type PresentationStrokeMode = 'pen' | 'marker';

export type PresentationShapeKind = 'line' | 'rect' | 'ellipse' | 'arrow';

/** Frei platzierbare Elemente — Basis für Bilder, Animationen etc. */
export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'embed' | 'shape' | 'card' | 'table';
  x: number;
  y: number;
  w: number;
  h: number;
  html?: string;
  /** Titelkopf bei type === 'card'. */
  titleHtml?: string;
  src?: string;
  /** Form-Art (nur type === 'shape'). */
  shapeKind?: PresentationShapeKind;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  revealStep?: number;
  /** True wenn Animations-Schritt im Editor explizit gesetzt wurde (auch 0). */
  animationSet?: boolean;
  zIndex: number;
  /** Hintergrund = hinter Textinhalt, Vordergrund = darüber (Standard). */
  stackLayer?: 'background' | 'foreground';
  imageFit?: 'contain' | 'cover';
  /** Bildausschnitt bei object-fit: cover (z. B. "40% 60%"). */
  imageObjectPosition?: string;
  /** Bildrahmen (PowerPoint-ähnlich: Linie, Passepartout, Schatten). */
  imageFrame?: SlideImageFrame;
  /** Standard-Zoom für Referenz-Embeds (1 = 100 %). */
  mediaZoom?: number;
}

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

export type LayoutZoneBox = { x: number; y: number; w: number; h: number };

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
  /**
   * Ausgeblendete Layout-Textzonen (z. B. `bodyHtml` bei Titel & Inhalt).
   * Die Zone bleibt im Deck, wird aber nicht gerendert — wiederherstellbar.
   */
  hiddenLayoutZones?: string[];
  /**
   * Freie Größe/Position der Layout-Textfelder in Folien-Prozent (1920×1080).
   * Fehlt der Eintrag, bleibt die Zone im normalen Flex-Layout.
   */
  layoutZoneBoxes?: Partial<Record<string, LayoutZoneBox>>;
  /**
   * Nur HA-Folien: wenn true, dürfen SuS Dateien abgeben.
   * Fehlt/false → Folie sichtbar, aber kein Upload.
   */
  homeworkSubmissionRequired?: boolean;
}

export function clampLayoutZoneBox(box: LayoutZoneBox): LayoutZoneBox {
  const x = Math.min(90, Math.max(0, box.x));
  const y = Math.min(90, Math.max(0, box.y));
  return {
    x,
    y,
    w: Math.min(100 - x, Math.max(10, box.w)),
    h: Math.min(100 - y, Math.max(8, box.h)),
  };
}

export function sanitizeLayoutZoneBoxes(
  raw?: PresentationSlide['layoutZoneBoxes'],
): PresentationSlide['layoutZoneBoxes'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const next: NonNullable<PresentationSlide['layoutZoneBoxes']> = {};
  for (const [key, box] of Object.entries(raw)) {
    if (!key || !box || typeof box !== 'object') continue;
    const x = Number((box as LayoutZoneBox).x);
    const y = Number((box as LayoutZoneBox).y);
    const w = Number((box as LayoutZoneBox).w);
    const h = Number((box as LayoutZoneBox).h);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) continue;
    next[key] = clampLayoutZoneBox({ x, y, w, h });
  }
  return Object.keys(next).length ? next : undefined;
}

export function withLayoutZoneBox(
  slide: PresentationSlide,
  zone: string,
  box: LayoutZoneBox,
): PresentationSlide {
  return {
    ...slide,
    layoutZoneBoxes: {
      ...(slide.layoutZoneBoxes || {}),
      [zone]: clampLayoutZoneBox(box),
    },
  };
}

export function isLayoutZoneHidden(slide: PresentationSlide, zone: string): boolean {
  return (slide.hiddenLayoutZones || []).includes(zone);
}

export function withHiddenLayoutZone(
  slide: PresentationSlide,
  zone: string,
  hidden: boolean,
): PresentationSlide {
  const current = slide.hiddenLayoutZones || [];
  if (hidden) {
    if (current.includes(zone)) return slide;
    return { ...slide, hiddenLayoutZones: [...current, zone] };
  }
  if (!current.includes(zone)) return slide;
  const next = current.filter((z) => z !== zone);
  return {
    ...slide,
    hiddenLayoutZones: next.length > 0 ? next : undefined,
  };
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
  /**
   * Nur in Praesentation.deck.original.json:
   * gesetzt beim ersten Live-Speichern in der Stunde → Original ist eingefroren.
   */
  johnnyOriginalFrozenAt?: string;
}

export interface PresentationAnnotations {
  version: 1;
  lessonPath: string;
  updatedAt: string;
  bySlideId: Record<string, PresentationStroke[]>;
}

/** Eingefrorene benannte Version (unabhängig vom Live-Arbeitsstand). */
export type PresentationNamedVersionSnapshot = {
  version: 1;
  label: string;
  slug: string;
  savedAt: string;
  deck: PresentationDeck;
  annotations: PresentationAnnotations;
};

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
  return `${base}/${DECK_ORIGINAL_FILENAME}`;
}

export function isOriginalDeckFrozen(deck: PresentationDeck | null | undefined): boolean {
  return Boolean(deck?.johnnyOriginalFrozenAt);
}

/** Arbeitsdeck ohne Freeze-Metadaten (die gehören nur in den Original-Snapshot). */
export function stripOriginalFreezeMeta(deck: PresentationDeck): PresentationDeck {
  const { johnnyOriginalFrozenAt: _frozen, ...rest } = deck;
  return rest;
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

export function slideImageUrl(imagePath: string, maxEdge?: number): string {
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const qs = new URLSearchParams({ filePath: imagePath });
  if (maxEdge && maxEdge > 0) qs.set('max', String(Math.round(maxEdge)));
  return `/api/file-system-paths/read-image?${qs.toString()}`;
}

/** Editor-Canvas: scharf genug, aber keine Multi-MB-Originale. */
export const SLIDE_IMAGE_EDITOR_MAX = 1280;
/** Filmstrip-Vorschau. */
export const SLIDE_IMAGE_THUMB_MAX = 280;


const LEGACY_BILD_SLIDE_SPEAKER_HINT =
  'Bild per Drag & Drop auf die Folie ziehen oder Element wählen → Bild einfügen.';

function notesHtmlIsEmpty(html?: string, plain?: string): boolean {
  const text = (plain ?? htmlToPlain(html || '')).replace(/\u00a0/g, ' ').trim();
  if (text) return false;
  // Bilder zählen als Inhalt (htmlToPlain liefert sonst leer)
  if (/<img\b/i.test(html || '')) return false;
  const stripped = (html || '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
  return !stripped;
}

function wrapNotesSection(label: string, html: string): string {
  const body = (html || '').trim() || '<p><br></p>';
  return `<p><strong>${label}</strong></p>${body}`;
}

function normalizedSpeakerNotesFields(slide: PresentationSlide): {
  speakerNotes: string;
  speakerNotesHtml: string;
} {
  const notes = (slide.speakerNotes || '').trim();
  const htmlPlain = htmlToPlain(slide.speakerNotesHtml || '').trim();
  if (notes === LEGACY_BILD_SLIDE_SPEAKER_HINT || htmlPlain === LEGACY_BILD_SLIDE_SPEAKER_HINT) {
    return { speakerNotes: '', speakerNotesHtml: '' };
  }
  return {
    speakerNotes: slide.speakerNotes ?? '',
    speakerNotesHtml: slide.speakerNotesHtml ?? textToHtml(slide.speakerNotes || ''),
  };
}

/**
 * Früher: drei Notizfelder (Material / Setup / Sprechakte).
 * Jetzt: ein Feld. Vorhandene Inhalte werden mit Überschriften zusammengeführt,
 * die alten Felder geleert — nichts geht verloren.
 */
export function consolidateSlideNotes(slide: PresentationSlide): Pick<
  PresentationSlide,
  | 'speakerNotes'
  | 'speakerNotesHtml'
  | 'materialNotes'
  | 'materialHtml'
  | 'preparationNotes'
  | 'preparationHtml'
> {
  const materialHtml = slide.materialHtml ?? textToHtml(slide.materialNotes || '');
  const preparationHtml = slide.preparationHtml ?? textToHtml(slide.preparationNotes || '');
  const speakerFields = normalizedSpeakerNotesFields(slide);
  const speakerNotesHtml =
    speakerFields.speakerNotesHtml || textToHtml(speakerFields.speakerNotes || '');
  const speakerNotes = speakerFields.speakerNotes;

  const matEmpty = notesHtmlIsEmpty(materialHtml, slide.materialNotes);
  const prepEmpty = notesHtmlIsEmpty(preparationHtml, slide.preparationNotes);
  const speakEmpty = notesHtmlIsEmpty(speakerNotesHtml, speakerNotes);

  if (matEmpty && prepEmpty) {
    return {
      speakerNotes,
      speakerNotesHtml: speakerNotesHtml || '<p><br></p>',
      materialNotes: '',
      materialHtml: '<p><br></p>',
      preparationNotes: '',
      preparationHtml: '<p><br></p>',
    };
  }

  const parts: string[] = [];
  const multi = [!matEmpty, !prepEmpty, !speakEmpty].filter(Boolean).length > 1;

  if (!matEmpty) {
    parts.push(multi ? wrapNotesSection('Material', materialHtml) : materialHtml);
  }
  if (!prepEmpty) {
    parts.push(multi ? wrapNotesSection('Setup', preparationHtml) : preparationHtml);
  }
  if (!speakEmpty) {
    parts.push(multi ? wrapNotesSection('Sprechakte', speakerNotesHtml) : speakerNotesHtml);
  }

  const mergedHtml = parts.join('') || '<p><br></p>';
  return {
    speakerNotes: htmlToPlain(mergedHtml),
    speakerNotesHtml: mergedHtml,
    materialNotes: '',
    materialHtml: '<p><br></p>',
    preparationNotes: '',
    preparationHtml: '<p><br></p>',
  };
}

export function normalizeSlide(slide: PresentationSlide): PresentationSlide {
  const layout = slide.layout ?? 'title-content';
  const centerLayouts: SlideLayout[] = ['title-slide', 'section', 'quote'];
  const notes = consolidateSlideNotes(slide);
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
    speakerNotes: notes.speakerNotes,
    speakerNotesHtml: notes.speakerNotesHtml,
    preparationNotes: notes.preparationNotes,
    preparationHtml: notes.preparationHtml,
    materialNotes: notes.materialNotes,
    materialHtml: notes.materialHtml,
    elements: normalizeSlideHeroImageElements({
      ...slide,
      layout,
      elements: slide.elements ?? [],
    }),
    transition: normalizeSlideTransition(slide.transition),
    revealEnabled: slide.revealEnabled !== false,
    zoneRevealSteps: slide.zoneRevealSteps ?? {},
    ...(Array.isArray(slide.hiddenLayoutZones) && slide.hiddenLayoutZones.length > 0
      ? { hiddenLayoutZones: slide.hiddenLayoutZones.filter((z) => typeof z === 'string') }
      : {}),
    ...(() => {
      const boxes = sanitizeLayoutZoneBoxes(slide.layoutZoneBoxes);
      return boxes ? { layoutZoneBoxes: boxes } : {};
    })(),
    ...(typeof slide.homeworkSubmissionRequired === 'boolean'
      ? { homeworkSubmissionRequired: slide.homeworkSubmissionRequired }
      : {}),
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
    slideFooter: sanitizeStoredFooter(deck.slideFooter, deck.lessonPath, deck.title),
  };
}

export function createEmptyDeck(lessonPath: string, title?: string): PresentationDeck {
  const deck = buildDefaultDeck(lessonPath);
  if (title) return normalizeDeck({ ...deck, title });
  return deck;
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

/** null = file missing (404). Throws on network/server errors so callers never treat failures as "empty". */
export async function loadJsonFile<T>(filePath: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(
      `/api/file-system-paths/load-whiteboard?filePath=${encodeURIComponent(filePath)}&t=${Date.now()}`,
      { cache: 'no-store' }
    );
  } catch {
    throw new Error('Server nicht erreichbar. Präsentation wurde nicht geladen.');
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Präsentation konnte nicht geladen werden (${res.status}).`);
  }
  return (await res.json()) as T;
}

export async function saveJsonFile(
  lessonPath: string,
  filename: string,
  data: unknown
): Promise<void> {
  const targetPath = lessonFolderPath(lessonPath);
  const body = JSON.stringify(data);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([body], { type: 'application/json' }),
        filename
      );
      formData.append('targetPath', targetPath);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 45_000);
      const res = await fetch('/api/file-system-paths/save-file', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Speichern fehlgeschlagen');
      }
      return;
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      const networkFail =
        aborted ||
        e instanceof TypeError ||
        (e instanceof Error && /Failed to fetch|NetworkError|aborted/i.test(e.message));
      const msg = networkFail
        ? 'Server kurz überlastet (Failed to fetch). Speichern wird wiederholt…'
        : e instanceof Error
          ? e.message
          : 'Speichern fehlgeschlagen';
      lastError = new Error(
        networkFail && attempt >= 3
          ? 'Server nicht erreichbar. Bitte App neu starten (npm run dev), dann erneut speichern.'
          : msg
      );
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error('Speichern fehlgeschlagen');
}

function buildDefaultDeck(lessonPath: string): PresentationDeck {
  return normalizeDeck({
    version: 1,
    title: lessonFolderDisplayName(lessonPath) || 'Präsentation',
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

async function buildStarterDeck(lessonPath: string): Promise<PresentationDeck> {
  const {
    DEFAULT_LESSON_SLIDE_TEMPLATE_KINDS,
    createSlideFromTemplateKind,
    loadSlideTemplates,
  } = await import('./presentationSlideTemplates');
  const store = await loadSlideTemplates(lessonPath);
  const slides = DEFAULT_LESSON_SLIDE_TEMPLATE_KINDS.map((kind, order) =>
    createSlideFromTemplateKind(kind, order, lessonPath, store)
  ).filter((s): s is PresentationSlide => Boolean(s));
  if (!slides.length) return buildDefaultDeck(lessonPath);
  return normalizeDeck({
    version: 1,
    title: lessonFolderDisplayName(lessonPath) || 'Präsentation',
    lessonPath,
    updatedAt: new Date().toISOString(),
    defaultTransition: 'fade',
    slides,
  });
}

export async function loadPresentationDeck(lessonPath: string): Promise<PresentationDeck> {
  const path = deckFilePath(lessonPath);
  const loaded = await loadJsonFile<PresentationDeck>(path);
  if (loaded?.slides?.length) {
    return normalizeDeck({
      ...loaded,
      // Immer den angefragten Stundenordner nutzen (nicht eingebetteten Fremdpfad aus der JSON).
      lessonPath,
      slides: sortSlides(loaded.slides),
    });
  }
  // File exists but is corrupt/empty — never overwrite silently.
  if (loaded) {
    throw new Error(
      'Präsentationsdatei ist leer oder beschädigt. Bestehende Datei wurde nicht überschrieben.'
    );
  }
  // Truly missing (404): create starter deck once for new lessons only.
  const deck = await buildStarterDeck(lessonPath);
  await saveJsonFile(lessonPath, DECK_FILENAME, deck);
  return deck;
}

export async function loadPresentationAnnotations(
  lessonPath: string
): Promise<PresentationAnnotations> {
  const path = annotationsFilePath(lessonPath);
  const loaded = await loadJsonFile<PresentationAnnotations>(path);
  if (loaded?.bySlideId) return loaded;
  // Missing file → create empty annotations. Corrupt/partial → keep empty in memory only.
  if (loaded) return createEmptyAnnotations(lessonPath);
  const ann = createEmptyAnnotations(lessonPath);
  await saveJsonFile(lessonPath, ANNOTATIONS_FILENAME, ann);
  return ann;
}

/** Erstell-Stand der Folien (ohne Live-Striche). null wenn noch kein Snapshot existiert. */
export async function loadPresentationOriginalDeck(
  lessonPath: string
): Promise<PresentationDeck | null> {
  const loaded = await loadJsonFile<PresentationDeck>(deckOriginalFilePath(lessonPath));
  if (!loaded?.slides?.length) return null;
  return normalizeDeck({
    ...loaded,
    lessonPath: loaded.lessonPath || lessonPath,
    slides: sortSlides(loaded.slides),
  });
}

export function namedVersionSnapshotFilePath(lessonPath: string, slug: string): string {
  const folder = lessonFolderPath(lessonPath);
  return `${folder}/${namedVersionSnapshotFilename(slug)}`;
}

/** Benannte Version laden (Deck + Striche zum Zeitpunkt des Speicherns). */
export async function loadNamedVersionSnapshot(
  lessonPath: string,
  slug: string
): Promise<PresentationNamedVersionSnapshot | null> {
  const loaded = await loadJsonFile<PresentationNamedVersionSnapshot>(
    namedVersionSnapshotFilePath(lessonPath, slug)
  );
  if (!loaded?.deck?.slides?.length) return null;
  const folder = lessonFolderPath(lessonPath);
  return {
    version: 1,
    label: loaded.label || slug,
    slug: loaded.slug || slug,
    savedAt: loaded.savedAt || '',
    deck: normalizeDeck({
      ...stripOriginalFreezeMeta(loaded.deck),
      lessonPath: loaded.deck.lessonPath || folder,
      slides: sortSlides(loaded.deck.slides),
    }),
    annotations: loaded.annotations?.bySlideId
      ? {
          ...loaded.annotations,
          lessonPath: loaded.annotations.lessonPath || folder,
        }
      : createEmptyAnnotations(folder),
  };
}

/**
 * Snapshot laden. Fehlt er (ältere PDFs vor Snapshot-System): nur In-Memory-Fallback
 * aus dem Live-Stand — niemals still auf Disk schreiben (sonst würde Öffnen einer
 * benannten Version Live-Inhalt in diese Version kopieren).
 */
export async function loadOrMigrateNamedVersionSnapshot(
  lessonPath: string,
  slug: string,
  label?: string
): Promise<PresentationNamedVersionSnapshot | null> {
  const existing = await loadNamedVersionSnapshot(lessonPath, slug);
  if (existing) return existing;

  const deck = await loadPresentationDeck(lessonPath);
  if (!deck?.slides?.length) return null;
  const annotations =
    (await loadPresentationAnnotations(lessonPath)) ?? createEmptyAnnotations(lessonPath);
  const folder = lessonFolderPath(lessonPath);
  const displayLabel = (label || slug.replace(/_/g, ' ')).trim() || slug;
  return {
    version: 1,
    label: displayLabel,
    slug,
    savedAt: '',
    deck: normalizeDeck({
      ...stripOriginalFreezeMeta(deck),
      lessonPath: folder,
      slides: sortSlides(deck.slides),
    }),
    annotations: {
      ...annotations,
      lessonPath: folder,
    },
  };
}

/** Benannte Version einfrieren — überschreibt nur diese Version, nie andere. */
export async function writeNamedVersionSnapshot(
  lessonPath: string,
  label: string,
  slug: string,
  deck: PresentationDeck,
  annotations: PresentationAnnotations
): Promise<PresentationNamedVersionSnapshot> {
  const folder = lessonFolderPath(lessonPath);
  const snapshot: PresentationNamedVersionSnapshot = {
    version: 1,
    label,
    slug,
    savedAt: new Date().toISOString(),
    deck: {
      ...stripOriginalFreezeMeta(normalizeDeck(deck)),
      lessonPath: folder,
      updatedAt: new Date().toISOString(),
    },
    annotations: {
      ...annotations,
      lessonPath: folder,
      updatedAt: new Date().toISOString(),
    },
  };
  await saveJsonFile(folder, namedVersionSnapshotFilename(slug), snapshot);
  return snapshot;
}

/**
 * Original-Snapshot schreiben.
 * - sync: Original = aktuelles Arbeitsdeck, nur solange noch nicht eingefroren
 * - freeze: Original einfrieren (einmalig); danach nie mehr überschreiben
 *
 * Original = immer die komplett unbearbeitete Erstell-Version (ohne Live-Striche,
 * ohne spätere Editor-Änderungen nach dem Freeze).
 */
export async function writeOriginalDeckSnapshot(
  lessonPath: string,
  workingDeck: PresentationDeck,
  mode: 'sync' | 'freeze'
): Promise<PresentationDeck> {
  const folder = lessonFolderPath(lessonPath);
  const existing = await loadPresentationOriginalDeck(folder);

  // Einmal eingefroren → Original bleibt für immer der unbearbeitete Stand
  if (isOriginalDeckFrozen(existing)) {
    return existing!;
  }

  if (mode === 'freeze') {
    // Beim Einfrieren: vorhandenen Sync-Stand behalten (Erstell-Phase), sonst Arbeitsdeck
    const base = existing ?? stripOriginalFreezeMeta(normalizeDeck(workingDeck));
    const snapshot: PresentationDeck = {
      ...normalizeDeck(stripOriginalFreezeMeta(base)),
      lessonPath: folder,
      updatedAt: new Date().toISOString(),
      johnnyOriginalFrozenAt: new Date().toISOString(),
    };
    await saveJsonFile(folder, DECK_ORIGINAL_FILENAME, snapshot);
    return snapshot;
  }

  // sync: Erstell-Phase — Original folgt dem Arbeitsdeck
  const snapshot: PresentationDeck = {
    ...stripOriginalFreezeMeta(normalizeDeck(workingDeck)),
    lessonPath: folder,
    updatedAt: new Date().toISOString(),
  };
  await saveJsonFile(folder, DECK_ORIGINAL_FILENAME, snapshot);
  return snapshot;
}

/**
 * Deck für SuS-/Review-Ansicht „Original“:
 * Immer Praesentation.deck.original.json, wenn vorhanden — nie das Arbeitsdeck
 * (sonst sieht man die bearbeitete Version). Ohne Snapshot: Arbeitsdeck nur als Fallback.
 */
export async function loadPresentationDeckForOriginalView(
  lessonPath: string
): Promise<PresentationDeck> {
  const existing = await loadPresentationOriginalDeck(lessonPath);
  if (existing?.slides?.length) {
    return existing;
  }
  return loadPresentationDeck(lessonPath);
}

export type PresentationPlanMode = 'create' | 'run' | 'background';

export function parsePresentationPlanMode(
  raw: string | null | undefined
): PresentationPlanMode | undefined {
  if (raw === 'create' || raw === 'run' || raw === 'background') return raw;
  return undefined;
}

export function presentationEditorUrl(
  lessonPath: string,
  groupId?: string,
  planMode?: PresentationPlanMode
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
    qs.set('planMode', planMode);
  }
  return `/presentation/edit?${qs.toString()}`;
}

export function presentationPresentUrl(
  lessonPath: string,
  groupId?: string,
  variant?: PresentationViewerVariant,
  namedSlug?: string,
  planMode?: PresentationPlanMode
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (namedSlug) qs.set('named', namedSlug);
  else if (variant === 'original') qs.set('variant', 'original');
  else if (variant === 'edited') qs.set('variant', 'edited');
  if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
    qs.set('planMode', planMode);
  }
  return `/presentation/present?${qs.toString()}`;
}

export function presentationReviewUrl(
  lessonPath: string,
  groupId?: string,
  variant?: PresentationViewerVariant,
  namedSlug?: string,
  planMode?: PresentationPlanMode
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (namedSlug) qs.set('named', namedSlug);
  else if (variant === 'original') qs.set('variant', 'original');
  else if (variant === 'edited') qs.set('variant', 'edited');
  if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
    qs.set('planMode', planMode);
  }
  return `/presentation/review?${qs.toString()}`;
}

/** @deprecated use lessonFolderPath */
export { parentDirGitPath };
