import {
  protocolAccents,
  protocolPalette,
} from '../components/excursion-protocol/excursionProtocolUi';

export { protocolPalette, protocolPageBgSx, pageShellSx, protocolCardSx, compactIconBtnSx, compactIconSx } from '../components/excursion-protocol/excursionProtocolUi';

export type BeAHeroPhaseKey = 'warmup' | 'workout' | 'cooldown' | 'music';

export type BeAHeroDraftSectionKey = BeAHeroPhaseKey | 'meta' | 'opening' | 'closing';

const phaseAccentIndex: Record<BeAHeroPhaseKey, number> = {
  warmup: 1,
  workout: 2,
  cooldown: 0,
  music: 3,
};

const draftSectionStyles: Record<
  BeAHeroDraftSectionKey,
  { headerBg: string; bodyBg: string; borderColor: string; labelColor: string; accentMain: string }
> = {
  meta: {
    headerBg: 'linear-gradient(90deg, rgba(26, 35, 126, 0.08) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: '#fafbff',
    borderColor: 'rgba(26, 35, 126, 0.18)',
    labelColor: protocolPalette.heading,
    accentMain: protocolPalette.heading,
  },
  opening: {
    headerBg: 'linear-gradient(90deg, rgba(255, 193, 7, 0.22) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: 'linear-gradient(180deg, #fffde7 0%, #fff 100%)',
    borderColor: 'rgba(255, 179, 0, 0.35)',
    labelColor: '#e65100',
    accentMain: '#ffb300',
  },
  warmup: {
    headerBg: 'linear-gradient(90deg, rgba(25, 118, 210, 0.14) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: 'linear-gradient(180deg, #e3f2fd 0%, #fff 100%)',
    borderColor: 'rgba(25, 118, 210, 0.28)',
    labelColor: '#0d47a1',
    accentMain: '#1976d2',
  },
  workout: {
    headerBg: 'linear-gradient(90deg, rgba(245, 124, 0, 0.16) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: 'linear-gradient(180deg, #fff3e0 0%, #fff 100%)',
    borderColor: 'rgba(245, 124, 0, 0.32)',
    labelColor: '#e65100',
    accentMain: '#f57c00',
  },
  cooldown: {
    headerBg: 'linear-gradient(90deg, rgba(46, 125, 50, 0.14) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: 'linear-gradient(180deg, #e8f5e9 0%, #fff 100%)',
    borderColor: 'rgba(46, 125, 50, 0.28)',
    labelColor: '#1b5e20',
    accentMain: '#2e7d32',
  },
  closing: {
    headerBg: 'linear-gradient(90deg, rgba(194, 24, 91, 0.12) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: 'linear-gradient(180deg, #fce4ec 0%, #fff 100%)',
    borderColor: 'rgba(194, 24, 91, 0.28)',
    labelColor: '#880e4f',
    accentMain: '#c2185b',
  },
  music: {
    headerBg: 'linear-gradient(90deg, rgba(255, 193, 7, 0.18) 0%, rgba(255,255,255,0.96) 100%)',
    bodyBg: 'linear-gradient(180deg, #fff8e1 0%, #fff 100%)',
    borderColor: 'rgba(255, 179, 0, 0.32)',
    labelColor: '#f57f17',
    accentMain: '#f9a825',
  },
};

/** Phasen-Farben (Kartei / Abspielen) */
export const beAHeroPhaseStyle = (phase: BeAHeroPhaseKey) => {
  const accent = protocolAccents[phaseAccentIndex[phase] % protocolAccents.length];
  return {
    background: `linear-gradient(160deg, ${accent.tint} 0%, rgba(255,255,255,0.92) 100%)`,
    borderColor: `${accent.main}40`,
    labelColor: accent.deep,
    accentMain: accent.main,
    progressGradient: `linear-gradient(90deg, ${accent.main}88 0%, ${accent.main} 55%, ${accent.deep} 100%)`,
    progressGlow: `${accent.main}40`,
  };
};

export const beAHeroPhaseChipSx = (phase: 'warmup' | 'workout' | 'cooldown', filled = true) => {
  const s = beAHeroPhaseStyle(phase);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    px: 0.85,
    py: 0.3,
    borderRadius: 99,
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: filled ? s.labelColor : protocolPalette.textSecondary,
    bgcolor: filled ? s.background : 'rgba(0,0,0,0.03)',
    border: '1px solid',
    borderColor: filled ? s.borderColor : 'divider',
    opacity: filled ? 1 : 0.55,
    lineHeight: 1.2,
  } as const;
};

export const beAHeroPhaseCardSx = (phase: 'warmup' | 'workout' | 'cooldown') => {
  const s = beAHeroPhaseStyle(phase);
  return {
    position: 'relative' as const,
    overflow: 'hidden',
    p: { xs: 1.5, md: 2 },
    pl: { xs: 2, md: 2.5 },
    borderRadius: 2.5,
    bgcolor: '#fff',
    border: '1px solid',
    borderColor: s.borderColor,
    boxShadow: '0 4px 18px rgba(15, 23, 42, 0.05)',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      bgcolor: s.accentMain,
      borderRadius: '2.5px 0 0 2.5px',
    },
  } as const;
};

export const BE_A_HERO_HEADER_LOGO_SIZE = 56;

export const beAHeroHeaderBandSx = {
  mb: 2,
  p: 0,
  m: 0,
  height: BE_A_HERO_HEADER_LOGO_SIZE,
  display: 'flex',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  gap: 0,
  bgcolor: 'transparent',
  border: 'none',
  boxShadow: 'none',
  overflow: 'visible',
};

export const beAHeroDraftSectionStyle = (key: BeAHeroDraftSectionKey) => draftSectionStyles[key];

export const compactBtnSx = {
  textTransform: 'none' as const,
  fontWeight: 700,
  fontSize: '0.78rem',
  minWidth: 'auto',
  width: 'auto',
  px: 1.1,
  py: 0.35,
  lineHeight: 1.2,
  whiteSpace: 'nowrap' as const,
};

export const beAHeroPrimaryBtnSx = {
  ...compactBtnSx,
  px: 1.75,
  py: 0.65,
  borderRadius: 2,
  textTransform: 'none',
  boxShadow: 'none',
};

export const beAHeroOutlinedBtnSx = {
  ...compactBtnSx,
  px: 1.5,
  py: 0.55,
  borderRadius: 2,
  textTransform: 'none',
};

export const beAHeroIconActionSx = {
  width: 32,
  height: 32,
  p: 0,
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  color: protocolPalette.accent1,
  '&:hover': {
    bgcolor: 'rgba(25, 118, 210, 0.08)',
    borderColor: 'rgba(25, 118, 210, 0.3)',
  },
};

export const beAHeroIconActionDangerSx = {
  ...beAHeroIconActionSx,
  color: '#d32f2f',
  '&:hover': {
    bgcolor: 'rgba(211, 47, 47, 0.08)',
    borderColor: 'rgba(211, 47, 47, 0.35)',
  },
};

export const beAHeroRoundNavBtnSx = {
  width: 38,
  height: 38,
  p: 0,
  borderRadius: '50%',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: '#fff',
  color: protocolPalette.heading,
  '&:hover': {
    bgcolor: 'rgba(25, 118, 210, 0.06)',
    borderColor: 'rgba(25, 118, 210, 0.28)',
  },
};

/** @deprecated use beAHeroIconActionSx — kept for imports */
export const compactIconActionSx = beAHeroIconActionSx;

export const actionButtonGroupSx = {
  boxShadow: 'none',
  '& .MuiButtonGroup-grouped': {
    minWidth: 28,
    px: 0.25,
    py: 0.25,
    borderColor: 'divider',
  },
};

export const beAHeroDialogPaperSx = {
  borderRadius: 3,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'rgba(25, 118, 210, 0.12)',
  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.14)',
};

export const beAHeroEmptyStateSx = {
  borderRadius: 2.5,
  border: '2px dashed',
  borderColor: 'rgba(25, 118, 210, 0.22)',
  background: 'linear-gradient(180deg, #fafbff 0%, #ffffff 100%)',
};

export const heroMinimalFieldSx = {
  '& .MuiInputBase-root': {
    fontSize: '0.88rem',
    borderRadius: 1.75,
    bgcolor: '#fff',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
  },
  '& .MuiInputLabel-root': { fontSize: '0.8rem', fontWeight: 600 },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: protocolPalette.accent1,
    borderWidth: 1.5,
  },
  '& .Mui-focused.MuiInputBase-root': {
    boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.12)',
  },
};

