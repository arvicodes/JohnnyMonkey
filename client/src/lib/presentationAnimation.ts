import type { PresentationSlide, SlideElement, SlideLayout } from './presentationDeck';
import {
  assignRevealSteps,
  countRevealStepsInHtml,
  stripAllRevealSteps,
} from './presentationReveal';

const HTML_ANIM_FIELDS = [
  'titleHtml',
  'bodyHtml',
  'subtitleHtml',
  'bodyLeftHtml',
  'bodyRightHtml',
  'imageCaptionHtml',
] as const;

export type HtmlAnimField = (typeof HTML_ANIM_FIELDS)[number];

export type AnimationZoneKey = 'layoutImage';

export type AnimationItemKind = 'paragraph' | 'element' | 'layoutImage';

export interface AnimationItem {
  id: string;
  kind: AnimationItemKind;
  label: string;
  step: number;
  zoneKey?: AnimationZoneKey;
  elementId?: string;
  field?: HtmlAnimField;
  paragraphIndex?: number;
}

const FIELD_LABELS: Record<HtmlAnimField, string> = {
  titleHtml: 'Titel',
  bodyHtml: 'Text',
  subtitleHtml: 'Untertitel',
  bodyLeftHtml: 'Spalte links',
  bodyRightHtml: 'Spalte rechts',
  imageCaptionHtml: 'Bildunterschrift',
};

function parseHtmlContainer(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div;
}

function paragraphStepFromHtml(html: string, paragraphIndex: number): number {
  const div = parseHtmlContainer(html);
  let idx = 0;
  let step = 0;
  div.querySelectorAll('p, li').forEach((el) => {
    if (!(el.textContent || '').trim()) return;
    idx += 1;
    if (idx === paragraphIndex) {
      step = parseInt(el.getAttribute('data-reveal-step') || '0', 10);
    }
  });
  return step;
}

function setParagraphStepInHtml(html: string, paragraphIndex: number, step: number): string {
  const div = parseHtmlContainer(html);
  let idx = 0;
  div.querySelectorAll('p, li').forEach((el) => {
    if (!(el.textContent || '').trim()) return;
    idx += 1;
    if (idx !== paragraphIndex) return;
    if (step <= 0) el.removeAttribute('data-reveal-step');
    else el.setAttribute('data-reveal-step', String(step));
  });
  return div.innerHTML;
}

function collectParagraphItems(slide: PresentationSlide): AnimationItem[] {
  const items: AnimationItem[] = [];
  const fields = textFieldsInRevealOrder(slide.layout ?? 'title-content');
  for (const field of fields) {
    const html = slide[field];
    if (!html?.trim() || html === '<p><br></p>') continue;
    const div = parseHtmlContainer(html);
    let paraIndex = 0;
    div.querySelectorAll('p, li').forEach((el) => {
      if (!(el.textContent || '').trim()) return;
      paraIndex += 1;
      const step = parseInt(el.getAttribute('data-reveal-step') || '0', 10);
      const snippet = (el.textContent || '').trim().slice(0, 28);
      items.push({
        id: `paragraph:${field}:${paraIndex}`,
        kind: 'paragraph',
        label: `${FIELD_LABELS[field]} · ${snippet || `Absatz ${paraIndex}`}`,
        step,
        field,
        paragraphIndex: paraIndex,
      });
    });
  }
  return items;
}

function collectElementParagraphItems(slide: PresentationSlide): AnimationItem[] {
  const items: AnimationItem[] = [];
  const elements = [...(slide.elements || [])].sort((a, b) => a.zIndex - b.zIndex);
  elements.forEach((el, idx) => {
    if (el.type !== 'text' || !el.html?.includes('data-reveal-step')) return;
    const div = parseHtmlContainer(el.html);
    let paraIndex = 0;
    div.querySelectorAll('p, li').forEach((node) => {
      if (!(node.textContent || '').trim()) return;
      paraIndex += 1;
      const step = parseInt(node.getAttribute('data-reveal-step') || '0', 10);
      const snippet = (node.textContent || '').trim().slice(0, 24);
      items.push({
        id: `elementParagraph:${el.id}:${paraIndex}`,
        kind: 'paragraph',
        label: `Textfeld ${idx + 1} · ${snippet || `Absatz ${paraIndex}`}`,
        step,
        elementId: el.id,
        paragraphIndex: paraIndex,
      });
    });
  });
  return items;
}

