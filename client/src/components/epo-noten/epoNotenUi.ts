/** EPO-Noten UI — angelehnt an StudentDashboard / Protokoll-Farben */

export const epoNotenPalette = {
  primary: '#1976D2',
  primaryTint: 'rgba(25, 118, 210, 0.12)',
  accent: '#2E7D32',
  accentTint: 'rgba(46, 125, 50, 0.14)',
  /** Fertig / erledigt — heller Hintergrund, kräftiger grüner Akzent */
  fertigBg: '#E8F5E9',
  fertigBgSelected: '#C8E6C9',
  fertigBorder: '#66BB6A',
  fertigAccent: '#43A047',
  fertigChipBg: '#43A047',
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
  minHeight: 'calc(100vh - 1%)',
  height: 'calc(100vh - 1%)',
  width: 'calc(100% - 4%)',
  margin: '1% 2% 0 2%',
  bgcolor: epoNotenPalette.background,
  py: { xs: 0.5, sm: 0.65 },
  px: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

/** Lehrer + SuS: volle nutzbare Seitenbreite */
export const EPO_NOTEN_CONTENT_WIDTH = '100%';

export const epoNotenContentShellSx = {
  width: EPO_NOTEN_CONTENT_WIDTH,
  maxWidth: EPO_NOTEN_CONTENT_WIDTH,
  minWidth: 0,
  mx: 0,
  boxSizing: 'border-box' as const,
};

/** Seitenrahmen (Kopfzeile + Inhalt) */
export const epoNotenPageShellSx = {
  ...epoNotenContentShellSx,
  alignSelf: 'stretch',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

/** @deprecated Alias — bitte epoNotenPageShellSx verwenden */
export const epoNotenTeacherShellSx = epoNotenPageShellSx;

/** Karten/Listen innerhalb der Seitenbreite */
export const epoNotenStudentSurfaceSx = {
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box' as const,
};

export const epoNotenCardSx = {
  borderRadius: 2,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  border: `1px solid ${epoNotenPalette.border}`,
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

/** Lehrer-SuS-Liste: kleinere Status-Icons */
export const epoNotenTeacherListStatusChipSx = {
  height: 20,
  width: 20,
  minWidth: 20,
  maxWidth: 20,
} as const;

export const epoNotenTeacherListStatusIconSx = { fontSize: 11 } as const;

/** Runde Status-Chips (Icon-only, Kreis) */
export const epoNotenRoundIconChipSx = {
  height: 26,
  width: 26,
  minWidth: 26,
  maxWidth: 26,
  borderRadius: '50%',
  flexShrink: 0,
  p: 0,
  '& .MuiChip-label': { display: 'none', width: 0, p: 0 },
  '& .MuiChip-icon': {
    margin: 0,
    marginLeft: 0,
    marginRight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const;

/** SuS-Aktion offen: „Bitte ausfüllen“ (Liste + Chips) */
export const epoNotenBitteAusfuellenChipSx = {
  fontWeight: 800,
  fontSize: '0.62rem',
  animation: 'epoBitteAusfuellenPulse 1.2s ease-in-out infinite',
  '@keyframes epoBitteAusfuellenPulse': {
    '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 124, 0, 0.45)' },
    '50%': { boxShadow: '0 0 0 7px rgba(245, 124, 0, 0)' },
  },
} as const;

export const epoNotenBitteAusfuellenRowSx = {
  bgcolor: 'rgba(245, 124, 0, 0.09)',
  borderLeft: '3px solid',
  borderLeftColor: epoNotenPalette.warn,
} as const;

/** SuS erledigt / Kurs „fertig“ — gut sichtbares helles Grün */
export const epoNotenFertigRowSx = {
  bgcolor: epoNotenPalette.fertigBg,
  borderLeft: '3px solid',
  borderLeftColor: epoNotenPalette.fertigAccent,
} as const;

export const epoNotenFertigChipSx = {
  bgcolor: epoNotenPalette.fertigChipBg,
  color: '#fff',
  border: '2px solid',
  borderColor: epoNotenPalette.fertigBorder,
  '& .MuiChip-icon': { color: '#fff !important' },
} as const;

export const epoNotenBitteAusfuellenAlertSx = {
  py: 0.65,
  fontWeight: 700,
  border: '2px solid',
  borderColor: 'warning.main',
  bgcolor: 'rgba(245, 124, 0, 0.12)',
  '& .MuiAlert-icon': { fontSize: '1.25rem' },
} as const;

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

/** SuS: Ziele — gut lesbar, mittlere Größe */
export const epoNotenStudentGoalFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.75,
    bgcolor: '#fff',
    fontSize: { xs: '1.02rem', sm: '1.08rem' },
    fontWeight: 500,
    lineHeight: 1.5,
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.88rem',
    fontWeight: 600,
  },
};

export const epoNotenStudentGoalDisplaySx = {
  p: 1.1,
  borderRadius: 1.75,
  bgcolor: '#f8fafc',
  border: `1px solid ${epoNotenPalette.border}`,
  fontSize: { xs: '1rem', sm: '1.06rem' },
  fontWeight: 600,
  lineHeight: 1.5,
  color: epoNotenPalette.textPrimary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};
