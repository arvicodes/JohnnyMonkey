/** App-weite Farbpalette (wie StudentDashboard, Entry/Exit-Ticket) */
export const protocolPalette = {
  primary: '#2E7D32',
  secondary: '#F57C00',
  accent1: '#1976D2',
  accent2: '#C2185B',
  background: '#f4f6fb',
  cardBg: '#FFFFFF',
  success: '#4CAF50',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  heading: '#1a237e',
  border: '#e0e0e0',
  /** Aliase für bestehende Komponenten */
  deep: '#1a237e',
  brown: '#2C3E50',
  mid: '#1976D2',
  light: '#64b5f6',
  sand: '#e3e8ef',
  cream: '#f4f6fb',
  paper: '#FFFFFF',
  glow: 'rgba(25, 118, 210, 0.14)',
  successBg: 'rgba(76, 175, 80, 0.12)',
} as const;

export const protocolAccents = [
  { main: protocolPalette.primary, deep: '#1b5e20', tint: 'rgba(46, 125, 50, 0.1)' },
  { main: protocolPalette.accent1, deep: '#0d47a1', tint: 'rgba(25, 118, 210, 0.1)' },
  { main: protocolPalette.secondary, deep: '#e65100', tint: 'rgba(245, 124, 0, 0.1)' },
  { main: protocolPalette.accent2, deep: '#880e4f', tint: 'rgba(194, 24, 91, 0.1)' },
] as const;

export const VIBE_CHIP_COLORS: Record<number, { main: string; deep: string; tint: string }> = {
  5: { main: protocolPalette.success, deep: '#2e7d32', tint: 'rgba(76, 175, 80, 0.12)' },
  4: { main: protocolPalette.accent1, deep: '#1565c0', tint: 'rgba(25, 118, 210, 0.1)' },
  3: { main: protocolPalette.primary, deep: '#1b5e20', tint: 'rgba(46, 125, 50, 0.1)' },
  2: { main: protocolPalette.secondary, deep: '#ef6c00', tint: 'rgba(245, 124, 0, 0.1)' },
  1: { main: '#90a4ae', deep: '#546e7a', tint: 'rgba(144, 164, 174, 0.12)' },
};

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
  background: active ? colors.bg : 'linear-gradient(135deg, #ffb74d 0%, #f57c00 100%)',
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
  maxWidth: 1000,
  mx: 'auto',
  minWidth: 0,
  boxSizing: 'border-box',
  overflowX: 'hidden',
  px: { xs: 1.5, sm: 2.5 },
} as const;

export const protocolPageBgSx = {
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100vw',
  overflowX: 'hidden',
  bgcolor: protocolPalette.background,
  py: { xs: 2, sm: 3 },
} as const;

export const protocolCardSx = {
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
  bgcolor: protocolPalette.cardBg,
  boxShadow: '0 6px 20px rgba(0,0,0,0.07)',
  transition: 'box-shadow 0.2s ease',
} as const;

export const sectionCardSx = {
  ...protocolCardSx,
};

export const protocolEditorCardSx = {
  ...protocolCardSx,
  borderColor: 'rgba(25, 118, 210, 0.22)',
  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.08)',
};

export const protocolHeroSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  borderRadius: 2,
  px: { xs: 1.25, sm: 1.5 },
  py: 1.25,
  color: 'white',
  position: 'relative' as const,
  overflow: 'hidden',
  background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
  boxShadow: '0 6px 20px rgba(46, 125, 50, 0.28)',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 90% 0%, rgba(255,255,255,0.12) 0%, transparent 55%)',
    pointerEvents: 'none',
  },
};

export const protocolSectionHeadSx = (stepIndex = 0) => {
  const accent = protocolAccents[stepIndex % protocolAccents.length];
  return {
    px: { xs: 1.25, sm: 1.5 },
    py: 0.85,
    background: `linear-gradient(90deg, ${accent.tint} 0%, rgba(255,255,255,0.9) 100%)`,
    borderBottom: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  };
};

