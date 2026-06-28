import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { FlyerStudioEditor } from '../components/flyer-studio/FlyerStudioEditor';

export default function FlyerStudioPage() {
  const { folderSlug: rawSlug } = useParams<{ folderSlug: string }>();
  const [searchParams] = useSearchParams();
  const folderSlug = rawSlug ? decodeURIComponent(rawSlug) : '';
  const title = searchParams.get('title') ?? undefined;

  if (!folderSlug) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="error">Kein Ankündigungs-Ordner angegeben.</Typography>
      </Box>
    );
  }

  return <FlyerStudioEditor folderSlug={folderSlug} announcementTitle={title ?? undefined} />;
}
