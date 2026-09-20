import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import { OPEN_TEACHER_NOTES_EVENT } from './TeacherQuickNotes';

type TeacherLessonCornerControlsProps = {
  onDashboard: () => void;
};

/** Kompakt oben rechts: Schnellnotizen + zurück zum Dashboard. */
export default function TeacherLessonCornerControls({ onDashboard }: TeacherLessonCornerControlsProps) {
  const openNotes = () => window.dispatchEvent(new Event(OPEN_TEACHER_NOTES_EVENT));

  const btnSx = {
    width: 22,
    height: 20,
    minWidth: 22,
    minHeight: 20,
    p: 0,
    borderRadius: 0,
    color: 'text.secondary',
    '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 'max(0px, env(safe-area-inset-top))',
        right: 'max(0px, env(safe-area-inset-right))',
        zIndex: (t) => t.zIndex.modal + 28,
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
        bgcolor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.1)',
        borderTop: 'none',
        borderRight: 'none',
        borderBottomLeftRadius: 5,
        boxShadow: '0 1px 5px rgba(0,0,0,0.12)',
      }}
    >
      <IconButton
        size="small"
        onClick={openNotes}
        aria-label="Notizen (N)"
        title="Notizen (N)"
        sx={btnSx}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '0.62rem',
            fontWeight: 900,
            lineHeight: 1,
            color: '#f9a825',
            textShadow: '0 0.5px 0 rgba(0,0,0,0.2)',
          }}
        >
          N
        </Typography>
      </IconButton>
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'rgba(0,0,0,0.1)' }} />
      <IconButton
        size="small"
        onClick={onDashboard}
        aria-label="Zum Dashboard"
        title="Zum Dashboard"
        sx={btnSx}
      >
        <DashboardIcon sx={{ fontSize: 13, color: '#455a64' }} />
      </IconButton>
    </Box>
  );
}
