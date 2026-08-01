/** HTML-Hilfen für formatierte Entry-Ticket-Karten (Frage/Lösung). */

export function entryTicketLooksLikeHtml(value: string): boolean {
  return /<(span|strong|b|u|i|em|br|div|p|font)\b/i.test((value || '').trim());
}

export function entryTicketPlainText(value: string): string {
  const raw = value || '';
  if (!entryTicketLooksLikeHtml(raw)) return raw.replace(/\u00a0/g, ' ').trim();
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function entryTicketHasText(value: string): boolean {
  return entryTicketPlainText(value).length > 0;
}

/** Erlaubt nur Basis-Formatierung (Fett/Kursiv/Unterstrichen/Farben/Absätze). */
export function sanitizeEntryTicketHtml(html: string): string {
  return (html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*contenteditable\s*=\s*["']?(?:true|false)["']?/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*data-[a-z-]+\s*=\s*["'][^"']*["']/gi, '');
}

/** Speichern: leeres Editor-HTML → '', reiner Text bleibt Text, sonst HTML. */
export function normalizeEntryTicketFieldValue(htmlOrText: string): string {
  const raw = (htmlOrText || '').trim();
  if (!entryTicketHasText(raw)) return '';
  if (!entryTicketLooksLikeHtml(raw)) return raw;
  const plain = entryTicketPlainText(raw);
  // Nur einfacher Absatz ohne Formatierung → als Plaintext speichern
  const stripped = raw
    .replace(/^<p>/i, '')
    .replace(/<\/p>$/i, '')
    .replace(/<br\s*\/?>/gi, '')
    .trim();
  if (stripped === plain || stripped === escapeXml(plain)) return plain;
  return sanitizeEntryTicketHtml(raw);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
