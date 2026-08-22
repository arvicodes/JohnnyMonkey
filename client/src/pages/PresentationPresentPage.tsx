import React, { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Snackbar, TextField, Tooltip, Typography } from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import PresentationDrawOverlay from '../components/presentation/PresentationDrawOverlay';
import PresentationTabletToolbar from '../components/presentation/PresentationTabletToolbar';
import PresentationRandomStudentOverlay from '../components/presentation/PresentationRandomStudentOverlay';
import PresentationQuietWorkOverlay, {
  useQuietWorkController,
} from '../components/presentation/PresentationQuietWorkOverlay';
import PresentationMusicGameOverlay, {
  useMusicGameController,
} from '../components/presentation/PresentationMusicGameOverlay';
import {
  ANNOTATIONS_FILENAME,
  DECK_FILENAME,
  PresentationAnnotations,
  PresentationDeck,
  PresentationStroke,
  PresentationViewerVariant,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  SlideElement,
  createEmptyAnnotations,
  lessonFolderPath,
  loadOrMigrateNamedVersionSnapshot,
  loadPresentationAnnotations,
  loadPresentationDeck,
  loadPresentationDeckForOriginalView,
  nextViewportScale,
  saveJsonFile,
  sortSlides,
  writeNamedVersionSnapshot,
  writeOriginalDeckSnapshot,
  parsePresentationPlanMode,
} from '../lib/presentationDeck';
import { PresentationDrawTool, DEFAULT_MARKER_COLOR, DEFAULT_MARKER_OPACITY, DEFAULT_PEN_COLOR, defaultColorForTool, defaultLineWidthForTool, lineWidthsForTool, toolUsesColor } from '../lib/presentationDrawTools';
import { presentationLessonBackUrl, tryHandleLessonEntryTicketLinkClick, isLessonEntryTicketSlideHref } from '../lib/presentationEditorUi';
import { markLessonPlayed } from '../lib/playedLessons';
import { savePresentationBothVersions, savePresentationNamedVersion, exportPresentationPdfVersions } from '../lib/presentationExport';
import { getSlideMaxRevealSteps } from '../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, resolveSlideTransitionAnimation } from '../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import { isPresentationLinkClickTarget } from '../lib/presentationRichText';
import { clampPresentZoomSmooth, handlePresentZoomHotkey, attachPresentTrackpadZoom, attachPresentTouchPinchZoom, centerPresentPan, panAfterPresentZoom, clampPresentPan, type PresentZoomOrigin } from '../lib/presentationPresentZoom';
import { ensureEntryTicketButtonsOnTitleSlides } from '../lib/presentationSlideTemplates';
import { tryPlayArmedStartSlideSound, unlockPresentationAudio } from '../lib/presentationSound';
import { markTeacherWantsDashboard } from '../lib/teacherLiveLesson';
import {
  attachPresentViewportFill,
  exitPresentFullscreen,
  freezePresentViewport,
  isAnyNativeFullscreen,
  isIosSafariLike,
  requestPresentFullscreen,
} from '../lib/presentationPresentFullscreen';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import {
  ensureWindowCropLock,
  isImageCropMode,
  isWindowCropMode,
  readImageNaturalSize,
  scaleImageFromCenter,
  slidePercentSizeForImage,
} from '../lib/presentationImageUtils';
import EntryTicketPage from './EntryTicketPage';

const SWIPE_MIN_PX = 48;
const EMPTY_STROKES: PresentationStroke[] = [];

