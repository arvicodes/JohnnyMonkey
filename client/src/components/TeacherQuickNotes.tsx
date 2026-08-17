import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TitleIcon from '@mui/icons-material/Title';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import AddIcon from '@mui/icons-material/Add';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { DialogCloseIconButton } from './ui/dialog-close-icon-button';
import { handlePresentationListShortcutKey, handlePresentationTabKey } from '../lib/presentationRichText';
import { apiGetSafe, apiPutSafe, apiPutSafeAwait } from '../lib/api';
import type { EmojiClickData } from 'emoji-picker-react';
import { EmojiStyle } from 'emoji-picker-react';

const EmojiPicker = React.lazy(() => import('emoji-picker-react'));

type InkPoint = { x: number; y: number };
type InkStroke = { points: InkPoint[]; color: string; width: number };
type NotesMode = 'text' | 'pen' | 'eraser';

type ScratchPage = {
  title: string;
  text: string;
  ink: InkStroke[];
};

type BookSnap = { pages: ScratchPage[]; pageIndex: number };

type ScratchPadData = {
  pages: ScratchPage[];
  pageIndex: number;
  updatedAt: string;
};

const ERASER_RADIUS = 16;
const MAX_HISTORY = 40;
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_CHARS = 900_000;
const STORAGE_PREFIX = 'teacher-scratch-pad:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId || 'anonymous'}`;
}

function prevStorageKey(userId: string) {
  return `${storageKey(userId)}:prev`;
}

function emptyPage(title = 'Notiz 1'): ScratchPage {
  return { title, text: '', ink: [] };
}

function nextNoteTitle(pages: ScratchPage[]): string {
  const used = new Set(pages.map((p) => (p.title || '').trim().toLowerCase()));
  let n = pages.length + 1;
  while (used.has(`notiz ${n}`)) n += 1;
  return `Notiz ${n}`;
}

function pageTitle(page: ScratchPage | undefined, index: number): string {
  const t = (page?.title || '').trim();
  return t || `Notiz ${index + 1}`;
}

function cloneBook(pages: ScratchPage[], pageIndex: number): BookSnap {
  return {
    pageIndex,
    pages: pages.map((p) => ({
      title: p.title,
      text: p.text,
      ink: p.ink.map((s) => ({
        color: s.color,
        width: s.width,
        points: s.points.map((pt) => ({ x: pt.x, y: pt.y })),
      })),
    })),
  };
}

function booksEqual(a: BookSnap, b: BookSnap): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function strokeHitsPoint(stroke: InkStroke, pt: InkPoint, radius: number): boolean {
  const r2 = radius * radius;
  for (const p of stroke.points) {
    const dx = p.x - pt.x;
    const dy = p.y - pt.y;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
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
    const preferPng = /png|gif|webp/i.test(file.type);
    let dataUrl = canvas.toDataURL(preferPng ? 'image/png' : 'image/jpeg', 0.82);
    if (dataUrl.length > MAX_IMAGE_CHARS) dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    if (dataUrl.length > MAX_IMAGE_CHARS) dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    return dataUrl;
  } catch {
    return null;
  }
}

