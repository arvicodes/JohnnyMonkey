import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Snackbar, TextField, Tooltip, Typography } from '@mui/material';
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
  PresentationViewerVariant,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  createEmptyAnnotations,
  loadPresentationAnnotations,
  loadPresentationDeck,
  loadPresentationDeckForOriginalView,
  nextViewportScale,
  saveJsonFile,
  sortSlides,
  writeOriginalDeckSnapshot,
} from '../lib/presentationDeck';
import { PresentationDrawTool, defaultLineWidthForTool, lineWidthsForTool } from '../lib/presentationDrawTools';
import { presentationLessonBackUrl } from '../lib/presentationEditorUi';
import { savePresentationBothVersions, savePresentationNamedVersion } from '../lib/presentationExport';
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
  const viewerVariant: PresentationViewerVariant =
    params.get('variant') === 'original' ? 'original' : 'edited';
  const isOriginalView = viewerVariant === 'original';

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
  const [saveNamedOpen, setSaveNamedOpen] = useState(false);
  const [saveNamedLabel, setSaveNamedLabel] = useState('');
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
    let cancelled = false;
    // Original = Erstell-Stand OHNE Striche, aber mit Handles zum Neu-Bearbeiten
    // bearbeitet = Arbeitsdeck + gespeicherte Striche
    const loadDeck = isOriginalView
      ? loadPresentationDeckForOriginalView(lessonPath)
      : loadPresentationDeck(lessonPath);
    const loadAnn = isOriginalView
      ? Promise.resolve(null as PresentationAnnotations | null)
      : loadPresentationAnnotations(lessonPath);

    Promise.all([loadDeck, loadAnn])
      .then(async ([d, a]) => {
        if (cancelled) return;
        // Erstell-Stand einmalig einfrieren, bevor Live-Striche gespeichert werden
        if (d) {
          try {
            await writeOriginalDeckSnapshot(lessonPath, d, 'freeze');
          } catch {
            /* Freeze ist Best-Effort */
          }
        }
        if (cancelled) return;
        setDeck(d);
        setAnnotations(
          isOriginalView
            ? createEmptyAnnotations(lessonPath)
            : a ?? createEmptyAnnotations(lessonPath)
        );
        // Original öffnen → sofort zeichnen/Handles nutzbar (Folie bleibt erstmal blank)
        if (isOriginalView) {
          setDrawActive(true);
          setActiveTool('select');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonPath, isOriginalView]);

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
    if (!deck || saving) return;
    if (!annotations) {
      setSnackbar('Annotationen fehlen — bitte kurz warten und erneut speichern');
      return;
    }
    setSaving(true);
    setSaveProgress('Vorbereiten…');
    try {
      const ann = await flushAnnotations();
      if (!ann) throw new Error('Annotationen fehlen');
      const result = await savePresentationBothVersions(lessonPath, deck, ann, setSaveProgress);
      setSnackbar(
        result.originalFrozen
          ? `Gespeichert: Original (fixiert) + ${result.editedPdf} für SuS`
          : `Gespeichert: ${result.originalPdf} + ${result.editedPdf}`
      );
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  }, [annotations, deck, flushAnnotations, lessonPath, saving]);

  const handleSaveNamedVersion = useCallback(async () => {
    const label = saveNamedLabel.trim();
    if (!label || !deck || saving) return;
    if (!annotations) {
      setSnackbar('Annotationen fehlen — bitte kurz warten und erneut speichern');
      return;
    }
    setSaving(true);
    setSaveProgress('Vorbereiten…');
    try {
      const ann = await flushAnnotations();
      if (!ann) throw new Error('Annotationen fehlen');
      const result = await savePresentationNamedVersion(
        lessonPath,
        deck,
        ann,
        label,
        setSaveProgress
      );
      setSnackbar(
        result.namedPdf
          ? `Version gespeichert: ${result.namedPdf}`
          : `Gespeichert: ${result.editedPdf}`
      );
      setSaveNamedOpen(false);
      setSaveNamedLabel('');
    } catch (e) {
      console.error('Named presentation save failed', e);
      setSnackbar(e instanceof Error ? e.message : 'Version speichern fehlgeschlagen');
    } finally {
      setSaving(false);
      setSaveProgress('');
    }
  }, [annotations, deck, flushAnnotations, lessonPath, saveNamedLabel, saving]);

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
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (drawActive) {
          setDrawActive(false);
          return;
        }
        handleBack();
        return;
      }

      // Folien-Navigation auch mit aktivem Stift (Tablet-Modus)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setSlideIndex(0);
        setRevealStep(0);
        return;
      }
      if (e.key === 'End' && slides.length > 0) {
        e.preventDefault();
        const last = slides.length - 1;
        setSlideIndex(last);
        setRevealStep(getSlideMaxRevealSteps(slides[last]));
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [goNext, goPrev, drawActive, groupId, navigate, slides]);

  // Fokus auf die Bühne, damit Pfeiltasten sofort greifen
  useEffect(() => {
    if (loading) return;
    containerRef.current?.focus({ preventScroll: true });
  }, [loading]);

  const stageRef = useRef<HTMLDivElement>(null);
  const scaleReady = !loading && !!deck && !!annotations && !!currentSlide;

  useLayoutEffect(() => {
    if (!scaleReady) return;

    const measureStage = (host: HTMLElement) => {
      // content-box ohne Padding — sonst ist die Folie zu groß und die Fußzeile abgeschnitten
      const cs = getComputedStyle(host);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const width = Math.max(0, host.clientWidth - padX);
      const height = Math.max(0, host.clientHeight - padY);
      return { width, height };
    };

    const updateScale = () => {
      const host = stageRef.current;
      if (!host) return;
      const { width, height } = measureStage(host);
      if (width < 40 || height < 40) return;
      // 1px Sicherheitsabstand gegen Subpixel-Clipping der Fußzeile
      setDisplayScale((prev) => nextViewportScale(prev, width - 1, height - 1, 'present'));
    };

    updateScale();
    const host = stageRef.current;
    if (!host) return undefined;
    const ro = new ResizeObserver(() => updateScale());
    ro.observe(host);
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    // Nach Layout der Toolbar nochmals messen (iPad/safe-area)
    const raf = requestAnimationFrame(() => updateScale());
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
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
    position: 'absolute' as const,
    left: 'max(8px, env(safe-area-inset-left))',
    top: 'max(8px, env(safe-area-inset-top))',
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
      tabIndex={0}
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
        outline: 'none',
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
          alignItems: 'center',
          overflow: 'hidden',
          px: 0.5,
          py: 0.5,
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            width: displayW,
            height: displayH,
            maxWidth: '100%',
            maxHeight: '100%',
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
            position: 'absolute',
            // Über der docked Toolbar, nicht über der Folien-Fußzeile
            bottom: 'max(72px, calc(56px + env(safe-area-inset-bottom)))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 15,
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
        placement="docked"
        onGoPrev={goPrev}
        onGoNext={goNext}
        onToggleDraw={handleToggleDraw}
        onSelectTool={handleSelectTool}
        onSelectColor={setStrokeColor}
        onSelectLineWidth={handleSelectLineWidth}
        onUndo={undoStroke}
        onSave={() => void handleSaveBothVersions()}
        onSaveNamed={() => setSaveNamedOpen(true)}
      />

      <Dialog
        open={saveNamedOpen}
        onClose={() => !saving && setSaveNamedOpen(false)}
        maxWidth="xs"
        fullWidth
        // Über der Präsentations-Toolbar; Fortschritt im Dialog sichtbar
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle>Version speichern</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Speichert die aktuelle Bearbeitung unter einem Namen
            (z.&nbsp;B. „2026“ → Praesentation_2026.pdf). Im Stundenablauf erscheint
            Original | 2026 — gleiche Ansicht wie bisher „bearbeitet“, nur mit deinem Namen.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Zusatz im Dateinamen"
            value={saveNamedLabel}
            onChange={(e) => setSaveNamedLabel(e.target.value)}
            placeholder="z. B. Klasse5 oder mitNotizen"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && saveNamedLabel.trim() && !saving) {
                e.preventDefault();
                void handleSaveNamedVersion();
              }
            }}
          />
          {saving && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                {saveProgress || 'Speichern…'} (kann bei vielen Folien etwas dauern)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveNamedOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            disabled={!saveNamedLabel.trim() || saving}
            onClick={() => void handleSaveNamedVersion()}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {saving && saveProgress && !saveNamedOpen && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
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
            pointerEvents: 'none',
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
