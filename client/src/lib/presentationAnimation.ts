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

/** Sichtbarer Text ohne Zero-Width-Spaces. */
export function visibleAnimText(el: Element): string {
  return (el.textContent || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
}

/** Alle Animations-Blöcke in Lesereihenfolge: p/li plus freistehende div/span. */
export function collectAnimBlocksInRoot(root: ParentNode): Element[] {
  const blocks: Element[] = [];

  root.querySelectorAll('p, li').forEach((el) => {
    if (!visibleAnimText(el)) return;
    blocks.push(el);
  });

  root.querySelectorAll('div, span').forEach((el) => {
    if (!visibleAnimText(el)) return;
    if (el.closest('p, li')) return;
    blocks.push(el);
  });

  const outermost = blocks.filter(
    (el) => !blocks.some((other) => other !== el && other.contains(el))
  );

  return outermost.sort((a, b) => {
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

export function findAnimBlockFromHit(container: HTMLElement, hit: Element | null): Element | null {
  if (!hit || !container.contains(hit)) return null;
  const blocks = collectAnimBlocksInRoot(container);
  let found: Element | null = null;
  for (const block of blocks) {
    if (block === hit || block.contains(hit)) {
      if (!found || found.contains(block)) found = block;
    }
  }
  return found;
}

export function animBlockIndexInRoot(root: HTMLElement, block: Element): number {
  const blocks = collectAnimBlocksInRoot(root);
  const idx = blocks.indexOf(block);
  return idx >= 0 ? idx + 1 : 0;
}

function collectAnimBlocksFromHtml(html: string): Element[] {
  return collectAnimBlocksInRoot(parseHtmlContainer(html));
}

function blockStepFromHtml(html: string, blockIndex: number): number {
  const blocks = collectAnimBlocksFromHtml(html);
  const el = blocks[blockIndex - 1];
  if (!el) return 0;
  return parseInt(el.getAttribute('data-reveal-step') || '0', 10);
}

function setBlockStepInHtml(html: string, blockIndex: number, step: number): string {
  const div = parseHtmlContainer(html);
  const blocks = collectAnimBlocksInRoot(div);
  const el = blocks[blockIndex - 1];
  if (el) el.setAttribute('data-reveal-step', String(step));
  return div.innerHTML;
}

function clearBlockStepInHtml(html: string, blockIndex: number): string {
  const div = parseHtmlContainer(html);
  const blocks = collectAnimBlocksInRoot(div);
  const el = blocks[blockIndex - 1];
  if (el) el.removeAttribute('data-reveal-step');
  return div.innerHTML;
}

function blockHasRevealAssignment(html: string, blockIndex: number): boolean {
  const blocks = collectAnimBlocksFromHtml(html);
  const el = blocks[blockIndex - 1];
  return el?.hasAttribute('data-reveal-step') ?? false;
}

function paragraphStepFromHtml(html: string, paragraphIndex: number): number {
  return blockStepFromHtml(html, paragraphIndex);
}

function setParagraphStepInHtml(html: string, paragraphIndex: number, step: number): string {
  return setBlockStepInHtml(html, paragraphIndex, step);
}

function clearParagraphStepInHtml(html: string, paragraphIndex: number): string {
  return clearBlockStepInHtml(html, paragraphIndex);
}

export function paragraphHasRevealAssignment(html: string, paragraphIndex: number): boolean {
  return blockHasRevealAssignment(html, paragraphIndex);
}

export function elementHasRevealAssignment(el: SlideElement): boolean {
  if (el.type === 'text' && el.html?.includes('data-reveal-step')) return true;
  return el.animationSet === true;
}

export function layoutImageHasRevealAssignment(slide: PresentationSlide): boolean {
  return slide.zoneRevealSteps?.layoutImage !== undefined;
}

function collectParagraphItems(slide: PresentationSlide): AnimationItem[] {
  const items: AnimationItem[] = [];
  const fields = textFieldsInRevealOrder(slide.layout ?? 'title-content');
  for (const field of fields) {
    const html = slide[field];
    if (!html?.trim() || html === '<p><br></p>') continue;
    const div = parseHtmlContainer(html);
    let paraIndex = 0;
    collectAnimBlocksInRoot(div).forEach((el) => {
      paraIndex += 1;
      const step = parseInt(el.getAttribute('data-reveal-step') || '0', 10);
      const snippet = visibleAnimText(el).slice(0, 28);
      items.push({
        id: `paragraph:${field}:${paraIndex}`,
        kind: 'paragraph',
        label: `${FIELD_LABELS[field]} · ${snippet || `Block ${paraIndex}`}`,
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
    collectAnimBlocksInRoot(div).forEach((node) => {
      paraIndex += 1;
      const step = parseInt(node.getAttribute('data-reveal-step') || '0', 10);
      const snippet = visibleAnimText(node).slice(0, 24);
      items.push({
        id: `elementParagraph:${el.id}:${paraIndex}`,
        kind: 'paragraph',
        label: `Textfeld ${idx + 1} · ${snippet || `Block ${paraIndex}`}`,
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
    const typeLabel =
      el.type === 'image' ? 'Bild' : el.type === 'shape' ? 'Form' : 'Textfeld';
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

export const ANIMATION_LAYOUT_IMAGE_ID = 'zone:layoutImage';

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
        return { ...el, html: nextHtml, revealStep: undefined };
      }),
    };
  }

  if (itemId.startsWith('element:')) {
    const elementId = itemId.slice(8);
    return {
      ...slide,
      elements: (slide.elements || []).map((el) =>
        el.id === elementId ? { ...el, revealStep: safeStep, animationSet: true } : el
      ),
    };
  }

  return slide;
}

/** Entfernt die Animations-Zuweisung (Badge verschwindet). */
export function clearAnimationItemStep(slide: PresentationSlide, itemId: string): PresentationSlide {
  if (itemId === 'zone:layoutImage') {
    const zoneRevealSteps = { ...(slide.zoneRevealSteps || {}) };
    delete zoneRevealSteps.layoutImage;
    return { ...slide, zoneRevealSteps };
  }

  if (itemId.startsWith('paragraph:')) {
    const [, field, indexStr] = itemId.split(':');
    const paragraphIndex = parseInt(indexStr, 10);
    const htmlField = field as HtmlAnimField;
    const html = (slide[htmlField] as string) || '';
    return { ...slide, [htmlField]: clearParagraphStepInHtml(html, paragraphIndex) };
  }

  if (itemId.startsWith('elementParagraph:')) {
    const [, elementId, indexStr] = itemId.split(':');
    const paragraphIndex = parseInt(indexStr, 10);
    return {
      ...slide,
      elements: (slide.elements || []).map((el) => {
        if (el.id !== elementId || el.type !== 'text') return el;
        return { ...el, html: clearParagraphStepInHtml(el.html || '', paragraphIndex) };
      }),
    };
  }

  if (itemId.startsWith('element:')) {
    const elementId = itemId.slice(8);
    return {
      ...slide,
      elements: (slide.elements || []).map((el) =>
        el.id === elementId ? { ...el, revealStep: undefined, animationSet: undefined } : el
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
        return { ...el, html: nextHtml, revealStep: undefined, animationSet: undefined };
      }
    }
    return { ...el, revealStep: step++, animationSet: true };
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
      return { ...el, revealStep: undefined, animationSet: undefined, html };
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

export function animationItemIdForParagraph(field: HtmlAnimField, paragraphIndex: number): string {
  return `paragraph:${field}:${paragraphIndex}`;
}

export function animationItemIdForElementParagraph(elementId: string, paragraphIndex: number): string {
  return `elementParagraph:${elementId}:${paragraphIndex}`;
}

export function animationItemIdForElement(elementId: string): string {
  return `element:${elementId}`;
}

/** Block-Index (1-basiert) innerhalb eines Containers. */
export function paragraphIndexInContainer(container: HTMLElement, block: Element): number {
  return animBlockIndexInRoot(container, block);
}

export function getAnimationItemStep(slide: PresentationSlide, itemId: string): number {
  const item = collectAnimationItems(slide).find((entry) => entry.id === itemId);
  return item?.step ?? 0;
}

/** Patch für updateSlide nach Schritt-Zuweisung (ohne automatisches Komprimieren). */
export function slidePatchFromAnimationItem(
  slide: PresentationSlide,
  itemId: string,
  step: number
): Partial<PresentationSlide> {
  let next = setAnimationItemStep(slide, itemId, step);
  if (step > 0) next = { ...next, revealEnabled: true };
  return animationSlidePatch(next);
}

export function slidePatchFromClearAnimationItem(
  slide: PresentationSlide,
  itemId: string
): Partial<PresentationSlide> {
  const next = clearAnimationItemStep(slide, itemId);
  return animationSlidePatch(next);
}

function animationSlidePatch(next: PresentationSlide): Partial<PresentationSlide> {
  return {
    titleHtml: next.titleHtml,
    bodyHtml: next.bodyHtml,
    subtitleHtml: next.subtitleHtml,
    bodyLeftHtml: next.bodyLeftHtml,
    bodyRightHtml: next.bodyRightHtml,
    imageCaptionHtml: next.imageCaptionHtml,
    zoneRevealSteps: next.zoneRevealSteps,
    elements: next.elements,
    revealEnabled: next.revealEnabled,
  };
}

/** MUI-sx für Animations-Badges über Elementen im Bearbeitungsmodus. */
export function animationBadgeBoxSx(scale: number, selected?: boolean) {
  return {
    position: 'absolute' as const,
    top: `${-12 * scale}px`,
    left: `${-2 * scale}px`,
    minWidth: `${24 * scale}px`,
    height: `${24 * scale}px`,
    px: `${6 * scale}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: `${12 * scale}px`,
    bgcolor: selected ? '#E65100' : '#FF9800',
    color: '#fff',
    fontSize: `${13 * scale}px`,
    fontWeight: 800,
    lineHeight: 1,
    boxShadow: '0 2px 8px rgba(230,81,0,0.35)',
    zIndex: 20,
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  };
}

/** CSS für Badges direkt an Absätzen (Rich-Text-Zonen). */
export function animationParagraphBadgeSx(scale: number, editMode: boolean) {
  if (!editMode) return {};
  return {
    '& [data-reveal-step], & [data-anim-selected]': { position: 'relative' },
    '& [data-reveal-step]::before': {
      content: 'attr(data-reveal-step)',
      position: 'absolute',
      top: `${-12 * scale}px`,
      left: 0,
      minWidth: `${24 * scale}px`,
      height: `${24 * scale}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: `${12 * scale}px`,
      bgcolor: '#FF9800',
      color: '#fff',
      fontSize: `${13 * scale}px`,
      fontWeight: 800,
      lineHeight: `${24 * scale}px`,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(230,81,0,0.35)',
      zIndex: 5,
      pointerEvents: 'none',
    },
    '& [data-anim-selected]': {
      outline: `${2 * scale}px solid #E65100`,
      outlineOffset: `${2 * scale}px`,
      borderRadius: `${2 * scale}px`,
    },
    '& [data-anim-selected][data-reveal-step]::before': {
      bgcolor: '#E65100',
    },
  };
}
