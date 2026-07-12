import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { BrokenImageOutlined as BrokenImageIcon } from '@mui/icons-material';
import type { WallOfFameImage } from '../../lib/wallOfFame';
import { wallOfFameImageFallbackUrl } from '../../lib/wallOfFame';
import { wallPhotoSx } from '../../lib/wallOfFameUi';

type Props = {
  image: WallOfFameImage;
  isHovered: boolean;
  isDragging: boolean;
  size?: 'thumb' | 'full';
};

export function WallOfFamePhoto({ image, isHovered, isDragging, size = 'thumb' }: Props) {
  const [src, setSrc] = useState(image.url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallback = wallOfFameImageFallbackUrl(image.path);

  useEffect(() => {
    setSrc(image.url);
    setLoaded(false);
    setFailed(false);
  }, [image.url, image.id]);

  if (failed) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: size === 'thumb' ? '1px' : '10px',
          bgcolor: '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          color: '#bcaaa4',
        }}
      >
        <BrokenImageIcon sx={{ fontSize: size === 'full' ? 32 : 22, opacity: 0.5 }} />
        <Typography variant="caption" sx={{ fontSize: '0.58rem', opacity: 0.8 }}>
          nicht geladen
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {!loaded && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: size === 'thumb' ? '1px' : '10px',
            bgcolor: '#f5f5f5',
            animation: 'wallShimmer 1.2s ease-in-out infinite',
            '@keyframes wallShimmer': {
              '0%, 100%': { opacity: 0.5 },
              '50%': { opacity: 0.9 },
            },
          }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src !== fallback) setSrc(fallback);
          else setFailed(true);
        }}
        sx={{
          ...wallPhotoSx(isHovered, isDragging, size),
          opacity: loaded ? 1 : 0,
          width: size === 'full' ? 'auto' : '100%',
          height: size === 'full' ? 'auto' : '100%',
          maxWidth: size === 'full' ? '94vw' : undefined,
          maxHeight: size === 'full' ? '92vh' : undefined,
        }}
      />
    </Box>
  );
}