function insertImageHtmlAtCursor(editor: HTMLElement | null, src: string, alt = 'Bild'): boolean {
  if (!editor || !src.trim()) return false;
  editor.focus();

  // span + inline-block: Wrap schrumpft auf Bildbreite (Handle bleibt am Bild)
  const wrap = document.createElement('span');
  wrap.className = 'notes-image-wrap';
  wrap.setAttribute('contenteditable', 'false');
  wrap.setAttribute('data-notes-img-wrap', '1');
  wrap.style.cssText =
    'position:relative;display:inline-block;width:fit-content;max-width:100%;vertical-align:middle;line-height:0;margin:0.55em 0.35em 0.55em 0;';

  const img = document.createElement('img');
  img.setAttribute('data-notes-img', '1');
  img.setAttribute('draggable', 'false');
  img.src = src;
  img.alt = alt;
  img.style.cssText =
    'max-width:100%;width:auto;height:auto;display:block;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.12);';
  wrap.appendChild(img);

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(wrap);
    // Absatz nach dem Bild, damit weitergetippt werden kann
    const after = document.createElement('div');
    after.innerHTML = '<br>';
    range.setStartAfter(wrap);
    range.insertNode(after);
    range.setStart(after, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(wrap);
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Resize-Handles und Hilfs-UI vor dem Speichern entfernen. */
function serializeNotesHtml(editor: HTMLElement | null): string {
  if (!editor) return '';
  const clone = editor.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.notes-resize-handle').forEach((n) => n.remove());
  clone.querySelectorAll('.notes-image-wrap').forEach((wrap) => {
    const el = wrap as HTMLElement;
    el.style.outline = '';
    el.style.width = '';
    el.classList.remove('notes-image-selected');
    el.removeAttribute('data-notes-resize');
  });
  return clone.innerHTML;
}

/** Wrap eng um das Bild legen, damit absolute Handles am Bildrand sitzen. */
function syncNotesImageWrapSize(img: HTMLImageElement, wrap: HTMLElement, forcedWidth?: number) {
  const w = forcedWidth ?? img.offsetWidth ?? img.naturalWidth;
  if (w > 0) {
    wrap.style.width = `${w}px`;
    wrap.style.maxWidth = '100%';
  }
  wrap.style.display = 'inline-block';
  wrap.style.verticalAlign = 'middle';
  wrap.style.lineHeight = '0';
}

/** Bildgröße setzen — ohne CSS-max-width-Deckel, sonst geht Vergrößern nicht. */
function applyNotesImageSize(img: HTMLImageElement, wrap: HTMLElement, widthPx: number, ratio: number) {
  const w = Math.max(48, Math.round(widthPx));
  const h = Math.max(24, Math.round(w / Math.max(0.05, ratio)));
  img.style.setProperty('width', `${w}px`, 'important');
  img.style.setProperty('height', `${h}px`, 'important');
  img.style.setProperty('max-width', 'none', 'important');
  img.style.setProperty('max-height', 'none', 'important');
  syncNotesImageWrapSize(img, wrap, w);
}

function ensureNotesImageWrap(img: HTMLImageElement): HTMLElement {
  const parent = img.parentElement;
  if (parent?.classList.contains('notes-image-wrap')) {
    // Alte volle Breite / div-Wraps auf eng passenden span bringen
    if (parent.tagName !== 'SPAN') {
      const span = document.createElement('span');
      span.className = 'notes-image-wrap';
      Array.from(parent.attributes).forEach((a) => {
        if (a.name === 'class') return;
        span.setAttribute(a.name, a.value);
      });
      span.setAttribute('contenteditable', 'false');
      span.setAttribute('data-notes-img-wrap', '1');
      span.style.cssText =
        'position:relative;display:inline-block;width:fit-content;max-width:100%;vertical-align:middle;line-height:0;margin:0.55em 0.35em 0.55em 0;';
      parent.parentNode?.insertBefore(span, parent);
      while (parent.firstChild) span.appendChild(parent.firstChild);
      parent.remove();
      syncNotesImageWrapSize(img, span);
      return span;
    }
    parent.style.display = 'inline-block';
    parent.style.width = parent.style.width || 'fit-content';
    parent.style.maxWidth = '100%';
    syncNotesImageWrapSize(img, parent);
    return parent;
  }
  const wrap = document.createElement('span');
  wrap.className = 'notes-image-wrap';
  wrap.setAttribute('contenteditable', 'false');
  wrap.setAttribute('data-notes-img-wrap', '1');
  wrap.style.cssText =
    'position:relative;display:inline-block;width:fit-content;max-width:100%;vertical-align:middle;line-height:0;margin:0.55em 0.35em 0.55em 0;';
  parent?.insertBefore(wrap, img);
  wrap.appendChild(img);
  img.setAttribute('data-notes-img', '1');
  img.setAttribute('draggable', 'false');
  if (!img.style.maxWidth) img.style.maxWidth = '100%';
  if (!img.style.height || img.style.height === 'auto') img.style.height = 'auto';
  img.style.display = 'block';
  img.style.borderRadius = img.style.borderRadius || '6px';
  syncNotesImageWrapSize(img, wrap);
  return wrap;
}

function makeNotesImageResizable(
  img: HTMLImageElement,
  onChange: () => void,
  editorRoot?: HTMLElement | null,
) {
  const wrap = ensureNotesImageWrap(img);
  wrap.setAttribute('contenteditable', 'false');
  wrap.setAttribute('data-notes-resize', '1');
  syncNotesImageWrapSize(img, wrap);

  const placeHandle = () => {
    syncNotesImageWrapSize(img, wrap);
  };
  if (!img.complete) {
    img.addEventListener('load', placeHandle, { once: true });
  } else {
    placeHandle();
  }

  let handle = wrap.querySelector('.notes-resize-handle') as HTMLElement | null;
  if (!handle) {
    handle = document.createElement('span');
    handle.className = 'notes-resize-handle';
    handle.setAttribute('contenteditable', 'false');
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', 'Bildgröße ändern');
    handle.title = 'Ziehen zum Größenändern';
    wrap.appendChild(handle);
  }

  const grip = handle;

  // Kompakt an der unteren rechten Bildecke
  grip.style.cssText = `
    position:absolute;bottom:1px;right:1px;width:16px;height:16px;
    background:#f57f17;border:2px solid #fff;border-radius:3px;
    cursor:nwse-resize;z-index:20;opacity:1;
    box-shadow:0 1px 3px rgba(0,0,0,.35);pointer-events:auto;
    display:block;box-sizing:border-box;
  `;

  if (grip.getAttribute('data-notes-resize-bound') === '1') return;
  grip.setAttribute('data-notes-resize-bound', '1');

  let resizing = false;
  let startX = 0;
  let startW = 0;
  let ratio = 1;

  const selectWrap = () => {
    wrap.ownerDocument?.querySelectorAll('.notes-image-wrap.notes-image-selected').forEach((el) => {
      el.classList.remove('notes-image-selected');
      (el as HTMLElement).style.outline = '';
    });
    wrap.classList.add('notes-image-selected');
    wrap.style.outline = '2px solid #f57f17';
    wrap.style.outlineOffset = '2px';
  };

  /** Wichtig: nicht wrap.closest('[contenteditable]') — das trifft den Wrap selbst (false). */
  const editorMaxWidth = () => {
    let editor: HTMLElement | null = editorRoot ?? null;
    if (!editor || !editor.contains(wrap)) {
      let el: HTMLElement | null = wrap.parentElement;
      while (el) {
        if (el.isContentEditable) {
          editor = el;
          break;
        }
        el = el.parentElement;
      }
    }
    const pad = 32;
    return Math.max(160, (editor?.clientWidth ?? 900) - pad);
  };

  const onMove = (e: PointerEvent) => {
    if (!resizing) return;
    e.preventDefault();
    const nextW = Math.max(48, Math.min(editorMaxWidth(), startW + (e.clientX - startX)));
    applyNotesImageSize(img, wrap, nextW, ratio);
  };

  const onUp = (e: PointerEvent) => {
    if (!resizing) return;
    resizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    try {
      if (grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Explizite Zielbreite behalten (nicht offsetWidth — der kann kurz hinterherhinken)
    const styledW = parseFloat(img.style.width || '');
    const w = (Number.isFinite(styledW) && styledW > 0 ? styledW : 0) || img.offsetWidth || startW;
    applyNotesImageSize(img, wrap, w, ratio);
    onChange();
  };

  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectWrap();
    resizing = true;
    startX = e.clientX;
    const styledW = parseFloat(img.style.width || '');
    const w =
      (Number.isFinite(styledW) && styledW > 0 ? styledW : 0) ||
      img.offsetWidth ||
      img.naturalWidth ||
      200;
    const h = img.offsetHeight || img.naturalHeight || 1;
    startW = w;
    ratio = w / Math.max(1, h);
    img.style.setProperty('max-width', 'none', 'important');
    img.style.setProperty('max-height', 'none', 'important');
    wrap.style.maxWidth = '100%';
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  wrap.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWrap();
  });
}

function enhanceNotesImages(
  editor: HTMLElement | null,
  onChange: () => void,
) {
  if (!editor) return;
  editor.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement;
    if (!img.getAttribute('src')) return;
    makeNotesImageResizable(img, onChange, editor);
  });
}

