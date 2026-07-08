export type PeriodTime = {
  period: number;
  start: string;
  end: string;
};

export const DEFAULT_JOHNNY_PERIOD_TIMES: PeriodTime[] = [
  { period: 1, start: '08:00', end: '08:45' },
  { period: 2, start: '08:45', end: '09:35' },
  { period: 3, start: '09:40', end: '10:25' },
  { period: 4, start: '10:45', end: '11:30' },
  { period: 5, start: '11:35', end: '12:15' },
  { period: 6, start: '12:15', end: '13:00' },
  { period: 7, start: '13:00', end: '13:45' },
  { period: 8, start: '13:45', end: '14:30' },
  { period: 9, start: '14:30', end: '15:15' },
  { period: 10, start: '15:15', end: '16:00' },
];

export const DAY_LABELS: Record<number, string> = {
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
};

export const DAY_LABELS_FULL: Record<number, string> = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
};

export function parsePeriodTimes(json: string | null | undefined): PeriodTime[] {
  if (!json || json.trim() === '' || json.trim() === '[]') {
    return DEFAULT_JOHNNY_PERIOD_TIMES;
  }
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_JOHNNY_PERIOD_TIMES;
    }
    return parsed
      .map((p: { period?: number; start?: string; end?: string }) => ({
        period: Number(p.period),
        start: String(p.start || '').trim(),
        end: String(p.end || '').trim(),
      }))
      .filter((p) => p.period >= 1 && p.start && p.end)
      .sort((a, b) => a.period - b.period);
  } catch {
    return DEFAULT_JOHNNY_PERIOD_TIMES;
  }
}
