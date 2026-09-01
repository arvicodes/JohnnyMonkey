import type { PresentationSlide, SlideElement, SlideLayout } from './presentationDeck';
import { SLIDE_REF_HEIGHT, SLIDE_REF_WIDTH } from './presentationDeck';
import { JOHNNY_ACCENT_PRESETS, JOHNNY_PRESENTATION } from './presentationTheme';
import { PRESENTATION_CONTENT_FONT_PX } from './presentationFontSize';
import { PRESENTATION_DEFAULT_FONT_FAMILY } from './presentationFonts';

export interface LayoutMeta {
  id: SlideLayout;
  label: string;
  hint: string;
}

export const SLIDE_LAYOUTS: LayoutMeta[] = [
  { id: 'title-slide', label: 'Titelfolie', hint: 'Großer Titel + Untertitel' },
  { id: 'title-content', label: 'Titel & Inhalt', hint: 'Klassische Folie' },
  { id: 'section', label: 'Abschnitt', hint: 'Kapitelüberschrift' },
  { id: 'two-column', label: '2 Spalten', hint: 'Vergleich / Stichpunkte' },
  { id: 'image-right', label: 'Bild rechts', hint: 'Text links, Bild rechts' },
  { id: 'image-left', label: 'Bild links', hint: 'Bild links, Text rechts' },
  { id: 'quote', label: 'Zitat', hint: 'Hervorgehobenes Zitat' },
  { id: 'blank', label: 'Leer', hint: 'Logo & Fußzeile, freie Fläche' },
  { id: 'blank-full', label: 'Ganz leer', hint: 'Ohne Logo und Fußzeile' },
];

export const ACCENT_PRESETS = JOHNNY_ACCENT_PRESETS;

/** Leer oder ganz leer (kein Titel-/Zweispalt-Layout). */
export function isBlankLayout(layout?: string | null): layout is 'blank' | 'blank-full' {
  return layout === 'blank' || layout === 'blank-full';
}

/** Ganz leer: kein Johnny-Chrome (Logo, Akzentlinie, Fußzeile). */
export function isBareBlankLayout(layout?: string | null): boolean {
  return layout === 'blank-full';
}

export function defaultTitleAlign(layout: SlideLayout): 'left' | 'center' {
  if (layout === 'title-slide' || layout === 'section' || layout === 'quote') return 'center';
  return 'left';
}

export function createSlideFromLayout(order: number, layout: SlideLayout = 'title-content'): PresentationSlide {
  const n = order + 1;
  const base = {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    order,
    speakerNotes: '',
    layout,
    subtitle: '',
    bodyLeft: '',
    bodyRight: '',
    imagePath: '',
    imageCaption: '',
    bodyStyle: 'plain' as const,
    titleAlign: defaultTitleAlign(layout),
    accentColor: JOHNNY_PRESENTATION.primary,
  };

  switch (layout) {
    case 'title-slide':
      return { ...base, title: `Folie ${n}`, body: 'Untertitel hier eingeben' };
    case 'section':
      return { ...base, title: `Abschnitt ${n}`, body: '' };
    case 'two-column':
      return {
        ...base,
        title: `Folie ${n}`,
        body: '',
        bodyLeft: 'Linke Spalte',
        bodyRight: 'Rechte Spalte',
      };
    case 'image-right':
    case 'image-left':
      return { ...base, title: `Folie ${n}`, body: 'Text neben dem Bild…' };
    case 'quote':
      return { ...base, title: '', body: '„Ein Zitat oder eine Kernaussage."', subtitle: '— Quelle' };
    case 'blank':
    case 'blank-full':
      return { ...base, title: '', body: '' };
    default:
      return { ...base, title: `Folie ${n}`, body: '' };
  }
}

/** Muss zu PresentationSlideView (Chrome + Titel & Inhalt) passen. */
const TITLE_CONTENT_PAD_X = 64;
const TITLE_CONTENT_PAD_TOP = 72;
const TITLE_CONTENT_TITLE_PX = 42;
const TITLE_CONTENT_TITLE_LH = 1.15;
const TITLE_CONTENT_TITLE_MB = 24;

export const TEXT_FIELD_PLACEHOLDER = 'Text hier…';
export const TEXT_FIELD_EMPTY_HTML = '<p><br></p>';

export type SlideBoxOrigin = { x: number; y: number; maxW: number };

/** Start und Breite des Inhaltsfelds bei Titel & Inhalt (Folien-Prozent). */
export function titleContentBodyOrigin(): SlideBoxOrigin {
  const x = (TITLE_CONTENT_PAD_X / SLIDE_REF_WIDTH) * 100;
  const titleH = TITLE_CONTENT_TITLE_PX * TITLE_CONTENT_TITLE_LH;
  const y = ((TITLE_CONTENT_PAD_TOP + titleH + TITLE_CONTENT_TITLE_MB) / SLIDE_REF_HEIGHT) * 100;
  const maxW = ((SLIDE_REF_WIDTH - TITLE_CONTENT_PAD_X * 2) / SLIDE_REF_WIDTH) * 100;
  return { x, y, maxW };
}

