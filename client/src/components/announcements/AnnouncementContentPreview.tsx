import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { AnnouncementImage, AnnouncementLayoutId } from '../../lib/announcementTypes';
import { AnnouncementBodyDisplay } from './announcementBody';
import { AnnouncementStudentImages } from './AnnouncementStudentImages';

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
  emptyHint = 'Noch kein Inhalt — Text, Bilder oder Design hinzufügen.',
}: Props) {
  const displayBody = useMemo(() => resolveStudentAnnouncementBody(body), [body]);
  const hasImages = images.some((img) => img.url?.trim());

  const isEmpty = !displayBody && !hasImages;

  return (
    <>
      {metaLine ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
          {metaLine}
        </Typography>
      ) : null}

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