function PresentFullscreenPortals({
  host,
  children,
}: {
  host: HTMLElement | null;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const nested = useMemo(
    () =>
      createTheme(theme, {
        components: {
          MuiModal: {
            defaultProps: {
              container: () => host || document.body,
            },
          },
          MuiPopover: {
            defaultProps: {
              container: () => host || document.body,
            },
          },
        },
      }),
    [theme, host],
  );
  return <ThemeProvider theme={nested}>{children}</ThemeProvider>;
}

const PresentationPresentPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const groupId = params.get('groupId') || '';
  const namedSlug = (params.get('named') || '').trim();
  const isNamedView = Boolean(namedSlug);
  const viewerVariant: PresentationViewerVariant =
    params.get('variant') === 'original' ? 'original' : 'edited';
  const isOriginalView = !isNamedView && viewerVariant === 'original';
  const planMode = parsePresentationPlanMode(params.get('planMode'));

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [annotations, setAnnotations] = useState<PresentationAnnotations | null>(null);
  const [namedLabel, setNamedLabel] = useState('');
  const [slideIndex, setSlideIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [drawActive, setDrawActive] = useState(false);
  const [activeTool, setActiveTool] = useState<PresentationDrawTool>('pen');
  const [strokeColor, setStrokeColor] = useState(DEFAULT_PEN_COLOR);
  const penColorRef = useRef(DEFAULT_PEN_COLOR);
  const markerColorRef = useRef(DEFAULT_MARKER_COLOR);
  const [lineWidth, setLineWidth] = useState(3);
  const [markerOpacity, setMarkerOpacity] = useState(DEFAULT_MARKER_OPACITY);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [saveNamedOpen, setSaveNamedOpen] = useState(false);
  const [clearInkOpen, setClearInkOpen] = useState(false);
  const [entryTicketOpen, setEntryTicketOpen] = useState(false);
  const openEntryTicket = useCallback(() => {
    freezePresentViewport(true);
    setEntryTicketOpen(true);
  }, []);
  const closeEntryTicket = useCallback(() => {
    setEntryTicketOpen(false);
    freezePresentViewport(false);
  }, []);
  const quietWork = useQuietWorkController();
  const musicGame = useMusicGameController();
  const [saveNamedLabel, setSaveNamedLabel] = useState('');
  const [displayScale, setDisplayScale] = useState(0.5);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** Pinch auf leerer Folie zoomt die Bühne; bei gewähltem Foto das Foto. */
  const pinchEnabledRef = useRef(true);
  pinchEnabledRef.current = !selectedElementId;

  const applyUserZoom = useCallback((next: number, origin?: PresentZoomOrigin) => {
    const clamped = clampPresentZoomSmooth(next);
    const host = stageRef.current;
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
  const [groupStudents, setGroupStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [revealText, setRevealText] = useState<string | null>(null);
  const [revealNonce, setRevealNonce] = useState(0);
  const lastPickedStudentIdRef = useRef<string | null>(null);
  const lastPickedNumberRef = useRef<{ max: number; value: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const [nativeFs, setNativeFs] = useState(() => isAnyNativeFullscreen());
  /** Letzter gesicherter Stand der aktuellen benannten Version (für Speichern als…). */
  const namedBaselineRef = useRef<PresentationAnnotations | null>(null);
  const annotationsRef = useRef<PresentationAnnotations | null>(null);
  annotationsRef.current = annotations;

  const slides = useMemo(() => (deck ? sortSlides(deck.slides) : []), [deck]);
  const currentSlide = slides[slideIndex];
  const maxReveal = currentSlide ? getSlideMaxRevealSteps(currentSlide) : 0;
  const transition = currentSlide?.transition || deck?.defaultTransition || 'fade';
  const canGoPrev = slideIndex > 0 || revealStep > 0;
  const canAdvanceSlide = slideIndex < slides.length - 1 || revealStep < maxReveal;
  const canFinishToDashboard = planMode === 'run' && slides.length > 0 && !canAdvanceSlide;
  const canGoNext = canAdvanceSlide || canFinishToDashboard;

  useEffect(() => {
    if (!lessonPath) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const finish = (
      d: PresentationDeck | null,
      a: PresentationAnnotations | null,
      opts?: { draw?: boolean; label?: string }
    ) => {
      if (cancelled) return;
      const deckWithEntry = d
        ? { ...d, slides: ensureEntryTicketButtonsOnTitleSlides(d.slides) }
        : null;
      setDeck(deckWithEntry);
      const ann = a ?? createEmptyAnnotations(lessonPath);
      setAnnotations(ann);
      // Baseline = Stand auf Disk — Speichern als… stellt danach wieder her
      namedBaselineRef.current = namedSlug
        ? {
            ...ann,
            bySlideId: { ...ann.bySlideId },
            updatedAt: ann.updatedAt,
          }
        : null;
      setNamedLabel(opts?.label || '');
      if (opts?.draw) {
        setDrawActive(true);
        setActiveTool('select');
      } else {
        setDrawActive(false);
      }
      setLoading(false);
    };

    // Benannte Version = gleiche Present-Ansicht wie Original, inkl. gespeicherter Bearbeitungen
    if (namedSlug) {
      loadOrMigrateNamedVersionSnapshot(lessonPath, namedSlug)
        .then((snap) => {
          if (cancelled) return;
          if (!snap) {
            setSnackbar(`Version „${namedSlug.replace(/_/g, ' ')}“ konnte nicht geladen werden.`);
            finish(null, null);
            return;
          }
          // Wie Original: Handles/Werkzeuge an, mit Strichen der Version
          finish(snap.deck, snap.annotations, { draw: true, label: snap.label });
        })
        .catch(() => {
          if (!cancelled) finish(null, null);
        });
      return () => {
        cancelled = true;
      };
    }

    // Original = Erstell-Stand OHNE Striche, aber mit Handles zum Neu-Bearbeiten
    // bearbeitet = Arbeitsdeck + gespeicherte Striche
    const loadDeck = isOriginalView
      ? loadPresentationDeckForOriginalView(lessonPath)
      : loadPresentationDeck(lessonPath);
    const loadAnn = isOriginalView
      ? Promise.resolve(null as PresentationAnnotations | null)
      : loadPresentationAnnotations(lessonPath);

    Promise.all([loadDeck, loadAnn])
      .then(([d, a]) => {
        if (cancelled) return;
        // Kein Auto-Freeze beim Öffnen: Live-Deck darf Original nicht überschreiben,
        // und Original-Sichern bleibt die einzige Schreibstelle fürs Original.
        finish(
          d,
          isOriginalView
            ? createEmptyAnnotations(lessonPath)
            : a ?? createEmptyAnnotations(lessonPath),
          { draw: isOriginalView }
        );
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonPath, isOriginalView, namedSlug]);

  useEffect(() => {
    const host = containerRef.current;
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
      openEntryTicket();
    };
    host.addEventListener('click', onClick, true);
    return () => host.removeEventListener('click', onClick, true);
  }, [loading, openEntryTicket]);

  useEffect(() => () => freezePresentViewport(false), []);

  useLayoutEffect(() => {
    if (!lessonPath) return undefined;
    const stop = attachPresentViewportFill(containerRef.current);
    const syncFs = () => setNativeFs(isAnyNativeFullscreen());
    syncFs();
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange' as 'fullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange' as 'fullscreenchange', syncFs);
      stop();
      exitPresentFullscreen();
    };
  }, [lessonPath]);

  useEffect(() => {
    setAnimKey((k) => k + 1);
    setSelectedStrokeIds([]);
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
      if (!lessonPath || !deck) return;
      try {
        // Benannte Version: erst bei „Sichern“ auf Disk — sonst würde Speichern als…
        // die aktuelle Version schon per Autosave mitändern.
        if (isNamedView && namedSlug) {
          setAnnotations(next);
          return;
        }
        // Original: Striche nur im Speicher — gehören zu „Speichern als…“
        if (isOriginalView) {
          setAnnotations(next);
          return;
        }
        const payload = { ...next, updatedAt: new Date().toISOString() };
        await saveJsonFile(lessonPath, ANNOTATIONS_FILENAME, payload);
        setAnnotations(payload);
      } catch {
        setSnackbar('Annotationen konnten nicht gespeichert werden');
      }
    },
    [deck, isNamedView, isOriginalView, lessonPath, namedSlug]
  );

  const currentSlideIdRef = useRef<string | undefined>(undefined);
  currentSlideIdRef.current = currentSlide?.id;

  useEffect(() => {
    setSelectedStrokeIds([]);
    setSelectedElementId(null);
  }, [slideIndex]);
  const isNamedViewRef = useRef(isNamedView);
  isNamedViewRef.current = isNamedView;
  const isOriginalViewRef = useRef(isOriginalView);
  isOriginalViewRef.current = isOriginalView;

  const updateStrokes = useCallback((strokes: PresentationStroke[]) => {
    const slideId = currentSlideIdRef.current;
    const base = annotationsRef.current;
    if (!slideId || !base) return;
    const next: PresentationAnnotations = {
      ...base,
      bySlideId: { ...base.bySlideId, [slideId]: strokes },
    };
    // Sofort für Flush/Persist — setState nicht den Pencil blockieren
    annotationsRef.current = next;
    startTransition(() => setAnnotations(next));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isNamedViewRef.current || isOriginalViewRef.current) return;
    saveTimer.current = setTimeout(() => void persistAnnotations(next), 1600);
  }, [persistAnnotations]);

  const persistDeckSoon = useCallback(
    (next: PresentationDeck, failMessage: string) => {
      if (isNamedViewRef.current || isOriginalViewRef.current || !lessonPath) return;
      if (deckSaveTimer.current) clearTimeout(deckSaveTimer.current);
      deckSaveTimer.current = setTimeout(() => {
        void saveJsonFile(lessonPath, DECK_FILENAME, next).catch(() => {
          setSnackbar(failMessage);
        });
      }, 400);
    },
    [lessonPath],
  );

  const deletePlayPhoto = useCallback(
    (id: string) => {
      setDeck((prev) => {
        if (!prev) return prev;
        const slideId = currentSlideIdRef.current;
        if (!slideId) return prev;
        const next: PresentationDeck = {
          ...prev,
          slides: prev.slides.map((s) =>
            s.id !== slideId ? s : { ...s, elements: (s.elements || []).filter((el) => el.id !== id) },
          ),
        };
        persistDeckSoon(next, 'Foto gelöscht — bitte noch Sichern tippen.');
        return next;
      });
      setSelectedElementId(null);
      setSnackbar('Foto gelöscht');
    },
    [persistDeckSoon],
  );

  const movePlayPhotoToSlide = useCallback(
    (elementId: string, targetSlideId: string) => {
      const sourceId = currentSlideIdRef.current;
      if (!sourceId || sourceId === targetSlideId) return;
      setDeck((prev) => {
        if (!prev) return prev;
        const source = prev.slides.find((s) => s.id === sourceId);
        const element = source?.elements?.find((el) => el.id === elementId);
        if (!element) return prev;
        const next: PresentationDeck = {
          ...prev,
          slides: prev.slides.map((s) => {
            if (s.id === sourceId) {
              return { ...s, elements: (s.elements || []).filter((el) => el.id !== elementId) };
            }
            if (s.id === targetSlideId) {
              return {
                ...s,
                elements: [...(s.elements || []), { ...element, zIndex: (s.elements?.length ?? 0) + 1 }],
              };
            }
            return s;
          }),
        };
        persistDeckSoon(next, 'Foto verschoben — bitte noch Sichern tippen.');
        return next;
      });
      const idx = slides.findIndex((s) => s.id === targetSlideId);
      setSnackbar(idx >= 0 ? `Foto auf Folie ${idx + 1}` : 'Foto auf andere Folie gelegt');
      if (idx >= 0) setSlideIndex(idx);
    },
    [persistDeckSoon, slides],
  );

  const updateSlideElement = useCallback((id: string, patch: Partial<SlideElement>) => {
    setDeck((prev) => {
      if (!prev) return prev;
      const slideId = currentSlideIdRef.current;
      if (!slideId) return prev;
      const next: PresentationDeck = {
        ...prev,
        slides: prev.slides.map((s) =>
          s.id !== slideId
            ? s
            : {
                ...s,
                elements: (s.elements || []).map((el) => (el.id === id ? { ...el, ...patch } : el)),
              }
        ),
      };
      persistDeckSoon(next, 'Foto-Änderung nicht gespeichert — bitte Sichern tippen.');
      return next;
    });
  }, [persistDeckSoon]);

  const insertPlayPhoto = useCallback(
    async (file: File) => {
      if (!lessonPath || isOriginalView || isNamedView) return;
      const slideId = currentSlideIdRef.current;
      if (!slideId) return;
      setPhotoBusy(true);
      try {
        const folder = lessonFolderPath(lessonPath);
        const rawName = (file.name || 'foto.jpg').replace(/[^\w.\-äöüÄÖÜß]+/gi, '_');
        const named = new File([file], `play-foto-${Date.now()}-${rawName}`, {
          type: file.type || 'image/jpeg',
        });
        const formData = new FormData();
        formData.append('file', named);
        formData.append('targetPath', folder);
        const res = await fetch('/api/file-system-paths/save-file', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Foto konnte nicht gespeichert werden');
        const data = (await res.json()) as { path?: string; filename?: string };
        const path = (
          data.path && data.path.trim()
            ? data.path
            : `${folder}/${(data.filename || named.name).split('/').pop()}`
        ).replace(/\\/g, '/');

        const natural = await readImageNaturalSize(named);
        const size = slidePercentSizeForImage(natural.w, natural.h);
        const x = Math.max(4, (100 - size.w) / 2);
        const y = Math.max(8, (88 - size.h) / 2);

        const el: SlideElement = {
          id: `el-${Date.now()}`,
          type: 'image',
          x,
          y,
          w: size.w,
          h: size.h,
          src: path,
          zIndex: 80,
          imageFit: 'contain',
          stackLayer: 'foreground',
        };

        setDeck((prev) => {
          if (!prev) return prev;
          const next: PresentationDeck = {
            ...prev,
            slides: prev.slides.map((s) =>
              s.id !== slideId
                ? s
                : {
                    ...s,
                    elements: [
                      ...(s.elements || []),
                      { ...el, zIndex: (s.elements?.length ?? 0) + 1 },
                    ],
                  },
            ),
          };
          void saveJsonFile(lessonPath, DECK_FILENAME, next).catch(() => {
            setSnackbar('Foto ist auf der Folie — bitte noch Sichern tippen.');
          });
          return next;
        });
        setSelectedElementId(el.id);
        setSnackbar('Foto: ziehen · Kanten abschneiden · Ecken oder zwei Finger größer/kleiner');
      } catch (e) {
        setSnackbar(e instanceof Error ? e.message : 'Foto fehlgeschlagen');
      } finally {
        setPhotoBusy(false);
      }
    },
    [isNamedView, isOriginalView, lessonPath],
  );

  const selectedSlideElement =
    currentSlide?.elements?.find((el) => el.id === selectedElementId) ?? null;
  const selectedImageForCrop = selectedSlideElement?.type === 'image' ? selectedSlideElement : null;

  const toggleSelectedImageCrop = useCallback(() => {
    if (!selectedImageForCrop) return;
    if (isWindowCropMode(selectedImageForCrop)) {
      const src = selectedImageForCrop.imageSourceRect;
      updateSlideElement(selectedImageForCrop.id, {
        imageFit: 'contain',
        imageSourceRect: undefined,
        imageObjectPosition: undefined,
        ...(src ? { x: src.x, y: src.y, w: src.w, h: src.h } : {}),
      });
      return;
    }
    updateSlideElement(selectedImageForCrop.id, ensureWindowCropLock(selectedImageForCrop));
  }, [selectedImageForCrop, updateSlideElement]);

  const selectedImageRef = useRef(selectedImageForCrop);
  selectedImageRef.current = selectedImageForCrop;
  const updateSlideElementRef = useRef(updateSlideElement);
  updateSlideElementRef.current = updateSlideElement;

  useEffect(() => {
    const host = stageRef.current;
    if (!host || !selectedImageForCrop) return;
    let startDist = 0;
    let startEl = selectedImageForCrop;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) {
        startDist = 0;
        return;
      }
      const a = e.touches[0];
      const b = e.touches[1];
      const hitA = document.elementFromPoint(a.clientX, a.clientY);
      const hitB = document.elementFromPoint(b.clientX, b.clientY);
      const onPhoto =
        hitA?.closest?.('[data-pres-element-type="image"]') ||
        hitB?.closest?.('[data-pres-element-type="image"]');
      if (!onPhoto) {
        startDist = 0;
        return;
      }
      const current = selectedImageRef.current;
      if (!current) {
        startDist = 0;
        return;
      }
      startEl = current;
      startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onMove = (e: TouchEvent) => {
      if (startDist < 8 || e.touches.length !== 2) return;
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (d < 1) return;
      updateSlideElementRef.current(startEl.id, scaleImageFromCenter(startEl, d / startDist));
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0;
    };
    host.addEventListener('touchstart', onStart, { capture: true, passive: true });
    host.addEventListener('touchmove', onMove, { capture: true, passive: false });
    host.addEventListener('touchend', onEnd, { capture: true, passive: true });
    host.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
    return () => {
      host.removeEventListener('touchstart', onStart, true);
      host.removeEventListener('touchmove', onMove, true);
      host.removeEventListener('touchend', onEnd, true);
      host.removeEventListener('touchcancel', onEnd, true);
    };
  }, [selectedImageForCrop]);

  const flushAnnotations = useCallback(async (): Promise<PresentationAnnotations | null> => {
    const current = annotationsRef.current;
    if (!current || !lessonPath || !deck) return null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const payload = { ...current, updatedAt: new Date().toISOString() };
    if (isNamedView && namedSlug) {
      // Sichern schreibt die benannte Version — flush allein noch nicht (Sichern macht das)
      setAnnotations(payload);
      return payload;
    }
    if (isOriginalView) {
      setAnnotations(payload);
      return payload;
    }
    await saveJsonFile(lessonPath, ANNOTATIONS_FILENAME, payload);
    setAnnotations(payload);
    return payload;
  }, [deck, isNamedView, isOriginalView, lessonPath, namedSlug]);

  const handleSaveBothVersions = useCallback(async () => {
    if (!deck || saving) return;
    const currentAnn = annotationsRef.current;
    if (!currentAnn) {
      setSnackbar('Annotationen fehlen — bitte kurz warten und erneut speichern');
      return;
    }
    // Sichern: nur die aktuell geöffnete Version aktualisieren
    if (isNamedView && namedSlug) {
      setSaving(true);
      setSaveProgress('Sichern…');
      try {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        const ann = { ...currentAnn, updatedAt: new Date().toISOString() };
        const label = namedLabel || namedSlug.replace(/_/g, ' ');
        await writeNamedVersionSnapshot(lessonPath, label, namedSlug, deck, ann);
        namedBaselineRef.current = {
          ...ann,
          bySlideId: { ...ann.bySlideId },
        };
        setAnnotations(ann);
        setSaveProgress('PDF…');
        const result = await exportPresentationPdfVersions(lessonPath, deck, ann, setSaveProgress, {
          namedOnly: true,
          namedLabel: label,
        });
        setSnackbar(
          result.namedPdf
            ? `Version „${label}“ gesichert (${result.namedPdf})`
            : `Version „${label}“ gesichert`
        );
        setSaving(false);
        setSaveProgress('');
      } catch (e) {
        setSnackbar(e instanceof Error ? e.message : 'Sichern fehlgeschlagen');
        setSaving(false);
        setSaveProgress('');
      }
      return;
    }
    if (isOriginalView) {
      setSaving(true);
      setSaveProgress('Original sichern…');
      try {
        const originalSnapshot = await writeOriginalDeckSnapshot(lessonPath, deck, 'freeze');
        setSnackbar('Original gesichert');
        setSaving(false);
        setSaveProgress('');
        void exportPresentationPdfVersions(
          lessonPath,
          deck,
          createEmptyAnnotations(lessonPath),
          undefined,
          { originalDeck: originalSnapshot, originalOnly: true }
        ).catch((e) => console.warn('Original PDF export failed', e));
      } catch (e) {
        setSnackbar(e instanceof Error ? e.message : 'Sichern fehlgeschlagen');
        setSaving(false);
        setSaveProgress('');
      }
      return;
    }
    setSaving(true);
    setSaveProgress('Sichern…');
    try {
      const ann = await flushAnnotations();
      if (!ann) throw new Error('Annotationen fehlen');
      setSnackbar('Gesichert');
      setSaving(false);
      setSaveProgress('');
      void savePresentationBothVersions(lessonPath, deck, ann).catch((e) => {
        console.warn('Live PDF export after save failed', e);
      });
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Sichern fehlgeschlagen');
      setSaving(false);
      setSaveProgress('');
    }
  }, [
    deck,
    flushAnnotations,
    isNamedView,
    isOriginalView,
    lessonPath,
    namedLabel,
    namedSlug,
    saving,
  ]);

  const handleSaveNamedVersion = useCallback(async () => {
    const label = saveNamedLabel.trim();
    if (!label || !deck || saving) return;
    const currentAnn = annotationsRef.current;
    if (!currentAnn) {
      setSnackbar('Annotationen fehlen — bitte kurz warten und erneut speichern');
      return;
    }
    // Speichern als… in die gleiche Version = normales Sichern
    if (isNamedView && namedSlug) {
      const currentLabel = (namedLabel || namedSlug.replace(/_/g, ' ')).trim();
      if (label.toLowerCase() === currentLabel.toLowerCase() || label === namedSlug) {
        setSaveNamedOpen(false);
        setSaveNamedLabel('');
        void handleSaveBothVersions();
        return;
      }
    }
    setSaving(true);
    setSaveProgress('Anlegen…');
    try {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const ann = { ...currentAnn, updatedAt: new Date().toISOString() };
      // Snapshot + PDF abwarten — ohne PDF erscheint die Version in der Stundenliste nicht
      const result = await savePresentationNamedVersion(lessonPath, deck, ann, label, {
        onProgress: setSaveProgress,
        updateLive: false,
        exportPdf: true,
      });
      setSaveNamedOpen(false);
      setSaveNamedLabel('');
      if (isNamedView && namedBaselineRef.current) {
        setAnnotations({
          ...namedBaselineRef.current,
          bySlideId: { ...namedBaselineRef.current.bySlideId },
        });
        setSelectedStrokeIds([]);
      } else if (!isNamedView) {
        setAnnotations(createEmptyAnnotations(lessonPath));
        setSelectedStrokeIds([]);
      }
      setSnackbar(
        result.namedPdf
          ? `Neue Version „${label}“ angelegt (${result.namedPdf}). Aktuelle Version unverändert.`
          : `Neue Version „${label}“ angelegt. Aktuelle Version unverändert.`
      );
      setSaving(false);
      setSaveProgress('');
    } catch (e) {
      console.error('Named presentation save failed', e);
      setSnackbar(e instanceof Error ? e.message : 'Speichern als… fehlgeschlagen');
      setSaving(false);
      setSaveProgress('');
    }
  }, [
    deck,
    handleSaveBothVersions,
    isNamedView,
    lessonPath,
    namedLabel,
    namedSlug,
    saveNamedLabel,
    saving,
  ]);

  const undoStroke = () => {
    if (currentStrokes.length === 0) return;
    updateStrokes(currentStrokes.slice(0, -1));
  };

  const clearAllInkOnSlide = () => {
    if (currentStrokes.length === 0) return;
    setSelectedStrokeIds([]);
    updateStrokes([]);
    setClearInkOpen(false);
  };

  const finishingRunRef = useRef(false);

  const finishPresentationRun = useCallback(async () => {
    if (finishingRunRef.current) return;
    finishingRunRef.current = true;
    if (groupId && lessonPath) {
      markLessonPlayed(groupId, lessonPath);
      try {
        const loginCode = localStorage.getItem('loginCode') || '';
        await fetch('/api/teacher-schedule/lessons/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-login-code': loginCode,
          },
          body: JSON.stringify({ groupId, lessonPath }),
        });
      } catch {
        /* trotzdem zurück ins Dashboard */
      }
    }
    markTeacherWantsDashboard();
    navigate('/dashboard', { replace: true });
  }, [groupId, lessonPath, navigate]);

  const goNext = useCallback(() => {
    if (revealStep < maxReveal) {
      setRevealStep((s) => s + 1);
      return;
    }
    if (slideIndex < slides.length - 1) {
      setSlideIndex((i) => i + 1);
      setRevealStep(0);
      return;
    }
    if (planMode === 'run' && slides.length > 0) {
      void finishPresentationRun();
    }
  }, [revealStep, maxReveal, slideIndex, slides.length, planMode, finishPresentationRun]);

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

  const handleToggleNativeFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isIosSafariLike()) return;
    if (isAnyNativeFullscreen()) {
      exitPresentFullscreen();
      return;
    }
    requestPresentFullscreen(containerRef.current);
  };

  const goToDashboard = useCallback(() => {
    markTeacherWantsDashboard();
    navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    if (!groupId) {
      setGroupStudents([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/learning-groups/${encodeURIComponent(groupId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data.students)
          ? data.students
              .map((s: { id?: string; name?: string }) => ({
                id: String(s.id || ''),
                name: String(s.name || '').trim(),
              }))
              .filter((s: { id: string; name: string }) => s.id && s.name)
          : [];
        setGroupStudents(list);
      })
      .catch(() => {
        if (!cancelled) setGroupStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const clearRevealText = useCallback(() => {
    setRevealText(null);
  }, []);

  const showReveal = useCallback((text: string) => {
    setRevealText(text);
    setRevealNonce((n) => n + 1);
  }, []);

  const handlePickRandomStudent = useCallback(() => {
    if (groupStudents.length === 0) {
      setSnackbar('Keine Schüler in der Lerngruppe');
      return;
    }
    const pool =
      lastPickedStudentIdRef.current && groupStudents.length > 1
        ? groupStudents.filter((s) => s.id !== lastPickedStudentIdRef.current)
        : groupStudents;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    lastPickedStudentIdRef.current = pick.id;
    showReveal(pick.name);
  }, [groupStudents, showReveal]);

  const handlePickRandomNumber = useCallback(
    (max: number) => {
      const safeMax = Math.max(1, Math.floor(max));
      const last = lastPickedNumberRef.current;
      const candidates =
        last && last.max === safeMax && safeMax > 1
          ? Array.from({ length: safeMax }, (_, i) => i + 1).filter((n) => n !== last.value)
          : Array.from({ length: safeMax }, (_, i) => i + 1);
      const value = candidates[Math.floor(Math.random() * candidates.length)];
      lastPickedNumberRef.current = { max: safeMax, value };
      showReveal(String(value));
    },
    [showReveal]
  );

  const handleToggleDraw = () => {
    setDrawActive((v) => {
      if (!v) {
        setActiveTool('pen');
        setStrokeColor(penColorRef.current);
      }
      return !v;
    });
  };

  const handleSelectLineWidth = (w: number) => {
    setLineWidth(w);
    if (selectedStrokeIds.length && annotations && currentSlide) {
      const idSet = new Set(selectedStrokeIds);
      const next = currentStrokes.map((s) => (idSet.has(s.id) ? { ...s, lineWidth: w } : s));
      updateStrokes(next);
    }
  };

  const handleSelectMarkerOpacity = (opacity: number) => {
    setMarkerOpacity(opacity);
    if (selectedStrokeIds.length && annotations && currentSlide) {
      const idSet = new Set(selectedStrokeIds);
      const next = currentStrokes.map((s) =>
        idSet.has(s.id) && s.mode === 'marker' ? { ...s, markerOpacity: opacity } : s
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
    if (tool === 'marker') {
      setStrokeColor(markerColorRef.current || defaultColorForTool(tool));
    } else if (toolUsesColor(tool)) {
      setStrokeColor(penColorRef.current || defaultColorForTool(tool));
    }
    if (tool !== 'select') setSelectedStrokeIds([]);
  };

  useEffect(() => {
    if (!drawActive || activeTool === 'select') return;
    const el = document.activeElement;
    if (!(el instanceof HTMLElement)) return;
    if (el.isContentEditable || el.closest('[data-pres-rich-zone], [data-text-edit]')) {
      el.blur();
    }
  }, [drawActive, activeTool]);

  const handleSelectColor = (c: string) => {
    setStrokeColor(c);
    if (activeTool === 'marker') markerColorRef.current = c;
    else penColorRef.current = c;
    if (selectedStrokeIds.length && annotations && currentSlide) {
      const idSet = new Set(selectedStrokeIds);
      const next = currentStrokes.map((s) => (idSet.has(s.id) ? { ...s, color: c } : s));
      updateStrokes(next);
    }
  };

  useEffect(() => {
    if (selectedStrokeIds.length === 0) return;
    const idSet = new Set(selectedStrokeIds);
    const selected = annotations?.bySlideId[currentSlide?.id ?? '']?.filter((s) => idSet.has(s.id)) ?? [];
    const first = selected[0];
    if (!first) return;
    setLineWidth(first.lineWidth);
    setStrokeColor(first.color);
    if (first.mode === 'marker' && first.markerOpacity != null) {
      setMarkerOpacity(first.markerOpacity);
    }
  }, [selectedStrokeIds, annotations, currentSlide?.id]);

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
      if (saveNamedOpen || clearInkOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSaveNamedOpen(false);
          setClearInkOpen(false);
        }
        return;
      }

      if (handlePresentZoomHotkey(e, userZoom, applyUserZoom)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (drawActive) {
          setDrawActive(false);
          return;
        }
        navigate(presentationLessonBackUrl(lessonPath, groupId, planMode));
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
  }, [goNext, goPrev, drawActive, groupId, lessonPath, navigate, planMode, slides, saveNamedOpen, clearInkOpen, userZoom, entryTicketOpen, applyUserZoom, quietWork, musicGame]);

  // Fokus auf die Bühne, damit Pfeiltasten sofort greifen
  useEffect(() => {
    if (loading) return;
    containerRef.current?.focus({ preventScroll: true });
  }, [loading]);

  useEffect(() => {
    if (loading || !deck || slideIndex !== 0 || entryTicketOpen) return;
    const t = window.setTimeout(() => {
      tryPlayArmedStartSlideSound();
    }, 80);
    return () => window.clearTimeout(t);
  }, [loading, deck, slideIndex, entryTicketOpen]);

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

    let scaleRaf = 0;
    const updateScaleSoon = () => {
      if (scaleRaf) return;
      scaleRaf = requestAnimationFrame(() => {
        scaleRaf = 0;
        updateScale();
      });
    };

    updateScale();
    const host = stageRef.current;
    if (!host) return undefined;
    const ro = new ResizeObserver(() => updateScaleSoon());
    ro.observe(host);
    window.addEventListener('resize', updateScaleSoon);
    window.addEventListener('orientationchange', updateScaleSoon);
    window.visualViewport?.addEventListener('resize', updateScaleSoon);
    window.visualViewport?.addEventListener('scroll', updateScaleSoon);
    document.addEventListener('fullscreenchange', updateScaleSoon);
    document.addEventListener('webkitfullscreenchange' as 'fullscreenchange', updateScaleSoon);
    const raf = requestAnimationFrame(() => updateScale());
    const raf2 = requestAnimationFrame(() => updateScale());
    const orientTimers = [80, 250, 500].map((ms) => window.setTimeout(updateScale, ms));
    return () => {
      if (scaleRaf) cancelAnimationFrame(scaleRaf);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
      orientTimers.forEach((id) => window.clearTimeout(id));
      ro.disconnect();
      window.removeEventListener('resize', updateScaleSoon);
      window.removeEventListener('orientationchange', updateScaleSoon);
      window.visualViewport?.removeEventListener('resize', updateScaleSoon);
      window.visualViewport?.removeEventListener('scroll', updateScaleSoon);
      document.removeEventListener('fullscreenchange', updateScaleSoon);
      document.removeEventListener('webkitfullscreenchange' as 'fullscreenchange', updateScaleSoon);
    };
  }, [scaleReady]);

  // Trackpad-Pinch + Zwei-Finger-Pinch (iPad) auf der Bühne
  useEffect(() => {
    if (!scaleReady) return undefined;
    const el = stageRef.current;
    const offWheel = attachPresentTrackpadZoom(el, userZoomRef, applyUserZoom);
    const offTouch = attachPresentTouchPinchZoom(el, userZoomRef, applyUserZoom, pinchEnabledRef);
    return () => {
      offWheel();
      offTouch();
    };
  }, [scaleReady, applyUserZoom]);

  useLayoutEffect(() => {
    const host = stageRef.current;
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
  }, [scaleReady, displayScale, slideIndex]);

  const zoomed = userZoom > 1.001;
  const fitW = SLIDE_REF_WIDTH * displayScale;
  const fitH = SLIDE_REF_HEIGHT * displayScale;

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (drawActive || entryTicketOpen || userZoomRef.current <= 1.001) return;
    if (e.pointerType === 'pen') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest?.('[data-pres-zoom-controls], [data-pres-toolbar], button, a, input, textarea')) return;
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
    const host = stageRef.current;
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

  const onTouchStart = (e: React.TouchEvent) => {
    if (drawActive || entryTicketOpen || quietWork.running || quietWork.finished || musicGame.running || userZoomRef.current > 1.001) return;
    const t = e.touches[0];
    if (!t) return;
    if ((t as Touch & { touchType?: string }).touchType === 'stylus') {
      swipeRef.current = null;
      return;
    }
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest?.('a[href][data-pres-entry-ticket], a[href*="jm=lesson-entry"]')) {
      swipeRef.current = null;
      return;
    }
    if (target?.closest?.('[data-pres-element-type="image"], [data-resize-handle], [data-pres-filmstrip-slide], [data-element-delete]')) {
      swipeRef.current = null;
      return;
    }
    swipeRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (drawActive || entryTicketOpen || !swipeRef.current) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest?.('a[href][data-pres-entry-ticket], a[href*="jm=lesson-entry"]')) {
      swipeRef.current = null;
      return;
    }
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
    if (entryTicketOpen) return;
    if (
      tryHandleLessonEntryTicketLinkClick(e, {
        lessonPath,
        groupId: groupId || undefined,
        autostart: true,
        onOpen: openEntryTicket,
      })
    ) {
      return;
    }
    const tapTarget = e.target instanceof Element ? e.target : null;
    if (
      tapTarget?.closest?.(
        '[data-pres-element-type="image"], [data-resize-handle], [data-element-delete], [data-pres-filmstrip-slide], [data-pres-toolbar]',
      )
    ) {
      return;
    }
    if (selectedElementId) {
      setSelectedElementId(null);
      return;
    }
    if (drawActive) return;
    if (quietWork.running || quietWork.finished || musicGame.running) return;
    requestPresentFullscreen(containerRef.current);
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

  const presentShellSx = {
    position: 'fixed' as const,
    ...(nativeFs || entryTicketOpen
      ? { left: 0, top: 0, width: '100%', height: '100%' }
      : {
          left: 'var(--present-vv-left, 0px)',
          top: 'var(--present-vv-top, 0px)',
          width: 'var(--present-vv-width, 100%)',
          height: 'var(--present-vv-height, 100svh)',
        }),
    right: 'auto',
    bottom: 'auto',
    maxWidth: '100%',
    bgcolor: '#000',
    display: 'flex',
    flexDirection: 'column' as const,
    userSelect: 'none',
    overflow: 'hidden',
    outline: 'none',
    overscrollBehavior: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: drawActive ? 'none' : 'manipulation',
    boxSizing: 'border-box' as const,
  };

  if (!lessonPath) {
    return (
      <Box sx={{ p: 4, color: '#fff' }}>
        <Typography>Kein Stundenordner angegeben.</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        ref={containerRef}
        sx={{
          ...presentShellSx,
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#111',
        }}
      >
        <CircularProgress sx={{ color: JOHNNY_PRESENTATION.primaryLight }} />
      </Box>
    );
  }

  if (!deck || !annotations || !currentSlide) {
    return (
      <Box ref={containerRef} sx={presentShellSx}>
        <Box sx={{ p: 4, color: '#fff', maxWidth: 480 }}>
          <Typography sx={{ mb: 1 }}>
            {namedSlug
              ? `Version „${namedLabel || namedSlug.replace(/_/g, ' ')}“ konnte nicht geladen werden.`
              : 'Präsentation konnte nicht geladen werden.'}
          </Typography>
          {snackbar ? (
            <Typography variant="body2" color="text.secondary">
              {snackbar}
            </Typography>
          ) : null}
        </Box>
      </Box>
    );
  }

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
      onPointerDownCapture={(e) => {
        unlockPresentationAudio();
        if (slideIndex === 0 && !entryTicketOpen) tryPlayArmedStartSlideSound();
        if (entryTicketOpen || drawActive) return;
        if (e.pointerType === 'pen') return;
        const t = e.target instanceof Element ? e.target : null;
        if (
          t?.closest?.(
            '[data-pres-fs], [data-pres-back], [data-pres-toolbar], canvas, a[href][data-pres-entry-ticket], a[href*="jm=lesson-entry"]',
          )
        ) {
          return;
        }
        requestPresentFullscreen(containerRef.current);
      }}
      onClickCapture={(e) => {
        if (entryTicketOpen) return;
        tryHandleLessonEntryTicketLinkClick(e, {
          lessonPath,
          groupId: groupId || undefined,
          autostart: true,
          onOpen: () => openEntryTicket(),
        });
      }}
      sx={presentShellSx}
    >
      {!entryTicketOpen ? (
        <>
          {!isIosSafariLike() ? (
            <Tooltip title={nativeFs ? 'Vollbild beenden' : 'Vollbild'}>
              <IconButton
                size="small"
                onClick={handleToggleNativeFullscreen}
                aria-label={nativeFs ? 'Vollbild beenden' : 'Vollbild'}
                data-pres-fs=""
                sx={presentBackBtnSx}
              >
                {nativeFs ? (
                  <FullscreenExitIcon sx={{ fontSize: 18 }} />
                ) : (
                  <FullscreenIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
          ) : null}
        </>
      ) : null}

      {selectedImageForCrop && !isOriginalView && !isNamedView && slides.length > 1 ? (
        <Box
          data-pres-chrome=""
          data-pres-toolbar=""
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            top: 'max(8px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 85,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.45,
            borderRadius: 2,
            bgcolor: 'rgba(22,24,28,0.94)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 6px 22px rgba(0,0,0,0.38)',
            maxWidth: 'calc(100% - 96px)',
            overflowX: 'auto',
            touchAction: 'manipulation',
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              whiteSpace: 'nowrap',
              mr: 0.25,
            }}
          >
            Auf Folie
          </Typography>
          {slides.map((s, i) => {
            const current = s.id === currentSlide?.id;
            return (
              <Box
                key={s.id}
                role="button"
                tabIndex={0}
                data-pres-filmstrip-slide={s.id}
                aria-label={`Foto auf Folie ${i + 1}`}
                onClick={() => {
                  if (!current) movePlayPhotoToSlide(selectedImageForCrop.id, s.id);
                }}
                sx={{
                  minWidth: 32,
                  height: 32,
                  px: 0.75,
                  borderRadius: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: current ? 'default' : 'pointer',
                  userSelect: 'none',
                  color: current ? JOHNNY_PRESENTATION.warm : 'rgba(255,255,255,0.92)',
                  bgcolor: current ? 'rgba(255,152,0,0.28)' : 'rgba(255,255,255,0.1)',
                  boxShadow: current
                    ? 'inset 0 0 0 1px rgba(255,152,0,0.5)'
                    : 'inset 0 0 0 1px rgba(255,255,255,0.14)',
                  'body[data-pres-element-drag] &': current
                    ? undefined
                    : {
                        outline: '2px dashed rgba(102,187,106,0.95)',
                        outlineOffset: 1,
                      },
                }}
              >
                {i + 1}
              </Box>
            );
          })}
        </Box>
      ) : null}

      <Box
        ref={stageRef}
        data-pres-stage=""
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
        sx={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
          touchAction: 'none',
          cursor: drawActive ? 'default' : zoomed ? (panning ? 'grabbing' : 'grab') : 'pointer',
          px: 0,
          py: 0,
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
            willChange: drawActive ? 'auto' : 'transform',
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
              cursor: 'inherit',
              overflow: 'hidden',
              touchAction: 'none',
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
                  mediaInteractive={!drawActive && !zoomed}
                  editable={drawActive && activeTool === 'select'}
                  imageEditable={!isOriginalView && !isNamedView}
                  selectedElementId={selectedElementId}
                  onElementSelect={setSelectedElementId}
                  onElementChange={updateSlideElement}
                  onDeleteElement={
                    isOriginalView || isNamedView ? undefined : deletePlayPhoto
                  }
                  onMoveElementToSlide={
                    isOriginalView || isNamedView ? undefined : movePlayPhotoToSlide
                  }
                />
              </Box>
            </Box>
            <PresentationDrawOverlay
              strokes={currentStrokes}
              onStrokesChange={updateStrokes}
              enabled={drawActive}
              slideId={currentSlide.id}
              tool={activeTool}
              strokeColor={strokeColor}
              lineWidth={lineWidth}
              markerOpacity={markerOpacity}
              selectedStrokeIds={selectedStrokeIds}
              onSelectedStrokeIdsChange={setSelectedStrokeIds}
              scale={displayScale}
              onBackgroundPointerDown={() => setSelectedElementId(null)}
              onHitElement={setSelectedElementId}
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
        nextButtonTitle={canFinishToDashboard ? 'Zurück zum Dashboard' : 'Weiter'}
        canUndo={currentStrokes.length > 0}
        saving={saving}
        placement="overlay"
        onGoPrev={goPrev}
        onGoNext={goNext}
        onToggleDraw={handleToggleDraw}
        onSelectTool={handleSelectTool}
        onSelectColor={handleSelectColor}
        onSelectLineWidth={handleSelectLineWidth}
        markerOpacity={markerOpacity}
        onSelectMarkerOpacity={handleSelectMarkerOpacity}
        selectedCount={selectedStrokeIds.length}
        selectionIsMarker={
          selectedStrokeIds.length > 0 &&
          currentStrokes.filter((s) => selectedStrokeIds.includes(s.id)).every((s) => s.mode === 'marker')
        }
        onUndo={undoStroke}
        onClearAllInk={() => setClearInkOpen(true)}
        onSave={() => void handleSaveBothVersions()}
        onSaveNamed={() => setSaveNamedOpen(true)}
        onPickRandomStudent={groupId ? handlePickRandomStudent : undefined}
        canPickRandomStudent={groupStudents.length > 0}
        onPickRandomNumber={handlePickRandomNumber}
        onOpenEntryTicket={openEntryTicket}
        onCaptureImage={
          isOriginalView || isNamedView
            ? undefined
            : () => cameraInputRef.current?.click()
        }
        captureBusy={photoBusy}
        imageCropAvailable={Boolean(drawActive && activeTool === 'select' && selectedImageForCrop)}
        imageCropActive={Boolean(selectedImageForCrop && isImageCropMode(selectedImageForCrop))}
        onToggleImageCrop={toggleSelectedImageCrop}
        onExitToDashboard={entryTicketOpen ? undefined : goToDashboard}
        zoom={userZoom}
        onZoomChange={applyUserZoom}
        quietWork={quietWork}
        musicGame={musicGame}
      />

      <PresentationQuietWorkOverlay quietWork={quietWork} />
      <PresentationMusicGameOverlay musicGame={musicGame} />

      <PresentationRandomStudentOverlay
        text={revealText}
        nonce={revealNonce}
        onDone={clearRevealText}
      />

      <Dialog
        open={clearInkOpen}
        onClose={() => setClearInkOpen(false)}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle>Alle Stiftstriche löschen?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Alle Stift-, Marker- und Formzeichnungen auf dieser Folie werden entfernt. Das lässt
            sich nicht rückgängig machen.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearInkOpen(false)}>Abbrechen</Button>
          <Button color="error" variant="contained" onClick={clearAllInkOnSlide}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={saveNamedOpen}
        onClose={() => !saving && setSaveNamedOpen(false)}
        maxWidth="xs"
        fullWidth
        // Über der Präsentations-Toolbar; Fortschritt im Dialog sichtbar
        sx={{ zIndex: 1400 }}
      >
        <DialogTitle>Speichern als…</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Neue Version unter diesem Namen anlegen. Die Version, die du gerade offen hast
            {isNamedView && namedLabel ? ` („${namedLabel}“)` : ''}, bleibt unverändert.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Name der neuen Version"
            value={saveNamedLabel}
            onChange={(e) => setSaveNamedLabel(e.target.value)}
            placeholder="z. B. 2026 oder Klasse5"
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
                {saveProgress || 'Anlegen…'}
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
            Anlegen
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

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertPlayPhoto(file);
          e.target.value = '';
        }}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        message={snackbar}
        onClose={() => setSnackbar('')}
      />

      {entryTicketOpen ? (
        <Box
          data-present-scroll
          data-entry-ticket-open=""
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            bgcolor: '#f4f6fb',
            overflow: 'hidden',
            overscrollBehavior: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <PresentFullscreenPortals host={containerRef.current}>
            <EntryTicketPage
              embeddedPlay={{
                lessonPath,
                groupId: groupId || undefined,
                onExit: closeEntryTicket,
              }}
            />
          </PresentFullscreenPortals>
        </Box>
      ) : null}
    </Box>
  );
};

export default PresentationPresentPage;
