import React from 'react';
import { Box, Typography } from '@mui/material';
import type { AnnouncementImage } from '../../lib/announcementTypes';
import { extractImageUrlsFromHtml, hasAnnouncementLayout } from './announcementLayouts';

type Props = {
  images: AnnouncementImage[];
  bodyHtml: string;
  title: string;
};

function collectVisibleImages(images: AnnouncementImage[], bodyHtml: string): AnnouncementImage[] {
  const inBody = extractImageUrlsFromHtml(bodyHtml);
  const layoutActive = hasAnnouncementLayout(bodyHtml);
  const meta = images.filter((img) => img.url?.trim());
  if (layoutActive) {
    return meta.filter((img) => !inBody.includes(img.url));
  }
  const seen = new Set<string>();
  const merged: AnnouncementImage[] = [];
  for (const img of meta) {
    if (!seen.has(img.url)) {
      seen.add(img.url);
      merged.push(img);
    }
  }
  for (const url of inBody) {
    if (!seen.has(url)) {
      seen.add(url);
      merged.push({ url });
    }
  }
  return merged;
}

const gridSx = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(auto-fill, minmax(120px, 1fr))',
    md: 'repeat(auto-fill, minmax(140px, 1fr))',
  },
  gap: 1,
} as const;

export function AnnouncementStudentImages({ images, bodyHtml, title }: Props) {
  const visible = collectVisibleImages(images, bodyHtml);
  if (visible.length === 0) return null;

  if (visible.length === 1) {
    const hero = visible[0];
    return (
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#f5f5f5',
          }}
        >
          <Box
            component="img"
            src={hero.url}
            alt={hero.caption || title}
            sx={{
              width: '100%',
              maxHeight: { xs: 320, md: 480 },
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {hero.caption ? (
            <Typography variant="caption" sx={{ display: 'block', px: 1.25, py: 0.75, color: 'text.secondary' }}>
              {hero.caption}
            </Typography>
          ) : null}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={gridSx}>
        {visible.map((img, i) => (
          <Box
            key={img.url + i}
            sx={{
              borderRadius: 1.5,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#f5f5f5',
            }}
          >
            <Box
              component="img"
              src={img.url}
              alt={img.caption || `${title} ${i + 1}`}
              sx={{
                width: '100%',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {img.caption ? (
              <Typography
                variant="caption"
                sx={{ display: 'block', px: 0.75, py: 0.5, color: 'text.secondary', fontSize: '0.68rem' }}
              >
                {img.caption}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
