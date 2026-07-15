import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, IconButton, Snackbar, Tooltip, Typography } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
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
  nextViewportScale,
  saveJsonFile,
  sortSlides,
} from '../lib/presentationDeck';
import { PresentationDrawTool, defaultLineWidthForTool, lineWidthsForTool } from '../lib/presentationDrawTools';
import { presentationLessonBackUrl } from '../lib/presentationEditorUi';
import { savePresentationBothVersions } from '../lib/presentationExport';
import { getSlideMaxRevealSteps } from '../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, resolveSlideTransitionAnimation } from '../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';

const SWIPE_MIN_PX = 48;
const EMPTY_STROKES: PresentationStroke[] = [];

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
  const [displayScale, setDisplayScale] = useState(0.5);
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

  const currentStrokes = useMemo(() => {
    if (!currentSlide) return EMPTY_STROKES;
    return annotations?.bySlideId[currentSlide.id] ?? EMPTY_STROKES;
  }, [annotations, currentSlide]);

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
    const target = presentationLessonBackUrl(lessonPath, groupId);
    window.close();
    navigate(target);
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
    const stroke = annotations?.bySlideId[currentSlide?.id ?? '']?.find((s) => s.id === selectedStrokeId);
    if (stroke) setLineWidth(stroke.lineWidth);
  }, [selectedStrokeId, annotations, currentSlide?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (drawActive) {
          setDrawActive(false);
          return;
        }
        handleBack();
        return;
      }
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
  }, [goNext, goPrev, drawActive, groupId, navigate]);

  const stageRef = useRef<HTMLDivElement>(null);
  const scaleReady = !loading && !!deck && !!annotations && !!currentSlide;

  useLayoutEffect(() => {
    if (!scaleReady) return;

    const updateScale = () => {
      const host = containerRef.current;
      if (!host) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 80) return;
      setDisplayScale((prev) => nextViewportScale(prev, width, height, 'present'));
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current!);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [scaleReady]);

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

  const displayH = SLIDE_REF_HEIGHT * displayScale;
  const displayW = SLIDE_REF_WIDTH * displayScale;

  const presentBackBtnSx = {
    position: 'fixed' as const,
    left: 'max(8px, env(safe-area-inset-left))',
    bottom: 'max(68px, calc(12px + env(safe-area-inset-bottom)))',
    zIndex: 30,
    width: 34,
    height: 34,
    p: 0,
    bgcolor: 'rgba(22,24,28,0.9)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: JOHNNY_PRESENTATION.warm,
    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
    '&:hover': { bgcolor: 'rgba(22,24,28,0.98)' },
  };

  return (
    <Box
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{
        height: '100dvh',
        width: '100vw',
        maxWidth: '100vw',
        bgcolor: '#000',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Tooltip title="Zurück zur Stunde">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleBack();
          }}
          aria-label="Zurück zur Stunde"
          sx={presentBackBtnSx}
        >
          <ArrowBackIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <Box
        ref={stageRef}
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: displayW,
            height: displayH,
            maxWidth: '100%',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <Box
            key={animKey}
            onClick={handleSlideTap}
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              animation: resolveSlideTransitionAnimation(transition),
              willChange: 'transform, opacity, filter',
              cursor: drawActive ? 'default' : 'pointer',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
              <Box
                sx={{
                  width: SLIDE_REF_WIDTH,
                  height: SLIDE_REF_HEIGHT,
                  transform: `scale(${displayScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <PresentationSlideView
                  slide={currentSlide}
                  scale={1}
                  revealStep={revealStep}
                  revealEnabled={currentSlide.revealEnabled !== false}
                  showSlideNumbers={deck?.showSlideNumbers !== false}
                  slideNumber={slideIndex + 1}
                  slideTotal={slides.length}
                  showSlideFooter={deck?.showSlideFooter !== false}
                  slideFooter={deck?.slideFooter}
                  deckTitle={deck?.title ?? ''}
                  lessonPath={deck?.lessonPath ?? lessonPath}
                  mediaInteractive={!drawActive}
                />
              </Box>
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
        </Box>
      </Box>

      {maxReveal > 0 && currentSlide.revealEnabled !== false && (
        <Typography
          sx={{
            position: 'fixed',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            fontSize: 11,
            color: 'rgba(255,255,255,0.72)',
            bgcolor: 'rgba(22,24,28,0.72)',
            px: 1.25,
            py: 0.35,
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        >
          Einblendung {revealStep}/{maxReveal}
        </Typography>
      )}

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
