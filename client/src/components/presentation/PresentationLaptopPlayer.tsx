import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight, SelfImprovement as QuietWorkIcon, MusicNote as MusicGameIcon } from '@mui/icons-material';
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
import {
  applyPlayVariantsToDeck,
  loadPresentationPlayVariants,
} from '../../lib/presentationPlayVariants';
import { getSlideMaxRevealSteps } from '../../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, resolveSlideTransitionAnimation } from '../../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';
import { hydrateNotesHtmlFontSizes } from '../../lib/presentationFontSize';
import { presentationNestedListSx, presentationNotesTableSx } from '../../lib/presentationListStyles';
import { presentationNotesImageViewSx } from '../../lib/presentationNotesImages';
import { isPresentationLinkClickTarget } from '../../lib/presentationRichText';
import { tryHandleLessonEntryTicketLinkClick, isLessonEntryTicketSlideHref } from '../../lib/presentationEditorUi';
import EntryTicketPage from '../../pages/EntryTicketPage';
import { ensureEntryTicketButtonsOnTitleSlides } from '../../lib/presentationSlideTemplates';
import { clampPresentZoomSmooth, handlePresentZoomHotkey, attachPresentTrackpadZoom, attachPresentTouchPinchZoom, centerPresentPan, panAfterPresentZoom, clampPresentPan, type PresentZoomOrigin } from '../../lib/presentationPresentZoom';
import PresentationPresentZoomControls from './PresentationPresentZoomControls';
import { PresentationSoundSplitControl } from './PresentationSoundControls';
import PresentationQuietWorkOverlay, {
  QuietWorkToolbarPanel,
  useQuietWorkController,
} from './PresentationQuietWorkOverlay';
import PresentationMusicGameOverlay, {
  MusicGameToolbarPanel,
  useMusicGameController,
} from './PresentationMusicGameOverlay';
import { tryPlayArmedStartSlideSound, unlockPresentationAudio } from '../../lib/presentationSound';
import '../../styles/presentationLists.css';

const LAPTOP_NOTES_SHARE_KEY = 'jm-laptop-notes-share';
const LAPTOP_NOTES_SHARE_DEFAULT = 0.52;
const LAPTOP_NOTES_SHARE_MIN = 0.22;
const LAPTOP_NOTES_SHARE_MAX = 0.78;

