export type MemorySetExport = {
  id: string;
  name: string;
  leftText: string;
  rightText: string;
  leftImages?: string[];
  rightImages?: string[];
};

export type MemoryPlayBootstrap = {
  setName: string;
  leftText: string;
  rightText: string;
  leftImages: string[];
  rightImages: string[];
};

export const memoryStorageKey = 'johnnyMonkey.kiGames.memorySets.v1';

export function readMemoryBootstrapForExport(): { sets: MemorySetExport[]; selectedId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(memoryStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sets?: unknown; selectedId?: unknown };
    if (!Array.isArray(parsed.sets) || !parsed.sets.length) return null;
    const sets = parsed.sets.filter(
      (set): set is MemorySetExport =>
        Boolean(set) &&
        typeof (set as MemorySetExport).id === 'string' &&
        typeof (set as MemorySetExport).name === 'string' &&
        typeof (set as MemorySetExport).leftText === 'string' &&
        typeof (set as MemorySetExport).rightText === 'string'
    );
    if (!sets.length) return null;
    return {
      sets,
      selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : sets[0].id,
    };
  } catch {
    return null;
  }
}
