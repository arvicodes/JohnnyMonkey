import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { AnnouncementStudentDetailContent } from '../components/announcements/AnnouncementStudentDetailContent';
import {
  announcementPageBgSx,
  announcementPalette,
  compactIconBtnSx,
  compactIconSx,
  studentPageShellSx,
} from '../components/announcements/announcementUi';
import { loadAnnouncementStudentPreview } from '../lib/announcementStudentPreviewStorage';

export default function AnnouncementStudentPreviewPage() {
  const navigate = useNavigate();
  const item = useMemo(() => loadAnnouncementStudentPreview(), []);

  return (
    <Box sx={announcementPageBgSx}>
      <Box sx={{ ...studentPageShellSx, py: { xs: 1.25, sm: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
          <Tooltip title="Zurück">
            <IconButton
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/ankuendigungen'))}
              aria-label="Zurück"
              sx={{ ...compactIconBtnSx, bgcolor: '#fff', border: '1px solid', borderColor: 'divider' }}
            >
              <ArrowBackIcon sx={compactIconSx} />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: announcementPalette.heading, lineHeight: 1.25 }}>
              Schüler:innen-Vorschau
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Entwurf — so sehen Schüler:innen die Ankündigung
            </Typography>
          </Box>
          <Box sx={{ width: 32, flexShrink: 0 }} />
        </Box>

        {!item ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
            Keine Vorschau-Daten — bitte in der Lehreransicht erneut „In neuem Tab“ wählen.
          </Typography>
        ) : (
          <AnnouncementStudentDetailContent item={item} studentSplitLayout />
        )}
      </Box>
    </Box>
  );
}
