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
  maxWidth: '100%',
  mx: 'auto',
  minWidth: 0,
  boxSizing: 'border-box',
  overflowX: 'hidden',
  px: { xs: 1, sm: 1.5, md: 2 },
} as const;

export const teacherPageShellSx = {
  ...pageShellSx,
  px: { xs: 1, sm: 1.25, md: 1.5, lg: 2 },
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
  overflow: 'visible',
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

/** Speichern · Veröffentlichen · Löschen — rechtsbündig oben */
export const announcementEditorActionRowRightSx = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'flex-end',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 0.5,
  width: '100%',
} as const;

export const announcementEditorTopActionsSx = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'flex-end',
  flexShrink: 0,
  width: { xs: '100%', lg: 'auto' },
} as const;

/** Speichern · Veröffentlichen · Löschen — eckig, passend zum Editor */
export const announcementEditorActionRowSx = {
  display: 'grid',
  gridTemplateColumns: '1fr 1.65fr 1fr',
  gap: 0.5,
  width: '100%',
} as const;

export const announcementEditorActionBtnSx = {
  ...blockBtnBase,
  borderRadius: 1.5,
  minHeight: 30,
  minWidth: 0,
  fontSize: '0.72rem',
  px: 0.85,
  boxShadow: 'none',
  transform: 'none',
  '&:hover': { transform: 'none' },
} as const;

export const announcementEditorActionBtnCompactSx = {
  ...announcementEditorActionBtnSx,
  flexShrink: 0,
} as const;

/** Farben pro Bereich — Verein (türkis) · Schule (blau) */
export const announcementTypeRealmThemes = {
  verein: {
    headBg: '#e0f2f1',
    headColor: '#00695c',
    headBorder: '#4db6ac',
    kindBg: '#f4fbfb',
    kindColor: '#004d40',
    kindBorder: '#b2dfdb',
    activeHeadBg: '#b2dfdb',
    activeKindBg: 'rgba(0,131,143,0.16)',
    activeColor: '#006064',
    activeBorder: '#00838f',
  },
  schule: {
    headBg: '#e8f0fe',
    headColor: '#1a4a8a',
    headBorder: '#7baaf7',
    kindBg: '#f6f9fe',
    kindColor: '#1e3a5f',
    kindBorder: '#c5d9f7',
    activeHeadBg: '#c5d9f7',
    activeKindBg: 'rgba(25,118,210,0.14)',
    activeColor: '#1565c0',
    activeBorder: '#1976d2',
  },
} as const;

/** Verein/Schule + 3 Untertypen — Basis-Layout */
export const announcementTypeRowButtonGroupSx = {
  flexShrink: 1,
  minWidth: 0,
  width: '72%',
  boxShadow: 'none',
  display: 'flex',
  '& .MuiButton-root': {
    ...blockBtnBase,
    minHeight: 26,
    py: 0.2,
    px: 0.25,
    fontSize: '0.62rem',
    lineHeight: 1.2,
    borderRadius: '0 !important',
    transform: 'none',
    boxShadow: 'none',
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
  '& .MuiButtonGroup-firstButton': {
    borderTopLeftRadius: '5px !important',
    borderBottomLeftRadius: '5px !important',
    flex: '0 0 32px',
    width: 32,
    minWidth: 32,
    maxWidth: 32,
    px: '0.15rem !important',
  },
  '& .MuiButton-root:not(:first-of-type)': {
    flex: '1 1 0',
    minWidth: 0,
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
    hyphens: 'auto',
    textAlign: 'center',
    px: '0.2rem !important',
    py: '0.15rem !important',
    fontSize: '0.6rem !important',
    lineHeight: 1.15,
  },
  '& .MuiButtonGroup-lastButton': {
    borderTopRightRadius: '5px !important',
    borderBottomRightRadius: '5px !important',
  },
} as const;

export function announcementTypeRowGroupSx(
  realm: keyof typeof announcementTypeRealmThemes,
  realmActive: boolean,
) {
  const t = announcementTypeRealmThemes[realm];
  const head = announcementTypeRowButtonGroupSx['& .MuiButtonGroup-firstButton'];
  const kind = announcementTypeRowButtonGroupSx['& .MuiButton-root:not(:first-of-type)'];
  return {
    ...announcementTypeRowButtonGroupSx,
    opacity: realmActive ? 1 : 0.68,
    filter: realmActive ? 'none' : 'grayscale(0.12)',
    transition: 'opacity 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
    borderRadius: '6px',
    boxShadow: realmActive ? `0 0 0 1px ${t.activeBorder}` : 'none',
    '& .MuiButtonGroup-firstButton': {
      ...head,
      bgcolor: `${realmActive ? t.activeHeadBg : t.headBg} !important`,
      color: `${realmActive ? t.activeColor : t.headColor} !important`,
      borderColor: `${realmActive ? t.activeBorder : t.headBorder} !important`,
    },
    '& .MuiButton-root:not(:first-of-type)': {
      ...kind,
      bgcolor: `${t.kindBg} !important`,
      color: `${t.kindColor} !important`,
      borderColor: `${t.kindBorder} !important`,
      '&:hover': {
        bgcolor: `${realmActive ? t.activeKindBg : t.kindBg} !important`,
        borderColor: `${t.activeBorder} !important`,
        color: `${t.activeColor} !important`,
      },
    },
  };
}

export function announcementTypeKindActiveSx(realm: keyof typeof announcementTypeRealmThemes) {
  const t = announcementTypeRealmThemes[realm];
  return {
    bgcolor: `${t.activeKindBg} !important`,
    borderColor: `${t.activeBorder} !important`,
    color: `${t.activeColor} !important`,
    fontWeight: '700 !important',
    boxShadow: `inset 0 0 0 1px ${t.activeBorder} !important`,
  };
}

export const announcementTypePickerGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1.08fr)' },
  gap: 0.4,
  width: '100%',
  minWidth: 0,
  alignItems: 'stretch',
} as const;

