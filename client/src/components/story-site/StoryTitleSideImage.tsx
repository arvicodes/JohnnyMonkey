import React from 'react';
import { Box } from '@mui/material';
import { StoryPreviewImage } from './StoryPreviewImage';
import { STORY_BEIGE } from '../../lib/storyPageLayout';

type Props = {
  src: string;
  side: 'left' | 'right';
  alt?: string;
};

/** Kleines Polaroid neben dem Seitentitel in der Vorschau. */
export function StoryTitleSideImage({ src, side, alt = '' }: Props) {
  const trimmed = src?.trim();
  if (!trimmed) return null;

  return (
    <Box
      component="span"
      aria-hidden={!alt}
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        verticalAlign: 'middle',
        width: { xs: 40, sm: 48, md: 52 },
        mx: side === 'left' ? { xs: 0, sm: 0.25 } : { xs: 0.25, sm: 0.35 },
        transform: side === 'left' ? 'rotate(-5deg)' : 'rotate(4deg)',
        transformOrigin: 'center center',
      }}
    >
      <Box
        sx={{
          bgcolor: STORY_BEIGE.cream,
          p: 0.5,
          pb: 1.25,
          borderRadius: 0.5,
          boxShadow: '0 2px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        <StoryPreviewImage
          src={trimmed}
          alt={alt}
          variant="gallery"
          sx={{
            display: 'block',
            width: '100%',
            height: { xs: 36, sm: 42, md: 44 },
            objectFit: 'cover',
            borderRadius: 0.25,
          }}
        />
      </Box>
    </Box>
  );
}
