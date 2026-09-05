import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import PresentationErrorBoundary from '../components/presentation/PresentationErrorBoundary';
import PresentationLaptopPlayer from '../components/presentation/PresentationLaptopPlayer';
import type { PresentationViewerVariant } from '../lib/presentationDeck';
import { parsePresentationPlanMode } from '../lib/presentationDeck';
import { presentationLessonBackUrl } from '../lib/presentationEditorUi';

/**
 * Standalone Laptop-/SuS-Ansicht (/presentation/review):
 * - variant=original → Erstell-Stand ohne Striche
 * - variant=edited (Standard) → Live-Stand inkl. Annotationen
 * - named=Slug → eingefrorene benannte Version
 * - viewer=student → Vollbild, keine Animationen
 */
const PresentationReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const groupId = params.get('groupId') || '';
  const namedSlug = (params.get('named') || '').trim() || undefined;
  const variantParam = params.get('variant');
  const variant: PresentationViewerVariant =
    variantParam === 'original' ? 'original' : 'edited';
  const studentViewer = params.get('viewer') === 'student';
  const planMode = parsePresentationPlanMode(params.get('planMode'));

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
          width: '100vw',
          maxWidth: '100vw',
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
          namedSlug={namedSlug}
          disableAnimations={studentViewer}
          hideTeacherNotes={studentViewer}
          clipToNow={studentViewer}
          onClose={() => navigate(presentationLessonBackUrl(lessonPath, groupId, planMode))}
        />
      </Box>
    </PresentationErrorBoundary>
  );
};

export default PresentationReviewPage;
