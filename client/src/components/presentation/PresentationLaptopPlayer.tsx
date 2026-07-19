import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, Close as CloseIcon } from '@mui/icons-material';
import PresentationSlideView from './PresentationSlideView';
import PresentationStrokesPreview from './PresentationStrokesPreview';
import {
  PresentationAnnotations,
  PresentationDeck,
  PresentationStroke,
  PresentationViewerVariant,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  loadPresentationAnnotations,
  loadPresentationDeck,
  loadPresentationDeckForOriginalView,
  loadOrMigrateNamedVersionSnapshot,
  sortSlides,
} from '../../lib/presentationDeck';
import { getSlideMaxRevealSteps } from '../../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, resolveSlideTransitionAnimation } from '../../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';

const EMPTY_STROKES: PresentationStroke[] = [];
const EMPTY_ANNOTATIONS: PresentationAnnotations = {
  version: 1,
  lessonPath: '',
  updatedAt: '',
  bySlideId: {},
};

export type PresentationLaptopPlayerProps = {
  lessonPath: string;
  /** Optional: schließen (zurück zum Stundenplan-Inhalt) */
  onClose?: () => void;
  /** Kompakte Einbettung in der linken Stunden-Spalte */
  embedded?: boolean;
  /** SuS-Ansicht: keine Einblendungs-Schritte, kein Folienübergang */
  disableAnimations?: boolean;
  /**
   * original = Erstell-Stand ohne Striche (SuS „Folien Original“)
   * edited = Live inkl. Annotationen (SuS „Folien bearbeitet“)
   */
  variant?: PresentationViewerVariant;
  /** Benannte eingefrorene Version (Slug, z. B. 2026_2) — unabhängig vom Live-Stand */
  namedSlug?: string;
};

/**
 * Laptop-Präsentation: optisch wie Tablet (PresentationSlideView),
 * mit Notizen und Pfeiltasten – für die linke Hälfte neben den SuS.
 */
