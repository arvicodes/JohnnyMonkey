/** Warmes Braun-/Beige-Theme für Exkursionsprotokoll */
export const protocolPalette = {
  deep: '#3e2723',
  brown: '#5d4037',
  mid: '#6d4c41',
  light: '#8d6e63',
  sand: '#d7ccc8',
  cream: '#faf6f2',
  paper: '#fffdf9',
  glow: 'rgba(141, 110, 99, 0.18)',
  success: '#2e7d32',
  successBg: 'rgba(46, 125, 50, 0.1)',
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

export const dashboardFeatureBtnSx = (active: boolean, colors: { border: string; bg: string; shadow: string }) => ({
  p: 0,
  minWidth: 36,
  width: 36,
  height: 36,
  borderRadius: 1.25,
  border: `2px solid ${active ? colors.border : `${colors.border}66`}`,
  background: active ? colors.bg : `linear-gradient(135deg, #bcaaa4 0%, #8d6e63 100%)`,
  color: 'white',
  boxShadow: active ? colors.shadow : 'none',
  '&:hover': {
    transform: 'scale(1.05)',
    borderColor: colors.border,
    boxShadow: colors.shadow,
  },
  transition: 'all 0.2s ease',
});

export const pageShellSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  overflowX: 'hidden',
  px: { xs: 1, sm: 1.5, md: 2 },
} as const;

export const protocolPageBgSx = {
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100vw',
  overflowX: 'hidden',
  background: `linear-gradient(165deg, ${protocolPalette.cream} 0%, #f3ebe4 45%, #efe4db 100%)`,
} as const;

export const protocolCardSx = {
  borderRadius: 2.5,
  border: '1px solid',
  borderColor: 'rgba(141, 110, 99, 0.22)',
  overflow: 'hidden',
  bgcolor: protocolPalette.paper,
  boxShadow: '0 4px 20px rgba(62, 39, 35, 0.06)',
  transition: 'box-shadow 0.2s ease',
} as const;

export const sectionCardSx = {
  ...protocolCardSx,
};

export const protocolEditorCardSx = {
  ...protocolCardSx,
  borderColor: 'rgba(109, 76, 65, 0.28)',
  boxShadow: `0 6px 24px ${protocolPalette.glow}`,
};

export const protocolHeroSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  borderRadius: 2.5,
  px: { xs: 1.25, sm: 1.5 },
  py: 1.25,
  color: 'white',
  position: 'relative' as const,
  overflow: 'hidden',
  background: `linear-gradient(125deg, ${protocolPalette.light} 0%, ${protocolPalette.mid} 42%, ${protocolPalette.deep} 100%)`,
  boxShadow: '0 6px 22px rgba(62, 39, 35, 0.22)',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 90% 0%, rgba(255,255,255,0.14) 0%, transparent 55%)',
    pointerEvents: 'none',
  },
};

export const protocolSectionHeadSx = {
  px: { xs: 1.25, sm: 1.5 },
  py: 0.85,
  background: `linear-gradient(90deg, rgba(109,76,65,0.09) 0%, rgba(255,253,249,0.6) 100%)`,
  borderBottom: '1px solid',
  borderColor: 'rgba(141, 110, 99, 0.15)',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

export const protocolStepBadgeSx = {
  height: 22,
  minWidth: 28,
  fontWeight: 800,
  bgcolor: protocolPalette.mid,
  color: '#fff',
  boxShadow: '0 2px 6px rgba(93,64,55,0.25)',
};

export const protocolFieldSx = {
  '& .MuiInputBase-root': {
    fontSize: '0.875rem',
    borderRadius: 1.5,
    bgcolor: '#fff',
  },
  '& .MuiInputLabel-root': { fontSize: '0.8rem', color: protocolPalette.brown },
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: 'rgba(141, 110, 99, 0.35)' },
    '&:hover fieldset': { borderColor: protocolPalette.light },
    '&.Mui-focused fieldset': { borderColor: protocolPalette.mid, borderWidth: 1.5 },
  },
};

