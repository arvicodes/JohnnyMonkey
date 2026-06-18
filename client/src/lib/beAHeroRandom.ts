export type BeAHeroRandomKind = 'cards' | 'numbers';

export type BeAHeroSuitKey = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type BeAHeroSuitExercises = Record<BeAHeroSuitKey, string>;

export type BeAHeroRandomConfig = {
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
  numberMin: number;
  numberMax: number;
  numberLabel: string;
  /** 0 = unbegrenzt, >0 = Ende nach N Zügen */
  drawLimit: number;
};

/** @deprecated Alias */
export type BeAHeroCardsRandomConfig = BeAHeroRandomConfig;

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

export const EMPTY_SUIT_EXERCISES: BeAHeroSuitExercises = {
  hearts: '',
  diamonds: '',
  clubs: '',
  spades: '',
};

/** Neutrale Startwerte — nichts vorkonfiguriert, Nutzer legt alles selbst fest. */
export const EMPTY_RANDOM: BeAHeroRandomConfig = {
  enabled: false,
  kind: 'cards',
  rankMin: 2,
  rankMax: 0,
  includePictureCards: false,
  includeAces: false,
  jokerCount: 0,
  pictureValue: 10,
  aceValue: 15,
  jokerValue: 20,
  jokerLabel: '',
  suitExercises: { ...EMPTY_SUIT_EXERCISES },
  numberMin: 1,
  numberMax: 0,
  numberLabel: '',
  drawLimit: 0,
};

/** @deprecated */
export const EMPTY_CARDS_RANDOM = EMPTY_RANDOM;

/** Fallback nur für ältere Datensätze ohne gespeicherte Zufall-Konfiguration. */
export const DEFAULT_CARDS_RANDOM: BeAHeroRandomConfig = {
  ...EMPTY_RANDOM,
  rankMin: 7,
  rankMax: 10,
  includePictureCards: true,
  includeAces: true,
  jokerCount: 1,
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
  const base = { ...EMPTY_SUIT_EXERCISES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  for (const suit of SUITS) {
    const v = o[suit];
    if (typeof v === 'string') base[suit] = v;
  }
  return base;
}

function parseKind(raw: unknown): BeAHeroRandomKind {
  return raw === 'numbers' ? 'numbers' : 'cards';
}

export function normalizeRandom(raw: unknown): BeAHeroRandomConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyRandomConfig();
  const o = raw as Record<string, unknown>;
  const kind = parseKind(o.kind);
  const rankMin = clampInt(o.rankMin, 2, 10, EMPTY_RANDOM.rankMin);
  const rankMax = clampInt(o.rankMax, 0, 10, EMPTY_RANDOM.rankMax);
  const numberMin = clampInt(o.numberMin, 1, 999, EMPTY_RANDOM.numberMin);
  const numberMax = clampInt(o.numberMax, 0, 999, EMPTY_RANDOM.numberMax);
  return {
    enabled: !!o.enabled,
    kind,
    rankMin,
    rankMax,
    includePictureCards: o.includePictureCards === true,
    includeAces: o.includeAces === true,
    jokerCount: clampInt(o.jokerCount, 0, 4, 0),
    pictureValue: clampInt(o.pictureValue, 1, 99, EMPTY_RANDOM.pictureValue),
    aceValue: clampInt(o.aceValue, 1, 99, EMPTY_RANDOM.aceValue),
    jokerValue: clampInt(o.jokerValue, 1, 99, EMPTY_RANDOM.jokerValue),
    jokerLabel: typeof o.jokerLabel === 'string' ? o.jokerLabel.trim() : '',
    suitExercises: normalizeSuitExercises(o.suitExercises),
    numberMin,
    numberMax,
    numberLabel: typeof o.numberLabel === 'string' ? o.numberLabel.trim() : '',
    drawLimit: clampInt(o.drawLimit, 0, 999, 0),
  };
}

/** @deprecated */
export const normalizeCardsRandom = normalizeRandom;

