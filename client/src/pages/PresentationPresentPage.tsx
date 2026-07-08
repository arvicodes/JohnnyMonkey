import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, IconButton, Snackbar, Tooltip, Typography } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import PresentationDrawOverlay from '../components/presentation/PresentationDrawOverlay';
import PresentationTabletToolbar from '../components/presentation/PresentationTabletToolbar';
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
import { PresentationDrawTool, defaultLineWidthForTool, lineWidthsForTool } from '../lib/presentationDrawTools';
import { presentationEditorBackTarget } from '../lib/presentationEditorUi';
import { savePresentationBothVersions } from '../lib/presentationExport';
import { getSlideMaxRevealSteps } from '../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, TRANSITION_CSS } from '../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';

const MINI_BTN_SX = {
  width: 28,
  height: 28,
  p: 0,
  color: 'rgba(255,255,255,0.9)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.28)' },
} as const;

const SWIPE_MIN_PX = 48;

const PresentationPresentPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const groupId = params.get('groupId') || '';

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [annotations, setAnnotations] = useState<PresentationAnnotations | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [drawActive, setDrawActive] = useState(false);
  const [activeTool, setActiveTool] = useState<PresentationDrawTool>('pen');
  const [strokeColor, setStrokeColor] = useState('#c62828');
  const [lineWidth, setLineWidth] = useState(3);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const slides = useMemo(() => (deck ? sortSlides(deck.slides) : []), [deck]);
  const currentSlide = slides[slideIndex];
  const maxReveal = currentSlide ? getSlideMaxRevealSteps(currentSlide) : 0;
  const transition = currentSlide?.transition || deck?.defaultTransition || 'fade';
  const canGoPrev = slideIndex > 0 || revealStep > 0;
  const canGoNext = slideIndex < slides.length - 1 || revealStep < maxReveal;

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
    setSelectedStrokeId(null);
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

  const flushAnnotations = useCallback(async (): Promise<PresentationAnnotations | null> => {
    if (!annotations || !lessonPath) return null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const payload = { ...annotations, updatedAt: new Date().toISOString() };
    await saveJsonFile(lessonPath, ANNOTATIONS_FILENAME, payload);
    setAnnotations(payload);
    return payload;
  }, [annotations, lessonPath]);

  const handleSaveBothVersions = useCallback(async () => {
    if (!deck || !annotations || saving) return;
    setSaving(true);
    setSaveProgress('Vorbereiten…');
    try {
      const ann = await flushAnnotations();
      if (!ann) throw new Error('Annotationen fehlen');
      const result = await savePresentationBothVersions(lessonPath, deck, ann, setSaveProgress);
      setSnackbar(`Gespeichert: ${result.originalPdf} + ${result.editedPdf}`);
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  }, [annotations, deck, flushAnnotations, lessonPath, saving]);

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

  const handleBack = () => {
    window.close();
    navigate(presentationEditorBackTarget(groupId));
  };

  const handleToggleDraw = () => {
    setDrawActive((v) => {
      if (!v) setActiveTool('pen');
      return !v;
    });
  };

  const handleSelectLineWidth = (w: number) => {
    setLineWidth(w);
    if (activeTool === 'select' && selectedStrokeId && annotations && currentSlide) {
      const next = currentStrokes.map((s) =>
        s.id === selectedStrokeId ? { ...s, lineWidth: w } : s
      );
      updateStrokes(next);
    }
  };

  const handleSelectTool = (tool: PresentationDrawTool) => {
    setDrawActive(true);
    setActiveTool(tool);
    const options = lineWidthsForTool(tool);
    if (!options.some((w) => Math.abs(w - lineWidth) < 0.01)) {
      setLineWidth(defaultLineWidthForTool(tool));
    }
    if (tool !== 'select') setSelectedStrokeId(null);
  };

  useEffect(() => {
    if (!selectedStrokeId) return;
    const stroke = currentStrokes.find((s) => s.id === selectedStrokeId);
    if (stroke) setLineWidth(stroke.lineWidth);
  }, [selectedStrokeId, currentStrokes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (drawActive) return;
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
  }, [goNext, goPrev, drawActive]);

  const [displayScale, setDisplayScale] = useState(0.5);

  useEffect(() => {
    const updateScale = () => {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      setDisplayScale(Math.min(maxW / SLIDE_REF_WIDTH, maxH / SLIDE_REF_HEIGHT));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (drawActive) return;
    const t = e.touches[0];
    if (!t) return;
    swipeRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (drawActive || !swipeRef.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    swipeRef.current = null;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const handleSlideTap = (e: React.MouseEvent) => {
    if (drawActive) return;
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < 0.28) goPrev();
    else goNext();
  };

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
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{
        minHeight: '100vh',
        bgcolor: '#111',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        position: 'relative',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 10,
          left: 10,
          zIndex: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip title="Zurück zur Stunde">
          <IconButton
            size="small"
            onClick={handleBack}
            aria-label="Zurück zur Stunde"
            sx={{
              width: 28,
              height: 28,
              p: 0,
              bgcolor: 'rgba(22,24,28,0.88)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: JOHNNY_PRESENTATION.warm,
              '&:hover': { bgcolor: 'rgba(22,24,28,0.96)' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {!drawActive && (
        <>
          <Box
            role="button"
            tabIndex={0}
            aria-label="Vorherige Folie"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            sx={{
              position: 'fixed',
              left: 0,
              top: '18%',
              bottom: '18%',
              width: '12%',
              minWidth: 44,
              zIndex: 5,
              cursor: canGoPrev ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              pl: 0.5,
            }}
          >
            <IconButton
              size="small"
              disabled={!canGoPrev}
              sx={{
                ...MINI_BTN_SX,
                bgcolor: 'rgba(30,30,30,0.55)',
                '&:hover': { bgcolor: 'rgba(30,30,30,0.78)' },
              }}
            >
              <ChevronLeft sx={{ fontSize: 22 }} />
            </IconButton>
          </Box>
          <Box
            role="button"
            tabIndex={0}
            aria-label="Nächste Folie"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            sx={{
              position: 'fixed',
              right: 0,
              top: '18%',
              bottom: '18%',
              width: '12%',
              minWidth: 44,
              zIndex: 5,
              cursor: canGoNext ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 0.5,
            }}
          >
            <IconButton
              size="small"
              disabled={!canGoNext}
              sx={{
                ...MINI_BTN_SX,
                bgcolor: 'rgba(30,30,30,0.55)',
                '&:hover': { bgcolor: 'rgba(30,30,30,0.78)' },
              }}
            >
              <ChevronRight sx={{ fontSize: 22 }} />
            </IconButton>
          </Box>
        </>
      )}

      <Box
        key={animKey}
        onClick={handleSlideTap}
        sx={{
          position: 'relative',
          width: displayW,
          height: displayH,
          animation: TRANSITION_CSS[transition]?.in,
          cursor: drawActive ? 'default' : 'pointer',
        }}
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
          enabled={drawActive}
          tool={activeTool}
          strokeColor={strokeColor}
          lineWidth={lineWidth}
          selectedStrokeId={selectedStrokeId}
          onSelectedStrokeIdChange={setSelectedStrokeId}
          scale={displayScale}
        />
      </Box>

      <PresentationTabletToolbar
        drawActive={drawActive}
        activeTool={activeTool}
        strokeColor={strokeColor}
        lineWidth={lineWidth}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        canUndo={currentStrokes.length > 0}
        saving={saving}
        onGoPrev={goPrev}
        onGoNext={goNext}
        onToggleDraw={handleToggleDraw}
        onSelectTool={handleSelectTool}
        onSelectColor={setStrokeColor}
        onSelectLineWidth={handleSelectLineWidth}
        onUndo={undoStroke}
        onSave={() => void handleSaveBothVersions()}
      />

      {saving && saveProgress && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 58,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.6,
            borderRadius: 2,
            bgcolor: 'rgba(22,24,28,0.92)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <CircularProgress size={14} sx={{ color: JOHNNY_PRESENTATION.warm }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>
            {saveProgress}
          </Typography>
        </Box>
      )}

      {!drawActive && (
        <Typography
          variant="caption"
          sx={{
            position: 'fixed',
            bottom: 6,
            right: 12,
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.62rem',
            pointerEvents: 'none',
          }}
        >
          Tippen links/rechts · Wischen · ✎ für Werkzeuge
        </Typography>
      )}

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
