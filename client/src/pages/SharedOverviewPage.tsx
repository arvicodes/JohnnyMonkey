import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { LessonSharedInputBox } from '../components/StudentDashboard';

/**
 * Präsentationsansicht: verwendet exakt die gleiche Leinwand wie im Dashboard.
 * Verschieben, Hinzufügen, Farben – alles wie gewohnt, füllt das Fenster.
 */
export default function SharedOverviewPage() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') || '';
  const lessonPath = searchParams.get('lessonPath') || '';

  if (!groupId || !lessonPath) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#f1f8e9' }}>
        <Typography color="error">Parameter groupId und lessonPath fehlen.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#e8f5e9' }}>
      <LessonSharedInputBox groupId={groupId} lessonPath={lessonPath} fullScreen />
    </Box>
  );
}
