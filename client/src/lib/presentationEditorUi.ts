import { JOHNNY_PRESENTATION } from './presentationTheme';
import { lessonFolderDisplayName } from './presentationSlideFooter';
import { parseEntryTicketPlanBand, resolveEntryTicketBandForLessonPath } from './entryTicketGrade';
import { presentationEditorUrl, type PresentationPlanMode } from './presentationDeck';
import { isWochenaufgabenFolderPath } from './wochenaufgabenFolder';

/** Dezentes Johnny-UI für den Präsentations-Editor */
export const PRES_EDITOR_UI = {
  pageBg: '#f1f8e9',
  panelBg: '#ffffff',
  panelBorder: '#c8e6c9',
  canvasBg: '#f1f8e9',
  barBg: '#ffffff',
  barBorder: '#dcedc8',
  text: JOHNNY_PRESENTATION.textPrimary,
  textMuted: '#5f6368',
  accent: JOHNNY_PRESENTATION.primary,
  accentSoft: '#e8f5e9',
  accentHover: '#a5d6a7',
  filmstripThumbWidth: 148,
  toolbarIcon: {
    width: 24,
    height: 24,
    p: 0.25,
    borderRadius: '6px',
    color: '#5f6368',
    '&:hover': { bgcolor: '#fff', color: JOHNNY_PRESENTATION.primary },
  },
  toolbarChip: {
    height: 24,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'none' as const,
    borderRadius: '6px',
    px: 0.75,
    minWidth: 0,
    lineHeight: 1.2,
  },
  toolbarSection: {
    text: {
      border: '1px solid #64b5f6',
      bgcolor: 'rgba(100, 181, 246, 0.08)',
    },
    slide: {
      border: '1px solid #81c784',
      bgcolor: 'rgba(129, 199, 132, 0.1)',
    },
    anim: {
      border: '1px solid #ffb74d',
      bgcolor: 'rgba(255, 183, 77, 0.1)',
    },
  },
};

/** Deep-Link zurück zur Stunden-Ansicht (/teacher/stunde) — Wochenaufgaben → Dashboard. */
export function presentationLessonBackUrl(
  lessonPath: string,
  groupId?: string,
  planMode?: PresentationPlanMode
): string {
  if (!groupId || !lessonPath) return '/dashboard';
  // Wochenaufgaben werden vom Dashboard geöffnet, nicht als normale Stunde
  if (isWochenaufgabenFolderPath(lessonPath)) return '/dashboard';
  const qs = new URLSearchParams({
    groupId,
    lessonPath,
    lessonName: lessonFolderDisplayName(lessonPath) || 'Stunde',
  });
  if (planMode === 'create' || planMode === 'run' || planMode === 'background') {
    qs.set('planMode', planMode);
  }
  return `/teacher/stunde?${qs.toString()}`;
}

/**
 * Nach Entry Ticket: zurück zur Stunde, Laptop-Präsentation auf erster Folie.
 * `openPresentation=1` wird im TeacherDashboard ausgewertet.
 */
export function presentationLessonReturnWithPresentationUrl(
  lessonPath: string,
  groupId?: string,
): string {
  if (!groupId || !lessonPath) {
    return presentationLessonBackUrl(lessonPath, groupId, 'background');
  }
  const qs = new URLSearchParams({
    groupId,
    lessonPath,
    lessonName: lessonFolderDisplayName(lessonPath) || 'Stunde',
    planMode: 'background',
    openPresentation: '1',
  });
  return `/teacher/stunde?${qs.toString()}`;
}

/**
 * Entry-Ticket-Bearbeitung für diese Stunde (Fragenset-Editor, kein Autostart).
 * returnTo zeigt zurück in den Präsentations-Editor.
 */
export function presentationEntryTicketEditUrl(
  lessonPath: string,
  groupId?: string,
  planMode?: PresentationPlanMode,
  gradeFallback: string | number = 7,
): string {
  const qs = new URLSearchParams();
  const band = resolveEntryTicketBandForLessonPath(
    lessonPath,
    parseEntryTicketPlanBand(gradeFallback),
  );
  qs.set('grade', String(band));
  qs.set('edit', '1');
  qs.set('r', String(Date.now()));
  if (lessonPath) qs.set('lessonPath', lessonPath);
  if (groupId) qs.set('groupId', groupId);
  qs.set('returnTo', presentationEditorUrl(lessonPath, groupId, planMode || 'create'));
  return `/entry-ticket?${qs.toString()}`;
}

