import { PresentationDeck } from './presentationDeck';
import { hydratePresentationHtmlFontSizes } from './presentationFontSize';

const MAX_HISTORY = 30;

export function cloneDeck(deck: PresentationDeck): PresentationDeck {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(deck);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(deck)) as PresentationDeck;
}

export interface DeckHistory {
  stack: PresentationDeck[];
  index: number;
  /** Fingerprints parallel zum Stack — kein teures JSON.stringify beim Push. */
  fingerprints: string[];
}

function strSig(s: string | undefined): string {
  if (!s) return '0';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

function deckFingerprint(deck: PresentationDeck): string {
  const slides = deck.slides ?? [];
  let acc = `${slides.length}|${deck.title || ''}|${deck.showSlideNumbers ? 1 : 0}`;
  for (const s of slides) {
    const els = s.elements ?? [];
    acc += `~${s.id}:${s.order}:${s.extraPageCount || 0}:${strSig(s.titleHtml || s.title)}:${strSig(s.bodyHtml)}:${strSig(s.speakerNotesHtml)}:${s.speakerNotesInk?.length || 0}:${strSig(s.materialHtml)}:${strSig(s.preparationHtml)}:${strSig(s.audioTrack?.path)}:${s.audioTrack?.durationMs || 0}:${(s.audioTracks || []).length}:${strSig(s.screenTrack?.path)}:${(s.screenTracks || []).length}:${els.length}`;
    for (const el of els) {
      const frame = el.imageFrame;
      acc += `/${el.id}:${el.type}:${el.x | 0}:${el.y | 0}:${el.w | 0}:${el.h | 0}:${strSig(el.src)}:${strSig(el.html)}:${strSig(el.titleHtml)}:${frame?.preset || ''}:${frame?.color || ''}:${frame?.width || 0}`;
    }
  }
  return acc;
}

let applyingDeckHistory = false;

export function isApplyingDeckHistory(): boolean {
  return applyingDeckHistory;
}

export function setApplyingDeckHistory(value: boolean) {
  applyingDeckHistory = value;
}

export function createDeckHistory(initial: PresentationDeck): DeckHistory {
  return {
    stack: [cloneDeck(initial)],
    index: 0,
    fingerprints: [deckFingerprint(initial)],
  };
}

export function pushDeckHistory(history: DeckHistory, deck: PresentationDeck): DeckHistory {
  const fp = deckFingerprint(deck);
  if (history.fingerprints[history.index] === fp) {
    return history;
  }
  const snapshot = cloneDeck(deck);
  const stack = history.stack.slice(0, history.index + 1);
  const fingerprints = history.fingerprints.slice(0, history.index + 1);
  stack.push(snapshot);
  fingerprints.push(fp);
  while (stack.length > MAX_HISTORY) {
    stack.shift();
    fingerprints.shift();
  }
  return { stack, index: stack.length - 1, fingerprints };
}

export function canUndoDeck(
  history: DeckHistory | null,
  current?: PresentationDeck | null,
): boolean {
  if (!history) return false;
  if (current && history.fingerprints[history.index] !== deckFingerprint(current)) return true;
  return history.index > 0;
}

export function canRedoDeck(history: DeckHistory | null): boolean {
  return !!history && history.index < history.stack.length - 1;
}

export function undoDeckHistory(
  history: DeckHistory
): { history: DeckHistory; deck: PresentationDeck } | null {
  if (history.index <= 0) return null;
  const index = history.index - 1;
  return {
    history: { ...history, index },
    deck: cloneDeck(history.stack[index]),
  };
}

/** Letzten sichtbaren Schritt zurück: ungespeicherte Änderung oder vorheriger History-Stand. */
export function takeUndoStep(
  history: DeckHistory,
  current: PresentationDeck,
): { history: DeckHistory; deck: PresentationDeck } | null {
  const fp = deckFingerprint(current);
  if (history.fingerprints[history.index] !== fp) {
    return { history, deck: cloneDeck(history.stack[history.index]) };
  }
  return undoDeckHistory(history);
}

/**
 * Vor Rückgängig: aktuellen Stand auf den Stack legen, dann genau einen Schritt zurück.
 * Vermeidet den takeUndoStep-Fall, der bei DOM≠Fingerprint denselben kaputten Stand „wiederherstellt“.
 */
export function takeUndoStepAfterCommit(
  history: DeckHistory,
  current: PresentationDeck,
): { history: DeckHistory; deck: PresentationDeck } | null {
  const withCurrent = pushDeckHistory(history, current);
  return undoDeckHistory(withCurrent);
}

export function redoDeckHistory(
  history: DeckHistory
): { history: DeckHistory; deck: PresentationDeck } | null {
  if (!canRedoDeck(history)) return null;
  const index = history.index + 1;
  return {
    history: { ...history, index },
    deck: cloneDeck(history.stack[index]),
  };
}

function setEditorHtml(el: HTMLElement | null | undefined, html: string | undefined, fallback: string) {
  if (!el) return;
  const next = hydratePresentationHtmlFontSizes(html || fallback);
  if (el.innerHTML !== next) el.innerHTML = next;
}

/**
 * contentEditable behält lokalen DOM — nach Undo/Redo explizit aus dem Deck spiegeln.
 */
export function syncLiveEditorsFromDeck(deck: PresentationDeck, slideId: string | null) {
  if (typeof document === 'undefined') return;
  const slide =
    (slideId && deck.slides.find((s) => s.id === slideId)) || deck.slides[0] || null;
  if (!slide) return;

  const notesEl = document.querySelector(
    '[data-pres-notes-zone="true"]',
  ) as HTMLElement | null;
  if (notesEl) {
    setEditorHtml(notesEl, slide.speakerNotesHtml, '<p><br></p>');
  }

  const slideRoot = document.querySelector(
    `[data-pres-slide-id="${slide.id}"]`,
  ) as HTMLElement | null;
  if (!slideRoot) return;

  slideRoot.querySelectorAll<HTMLElement>('[data-pres-rich-zone][data-pres-html-field]').forEach((zone) => {
    const field = zone.getAttribute('data-pres-html-field');
    if (!field || field.startsWith('element')) return;
    const value = (slide as unknown as Record<string, unknown>)[field];
    if (typeof value === 'string') {
      setEditorHtml(zone, value, '<p><br></p>');
    }
  });

  for (const el of slide.elements || []) {
    const root = slideRoot.querySelector(`[data-pres-element="${el.id}"]`) as HTMLElement | null;
    if (!root) continue;

    if (el.type === 'card') {
      const body = root.querySelector('[data-card-body] [data-pres-rich-zone]') as HTMLElement | null;
      setEditorHtml(body, el.html, '<p></p>');
      const title = root.querySelector('[data-card-title] [data-pres-rich-zone]') as HTMLElement | null;
      setEditorHtml(
        title,
        el.titleHtml,
        '<p style="text-align:center"><strong>Titel</strong></p>',
      );
      continue;
    }

    if (el.type === 'text' || el.type === 'table') {
      const zone = root.querySelector('[data-pres-rich-zone], [data-text-edit]') as HTMLElement | null;
      setEditorHtml(zone, el.html, el.type === 'table' ? '<table></table>' : '<p><br></p>');
      continue;
    }

    const shapeBody = root.querySelector(
      '[data-shape-body][data-pres-rich-zone], [data-shape-body] [data-pres-rich-zone], [data-text-edit]',
    ) as HTMLElement | null;
    if (shapeBody && typeof el.html === 'string') {
      setEditorHtml(shapeBody, el.html, '<p style="text-align:center"><br></p>');
    }
  }
}
