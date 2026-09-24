/** EPO-Noten UI — angelehnt an StudentDashboard / Protokoll-Farben */

export const epoNotenPalette = {
  primary: '#1976D2',
  primaryTint: 'rgba(25, 118, 210, 0.12)',
  accent: '#2E7D32',
  accentTint: 'rgba(46, 125, 50, 0.14)',
  warn: '#F57C00',
  heading: '#1a237e',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  background: '#f4f6fb',
  cardBg: '#FFFFFF',
  border: '#e0e0e0',
  sand: '#eef2f7',
};

export const epoNotenPageBgSx = {
  minHeight: '100vh',
  width: '100%',
  bgcolor: epoNotenPalette.background,
  py: { xs: 0.75, sm: 1.25 },
  px: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

/** Lehrer + SuS: einheitlich 80 % der Bildschirmbreite, zentriert */
export const EPO_NOTEN_CONTENT_WIDTH = '80vw';

export const epoNotenContentShellSx = {
  width: EPO_NOTEN_CONTENT_WIDTH,
  maxWidth: EPO_NOTEN_CONTENT_WIDTH,
  minWidth: 0,
  mx: 'auto',
  boxSizing: 'border-box' as const,
};

/** Seitenrahmen (Kopfzeile + Inhalt) */
export const epoNotenPageShellSx = {
  ...epoNotenContentShellSx,
  alignSelf: 'center',
};

/** @deprecated Alias — bitte epoNotenPageShellSx verwenden */
export const epoNotenTeacherShellSx = epoNotenPageShellSx;

/** Karten/Listen innerhalb der 80 %-Spalte */
export const epoNotenStudentSurfaceSx = {
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box' as const,
};

export const epoNotenCardSx = {
  borderRadius: 3,
  boxShadow: '0 4px 20px rgba(25, 55, 109, 0.09)',
  border: `2px solid ${epoNotenPalette.border}`,
  bgcolor: epoNotenPalette.cardBg,
  overflow: 'hidden',
};

/** Große, kindgerechte Eingabefelder */
export const epoNotenKidTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: '#fafcff',
    fontSize: '1.12rem',
    py: 0.35,
    '& fieldset': {
      borderWidth: 2,
      borderColor: 'rgba(25, 118, 210, 0.35)',
    },
    '&:hover fieldset': {
      borderColor: epoNotenPalette.primary,
    },
    '&.Mui-focused fieldset': {
      borderWidth: 2.5,
      borderColor: epoNotenPalette.primary,
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: epoNotenPalette.textSecondary,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: epoNotenPalette.primary,
  },
};

export const epoNotenSectionTitleSx = {
  fontWeight: 800,
  fontSize: '1.15rem',
  color: epoNotenPalette.heading,
};

export const epoNotenBigNumberSx = {
  fontWeight: 900,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
  color: epoNotenPalette.primary,
};

export const epoNotenCompactIconBtnSx = {
  p: 0,
  minWidth: 24,
  width: 24,
  height: 24,
  borderRadius: 1,
  border: '1px solid',
  borderColor: epoNotenPalette.border,
  bgcolor: '#fff',
  color: epoNotenPalette.primary,
  transition: 'all 0.15s ease',
  '&:hover': {
    bgcolor: epoNotenPalette.primaryTint,
    borderColor: epoNotenPalette.primary,
  },
} as const;

export const epoNotenCompactIconSx = { fontSize: 14 } as const;

/** Kompakte Text-Buttons — Icons nicht über dem Label */
export const epoNotenCompactBtnSx = {
  minHeight: 22,
  py: 0.1,
  px: 0.55,
  fontSize: '0.64rem',
  fontWeight: 700,
  lineHeight: 1.1,
  textTransform: 'none',
  borderRadius: 0.85,
  boxShadow: 'none',
  whiteSpace: 'nowrap',
  '&:hover': { boxShadow: 'none' },
  '& .MuiButton-startIcon': {
    marginRight: 0.2,
    marginLeft: 0,
    '& > *:nth-of-type(1)': { fontSize: 13 },
  },
} as const;

export const epoNotenStudentGhostPanelSx = {
  borderRadius: 1.25,
  border: '1px solid rgba(156, 39, 176, 0.22)',
  bgcolor: 'rgba(250, 245, 255, 0.38)',
  color: 'rgba(106, 27, 154, 0.82)',
  p: 0.75,
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
};

export const epoNotenPanelHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  flexWrap: 'wrap',
  px: 0.85,
  py: 0.45,
  bgcolor: epoNotenPalette.primaryTint,
  borderBottom: `1px solid ${epoNotenPalette.border}`,
};

export const epoNotenInsetBoxSx = {
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fafcff',
  p: 1,
};

/** SuS: Ziele — gut lesbar, nicht überdimensioniert */
export const epoNotenStudentGoalFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.5,
    bgcolor: '#fff',
    fontSize: { xs: '0.92rem', sm: '0.98rem' },
    fontWeight: 500,
    lineHeight: 1.45,
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.82rem',
    fontWeight: 600,
  },
};

export const epoNotenStudentGoalDisplaySx = {
  p: 0.85,
  borderRadius: 1.5,
  bgcolor: '#f8fafc',
  border: `1px solid ${epoNotenPalette.border}`,
  fontSize: { xs: '0.9rem', sm: '0.95rem' },
  fontWeight: 600,
  lineHeight: 1.45,
  color: epoNotenPalette.textPrimary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};
