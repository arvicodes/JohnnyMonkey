import type { PresentationSlide, SlideElement } from './presentationDeck';

const HTML_FIELDS: (keyof PresentationSlide)[] = [
  'titleHtml',
  'bodyHtml',
  'subtitleHtml',
  'bodyLeftHtml',
  'bodyRightHtml',
  'imageCaptionHtml',
];

function parseHtmlContainer(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div;
}

/** Nummeriert Absätze & Listenpunkte für schrittweises Einblenden. */
export function assignRevealSteps(html: string, startAt = 1): string {
  const div = parseHtmlContainer(html);
  let step = startAt;
  div.querySelectorAll('p, li').forEach((el) => {
    if (!(el.textContent || '').trim()) return;
    if (el.querySelector('img')) {
      el.setAttribute('data-reveal-step', String(step++));
      return;
    }
    el.setAttribute('data-reveal-step', String(step++));
  });
  return div.innerHTML;
}

export function countRevealStepsInHtml(html: string): number {
  const div = parseHtmlContainer(html);
  let max = 0;
  div.querySelectorAll('[data-reveal-step]').forEach((el) => {
    const n = parseInt(el.getAttribute('data-reveal-step') || '0', 10);
    if (n > max) max = n;
  });
  return max;
}

export function filterHtmlByRevealStep(html: string, visibleStep: number, revealEnabled: boolean): string {
  if (!revealEnabled || !html) return html;
  const div = parseHtmlContainer(html);
  div.querySelectorAll('[data-reveal-step]').forEach((el) => {
    const step = parseInt(el.getAttribute('data-reveal-step') || '0', 10);
    const htmlEl = el as HTMLElement;
    htmlEl.classList.remove('pres-reveal-enter', 'pres-reveal-shown');
    if (step > visibleStep) {
      htmlEl.style.display = 'none';
    } else {
      htmlEl.style.display = '';
      if (step > 0 && step === visibleStep) {
        htmlEl.classList.add('pres-reveal-enter');
      } else {
        htmlEl.classList.add('pres-reveal-shown');
      }
    }
  });
  return div.innerHTML;
}

export function getZoneRevealStep(slide: PresentationSlide, zoneKey: string): number {
  return slide.zoneRevealSteps?.[zoneKey] ?? 0;
}

export function isZoneVisible(
  slide: PresentationSlide,
  zoneKey: string,
  visibleStep: number,
  revealEnabled: boolean
): boolean {
  if (!revealEnabled || slide.revealEnabled === false) return true;
  const step = getZoneRevealStep(slide, zoneKey);
  if (step <= 0) return true;
  return step <= visibleStep;
}

export function getSlideMaxRevealSteps(slide: PresentationSlide): number {
  if (slide.revealEnabled === false) return 0;
  const steps = new Set<number>();
  for (const field of HTML_FIELDS) {
    const html = slide[field] as string | undefined;
    if (!html) continue;
    const div = parseHtmlContainer(html);
    div.querySelectorAll('[data-reveal-step]').forEach((el) => {
      const n = parseInt(el.getAttribute('data-reveal-step') || '0', 10);
      if (n > 0) steps.add(n);
    });
  }
  const layoutStep = slide.zoneRevealSteps?.layoutImage;
  if (typeof layoutStep === 'number' && layoutStep > 0) steps.add(layoutStep);
  for (const el of slide.elements || []) {
    if (el.revealStep && el.revealStep > 0) steps.add(el.revealStep);
    if (el.type === 'text' && el.html) {
      const div = parseHtmlContainer(el.html);
      div.querySelectorAll('[data-reveal-step]').forEach((node) => {
        const n = parseInt(node.getAttribute('data-reveal-step') || '0', 10);
        if (n > 0) steps.add(n);
      });
    }
  }
  if (steps.size === 0) return 0;
  return Math.max(...steps);
}

/** Prüft ob in nummeriertem HTML mindestens ein Absatz sichtbar ist. */
export function hasVisibleRevealContent(html: string, visibleStep: number): boolean {
  if (!html?.includes('data-reveal-step')) return true;
  const div = parseHtmlContainer(html);
  return Array.from(div.querySelectorAll('[data-reveal-step]')).some((node) => {
    const step = parseInt(node.getAttribute('data-reveal-step') || '0', 10);
    return step <= visibleStep;
  });
}
/** True wenn das Element gerade in diesem Schritt eingeblendet wird. */
export function shouldAnimateReveal(itemStep: number, visibleStep: number, revealEnabled: boolean): boolean {
  if (!revealEnabled || itemStep <= 0) return false;
  return itemStep === visibleStep;
}

export function isElementVisible(el: SlideElement, visibleStep: number, revealEnabled: boolean): boolean {
  if (!revealEnabled) return true;
  const step = el.revealStep ?? 0;
  if (step <= 0) return true;
  return step <= visibleStep;
}

export function nextRevealStepForEditor(html: string): number {
  return countRevealStepsInHtml(html) + 1;
}

/** Markiert die aktuelle Auswahl als Einblend-Schritt. */
export function markSelectionRevealStep(editor: HTMLElement, step: number): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    const node = sel.anchorNode;
    const block =
      node instanceof Element
        ? node.closest('p, li, div')
        : node?.parentElement?.closest('p, li, div');
    if (block && editor.contains(block)) {
      block.setAttribute('data-reveal-step', String(step));
      return true;
    }
    return false;
  }
  try {
    const span = document.createElement('span');
    span.setAttribute('data-reveal-step', String(step));
    range.surroundContents(span);
    return true;
  } catch {
    return false;
  }
}

export function stripAllRevealSteps(html: string): string {
  const div = parseHtmlContainer(html);
  div.querySelectorAll('[data-reveal-step]').forEach((el) => {
    el.removeAttribute('data-reveal-step');
  });
  return div.innerHTML;
}
