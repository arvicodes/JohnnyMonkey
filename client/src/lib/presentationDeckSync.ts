import { lessonFolderPath } from './presentationDeck';

export const PRESENTATION_DECK_SYNC_KEY = 'jm.presentation.deckSaved.v1';

export function notifyPresentationDeckSaved(lessonPath: string, updatedAt: string) {
  if (!lessonPath) return;
  try {
    localStorage.setItem(
      PRESENTATION_DECK_SYNC_KEY,
      JSON.stringify({
        lessonPath: lessonFolderPath(lessonPath),
        updatedAt: updatedAt || '',
        t: Date.now(),
      }),
    );
  } catch {
    /* private mode */
  }
}

export function parsePresentationDeckSavedEvent(
  e: StorageEvent,
): { lessonPath: string; updatedAt: string } | null {
  if (e.key !== PRESENTATION_DECK_SYNC_KEY || !e.newValue) return null;
  try {
    const o = JSON.parse(e.newValue) as { lessonPath?: string; updatedAt?: string };
    if (!o?.lessonPath) return null;
    return {
      lessonPath: lessonFolderPath(o.lessonPath),
      updatedAt: String(o.updatedAt || ''),
    };
  } catch {
    return null;
  }
}

export function samePresentationLesson(a: string, b: string): boolean {
  return lessonFolderPath(a || '') === lessonFolderPath(b || '');
}
