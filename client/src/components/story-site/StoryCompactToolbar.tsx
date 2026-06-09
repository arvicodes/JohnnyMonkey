import React from 'react';
import { Box, Stack, type SxProps, type Theme } from '@mui/material';
import { STORY_SCRAPBOOK_BG } from '../../lib/storyPageLayout';

/** Kompakte Icon-Buttons in der Story-Toolbar (28×28). */
export const storyToolbarIconBtnSx: SxProps<Theme> = {
  flexShrink: 0,
  width: 28,
  height: 28,
  p: 0,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'rgba(93, 64, 55, 0.2)',
  bgcolor: 'rgba(255,255,255,0.72)',
  color: '#4e342e',
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(93, 64, 55, 0.32)',
  },
  '& .MuiSvgIcon-root': { fontSize: 16 },
};

export const storyToolbarFieldSx: SxProps<Theme> = {
  flex: '1 1 auto',
  minWidth: 72,
  maxWidth: { xs: 160, sm: 240, md: 300 },
  '& .MuiInputBase-root': {
    height: 28,
    fontSize: '0.8125rem',
    py: 0,
    px: 1,
    borderRadius: 1,
    bgcolor: 'rgba(255,255,255,0.72)',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(93, 64, 55, 0.2)' },
};

export const storyToolbarToggleGroupSx: SxProps<Theme> = {
  flexShrink: 0,
  height: 28,
  bgcolor: 'rgba(255,255,255,0.45)',
  borderRadius: 1,
  border: '1px solid rgba(93, 64, 55, 0.18)',
  p: 0.25,
  gap: 0.25,
  '& .MuiToggleButtonGroup-grouped': {
    border: 0,
    mx: 0,
  },
  '& .MuiToggleButton-root': {
    px: 0.75,
    py: 0,
    minWidth: 32,
    height: 24,
    borderRadius: '6px !important',
    color: '#6d4c41',
    '&.Mui-selected': {
      bgcolor: 'rgba(255,255,255,0.92)',
      color: '#4e342e',
      boxShadow: '0 1px 4px rgba(93, 64, 55, 0.12)',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
    },
  },
};

export const storyToolbarChipSx: SxProps<Theme> = {
  height: 22,
  fontWeight: 700,
  fontSize: '0.68rem',
  bgcolor: 'rgba(255,255,255,0.55)',
  color: '#4e342e',
  border: '1px solid rgba(93, 64, 55, 0.15)',
};

type StoryCompactToolbarProps = {
  children: React.ReactNode;
  className?: string;
  /** In der Timeline-Box eingebettet (kein Full-Bleed-Band). */
  embedded?: boolean;
};

/** Sticky-Leiste — eingebettet in der Timeline-Box oder standalone. */
export function StoryCompactToolbar({ children, className, embedded }: StoryCompactToolbarProps) {
  return (
    <Box
      className={className}
      sx={{
        position: 'sticky',
        top: embedded ? 0 : 0,
        zIndex: 10,
        background: STORY_SCRAPBOOK_BG,
        borderBottom: '1px solid rgba(93, 64, 55, 0.1)',
        boxShadow: embedded ? 'none' : '0 2px 10px rgba(93, 64, 55, 0.06)',
        px: embedded ? { xs: 1, sm: 1.25 } : { xs: 0.75, sm: 1 },
        py: 0.5,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          gap: 0.5,
          minHeight: 34,
          width: '100%',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { height: 3 },
        }}
      >
        {children}
      </Stack>
    </Box>
  );
}

/** Trenner zwischen Button-Gruppen. */
export function StoryToolbarDivider() {
  return (
    <Box
      sx={{
        width: '1px',
        height: 20,
        bgcolor: 'rgba(93, 64, 55, 0.15)',
        flexShrink: 0,
        mx: 0.125,
      }}
    />
  );
}