function readLaptopNotesShare(): number {
  try {
    const raw = Number(window.localStorage.getItem(LAPTOP_NOTES_SHARE_KEY));
    if (Number.isFinite(raw) && raw >= LAPTOP_NOTES_SHARE_MIN && raw <= LAPTOP_NOTES_SHARE_MAX) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return LAPTOP_NOTES_SHARE_DEFAULT;
}

const EMPTY_STROKES: PresentationStroke[] = [];
const EMPTY_ANNOTATIONS: PresentationAnnotations = {
  version: 1,
  lessonPath: '',
  updatedAt: '',
  bySlideId: {},
};

export type PresentationLaptopPlayerProps = {
  lessonPath: string;
  /** Lerngruppe — für Entry-Ticket-Link auf der Startfolie */
  groupId?: string;
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
  groupId,
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
  const [userZoom, setUserZoom] = useState(1);
  const userZoomRef = useRef(1);
  userZoomRef.current = userZoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  panRef.current = pan;
  const displayScaleRef = useRef(displayScale);
  displayScaleRef.current = displayScale;
  const panDragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);
  const didPanRef = useRef(false);
  const [panning, setPanning] = useState(false);
  const [entryTicketOpen, setEntryTicketOpen] = useState(false);
  const quietWork = useQuietWorkController();
  const musicGame = useMusicGameController();
  const stageHostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [notesShare, setNotesShare] = useState(readLaptopNotesShare);
  const notesDragRef = useRef<{ startY: number; startShare: number; rootH: number } | null>(null);

  const applyUserZoom = useCallback((next: number, origin?: PresentZoomOrigin) => {
    const clamped = clampPresentZoomSmooth(next);
    const host = stageHostRef.current;
    if (!host) {
      setUserZoom(clamped <= 1.001 ? 1 : clamped);
      return;
    }
    const hostW = host.clientWidth;
    const hostH = host.clientHeight;
    const slideW = SLIDE_REF_WIDTH * displayScaleRef.current;
    const slideH = SLIDE_REF_HEIGHT * displayScaleRef.current;
    if (clamped <= 1.001) {
      setUserZoom(1);
      setPan(centerPresentPan(hostW, hostH, slideW, slideH, 1));
      return;
    }
    const rect = host.getBoundingClientRect();
    const originInHost = origin
      ? { x: origin.clientX - rect.left, y: origin.clientY - rect.top }
      : { x: hostW / 2, y: hostH / 2 };
    const nextPan = clampPresentPan(
      panAfterPresentZoom({
        pan: panRef.current,
        oldZoom: Math.max(0.001, userZoomRef.current),
        newZoom: clamped,
        originInHost,
      }),
      hostW,
      hostH,
      slideW,
      slideH,
      clamped,
    );
    setUserZoom(clamped);
    setPan(nextPan);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!lessonPath) {
      setLoading(false);
      setError('Kein Stundenordner angegeben.');
      return undefined;
    }
    setLoading(true);
    setError(null);

    const apply = (
      d: PresentationDeck | null,
      a: PresentationAnnotations | null,
      err?: string,
      variants?: Awaited<ReturnType<typeof loadPresentationPlayVariants>> | null,
    ) => {
      if (cancelled) return;
      if (!d) {
        setError(err || 'Präsentation konnte nicht geladen werden.');
        setDeck(null);
        setAnnotations(EMPTY_ANNOTATIONS);
      } else {
        const withEntry = { ...d, slides: ensureEntryTicketButtonsOnTitleSlides(d.slides) };
        setDeck(
          variant === 'original' || namedSlug
            ? withEntry
            : applyPlayVariantsToDeck(withEntry, variants),
        );
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
        ? loadPresentationDeckForOriginalView(lessonPath).then((d) => [d, null, null] as const)
        : loadPresentationDeck(lessonPath).then(async (d) => {
            const a = await loadPresentationAnnotations(lessonPath);
            const variants = await loadPresentationPlayVariants(lessonPath);
            return [d, a, variants] as const;
          });

    load
      .then(([d, a, variants]) => {
        apply(
          d,
          variant === 'original' ? { ...EMPTY_ANNOTATIONS, lessonPath } : a,
          variant === 'original'
            ? 'Original-Version noch nicht gespeichert.'
            : 'Präsentation konnte nicht geladen werden.',
          variants,
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
      if (entryTicketOpen) return;
      if (quietWork.running || quietWork.finished) {
        if (e.key === 'Escape') {
          e.preventDefault();
          quietWork.stop();
        }
        return;
      }
      if (musicGame.running) {
        if (e.key === 'Escape') {
          e.preventDefault();
          musicGame.stop();
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (musicGame.frozen) musicGame.resume();
          else musicGame.freeze();
        }
        return;
      }
      if (handlePresentZoomHotkey(e, userZoom, applyUserZoom)) return;
      if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
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
  }, [goNext, goPrev, onClose, slides, userZoom, entryTicketOpen, applyUserZoom, quietWork, musicGame]);

  useEffect(() => {
    const host = rootRef.current;
    if (!host || loading) return undefined;
    const onClick = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      const a = t?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (a.getAttribute('data-pres-entry-ticket') !== '1' && !isLessonEntryTicketSlideHref(href)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setEntryTicketOpen(true);
    };
    host.addEventListener('click', onClick, true);
    return () => host.removeEventListener('click', onClick, true);
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    rootRef.current?.focus({ preventScroll: true });
  }, [loading]);

  const scaleReady = !loading && !!deck && !!currentSlide;

  useEffect(() => {
    if (loading || !deck || slideIndex !== 0 || disableAnimations || entryTicketOpen) return;
    const t = window.setTimeout(() => {
      tryPlayArmedStartSlideSound();
    }, 80);
    return () => window.clearTimeout(t);
  }, [loading, deck, slideIndex, disableAnimations, entryTicketOpen]);

  useLayoutEffect(() => {
    if (!scaleReady) return;
    const updateScale = () => {
      const host = stageHostRef.current;
      if (!host) return;
      // Embedded: schmaler schwarzer Rahmen, Folie füllt Restbreite — Notizen behalten Platz
      const framePad = embedded ? 12 : 0;
      const width = Math.max(40, host.clientWidth - framePad);
      const height = Math.max(40, host.clientHeight - framePad);
      if (width < 40) return;
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
  }, [scaleReady, embedded, notesShare]);

  // Trackpad-Pinch + Zwei-Finger-Pinch auf der Bühne
  useEffect(() => {
    if (!scaleReady) return undefined;
    const el = stageHostRef.current;
    const offWheel = attachPresentTrackpadZoom(el, userZoomRef, applyUserZoom);
    const offTouch = attachPresentTouchPinchZoom(el, userZoomRef, applyUserZoom);
    return () => {
      offWheel();
      offTouch();
    };
  }, [scaleReady, applyUserZoom]);

  useLayoutEffect(() => {
    const host = stageHostRef.current;
    if (!host || !scaleReady) return;
    const slideW = SLIDE_REF_WIDTH * displayScale;
    const slideH = SLIDE_REF_HEIGHT * displayScale;
    if (userZoomRef.current <= 1.001) {
      setPan(centerPresentPan(host.clientWidth, host.clientHeight, slideW, slideH, 1));
      return;
    }
    setPan((p) =>
      clampPresentPan(p, host.clientWidth, host.clientHeight, slideW, slideH, userZoomRef.current),
    );
  }, [scaleReady, displayScale, safeIndex]);

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (entryTicketOpen || userZoomRef.current <= 1.001) return;
    if (e.pointerType === 'pen') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest?.('[data-pres-zoom-controls], button, a, input, textarea')) return;
    if (panDragRef.current) {
      panDragRef.current = null;
      setPanning(false);
      return;
    }
    panDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      moved: false,
    };
    didPanRef.current = false;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onStagePointerMove = (e: React.PointerEvent) => {
    const drag = panDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    didPanRef.current = true;
    if (!panning) setPanning(true);
    const host = stageHostRef.current;
    if (!host) return;
    setPan(
      clampPresentPan(
        { x: drag.panX + dx, y: drag.panY + dy },
        host.clientWidth,
        host.clientHeight,
        SLIDE_REF_WIDTH * displayScaleRef.current,
        SLIDE_REF_HEIGHT * displayScaleRef.current,
        userZoomRef.current,
      ),
    );
  };

  const onStagePointerUp = () => {
    panDragRef.current = null;
    setPanning(false);
  };

  const handleSlideTap = (e: React.MouseEvent) => {
    if (entryTicketOpen) return;
    if (
      tryHandleLessonEntryTicketLinkClick(e, {
        lessonPath,
        groupId,
        autostart: true,
        onOpen: () => setEntryTicketOpen(true),
      })
    ) {
      return;
    }
    if (isPresentationLinkClickTarget(e.target)) return;
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    if (userZoomRef.current > 1.001) return;
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

  const zoomed = userZoom > 1.001;
  const fitW = SLIDE_REF_WIDTH * displayScale;
  const fitH = SLIDE_REF_HEIGHT * displayScale;
  const notesPanelMin = hideTeacherNotes ? 40 : embedded ? 160 : 64;
  const showNotes = !hideTeacherNotes;
  const stageSharePct = embedded ? `${((1 - notesShare) * 100).toFixed(2)}%` : undefined;

  const onNotesSplitPointerDown = (e: React.PointerEvent) => {
    if (!embedded) return;
    e.preventDefault();
    e.stopPropagation();
    const rootH = rootRef.current?.clientHeight || 1;
    notesDragRef.current = { startY: e.clientY, startShare: notesShare, rootH };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onNotesSplitPointerMove = (e: React.PointerEvent) => {
    const drag = notesDragRef.current;
    if (!drag) return;
    const next = Math.min(
      LAPTOP_NOTES_SHARE_MAX,
      Math.max(LAPTOP_NOTES_SHARE_MIN, drag.startShare - (e.clientY - drag.startY) / drag.rootH),
    );
    setNotesShare(next);
  };
  const onNotesSplitPointerUp = () => {
    if (!notesDragRef.current) return;
    notesDragRef.current = null;
    try {
      window.localStorage.setItem(LAPTOP_NOTES_SHARE_KEY, String(notesShare));
    } catch {
      /* ignore */
    }
  };
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
      onPointerDownCapture={() => {
        unlockPresentationAudio();
        if (slideIndex === 0 && !entryTicketOpen && !disableAnimations) {
          tryPlayArmedStartSlideSound();
        }
      }}
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
      {embedded && (
        <Box
          sx={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 0.25,
            px: 1,
            py: 0.35,
            minWidth: 0,
            overflow: 'visible',
            bgcolor: '#fff',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <IconButton
            size="small"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="Vorherige Folie"
            sx={{
              width: 28,
              height: 28,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronLeft sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.secondary',
              minWidth: 40,
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
              width: 28,
              height: 28,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronRight sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ ml: 0.5 }}>
            <PresentationPresentZoomControls
              zoom={userZoom}
              onZoomChange={applyUserZoom}
              variant="light"
              compact
            />
          </Box>
          <Box sx={{ ml: 0.25 }}>
            <PresentationSoundSplitControl variant="laptop" />
          </Box>
            <IconButton
              size="small"
              aria-label="Stillarbeit"
              onClick={quietWork.togglePicker}
              sx={{
                ml: 0.15,
                width: 28,
                height: 28,
                p: 0,
                color: quietWork.running || quietWork.pickerOpen ? '#2E7D32' : 'text.secondary',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
              }}
            >
              <QuietWorkIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Musikspiel"
              onClick={musicGame.togglePicker}
              sx={{
                width: 28,
                height: 28,
                p: 0,
                color: musicGame.running || musicGame.pickerOpen ? '#E65100' : 'text.secondary',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
              }}
            >
              <MusicGameIcon sx={{ fontSize: 18 }} />
            </IconButton>
        </Box>
      )}
      {/* Stage: dunkler Rahmen um die Folie; Embedded ohne großen Letterbox */}
      <Box
        ref={stageHostRef}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        sx={{
          flex: embedded ? `0 0 ${stageSharePct}` : '1 1 auto',
          minHeight: embedded ? 96 : 0,
          width: '100%',
          height: embedded ? 'auto' : undefined,
          position: 'relative',
          overflow: 'hidden',
          touchAction: 'none',
          cursor: zoomed ? (panning ? 'grabbing' : 'grab') : 'pointer',
          m: 0,
          p: 0,
          lineHeight: 0,
          bgcolor: '#111',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: fitW,
            height: fitH,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${userZoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
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
              cursor: 'inherit',
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
                  mediaInteractive={!zoomed}
                />
              </Box>
            </Box>
            <PresentationStrokesPreview strokes={strokes} scale={displayScale} />
          </Box>
        </Box>
        <PresentationQuietWorkOverlay quietWork={quietWork} />
        <PresentationMusicGameOverlay musicGame={musicGame} />
        {(musicGame.pickerOpen || quietWork.pickerOpen) && (
          <Box
            sx={{
              position: 'absolute',
              left: 8,
              bottom: 8,
              zIndex: 80,
              maxWidth: 'calc(100% - 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.6,
            }}
          >
            {musicGame.pickerOpen && <MusicGameToolbarPanel musicGame={musicGame} />}
            {quietWork.pickerOpen && <QuietWorkToolbarPanel quietWork={quietWork} />}
          </Box>
        )}
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

      {embedded && showNotes && (
        <Box
          role="separator"
          aria-label="Notizfeld-Höhe"
          aria-orientation="horizontal"
          onPointerDown={onNotesSplitPointerDown}
          onPointerMove={onNotesSplitPointerMove}
          onPointerUp={onNotesSplitPointerUp}
          onPointerCancel={onNotesSplitPointerUp}
          sx={{
            flex: '0 0 10px',
            cursor: 'row-resize',
            touchAction: 'none',
            bgcolor: '#f4f4f5',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { bgcolor: '#e8eaf6' },
            '&::after': {
              content: '""',
              width: 36,
              height: 3,
              borderRadius: 2,
              bgcolor: 'rgba(57, 73, 171, 0.35)',
            },
          }}
        />
      )}

      <Box
        sx={{
          // minHeight:0 + flexBasis:0: sonst wächst das Panel auf Bildhöhe,
          // Parent (overflow:hidden) clippt — Bild in den Notizen unsichtbar.
          flex: embedded && showNotes ? '1 1 0' : '0 0 auto',
          flexBasis: embedded && showNotes ? 0 : undefined,
          minHeight: embedded && showNotes ? notesPanelMin : notesPanelMin,
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
        {!embedded ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: showNotes ? 0.5 : 0 }}>
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
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: 'text.secondary',
              minWidth: 32,
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
              width: 22,
              height: 22,
              p: 0,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
            }}
          >
            <ChevronRight sx={{ fontSize: 16 }} />
          </IconButton>
          <Box sx={{ ml: 0.75 }}>
            <PresentationPresentZoomControls
              zoom={userZoom}
              onZoomChange={applyUserZoom}
              variant="light"
              compact={false}
            />
          </Box>
          <Box sx={{ ml: 0.35 }}>
            <PresentationSoundSplitControl variant="laptop" />
          </Box>
            <IconButton
              size="small"
              aria-label="Stillarbeit"
              onClick={quietWork.togglePicker}
              sx={{
                ml: 0.25,
                width: 22,
                height: 22,
                p: 0,
                color: quietWork.running || quietWork.pickerOpen ? '#2E7D32' : 'text.secondary',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
              }}
            >
              <QuietWorkIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Musikspiel"
              onClick={musicGame.togglePicker}
              sx={{
                ml: 0.15,
                width: 22,
                height: 22,
                p: 0,
                color: musicGame.running || musicGame.pickerOpen ? '#E65100' : 'text.secondary',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' },
              }}
            >
              <MusicGameIcon sx={{ fontSize: 16 }} />
            </IconButton>
          {showNotes && (
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.58rem',
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
        ) : (
          showNotes && (
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: 0.06,
                textTransform: 'uppercase',
                lineHeight: 1,
                mb: 0.5,
              }}
            >
              Notizen
            </Typography>
          )
        )}
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
                ...presentationNotesTableSx(),
                ...presentationNotesImageViewSx(),
                '& mark': { borderRadius: 0.5 },
                '& [data-pres-fs]': { lineHeight: 'inherit' },
                '& [data-pres-color]': { lineHeight: 'inherit' },
                '& [data-pres-highlight]': { lineHeight: 'inherit' },
                '& b, & strong': { fontWeight: 700 },
                '& i, & em': { fontStyle: 'italic' },
                '& u': { textDecoration: 'underline' },
                '& img': {
                  cursor: 'default',
                },
              }}
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

      {entryTicketOpen ? (
        <Box
          data-entry-ticket-open=""
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            bgcolor: '#f4f6fb',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <EntryTicketPage
            embeddedPlay={{
              lessonPath,
              groupId,
              onExit: () => {
                setEntryTicketOpen(false);
              },
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
}