export const protocolStepBadgeSx = (stepIndex = 0) => {
  const accent = protocolAccents[stepIndex % protocolAccents.length];
  return {
    height: 22,
    minWidth: 28,
    fontWeight: 800,
    bgcolor: accent.main,
    color: '#fff',
    boxShadow: `0 2px 6px ${accent.deep}44`,
  };
};

export const protocolFieldSx = {
  '& .MuiInputBase-root': {
    fontSize: '0.875rem',
    borderRadius: 1.5,
    bgcolor: '#fff',
  },
  '& .MuiInputLabel-root': { fontSize: '0.8rem', color: protocolPalette.textSecondary },
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: protocolPalette.border },
    '&:hover fieldset': { borderColor: protocolPalette.accent1 },
    '&.Mui-focused fieldset': { borderColor: protocolPalette.primary, borderWidth: 1.5 },
  },
};

export const protocolSectionLabelSx = {
  fontWeight: 700,
  color: protocolPalette.textPrimary,
  fontSize: '0.78rem',
  letterSpacing: 0.2,
  mb: 0.5,
  display: 'block',
};

export const protocolListItemSx = (selected: boolean, index = 0) => {
  const accent = protocolAccents[index % protocolAccents.length];
  return {
    p: 1,
    borderRadius: 2,
    border: '1px solid',
    borderColor: selected ? accent.main : 'divider',
    background: selected ? accent.tint : 'white',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    boxShadow: selected ? `0 3px 12px ${accent.main}22` : 'none',
    '&:hover': {
      borderColor: accent.main,
      bgcolor: accent.tint,
      transform: 'translateY(-1px)',
    },
  };
};

export const protocolGroupChipSx = (selected: boolean, index = 0) => {
  const accent = protocolAccents[index % protocolAccents.length];
  return {
    height: 28,
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    bgcolor: selected ? accent.main : '#fff',
    color: selected ? '#fff' : accent.deep,
    border: '1px solid',
    borderColor: selected ? accent.deep : `${accent.main}55`,
    boxShadow: selected ? `0 2px 8px ${accent.deep}28` : 'none',
    '&:hover': {
      bgcolor: selected ? accent.deep : accent.tint,
      transform: 'scale(1.02)',
    },
  };
};

export const protocolStatusChipSx = (live: boolean) => ({
  height: 20,
  fontWeight: 700,
  fontSize: '0.65rem',
  bgcolor: live ? protocolPalette.successBg : 'rgba(0,0,0,0.06)',
  color: live ? protocolPalette.primary : protocolPalette.textSecondary,
  border: '1px solid',
  borderColor: live ? 'rgba(46,125,50,0.35)' : 'rgba(0,0,0,0.08)',
});

export const protocolProgressChipSx = (done: boolean, index = 0) => {
  const accent = protocolAccents[index % protocolAccents.length];
  return {
    height: 22,
    fontSize: '0.68rem',
    fontWeight: 700,
    bgcolor: done ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)',
    color: done ? accent.deep : 'white',
    border: done ? `1px solid ${accent.main}44` : '1px solid rgba(255,255,255,0.28)',
    backdropFilter: 'blur(4px)',
  };
};

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
  color: protocolPalette.textPrimary,
  border: `1px solid ${protocolPalette.border}`,
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  '&:hover': { bgcolor: '#f8fafc', borderColor: protocolPalette.accent1, transform: 'translateY(-1px)' },
};

export const protocolBtnPublishSx = {
  ...protocolBlockBtnBase,
  background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
  color: '#fff',
  border: '1px solid #1b5e20',
  boxShadow: '0 3px 10px rgba(46, 125, 50, 0.28)',
  '&:hover': {
    background: 'linear-gradient(135deg, #66bb6a 0%, #2e7d32 100%)',
    boxShadow: '0 4px 14px rgba(46, 125, 50, 0.34)',
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': { background: '#e8e4e0', color: '#aaa', borderColor: '#e0dcd8', boxShadow: 'none' },
};

export const protocolBtnAccentSx = {
  ...protocolBlockBtnBase,
  background: 'linear-gradient(135deg, #1e88e5 0%, #1976d2 100%)',
  color: '#fff',
  border: '1px solid #1565c0',
  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
  '&:hover': {
    background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
    transform: 'translateY(-1px)',
  },
};

export const protocolBtnGhostSx = {
  ...protocolBlockBtnBase,
  bgcolor: 'rgba(25, 118, 210, 0.06)',
  color: protocolPalette.accent1,
  border: '1px dashed rgba(25, 118, 210, 0.35)',
  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.1)', borderColor: protocolPalette.accent1 },
};

