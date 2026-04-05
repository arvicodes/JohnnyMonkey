/** Anzahl Motive unter public/entry-ticket/entry-01.jpg … entry-10.jpg (helle, freundliche Natur) */
export const ENTRY_TICKET_HERO_COUNT = 10;

/**
 * Motivpfad (Index 0..9). Server speichert den Index beim Entry-Signal;
 * Exit-Ticket zeigt denselben Index (GET /api/exit-ticket/current → heroImageIndex).
 */
export function entryTicketHeroSrc(index: number): string {
  const i = Math.min(ENTRY_TICKET_HERO_COUNT - 1, Math.max(0, Math.floor(index)));
  return `/entry-ticket/entry-${String(i + 1).padStart(2, '0')}.jpg`;
}

/** Fallback, wenn kein heroImageSrc übergeben wird */
export const TICKET_HERO_IMAGE_SRC = entryTicketHeroSrc(0);