export function textFieldsInRevealOrder(layout: SlideLayout): HtmlAnimField[] {
  switch (layout) {
    case 'title-slide':
      return ['titleHtml', 'bodyHtml'];
    case 'section':
      return ['titleHtml', 'subtitleHtml'];
    case 'two-column':
      return ['titleHtml', 'bodyLeftHtml', 'bodyRightHtml'];
    case 'image-right':
    case 'image-left':
      return ['titleHtml', 'bodyHtml', 'imageCaptionHtml'];
    case 'quote':
      return ['bodyHtml', 'subtitleHtml'];
    case 'blank':
      return ['bodyHtml'];
    default:
      return ['titleHtml', 'bodyHtml'];
  }
}

export function countSlideParagraphSteps(slide: PresentationSlide): number {
  return collectParagraphItems(slide).filter((item) => item.step > 0).length;
}

export function getLayoutImageStep(slide: PresentationSlide): number {
  return slide.zoneRevealSteps?.layoutImage ?? 0;
}

export function getElementStep(el: SlideElement): number {
  return el.revealStep ?? 0;
}

export function sortAnimationItems(items: AnimationItem[]): AnimationItem[] {
  return [...items].sort((a, b) => {
    if (a.step !== b.step) return a.step - b.step;
    const kindOrder: Record<AnimationItemKind, number> = {
      paragraph: 0,
      layoutImage: 1,
      element: 2,
    };
    if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
    return a.label.localeCompare(b.label, 'de');
  });
}

/** Alle einblendbaren Teile: Absätze, Layout-Bild, freie Elemente. */
export function collectAnimationItems(slide: PresentationSlide): AnimationItem[] {
  const items: AnimationItem[] = [...collectParagraphItems(slide)];
  const layout = slide.layout ?? 'title-content';

  if (layout === 'image-left' || layout === 'image-right') {
    items.push({
      id: 'zone:layoutImage',
      kind: 'layoutImage',
      label: 'Layout-Bild',
      step: getLayoutImageStep(slide),
      zoneKey: 'layoutImage',
    });
  }

  const elements = [...(slide.elements || [])].sort((a, b) => a.zIndex - b.zIndex);
  elements.forEach((el, idx) => {
    const hasInnerParagraphs = el.type === 'text' && el.html?.includes('data-reveal-step');
    if (hasInnerParagraphs) return;
    const typeLabel = el.type === 'image' ? 'Bild' : 'Textfeld';
    items.push({
      id: `element:${el.id}`,
      kind: 'element',
      label: `${typeLabel} ${idx + 1}`,
      step: getElementStep(el),
      elementId: el.id,
    });
  });

  items.push(...collectElementParagraphItems(slide));
  return sortAnimationItems(items);
}

export function clampAnimationStep(step: number): number {
  return Math.max(0, Math.min(99, Math.round(step)));
}

export function setAnimationItemStep(
  slide: PresentationSlide,
  itemId: string,
  step: number
): PresentationSlide {
  const safeStep = clampAnimationStep(step);

  if (itemId === 'zone:layoutImage') {
    return {
      ...slide,
      zoneRevealSteps: {
        ...(slide.zoneRevealSteps || {}),
        layoutImage: safeStep,
      },
    };
  }

  if (itemId.startsWith('paragraph:')) {
    const [, field, indexStr] = itemId.split(':');
    const paragraphIndex = parseInt(indexStr, 10);
    const htmlField = field as HtmlAnimField;
    const html = (slide[htmlField] as string) || '';
    const nextHtml = setParagraphStepInHtml(html, paragraphIndex, safeStep);
    return { ...slide, [htmlField]: nextHtml };
  }

  if (itemId.startsWith('elementParagraph:')) {
    const [, elementId, indexStr] = itemId.split(':');
    const paragraphIndex = parseInt(indexStr, 10);
    return {
      ...slide,
      elements: (slide.elements || []).map((el) => {
        if (el.id !== elementId || el.type !== 'text') return el;
        const nextHtml = setParagraphStepInHtml(el.html || '', paragraphIndex, safeStep);
        return { ...el, html: nextHtml, revealStep: 0 };
      }),
    };
  }

  if (itemId.startsWith('element:')) {
    const elementId = itemId.slice(8);
    return {
      ...slide,
      elements: (slide.elements || []).map((el) =>
        el.id === elementId ? { ...el, revealStep: safeStep } : el
      ),
    };
  }

  return slide;
}

