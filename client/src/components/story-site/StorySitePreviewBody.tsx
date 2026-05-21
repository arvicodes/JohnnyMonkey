import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import type { StoryPage, StorySite } from '../../lib/storySitesStorage';
import {
  splitStoryBodyHtml,
  collectPageImages,
  normalizePageForPreview,
  STORY_PREVIEW_MAX_WIDTH,
} from '../../lib/storyPageLayout';
import { StoryPreviewImage } from './StoryPreviewImage';

const SCRAPBOOK_BG =
  'linear-gradient(180deg, #fffdf7 0%, #faf6ee 45%, #f5efe4 100%)';

const washiCorner = (side: 'tl' | 'tr' | 'bl' | 'br') => {
  const base = {
    position: 'absolute' as const,
    width: 56,
    height: 18,
    opacity: 0.75,
    borderRadius: 1,
    zIndex: 2,
    pointerEvents: 'none' as const,
  };
  const color =
    side === 'tl' || side === 'br'
      ? 'linear-gradient(90deg, rgba(255, 213, 79, 0.9), rgba(255, 193, 7, 0.65))'
      : 'linear-gradient(90deg, rgba(205, 170, 125, 0.85), rgba(161, 136, 127, 0.55))';
  const pos =
    side === 'tl'
      ? { top: 10, left: 14, transform: 'rotate(-8deg)' }
      : side === 'tr'
        ? { top: 12, right: 18, transform: 'rotate(6deg)' }
        : side === 'bl'
          ? { bottom: 14, left: 20, transform: 'rotate(5deg)' }
          : { bottom: 10, right: 14, transform: 'rotate(-6deg)' };
  return <Box sx={{ ...base, ...pos, background: color }} />;
};

function PolaroidPhoto({
  src,
  alt,
  rotation,
}: {
  src: string;
  alt: string;
  rotation: number;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.2s ease',
        filter: 'drop-shadow(0 10px 18px rgba(62, 39, 35, 0.22))',
        width: '100%',
      }}
    >
      <Box
        sx={{
          bgcolor: '#fff',
          p: 1,
          pb: 2.5,
          borderRadius: 0.5,
          boxShadow: '0 2px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        <StoryPreviewImage
          src={src}
          alt={alt}
          sx={{
            minHeight: 120,
            height: { xs: 160, sm: 200, md: 240 },
          }}
        />
      </Box>
    </Box>
  );
}

const headerLinePartSx = {
  fontFamily: '"Segoe Script", "Snell Roundhand", "Bradley Hand", cursive',
  color: '#5d4037',
  lineHeight: 1.25,
};

function HeaderDot() {
  return (
    <Typography component="span" sx={{ color: '#a1887f', flexShrink: 0, px: 0.25, lineHeight: 1.25 }}>
      ·
    </Typography>
  );
}

