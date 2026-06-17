import React from 'react';
import { Box, Typography } from '@mui/material';
import { MusicNote as MusicNoteIcon } from '@mui/icons-material';
import { protocolPalette } from '../lib/beAHeroUi';

type GroupProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

/** Gruppierung im Workout-Dialog: Meta · Start · Hauptteil · Ende */
export function BeAHeroDraftGroup({ label, hint, children }: GroupProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.68rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: protocolPalette.heading,
            flexShrink: 0,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
        {hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.65rem' }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

type MusicSubProps = {
  badge?: string;
  children: React.ReactNode;
};

/** Optionale Musik als dezente Unterkategorie innerhalb einer Phase */
export function BeAHeroMusicSubsection({ badge, children }: MusicSubProps) {
  return (
    <Box
      sx={{
        mt: 1.15,
        pt: 0.95,
        borderTop: '1px dashed',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.45, mb: 0.65 }}>
        <MusicNoteIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.66rem' }}>
          Musik · optional
        </Typography>
        {badge ? (
          <Typography
            variant="caption"
            sx={{
              ml: 'auto',
              fontWeight: 700,
              fontSize: '0.62rem',
              color: 'text.disabled',
              bgcolor: 'action.hover',
              px: 0.6,
              py: 0.1,
              borderRadius: 99,
            }}
          >
            {badge}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ pl: 0.15 }}>{children}</Box>
    </Box>
  );
}

export const beAHeroMetaBlockSx = {
  p: 1.25,
  borderRadius: 2,
  bgcolor: '#fff',
  border: '1px solid',
  borderColor: 'rgba(26, 35, 126, 0.2)',
  boxShadow: '0 4px 14px rgba(26, 35, 126, 0.06)',
} as const;
