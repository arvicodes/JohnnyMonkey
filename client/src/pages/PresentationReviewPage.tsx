import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import PresentationErrorBoundary from '../components/presentation/PresentationErrorBoundary';
import PresentationLaptopPlayer from '../components/presentation/PresentationLaptopPlayer';
import type { PresentationViewerVariant } from '../lib/presentationDeck';

/**
 * Standalone Laptop-/SuS-Ansicht (/presentation/review):
 * - variant=original → Erstell-Stand ohne Striche
 * - variant=edited (Standard) → Live-Stand inkl. Annotationen
 * - viewer=student → Vollbild, keine Animationen
 */
const PresentationReviewPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const variantParam = params.get('variant');
  const variant: PresentationViewerVariant =
    variantParam === 'original' ? 'original' : 'edited';
  const studentViewer = params.get('viewer') === 'student';

  if (!lessonPath) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Kein Stundenordner angegeben.</Typography>
      </Box>
    );
  }

  return (
    <PresentationErrorBoundary label="Laptop-Ansicht">
      <Box
        sx={{
          height: '100dvh',
          width: studentViewer ? '100vw' : '58vw',
          maxWidth: studentViewer ? '100vw' : '58vw',
          minWidth: 320,
          bgcolor: '#000',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <PresentationLaptopPlayer
          lessonPath={lessonPath}
          variant={variant}
          disableAnimations={studentViewer}
        />
      </Box>
    </PresentationErrorBoundary>
  );
};

export default PresentationReviewPage;
