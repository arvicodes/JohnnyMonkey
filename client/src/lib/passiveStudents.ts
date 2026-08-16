/** Passive-Schüler pro Lerngruppe (z. B. länger im Ausland) — JSON-Array auf LearningGroup.passiveStudentIds. */

export function parsePassiveStudentIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id)).filter(Boolean);
  }
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
}

export function isPassiveStudentId(
  studentId: string,
  passiveIds: string[] | undefined | null,
): boolean {
  if (!studentId || !passiveIds?.length) return false;
  return passiveIds.includes(studentId);
}

export function activeStudentsOfGroup<T extends { id: string }>(
  students: T[] | undefined | null,
  passiveIds: string[] | undefined | null,
): T[] {
  const list = Array.isArray(students) ? students : [];
  if (!passiveIds?.length) return list;
  const set = new Set(passiveIds);
  return list.filter((s) => !set.has(s.id));
}