export function StorySitePageBlock({ page }: { page: StoryPage }) {
  const normalized = normalizePageForPreview(page);
  const { textHtml } = splitStoryBodyHtml(normalized.bodyHtml || '');
  const images = collectPageImages(normalized);
  const rotations = [-4, 5, -3, 6, 4, -5];

  const headerParts: React.ReactNode[] = [];
  headerParts.push(
    <Typography
      key="title"
      component="span"
      sx={{
        ...headerLinePartSx,
        fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
        fontWeight: 600,
      }}
    >
      {normalized.title || 'Ohne Titel'}
    </Typography>
  );
  if (normalized.subtitle?.trim()) {
    headerParts.push(<HeaderDot key="dot-sub" />);
    headerParts.push(
      <Typography
        key="subtitle"
        component="span"
        sx={{
          fontFamily: '"Segoe UI", system-ui, sans-serif',
          fontSize: { xs: '1.05rem', sm: '1.2rem', md: '1.28rem' },
          fontWeight: 700,
          color: '#3e2723',
          letterSpacing: '0.02em',
          lineHeight: 1.25,
          whiteSpace: 'nowrap',
          flexShrink: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {normalized.subtitle.trim()}
      </Typography>
    );
  }
  if (normalized.dateStr?.trim()) {
    headerParts.push(<HeaderDot key="dot-date" />);
    headerParts.push(
      <Typography
        key="date"
        component="span"
        sx={{
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          color: '#8d6e63',
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          lineHeight: 1.25,
        }}
      >
        {normalized.dateStr.trim()}
      </Typography>
    );
  }
  if (normalized.location?.trim()) {
    headerParts.push(<HeaderDot key="dot-loc" />);
    headerParts.push(
      <Typography
        key="location"
        component="span"
        sx={{
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          color: '#8d6e63',
          lineHeight: 1.25,
        }}
      >
        {normalized.location.trim()}
      </Typography>
    );
  }

  return (
    <Box
      className="story-preview-section"
      sx={{
        mb: { xs: 3, sm: 4 },
        breakInside: 'avoid',
        position: 'relative',
        borderRadius: { xs: 0, sm: 1 },
        border: '1px solid rgba(141, 110, 99, 0.2)',
        boxShadow: '0 12px 32px rgba(93, 64, 55, 0.1)',
        background: SCRAPBOOK_BG,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        '@media print': { mb: 3, boxShadow: 'none' },
      }}
    >
      {washiCorner('tl')}
      {washiCorner('tr')}
      {washiCorner('bl')}
      {washiCorner('br')}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          p: { xs: 2, sm: 2.5, md: 3 },
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Kopfzeile: immer ganz oben, eine Zeile */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 0.25,
            rowGap: 0.15,
            width: '100%',
            minWidth: 0,
            mb: 1.25,
            pb: 1,
            borderBottom: '2px solid rgba(255, 193, 7, 0.45)',
          }}
        >
          {headerParts}
        </Box>

        {/* Text links, Bilder rechts — Kopfzeile bleibt darüber */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 3fr)' },
            gap: { xs: 2, md: 3 },
            width: '100%',
            alignItems: 'start',
          }}
        >
          <Box sx={{ minWidth: 0, alignSelf: 'start' }}>
            {textHtml ? (
              <Box
                className="story-preview-html story-preview-text-only"
                sx={{
                  color: '#4e342e',
                  fontSize: { xs: '0.92rem', md: '1rem' },
                  lineHeight: 1.65,
                  textAlign: 'left',
                  '& p': { mb: 1.25 },
                  '& ul, & ol': { pl: 2.5, mb: 1.25 },
                  '& img': { display: 'none' },
                  '& [align="justify"], & [style*="text-align: justify"], & [style*="text-align:justify"]': {
                    textAlign: 'justify',
                  },
                }}
                dangerouslySetInnerHTML={{ __html: textHtml }}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Noch kein Text — schreib im Editor.
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              position: 'relative',
              minHeight: { xs: 120, md: 160 },
              alignSelf: 'start',
              bgcolor: 'rgba(255,255,255,0.35)',
              borderRadius: 1.5,
              border: '1px dashed rgba(141, 110, 99, 0.25)',
              p: { xs: 1.5, md: 2 },
              width: '100%',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {images.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  fontStyle: 'italic',
                  px: 2,
                  py: 2,
                  width: '100%',
                }}
              >
                Bilder in der Galerie — sie erscheinen hier rechts als Polaroids.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: images.length >= 4 ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
                    lg: images.length >= 5 ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: { xs: 1.5, md: 2 },
                  width: '100%',
                  alignContent: 'start',
                }}
              >
                {images.map((src, i) => (
                  <Box key={`${src.slice(0, 48)}-${i}`} sx={{ minWidth: 0 }}>
                    <PolaroidPhoto
                      src={src}
                      alt=""
                      rotation={rotations[i % rotations.length]}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function StorySitePreviewBody({ site }: { site: StorySite }) {
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#f3ebe0',
        borderRadius: 0,
        border: 'none',
        p: { xs: 1, sm: 2, md: 2.5 },
        width: '100%',
        maxWidth: STORY_PREVIEW_MAX_WIDTH,
        mx: 'auto',
        boxShadow: '0 16px 40px rgba(93, 64, 55, 0.12)',
        overflow: 'hidden',
        '@media print': { border: 'none', boxShadow: 'none', borderRadius: 0 },
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3, position: 'relative', width: '100%' }}>
        <Typography
          sx={{
            fontFamily: '"Segoe Script", "Snell Roundhand", "Bradley Hand", cursive',
            fontWeight: 600,
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
            color: '#4e342e',
            lineHeight: 1.2,
          }}
        >
          {site.name}
        </Typography>
        <Divider
          sx={{
            mt: 1.5,
            mx: 'auto',
            width: 120,
            borderColor: 'rgba(255, 193, 7, 0.6)',
            borderBottomWidth: 3,
          }}
        />
      </Box>
      {site.pages.map((p) => (
        <StorySitePageBlock key={p.id} page={p} />
      ))}
    </Paper>
  );
}
