import {
  isCustomEntryTicketSetId,
  loadCustomEntryTicketSets,
  type EntryTicketCustomSetId,
} from './entryTicketCustomSets';

/** Klassenstufen für EntryTicket-Fragensets (mathematische Minikarten). */
export type EntryTicketGradeBand = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/**
 * Wie in EntryTicketPage: Klassenstufen + Inf-Kursbänder + eigene Fragensätze (`c_…`).
 * URL-Parameter: grade=7|inf11|… bzw. grade=c_….
 */
export type EntryTicketPlanBand = EntryTicketGradeBand | 'inf11' | 'inf12' | 'inf13' | EntryTicketCustomSetId;

export function parseEntryTicketPlanBand(value: unknown): EntryTicketPlanBand {
  if (isCustomEntryTicketSetId(value)) return value;
  if (value === 'inf11' || value === 'inf12' || value === 'inf13') return value;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n >= 5 && n <= 13) return n as EntryTicketGradeBand;
  return 7;
}

export function formatEntryTicketPlanBandLabel(
  band: EntryTicketPlanBand | undefined | null,
  customNameById?: Record<string, string>,
): string {
  if (band === undefined || band === null) return 'Klasse 7';
  if (band === 'inf11') return 'Inf 11';
  if (band === 'inf12') return 'Inf 12';
  if (band === 'inf13') return 'Inf 13';
  if (isCustomEntryTicketSetId(band)) {
    return customNameById?.[band] ?? 'Eigenes Fragenset';
  }
  return `Klasse ${band}`;
}

export const ENTRY_TICKET_PLAN_GRADE_OPTIONS: { value: string; label: string }[] = [
  ...([5, 6, 7, 8, 9, 10, 11, 12, 13] as const).map((n) => ({ value: String(n), label: `Klasse ${n}` })),
  { value: 'inf11', label: 'Inf 11' },
  { value: 'inf12', label: 'Inf 12' },
  { value: 'inf13', label: 'Inf 13' },
];

/** Eigene Fragensätze oben, dann feste Bänder (für Stundenplan-Select). */
export function getEntryTicketPlanGradeOptions(): { value: string; label: string }[] {
  const custom = loadCustomEntryTicketSets().map((s) => ({
    value: s.id,
    label: `${s.name} (${s.lessons.length} Std.)`,
  }));
  return [...custom, ...ENTRY_TICKET_PLAN_GRADE_OPTIONS];
}

/**
 * Klassenstufe 5–13 aus Gruppennamen ableiten (z. B. "7a", "Klasse 10", "MS2 9b").
 * Erste passende Zahl in der Reihenfolge der übergebenen Namen. Sonst 7.
 */
export function gradeFromGroupNames(names: string[]): EntryTicketGradeBand {
  for (const name of names) {
    const matches = name.match(/\d+/g);
    if (!matches) continue;
    for (const raw of matches) {
      const n = parseInt(raw, 10);
      if (n >= 5 && n <= 13) return n as EntryTicketGradeBand;
    }
  }
  return 7;
}
