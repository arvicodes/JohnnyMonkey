export type BeAHeroRandomKind = 'cards';

export type BeAHeroSuitKey = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type BeAHeroSuitExercises = Record<BeAHeroSuitKey, string>;

export type BeAHeroCardsRandomConfig = {
  enabled: boolean;
  kind: BeAHeroRandomKind;
  rankMin: number;
  rankMax: number;
  includePictureCards: boolean;
  includeAces: boolean;
  jokerCount: number;
  pictureValue: number;
  aceValue: number;
  jokerValue: number;
  jokerLabel: string;
  suitExercises: BeAHeroSuitExercises;
};

export type BeAHeroRandomConfig = BeAHeroCardsRandomConfig;

export type HeroPlayingCardKind = 'number' | 'picture' | 'ace' | 'joker';

export type HeroPlayingCard = {
  id: string;
  kind: HeroPlayingCardKind;
  suit?: BeAHeroSuitKey;
  rankLabel: string;
  displayLabel: string;
  reps: number;
  repsLabel: string;
  exercise: string;
};

export const SUIT_META: Record<
  BeAHeroSuitKey,
  { symbol: string; emoji: string; label: string }
> = {
  hearts: { symbol: '♥', emoji: '♥️', label: 'Herz' },
  diamonds: { symbol: '♦', emoji: '♦️', label: 'Karo' },
  clubs: { symbol: '♣', emoji: '♣️', label: 'Kreuz' },
  spades: { symbol: '♠', emoji: '♠️', label: 'Pik' },
};

export const DEFAULT_SUIT_EXERCISES: BeAHeroSuitExercises = {
  hearts: 'Strecksprünge',
  diamonds: 'Vierfüßler - Streck',
  clubs: 'Beinheben + 2x Schere',
  spades: 'Plankwalks',
};

export const DEFAULT_CARDS_RANDOM: BeAHeroCardsRandomConfig = {
  enabled: false,
  kind: 'cards',
  rankMin: 7,
  rankMax: 10,
  includePictureCards: true,
  includeAces: true,
  jokerCount: 1,
  pictureValue: 10,
  aceValue: 15,
  jokerValue: 20,
  jokerLabel: 'Burpees',
  suitExercises: { ...DEFAULT_SUIT_EXERCISES },
};

const SUITS: BeAHeroSuitKey[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const PICTURE_RANKS = ['B', 'D', 'K'] as const;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeSuitExercises(raw: unknown): BeAHeroSuitExercises {
  const base = { ...DEFAULT_SUIT_EXERCISES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  for (const suit of SUITS) {
    const v = o[suit];
    if (typeof v === 'string') base[suit] = v;
  }
  return base;
}

export function normalizeCardsRandom(raw: unknown): BeAHeroCardsRandomConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_CARDS_RANDOM };
  const o = raw as Record<string, unknown>;
  const rankMin = clampInt(o.rankMin, 2, 10, DEFAULT_CARDS_RANDOM.rankMin);
  const rankMax = clampInt(o.rankMax, rankMin, 10, DEFAULT_CARDS_RANDOM.rankMax);
  return {
    enabled: !!o.enabled,
    kind: 'cards',
    rankMin,
    rankMax,
    includePictureCards: o.includePictureCards !== false,
    includeAces: o.includeAces !== false,
    jokerCount: clampInt(o.jokerCount, 0, 4, DEFAULT_CARDS_RANDOM.jokerCount),
    pictureValue: clampInt(o.pictureValue, 1, 99, DEFAULT_CARDS_RANDOM.pictureValue),
    aceValue: clampInt(o.aceValue, 1, 99, DEFAULT_CARDS_RANDOM.aceValue),
    jokerValue: clampInt(o.jokerValue, 1, 99, DEFAULT_CARDS_RANDOM.jokerValue),
    jokerLabel: typeof o.jokerLabel === 'string' && o.jokerLabel.trim() ? o.jokerLabel.trim() : DEFAULT_CARDS_RANDOM.jokerLabel,
    suitExercises: normalizeSuitExercises(o.suitExercises),
  };
}

