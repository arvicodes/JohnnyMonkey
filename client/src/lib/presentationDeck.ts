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
/** Extra volle Folienhöhen unter der ersten Seite (0 = normales 16:9). */
export const MAX_SLIDE_EXTRA_PAGES = 6;
export const MAX_SLIDE_MEDIA_VERSIONS = 8;

export function slideExtraPageCount(slide?: { extraPageCount?: number } | null): number {
  const n = Number(slide?.extraPageCount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_SLIDE_EXTRA_PAGES, Math.round(n));
}

export function slidePageCount(slide?: { extraPageCount?: number } | null): number {
  return 1 + slideExtraPageCount(slide);
}

export function slideLogicalHeight(slide?: { extraPageCount?: number } | null): number {
  return SLIDE_REF_HEIGHT * slidePageCount(slide);
}

/** Element-y/h liegt in Prozent einer Folienseite — CSS-% der ganzen (ggf. hohen) Folie. */
export function pagePctToCssPct(pagePct: number, pageCount: number): number {
  const pages = Math.max(1, pageCount);
  return pagePct / pages;
}

export function slidePageCountFromEl(el: Element | null | undefined): number {
  if (!el) return 1;
  const node =
    (el.closest?.('[data-pres-pages]') as HTMLElement | null) ||
    (el.querySelector?.('[data-pres-pages]') as HTMLElement | null) ||
    (el as HTMLElement);
  const n = Number(node.dataset?.presPages);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_SLIDE_EXTRA_PAGES + 1, Math.round(n));
}

export function slidePageHeightPx(totalHeightPx: number, pageCount = 1): number {
  const pages = Math.max(1, pageCount);
  const h = Number(totalHeightPx);
  if (!Number.isFinite(h) || h <= 0) return 0;
  return h / pages;
}

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

export type PresentationShapeKind = 'line' | 'rect' | 'ellipse' | 'arrow' | 'curved-arrow' | 'connector';

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
  /** PPTX-Verbinder: Diagonale der Box (sonst bleibt der Pfeil waagerecht). */
  flipH?: boolean;
  flipV?: boolean;
  /** Bogenstärke für curved-arrow (−80…80, Prozent der Boxhöhe). Legacy — shapeCurveControl bevorzugt. */
  curveBend?: number;
  /** Pfad-Eckpunkte in lokaler Box (0–100). */
  shapePoints?: Array<{ x: number; y: number }>;
  /** Bögen: Kontrollpunkt (0–100). */
  shapeCurveControl?: { x: number; y: number };
  /** Pfeilspitze: Größe in viewBox-Einheiten (4–28). */
  arrowHeadSize?: number;
  /** Drehung in Grad, um die Mitte (Bild, Linie, Pfeil, Form). */
  rotation?: number;
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
  /**
   * Echtes Zuschneiden: Lage des ganzen Bildes auf der Folie (Prozent).
   * Der Element-Rahmen (x/y/w/h) ist das Fenster — alles außerhalb wird abgeschnitten.
   */
  imageSourceRect?: { x: number; y: number; w: number; h: number };
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
  /** Pfeilspitze für Tinten-Pfeile (4–36, Standard ~22). */
  arrowHeadSize?: number;
  /** Bogenstärke für curved-arrow (−80…80). */
  curveBend?: number;
  /** Rotation in radians for box shapes (rect, ellipse). */
  rotation?: number;
  /** Füllfarbe für Rechteck/Kreis (Tinte). Leer/transparent = nur Umriss. */
  fillColor?: string;
  /**
   * GoodNotes-Import: gefüllte Silhouette (nicht Mittellinie).
   * Sieht aus wie die Original-Schrift, bleibt aber lassobar.
   */
  filled?: boolean;
  /** Löcher in Buchstaben (o, a, 8, …) — even-odd Fill. */
  holes?: { x: number; y: number }[][];
}

export function isFilledInkStroke(stroke: PresentationStroke): boolean {
  return Boolean(stroke.filled) && !stroke.shape && stroke.points.length >= 3;
}

/** Freihand in den Foliennotizen — gleiche Stroke-Struktur wie auf der Folie (Slide-Koordinaten). */
export type PresentationNotesInkStroke = PresentationStroke;

