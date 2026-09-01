import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Popover, Slider, Tooltip, Typography } from '@mui/material';
import {
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  FormatColorText as FormatColorTextIcon,
  FormatColorFill as FormatColorFillIcon,
  FormatAlignLeft as FormatAlignLeftIcon,
  FormatAlignCenter as FormatAlignCenterIcon,
  FormatAlignRight as FormatAlignRightIcon,
  DeleteOutline as DeleteOutlineIcon,
  AddPhotoAlternate as AddPhotoAlternateIcon,
  Functions as FunctionsIcon,
  WrapText as WrapTextIcon,
} from '@mui/icons-material';
import { isPenPointer } from '../../lib/presentationDrawTools';
import { ensureEditorSelection, stashEditorSelection } from '../../lib/presentationFontSize';
import { setFormatBarInteracting } from '../../lib/presentationFormatBarGuard';
import {
  buildEtImgStyle,
  entryTicketLooksLikeHtml,
  normalizeEntryTicketFieldValue,
  readEntryTicketCardLayout,
  setEntryTicketCardLayout,
  unwrapEntryTicketCardLayout,
  type EntryTicketCardLayout,
  type EntryTicketImageAlign,
  type EntryTicketImagePlace,
} from '../../lib/entryTicketRichText';

const TEXT_COLORS = [
  '#1a237e',
  '#000000',
  '#c62828',
  '#ef6c00',
  '#2e7d32',
  '#1565c0',
  '#6a1b9a',
  '#00838f',
  '#ad1457',
];

const HIGHLIGHT_COLORS = [
  '#fff59d',
  '#c5e1a5',
  '#90caf9',
  '#f8bbd0',
  '#ffcc80',
  '#ce93d8',
  'transparent',
];

const SIZE_PRESETS = [
  { id: 's', pct: 25, label: 'S' },
  { id: 'm', pct: 45, label: 'M' },
  { id: 'l', pct: 70, label: 'L' },
  { id: 'xl', pct: 100, label: 'XL' },
] as const;

type ImageAlign = EntryTicketImageAlign;
type ImagePlace = EntryTicketImagePlace;

function clampImageWidthPct(n: number): number {
  if (!Number.isFinite(n)) return 45;
  return Math.min(100, Math.max(15, Math.round(n)));
}

function isPrimaryPointer(e: { pointerType?: string; button?: number }): boolean {
  if (e.pointerType === 'mouse') return e.button === 0;
  return true;
}

function listenWindowPointerDrag(
  pointerId: number,
  onMove: (ev: PointerEvent) => void,
  onUp: (ev: PointerEvent) => void,
) {
  const prevTouch = document.body.style.touchAction;
  const prevSelect = document.body.style.userSelect;
  document.body.style.touchAction = 'none';
  document.body.style.userSelect = 'none';
  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    ev.preventDefault();
    onMove(ev);
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', up, true);
    document.body.style.touchAction = prevTouch;
    document.body.style.userSelect = prevSelect;
    onUp(ev);
  };
  window.addEventListener('pointermove', move, { capture: true, passive: false });
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
}

function caretRangeFromPoint(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretRangeFromPoint === 'function') return doc.caretRangeFromPoint(x, y);
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const r = document.createRange();
  r.setStart(pos.offsetNode, pos.offset);
  r.collapse(true);
  return r;
}

function moveEtImageToPoint(img: HTMLImageElement, editor: HTMLElement, clientX: number, clientY: number): boolean {
  const range = caretRangeFromPoint(clientX, clientY);
  if (!range || !editor.contains(range.commonAncestorContainer)) return false;
  const node = range.commonAncestorContainer;
  if (node === img || (node instanceof HTMLElement && node.contains(img) && img.contains(node))) return false;
  if (img.contains(node)) return false;
  try {
    range.insertNode(img);
    return true;
  } catch {
    return false;
  }
}

const IMG_CORNER_HIT = 32;

function sizeIdForWidth(widthPct: number): 's' | 'm' | 'l' | 'xl' {
  const w = clampImageWidthPct(widthPct);
  let best: 's' | 'm' | 'l' | 'xl' = 'm';
  let bestDist = Infinity;
  for (const s of SIZE_PRESETS) {
    const d = Math.abs(s.pct - w);
    if (d < bestDist) {
      bestDist = d;
      best = s.id;
    }
  }
  return best;
}

function applyImageLayout(
  img: HTMLImageElement,
  widthPct: number,
  align: ImageAlign,
  place: ImagePlace,
) {
  const w = clampImageWidthPct(widthPct);
  img.style.cssText = buildEtImgStyle(w, align, place);
  img.setAttribute('data-et-size', sizeIdForWidth(w));
  img.setAttribute('data-et-align', align);
  img.setAttribute('data-et-width', String(w));
  img.setAttribute('data-et-place', place);
}

