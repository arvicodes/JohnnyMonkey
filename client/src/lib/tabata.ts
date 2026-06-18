export type TabataMode = 'interval' | 'pyramid';

export type TabataPyramidSet = {
  workSeconds: number;
  restSeconds: number;
};

export type TabataConfig = {
  enabled: boolean;
  mode: TabataMode;
  /** Intervall-Modus */
  workSeconds: number;
  /** Pause zwischen Übungen innerhalb einer Runde */
  restSeconds: number;
  /** Pause zwischen Runden */
  roundRestSeconds: number;
  /** Übungen pro Runde (jede mit Arbeit/Pause) */
  exercisesPerRound: number;
  rounds: number;
  /** Pyramiden-Modus: Sätze mit eigener Belastung/Wechsel-Zeit */
  pyramidSets: TabataPyramidSet[];
  exercisesPerSet: number;
  roundsPerSet: number;
  /** Pause zwischen Runden innerhalb eines Satzes */
  setRoundRestSeconds: number;
  /** Pause zwischen Sätzen */
  setRestSeconds: number;
};

export const DEFAULT_PYRAMID_SETS: TabataPyramidSet[] = [
  { workSeconds: 20, restSeconds: 10 },
  { workSeconds: 30, restSeconds: 10 },
  { workSeconds: 45, restSeconds: 20 },
  { workSeconds: 30, restSeconds: 10 },
  { workSeconds: 20, restSeconds: 10 },
];

export const DEFAULT_TABATA: TabataConfig = {
  enabled: false,
  mode: 'interval',
  workSeconds: 20,
  restSeconds: 10,
  roundRestSeconds: 0,
  exercisesPerRound: 1,
  rounds: 8,
  pyramidSets: DEFAULT_PYRAMID_SETS.map((set) => ({ ...set })),
  exercisesPerSet: 4,
  roundsPerSet: 2,
  setRoundRestSeconds: 0,
  setRestSeconds: 0,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizePyramidSets(raw: unknown): TabataPyramidSet[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_PYRAMID_SETS.map((set) => ({ ...set }));
  }
  return raw.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { workSeconds: 20, restSeconds: 10 };
    }
    const o = item as Record<string, unknown>;
    return {
      workSeconds: clampInt(o.workSeconds, 5, 300, 20),
      restSeconds: clampInt(o.restSeconds, 0, 300, 10),
    };
  });
}

function parseMode(raw: unknown): TabataMode {
  return raw === 'pyramid' ? 'pyramid' : 'interval';
}

export function normalizeTabata(raw: unknown): TabataConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_TABATA };
  const o = raw as Record<string, unknown>;
  const mode = parseMode(o.mode);
  const workSeconds = clampInt(o.workSeconds, 5, 300, DEFAULT_TABATA.workSeconds);
  const restSeconds = clampInt(o.restSeconds, 0, 300, DEFAULT_TABATA.restSeconds);
  const roundRestSeconds = clampInt(
    o.roundRestSeconds ?? o.roundRest,
    0,
    300,
    DEFAULT_TABATA.roundRestSeconds,
  );
  const exercisesPerRound = clampInt(
    o.exercisesPerRound ?? o.exercises,
    1,
    30,
    DEFAULT_TABATA.exercisesPerRound,
  );
  const rounds = clampInt(o.rounds, 1, 50, DEFAULT_TABATA.rounds);
  const pyramidSets = normalizePyramidSets(o.pyramidSets);
  const exercisesPerSet = clampInt(o.exercisesPerSet, 1, 30, DEFAULT_TABATA.exercisesPerSet);
  const roundsPerSet = clampInt(o.roundsPerSet, 1, 30, DEFAULT_TABATA.roundsPerSet);
  const setRoundRestSeconds = clampInt(o.setRoundRestSeconds, 0, 300, DEFAULT_TABATA.setRoundRestSeconds);
  const setRestSeconds = clampInt(o.setRestSeconds ?? o.setRest, 0, 300, DEFAULT_TABATA.setRestSeconds);

  return {
    enabled: !!o.enabled,
    mode,
    workSeconds,
    restSeconds,
    roundRestSeconds,
    exercisesPerRound,
    rounds,
    pyramidSets,
    exercisesPerSet,
    roundsPerSet,
    setRoundRestSeconds,
    setRestSeconds,
  };
}

export function finalizeTabata(tabata: TabataConfig | undefined): TabataConfig {
  const t = normalizeTabata(tabata);
  return { ...t, enabled: !!t.enabled };
}

export function isTabataActive(tabata: TabataConfig | undefined): boolean {
  const t = normalizeTabata(tabata);
  if (!t.enabled) return false;
  if (t.mode === 'pyramid') {
    return (
      t.pyramidSets.length > 0 &&
      t.exercisesPerSet > 0 &&
      t.roundsPerSet > 0 &&
      t.pyramidSets.every((set) => set.workSeconds > 0)
    );
  }
  return t.rounds > 0 && t.exercisesPerRound > 0 && t.workSeconds > 0;
}

export function getPyramidSet(config: TabataConfig, setIndex: number): TabataPyramidSet {
  const sets = normalizeTabata(config).pyramidSets;
  return sets[Math.max(0, Math.min(setIndex - 1, sets.length - 1))] ?? { workSeconds: 20, restSeconds: 10 };
}

export function describeTabataConfig(config: TabataConfig): string {
  const t = normalizeTabata(config);
  if (t.mode === 'pyramid') {
    const setCount = t.pyramidSets.length;
    return `Pyramide · ${setCount} Sätze · ${t.roundsPerSet}×${t.exercisesPerSet} Üb.`;
  }
  const roundPause = t.roundRestSeconds > 0 ? ` · ${t.roundRestSeconds}s Rdn.` : '';
  return `${t.workSeconds}s · ${t.restSeconds}s Üb.${roundPause} · ${t.exercisesPerRound} Üb. · ${t.rounds} Rdn.`;
}

export function formatTabataSeconds(total: number): string {
  const s = Math.max(0, Math.ceil(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : String(r);
}
