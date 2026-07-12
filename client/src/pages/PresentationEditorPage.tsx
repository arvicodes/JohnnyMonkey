import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
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
  ContentCopy as CopyIcon,
  DeleteOutline as DeleteIcon,
  PlayArrow as PresentIcon,
  RestoreFromTrash as TrashBinIcon,
  SaveOutlined as SaveIcon,
  Slideshow as SlideshowIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ViewQuilt as LayoutIcon,
} from '@mui/icons-material';
import PresentationSlideTemplateBar from '../components/presentation/PresentationSlideTemplateBar';
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
  PresentationSlide,
  SlideElement,
  SlideLayout,
  htmlToPlain,
  loadPresentationDeck,
  lessonFolderPath,
  normalizeDeck,
  normalizeSlide,
  presentationPresentUrl,
  saveJsonFile,
  sortSlides,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../lib/presentationDeck';
import { JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import { PRES_EDITOR_UI, presentationEditorBackTarget } from '../lib/presentationEditorUi';
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

import { arrayMove } from '@dnd-kit/sortable';
import { assignSlideParagraphSteps, resetAllSlideAnimations, slidePatchFromAnimationItem, slidePatchFromClearAnimationItem } from '../lib/presentationAnimation';
import {
  createDefaultTemplatesStore,
  createSlideFromTemplateKind,
  loadSlideTemplates,
  saveSlideTemplates,
  SLIDE_TEMPLATE_META,
  slideToTemplatePayload,
  type SlideTemplateKind,
  type SlideTemplatesStore,
} from '../lib/presentationSlideTemplates';

import {
  applyFontSizePresetIndex,
  bookmarkSelection,
  getEditorFontSizeSteps,
  nudgeFontSize,
} from '../lib/presentationRichText';

const PresentationEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const groupId = params.get('groupId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [activeEditor, setActiveEditor] = useState<HTMLElement | null>(null);
  const [activeHtmlField, setActiveHtmlField] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [animationEditMode, setAnimationEditMode] = useState(false);
  const [selectedAnimationTarget, setSelectedAnimationTarget] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(0.4);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [trashAnchor, setTrashAnchor] = useState<HTMLElement | null>(null);
  const [slideTransitionPreviewKey, setSlideTransitionPreviewKey] = useState(0);
  const [slideTemplates, setSlideTemplates] = useState<SlideTemplatesStore>(
    createDefaultTemplatesStore(),
  );
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const slideShellRef = useRef<HTMLDivElement>(null);
  const canvasHostObserverRef = useRef<ResizeObserver | null>(null);

  const syncSlideViewport = useCallback(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width < 40 || height < 40) return;

    const scaleW = width / SLIDE_REF_WIDTH;
    const scaleH = height / SLIDE_REF_HEIGHT;
    const scale = previewMode ? Math.min(scaleW, scaleH) : scaleW;
    setCanvasScale(scale);
  }, [previewMode]);

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
  }, [loading, syncSlideViewport]);

  useLayoutEffect(() => {
    if (loading) return;
    syncSlideViewport();
    const id = requestAnimationFrame(() => syncSlideViewport());
    return () => cancelAnimationFrame(id);
  }, [previewMode, activeId, loading, syncSlideViewport]);

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

  const slideViewportW = previewMode ? SLIDE_REF_WIDTH * canvasScale : undefined;
  const slideViewportH = SLIDE_REF_HEIGHT * canvasScale;
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
  const saveVersionRef = useRef(0);
  const deckRef = useRef<PresentationDeck | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageTargetRef = useRef<'inline' | 'layout' | 'element'>('inline');

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  useEffect(() => {
    if (!lessonPath) {
      setLoading(false);
      return;
    }
    loadPresentationDeck(lessonPath).then((d) => {
      const normalized = normalizeDeck(d);
      historyRef.current = createDeckHistory(normalized);
      setHistoryVersion((v) => v + 1);
      setDeck(normalized);
      deckRef.current = normalized;
      setActiveId(normalized.slides[0]?.id ?? null);
      setLoading(false);
    });
    loadSlideTemplates(lessonPath)
      .then(setSlideTemplates)
      .catch(() => setSlideTemplates(createDefaultTemplatesStore()));
  }, [lessonPath]);

  const activeSlide = deck?.slides.find((s) => s.id === activeId) ?? deck?.slides[0];
  const normalizedActive = activeSlide ? normalizeSlide(activeSlide) : null;

  const selectSlide = (id: string) => {
    if (id === activeId) return;
    commitEditorState({ history: 'skip' });
    setActiveId(id);
    setSelectedElementId(null);
    setActiveEditor(null);
    setActiveHtmlField(null);
  };

  const persistDeck = useCallback(
    async (next: PresentationDeck, version: number) => {
      if (!lessonPath) return;
      setSaving(true);
      try {
        const payload = {
          ...next,
          updatedAt: new Date().toISOString(),
          slides: sortSlides(next.slides.map(normalizeSlide)),
        };
        await saveJsonFile(lessonPath, DECK_FILENAME, payload);
        if (version === saveVersionRef.current) {
          setDeck(payload);
        }
      } catch (e) {
        setSnackbar(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
      } finally {
        setSaving(false);
      }
    },
    [lessonPath]
  );

  const scheduleSave = useCallback(
    (
      next: PresentationDeck,
      options?: { history?: 'debounced' | 'immediate' | 'skip' }
    ) => {
      setDeck(next);
      deckRef.current = next;

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
          historyPushTimer.current = setTimeout(push, 700);
        }
      }

      const version = ++saveVersionRef.current;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistDeck(next, version), 600);
    },
    [persistDeck]
  );

  const commitEditorState = useCallback(
    (options?: { history?: 'debounced' | 'immediate' | 'skip' }) => {
      if (!activeEditor || !activeHtmlField) return;
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
        scheduleSave({ ...current, slides }, options);
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
      scheduleSave({ ...current, slides }, options);
    },
    [activeEditor, activeHtmlField, activeId, scheduleSave]
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
      if (e.key === 'Escape' && previewMode) {
        setPreviewMode(false);
        return;
      }

      if (previewMode) return;
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
  }, [previewMode, undo, redo, activeEditor, commitEditorState]);

  const canUndo = canUndoDeck(historyRef.current);
  const canRedo = canRedoDeck(historyRef.current);
  void historyVersion;

  const updateSlide = (patch: Partial<PresentationSlide>) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slides = current.slides.map((s) =>
      s.id === activeId ? normalizeSlide({ ...s, ...patch }) : s
    );
    scheduleSave({ ...current, slides });
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

  const addFloatingImageAt = (path: string, x = 25, y = 22, w = 45, h = 40) => {
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
    setSnackbar('Bild eingefügt — ziehen & Größe am Eck anpassen');
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
    setSnackbar('Textfeld — ziehen, anklicken zum Bearbeiten');
  };

  const updateElement = (id: string, patch: Partial<SlideElement>) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slides = current.slides.map((s) => {
      if (s.id !== activeId) return s;
      const elements = (s.elements || []).map((e) => (e.id === id ? { ...e, ...patch } : e));
      return normalizeSlide({ ...s, elements });
    });
    scheduleSave({ ...current, slides });
  };

  const deleteElement = (id: string) => {
    if (!normalizedActive) return;
    updateSlide({ elements: (normalizedActive.elements || []).filter((e) => e.id !== id) });
    if (selectedElementId === id) setSelectedElementId(null);
  };

  useEffect(() => {
    if (previewMode || animationEditMode) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (!selectedElementId) return;

      const slide = deckRef.current?.slides.find((s) => s.id === activeId);
      const element = slide?.elements?.find((el) => el.id === selectedElementId);
      if (!element) return;

      if (isFormatBarInteracting()) return;
      if (isAnimationKeyBlocked()) return;

      if (element.type === 'image') {
        e.preventDefault();
        deleteElement(selectedElementId);
        setSnackbar('Bild entfernt');
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
    previewMode,
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
    else if (kind === 'ha') insertIndex = slides.length;
    else if (activeIndex >= 0) insertIndex = activeIndex + 1;

    const slide = createSlideFromTemplateKind(kind, insertIndex, lessonPath, slideTemplates);
    if (!slide) return;

    const nextSlides = [...slides];
    nextSlides.splice(insertIndex, 0, slide);
    const reordered = nextSlides.map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
    setActiveId(slide.id);
    const label = SLIDE_TEMPLATE_META.find((m) => m.kind === kind)?.label ?? 'Vorlage';
    setSnackbar(`${label}-Folie eingefügt`);
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
    scheduleSave({ ...current, slides: reordered }, { history: 'immediate' });
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

  const moveNotesToTrash = (fieldKey: NotesFieldKey) => {
    const current = deckRef.current;
    if (!current || !normalizedActive) return;
    const trashItem = createNotesTrashItem(normalizedActive, fieldKey);
    if (!trashItem) {
      setSnackbar('Notiz ist bereits leer');
      return;
    }

    const patch =
      fieldKey === 'materialHtml'
        ? { materialHtml: '<p><br></p>', materialNotes: '' }
        : fieldKey === 'preparationHtml'
          ? { preparationHtml: '<p><br></p>', preparationNotes: '' }
          : { speakerNotesHtml: '<p><br></p>', speakerNotes: '' };

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
      setSnackbar(e instanceof Error ? e.message : 'Upload fehlgeschlagen');
      return null;
    }
  };

  const handleImageSelected = async (file: File) => {
    const imagePath = await uploadImageFile(file);
    if (!imagePath) return;

    if (imageTargetRef.current === 'layout') {
      updateSlide({ imagePath });
      setSnackbar('Bild in Folien-Layout gesetzt');
      return;
    }

    if (imageTargetRef.current === 'element') {
      addFloatingImageAt(imagePath);
      return;
    }

    if (imageTargetRef.current === 'inline') {
      addFloatingImageAt(imagePath);
      return;
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
    navigate(presentationEditorBackTarget(groupId));
  };

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
    activeHtmlField === 'materialHtml'
      ? 'Material'
      : activeHtmlField === 'preparationHtml'
        ? 'Setup'
        : activeHtmlField === 'speakerNotesHtml'
          ? 'Sprechakte'
          : activeHtmlField?.startsWith('element:')
            ? 'Element'
            : activeHtmlField
              ? 'Folie'
              : undefined;

  const notesActiveField: NotesFieldKey | null =
    activeHtmlField === 'materialHtml' ||
    activeHtmlField === 'preparationHtml' ||
    activeHtmlField === 'speakerNotesHtml'
      ? activeHtmlField
      : null;

  const sortedSlides = sortSlides(deck.slides);
  const activeSlideNumber = Math.max(
    1,
    sortedSlides.findIndex((slide) => slide.id === activeId) + 1
  );

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

          <SlideshowIcon sx={{ fontSize: 20, color: PRES_EDITOR_UI.accent, flexShrink: 0 }} />
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
              onSaveTemplate={(kind) => void saveCurrentAsTemplate(kind)}
            />
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
                disabled={!canUndo || previewMode}
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
                disabled={!canRedo || previewMode}
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
            <Tooltip title="Speichern">
              <IconButton
                size="small"
                onClick={() => {
                  const v = ++saveVersionRef.current;
                  void persistDeck(deck, v);
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
            <Tooltip title="Präsentieren">
              <IconButton
                size="small"
                onClick={() =>
                  window.open(presentationPresentUrl(lessonPath, groupId || undefined), '_blank')
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

        {!previewMode && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            px: 1.25,
            py: 0.5,
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
              px: 0.75,
              py: 0.35,
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
                  px: 0.75,
                  py: 0.35,
                  ...PRES_EDITOR_UI.toolbarSection.slide,
                }}
              >
                <PresentationSlideToolsBar
                  slide={normalizedActive}
                  selectedElement={selectedElement ?? null}
                  selectedElementId={selectedElementId}
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
                  onSelectElement={setSelectedElementId}
                  onUpdateElement={updateElement}
                  onDeleteElement={deleteElement}
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
                  onUpdateDeck={(patch) => scheduleSave({ ...deck, ...patch })}
                  onAutoAssignParagraphs={autoAssignParagraphs}
                  onResetAllAnimations={resetAllAnimations}
                />
              </Box>
            </>
          )}
        </Box>
        )}
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
        {!previewMode && (
          <PresentationFilmstrip
            slides={sortedSlides}
            activeId={activeId}
            onSelect={selectSlide}
            onAdd={() => addSlide('title-content')}
            onReorder={reorderSlides}
          />
        )}

        {/* Canvas + Notizen */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <Box
            ref={canvasHostRef}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              justifyContent: 'center',
              bgcolor: PRES_EDITOR_UI.pageBg,
              overflow: 'hidden',
              position: 'relative',
              minHeight: 0,
              minWidth: 0,
              width: '100%',
            }}
          >
            {previewMode && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 12,
                  color: PRES_EDITOR_UI.accent,
                  fontWeight: 700,
                  fontSize: 11,
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              >
                Vorschau — Esc oder Button zum Beenden
              </Typography>
            )}
            {normalizedActive && canvasScale > 0 && (
              <Box
                key={`${normalizedActive.id}-${slideTransitionPreviewKey}`}
                ref={slideShellRef}
                sx={{
                  width: previewMode ? slideViewportW : '100%',
                  height: slideViewportH,
                  maxHeight: '100%',
                  flexShrink: 0,
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  position: 'relative',
                  alignSelf: previewMode ? 'center' : 'stretch',
                  borderRadius: `${8 * canvasScale}px`,
                  boxShadow: previewMode
                    ? '0 12px 40px rgba(0,0,0,0.16)'
                    : '0 8px 28px rgba(0,0,0,0.14)',
                  animation: resolveSlideTransitionAnimation(normalizedActive.transition),
                  willChange: 'transform, opacity, filter',
                }}
              >
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
                    editable={!previewMode}
                    revealStep={999}
                    revealEnabled={false}
                    animationEditMode={!previewMode && animationEditMode}
                    selectedAnimationTarget={selectedAnimationTarget}
                    onAnimationTargetClick={setSelectedAnimationTarget}
                    showSlideNumbers={deck.showSlideNumbers !== false}
                    slideNumber={activeSlideNumber}
                    slideTotal={sortedSlides.length}
                    showSlideFooter={deck.showSlideFooter !== false}
                    slideFooter={deck.slideFooter}
                    deckTitle={deck.title}
                    selectedElementId={previewMode ? null : selectedElementId}
                    onElementSelect={previewMode ? undefined : setSelectedElementId}
                    onElementChange={previewMode ? undefined : updateElement}
                    onTextElementFocus={
                      previewMode
                        ? undefined
                        : (el, elementId) => {
                            setActiveEditor(el);
                            setActiveHtmlField(`element:${elementId}`);
                            setSelectedElementId(elementId);
                          }
                    }
                    onChange={previewMode ? undefined : (patch) => updateSlide(patch)}
                    onEditorFocus={
                      previewMode
                        ? undefined
                        : (el, fieldKey) => {
                            setActiveEditor(el);
                            setActiveHtmlField(fieldKey ?? null);
                            setSelectedElementId(null);
                          }
                    }
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {normalizedActive && !previewMode && (
          <PresentationNotesPanel
            materialHtml={normalizedActive.materialHtml}
            materialPlain={normalizedActive.materialNotes}
            preparationHtml={normalizedActive.preparationHtml}
            preparationPlain={normalizedActive.preparationNotes}
            speakerHtml={normalizedActive.speakerNotesHtml}
            speakerPlain={normalizedActive.speakerNotes}
            activeField={notesActiveField}
            readOnly={previewMode}
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
            onMaterialChange={(html, plain) =>
              updateSlide({ materialHtml: html, materialNotes: plain })
            }
            onPreparationChange={(html, plain) =>
              updateSlide({ preparationHtml: html, preparationNotes: plain })
            }
            onSpeakerChange={(html, plain) =>
              updateSlide({ speakerNotesHtml: html, speakerNotes: plain })
            }
            onMoveNotesToTrash={moveNotesToTrash}
          />
        )}
      </Box>

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