/** Altes Format (CSS-Pixel des Notizfelds, ohne id). */
type LegacyNotesInkStroke = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export function isLegacyNotesInkStroke(raw: unknown): raw is LegacyNotesInkStroke {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Record<string, unknown>;
  return Array.isArray(s.points) && typeof s.width === 'number' && typeof s.id !== 'string';
}

/** Alte Notiz-Tinte (CSS-Pixel) → Folien-Koordinaten für DrawOverlay. */
export function migrateLegacyNotesInkToSlideSpace(
  raw: LegacyNotesInkStroke[],
  hostW: number,
  hostH: number,
): PresentationStroke[] {
  const sx = SLIDE_REF_WIDTH / Math.max(1, hostW);
  const sy = SLIDE_REF_HEIGHT / Math.max(1, hostH);
  const out: PresentationStroke[] = [];
  raw.forEach((s, i) => {
    if (!s?.points?.length) return;
    const points = s.points
      .map((p) => ({ x: Number(p?.x) * sx, y: Number(p?.y) * sy }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (points.length < 1) return;
    if (points.length === 1) points.push({ x: points[0].x + 0.01, y: points[0].y });
    const width = Number(s.width);
    out.push({
      id: `notes-legacy-${i}-${Math.round(points[0].x)}-${Math.round(points[0].y)}`,
      points,
      color: typeof s.color === 'string' && s.color ? s.color : '#111827',
      lineWidth: Number.isFinite(width) ? Math.max(0.8, Math.min(48, width * sx)) : 3 * sx,
      mode: 'pen',
    });
  });
  return out;
}

export function notesInkNeedsHostMigration(
  raw?: unknown[],
  space?: 'css' | 'slide',
): boolean {
  if (space === 'slide') return false;
  if (space === 'css') return Array.isArray(raw) && raw.length > 0;
  if (!Array.isArray(raw) || raw.length === 0) return false;
  if (raw.some(isLegacyNotesInkStroke)) return true;
  return raw.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const id = (item as { id?: unknown }).id;
    return typeof id === 'string' && id.startsWith('notes-css-');
  });
}

/** CSS-Pixel-Striche (Legacy oder notes-css-*) → Slide-Koordinaten. */
export function migrateNotesInkCssToSlideSpace(
  strokes: PresentationStroke[],
  hostW: number,
  hostH: number,
): PresentationStroke[] {
  const sx = SLIDE_REF_WIDTH / Math.max(1, hostW);
  const sy = SLIDE_REF_HEIGHT / Math.max(1, hostH);
  return strokes.map((s, i) => ({
    ...s,
    id: s.id?.startsWith('notes-css-')
      ? `notes-legacy-${i}-${Math.round((s.points[0]?.x ?? 0) * sx)}`
      : s.id,
    points: s.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
    lineWidth: Math.max(0.8, Math.min(48, (s.lineWidth || 3) * sx)),
  }));
}

export function sanitizeNotesInk(
  raw?: unknown[],
): PresentationStroke[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  if (raw.some(isLegacyNotesInkStroke)) {
    // Noch CSS-Koordinaten — Panel migriert beim ersten Layout in Slide-Space.
    const out: PresentationStroke[] = [];
    raw.forEach((item, i) => {
      if (!isLegacyNotesInkStroke(item)) {
        const modern = sanitizeInkStrokes([item as PresentationStroke]);
        if (modern?.[0]) out.push(modern[0]);
        return;
      }
      const points = item.points
        .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (points.length < 1) return;
      if (points.length === 1) points.push({ x: points[0].x + 0.01, y: points[0].y });
      const width = Number(item.width);
      out.push({
        id: `notes-css-${i}`,
        points,
        color: typeof item.color === 'string' && item.color ? item.color : '#111827',
        lineWidth: Number.isFinite(width) ? Math.max(0.6, Math.min(12, width)) : 3,
        mode: 'pen',
      });
    });
    return out.length ? out : undefined;
  }
  return sanitizeInkStrokes(raw as PresentationStroke[]);
}

export type LayoutZoneBox = { x: number; y: number; w: number; h: number };

/** Eingesprochener Ton zur Folie — Datei im Stundenordner, hier nur der Verweis. */
export type SlideAudioTrack = {
  path: string;
  durationMs?: number;
  recordedAt?: string;
  id?: string;
};

