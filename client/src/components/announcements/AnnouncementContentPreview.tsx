import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Campaign as CampaignIcon } from '@mui/icons-material';
import type { AnnouncementImage, AnnouncementLayoutId } from '../../lib/announcementTypes';
import { AnnouncementBodyDisplay } from './announcementBody';
import { hasAnnouncementLayout } from './announcementLayouts';
import { AnnouncementStudentImages } from './AnnouncementStudentImages';
import { announcementPalette } from './announcementUi';

type Props = {
  title: string;
  body: string;
  images?: AnnouncementImage[];
  layoutId?: AnnouncementLayoutId | null;
  metaLine?: string;
  emptyHint?: string;
};

/** Anzeige-Body — gespeicherter HTML-Text bleibt unverändert (kein Layout-Zwang). */
export function resolveStudentAnnouncementBody(body: string): string {
  return (body ?? '').trim();
}

/** Wiederverwendbare Anzeige — identisch zur Schüler:innen-Detailansicht (ohne Flyer). */
export function AnnouncementContentPreview({
  title,
  body,
  images = [],
  layoutId: _layoutId = null,
  metaLine,
  emptyHint = 'Noch kein Inhalt — Titel, Bilder oder Design hinzufügen.',
}: Props) {
  const displayBody = useMemo(() => resolveStudentAnnouncementBody(body), [body]);
  const hasLayout = hasAnnouncementLayout(displayBody);
  const showTitleHeader = !hasLayout;
  const hasImages = images.some((img) => img.url?.trim());

  const isEmpty = !displayBody && !hasImages;

  return (
    <>
      {showTitleHeader && title.trim() && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.25 }}>
          <CampaignIcon sx={{ color: announcementPalette.primary, mt: 0.25, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: announcementPalette.heading,
                lineHeight: 1.25,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
              }}
            >
              {title.trim()}
            </Typography>
            {metaLine ? (
              <Typography variant="caption" color="text.secondary">
                {metaLine}
              </Typography>
            ) : null}
          </Box>
        </Box>
      )}

      <AnnouncementStudentImages
        images={images}
        bodyHtml={displayBody}
        title={title.trim() || 'Ankündigung'}
      />

      {displayBody ? (
        <Box>
          <AnnouncementBodyDisplay body={displayBody} />
        </Box>
      ) : null}

      {isEmpty && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
          {emptyHint}
        </Typography>
      )}
    </>
  );
}
