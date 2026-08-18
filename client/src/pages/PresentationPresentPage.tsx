import React, { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Snackbar, TextField, Tooltip, Typography } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import PresentationDrawOverlay from '../components/presentation/PresentationDrawOverlay';
import PresentationTabletToolbar from '../components/presentation/PresentationTabletToolbar';
import PresentationRandomStudentOverlay from '../components/presentation/PresentationRandomStudentOverlay';
import {
  ANNOTATIONS_FILENAME,
  PresentationAnnotations,
  PresentationDeck,
  PresentationStroke,
  PresentationViewerVariant,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  SlideElement,
  createEmptyAnnotations,
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
import { PresentationDrawTool, defaultLineWidthForTool, lineWidthsForTool } from '../lib/presentationDrawTools';
import { presentationLessonBackUrl, tryHandleLessonEntryTicketLinkClick, isLessonEntryTicketSlideHref } from '../lib/presentationEditorUi';
import { markLessonPlayed } from '../lib/playedLessons';
import { savePresentationBothVersions, savePresentationNamedVersion, exportPresentationPdfVersions } from '../lib/presentationExport';
import { getSlideMaxRevealSteps } from '../lib/presentationReveal';
import { PRESENTATION_KEYFRAMES, resolveSlideTransitionAnimation } from '../lib/presentationTransitions';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import { isPresentationLinkClickTarget } from '../lib/presentationRichText';
import { clampPresentZoomSmooth, handlePresentZoomHotkey, attachPresentTrackpadZoom, attachPresentTouchPinchZoom, centerPresentPan, panAfterPresentZoom, clampPresentPan, type PresentZoomOrigin } from '../lib/presentationPresentZoom';
import { ensureEntryTicketButtonsOnTitleSlides } from '../lib/presentationSlideTemplates';
import { isWochenaufgabenFolderPath } from '../lib/wochenaufgabenFolder';
import { markTeacherWantsDashboard } from '../lib/teacherLiveLesson';
import {
  attachPresentViewportFill,
  exitPresentFullscreen,
  isIosSafariLike,
  requestPresentFullscreen,
} from '../lib/presentationPresentFullscreen';
import EntryTicketPage from './EntryTicketPage';

const SWIPE_MIN_PX = 48;
const EMPTY_STROKES: PresentationStroke[] = [];

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
  const [strokeColor, setStrokeColor] = useState('#c62828');
  const [lineWidth, setLineWidth] = useState(3);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');
  const [saveNamedOpen, setSaveNamedOpen] = useState(false);
  const [entryTicketOpen, setEntryTicketOpen] = useState(false);
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
  /** Pinch nur wenn nicht gezeichnet wird (Handauflage sonst als 2-Touch) */
  const pinchEnabledRef = useRef(true);
  pinchEnabledRef.current = !drawActive;

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
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const nativeFsAttemptedRef = useRef(false);
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
      setEntryTicketOpen(true);
    };
    host.addEventListener('click', onClick, true);
    return () => host.removeEventListener('click', onClick, true);
  }, [loading]);

  useLayoutEffect(() => {
    if (!lessonPath) return undefined;
    const stop = attachPresentViewportFill(containerRef.current);
    return () => {
      stop();
      exitPresentFullscreen();
    };
  }, [lessonPath]);

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

  const updateSlideElement = useCallback((id: string, patch: Partial<SlideElement>) => {
    setDeck((prev) => {
      if (!prev) return prev;
      const slideId = currentSlideIdRef.current;
      if (!slideId) return prev;
      return {
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
    });
  }, []);

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
        setSelectedStrokeId(null);
      } else if (!isNamedView) {
        setAnnotations(createEmptyAnnotations(lessonPath));
        setSelectedStrokeId(null);
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

  const handleBack = () => {
    markTeacherWantsDashboard();
    navigate(presentationLessonBackUrl(lessonPath, groupId, planMode));
  };

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
      if (entryTicketOpen) return;

      if (handlePresentZoomHotkey(e, userZoom, applyUserZoom)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (drawActive) {
          setDrawActive(false);
          return;
        }
        if (saveNamedOpen) {
          setSaveNamedOpen(false);
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
  }, [goNext, goPrev, drawActive, groupId, lessonPath, navigate, planMode, slides, saveNamedOpen, userZoom, entryTicketOpen, applyUserZoom]);

  // Fokus auf die Bühne, damit Pfeiltasten sofort greifen
  useEffect(() => {
    if (loading) return;
    containerRef.current?.focus({ preventScroll: true });
  }, [loading]);

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
    if (drawActive || entryTicketOpen || userZoomRef.current > 1.001) return;
    const t = e.touches[0];
    if (!t) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest?.('a[href][data-pres-entry-ticket], a[href*="jm=lesson-entry"]')) {
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
    if (drawActive) return;
    if (entryTicketOpen) return;
    if (!nativeFsAttemptedRef.current && !isIosSafariLike()) {
      nativeFsAttemptedRef.current = true;
      requestPresentFullscreen(containerRef.current);
    }
    if (
      tryHandleLessonEntryTicketLinkClick(e, {
        lessonPath,
        groupId: groupId || undefined,
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

  const presentShellSx = {
    position: 'fixed' as const,
    left: 'var(--present-vv-left, 0px)',
    top: 'var(--present-vv-top, 0px)',
    width: 'var(--present-vv-width, 100%)',
    height: 'var(--present-vv-height, 100svh)',
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
    touchAction: 'manipulation',
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
      onClickCapture={(e) => {
        if (entryTicketOpen) return;
        tryHandleLessonEntryTicketLinkClick(e, {
          lessonPath,
          groupId: groupId || undefined,
          autostart: true,
          onOpen: () => setEntryTicketOpen(true),
        });
      }}
      sx={presentShellSx}
    >
      {!entryTicketOpen ? (
        <Tooltip title={isWochenaufgabenFolderPath(lessonPath) ? 'Zurück zum Dashboard' : 'Zurück zur Stunde'}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }}
            aria-label={isWochenaufgabenFolderPath(lessonPath) ? 'Zurück zum Dashboard' : 'Zurück zur Stunde'}
            sx={presentBackBtnSx}
          >
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
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
            willChange: 'transform',
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
                  selectedElementId={selectedElementId}
                  onElementSelect={setSelectedElementId}
                  onElementChange={updateSlideElement}
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
        nextButtonTitle={canFinishToDashboard ? 'Zurück zum Dashboard' : 'Weiter'}
        canUndo={currentStrokes.length > 0}
        saving={saving}
        placement="overlay"
        onGoPrev={goPrev}
        onGoNext={goNext}
        onToggleDraw={handleToggleDraw}
        onSelectTool={handleSelectTool}
        onSelectColor={setStrokeColor}
        onSelectLineWidth={handleSelectLineWidth}
        onUndo={undoStroke}
        onSave={() => void handleSaveBothVersions()}
        onSaveNamed={() => setSaveNamedOpen(true)}
        onPickRandomStudent={groupId ? handlePickRandomStudent : undefined}
        canPickRandomStudent={groupStudents.length > 0}
        onPickRandomNumber={handlePickRandomNumber}
        onOpenEntryTicket={() => setEntryTicketOpen(true)}
        zoom={userZoom}
        onZoomChange={applyUserZoom}
      />

      <PresentationRandomStudentOverlay
        text={revealText}
        nonce={revealNonce}
        onDone={clearRevealText}
      />

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

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        message={snackbar}
        onClose={() => setSnackbar('')}
      />

      {entryTicketOpen ? (
        <Box
          data-present-scroll
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 80,
            bgcolor: '#f4f6fb',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            overscrollBehavior: 'contain',
          }}
        >
          <EntryTicketPage
            embeddedPlay={{
              lessonPath,
              groupId: groupId || undefined,
              onExit: () => setEntryTicketOpen(false),
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
};

export default PresentationPresentPage;