function applyItemSteps(slide: PresentationSlide, items: AnimationItem[]): PresentationSlide {
  let next = slide;
  for (const item of items) {
    next = setAnimationItemStep(next, item.id, item.step);
  }
  return next;
}

/** Entfernt Lücken: Schritte werden zu 1…N ohne Sprünge. */
export function compactAnimationSteps(slide: PresentationSlide): PresentationSlide {
  const items = sortAnimationItems(collectAnimationItems(slide));
  const immediate = items.filter((item) => item.step <= 0);
  const sequenced = items.filter((item) => item.step > 0);
  let step = 1;
  const compacted = [
    ...immediate.map((item) => ({ ...item, step: 0 })),
    ...sequenced.map((item) => ({ ...item, step: step++ })),
  ];
  return applyItemSteps(slide, compacted);
}

export function swapAnimationItemSteps(
  slide: PresentationSlide,
  itemId: string,
  direction: -1 | 1
): PresentationSlide {
  const sorted = sortAnimationItems(collectAnimationItems(slide));
  const index = sorted.findIndex((item) => item.id === itemId);
  if (index < 0) return slide;
  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= sorted.length) return slide;
  const reordered = [...sorted];
  [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
  let step = 1;
  const withSteps = reordered.map((item) => ({
    ...item,
    step: item.step <= 0 ? 0 : step++,
  }));
  return applyItemSteps(slide, withSteps);
}

/** Nummeriert Absätze, Bilder und Textfelder in Lesereihenfolge (1, 2, 3 …). */
export function assignSlideParagraphSteps(slide: PresentationSlide): Partial<PresentationSlide> {
  const fields = textFieldsInRevealOrder(slide.layout ?? 'title-content');
  let step = 1;
  const patch: Partial<PresentationSlide> = { revealEnabled: true };

  for (const field of fields) {
    const html = (slide[field] as string) || '';
    if (!html.trim() || html === '<p><br></p>') continue;
    const clean = stripAllRevealSteps(html);
    const nextHtml = assignRevealSteps(clean, step);
    (patch as Record<string, string>)[field] = nextHtml;
    const maxInField = countRevealStepsInHtml(nextHtml);
    if (maxInField > 0) step = maxInField + 1;
  }

  const layout = slide.layout ?? 'title-content';
  if ((layout === 'image-left' || layout === 'image-right') && slide.imagePath) {
    (patch as Partial<PresentationSlide>).zoneRevealSteps = {
      ...(slide.zoneRevealSteps || {}),
      layoutImage: step++,
    };
  }

  const elements = (slide.elements || []).map((el) => {
    if (el.type === 'text' && el.html?.trim()) {
      const clean = stripAllRevealSteps(el.html);
      const nextHtml = assignRevealSteps(clean, step);
      const maxInEl = countRevealStepsInHtml(nextHtml);
      if (maxInEl > 0) {
        step = maxInEl + 1;
        return { ...el, html: nextHtml, revealStep: 0 };
      }
    }
    return { ...el, revealStep: step++ };
  });
  (patch as Partial<PresentationSlide>).elements = elements;

  return patch;
}

export const ANIMATION_STEP_OPTIONS = Array.from({ length: 32 }, (_, i) => i);

export function animationStepLabel(step: number): string {
  return step <= 0 ? 'Sofort' : String(step);
}

/** Setzt Folienübergang, Element-Schritte und Absatz-Markierungen zurück. */
export function resetAllSlideAnimations(slide: PresentationSlide): Partial<PresentationSlide> {
  const patch: Partial<PresentationSlide> = {
    transition: 'none',
    revealEnabled: false,
    zoneRevealSteps: {},
    elements: (slide.elements || []).map((el) => {
      const html = el.html?.includes('data-reveal-step')
        ? stripAllRevealSteps(el.html)
        : el.html;
      return { ...el, revealStep: 0, html };
    }),
  };

  for (const field of HTML_ANIM_FIELDS) {
    const html = slide[field];
    if (!html || !html.includes('data-reveal-step')) continue;
    (patch as Record<string, string>)[field] = stripAllRevealSteps(html);
  }

  return patch;
}

export function getParagraphStep(slide: PresentationSlide, field: HtmlAnimField, paragraphIndex: number): number {
  const html = (slide[field] as string) || '';
  return paragraphStepFromHtml(html, paragraphIndex);
}
