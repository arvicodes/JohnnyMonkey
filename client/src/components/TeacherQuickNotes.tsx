import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TitleIcon from '@mui/icons-material/Title';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { DialogCloseIconButton } from './ui/dialog-close-icon-button';

type InkPoint = { x: number; y: number };
type InkStroke = { points: InkPoint[]; color: string; width: number };

type ScratchPage = {
  text: string;
  ink: InkStroke[];
};

type ScratchPadData = {
  pages: ScratchPage[];
  pageIndex: number;
  updatedAt: string;
};

const STORAGE_PREFIX = 'teacher-scratch-pad:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId || 'anonymous'}`;
}

function emptyPage(): ScratchPage {
  return { text: '', ink: [] };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Legacy-Klartext → einfaches HTML */
function toEditorHtml(raw: string): string {
  const t = raw || '';
  if (!t.trim()) return '';
  if (/<[a-z][\s\S]*>/i.test(t)) return t;
  return t
    .split(/\n/)
    .map((line) => `<div>${escapeHtml(line) || '<br>'}</div>`)
    .join('');
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function normalizePad(raw: unknown): ScratchPadData {
  const fallback: ScratchPadData = {
    pages: [emptyPage()],
    pageIndex: 0,
    updatedAt: '',
  };
  if (!raw || typeof raw !== 'object') return fallback;
  const parsed = raw as Partial<ScratchPadData> & { text?: string; ink?: InkStroke[] };

  let pages: ScratchPage[] = [];
  if (Array.isArray(parsed.pages) && parsed.pages.length > 0) {
    pages = parsed.pages.map((p) => ({
      text: typeof p?.text === 'string' ? p.text : '',
      ink: Array.isArray(p?.ink) ? (p.ink as InkStroke[]) : [],
    }));
  } else if (typeof parsed.text === 'string' || Array.isArray(parsed.ink)) {
    // Legacy: eine Seite
    pages = [
      {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        ink: Array.isArray(parsed.ink) ? (parsed.ink as InkStroke[]) : [],
      },
    ];
  } else {
    pages = [emptyPage()];
  }

  const pageIndex = Math.min(
    Math.max(0, typeof parsed.pageIndex === 'number' ? parsed.pageIndex : 0),
    pages.length - 1
  );

  return {
    pages,
    pageIndex,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
  };
}

function loadPad(userId: string): ScratchPadData {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return normalizePad(null);
    return normalizePad(JSON.parse(raw));
  } catch {
    return normalizePad(null);
  }
}

function savePad(userId: string, data: ScratchPadData) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

function previewText(htmlOrText: string, max = 180): string {
  const cleaned = stripHtml(htmlOrText);
  if (!cleaned) return '';
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

function pagePreviewSource(data: ScratchPadData): ScratchPage {
  const current = data.pages[data.pageIndex] || data.pages[0] || emptyPage();
  if (stripHtml(current.text) || current.ink.length) return current;
  return data.pages.find((p) => stripHtml(p.text) || p.ink.length) || current;
}

type FmtCmd =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikeThrough'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'formatBlock'
  | 'foreColor'
  | 'removeFormat';

const NOTE_COLORS = [
  { label: 'Schwarz', value: '#111827' },
  { label: 'Grau', value: '#546e7a' },
  { label: 'Rot', value: '#c62828' },
  { label: 'Orange', value: '#ef6c00' },
  { label: 'Grün', value: '#2e7d32' },
  { label: 'Blau', value: '#1565c0' },
  { label: 'Violett', value: '#6a1b9a' },
] as const;

type TeacherQuickNotesProps = {
  userId: string;
};

/**
 * Gelbes N in der Lehrer-Leiste: persönliche Notizfläche (Tastatur + Stift + Formatierung),
 * Persistenz in localStorage, Hover zeigt Textvorschau.
 */
export default function TeacherQuickNotes({ userId }: TeacherQuickNotesProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'text' | 'pen'>('text');
  const [pages, setPages] = useState<ScratchPage[]>([emptyPage()]);
  const [pageIndex, setPageIndex] = useState(0);
  const [text, setText] = useState('');
  const [ink, setInk] = useState<InkStroke[]>([]);
  const [color, setColor] = useState<string>(NOTE_COLORS[0].value);
  const [hoverPreview, setHoverPreview] = useState<ScratchPadData | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<InkStroke | null>(null);
  const pagesRef = useRef<ScratchPage[]>([emptyPage()]);
  const pageIndexRef = useRef(0);
  const modeRef = useRef<'text' | 'pen'>('text');
  const inkRef = useRef<InkStroke[]>([]);
  const textRef = useRef('');
  const skipEditorSyncRef = useRef(false);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  useEffect(() => {
    pageIndexRef.current = pageIndex;
  }, [pageIndex]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    inkRef.current = ink;
  }, [ink]);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const persistBook = useCallback(
    (nextPages: ScratchPage[], nextIndex: number) => {
      const safeIndex = Math.min(Math.max(0, nextIndex), Math.max(0, nextPages.length - 1));
      savePad(userId, {
        pages: nextPages,
        pageIndex: safeIndex,
        updatedAt: new Date().toISOString(),
      });
    },
    [userId]
  );

  const flushCurrentPage = useCallback((): ScratchPage[] => {
    const html = editorRef.current?.innerHTML ?? textRef.current;
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { text: html, ink: inkRef.current } : p
    );
    pagesRef.current = nextPages;
    textRef.current = html;
    setPages(nextPages);
    setText(html);
    return nextPages;
  }, []);

  const showPage = useCallback((nextPages: ScratchPage[], index: number, focusEditor = true) => {
    const safeIndex = Math.min(Math.max(0, index), nextPages.length - 1);
    const page = nextPages[safeIndex] || emptyPage();
    const html = toEditorHtml(page.text);
    pageIndexRef.current = safeIndex;
    pagesRef.current = nextPages;
    inkRef.current = page.ink;
    textRef.current = html;
    setPages(nextPages);
    setPageIndex(safeIndex);
    setText(html);
    setInk(page.ink);
    skipEditorSyncRef.current = false;
    window.requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html || '';
        if (focusEditor && modeRef.current !== 'pen') editorRef.current.focus();
      }
    });
  }, []);

  const openModal = useCallback(() => {
    const data = loadPad(userId);
    modeRef.current = 'text';
    setMode('text');
    setOpen(true);
    window.requestAnimationFrame(() => {
      showPage(data.pages, data.pageIndex, true);
    });
  }, [showPage, userId]);

  const closeModal = useCallback(() => {
    const nextPages = flushCurrentPage();
    persistBook(nextPages, pageIndexRef.current);
    setOpen(false);
  }, [flushCurrentPage, persistBook]);

  const refreshHoverPreview = useCallback(() => {
    setHoverPreview(loadPad(userId));
  }, [userId]);

  const syncEditorToState = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? '';
    skipEditorSyncRef.current = true;
    setText(html);
    textRef.current = html;
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: html, ink: inkRef.current } : p
    );
    pagesRef.current = nextPages;
    setPages(nextPages);
    persistBook(nextPages, pageIndexRef.current);
  }, [persistBook]);

  const runFormat = (cmd: FmtCmd, value?: string) => {
    if (mode === 'pen') setMode('text');
    editorRef.current?.focus();
    try {
      if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, value || 'h3');
      } else if (cmd === 'foreColor') {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, value || color);
      } else {
        document.execCommand(cmd, false, value);
      }
    } catch {
      /* older browsers */
    }
    syncEditorToState();
  };

  const applyColor = (next: string) => {
    setColor(next);
    if (mode === 'pen') return;
    runFormat('foreColor', next);
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of inkRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => resizeCanvas());
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [open, pageIndex, resizeCanvas]);

  useEffect(() => {
    if (open) redrawCanvas();
  }, [open, ink, pageIndex, redrawCanvas]);

  useEffect(() => {
    if (!open || !editorRef.current) return;
    if (skipEditorSyncRef.current) {
      skipEditorSyncRef.current = false;
      return;
    }
    if (editorRef.current.innerHTML !== text) {
      editorRef.current.innerHTML = text || '';
    }
  }, [open, text, pageIndex]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'pen' && e.pointerType !== 'pen') return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const stroke: InkStroke = {
      points: [pointFromEvent(e)],
      color,
      width: e.pointerType === 'pen' ? Math.max(1.5, Math.min(4, (e.pressure || 0.5) * 4)) : 2.25,
    };
    currentStrokeRef.current = stroke;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    currentStrokeRef.current.points.push(pointFromEvent(e));
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const stroke = currentStrokeRef.current;
    if (!ctx || stroke.points.length < 2) return;
    const a = stroke.points[stroke.points.length - 2];
    const b = stroke.points[stroke.points.length - 1];
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    const nextInk = [...inkRef.current, stroke];
    setInk(nextInk);
    inkRef.current = nextInk;
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: textRef.current, ink: nextInk } : p
    );
    pagesRef.current = nextPages;
    setPages(nextPages);
    persistBook(nextPages, pageIndexRef.current);
  };

  const clearText = () => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    setText('');
    textRef.current = '';
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: '', ink: inkRef.current } : p
    );
    pagesRef.current = nextPages;
    setPages(nextPages);
    persistBook(nextPages, pageIndexRef.current);
  };

  const clearInk = () => {
    setInk([]);
    inkRef.current = [];
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: textRef.current, ink: [] } : p
    );
    pagesRef.current = nextPages;
    setPages(nextPages);
    persistBook(nextPages, pageIndexRef.current);
    window.requestAnimationFrame(() => redrawCanvas());
  };

  const goToPage = useCallback((index: number) => {
    if (index < 0 || index >= pagesRef.current.length || index === pageIndexRef.current) return;
    const nextPages = flushCurrentPage();
    persistBook(nextPages, index);
    showPage(nextPages, index);
  }, [flushCurrentPage, persistBook, showPage]);

  const addPage = () => {
    const flushed = flushCurrentPage();
    const nextPages = [...flushed, emptyPage()];
    const nextIndex = nextPages.length - 1;
    persistBook(nextPages, nextIndex);
    showPage(nextPages, nextIndex);
  };

  const removePage = () => {
    if (pagesRef.current.length <= 1) {
      clearText();
      clearInk();
      return;
    }
    const flushed = flushCurrentPage();
    const removeAt = pageIndexRef.current;
    const nextPages = flushed.filter((_, i) => i !== removeAt);
    const nextIndex = Math.min(removeAt, nextPages.length - 1);
    persistBook(nextPages, nextIndex);
    showPage(nextPages, nextIndex);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      const inEditor =
        !!target &&
        (target.isContentEditable ||
          target.closest?.('[contenteditable="true"]') != null ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA');
      // Im Texteditor nur mit Alt/Meta blättern, sonst Cursor bewegen.
      if (inEditor && modeRef.current === 'text' && !e.altKey && !e.metaKey) return;
      if (e.key === 'ArrowLeft') {
        if (pageIndexRef.current <= 0) return;
        e.preventDefault();
        goToPage(pageIndexRef.current - 1);
      } else {
        if (pageIndexRef.current >= pagesRef.current.length - 1) return;
        e.preventDefault();
        goToPage(pageIndexRef.current + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, goToPage]);

  const fmtBtnSx = (active?: boolean) => ({
    p: 0.35,
    minWidth: 26,
    width: 26,
    height: 26,
    borderRadius: 0.75,
    bgcolor: active ? '#fff9c4' : 'transparent',
    border: active ? '1px solid #fbc02d' : '1px solid transparent',
    color: '#6d4c41',
    '&:hover': { bgcolor: '#fffde7' },
  });

  const tooltipTitle = useMemo(() => {
    const data = hoverPreview;
    if (!data) {
      return (
        <Typography sx={{ fontSize: '0.75rem', color: '#fff' }}>Notizen öffnen</Typography>
      );
    }
    const page = pagePreviewSource(data);
    const preview = previewText(page.text);
    const hasInk = page.ink.length > 0;
    const pageCount = data.pages.length;
    if (!preview && !hasInk) {
      return (
        <Typography sx={{ fontSize: '0.75rem', color: '#fff' }}>Leere Notizfläche</Typography>
      );
    }
    return (
      <Box sx={{ maxWidth: 260, py: 0.25 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, mb: 0.35, color: '#ffe082' }}>
          Notizen{pageCount > 1 ? ` · ${pageCount} Seiten` : ''}
        </Typography>
        {preview ? (
          <Typography sx={{ fontSize: '0.72rem', lineHeight: 1.35, color: '#fff', whiteSpace: 'pre-wrap' }}>
            {preview}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
            Nur Stiftnotizen
          </Typography>
        )}
        {hasInk && (
          <Typography sx={{ fontSize: '0.65rem', mt: 0.5, color: 'rgba(255,255,255,0.7)' }}>
            {page.ink.length} Strich{page.ink.length === 1 ? '' : 'e'}
          </Typography>
        )}
      </Box>
    );
  }, [hoverPreview]);

  return (
    <>
      <Tooltip
        title={tooltipTitle}
        placement="bottom"
        enterDelay={250}
        leaveDelay={80}
        onOpen={refreshHoverPreview}
        slotProps={{
          tooltip: {
            sx: {
              bgcolor: '#37474f',
              px: 1.25,
              py: 0.85,
              maxWidth: 280,
              boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            },
          },
        }}
      >
        <IconButton
          onClick={openModal}
          sx={{
            p: 0.5,
            minWidth: 32,
            width: 32,
            height: 32,
            color: '#f9a825',
            bgcolor: '#9e9e9e',
            borderRadius: 1.4,
            '&:hover': { bgcolor: '#757575' },
          }}
          aria-label="Notizen"
        >
          <Typography
            component="span"
            sx={{
              fontSize: '1.05rem',
              fontWeight: 900,
              lineHeight: 1,
              color: '#fbc02d',
              textShadow: '0 1px 0 rgba(0,0,0,0.25)',
            }}
          >
            N
          </Typography>
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={closeModal}
        maxWidth={false}
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(33, 33, 33, 0.62)',
              backdropFilter: 'grayscale(0.35) brightness(0.72)',
            },
          },
        }}
        PaperProps={{
          sx: {
            width: 'min(1100px, 96vw)',
            borderRadius: 2.5,
            overflow: 'hidden',
            minHeight: '84vh',
            maxHeight: '94vh',
            boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
          },
        }}
      >
        <DialogTitle
          sx={{
            position: 'relative',
            py: 1,
            pl: 1.75,
            pr: 5.5,
            bgcolor: '#fffde7',
            borderBottom: '1px solid #ffe082',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box
              component="span"
              sx={{
                width: 20,
                height: 20,
                borderRadius: 0.6,
                bgcolor: '#fbc02d',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.78rem',
                flexShrink: 0,
              }}
            >
              N
            </Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#f57f17',
                mr: 0.5,
                flexShrink: 0,
              }}
            >
              Notizen
            </Typography>

            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.15,
                flexWrap: 'wrap',
                flex: 1,
                minWidth: 0,
                pr: 0.5,
              }}
            >
              <Tooltip title="Fett">
                <IconButton size="small" onClick={() => runFormat('bold')} sx={fmtBtnSx()}>
                  <FormatBoldIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Kursiv">
                <IconButton size="small" onClick={() => runFormat('italic')} sx={fmtBtnSx()}>
                  <FormatItalicIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Unterstrichen">
                <IconButton size="small" onClick={() => runFormat('underline')} sx={fmtBtnSx()}>
                  <FormatUnderlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Durchgestrichen">
                <IconButton size="small" onClick={() => runFormat('strikeThrough')} sx={fmtBtnSx()}>
                  <StrikethroughSIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.4, borderColor: '#ffe082' }} />
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.15, px: 0.1 }}>
                {NOTE_COLORS.map((c) => (
                  <Tooltip key={c.value} title={c.label}>
                    <Box
                      component="button"
                      type="button"
                      aria-label={c.label}
                      onClick={() => applyColor(c.value)}
                      sx={{
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        border: color === c.value ? '1.5px solid #f57f17' : '1px solid rgba(0,0,0,0.2)',
                        backgroundColor: c.value,
                        p: 0,
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: color === c.value ? '0 0 0 1px #fff inset' : 'none',
                        flexShrink: 0,
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.4, borderColor: '#ffe082' }} />
              <Tooltip title="Überschrift">
                <IconButton size="small" onClick={() => runFormat('formatBlock', 'h3')} sx={fmtBtnSx()}>
                  <TitleIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Aufzählung">
                <IconButton size="small" onClick={() => runFormat('insertUnorderedList')} sx={fmtBtnSx()}>
                  <FormatListBulletedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Nummerierte Liste">
                <IconButton size="small" onClick={() => runFormat('insertOrderedList')} sx={fmtBtnSx()}>
                  <FormatListNumberedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Formatierung entfernen">
                <IconButton size="small" onClick={() => runFormat('removeFormat')} sx={fmtBtnSx()}>
                  <FormatClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.4, borderColor: '#ffe082' }} />
              <Tooltip title="Tippen">
                <IconButton
                  size="small"
                  onClick={() => {
                    setMode('text');
                    window.requestAnimationFrame(() => editorRef.current?.focus());
                  }}
                  sx={fmtBtnSx(mode === 'text')}
                >
                  <KeyboardIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Stift">
                <IconButton size="small" onClick={() => setMode('pen')} sx={fmtBtnSx(mode === 'pen')}>
                  <EditIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Text löschen">
                <IconButton size="small" onClick={clearText} sx={fmtBtnSx()}>
                  <DeleteOutlineIcon sx={{ fontSize: 16, color: '#90a4ae' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Stiftnotizen löschen">
                <IconButton size="small" onClick={clearInk} sx={fmtBtnSx()}>
                  <ClearAllIcon sx={{ fontSize: 16, color: '#b0bec5' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <DialogCloseIconButton
            onClose={closeModal}
            sx={{
              right: 6,
              top: 8,
              transform: 'none',
              p: 0,
              minWidth: 22,
              width: 22,
              height: 22,
              color: '#f57f17',
            }}
            iconSx={{ fontSize: 16, color: '#f57f17' }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Box
            ref={containerRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: '68vh',
              m: 1.75,
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid #eceff1',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8)',
              overflow: 'hidden',
            }}
          >
            <Box
              ref={editorRef}
              contentEditable={mode !== 'pen'}
              suppressContentEditableWarning
              onInput={syncEditorToState}
              onBlur={syncEditorToState}
              data-placeholder="Hier tippen …"
              sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'auto',
                p: 2.5,
                m: 0,
                bgcolor: 'transparent',
                color: '#212121',
                fontSize: '1.14rem',
                lineHeight: 1.6,
                fontFamily:
                  '"Segoe UI", "Helvetica Neue", Arial, "Apple Color Emoji", sans-serif',
                caretColor: '#f57f17',
                zIndex: 1,
                outline: 'none',
                pointerEvents: mode === 'pen' ? 'none' : 'auto',
                '&:empty:before': {
                  content: 'attr(data-placeholder)',
                  color: '#bdbdbd',
                  pointerEvents: 'none',
                },
                '& h3': {
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  margin: '0.4em 0 0.35em',
                  color: '#333',
                },
                '& ul, & ol': {
                  margin: '0.35em 0',
                  paddingLeft: '1.4em',
                },
                '& b, & strong': { fontWeight: 700 },
                '& i, & em': { fontStyle: 'italic' },
                '& u': { textDecoration: 'underline' },
                '& s, & strike': { textDecoration: 'line-through' },
              }}
            />
            <Box
              component="canvas"
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 2,
                touchAction: 'none',
                cursor: mode === 'pen' ? 'crosshair' : 'text',
                pointerEvents: mode === 'pen' ? 'auto' : 'none',
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              px: 2,
              pb: 1.35,
              pt: 0.25,
            }}
          >
            <Typography sx={{ fontSize: '0.7rem', color: '#90a4ae', flex: 1, minWidth: 0 }}>
              {mode === 'pen'
                ? 'Stift-Modus: zeichnen mit Finger, Maus oder Stylus.'
                : 'Text markieren und oben formatieren — oder Stift-Icon für Handschrift.'}
            </Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, flexShrink: 0 }}>
              <Tooltip title="Vorherige Seite">
                <span>
                  <IconButton
                    size="small"
                    disabled={pageIndex <= 0}
                    onClick={() => goToPage(pageIndex - 1)}
                    sx={fmtBtnSx()}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography
                sx={{
                  minWidth: 52,
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f57f17',
                  userSelect: 'none',
                }}
                title="Seiten mit ← → wechseln (im Text: Alt+←/→)"
              >
                {pageIndex + 1} / {pages.length}
              </Typography>
              <Tooltip title="Nächste Seite">
                <span>
                  <IconButton
                    size="small"
                    disabled={pageIndex >= pages.length - 1}
                    onClick={() => goToPage(pageIndex + 1)}
                    sx={fmtBtnSx()}
                  >
                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.4, my: 0.5, borderColor: '#cfd8dc' }} />
              <Tooltip title="Seite hinzufügen">
                <IconButton size="small" onClick={addPage} sx={fmtBtnSx()}>
                  <AddIcon sx={{ fontSize: 18, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={pages.length <= 1 ? 'Seite leeren' : 'Seite entfernen'}>
                <IconButton size="small" onClick={removePage} sx={fmtBtnSx()}>
                  <RemoveIcon sx={{ fontSize: 18, color: '#90a4ae' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