export function sanitizeSlideAudioTrack(raw?: SlideAudioTrack | null): SlideAudioTrack | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const path = typeof raw.path === 'string' ? raw.path.trim() : '';
  if (!path) return undefined;
  const durationMs = Number(raw.durationMs);
  const recordedAt = typeof raw.recordedAt === 'string' && raw.recordedAt.trim() ? raw.recordedAt.trim() : '';
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 40) : '';
  return {
    path,
    ...(Number.isFinite(durationMs) && durationMs > 0 ? { durationMs: Math.round(durationMs) } : {}),
    ...(recordedAt ? { recordedAt } : {}),
    ...(id ? { id } : {}),
  };
}

export function sanitizeSlideAudioTracks(
  raw: unknown,
  fallback?: SlideAudioTrack,
): SlideAudioTrack[] {
  const list: SlideAudioTrack[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const next = sanitizeSlideAudioTrack(item as SlideAudioTrack);
      if (next) list.push(next);
      if (list.length >= MAX_SLIDE_MEDIA_VERSIONS) break;
    }
  }
  if (list.length === 0) {
    const one = sanitizeSlideAudioTrack(fallback);
    if (one) list.push(one);
  }
  return list;
}

export function sanitizeMediaActiveIndex(raw: unknown, length: number): number {
  if (length <= 0) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(length - 1, Math.round(n));
}

export function slideMediaFieldPatch(
  kind: 'audio' | 'screen',
  tracks: SlideAudioTrack[],
  activeIndex = 0,
): Partial<PresentationSlide> {
  const clean = tracks
    .map((t) => sanitizeSlideAudioTrack(t))
    .filter((t): t is SlideAudioTrack => Boolean(t))
    .slice(0, MAX_SLIDE_MEDIA_VERSIONS);
  const idx = sanitizeMediaActiveIndex(activeIndex, clean.length);
  if (kind === 'screen') {
    return {
      screenTrack: clean[idx],
      screenTracks: clean.length > 1 ? clean : undefined,
      activeScreenIndex: clean.length > 1 ? idx : undefined,
    };
  }
  return {
    audioTrack: clean[idx],
    audioTracks: clean.length > 1 ? clean : undefined,
    activeAudioIndex: clean.length > 1 ? idx : undefined,
  };
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
  /**
   * Stiftstriche als Folieninhalt (z. B. GoodNotes-Lasso als Tinte).
   * Liegt im Deck, nicht in den Live-Annotationen der Stunde.
   */
  inkStrokes?: PresentationStroke[];
  /**
   * Stift in den Foliennotizen (gleiche Stroke-Struktur wie auf der Folie).
   */
  speakerNotesInk?: PresentationNotesInkStroke[];
  /**
   * `css` = Legacy-Koordinaten im Notizfeld-Pixelraum; `slide` = 1920×1080 wie Folientinte.
   * Fehlt und alte Striche → beim Öffnen der Notizen migrieren.
   */
  speakerNotesInkSpace?: 'css' | 'slide';
  /** Unterkapitel in der Folienleiste (frei benennbar). */
  sourceLessonName?: string;
  sourceLessonPath?: string;
  /** Zusätzliche volle Folienhöhen unter der ersten Seite (nahtlos weiß). */
  extraPageCount?: number;
  /** Eingesprochener Audiotrack (Datei im Stundenordner). */
  audioTrack?: SlideAudioTrack;
  /** Weitere Ton-Versionen; `audioTrack` ist die gewählte. */
  audioTracks?: SlideAudioTrack[];
  activeAudioIndex?: number;
  /** Bildschirm-Aufnahme zur Folie (Video-Datei im Stundenordner). */
  screenTrack?: SlideAudioTrack;
  screenTracks?: SlideAudioTrack[];
  activeScreenIndex?: number;
}

