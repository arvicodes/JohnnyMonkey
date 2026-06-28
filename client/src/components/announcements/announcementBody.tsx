import React from 'react';
import { Box, Typography } from '@mui/material';
import { announcementPalette } from './announcementUi';
import { hasAnnouncementLayout } from './announcementLayouts';

export function announcementBodyLooksLikeHtml(raw: string): boolean {
  return /<(p|br|div|span|strong|b|em|i|u|ul|ol|li|h[1-6]|font|img)\b/i.test((raw ?? '').trim());
}

export function sanitizeAnnouncementBodyHtml(html: string): string {
  return (html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*contenteditable\s*=\s*["']?(?:true|false)["']?/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*data-[a-z-]+\s*=\s*["'][^"']*["']/gi, '');
}

export const announcementBodyDisplaySx = {
  color: announcementPalette.textPrimary,
  lineHeight: 1.6,
  fontSize: '0.9375rem',
  wordBreak: 'break-word',
  '& p': { m: 0, mb: 0.75 },
  '& p:last-child': { mb: 0 },
  '& ul, & ol': { pl: 2.5, my: 0.75 },
  '& li': { mb: 0.35 },
  '& strong, & b': { fontWeight: 700 },
  '& a': { color: announcementPalette.primary },
  '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
  // —— Layout: Hero ——
  '& .jm-layout-hero': {
    borderRadius: 2,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: '#fff',
  },
  '& .jm-layout-hero .jm-ann-hero': { lineHeight: 0 },
  '& .jm-layout-hero .jm-ann-hero-img': {
    width: '100%',
    maxHeight: { xs: 280, md: 420 },
    objectFit: 'cover',
    borderRadius: 0,
    display: 'block',
  },
  '& .jm-layout-hero .jm-ann-body': { p: { xs: 1.5, md: 2 } },
  '& .jm-ann-title': {
    fontWeight: 800,
    fontSize: { xs: '1.2rem', md: '1.45rem' },
    color: announcementPalette.heading,
    lineHeight: 1.25,
    mb: 1,
  },
  '& .jm-ann-text': { fontSize: { xs: '0.9rem', md: '1rem' }, lineHeight: 1.6 },
  '& .jm-ann-thumb-row': {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(auto-fill, minmax(100px, 1fr))',
      md: 'repeat(auto-fill, minmax(120px, 1fr))',
    },
    gap: 1,
    mt: 1.5,
  },
  '& .jm-ann-thumb': {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    borderRadius: 1.5,
    border: '1px solid',
    borderColor: 'divider',
  },
  // —— Layout: Magazine ——
  '& .jm-layout-magazine': {
    borderRadius: 2,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: '#fff',
    p: { xs: 0, md: 0 },
  },
  '& .jm-layout-magazine .jm-ann-split': {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    alignItems: 'stretch',
  },
  '& .jm-layout-magazine .jm-ann-split-media': {
    flex: { md: '0 0 46%' },
    minHeight: { xs: 220, md: 320 },
    lineHeight: 0,
  },
  '& .jm-layout-magazine .jm-ann-split-img': {
    width: '100%',
    height: '100%',
    minHeight: { xs: 220, md: 320 },
    objectFit: 'cover',
    display: 'block',
  },
  '& .jm-layout-magazine .jm-ann-split-content': {
    flex: 1,
    p: { xs: 1.5, md: 2.5 },
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  // —— Layout: Gallery ——
  '& .jm-layout-gallery': {
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: '#fff',
    p: { xs: 1.5, md: 2 },
  },
  '& .jm-ann-gallery': {
    display: 'grid',
    gridTemplateColumns: {
      xs: 'repeat(auto-fill, minmax(140px, 1fr))',
      md: 'repeat(auto-fill, minmax(160px, 1fr))',
    },
    gap: 1.25,
    mt: 1.5,
  },
  '& .jm-ann-gallery-img': {
    width: '100%',
    aspectRatio: '4 / 3',
    objectFit: 'cover',
    borderRadius: 1.5,
    display: 'block',
  },
  '& .jm-ann-figure': { m: 0 },
  // —— Layout: Accent ——
  '& .jm-layout-accent': {
    borderRadius: 2,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: '#fff',
  },
  '& .jm-ann-accent-bar': {
    bgcolor: '#f57c00',
    px: 2,
    py: 1.25,
  },
  '& .jm-ann-accent-title': {
    color: '#fff',
    fontWeight: 800,
    fontSize: { xs: '1.1rem', md: '1.35rem' },
  },
  '& .jm-ann-accent-body': {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 1.5,
    p: { xs: 1.5, md: 2 },
  },
  '& .jm-ann-accent-media': {
    flex: { sm: '0 0 42%' },
    lineHeight: 0,
  },
  '& .jm-ann-accent-img': {
    width: '100%',
    minHeight: { xs: 200, sm: 240 },
    objectFit: 'cover',
    borderRadius: 1.5,
    display: 'block',
  },
  '& .jm-ann-accent-card': {
    flex: 1,
    bgcolor: '#fff8e1',
    borderRadius: 1.5,
    p: 1.5,
    display: 'flex',
    alignItems: 'center',
  },
  // —— Layout: Mosaic ——
  '& .jm-layout-mosaic, & .jm-layout-grid2, & .jm-layout-grid3, & .jm-layout-strip, & .jm-layout-stack': {
    borderRadius: 2,
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: '#fff',
    p: { xs: 1.5, md: 2 },
  },
  '& .jm-ann-mosaic': {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    gap: 1,
    mt: 1.5,
    minHeight: { md: 280 },
  },
  '& .jm-ann-mosaic-main': {
    flex: { md: '1 1 58%' },
    lineHeight: 0,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  '& .jm-ann-mosaic-main-img': {
    width: '100%',
    minHeight: { xs: 220, md: 280 },
    objectFit: 'cover',
    display: 'block',
  },
  '& .jm-ann-mosaic-side': {
    flex: { md: '1 1 42%' },
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 0.75,
  },
  '& .jm-ann-mosaic-thumb': {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    borderRadius: 1.25,
    display: 'block',
  },
  '& .jm-ann-grid-2': {
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
  },
  '& .jm-ann-grid-3': {
    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
  },
  '& .jm-ann-strip': {
    display: 'flex',
    gap: 1,
    overflowX: 'auto',
    pb: 0.5,
    mt: 1.5,
    WebkitOverflowScrolling: 'touch',
  },
  '& .jm-ann-strip-img': {
    height: { xs: 160, md: 200 },
    width: 'auto',
    minWidth: { xs: 140, md: 180 },
    flexShrink: 0,
    objectFit: 'cover',
    borderRadius: 1.5,
    display: 'block',
  },
  '& .jm-ann-stack': {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    mt: 1.5,
  },
  '& .jm-ann-stack-img': {
    width: '100%',
    maxHeight: { xs: 320, md: 480 },
    objectFit: 'cover',
    borderRadius: 1.5,
    display: 'block',
  },
} as const;

type AnnouncementBodyDisplayProps = {
  body: string;
};

export function AnnouncementBodyDisplay({ body }: AnnouncementBodyDisplayProps) {
  const trimmed = (body ?? '').trim();
  if (!trimmed) return null;

  const isLayout = hasAnnouncementLayout(trimmed);

  if (announcementBodyLooksLikeHtml(trimmed)) {
    return (
      <Box
        sx={{
          ...announcementBodyDisplaySx,
          ...(isLayout && { '& > .jm-announcement-layout': { width: '100%' } }),
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeAnnouncementBodyHtml(trimmed) }}
      />
    );
  }

  return (
    <Typography variant="body2" sx={{ ...announcementBodyDisplaySx, whiteSpace: 'pre-wrap' }}>
      {trimmed}
    </Typography>
  );
}