export const heroNameFieldSx = {
  ...heroMinimalFieldSx,
  '& .MuiInputBase-root': {
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: 1.75,
    bgcolor: '#fff',
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
  },
  '& .MuiInputLabel-root': { fontSize: '0.85rem', fontWeight: 600 },
};

export const denseFieldSx = {
  '& .MuiInputBase-root': { fontSize: '0.82rem', borderRadius: 1.25, bgcolor: '#fff' },
  '& .MuiInputLabel-root': { fontSize: '0.78rem' },
  '& .MuiFormHelperText-root': { fontSize: '0.68rem', mt: 0.25, lineHeight: 1.25 },
};

export const draftSlideRowSx = (borderColor: string) => ({
  display: 'flex',
  gap: 0.75,
  alignItems: 'flex-start',
  p: 0.75,
  border: '1px solid',
  borderColor,
  borderRadius: 1.25,
  bgcolor: '#fff',
});

export const beAHeroListItemSx = {
  p: 1.35,
  borderRadius: 2.5,
  border: '1px solid',
  borderColor: 'rgba(25, 118, 210, 0.12)',
  bgcolor: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  cursor: 'pointer',
  transition: 'all 0.18s ease',
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
  '&:hover': {
    borderColor: protocolPalette.accent1,
    bgcolor: 'rgba(25, 118, 210, 0.03)',
    boxShadow: '0 8px 20px rgba(25, 118, 210, 0.12)',
    transform: 'translateY(-1px)',
  },
} as const;

export const beAHeroPlaySlideCardSx = {
  width: '100%',
  borderRadius: 3,
  overflow: 'hidden',
  bgcolor: '#fff',
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: '0 10px 32px rgba(15, 23, 42, 0.1)',
} as const;

export const beAHeroPlaySlideHeaderSx = (phase: 'warmup' | 'workout' | 'cooldown') => {
  const s = beAHeroPhaseStyle(phase);
  return {
    px: { xs: 2, sm: 2.5 },
    py: { xs: 1.5, sm: 1.75 },
    background: s.background,
    borderBottom: '1px solid',
    borderColor: s.borderColor,
  } as const;
};

export const beAHeroPlayBtnSx = {
  ...beAHeroIconActionSx,
  width: 38,
  height: 38,
  color: protocolPalette.accent1,
} as const;
