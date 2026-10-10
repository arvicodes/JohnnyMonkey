type SavedCorrection = {
  taskNumber: string;
  manualPoints?: number;
  comment?: string;
};

type CorrectionRow = {
  points?: number;
  comment?: string;
  constructionPoints?: number;
};

/** Stabiler Refresh-Key nur für Felder dieser Abgabe (nicht gesamter corrections-State). */
export function submissionCorrectionSignature(
  submissionId: string,
  savedCorrections: SavedCorrection[] | undefined,
  corrections: Record<string, CorrectionRow>,
  fieldIds?: string[],
): string {
  const idSet = new Set<string>();
  fieldIds?.forEach((id) => idSet.add(id));
  savedCorrections?.forEach((c) => idSet.add(c.taskNumber));
  if (!idSet.size && fieldIds?.length) {
    fieldIds.forEach((id) => idSet.add(id));
  }
  const ids = [...idSet].sort();
  return ids
    .map((taskId) => {
      const key = `${submissionId}_${taskId}`;
      const c = corrections[key];
      const saved = savedCorrections?.find((sc) => sc.taskNumber === taskId);
      const pts = c?.points ?? c?.constructionPoints ?? saved?.manualPoints;
      const com = c?.comment ?? saved?.comment ?? '';
      return `${taskId}=${pts ?? ''}:${com}`;
    })
    .join(';');
}