export function finalizeCardsRandom(config: BeAHeroCardsRandomConfig | undefined): BeAHeroCardsRandomConfig {
  return normalizeCardsRandom(config);
}

export function isCardsRandomActive(config: BeAHeroCardsRandomConfig | undefined): boolean {
  const c = normalizeCardsRandom(config);
  return c.enabled && countCardsInDeck(c) > 0;
}

export function countCardsInDeck(config: BeAHeroCardsRandomConfig): number {
  const c = normalizeCardsRandom(config);
  const numberCards = 4 * Math.max(0, c.rankMax - c.rankMin + 1);
  const pictureCards = c.includePictureCards ? 12 : 0;
  const aces = c.includeAces ? 4 : 0;
  return numberCards + pictureCards + aces + c.jokerCount;
}

function repsLabelForCard(card: Omit<HeroPlayingCard, 'repsLabel'>, config: BeAHeroCardsRandomConfig): string {
  if (card.kind === 'joker') {
    return `${card.reps} ${config.jokerLabel}`.trim();
  }
  if (card.kind === 'number') {
    return String(card.reps);
  }
  return String(card.reps);
}

export function buildPlayingDeck(config: BeAHeroCardsRandomConfig): HeroPlayingCard[] {
  const c = normalizeCardsRandom(config);
  const cards: HeroPlayingCard[] = [];

  for (const suit of SUITS) {
    const meta = SUIT_META[suit];
    const exercise = c.suitExercises[suit]?.trim() || DEFAULT_SUIT_EXERCISES[suit];

    for (let rank = c.rankMin; rank <= c.rankMax; rank += 1) {
      const rankLabel = String(rank);
      cards.push({
        id: `${suit}-num-${rank}`,
        kind: 'number',
        suit,
        rankLabel,
        displayLabel: `${rankLabel}${meta.symbol}`,
        reps: rank,
        repsLabel: String(rank),
        exercise,
      });
    }

    if (c.includePictureCards) {
      for (const rankLabel of PICTURE_RANKS) {
        cards.push({
          id: `${suit}-pic-${rankLabel}`,
          kind: 'picture',
          suit,
          rankLabel,
          displayLabel: `${rankLabel}${meta.symbol}`,
          reps: c.pictureValue,
          repsLabel: String(c.pictureValue),
          exercise,
        });
      }
    }

    if (c.includeAces) {
      cards.push({
        id: `${suit}-ace`,
        kind: 'ace',
        suit,
        rankLabel: 'A',
        displayLabel: `A${meta.symbol}`,
        reps: c.aceValue,
        repsLabel: String(c.aceValue),
        exercise,
      });
    }
  }

  for (let i = 0; i < c.jokerCount; i += 1) {
    const card = {
      id: `joker-${i + 1}`,
      kind: 'joker' as const,
      rankLabel: '🤡',
      displayLabel: i === 0 && c.jokerCount === 1 ? '🤡 Joker' : `🤡 Joker ${i + 1}`,
      reps: c.jokerValue,
      exercise: `${c.jokerValue} ${c.jokerLabel}`.trim(),
    };
    cards.push({
      ...card,
      repsLabel: repsLabelForCard(card, c),
    });
  }

  return cards.map((card) => ({
    ...card,
    repsLabel: card.repsLabel || repsLabelForCard(card, c),
  }));
}

export function shuffleDeck<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function emptyCardsRandomConfig(): BeAHeroCardsRandomConfig {
  return {
    ...DEFAULT_CARDS_RANDOM,
    suitExercises: { ...DEFAULT_SUIT_EXERCISES },
  };
}

export function describeCardsDeck(config: BeAHeroCardsRandomConfig): string {
  const c = normalizeCardsRandom(config);
  const parts: string[] = [];
  if (c.rankMax >= c.rankMin) {
    parts.push(c.rankMin === c.rankMax ? `${c.rankMin}` : `${c.rankMin} bis ${c.rankMax}`);
  }
  if (c.includePictureCards) parts.push('Bildkarten');
  if (c.includeAces) parts.push('Asse');
  if (c.jokerCount > 0) {
    parts.push(c.jokerCount === 1 ? 'ein Joker' : `${c.jokerCount} Joker`);
  }
  return parts.join(', ');
}
