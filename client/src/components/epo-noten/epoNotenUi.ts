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
  bgcolor: epoNotenPalette.background,
  py: { xs: 0.75, sm: 1.25 },
  px: 0,
};

export const epoNotenPageShellSx = {
  maxWidth: 'none',
  mx: 'auto',
  width: '100%',
  px: { xs: 0.25, sm: 0.75 },
};

/** Schüler: Liste + Wizard nutzen die volle nutzbare Breite (kein schmales Mittelband). */
export const epoNotenStudentSurfaceSx = {
  width: { xs: 'calc(100vw - 8px)', sm: '100%' },
  maxWidth: { xs: 'calc(100vw - 8px)', sm: 'min(100%, 1600px)' },
  ml: { xs: 'calc(4px - 50vw + 50%)', sm: 'auto' },
  mr: { xs: 'auto', sm: 'auto' },
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
  minWidth: 30,
  width: 30,
  height: 30,
  borderRadius: 1.25,
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

export const epoNotenCompactIconSx = { fontSize: 17 } as const;

/** Kompakte Text-Buttons — Icons nicht über dem Label */
export const epoNotenCompactBtnSx = {
  minHeight: 30,
  py: 0.35,
  px: 1.1,
  fontSize: '0.78rem',
  fontWeight: 700,
  lineHeight: 1.2,
  textTransform: 'none',
  borderRadius: 1.25,
  boxShadow: 'none',
  whiteSpace: 'nowrap',
  '&:hover': { boxShadow: 'none' },
  '& .MuiButton-startIcon': {
    marginRight: 0.4,
    marginLeft: 0,
    '& > *:nth-of-type(1)': { fontSize: 16 },
  },
} as const;

export const epoNotenPanelHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  flexWrap: 'wrap',
  px: 1.25,
  py: 0.85,
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
