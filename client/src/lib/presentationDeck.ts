import { normalizeSlideHeroImageElements } from './presentationImageUtils';
import { sanitizeStoredFooter } from './presentationSlideFooter';
import { parentDirGitPath } from './folienVersions';
import { JOHNNY_PRESENTATION } from './presentationTheme';
import type { PresentationTrashItem } from './presentationTrash';
import { namedVersionSnapshotFilename } from './presentationLessonAssets';
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
  | 'blank';

export type BodyStyle = 'plain' | 'bullets' | 'numbered';

export type PresentationStrokeMode = 'pen' | 'marker';

export type PresentationShapeKind = 'line' | 'rect' | 'ellipse' | 'arrow';

/** Frei platzierbare Elemente — Basis für Bilder, Animationen etc. */
export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video' | 'embed' | 'shape';
  x: number;
  y: number;
  w: number;
  h: number;
  html?: string;
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
   * Nur HA-Folien: wenn true, dürfen SuS Dateien abgeben.
   * Fehlt/false → Folie sichtbar, aber kein Upload.
   */
  homeworkSubmissionRequired?: boolean;
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

export function normalizeSlide(slide: PresentationSlide): PresentationSlide {
  const layout = slide.layout ?? 'title-content';
  const centerLayouts: SlideLayout[] = ['title-slide', 'section', 'quote'];
  const speakerNotesFields = normalizedSpeakerNotesFields(slide);
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
    speakerNotes: speakerNotesFields.speakerNotes,
    speakerNotesHtml: speakerNotesFields.speakerNotesHtml,
    preparationNotes: slide.preparationNotes ?? '',
    preparationHtml: slide.preparationHtml ?? textToHtml(slide.preparationNotes || ''),
    materialNotes: slide.materialNotes ?? '',
    materialHtml: slide.materialHtml ?? textToHtml(slide.materialNotes || ''),
    elements: normalizeSlideHeroImageElements({
      ...slide,
      layout,
      elements: slide.elements ?? [],
    }),
    transition: normalizeSlideTransition(slide.transition),
    revealEnabled: slide.revealEnabled !== false,
    zoneRevealSteps: slide.zoneRevealSteps ?? {},
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
    title: 'Präsentation',
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
    title: 'Präsentation',
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
      lessonPath: loaded.lessonPath || lessonPath,
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
 * Snapshot laden; fehlt er (ältere PDFs vor Snapshot-System), aus dem aktuellen
 * Live-Stand nachziehen und speichern — gleiche Present-Ansicht wie Original inkl. Striche.
 * Überschreibt keine bereits vorhandenen Snapshots.
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
  const displayLabel = (label || slug.replace(/_/g, ' ')).trim() || slug;
  return writeNamedVersionSnapshot(lessonPath, displayLabel, slug, deck, annotations);
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

export function presentationEditorUrl(lessonPath: string, groupId?: string): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  return `/presentation/edit?${qs.toString()}`;
}

export function presentationPresentUrl(
  lessonPath: string,
  groupId?: string,
  variant?: PresentationViewerVariant,
  namedSlug?: string
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (namedSlug) qs.set('named', namedSlug);
  else if (variant === 'original') qs.set('variant', 'original');
  else if (variant === 'edited') qs.set('variant', 'edited');
  return `/presentation/present?${qs.toString()}`;
}

export function presentationReviewUrl(
  lessonPath: string,
  groupId?: string,
  variant?: PresentationViewerVariant,
  namedSlug?: string
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (namedSlug) qs.set('named', namedSlug);
  else if (variant === 'original') qs.set('variant', 'original');
  else if (variant === 'edited') qs.set('variant', 'edited');
  return `/presentation/review?${qs.toString()}`;
}

/** @deprecated use lessonFolderPath */
export { parentDirGitPath };
