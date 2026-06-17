export type TabataConfig = {
  enabled: boolean;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
};

export const DEFAULT_TABATA: TabataConfig = {
  enabled: false,
  workSeconds: 20,
  restSeconds: 10,
  rounds: 8,
};

export function normalizeTabata(raw: unknown): TabataConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_TABATA };
  const o = raw as Record<string, unknown>;
  const workSeconds = clampInt(o.workSeconds, 5, 300, DEFAULT_TABATA.workSeconds);
  const restSeconds = clampInt(o.restSeconds, 0, 300, DEFAULT_TABATA.restSeconds);
  const rounds = clampInt(o.rounds, 1, 50, DEFAULT_TABATA.rounds);
  return {
    enabled: !!o.enabled,
    workSeconds,
    restSeconds,
    rounds,
  };
}

export function finalizeTabata(tabata: TabataConfig | undefined): TabataConfig {
  const t = normalizeTabata(tabata);
  return { ...t, enabled: !!t.enabled };
}

export function isTabataActive(tabata: TabataConfig | undefined): boolean {
  const t = normalizeTabata(tabata);
  return t.enabled && t.rounds > 0 && t.workSeconds > 0;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function formatTabataSeconds(total: number): string {
  const s = Math.max(0, Math.ceil(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : String(r);
}
