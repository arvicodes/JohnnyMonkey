import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { AnnouncementFlyerPreview } from '../components/announcements/AnnouncementFlyerPreview';

export default function AnnouncementFlyerPage() {
  const navigate = useNavigate();
  const { folderSlug: rawSlug } = useParams<{ folderSlug: string }>();
  const folderSlug = rawSlug ? decodeURIComponent(rawSlug) : '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#e8e6e1', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Zurück">
          <IconButton onClick={() => navigate(-1)} aria-label="Zurück" size="small">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
          Flyer — {folderSlug || '…'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 2 }, minHeight: 0 }}>
        {folderSlug ? (
          <AnnouncementFlyerPreview folderSlug={folderSlug} />
        ) : (
          <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>
            Kein Ordner angegeben.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
