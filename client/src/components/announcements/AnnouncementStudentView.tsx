import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { AnnouncementFeedItem } from '../../lib/announcementTypes';
import { formatAnnouncementDate } from '../../lib/announcementTypes';
import { AnnouncementStudentDetailContent } from './AnnouncementStudentDetailContent';
import {
  announcementListItemSx,
  announcementPalette,
  announcementStatusChipSx,
} from './announcementUi';

type Props = {
  announcements: AnnouncementFeedItem[];
  selectedId: string;
  onSelect: (id: string, authorId: string) => void;
};

export function AnnouncementStudentList({ announcements, selectedId, onSelect }: Props) {
  if (announcements.length === 0) return null;

  return (
    <Stack spacing={0.75}>
      {announcements.map((item) => {
        const key = `${item.authorId}::${item.id}`;
        const selected = selectedId === key;
        const thumb = item.images?.[0]?.url;
        const imageCount = item.images?.length ?? 0;
        return (
          <Box
            key={key}
            onClick={() => onSelect(item.id, item.authorId)}
            sx={{
              ...announcementListItemSx(selected),
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            {thumb && (
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Box
                  component="img"
                  src={thumb}
                  alt=""
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
                {imageCount > 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      minWidth: 18,
                      height: 18,
                      px: 0.35,
                      borderRadius: 999,
                      bgcolor: announcementPalette.primary,
                      color: '#fff',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff',
                    }}
                  >
                    {imageCount}
                  </Box>
                )}
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                {!item.isRead && (
                  <Chip size="small" label="Neu" sx={announcementStatusChipSx(true)} />
                )}
                <Typography variant="caption" color="text.secondary">
                  {formatAnnouncementDate(item.publishedAt)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {item.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.authorName}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

type DetailProps = {
  item: AnnouncementFeedItem;
};

export function AnnouncementStudentDetail({ item }: DetailProps) {
  return (
    <AnnouncementStudentDetailContent
      studentSplitLayout
      item={{
        title: item.title,
        body: item.body,
        images: item.images ?? [],
        layoutId: item.layoutId ?? null,
        links: item.links,
        folderSlug: item.folderSlug,
        authorName: item.authorName,
        publishedAt: item.publishedAt,
      }}
    />
  );
}
