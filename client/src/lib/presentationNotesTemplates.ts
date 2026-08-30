import { htmlToPlain } from './presentationDeck';

/** Aus Folie 5 Kap 1 (Schulstand 30.8.): Lernziele, Schwierigkeiten, Beispiellösung. */
export const NOTES_LESSON_TEMPLATE_LABEL = 'Stundennotizen';

export const NOTES_LESSON_TEMPLATE_HTML = [
  '<p><span style="font-weight: bold;"><span data-pres-highlight="#FFCC80" style="background-color: rgba(255, 204, 128, 0.62) !important;">Lernziele der Stunde</span></span></p>',
  '<p><br></p>',
  '<div><span style="font-style: italic;"><span data-pres-fs="12" style="font-size: 12px !important;"><span data-pres-highlight="#E0E0E0" style="background-color: rgba(224, 224, 224, 0.62) !important;">Schwierigkeiten:</span></span></span></div>',
  '<div><ul><li><span style="font-style: italic;"><span data-pres-fs="11" style="font-size: 11px !important;"><br></span></span></li></ul></div>',
  '<div><span data-pres-highlight="#C5E1A5" style="background-color: rgba(197, 225, 165, 0.62) !important; font-weight: bold;">Beispiellösung:</span></div>',
  '<p><br></p>',
].join('');

export function notesHtmlLooksEmpty(html: string | undefined | null): boolean {
  return !htmlToPlain(html || '').trim();
}
