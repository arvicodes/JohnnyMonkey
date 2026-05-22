import React, { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { STORY_BEIGE } from '../../lib/storyPageLayout';
import { useStoryDisplaySrc } from '../../lib/useStoryDisplaySrc';
import { isStoryVideoSrc } from '../../lib/storyMediaUtils';
import { storyPhotoDisplaySx } from '../../lib/storyImageEnhance';

type Props = {
  src: string;
  alt?: string;
  sx?: object;
  /** Galerie-Thumbnails: kein CSS-Filter, festes Seitenverhältnis. */
  variant?: 'gallery' | 'preview';
};

/**
 * Bilder und Videos für Galerie / Scrapbook-Vorschau.
 */
export function StoryPreviewImage({ src, alt = '', sx, variant = 'preview' }: Props) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const trimmed = src?.trim() || '';
  const { displaySrc, pending } = useStoryDisplaySrc(trimmed);
  const isVideo = isStoryVideoSrc(trimmed);
  const isGallery = variant === 'gallery';

  useEffect(() => {
    setFailed(false);
    setRetry(0);
  }, [trimmed]);

  const handleError = useCallback(() => {
    if (retry < 1) {
      setRetry((r) => r + 1);
      return;
    }
    setFailed(true);
  }, [retry]);

  const mediaSrc =
    retry > 0
      ? `${displaySrc}${displaySrc.includes('?') ? '&' : '?'}retry=${retry}`
      : displaySrc;

  if (pending && !displaySrc) {
    return (
      <Box
        sx={{
          ...sx,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: STORY_BEIGE.placeholder,
        }}
      >
        <CircularProgress size={20} sx={{ color: '#8d6e63' }} />
      </Box>
    );
  }

  if (!displaySrc) return null;

  const failBox = (
    <Box
      sx={{
        ...sx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: STORY_BEIGE.placeholder,
        color: '#8d6e63',
        fontSize: '0.75rem',
        textAlign: 'center',
        px: 1,
      }}
    >
      Medien nicht geladen
    </Box>
  );

  if (failed) return failBox;

  const mediaSx: React.CSSProperties = isGallery
    ? {
        display: 'block',
        width: '100%',
        height: 'auto',
        aspectRatio: '4 / 3',
        objectFit: 'cover',
        verticalAlign: 'middle',
        backgroundColor: STORY_BEIGE.panel,
      }
    : {
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        objectFit: 'cover',
        verticalAlign: 'middle',
        backgroundColor: STORY_BEIGE.panel,
        ...(isVideo ? {} : storyPhotoDisplaySx),
      };

  if (isVideo) {
    return (
      <Box sx={{ ...sx, overflow: 'hidden', bgcolor: STORY_BEIGE.panel }}>
        <video
          key={mediaSrc}
          src={mediaSrc}
          controls
          playsInline
          preload="metadata"
          aria-label={alt}
          onLoadedData={() => setFailed(false)}
          onError={handleError}
          style={mediaSx}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ ...sx, overflow: 'hidden', lineHeight: 0 }}>
      <img
        key={mediaSrc}
        src={mediaSrc}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setFailed(false)}
        onError={handleError}
        style={mediaSx}
      />
    </Box>
  );
}
