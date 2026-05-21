import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import type { StoryPage, StorySite } from '../../lib/storySitesStorage';
import { splitStoryBodyHtml, collectPageImages, normalizePageForPreview } from '../../lib/storyPageLayout';
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

export function StorySitePageBlock({ page }: { page: StoryPage }) {
  const normalized = normalizePageForPreview(page);
  const meta = [normalized.dateStr, normalized.location].filter(Boolean).join(' · ');
  const { textHtml } = splitStoryBodyHtml(normalized.bodyHtml || '');
  const images = collectPageImages(normalized);
  const rotations = [-4, 5, -3, 6, 4, -5];

  return (
    <Box
      className="story-preview-section"
      sx={{
        mb: { xs: 3, sm: 4 },
        breakInside: 'avoid',
        position: 'relative',
        borderRadius: { xs: 0, sm: 1 },
        overflow: 'visible',
        border: '1px solid rgba(141, 110, 99, 0.2)',
        boxShadow: '0 12px 32px rgba(93, 64, 55, 0.1)',
        background: SCRAPBOOK_BG,
        width: '100%',
        '@media print': { mb: 3, boxShadow: 'none' },
      }}
    >
      {washiCorner('tl')}
      {washiCorner('tr')}
      {washiCorner('bl')}
      {washiCorner('br')}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 3fr)' },
          gap: { xs: 2, md: 3 },
          p: { xs: 2, sm: 2.5, md: 3 },
          minHeight: { md: 280 },
          width: '100%',
        }}
      >
        <Box
          sx={{
            order: { xs: 1, lg: 0 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            pr: { lg: 1 },
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Segoe Script", "Snell Roundhand", "Bradley Hand", cursive',
              fontSize: { xs: '1.65rem', sm: '2rem', md: '2.25rem' },
              fontWeight: 600,
              color: '#5d4037',
              lineHeight: 1.2,
              mb: 0.75,
            }}
          >
            {normalized.title || 'Ohne Titel'}
          </Typography>
          {normalized.subtitle ? (
            <Typography
              sx={{
                fontSize: { xs: '0.95rem', sm: '1.05rem' },
                color: '#6d4c41',
                mb: 1.5,
                lineHeight: 1.45,
                fontStyle: 'italic',
              }}
            >
              {normalized.subtitle}
            </Typography>
          ) : null}
          {meta ? (
            <Typography
              variant="body2"
              sx={{
                color: '#8d6e63',
                mb: 2,
                fontSize: '0.8rem',
                letterSpacing: 0.3,
                borderLeft: '3px solid rgba(255, 193, 7, 0.65)',
                pl: 1.25,
              }}
            >
              {meta}
            </Typography>
          ) : null}
          {textHtml ? (
            <Box
              className="story-preview-html story-preview-text-only"
              sx={{
                color: '#4e342e',
                fontSize: { xs: '0.92rem', md: '1rem' },
                lineHeight: 1.65,
                '& p': { mb: 1.25 },
                '& ul, & ol': { pl: 2.5, mb: 1.25 },
                '& img': { display: 'none' },
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
            order: { xs: 2, lg: 0 },
            position: 'relative',
            minHeight: { xs: 180, md: 240 },
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            bgcolor: 'rgba(255,255,255,0.35)',
            borderRadius: 1.5,
            border: '1px dashed rgba(141, 110, 99, 0.25)',
            p: { xs: 1.5, md: 2 },
            width: '100%',
            minWidth: 0,
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
                m: 'auto',
                width: '100%',
              }}
            >
              Bilder in der Galerie rechts neben dem Text — sie erscheinen hier als Polaroids.
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
        overflow: 'visible',
        p: { xs: 1, sm: 2, md: 2.5 },
        width: '100%',
        maxWidth: '100%',
        boxShadow: '0 16px 40px rgba(93, 64, 55, 0.12)',
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
