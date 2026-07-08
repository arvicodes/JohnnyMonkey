import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Snackbar, Typography } from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Draw as DrawIcon,
  Highlight as HighlightIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import PresentationDrawOverlay from '../components/presentation/PresentationDrawOverlay';
import {
  ANNOTATIONS_FILENAME,
  PresentationAnnotations,
  PresentationDeck,
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  loadPresentationAnnotations,
  loadPresentationDeck,
  saveJsonFile,
  sortSlides,
} from '../lib/presentationDeck';
import { getSlideMaxRevealSteps } from '../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, TRANSITION_CSS } from '../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';

const PresentationPresentPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [annotations, setAnnotations] = useState<PresentationAnnotations | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [tool, setTool] = useState<'pen' | 'marker'>('pen');
  const [strokeColor, setStrokeColor] = useState('#c62828');
  const [snackbar, setSnackbar] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(() => (deck ? sortSlides(deck.slides) : []), [deck]);
  const currentSlide = slides[slideIndex];
  const maxReveal = currentSlide ? getSlideMaxRevealSteps(currentSlide) : 0;
  const transition = currentSlide?.transition || deck?.defaultTransition || 'fade';

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const req = el.requestFullscreen?.();
    if (req && typeof req.catch === 'function') req.catch(() => undefined);
  }, [loading]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [slideIndex]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRESENTATION_KEYFRAMES;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const currentStrokes = currentSlide ? annotations?.bySlideId[currentSlide.id] ?? [] : [];

  const persistAnnotations = useCallback(
    async (next: PresentationAnnotations) => {
      if (!lessonPath) return;
      try {
        const payload = { ...next, updatedAt: new Date().toISOString() };
        await saveJsonFile(lessonPath, ANNOTATIONS_FILENAME, payload);
        setAnnotations(payload);
      } catch {
        setSnackbar('Annotationen konnten nicht gespeichert werden');
      }
    },
    [lessonPath]
  );

  const updateStrokes = (strokes: PresentationStroke[]) => {
    if (!annotations || !currentSlide) return;
    const next: PresentationAnnotations = {
      ...annotations,
      bySlideId: { ...annotations.bySlideId, [currentSlide.id]: strokes },
    };
    setAnnotations(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persistAnnotations(next), 500);
  };

  const undoStroke = () => {
    if (currentStrokes.length === 0) return;
    updateStrokes(currentStrokes.slice(0, -1));
  };

  const goNext = useCallback(() => {
    if (revealStep < maxReveal) {
      setRevealStep((s) => s + 1);
      return;
    }
    if (slideIndex < slides.length - 1) {
      setSlideIndex((i) => i + 1);
      setRevealStep(0);
    }
  }, [revealStep, maxReveal, slideIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (revealStep > 0) {
      setRevealStep((s) => s - 1);
      return;
    }
    if (slideIndex > 0) {
      const prevIdx = slideIndex - 1;
      setSlideIndex(prevIdx);
      setRevealStep(getSlideMaxRevealSteps(slides[prevIdx]));
    }
  }, [revealStep, slideIndex, slides]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  const [displayScale, setDisplayScale] = useState(0.5);

  useEffect(() => {
    const updateScale = () => {
      const maxW = window.innerWidth * 0.92;
      const maxH = window.innerHeight * 0.82;
      setDisplayScale(Math.min(maxW / SLIDE_REF_WIDTH, maxH / SLIDE_REF_HEIGHT, 1));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!lessonPath) {
    return (
      <Box sx={{ p: 4, color: '#fff' }}>
        <Typography>Kein Stundenordner angegeben.</Typography>
      </Box>
    );
  }

  if (loading || !deck || !annotations || !currentSlide) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: JOHNNY_PRESENTATION.primaryLight }} />
      </Box>
    );
  }

  const displayW = SLIDE_REF_WIDTH * displayScale;
  const displayH = SLIDE_REF_HEIGHT * displayScale;

  return (
    <Box
      ref={containerRef}
      onClick={goNext}
      sx={{
        minHeight: '100vh',
        bgcolor: '#111',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: 'pointer',
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, position: 'absolute', top: 12, left: 16 }}
      >
        {deck.title} · Folie {slideIndex + 1}/{slides.length}
        {maxReveal > 0 && ` · Schritt ${revealStep}/${maxReveal}`}
      </Typography>

      <Box
        key={animKey}
        sx={{
          position: 'relative',
          width: displayW,
          height: displayH,
          animation: TRANSITION_CSS[transition]?.in,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <PresentationSlideView
            slide={currentSlide}
            scale={displayScale}
            revealStep={revealStep}
            revealEnabled={currentSlide.revealEnabled !== false}
          />
        </Box>
        <PresentationDrawOverlay
          strokes={currentStrokes}
          onStrokesChange={updateStrokes}
          tool={tool}
          strokeColor={strokeColor}
          lineWidth={tool === 'marker' ? 8 : 3}
          scale={displayScale}
        />
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'rgba(30,30,30,0.92)',
          borderRadius: 3,
          px: 2,
          py: 1,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton onClick={goPrev} disabled={slideIndex <= 0 && revealStep <= 0} sx={{ color: '#fff' }}>
          <ChevronLeft />
        </IconButton>
        <IconButton onClick={() => setTool('pen')} sx={{ color: tool === 'pen' ? JOHNNY_PRESENTATION.warm : '#fff' }}>
          <DrawIcon />
        </IconButton>
        <IconButton
          onClick={() => setTool('marker')}
          sx={{ color: tool === 'marker' ? JOHNNY_PRESENTATION.warm : '#fff' }}
        >
          <HighlightIcon />
        </IconButton>
        {['#c62828', '#1565c0', '#2e7d32', '#000000'].map((c) => (
          <Box
            key={c}
            onClick={() => setStrokeColor(c)}
            sx={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              bgcolor: c,
              border: strokeColor === c ? `2px solid ${JOHNNY_PRESENTATION.warm}` : '2px solid #555',
              cursor: 'pointer',
            }}
          />
        ))}
        <IconButton onClick={undoStroke} sx={{ color: '#fff' }}>
          <UndoIcon />
        </IconButton>
        <IconButton
          onClick={goNext}
          disabled={slideIndex >= slides.length - 1 && revealStep >= maxReveal}
          sx={{ color: '#fff' }}
        >
          <ChevronRight />
        </IconButton>
      </Box>

      <Typography
        variant="caption"
        sx={{ position: 'absolute', bottom: 8, right: 16, color: 'rgba(255,255,255,0.35)' }}
      >
        Klick / Leertaste = weiter · Schrittweise Einblenden
      </Typography>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        message={snackbar}
        onClose={() => setSnackbar('')}
      />
    </Box>
  );
};

export default PresentationPresentPage;
