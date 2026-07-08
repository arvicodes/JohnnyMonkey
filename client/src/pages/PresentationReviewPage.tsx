import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  CircularProgress,
  Toolbar,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { Slideshow as SlideshowIcon } from '@mui/icons-material';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import PresentationDrawOverlay from '../components/presentation/PresentationDrawOverlay';
import {
  PresentationAnnotations,
  PresentationDeck,
  loadPresentationAnnotations,
  loadPresentationDeck,
  normalizeSlide,
  sortSlides,
} from '../lib/presentationDeck';

const REVIEW_SCALE = 0.38;

const PresentationReviewPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [annotations, setAnnotations] = useState<PresentationAnnotations | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!lessonPath) {
      setLoading(false);
      return;
    }
    Promise.all([loadPresentationDeck(lessonPath), loadPresentationAnnotations(lessonPath)]).then(
      ([d, a]) => {
        setDeck(d);
        setAnnotations(a);
        setLoading(false);
      }
    );
  }, [lessonPath]);

  const slides = useMemo(() => (deck ? sortSlides(deck.slides) : []), [deck]);
  const currentSlide = slides[slideIndex] ? normalizeSlide(slides[slideIndex]) : undefined;
  const strokes = currentSlide ? annotations?.bySlideId[currentSlide.id] ?? [] : [];

  if (!lessonPath) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Kein Stundenordner angegeben.</Typography>
      </Box>
    );
  }

  if (loading || !deck || !annotations) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eceff1', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <SlideshowIcon sx={{ mr: 1, color: '#ff9800' }} />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
            Präsentation · Laptop-Ansicht
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {deck.title}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Paper
          elevation={0}
          sx={{ width: 220, borderRadius: 0, borderRight: '1px solid #ddd', overflowY: 'auto' }}
        >
          <List dense>
            {slides.map((slide, idx) => (
              <ListItemButton
                key={slide.id}
                selected={idx === slideIndex}
                onClick={() => setSlideIndex(idx)}
              >
                <ListItemText
                  primary={`${idx + 1}. ${slide.title}`}
                  secondary={
                    (annotations.bySlideId[slide.id]?.length ?? 0) > 0
                      ? `${annotations.bySlideId[slide.id]!.length} Striche`
                      : undefined
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            position: 'relative',
          }}
        >
          {currentSlide && (
            <Box sx={{ position: 'relative' }}>
              <PresentationSlideView slide={currentSlide} scale={REVIEW_SCALE} />
              <PresentationDrawOverlay
                strokes={strokes}
                onStrokesChange={() => undefined}
                readOnly
                tool="pen"
                strokeColor="#000"
                scale={REVIEW_SCALE}
              />
            </Box>
          )}
        </Box>

        <Paper
          elevation={0}
          sx={{
            width: 300,
            borderRadius: 0,
            borderLeft: '1px solid #ddd',
            p: 2,
            overflowY: 'auto',
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Sprecher-notizen
          </Typography>
          {currentSlide?.speakerNotesHtml?.trim() &&
          currentSlide.speakerNotesHtml !== '<p></p>' &&
          currentSlide.speakerNotesHtml !== '<p><br></p>' ? (
            <Box
              sx={{
                fontSize: 14,
                lineHeight: 1.55,
                mb: 2,
                '& p': { m: 0, mb: 0.5 },
                '& mark': { borderRadius: 0.5 },
              }}
              dangerouslySetInnerHTML={{ __html: currentSlide.speakerNotesHtml }}
            />
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {currentSlide?.speakerNotes?.trim() || '—'}
            </Typography>
          )}
          <Typography variant="overline" color="text.secondary">
            Tablet-Notizen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {strokes.length > 0
              ? `${strokes.length} Strich${strokes.length === 1 ? '' : 'e'} auf dieser Folie gespeichert.`
              : 'Keine Stift-Notizen auf dieser Folie.'}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default PresentationReviewPage;
