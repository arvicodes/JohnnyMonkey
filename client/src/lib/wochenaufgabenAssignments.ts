/** Virtueller Abgabe-Schlüssel für Erklärvideos (Slot 1–4). */
export function wochenaufgabeVideoAssignmentKey(lessonPath: string, slot: number): {
  fileName: string;
  filePath: string;
} {
  const normalized = lessonPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const safeSlot = Math.min(4, Math.max(1, Math.floor(slot)));
  const fileName = safeSlot === 1 ? 'EV_Erklaervideo' : `EV_Erklaervideo_${safeSlot}`;
  return {
    fileName,
    filePath: `${normalized}/${fileName}`,
  };
}

export const WOCHENAUFGABE_SLOTS = [1, 2, 3, 4] as const;
export type WochenaufgabeSlot = (typeof WOCHENAUFGABE_SLOTS)[number];

export type WochenaufgabeAssignmentRow = {
  id: string;
  groupId: string;
  lessonPath: string;
  slot: number;
  studentId: string | null;
  student?: { id: string; name: string; avatarEmoji?: string | null } | null;
  updatedAt?: string;
};

export type WochenaufgabeSlotMap = Partial<Record<WochenaufgabeSlot, WochenaufgabeAssignmentRow>>;

export type WochenaufgabeStudentTask = {
  id: string;
  groupId: string;
  groupName: string;
  lessonPath: string;
  slot: number;
  updatedAt?: string;
};

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export async function fetchWochenaufgabeAssignments(
  groupId: string,
  parentPath: string,
): Promise<WochenaufgabeAssignmentRow[]> {
  const q = new URLSearchParams({ parentPath: normalizePath(parentPath) });
  const res = await fetch(`/api/wochenaufgaben/assignments/${encodeURIComponent(groupId)}?${q}`);
  if (!res.ok) throw new Error('Zuordnungen konnten nicht geladen werden');
  const data = await res.json();
  return Array.isArray(data.assignments) ? data.assignments : [];
}

export async function saveWochenaufgabeAssignment(
  groupId: string,
  lessonPath: string,
  slot: number,
  studentId: string | null,
): Promise<WochenaufgabeAssignmentRow> {
  const res = await fetch('/api/wochenaufgaben/assignments', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      lessonPath: normalizePath(lessonPath),
      slot,
      studentId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Zuordnung konnte nicht gespeichert werden');
  }
  return res.json();
}

export async function fetchStudentWochenaufgaben(studentId: string): Promise<WochenaufgabeStudentTask[]> {
  const res = await fetch(`/api/wochenaufgaben/student/${encodeURIComponent(studentId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.tasks) ? data.tasks : [];
}

export function assignmentsByLessonPath(rows: WochenaufgabeAssignmentRow[]): Record<string, WochenaufgabeSlotMap> {
  const map: Record<string, WochenaufgabeSlotMap> = {};
  for (const row of rows) {
    const path = normalizePath(row.lessonPath);
    if (!map[path]) map[path] = {};
    const slot = Math.min(4, Math.max(1, Number(row.slot) || 1)) as WochenaufgabeSlot;
    map[path][slot] = row;
  }
  return map;
}

export function studentSlotForLesson(
  slots: WochenaufgabeSlotMap | undefined,
  studentId: string | undefined,
): WochenaufgabeSlot | null {
  if (!slots || !studentId) return null;
  for (const slot of WOCHENAUFGABE_SLOTS) {
    if (slots[slot]?.studentId === studentId) return slot;
  }
  return null;
}
