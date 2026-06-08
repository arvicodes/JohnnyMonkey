import React, { useMemo, useState } from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import type { StoryPage, StorySite } from '../../lib/storySitesStorage';
import { isStoryDayPageTitle } from '../../lib/storySitesStorage';
import {
  splitStoryBodyHtml,
  collectPageImages,
  buildSitePreviewImageIndex,
  normalizePageForPreview,
  STORY_BEIGE,
  STORY_SCRAPBOOK_BG,
  storyPageAnchorId,
  storyPageScrollMarginSx,
} from '../../lib/storyPageLayout';
import {
  storySnippetContainerSx,
  storySnippetPreviewReadonlySx,
} from '../../lib/storyHighlightSnippets';
import { StoryPreviewImage } from './StoryPreviewImage';
import { StoryTitleSideImage } from './StoryTitleSideImage';
import { StoryPreviewQuickNav } from './StoryPreviewQuickNav';
import { StoryPreviewImageLightbox } from './StoryPreviewImageLightbox';
import { formatStoryPageDateWithWeekday } from '../../lib/storyPageDate';

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
  onClick,
}: {
  src: string;
  alt: string;
  rotation: number;
  onClick?: () => void;
}) {
  return (
    <Box
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      sx={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        p: 1,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 1,
        '&:hover': onClick
          ? { bgcolor: 'rgba(141, 110, 99, 0.08)' }
          : undefined,
        '&:focus-visible': onClick
          ? { outline: '2px solid rgba(255, 193, 7, 0.7)', outlineOffset: 2 }
          : undefined,
      }}
    >
      <Box
        sx={{
          bgcolor: STORY_BEIGE.cream,
          p: 1,
          pb: 2.5,
          borderRadius: 0.5,
          boxShadow: '0 2px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.04)',
          transform: rotation ? `rotate(${rotation}deg) scale(0.96)` : 'none',
          transformOrigin: 'center center',
          width: '100%',
          maxWidth: '100%',
          mx: 'auto',
        }}
      >
        <StoryPreviewImage
          src={src}
          alt={alt}
          sx={{
            width: '100%',
            maxWidth: '100%',
            aspectRatio: '4 / 3',
            maxHeight: { xs: 160, sm: 200, md: 220 },
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

export function StorySitePageBlock({
  page,
  imageIndexOffset,
  onPhotoClick,
}: {
  page: StoryPage;
  imageIndexOffset: number;
  onPhotoClick: (globalIndex: number) => void;
}) {
  const normalized = normalizePageForPreview(page);
  const { textHtml } = splitStoryBodyHtml(normalized.bodyHtml || '');
  const fullWidth = !isStoryDayPageTitle(normalized.title) && !!normalized.fullWidth;
  const images = fullWidth ? [] : collectPageImages(normalized);
  const rotations = [-2, 2, -1.5, 2, 1.5, -2];

  const titleImageLeft = normalized.titleImageLeft?.trim() ?? '';
  const titleImageRight = normalized.titleImageRight?.trim() ?? '';

  const headerParts: React.ReactNode[] = [];
  headerParts.push(
    <Box
      key="title-row"
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: 0,
        flexShrink: 0,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      {titleImageLeft ? (
        <StoryTitleSideImage src={titleImageLeft} side="left" alt="" />
      ) : null}
      <Typography
        component="span"
        sx={{
          ...headerLinePartSx,
          fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
          fontWeight: 600,
          minWidth: 0,
        }}
      >
        {normalized.title || 'Ohne Titel'}
      </Typography>
      {titleImageRight ? (
        <StoryTitleSideImage src={titleImageRight} side="right" alt="" />
      ) : null}
    </Box>
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
        {formatStoryPageDateWithWeekday(normalized.dateStr) || normalized.dateStr.trim()}
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
      id={storyPageAnchorId(page.id)}
      className="story-preview-section"
      sx={{
        ...storyPageScrollMarginSx,
        mb: { xs: 3, sm: 4 },
        breakInside: 'avoid',
        position: 'relative',
        borderRadius: { xs: 0, sm: 1 },
        border: '1px solid rgba(141, 110, 99, 0.2)',
        boxShadow: '0 12px 32px rgba(93, 64, 55, 0.1)',
        background: STORY_SCRAPBOOK_BG,
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        boxSizing: 'border-box',
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
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {/* Kopfzeile: immer ganz oben, eine Zeile */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: titleImageLeft || titleImageRight ? 'center' : 'baseline',
            flexWrap: 'wrap',
            gap: 0.25,
            rowGap: 0.35,
            width: '100%',
            minWidth: 0,
            mb: 1.25,
            pb: 1,
            borderBottom: '2px solid rgba(255, 193, 7, 0.45)',
          }}
        >
          {headerParts}
        </Box>

        {/* Text links, Bilder rechts (oder volle Breite ohne Bildspalte) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: fullWidth
              ? '1fr'
              : { xs: '1fr', md: 'minmax(0, 2fr) minmax(0, 3fr)' },
            gap: { xs: 2, md: 2 },
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            alignItems: 'start',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{ minWidth: 0, maxWidth: '100%', alignSelf: 'start', overflow: 'hidden' }}>
            {textHtml ? (
              <Box
                className="story-preview-html story-preview-text-only"
                sx={[
                  {
                    color: '#4e342e',
                    fontSize: { xs: '0.92rem', md: '1rem' },
                    lineHeight: 1.65,
                    textAlign: 'justify',
                    '& p, & div, & li': { mb: 1.25, textAlign: 'justify' },
                    '& ul, & ol': { pl: 2.5, mb: 1.25 },
                    ...(!fullWidth && { '& img': { display: 'none' } }),
                    '& [align="justify"], & [style*="text-align: justify"], & [style*="text-align:justify"]': {
                      textAlign: 'justify',
                    },
                  },
                  storySnippetContainerSx,
                  storySnippetPreviewReadonlySx,
                ]}
                dangerouslySetInnerHTML={{ __html: textHtml }}
              />
            ) : (
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#8d6e63' }}>
                Noch kein Text — schreib im Editor.
              </Typography>
            )}
          </Box>

          {!fullWidth ? (
            <Box
              sx={{
                position: 'relative',
                minHeight: { xs: 120, md: 160 },
                alignSelf: 'start',
                bgcolor: 'rgba(250, 246, 238, 0.85)',
                borderRadius: 1.5,
                border: '1px dashed rgba(141, 110, 99, 0.25)',
                p: { xs: 1.25, md: 1.5 },
                pr: { xs: 1, md: 1.25 },
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                overflow: 'hidden',
                boxSizing: 'border-box',
                contain: 'layout',
              }}
            >
              {images.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    color: '#8d6e63',
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
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: { xs: 1, md: 1.25 },
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    alignContent: 'start',
                  }}
                >
                  {images.map((src, i) => (
                    <Box key={`${src.slice(0, 48)}-${i}`} sx={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                      <PolaroidPhoto
                        src={src}
                        alt=""
                        rotation={rotations[i % rotations.length]}
                        onClick={() => onPhotoClick(imageIndexOffset + i)}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ) : null}
        </Box>
      </Box>

    </Box>
  );
}

type PreviewBodyProps = {
  site: StorySite;
  activePageId?: string;
  onNavigatePage?: (pageId: string) => void;
};

export function StorySitePreviewBody({ site, activePageId, onNavigatePage }: PreviewBodyProps) {
  const { images: allImages, pageStartIndex } = useMemo(
    () => buildSitePreviewImageIndex(site.pages),
    [site.pages]
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <Paper
      elevation={0}
      sx={{
        background: STORY_SCRAPBOOK_BG,
        borderRadius: 0,
        border: 'none',
        p: { xs: 1, sm: 2, md: 2.5 },
        width: '100%',
        maxWidth: '100%',
        boxShadow: '0 16px 40px rgba(93, 64, 55, 0.12)',
        overflowX: 'hidden',
        overflowY: 'visible',
        '@media print': { border: 'none', boxShadow: 'none', borderRadius: 0 },
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 2, position: 'relative', width: '100%' }}>
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
      <StoryPreviewQuickNav
        pages={site.pages}
        activePageId={activePageId}
        onSelectPage={onNavigatePage}
      />
      {site.pages.map((p) => (
        <StorySitePageBlock
          key={p.id}
          page={p}
          imageIndexOffset={pageStartIndex.get(p.id) ?? 0}
          onPhotoClick={setLightboxIndex}
        />
      ))}

      <StoryPreviewImageLightbox
        images={allImages}
        open={lightboxIndex !== null && allImages.length > 0}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </Paper>
  );
}
