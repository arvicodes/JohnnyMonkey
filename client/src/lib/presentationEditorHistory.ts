import { normalizeDeck, PresentationDeck } from './presentationDeck';

const MAX_HISTORY = 60;

export function cloneDeck(deck: PresentationDeck): PresentationDeck {
  return JSON.parse(JSON.stringify(normalizeDeck(deck)));
}

export interface DeckHistory {
  stack: PresentationDeck[];
  index: number;
}

export function createDeckHistory(initial: PresentationDeck): DeckHistory {
  return { stack: [cloneDeck(initial)], index: 0 };
}

export function pushDeckHistory(history: DeckHistory, deck: PresentationDeck): DeckHistory {
  const snapshot = cloneDeck(deck);
  const current = history.stack[history.index];
  if (current && JSON.stringify(current) === JSON.stringify(snapshot)) {
    return history;
  }
  const stack = history.stack.slice(0, history.index + 1);
  stack.push(snapshot);
  while (stack.length > MAX_HISTORY) stack.shift();
  return { stack, index: stack.length - 1 };
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