function insertTextAtCursor(editor: HTMLElement | null, text: string): boolean {
  if (!editor || !text) return false;
  editor.focus();
  try {
    const ok = document.execCommand('insertText', false, text);
    if (ok) {
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
  } catch {
    /* fallback below */
  }
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  editor.appendChild(document.createTextNode(text));
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
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
    pages = parsed.pages.map((p, i) => ({
      title:
        typeof (p as ScratchPage)?.title === 'string' && String((p as ScratchPage).title).trim()
          ? String((p as ScratchPage).title).trim()
          : `Notiz ${i + 1}`,
      text: typeof p?.text === 'string' ? p.text : '',
      ink: Array.isArray(p?.ink) ? (p.ink as InkStroke[]) : [],
    }));
  } else if (typeof parsed.text === 'string' || Array.isArray(parsed.ink)) {
    // Legacy: eine Seite
    pages = [
      {
        title: 'Notiz 1',
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

function padHasContent(data: ScratchPadData): boolean {
  return data.pages.some((p) => stripHtml(p.text).length > 0 || p.ink.length > 0);
}

function padUpdatedMs(data: ScratchPadData | null | undefined): number {
  if (!data?.updatedAt) return 0;
  const t = Date.parse(data.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/** Neueren Stand wählen (Server vs. localStorage). */
function pickNewerPad(a: ScratchPadData, b: ScratchPadData | null): ScratchPadData {
  if (!b) return a;
  const aMs = padUpdatedMs(a);
  const bMs = padUpdatedMs(b);
  if (bMs > aMs) return b;
  if (aMs > bMs) return a;
  // Gleicher Zeitstempel: den mit mehr Inhalt bevorzugen
  if (padHasContent(b) && !padHasContent(a)) return b;
  return a;
}

const serverSyncTimers = new Map<string, number>();

function pushPadToServer(userId: string, data: ScratchPadData, immediate = false) {
  const send = () => {
    serverSyncTimers.delete(userId);
    apiPutSafe('/api/teacher-scratch-pad', {
      pages: data.pages,
      pageIndex: data.pageIndex,
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  };
  const prev = serverSyncTimers.get(userId);
  if (prev != null) window.clearTimeout(prev);
  if (immediate) {
    send();
    return;
  }
  serverSyncTimers.set(userId, window.setTimeout(send, 900));
}

async function flushPadToServer(userId: string, data: ScratchPadData) {
  const prev = serverSyncTimers.get(userId);
  if (prev != null) {
    window.clearTimeout(prev);
    serverSyncTimers.delete(userId);
  }
  await apiPutSafeAwait('/api/teacher-scratch-pad', {
    pages: data.pages,
    pageIndex: data.pageIndex,
    updatedAt: data.updatedAt || new Date().toISOString(),
  });
}

async function fetchPadFromServer(): Promise<ScratchPadData | null> {
  try {
    const res = await apiGetSafe('/api/teacher-scratch-pad');
    if (!res || !res.ok) return null;
    const json = (await res.json()) as { found?: boolean; pad?: unknown };
    if (!json?.found || !json.pad) return null;
    return normalizePad(json.pad);
  } catch {
    return null;
  }
}

function savePad(userId: string, data: ScratchPadData, opts?: { syncServer?: boolean; immediateServer?: boolean }) {
  const payload: ScratchPadData = {
    ...data,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
  try {
    const key = storageKey(userId);
    const prevRaw = localStorage.getItem(key);
    if (prevRaw) {
      try {
        const old = normalizePad(JSON.parse(prevRaw));
        // Nur nicht-leere Stände als Backup merken (Schutz vor versehentlichem Löschen)
        if (padHasContent(old)) {
          localStorage.setItem(prevStorageKey(userId), prevRaw);
        }
      } catch {
        /* ignore backup failure */
      }
    }
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Lehrer-Notizen: localStorage speichern fehlgeschlagen', e);
  }
  if (opts?.syncServer !== false) {
    pushPadToServer(userId, payload, !!opts?.immediateServer);
  }
  return payload;
}

function loadPrevPad(userId: string): ScratchPadData | null {
  try {
    const raw = localStorage.getItem(prevStorageKey(userId));
    if (!raw) return null;
    return normalizePad(JSON.parse(raw));
  } catch {
    return null;
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

/** Stufen für A− / A+ in den Notizen. */
const NOTE_FONT_SIZE_STEPS = [12, 14, 16, 18, 20, 24, 28, 36, 48] as const;
const NOTE_DEFAULT_FONT_PX = 18;

function nearestFontSizeStep(px: number): number {
  let best: number = NOTE_FONT_SIZE_STEPS[0];
  let bestDist = Math.abs(px - best);
  for (const step of NOTE_FONT_SIZE_STEPS) {
    const d = Math.abs(px - step);
    if (d < bestDist) {
      best = step;
      bestDist = d;
    }
  }
  return best;
}

function readSelectionFontSizePx(editor: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return NOTE_DEFAULT_FONT_PX;
  let node: Node | null = sel.focusNode;
  if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  if (!(node instanceof Element) || !editor.contains(node)) return NOTE_DEFAULT_FONT_PX;
  const raw = window.getComputedStyle(node).fontSize;
  const px = parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : NOTE_DEFAULT_FONT_PX;
}

/** Schriftgröße auf Auswahl (oder ab Cursor für Weiterschreiben). */
function applyNotesFontSize(editor: HTMLElement | null, sizePx: number): boolean {
  if (!editor) return false;
  const size = `${Math.round(sizePx)}px`;
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  try {
    if (!range.collapsed) {
      const fragment = range.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = size;
      span.appendChild(fragment);
      range.insertNode(span);
      sel.removeAllRanges();
      const after = document.createRange();
      after.selectNodeContents(span);
      after.collapse(false);
      sel.addRange(after);
    } else {
      const span = document.createElement('span');
      span.style.fontSize = size;
      span.appendChild(document.createTextNode('\u200b'));
      range.insertNode(span);
      sel.removeAllRanges();
      const inside = document.createRange();
      inside.setStart(span.firstChild || span, span.firstChild ? 1 : 0);
      inside.collapse(true);
      sel.addRange(inside);
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

type TeacherQuickNotesProps = {
  userId: string;
  /** N-Button fest am Bildschirm — für globale Nutzung außerhalb des Dashboards */
  floating?: boolean;
};

export const OPEN_TEACHER_NOTES_EVENT = 'johnny:open-teacher-notes';

/**
 * Gelbes N in der Lehrer-Leiste: persönliche Notizfläche (Tastatur + Stift + Formatierung).
 * Speichert in localStorage + Server-Datei; Sicherheitskopien unter Notizen-Sicherheitskopien/.
 */
export default function TeacherQuickNotes({ userId, floating = false }: TeacherQuickNotesProps) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const [mode, setMode] = useState<NotesMode>('text');
  const [pages, setPages] = useState<ScratchPage[]>([emptyPage()]);
  const [pageIndex, setPageIndex] = useState(0);
  const [text, setText] = useState('');
  const [ink, setInk] = useState<InkStroke[]>([]);
  const [color, setColor] = useState<string>(NOTE_COLORS[0].value);
  const [hoverPreview, setHoverPreview] = useState<ScratchPadData | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const emojiAnchorRef = useRef<HTMLButtonElement | null>(null);
  const emojiCaretRef = useRef<Range | null>(null);
  const tabClickTimerRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<InkStroke | null>(null);
  const pagesRef = useRef<ScratchPage[]>([emptyPage()]);
  const pageIndexRef = useRef(0);
  const modeRef = useRef<NotesMode>('text');
  const inkRef = useRef<InkStroke[]>([]);
  const textRef = useRef('');
  const skipEditorSyncRef = useRef(false);
  const historyRef = useRef<BookSnap[]>([]);
  const redoRef = useRef<BookSnap[]>([]);
  const textHistoryTimerRef = useRef<number | null>(null);
  const textBurstArmedRef = useRef(true);
  const erasingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

  const bumpHistoryUi = useCallback(() => {
    setHistoryTick((n) => n + 1);
  }, []);

  const captureSnapshot = useCallback((): BookSnap => {
    const html = serializeNotesHtml(editorRef.current) || textRef.current;
    const pagesNow = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: html, ink: inkRef.current } : p
    );
    return cloneBook(pagesNow, pageIndexRef.current);
  }, []);

  const pushHistorySnapshot = useCallback(() => {
    const snap = captureSnapshot();
    const last = historyRef.current[historyRef.current.length - 1];
    if (last && booksEqual(last, snap)) return;
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    redoRef.current = [];
    bumpHistoryUi();
  }, [bumpHistoryUi, captureSnapshot]);

  const scheduleTextHistory = useCallback(() => {
    if (textHistoryTimerRef.current != null) {
      window.clearTimeout(textHistoryTimerRef.current);
    }
    textHistoryTimerRef.current = window.setTimeout(() => {
      textHistoryTimerRef.current = null;
      textBurstArmedRef.current = true;
    }, 600);
  }, []);

  const onBeforeEditorInput = useCallback(() => {
    if (textBurstArmedRef.current) {
      pushHistorySnapshot();
      textBurstArmedRef.current = false;
    }
    scheduleTextHistory();
  }, [pushHistorySnapshot, scheduleTextHistory]);

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
    const html = serializeNotesHtml(editorRef.current) || textRef.current;
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: html, ink: inkRef.current } : p
    );
    pagesRef.current = nextPages;
    textRef.current = html;
    setPages(nextPages);
    setText(html);
    return nextPages;
  }, []);

  const syncEditorToStateRef = useRef<(() => void) | null>(null);

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
        enhanceNotesImages(editorRef.current, () => {
          syncEditorToStateRef.current?.();
        });
        if (focusEditor && modeRef.current === 'text') editorRef.current.focus();
      }
    });
  }, []);

  const applySnapshot = useCallback(
    (snap: BookSnap) => {
      showPage(snap.pages, snap.pageIndex, modeRef.current === 'text');
      persistBook(snap.pages, snap.pageIndex);
      bumpHistoryUi();
    },
    [bumpHistoryUi, persistBook, showPage]
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) {
      try {
        document.execCommand('undo');
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
      } catch {
        /* ignore */
      }
      return;
    }
    if (textHistoryTimerRef.current != null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    const current = captureSnapshot();
    const prev = historyRef.current.pop()!;
    redoRef.current.push(current);
    applySnapshot(prev);
  }, [applySnapshot, captureSnapshot, persistBook]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) {
      try {
        document.execCommand('redo');
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
      } catch {
        /* ignore */
      }
      return;
    }
    if (textHistoryTimerRef.current != null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    const current = captureSnapshot();
    const next = redoRef.current.pop()!;
    historyRef.current.push(current);
    applySnapshot(next);
  }, [applySnapshot, captureSnapshot, persistBook]);

  const openModal = useCallback(() => {
    const local = loadPad(userId);
    const prev = loadPrevPad(userId);
    historyRef.current = [];
    redoRef.current = [];
    textBurstArmedRef.current = true;
    if (prev) {
      const prevSnap = cloneBook(prev.pages, prev.pageIndex);
      const curSnap = cloneBook(local.pages, local.pageIndex);
      if (!booksEqual(prevSnap, curSnap)) {
        historyRef.current = [prevSnap];
      }
    }
    modeRef.current = 'text';
    setMode('text');
    openRef.current = true;
    setOpen(true);
    bumpHistoryUi();
    window.requestAnimationFrame(() => {
      showPage(local.pages, local.pageIndex, true);
    });

    // Server-Stand nachladen und mit localStorage zusammenführen
    void (async () => {
      const remote = await fetchPadFromServer();
      const merged = pickNewerPad(local, remote);
      savePad(userId, merged, { immediateServer: true });
      if (!openRef.current) return;
      if (
        padUpdatedMs(merged) > padUpdatedMs(local) ||
        (padHasContent(merged) && !padHasContent(local))
      ) {
        showPage(merged.pages, merged.pageIndex, modeRef.current === 'text');
        bumpHistoryUi();
      }
    })();
  }, [bumpHistoryUi, showPage, userId]);

  const closeModal = useCallback(() => {
    if (textHistoryTimerRef.current != null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    const nextPages = flushCurrentPage();
    const payload = savePad(
      userId,
      {
        pages: nextPages,
        pageIndex: pageIndexRef.current,
        updatedAt: new Date().toISOString(),
      },
      { immediateServer: true }
    );
    void flushPadToServer(userId, payload);
    openRef.current = false;
    setOpen(false);
  }, [flushCurrentPage, userId]);

  /** Beim Start: Ordner anlegen lassen + ggf. Server-Stand holen. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await fetchPadFromServer();
      if (cancelled) return;
      const local = loadPad(userId);
      const merged = pickNewerPad(local, remote);
      if (
        padUpdatedMs(merged) > padUpdatedMs(local) ||
        (padHasContent(merged) && !padHasContent(local))
      ) {
        savePad(userId, merged, { syncServer: false });
      } else if (padHasContent(local) || padUpdatedMs(local) > 0) {
        // lokalen Stand serverseitig absichern (Ordner + latest)
        pushPadToServer(userId, local, true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Tab wechseln / Fenster schließen: sofort speichern + Server-Backup. */
  useEffect(() => {
    if (!open) return;
    const flushNow = () => {
      const html = serializeNotesHtml(editorRef.current) || textRef.current;
      const nextPages = pagesRef.current.map((p, i) =>
        i === pageIndexRef.current ? { ...p, text: html, ink: inkRef.current } : p
      );
      pagesRef.current = nextPages;
      const payload = savePad(
        userId,
        {
          pages: nextPages,
          pageIndex: pageIndexRef.current,
          updatedAt: new Date().toISOString(),
        },
        { immediateServer: true }
      );
      void flushPadToServer(userId, payload);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', flushNow);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      window.removeEventListener('beforeunload', flushNow);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [open, userId]);

  /** Tastenkürzel „n“ öffnet die Notizen (nicht während Texteingabe). */
  useEffect(() => {
    if (open) return;
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      if (target.closest('[contenteditable="true"]')) return true;
      if (target.closest('[role="textbox"]')) return true;
      return false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'n' && e.key !== 'N') return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      openModal();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, openModal]);

  /** Dashboard-Header & Co. können dieselbe Instanz öffnen. */
  useEffect(() => {
    const onOpen = () => openModal();
    window.addEventListener(OPEN_TEACHER_NOTES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TEACHER_NOTES_EVENT, onOpen);
  }, [openModal]);

  const refreshHoverPreview = useCallback(() => {
    setHoverPreview(loadPad(userId));
  }, [userId]);

  const syncEditorToState = useCallback(() => {
    const html = serializeNotesHtml(editorRef.current);
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

  useEffect(() => {
    syncEditorToStateRef.current = syncEditorToState;
  }, [syncEditorToState]);

  const runFormat = (cmd: FmtCmd, value?: string) => {
    if (mode !== 'text') setMode('text');
    pushHistorySnapshot();
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
    if (mode === 'eraser') {
      setMode('pen');
      return;
    }
    if (mode === 'pen') return;
    runFormat('foreColor', next);
  };

  const bumpFontSize = (direction: -1 | 1) => {
    if (mode !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    const editor = editorRef.current;
    if (!editor) return;
    pushHistorySnapshot();
    editor.focus({ preventScroll: true });
    const current = nearestFontSizeStep(readSelectionFontSizePx(editor));
    const idx = NOTE_FONT_SIZE_STEPS.findIndex((s) => s === current);
    const safeIdx = idx >= 0 ? idx : NOTE_FONT_SIZE_STEPS.findIndex((s) => s === NOTE_DEFAULT_FONT_PX);
    const nextIdx = Math.max(0, Math.min(NOTE_FONT_SIZE_STEPS.length - 1, (safeIdx >= 0 ? safeIdx : 3) + direction));
    const nextPx = NOTE_FONT_SIZE_STEPS[nextIdx] ?? NOTE_DEFAULT_FONT_PX;
    if (applyNotesFontSize(editor, nextPx)) {
      syncEditorToState();
    }
  };

  const insertImagesFromFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (list.length === 0) return;
      if (modeRef.current !== 'text') {
        modeRef.current = 'text';
        setMode('text');
      }
      for (const file of list) {
        const dataUrl = await fileToCompressedDataUrl(file);
        if (!dataUrl) continue;
        pushHistorySnapshot();
        insertImageHtmlAtCursor(editorRef.current, dataUrl, file.name || 'Bild');
        enhanceNotesImages(editorRef.current, () => {
          syncEditorToStateRef.current?.();
        });
        syncEditorToState();
      }
    },
    [pushHistorySnapshot, syncEditorToState]
  );

  const saveEmojiCaret = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      emojiCaretRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const insertEmoji = (emoji: string) => {
    if (modeRef.current !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = emojiCaretRef.current;
    if (range && editor.contains(range.startContainer)) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    pushHistorySnapshot();
    insertTextAtCursor(editor, emoji);
    syncEditorToState();
    setEmojiOpen(false);
    window.requestAnimationFrame(() => editor.focus());
  };

  const onPickImages = () => {
    if (mode !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      imageInputRef.current?.click();
    });
  };

  const onEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((it) => it.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    void insertImagesFromFiles(files);
  };

  const onEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    void insertImagesFromFiles(files);
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
    if (serializeNotesHtml(editorRef.current) !== text) {
      editorRef.current.innerHTML = text || '';
      enhanceNotesImages(editorRef.current, () => {
        syncEditorToStateRef.current?.();
      });
    }
  }, [open, text, pageIndex]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): InkPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'pen' && mode !== 'eraser' && e.pointerType !== 'pen') return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = pointFromEvent(e);
    if (mode === 'eraser') {
      erasingRef.current = true;
      pushHistorySnapshot();
      eraseAt(pt);
      return;
    }
    erasingRef.current = false;
    const stroke: InkStroke = {
      points: [pt],
      color,
      width: e.pointerType === 'pen' ? Math.max(1.5, Math.min(4, (e.pressure || 0.5) * 4)) : 2.25,
    };
    currentStrokeRef.current = stroke;
  };

  const eraseAt = (pt: InkPoint) => {
    const next = inkRef.current.filter((s) => !strokeHitsPoint(s, pt, ERASER_RADIUS));
    if (next.length === inkRef.current.length) return;
    inkRef.current = next;
    setInk(next);
    const nextPages = pagesRef.current.map((p, i) =>
      i === pageIndexRef.current ? { ...p, text: textRef.current, ink: next } : p
    );
    pagesRef.current = nextPages;
    setPages(nextPages);
    persistBook(nextPages, pageIndexRef.current);
    redrawCanvas();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const pt = pointFromEvent(e);
    if (erasingRef.current || mode === 'eraser') {
      eraseAt(pt);
      return;
    }
    if (!currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(pt);
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
    if (erasingRef.current || mode === 'eraser') {
      erasingRef.current = false;
      currentStrokeRef.current = null;
      return;
    }
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (!stroke || stroke.points.length < 2) return;
    pushHistorySnapshot();
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

  const clearInk = () => {
    pushHistorySnapshot();
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
    setRenamingIndex(null);
    pushHistorySnapshot();
    const nextPages = flushCurrentPage();
    persistBook(nextPages, index);
    showPage(nextPages, index);
  }, [flushCurrentPage, persistBook, pushHistorySnapshot, showPage]);

  const addPage = () => {
    pushHistorySnapshot();
    const flushed = flushCurrentPage();
    const nextPages = [...flushed, emptyPage(nextNoteTitle(flushed))];
    const nextIndex = nextPages.length - 1;
    persistBook(nextPages, nextIndex);
    showPage(nextPages, nextIndex);
    setRenamingIndex(nextIndex);
    setRenameDraft(nextPages[nextIndex].title);
  };

  const removePageAt = (index: number) => {
    if (pagesRef.current.length <= 1) return;
    pushHistorySnapshot();
    const flushed = flushCurrentPage();
    const nextPages = flushed.filter((_, i) => i !== index);
    const nextIndex = Math.min(
      index < pageIndexRef.current ? pageIndexRef.current - 1 : pageIndexRef.current,
      nextPages.length - 1
    );
    const safeIndex = Math.max(0, Math.min(nextIndex, nextPages.length - 1));
    persistBook(nextPages, safeIndex);
    setRenamingIndex(null);
    showPage(nextPages, safeIndex);
  };

  const startRename = (index: number) => {
    if (tabClickTimerRef.current != null) {
      window.clearTimeout(tabClickTimerRef.current);
      tabClickTimerRef.current = null;
    }
    setRenamingIndex(index);
    setRenameDraft(pageTitle(pagesRef.current[index], index));
  };

  const commitRename = () => {
    if (renamingIndex == null) return;
    const idx = renamingIndex;
    const nextTitle = renameDraft.trim() || pageTitle(pagesRef.current[idx], idx);
    pushHistorySnapshot();
    const flushed = flushCurrentPage();
    const nextPages = flushed.map((p, i) => (i === idx ? { ...p, title: nextTitle } : p));
    pagesRef.current = nextPages;
    setPages(nextPages);
    persistBook(nextPages, pageIndexRef.current);
    setRenamingIndex(null);
  };

  const cancelRename = () => {
    setRenamingIndex(null);
  };

  /** Einfachklick = Tab wechseln; aktiver Tab / Doppelklick = umbenennen. */
  const onTabClick = (index: number) => {
    if (renamingIndex === index) return;
    // Aktiven Tab nochmal anklicken → Name editieren
    if (index === pageIndexRef.current) {
      startRename(index);
      return;
    }
    if (tabClickTimerRef.current != null) {
      window.clearTimeout(tabClickTimerRef.current);
      tabClickTimerRef.current = null;
      // Doppelklick auf anderen Tab: dorthin und umbenennen
      goToPage(index);
      window.requestAnimationFrame(() => startRename(index));
      return;
    }
    tabClickTimerRef.current = window.setTimeout(() => {
      tabClickTimerRef.current = null;
      goToPage(index);
    }, 250);
  };

  useEffect(() => {
    if (renamingIndex == null) return;
    const t = window.setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [renamingIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (emojiOpen) {
          e.preventDefault();
          setEmojiOpen(false);
          return;
        }
        if (renamingIndex != null) {
          e.preventDefault();
          setRenamingIndex(null);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        closeModal();
        return;
      }
      // F2: aktuellen Tab umbenennen
      if (e.key === 'F2' && renamingIndex == null) {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        startRename(pageIndexRef.current);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
        return;
      }
      // Tab / Shift+Tab im Texteditor: einrücken (Liste oder Absatz)
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (renamingIndex != null) return;
        const editor = editorRef.current;
        const sel = window.getSelection();
        const inNotesEditor =
          !!editor &&
          modeRef.current === 'text' &&
          !!sel?.anchorNode &&
          editor.contains(sel.anchorNode);
        if (!inNotesEditor) return;
        e.preventDefault();
        e.stopPropagation();
        pushHistorySnapshot();
        handlePresentationTabKey(editor, e.shiftKey);
        syncEditorToStateRef.current?.();
        return;
      }
      // ⌘/Ctrl + ←/→ : durch Notiz-Tabs blättern (auch im Texteditor)
      if (mod && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        if (renamingIndex != null) return;
        if (e.key === 'ArrowLeft') {
          if (pageIndexRef.current <= 0) return;
          e.preventDefault();
          e.stopPropagation();
          goToPage(pageIndexRef.current - 1);
        } else {
          if (pageIndexRef.current >= pagesRef.current.length - 1) return;
          e.preventDefault();
          e.stopPropagation();
          goToPage(pageIndexRef.current + 1);
        }
        return;
      }
      // Pfeile ohne Modifier: Tabs nur außerhalb des Editors
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      const inEditor =
        !!target &&
        (target.isContentEditable ||
          target.closest?.('[contenteditable="true"]') != null ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA');
      if (inEditor && modeRef.current === 'text') return;
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
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, goToPage, redo, undo, closeModal, emojiOpen, renamingIndex, pushHistorySnapshot]);

  const canUndo = historyTick >= 0 && historyRef.current.length > 0;
  const canRedo = historyTick >= 0 && redoRef.current.length > 0;

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
        <Typography sx={{ fontSize: '0.75rem', color: '#fff' }}>Notizen öffnen (N)</Typography>
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
          {pageTitle(page, data.pageIndex)}
          {pageCount > 1 ? ` · ${pageCount} Tabs` : ''}
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
        placement={floating ? 'left' : 'bottom'}
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
            ...(floating
              ? {
                  position: 'fixed',
                  bottom: 20,
                  right: 20,
                  zIndex: 1250,
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
                }
              : null),
          }}
          aria-label="Notizen (Taste N)"
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
            width: 'min(1280px, 98vw)',
            borderRadius: 2.5,
            overflow: 'hidden',
            minHeight: '90vh',
            maxHeight: '96vh',
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
              <Tooltip title="Kleiner">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => bumpFontSize(-1)}
                  sx={fmtBtnSx()}
                >
                  <TextDecreaseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Größer">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => bumpFontSize(1)}
                  sx={fmtBtnSx()}
                >
                  <TextIncreaseIcon sx={{ fontSize: 16 }} />
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
              <Tooltip title="Bild einfügen">
                <IconButton size="small" onClick={onPickImages} sx={fmtBtnSx()}>
                  <ImageOutlinedIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Emoji">
                <IconButton
                  ref={emojiAnchorRef}
                  size="small"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveEmojiCaret();
                  }}
                  onClick={() => {
                    if (mode !== 'text') {
                      modeRef.current = 'text';
                      setMode('text');
                    }
                    setEmojiOpen((v) => !v);
                  }}
                  sx={fmtBtnSx(emojiOpen)}
                >
                  <EmojiEmotionsIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.4, borderColor: '#ffe082' }} />
              <Tooltip title="Rückgängig (⌘Z)">
                <span>
                  <IconButton size="small" onClick={undo} disabled={!canUndo} sx={fmtBtnSx()}>
                    <UndoIcon sx={{ fontSize: 16, color: canUndo ? '#f57f17' : '#bdbdbd' }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Wiederholen (⌘⇧Z)">
                <span>
                  <IconButton size="small" onClick={redo} disabled={!canRedo} sx={fmtBtnSx()}>
                    <RedoIcon sx={{ fontSize: 16, color: canRedo ? '#f57f17' : '#bdbdbd' }} />
                  </IconButton>
                </span>
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
              <Tooltip title="Radierer">
                <IconButton
                  size="small"
                  onClick={() => setMode('eraser')}
                  sx={fmtBtnSx(mode === 'eraser')}
                >
                  <AutoFixOffIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Alle Stiftstriche löschen">
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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void insertImagesFromFiles(files);
              e.target.value = '';
            }}
          />
          <Popover
            open={emojiOpen}
            anchorEl={emojiAnchorRef.current}
            onClose={() => setEmojiOpen(false)}
            disableAutoFocus
            disableEnforceFocus
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{ paper: { sx: { overflow: 'hidden', borderRadius: 2 } } }}
          >
            <React.Suspense
              fallback={
                <Box sx={{ width: 320, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#90a4ae' }}>
                  Emojis laden …
                </Box>
              }
            >
              <EmojiPicker
                onEmojiClick={(data: EmojiClickData) => insertEmoji(data.emoji)}
                emojiStyle={EmojiStyle.NATIVE}
                lazyLoadEmojis
                width={320}
                height={380}
                searchPlaceholder="Suchen …"
              />
            </React.Suspense>
          </Popover>
        </DialogTitle>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            px: 1,
            bgcolor: '#fffde7',
            borderBottom: '1px solid #ffe082',
            overflowX: 'auto',
            minHeight: 30,
          }}
        >
          {pages.map((p, i) => {
            const active = i === pageIndex;
            const title = pageTitle(p, i);
            if (renamingIndex === i) {
              return (
                <Box
                  key={`rename-${i}`}
                  component="input"
                  ref={renameInputRef}
                  value={renameDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  sx={{
                    width: Math.min(140, Math.max(64, renameDraft.length * 8 + 16)),
                    height: 22,
                    mx: 0.25,
                    px: 0.75,
                    border: 'none',
                    borderBottom: '2px solid #f57f17',
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    color: '#ef6c00',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    outline: 'none',
                    flexShrink: 0,
                  }}
                />
              );
            }
            return (
              <Box
                key={`tab-${i}-${title}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  maxWidth: 150,
                  borderBottom: active ? '2px solid #f57f17' : '2px solid transparent',
                  '&:hover .notes-tab-close': { opacity: 1 },
                }}
              >
                <Box
                  component="button"
                  type="button"
                  onClick={() => onTabClick(i)}
                  onContextMenu={(e: React.MouseEvent) => {
                    e.preventDefault();
                    if (i !== pageIndexRef.current) goToPage(i);
                    window.requestAnimationFrame(() => startRename(i));
                  }}
                  title="Klick (aktiv) / Doppelklick / Rechtsklick / F2 = umbenennen"
                  sx={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    px: 1,
                    py: 0.45,
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: active ? '#ef6c00' : '#a1887f',
                    fontSize: '0.72rem',
                    fontWeight: active ? 700 : 500,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </Box>
                {pages.length > 1 && (
                  <Box
                    component="button"
                    type="button"
                    className="notes-tab-close"
                    aria-label={`${title} schließen`}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      removePageAt(i);
                    }}
                    sx={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      p: 0,
                      mr: 0.35,
                      width: 14,
                      height: 14,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#bcaaa4',
                      opacity: active ? 0.7 : 0,
                      '&:hover': { color: '#e65100', opacity: 1 },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </Box>
                )}
              </Box>
            );
          })}
          <Tooltip title="Neue Notiz">
            <IconButton
              size="small"
              onClick={addPage}
              sx={{
                p: 0.25,
                ml: 0.25,
                minWidth: 22,
                width: 22,
                height: 22,
                color: '#f57f17',
                flexShrink: 0,
                '&:hover': { bgcolor: '#fff9c4' },
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <DialogContent sx={{ p: 0, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Box
            ref={containerRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: '74vh',
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
              contentEditable={mode === 'text'}
              suppressContentEditableWarning
              onBeforeInput={onBeforeEditorInput}
              onKeyDown={(e) => {
                if (handlePresentationListShortcutKey(e, editorRef.current)) {
                  syncEditorToState();
                  return;
                }
                if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (mode !== 'text') {
                    modeRef.current = 'text';
                    setMode('text');
                  }
                  const editor = editorRef.current;
                  if (!editor) return;
                  pushHistorySnapshot();
                  handlePresentationTabKey(editor, e.shiftKey);
                  syncEditorToState();
                }
              }}
              onInput={() => {
                enhanceNotesImages(editorRef.current, () => {
                  syncEditorToStateRef.current?.();
                });
                syncEditorToState();
              }}
              onClick={(e) => {
                const t = e.target as HTMLElement | null;
                if (t?.closest?.('.notes-image-wrap')) return;
                editorRef.current
                  ?.querySelectorAll('.notes-image-wrap.notes-image-selected')
                  .forEach((el) => {
                    el.classList.remove('notes-image-selected');
                    (el as HTMLElement).style.outline = '';
                  });
              }}
              onBlur={syncEditorToState}
              onPaste={onEditorPaste}
              onDragOver={(e) => {
                if (Array.from(e.dataTransfer?.types || []).includes('Files')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={onEditorDrop}
              data-placeholder="Hier tippen … oder Bild einfügen"
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
                pointerEvents: mode === 'text' ? 'auto' : 'none',
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
                '& img[data-notes-img], & .notes-image-wrap img': {
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '6px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                },
                // Nach Größenänderung: CSS-Deckel nicht gegen Inline-width kämpfen lassen
                '& .notes-image-wrap img[style*="width"]': {
                  maxWidth: 'none !important',
                  height: 'auto',
                },
                '& .notes-image-wrap': {
                  position: 'relative',
                  display: 'inline-block',
                  width: 'fit-content',
                  maxWidth: '100%',
                  margin: '0.55em 0.35em 0.55em 0',
                  lineHeight: 0,
                  verticalAlign: 'middle',
                  overflow: 'visible',
                },
                '& .notes-resize-handle': {
                  position: 'absolute',
                  bottom: 1,
                  right: 1,
                  width: 16,
                  height: 16,
                  bgcolor: '#f57f17',
                  border: '2px solid #fff',
                  borderRadius: '3px',
                  cursor: 'nwse-resize',
                  zIndex: 20,
                  opacity: '1 !important',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  pointerEvents: 'auto',
                  display: 'block',
                  boxSizing: 'border-box',
                },
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
                cursor:
                  mode === 'eraser' ? 'cell' : mode === 'pen' ? 'crosshair' : 'text',
                pointerEvents: mode === 'pen' || mode === 'eraser' ? 'auto' : 'none',
              }}
            />
          </Box>
          {(mode === 'eraser' || mode === 'pen') && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                pb: 1,
                pt: 0.15,
              }}
            >
              <Typography sx={{ fontSize: '0.68rem', color: '#90a4ae' }}>
                {mode === 'eraser' ? 'Radierer · ⌘Z rückgängig' : 'Stift · ⌘Z rückgängig'}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