export const protocolBtnToggleSx = (active = false) => ({
  ...protocolBlockBtnBase,
  bgcolor: active ? protocolPalette.successBg : 'rgba(255,255,255,0.9)',
  color: active ? protocolPalette.primary : protocolPalette.textPrimary,
  border: `1px solid ${active ? 'rgba(46,125,50,0.4)' : protocolPalette.border}`,
  '&:hover': { bgcolor: active ? 'rgba(46,125,50,0.16)' : '#f8fafc' },
});

export const protocolBtnDangerSx = {
  ...protocolBlockBtnBase,
  bgcolor: '#fff5f5',
  color: '#c62828',
  border: '1px solid #ef9a9a',
  '&:hover': { bgcolor: '#ffebee', borderColor: '#e57373', transform: 'translateY(-1px)' },
};

export const protocolBtnSubmitSx = {
  ...protocolBlockBtnBase,
  minHeight: 34,
  fontSize: '0.8rem',
  width: '100%',
  background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
  color: '#fff',
  border: '1px solid #1b5e20',
  boxShadow: '0 4px 16px rgba(46, 125, 50, 0.28)',
  '&:hover': {
    background: 'linear-gradient(135deg, #66bb6a 0%, #2e7d32 100%)',
    boxShadow: '0 6px 20px rgba(46, 125, 50, 0.35)',
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': { background: '#e8e4e0', color: '#aaa', borderColor: '#e0dcd8', boxShadow: 'none' },
};

export const protocolIconBtnSx = {
  ...compactIconBtnSx,
  bgcolor: '#fff',
  border: '1px solid',
  borderColor: 'divider',
  color: protocolPalette.textPrimary,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  '&:hover': { bgcolor: '#f8fafc', borderColor: protocolPalette.accent1, color: protocolPalette.accent1 },
};

export const protocolActivityCardSx = (index = 0) => {
  const accent = protocolAccents[index % protocolAccents.length];
  return {
    p: 1.25,
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    borderLeft: `4px solid ${accent.main}`,
    bgcolor: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 1,
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  };
};

export const protocolVibeChipSx = (selected: boolean, vibeScore?: number) => {
  const colors = vibeScore != null ? VIBE_CHIP_COLORS[vibeScore] : null;
  if (!colors) {
    return {
      height: 'auto',
      minHeight: 30,
      py: 0.4,
      fontWeight: 700,
      fontSize: { xs: '0.65rem', sm: '0.72rem' },
      cursor: 'pointer',
      justifyContent: 'center',
      maxWidth: '100%',
      transition: 'all 0.15s ease',
      '& .MuiChip-label': { whiteSpace: 'normal', textAlign: 'center', px: 0.5, lineHeight: 1.2 },
      bgcolor: selected ? protocolPalette.primary : '#fff',
      color: selected ? '#fff' : protocolPalette.textPrimary,
      border: '1.5px solid',
      borderColor: selected ? protocolPalette.primary : 'divider',
    };
  }
  return {
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
    bgcolor: selected ? colors.main : colors.tint,
    color: selected ? '#fff' : colors.deep,
    border: '1.5px solid',
    borderColor: selected ? colors.deep : `${colors.main}55`,
    boxShadow: selected ? `0 2px 8px ${colors.deep}33` : 'none',
    '&:hover': {
      bgcolor: selected ? colors.deep : `${colors.main}22`,
      transform: 'scale(1.02)',
    },
  };
};