/** Platzhalter-Href auf der Startfolie — wird beim Klick zur Stunden-URL aufgelöst. */
export const ENTRY_TICKET_SLIDE_HREF = '/entry-ticket?jm=lesson-entry';

export function isLessonEntryTicketSlideHref(href: string | null | undefined): boolean {
  const raw = (href || '').trim();
  if (!raw) return false;
  if (/[?&]jm=lesson-entry(?:&|$)/i.test(raw)) return true;
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://local');
    return u.pathname === '/entry-ticket' && u.searchParams.get('jm') === 'lesson-entry';
  } catch {
    return false;
  }
}

/** Startet das Entry Ticket dieser Stunde (wie im Stundenplan), optional mit returnTo. */
export function buildLessonEntryTicketLaunchUrl(opts: {
  lessonPath: string;
  groupId?: string;
  gradeFallback?: string | number;
  autostart?: boolean;
  returnTo?: string;
}): string {
  const qs = new URLSearchParams();
  const band = resolveEntryTicketBandForLessonPath(
    opts.lessonPath,
    parseEntryTicketPlanBand(opts.gradeFallback ?? 7),
  );
  qs.set('grade', String(band));
  if (opts.autostart !== false) qs.set('autostart', '1');
  qs.set('r', String(Date.now()));
  if (opts.lessonPath) qs.set('lessonPath', opts.lessonPath);
  if (opts.groupId) qs.set('groupId', opts.groupId);
  if (opts.returnTo) qs.set('returnTo', opts.returnTo);
  return `/entry-ticket?${qs.toString()}`;
}

/**
 * Klick auf den Startfolien-E-Button abfangen und Entry Ticket der Stunde öffnen.
 * @returns true wenn der Klick verarbeitet wurde
 */
export function tryHandleLessonEntryTicketLinkClick(
  event: { target: EventTarget | null; preventDefault: () => void; stopPropagation: () => void },
  opts: {
    lessonPath: string;
    groupId?: string;
    gradeFallback?: string | number;
    returnTo?: string;
    /** false = nur öffnen, ohne Autostart (z. B. im Editor) */
    autostart?: boolean;
    /** true = im gleichen Tab (Play → Ticket → zurück in denselben Play-Modus) */
    sameTab?: boolean;
    /** Wird statt Navigation aufgerufen (Overlay im Play, Vollbild bleibt). */
    onOpen?: () => void;
  },
): boolean {
  if (!opts.lessonPath) return false;
  const node = event.target instanceof Element ? event.target : null;
  const anchor = node?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return false;
  const href = anchor.getAttribute('href') || '';
  const marked =
    anchor.getAttribute('data-pres-entry-ticket') === '1' || isLessonEntryTicketSlideHref(href);
  if (!marked) return false;
  event.preventDefault();
  event.stopPropagation();
  const native = 'nativeEvent' in event ? (event as { nativeEvent?: Event }).nativeEvent : undefined;
  native?.stopImmediatePropagation?.();
  if (opts.onOpen) {
    opts.onOpen();
    return true;
  }
  const returnTo =
    opts.returnTo ||
    (opts.groupId
      ? presentationLessonReturnWithPresentationUrl(opts.lessonPath, opts.groupId)
      : undefined);
  const url = buildLessonEntryTicketLaunchUrl({
    lessonPath: opts.lessonPath,
    groupId: opts.groupId,
    gradeFallback: opts.gradeFallback,
    autostart: opts.autostart !== false,
    returnTo,
  });
  if (opts.sameTab) {
    window.location.assign(url);
    return true;
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(url);
  }
  return true;
}

/** @deprecated use presentationLessonBackUrl */
export function presentationEditorBackTarget(groupId: string, lessonPath?: string): string {
  if (lessonPath && groupId) return presentationLessonBackUrl(lessonPath, groupId);
  if (groupId) return `/learning-group/${groupId}`;
  return '/dashboard';
}
