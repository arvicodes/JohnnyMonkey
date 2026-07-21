import { JOHNNY_PRESENTATION } from './presentationTheme';
import { lessonFolderDisplayName } from './presentationSlideFooter';

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
  filmstripThumbWidth: 88,
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

/** Deep-Link zurück zur Stunden-Ansicht (/teacher/stunde). */
export function presentationLessonBackUrl(
  lessonPath: string,
  groupId?: string,
  planMode?: 'create' | 'run' | 'background'
): string {
  if (!groupId || !lessonPath) return '/dashboard';
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

/** @deprecated use presentationLessonBackUrl */
export function presentationEditorBackTarget(groupId: string, lessonPath?: string): string {
  if (lessonPath && groupId) return presentationLessonBackUrl(lessonPath, groupId);
  if (groupId) return `/learning-group/${groupId}`;
  return '/dashboard';
}