function readImageWidthPct(img: HTMLImageElement): number {
  const fromData = img.getAttribute('data-et-width');
  if (fromData && /^\d{1,3}$/.test(fromData)) return clampImageWidthPct(Number(fromData));
  const w = (img.style.width || '').trim();
  const m = w.match(/^(\d+(?:\.\d+)?)%$/);
  if (m) return clampImageWidthPct(Number(m[1]));
  return 45;
}

function readImageAlign(img: HTMLImageElement): ImageAlign {
  const fromData = img.getAttribute('data-et-align');
  if (fromData === 'left' || fromData === 'center' || fromData === 'right') return fromData;
  return 'center';
}

function readImagePlace(img: HTMLImageElement): ImagePlace {
  const fromData = img.getAttribute('data-et-place');
  if (fromData === 'inline' || fromData === 'float-left' || fromData === 'float-right' || fromData === 'block') {
    return fromData;
  }
  const float = (img.style.float || '').trim().toLowerCase();
  if (float === 'left') return 'float-left';
  if (float === 'right') return 'float-right';
  if ((img.style.display || '').includes('inline')) return 'inline';
  return 'block';
}

const MAX_IMAGE_WIDTH = 900;
const MAX_IMAGE_BYTES = 900_000;

type FieldTone = 'prompt' | 'answer' | 'neutral';

const TONE_STYLES: Record<
  FieldTone,
  { border: string; borderFocus: string; softBg: string; toolbarBg: string; toolbarBorder: string; toolBtn: string; toolBtnBorder: string; text: string; shadow: string }
> = {
  prompt: {
    border: '#ef6c00',
    borderFocus: '#e65100',
    softBg: '#fff3e0',
    toolbarBg: '#ffe0b2',
    toolbarBorder: '#ffcc80',
    toolBtn: '#e65100',
    toolBtnBorder: '#ffb74d',
    text: '#bf360c',
    shadow: 'rgba(230, 81, 0, 0.22)',
  },
  answer: {
    border: '#2e7d32',
    borderFocus: '#1b5e20',
    softBg: '#e8f5e9',
    toolbarBg: '#c8e6c9',
    toolbarBorder: '#a5d6a7',
    toolBtn: '#2e7d32',
    toolBtnBorder: '#81c784',
    text: '#1b5e20',
    shadow: 'rgba(46, 125, 50, 0.22)',
  },
  neutral: {
    border: '#90a4ae',
    borderFocus: '#546e7a',
    softBg: '#ffffff',
    toolbarBg: 'rgba(255,255,255,0.72)',
    toolbarBorder: '#cfd8dc',
    toolBtn: '#455a64',
    toolBtnBorder: '#b0bec5',
    text: '#263238',
    shadow: 'rgba(69, 90, 100, 0.18)',
  },
};

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  softBg?: string;
  tone?: FieldTone;
  minHeight?: number;
  /** Play/Lösung: Stift-Overlay kann den Editor durchreichen. */
  playSurface?: boolean;
  /** Füllt die Höhe des Eltern-Containers (großes Karten-Modal). */
  fillParent?: boolean;
  editorFontSize?: string | Record<string, string>;
  /** Notizen-Layout: weiße Schreibfläche im Host, Werkzeugleiste oben. */
  notesSurface?: boolean;
  /** false = Stift-Modus, kein Tippen */
  textEditing?: boolean;
  /** Stift-Canvas — nur über der Schreibfläche, nicht über der Toolbar */
  overlay?: React.ReactNode;
};

