import { PresentationDeck } from './presentationDeck';

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
    acc += `~${s.id}:${s.order}:${strSig(s.titleHtml || s.title)}:${strSig(s.bodyHtml)}:${strSig(s.speakerNotesHtml)}:${strSig(s.materialHtml)}:${strSig(s.preparationHtml)}:${els.length}`;
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

export function canUndoDeck(history: DeckHistory | null): boolean {
  return !!history && history.index > 0;
}

export function canRedoDeck(history: DeckHistory | null): boolean {
  return !!history && history.index < history.stack.length - 1;
}

export function undoDeckHistory(
  history: DeckHistory
): { history: DeckHistory; deck: PresentationDeck } | null {
  if (!canUndoDeck(history)) return null;
  const index = history.index - 1;
  return {
    history: { ...history, index },
    deck: cloneDeck(history.stack[index]),
  };
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