/** Live-Inhaltsfeld, sonst Standard von Titel & Inhalt. */
export function measureSlideBodyOrigin(slideEl: HTMLElement | null | undefined): SlideBoxOrigin {
  const fallback = titleContentBodyOrigin();
  if (!slideEl) return fallback;
  const zone = slideEl.querySelector('[data-pres-layout-zone="bodyHtml"]') as HTMLElement | null;
  if (!zone) return fallback;
  const sr = slideEl.getBoundingClientRect();
  const zr = zone.getBoundingClientRect();
  if (sr.width < 8 || sr.height < 8 || zr.width < 8) return fallback;
  return {
    x: ((zr.left - sr.left) / sr.width) * 100,
    y: ((zr.top - sr.top) / sr.height) * 100,
    maxW: (zr.width / sr.width) * 100,
  };
}

export function isDefaultTextFieldHtml(html?: string | null): boolean {
  const plain = (html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return !plain || plain === TEXT_FIELD_PLACEHOLDER || plain === 'Text hier...';
}

export function shouldAutoFitPresentationText(element: SlideElement): boolean {
  if (element.type !== 'text') return false;
  const html = element.html || '';
  if (/data-pres-entry-ticket/.test(html) || /jm=lesson-entry/.test(html)) return false;
  return true;
}

function clampPct(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Leeres Textfeld: breit, etwas höher als eine Zeile. */
export function defaultEmptyTextFieldSize(maxW: number): { w: number; h: number } {
  const w = clampPct(maxW * 0.52, 36, maxW);
  const hPx = PRESENTATION_CONTENT_FONT_PX * 1.45 + 22;
  return {
    w,
    h: clampPct((hPx / SLIDE_REF_HEIGHT) * 100, 4.8, 6.4),
  };
}

/** Nur die benötigte Höhe bei gegebener Breite (kein Extra-Luft). */
export function measureTextFieldHeightPct(
  contentEl: HTMLElement,
  slideEl: HTMLElement,
  extraInsetY = 0,
): number | null {
  const sr = slideEl.getBoundingClientRect();
  if (sr.width < 8 || sr.height < 8) return null;
  const innerW = Math.max(8, contentEl.clientWidth);
  const cs = window.getComputedStyle(contentEl);
  const clone = contentEl.cloneNode(true) as HTMLElement;
  clone.style.cssText = [
    'position:absolute',
    'left:-99999px',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
    'box-sizing:border-box',
    `width:${innerW}px`,
    `max-width:${innerW}px`,
    'height:auto',
    'overflow:visible',
    `font-size:${cs.fontSize}`,
    `font-family:${cs.fontFamily || PRESENTATION_DEFAULT_FONT_FAMILY}`,
    `font-weight:${cs.fontWeight}`,
    `line-height:${cs.lineHeight}`,
    `padding:${cs.padding}`,
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';');
  slideEl.appendChild(clone);
  const hpx = Math.ceil(clone.scrollHeight) + extraInsetY;
  clone.remove();
  return clampPct((hpx / sr.height) * 100, 2.2, 92);
}

/** Box an Inhalt anpassen (Breite höchstens Inhaltsfeld). */
export function measureTextFieldSizePct(
  contentEl: HTMLElement,
  slideEl: HTMLElement,
  maxWpct: number,
  empty: boolean,
  extraPadX = 0,
  extraPadY = 0,
): { w: number; h: number } | null {
  const sr = slideEl.getBoundingClientRect();
  if (sr.width < 8 || sr.height < 8) return null;
  const maxWpx = Math.max(48, (maxWpct / 100) * sr.width - extraPadX);
  const cs = window.getComputedStyle(contentEl);
  const clone = contentEl.cloneNode(true) as HTMLElement;
  if (empty) clone.innerHTML = `<p>${TEXT_FIELD_PLACEHOLDER}</p>`;
  clone.style.cssText = [
    'position:absolute',
    'left:-99999px',
    'top:0',
    'visibility:hidden',
    'pointer-events:none',
    'box-sizing:border-box',
    'height:auto',
    'overflow:visible',
    'width:max-content',
    `max-width:${maxWpx}px`,
    `font-size:${cs.fontSize}`,
    `font-family:${cs.fontFamily || PRESENTATION_DEFAULT_FONT_FAMILY}`,
    `font-weight:${cs.fontWeight}`,
    `line-height:${cs.lineHeight}`,
    `padding:${cs.padding}`,
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';');
  slideEl.appendChild(clone);
  const wpx = Math.ceil(clone.scrollWidth) + extraPadX + 4;
  const hpx = Math.ceil(clone.scrollHeight) + extraPadY + 4;
  clone.remove();
  return {
    w: clampPct((wpx / sr.width) * 100, 5, maxWpct),
    h: clampPct((hpx / sr.height) * 100, 2.6, 92),
  };
}
