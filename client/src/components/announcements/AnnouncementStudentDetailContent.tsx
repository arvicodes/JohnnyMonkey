import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import type { AnnouncementImage, AnnouncementLayoutId, AnnouncementLink } from '../../lib/announcementTypes';
import { formatAnnouncementDate } from '../../lib/announcementTypes';
import { folderHasFlyerHtml } from '../../lib/announcementFlyerUtils';
import { AnnouncementContentPreview } from './AnnouncementContentPreview';
import { AnnouncementFlyerPreview } from './AnnouncementFlyerPreview';
import { announcementCardSx, announcementPalette } from './announcementUi';

const cardPaddingSx = { p: { xs: 1.25, sm: 1.75, md: 2.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.75, md: 2.5 } } };

export type AnnouncementStudentDisplayItem = {
  title: string;
  body: string;
  images?: AnnouncementImage[];
  layoutId?: AnnouncementLayoutId | null;
  links?: AnnouncementLink[];
  folderSlug?: string;
  authorName?: string;
  publishedAt?: string | null;
};

type Props = {
  item: AnnouncementStudentDisplayItem;
  /** Schüler:innen-Layout: Flyer links, Text rechts (breit) */
  studentSplitLayout?: boolean;
};

function AnnouncementLinks({ links }: { links: AnnouncementLink[] }) {
  if (links.length === 0) return null;
  return (
    <Stack spacing={0.75} sx={{ mt: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: announcementPalette.textPrimary }}>
        Vordrucke & Links
      </Typography>
      {links.map((link, index) => (
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
  );
}

function FlyerColumn({ folderSlug }: { folderSlug: string }) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: '#fafafa',
        position: { lg: 'sticky' },
        top: { lg: 16 },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: announcementPalette.textPrimary,
          px: 1.25,
          py: 0.75,
          display: 'block',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        Flyer
      </Typography>
      <Box sx={{ p: 0.75 }}>
        <AnnouncementFlyerPreview folderSlug={folderSlug} embedded height={480} />
      </Box>
    </Box>
  );
}

export function AnnouncementStudentDetailContent({ item, studentSplitLayout = false }: Props) {
  const validLinks = (item.links ?? []).filter((l) => l.label.trim() && l.url.trim());
  const metaLine = item.authorName
    ? `${item.authorName}${item.publishedAt ? ` · ${formatAnnouncementDate(item.publishedAt)}` : ''}`
    : item.publishedAt
      ? formatAnnouncementDate(item.publishedAt)
      : undefined;

  const [flyerReady, setFlyerReady] = useState<boolean | null>(studentSplitLayout && item.folderSlug ? null : false);

  useEffect(() => {
    if (!studentSplitLayout || !item.folderSlug) {
      setFlyerReady(false);
      return;
    }
    let cancelled = false;
    setFlyerReady(null);
    void folderHasFlyerHtml(item.folderSlug).then((ok) => {
      if (!cancelled) setFlyerReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [studentSplitLayout, item.folderSlug]);

  const contentBlock = (
    <>
      <AnnouncementContentPreview
        title={item.title}
        body={item.body}
        images={item.images ?? []}
        layoutId={item.layoutId ?? null}
        metaLine={metaLine}
        emptyHint="Kein weiterer Inhalt."
      />
      <AnnouncementLinks links={validLinks} />
    </>
  );

  const splitBody =
    studentSplitLayout && item.folderSlug ? (
      flyerReady === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : flyerReady ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 44%) minmax(0, 1fr)' },
            gap: { xs: 2, lg: 2.5 },
            alignItems: 'start',
          }}
        >
          <FlyerColumn folderSlug={item.folderSlug} />
          <Box sx={{ minWidth: 0 }}>{contentBlock}</Box>
        </Box>
      ) : (
        contentBlock
      )
    ) : (
      contentBlock
    );

  return (
    <Card elevation={0} sx={{ ...announcementCardSx, width: '100%' }}>
      <CardContent sx={cardPaddingSx}>{splitBody}</CardContent>
    </Card>
  );
}
