import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, Dialog, IconButton, Typography } from '@mui/material';
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
import { hydrateNotesHtmlFontSizes } from '../../lib/presentationFontSize';
import { presentationNestedListSx } from '../../lib/presentationListStyles';

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
  /** Lehrer-Notizen / Kommentare ausblenden (SuS) */
  hideTeacherNotes?: boolean;
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
  hideTeacherNotes = false,
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
  const [notesLightboxSrc, setNotesLightboxSrc] = useState<string | null>(null);
  const stageHostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const openNotesImageLightbox = useCallback((rawSrc: string) => {
    const src = rawSrc.trim();
    if (!src) return;
    // Vorschau oft mit max=960 — Lightbox so scharf wie der Server erlaubt
    const hi = src.replace(/([?&]max=)\d+/i, '$12400');
    setNotesLightboxSrc(hi);
  }, []);

  const onNotesHtmlClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const t = e.target;
      if (!(t instanceof HTMLImageElement)) return;
      e.preventDefault();
      e.stopPropagation();
      openNotesImageLightbox(t.currentSrc || t.src || t.getAttribute('src') || '');
    },
    [openNotesImageLightbox]
  );

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
      if (e.key === 'Escape') {
        if (notesLightboxSrc) {
          e.preventDefault();
          e.stopPropagation();
          setNotesLightboxSrc(null);
          return;
        }
        if (onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (notesLightboxSrc) return;
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
  }, [goNext, goPrev, onClose, slides, notesLightboxSrc]);

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
      // Embedded: schmaler schwarzer Rahmen, Folie füllt Restbreite — Notizen behalten Platz
      const framePad = embedded ? 16 : 0;
      const width = Math.max(40, host.clientWidth - framePad);
      if (width < 40) return;
      let next = width / SLIDE_REF_WIDTH;
      if (!embedded) {
        const height = host.clientHeight;
        if (height < 40) return;
        next = Math.min(width / SLIDE_REF_WIDTH, height / SLIDE_REF_HEIGHT);
      }
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
  const notesPanelMin = hideTeacherNotes ? 40 : embedded ? 120 : 64;
  const showNotes = !hideTeacherNotes;
  const notesHtml = showNotes ? currentSlide.speakerNotesHtml?.trim() : '';
  const hasHtmlNotes =
    !!notesHtml && notesHtml !== '<p></p>' && notesHtml !== '<p><br></p>';
  const plainNotes = showNotes ? currentSlide.speakerNotes?.trim() || '' : '';
  const displayNotesHtml = hasHtmlNotes ? hydrateNotesHtmlFontSizes(notesHtml!) : '';

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

      {/* Stage: dunkler Rahmen um die Folie; Embedded ohne großen Letterbox */}
      <Box
        ref={stageHostRef}
        sx={{
          flex: embedded ? '0 0 auto' : '1 1 auto',
          minHeight: 0,
          width: '100%',
          height: embedded && displayH > 0 ? displayH + 16 : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          m: 0,
          p: embedded ? '8px' : 0,
          lineHeight: 0,
          bgcolor: '#111',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            width: displayW || '100%',
            height: displayH || 'auto',
            overflow: 'hidden',
            borderRadius: 0.5,
            boxShadow: '0 2px 14px rgba(0,0,0,0.55)',
            outline: '1px solid rgba(255,255,255,0.14)',
            bgcolor: '#000',
          }}
        >
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
          // minHeight:0 + flexBasis:0: sonst wächst das Panel auf Bildhöhe,
          // Parent (overflow:hidden) clippt — Bild in den Notizen unsichtbar.
          flex: embedded && showNotes ? '1 1 0' : '0 0 auto',
          flexBasis: embedded && showNotes ? 0 : undefined,
          minHeight: embedded && showNotes ? 0 : notesPanelMin,
          maxHeight: hideTeacherNotes ? 48 : embedded ? 'none' : 140,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          bgcolor: '#fff',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          px: embedded ? 1.5 : 1.25,
          py: embedded ? 1.25 : 0.75,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: showNotes ? 0.5 : 0 }}>
          <IconButton
            size="small"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="Vorherige Folie"
            sx={{
              width: embedded ? 28 : 22,
              height: embedded ? 28 : 22,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronLeft sx={{ fontSize: embedded ? 20 : 16 }} />
          </IconButton>
          <Typography
            sx={{
              fontSize: embedded ? '0.75rem' : '0.62rem',
              fontWeight: 600,
              color: 'text.secondary',
              minWidth: embedded ? 40 : 32,
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            {safeIndex + 1}/{slides.length}
          </Typography>
          <IconButton
            size="small"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Nächste Folie"
            sx={{
              width: embedded ? 28 : 22,
              height: embedded ? 28 : 22,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronRight sx={{ fontSize: embedded ? 20 : 16 }} />
          </IconButton>
          {showNotes && (
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: embedded ? '0.72rem' : '0.58rem',
                fontWeight: 700,
                letterSpacing: 0.06,
                textTransform: 'uppercase',
                lineHeight: 1,
                ml: 0.5,
              }}
            >
              Notizen
            </Typography>
          )}
        </Box>
        {showNotes &&
          (hasHtmlNotes ? (
            <Box
              sx={{
                // Basis wie Editor-Notizfeld; individuelle Größen via data-pres-fs / inline
                fontSize: 13,
                lineHeight: 1.55,
                color: 'text.primary',
                wordBreak: 'break-word',
                '& p, & div': { m: 0, mb: 0.5, ml: 0, pl: 0, textIndent: 0 },
                '& blockquote': {
                  m: 0,
                  mb: 0.5,
                  ml: 0,
                  pl: '0.75em',
                  borderLeft: '2px solid #ccc',
                },
                '& li > p': { display: 'block', listStyle: 'none' },
                ...presentationNestedListSx({
                  scale: 1,
                  listPaddingPx: '1.25em',
                  itemGapPx: 2,
                  listGapPx: 4,
                }),
                '& mark': { borderRadius: 0.5 },
                '& [data-pres-fs]': { lineHeight: 'inherit' },
                '& [data-pres-color]': { lineHeight: 'inherit' },
                '& [data-pres-highlight]': { lineHeight: 'inherit' },
                '& b, & strong': { fontWeight: 700 },
                '& i, & em': { fontStyle: 'italic' },
                '& u': { textDecoration: 'underline' },
                '& img, & img[data-pres-notes-img]': {
                  maxWidth: '100%',
                  maxHeight: embedded ? 240 : 110,
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  my: 1,
                  borderRadius: 0.75,
                  cursor: 'zoom-in',
                  transition: 'opacity 0.15s ease',
                  '&:hover': { opacity: 0.92 },
                },
              }}
              onClick={onNotesHtmlClick}
              dangerouslySetInnerHTML={{ __html: displayNotesHtml }}
            />
          ) : (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {plainNotes || '—'}
            </Typography>
          ))}
        {showNotes && strokes.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Tablet: {strokes.length} Strich{strokes.length === 1 ? '' : 'e'} auf dieser Folie
          </Typography>
        )}
      </Box>

      <Dialog
        open={!!notesLightboxSrc}
        onClose={() => setNotesLightboxSrc(null)}
        maxWidth={false}
        fullWidth
        // Über Laptop-Spalte (oft modal+1) und andere Overlays legen
        sx={{ zIndex: 20000 }}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(10,12,16,0.92)', zIndex: 20000 } },
        }}
        PaperProps={{
          sx: {
            m: 0,
            width: '100vw',
            maxWidth: '100vw',
            height: '100vh',
            maxHeight: '100vh',
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
            zIndex: 20001,
            borderRadius: 0,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0.5,
            boxSizing: 'border-box',
          }}
          onClick={() => setNotesLightboxSrc(null)}
        >
          <IconButton
            size="small"
            onClick={() => setNotesLightboxSrc(null)}
            aria-label="Schließen"
            sx={{
              position: 'fixed',
              top: 8,
              right: 8,
              zIndex: 20002,
              width: 22,
              height: 22,
              p: 0,
              color: 'rgba(255,255,255,0.92)',
              bgcolor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.22)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
          {notesLightboxSrc && (
            <Box
              component="img"
              src={notesLightboxSrc}
              alt=""
              onClick={(e) => e.stopPropagation()}
              sx={{
                maxWidth: '98vw',
                maxHeight: '98vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 0.5,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                cursor: 'zoom-out',
              }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
}
