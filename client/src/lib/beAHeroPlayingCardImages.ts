import type { BeAHeroSuitKey, HeroPlayingCard } from './beAHeroRandom';

const SUIT_CODE: Record<BeAHeroSuitKey, string> = {
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
  spades: 'S',
};

/** Bube/Dame/König → Standard-Deck (J/Q/K) für die Kartenbilder. */
const PICTURE_RANK_CODE: Record<string, string> = {
  B: 'J',
  D: 'Q',
  K: 'K',
};

const CARD_IMAGE_BASE = '/be-a-hero/cards';

export function playingCardImageCode(card: HeroPlayingCard): string | null {
  if (card.kind === 'joker') {
    const index = Number.parseInt(card.id.replace('joker-', ''), 10);
    if (!Number.isFinite(index) || index < 1) return 'X1';
    return index % 2 === 0 ? 'X2' : 'X1';
  }
  if (!card.suit) return null;

  const suit = SUIT_CODE[card.suit];
  let rank = card.rankLabel;
  if (card.kind === 'number' && rank === '10') {
    rank = '0';
  } else if (card.kind === 'picture') {
    rank = PICTURE_RANK_CODE[rank] ?? rank;
  } else if (card.kind === 'ace') {
    rank = 'A';
  }

  return `${rank}${suit}`;
}

export function playingCardImageSrc(card: HeroPlayingCard): string | null {
  const code = playingCardImageCode(card);
  if (!code) return null;
  return `${CARD_IMAGE_BASE}/${code}.png`;
}
