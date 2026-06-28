import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Circle as CircleIcon,
  CropSquare as RectIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Layers as LayersIcon,
  Palette as PaletteIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  TextFields as TextIcon,
  Undo as UndoIcon,
  ViewModule as TemplateIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import { apiGet, apiPut } from '../../lib/api';
import { flyerPageUrl } from '../../lib/announcementPaths';
import { exportFlyerHtml } from './exportHtml';
import { FlyerStudioCanvas } from './FlyerStudioCanvas';
import { FLYER_FONTS, FLYER_GRADIENTS, FLYER_PAGE_W, FLYER_SWATCHES } from './constants';
import { FLYER_TEMPLATES } from './templates';
import { cloneDocument, newElementId, type FlyerDocument, type FlyerElement } from './types';

type Props = {
  folderSlug: string;
  announcementTitle?: string;
};

type LeftTab = 'templates' | 'text' | 'shapes' | 'images' | 'background';

const SIDEBAR_W = 280;
const PROPS_W = 260;

function remapIds(doc: FlyerDocument): FlyerDocument {
  const next = cloneDocument(doc);
  next.pages = next.pages.map((page) => ({
    ...page,
    elements: page.elements.map((el) => ({ ...el, id: newElementId() })),
  }));
  return next;
}

export function FlyerStudioEditor({ folderSlug, announcementTitle }: Props) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>('templates');
  const [scale, setScale] = useState(0.72);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [doc, setDoc] = useState<FlyerDocument>(() => ({
    version: 1,
    title: announcementTitle || 'Flyer',
    pages: [{ background: '#ffffff', elements: [] }],
  }));

  const historyRef = useRef<FlyerDocument[]>([]);
  const historyIndexRef = useRef(-1);
  const docRef = useRef(doc);
  docRef.current = doc;

  const page = doc.pages[0];
  const selected = page.elements.find((e) => e.id === selectedId) ?? null;

  const pushHistory = useCallback((next: FlyerDocument) => {
    const stack = historyRef.current.slice(0, historyIndexRef.current + 1);
    stack.push(cloneDocument(next));
    if (stack.length > 40) stack.shift();
    historyRef.current = stack;
    historyIndexRef.current = stack.length - 1;
  }, []);

  const setDocument = useCallback(
    (updater: (prev: FlyerDocument) => FlyerDocument, recordHistory = true) => {
      setDoc((prev) => {
        const next = updater(prev);
        if (recordHistory) pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setDoc(cloneDocument(historyRef.current[historyIndexRef.current]));
    setSelectedId(null);
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    setDoc(cloneDocument(historyRef.current[historyIndexRef.current]));
    setSelectedId(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(`/api/announcements/folder/${encodeURIComponent(folderSlug)}/flyer-design`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.document) {
            const loaded = data.document as FlyerDocument;
            setDoc(loaded);
            historyRef.current = [cloneDocument(loaded)];
            historyIndexRef.current = 0;
            setLoading(false);
            return;
          }
        }
      } catch {
        /* neu starten */
      }
      const initial = {
        version: 1 as const,
        title: announcementTitle || 'Flyer',
        pages: [{ background: '#ffffff', elements: [] }],
      };
      historyRef.current = [cloneDocument(initial)];
      historyIndexRef.current = 0;
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [folderSlug, announcementTitle]);

  const updateElement = useCallback(
    (id: string, patch: Partial<FlyerElement>, live = false) => {
      if (live) {
        setDoc((prev) => ({
          ...prev,
          pages: prev.pages.map((p, i) =>
            i === 0
              ? { ...p, elements: p.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) }
              : p,
          ),
        }));
        return;
      }
      setDocument((prev) => ({
        ...prev,
        pages: prev.pages.map((p, i) =>
          i === 0
            ? { ...p, elements: p.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) }
            : p,
        ),
      }));
    },
    [setDocument],
  );

  const commitDragHistory = useCallback(() => {
    pushHistory(docRef.current);
  }, [pushHistory]);

  const updateText = useCallback(
    (id: string, text: string) => {
      updateElement(id, { text });
      setEditingTextId(null);
    },
    [updateElement],
  );

  const addElement = (partial: Omit<FlyerElement, 'id' | 'zIndex'>) => {
    const maxZ = page.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
    const el: FlyerElement = { ...partial, id: newElementId(), zIndex: maxZ + 1 };
    setDocument((prev) => ({
      ...prev,
      pages: prev.pages.map((p, i) => (i === 0 ? { ...p, elements: [...p.elements, el] } : p)),
    }));
    setSelectedId(el.id);
    if (el.type === 'text') setEditingTextId(el.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setDocument((prev) => ({
      ...prev,
      pages: prev.pages.map((p, i) =>
        i === 0 ? { ...p, elements: p.elements.filter((el) => el.id !== selectedId) } : p,
      ),
    }));
    setSelectedId(null);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = FLYER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    if (page.elements.length > 0 && !window.confirm('Aktuelles Design ersetzen?')) return;
    const next = remapIds(tpl.document);
    next.title = doc.title || next.title;
    setDoc(next);
    pushHistory(next);
    setSelectedId(null);
    setToast(`Vorlage „${tpl.name}“ geladen`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const html = exportFlyerHtml(doc);
      const res = await apiPut(`/api/announcements/folder/${encodeURIComponent(folderSlug)}/flyer-design`, {
        html,
        document: doc,
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      setToast('Flyer gespeichert — Vorschau aktualisiert');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const onImagePick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      addElement({
        type: 'image',
        x: 80,
        y: 200,
        width: 400,
        height: 280,
        rotation: 0,
        src,
        borderRadius: 12,
      });
    };
    reader.readAsDataURL(file);
  };

  const layerActions = useMemo(
    () => ({
      front: () => {
        if (!selected) return;
        const maxZ = page.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
        updateElement(selected.id, { zIndex: maxZ + 1 });
      },
      back: () => {
        if (!selected) return;
        const minZ = page.elements.reduce((m, e) => Math.min(m, e.zIndex), 1);
        updateElement(selected.id, { zIndex: minZ - 1 });
      },
    }),
    [page.elements, selected, updateElement],
  );

  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a28' }}>
        <CircularProgress sx={{ color: '#00e5ff' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a28', color: '#fff' }}>
      {/* Top bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          bgcolor: '#12121c',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <Tooltip title="Zurück">
          <IconButton onClick={() => navigate('/ankuendigungen')} size="small" sx={{ color: '#fff' }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: 1, minWidth: 0 }} noWrap>
          Flyer Studio — {folderSlug}
        </Typography>
        <IconButton size="small" onClick={undo} sx={{ color: '#fff' }} aria-label="Rückgängig">
          <UndoIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={redo} sx={{ color: '#fff' }} aria-label="Wiederholen">
          <RedoIcon fontSize="small" />
        </IconButton>
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.12)', mx: 0.5 }} />
        <Button
          size="small"
          variant="outlined"
          href={flyerPageUrl(folderSlug)}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textTransform: 'none', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
        >
          Vorschau
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          disabled={saving}
          onClick={() => void handleSave()}
          sx={{ textTransform: 'none', bgcolor: '#00838f', '&:hover': { bgcolor: '#006064' } }}
        >
          Speichern
        </Button>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left sidebar */}
        <Box
          sx={{
            width: SIDEBAR_W,
            flexShrink: 0,
            bgcolor: '#161622',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <Tabs
            value={leftTab}
            onChange={(_, v: LeftTab) => setLeftTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              '& .MuiTab-root': { minHeight: 44, minWidth: 52, color: 'rgba(255,255,255,0.5)', p: 0.5 },
              '& .Mui-selected': { color: '#00e5ff' },
              '& .MuiTabs-indicator': { bgcolor: '#00e5ff' },
            }}
          >
            <Tab value="templates" icon={<TemplateIcon sx={{ fontSize: 20 }} />} aria-label="Vorlagen" />
            <Tab value="text" icon={<TextIcon sx={{ fontSize: 20 }} />} aria-label="Text" />
            <Tab value="shapes" icon={<RectIcon sx={{ fontSize: 20 }} />} aria-label="Formen" />
            <Tab value="images" icon={<ImageIcon sx={{ fontSize: 20 }} />} aria-label="Bilder" />
            <Tab value="background" icon={<PaletteIcon sx={{ fontSize: 20 }} />} aria-label="Hintergrund" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 1.25 }}>
            {leftTab === 'templates' && (
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>
                  Canva-Style Vorlagen
                </Typography>
                {FLYER_TEMPLATES.map((tpl) => (
                  <Box
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl.id)}
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#00e5ff', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Box
                      sx={{
                        height: 100,
                        background: tpl.previewGradient ?? tpl.preview,
                        display: 'flex',
                        alignItems: 'flex-end',
                        p: 1,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                        {tpl.name}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 0.75, bgcolor: 'rgba(255,255,255,0.04)' }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                        {tpl.description}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}

            {leftTab === 'text' && (
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<TextIcon />}
                  onClick={() =>
                    addElement({
                      type: 'text',
                      x: 80,
                      y: 120,
                      width: 500,
                      height: 80,
                      rotation: 0,
                      text: 'Neue Überschrift',
                      fontSize: 36,
                      fontWeight: 700,
                      color: '#1c1c1c',
                      fontFamily: FLYER_FONTS[0],
                      textAlign: 'left',
                    })
                  }
                  sx={{ textTransform: 'none', bgcolor: '#00838f' }}
                >
                  Überschrift
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() =>
                    addElement({
                      type: 'text',
                      x: 80,
                      y: 220,
                      width: 520,
                      height: 120,
                      rotation: 0,
                      text: 'Fließtext hier eingeben …',
                      fontSize: 18,
                      fontWeight: 400,
                      color: '#2c3e50',
                      fontFamily: FLYER_FONTS[1],
                      lineHeight: 1.5,
                      textAlign: 'left',
                    })
                  }
                  sx={{ textTransform: 'none', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
                >
                  Fließtext
                </Button>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Doppelklick auf Text zum Bearbeiten
                </Typography>
              </Stack>
            )}

            {leftTab === 'shapes' && (
              <Stack spacing={1}>
                <Button
                  fullWidth
                  startIcon={<RectIcon />}
                  onClick={() =>
                    addElement({
                      type: 'rect',
                      x: 100,
                      y: 200,
                      width: 200,
                      height: 120,
                      rotation: 0,
                      fill: '#00838f',
                      borderRadius: 12,
                    })
                  }
                  sx={{ textTransform: 'none', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
                  variant="outlined"
                >
                  Rechteck
                </Button>
                <Button
                  fullWidth
                  startIcon={<CircleIcon />}
                  onClick={() =>
                    addElement({
                      type: 'circle',
                      x: 200,
                      y: 300,
                      width: 160,
                      height: 160,
                      rotation: 0,
                      fill: 'rgba(0, 131, 143, 0.35)',
                    })
                  }
                  sx={{ textTransform: 'none', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
                  variant="outlined"
                >
                  Kreis
                </Button>
                <Button
                  fullWidth
                  onClick={() =>
                    addElement({
                      type: 'line',
                      x: 80,
                      y: 400,
                      width: 400,
                      height: 8,
                      rotation: 0,
                      stroke: '#1c1c1c',
                      strokeWidth: 4,
                    })
                  }
                  sx={{ textTransform: 'none', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
                  variant="outlined"
                >
                  Linie
                </Button>
              </Stack>
            )}

            {leftTab === 'images' && (
              <Stack spacing={1}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onImagePick(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ImageIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ textTransform: 'none', bgcolor: '#7b1fa2' }}
                >
                  Bild hochladen
                </Button>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  JPG, PNG — wird im Flyer eingebettet
                </Typography>
              </Stack>
            )}

            {leftTab === 'background' && (
              <Stack spacing={1.5}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                  Farbe
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {FLYER_SWATCHES.map((c) => (
                    <Box
                      key={c}
                      onClick={() =>
                        setDocument((prev) => ({
                          ...prev,
                          pages: prev.pages.map((p, i) =>
                            i === 0 ? { ...p, background: c, backgroundGradient: undefined } : p,
                          ),
                        }))
                      }
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: c,
                        border: page.background === c && !page.backgroundGradient ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                  Verläufe
                </Typography>
                {FLYER_GRADIENTS.map((g, i) => (
                  <Box
                    key={i}
                    onClick={() =>
                      setDocument((prev) => ({
                        ...prev,
                        pages: prev.pages.map((p, idx) =>
                          idx === 0 ? { ...p, backgroundGradient: g, background: '#ffffff' } : p,
                        ),
                      }))
                    }
                    sx={{
                      height: 36,
                      borderRadius: 1,
                      background: g,
                      cursor: 'pointer',
                      border: page.backgroundGradient === g ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* Canvas */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <FlyerStudioCanvas
            page={page}
            scale={scale}
            selectedId={selectedId}
            editingTextId={editingTextId}
            onSelect={setSelectedId}
            onEditText={setEditingTextId}
            onUpdateElement={updateElement}
            onUpdateText={updateText}
            onDragEnd={commitDragHistory}
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              py: 0.75,
              bgcolor: '#12121c',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}
          >
            <IconButton size="small" onClick={() => setScale((s) => Math.max(0.35, s - 0.08))} sx={{ color: '#fff' }}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Slider
              value={scale}
              min={0.35}
              max={1.2}
              step={0.02}
              onChange={(_, v) => setScale(v as number)}
              sx={{ width: 140, color: '#00e5ff' }}
            />
            <IconButton size="small" onClick={() => setScale((s) => Math.min(1.2, s + 0.08))} sx={{ color: '#fff' }}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', minWidth: 48 }}>
              {Math.round(scale * 100)}%
            </Typography>
          </Box>
        </Box>

        {/* Properties */}
        <Box
          sx={{
            width: PROPS_W,
            flexShrink: 0,
            bgcolor: '#161622',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            p: 1.25,
            overflow: 'auto',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.55)', display: 'block', mb: 1 }}>
            Eigenschaften
          </Typography>
          {!selected ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
              Element auswählen oder neues hinzufügen
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {selected.type === 'text' && (
                <>
                  <TextField
                    label="Text"
                    size="small"
                    multiline
                    minRows={2}
                    value={selected.text ?? ''}
                    onChange={(e) => updateElement(selected.id, { text: e.target.value })}
                    fullWidth
                    InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                    InputProps={{ sx: { color: '#fff', fontSize: '0.85rem' } }}
                  />
                  <Select
                    size="small"
                    fullWidth
                    value={selected.fontFamily ?? FLYER_FONTS[0]}
                    onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })}
                    sx={{ color: '#fff', fontSize: '0.85rem' }}
                  >
                    {FLYER_FONTS.map((f) => (
                      <MenuItem key={f} value={f} sx={{ fontFamily: f }}>
                        {f.split(',')[0].replace(/"/g, '')}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Größe: {selected.fontSize ?? 18}px
                  </Typography>
                  <Slider
                    value={selected.fontSize ?? 18}
                    min={10}
                    max={96}
                    onChange={(_, v) => updateElement(selected.id, { fontSize: v as number })}
                    sx={{ color: '#00e5ff' }}
                  />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {FLYER_SWATCHES.map((c) => (
                      <Box
                        key={c}
                        onClick={() => updateElement(selected.id, { color: c })}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.5,
                          bgcolor: c,
                          border: selected.color === c ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Box>
                  <Select
                    size="small"
                    fullWidth
                    value={selected.textAlign ?? 'left'}
                    onChange={(e) => updateElement(selected.id, { textAlign: e.target.value as 'left' | 'center' | 'right' })}
                    sx={{ color: '#fff' }}
                  >
                    <MenuItem value="left">Links</MenuItem>
                    <MenuItem value="center">Mitte</MenuItem>
                    <MenuItem value="right">Rechts</MenuItem>
                  </Select>
                </>
              )}
              {(selected.type === 'rect' || selected.type === 'circle') && (
                <>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Füllfarbe
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {FLYER_SWATCHES.map((c) => (
                      <Box
                        key={c}
                        onClick={() => updateElement(selected.id, { fill: c })}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.5,
                          bgcolor: c,
                          border: selected.fill === c ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Box>
                  {selected.type === 'rect' && (
                    <>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        Ecken: {selected.borderRadius ?? 0}px
                      </Typography>
                      <Slider
                        value={selected.borderRadius ?? 0}
                        min={0}
                        max={80}
                        onChange={(_, v) => updateElement(selected.id, { borderRadius: v as number })}
                        sx={{ color: '#00e5ff' }}
                      />
                    </>
                  )}
                </>
              )}
              {selected.type === 'image' && (
                <>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Bild-Ecken
                  </Typography>
                  <Slider
                    value={selected.borderRadius ?? 0}
                    min={0}
                    max={80}
                    onChange={(_, v) => updateElement(selected.id, { borderRadius: v as number })}
                    sx={{ color: '#00e5ff' }}
                  />
                </>
              )}
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                Drehung: {selected.rotation}°
              </Typography>
              <Slider
                value={selected.rotation}
                min={-180}
                max={180}
                onChange={(_, v) => updateElement(selected.id, { rotation: v as number })}
                sx={{ color: '#00e5ff' }}
              />
              <Stack direction="row" spacing={0.5}>
                <Button size="small" startIcon={<LayersIcon />} onClick={layerActions.front} sx={{ textTransform: 'none', color: '#fff', flex: 1 }}>
                  Vorne
                </Button>
                <Button size="small" onClick={layerActions.back} sx={{ textTransform: 'none', color: '#fff', flex: 1 }}>
                  Hinten
                </Button>
              </Stack>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={deleteSelected}
                sx={{ textTransform: 'none' }}
              >
                Löschen
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