export default function PresentationLaptopPlayer({
  lessonPath,
  onClose,
  embedded = false,
  disableAnimations = false,
  variant = 'edited',
  namedSlug,
}: PresentationLaptopPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [annotations, setAnnotations] = useState<PresentationAnnotations>(EMPTY_ANNOTATIONS);
  const [slideIndex, setSlideIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [displayScale, setDisplayScale] = useState(0.35);
  const stageHostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!lessonPath) {
      setLoading(false);
      setError('Kein Stundenordner angegeben.');
      return undefined;
    }
    setLoading(true);
    setError(null);

    const apply = (d: PresentationDeck | null, a: PresentationAnnotations | null, err?: string) => {
      if (cancelled) return;
      if (!d) {
        setError(err || 'Präsentation konnte nicht geladen werden.');
        setDeck(null);
        setAnnotations(EMPTY_ANNOTATIONS);
      } else {
        setDeck(d);
        setAnnotations(a ?? { ...EMPTY_ANNOTATIONS, lessonPath });
        setSlideIndex(0);
        setRevealStep(0);
      }
      setLoading(false);
    };

    if (namedSlug) {
      loadOrMigrateNamedVersionSnapshot(lessonPath, namedSlug)
        .then((snap) => {
          apply(
            snap?.deck ?? null,
            snap?.annotations ?? null,
            `Version „${namedSlug.replace(/_/g, ' ')}“ konnte nicht geladen werden.`
          );
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
          setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    const load =
      variant === 'original'
        ? Promise.all([
            loadPresentationDeckForOriginalView(lessonPath),
            Promise.resolve(null as PresentationAnnotations | null),
          ])
        : Promise.all([loadPresentationDeck(lessonPath), loadPresentationAnnotations(lessonPath)]);

    load
      .then(([d, a]) => {
        apply(
          d,
          variant === 'original' ? { ...EMPTY_ANNOTATIONS, lessonPath } : a,
          variant === 'original'
            ? 'Original-Version noch nicht gespeichert.'
            : 'Präsentation konnte nicht geladen werden.'
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonPath, variant, namedSlug]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRESENTATION_KEYFRAMES;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const slides = useMemo(() => (deck ? sortSlides(deck.slides) : []), [deck]);
  const safeIndex = slides.length === 0 ? 0 : Math.min(slideIndex, slides.length - 1);
  const currentSlide = slides[safeIndex];
  const maxReveal = disableAnimations
    ? 0
    : currentSlide
      ? getSlideMaxRevealSteps(currentSlide)
      : 0;
  const transition = currentSlide?.transition || deck?.defaultTransition || 'fade';
  const canGoPrev = safeIndex > 0 || (!disableAnimations && revealStep > 0);
  const canGoNext =
    safeIndex < slides.length - 1 || (!disableAnimations && revealStep < maxReveal);

  const strokes = useMemo(() => {
    if (!currentSlide) return EMPTY_STROKES;
    return annotations.bySlideId[currentSlide.id] ?? EMPTY_STROKES;
  }, [annotations, currentSlide]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [safeIndex]);

  const goNext = useCallback(() => {
    if (!disableAnimations && revealStep < maxReveal) {
      setRevealStep((s) => s + 1);
      return;
    }
    if (safeIndex < slides.length - 1) {
      setSlideIndex(safeIndex + 1);
      setRevealStep(0);
    }
  }, [disableAnimations, revealStep, maxReveal, safeIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (!disableAnimations && revealStep > 0) {
      setRevealStep((s) => s - 1);
      return;
    }
    if (safeIndex > 0) {
      const prevIdx = safeIndex - 1;
      setSlideIndex(prevIdx);
      setRevealStep(
        disableAnimations ? 0 : getSlideMaxRevealSteps(slides[prevIdx])
      );
    }
  }, [disableAnimations, revealStep, safeIndex, slides]);

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
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
  }, [goNext, goPrev, onClose, slides]);

  useEffect(() => {
    if (loading) return;
    rootRef.current?.focus({ preventScroll: true });
  }, [loading]);

  const scaleReady = !loading && !!deck && !!currentSlide;

  useLayoutEffect(() => {
    if (!scaleReady) return;
    const updateScale = () => {
      const host = stageHostRef.current;
      if (!host) return;
      // In verfügbaren Platz einpassen (Breite + Höhe), damit ToDo/Notizen nicht abgeschnitten werden
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width < 40 || height < 40) return;
      const next = Math.min(width / SLIDE_REF_WIDTH, height / SLIDE_REF_HEIGHT);
      setDisplayScale((prev) => (Math.abs(prev - next) < 1e-4 ? prev : next));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(stageHostRef.current!);
    window.addEventListener('resize', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [scaleReady, embedded]);

  const handleSlideTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < 0.28) goPrev();
    else goNext();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 240, bgcolor: '#111' }}>
        <CircularProgress sx={{ color: JOHNNY_PRESENTATION.primaryLight }} />
      </Box>
    );
  }

  if (error || !deck || !currentSlide) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error || 'Keine Präsentation.'}</Typography>
      </Box>
    );
  }

  const displayH = SLIDE_REF_HEIGHT * displayScale;
  const displayW = SLIDE_REF_WIDTH * displayScale;
  const notesPanelMin = embedded ? 56 : 64;
  const notesHtml = currentSlide.speakerNotesHtml?.trim();
  const hasHtmlNotes =
    !!notesHtml && notesHtml !== '<p></p>' && notesHtml !== '<p><br></p>';
  const plainNotes = currentSlide.speakerNotes?.trim() || '';

  return (
    <Box
      ref={rootRef}
      tabIndex={0}
      data-laptop-player
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        outline: 'none',
        overflow: 'hidden',
        position: 'relative',
        ...(embedded ? {} : { height: '100%', minHeight: '100dvh' }),
      }}
    >
      {onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Präsentation schließen"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 5,
            width: 28,
            height: 28,
            p: 0,
            color: 'rgba(255,255,255,0.9)',
            bgcolor: 'rgba(22,24,28,0.55)',
            border: '1px solid rgba(255,255,255,0.2)',
            '&:hover': { bgcolor: 'rgba(22,24,28,0.8)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Stage: restlicher Platz über ToDo/Notizen — Folie skaliert ein */}
      <Box
        ref={stageHostRef}
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          m: 0,
          p: 0,
          lineHeight: 0,
          bgcolor: '#111',
        }}
      >
        <Box sx={{ width: displayW || '100%', height: displayH || 'auto', overflow: 'hidden' }}>
          <Box
            key={animKey}
            onClick={handleSlideTap}
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              animation: disableAnimations
                ? undefined
                : resolveSlideTransitionAnimation(transition),
              willChange: disableAnimations ? undefined : 'transform, opacity, filter',
              cursor: 'pointer',
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
                  revealStep={disableAnimations ? 999 : revealStep}
                  revealEnabled={!disableAnimations && currentSlide.revealEnabled !== false}
                  showSlideNumbers={deck.showSlideNumbers !== false}
                  slideNumber={safeIndex + 1}
                  slideTotal={slides.length}
                  showSlideFooter={deck.showSlideFooter !== false}
                  slideFooter={deck.slideFooter}
                  deckTitle={deck.title ?? ''}
                  lessonPath={deck.lessonPath ?? lessonPath}
                  mediaInteractive
                />
              </Box>
            </Box>
            <PresentationStrokesPreview strokes={strokes} scale={displayScale} />
          </Box>
        </Box>
      </Box>

      {!disableAnimations && maxReveal > 0 && currentSlide.revealEnabled !== false && (
        <Typography
          sx={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            fontSize: 10,
            color: 'rgba(255,255,255,0.75)',
            bgcolor: 'rgba(22,24,28,0.72)',
            px: 1,
            py: 0.25,
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        >
          Einblendung {revealStep}/{maxReveal}
        </Typography>
      )}

      <Box
        sx={{
          flex: '0 0 auto',
          minHeight: notesPanelMin,
          maxHeight: embedded ? 100 : 140,
          overflowY: 'auto',
          bgcolor: '#fff',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          px: 1.25,
          py: 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.25 }}>
          <IconButton
            size="small"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="Vorherige Folie"
            sx={{
              width: 22,
              height: 22,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronLeft sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: 'text.secondary', minWidth: 32, textAlign: 'center', lineHeight: 1 }}>
            {safeIndex + 1}/{slides.length}
          </Typography>
          <IconButton
            size="small"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Nächste Folie"
            sx={{
              width: 22,
              height: 22,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronRight sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.58rem',
              fontWeight: 600,
              letterSpacing: 0.06,
              textTransform: 'uppercase',
              lineHeight: 1,
              ml: 0.5,
            }}
          >
            Notizen
          </Typography>
        </Box>
        {hasHtmlNotes ? (
          <Box
            sx={{
              fontSize: 13,
              lineHeight: 1.45,
              '& p': { m: 0, mb: 0.5 },
              '& mark': { borderRadius: 0.5 },
            }}
            dangerouslySetInnerHTML={{ __html: notesHtml! }}
          />
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.45 }}>
            {plainNotes || '—'}
          </Typography>
        )}
        {strokes.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Tablet: {strokes.length} Strich{strokes.length === 1 ? '' : 'e'} auf dieser Folie
          </Typography>
        )}
      </Box>
    </Box>
  );
}
