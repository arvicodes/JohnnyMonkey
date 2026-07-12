import { JOHNNY_PRESENTATION } from './presentationTheme';

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

export function presentationEditorBackTarget(groupId: string): string {
  if (groupId) return `/learning-group/${groupId}`;
  return '/teacher/stunde';
}