export function sanitizeInkStrokes(raw?: PresentationStroke[]): PresentationStroke[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: PresentationStroke[] = [];
  for (const s of raw) {
    if (!s || !Array.isArray(s.points) || s.points.length < 2) continue;
    const points = s.points
      .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (points.length < 2) continue;
    const lineWidth = Number(s.lineWidth);
    out.push({
      id: typeof s.id === 'string' && s.id ? s.id : `ink-${out.length}`,
      points,
      color: typeof s.color === 'string' && s.color ? s.color : '#000000',
      lineWidth: Number.isFinite(lineWidth) ? Math.max(0.5, Math.min(48, lineWidth)) : 3,
      ...(s.mode === 'marker' || s.mode === 'pen' ? { mode: s.mode } : { mode: 'pen' as const }),
      ...(typeof s.markerOpacity === 'number' && Number.isFinite(s.markerOpacity)
        ? { markerOpacity: s.markerOpacity }
        : {}),
      ...(s.filled ? { filled: true } : {}),
      ...(typeof s.fillColor === 'string' && s.fillColor.trim() && s.fillColor !== 'transparent'
        ? { fillColor: s.fillColor }
        : {}),
      ...(() => {
        if (!Array.isArray(s.holes) || s.holes.length === 0) return {};
        const holes = s.holes
          .map((h) =>
            (h || [])
              .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
              .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
          )
          .filter((h) => h.length >= 3);
        return holes.length ? { holes } : {};
      })(),
      ...(typeof s.shape === 'string' && s.shape ? { shape: s.shape as PresentationShapeKind } : {}),
      ...(typeof s.rotation === 'number' && Number.isFinite(s.rotation) ? { rotation: s.rotation } : {}),
      ...(typeof s.arrowHeadSize === 'number' && Number.isFinite(s.arrowHeadSize)
        ? { arrowHeadSize: Math.max(4, Math.min(36, s.arrowHeadSize)) }
        : {}),
      ...(typeof s.curveBend === 'number' && Number.isFinite(s.curveBend)
        ? { curveBend: Math.max(-80, Math.min(80, s.curveBend)) }
        : {}),
    });
    if (out.length >= 800) break;
  }
  return out.length ? out : undefined;
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
  /** Stunden, aus denen dieser Kapitel-Foliensatz zusammengeführt wurde. */
  combinedFrom?: { lessonPath: string; lessonName: string; updatedAt?: string }[];
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

/** Schul-/Absolutpfade in Folien → git-intern/… (lokal und Schule). */
export function portableSlideMediaPath(imagePath: string): string {
  const p = (imagePath || '').replace(/\\/g, '/').trim();
  if (!p) return '';
  if (p.startsWith('/api/')) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/app/J-M-Reihen/')) {
    return `git-intern/${p.slice('/app/J-M-Reihen/'.length)}`;
  }
  const markers = ['/J-M-Reihen/', 'J-M-Reihen/'];
  for (const m of markers) {
    const i = p.indexOf(m);
    if (i >= 0) {
      const rest = p.slice(i + m.length).replace(/^\/+/, '');
      return rest ? `git-intern/${rest}` : 'git-intern';
    }
  }
  return p;
}

export function slideImageUrl(imagePath: string, maxEdge?: number): string {
  if (!imagePath) return '';
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith('/api/')) return imagePath;
  const raw = imagePath.replace(/\\/g, '/').trim();
  const portable = raw.startsWith('__GRAFIKEN__/')
    ? `git-intern/Grafiken/${raw.slice('__GRAFIKEN__/'.length)}`
    : portableSlideMediaPath(raw);
  const qs = new URLSearchParams({ filePath: portable });
  if (maxEdge && maxEdge > 0) qs.set('max', String(Math.round(maxEdge)));
  return `/api/file-system-paths/read-image?${qs.toString()}`;
}

/** Zweiter Versuch ohne Verkleinerung, falls sips/max fehlschlägt. */
export function slideImageUrlWithoutMax(url: string): string {
  if (!url || !url.includes('max=')) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.delete('max');
    return `${parsed.pathname}?${parsed.searchParams.toString()}`;
  } catch {
    return url.replace(/([?&])max=\d+&?/g, '$1').replace(/[?&]$/, '');
  }
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
    inkStrokes: sanitizeInkStrokes(slide.inkStrokes),
    speakerNotesInk: sanitizeNotesInk(slide.speakerNotesInk),
    ...(slide.speakerNotesInkSpace === 'css' || slide.speakerNotesInkSpace === 'slide'
      ? { speakerNotesInkSpace: slide.speakerNotesInkSpace }
      : notesInkNeedsHostMigration(slide.speakerNotesInk)
        ? { speakerNotesInkSpace: 'css' as const }
        : slide.speakerNotesInk?.length
          ? { speakerNotesInkSpace: 'slide' as const }
          : {}),
    ...(() => {
      const extraPageCount = slideExtraPageCount(slide);
      const audioTracks = sanitizeSlideAudioTracks(slide.audioTracks, slide.audioTrack);
      const screenTracks = sanitizeSlideAudioTracks(slide.screenTracks, slide.screenTrack);
      const activeAudioIndex = sanitizeMediaActiveIndex(slide.activeAudioIndex, audioTracks.length);
      const activeScreenIndex = sanitizeMediaActiveIndex(slide.activeScreenIndex, screenTracks.length);
      return {
        ...(extraPageCount > 0 ? { extraPageCount } : { extraPageCount: undefined }),
        ...slideMediaFieldPatch('audio', audioTracks, activeAudioIndex),
        ...slideMediaFieldPatch('screen', screenTracks, activeScreenIndex),
      };
    })(),
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

