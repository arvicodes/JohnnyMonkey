export interface LearningGroupSortable {
  id: string;
  name: string;
  displayOrder?: number | null;
}

/** Fallback-Reihenfolge für Gruppen ohne gespeicherte displayOrder */
function legacyNameOrder(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('7a') || n === 'klasse 7a') return 0;
  if (n.includes('10c') || n === 'klasse 10c') return 1;
  if (n.includes('mathe lk 11')) return 2;
  if (n.includes('gk 11') || n.includes('informatik gk 11')) return 3;
  if (n.includes('gk 12') || n.includes('informatik gk 12')) return 4;
  return 5;
}

export function sortLearningGroups<T extends LearningGroupSortable>(groups: T[]): T[] {
  const hasCustomOrder = groups.some((g) => g.displayOrder != null);
  if (!hasCustomOrder) {
    return [...groups].sort((a, b) => {
      const diff = legacyNameOrder(a.name) - legacyNameOrder(b.name);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, 'de');
    });
  }

  return [...groups].sort((a, b) => {
    const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, 'de');
  });
}

export function nextLearningGroupDisplayOrder(groups: LearningGroupSortable[]): number {
  if (groups.length === 0) return 0;
  const max = groups.reduce((m, g) => Math.max(m, g.displayOrder ?? -1), -1);
  return max + 1;
}
