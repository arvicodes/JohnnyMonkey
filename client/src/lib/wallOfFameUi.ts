/** Ruhige, helle Galerie — Fokus auf die Bilder */
export const wallOfFamePalette = {
  pageBg: '#ffffff',
  toolbarBg: 'rgba(255, 255, 255, 0.96)',
  text: '#5d4e47',
  textMuted: '#a1887f',
  border: 'rgba(0, 0, 0, 0.06)',
  boardViewport: '#ffffff',
  accent: '#ff9800',
  accentSoft: '#ffe0b2',
} as const;

export const wallBoardBgSx = {
  bgcolor: '#ebe6df',
  backgroundImage: `
    radial-gradient(circle at 20% 10%, rgba(255, 243, 224, 0.4) 0%, transparent 42%),
    radial-gradient(circle at 85% 88%, rgba(227, 242, 253, 0.35) 0%, transparent 40%)
  `,
} as const;

export const wallMosaicTileSx = (isHovered: boolean, isDragging: boolean) => ({
  boxSizing: 'border-box' as const,
  borderRadius: '2px',
  overflow: 'hidden',
  bgcolor: '#fff',
  border: '1px solid',
  borderColor: isDragging
    ? 'rgba(255, 152, 0, 0.75)'
    : isHovered
      ? 'rgba(255, 152, 0, 0.55)'
      : 'rgba(255, 255, 255, 0.95)',
  boxShadow: isDragging
    ? '0 0 0 1px rgba(255, 152, 0, 0.35), 0 6px 16px rgba(0, 0, 0, 0.12)'
    : '0 0 0 1px rgba(0, 0, 0, 0.07), inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
  transition: isDragging ? 'none' : 'border-color 0.15s ease, box-shadow 0.15s ease',
});

/** Dashboard-Button */
export const wallOfFameDashboardBtnSx = {
  p: 0.5,
  minWidth: 32,
  width: 32,
  height: 32,
  borderRadius: 1.4,
  position: 'relative' as const,
  overflow: 'visible' as const,
  border: '2px solid rgba(255, 152, 0, 0.45)',
  background: 'linear-gradient(135deg, #ffe082 0%, #ff8f00 100%)',
  color: '#fff8e1',
  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.32)',
  '&:hover': {
    transform: 'scale(1.05)',
    borderColor: 'rgba(255, 152, 0, 0.75)',
    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.42)',
  },
  transition: 'all 0.2s ease',
};

export const wallOfFameStudentDashboardBtnSx = {
  p: 0,
  minWidth: 44,
  width: 44,
  height: 44,
  borderRadius: 1.4,
  border: '2px solid rgba(255, 152, 0, 0.55)',
  background: 'linear-gradient(135deg, #ffe082 0%, #ff8f00 100%)',
  color: '#fff8e1',
  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.35)',
  '&:hover': { transform: 'scale(1.05)' },
  transition: 'all 0.2s ease',
};

export const wallToolbarIconBtnSx = {
  width: 22,
  height: 22,
  p: 0,
  flexShrink: 0,
  borderRadius: '6px',
  border: 'none',
  bgcolor: 'transparent',
  color: wallOfFamePalette.textMuted,
  '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: wallOfFamePalette.text },
  '& .MuiSvgIcon-root': { fontSize: 15 },
};

export const wallCategoryChipSx = (active: boolean, color: string = wallOfFamePalette.accent) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const softBg = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const softHover = `rgba(${r}, ${g}, ${b}, 0.32)`;
  const border = `rgba(${r}, ${g}, ${b}, 0.45)`;
  const textActive = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;

  return {
    height: 22,
    fontSize: '0.68rem',
    fontWeight: active ? 600 : 400,
    '& .MuiChip-label': { px: 0.85, py: 0 },
    '& .MuiChip-icon': { ml: 0.35, mr: -0.15 },
    '& .MuiChip-deleteIcon': { fontSize: '14px !important', m: 0, mr: 0.15, opacity: 0.7 },
    bgcolor: active ? softBg : 'transparent',
    color: active ? textActive : wallOfFamePalette.textMuted,
    border: '1px solid',
    borderColor: active ? border : 'transparent',
    '&:hover': { bgcolor: active ? softHover : 'rgba(0,0,0,0.03)' },
  };
};

export const wallPhotoSx = (
  isHovered: boolean,
  isDragging: boolean,
  size: 'thumb' | 'full' = 'thumb',
) => {
  const flush = size === 'thumb';
  return {
    objectFit: 'cover' as const,
    display: 'block',
    borderRadius: flush ? '1px' : '10px',
    bgcolor: '#fafafa',
    border: flush ? 'none' : 'none',
    boxShadow: flush
      ? 'none'
      : isDragging
        ? '0 12px 32px rgba(0, 0, 0, 0.14)'
        : isHovered
          ? '0 8px 24px rgba(0, 0, 0, 0.12)'
          : '0 2px 10px rgba(0, 0, 0, 0.06)',
    filter: 'brightness(1.14) saturate(1.16) contrast(1.02)',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease, filter 0.2s ease',
    ...(isHovered && !isDragging ? { filter: 'brightness(1.18) saturate(1.2) contrast(1.02)' } : {}),
  };
};

export const wallLightboxCloseBtnSx = {
  position: 'absolute' as const,
  top: 6,
  right: 6,
  zIndex: 4,
  p: 0,
  minWidth: 28,
  width: 28,
  height: 28,
  borderRadius: '8px',
  color: wallOfFamePalette.textMuted,
  bgcolor: 'rgba(255,255,255,0.9)',
  border: '1px solid',
  borderColor: wallOfFamePalette.border,
  '&:hover': { bgcolor: '#fff', color: wallOfFamePalette.text },
  '& .MuiSvgIcon-root': { fontSize: 16 },
};

export const wallLightboxNavStripSx = {
  position: 'absolute' as const,
  top: 0,
  bottom: 0,
  width: 32,
  zIndex: 3,
  border: 'none',
  p: 0,
  m: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: 'transparent',
  color: wallOfFamePalette.textMuted,
  transition: 'background 0.15s, color 0.15s',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.03)', color: wallOfFamePalette.text },
  '& .MuiSvgIcon-root': { fontSize: 22 },
};

export const wallLightboxCounterSx = {
  position: 'absolute' as const,
  bottom: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 4,
  px: 1.25,
  py: 0.35,
  fontSize: '0.7rem',
  fontWeight: 500,
  color: wallOfFamePalette.textMuted,
  bgcolor: 'rgba(255,255,255,0.88)',
  borderRadius: '10px',
  border: '1px solid',
  borderColor: wallOfFamePalette.border,
};
