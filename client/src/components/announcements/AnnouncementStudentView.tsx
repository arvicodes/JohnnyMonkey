import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Campaign as CampaignIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import type { AnnouncementFeedItem } from '../../lib/announcementTypes';
import { formatAnnouncementDate } from '../../lib/announcementTypes';
import {
  announcementCardSx,
  announcementListItemSx,
  announcementPalette,
  announcementStatusChipSx,
} from './announcementUi';

const cardPaddingSx = { p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } };

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
        return (
          <Box
            key={key}
            onClick={() => onSelect(item.id, item.authorId)}
            sx={announcementListItemSx(selected)}
          >
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
    <Card elevation={0} sx={announcementCardSx}>
      <CardContent sx={cardPaddingSx}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <CampaignIcon sx={{ color: announcementPalette.primary, mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: announcementPalette.heading, lineHeight: 1.25 }}>
              {item.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.authorName} · {formatAnnouncementDate(item.publishedAt)}
            </Typography>
          </Box>
        </Box>

        {item.body && (
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: announcementPalette.textPrimary,
              lineHeight: 1.55,
              mb: item.links.length > 0 ? 1.5 : 0,
            }}
          >
            {item.body}
          </Typography>
        )}

        {item.links.length > 0 && (
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary }}>
              Vordrucke & Links
            </Typography>
            {item.links.map((link, index) => (
              <Button
                key={index}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                size="small"
                endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none',
                  justifyContent: 'flex-start',
                  borderColor: 'rgba(0, 131, 143, 0.35)',
                  color: announcementPalette.primary,
                  '&:hover': { borderColor: announcementPalette.primary, bgcolor: announcementPalette.successBg },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        )}

        {!item.body && item.links.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Kein weiterer Inhalt.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
