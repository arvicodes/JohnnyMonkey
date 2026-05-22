import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, IconButton, Box, Typography, CircularProgress } from '@mui/material';
import {
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { STORY_BEIGE } from '../../lib/storyPageLayout';
import { useStoryDisplaySrc } from '../../lib/useStoryDisplaySrc';
import { isStoryVideoSrc } from '../../lib/storyMediaUtils';
import { storyPhotoDisplaySx } from '../../lib/storyImageEnhance';

type Props = {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const navStripSx = {
  position: 'absolute' as const,
  top: 0,
  bottom: 0,
  width: 44,
  zIndex: 3,
  border: 'none',
  p: 0,
  m: 0,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: 'rgba(0,0,0,0.22)',
  transition: 'background 0.15s',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.38)' },
};

const navIconSx = { fontSize: 20, color: STORY_BEIGE.cream, opacity: 0.95 };

export function StoryPreviewImageLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
}: Props) {
  const count = images.length;
  const safeIndex = count ? Math.min(Math.max(0, index), count - 1) : 0;
  const rawSrc = count ? images[safeIndex] : '';
  const isVideo = isStoryVideoSrc(rawSrc);
  const { displaySrc, pending } = useStoryDisplaySrc(rawSrc);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    setMediaFailed(false);
  }, [rawSrc, displaySrc, safeIndex]);

  const goPrev = useCallback(() => {
    if (!count) return;
    onIndexChange((safeIndex - 1 + count) % count);
  }, [count, safeIndex, onIndexChange]);

  const goNext = useCallback(() => {
    if (!count) return;
    onIndexChange((safeIndex + 1) % count);
  }, [count, safeIndex, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext]);

  if (!count) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.82)',
        },
      }}
    >
      {count > 1 ? (
        <>
          <Box component="button" type="button" onClick={goPrev} aria-label="Vorheriges Bild" sx={{ ...navStripSx, left: 0 }}>
            <ChevronLeftIcon sx={navIconSx} />
          </Box>
          <Box
            component="button"
            type="button"
            onClick={goNext}
            aria-label="Nächstes Bild"
            sx={{ ...navStripSx, right: 0 }}
          >
            <ChevronRightIcon sx={navIconSx} />
          </Box>
        </>
      ) : null}

      <IconButton
        onClick={onClose}
        aria-label="Schließen"
        size="small"
        sx={{
          position: 'absolute',
          top: { xs: 6, sm: 10 },
          right: { xs: 6, sm: 10 },
          zIndex: 4,
          color: STORY_BEIGE.cream,
          bgcolor: 'rgba(0,0,0,0.25)',
          width: 32,
          height: 32,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.4)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 18 }} />
      </IconButton>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          pl: count > 1 ? 5 : 2,
          pr: count > 1 ? 5 : 2,
          py: { xs: 5, sm: 3 },
          boxSizing: 'border-box',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.75)', mb: 1.5, fontWeight: 600, fontSize: '0.7rem' }}
        >
          {safeIndex + 1} / {count}
        </Typography>

        {pending && !displaySrc ? (
          <CircularProgress sx={{ color: STORY_BEIGE.cream }} size={32} />
        ) : mediaFailed ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            Medien nicht geladen
          </Typography>
        ) : isVideo ? (
          <Box
            key={displaySrc}
            component="video"
            src={displaySrc}
            controls
            autoPlay
            playsInline
            onError={() => setMediaFailed(true)}
            sx={{
              maxWidth: 'min(calc(100vw - 120px), 1200px)',
              maxHeight: 'min(80vh, 900px)',
              width: 'auto',
              height: 'auto',
              display: 'block',
              borderRadius: 1,
              boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
              border: `4px solid ${STORY_BEIGE.cream}`,
              bgcolor: '#000',
            }}
          />
        ) : (
          <Box
            key={displaySrc}
            component="img"
            src={displaySrc}
            alt=""
            onError={() => setMediaFailed(true)}
            onLoad={() => setMediaFailed(false)}
            sx={{
              maxWidth: 'min(calc(100vw - 120px), 1200px)',
              maxHeight: 'min(80vh, 900px)',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              borderRadius: 1,
              boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
              border: `4px solid ${STORY_BEIGE.cream}`,
              bgcolor: STORY_BEIGE.panel,
              ...storyPhotoDisplaySx,
            }}
          />
        )}
      </Box>
    </Dialog>
  );
}
