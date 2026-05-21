import React from 'react';
import { Box, Stack, type SxProps, type Theme } from '@mui/material';

/** Kompakte Icon-Buttons in der Story-Toolbar (28×28). */
export const storyToolbarIconBtnSx: SxProps<Theme> = {
  flexShrink: 0,
  width: 28,
  height: 28,
  p: 0,
  borderRadius: 0.75,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
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
    borderRadius: 0.75,
    bgcolor: 'background.paper',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
};

type StoryCompactToolbarProps = {
  children: React.ReactNode;
  className?: string;
};

/** Sticky-Leiste: eine Zeile, klein, alles dicht beieinander. */
export function StoryCompactToolbar({ children, className }: StoryCompactToolbarProps) {
  return (
    <Box
      className={className}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: 'rgba(250,250,252,0.97)',
        backdropFilter: 'blur(6px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: { xs: 0.75, sm: 1 },
        py: 0.375,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          gap: 0.375,
          minHeight: 32,
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
        bgcolor: 'divider',
        flexShrink: 0,
        mx: 0.125,
      }}
    />
  );
}
