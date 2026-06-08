import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Grid,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import type { StorySite } from '../../lib/storySitesStorage';
import {
  getStoryStartPage,
  getStoryOverviewPages,
} from '../../lib/storySitesStorage';
import {
  resolveStorySiteCategory,
  getStorySiteCategoryDef,
} from '../../lib/storySiteCategories';
import {
  STORY_SCRAPBOOK_BG,
  buildSitePreviewImageIndex,
} from '../../lib/storyPageLayout';
import { formatStoryPageDateWithWeekday } from '../../lib/storyPageDate';
import { StorySitePageBlock } from './StorySitePreviewBody';
import { StoryPreviewImageLightbox } from './StoryPreviewImageLightbox';

type StorySiteOverviewBodyProps = {
  site: StorySite;
  onOpenPage: (pageId: string) => void;
};

export function StorySiteOverviewBody({ site, onOpenPage }: StorySiteOverviewBodyProps) {
  const categoryId = resolveStorySiteCategory(site);
  const category = getStorySiteCategoryDef(categoryId);
  const startPage = getStoryStartPage(site.pages) ?? site.pages[0];
  const overviewPages = getStoryOverviewPages(site.pages);

  const { images: allImages, pageStartIndex } = useMemo(
    () => buildSitePreviewImageIndex(site.pages),
    [site.pages],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <Paper
      elevation={0}
      sx={{
        background: STORY_SCRAPBOOK_BG,
        borderRadius: 0,
        border: 'none',
        p: { xs: 1.5, sm: 2, md: 2.5 },
        width: '100%',
        maxWidth: '100%',
        boxShadow: '0 16px 40px rgba(93, 64, 55, 0.12)',
        overflowX: 'hidden',
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 2 }}>
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
        <Chip
          label={category.label}
          size="small"
          sx={{
            mt: 1,
            bgcolor: category.bg,
            color: category.text,
            border: `1px solid ${category.border}`,
            fontWeight: 700,
          }}
        />
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

      {startPage ? (
        <Box sx={{ mb: overviewPages.length > 0 ? 3 : 0 }}>
          <StorySitePageBlock
            page={startPage}
            imageIndexOffset={pageStartIndex.get(startPage.id) ?? 0}
            onPhotoClick={setLightboxIndex}
          />
        </Box>
      ) : null}

      {overviewPages.length > 0 ? (
        <Box>
          <Typography
            sx={{
              fontFamily: '"Segoe Script", "Snell Roundhand", "Bradley Hand", cursive',
              fontWeight: 600,
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              color: '#5d4037',
              mb: 1.5,
              textAlign: 'center',
            }}
          >
            Unterseiten
          </Typography>
          <Grid container spacing={1.5}>
            {overviewPages.map((page) => (
              <Grid item xs={12} sm={6} md={4} key={page.id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${category.border}`,
                    bgcolor: category.bg,
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 8px 20px rgba(93, 64, 55, 0.12)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardActionArea onClick={() => onOpenPage(page.id)}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            bgcolor: category.color,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <ArticleIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: category.text,
                              lineHeight: 1.25,
                            }}
                            noWrap
                          >
                            {page.title || 'Ohne Titel'}
                          </Typography>
                          {page.dateStr?.trim() ? (
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {formatStoryPageDateWithWeekday(page.dateStr)}
                            </Typography>
                          ) : null}
                          {page.subtitle?.trim() ? (
                            <Typography
                              variant="caption"
                              display="block"
                              sx={{ color: 'text.secondary', mt: 0.25 }}
                              noWrap
                            >
                              {page.subtitle}
                            </Typography>
                          ) : null}
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : null}

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
