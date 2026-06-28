/** Farbpalette für Ankündigungen / Vordrucke */
export const announcementPalette = {
  primary: '#00838f',
  secondary: '#006064',
  accent: '#26c6da',
  background: '#f0f7f8',
  cardBg: '#FFFFFF',
  heading: '#004d40',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#e0e0e0',
  successBg: 'rgba(0, 131, 143, 0.12)',
} as const;

export const compactIconBtnSx = {
  p: 0,
  minWidth: 32,
  width: 32,
  height: 32,
  borderRadius: 1.5,
  transition: 'all 0.2s ease',
} as const;

export const compactIconSx = { fontSize: 20 } as const;

/** Kleiner Icon-Button — Icon füllt den Klickbereich (wie Dashboard / Vergrößern). */
export const overlayIconBtnSx = {
  p: 0,
  minWidth: 28,
  width: 28,
  height: 28,
  borderRadius: 1.25,
  transition: 'all 0.2s ease',
} as const;

export const overlayIconSx = { fontSize: 20, width: '100%', height: '100%' } as const;

export const pageShellSx = {
  width: '100%',
  maxWidth: 900,
  mx: 'auto',
  minWidth: 0,
  boxSizing: 'border-box',
  overflowX: 'hidden',
  px: { xs: 1.5, sm: 2.5 },
} as const;

export const studentPageShellSx = {
  ...pageShellSx,
  maxWidth: { xs: '100%', lg: 1360 },
  px: { xs: 1.25, sm: 2, md: 3 },
} as const;

export const announcementPageBgSx = {
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100vw',
  overflowX: 'hidden',
  bgcolor: announcementPalette.background,
  py: { xs: 2, sm: 3 },
} as const;

export const announcementCardSx = {
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
  bgcolor: announcementPalette.cardBg,
  boxShadow: '0 6px 20px rgba(0,0,0,0.07)',
} as const;

export const announcementEditorCardSx = {
  ...announcementCardSx,
  borderColor: 'rgba(0, 131, 143, 0.22)',
  boxShadow: '0 6px 20px rgba(0, 131, 143, 0.08)',
};

export const announcementFieldSx = {
  '& .MuiInputBase-root': {
    fontSize: '0.875rem',
    borderRadius: 1.5,
    bgcolor: '#fff',
  },
  '& .MuiInputLabel-root': { fontSize: '0.8rem', color: announcementPalette.textSecondary },
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: announcementPalette.border },
    '&:hover fieldset': { borderColor: announcementPalette.primary },
    '&.Mui-focused fieldset': { borderColor: announcementPalette.primary, borderWidth: 1.5 },
  },
};

export const announcementListItemSx = (selected: boolean) => ({
  p: 1,
  borderRadius: 2,
  border: '1px solid',
  borderColor: selected ? announcementPalette.primary : 'divider',
  background: selected ? announcementPalette.successBg : 'white',
  cursor: 'pointer',
  transition: 'all 0.18s ease',
  boxShadow: selected ? '0 3px 12px rgba(0, 131, 143, 0.15)' : 'none',
  '&:hover': {
    borderColor: announcementPalette.primary,
    bgcolor: announcementPalette.successBg,
    transform: 'translateY(-1px)',
  },
});

const blockBtnBase = {
  textTransform: 'none' as const,
  fontWeight: 700,
  fontSize: '0.72rem',
  lineHeight: 1.2,
  minHeight: 30,
  py: 0.4,
  px: 0.5,
  borderRadius: 1.75,
  whiteSpace: 'nowrap' as const,
  transition: 'all 0.18s ease',
};

export const announcementBtnDraftSx = {
  ...blockBtnBase,
  bgcolor: '#fff',
  color: announcementPalette.textPrimary,
  border: `1px solid ${announcementPalette.border}`,
  '&:hover': { bgcolor: '#f8fafc', borderColor: announcementPalette.primary },
};

export const announcementBtnPublishSx = {
  ...blockBtnBase,
  background: 'linear-gradient(135deg, #00acc1 0%, #00838f 100%)',
  color: '#fff',
  border: '1px solid #006064',
  boxShadow: '0 3px 10px rgba(0, 131, 143, 0.28)',
  '&:hover': {
    background: 'linear-gradient(135deg, #26c6da 0%, #00838f 100%)',
    transform: 'translateY(-1px)',
  },
};

export const announcementBtnDangerSx = {
  ...blockBtnBase,
  bgcolor: '#fff5f5',
  color: '#c62828',
  border: '1px solid #ef9a9a',
  '&:hover': { bgcolor: '#ffebee', borderColor: '#e57373' },
};

export const announcementStatusChipSx = (live: boolean) => ({
  height: 20,
  fontWeight: 700,
  fontSize: '0.65rem',
  bgcolor: live ? announcementPalette.successBg : 'rgba(0,0,0,0.06)',
  color: live ? announcementPalette.primary : announcementPalette.textSecondary,
  border: '1px solid',
  borderColor: live ? 'rgba(0,131,143,0.35)' : 'rgba(0,0,0,0.08)',
});

export const announcementActionBarSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 0.5,
  width: '100%',
  maxWidth: 360,
};

export const announcementTileGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
  gap: 1.25,
};

export const announcementTileSx = (selected: boolean, isNew = false) => ({
  minHeight: 132,
  p: 1.25,
  borderRadius: 2,
  border: '2px solid',
  borderColor: isNew
    ? 'rgba(0, 131, 143, 0.35)'
    : selected
      ? announcementPalette.primary
      : 'divider',
  borderStyle: isNew ? 'dashed' : 'solid',
  bgcolor: isNew ? 'rgba(0, 131, 143, 0.04)' : selected ? announcementPalette.successBg : '#fff',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'space-between',
  gap: 0.75,
  transition: 'all 0.18s ease',
  boxShadow: selected && !isNew ? '0 4px 14px rgba(0, 131, 143, 0.18)' : 'none',
  '&:hover': {
    borderColor: announcementPalette.primary,
    bgcolor: announcementPalette.successBg,
    transform: 'translateY(-2px)',
  },
});
