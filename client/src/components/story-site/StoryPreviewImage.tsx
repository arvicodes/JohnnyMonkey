import React, { useState } from 'react';
import { Box } from '@mui/material';
import { displayStoryImageSrc } from '../../lib/storyPageLayout';

type Props = {
  src: string;
  alt?: string;
  sx?: object;
};

/**
 * Einfaches <img> — data:-URLs und /api/…/media/… direkt (kein fetch/blob-Umweg).
 */
export function StoryPreviewImage({ src, alt = '', sx }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = displayStoryImageSrc(src?.trim() || '');

  if (!resolved) return null;

  if (failed) {
    return (
      <Box
        sx={{
          ...sx,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#efebe9',
          color: '#8d6e63',
          fontSize: '0.75rem',
          textAlign: 'center',
          px: 1,
        }}
      >
        Bild nicht geladen
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={resolved}
      alt={alt}
      loading="eager"
      decoding="async"
      onLoad={() => setFailed(false)}
      onError={() => setFailed(true)}
      sx={{
        display: 'block',
        width: '100%',
        objectFit: 'cover',
        bgcolor: '#eceff1',
        ...sx,
      }}
    />
  );
}
