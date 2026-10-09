export type ExamCorrectionListStatus = 'vorbereitung' | 'aktiv' | 'zur-korrektur' | 'fertig';

export type ExamSessionMeta = {
  everStarted: boolean;
  hasEndedSession: boolean;
};

export const EXAM_STATUS_LABEL: Record<ExamCorrectionListStatus, string> = {
  vorbereitung: 'In Vorbereitung',
  aktiv: 'Aktiv',
  'zur-korrektur': 'Zur Korrektur frei',
  fertig: 'Fertig',
};

export const EXAM_STATUS_COLOR: Record<ExamCorrectionListStatus, string> = {
  vorbereitung: '#546e7a',
  aktiv: '#c62828',
  'zur-korrektur': '#7b1fa2',
  fertig: '#43a047',
};

export function deriveExamCorrectionListStatus(
  finished: boolean,
  isRunning: boolean,
  session: ExamSessionMeta | undefined,
): ExamCorrectionListStatus {
  if (finished) return 'fertig';
  if (isRunning) return 'aktiv';
  if (session?.hasEndedSession || (session?.everStarted && !isRunning)) return 'zur-korrektur';
  return 'vorbereitung';
}
