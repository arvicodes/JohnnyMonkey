/** Lehrer-Erinnerungen in der EPO-Noten-Ansicht (lokal im Browser). */

export const EPO_ROUND2_REMINDER = {
  id: 'epo-round-2-2026',
  /** Erst ab diesem Kalendertag (lokal) anzeigen */
  startDate: '2026-12-10',
  title: '2. EPO-Runde starten',
  body:
    'Ab heute: neue EPO-Runde anlegen (z. B. „EPO 2“), Kurse zuordnen und freischalten — damit die SuS rechtzeitig starten können.',
};

const DISMISS_PREFIX = 'epoNotenReminderDismiss:';

export function epoReminderDismissStorageKey(reminderId: string): string {
  return `${DISMISS_PREFIX}${reminderId}`;
}

function localDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function roundLooksLikeEpo2(title: string): boolean {
  const t = title.trim();
  return /(?:^|\b)epo\s*2\b/i.test(t) || /2\.\s*epo/i.test(t) || /\bepo\s*ii\b/i.test(t);
}

export function shouldShowEpoRound2Reminder(
  rounds: { title: string }[],
  dismissed: boolean,
  now: Date = new Date(),
): boolean {
  if (dismissed) return false;
  if (localDateYmd(now) < EPO_ROUND2_REMINDER.startDate) return false;
  if (rounds.some((r) => roundLooksLikeEpo2(r.title))) return false;
  return true;
}