export const protocolSectionLabelSx = {
  fontWeight: 700,
  color: protocolPalette.brown,
  fontSize: '0.78rem',
  letterSpacing: 0.2,
  mb: 0.5,
  display: 'block',
};

export const protocolListItemSx = (selected: boolean) => ({
  p: 1,
  borderRadius: 2,
  border: '1px solid',
  borderColor: selected ? protocolPalette.mid : 'rgba(141, 110, 99, 0.2)',
  background: selected
    ? `linear-gradient(135deg, rgba(141,110,99,0.12) 0%, rgba(255,253,249,0.9) 100%)`
    : 'rgba(255,255,255,0.55)',
  cursor: 'pointer',
  transition: 'all 0.18s ease',
  boxShadow: selected ? `0 3px 12px ${protocolPalette.glow}` : 'none',
  '&:hover': {
    borderColor: protocolPalette.light,
    bgcolor: 'rgba(255,255,255,0.85)',
    transform: 'translateY(-1px)',
  },
});

export const protocolGroupChipSx = (selected: boolean) => ({
  height: 28,
  fontSize: '0.72rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  bgcolor: selected ? protocolPalette.mid : '#fff',
  color: selected ? '#fff' : protocolPalette.brown,
  border: '1px solid',
  borderColor: selected ? protocolPalette.deep : 'rgba(141, 110, 99, 0.35)',
  boxShadow: selected ? '0 2px 8px rgba(93,64,55,0.2)' : 'none',
  '&:hover': {
    bgcolor: selected ? protocolPalette.brown : 'rgba(141,110,99,0.08)',
    transform: 'scale(1.02)',
  },
});

export const protocolStatusChipSx = (live: boolean) => ({
  height: 20,
  fontWeight: 700,
  fontSize: '0.65rem',
  bgcolor: live ? protocolPalette.successBg : 'rgba(0,0,0,0.06)',
  color: live ? protocolPalette.success : protocolPalette.brown,
  border: '1px solid',
  borderColor: live ? 'rgba(46,125,50,0.35)' : 'rgba(0,0,0,0.08)',
});

export const protocolProgressChipSx = (done: boolean) => ({
  height: 22,
  fontSize: '0.68rem',
  fontWeight: 700,
  bgcolor: done ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.18)',
  color: done ? protocolPalette.success : 'white',
  border: done ? '1px solid rgba(46,125,50,0.25)' : '1px solid rgba(255,255,255,0.25)',
  backdropFilter: 'blur(4px)',
});

export const protocolActionBarSx = (cols: number, maxWidth = 360) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: 0.5,
  width: '100%',
  maxWidth,
});