export function finalizeRandom(config: BeAHeroRandomConfig | undefined): BeAHeroRandomConfig {
  return normalizeRandom(config);
}

/** @deprecated */
export const finalizeCardsRandom = finalizeRandom;

export function isNumbersRandomReady(config: BeAHeroRandomConfig): boolean {
  const c = normalizeRandom(config);
  return c.kind === 'numbers' && c.numberMax >= c.numberMin && c.numberMin >= 1;
}

export function isRandomActive(config: BeAHeroRandomConfig | undefined): boolean {
  const c = normalizeRandom(config);
  if (!c.enabled) return false;
  if (c.kind === 'numbers') return isNumbersRandomReady(c);
  return countCardsInDeck(c) > 0;
}

/** @deprecated */
export const isCardsRandomActive = (config: BeAHeroRandomConfig | undefined) => {
  const c = normalizeRandom(config);
  return c.enabled && c.kind === 'cards' && countCardsInDeck(c) > 0;
};

export function countCardsInDeck(config: BeAHeroRandomConfig): number {
  const c = normalizeRandom(config);
  const numberCards =
    c.rankMax >= c.rankMin && c.rankMin >= 2 ? 4 * (c.rankMax - c.rankMin + 1) : 0;
  const pictureCards = c.includePictureCards ? 12 : 0;
  const aces = c.includeAces ? 4 : 0;
  return numberCards + pictureCards + aces + c.jokerCount;
}

/** null = unbegrenzt */
export function effectiveDrawLimit(config: BeAHeroRandomConfig): number | null {
  const c = normalizeRandom(config);
  return c.drawLimit > 0 ? c.drawLimit : null;
}

export function describeDrawLimit(config: BeAHeroRandomConfig, unit: 'Karte' | 'Zug' = 'Karte'): string {
  const limit = effectiveDrawLimit(config);
  if (!limit) return '';
  const plural = limit === 1 ? unit : unit === 'Zug' ? 'Züge' : 'Karten';
  return `Ende nach ${limit} ${plural}`;
}

export function rollRandomNumber(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function repsLabelForCard(card: Omit<HeroPlayingCard, 'repsLabel'>, config: BeAHeroRandomConfig): string {
  if (card.kind === 'joker') {
    return `${card.reps} ${config.jokerLabel}`.trim();
  }
  if (card.kind === 'number') {
    return String(card.reps);
  }
  return String(card.reps);
}

export function buildPlayingDeck(config: BeAHeroRandomConfig): HeroPlayingCard[] {
  const c = normalizeRandom(config);
  const cards: HeroPlayingCard[] = [];

  for (const suit of SUITS) {
    const meta = SUIT_META[suit];
    const exercise = c.suitExercises[suit]?.trim() || '';

    if (c.rankMax >= c.rankMin && c.rankMin >= 2) {
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

export function emptyRandomConfig(): BeAHeroRandomConfig {
  return {
    ...EMPTY_RANDOM,
    suitExercises: { ...EMPTY_SUIT_EXERCISES },
  };
}

/** @deprecated */
export const emptyCardsRandomConfig = emptyRandomConfig;

export function describeCardsDeck(config: BeAHeroRandomConfig): string {
  const c = normalizeRandom(config);
  const total = countCardsInDeck(c);
  if (total === 0) return 'Noch kein Stapel — Kartensatz unten festlegen';

  const parts: string[] = [];
  if (c.rankMax >= c.rankMin) {
    parts.push(c.rankMin === c.rankMax ? `Zahlen ${c.rankMin}` : `Zahlen ${c.rankMin}–${c.rankMax}`);
  }
  if (c.includePictureCards) parts.push('Bildkarten');
  if (c.includeAces) parts.push('Asse');
  if (c.jokerCount > 0) {
    parts.push(c.jokerCount === 1 ? '1 Joker' : `${c.jokerCount} Joker`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Noch kein Stapel — Kartensatz unten festlegen';
}
