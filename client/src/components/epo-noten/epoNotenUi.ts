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
  px: { xs: 0.35, sm: 0.75 },
};

export const epoNotenPageShellSx = {
  maxWidth: { xs: '100%', sm: 'min(100%, 2400px)' },
  mx: 'auto',
  width: '100%',
  px: { xs: 0.5, sm: 1 },
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
