import type { HeroPhaseContent } from '../components/BeAHeroPhaseRow';

export type BeAHeroWorkout = {
  id: string;
  name: string;
  equipment?: string;
  warmup: HeroPhaseContent;
  workout: HeroPhaseContent;
  cooldown: HeroPhaseContent;
  createdAt: string;
};

const LS_KEY = 'johnnyMonkey.beAHeroWorkouts.v4';
const LS_KEY_V3 = 'johnnyMonkey.beAHeroWorkouts.v3';
const LS_KEY_V2 = 'johnnyMonkey.beAHeroWorkouts.v2';
const LS_KEY_V1 = 'johnnyMonkey.beAHeroWorkouts.v1';

export function readLocalWorkoutsRaw(): string | null {
  try {
    return (
      localStorage.getItem(LS_KEY) ??
      localStorage.getItem(LS_KEY_V3) ??
      localStorage.getItem(LS_KEY_V2) ??
      localStorage.getItem(LS_KEY_V1)
    );
  } catch {
    return null;
  }
}

export function writeLocalWorkouts(workouts: BeAHeroWorkout[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(workouts));
  } catch {
    /* ignore */
  }
}

export async function fetchServerWorkoutsRaw(): Promise<unknown[] | null> {
  try {
    const res = await fetch('/api/be-a-hero/workouts', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

export async function saveServerWorkouts(workouts: BeAHeroWorkout[]): Promise<boolean> {
  try {
    const res = await fetch('/api/be-a-hero/workouts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workouts),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function workoutRichness(w: BeAHeroWorkout): number {
  const phases = [w.warmup, w.workout, w.cooldown];
  return phases.reduce((sum, p) => {
    let score = 0;
    if (p.songTitle.trim()) score += 1;
    if (p.songAudioUrl.trim()) score += 2;
    if (p.explanation.trim()) score += p.explanation.length;
    if (p.tabata?.enabled) score += 5;
    return sum + score;
  }, 0);
}

function mergeWorkoutLists(server: BeAHeroWorkout[], local: BeAHeroWorkout[]): BeAHeroWorkout[] {
  const byId = new Map<string, BeAHeroWorkout>();
  for (const w of server) byId.set(w.id, w);
  for (const w of local) {
    const existing = byId.get(w.id);
    if (!existing || workoutRichness(w) > workoutRichness(existing)) {
      byId.set(w.id, w);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function loadWorkoutsWithSync(
  parseWorkout: (raw: unknown) => BeAHeroWorkout | null,
): Promise<BeAHeroWorkout[]> {
  const parseList = (raw: unknown): BeAHeroWorkout[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map(parseWorkout).filter((w): w is BeAHeroWorkout => w !== null);
  };

  const serverRaw = await fetchServerWorkoutsRaw();
  const serverList = serverRaw ? parseList(serverRaw) : [];

  let localList: BeAHeroWorkout[] = [];
  const localRaw = readLocalWorkoutsRaw();
  if (localRaw) {
    try {
      localList = parseList(JSON.parse(localRaw));
    } catch {
      localList = [];
    }
  }

  const merged = mergeWorkoutLists(serverList, localList);
  writeLocalWorkouts(merged);

  const serverNeedsUpdate =
    merged.length !== serverList.length ||
    JSON.stringify(merged) !== JSON.stringify(serverList);
  if (serverNeedsUpdate) {
    await saveServerWorkouts(merged);
  }

  return merged;
}

export async function persistWorkouts(workouts: BeAHeroWorkout[]): Promise<void> {
  writeLocalWorkouts(workouts);
  await saveServerWorkouts(workouts);
}
