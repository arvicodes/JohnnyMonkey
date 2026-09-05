import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import {
  PresentationSlide,
  SLIDE_IMAGE_THUMB_MAX,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';
import { slideSectionName } from '../../lib/presentationSections';
import PresentationSlideView from './PresentationSlideView';

const THUMB_W = 176;
const THUMB_H = Math.round((THUMB_W * SLIDE_REF_HEIGHT) / SLIDE_REF_WIDTH);
const THUMB_SCALE = THUMB_W / SLIDE_REF_WIDTH;

function thumbTitle(slide: PresentationSlide): string {
  return (slide.title || '').replace(/\s+/g, ' ').trim();
}

interface PresentationPresentSlideOverviewProps {
  open: boolean;
  slides: PresentationSlide[];
  currentIndex: number;
  nowSlideId?: string;
  onClose: () => void;
  onJump: (index: number) => void;
}

const PresentationPresentSlideOverview: React.FC<PresentationPresentSlideOverviewProps> = ({
  open,
  slides,
  currentIndex,
  nowSlideId,
  onClose,
  onJump,
}) => {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    currentRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [open, currentIndex]);

  if (!open) return null;

  return (
    <Box
      data-pres-slide-overview=""
      data-pres-toolbar=""
      role="dialog"
      aria-label="Folienübersicht"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(8,10,12,0.92)',
        pt: 'max(12px, env(safe-area-inset-top))',
        pb: 'max(80px, calc(64px + env(safe-area-inset-bottom)))',
        px: 1.5,
      }}
    >
      <Typography
        sx={{
          flexShrink: 0,
          px: 0.5,
          pb: 1,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.3,
          color: 'rgba(255,255,255,0.78)',
        }}
      >
        Folie wählen
      </Typography>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_W}px, 1fr))`,
          justifyItems: 'center',
          alignContent: 'start',
          gap: 1.25,
          pb: 1,
        }}
      >
        {slides.map((slide, index) => {
          const current = index === currentIndex;
          const section = slideSectionName(slide);
          const title = thumbTitle(slide);
          return (
            <Box
              key={slide.id}
              ref={current ? currentRef : undefined}
              component="button"
              type="button"
              data-pres-overview-slide={index}
              aria-label={`Folie ${index + 1}${title ? `: ${title}` : ''}`}
              aria-current={current ? 'true' : undefined}
              onClick={() => onJump(index)}
              sx={{
                appearance: 'none',
                border: 0,
                p: 0,
                m: 0,
                bgcolor: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                width: THUMB_W,
                textAlign: 'left',
                touchAction: 'manipulation',
              }}
            >
              <Box
                sx={{
                  width: THUMB_W,
                  height: THUMB_H,
                  borderRadius: 1.25,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  position: 'relative',
                  boxShadow: current
                    ? `0 0 0 2px ${JOHNNY_PRESENTATION.warm}, 0 6px 18px rgba(0,0,0,0.45)`
                    : '0 0 0 1px rgba(255,255,255,0.12), 0 4px 14px rgba(0,0,0,0.35)',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: SLIDE_REF_WIDTH,
                    height: SLIDE_REF_HEIGHT,
                    transform: `scale(${THUMB_SCALE})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <PresentationSlideView
                    slide={slide}
                    scale={1}
                    showLogo={false}
                    showShadow={false}
                    revealEnabled={false}
                    revealStep={999}
                    imageMaxEdge={SLIDE_IMAGE_THUMB_MAX}
                    showInkStrokes={false}
                  />
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    left: 6,
                    bottom: 6,
                    minWidth: 22,
                    height: 20,
                    px: 0.6,
                    borderRadius: 1,
                    bgcolor: current ? JOHNNY_PRESENTATION.warm : 'rgba(22,24,28,0.82)',
                    color: current ? '#1b1d21' : '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  {index + 1}
                </Box>
              </Box>
              {(section || title) && (
                <Typography
                  sx={{
                    mt: 0.4,
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.25,
                    color: current ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.72)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {section || title}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PresentationPresentSlideOverview;