const protocolBlockBtnBase = {
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

export const protocolBtnDraftSx = {
  ...protocolBlockBtnBase,
  bgcolor: '#fff',
  color: protocolPalette.brown,
  border: `1px solid ${protocolPalette.sand}`,
  boxShadow: '0 1px 3px rgba(62,39,35,0.06)',
  '&:hover': { bgcolor: protocolPalette.cream, borderColor: protocolPalette.light, transform: 'translateY(-1px)' },
};

export const protocolBtnPublishSx = {
  ...protocolBlockBtnBase,
  background: `linear-gradient(135deg, ${protocolPalette.light} 0%, ${protocolPalette.mid} 55%, ${protocolPalette.brown} 100%)`,
  color: '#fff',
  border: `1px solid ${protocolPalette.deep}`,
  boxShadow: '0 3px 10px rgba(93,64,55,0.28)',
  '&:hover': {
    background: `linear-gradient(135deg, #a1887f 0%, ${protocolPalette.brown} 100%)`,
    boxShadow: '0 4px 14px rgba(93,64,55,0.34)',
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': { background: '#e8e4e0', color: '#aaa', borderColor: '#e0dcd8', boxShadow: 'none' },
};

export const protocolBtnAccentSx = {
  ...protocolBlockBtnBase,
  background: `linear-gradient(135deg, #bcaaa4 0%, ${protocolPalette.mid} 100%)`,
  color: '#fff',
  border: `1px solid ${protocolPalette.brown}`,
  boxShadow: '0 2px 8px rgba(93,64,55,0.22)',
  '&:hover': {
    background: `linear-gradient(135deg, #a1887f 0%, ${protocolPalette.brown} 100%)`,
    transform: 'translateY(-1px)',
  },
};

export const protocolBtnGhostSx = {
  ...protocolBlockBtnBase,
  bgcolor: 'rgba(141,110,99,0.06)',
  color: protocolPalette.mid,
  border: `1px dashed rgba(141,110,99,0.45)`,
  '&:hover': { bgcolor: 'rgba(141,110,99,0.12)', borderColor: protocolPalette.light },
};

export const protocolBtnToggleSx = (active = false) => ({
  ...protocolBlockBtnBase,
  bgcolor: active ? protocolPalette.successBg : 'rgba(255,255,255,0.9)',
  color: active ? protocolPalette.success : protocolPalette.brown,
  border: `1px solid ${active ? 'rgba(46,125,50,0.4)' : protocolPalette.sand}`,
  '&:hover': { bgcolor: active ? 'rgba(46,125,50,0.16)' : protocolPalette.cream },
});

export const protocolBtnDangerSx = {
  ...protocolBlockBtnBase,
  bgcolor: '#fff8f8',
  color: '#b71c1c',
  border: '1px solid #ffcdd2',
  '&:hover': { bgcolor: '#ffebee', borderColor: '#ef9a9a', transform: 'translateY(-1px)' },
};

export const protocolBtnSubmitSx = {
  ...protocolBlockBtnBase,
  minHeight: 34,
  fontSize: '0.8rem',
  width: '100%',
  background: `linear-gradient(135deg, ${protocolPalette.light} 0%, ${protocolPalette.mid} 50%, ${protocolPalette.brown} 100%)`,
  color: '#fff',
  border: `1px solid ${protocolPalette.deep}`,
  boxShadow: '0 4px 16px rgba(93,64,55,0.28)',
  '&:hover': {
    background: `linear-gradient(135deg, #a1887f 0%, ${protocolPalette.brown} 100%)`,
    boxShadow: '0 6px 20px rgba(93,64,55,0.35)',
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': { background: '#e8e4e0', color: '#aaa', borderColor: '#e0dcd8', boxShadow: 'none' },
};

export const protocolIconBtnSx = {
  ...compactIconBtnSx,
  bgcolor: '#fff',
  border: '1px solid',
  borderColor: 'rgba(141, 110, 99, 0.3)',
  color: protocolPalette.mid,
  boxShadow: '0 1px 4px rgba(62,39,35,0.08)',
  '&:hover': { bgcolor: protocolPalette.cream, borderColor: protocolPalette.mid, color: protocolPalette.brown },
};

export const protocolActivityCardSx = {
  p: 1.25,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'rgba(141, 110, 99, 0.18)',
  bgcolor: 'rgba(255,253,249,0.85)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 1,
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(62,39,35,0.04)',
};

export const protocolVibeChipSx = (selected: boolean) => ({
  height: 'auto',
  minHeight: 30,
  py: 0.4,
  fontWeight: 700,
  fontSize: { xs: '0.65rem', sm: '0.72rem' },
  cursor: 'pointer',
  justifyContent: 'center',
  maxWidth: '100%',
  transition: 'all 0.15s ease',
  '& .MuiChip-label': {
    whiteSpace: 'normal',
    textAlign: 'center',
    px: 0.5,
    lineHeight: 1.2,
  },
  bgcolor: selected ? protocolPalette.mid : '#fff',
  color: selected ? '#fff' : protocolPalette.brown,
  border: '1.5px solid',
  borderColor: selected ? protocolPalette.deep : 'rgba(141,110,99,0.25)',
  boxShadow: selected ? '0 2px 8px rgba(93,64,55,0.2)' : 'none',
  '&:hover': {
    bgcolor: selected ? protocolPalette.brown : 'rgba(141,110,99,0.08)',
    transform: 'scale(1.02)',
  },
});
