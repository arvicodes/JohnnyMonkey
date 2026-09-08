/** Begrüßungs-Stoppuhr auf der Startfolie — Zeit bis alle fertig sind (je kürzer, desto besser). */

const STORAGE_PREFIX = 'jm-greeting-best:';

export type GreetingBestRecord = {
  bestMs: number;
  lastMs: number;
  updatedAt: string;
};

export function formatGreetingClock(ms: number, withTenths = true): string {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const t = Math.floor((total % 1000) / 100);
  const base = `${m}:${String(s).padStart(2, '0')}`;
  return withTenths ? `${base}.${t}` : base;
}

function storageKey(lessonPath: string): string {
  return `${STORAGE_PREFIX}${(lessonPath || '').trim()}`;
}

export function loadGreetingBest(lessonPath: string): GreetingBestRecord | null {
  if (!lessonPath || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(lessonPath));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GreetingBestRecord>;
    const bestMs = Number(parsed.bestMs);
    const lastMs = Number(parsed.lastMs);
    if (!Number.isFinite(bestMs) || bestMs < 0) return null;
    return {
      bestMs,
      lastMs: Number.isFinite(lastMs) && lastMs >= 0 ? lastMs : bestMs,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

export function saveGreetingResult(
  lessonPath: string,
  elapsedMs: number,
): { record: GreetingBestRecord; isNewBest: boolean } {
  const ms = Math.max(0, Math.round(elapsedMs));
  const prev = loadGreetingBest(lessonPath);
  const isNewBest = !prev || ms < prev.bestMs;
  const record: GreetingBestRecord = {
    bestMs: isNewBest ? ms : prev!.bestMs,
    lastMs: ms,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(storageKey(lessonPath), JSON.stringify(record));
  } catch {
    /* ignore */
  }
  return { record, isNewBest };
}
