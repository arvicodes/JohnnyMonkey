import React from 'react';
import { createPortal } from 'react-dom';
import { Box, IconButton, Typography } from '@mui/material';
import { OPEN_TEACHER_NOTES_EVENT } from './TeacherQuickNotes';
import { useTeacherFabPortalHost } from '../lib/teacherFabPortalHost';

type TeacherCornerNavControlsProps = {
  onDashboard: () => void;
};

/** Kompakt oben rechts: Schnellnotizen (N) + Dashboard (D) — auch im Vollbild portaliert. */
export default function TeacherCornerNavControls({ onDashboard }: TeacherCornerNavControlsProps) {
  const portalHost = useTeacherFabPortalHost();
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

  const bar = (
    <Box
      data-teacher-corner-nav="1"
      sx={{
        position: 'fixed',
        top: 'max(0px, env(safe-area-inset-top))',
        right: 'max(0px, env(safe-area-inset-right))',
        zIndex: 20000,
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
        pointerEvents: 'auto',
      }}
    >
      <IconButton
        size="small"
        onClick={openNotes}
        aria-label="Notizen (N)"
        title="Notizen (N)"
        data-teacher-fab="notes"
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
        aria-label="Zum Dashboard (D)"
        title="Zum Dashboard (D)"
        data-teacher-fab="dashboard"
        sx={btnSx}
      >
        <Typography
          component="span"
          sx={{
            fontSize: '0.62rem',
            fontWeight: 900,
            lineHeight: 1,
            color: '#4fc3f7',
            textShadow: '0 0.5px 0 rgba(0,0,0,0.2)',
          }}
        >
          D
        </Typography>
      </IconButton>
    </Box>
  );

  if (!portalHost) return bar;
  return createPortal(bar, portalHost);
}