function toEditorHtml(value: string): string {
  const v = unwrapEntryTicketCardLayout((value || '').trim());
  if (!v) return '';
  if (entryTicketLooksLikeHtml(v)) return v;
  return v
    .split('\n')
    .map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '<br>'}</p>`)
    .join('');
}

async function fileToCompressedDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_WIDTH / Math.max(1, bitmap.width));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const preferPng = /png|gif|webp|svg/i.test(file.type);
    let dataUrl = canvas.toDataURL(preferPng ? 'image/png' : 'image/jpeg', 0.82);
    if (dataUrl.length > MAX_IMAGE_BYTES) dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    if (dataUrl.length > MAX_IMAGE_BYTES) dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    return dataUrl;
  } catch {
    return null;
  }
}

function EntryTicketRichFieldInner({
  value,
  onChange,
  placeholder = '',
  softBg,
  tone = 'neutral',
  minHeight = 52,
  playSurface = false,
  fillParent = false,
  editorFontSize,
  notesSurface = false,
  textEditing: textEditingProp,
  overlay,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const skipValueSyncRef = useRef(0);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  const selectedImgIndexRef = useRef<number | null>(null);
  selectedImgIndexRef.current = selectedImgIndex;
  const [imgWidthPct, setImgWidthPct] = useState(45);
  const [imgAlign, setImgAlign] = useState<ImageAlign>('center');
  const [imgPlace, setImgPlace] = useState<ImagePlace>('block');
  const [cardLayout, setCardLayout] = useState<EntryTicketCardLayout>(() => readEntryTicketCardLayout(value));
  const cardLayoutRef = useRef<EntryTicketCardLayout>(cardLayout);
  cardLayoutRef.current = cardLayout;
  const [imageCount, setImageCount] = useState(0);
  const [chromeOpen, setChromeOpen] = useState(false);
  const [imgHandle, setImgHandle] = useState<{ left: number; top: number } | null>(null);
  const palette = TONE_STYLES[tone];
  const fieldBg = softBg ?? (notesSurface ? '#ffffff' : palette.softBg);
  const textEditing = textEditingProp ?? true;
  const showChrome = textEditing && (chromeOpen || Boolean(colorAnchor) || Boolean(highlightAnchor));

  const listEditorImages = () => {
    const el = editorRef.current;
    if (!el) return [] as HTMLImageElement[];
    return Array.from(el.querySelectorAll('img')).filter(
      (n): n is HTMLImageElement => n instanceof HTMLImageElement,
    );
  };

  const syncImgHandle = () => {
    const wrap = wrapRef.current;
    const imgs = listEditorImages();
    const idx = selectedImgIndexRef.current;
    if (!wrap || idx == null || !imgs[idx]) {
      setImgHandle(null);
      return;
    }
    const ir = imgs[idx].getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    if (ir.width < 8 || ir.height < 8) {
      setImgHandle(null);
      return;
    }
    setImgHandle({
      left: ir.right - wr.left - 26,
      top: ir.bottom - wr.top - 26,
    });
  };

  const markSelected = (imgs: HTMLImageElement[], idx: number | null) => {
    imgs.forEach((node, i) => {
      node.draggable = false;
      if (idx != null && i === idx) node.setAttribute('data-selected', '1');
      else node.removeAttribute('data-selected');
    });
  };

  const refreshImageUi = (preferIndex: number | null = selectedImgIndexRef.current) => {
    const imgs = listEditorImages();
    setImageCount(imgs.length);
    if (imgs.length === 0) {
      setSelectedImgIndex(null);
      selectedImgIndexRef.current = null;
      setImgHandle(null);
      return;
    }
    let idx = preferIndex;
    if (idx == null || idx < 0 || idx >= imgs.length) idx = imgs.length - 1;
    const img = imgs[idx];
    setSelectedImgIndex(idx);
    selectedImgIndexRef.current = idx;
    setImgWidthPct(readImageWidthPct(img));
    setImgAlign(readImageAlign(img));
    setImgPlace(readImagePlace(img));
    markSelected(imgs, idx);
    requestAnimationFrame(() => syncImgHandle());
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipValueSyncRef.current > 0) {
      skipValueSyncRef.current -= 1;
      lastEmitted.current = value;
      setCardLayout(readEntryTicketCardLayout(value));
      refreshImageUi(selectedImgIndexRef.current);
      return;
    }
    const nextHtml = toEditorHtml(value);
    const normalizedCurrent = normalizeEntryTicketFieldValue(
      setEntryTicketCardLayout(el.innerHTML, cardLayoutRef.current),
    );
    const normalizedNext = normalizeEntryTicketFieldValue(value);
    if (normalizedCurrent !== normalizedNext) {
      el.innerHTML = nextHtml;
    } else if (!el.innerHTML && nextHtml) {
      el.innerHTML = nextHtml;
    }
    lastEmitted.current = value;
    setCardLayout(readEntryTicketCardLayout(value));
    refreshImageUi(selectedImgIndexRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!el.innerHTML) {
      el.innerHTML = toEditorHtml(value);
      lastEmitted.current = value;
    }
    refreshImageUi(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedImgIndex == null) {
      setImgHandle(null);
      return undefined;
    }
    const onScroll = () => syncImgHandle();
    const editor = editorRef.current;
    editor?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    requestAnimationFrame(() => syncImgHandle());
    return () => {
      editor?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImgIndex]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = setEntryTicketCardLayout(el.innerHTML, cardLayoutRef.current);
    lastEmitted.current = next;
    skipValueSyncRef.current = 2;
    onChange(next);
  };

  const applyCardLayout = (layout: EntryTicketCardLayout) => {
    const el = editorRef.current;
    if (!el) return;
    if (layout === 'split-left' || layout === 'split-right') {
      listEditorImages().forEach((img) => applyImageLayout(img, 100, 'center', 'block'));
      setImgWidthPct(100);
      setImgAlign('center');
      setImgPlace('block');
    }
    setCardLayout(layout);
    cardLayoutRef.current = layout;
    const next = setEntryTicketCardLayout(el.innerHTML, layout);
    lastEmitted.current = next;
    skipValueSyncRef.current = 2;
    onChange(next);
  };

  const runCommand = (command: string, commandValue?: string) => {
    const el = editorRef.current;
    if (!el || !textEditing) return;
    ensureEditorSelection(el);
    el.focus({ preventScroll: true });
    try {
      document.execCommand(command, false, commandValue);
    } catch {
      /* ignore */
    }
    emitChange();
  };

  const insertLatexDelimiters = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const selected = (sel?.toString() || '').replace(/^\$+|\$+$/g, '');
    try {
      if (selected) {
        document.execCommand('insertText', false, `$${selected}$`);
      } else {
        document.execCommand('insertText', false, '$$');
        const after = window.getSelection();
        if (after?.rangeCount) {
          const range = after.getRangeAt(0);
          const offset = range.startOffset;
          if (range.startContainer.nodeType === Node.TEXT_NODE && offset > 0) {
            range.setStart(range.startContainer, offset - 1);
            range.collapse(true);
            after.removeAllRanges();
            after.addRange(range);
          }
        }
      }
    } catch {
      /* ignore */
    }
    emitChange();
  };

  const selectImageAt = (idx: number) => {
    const imgs = listEditorImages();
    if (idx < 0 || idx >= imgs.length) return;
    const img = imgs[idx];
    setSelectedImgIndex(idx);
    selectedImgIndexRef.current = idx;
    setImageCount(imgs.length);
    setImgWidthPct(readImageWidthPct(img));
    setImgAlign(readImageAlign(img));
    setImgPlace(readImagePlace(img));
    markSelected(imgs, idx);
    requestAnimationFrame(() => syncImgHandle());
  };

  const insertImageHtml = (dataUrl: string, alt = 'Bild') => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const safeAlt = alt.replace(/"/g, '');
    const width = cardLayoutRef.current === 'flow' ? 45 : 100;
    const style = buildEtImgStyle(width, 'center', 'block');
    const sizeId = sizeIdForWidth(width);
    const html = `<img src="${dataUrl}" alt="${safeAlt}" data-et-size="${sizeId}" data-et-align="center" data-et-width="${width}" data-et-place="block" style="${style}" />`;
    try {
      const ok = document.execCommand('insertHTML', false, html);
      if (!ok) el.insertAdjacentHTML('beforeend', html);
    } catch {
      el.insertAdjacentHTML('beforeend', html);
    }
    const imgs = listEditorImages();
    selectImageAt(Math.max(0, imgs.length - 1));
    emitChange();
  };

  const updateSelectedImage = (
    widthPct: number,
    align: ImageAlign = imgAlign,
    place: ImagePlace = imgPlace,
    commit = true,
  ) => {
    const imgs = listEditorImages();
    if (imgs.length === 0) return;
    let idx = selectedImgIndexRef.current;
    if (idx == null || idx < 0 || idx >= imgs.length) idx = imgs.length - 1;
    const w = clampImageWidthPct(widthPct);
    applyImageLayout(imgs[idx], w, align, place);
    setSelectedImgIndex(idx);
    selectedImgIndexRef.current = idx;
    setImgWidthPct(w);
    setImgAlign(align);
    setImgPlace(place);
    setImageCount(imgs.length);
    markSelected(imgs, idx);
    requestAnimationFrame(() => syncImgHandle());
    if (commit) emitChange();
  };

  const deleteSelectedImage = () => {
    const imgs = listEditorImages();
    if (imgs.length === 0) return;
    let idx = selectedImgIndexRef.current;
    if (idx == null || idx < 0 || idx >= imgs.length) idx = imgs.length - 1;
    const img = imgs[idx];
    const parent = img.parentElement;
    img.remove();
    if (parent && parent !== editorRef.current && parent.childNodes.length === 0) {
      parent.remove();
    } else if (parent && parent !== editorRef.current) {
      const onlyBr = parent.childNodes.length === 1 && parent.childNodes[0].nodeName === 'BR';
      if (onlyBr || !parent.textContent?.trim()) parent.remove();
    }
    const nextImgs = listEditorImages();
    setImageCount(nextImgs.length);
    if (nextImgs.length === 0) {
      setSelectedImgIndex(null);
      selectedImgIndexRef.current = null;
    } else {
      selectImageAt(Math.min(idx, nextImgs.length - 1));
    }
    emitChange();
  };

  const ingestImageFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    for (const file of list) {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (dataUrl) insertImageHtml(dataUrl, file.name || 'Bild');
    }
  };

  const toolBtnSx = {
    width: 24,
    height: 24,
    p: 0,
    borderRadius: 0.6,
    border: '1px solid',
    borderColor: palette.toolBtnBorder,
    color: palette.toolBtn,
    bgcolor: '#fff',
    '&:hover': { bgcolor: fieldBg, borderColor: palette.borderFocus },
  } as const;

  const hasImages = imageCount > 0;

  return (
    <Box
      ref={wrapRef}
      data-pres-element={playSurface ? `et-${tone}` : undefined}
      data-pres-element-type={playSurface ? 'text' : undefined}
      data-pres-rich-zone={playSurface ? '1' : undefined}
      data-et-play-edit={playSurface ? '1' : undefined}
      sx={{
        width: '100%',
        minWidth: 0,
        borderRadius: notesSurface ? 0 : 1,
        border: notesSurface ? 'none' : '2px solid',
        borderColor: dragOver ? '#43a047' : palette.border,
        bgcolor: notesSurface ? 'transparent' : fieldBg,
        overflow: notesSurface ? 'hidden' : 'visible',
        boxSizing: 'border-box',
        boxShadow: notesSurface
          ? 'none'
          : dragOver
            ? '0 0 0 2px rgba(67,160,71,0.28)'
            : 'none',
        transition: notesSurface ? undefined : 'border-color 0.12s ease, box-shadow 0.12s ease',
        position: 'relative',
        ...(fillParent
          ? { height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }
          : {}),
        ...(!notesSurface
          ? {
              '&:focus-within': {
                borderColor: dragOver ? '#43a047' : palette.borderFocus,
                boxShadow: dragOver
                  ? '0 0 0 2px rgba(67,160,71,0.28)'
                  : `0 0 0 2px ${palette.shadow}`,
              },
            }
          : {}),
      }}
      onPointerDownCapture={(e) => {
        if (notesSurface) return;
        if (isPenPointer(e)) e.preventDefault();
      }}
      onFocus={() => setChromeOpen(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setChromeOpen(false);
      }}
      onDragEnter={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void ingestImageFiles(e.dataTransfer.files);
      }}
    >
      {showChrome ? (
      <Box
        data-et-toolbar=""
        data-et-format-ui=""
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.3,
          px: 0.4,
          py: 0.25,
          borderBottom: '2px solid',
          borderColor: palette.toolbarBorder,
          bgcolor: palette.toolbarBg,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          stashEditorSelection(editorRef.current);
          setFormatBarInteracting(true);
        }}
        onMouseUp={() => window.setTimeout(() => setFormatBarInteracting(false), 0)}
      >
        <Tooltip title="Fett">
          <IconButton size="small" aria-label="Fett" onClick={() => runCommand('bold')} sx={toolBtnSx}>
            <FormatBoldIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Kursiv">
          <IconButton size="small" aria-label="Kursiv" onClick={() => runCommand('italic')} sx={toolBtnSx}>
            <FormatItalicIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Unterstrichen">
          <IconButton size="small" aria-label="Unterstrichen" onClick={() => runCommand('underline')} sx={toolBtnSx}>
            <FormatUnderlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Textfarbe">
          <IconButton
            size="small"
            aria-label="Textfarbe"
            onMouseDown={(e) => {
              e.preventDefault();
              stashEditorSelection(editorRef.current);
            }}
            onClick={(e) => setColorAnchor(e.currentTarget)}
            sx={toolBtnSx}
          >
            <FormatColorTextIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hintergrund">
          <IconButton
            size="small"
            aria-label="Hintergrundfarbe"
            onMouseDown={(e) => {
              e.preventDefault();
              stashEditorSelection(editorRef.current);
            }}
            onClick={(e) => setHighlightAnchor(e.currentTarget)}
            sx={toolBtnSx}
          >
            <FormatColorFillIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="LaTeX ($…$) — in der Play-Vorschau sichtbar">
          <IconButton size="small" aria-label="LaTeX" onClick={insertLatexDelimiters} sx={toolBtnSx}>
            <FunctionsIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bild einfügen">
          <IconButton size="small" aria-label="Bild einfügen" onClick={() => fileInputRef.current?.click()} sx={toolBtnSx}>
            <AddPhotoAlternateIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Bild links | Text rechts">
          <IconButton
            size="small"
            aria-label="Bild links"
            onClick={() => applyCardLayout(cardLayout === 'split-left' ? 'flow' : 'split-left')}
            sx={{
              ...toolBtnSx,
              width: 'auto',
              minWidth: 28,
              px: 0.45,
              fontSize: 9,
              fontWeight: 800,
              bgcolor: cardLayout === 'split-left' ? palette.toolbarBorder : '#fff',
            }}
          >
            ◧
          </IconButton>
        </Tooltip>
        <Tooltip title="Text links | Bild rechts">
          <IconButton
            size="small"
            aria-label="Bild rechts"
            onClick={() => applyCardLayout(cardLayout === 'split-right' ? 'flow' : 'split-right')}
            sx={{
              ...toolBtnSx,
              width: 'auto',
              minWidth: 28,
              px: 0.45,
              fontSize: 9,
              fontWeight: 800,
              bgcolor: cardLayout === 'split-right' ? palette.toolbarBorder : '#fff',
            }}
          >
            ◨
          </IconButton>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void ingestImageFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Box>
      ) : null}

      {showChrome && hasImages && selectedImgIndex != null ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.35,
            px: 0.45,
            py: 0.25,
            borderBottom: '1px solid',
            borderColor: palette.toolbarBorder,
            bgcolor: 'rgba(255,255,255,0.55)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {SIZE_PRESETS.map((s) => (
            <Tooltip key={s.id} title={`${s.pct}%`}>
              <IconButton
                size="small"
                aria-label={`Größe ${s.label}`}
                onClick={() => updateSelectedImage(s.pct, imgAlign, imgPlace, true)}
                sx={{
                  ...toolBtnSx,
                  width: 22,
                  height: 22,
                  fontSize: 9,
                  fontWeight: 800,
                  bgcolor: sizeIdForWidth(imgWidthPct) === s.id ? palette.toolbarBorder : '#fff',
                }}
              >
                {s.label}
              </IconButton>
            </Tooltip>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flex: 1, minWidth: 90, maxWidth: 150 }}>
            <Slider
              size="small"
              value={imgWidthPct}
              min={15}
              max={100}
              step={1}
              aria-label="Bildbreite"
              onChange={(_, v) => {
                const next = Array.isArray(v) ? v[0] : v;
                updateSelectedImage(next, imgAlign, imgPlace, false);
              }}
              onChangeCommitted={(_, v) => {
                const next = Array.isArray(v) ? v[0] : v;
                updateSelectedImage(next, imgAlign, imgPlace, true);
              }}
              sx={{
                color: palette.toolBtn,
                py: 0.5,
                '& .MuiSlider-thumb': { width: 11, height: 11 },
                '@media (any-pointer: coarse)': {
                  py: 1,
                  '& .MuiSlider-thumb': { width: 22, height: 22 },
                },
              }}
            />
            <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: palette.toolBtn, minWidth: 28 }}>
              {imgWidthPct}%
            </Typography>
          </Box>

          <Tooltip title="Eigene Zeile">
            <IconButton
              size="small"
              aria-label="Eigene Zeile"
              onClick={() => updateSelectedImage(imgWidthPct, imgAlign, 'block', true)}
              sx={{
                ...toolBtnSx,
                width: 22,
                height: 22,
                fontSize: 9,
                fontWeight: 800,
                bgcolor: imgPlace === 'block' ? palette.toolbarBorder : '#fff',
              }}
            >
              ¶
            </IconButton>
          </Tooltip>
          <Tooltip title="Im Text">
            <IconButton
              size="small"
              aria-label="Im Text"
              onClick={() => updateSelectedImage(imgWidthPct, imgAlign, 'inline', true)}
              sx={{
                ...toolBtnSx,
                width: 22,
                height: 22,
                bgcolor: imgPlace === 'inline' ? palette.toolbarBorder : '#fff',
              }}
            >
              <WrapTextIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Links umfließen">
            <IconButton
              size="small"
              aria-label="Links umfließen"
              onClick={() => updateSelectedImage(imgWidthPct, 'left', 'float-left', true)}
              sx={{
                ...toolBtnSx,
                width: 22,
                height: 22,
                fontSize: 10,
                fontWeight: 800,
                bgcolor: imgPlace === 'float-left' ? palette.toolbarBorder : '#fff',
              }}
            >
              ↰
            </IconButton>
          </Tooltip>
          <Tooltip title="Rechts umfließen">
            <IconButton
              size="small"
              aria-label="Rechts umfließen"
              onClick={() => updateSelectedImage(imgWidthPct, 'right', 'float-right', true)}
              sx={{
                ...toolBtnSx,
                width: 22,
                height: 22,
                fontSize: 10,
                fontWeight: 800,
                bgcolor: imgPlace === 'float-right' ? palette.toolbarBorder : '#fff',
              }}
            >
              ↱
            </IconButton>
          </Tooltip>

          {imgPlace === 'block' ? (
            <>
              <Tooltip title="Links">
                <IconButton
                  size="small"
                  aria-label="Bild links"
                  onClick={() => updateSelectedImage(imgWidthPct, 'left', 'block', true)}
                  sx={{
                    ...toolBtnSx,
                    width: 22,
                    height: 22,
                    bgcolor: imgAlign === 'left' ? palette.toolbarBorder : '#fff',
                  }}
                >
                  <FormatAlignLeftIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Mitte">
                <IconButton
                  size="small"
                  aria-label="Bild mittig"
                  onClick={() => updateSelectedImage(imgWidthPct, 'center', 'block', true)}
                  sx={{
                    ...toolBtnSx,
                    width: 22,
                    height: 22,
                    bgcolor: imgAlign === 'center' ? palette.toolbarBorder : '#fff',
                  }}
                >
                  <FormatAlignCenterIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rechts">
                <IconButton
                  size="small"
                  aria-label="Bild rechts"
                  onClick={() => updateSelectedImage(imgWidthPct, 'right', 'block', true)}
                  sx={{
                    ...toolBtnSx,
                    width: 22,
                    height: 22,
                    bgcolor: imgAlign === 'right' ? palette.toolbarBorder : '#fff',
                  }}
                >
                  <FormatAlignRightIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            </>
          ) : null}

          <Tooltip title="Löschen">
            <IconButton
              size="small"
              aria-label="Bild löschen"
              onClick={deleteSelectedImage}
              sx={{
                ...toolBtnSx,
                width: 22,
                height: 22,
                color: '#c62828',
                borderColor: '#ef9a9a',
                '&:hover': { bgcolor: 'rgba(198,40,40,0.08)', borderColor: '#c62828' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : null}

      <Box
        sx={{
          ...(notesSurface && fillParent
            ? { position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
            : {}),
        }}
      >
      <Box
        ref={editorRef}
        contentEditable={textEditing}
        suppressContentEditableWarning
        tabIndex={0}
        role="textbox"
        aria-label={placeholder || 'Text'}
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={(e) => {
          const next = e.relatedTarget as HTMLElement | null;
          if (next?.closest?.('[data-et-format-ui]')) return;
          emitChange();
        }}
        onPointerDown={(e) => {
          if (!notesSurface && isPenPointer(e)) {
            e.preventDefault();
            return;
          }
          if (!isPrimaryPointer(e)) return;
          const t = e.target;
          const img =
            t instanceof HTMLImageElement
              ? t
              : t instanceof Element
                ? (t.closest('img') as HTMLImageElement | null)
                : null;
          if (!img || !editorRef.current?.contains(img)) {
            markSelected(listEditorImages(), null);
            setSelectedImgIndex(null);
            selectedImgIndexRef.current = null;
            setImgHandle(null);
            return;
          }
          const imgs = listEditorImages();
          const idx = imgs.indexOf(img);
          if (idx < 0) return;
          e.preventDefault();
          e.stopPropagation();
          selectImageAt(idx);
          const box = img.getBoundingClientRect();
          const nearCorner =
            e.clientX >= box.right - IMG_CORNER_HIT && e.clientY >= box.bottom - IMG_CORNER_HIT;
          const originX = e.clientX;
          const originY = e.clientY;
          const startPct = readImageWidthPct(img);
          const startW = box.width;
          const editorW = Math.max(80, editorRef.current?.clientWidth || 240);
          let mode: 'pending' | 'resize' | 'move' = nearCorner ? 'resize' : 'pending';
          if (nearCorner) document.body.style.cursor = 'nwse-resize';
          listenWindowPointerDrag(
            e.pointerId,
            (ev) => {
              if (mode === 'pending') {
                if (Math.hypot(ev.clientX - originX, ev.clientY - originY) < 8) return;
                mode = 'move';
                img.style.opacity = '0.4';
                document.body.style.cursor = 'grabbing';
              }
              if (mode === 'resize') {
                const nextPct = clampImageWidthPct(startPct + ((ev.clientX - originX) / editorW) * 100);
                applyImageLayout(img, nextPct, readImageAlign(img), readImagePlace(img));
                setImgWidthPct(nextPct);
                requestAnimationFrame(() => syncImgHandle());
                return;
              }
              if (mode === 'move') {
                img.style.opacity = '0.4';
              }
            },
            (ev) => {
              document.body.style.cursor = '';
              img.style.opacity = '';
              if (mode === 'resize') {
                emitChange();
                refreshImageUi(idx);
                return;
              }
              if (mode === 'move' && editorRef.current) {
                moveEtImageToPoint(img, editorRef.current, ev.clientX, ev.clientY);
                emitChange();
                const nextImgs = listEditorImages();
                refreshImageUi(Math.max(0, nextImgs.indexOf(img)));
              }
            },
          );
        }}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          const imageFiles: File[] = [];
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) imageFiles.push(file);
            }
          }
          if (imageFiles.length === 0) return;
          e.preventDefault();
          void ingestImageFiles(imageFiles);
        }}
        sx={{
          minHeight: fillParent ? 0 : minHeight,
          flex: fillParent ? 1 : undefined,
          overflow: fillParent ? 'auto' : undefined,
          px: notesSurface ? 1.25 : 0.75,
          py: notesSurface ? 1 : 0.45,
          fontSize: editorFontSize ?? (notesSurface ? '1.05rem' : '0.78rem'),
          lineHeight: notesSurface ? 1.5 : 1.35,
          color: palette.text,
          outline: 'none',
          cursor: textEditing ? 'text' : 'default',
          position: notesSurface ? 'absolute' : 'relative',
          ...(notesSurface ? { inset: 0, zIndex: 1 } : {}),
          userSelect: textEditing ? 'text' : 'none',
          WebkitUserSelect: textEditing ? 'text' : 'none',
          pointerEvents: textEditing ? 'auto' : 'none',
          touchAction: textEditing ? 'pan-y' : 'none',
          ...(notesSurface
            ? {
                bgcolor: '#fff',
                border: '1px solid',
                borderColor: palette.border,
                borderRadius: 1,
              }
            : {}),
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: palette.toolBtnBorder,
            pointerEvents: 'none',
          },
          '& p': { m: 0 },
          '& b, & strong': { fontWeight: 800 },
          '& i, & em': { fontStyle: 'italic' },
          '& u': { textDecoration: 'underline' },
          '& img': {
            maxWidth: '100% !important',
            height: 'auto !important',
            borderRadius: 0.5,
            cursor: 'grab',
            outlineOffset: 2,
            boxSizing: 'border-box',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          },
          '& img[data-et-place="block"]': {
            marginTop: '6px',
            marginBottom: '6px',
          },
          '&::after': {
            content: '""',
            display: 'table',
            clear: 'both',
          },
          '& img[data-selected="1"]': {
            outline: `3px solid ${palette.borderFocus}`,
            boxShadow: `0 0 0 3px ${palette.shadow}`,
          },
          ...(dragOver
            ? {
                '&:before': {
                  content: '"Bild hier ablegen"',
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(232,245,233,0.88)',
                  color: '#2e7d32',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  pointerEvents: 'none',
                  zIndex: 2,
                },
              }
            : null),
        }}
      />
      {overlay}
      </Box>

      {imgHandle && selectedImgIndex != null ? (
        <Box
          aria-label="Bildgröße ändern"
          onPointerDown={(e) => {
            if (!isPrimaryPointer(e)) return;
            e.preventDefault();
            e.stopPropagation();
            const img = listEditorImages()[selectedImgIndex];
            if (!img) return;
            const startPct = readImageWidthPct(img);
            const originX = e.clientX;
            const editorW = Math.max(80, editorRef.current?.clientWidth || 240);
            document.body.style.cursor = 'nwse-resize';
            listenWindowPointerDrag(
              e.pointerId,
              (ev) => {
                const nextPct = clampImageWidthPct(startPct + ((ev.clientX - originX) / editorW) * 100);
                applyImageLayout(img, nextPct, readImageAlign(img), readImagePlace(img));
                setImgWidthPct(nextPct);
                requestAnimationFrame(() => syncImgHandle());
              },
              () => {
                document.body.style.cursor = '';
                emitChange();
                refreshImageUi(selectedImgIndex);
              },
            );
          }}
          sx={{
            position: 'absolute',
            left: imgHandle.left,
            top: imgHandle.top,
            width: 28,
            height: 28,
            bgcolor: palette.borderFocus,
            border: '2px solid #fff',
            borderRadius: '4px',
            cursor: 'nwse-resize',
            zIndex: 5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            touchAction: 'none',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        />
      ) : null}

      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box
          data-et-format-ui=""
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 0.75, maxWidth: 160 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {TEXT_COLORS.map((c) => (
            <Box
              key={c}
              onMouseDown={(e) => {
                e.preventDefault();
                stashEditorSelection(editorRef.current);
              }}
              onClick={() => {
                runCommand('foreColor', c);
                setColorAnchor(null);
              }}
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: c,
                border: '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>
      </Popover>

      <Popover
        open={Boolean(highlightAnchor)}
        anchorEl={highlightAnchor}
        onClose={() => setHighlightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box
          data-et-format-ui=""
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 0.75, maxWidth: 160 }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <Box
              key={c}
              onMouseDown={(e) => {
                e.preventDefault();
                stashEditorSelection(editorRef.current);
              }}
              onClick={() => {
                if (c === 'transparent') {
                  runCommand('removeFormat');
                } else {
                  runCommand('hiliteColor', c);
                  runCommand('backColor', c);
                }
                setHighlightAnchor(null);
              }}
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: c === 'transparent' ? '#fff' : c,
                border: '1px solid rgba(0,0,0,0.25)',
                cursor: 'pointer',
                position: 'relative',
                ...(c === 'transparent'
                  ? {
                      '&::after': {
                        content: '"/"',
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#c62828',
                        fontWeight: 800,
                        fontSize: 12,
                      },
                    }
                  : null),
              }}
            />
          ))}
        </Box>
      </Popover>
    </Box>
  );
}

export const EntryTicketRichField = React.memo(EntryTicketRichFieldInner);
