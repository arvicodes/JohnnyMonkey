import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as DeleteIcon,
  ImageOutlined as ImageIcon,
  PlayArrow as PresentIcon,
  SaveOutlined as SaveIcon,
  Slideshow as SlideshowIcon,
  TextFields as TextIcon,
} from '@mui/icons-material';
import PresentationFormatBar from '../components/presentation/PresentationFormatBar';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
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
  normalizeSlide,
  presentationPresentUrl,
  saveJsonFile,
  sortSlides,
  SLIDE_REF_HEIGHT,
  SLIDE_TRANSITIONS,
} from '../lib/presentationDeck';
import { JOHNNY_ACCENT_PRESETS, JOHNNY_PRESENTATION } from '../lib/presentationTheme';
import {
  assignRevealSteps,
  getSlideMaxRevealSteps,
  stripAllRevealSteps,
} from '../lib/presentationReveal';
import type { SlideTransition } from '../lib/presentationTransitions';

const THUMB_SCALE = 0.105;
const CANVAS_SCALE = 0.48;

const PresentationEditorPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lessonPath = params.get('lessonPath') || '';
  const groupId = params.get('groupId') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState('');
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);
  const [activeEditor, setActiveEditor] = useState<HTMLElement | null>(null);
  const [activeHtmlField, setActiveHtmlField] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const HTML_TO_PLAIN: Record<string, keyof PresentationSlide> = {
    titleHtml: 'title',
    bodyHtml: 'body',
    subtitleHtml: 'subtitle',
    bodyLeftHtml: 'bodyLeft',
    bodyRightHtml: 'bodyRight',
    imageCaptionHtml: 'imageCaption',
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
      setDeck(d);
      setActiveId(d.slides[0]?.id ?? null);
      setLoading(false);
    });
  }, [lessonPath]);

  const activeSlide = deck?.slides.find((s) => s.id === activeId) ?? deck?.slides[0];
  const normalizedActive = activeSlide ? normalizeSlide(activeSlide) : null;

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
    (next: PresentationDeck) => {
      setDeck(next);
      deckRef.current = next;
      const version = ++saveVersionRef.current;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void persistDeck(next, version), 600);
    },
    [persistDeck]
  );

  const updateSlide = (patch: Partial<PresentationSlide>) => {
    const current = deckRef.current;
    if (!current || !activeId) return;
    const slides = current.slides.map((s) =>
      s.id === activeId ? normalizeSlide({ ...s, ...patch }) : s
    );
    scheduleSave({ ...current, slides });
  };

  const flushActiveEditor = () => {
    if (!activeEditor) return;
    if (activeHtmlField?.startsWith('element:')) {
      const id = activeHtmlField.slice(8);
      updateElement(id, { html: activeEditor.innerHTML });
      return;
    }
    if (!activeHtmlField) return;
    const html = activeEditor.innerHTML;
    const plainKey = HTML_TO_PLAIN[activeHtmlField];
    updateSlide({
      [activeHtmlField]: html,
      ...(plainKey ? { [plainKey]: htmlToPlain(html) } : {}),
    } as Partial<PresentationSlide>);
  };

  const assignRevealToBody = () => {
    if (!normalizedActive) return;
    const field = activeHtmlField || 'bodyHtml';
    const plainKey = HTML_TO_PLAIN[field];
    const currentHtml = (normalizedActive[field as keyof PresentationSlide] as string) || '';
    const html = assignRevealSteps(currentHtml);
    updateSlide({
      [field]: html,
      ...(plainKey ? { [plainKey]: htmlToPlain(html) } : {}),
      revealEnabled: true,
    } as Partial<PresentationSlide>);
    setSnackbar('Einblend-Schritte gesetzt');
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
      revealStep: 0,
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
      revealStep: 0,
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

  const selectedElement = normalizedActive?.elements?.find((e) => e.id === selectedElementId);

  const addSlide = (layout: SlideLayout = 'title-content') => {
    const current = deckRef.current;
    if (!current) return;
    const slide = createSlideFromLayout(current.slides.length, layout);
    const next = { ...current, slides: [...current.slides, slide] };
    scheduleSave(next);
    setActiveId(slide.id);
    setLayoutMenuAnchor(null);
    setSnackbar(`Folie ${next.slides.length} hinzugefügt`);
  };

  const duplicateSlide = () => {
    const current = deckRef.current;
    if (!current || !activeSlide) return;
    const copy: PresentationSlide = {
      ...normalizeSlide(activeSlide),
      id: `slide-${Date.now()}`,
      order: current.slides.length,
    };
    scheduleSave({ ...current, slides: [...current.slides, copy] });
    setActiveId(copy.id);
  };

  const deleteSlide = () => {
    const current = deckRef.current;
    if (!current || !activeSlide || current.slides.length <= 1) return;
    const slides = current.slides
      .filter((s) => s.id !== activeSlide.id)
      .map((s, i) => ({ ...s, order: i }));
    scheduleSave({ ...current, slides });
    setActiveId(slides[0]?.id ?? null);
  };

  const moveSlide = (id: string, dir: -1 | 1) => {
    const current = deckRef.current;
    if (!current) return;
    const sorted = sortSlides(current.slides);
    const idx = sorted.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= sorted.length) return;
    const copy = [...sorted];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    scheduleSave({ ...current, slides: copy.map((s, i) => ({ ...s, order: i })) });
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

  const showLayoutImage =
    normalizedActive?.layout === 'image-left' || normalizedActive?.layout === 'image-right';

  if (!lessonPath) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Kein Stundenordner angegeben.</Typography>
      </Box>
    );
  }

  if (loading || !deck) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} sx={{ color: JOHNNY_PRESENTATION.primary }} />
      </Box>
    );
  }

  const sortedSlides = sortSlides(deck.slides);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1e1e1e', overflow: 'hidden' }}>
      {/* Ribbon */}
      <Box
        sx={{
          bgcolor: '#252526',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            height: 40,
            px: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <IconButton size="small" onClick={() => window.close()} sx={{ color: '#ccc' }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <SlideshowIcon sx={{ fontSize: 18, color: JOHNNY_PRESENTATION.primaryLight, mx: 0.5 }} />
          <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 600, mr: 1 }}>
            Präsentation
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#444', mx: 0.5 }} />

          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => addSlide('title-content')}
            sx={{ color: '#eee', fontSize: 11, minWidth: 0, px: 1, mr: 0.5 }}
          >
            Folie
          </Button>
          <Tooltip title="Folie mit Layout wählen">
            <IconButton
              size="small"
              onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
              sx={{ color: '#ddd' }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={layoutMenuAnchor}
            open={Boolean(layoutMenuAnchor)}
            onClose={() => setLayoutMenuAnchor(null)}
          >
            {SLIDE_LAYOUTS.map((l) => (
              <MenuItem
                key={l.id}
                onClick={() => addSlide(l.id)}
                dense
              >
                <Box>
                  <Typography variant="body2">{l.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {l.hint}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Menu>

          <Tooltip title="Duplizieren">
            <IconButton size="small" onClick={duplicateSlide} sx={{ color: '#ddd' }}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Löschen">
            <span>
              <IconButton
                size="small"
                onClick={deleteSlide}
                disabled={deck.slides.length <= 1}
                sx={{ color: '#ddd' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Box sx={{ flex: 1 }} />
          {saving && <CircularProgress size={16} sx={{ color: JOHNNY_PRESENTATION.primaryLight, mr: 1 }} />}
          <Button
            size="small"
            startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              const v = ++saveVersionRef.current;
              void persistDeck(deck, v);
            }}
            sx={{ color: '#ccc', minWidth: 0, px: 1, fontSize: 12 }}
          >
            Speichern
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PresentIcon sx={{ fontSize: 16 }} />}
            onClick={() => window.open(presentationPresentUrl(lessonPath, groupId || undefined), '_blank')}
            sx={{
              bgcolor: JOHNNY_PRESENTATION.primary,
              fontSize: 12,
              px: 1.5,
              '&:hover': { bgcolor: JOHNNY_PRESENTATION.primaryDark },
            }}
          >
            Präsentieren
          </Button>
        </Box>

        {/* Formatierung */}
        <Box sx={{ px: 1, py: 0.5, borderTop: '1px solid #333', bgcolor: '#2a2a2a' }}>
          <PresentationFormatBar
            activeEditor={activeEditor}
            onEditorChanged={flushActiveEditor}
            onInsertImage={() => {
              imageTargetRef.current = 'inline';
              imageInputRef.current?.click();
            }}
          />
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

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Filmstreifen */}
        <Box
          sx={{
            width: 168,
            bgcolor: '#252526',
            borderRight: '1px solid #333',
            overflowY: 'auto',
            py: 1,
            px: 0.75,
            flexShrink: 0,
          }}
        >
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
            onClick={() => addSlide('title-content')}
            sx={{
              mb: 1,
              fontSize: 11,
              color: JOHNNY_PRESENTATION.primaryLight,
              borderColor: `${JOHNNY_PRESENTATION.primary}66`,
              '&:hover': { borderColor: JOHNNY_PRESENTATION.primaryLight },
            }}
          >
            Neue Folie
          </Button>
          {sortedSlides.map((slide, idx) => (
            <Box
              key={slide.id}
              onClick={() => setActiveId(slide.id)}
              sx={{
                mb: 0.75,
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: slide.id === activeId ? JOHNNY_PRESENTATION.primaryLight : 'transparent',
                bgcolor: slide.id === activeId ? '#3c3c3c' : '#2d2d2d',
                '&:hover': { borderColor: slide.id === activeId ? JOHNNY_PRESENTATION.primaryLight : '#555' },
              }}
            >
              <Box sx={{ overflow: 'hidden', height: SLIDE_REF_HEIGHT * THUMB_SCALE, pointerEvents: 'none' }}>
                <PresentationSlideView slide={slide} scale={THUMB_SCALE} showLogo={false} />
              </Box>
              <Typography
                variant="caption"
                sx={{ display: 'block', textAlign: 'center', color: '#999', py: 0.25, fontSize: 10 }}
              >
                {idx + 1}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Canvas */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#323232',
            overflow: 'auto',
            p: 2,
          }}
        >
          {normalizedActive && (
            <PresentationSlideView
              slide={normalizedActive}
              scale={CANVAS_SCALE}
              editable
              revealStep={999}
              revealEnabled={false}
              selectedElementId={selectedElementId}
              onElementSelect={setSelectedElementId}
              onElementChange={updateElement}
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
          )}
        </Box>

        {/* Inspector */}
        <Box
          sx={{
            width: 248,
            bgcolor: '#252526',
            borderLeft: '1px solid #333',
            overflowY: 'auto',
            flexShrink: 0,
            color: '#ccc',
          }}
        >
          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Präsentation
          </Typography>
          <Box sx={{ px: 1.5, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Titel der Präsentation"
              value={deck.title}
              onChange={(e) => scheduleSave({ ...deck, title: e.target.value })}
              sx={{
                '& .MuiInputBase-root': { fontSize: 13, color: '#eee', bgcolor: '#1e1e1e' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              }}
            />
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Layout
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5, px: 1.5, pb: 1 }}>
            {SLIDE_LAYOUTS.map((l) => {
              const active = normalizedActive?.layout === l.id;
              return (
                <Box
                  key={l.id}
                  onClick={() => applyLayout(l.id)}
                  sx={{
                    p: 0.75,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: active ? JOHNNY_PRESENTATION.primaryLight : '#444',
                    bgcolor: active ? '#2a3d2c' : '#1e1e1e',
                    '&:hover': { borderColor: JOHNNY_PRESENTATION.primaryLight },
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: active ? JOHNNY_PRESENTATION.primaryLight : '#bbb' }}>
                    {l.label}
                  </Typography>
                  <Typography sx={{ fontSize: 9, color: '#777', lineHeight: 1.2 }}>{l.hint}</Typography>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Übergang
          </Typography>
          <Box sx={{ px: 1.5, pb: 1 }}>
            <TextField
              select
              size="small"
              fullWidth
              label="Folie"
              value={normalizedActive?.transition || 'fade'}
              onChange={(e) => updateSlide({ transition: e.target.value as SlideTransition })}
              sx={{
                mb: 1,
                '& .MuiInputBase-root': { fontSize: 12, color: '#ddd', bgcolor: '#1e1e1e' },
                '& .MuiInputLabel-root': { color: '#888', fontSize: 12 },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              }}
            >
              {SLIDE_TRANSITIONS.map((t) => (
                <MenuItem key={t.id} value={t.id} dense>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              fullWidth
              label="Standard"
              value={deck.defaultTransition || 'fade'}
              onChange={(e) =>
                scheduleSave({ ...deck, defaultTransition: e.target.value as SlideTransition })
              }
              sx={{
                '& .MuiInputBase-root': { fontSize: 12, color: '#ddd', bgcolor: '#1e1e1e' },
                '& .MuiInputLabel-root': { color: '#888', fontSize: 12 },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              }}
            >
              {SLIDE_TRANSITIONS.map((t) => (
                <MenuItem key={t.id} value={t.id} dense>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Einblenden
          </Typography>
          <Box sx={{ px: 1.5, pb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={normalizedActive?.revealEnabled !== false}
                  onChange={(e) => updateSlide({ revealEnabled: e.target.checked })}
                />
              }
              label={<Typography sx={{ fontSize: 12, color: '#bbb' }}>Schrittweise einblenden</Typography>}
            />
            <Button
              fullWidth
              size="small"
              variant="outlined"
              onClick={assignRevealToBody}
              sx={{ fontSize: 11, color: '#ccc', borderColor: '#555', mb: 0.5 }}
            >
              Absätze auto-nummerieren
            </Button>
            <Button
              fullWidth
              size="small"
              onClick={() => {
                if (!activeHtmlField || !normalizedActive) return;
                const html = stripAllRevealSteps(
                  (normalizedActive[activeHtmlField as keyof PresentationSlide] as string) || ''
                );
                const plainKey = HTML_TO_PLAIN[activeHtmlField];
                updateSlide({
                  [activeHtmlField]: html,
                  ...(plainKey ? { [plainKey]: htmlToPlain(html) } : {}),
                } as Partial<PresentationSlide>);
              }}
              sx={{ fontSize: 11, color: '#888' }}
            >
              Schritte entfernen
            </Button>
            <Typography sx={{ fontSize: 10, color: '#666', mt: 0.5 }}>
              {normalizedActive
                ? `${getSlideMaxRevealSteps(normalizedActive)} Einblend-Schritte auf dieser Folie`
                : ''}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Bilder & Elemente
          </Typography>
          <Box sx={{ px: 1.5, pb: 1 }}>
            <Typography sx={{ fontSize: 10, color: '#777', mb: 0.75 }}>
              Elemente auf der Folie ziehen · Ecke ziehen = Größe
            </Typography>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<TextIcon sx={{ fontSize: 16 }} />}
              onClick={addTextElement}
              sx={{ fontSize: 11, color: '#ccc', borderColor: '#555', mb: 0.75 }}
            >
              Textfeld
            </Button>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                imageTargetRef.current = 'element';
                imageInputRef.current?.click();
              }}
              sx={{ fontSize: 11, color: '#ccc', borderColor: '#555', mb: 1 }}
            >
              Bild
            </Button>
            {(normalizedActive?.elements || []).map((el) => (
              <Box
                key={el.id}
                onClick={() => setSelectedElementId(el.id)}
                sx={{
                  p: 0.75,
                  mb: 0.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: selectedElementId === el.id ? JOHNNY_PRESENTATION.primaryLight : '#444',
                  bgcolor: '#1e1e1e',
                  cursor: 'pointer',
                }}
              >
                <Typography sx={{ fontSize: 11, color: '#bbb' }}>
                  {el.type === 'image' ? '🖼 Bild' : el.type} · Schritt {el.revealStep ?? 0}
                </Typography>
              </Box>
            ))}
            {selectedElement && (
              <Box sx={{ mt: 1 }}>
                {(['x', 'y', 'w', 'h'] as const).map((key) => (
                  <TextField
                    key={key}
                    size="small"
                    type="number"
                    label={key.toUpperCase()}
                    value={selectedElement[key]}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { [key]: Number(e.target.value) })
                    }
                    sx={{
                      width: '48%',
                      mr: key === 'x' || key === 'w' ? '4%' : 0,
                      mb: 0.5,
                      '& .MuiInputBase-root': { fontSize: 11, color: '#ddd' },
                      '& .MuiInputLabel-root': { fontSize: 11 },
                    }}
                  />
                ))}
                <TextField
                  size="small"
                  type="number"
                  fullWidth
                  label="Einblend-Schritt"
                  value={selectedElement.revealStep ?? 0}
                  onChange={(e) =>
                    updateElement(selectedElement.id, { revealStep: Number(e.target.value) })
                  }
                  sx={{
                    mb: 0.5,
                    '& .MuiInputBase-root': { fontSize: 11, color: '#ddd' },
                    '& .MuiInputLabel-root': { fontSize: 11 },
                  }}
                />
                <Button
                  size="small"
                  color="error"
                  fullWidth
                  onClick={() => deleteElement(selectedElement.id)}
                  sx={{ fontSize: 11 }}
                >
                  Element löschen
                </Button>
              </Box>
            )}
          </Box>

          {showLayoutImage && (
            <>
              <Divider sx={{ borderColor: '#333' }} />
              <Box sx={{ px: 1.5, py: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<ImageIcon sx={{ fontSize: 16 }} />}
                  onClick={() => {
                    imageTargetRef.current = 'layout';
                    imageInputRef.current?.click();
                  }}
                  sx={{ fontSize: 11, color: '#ccc', borderColor: '#555' }}
                >
                  Bild für Layout
                </Button>
              </Box>
            </>
          )}

          <Divider sx={{ borderColor: '#333' }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Akzentfarbe
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, px: 1.5, pb: 1 }}>
            {JOHNNY_ACCENT_PRESETS.map((c) => (
              <Box
                key={c}
                onClick={() => updateSlide({ accentColor: c })}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: c,
                  cursor: 'pointer',
                  border:
                    normalizedActive?.accentColor === c ? '2px solid #fff' : '2px solid transparent',
                }}
              />
            ))}
          </Box>

          <Divider sx={{ borderColor: '#333' }} />

          <Typography
            variant="overline"
            sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, color: '#888', fontSize: 10, letterSpacing: 1 }}
          >
            Sprecher-notizen
          </Typography>
          <Box sx={{ px: 1.5, pb: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={4}
              placeholder="Nur im Laptop-Modus sichtbar"
              value={normalizedActive?.speakerNotes ?? ''}
              onChange={(e) => updateSlide({ speakerNotes: e.target.value })}
              sx={{
                '& .MuiInputBase-root': { fontSize: 12, color: '#ddd', bgcolor: '#1e1e1e' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, py: 1 }}>
            <Button
              size="small"
              fullWidth
              onClick={() => activeSlide && moveSlide(activeSlide.id, -1)}
              sx={{ color: '#aaa', fontSize: 11, borderColor: '#555' }}
              variant="outlined"
            >
              ↑
            </Button>
            <Button
              size="small"
              fullWidth
              onClick={() => activeSlide && moveSlide(activeSlide.id, 1)}
              sx={{ color: '#aaa', fontSize: 11, borderColor: '#555' }}
              variant="outlined"
            >
              ↓
            </Button>
          </Box>
        </Box>
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
