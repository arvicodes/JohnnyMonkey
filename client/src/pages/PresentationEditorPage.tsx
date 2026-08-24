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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ChevronLeft as ShowNotesIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  ContentPasteGo as PasteGoIcon,
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
import { PresentationSoundSplitControl } from '../components/presentation/PresentationSoundControls';
import PresentationAnimationBar from '../components/presentation/PresentationAnimationBar';
import PresentationFormatBar from '../components/presentation/PresentationFormatBar';
import PresentationFilmstrip from '../components/presentation/PresentationFilmstrip';
import PresentationNotesPanel, {
  type NotesFieldKey,
} from '../components/presentation/PresentationNotesPanel';
import PresentationTrashPanel from '../components/presentation/PresentationTrashPanel';
import PresentationSlideClipboardPanel from '../components/presentation/PresentationSlideClipboardPanel';
import { isFormatBarInteracting } from '../lib/presentationFormatBarGuard';
import {
  clearSlideClipboard,
  cloneClipboardSlideForInsert,
  loadSlideClipboard,
  MAX_SLIDE_CLIPBOARD_ITEMS,
  pushSlideToClipboard,
  removeSlideFromClipboard,
  SLIDE_CLIPBOARD_STORAGE_KEY,
  type PresentationSlideClipboardItem,
} from '../lib/presentationSlideClipboard';
import {
  createSlideFromLayout,
  SLIDE_LAYOUTS,
  isBlankLayout,
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
  withHiddenLayoutZone,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../lib/presentationDeck';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import { requestPresentFullscreen } from '../lib/presentationPresentFullscreen';
import { preparePresentationAudioForPlay } from '../lib/presentationSound';
import { PRES_EDITOR_UI, presentationEntryTicketEditUrl, presentationLessonBackUrl, presentationLessonReturnWithPresentationUrl, tryHandleLessonEntryTicketLinkClick } from '../lib/presentationEditorUi';
import { lessonFolderDisplayName } from '../lib/presentationSlideFooter';
import { isWochenaufgabenFolderPath } from '../lib/wochenaufgabenFolder';
import {
  DEFAULT_FLOATING_IMAGE_H,
  DEFAULT_FLOATING_IMAGE_W,
  extractImageFilesFromDataTransfer,
  extractImageUrlFromDataTransfer,
  extractImageUrlFromDataTransferAsync,
  isHeroSlideImage,
  isPresentationImageDragEvent,
  saveImageUrlToLessonFolder,
  slideDropPositionForImage,
} from '../lib/presentationImageUtils';
import {
  clipboardHasImage,
  collectPasteImages,
  isTypingField,
  readImagesFromSystemClipboard,
} from '../lib/goodNotesClipboard';
import {
  type ElementLayerAction,
  type ElementStackLayer,
  getElementStackLayer,
  reorderSlideElements,
  setElementStackLayerInSlide,
  stepElementStackLayer,
} from '../lib/presentationElementLayers';
import { createShapeElement } from '../lib/presentationSlideShapes';
import { createCardElement, createCardPair } from '../lib/presentationSlideCards';
import { createTableElement, type CreateTableOptions } from '../lib/presentationSlideTables';
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
  MAX_TRASH_ITEMS,
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
  ensureEntryTicketButtonsOnTitleSlides,
  loadSlideTemplates,
  saveSlideTemplates,
  SLIDE_TEMPLATE_META,
  slideToTemplatePayload,
  updateCustomTemplate,
  type SlideTemplateKind,
  type SlideTemplatesStore,
} from '../lib/presentationSlideTemplates';
import { removeNearWhiteBackgroundFromUrl } from '../lib/presentationRemoveWhiteBg';
import {
  base64ToFile,
  buildLayoutFaithfulSlideFromImport,
  type ImportedPptxBox,
} from '../lib/presentationPptxImport';

