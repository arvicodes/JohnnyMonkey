export type ExamCorrectionListStatus =
  | 'vorbereitung'
  | 'entwurf'
  | 'aktiv'
  | 'zur-korrektur'
  | 'fertig';

export type ExamSessionMeta = {
  everStarted: boolean;
  hasEndedSession: boolean;
};

export const EXAM_STATUS_LABEL: Record<ExamCorrectionListStatus, string> = {
  vorbereitung: 'In Vorbereitung',
  entwurf: 'Entwurf',
  aktiv: 'Aktiv',
  'zur-korrektur': 'Zur Korrektur frei',
  fertig: 'Fertig',
};

export const EXAM_STATUS_COLOR: Record<ExamCorrectionListStatus, string> = {
  vorbereitung: '#546e7a',
  entwurf: '#757575',
  aktiv: '#c62828',
  'zur-korrektur': '#7b1fa2',
  fertig: '#43a047',
};

export function deriveExamCorrectionListStatus(
  finished: boolean,
  draft: boolean,
  isRunning: boolean,
  session: ExamSessionMeta | undefined,
): ExamCorrectionListStatus {
  if (finished) return 'fertig';
  if (isRunning) return 'aktiv';
  if (session?.hasEndedSession || (session?.everStarted && !isRunning)) return 'zur-korrektur';
  if (draft) return 'entwurf';
  return 'vorbereitung';
}
