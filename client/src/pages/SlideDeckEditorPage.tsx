import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Slider,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Draw as DrawIcon,
  FiberManualRecord as LaserPointerIcon,
  GetApp as GetAppIcon,
  Highlight as HighlightIcon,
  OpenInNew as OpenInNewIcon,
  TextFields as TextIcon,
  Undo as UndoIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { buildStemSuffixPdfName, getStemForSave, parentDirGitPath } from '../lib/folienVersions';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

type Stroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  /** fehlend = ältere Striche (Stift) */
  mode?: 'pen' | 'marker';
  markerOpacity?: number;
};

const MARKER_PRESET_COLORS = ['#ffeb3b', '#69f0ae', '#ff80ab', '#ffcc80', '#80d8ff'] as const;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return `rgba(200,80,80,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type TextAnn = {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
};

function findTextAtPoint(x: number, y: number, texts: TextAnn[], ctx: CanvasRenderingContext2D): TextAnn | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    ctx.font = `${t.fontSize}px sans-serif`;
    const m = ctx.measureText(t.text);
    const asc = m.actualBoundingBoxAscent ?? t.fontSize * 0.75;
    const desc = m.actualBoundingBoxDescent ?? t.fontSize * 0.25;
    const w = m.width;
    const pad = 10;
    if (x >= t.x - pad && x <= t.x + w + pad && y >= t.y - asc - pad && y <= t.y + desc + pad) {
      return t;
    }
  }
  return null;
}

/** Nachleuchtzeit des Laserstrahls (ms) */
const LASER_TRAIL_MS = 3200;

/** Größerer Divisor = weichere Kurve (weniger „hackelig“) */
const LASER_SPLINE_TENSION = 10;

type LaserPt = { x: number; y: number; t: number };

/** Catmull-Rom → kubische Bézier (ein Segment von p1 nach p2) */
function catmullRomBezierControls(p0: LaserPt, p1: LaserPt, p2: LaserPt, p3: LaserPt, tension: number) {
  const cp1x = p1.x + (p2.x - p0.x) / tension;
  const cp1y = p1.y + (p2.y - p0.y) / tension;
  const cp2x = p2.x - (p3.x - p1.x) / tension;
  const cp2y = p2.y - (p3.y - p1.y) / tension;
  return { cp1x, cp1y, cp2x, cp2y };
}

/** Leichtgewichtige Glättung (Fenster 3), zweimal hintereinander = deutlich ruhigere Linie */
function smoothLaserPointsOnce(pts: LaserPt[]): LaserPt[] {
  if (pts.length < 3) return pts.map((p) => ({ ...p }));
  const out: LaserPt[] = [];
  out.push({ ...pts[0] });
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    out.push({
      x: 0.22 * a.x + 0.56 * b.x + 0.22 * c.x,
      y: 0.22 * a.y + 0.56 * b.y + 0.22 * c.y,
      t: (a.t + 2 * b.t + c.t) / 4,
    });
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}

function cloneStrokesRecord(s: Record<number, Stroke[]>): Record<number, Stroke[]> {
  const out: Record<number, Stroke[]> = {};
  for (const k of Object.keys(s)) {
    const n = Number(k);
    out[n] = s[n].map((st) => ({
      ...st,
      points: st.points.map((p) => ({ x: p.x, y: p.y })),
    }));
  }
  return out;
}

function cloneTextRecord(t: Record<number, TextAnn[]>): Record<number, TextAnn[]> {
  const out: Record<number, TextAnn[]> = {};
  for (const k of Object.keys(t)) {
    const n = Number(k);
    out[n] = t[n].map((x) => ({ ...x }));
  }
  return out;
}

/** Weiche Freihandlinie (Quadratisch), weniger „Ecken“ als reines lineTo */
function drawStrokeSmooth(ctx: CanvasRenderingContext2D, s: Stroke) {
  const pts = s.points;
  if (pts.length < 2) return;
  const mode = s.mode ?? 'pen';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s.lineWidth;
  if (mode === 'marker') {
    const a = s.markerOpacity ?? 0.38;
    ctx.strokeStyle = hexToRgba(s.color, a);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

/** Vorschau-Segment beim Ziehen (gleiche Optik wie drawStrokeSmooth für ein Segment) */
function drawStrokeSegment(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  s: Pick<Stroke, 'color' | 'lineWidth' | 'mode' | 'markerOpacity'>
) {
  const mode = s.mode ?? 'pen';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s.lineWidth;
  if (mode === 'marker') {
    ctx.strokeStyle = hexToRgba(s.color, s.markerOpacity ?? 0.38);
  } else {
    ctx.strokeStyle = s.color;
  }
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

/** Fester pdf.js-Maßstab; die sichtbare Größe passt sich per CSS (max-width/height) dem Viewport an — Koordinaten bleiben stabil. */
const PDF_RENDER_SCALE = 2;

const SlideDeckEditorPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [tool, setTool] = useState<'pen' | 'marker' | 'text' | 'laser'>('pen');
  const [strokeColor, setStrokeColor] = useState('#c62828');
  const [lineWidth, setLineWidth] = useState(2.5);
  const [markerOpacity, setMarkerOpacity] = useState(0.38);
  const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({});
  const [textByPage, setTextByPage] = useState<Record<number, TextAnn[]>>({});
  const [undoStack, setUndoStack] = useState<{ strokes: Record<number, Stroke[]>; text: Record<number, TextAnn[]> }[]>(
    []
  );

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const laserCanvasRef = useRef<HTMLCanvasElement>(null);
  const laserTrailRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const laserHeadRef = useRef<{ x: number; y: number } | null>(null);
  /** Laser nur sichtbar, solange Primärbutton gedrückt (Präsentations-Laser) */
  const laserPointerDownRef = useRef(false);
  const laserRafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<{ width: number; height: number } | null>(null);
  const drawingStrokeRef = useRef<Stroke | null>(null);
  const overlayRectCacheRef = useRef<DOMRect | null>(null);
  const textDragRef = useRef<{
    id: string;
    pageIdx: number;
    startCX: number;
    startCY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const textDragMovedRef = useRef(false);
  const [textDialog, setTextDialog] = useState<{
    open: boolean;
    x: number;
    y: number;
    value: string;
    editingId?: string;
    fontSize: number;
  }>({
    open: false,
    x: 0,
    y: 0,
    value: '',
    fontSize: 18,
  });
  const [fromPptx, setFromPptx] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [loadPhase, setLoadPhase] = useState<'server' | 'download' | 'parse'>('server');
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const imageBlobUrlRef = useRef<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const strokesSyncRef = useRef(strokesByPage);
  const textSyncRef = useRef(textByPage);
  strokesSyncRef.current = strokesByPage;
  textSyncRef.current = textByPage;

  /** Nur bei abgeschlossener Aktion (Strich/Text) – nicht bei jedem pointerdown, sonst massives Ruckeln */
  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) =>
      [
        ...prev,
        {
          strokes: cloneStrokesRecord(strokesSyncRef.current),
          text: cloneTextRecord(textSyncRef.current),
        },
      ].slice(-40)
    );
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokesByPage(last.strokes);
      setTextByPage(last.text);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawFp = params.get('filePath') || '';
    const fp = rawFp.replace(/\\/g, '/').trim();
    const fn = params.get('fileName') || '';
    const source = params.get('source') || '';
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'];
    const baseFromPath = fp.split('/').pop() || '';
    const extFromPath = baseFromPath.match(/\.([^.]+)$/i)?.[1]?.toLowerCase() || '';
    const extFromFn = fn.match(/\.([^.]+)$/i)?.[1]?.toLowerCase() || '';
    const extFallback = extFromPath || extFromFn;

    /** Endung im echten Pfad hat Vorrang (verhindert pptx-API bei .pdf im Pfad; git-intern muss mit / laufen). */
    let isPptx = false;
    let isImage = false;
    let isDocx = false;
    if (extFromPath === 'pdf') {
      isPptx = false;
      isImage = false;
      isDocx = false;
    } else if (extFromPath === 'docx') {
      isPptx = false;
      isImage = false;
      isDocx = true;
    } else if (extFromPath === 'pptx' || extFromPath === 'ppt') {
      isPptx = true;
      isImage = false;
      isDocx = false;
    } else if (extFromPath && IMAGE_EXTS.includes(extFromPath)) {
      isPptx = false;
      isImage = true;
      isDocx = false;
    } else {
      const ext = extFallback;
      isPptx = source === 'pptx' || ext === 'pptx' || ext === 'ppt';
      isImage = source === 'image' || IMAGE_EXTS.includes(ext);
      isDocx = source === 'docx' || ext === 'docx';
    }

    setFilePath(fp);
    setFileName(fn || 'Folien');
    setFromPptx(isPptx);
    if (!fp) {
      setError('Kein filePath angegeben.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (isImage) {
          setLoadPhase('download');
          const res = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(fp)}`);
          if (!res.ok) {
            let msg = 'Bild konnte nicht geladen werden';
            try {
              const j = await res.json();
              msg = (j.message as string) || (j.error as string) || msg;
            } catch {
              /* ignore */
            }
            throw new Error(msg);
          }
          const blob = await res.blob();
          if (cancelled) return;
          setLoadPhase('parse');
          const blobUrl = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Bild konnte nicht angezeigt werden'));
            img.src = blobUrl;
          });
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          if (imageBlobUrlRef.current) URL.revokeObjectURL(imageBlobUrlRef.current);
          imageBlobUrlRef.current = blobUrl;
          baseImageRef.current = img;
          setPdfDoc(null);
          setNumPages(1);
          setPageNum(1);
          setImageMode(true);
        } else if (isPptx) {
          setLoadPhase('server');
          const res = await fetch(`/api/file-system-paths/pptx-as-pdf?filePath=${encodeURIComponent(fp)}`);
          if (!res.ok) {
            let msg = 'Datei konnte nicht geladen werden';
            try {
              const j = await res.json();
              msg = (j.message as string) || (j.error as string) || msg;
            } catch {
              /* ignore */
            }
            throw new Error(msg);
          }
          setLoadPhase('download');
          const buf = await res.arrayBuffer();
          if (cancelled) return;
          setLoadPhase('parse');
          const doc = await pdfjsLib.getDocument({ data: buf }).promise;
          if (cancelled) return;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setPageNum(1);
        } else if (isDocx) {
          setLoadPhase('server');
          const res = await fetch(
            `/api/file-system-paths/read-docx?filePath=${encodeURIComponent(fp)}&preview=true`
          );
          if (!res.ok) {
            let msg = 'Word-Datei konnte nicht geladen werden';
            try {
              const j = await res.json();
              msg = (j.message as string) || (j.error as string) || msg;
            } catch {
              /* ignore */
            }
            throw new Error(msg);
          }
          const htmlText = await res.text();
          if (cancelled) return;
          setLoadPhase('parse');
          const iframe = document.createElement('iframe');
          iframe.setAttribute('sandbox', 'allow-same-origin');
          iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;height:400px;border:none;visibility:hidden';
          document.body.appendChild(iframe);
          const idoc = iframe.contentDocument;
          if (!idoc) {
            document.body.removeChild(iframe);
            throw new Error('Vorschau konnte nicht erstellt werden.');
          }
          idoc.open();
          idoc.write(htmlText);
          idoc.close();
          await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
          const bodyEl = idoc.body;
          if (!bodyEl || bodyEl.scrollHeight < 8) {
            document.body.removeChild(iframe);
            throw new Error('Word-Vorschau ist leer.');
          }
          const docH = Math.min(bodyEl.scrollHeight, 20000);
          const docW = Math.min(bodyEl.scrollWidth + 32, 1400);
          iframe.style.width = `${docW}px`;
          iframe.style.height = `${docH}px`;
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          const maxCanvasPx = 12000;
          const scale = Math.min(1, maxCanvasPx / Math.max(bodyEl.scrollHeight, bodyEl.scrollWidth, 1));
          const html2canvas = (await import('html2canvas')).default;
          let canvas: HTMLCanvasElement;
          try {
            canvas = await html2canvas(bodyEl, {
              scale,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: bodyEl.scrollWidth,
              windowHeight: bodyEl.scrollHeight,
            });
          } finally {
            document.body.removeChild(iframe);
          }
          if (cancelled) return;
          const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
          if (!blob) throw new Error('Raster der Vorschau fehlgeschlagen.');
          const blobUrl = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Vorschau konnte nicht angezeigt werden'));
            img.src = blobUrl;
          });
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          if (imageBlobUrlRef.current) URL.revokeObjectURL(imageBlobUrlRef.current);
          imageBlobUrlRef.current = blobUrl;
          baseImageRef.current = img;
          setPdfDoc(null);
          setNumPages(1);
          setPageNum(1);
          setImageMode(true);
        } else {
          setLoadPhase('download');
          const res = await fetch(`/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(fp)}`);
          if (!res.ok) {
            let msg = 'Datei konnte nicht geladen werden';
            try {
              const j = await res.json();
              msg = (j.message as string) || (j.error as string) || msg;
            } catch {
              /* ignore */
            }
            throw new Error(msg);
          }
          const buf = await res.arrayBuffer();
          if (cancelled) return;
          setLoadPhase('parse');
          const doc = await pdfjsLib.getDocument({ data: buf }).promise;
          if (cancelled) return;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setPageNum(1);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Fehler beim Laden');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (imageBlobUrlRef.current) {
        URL.revokeObjectURL(imageBlobUrlRef.current);
        imageBlobUrlRef.current = null;
      }
      baseImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (tool === 'marker') {
      setLineWidth((w) => (w < 6 ? 14 : Math.min(36, w)));
    } else if (tool === 'pen') {
      setLineWidth((w) => (w > 8 ? 2.5 : w));
    }
  }, [tool]);

  const paintLaserFull = useCallback(() => {
    const canvas = laserCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const now = Date.now();
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    laserTrailRef.current = laserTrailRef.current.filter((p) => now - p.t < LASER_TRAIL_MS);
    const raw = laserTrailRef.current;
    const pruned =
      raw.length >= 4 ? smoothLaserPointsOnce(smoothLaserPointsOnce(raw)) : raw.length >= 3 ? smoothLaserPointsOnce(raw) : raw;

    if (pruned.length >= 2) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const n = pruned.length;
      for (let i = 0; i < n - 1; i++) {
        const p0 = i > 0 ? pruned[i - 1] : pruned[i];
        const p1 = pruned[i];
        const p2 = pruned[i + 1];
        const p3 = i + 2 < n ? pruned[i + 2] : pruned[i + 1];
        const age = now - (p1.t + p2.t) / 2;
        const u = Math.max(0, 1 - age / LASER_TRAIL_MS);
        if (u < 0.03) continue;
        const { cp1x, cp1y, cp2x, cp2y } = catmullRomBezierControls(p0, p1, p2, p3, LASER_SPLINE_TENSION);
        const strokeLaserLayer = (rgba: string, lw: number) => {
          ctx.strokeStyle = rgba;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          ctx.stroke();
        };
        strokeLaserLayer(`rgba(255, 200, 140, ${u * 0.72})`, 34);
        strokeLaserLayer(`rgba(255, 45, 28, ${u * 0.94})`, 16);
        strokeLaserLayer(`rgba(255, 255, 255, ${u * 1})`, 6);
      }
    }

    const head = laserHeadRef.current;
    if (head) {
      const { x: hx, y: hy } = head;
      ctx.save();
      const gr = ctx.createRadialGradient(hx, hy, 0, hx, hy, 58);
      gr.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gr.addColorStop(0.08, 'rgba(255, 245, 160, 1)');
      gr.addColorStop(0.22, 'rgba(255, 80, 40, 0.98)');
      gr.addColorStop(0.48, 'rgba(255, 30, 15, 0.62)');
      gr.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(hx, hy, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'rgba(255, 90, 50, 1)';
      ctx.shadowBlur = 32;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, []);

  const scheduleLaserPaint = useCallback(() => {
    if (laserRafRef.current != null) return;
    const step = () => {
      laserRafRef.current = null;
      paintLaserFull();
      const trailLeft = laserTrailRef.current.length > 0;
      const head = laserHeadRef.current;
      if (trailLeft || head != null) {
        laserRafRef.current = requestAnimationFrame(step);
      }
    };
    laserRafRef.current = requestAnimationFrame(step);
  }, [paintLaserFull]);

  const clearLaserCanvas = useCallback(() => {
    laserTrailRef.current = [];
    laserHeadRef.current = null;
    laserPointerDownRef.current = false;
    if (laserRafRef.current != null) {
      cancelAnimationFrame(laserRafRef.current);
      laserRafRef.current = null;
    }
    const c = laserCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
  }, []);

  useEffect(() => {
    if (tool !== 'laser') clearLaserCanvas();
  }, [tool, clearLaserCanvas]);

  const redrawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const vp = viewportRef.current;
    if (!overlay || !vp) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const idx = pageNum - 1;
    const strokes = strokesByPage[idx] || [];
    for (const s of strokes) {
      drawStrokeSmooth(ctx, s);
    }
    const texts = textByPage[idx] || [];
    for (const t of texts) {
      ctx.font = `${t.fontSize}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
  }, [pageNum, strokesByPage, textByPage]);

  const renderPdfPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    viewportRef.current = { width: viewport.width, height: viewport.height };
    const canvas = pdfCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width = viewport.width;
      overlay.height = viewport.height;
    }
    const laser = laserCanvasRef.current;
    if (laser) {
      laser.width = viewport.width;
      laser.height = viewport.height;
    }
    clearLaserCanvas();
    await page.render({ canvasContext: ctx, viewport }).promise;
    redrawOverlay();
  }, [pdfDoc, pageNum, redrawOverlay, clearLaserCanvas]);

  const renderImagePage = useCallback(() => {
    const img = baseImageRef.current;
    if (!img || !imageMode || !pdfCanvasRef.current) return;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) return;
    const w = Math.round(nw * PDF_RENDER_SCALE);
    const h = Math.round(nh * PDF_RENDER_SCALE);
    viewportRef.current = { width: w, height: h };
    const canvas = pdfCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = w;
    canvas.height = h;
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width = w;
      overlay.height = h;
    }
    const laser = laserCanvasRef.current;
    if (laser) {
      laser.width = w;
      laser.height = h;
    }
    clearLaserCanvas();
    ctx.drawImage(img, 0, 0, w, h);
    redrawOverlay();
  }, [imageMode, redrawOverlay, clearLaserCanvas]);

  useEffect(() => {
    if (!pdfDoc) return;
    void renderPdfPage();
  }, [pdfDoc, pageNum, renderPdfPage]);

  useEffect(() => {
    if (!imageMode) return;
    void renderImagePage();
  }, [imageMode, pageNum, renderImagePage]);

  useEffect(() => {
    redrawOverlay();
  }, [strokesByPage, textByPage, pageNum, redrawOverlay]);

  const getCanvasCoordsFromClient = (canvas: HTMLCanvasElement, rect: DOMRect, clientX: number, clientY: number) => {
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'laser') return;
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = getCanvasCoordsFromClient(canvas, rect, e.clientX, e.clientY);
    const idx = pageNum - 1;
    const texts = textByPage[idx] || [];
    const hit = findTextAtPoint(x, y, texts, ctx);
    if (hit) {
      e.currentTarget.setPointerCapture(e.pointerId);
      textDragRef.current = {
        id: hit.id,
        pageIdx: idx,
        startCX: x,
        startCY: y,
        origX: hit.x,
        origY: hit.y,
      };
      textDragMovedRef.current = false;
      return;
    }
    if (tool === 'text') {
      setTextDialog({
        open: true,
        x,
        y,
        value: '',
        editingId: undefined,
        fontSize: 18,
      });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    overlayRectCacheRef.current = rect;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isMarker = tool === 'marker';
    drawingStrokeRef.current = {
      id,
      points: [{ x, y }],
      color: strokeColor,
      lineWidth,
      mode: isMarker ? 'marker' : 'pen',
      markerOpacity: isMarker ? markerOpacity : undefined,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textDragRef.current) {
      const canvas = overlayRef.current;
      const drag = textDragRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { x, y } = getCanvasCoordsFromClient(canvas, rect, e.clientX, e.clientY);
      const idx = drag.pageIdx;
      const dx = x - drag.startCX;
      const dy = y - drag.startCY;
      if (Math.abs(dx) + Math.abs(dy) > 4) textDragMovedRef.current = true;
      setTextByPage((prev) => {
        const list = [...(prev[idx] || [])];
        const i = list.findIndex((t) => t.id === drag.id);
        if (i < 0) return prev;
        list[i] = { ...list[i], x: drag.origX + dx, y: drag.origY + dy };
        return { ...prev, [idx]: list };
      });
      return;
    }
    const stroke = drawingStrokeRef.current;
    if (!stroke) return;
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    overlayRectCacheRef.current = rect;

    const native = e.nativeEvent as globalThis.PointerEvent;
    const raw = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const eventsToProcess = raw.length > 0 ? raw : [native];

    for (const ev of eventsToProcess) {
      const { x, y } = getCanvasCoordsFromClient(canvas, rect, ev.clientX, ev.clientY);
      const last = stroke.points[stroke.points.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const minDist = stroke.mode === 'marker' ? 0.25 : 0.35;
      if (dx * dx + dy * dy < minDist * minDist) continue;
      stroke.points.push({ x, y });
      if (stroke.points.length < 2) continue;
      const prev = stroke.points[stroke.points.length - 2];
      drawStrokeSegment(ctx, prev, { x, y }, stroke);
    }
  };

  const onPointerCancel = () => {
    overlayRectCacheRef.current = null;
    const stroke = drawingStrokeRef.current;
    drawingStrokeRef.current = null;
    textDragRef.current = null;
    textDragMovedRef.current = false;
    if (stroke && stroke.points.length >= 2) {
      const idx = pageNum - 1;
      pushUndoSnapshot();
      setStrokesByPage((prev) => ({
        ...prev,
        [idx]: [...(prev[idx] || []), stroke],
      }));
    }
  };

  const onPointerUp = () => {
    overlayRectCacheRef.current = null;
    if (textDragRef.current) {
      const drag = textDragRef.current;
      textDragRef.current = null;
      const idx = drag.pageIdx;
      if (!textDragMovedRef.current) {
        const t = (textSyncRef.current[idx] || []).find((x) => x.id === drag.id);
        if (t) {
          setTextDialog({
            open: true,
            x: t.x,
            y: t.y,
            value: t.text,
            editingId: t.id,
            fontSize: t.fontSize,
          });
        }
      } else {
        pushUndoSnapshot();
      }
      textDragMovedRef.current = false;
      return;
    }
    const stroke = drawingStrokeRef.current;
    drawingStrokeRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    const idx = pageNum - 1;
    pushUndoSnapshot();
    setStrokesByPage((prev) => ({
      ...prev,
      [idx]: [...(prev[idx] || []), stroke],
    }));
  };

  const pushLaserSamplesFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = laserCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const native = e.nativeEvent as globalThis.PointerEvent;
    const coalesced =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
    const eventsToProcess = coalesced.length > 0 ? coalesced : [native];
    const now = Date.now();
    const tr = laserTrailRef.current;
    for (const ev of eventsToProcess) {
      const { x, y } = getCanvasCoordsFromClient(canvas, rect, ev.clientX, ev.clientY);
      laserHeadRef.current = { x, y };
      const last = tr[tr.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 0.55 || now - last.t > 5) {
        tr.push({ x, y, t: now });
      }
    }
    if (tr.length > 720) tr.splice(0, tr.length - 720);
    scheduleLaserPaint();
  };

  const onLaserPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    laserPointerDownRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pushLaserSamplesFromEvent(e);
  };

  const onLaserPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!laserPointerDownRef.current) return;
    pushLaserSamplesFromEvent(e);
  };

  const endLaserStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    laserPointerDownRef.current = false;
    laserHeadRef.current = null;
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
    }
    scheduleLaserPaint();
  };

  const onLaserPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    endLaserStroke(e);
  };

  const onLaserPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    endLaserStroke(e);
  };

  const onLaserLostPointerCapture = () => {
    endLaserStroke();
  };

  const commitText = () => {
    const v = textDialog.value.trim();
    if (!v) {
      setTextDialog((d) => ({ ...d, open: false }));
      return;
    }
    pushUndoSnapshot();
    const idx = pageNum - 1;
    if (textDialog.editingId) {
      setTextByPage((prev) => {
        const list = (prev[idx] || []).map((t) =>
          t.id === textDialog.editingId
            ? { ...t, text: v, fontSize: textDialog.fontSize, color: strokeColor }
            : t
        );
        return { ...prev, [idx]: list };
      });
    } else {
      const ann: TextAnn = {
        id: `${Date.now()}`,
        x: textDialog.x,
        y: textDialog.y,
        text: v,
        fontSize: textDialog.fontSize,
        color: strokeColor,
      };
      setTextByPage((prev) => ({
        ...prev,
        [idx]: [...(prev[idx] || []), ann],
      }));
    }
    setTextDialog((d) => ({ ...d, open: false, value: '', editingId: undefined }));
  };

  const buildAnnotatedPdfBlob = useCallback(async (): Promise<Blob | null> => {
    if (imageMode) {
      const img = baseImageRef.current;
      if (!img) return null;
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      if (!nw || !nh) return null;
      const w = Math.round(nw * PDF_RENDER_SCALE);
      const h = Math.round(nh * PDF_RENDER_SCALE);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const cctx = c.getContext('2d');
      if (!cctx) return null;
      cctx.drawImage(img, 0, 0, w, h);
      const idx = pageNum - 1;
      const strokes = strokesByPage[idx] || [];
      const texts = textByPage[idx] || [];
      for (const s of strokes) {
        drawStrokeSmooth(cctx, s);
      }
      for (const t of texts) {
        cctx.font = `${t.fontSize}px sans-serif`;
        cctx.fillStyle = t.color;
        cctx.fillText(t.text, t.x, t.y);
      }
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgData = c.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
      return pdf.output('blob');
    }
    if (!pdfDoc) return null;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let p = 1; p <= numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const vp = page.getViewport({ scale: PDF_RENDER_SCALE });
      const c = document.createElement('canvas');
      c.width = vp.width;
      c.height = vp.height;
      const cctx = c.getContext('2d');
      if (!cctx) continue;
      await page.render({ canvasContext: cctx, viewport: vp }).promise;
      const idx = p - 1;
      const strokes = strokesByPage[idx] || [];
      const texts = textByPage[idx] || [];
      for (const s of strokes) {
        drawStrokeSmooth(cctx, s);
      }
      for (const t of texts) {
        cctx.font = `${t.fontSize}px sans-serif`;
        cctx.fillStyle = t.color;
        cctx.fillText(t.text, t.x, t.y);
      }

      const img = c.toDataURL('image/png');
      if (p > 1) pdf.addPage();
      pdf.addImage(img, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
    }
    return pdf.output('blob');
  }, [imageMode, pdfDoc, numPages, pageNum, strokesByPage, textByPage]);

  const exportPdf = async () => {
    const blob = await buildAnnotatedPdfBlob();
    if (!blob) return;
    const base = (fileName || 'folien').replace(/\.(pdf|png|jpe?g|gif|webp|bmp|svg|pptx?)$/i, '');
    const downloadName = `${base}_bearbeitet.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveFolienVersion = async () => {
    const label = saveLabel.trim();
    if (!label) {
      window.alert('Bitte einen Zusatz für den Dateinamen eingeben (z. B. Klasse5 oder mitLoesungen).');
      return;
    }
    const normPath = filePath.replace(/\\/g, '/').trim();
    if (!normPath) {
      window.alert('Kein Dateipfad – bitte die Datei aus dem Ordner erneut öffnen.');
      return;
    }
    if (!normPath.includes('/')) {
      window.alert(
        'Kein Zielordner im Pfad. Die Datei muss in einem Ordner liegen (Pfad mit „/“), damit die Kopie daneben gespeichert werden kann.'
      );
      return;
    }
    const blob = await buildAnnotatedPdfBlob();
    if (!blob) {
      window.alert('PDF konnte nicht erzeugt werden. Bitte kurz warten und erneut versuchen.');
      return;
    }
    const stem = getStemForSave(fileName || 'folien') || 'folien';
    const outName = buildStemSuffixPdfName(stem, label);
    let parentPath = parentDirGitPath(normPath);
    if (parentPath.startsWith('git-intern//Users/')) {
      parentPath = parentPath.replace(
        'git-intern//Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/',
        'git-intern/'
      );
    }
    if (!parentPath) {
      window.alert('Kein Zielordner für diese Datei.');
      return;
    }
    setSaveBusy(true);
    try {
      const fd = new FormData();
      // Reihenfolge wie Whiteboard: zuerst Datei, dann targetPath (multer/express-kompatibel)
      fd.append('file', blob, outName);
      fd.append('targetPath', parentPath);
      const res = await fetch('/api/file-system-paths/save-file', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        let msg = 'Speichern fehlgeschlagen';
        try {
          const j = (await res.json()) as { error?: string; message?: string };
          if (j.message) msg = j.message;
          else if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setSaveDialogOpen(false);
      setSaveLabel('');
      setSnackbar({ open: true, message: `Gespeichert: ${outName}` });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaveBusy(false);
    }
  };

  const openRawPdf = async () => {
    if (!filePath) return;
    if (imageMode) {
      const existing = imageBlobUrlRef.current;
      if (existing) {
        window.open(existing, '_blank');
        return;
      }
      try {
        const res = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(filePath)}`);
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 8000);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const apiUrl = fromPptx
        ? `/api/file-system-paths/pptx-as-pdf?filePath=${encodeURIComponent(filePath)}`
        : `/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(filePath)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    const p = new URLSearchParams(window.location.search);
    const fnQ = p.get('fileName') || '';
    const srcQ = p.get('source') || '';
    const extQ = fnQ.match(/\.([^.]+)$/i)?.[1]?.toLowerCase() || '';
    const isPptxUrl = srcQ === 'pptx' || extQ === 'pptx' || extQ === 'ppt';
    const isImageUrl = srcQ === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(extQ);
    const hint = isImageUrl
      ? loadPhase === 'parse'
        ? 'Bild wird vorbereitet …'
        : 'Bild wird vom Server gelesen und übertragen. Große Dateien brauchen länger.'
      : loadPhase === 'parse'
        ? 'PDF wird im Browser analysiert (pdf.js) …'
        : loadPhase === 'download' && isPptxUrl
          ? 'Konvertiertes PDF wird übertragen …'
          : isPptxUrl
            ? 'Server: PowerPoint → PDF (LibreOffice). Das kann bei großen Präsentationen 10–60 Sekunden dauern, die Datei wird vollständig konvertiert und dann geladen.'
            : 'PDF wird vom Server gelesen und übertragen. Große Dateien brauchen länger; anschließend folgt die Analyse im Browser.';
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          px: 2,
          maxWidth: 440,
          mx: 'auto',
          bgcolor: '#eceff1',
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.5 }}>
          {hint}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#eceff1', boxSizing: 'border-box' }}>
      <AppBar position="sticky" color="default" elevation={1} sx={{ flexShrink: 0, top: 0, zIndex: 10 }}>
        <Toolbar
          variant="dense"
          disableGutters
          sx={{
            px: 0.75,
            py: 0.5,
            minHeight: 40,
            flexWrap: 'nowrap',
            gap: 0.5,
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            /* Icon klar kleiner als Klickfläche – kein Überstand */
            '& .MuiIconButton-root': {
              minWidth: 32,
              minHeight: 32,
              maxWidth: 32,
              maxHeight: 32,
              p: 0.5,
              boxSizing: 'border-box',
              borderRadius: 1,
              border: '1px solid rgba(0,0,0,0.08)',
              bgcolor: 'rgba(255,255,255,0.65)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
            },
            '& .MuiIconButton-colorPrimary': {
              borderColor: 'primary.main',
              bgcolor: 'rgba(25, 118, 210, 0.08)',
            },
            '& .MuiIconButton-root .MuiSvgIcon-root': {
              fontSize: 18,
              width: 18,
              height: 18,
            },
            '& .MuiIconButton-root.Mui-disabled': {
              opacity: 0.45,
              borderColor: 'rgba(0,0,0,0.06)',
            },
          }}
        >
          <Tooltip
            title={
              imageMode
                ? `${fileName} — Bild, Stift/Text wie bei PDF`
                : fromPptx
                  ? `${fileName} — PowerPoint → PDF (Server), Stift/Text wie bei PDF`
                  : fileName
            }
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                maxWidth: { xs: 72, sm: 140, md: 220 },
                flexShrink: 0,
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.7rem',
              }}
            >
              {fileName}
            </Typography>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 22, alignSelf: 'center' }} />

          <Tooltip title="Stift">
            <IconButton size="small" color={tool === 'pen' ? 'primary' : 'default'} onClick={() => setTool('pen')}>
              <DrawIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Marker (transparent, breit)">
            <IconButton size="small" color={tool === 'marker' ? 'primary' : 'default'} onClick={() => setTool('marker')}>
              <HighlightIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Text — Klick: neu. Auf Text ziehen: verschieben (auch mit Stift/Marker). Klick ohne Zug: bearbeiten">
            <IconButton size="small" color={tool === 'text' ? 'primary' : 'default'} onClick={() => setTool('text')}>
              <TextIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Laserpointer: Maustaste gedrückt halten (~3 s Nachleuchten, nicht im PDF)">
            <IconButton size="small" color={tool === 'laser' ? 'primary' : 'default'} onClick={() => setTool('laser')}>
              <LaserPointerIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={tool === 'marker' ? `Markerbreite: ${lineWidth}` : `Stiftstärke: ${lineWidth}`}>
            <Box
              sx={{
                width: 48,
                flexShrink: 0,
                py: 0,
                display: 'flex',
                alignItems: 'center',
                visibility: tool === 'laser' ? 'hidden' : 'visible',
                pointerEvents: tool === 'laser' ? 'none' : 'auto',
              }}
            >
              <Slider
                size="small"
                min={tool === 'marker' ? 6 : 1}
                max={tool === 'marker' ? 36 : 8}
                step={tool === 'marker' ? 1 : 0.5}
                value={lineWidth}
                onChange={(_, v) => setLineWidth(v as number)}
                sx={{
                  py: 0,
                  '& .MuiSlider-thumb': { width: 10, height: 10 },
                  '& .MuiSlider-track': { height: 3 },
                  '& .MuiSlider-rail': { height: 3, opacity: 0.35 },
                }}
              />
            </Box>
          </Tooltip>

          {tool === 'marker' && (
            <Tooltip title={`Marker-Deckkraft: ${Math.round(markerOpacity * 100)}%`}>
              <Box sx={{ width: 44, flexShrink: 0, py: 0, display: 'flex', alignItems: 'center' }}>
                <Slider
                  size="small"
                  min={0.12}
                  max={0.55}
                  step={0.02}
                  value={markerOpacity}
                  onChange={(_, v) => setMarkerOpacity(v as number)}
                  sx={{
                    py: 0,
                    '& .MuiSlider-thumb': { width: 10, height: 10 },
                    '& .MuiSlider-track': { height: 3 },
                    '& .MuiSlider-rail': { height: 3, opacity: 0.35 },
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {tool === 'marker' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
              {MARKER_PRESET_COLORS.map((c) => (
                <Box
                  key={c}
                  component="button"
                  type="button"
                  onClick={() => setStrokeColor(c)}
                  sx={{
                    width: 16,
                    height: 16,
                    p: 0,
                    borderRadius: '50%',
                    bgcolor: c,
                    border: strokeColor === c ? '2px solid #333' : '1px solid rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  aria-label={`Markerfarbe ${c}`}
                />
              ))}
            </Box>
          )}

          <Tooltip title="Farbe">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              style={{
                width: 22,
                height: 22,
                padding: 0,
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 4,
                cursor: 'pointer',
                flexShrink: 0,
                verticalAlign: 'middle',
                boxSizing: 'border-box',
              }}
            />
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 22, alignSelf: 'center' }} />

          <Tooltip title="Rückgängig">
            <span>
              <IconButton size="small" onClick={undo} disabled={undoStack.length === 0}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={imageMode ? 'Originalbild (Tab)' : fromPptx ? 'Vorschau-PDF (Tab)' : 'Original-PDF (Tab)'}>
            <IconButton size="small" onClick={() => void openRawPdf()}>
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Version im gleichen Ordner speichern (PDF-Kopie mit Beschriftung)">
            <IconButton size="small" color="secondary" onClick={() => setSaveDialogOpen(true)}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="PDF herunterladen (mit Anmerkungen)">
            <IconButton size="small" color="primary" onClick={() => void exportPdf()}>
              <GetAppIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ flex: '1 0 4px', minWidth: 4 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0 }}>
            <Tooltip title="Vorherige Folie">
              <span>
                <IconButton size="small" disabled={pageNum <= 1} onClick={() => setPageNum((p) => Math.max(1, p - 1))}>
                  <ChevronLeft />
                </IconButton>
              </span>
            </Tooltip>
            <Typography
              component="span"
              variant="caption"
              sx={{ minWidth: 42, textAlign: 'center', fontWeight: 700, fontSize: '0.65rem', px: 0.25, lineHeight: 1 }}
            >
              {pageNum}/{numPages}
            </Typography>
            <Tooltip title="Nächste Folie">
              <span>
                <IconButton size="small" disabled={pageNum >= numPages} onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}>
                  <ChevronRight />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          width: '100%',
          overflow: 'auto',
          py: 2,
          px: 1.5,
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 'min(100%, 920px)', mx: 'auto' }}>
          <Box sx={{ position: 'relative', maxWidth: '100%', boxShadow: 3, bgcolor: '#fff', lineHeight: 0 }}>
            <canvas
              ref={pdfCanvasRef}
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                verticalAlign: 'top',
              }}
            />
            <canvas
              ref={overlayRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                pointerEvents: tool === 'laser' ? 'none' : 'auto',
                cursor: tool === 'text' ? 'text' : tool === 'pen' || tool === 'marker' ? 'crosshair' : 'default',
                touchAction: 'none',
              }}
            />
            <canvas
              ref={laserCanvasRef}
              onPointerDown={onLaserPointerDown}
              onPointerMove={onLaserPointerMove}
              onPointerUp={onLaserPointerUp}
              onPointerCancel={onLaserPointerCancel}
              onLostPointerCapture={onLaserLostPointerCapture}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                display: 'block',
                pointerEvents: tool === 'laser' ? 'auto' : 'none',
                cursor: tool === 'laser' ? 'crosshair' : 'default',
                touchAction: 'none',
              }}
            />
          </Box>
        </Box>
      </Box>

      <Dialog open={textDialog.open} onClose={() => setTextDialog((d) => ({ ...d, open: false, editingId: undefined }))}>
        <DialogTitle>{textDialog.editingId ? 'Text bearbeiten' : 'Neuer Text'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={textDialog.value}
            onChange={(e) => setTextDialog((d) => ({ ...d, value: e.target.value }))}
            placeholder="Text eingeben…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitText();
              }
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ flexShrink: 0 }}>
              Schriftgröße
            </Typography>
            <Slider
              size="small"
              min={6}
              max={120}
              step={1}
              value={textDialog.fontSize}
              onChange={(_, v) => setTextDialog((d) => ({ ...d, fontSize: v as number }))}
              sx={{ flex: 1 }}
            />
            <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right' }}>
              {textDialog.fontSize}px
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Strg+Enter (⌘+Enter) übernimmt den Text.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextDialog((d) => ({ ...d, open: false, editingId: undefined }))}>Abbrechen</Button>
          <Button variant="contained" onClick={commitText}>
            {textDialog.editingId ? 'Speichern' : 'Einfügen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveDialogOpen} onClose={() => !saveBusy && setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Version speichern</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Zusatz im Dateinamen"
            value={saveLabel}
            onChange={(e) => setSaveLabel(e.target.value)}
            placeholder="z. B. Klasse5 oder mitLoesungen"
            disabled={saveBusy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && saveLabel.trim() && !saveBusy) {
                e.preventDefault();
                void saveFolienVersion();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saveBusy}>
            Abbrechen
          </Button>
          <Button variant="contained" disabled={!saveLabel.trim() || saveBusy} onClick={() => void saveFolienVersion()}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default SlideDeckEditorPage;