import {
  applyFontSizePresetIndex,
  bookmarkSelection,
  getEditorFontSizeSteps,
  insertImageHtmlAtCursor,
  nudgeFontSize,
} from '../lib/presentationRichText';
import { serializePresentationNotesHtml } from '../lib/presentationNotesImages';

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
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const slideSelectionAnchorRef = useRef<string | null>(null);
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
  const [clipboardAnchor, setClipboardAnchor] = useState<HTMLElement | null>(null);
  const [slideClipboard, setSlideClipboard] = useState<PresentationSlideClipboardItem[]>(() =>
    typeof window !== 'undefined' ? loadSlideClipboard() : [],
  );
  const [slideTransitionPreviewKey, setSlideTransitionPreviewKey] = useState(0);
  const [slideTemplates, setSlideTemplates] = useState<SlideTemplatesStore>(
    createDefaultTemplatesStore(),
  );
  const [pptxImportOpen, setPptxImportOpen] = useState(false);
  const [imageDropActive, setImageDropActive] = useState(false);
  const [removingImageBackground, setRemovingImageBackground] = useState(false);
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

  useEffect(() => {
    if (!activeId) {
      setSelectedSlideIds([]);
      slideSelectionAnchorRef.current = null;
      return;
    }
    setSelectedSlideIds((prev) => (prev.includes(activeId) ? prev : [activeId]));
    if (!slideSelectionAnchorRef.current) {
      slideSelectionAnchorRef.current = activeId;
    }
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
  const imageDropBusyRef = useRef(false);
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
        const withEntry = {
          ...normalized,
          slides: ensureEntryTicketButtonsOnTitleSlides(normalized.slides),
        };
        historyRef.current = createDeckHistory(withEntry);
        setHistoryVersion((v) => v + 1);
        setDeck(withEntry);
        deckRef.current = withEntry;
        setActiveId(withEntry.slides[0]?.id ?? null);
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
        /** Tippen: setDeck in startTransition (ohne 750ms-Delay — sonst leert Sync den Editor). */
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
        // Tippen: State zeitnah aktualisieren (sonst leert der Editor-Sync den DOM beim Klick
        // mit veraltetem element.html). startTransition hält die Tipplast niedrig.
        if (quietUiTimer.current) {
          clearTimeout(quietUiTimer.current);
          quietUiTimer.current = null;
        }
        startTransition(() => setDeck(next));
      } else {
        if (quietUiTimer.current) {
          clearTimeout(quietUiTimer.current);
          quietUiTimer.current = null;
        }
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

      if (activeHtmlField.startsWith('element-title:')) {
        const id = activeHtmlField.slice('element-title:'.length);
        const titleHtml = activeEditor.innerHTML;
        const slides = current.slides.map((s) => {
          if (s.id !== activeId) return s;
          const elements = (s.elements || []).map((e) =>
            e.id === id ? { ...e, titleHtml } : e,
          );
          return normalizeSlide({ ...s, elements });
        });
        scheduleSave({ ...current, slides }, { ...options, quiet: true });
        return;
      }

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

      const html =
        activeEditor.getAttribute('data-pres-notes-zone') === 'true'
          ? serializePresentationNotesHtml(activeEditor)
          : activeEditor.innerHTML;
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
    (id: string, opts?: { preserveMulti?: boolean }) => {
      if (!opts?.preserveMulti) {
        setSelectedSlideIds([id]);
        slideSelectionAnchorRef.current = id;
      }
      if (id === activeId) return;
      commitEditorState({ history: 'skip' });
      setActiveId(id);
      setSelectedElementId(null);
      setActiveEditor(null);
      setActiveHtmlField(null);
    },
    [activeId, commitEditorState]
  );

  const handleFilmstripSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      const current = deckRef.current;
      const slides = current ? sortSlides(current.slides) : [];
      const additive = event.metaKey || event.ctrlKey;

      if (event.shiftKey && slideSelectionAnchorRef.current) {
        const a = slides.findIndex((s) => s.id === slideSelectionAnchorRef.current);
        const b = slides.findIndex((s) => s.id === id);
        if (a >= 0 && b >= 0) {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const range = slides.slice(lo, hi + 1).map((s) => s.id);
          if (additive) {
            setSelectedSlideIds((prev) => Array.from(new Set([...prev, ...range])));
          } else {
            setSelectedSlideIds(range);
          }
          selectSlide(id, { preserveMulti: true });
          return;
        }
      }

      if (additive) {
        const base = selectedSlideIds.length
          ? selectedSlideIds
          : activeId
            ? [activeId]
            : [];
        const set = new Set(base);
        if (set.has(id) && set.size > 1) {
          set.delete(id);
          const remaining = Array.from(set);
          setSelectedSlideIds(remaining);
          if (id === activeId) {
            selectSlide(remaining[remaining.length - 1], { preserveMulti: true });
          }
          return;
        }
        set.add(id);
        setSelectedSlideIds(Array.from(set));
        slideSelectionAnchorRef.current = id;
        selectSlide(id, { preserveMulti: true });
        return;
      }

      setSelectedSlideIds([id]);
      slideSelectionAnchorRef.current = id;
      selectSlide(id);
    },
    [activeId, selectSlide, selectedSlideIds]
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
      // Bilder über Karten: beim Anklicken in den Vordergrund holen (außer Vollbild-Hero).
      if (!id || !activeId) return;
      const current = deckRef.current;
      if (!current) return;
      const slide = current.slides.find((s) => s.id === activeId);
      if (!slide) return;
      const el = slide.elements?.find((e) => e.id === id);
      if (
        !el ||
        el.type !== 'image' ||
        getElementStackLayer(el) !== 'background' ||
        isHeroSlideImage(el)
      ) {
        return;
      }
      const nextEls = setElementStackLayerInSlide(slide.elements || [], id, 'foreground');
      if (nextEls === slide.elements) return;
      const slides = current.slides.map((s) =>
        s.id === activeId ? { ...s, elements: nextEls } : s,
      );
      scheduleSave({ ...current, slides }, { quiet: true, history: 'skip' });
    },
    [commitEditorState, activeId, scheduleSave],
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
    x = 36,
    y = 30,
    w = DEFAULT_FLOATING_IMAGE_W,
    h = DEFAULT_FLOATING_IMAGE_H,
  ) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slide = current.slides.find((s) => s.id === activeId);
    if (!slide) return;
    const el: SlideElement = {
      id: `el-${Date.now()}`,
      type: 'image',
      x,
      y,
      w,
      h,
      src: path,
      zIndex: (slide.elements?.length ?? 0) + 1,
      imageFit: 'contain',
      stackLayer: 'foreground',
    };
    const slides = current.slides.map((s) =>
      s.id === activeId
        ? normalizeSlide({ ...s, elements: [...(s.elements || []), el] })
        : s,
    );
    scheduleSave({ ...current, slides }, { urgent: true, history: 'immediate' });
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
      kind === 'arrow'
        ? 'Pfeil eingefügt — ziehen zum Verschieben'
        : kind === 'line'
          ? 'Linie eingefügt — ziehen zum Verschieben'
          : 'Box eingefügt — Doppelklick für Text, ziehen zum Verschieben',
    );
  };

  const addCardElement = (mode: 'single' | 'pair' = 'single') => {
    if (!normalizedActive) return;
    const z0 = (normalizedActive.elements?.length ?? 0) + 1;
    const added =
      mode === 'pair'
        ? createCardPair(z0)
        : [
            createCardElement(z0, {
              accent: normalizedActive.accentColor || '#1565C0',
              title: 'Titel',
            }),
          ];
    updateSlide({ elements: [...(normalizedActive.elements || []), ...added] });
    setSelectedElementId(added[0]?.id ?? null);
    setSnackbar(
      mode === 'pair'
        ? 'Zwei Karten eingefügt — Doppelklick auf Titel/Inhalt zum Tippen'
        : 'Karte eingefügt — Doppelklick auf Titel oder Inhalt zum Tippen',
    );
  };

  const addTableElement = (opts?: CreateTableOptions) => {
    if (!normalizedActive) return;
    const z0 = (normalizedActive.elements?.length ?? 0) + 1;
    const el = createTableElement(z0, opts);
    updateSlide({ elements: [...(normalizedActive.elements || []), el] });
    setSelectedElementId(el.id);
    setSnackbar(
      opts?.matrix || opts?.html
        ? 'Tabelle aus Text eingefügt'
        : 'Tabelle eingefügt — tippen und Spaltenränder ziehen',
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
    const textOnly =
      keys.length > 0 && keys.every((k) => k === 'html' || k === 'titleHtml');
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

  const removeSelectedImageBackground = async (id: string) => {
    const current = deckRef.current;
    if (!current || !lessonPath) return;
    const slide = current.slides.find((s) => s.id === activeId);
    const el = slide?.elements?.find((e) => e.id === id);
    if (!el || el.type !== 'image' || !el.src?.trim()) {
      setSnackbar('Kein Bild ausgewählt');
      return;
    }
    setRemovingImageBackground(true);
    setSnackbar('Hintergrund wird entfernt…');
    try {
      const url = slideImageUrl(el.src);
      const base = el.src.split('/').pop() || 'bild';
      const { file, removedRatio } = await removeNearWhiteBackgroundFromUrl(url, base, {
        tolerance: 52,
      });
      if (removedRatio < 0.002) {
        setSnackbar('Kaum hellen Hintergrund gefunden — Bild unverändert');
        return;
      }
      const path = await uploadImageFile(file);
      if (!path) return;
      updateElement(id, { src: path, imageFit: 'contain' });
      setSnackbar(
        removedRatio > 0.15
          ? 'Hintergrund entfernt (Schachbrett = Transparenz)'
          : 'Hintergrund teilweise entfernt',
      );
    } catch (e) {
      setSnackbar(e instanceof Error ? e.message : 'Hintergrund entfernen fehlgeschlagen');
    } finally {
      setRemovingImageBackground(false);
    }
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
        setSnackbar('Element ist bereits auf dieser Folie');
        return;
      }
      const sourceSlide = current.slides.find((s) => s.id === activeId);
      const targetSlide = current.slides.find((s) => s.id === targetSlideId);
      if (!sourceSlide || !targetSlide) return;
      const element = sourceSlide.elements?.find((el) => el.id === elementId);
      if (!element) return;
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
      const label =
        element.type === 'card'
          ? 'Infobox'
          : element.type === 'text'
            ? 'Text'
            : element.type === 'shape'
              ? 'Form'
              : element.type === 'table'
                ? 'Tabelle'
                : element.type === 'image'
                  ? 'Bild'
                  : element.type === 'video' || element.type === 'embed'
                    ? 'Medien'
                    : 'Element';
      setSnackbar(`${label} auf andere Folie verschoben`);
    },
    [activeId, scheduleSave]
  );

  const copySelectedElement = useCallback(
    (mode: 'cut' | 'copy') => {
      const current = deckRef.current;
      if (!current || !activeId || !selectedElementId) return false;
      const slide = current.slides.find((s) => s.id === activeId);
      const element = slide?.elements?.find((el) => el.id === selectedElementId);
      if (!element) return false;
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
    setSnackbar(
      clip.element.type === 'shape'
        ? 'Form eingefügt'
        : clip.element.type === 'card'
          ? 'Infobox eingefügt'
          : clip.element.type === 'table'
            ? 'Tabelle eingefügt'
            : clip.element.type === 'text'
              ? 'Text eingefügt'
              : clip.element.type === 'video' || clip.element.type === 'embed'
                ? 'Medien eingefügt'
                : 'Bild eingefügt',
    );
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

      if (isFormatBarInteracting()) return;
      if (isAnimationKeyBlocked()) return;

      // Inhaltsbox (Titel & Inhalt): Entf löscht die Zone, wenn leer / ohne Textauswahl
      if (
        !selectedElementId &&
        activeHtmlField === 'bodyHtml' &&
        normalizedActive &&
        (normalizedActive.layout || 'title-content') === 'title-content'
      ) {
        const sel = window.getSelection();
        const hasTextSelection = Boolean(sel && !sel.isCollapsed && sel.toString().length > 0);
        if (hasTextSelection) return;
        const plain = (normalizedActive.body || '').trim();
        const html = (normalizedActive.bodyHtml || '').trim();
        const empty =
          !plain &&
          (!html ||
            html === '<p></p>' ||
            html === '<p><br></p>' ||
            html === '<p style="text-align:center"><br></p>');
        // Delete-Taste: Zone immer entfernen; Backspace nur wenn leer
        if (e.key === 'Backspace' && !empty) return;
        e.preventDefault();
        const next = withHiddenLayoutZone(normalizedActive, 'bodyHtml', true);
        updateSlide({ hiddenLayoutZones: next.hiddenLayoutZones });
        setActiveEditor(null);
        setActiveHtmlField(null);
        setSnackbar('Inhaltsbox entfernt');
        return;
      }

      if (!selectedElementId) return;

      const slide = deckRef.current?.slides.find((s) => s.id === activeId);
      const element = slide?.elements?.find((el) => el.id === selectedElementId);
      if (!element) return;

      if (element.type === 'image' || element.type === 'shape') {
        if (
          element.type === 'shape' &&
          document.activeElement?.closest(
            `[data-pres-element="${selectedElementId}"] [data-text-edit]`,
          )
        ) {
          return;
        }
        e.preventDefault();
        deleteElement(selectedElementId);
        setSnackbar(element.type === 'shape' ? 'Form entfernt' : 'Bild entfernt');
        return;
      }

      const active = document.activeElement;
      // Während Textbearbeitung: Entf löscht Zeichen — außer ⌘/Strg+Entf (siehe Element)
      if (active?.closest(`[data-pres-element="${selectedElementId}"] [data-text-edit]`)) return;
      if (activeEditor?.closest('[data-pres-rich-zone]')) return;

      e.preventDefault();
      deleteElement(selectedElementId);
      setSnackbar(
        element.type === 'text'
          ? 'Textfeld entfernt'
          : element.type === 'card'
            ? 'Karte entfernt'
            : element.type === 'table'
              ? 'Tabelle entfernt'
              : 'Element entfernt',
      );
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    animationEditMode,
    selectedElementId,
    activeId,
    activeEditor,
    activeHtmlField,
    isAnimationKeyBlocked,
    normalizedActive,
  ]);

  const selectedElement = normalizedActive?.elements?.find((e) => e.id === selectedElementId);

  const insertIndexAfterActive = (slides: PresentationSlide[]) => {
    const sorted = sortSlides(slides);
    const activeIndex = sorted.findIndex((s) => s.id === activeId);
    return {
      sorted,
      insertIndex: activeIndex >= 0 ? activeIndex + 1 : sorted.length,
    };
  };

  const addSlide = (layout: SlideLayout = 'blank') => {
    const current = deckRef.current;
    if (!current) return;
    const { sorted, insertIndex } = insertIndexAfterActive(current.slides);
    // „+“: leere Folie ohne Titel-/Inhaltsfeld (freie Elemente nach Bedarf)
    const slide = normalizeSlide({
      ...createSlideFromLayout(insertIndex, layout),
      ...(isBlankLayout(layout) ? { hiddenLayoutZones: ['bodyHtml'] } : {}),
    });
    const nextSlides = [...sorted];
    nextSlides.splice(insertIndex, 0, slide);
    const reordered = nextSlides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(slide.id);
    setSelectedSlideIds([slide.id]);
    setSnackbar(`Folie ${insertIndex + 1} eingefügt`);
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
      const imageBoxes = (item.slide.boxes || []).filter(
        (b): b is Extract<ImportedPptxBox, { kind: 'image' }> => b.kind === 'image',
      );
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
    const { sorted, insertIndex } = insertIndexAfterActive(current.slides);
    const copy: PresentationSlide = {
      ...normalizeSlide(activeSlide),
      id: `slide-${Date.now()}`,
      order: insertIndex,
    };
    const nextSlides = [...sorted];
    nextSlides.splice(insertIndex, 0, copy);
    const reordered = nextSlides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(copy.id);
    setSelectedSlideIds([copy.id]);
  };

  const copyActiveSlideToClipboard = () => {
    if (!activeSlide) return;
    const next = pushSlideToClipboard(activeSlide, lessonPath || undefined);
    setSlideClipboard(next);
    setSnackbar(
      next.length >= MAX_SLIDE_CLIPBOARD_ITEMS
        ? `In Ablage (${MAX_SLIDE_CLIPBOARD_ITEMS}/${MAX_SLIDE_CLIPBOARD_ITEMS}, älteste ersetzt)`
        : `In Ablage (${next.length}/${MAX_SLIDE_CLIPBOARD_ITEMS})`,
    );
  };

  const pasteSlideFromClipboard = (itemId: string) => {
    const current = deckRef.current;
    if (!current) return;
    const item = slideClipboard.find((x) => x.id === itemId) || loadSlideClipboard().find((x) => x.id === itemId);
    if (!item?.slide) return;
    const insertAt =
      activeId != null
        ? Math.max(0, sortSlides(current.slides).findIndex((s) => s.id === activeId) + 1)
        : current.slides.length;
    const copy = cloneClipboardSlideForInsert(item.slide, insertAt);
    const slides = [...sortSlides(current.slides)];
    slides.splice(insertAt, 0, copy);
    const reordered = slides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(copy.id);
    setSelectedSlideIds([copy.id]);
    setClipboardAnchor(null);
    setSnackbar('Folie aus Ablage eingefügt');
  };

  const removeClipboardItem = (itemId: string) => {
    setSlideClipboard(removeSlideFromClipboard(itemId));
  };

  const emptyClipboard = () => {
    setSlideClipboard(clearSlideClipboard());
  };

  // Ablage über Tabs/Fenster hinweg synchron halten
  useEffect(() => {
    const refresh = () => setSlideClipboard(loadSlideClipboard());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SLIDE_CLIPBOARD_STORAGE_KEY || e.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

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
    if (!current || current.slides.length <= 1) return;

    const requested =
      selectedSlideIds.length > 0
        ? selectedSlideIds
        : activeSlide
          ? [activeSlide.id]
          : [];
    if (requested.length === 0) return;

    const deleteSet = new Set(requested);
    let survivors = current.slides.filter((s) => !deleteSet.has(s.id));
    if (survivors.length === 0) {
      const keep =
        current.slides.find((s) => s.id === activeId) || current.slides[0];
      if (!keep) return;
      deleteSet.delete(keep.id);
      survivors = [keep];
    }
    if (deleteSet.size === 0) return;

    const toDelete = current.slides.filter((s) => deleteSet.has(s.id));
    let trash = normalizeTrash(current);
    for (const slide of toDelete) {
      trash = [createSlideTrashItem(slide), ...trash].slice(0, MAX_TRASH_ITEMS);
    }

    const slides = survivors.map((s, i) => ({ ...s, order: i }));
    const nextActive =
      (activeId && slides.some((s) => s.id === activeId) && activeId) ||
      slides[Math.min(
        Math.max(0, sortSlides(current.slides).findIndex((s) => s.id === activeId)),
        slides.length - 1,
      )]?.id ||
      slides[0]?.id ||
      null;

    scheduleSave(
      {
        ...current,
        slides,
        trash,
      },
      { history: 'immediate' }
    );
    setActiveId(nextActive);
    setSelectedSlideIds(nextActive ? [nextActive] : []);
    slideSelectionAnchorRef.current = nextActive;
    setSnackbar(
      toDelete.length === 1
        ? 'Folie in Papierkorb verschoben'
        : `${toDelete.length} Folien in Papierkorb verschoben`,
    );
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
      // Leer / ganz leer: Inhaltsbox aus; sonst ausgeblendete Zonen zurücksetzen
      hiddenLayoutZones: isBlankLayout(layout) ? ['bodyHtml'] : undefined,
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
      const data = (await res.json()) as { path?: string; filename?: string };
      // Server-Pfad verwenden (korrekt dekodierte Umlaute), nicht file.name
      if (data.path && typeof data.path === 'string' && data.path.trim()) {
        return data.path.replace(/\\/g, '/');
      }
      const name = (data.filename || file.name || 'bild.png').replace(/\\/g, '/');
      return `${folder}/${name.split('/').pop()}`;
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

    // Drop-Position hat Vorrang: immer freies Element, nicht in leeren Vollbild-Slot/Text
    if (position) {
      addFloatingImageAt(imagePath, position.x, position.y);
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

    addFloatingImageAt(imagePath);
  };

  const handleImageSelected = async (file: File) => {
    await handleImageFile(file);
  };

  const pasteImagesFromClipboardEvent = async (dt: DataTransfer | null | undefined) => {
    const files = await collectPasteImages(dt);
    if (!files.length) return false;
    const ae = document.activeElement;
    if (ae instanceof HTMLElement && ae.closest('[data-pres-notes-zone="true"]')) {
      imageTargetRef.current = 'notes';
    } else {
      imageTargetRef.current = 'element';
    }
    setSnackbar(files.length > 1 ? `${files.length} Ausschnitte werden eingefügt…` : 'Wird eingefügt…');
    for (const file of files) {
      await handleImageFile(file);
    }
    return true;
  };
  const pasteImagesFromClipboardEventRef = useRef(pasteImagesFromClipboardEvent);
  pasteImagesFromClipboardEventRef.current = pasteImagesFromClipboardEvent;

  const pasteFromGoodNotes = () => {
    void (async () => {
      const files = await readImagesFromSystemClipboard();
      if (files.length) {
        imageTargetRef.current = 'element';
        setSnackbar(files.length > 1 ? `${files.length} Ausschnitte werden eingefügt…` : 'Wird eingefügt…');
        for (const file of files) await handleImageFile(file);
        return;
      }
      setSnackbar('Nichts in der Zwischenablage — in GoodNotes Lasso, Kopieren, dann hier erneut tippen');
    })();
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingField(e.target)) return;
      const dt = e.clipboardData;
      if (!clipboardHasImage(dt)) return;
      e.preventDefault();
      e.stopPropagation();
      void pasteImagesFromClipboardEventRef.current(dt);
    };
    window.addEventListener('paste', onPaste, true);
    return () => window.removeEventListener('paste', onPaste, true);
  }, []);

  const handleSlideImageDragEnter = (e: React.DragEvent) => {
    if (!isPresentationImageDragEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setImageDropActive(true);
    const ae = document.activeElement;
    if (ae instanceof HTMLElement && ae.isContentEditable) {
      ae.blur();
    }
  };

  const handleSlideImageDragOver = (e: React.DragEvent) => {
    if (!isPresentationImageDragEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setImageDropActive(true);
  };

  const handleSlideImageDragLeave = (e: React.DragEvent) => {
    if (!isPresentationImageDragEvent(e)) return;
    const next = e.relatedTarget as Node | null;
    if (next && slideShellRef.current?.contains(next)) return;
    if (!next && slideShellRef.current) {
      const r = slideShellRef.current.getBoundingClientRect();
      if (
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      ) {
        return;
      }
    }
    setImageDropActive(false);
  };

  const handleSlideImageDrop = async (e: React.DragEvent) => {
    if (!isPresentationImageDragEvent(e)) return;
    e.preventDefault();
    e.stopPropagation();
    setImageDropActive(false);
    if (imageDropBusyRef.current) return;
    imageDropBusyRef.current = true;

    try {
      const slideEl = slideShellRef.current;
      if (!slideEl || !lessonPath) {
        setSnackbar('Keine Folie aktiv');
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
      const pos = {
        x: Math.min(base.x, 100 - DEFAULT_FLOATING_IMAGE_W - 1.5),
        y: Math.min(base.y, 100 - DEFAULT_FLOATING_IMAGE_H - 1.5),
      };

      const files = extractImageFilesFromDataTransfer(e.dataTransfer);
      if (files.length > 0) {
        setSnackbar(files.length > 1 ? `${files.length} Bilder werden eingefügt…` : 'Bild wird eingefügt…');
        for (let i = 0; i < files.length; i += 1) {
          const offset = i * 3;
          await handleImageFile(files[i], {
            x: Math.min(pos.x + offset, 100 - DEFAULT_FLOATING_IMAGE_W - 1.5),
            y: Math.min(pos.y + offset, 100 - DEFAULT_FLOATING_IMAGE_H - 1.5),
          });
        }
        return;
      }

      // Drag aus anderem Browser-Tab: URL / HTML <img> / DownloadURL
      const imageUrl =
        extractImageUrlFromDataTransfer(e.dataTransfer) ||
        (await extractImageUrlFromDataTransferAsync(e.dataTransfer));
      if (!imageUrl) {
        setSnackbar('Kein Bild erkannt — Bild mit Rechtsklick speichern und Datei hierher ziehen');
        return;
      }

      setSnackbar('Bild aus Tab wird übernommen…');
      try {
        const folder = lessonFolderPath(lessonPath);
        const savedPath = await saveImageUrlToLessonFolder(imageUrl, folder);
        addFloatingImageAt(savedPath, pos.x, pos.y);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Bild aus Tab konnte nicht geladen werden';
        setSnackbar(msg);
      }
    } finally {
      imageDropBusyRef.current = false;
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

  const lessonDisplayName = useMemo(
    () => lessonFolderDisplayName(lessonPath) || deck?.title || 'Stunde',
    [lessonPath, deck?.title],
  );

  const openEntryTicketEdit = useCallback(() => {
    if (!lessonPath) return;
    navigate(presentationEntryTicketEditUrl(lessonPath, groupId || undefined, planMode || 'create'));
  }, [groupId, lessonPath, navigate, planMode]);

  const handlePlanModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, next: 'create' | 'run' | 'background' | null) => {
      if (next == null || !lessonPath) return;
      if (next === 'create') return;
      if (next === 'run') {
        preparePresentationAudioForPlay();
        requestPresentFullscreen();
        navigate(
          presentationPresentUrl(lessonPath, groupId || undefined, 'edited', undefined, 'run'),
        );
        return;
      }
      // Laptop → zurück in die Stundenansicht (Laptop-Modus)
      navigate(presentationLessonBackUrl(lessonPath, groupId, 'background'));
    },
    [groupId, lessonPath, navigate],
  );

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
      {/* Eine Menüleiste: Stunde + Werkzeuge + Modus */}
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
          <Tooltip title={isWochenaufgabenFolderPath(lessonPath) ? 'Zurück zum Dashboard' : 'Zurück zur Stunde'}>
            <IconButton size="small" onClick={handleBack} sx={toolbarIconSx}>
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: 13,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              minWidth: 0,
              maxWidth: 200,
              lineHeight: 1.2,
              flexShrink: 1,
            }}
          >
            {lessonDisplayName}
          </Typography>
          <Tooltip title="Entry Ticket dieser Stunde bearbeiten">
            <IconButton
              size="small"
              onClick={openEntryTicketEdit}
              disabled={!lessonPath}
              sx={{
                flexShrink: 0,
                p: 0,
                minWidth: 22,
                width: 22,
                height: 22,
                borderRadius: 0.8,
                border: '1.5px solid rgba(33, 150, 243, 0.5)',
                background: 'linear-gradient(135deg, #1e88e5 0%, #3949ab 100%)',
                color: 'white',
                boxShadow: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1976d2 0%, #303f9f 100%)',
                },
                '&.Mui-disabled': { opacity: 0.45 },
              }}
              aria-label="Entry Ticket bearbeiten"
            >
              <Typography
                component="span"
                sx={{ fontSize: '0.7rem', fontWeight: 800, lineHeight: 1, color: 'inherit' }}
              >
                E
              </Typography>
            </IconButton>
          </Tooltip>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ borderColor: PRES_EDITOR_UI.barBorder, mx: 0.15, height: 22, alignSelf: 'center' }}
          />

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
              <IconButton size="small" onClick={() => addSlide('blank')} sx={toolbarIconSx}>
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
            <Tooltip title="In Folien-Ablage (über alle Präsentationen, max. 5)">
              <span>
                <IconButton
                  size="small"
                  onClick={copyActiveSlideToClipboard}
                  disabled={!activeSlide}
                  sx={toolbarIconSx}
                >
                  <PasteGoIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip
              title={
                selectedSlideIds.length > 1
                  ? `${selectedSlideIds.length} Folien löschen (→ Papierkorb)`
                  : 'Folie löschen (→ Papierkorb) · Mehrfach: ⌘/Strg+Klick, Shift+Klick'
              }
            >
              <span>
                <IconButton
                  size="small"
                  onClick={deleteSlide}
                  disabled={deck.slides.length <= 1}
                  sx={toolbarIconSx}
                >
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
            <Tooltip title="Folien-Ablage öffnen">
              <IconButton
                size="small"
                onClick={(e) => {
                  setSlideClipboard(loadSlideClipboard());
                  setClipboardAnchor(e.currentTarget);
                }}
                sx={toolbarIconSx}
              >
                <Badge
                  badgeContent={slideClipboard.length}
                  color="primary"
                  invisible={slideClipboard.length === 0}
                  sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}
                >
                  <PasteIcon sx={{ fontSize: 17 }} />
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
          <PresentationSlideClipboardPanel
            anchorEl={clipboardAnchor}
            open={Boolean(clipboardAnchor)}
            items={slideClipboard}
            onClose={() => setClipboardAnchor(null)}
            onPaste={pasteSlideFromClipboard}
            onRemove={removeClipboardItem}
            onClear={emptyClipboard}
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
                onClick={() => {
                  preparePresentationAudioForPlay();
                  requestPresentFullscreen();
                  navigate(presentationPresentUrl(lessonPath, groupId || undefined, undefined, undefined, planMode));
                }}
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

          <Box sx={{ ml: 0.35, display: 'flex', alignItems: 'center' }}>
            <PresentationSoundSplitControl variant="editor" />
          </Box>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={planMode === 'run' || planMode === 'background' ? planMode : 'create'}
            onChange={handlePlanModeChange}
            sx={{
              flexShrink: 0,
              ml: 0.25,
              '& .MuiToggleButton-root': {
                py: 0.25,
                px: 0.75,
                fontSize: '0.65rem',
                textTransform: 'none',
                fontWeight: 600,
                lineHeight: 1.2,
              },
            }}
          >
            <ToggleButton value="create">Erstellen</ToggleButton>
            <ToggleButton value="run">TABLET</ToggleButton>
            <ToggleButton
              value="background"
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'rgba(57, 73, 171, 0.14)',
                  color: '#283593',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'rgba(57, 73, 171, 0.2)' },
                },
              }}
            >
              Laptop
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            px: 0.5,
            py: 0.2,
            borderTop: `1px solid ${PRES_EDITOR_UI.barBorder}`,
            bgcolor: '#f7faf7',
          }}
        >
          <Box
            sx={{
              flex: '0 1 auto',
              width: 'fit-content',
              maxWidth: '100%',
              minWidth: 0,
              display: 'inline-flex',
              alignItems: 'center',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              borderRadius: 1,
              px: 0.25,
              py: 0.1,
              maxHeight: 36,
              ...(animationEditMode
                ? {
                    bgcolor: 'rgba(255,152,0,0.12)',
                    border: '1px solid rgba(255,152,0,0.35)',
                  }
                : PRES_EDITOR_UI.toolbarSection.text),
            }}
          >
            {animationEditMode ? (
              <Typography sx={{ fontSize: 11, color: '#E65100', fontWeight: 600, px: 0.5 }}>
                Element → 0–9
              </Typography>
            ) : (
              <PresentationFormatBar
                activeEditor={activeEditor}
                contextLabel={formatContextLabel}
                lessonPath={lessonPath}
                onEditorChanged={flushActiveEditor}
                onMessage={(msg) => setSnackbar(msg)}
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: 'fit-content',
                  borderRadius: 1,
                  px: 0.25,
                  py: 0.1,
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
                  onPasteFromClipboard={pasteFromGoodNotes}
                  onAddLayoutImage={() => {
                    imageTargetRef.current = 'layout';
                    imageInputRef.current?.click();
                  }}
                  onAddShapeElement={addShapeElement}
                  onAddCardElement={addCardElement}
                  onAddTableElement={addTableElement}
                  activeEditor={activeEditor}
                  onUpdateElement={updateElement}
                  onDeleteElement={deleteElement}
                  onRemoveImageBackground={(id) => void removeSelectedImageBackground(id)}
                  removingImageBackground={removingImageBackground}
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
                  px: 0.2,
                  py: 0.1,
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
          selectedIds={selectedSlideIds.length ? selectedSlideIds : activeId ? [activeId] : []}
          onSelect={handleFilmstripSelect}
          onAdd={() => addSlide('blank')}
          onReorder={reorderSlides}
        />

        {/* Canvas + Notizen */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <Box
            ref={canvasHostRef}
            onDragEnterCapture={handleSlideImageDragEnter}
            onDragOverCapture={handleSlideImageDragOver}
            onDragEnter={handleSlideImageDragEnter}
            onDragOver={handleSlideImageDragOver}
            onDragLeave={handleSlideImageDragLeave}
            onDropCapture={(e) => void handleSlideImageDrop(e)}
            onClickCapture={(e) => {
              if (!lessonPath) return;
              tryHandleLessonEntryTicketLinkClick(e, {
                lessonPath,
                groupId: groupId || undefined,
                returnTo: presentationLessonReturnWithPresentationUrl(lessonPath, groupId || undefined),
                autostart: true,
              });
            }}
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
                onDragEnterCapture={handleSlideImageDragEnter}
                onDragOverCapture={handleSlideImageDragOver}
                onDragLeave={handleSlideImageDragLeave}
                onDropCapture={(e) => void handleSlideImageDrop(e)}
                data-pres-slide-shell
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
                  // Text/Rich-Zones während Datei-Drag nicht als Drop-Ziel
                  ...(imageDropActive
                    ? {
                        '& [contenteditable="true"], & [data-pres-rich-zone]': {
                          pointerEvents: 'none !important',
                        },
                      }
                    : null),
                }}
              >
                {imageDropActive && (
                  <Box
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => void handleSlideImageDrop(e)}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 5000,
                      bgcolor: 'rgba(46,125,50,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      // Muss Events fangen — sonst landet der Drop im contentEditable darunter
                      pointerEvents: 'auto',
                      cursor: 'copy',
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
                        pointerEvents: 'none',
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
                    // Während Datei-Drag: Textfelder durchlässig machen (Drop → Overlay/Folie)
                    ...(imageDropActive
                      ? {
                          '& [contenteditable="true"], & [data-pres-rich-zone]': {
                            pointerEvents: 'none !important',
                          },
                        }
                      : null),
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
                    onDeleteElement={deleteElement}
                    onMoveElementToSlide={moveElementToSlide}
                    onTextElementFocus={(el, elementId, field) => {
                      setActiveEditor(el);
                      setActiveHtmlField(
                        field === 'titleHtml' ? `element-title:${elementId}` : `element:${elementId}`,
                      );
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
