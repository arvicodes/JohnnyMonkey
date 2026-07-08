import React, { useEffect, useRef } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  normalizeSlide,
  PresentationSlide,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import PresentationSlideView from './PresentationSlideView';

interface PresentationFilmstripProps {
  slides: PresentationSlide[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const THUMB_W = PRES_EDITOR_UI.filmstripThumbWidth;
const THUMB_SCALE = THUMB_W / SLIDE_REF_WIDTH;
const THUMB_H = SLIDE_REF_HEIGHT * THUMB_SCALE;
const STRIP_W = THUMB_W + 12;

const PresentationFilmstrip: React.FC<PresentationFilmstripProps> = ({
  slides,
  activeId,
  onSelect,
  onAdd,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!activeId) return;
    const el = itemRefs.current[activeId];
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  return (
    <Box
      sx={{
        width: STRIP_W,
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: PRES_EDITOR_UI.pageBg,
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
          px: 0.5,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {slides.map((slide, idx) => {
          const active = slide.id === activeId;
          const normalized = normalizeSlide(slide);

          return (
            <Box
              key={slide.id}
              ref={(node: HTMLDivElement | null) => {
                itemRefs.current[slide.id] = node;
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(slide.id)}
              sx={{
                mb: 0.75,
                position: 'relative',
                cursor: 'pointer',
                width: THUMB_W,
                mx: 'auto',
                borderRadius: 1,
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: active
                  ? `0 0 0 2px ${PRES_EDITOR_UI.accent}, 0 2px 8px rgba(46,125,50,0.15)`
                  : '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'box-shadow 0.15s',
                '&:hover': {
                  boxShadow: active
                    ? `0 0 0 2px ${PRES_EDITOR_UI.accent}, 0 2px 8px rgba(46,125,50,0.15)`
                    : `0 0 0 1px ${PRES_EDITOR_UI.accentHover}, 0 1px 3px rgba(0,0,0,0.08)`,
                },
              }}
            >
              <Box
                sx={{
                  width: THUMB_W,
                  height: THUMB_H,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  position: 'relative',
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
                    slide={normalized}
                    scale={1}
                    showLogo={false}
                    revealEnabled={false}
                    revealStep={999}
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  minWidth: 18,
                  height: 18,
                  px: 0.5,
                  borderRadius: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: active ? PRES_EDITOR_UI.accent : 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  lineHeight: 1,
                  pointerEvents: 'none',
                }}
              >
                {idx + 1}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ py: 0.75, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <Tooltip title="Neue Folie">
          <IconButton
            size="small"
            onClick={onAdd}
            sx={{
              width: 30,
              height: 30,
              bgcolor: '#fff',
              color: PRES_EDITOR_UI.accent,
              border: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft },
            }}
          >
            <AddIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default PresentationFilmstrip;
