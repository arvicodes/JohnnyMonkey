import type { PresentationDeck, PresentationSlideFooter } from './presentationDeck';

export const SLIDE_FOOTER_HEIGHT = 46;

export function normalizeSlideFooter(
  footer?: PresentationSlideFooter,
  deckTitle?: string,
): Required<PresentationSlideFooter> {
  return {
    title: footer?.title?.trim() || deckTitle?.trim() || '',
    right: footer?.right?.trim() || '',
  };
}

export function resolveDeckFooter(deck: PresentationDeck): Required<PresentationSlideFooter> {
  return normalizeSlideFooter(deck.slideFooter, deck.title);
}
