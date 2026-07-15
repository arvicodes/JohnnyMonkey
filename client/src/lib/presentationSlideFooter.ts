import type { PresentationDeck, PresentationSlideFooter } from './presentationDeck';

export const SLIDE_FOOTER_HEIGHT = 46;

const STRUCTURE_ROOT_SKIP = new Set(['J-M-Reihen', 'git-intern', 'server']);

export function lessonPathSegments(lessonPath?: string): string[] {
  if (!lessonPath?.trim()) return [];
  return lessonPath.replace(/\\/g, '/').replace(/\/$/, '').split('/').filter(Boolean);
}

/** Stundenordner-Name wie im Dashboard (letztes Pfadsegment, z. B. „01.01 KI sucht Mensch“). */
export function lessonFolderDisplayName(lessonPath?: string): string {
  const segments = lessonPathSegments(lessonPath);
  return (segments[segments.length - 1] || '').trim();
}

/** Direkter Oberordner mit Nummerierung (z. B. „01 Basiswissen“). */
export function lessonParentFolderDisplayName(lessonPath?: string): string {
  const segments = lessonPathSegments(lessonPath).filter((s) => !STRUCTURE_ROOT_SKIP.has(s));
  if (segments.length < 2) return '';
  return (segments[segments.length - 2] || '').trim();
}

function folderLabelKey(label: string): string {
  return label.toLowerCase().replace(/[\s._-]+/g, '');
}

function isSameFolderLabel(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  return folderLabelKey(a) === folderLabelKey(b);
}

/**
 * Links war früher oft Präsentationstitel oder Oberordner gespeichert — leeren, damit der
 * Stundenordner als Default gilt.
 */
export function sanitizeStoredFooter(
  footer: PresentationSlideFooter | undefined,
  lessonPath?: string,
  deckTitle?: string,
): PresentationSlideFooter {
  const next: PresentationSlideFooter = { ...(footer ?? {}) };
  const lessonLabel = lessonFolderDisplayName(lessonPath);
  const parentLabel = lessonParentFolderDisplayName(lessonPath);
  const title = next.title?.trim() ?? '';
  const right = next.right?.trim() ?? '';
  const deckTitleTrim = deckTitle?.trim() ?? '';

  if (
    title &&
    (isSameFolderLabel(title, deckTitleTrim) ||
      isSameFolderLabel(title, parentLabel) ||
      (lessonLabel && isSameFolderLabel(title, lessonLabel)))
  ) {
    next.title = '';
  }
  if (right && parentLabel && isSameFolderLabel(right, parentLabel)) {
    next.right = '';
  }
  return next;
}

/** @deprecated use lessonParentFolderDisplayName */
export function lessonFolderStructureLabel(lessonPath?: string): string {
  return lessonParentFolderDisplayName(lessonPath);
}

export function normalizeSlideFooter(
  footer?: PresentationSlideFooter,
  deckTitle?: string,
  lessonPath?: string,
): Required<PresentationSlideFooter> {
  const sanitized = sanitizeStoredFooter(footer, lessonPath, deckTitle);
  const lessonLabel = lessonFolderDisplayName(lessonPath);
  const parentLabel = lessonParentFolderDisplayName(lessonPath);
  return {
    title: sanitized.title?.trim() || lessonLabel || '',
    right: sanitized.right?.trim() || parentLabel || '',
  };
}

export function resolveDeckFooter(deck: PresentationDeck): Required<PresentationSlideFooter> {
  return normalizeSlideFooter(deck.slideFooter, deck.title, deck.lessonPath);
}

/** Anzeige-/Eingabewert links (gespeichert oder Stundenordner-Default). */
export function footerTitleForInput(
  footer?: PresentationSlideFooter,
  lessonPath?: string,
  deckTitle?: string,
): string {
  const sanitized = sanitizeStoredFooter(footer, lessonPath, deckTitle);
  const stored = sanitized.title?.trim();
  if (stored) return stored;
  return lessonFolderDisplayName(lessonPath) || '';
}

/** Anzeige-/Eingabewert rechts (gespeichert oder Oberordner-Default). */
export function footerRightForInput(
  footer?: PresentationSlideFooter,
  lessonPath?: string,
  deckTitle?: string,
): string {
  const sanitized = sanitizeStoredFooter(footer, lessonPath, deckTitle);
  const stored = sanitized.right?.trim();
  if (stored) return stored;
  return lessonParentFolderDisplayName(lessonPath) || '';
}
