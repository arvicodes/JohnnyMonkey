import React, {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ChevronLeft as ShowNotesIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as DeleteIcon,
  PlayArrow as PresentIcon,
  RestoreFromTrash as TrashBinIcon,
  SaveAsOutlined as SaveAsIcon,
  SaveOutlined as SaveIcon,
  StickyNote2Outlined as NotesIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ViewQuilt as LayoutIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import PresentationSlideTemplateBar from '../components/presentation/PresentationSlideTemplateBar';
import PresentationPptxImportDialog, {
  type PptxImportSelection,
} from '../components/presentation/PresentationPptxImportDialog';
import PresentationSlideToolsBar from '../components/presentation/PresentationSlideToolsBar';
import PresentationAnimationBar from '../components/presentation/PresentationAnimationBar';
import PresentationFormatBar from '../components/presentation/PresentationFormatBar';
import PresentationFilmstrip from '../components/presentation/PresentationFilmstrip';
import PresentationNotesPanel, {
  type NotesFieldKey,
} from '../components/presentation/PresentationNotesPanel';
import PresentationTrashPanel from '../components/presentation/PresentationTrashPanel';
import { isFormatBarInteracting } from '../lib/presentationFormatBarGuard';
import {
  createSlideFromLayout,
  SLIDE_LAYOUTS,
} from '../lib/presentationLayouts';
import {
  DECK_FILENAME,
  PresentationDeck,
  PresentationShapeKind,
  PresentationSlide,
  SlideElement,
  SlideLayout,
  createEmptyAnnotations,
  htmlToPlain,
  loadPresentationAnnotations,
  loadPresentationDeck,
  lessonFolderPath,
  normalizeDeck,
  normalizeSlide,
  presentationPresentUrl,
  parsePresentationPlanMode,
  saveJsonFile,
  nextViewportScale,
  sortSlides,
  slideImageUrl,
  writeOriginalDeckSnapshot,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../lib/presentationDeck';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import { PRES_EDITOR_UI, presentationLessonBackUrl } from '../lib/presentationEditorUi';
import {
  DEFAULT_FLOATING_IMAGE_H,
  DEFAULT_FLOATING_IMAGE_W,
  extractImageFilesFromDataTransfer,
  findEmptyFullscreenImageElement,
  isImageFileDragEvent,
  slideDropPositionForImage,
} from '../lib/presentationImageUtils';
import {
  type ElementLayerAction,
  type ElementStackLayer,
  getElementStackLayer,
  reorderSlideElements,
  setElementStackLayerInSlide,
  stepElementStackLayer,
} from '../lib/presentationElementLayers';
import { createShapeElement } from '../lib/presentationSlideShapes';
import {
  canRedoDeck,
  canUndoDeck,
  createDeckHistory,
  pushDeckHistory,
  redoDeckHistory,
  undoDeckHistory,
  type DeckHistory,
} from '../lib/presentationEditorHistory';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import {
  addTrashItem,
  createNotesTrashItem,
  createSlideTrashItem,
  normalizeTrash,
  removeTrashItem,
  restoreNotesFromTrash,
  restoreSlideFromTrash,
} from '../lib/presentationTrash';
import { PRESENTATION_KEYFRAMES, resolveSlideTransitionAnimation } from '../lib/presentationTransitions';
import {
  refreshPresentationPdfsFromLessonFolder,
  savePresentationNamedVersion,
} from '../lib/presentationExport';

import { arrayMove } from '@dnd-kit/sortable';
import { assignSlideParagraphSteps, resetAllSlideAnimations, slidePatchFromAnimationItem, slidePatchFromClearAnimationItem } from '../lib/presentationAnimation';
import {
  createDefaultTemplatesStore,
  addCustomTemplate,
  buildLessonSharedOverviewUrl,
  createSlideFromCustomTemplate,
  createSlideFromTemplateKind,
  loadSlideTemplates,
  saveSlideTemplates,
  SLIDE_TEMPLATE_META,
  slideToTemplatePayload,
  updateCustomTemplate,
  type SlideTemplateKind,
  type SlideTemplatesStore,
} from '../lib/presentationSlideTemplates';
import {
  base64ToFile,
  buildLayoutFaithfulSlideFromImport,
} from '../lib/presentationPptxImport';

import {
  applyFontSizePresetIndex,
  bookmarkSelection,
  getEditorFontSizeSteps,
  insertImageHtmlAtCursor,
  nudgeFontSize,
} from '../lib/presentationRichText';

const PresentationEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const groupId = params.get('groupId') || '';
  const planMode = parsePresentationPlanMode(params.get('planMode'));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [saveNamedOpen, setSaveNamedOpen] = useState(false);
  const [saveNamedLabel, setSaveNamedLabel] = useState('');
  const [saveNamedBusy, setSaveNamedBusy] = useState(false);
  const [activeEditor, setActiveEditor] = useState<HTMLElement | null>(null);
  const [activeHtmlField, setActiveHtmlField] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [animationEditMode, setAnimationEditMode] = useState(false);
  const [selectedAnimationTarget, setSelectedAnimationTarget] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(0.4);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [trashAnchor, setTrashAnchor] = useState<HTMLElement | null>(null);
  const [slideTransitionPreviewKey, setSlideTransitionPreviewKey] = useState(0);
  const [slideTemplates, setSlideTemplates] = useState<SlideTemplatesStore>(
    createDefaultTemplatesStore(),
  );
  const [pptxImportOpen, setPptxImportOpen] = useState(false);
  const [imageDropActive, setImageDropActive] = useState(false);
  const [notesPanelOpen, setNotesPanelOpen] = useState(() => {
    try {
      return localStorage.getItem('johnny-pres-notes-open') !== '0';
    } catch {
      return true;
    }
  });
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const slideShellRef = useRef<HTMLDivElement>(null);
  const canvasHostObserverRef = useRef<ResizeObserver | null>(null);

  const syncSlideViewport = useCallback(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width < 40) return;

    setCanvasScale((prev) => nextViewportScale(prev, width, height, 'fit'));
  }, []);

  useLayoutEffect(() => {
    if (loading) return;

    const host = canvasHostRef.current;
    if (!host) return;

    syncSlideViewport();
    canvasHostObserverRef.current?.disconnect();
    const ro = new ResizeObserver(syncSlideViewport);
    ro.observe(host);
    canvasHostObserverRef.current = ro;

    return () => {
      ro.disconnect();
      if (canvasHostObserverRef.current === ro) {
        canvasHostObserverRef.current = null;
      }
    };
  }, [loading, syncSlideViewport, notesPanelOpen]);

  const setNotesPanelOpenPersist = useCallback((open: boolean) => {
    setNotesPanelOpen(open);
    try {
      localStorage.setItem('johnny-pres-notes-open', open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  useLayoutEffect(() => {
    if (loading) return;
    syncSlideViewport();
    const id = requestAnimationFrame(() => syncSlideViewport());
    return () => cancelAnimationFrame(id);
  }, [activeId, loading, syncSlideViewport]);

  useEffect(() => () => canvasHostObserverRef.current?.disconnect(), []);

  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-presentation-keyframes', 'true');
    style.textContent = PRESENTATION_KEYFRAMES;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    setSlideTransitionPreviewKey((key) => key + 1);
    setSelectedAnimationTarget(null);
  }, [activeId]);

  const slideViewportH = SLIDE_REF_HEIGHT * canvasScale;
  const slideViewportW = SLIDE_REF_WIDTH * canvasScale;
  const historyRef = useRef<DeckHistory | null>(null);
  const historyPushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyingHistoryRef = useRef(false);

  const HTML_TO_PLAIN: Record<string, keyof PresentationSlide> = {
    titleHtml: 'title',
    bodyHtml: 'body',
    subtitleHtml: 'subtitle',
    bodyLeftHtml: 'bodyLeft',
    bodyRightHtml: 'bodyRight',
    imageCaptionHtml: 'imageCaption',
    speakerNotesHtml: 'speakerNotes',
    preparationHtml: 'preparationNotes',
    materialHtml: 'materialNotes',
  };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfExportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quietUiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filmstripIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);
  const deckRef = useRef<PresentationDeck | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageTargetRef = useRef<'inline' | 'layout' | 'element' | 'notes'>('inline');
  const elementClipboardRef = useRef<{
    mode: 'cut' | 'copy';
    sourceSlideId: string;
    element: SlideElement;
  } | null>(null);
  const [elementClipboardVersion, setElementClipboardVersion] = useState(0);
  /** Filmstrip nur verzögert aktualisieren — sonst laggt Tippen/Ziehen. */
  const [filmstripSlides, setFilmstripSlides] = useState<PresentationSlide[]>([]);

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  useEffect(() => {
    if (!lessonPath) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadPresentationDeck(lessonPath)
      .then((d) => {
        if (cancelled) return;
        const normalized = normalizeDeck(d);
        historyRef.current = createDeckHistory(normalized);
        setHistoryVersion((v) => v + 1);
        setDeck(normalized);
        deckRef.current = normalized;
        setActiveId(normalized.slides[0]?.id ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoading(false);
        setSnackbar(
          e instanceof Error
            ? e.message
            : 'Präsentation konnte nicht geladen werden. Datei wurde nicht überschrieben.'
        );
      });
    loadSlideTemplates(lessonPath)
      .then(setSlideTemplates)
      .catch(() => setSlideTemplates(createDefaultTemplatesStore()));
    return () => {
      cancelled = true;
    };
  }, [lessonPath]);

  const schedulePdfExport = useCallback(
    (options?: { delayMs?: number; notify?: boolean }) => {
      if (!lessonPath) return;
      const delayMs = options?.delayMs ?? 4500;
      if (pdfExportTimer.current) clearTimeout(pdfExportTimer.current);
      pdfExportTimer.current = setTimeout(() => {
        void refreshPresentationPdfsFromLessonFolder(lessonPath)
          .then(() => {
            if (options?.notify) setSnackbar('Folien-PDFs aktualisiert');
          })
          .catch((e) => {
            console.warn('PDF-Export fehlgeschlagen', e);
            if (options?.notify) {
              setSnackbar(e instanceof Error ? e.message : 'PDF-Export fehlgeschlagen');
            }
          });
      }, delayMs);
    },
    [lessonPath]
  );

  useEffect(() => {
    return () => {
      if (pdfExportTimer.current) clearTimeout(pdfExportTimer.current);
    };
  }, []);

  const activeSlide = deck?.slides.find((s) => s.id === activeId) ?? deck?.slides[0];
  const normalizedActive = activeSlide ? normalizeSlide(activeSlide) : null;

  const persistDeck = useCallback(
    async (
      next: PresentationDeck,
      version: number,
      options?: { schedulePdfExport?: boolean }
    ) => {
      if (!lessonPath) return;
      const showSavingTimer = window.setTimeout(() => {
        setSaving(true);
      }, 400);
      try {
        const payload = {
          ...normalizeDeck(next),
          updatedAt: new Date().toISOString(),
        };
        await saveJsonFile(lessonPath, DECK_FILENAME, payload);
        // Original nur aktualisieren, solange noch nicht eingefroren (Erstell-Phase)
        await writeOriginalDeckSnapshot(lessonPath, payload, 'sync');
        if (version === saveVersionRef.current) {
          if (options?.schedulePdfExport === true) {
            schedulePdfExport({ delayMs: 800, notify: true });
          }
        }
      } catch (e) {
        setSnackbar(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
      } finally {
        window.clearTimeout(showSavingTimer);
        setSaving(false);
      }
    },
    [lessonPath, schedulePdfExport]
  );

  const scheduleSave = useCallback(
    (
      next: PresentationDeck,
      options?: {
        history?: 'debounced' | 'immediate' | 'skip';
        urgent?: boolean;
        /** Tippen: React-State erst nach Pause — DOM bleibt führend. */
        quiet?: boolean;
      }
    ) => {
      deckRef.current = next;

      if (options?.urgent) {
        if (quietUiTimer.current) {
          clearTimeout(quietUiTimer.current);
          quietUiTimer.current = null;
        }
        setDeck(next);
      } else if (options?.quiet) {
        if (quietUiTimer.current) clearTimeout(quietUiTimer.current);
        quietUiTimer.current = setTimeout(() => {
          quietUiTimer.current = null;
          const latest = deckRef.current;
          if (latest) startTransition(() => setDeck(latest));
        }, 750);
      } else {
        startTransition(() => setDeck(next));
      }

      if (!applyingHistoryRef.current && options?.history !== 'skip' && historyRef.current) {
        const push = () => {
          if (!historyRef.current || !deckRef.current) return;
          historyRef.current = pushDeckHistory(historyRef.current, deckRef.current);
          setHistoryVersion((v) => v + 1);
        };
        const mode = options?.history ?? 'debounced';
        if (mode === 'immediate') {
          if (historyPushTimer.current) clearTimeout(historyPushTimer.current);
          push();
        } else if (mode === 'debounced') {
          if (historyPushTimer.current) clearTimeout(historyPushTimer.current);
          historyPushTimer.current = setTimeout(push, 1000);
        }
      }

      const version = ++saveVersionRef.current;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistDeck(next, version), 2500);
    },
    [persistDeck]
  );

  const commitEditorState = useCallback(
    (options?: { history?: 'debounced' | 'immediate' | 'skip' }) => {
      if (!activeEditor || !activeHtmlField) return;
      if (!activeEditor.isConnected) return;
      const editorSlideId = activeEditor.getAttribute('data-pres-slide-id');
      const editorField = activeEditor.getAttribute('data-pres-html-field');
      if (editorSlideId && editorSlideId !== activeId) return;
      if (editorField && editorField !== activeHtmlField && !activeHtmlField.startsWith('element:')) {
        return;
      }
      const current = deckRef.current;
      if (!current || !activeId) return;

      if (activeHtmlField.startsWith('element:')) {
        const id = activeHtmlField.slice(8);
        const html = activeEditor.innerHTML;
        const slides = current.slides.map((s) => {
          if (s.id !== activeId) return s;
          const elements = (s.elements || []).map((e) => (e.id === id ? { ...e, html } : e));
          return normalizeSlide({ ...s, elements });
        });
        scheduleSave({ ...current, slides }, { ...options, quiet: true });
        return;
      }

      const html = activeEditor.innerHTML;
      const plainKey = HTML_TO_PLAIN[activeHtmlField];
      const slides = current.slides.map((s) =>
        s.id === activeId
          ? normalizeSlide({
              ...s,
              [activeHtmlField]: html,
              ...(plainKey ? { [plainKey]: htmlToPlain(html) } : {}),
            })
          : s
      );
      scheduleSave({ ...current, slides }, { ...options, quiet: true });
    },
    [activeEditor, activeHtmlField, activeId, scheduleSave]
  );

  const saveNamedPresentationVersion = useCallback(async () => {
    const label = saveNamedLabel.trim();
    if (!label || !lessonPath) return;
    commitEditorState({ history: 'skip' });
    const current = deckRef.current || deck;
    if (!current) return;
    setSaveNamedBusy(true);
    try {
      // Speichern als…: aktuelle Arbeitsversion auf Disk nicht anfassen
      if (pdfExportTimer.current) clearTimeout(pdfExportTimer.current);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const annotations =
        (await loadPresentationAnnotations(lessonPath)) ?? createEmptyAnnotations(lessonPath);
      const result = await savePresentationNamedVersion(
        lessonPath,
        current,
        annotations,
        label,
        {
          onProgress: (msg: string) => setSnackbar(msg),
          updateLive: false,
        }
      );
      setSaveNamedOpen(false);
      setSaveNamedLabel('');
      setSnackbar(
        result.namedPdf
          ? `Neue Version angelegt: ${result.namedPdf}`
          : `Neue Version „${label}“ angelegt`
      );
    } catch (e) {
      console.error('Named presentation save failed', e);
      setSnackbar(e instanceof Error ? e.message : 'Speichern als… fehlgeschlagen');
    } finally {
      setSaveNamedBusy(false);
    }
  }, [commitEditorState, deck, lessonPath, saveNamedLabel]);

  const selectSlide = useCallback(
    (id: string) => {
      if (id === activeId) return;
      commitEditorState({ history: 'skip' });
      setActiveId(id);
      setSelectedElementId(null);
      setActiveEditor(null);
      setActiveHtmlField(null);
    },
    [activeId, commitEditorState]
  );

  const goToAdjacentSlide = useCallback(
    (delta: number) => {
      const current = deckRef.current;
      if (!current) return;
      const slides = sortSlides(current.slides);
      if (slides.length < 2) return;
      const idx = slides.findIndex((s) => s.id === activeId);
      const from = idx < 0 ? 0 : idx;
      const next = slides[Math.min(slides.length - 1, Math.max(0, from + delta))];
      if (!next || next.id === activeId) return;
      selectSlide(next.id);
    },
    [activeId, selectSlide]
  );

  const handleElementSelect = useCallback(
    (id: string | null) => {
      commitEditorState({ history: 'skip' });
      setSelectedElementId(id);
    },
    [commitEditorState],
  );

  const restoreDeckSnapshot = useCallback(
    (snapshot: PresentationDeck) => {
      applyingHistoryRef.current = true;
      if (historyPushTimer.current) clearTimeout(historyPushTimer.current);
      deckRef.current = snapshot;
      setDeck(snapshot);
      setActiveEditor(null);
      setActiveHtmlField(null);
      setSelectedElementId(null);
      setActiveId((current) =>
        snapshot.slides.some((s) => s.id === current) ? current : snapshot.slides[0]?.id ?? null
      );
      setHistoryVersion((v) => v + 1);
      const version = ++saveVersionRef.current;
      void persistDeck(snapshot, version);
      applyingHistoryRef.current = false;
    },
    [persistDeck]
  );

  const undo = useCallback(() => {
    if (!historyRef.current || !canUndoDeck(historyRef.current)) return;
    commitEditorState({ history: 'skip' });
    const result = undoDeckHistory(historyRef.current);
    if (!result) return;
    historyRef.current = result.history;
    restoreDeckSnapshot(result.deck);
  }, [commitEditorState, restoreDeckSnapshot]);

  const redo = useCallback(() => {
    if (!historyRef.current || !canRedoDeck(historyRef.current)) return;
    commitEditorState({ history: 'skip' });
    const result = redoDeckHistory(historyRef.current);
    if (!result) return;
    historyRef.current = result.history;
    restoreDeckSnapshot(result.deck);
  }, [commitEditorState, restoreDeckSnapshot]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const inRichEditor = !!target.closest('[data-pres-rich-zone]');

      if (inRichEditor && mod && (e.key === 'z' || e.key === 'y')) {
        return;
      }

      // Folien wechseln mit ↑/↓ — nicht während Tippen im Text
      if (
        !mod &&
        !e.altKey &&
        (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        !inRichEditor &&
        !target.isContentEditable &&
        !target.closest('[contenteditable="true"]')
      ) {
        e.preventDefault();
        goToAdjacentSlide(e.key === 'ArrowUp' ? -1 : 1);
        return;
      }

      const editorFocused =
        activeEditor &&
        (target === activeEditor || activeEditor.contains(target) || target.isContentEditable);

      if (editorFocused && mod && activeEditor) {
        if (e.key === ']' && !e.altKey) {
          e.preventDefault();
          bookmarkSelection(activeEditor);
          nudgeFontSize(activeEditor, 1);
          commitEditorState();
          return;
        }
        if (e.key === '[' && !e.altKey) {
          e.preventDefault();
          bookmarkSelection(activeEditor);
          nudgeFontSize(activeEditor, -1);
          commitEditorState();
          return;
        }
        if (e.altKey && /^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const steps = getEditorFontSizeSteps(activeEditor);
          if (idx < steps.length) {
            e.preventDefault();
            bookmarkSelection(activeEditor);
            applyFontSizePresetIndex(activeEditor, idx);
            commitEditorState();
          }
          return;
        }
      }

      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, activeEditor, commitEditorState, goToAdjacentSlide]);

  const canUndo = canUndoDeck(historyRef.current);
  const canRedo = canRedoDeck(historyRef.current);
  void historyVersion;

  const updateDeck = useCallback(
    (patch: Partial<PresentationDeck>) => {
      const current = deckRef.current;
      if (!current) return;
      scheduleSave({ ...current, ...patch });
    },
    [scheduleSave],
  );

  const updateSlide = (patch: Partial<PresentationSlide>) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slides = current.slides.map((s) =>
      s.id === activeId ? normalizeSlide({ ...s, ...patch }) : s
    );
    // Text-Änderungen: UI nicht bei jedem Keystroke neu zeichnen
    const quiet =
      'titleHtml' in patch ||
      'bodyHtml' in patch ||
      'subtitleHtml' in patch ||
      'bodyLeftHtml' in patch ||
      'bodyRightHtml' in patch ||
      'imageCaptionHtml' in patch ||
      'speakerNotesHtml' in patch ||
      'preparationHtml' in patch ||
      'materialHtml' in patch ||
      'title' in patch ||
      'body' in patch;
    scheduleSave({ ...current, slides }, quiet ? { quiet: true } : undefined);
  };

  const isAnimationKeyBlocked = useCallback(() => {
    const active = document.activeElement;
    if (!active) return false;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement
    ) {
      return true;
    }
    const editable = active.closest('[contenteditable="true"]');
    return Boolean(editable && !editable.closest('[data-pres-slide]'));
  }, []);

  const applyAnimationTargetStep = useCallback(
    (itemId: string, step: number) => {
      if (!normalizedActive) return;
      const patch = slidePatchFromAnimationItem(normalizedActive, itemId, step);
      for (const [htmlField, plainField] of Object.entries(HTML_TO_PLAIN)) {
        const html = (patch as Record<string, string | undefined>)[htmlField];
        if (html != null) {
          (patch as Record<string, string>)[plainField] = htmlToPlain(html);
        }
      }
      updateSlide(patch);
      setSnackbar(step === 0 ? 'Schritt 0 — sofort sichtbar' : `Animations-Schritt ${step}`);
    },
    [normalizedActive]
  );

  const clearAnimationTarget = useCallback(
    (itemId: string) => {
      if (!normalizedActive) return;
      const patch = slidePatchFromClearAnimationItem(normalizedActive, itemId);
      for (const [htmlField, plainField] of Object.entries(HTML_TO_PLAIN)) {
        const html = (patch as Record<string, string | undefined>)[htmlField];
        if (html != null) {
          (patch as Record<string, string>)[plainField] = htmlToPlain(html);
        }
      }
      updateSlide(patch);
      setSnackbar('Animations-Zuweisung entfernt');
    },
    [normalizedActive]
  );

  useEffect(() => {
    if (!animationEditMode) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isAnimationKeyBlocked()) return;
      if (e.key === 'Escape') {
        if (selectedAnimationTarget) {
          e.preventDefault();
          setSelectedAnimationTarget(null);
          return;
        }
        setAnimationEditMode(false);
        return;
      }
      if (!selectedAnimationTarget) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        applyAnimationTargetStep(selectedAnimationTarget, parseInt(e.key, 10));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        clearAnimationTarget(selectedAnimationTarget);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    animationEditMode,
    selectedAnimationTarget,
    isAnimationKeyBlocked,
    applyAnimationTargetStep,
    clearAnimationTarget,
  ]);

  const handleAnimationEditModeChange = (enabled: boolean) => {
    setAnimationEditMode(enabled);
    setSelectedAnimationTarget(null);
    if (enabled) {
      setActiveEditor(null);
      setActiveHtmlField(null);
      setSelectedElementId(null);
    }
  };

  const flushActiveEditor = () => {
    commitEditorState();
  };

  const addFloatingImageAt = (
    path: string,
    x = 25,
    y = 22,
    w = DEFAULT_FLOATING_IMAGE_W,
    h = DEFAULT_FLOATING_IMAGE_H,
  ) => {
    if (!normalizedActive) return;
    const el: SlideElement = {
      id: `el-${Date.now()}`,
      type: 'image',
      x,
      y,
      w,
      h,
      src: path,
      zIndex: (normalizedActive.elements?.length ?? 0) + 1,
      imageFit: 'contain',
    };
    updateSlide({ elements: [...(normalizedActive.elements || []), el] });
    setSelectedElementId(el.id);
    setSnackbar('Bild eingefügt — in Einstellungen „Beschneiden“ oder auf der Folie ziehen');
  };

  const addFloatingImage = async (file: File) => {
    const path = await uploadImageFile(file);
    if (!path) return;
    addFloatingImageAt(path);
  };

  const addTextElement = () => {
    if (!normalizedActive) return;
    const el: SlideElement = {
      id: `el-${Date.now()}`,
      type: 'text',
      x: 18,
      y: 28,
      w: 38,
      h: 22,
      html: '<p>Text hier…</p>',
      zIndex: (normalizedActive.elements?.length ?? 0) + 1,
    };
    updateSlide({ elements: [...(normalizedActive.elements || []), el] });
    setSelectedElementId(el.id);
    setSnackbar('Textfeld eingefügt — direkt tippen oder ziehen zum Verschieben');
    // Fokus nach Mount (Toolbar-Button hält sonst den Fokus)
    window.setTimeout(() => {
      const node = document.querySelector(
        `[data-pres-element="${el.id}"] [data-text-edit]`
      ) as HTMLElement | null;
      if (!node) return;
      node.focus({ preventScroll: true });
      setActiveEditor(node);
      setActiveHtmlField(`element:${el.id}`);
    }, 40);
  };

  const addShapeElement = (kind: PresentationShapeKind) => {
    if (!normalizedActive) return;
    const el = createShapeElement(
      kind,
      (normalizedActive.elements?.length ?? 0) + 1,
      normalizedActive.accentColor
    );
    updateSlide({ elements: [...(normalizedActive.elements || []), el] });
    setSelectedElementId(el.id);
    setSnackbar(
      `${kind === 'arrow' ? 'Pfeil' : kind === 'line' ? 'Linie' : 'Form'} eingefügt — ziehen zum Verschieben`
    );
  };

  const updateElement = (id: string, patch: Partial<SlideElement>) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slides = current.slides.map((s) => {
      if (s.id !== activeId) return s;
      const elements = (s.elements || []).map((e) => (e.id === id ? { ...e, ...patch } : e));
      // Kein normalizeSlide — spart teure HTML-Normalisierung bei jedem Move/Resize.
      return { ...s, elements };
    });
    const keys = Object.keys(patch);
    const textOnly = keys.length > 0 && keys.every((k) => k === 'html');
    // Geometrie sofort ins Deck — sonst springt das Element nach dem Loslassen zurück
    scheduleSave(
      { ...current, slides },
      textOnly ? { quiet: true } : { urgent: true, history: 'debounced' }
    );
  };

  const deleteElement = (id: string) => {
    if (!normalizedActive) return;
    updateSlide({ elements: (normalizedActive.elements || []).filter((e) => e.id !== id) });
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const cloneElementForPaste = (el: SlideElement): SlideElement => ({
    ...structuredClone(el),
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });

  const moveElementToSlide = useCallback(
    (elementId: string, targetSlideId: string) => {
      const current = deckRef.current;
      if (!current || !activeId) return;
      if (targetSlideId === activeId) {
        setSnackbar('Bild ist bereits auf dieser Folie');
        return;
      }
      const sourceSlide = current.slides.find((s) => s.id === activeId);
      const targetSlide = current.slides.find((s) => s.id === targetSlideId);
      if (!sourceSlide || !targetSlide) return;
      const element = sourceSlide.elements?.find((el) => el.id === elementId);
      if (!element || element.type !== 'image') {
        setSnackbar('Nur Bilder können so verschoben werden');
        return;
      }
      const moved = cloneElementForPaste(element);
      const slides = current.slides.map((s) => {
        if (s.id === activeId) {
          return { ...s, elements: (s.elements || []).filter((el) => el.id !== elementId) };
        }
        if (s.id === targetSlideId) {
          return {
            ...s,
            elements: [...(s.elements || []), { ...moved, zIndex: (s.elements?.length ?? 0) + 1 }],
          };
        }
        return s;
      });
      scheduleSave({ ...current, slides }, { history: 'immediate' });
      setSelectedElementId(null);
      setActiveId(targetSlideId);
      setSelectedElementId(moved.id);
      setSnackbar('Bild auf andere Folie verschoben');
    },
    [activeId, scheduleSave]
  );

  const copySelectedElement = useCallback(
    (mode: 'cut' | 'copy') => {
      const current = deckRef.current;
      if (!current || !activeId || !selectedElementId) return false;
      const slide = current.slides.find((s) => s.id === activeId);
      const element = slide?.elements?.find((el) => el.id === selectedElementId);
      if (!element || (element.type !== 'image' && element.type !== 'shape')) return false;
      elementClipboardRef.current = {
        mode,
        sourceSlideId: activeId,
        element: structuredClone(element),
      };
      setElementClipboardVersion((v) => v + 1);
      if (mode === 'cut') {
        const slides = current.slides.map((s) =>
          s.id === activeId
            ? { ...s, elements: (s.elements || []).filter((el) => el.id !== selectedElementId) }
            : s
        );
        scheduleSave({ ...current, slides }, { history: 'immediate' });
        setSelectedElementId(null);
        setSnackbar('Ausgeschnitten — andere Folie wählen, dann Einfügen (⌘V)');
      } else {
        setSnackbar('Kopiert — andere Folie wählen, dann Einfügen (⌘V)');
      }
      return true;
    },
    [activeId, selectedElementId, scheduleSave]
  );

  const pasteClipboardElement = useCallback(() => {
    const clip = elementClipboardRef.current;
    const current = deckRef.current;
    if (!clip || !current || !activeId) return false;
    const pasted = cloneElementForPaste(clip.element);
    const slides = current.slides.map((s) => {
      if (s.id !== activeId) return s;
      return {
        ...s,
        elements: [...(s.elements || []), { ...pasted, zIndex: (s.elements?.length ?? 0) + 1 }],
      };
    });
    scheduleSave({ ...current, slides }, { history: 'immediate' });
    setSelectedElementId(pasted.id);
    if (clip.mode === 'cut') {
      elementClipboardRef.current = { ...clip, mode: 'copy' };
    }
    setSnackbar(clip.element.type === 'shape' ? 'Form eingefügt' : 'Bild eingefügt');
    return true;
  }, [activeId, scheduleSave]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== 'x' && e.key !== 'c' && e.key !== 'v') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      if (target.isContentEditable || target.closest('[data-pres-rich-zone]')) return;
      if (e.key === 'x' && copySelectedElement('cut')) {
        e.preventDefault();
        return;
      }
      if (e.key === 'c' && copySelectedElement('copy')) {
        e.preventDefault();
        return;
      }
      if (e.key === 'v' && pasteClipboardElement()) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [copySelectedElement, pasteClipboardElement]);

  const reorderElementLayer = (id: string, action: ElementLayerAction) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slide = current.slides.find((s) => s.id === activeId);
    if (!slide) return;

    let next: SlideElement[] | null = null;
    let message = 'Ebene verschoben';

    if (action === 'forward' || action === 'backward') {
      next = stepElementStackLayer(slide.elements || [], id, action);
      if (next) {
        const moved = next.find((el) => el.id === id);
        const before = slide.elements?.find((el) => el.id === id);
        if (
          moved &&
          before &&
          getElementStackLayer(moved) !== getElementStackLayer(before)
        ) {
          message =
            getElementStackLayer(moved) === 'background'
              ? 'Hinter den Text (Hintergrund)'
              : 'Vor den Text (Vordergrund)';
        }
      }
    } else {
      next = reorderSlideElements(slide.elements || [], id, action);
      message = action === 'front' ? 'Ganz nach vorne' : 'Ganz nach hinten';
    }

    if (!next) {
      setSnackbar('Keine weitere Ebene in diese Richtung');
      return;
    }
    updateSlide({ elements: next });
    setSnackbar(message);
  };

  const setElementStackLayer = (id: string, layer: ElementStackLayer) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slide = current.slides.find((s) => s.id === activeId);
    if (!slide) return;
    const next = setElementStackLayerInSlide(slide.elements || [], id, layer);
    if (next === slide.elements) {
      setSnackbar(layer === 'background' ? 'Bereits im Hintergrund' : 'Bereits im Vordergrund');
      return;
    }
    updateSlide({ elements: next });
    setSelectedElementId(id);
    setSnackbar(layer === 'background' ? 'Hintergrund — hinter dem Text' : 'Vordergrund — vor dem Text');
  };

  useEffect(() => {
    if (animationEditMode) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (!selectedElementId) return;

      const slide = deckRef.current?.slides.find((s) => s.id === activeId);
      const element = slide?.elements?.find((el) => el.id === selectedElementId);
      if (!element) return;

      if (isFormatBarInteracting()) return;
      if (isAnimationKeyBlocked()) return;

      if (element.type === 'image' || element.type === 'shape') {
        e.preventDefault();
        deleteElement(selectedElementId);
        setSnackbar(element.type === 'shape' ? 'Form entfernt' : 'Bild entfernt');
        return;
      }

      const active = document.activeElement;
      if (active?.closest(`[data-pres-element="${selectedElementId}"]`)) return;
      if (activeEditor?.closest('[data-pres-rich-zone]')) return;

      e.preventDefault();
      deleteElement(selectedElementId);
      setSnackbar('Element entfernt');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    animationEditMode,
    selectedElementId,
    activeId,
    activeEditor,
    isAnimationKeyBlocked,
    normalizedActive,
  ]);

  const selectedElement = normalizedActive?.elements?.find((e) => e.id === selectedElementId);

  const addSlide = (layout: SlideLayout = 'title-content') => {
    const current = deckRef.current;
    if (!current) return;
    const slide = normalizeSlide(createSlideFromLayout(current.slides.length, layout));
    const next = { ...current, slides: [...current.slides, slide] };
    scheduleSave(next, { history: 'immediate' });
    setActiveId(slide.id);
    setSnackbar(`Folie ${next.slides.length} hinzugefügt`);
  };

  const insertSlideFromTemplate = (kind: SlideTemplateKind) => {
    const current = deckRef.current;
    if (!current || !lessonPath) return;
    const slides = sortSlides(current.slides);
    const activeIndex = slides.findIndex((s) => s.id === activeId);

    let insertIndex = slides.length;
    if (kind === 'start') insertIndex = 0;
    else if (kind === 'ha' || kind === 'ende') insertIndex = slides.length;
    else if (activeIndex >= 0) insertIndex = activeIndex + 1;

    const slide = createSlideFromTemplateKind(kind, insertIndex, lessonPath, slideTemplates);
    if (!slide) return;

    if (kind === 'leinwand') {
      if (!groupId.trim()) {
        setSnackbar('Leinwand-Folie braucht eine Lerngruppe — bitte die Stunde über das Lehrer-Dashboard öffnen.');
        return;
      }
      const mediaEl = slide.elements?.find((e) => e.type === 'embed');
      if (mediaEl) {
        mediaEl.src = buildLessonSharedOverviewUrl(groupId, lessonPath);
      }
    } else if (kind === 'link' || kind === 'referenz') {
      const defaultUrl = kind === 'referenz' ? '/wall-of-fame' : '';
      const url = window.prompt(
        kind === 'link'
          ? 'Video-Link (YouTube, Vimeo oder MP4-Pfad):'
          : 'Referenz-URL (z. B. /wall-of-fame):',
        defaultUrl,
      );
      if (url === null) return;
      const mediaEl = slide.elements?.find((e) => e.type === 'video' || e.type === 'embed');
      if (mediaEl) {
        mediaEl.src = url.trim();
      }
    }

    const nextSlides = [...slides];
    nextSlides.splice(insertIndex, 0, slide);
    const reordered = nextSlides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(slide.id);
    const label = SLIDE_TEMPLATE_META.find((m) => m.kind === kind)?.label ?? 'Vorlage';
    setSnackbar(
      kind === 'bild' ? `${label}-Folie eingefügt — Bild reinziehen` : `${label}-Folie eingefügt`,
    );
  };

  const insertCustomTemplate = (customId: string) => {
    const current = deckRef.current;
    if (!current || !lessonPath) return;
    const slides = sortSlides(current.slides);
    const activeIndex = slides.findIndex((s) => s.id === activeId);
    const insertIndex = activeIndex >= 0 ? activeIndex + 1 : slides.length;

    const slide = createSlideFromCustomTemplate(customId, insertIndex, lessonPath, slideTemplates);
    if (!slide) return;

    const nextSlides = [...slides];
    nextSlides.splice(insertIndex, 0, slide);
    const reordered = nextSlides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(slide.id);
    const label = slideTemplates.custom?.find((t) => t.id === customId)?.label ?? 'Vorlage';
    setSnackbar(`„${label}“ eingefügt`);
  };

  const importPptxSelections = async (items: PptxImportSelection[]) => {
    const current = deckRef.current;
    if (!current || !lessonPath || items.length === 0) return;

    const slides = sortSlides(current.slides);
    const activeIndex = slides.findIndex((s) => s.id === activeId);
    const insertIndex = activeIndex >= 0 ? activeIndex + 1 : slides.length;
    const built: PresentationSlide[] = [];

    for (const item of items) {
      const imagePathByKey = new Map<string, string>();
      const imageBoxes = (item.slide.boxes || []).filter((b) => b.kind === 'image');
      const legacyImages = item.slide.images || [];
      const toUpload =
        imageBoxes.length > 0
          ? imageBoxes.map((b) => ({
              name: b.name,
              mime: b.mime,
              base64: b.base64,
            }))
          : legacyImages;

      for (let i = 0; i < toUpload.length; i++) {
        const img = toUpload[i];
        const file = base64ToFile(img, i);
        const path = await uploadImageFile(file);
        if (path) {
          imagePathByKey.set(`${img.name}|${img.base64.slice(0, 32)}`, path);
        }
      }

      built.push(
        buildLayoutFaithfulSlideFromImport(
          item.slide,
          insertIndex + built.length,
          imagePathByKey,
        ),
      );
    }

    if (built.length === 0) {
      throw new Error('Keine Folien konnten erzeugt werden');
    }

    const nextSlides = [...slides];
    nextSlides.splice(insertIndex, 0, ...built);
    const reordered = nextSlides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(built[0].id);
    setSnackbar(
      built.length === 1
        ? '1 Folie aus PPTX als Elemente eingefügt'
        : `${built.length} Folien aus PPTX als Elemente eingefügt`,
    );
  };

  const saveCurrentAsTemplate = async (kind: SlideTemplateKind) => {
    if (!normalizedActive || !lessonPath) return;
    const payload = slideToTemplatePayload(normalizedActive, lessonPath);
    const next: SlideTemplatesStore = {
      ...slideTemplates,
      templates: { ...slideTemplates.templates, [kind]: payload },
    };
    try {
      await saveSlideTemplates(lessonPath, next);
      setSlideTemplates(next);
      const label = SLIDE_TEMPLATE_META.find((m) => m.kind === kind)?.label ?? kind;
      setSnackbar(`${label}-Vorlage gespeichert`);
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Vorlage speichern fehlgeschlagen');
    }
  };

  const saveAsNewTemplate = async () => {
    if (!normalizedActive || !lessonPath) return;
    const name = window.prompt('Name der neuen Vorlage:', normalizedActive.title?.trim() || '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setSnackbar('Bitte einen Namen für die Vorlage eingeben');
      return;
    }
    const payload = slideToTemplatePayload(normalizedActive, lessonPath);
    const next = addCustomTemplate(slideTemplates, trimmed, payload);
    try {
      await saveSlideTemplates(lessonPath, next);
      setSlideTemplates(next);
      setSnackbar(`Neue Vorlage „${trimmed}“ gespeichert`);
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Vorlage speichern fehlgeschlagen');
    }
  };

  const updateCustomTemplateFromSlide = async (customId: string) => {
    if (!normalizedActive || !lessonPath) return;
    const entry = slideTemplates.custom?.find((t) => t.id === customId);
    if (!entry) return;
    const payload = slideToTemplatePayload(normalizedActive, lessonPath);
    const next = updateCustomTemplate(slideTemplates, customId, payload);
    try {
      await saveSlideTemplates(lessonPath, next);
      setSlideTemplates(next);
      setSnackbar(`Vorlage „${entry.label}“ aktualisiert`);
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Vorlage speichern fehlgeschlagen');
    }
  };

  const duplicateSlide = () => {
    const current = deckRef.current;
    if (!current || !activeSlide) return;
    const copy: PresentationSlide = {
      ...normalizeSlide(activeSlide),
      id: `slide-${Date.now()}`,
      order: current.slides.length,
    };
    scheduleSave({ ...current, slides: [...current.slides, copy] }, { history: 'immediate' });
    setActiveId(copy.id);
  };

  const reorderSlides = (fromId: string, toId: string) => {
    const current = deckRef.current;
    if (!current) return;
    const slides = sortSlides(current.slides);
    const oldIndex = slides.findIndex((slide) => slide.id === fromId);
    const newIndex = slides.findIndex((slide) => slide.id === toId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const reordered = arrayMove(slides, oldIndex, newIndex).map((slide, index) => ({
      ...slide,
      order: index,
    }));
    // Sofort in der Filmstrip spiegeln — sonst springt die Reihenfolge zurück (verzögerte filmstripSlides)
    if (filmstripIdleTimer.current) {
      clearTimeout(filmstripIdleTimer.current);
      filmstripIdleTimer.current = null;
    }
    setFilmstripSlides(reordered);
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate', urgent: true });
  };

  const deleteSlide = () => {
    const current = deckRef.current;
    if (!current || !activeSlide || current.slides.length <= 1) return;
    const trashItem = createSlideTrashItem(activeSlide);
    const slides = current.slides
      .filter((s) => s.id !== activeSlide.id)
      .map((s, i) => ({ ...s, order: i }));
    scheduleSave(
      {
        ...current,
        slides,
        trash: addTrashItem(current, trashItem),
      },
      { history: 'immediate' }
    );
    setActiveId(slides[0]?.id ?? null);
    setSnackbar('Folie in Papierkorb verschoben');
  };

  const moveNotesToTrash = (_fieldKey: NotesFieldKey) => {
    const current = deckRef.current;
    if (!current || !normalizedActive) return;
    // Ein Notizfeld — immer das zusammengeführte speakerNotesHtml
    const trashItem = createNotesTrashItem(normalizedActive, 'speakerNotesHtml');
    if (!trashItem) {
      setSnackbar('Notiz ist bereits leer');
      return;
    }

    const patch = { speakerNotesHtml: '<p><br></p>', speakerNotes: '' };

    const slides = current.slides.map((slide) =>
      slide.id === normalizedActive.id ? normalizeSlide({ ...slide, ...patch }) : slide
    );

    scheduleSave(
      {
        ...current,
        slides,
        trash: addTrashItem(current, trashItem),
      },
      { history: 'immediate' }
    );
    setSnackbar('Notiz in Papierkorb verschoben');
  };

  const restoreTrashItem = (itemId: string) => {
    const current = deckRef.current;
    if (!current) return;
    const item = normalizeTrash(current).find((entry) => entry.id === itemId);
    if (!item) return;

    if (item.type === 'slide') {
      const { deck: next, restoredId } = restoreSlideFromTrash(current, itemId);
      scheduleSave(next, { history: 'immediate' });
      if (restoredId) setActiveId(restoredId);
      setSnackbar('Folie wiederhergestellt');
      return;
    }

    const next = restoreNotesFromTrash(current, itemId, activeId);
    scheduleSave(next, { history: 'immediate' });
    setSnackbar('Notiz wiederhergestellt');
  };

  const deleteTrashForever = (itemId: string) => {
    const current = deckRef.current;
    if (!current) return;
    scheduleSave({ ...current, trash: removeTrashItem(current, itemId) }, { history: 'immediate' });
    setSnackbar('Endgültig gelöscht');
  };

  const emptyTrash = () => {
    const current = deckRef.current;
    if (!current) return;
    scheduleSave({ ...current, trash: [] }, { history: 'immediate' });
    setSnackbar('Papierkorb geleert');
  };

  const applyLayout = (layout: SlideLayout) => {
    if (!normalizedActive) return;
    const fresh = createSlideFromLayout(normalizedActive.order, layout);
    updateSlide({
      layout,
      titleAlign: fresh.titleAlign,
      accentColor: normalizedActive.accentColor,
    });
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    if (!lessonPath) return null;
    try {
      const folder = lessonFolderPath(lessonPath);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetPath', folder);
      const res = await fetch('/api/file-system-paths/save-file', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Bild-Upload fehlgeschlagen');
      return `${folder}/${file.name}`;
    } catch (e) {
      const msg =
        e instanceof TypeError || (e instanceof Error && /Failed to fetch/i.test(e.message))
          ? 'Server nicht erreichbar — App neu starten, dann Bild erneut einfügen.'
          : e instanceof Error
            ? e.message
            : 'Upload fehlgeschlagen';
      setSnackbar(msg);
      return null;
    }
  };

  const uploadNotesImageSrc = async (file: File): Promise<string | null> => {
    const safeBase = (file.name || 'bild.png').replace(/[^\w.\-äöüÄÖÜß]+/gi, '_');
    const named = new File([file], `notes-${Date.now()}-${safeBase}`, {
      type: file.type || 'image/png',
    });
    const path = await uploadImageFile(named);
    if (!path) return null;
    return slideImageUrl(path, 960);
  };

  const handleImageFile = async (
    file: File,
    position?: { x: number; y: number },
  ) => {
    if (imageTargetRef.current === 'notes') {
      const editor =
        activeEditor?.getAttribute('data-pres-notes-zone') === 'true'
          ? activeEditor
          : (document.querySelector(
              '[data-pres-notes-zone="true"]'
            ) as HTMLElement | null);
      if (!editor) {
        setSnackbar('Bitte zuerst ins Notizfeld klicken');
        return;
      }
      const src = await uploadNotesImageSrc(file);
      if (!src) return;
      editor.focus();
      insertImageHtmlAtCursor(editor, src, file.name);
      flushActiveEditor();
      setSnackbar('Bild in Notizen eingefügt');
      return;
    }

    const imagePath = await uploadImageFile(file);
    if (!imagePath) return;

    if (imageTargetRef.current === 'layout') {
      updateSlide({ imagePath });
      setSnackbar('Bild in Folien-Layout gesetzt');
      return;
    }

    if (
      selectedElement?.type === 'image' &&
      !selectedElement.src?.trim() &&
      selectedElementId
    ) {
      updateElement(selectedElementId, { src: imagePath });
      setSnackbar('Bild eingefügt');
      return;
    }

    if (position) {
      addFloatingImageAt(imagePath, position.x, position.y);
      return;
    }

    addFloatingImageAt(imagePath);
  };

  const handleImageSelected = async (file: File) => {
    await handleImageFile(file);
  };

  const handleSlideImageDragEnter = (e: React.DragEvent) => {
    if (!isImageFileDragEvent(e)) return;
    e.preventDefault();
    setImageDropActive(true);
  };

  const handleSlideImageDragOver = (e: React.DragEvent) => {
    if (!isImageFileDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setImageDropActive(true);
  };

  const handleSlideImageDragLeave = (e: React.DragEvent) => {
    if (!isImageFileDragEvent(e)) return;
    const next = e.relatedTarget as Node | null;
    if (next && slideShellRef.current?.contains(next)) return;
    setImageDropActive(false);
  };

  const handleSlideImageDrop = async (e: React.DragEvent) => {
    if (!isImageFileDragEvent(e)) return;
    e.preventDefault();
    setImageDropActive(false);

    const files = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (files.length === 0) {
      setSnackbar('Keine Bilddatei erkannt');
      return;
    }

    const slideEl = slideShellRef.current;
    if (!slideEl) return;

    const emptySlot = findEmptyFullscreenImageElement(normalizedActive?.elements);
    if (emptySlot && files.length === 1) {
      imageTargetRef.current = 'element';
      const path = await uploadImageFile(files[0]);
      if (!path) return;
      updateElement(emptySlot.id, {
        src: path,
        imageFit: 'cover',
        imageObjectPosition: '50% 50%',
      });
      setSelectedElementId(emptySlot.id);
      setSnackbar('Bild eingefügt — ziehen zum Positionieren');
      return;
    }

    imageTargetRef.current = 'element';
    const base = slideDropPositionForImage(
      e.clientX,
      e.clientY,
      slideEl,
      DEFAULT_FLOATING_IMAGE_W,
      DEFAULT_FLOATING_IMAGE_H,
    );

    setSnackbar(files.length > 1 ? `${files.length} Bilder werden eingefügt…` : 'Bild wird eingefügt…');

    for (let i = 0; i < files.length; i += 1) {
      const offset = i * 4;
      await handleImageFile(files[i], {
        x: Math.min(base.x + offset, 100 - DEFAULT_FLOATING_IMAGE_W),
        y: Math.min(base.y + offset, 100 - DEFAULT_FLOATING_IMAGE_H),
      });
    }
  };

  const applyAccentColor = (color: string, allSlides: boolean) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    if (!allSlides) {
      updateSlide({ accentColor: color });
      return;
    }
    const slides = current.slides.map((slide) => ({ ...slide, accentColor: color }));
    scheduleSave({ ...current, slides }, { history: 'immediate' });
    setSnackbar('Akzentfarbe auf alle Folien angewendet');
  };

  const autoAssignParagraphs = () => {
    if (!normalizedActive) return;
    const patch = assignSlideParagraphSteps(normalizedActive);
    for (const field of Object.keys(patch)) {
      const plainKey = HTML_TO_PLAIN[field];
      const html = (patch as Record<string, string>)[field];
      if (plainKey && html != null) {
        (patch as Record<string, string>)[plainKey] = htmlToPlain(html);
      }
    }
    updateSlide(patch);
    setSnackbar('Einblend-Reihenfolge automatisch erstellt');
  };

  const resetAllAnimations = () => {
    if (!normalizedActive) return;
    const patch = resetAllSlideAnimations(normalizedActive);
    for (const [htmlField, plainField] of Object.entries(HTML_TO_PLAIN)) {
      const html = (patch as Record<string, string | undefined>)[htmlField];
      if (html != null) {
        (patch as Record<string, string>)[plainField] = htmlToPlain(html);
      }
    }
    updateSlide(patch);
    setSnackbar('Alle Animationen der Folie zurückgesetzt');
  };

  const showLayoutImage =
    normalizedActive?.layout === 'image-left' || normalizedActive?.layout === 'image-right';

  const handleBack = () => {
    navigate(presentationLessonBackUrl(lessonPath, groupId, planMode));
  };

  // Esc → zurück zur Stundenplanung (nicht während Textbearbeitung / Dialog / Animationsmodus)
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (animationEditMode) return; // eigener Handler im Animationsmodus
      if (isTypingTarget(e.target)) return;
      if (isFormatBarInteracting()) return;
      if (document.querySelector('.MuiModal-root:not([aria-hidden="true"])')) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(presentationLessonBackUrl(lessonPath, groupId, planMode));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [animationEditMode, lessonPath, groupId, navigate, planMode]);

  const toolbarIconSx = {
    color: PRES_EDITOR_UI.textMuted,
    width: 30,
    height: 30,
    '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
  };

  const compactSelectSx = {
    minWidth: 0,
    '& .MuiInputBase-root': {
      fontSize: 11,
      height: 28,
      bgcolor: '#fafafa',
      color: PRES_EDITOR_UI.text,
    },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: PRES_EDITOR_UI.barBorder },
    '& .MuiSelect-select': { py: 0.5 },
  };

  const sortedSlides = useMemo(
    () => (deck ? sortSlides(deck.slides) : []),
    [deck]
  );
  const activeSlideNumber = Math.max(
    1,
    sortedSlides.findIndex((slide) => slide.id === activeId) + 1
  );

  // Filmstrip: Reihenfolge/Anzahl sofort; Inhalt erst nach Pause (kein Lag beim Tippen)
  useEffect(() => {
    if (!deck) {
      setFilmstripSlides([]);
      return;
    }
    const nextSorted = sortSlides(deck.slides);
    setFilmstripSlides((prev) => {
      const prevIds = prev.map((s) => s.id).join(',');
      const nextIds = nextSorted.map((s) => s.id).join(',');
      // Struktur/Reihenfolge geändert → sofort übernehmen
      if (prevIds !== nextIds || prev.length !== nextSorted.length) {
        return nextSorted;
      }
      return prev;
    });
    if (filmstripIdleTimer.current) clearTimeout(filmstripIdleTimer.current);
    filmstripIdleTimer.current = setTimeout(() => {
      setFilmstripSlides(sortSlides(deck.slides));
    }, 2800);
    return () => {
      if (filmstripIdleTimer.current) clearTimeout(filmstripIdleTimer.current);
    };
  }, [deck]);

  useEffect(() => {
    if (!deck) return;
    if (filmstripIdleTimer.current) {
      clearTimeout(filmstripIdleTimer.current);
      filmstripIdleTimer.current = null;
    }
    setFilmstripSlides(sortSlides(deck.slides));
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps -- nur bei Folienwechsel sofort

  if (!lessonPath) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Kein Stundenordner angegeben.</Typography>
      </Box>
    );
  }

  if (loading || !deck) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: PRES_EDITOR_UI.pageBg }}>
        <CircularProgress size={28} sx={{ color: JOHNNY_PRESENTATION.primary }} />
      </Box>
    );
  }

  const formatContextLabel =
    activeHtmlField === 'speakerNotesHtml' ||
    activeHtmlField === 'materialHtml' ||
    activeHtmlField === 'preparationHtml'
      ? 'Notizen'
      : activeHtmlField?.startsWith('element:')
        ? 'Element'
        : activeHtmlField
          ? 'Folie'
          : undefined;

  const notesActiveField: NotesFieldKey | null =
    activeHtmlField === 'speakerNotesHtml' ||
    activeHtmlField === 'materialHtml' ||
    activeHtmlField === 'preparationHtml'
      ? 'speakerNotesHtml'
      : null;

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        mx: 0,
        px: 0,
        alignSelf: 'stretch',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: PRES_EDITOR_UI.pageBg,
        overflow: 'hidden',
      }}
    >
      {/* Kompakte Kopfleiste */}
      <Box
        sx={{
          bgcolor: PRES_EDITOR_UI.barBg,
          borderBottom: `1px solid ${PRES_EDITOR_UI.barBorder}`,
          flexShrink: 0,
          boxShadow: '0 1px 0 rgba(46,125,50,0.06)',
        }}
      >
        <Box
          sx={{
            minHeight: 44,
            px: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          <Tooltip title="Zurück zur Stunde">
            <IconButton size="small" onClick={handleBack} sx={toolbarIconSx}>
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <TextField
            size="small"
            placeholder="Präsentationstitel"
            value={deck.title}
            onChange={(e) => scheduleSave({ ...deck, title: e.target.value })}
            sx={{
              flex: 1,
              minWidth: 120,
              maxWidth: 320,
              '& .MuiInputBase-root': {
                fontSize: 14,
                fontWeight: 700,
                height: 32,
                bgcolor: 'transparent',
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: PRES_EDITOR_UI.barBorder,
              },
              '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: PRES_EDITOR_UI.accent,
              },
            }}
          />

          <Box sx={{ flex: 1, minWidth: 8 }} />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.35,
              bgcolor: PRES_EDITOR_UI.accentSoft,
              borderRadius: 1.5,
              px: 0.5,
              py: 0.25,
              border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
              flexShrink: 0,
            }}
          >
            <Tooltip title="Folie hinzufügen">
              <IconButton size="small" onClick={() => addSlide('title-content')} sx={toolbarIconSx}>
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            {normalizedActive && (
              <TextField
                select
                size="small"
                value={normalizedActive.layout || 'title-content'}
                onChange={(e) => applyLayout(e.target.value as SlideLayout)}
                sx={{ width: 118, flexShrink: 0, ...compactSelectSx }}
                SelectProps={{
                  renderValue: () => (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LayoutIcon sx={{ fontSize: 14, color: PRES_EDITOR_UI.accent }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 600 }}>Layout</Typography>
                    </Box>
                  ),
                }}
              >
                {SLIDE_LAYOUTS.map((l) => (
                  <MenuItem key={l.id} value={l.id} dense sx={{ fontSize: 12 }}>
                    {l.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15, height: 20, alignSelf: 'center' }}
            />
            <PresentationSlideTemplateBar
              disabled={!normalizedActive}
              templates={slideTemplates}
              onInsert={insertSlideFromTemplate}
              onInsertCustom={insertCustomTemplate}
              onSaveTemplate={(kind) => void saveCurrentAsTemplate(kind)}
              onSaveNewTemplate={() => void saveAsNewTemplate()}
              onUpdateCustomTemplate={(id) => void updateCustomTemplateFromSlide(id)}
            />
            <Tooltip title="PPTX importieren — Boxen als Elemente">
              <span>
                <IconButton
                  size="small"
                  disabled={!lessonPath}
                  onClick={() => setPptxImportOpen(true)}
                  sx={toolbarIconSx}
                >
                  <UploadFileIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Duplizieren">
              <IconButton size="small" onClick={duplicateSlide} sx={toolbarIconSx}>
                <CopyIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Folie löschen (→ Papierkorb)">
              <span>
                <IconButton size="small" onClick={deleteSlide} disabled={deck.slides.length <= 1} sx={toolbarIconSx}>
                  <DeleteIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Papierkorb">
              <IconButton
                size="small"
                onClick={(e) => setTrashAnchor(e.currentTarget)}
                sx={toolbarIconSx}
              >
                <Badge
                  badgeContent={normalizeTrash(deck).length}
                  color="error"
                  invisible={normalizeTrash(deck).length === 0}
                  sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}
                >
                  <TrashBinIcon sx={{ fontSize: 17 }} />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          <PresentationTrashPanel
            anchorEl={trashAnchor}
            open={Boolean(trashAnchor)}
            items={normalizeTrash(deck)}
            onClose={() => setTrashAnchor(null)}
            onRestore={restoreTrashItem}
            onDeleteForever={deleteTrashForever}
            onEmptyTrash={emptyTrash}
          />

          <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.25 }} />

          <Tooltip title="Rückgängig — Folie/Deck (im Text: ⌘Z)">
            <span>
              <IconButton
                size="small"
                disabled={!canUndo}
                onClick={undo}
                sx={toolbarIconSx}
              >
                <UndoIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Wiederholen — Folie/Deck (im Text: ⌘⇧Z)">
            <span>
              <IconButton
                size="small"
                disabled={!canRedo}
                onClick={redo}
                sx={toolbarIconSx}
              >
                <RedoIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>

          {saving && <CircularProgress size={14} sx={{ color: PRES_EDITOR_UI.accent, flexShrink: 0 }} />}

          <Box sx={{ flex: 1, minWidth: 8 }} />

          <Box
            sx={{
              display: 'flex',
              flexShrink: 0,
              alignItems: 'stretch',
              borderRadius: 1,
              overflow: 'hidden',
              border: `1px solid ${PRES_EDITOR_UI.barBorder}`,
              bgcolor: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <Tooltip title="Sichern: aktuelle Version aktualisieren (PDFs später im Hintergrund)">
              <IconButton
                size="small"
                onClick={() => {
                  commitEditorState({ history: 'skip' });
                  const current = deckRef.current || deck;
                  if (!current) return;
                  if (pdfExportTimer.current) clearTimeout(pdfExportTimer.current);
                  const v = ++saveVersionRef.current;
                  void persistDeck(current, v, { schedulePdfExport: false }).then(() => {
                    if (v !== saveVersionRef.current) return;
                    setSnackbar('Gesichert');
                    // Schwere PDF-Exports nicht beim Speichern — idle im Hintergrund
                    schedulePdfExport({ delayMs: 14000, notify: false });
                  });
                }}
                sx={{
                  width: 38,
                  height: 30,
                  borderRadius: 0,
                  color: PRES_EDITOR_UI.textMuted,
                  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
                }}
              >
                <SaveIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder }} />
            <Tooltip title="Speichern als…: neue Version anlegen, aktuelle bleibt unverändert">
              <IconButton
                size="small"
                onClick={() => setSaveNamedOpen(true)}
                sx={{
                  width: 38,
                  height: 30,
                  borderRadius: 0,
                  color: PRES_EDITOR_UI.textMuted,
                  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
                }}
              >
                <SaveAsIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ borderColor: PRES_EDITOR_UI.barBorder }} />
            <Tooltip title="Präsentieren">
              <IconButton
                size="small"
                onClick={() =>
                  navigate(presentationPresentUrl(lessonPath, groupId || undefined, undefined, undefined, planMode))
                }
                sx={{
                  width: 38,
                  height: 30,
                  borderRadius: 0,
                  color: '#fff',
                  bgcolor: PRES_EDITOR_UI.accent,
                  '&:hover': { bgcolor: JOHNNY_PRESENTATION.primaryDark },
                }}
              >
                <PresentIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            px: 1,
            py: 0.35,
            borderTop: `1px solid ${PRES_EDITOR_UI.barBorder}`,
            bgcolor: '#f7faf7',
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'thin',
              borderRadius: 1,
              px: 0.5,
              py: 0.2,
              ...(animationEditMode
                ? {
                    bgcolor: 'rgba(255,152,0,0.12)',
                    border: '1px solid rgba(255,152,0,0.35)',
                  }
                : PRES_EDITOR_UI.toolbarSection.text),
            }}
          >
            {animationEditMode ? (
              <Typography sx={{ fontSize: 11, color: '#E65100', fontWeight: 600 }}>
                Element anklicken → Zahl 0–9 (0 = sofort, Esc = abwählen)
              </Typography>
            ) : (
              <PresentationFormatBar
                activeEditor={activeEditor}
                contextLabel={formatContextLabel}
                onEditorChanged={flushActiveEditor}
                onInsertImage={
                  notesActiveField
                    ? () => {
                        imageTargetRef.current = 'notes';
                        imageInputRef.current?.click();
                      }
                    : undefined
                }
              />
            )}
          </Box>

          {normalizedActive && (
            <>
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 1,
                  px: 0.45,
                  py: 0.2,
                  ...PRES_EDITOR_UI.toolbarSection.slide,
                }}
              >
                <PresentationSlideToolsBar
                  slide={normalizedActive}
                  selectedElement={selectedElement ?? null}
                  showLayoutImage={showLayoutImage}
                  onApplyAccentColor={applyAccentColor}
                  onAddTextElement={addTextElement}
                  onAddImageElement={() => {
                    imageTargetRef.current = 'element';
                    imageInputRef.current?.click();
                  }}
                  onAddLayoutImage={() => {
                    imageTargetRef.current = 'layout';
                    imageInputRef.current?.click();
                  }}
                  onAddShapeElement={addShapeElement}
                  onUpdateElement={updateElement}
                  onDeleteElement={deleteElement}
                  onCutElement={() => copySelectedElement('cut')}
                  onCopyElement={() => copySelectedElement('copy')}
                  onPasteElement={() => pasteClipboardElement()}
                  canPasteElement={elementClipboardVersion > 0}
                  onReorderElementLayer={reorderElementLayer}
                  onSetElementStackLayer={setElementStackLayer}
                  onUpdateSlide={updateSlide}
                />
              </Box>
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.35,
                  ...PRES_EDITOR_UI.toolbarSection.anim,
                }}
              >
                <PresentationAnimationBar
                  deck={deck}
                  slide={normalizedActive}
                  animationEditMode={animationEditMode}
                  selectedAnimationTarget={selectedAnimationTarget}
                  onAnimationEditModeChange={handleAnimationEditModeChange}
                  onUpdateSlide={updateSlide}
                  onUpdateDeck={updateDeck}
                  onAutoAssignParagraphs={autoAssignParagraphs}
                  onResetAllAnimations={resetAllAnimations}
                />
              </Box>
            </>
          )}
        </Box>
      </Box>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImageSelected(f);
          e.target.value = '';
        }}
      />

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, bgcolor: PRES_EDITOR_UI.pageBg }}>
        <PresentationFilmstrip
          slides={filmstripSlides.length ? filmstripSlides : sortedSlides}
          activeId={activeId}
          onSelect={selectSlide}
          onAdd={() => addSlide('title-content')}
          onReorder={reorderSlides}
        />

        {/* Canvas + Notizen */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <Box
            ref={canvasHostRef}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: PRES_EDITOR_UI.pageBg,
              overflow: 'hidden',
              position: 'relative',
              minHeight: 0,
              minWidth: 0,
              width: '100%',
            }}
          >
            {normalizedActive && canvasScale > 0 && (
              <Box
                key={`${normalizedActive.id}-${slideTransitionPreviewKey}`}
                ref={slideShellRef}
                onDragEnter={handleSlideImageDragEnter}
                onDragOver={handleSlideImageDragOver}
                onDragLeave={handleSlideImageDragLeave}
                onDrop={(e) => void handleSlideImageDrop(e)}
                sx={{
                  width: slideViewportW,
                  height: slideViewportH,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  flexShrink: 0,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  position: 'relative',
                  borderRadius: `${8 * canvasScale}px`,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
                  animation: resolveSlideTransitionAnimation(normalizedActive.transition),
                  outline: imageDropActive
                    ? `${3 * canvasScale}px dashed ${PRES_EDITOR_UI.accent}`
                    : undefined,
                  outlineOffset: imageDropActive ? `${2 * canvasScale}px` : undefined,
                }}
              >
                {imageDropActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 50,
                      bgcolor: 'rgba(46,125,50,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography
                      sx={{
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(46,125,50,0.92)',
                        color: '#fff',
                        fontSize: `${14 * canvasScale}px`,
                        fontWeight: 600,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                      }}
                    >
                      Bild hier ablegen
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: SLIDE_REF_WIDTH,
                    height: SLIDE_REF_HEIGHT,
                    transform: `scale(${canvasScale})`,
                    transformOrigin: 'top left',
                    overflow: 'hidden',
                    pointerEvents: 'auto',
                  }}
                >
                  <PresentationSlideView
                    key={normalizedActive.id}
                    slide={normalizedActive}
                    scale={1}
                    showShadow={false}
                    editable
                    revealStep={999}
                    revealEnabled={false}
                    animationEditMode={animationEditMode}
                    selectedAnimationTarget={selectedAnimationTarget}
                    onAnimationTargetClick={setSelectedAnimationTarget}
                    showSlideNumbers={deck.showSlideNumbers !== false}
                    slideNumber={activeSlideNumber}
                    slideTotal={sortedSlides.length}
                    showSlideFooter={deck.showSlideFooter !== false}
                    slideFooter={deck.slideFooter}
                    deckTitle={deck.title}
                    lessonPath={deck.lessonPath}
                    selectedElementId={selectedElementId}
                    onElementSelect={handleElementSelect}
                    onElementChange={updateElement}
                    onMoveElementToSlide={moveElementToSlide}
                    onTextElementFocus={(el, elementId) => {
                      setActiveEditor(el);
                      setActiveHtmlField(`element:${elementId}`);
                      setSelectedElementId(elementId);
                    }}
                    onChange={(patch) => updateSlide(patch)}
                    onEditorFocus={(el, fieldKey) => {
                      setActiveEditor(el);
                      setActiveHtmlField(fieldKey ?? null);
                      setSelectedElementId(null);
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {normalizedActive && notesPanelOpen && (
          <PresentationNotesPanel
            speakerHtml={normalizedActive.speakerNotesHtml}
            speakerPlain={normalizedActive.speakerNotes}
            activeField={notesActiveField}
            readOnly={false}
            onHide={() => setNotesPanelOpenPersist(false)}
            onEditorFocus={(fieldKey, el) => {
              setActiveEditor(el);
              setActiveHtmlField(fieldKey);
              setSelectedElementId(null);
            }}
            onEditorBlur={() => {
              if (isFormatBarInteracting()) return;
              if (
                activeHtmlField === 'materialHtml' ||
                activeHtmlField === 'speakerNotesHtml' ||
                activeHtmlField === 'preparationHtml'
              ) {
                setActiveEditor(null);
                setActiveHtmlField(null);
              }
            }}
            onSpeakerChange={(html, plain) =>
              updateSlide({ speakerNotesHtml: html, speakerNotes: plain })
            }
            onMoveNotesToTrash={moveNotesToTrash}
            onUploadImage={uploadNotesImageSrc}
          />
        )}
        {normalizedActive && !notesPanelOpen && (
          <Box
            sx={{
              width: 36,
              flexShrink: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pt: 1,
              gap: 0.5,
              bgcolor: PRES_EDITOR_UI.panelBg,
              borderLeft: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
            }}
          >
            <Tooltip title="Notizen einblenden" placement="left">
              <IconButton
                size="small"
                onClick={() => setNotesPanelOpenPersist(true)}
                aria-label="Notizen einblenden"
                sx={{
                  width: 28,
                  height: 28,
                  color: PRES_EDITOR_UI.textMuted,
                  '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
                }}
              >
                <ShowNotesIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <NotesIcon sx={{ fontSize: 14, color: PRES_EDITOR_UI.textMuted, opacity: 0.7 }} />
          </Box>
        )}
      </Box>

      <Dialog
        open={saveNamedOpen}
        onClose={() => !saveNamedBusy && setSaveNamedOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Speichern als…</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Legt eine <strong>neue</strong> Version unter diesem Namen an
            (z.&nbsp;B. „2026“). Die aktuelle Arbeitsversion bleibt unverändert.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Name der neuen Version"
            value={saveNamedLabel}
            onChange={(e) => setSaveNamedLabel(e.target.value)}
            placeholder="z. B. 2026 oder Klasse5"
            disabled={saveNamedBusy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && saveNamedLabel.trim() && !saveNamedBusy) {
                e.preventDefault();
                void saveNamedPresentationVersion();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveNamedOpen(false)} disabled={saveNamedBusy}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            disabled={!saveNamedLabel.trim() || saveNamedBusy}
            onClick={() => void saveNamedPresentationVersion()}
          >
            Anlegen
          </Button>
        </DialogActions>
      </Dialog>

      <PresentationPptxImportDialog
        open={pptxImportOpen}
        onClose={() => setPptxImportOpen(false)}
        lessonPath={lessonPath}
        templates={slideTemplates}
        onImport={importPptxSelections}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        message={snackbar}
        onClose={() => setSnackbar('')}
        ContentProps={{ sx: { bgcolor: '#333', color: '#fff', fontSize: 13 } }}
      />
    </Box>
  );
};

export default PresentationEditorPage;
