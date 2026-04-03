/** Klassenstufen für EntryTicket-Fragensets (mathematische Minikarten). */
export type EntryTicketGradeBand = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

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
