/**
 * Feste Kernbausteine jeder Stunde (ohne Materialliste — die liegt als Textfeld oben):
 * Entry Ticket → Präsentation → Exit Ticket (weitere Bausteine dazwischen).
 */

export const LESSON_PLAN_CORE_TYPES = ['entry-ticket', 'praesentation', 'exit-ticket'] as const;

export type LessonPlanCoreType = (typeof LESSON_PLAN_CORE_TYPES)[number];

export function isLessonPlanCoreType(type: string): type is LessonPlanCoreType {
  return (LESSON_PLAN_CORE_TYPES as readonly string[]).includes(type);
}

function coreRank(type: string): number {
  if (type === 'entry-ticket') return 10;
  if (type === 'praesentation') return 20;
  if (type === 'exit-ticket') return 1000;
  return 100;
}

/** Sortiert den Ablauf: Entry → Präsentation → übrige → Exit. */
export function sortLessonPlanCoreOrder<T extends { type: string }>(plan: T[]): T[] {
  return [...plan]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ra = coreRank(a.item.type);
      const rb = coreRank(b.item.type);
      if (ra !== rb) return ra - rb;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export type EnsureCoreLessonPlanOptions<T extends { id: string; type: string; label: string }> = {
  plan: T[];
  makeId: (type: string, index: number) => string;
  resolveLabel: (type: LessonPlanCoreType) => string;
  entryDefaults?: Partial<Omit<T, 'id' | 'type' | 'label'>>;
  exitDefaults?: Partial<Omit<T, 'id' | 'type' | 'label'>>;
};

/**
 * Ergänzt fehlende Kernbausteine und sortiert in die Standardreihenfolge.
 * Bestehende Items (inkl. grade/exitType) bleiben erhalten.
 */
export function ensureCoreLessonPlanItems<T extends { id: string; type: string; label: string }>(
  options: EnsureCoreLessonPlanOptions<T>
): { plan: T[]; changed: boolean } {
  const { plan, makeId, resolveLabel, entryDefaults, exitDefaults } = options;
  const next = [...plan];
  let changed = false;

  for (const type of LESSON_PLAN_CORE_TYPES) {
    if (next.some((p) => p.type === type)) continue;
    const base = {
      id: makeId(type, next.length),
      type,
      label: resolveLabel(type),
    } as T;
    if (type === 'entry-ticket' && entryDefaults) Object.assign(base, entryDefaults);
    if (type === 'exit-ticket' && exitDefaults) Object.assign(base, exitDefaults);
    next.push(base);
    changed = true;
  }

  const sorted = sortLessonPlanCoreOrder(next);
  if (!changed) {
    changed =
      sorted.length !== plan.length ||
      sorted.some((item, i) => item.id !== plan[i]?.id || item.type !== plan[i]?.type);
  }
  return { plan: sorted, changed };
}