/** Folien-Tinte (`inkStrokes`) in die Live-Annotationen legen — gleiche Stift-Ebene wie im Play-Modus. */
export function absorbSlideInkIntoAnnotations(
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
): { deck: PresentationDeck; annotations: PresentationAnnotations; changed: boolean } {
  let changed = false;
  const bySlideId = { ...annotations.bySlideId };
  const slides = deck.slides.map((slide) => {
    const extra = sanitizeInkStrokes(slide.inkStrokes);
    if (!extra?.length) return slide;
    changed = true;
    bySlideId[slide.id] = [...(bySlideId[slide.id] || []), ...extra];
    const { inkStrokes: _ink, ...rest } = slide;
    return rest;
  });
  if (!changed) return { deck, annotations, changed: false };
  return {
    deck: { ...deck, slides },
    annotations: {
      ...annotations,
      bySlideId,
      updatedAt: new Date().toISOString(),
    },
    changed: true,
  };
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
  data: unknown,
  options?: { forceBackup?: boolean }
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
      if (options?.forceBackup) formData.append('forceBackup', '1');
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
  // Oberordner ohne eigenes Deck: Stundenfolien + Varianten zusammenführen.
  const { tryCombineChildHourPresentations } = await import('./presentationChapterCombine');
  const combined = await tryCombineChildHourPresentations(lessonPath);
  if (combined?.deck?.slides?.length) return combined.deck;

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
  planMode?: PresentationPlanMode,
  slideId?: string | null,
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
    qs.set('planMode', planMode);
  }
  if (slideId) qs.set('slideId', slideId);
  return `/presentation/edit?${qs.toString()}`;
}

const ACTIVE_SLIDE_STORAGE_PREFIX = 'johnny-pres-active-slide:';

/** Aktuelle Folie in der URL merken, damit Neuladen dieselbe Folie öffnet. */
export function rememberActivePresentationSlide(
  lessonPath: string,
  slideId: string | null | undefined,
): void {
  if (typeof window === 'undefined' || !lessonPath || !slideId) return;
  try {
    sessionStorage.setItem(`${ACTIVE_SLIDE_STORAGE_PREFIX}${lessonPath}`, slideId);
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get('slideId') === slideId) return;
  url.searchParams.set('slideId', slideId);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/** Folie aus URL, sonst letzte Folie dieser Stunde aus dieser Browser-Sitzung. */
export function recalledActivePresentationSlide(
  lessonPath: string,
  urlSlideId?: string | null,
): string {
  const fromUrl = (urlSlideId || '').trim();
  if (fromUrl) return fromUrl;
  if (typeof window === 'undefined' || !lessonPath) return '';
  try {
    return sessionStorage.getItem(`${ACTIVE_SLIDE_STORAGE_PREFIX}${lessonPath}`) || '';
  } catch {
    return '';
  }
}

export function presentationPresentUrl(
  lessonPath: string,
  groupId?: string,
  variant?: PresentationViewerVariant,
  namedSlug?: string,
  planMode?: PresentationPlanMode,
  startSlideId?: string | null,
): string {
  const qs = new URLSearchParams({ lessonPath });
  if (groupId) qs.set('groupId', groupId);
  if (namedSlug) qs.set('named', namedSlug);
  else if (variant === 'original') qs.set('variant', 'original');
  else if (variant === 'edited') qs.set('variant', 'edited');
  if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
    qs.set('planMode', planMode);
  }
  if (startSlideId) qs.set('slideId', startSlideId);
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