/** Speichern · Veröffentlichen · Löschen als kompakte Dreier-Gruppe */
export const announcementActionButtonGroupSx = {
  flexShrink: 0,
  boxShadow: 'none',
  '& .MuiButton-root': {
    ...blockBtnBase,
    minHeight: 28,
    py: 0.3,
    px: 0.75,
    fontSize: '0.68rem',
    borderRadius: '0 !important',
    transform: 'none',
    boxShadow: 'none',
    '&:hover': { transform: 'none', boxShadow: 'none' },
  },
  '& .MuiButtonGroup-firstButton': {
    borderTopLeftRadius: '8px !important',
    borderBottomLeftRadius: '8px !important',
  },
  '& .MuiButtonGroup-lastButton': {
    borderTopRightRadius: '8px !important',
    borderBottomRightRadius: '8px !important',
  },
};

/** Dreier-Gruppe oben rechts — Speichern · Veröffentlichen · Löschen */
export const announcementEditorTopButtonGroupSx = {
  ...announcementActionButtonGroupSx,
  '& .MuiButton-root': {
    ...announcementActionButtonGroupSx['& .MuiButton-root'],
    minHeight: 30,
    fontSize: '0.72rem',
    px: 0.85,
  },
  '& .MuiButton-root:nth-of-type(2)': {
    minWidth: 96,
    px: 1.1,
  },
  '& .MuiButtonGroup-firstButton': {
    borderTopLeftRadius: '6px !important',
    borderBottomLeftRadius: '6px !important',
  },
  '& .MuiButtonGroup-lastButton': {
    borderTopRightRadius: '6px !important',
    borderBottomRightRadius: '6px !important',
  },
} as const;

/** Export-Leiste unter dem Editor */
export const announcementExportBarSx = {
  mt: 0.75,
  p: { xs: 0.75, sm: 1 },
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'rgba(0, 131, 143, 0.28)',
  bgcolor: 'rgba(0, 131, 143, 0.04)',
} as const;

export const announcementExportButtonGroupSx = {
  flexShrink: 0,
  boxShadow: 'none',
  width: { xs: '100%', sm: 'auto' },
  '& .MuiButtonGroup-grouped': {
    minWidth: { xs: 0, sm: 'auto' },
    flex: { xs: '1 1 0', sm: '0 0 auto' },
  },
  '& .MuiButton-root': {
    ...blockBtnBase,
    minHeight: 32,
    py: 0.45,
    px: { xs: 0.75, sm: 1.1 },
    fontSize: '0.78rem',
    fontWeight: 700,
    borderRadius: '0 !important',
    transform: 'none',
    boxShadow: 'none',
    whiteSpace: 'nowrap',
    '&:hover': { transform: 'none', boxShadow: 'none' },
    '& .MuiButton-startIcon': {
      mr: 0.5,
      '& > svg': { fontSize: 17 },
    },
  },
  '& .MuiButtonGroup-firstButton': {
    borderTopLeftRadius: '8px !important',
    borderBottomLeftRadius: '8px !important',
  },
  '& .MuiButtonGroup-lastButton': {
    borderTopRightRadius: '8px !important',
    borderBottomRightRadius: '8px !important',
  },
} as const;

/** Eckige Icon-Buttons in der Editor-Kopfzeile */
export const announcementHeaderIconBtnSx = {
  ...compactIconBtnSx,
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: announcementPalette.border,
  bgcolor: '#fff',
  color: announcementPalette.primary,
  '&:hover': {
    bgcolor: announcementPalette.successBg,
    borderColor: announcementPalette.primary,
  },
  '&.Mui-disabled': { opacity: 0.45 },
} as const;

export const announcementHeaderPrimaryIconBtnSx = {
  ...announcementHeaderIconBtnSx,
  bgcolor: announcementPalette.primary,
  borderColor: announcementPalette.primary,
  color: '#fff',
  '&:hover': {
    bgcolor: announcementPalette.secondary,
    borderColor: announcementPalette.secondary,
  },
} as const;

/** Kleinere Icon-Buttons innerhalb der Verein-Zeile */
export const announcementInlineIconBtnSx = {
  ...announcementHeaderIconBtnSx,
  width: 26,
  height: 26,
  minWidth: 26,
  borderRadius: 1.25,
} as const;

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
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 0.5,
  width: '100%',
};

export const announcementTileGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(auto-fill, minmax(132px, 1fr))',
    sm: 'repeat(auto-fill, minmax(148px, 1fr))',
    lg: 'repeat(auto-fill, minmax(160px, 1fr))',
  },
  gap: { xs: 0.75, sm: 1, md: 1.25 },
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
