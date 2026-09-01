import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
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
import FunctionsIcon from '@mui/icons-material/Functions';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import AddIcon from '@mui/icons-material/Add';
import AutoFixOffIcon from '@mui/icons-material/AutoFixOff';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';
import TableChartIcon from '@mui/icons-material/TableChart';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { DialogCloseIconButton } from './ui/dialog-close-icon-button';
import { handlePresentationListShortcutKey, handlePresentationTabKey, applyTextColor, execFormat, insertPresentationPastedHtml, presentationPasteHtml } from '../lib/presentationRichText';
import {
  convertSelectedTextToPresentationMath,
  clearMathFormatTarget,
  placeCaretBesidePresentationMath,
  prepareEditorSelectionForLatexShortcut,
  selectionIntersectsPresentationMath,
  unwrapSelectedPresentationMath,
} from '../lib/presentationPasteMath';
import '../styles/presentationLists.css';
import {
  buildBlankTableHtml,
  getTableTheme,
  tableAddColumn,
  tableAddRow,
} from '../lib/presentationSlideTables';
import { presentationNotesTableSx } from '../lib/presentationListStyles';
import {
  tryStartTableResizeFromPointer,
  updateTableResizeHoverCursor,
} from '../lib/presentationTableResize';
import { clipboardHasImage, collectPasteImages, readImagesFromSystemClipboard, snapshotClipboardFiles } from '../lib/goodNotesClipboard';
import { applyEditorFontSizePx, ensureEditorSelection, keepEditorSelection, stashEditorSelection } from '../lib/presentationFontSize';
import { isFormatBarInteracting, isPresentationModalTypingActive, setFormatBarInteracting } from '../lib/presentationFormatBarGuard';
import { strokeSmoothFreehand } from '../lib/presentationDrawTools';
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
const MIN_INK_DIST_SQ = 0.45 * 0.45;
const INK_COMMIT_IDLE_MS = 420;
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
    position:absolute;bottom:-4px;right:-4px;width:28px;height:28px;
    background:#f57f17;border:2px solid #fff;border-radius:4px;
    cursor:nwse-resize;z-index:20;opacity:1;
    box-shadow:0 1px 3px rgba(0,0,0,.35);pointer-events:auto;
    display:block;box-sizing:border-box;touch-action:none;
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

  const onUp = () => {
    if (!resizing) return;
    resizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const styledW = parseFloat(img.style.width || '');
    const w = (Number.isFinite(styledW) && styledW > 0 ? styledW : 0) || img.offsetWidth || startW;
    applyNotesImageSize(img, wrap, w, ratio);
    onChange();
  };

  grip.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
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
    const prevTouch = document.body.style.touchAction;
    document.body.style.touchAction = 'none';
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      onMove(ev);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      document.body.style.touchAction = prevTouch;
      onUp();
    };
    window.addEventListener('pointermove', move, { capture: true, passive: false });
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
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

function padPlainLen(data: ScratchPadData): number {
  return data.pages.reduce((n, p) => n + stripHtml(p.text).length + (p.ink?.length || 0), 0);
}

function padUpdatedMs(data: ScratchPadData | null | undefined): number {
  if (!data?.updatedAt) return 0;
  const t = Date.parse(data.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/** Neueren Stand wählen — nie einen vollen Block durch eine fast leere neuere Kopie ersetzen. */
function pickNewerPad(a: ScratchPadData, b: ScratchPadData | null): ScratchPadData {
  if (!b) return a;
  const aLen = padPlainLen(a);
  const bLen = padPlainLen(b);
  if (aLen >= 40 && bLen < 12) return a;
  if (bLen >= 40 && aLen < 12) return b;
  const aMs = padUpdatedMs(a);
  const bMs = padUpdatedMs(b);
  if (bMs > aMs) return b;
  if (aMs > bMs) return a;
  if (bLen > aLen) return b;
  return a;
}

const serverSyncTimers = new Map<string, number>();
let lastServerStandPulled = false;

function pushPadToServer(userId: string, data: ScratchPadData, immediate = false, forceBackup = false) {
  const send = () => {
    serverSyncTimers.delete(userId);
    apiPutSafe('/api/teacher-scratch-pad', {
      pages: data.pages,
      pageIndex: data.pageIndex,
      updatedAt: data.updatedAt || new Date().toISOString(),
      forceBackup,
      seenStandPull: lastServerStandPulled,
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

async function flushPadToServer(userId: string, data: ScratchPadData, forceBackup = false) {
  const prev = serverSyncTimers.get(userId);
  if (prev != null) {
    window.clearTimeout(prev);
    serverSyncTimers.delete(userId);
  }
  await apiPutSafeAwait('/api/teacher-scratch-pad', {
    pages: data.pages,
    pageIndex: data.pageIndex,
    updatedAt: data.updatedAt || new Date().toISOString(),
    forceBackup,
    seenStandPull: lastServerStandPulled,
  });
}

async function fetchPadFromServer(): Promise<ScratchPadData | null> {
  try {
    const res = await apiGetSafe('/api/teacher-scratch-pad');
    if (!res || !res.ok) return null;
    const json = (await res.json()) as { found?: boolean; pad?: unknown; standPulled?: boolean };
    lastServerStandPulled = Boolean(json?.standPulled);
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
        if (padPlainLen(old) >= 40 && padPlainLen(payload) < 12) {
          console.warn('Lehrer-Notizen: leeren Stand nicht über bestehenden Inhalt geschrieben');
          return old;
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

function readRangeFontSizePx(editor: HTMLElement, range: Range | null): number {
  const node = range?.startContainer ?? window.getSelection()?.focusNode ?? null;
  let el: Node | null = node;
  if (el && el.nodeType === Node.TEXT_NODE) el = el.parentElement;
  if (!(el instanceof Element) || !editor.contains(el)) return NOTE_DEFAULT_FONT_PX;
  const px = parseFloat(window.getComputedStyle(el).fontSize);
  return Number.isFinite(px) && px > 0 ? px : NOTE_DEFAULT_FONT_PX;
}

function cloneLiveNotesRange(editor: HTMLElement | null, allowCollapsed = false): Range | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (range.collapsed && !allowCollapsed) return null;
  if (!editor.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function pinNotesTableLeft(editor: HTMLElement, table: HTMLTableElement) {
  table.style.marginLeft = '0';
  table.style.marginRight = 'auto';
  table.style.float = 'none';
  table.style.textAlign = 'left';
  table.querySelectorAll('th, td').forEach((cell) => {
    (cell as HTMLElement).style.textAlign = 'left';
  });
  if (table.parentElement === editor) return;
  let block: HTMLElement | null = table.parentElement;
  while (block && block.parentElement && block.parentElement !== editor) {
    block = block.parentElement;
  }
  if (!block || block === editor || block.parentElement !== editor) return;
  editor.insertBefore(table, block.nextSibling);
  const empty = !block.textContent?.trim() && !block.querySelector('img, table');
  if (empty) block.remove();
  else block.style.marginLeft = '0';
}

function insertHtmlIntoNotesEditor(editor: HTMLElement, html: string): boolean {
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  let range: Range | null = null;
  if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    range = sel.getRangeAt(0);
  }
  if (!range) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  const inCell = (() => {
    const n = range.commonAncestorContainer;
    const el = n instanceof Element ? n : n.parentElement;
    return Boolean(el?.closest?.('td, th'));
  })();
  // Nicht den ganzen Notiztext löschen, wenn mehr als eine Zelle markiert ist
  if (!range.collapsed && !inCell) {
    range.collapse(false);
  }
  range.deleteContents();
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const frag = tpl.content;
  const last = frag.lastChild;
  range.insertNode(frag);
  if (last && sel) {
    const after = document.createRange();
    after.setStartAfter(last);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
  return Boolean(editor.querySelector('table'));
}

type TeacherQuickNotesProps = {
  userId: string;
  /** N-Button fest am Bildschirm — für globale Nutzung außerhalb des Dashboards */
  floating?: boolean;
};

export const OPEN_TEACHER_NOTES_EVENT = 'johnny:open-teacher-notes';
export const NOTES_FROM_GIT_EVENT = 'johnny:notes-from-git';

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
  const [tableAnchor, setTableAnchor] = useState<HTMLElement | null>(null);
  const [secureFlash, setSecureFlash] = useState(false);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const emojiAnchorRef = useRef<HTMLButtonElement | null>(null);
  const emojiCaretRef = useRef<Range | null>(null);
  const notesSelectionRef = useRef<Range | null>(null);
  const formatToolbarRef = useRef<HTMLDivElement | null>(null);
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
  const colorRef = useRef(color);
  const inkPointerIdRef = useRef<number | null>(null);
  const lastInkPtRef = useRef<InkPoint | null>(null);
  const lastSmoothMidRef = useRef<InkPoint | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const persistInkTimerRef = useRef<number | null>(null);
  const holdGitStandRef = useRef(false);

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
    colorRef.current = color;
  }, [color]);
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
    holdGitStandRef.current = false;
    if (textBurstArmedRef.current) {
      pushHistorySnapshot();
      textBurstArmedRef.current = false;
    }
    scheduleTextHistory();
  }, [pushHistorySnapshot, scheduleTextHistory]);

  const persistBook = useCallback(
    (nextPages: ScratchPage[], nextIndex: number) => {
      if (holdGitStandRef.current) return;
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

    void (async () => {
      const remote = await fetchPadFromServer();
      if (!openRef.current) return;
      if (lastServerStandPulled && remote) {
        holdGitStandRef.current = true;
        savePad(userId, remote, { syncServer: false });
        showPage(remote.pages, remote.pageIndex, true);
        bumpHistoryUi();
        return;
      }
      const merged = pickNewerPad(local, remote);
      savePad(userId, merged, { immediateServer: true });
      showPage(merged.pages, merged.pageIndex, true);
      bumpHistoryUi();
    })();
  }, [bumpHistoryUi, showPage, userId]);

  const closeModal = useCallback(() => {
    if (textHistoryTimerRef.current != null) {
      window.clearTimeout(textHistoryTimerRef.current);
      textHistoryTimerRef.current = null;
    }
    if (persistInkTimerRef.current != null) {
      window.clearTimeout(persistInkTimerRef.current);
      persistInkTimerRef.current = null;
    }
    if (!holdGitStandRef.current) {
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
    }
    openRef.current = false;
    setOpen(false);
  }, [flushCurrentPage, userId]);

  const persistManualBackup = useCallback(async () => {
    // Explizites Sichern: Git-Stand-Hold lösen und Arbeitsdatei + Backup-Kopie schreiben.
    holdGitStandRef.current = false;
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
    await flushPadToServer(userId, payload, true);
    setSecureFlash(true);
    window.setTimeout(() => setSecureFlash(false), 1800);
  }, [flushCurrentPage, userId]);

  /** Beim Start: Ordner anlegen lassen + ggf. Server-Stand holen. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const remote = await fetchPadFromServer();
      if (cancelled) return;
      if (lastServerStandPulled && remote) {
        holdGitStandRef.current = true;
        savePad(userId, remote, { syncServer: false });
        return;
      }
      const local = loadPad(userId);
      const merged = pickNewerPad(local, remote);
      if (
        padUpdatedMs(merged) > padUpdatedMs(local) ||
        (padHasContent(merged) && !padHasContent(local))
      ) {
        savePad(userId, merged, { syncServer: false });
      } else if (padHasContent(local) || padUpdatedMs(local) > 0) {
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
      if (holdGitStandRef.current) return;
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

  /** Nach „Stand von GitHub holen“: alten Browser-Stand weg, Server-Stand nehmen. */
  useEffect(() => {
    const onFromGit = () => {
      holdGitStandRef.current = true;
      try {
        localStorage.removeItem(storageKey(userId));
      } catch {
        /* ignore */
      }
      void (async () => {
        const remote = await fetchPadFromServer();
        if (!remote || !Array.isArray(remote.pages) || remote.pages.length === 0) return;
        lastServerStandPulled = true;
        savePad(userId, remote, { syncServer: false });
        pagesRef.current = remote.pages as ScratchPage[];
        pageIndexRef.current = remote.pageIndex || 0;
        setPages(remote.pages as ScratchPage[]);
        setPageIndex(remote.pageIndex || 0);
        const page = (remote.pages as ScratchPage[])[remote.pageIndex || 0] || emptyPage();
        textRef.current = page.text || '';
        inkRef.current = page.ink || [];
        setText(page.text || '');
        setInk(page.ink || []);
      })();
    };
    window.addEventListener(NOTES_FROM_GIT_EVENT, onFromGit);
    return () => window.removeEventListener(NOTES_FROM_GIT_EVENT, onFromGit);
  }, [userId]);

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

  const runFormat = useCallback((cmd: FmtCmd, value?: string) => {
    if (modeRef.current !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    const editor = editorRef.current;
    if (!editor) return;
    pushHistorySnapshot();
    const sel = window.getSelection();
    const range =
      sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)
        ? sel.getRangeAt(0).cloneRange()
        : null;
    editor.focus({ preventScroll: true });
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (cmd === 'foreColor') {
      applyTextColor(editor, value || color);
    } else if (cmd === 'formatBlock') {
      try {
        document.execCommand('formatBlock', false, value || 'h3');
      } catch {
        /* ignore */
      }
    } else {
      execFormat(editor, cmd, value);
    }
    syncEditorToState();
  }, [color, pushHistorySnapshot, syncEditorToState]);

  const restoreNotesSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (modeRef.current !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    editor.focus({ preventScroll: true });
    const sel = window.getSelection();
    const range =
      notesSelectionRef.current && editor.contains(notesSelectionRef.current.commonAncestorContainer)
        ? notesSelectionRef.current
        : cloneLiveNotesRange(editor, true);
    if (range && sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  const rememberNotesSelection = useCallback(() => {
    const live = cloneLiveNotesRange(editorRef.current, true);
    if (live) notesSelectionRef.current = live;
    stashEditorSelection(editorRef.current);
    return live;
  }, []);

  const handleLatexShortcut = useCallback(() => {
    if (modeRef.current !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    const editor = editorRef.current;
    if (!editor) return;
    pushHistorySnapshot();
    const remembered =
      cloneLiveNotesRange(editor) ||
      (notesSelectionRef.current && !notesSelectionRef.current.collapsed
        ? notesSelectionRef.current
        : null);
    if (remembered && !remembered.collapsed) {
      notesSelectionRef.current = remembered.cloneRange();
    } else {
      rememberNotesSelection();
    }
    stashEditorSelection(editor);
    setFormatBarInteracting(true);
    keepEditorSelection(
      editor,
      notesSelectionRef.current && !notesSelectionRef.current.collapsed ? notesSelectionRef.current : null,
    );
    if (!ensureEditorSelection(editor)) {
      restoreNotesSelection();
      if (!ensureEditorSelection(editor) && !prepareEditorSelectionForLatexShortcut(editor)) {
        window.setTimeout(() => setFormatBarInteracting(false), 0);
        return;
      }
    }
    clearMathFormatTarget(editor);
    if (selectionIntersectsPresentationMath(editor)) {
      if (unwrapSelectedPresentationMath(editor)) syncEditorToState();
      window.setTimeout(() => setFormatBarInteracting(false), 0);
      return;
    }
    if (convertSelectedTextToPresentationMath(editor)) syncEditorToState();
    window.setTimeout(() => setFormatBarInteracting(false), 0);
  }, [pushHistorySnapshot, rememberNotesSelection, restoreNotesSelection, syncEditorToState]);

  const findNotesTable = useCallback((): HTMLTableElement | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    const sel = window.getSelection();
    const node = sel?.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    if (el && editor.contains(el)) {
      const table = el.closest('table');
      if (table) return table;
    }
    return editor.querySelector('table');
  }, []);

  const insertNotesTable = useCallback(
    (rows = 3, cols = 3) => {
      const editor = editorRef.current;
      if (!editor) return;
      if (modeRef.current !== 'text') {
        modeRef.current = 'text';
        setMode('text');
      }
      pushHistorySnapshot();
      restoreNotesSelection();
      const html = `${buildBlankTableHtml(rows, cols, getTableTheme('grau'), { cellAlign: 'left' })}<p><br></p>`;
      const ok = insertHtmlIntoNotesEditor(editor, html);
      if (!ok) editor.insertAdjacentHTML('beforeend', html);
      const inserted = editor.querySelector('table:last-of-type') as HTMLTableElement | null;
      if (inserted) {
        const px = Math.min(520, Math.max(240, cols * 120));
        inserted.style.width = `${px}px`;
        inserted.style.maxWidth = '100%';
        pinNotesTableLeft(editor, inserted);
      }
      syncEditorToState();
    },
    [pushHistorySnapshot, restoreNotesSelection, syncEditorToState],
  );

  const mutateNotesTable = useCallback(
    (fn: (table: HTMLTableElement) => boolean) => {
      const editor = editorRef.current;
      if (!editor) return;
      restoreNotesSelection();
      const table = findNotesTable();
      if (!table) {
        insertNotesTable();
        return;
      }
      pushHistorySnapshot();
      fn(table);
      syncEditorToState();
    },
    [findNotesTable, insertNotesTable, pushHistorySnapshot, restoreNotesSelection, syncEditorToState],
  );

  const applyColor = (next: string) => {
    setColor(next);
    if (mode === 'eraser') {
      setMode('pen');
      return;
    }
    if (mode === 'pen') return;
    pushHistorySnapshot();
    restoreNotesSelection();
    applyTextColor(editorRef.current, next);
    const kept = cloneLiveNotesRange(editorRef.current, true);
    if (kept) notesSelectionRef.current = kept;
    syncEditorToState();
  };

  const bumpFontSize = useCallback((direction: -1 | 1) => {
    if (modeRef.current !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    const editor = editorRef.current;
    if (!editor) return;
    setFormatBarInteracting(true);
    const range =
      cloneLiveNotesRange(editor) ||
      notesSelectionRef.current ||
      rememberNotesSelection();
    if (!range || range.collapsed) {
      window.setTimeout(() => setFormatBarInteracting(false), 0);
      return;
    }
    notesSelectionRef.current = range.cloneRange();
    stashEditorSelection(editor);
    pushHistorySnapshot();
    const current = nearestFontSizeStep(readRangeFontSizePx(editor, range));
    const idx = NOTE_FONT_SIZE_STEPS.findIndex((s) => s === current);
    const safeIdx = idx >= 0 ? idx : NOTE_FONT_SIZE_STEPS.findIndex((s) => s === NOTE_DEFAULT_FONT_PX);
    const nextIdx = Math.max(0, Math.min(NOTE_FONT_SIZE_STEPS.length - 1, (safeIdx >= 0 ? safeIdx : 3) + direction));
    const nextPx = NOTE_FONT_SIZE_STEPS[nextIdx] ?? NOTE_DEFAULT_FONT_PX;
    const ok = applyEditorFontSizePx(editor, nextPx, range);
    if (ok) {
      syncEditorToState();
      const kept = cloneLiveNotesRange(editor);
      if (kept) notesSelectionRef.current = kept;
    }
    window.requestAnimationFrame(() => {
      const editorNow = editorRef.current;
      const kept = cloneLiveNotesRange(editorNow);
      if (editorNow && kept) {
        try {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(kept);
          notesSelectionRef.current = kept;
        } catch {
          /* ignore */
        }
      }
      setFormatBarInteracting(false);
    });
  }, [pushHistorySnapshot, rememberNotesSelection, syncEditorToState]);

  useEffect(() => {
    if (!open) return undefined;
    const onSelectionChange = () => {
      const editor = editorRef.current;
      if (!editor) return;
      const live = cloneLiveNotesRange(editor, true);
      if (live) {
        notesSelectionRef.current = live;
        stashEditorSelection(editor);
        return;
      }
      if (isFormatBarInteracting()) return;
      const active = document.activeElement;
      if (active && formatToolbarRef.current?.contains(active)) return;
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [open]);

  const insertImagesFromFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => !f.type || f.type.startsWith('image/'));
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
    const dt = e.clipboardData;
    const filesNow = snapshotClipboardFiles(dt);
    if (filesNow.length) {
      e.preventDefault();
      void insertImagesFromFiles(filesNow);
      return;
    }
    if (clipboardHasImage(dt)) {
      e.preventDefault();
      void (async () => {
        const files = await collectPasteImages(dt);
        if (files.length) await insertImagesFromFiles(files);
      })();
      return;
    }
    const html = dt.getData('text/html') || '';
    const text = dt.getData('text/plain') || '';
    if (!html.trim() && !text.trim()) return;
    e.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;
    if (modeRef.current !== 'text') {
      modeRef.current = 'text';
      setMode('text');
    }
    pushHistorySnapshot();
    const pasted = presentationPasteHtml(dt, { fontPx: NOTE_DEFAULT_FONT_PX, textAlign: 'left' });
    insertPresentationPastedHtml(editor, pasted);
    syncEditorToState();
  };

  const pasteFromGoodNotes = () => {
    rememberNotesSelection();
    void (async () => {
      const files = await readImagesFromSystemClipboard();
      if (files.length) {
        await insertImagesFromFiles(files);
        return;
      }
      editorRef.current?.focus();
    })();
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

  const applyInkStyle = (ctx: CanvasRenderingContext2D, stroke: InkStroke) => {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 1.5;
    ctx.globalCompositeOperation = 'source-over';
  };

  const applyCanvasTransform = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cssW = Math.max(1, rect?.width || canvas.clientWidth || 1);
    const cssH = Math.max(1, rect?.height || canvas.clientHeight || 1);
    ctx.setTransform(canvas.width / cssW, 0, 0, canvas.height / cssH, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  };

  const ensureNotesCtx = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
      }) as CanvasRenderingContext2D | null;
    }
    const ctx = ctxRef.current;
    if (ctx) applyCanvasTransform(ctx, canvas);
    return ctx;
  };

  const drawInkStroke = (ctx: CanvasRenderingContext2D, stroke: InkStroke) => {
    if (stroke.points.length === 1) {
      applyInkStyle(ctx, stroke);
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, stroke.width / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (stroke.points.length < 2) return;
    applyInkStyle(ctx, stroke);
    strokeSmoothFreehand(ctx, stroke.points);
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ensureNotesCtx();
    if (!canvas || !ctx) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const cssW = Math.max(1, rect?.width || canvas.clientWidth || 1);
    const cssH = Math.max(1, rect?.height || canvas.clientHeight || 1);
    ctx.clearRect(0, 0, cssW, cssH);
    for (const stroke of inkRef.current) drawInkStroke(ctx, stroke);
    if (currentStrokeRef.current) drawInkStroke(ctx, currentStrokeRef.current);
    // Handler/Zeichnen lesen nur Refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resizeCanvas = useCallback(() => {
    if (currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bufW = Math.max(1, Math.round(rect.width * dpr));
    const bufH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width = bufW;
      canvas.height = bufH;
      ctxRef.current = null;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    const tryObserve = () => {
      if (cancelled) return;
      const host = containerRef.current;
      if (!host) {
        window.requestAnimationFrame(tryObserve);
        return;
      }
      resizeCanvas();
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(host);
      }
    };
    tryObserve();
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [open, pageIndex, resizeCanvas]);

  useEffect(() => {
    if (!open) return;
    if (currentStrokeRef.current) return;
    redrawCanvas();
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

  const pointFromClient = (clientX: number, clientY: number): InkPoint => {
    const host = containerRef.current || canvasRef.current;
    const rect = host?.getBoundingClientRect();
    if (!rect || rect.width < 1 || rect.height < 1) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const scheduleInkCommit = (nextInk: InkStroke[]) => {
    inkRef.current = nextInk;
    if (persistInkTimerRef.current != null) window.clearTimeout(persistInkTimerRef.current);
    persistInkTimerRef.current = window.setTimeout(() => {
      persistInkTimerRef.current = null;
      setInk(nextInk);
      const nextPages = pagesRef.current.map((p, i) =>
        i === pageIndexRef.current ? { ...p, text: textRef.current, ink: nextInk } : p
      );
      pagesRef.current = nextPages;
      setPages(nextPages);
      persistBook(nextPages, pageIndexRef.current);
    }, INK_COMMIT_IDLE_MS);
  };

  /** Wie auf den Folien: Apple Pencil immer Tinte; Maus nur im Stift/Radierer; Finger = Palm-Rejection. */
  const shouldInkPointer = (pointerType: string): boolean => {
    if (pointerType === 'pen') return true;
    const m = modeRef.current;
    return (m === 'pen' || m === 'eraser') && pointerType === 'mouse';
  };

  const strokeInkSegment = (from: InkPoint, to: InkPoint) => {
    const stroke = currentStrokeRef.current;
    const ctx = ensureNotesCtx();
    if (!stroke || !ctx) return;
    applyInkStyle(ctx, stroke);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const start = lastSmoothMidRef.current ?? from;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    ctx.stroke();
    lastSmoothMidRef.current = mid;
  };

  const appendInkPoint = (pt: InkPoint) => {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    const last = lastInkPtRef.current ?? stroke.points[stroke.points.length - 1];
    if (last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < MIN_INK_DIST_SQ) return;
    }
    stroke.points.push(pt);
    if (last) strokeInkSegment(last, pt);
    lastInkPtRef.current = pt;
  };

  const eraseAt = (pt: InkPoint) => {
    const next = inkRef.current.filter((s) => !strokeHitsPoint(s, pt, ERASER_RADIUS));
    if (next.length === inkRef.current.length) return;
    scheduleInkCommit(next);
    redrawCanvas();
  };

  const onInkPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      if (modeRef.current === 'text') return;
      e.preventDefault();
      return;
    }
    if (!shouldInkPointer(e.pointerType)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    editorRef.current?.blur();
    const canvas = canvasRef.current;
    const host = containerRef.current;
    // Host, nicht Canvas: im Textmodus hat die Leinwand pointer-events:none
    // und würde die Capture sofort wieder verlieren.
    const captureEl = host || canvas;
    if (!captureEl) return;
    try {
      captureEl.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    inkPointerIdRef.current = e.pointerId;
    drawingRef.current = true;
    const pt = pointFromClient(e.clientX, e.clientY);
    if (modeRef.current === 'eraser') {
      erasingRef.current = true;
      pushHistorySnapshot();
      eraseAt(pt);
      return;
    }
    erasingRef.current = false;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const stroke: InkStroke = {
      points: [pt],
      color: colorRef.current,
      width: e.pointerType === 'pen' ? Math.max(2, Math.min(4.2, pressure * 4.2)) : 3,
    };
    currentStrokeRef.current = stroke;
    lastInkPtRef.current = pt;
    lastSmoothMidRef.current = pt;
    const ctx = ensureNotesCtx();
    if (ctx) {
      applyInkStyle(ctx, stroke);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(0.6, stroke.width / 2), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onInkPointerMove = (e: PointerEvent) => {
    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) return;
    if (e.pointerType === 'touch' && (modeRef.current === 'pen' || modeRef.current === 'eraser')) {
      e.preventDefault();
      return;
    }
    if (!drawingRef.current) return;
    if (!shouldInkPointer(e.pointerType) && inkPointerIdRef.current == null) return;
    e.preventDefault();
    const applyPt = (clientX: number, clientY: number) => {
      const pt = pointFromClient(clientX, clientY);
      if (erasingRef.current || modeRef.current === 'eraser') {
        eraseAt(pt);
        return;
      }
      appendInkPoint(pt);
    };
    const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    if (coalesced && coalesced.length > 0) {
      for (const ce of coalesced) applyPt(ce.clientX, ce.clientY);
    } else {
      applyPt(e.clientX, e.clientY);
    }
  };

  const endInkStroke = (e: PointerEvent) => {
    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) return;
    if (!drawingRef.current) return;
    drawingRef.current = false;
    inkPointerIdRef.current = null;
    lastInkPtRef.current = null;
    lastSmoothMidRef.current = null;
    const canvas = canvasRef.current;
    const host = containerRef.current;
    try {
      canvas?.releasePointerCapture(e.pointerId);
      host?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (erasingRef.current || modeRef.current === 'eraser') {
      erasingRef.current = false;
      currentStrokeRef.current = null;
      return;
    }
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (!stroke || stroke.points.length < 1) return;
    if (stroke.points.length === 1) {
      stroke.points.push({ x: stroke.points[0].x + 0.01, y: stroke.points[0].y });
    }
    pushHistorySnapshot();
    scheduleInkCommit([...inkRef.current, stroke]);
    redrawCanvas();
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let unbind: (() => void) | null = null;

    const tryBind = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const host = containerRef.current;
      if (!canvas || !host) {
        window.requestAnimationFrame(tryBind);
        return;
      }
      resizeCanvas();
      // Capture auf dem Host: Pencil kommt an, auch wenn die Leinwand im Textmodus
      // pointer-events:none hat (sonst blockiert sie Maus/Finger zum Tippen).
      const listenOpts: AddEventListenerOptions = { capture: true, passive: false };
      host.addEventListener('pointerdown', onInkPointerDown, listenOpts);
      host.addEventListener('pointermove', onInkPointerMove, listenOpts);
      host.addEventListener('pointerup', endInkStroke, listenOpts);
      host.addEventListener('pointercancel', endInkStroke, listenOpts);
      const blockStylusTouch = (ev: TouchEvent) => {
        const touches = Array.from(ev.touches) as Array<Touch & { touchType?: string }>;
        const stylus = touches.some((t) => t.touchType === 'stylus');
        if (stylus || modeRef.current === 'pen' || modeRef.current === 'eraser') {
          ev.preventDefault();
        }
      };
      host.addEventListener('touchstart', blockStylusTouch, listenOpts);
      host.addEventListener('touchmove', blockStylusTouch, listenOpts);
      unbind = () => {
        host.removeEventListener('pointerdown', onInkPointerDown, listenOpts);
        host.removeEventListener('pointermove', onInkPointerMove, listenOpts);
        host.removeEventListener('pointerup', endInkStroke, listenOpts);
        host.removeEventListener('pointercancel', endInkStroke, listenOpts);
        host.removeEventListener('touchstart', blockStylusTouch, listenOpts);
        host.removeEventListener('touchmove', blockStylusTouch, listenOpts);
      };
    };
    tryBind();
    return () => {
      cancelled = true;
      unbind?.();
    };
    // Native Listener wie auf den Folien — Handler lesen Refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clearInk = () => {
    if (persistInkTimerRef.current != null) {
      window.clearTimeout(persistInkTimerRef.current);
      persistInkTimerRef.current = null;
    }
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
      if (mod && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        void persistManualBackup();
        return;
      }
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
      // ⌘B/I/U/[ /] — Capture, sonst nimmt der Browser ⌘B als Lesezeichen.
      if (mod && !e.altKey && modeRef.current === 'text' && renamingIndex == null) {
        if (isPresentationModalTypingActive()) return;
        const target = e.target as HTMLElement | null;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          const key = e.key.toLowerCase();
          if (key === 'b' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            runFormat('bold');
            return;
          }
          if (key === 'i' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            runFormat('italic');
            return;
          }
          if (key === 'u' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            runFormat('underline');
            return;
          }
          if (key === 'l' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            handleLatexShortcut();
            return;
          }
          if (key === 'x' && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            runFormat('strikeThrough');
            return;
          }
          if (key === ']' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            bumpFontSize(1);
            return;
          }
          if (key === '[' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            bumpFontSize(-1);
            return;
          }
        }
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
  }, [open, goToPage, redo, undo, closeModal, emojiOpen, renamingIndex, persistManualBackup, pushHistorySnapshot, runFormat, bumpFontSize, handleLatexShortcut]);

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

  const notesFab = (
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
          data-teacher-fab="notes"
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
                  zIndex: 5000,
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
  );

  return (
    <>
      {floating && typeof document !== 'undefined' ? createPortal(notesFab, document.body) : notesFab}
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
            display: 'flex',
            flexDirection: 'column',
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
              ref={formatToolbarRef}
              data-presentation-format-bar
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.15,
                flexWrap: 'wrap',
                flex: 1,
                minWidth: 0,
                pr: 0.5,
              }}
              onPointerDownCapture={() => {
                setFormatBarInteracting(true);
                rememberNotesSelection();
              }}
              onMouseDown={(e) => {
                const t = e.target as HTMLElement | null;
                if (t?.closest('button, [role="button"]')) e.preventDefault();
                rememberNotesSelection();
              }}
              onPointerUp={() => {
                window.setTimeout(() => setFormatBarInteracting(false), 0);
              }}
            >
              <Tooltip title="Fett (⌘B)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runFormat('bold')}
                  sx={fmtBtnSx()}
                >
                  <FormatBoldIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Kursiv (⌘I)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runFormat('italic')}
                  sx={fmtBtnSx()}
                >
                  <FormatItalicIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Unterstrichen (⌘U)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runFormat('underline')}
                  sx={fmtBtnSx()}
                >
                  <FormatUnderlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Durchgestrichen (⇧⌘X)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runFormat('strikeThrough')}
                  sx={fmtBtnSx()}
                >
                  <StrikethroughSIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="LaTeX markieren → ⌘L (Formel ⇄ LaTeX)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    rememberNotesSelection();
                    setFormatBarInteracting(true);
                  }}
                  onClick={handleLatexShortcut}
                  sx={fmtBtnSx()}
                >
                  <FunctionsIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Kleiner (⌘[)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => bumpFontSize(-1)}
                  sx={fmtBtnSx()}
                >
                  <TextDecreaseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Größer (⌘])">
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
                      onMouseDown={(e) => e.preventDefault()}
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
              <Tooltip title="Tabelle">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    rememberNotesSelection();
                    setTableAnchor(e.currentTarget);
                  }}
                  sx={fmtBtnSx(Boolean(tableAnchor))}
                >
                  <TableChartIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Popover
                open={Boolean(tableAnchor)}
                anchorEl={tableAnchor}
                onClose={() => setTableAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              >
                <Box sx={{ py: 0.5, minWidth: 176 }}>
                  <MenuItem
                    dense
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertNotesTable(3, 3);
                      setTableAnchor(null);
                    }}
                    sx={{ fontSize: '0.82rem' }}
                  >
                    Tabelle 3 × 3 einfügen
                  </MenuItem>
                  <MenuItem
                    dense
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertNotesTable(4, 4);
                      setTableAnchor(null);
                    }}
                    sx={{ fontSize: '0.82rem' }}
                  >
                    Tabelle 4 × 4 einfügen
                  </MenuItem>
                  <MenuItem
                    dense
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      mutateNotesTable((t) => tableAddRow(t));
                      setTableAnchor(null);
                    }}
                    sx={{ fontSize: '0.82rem' }}
                  >
                    Zeile hinzufügen
                  </MenuItem>
                  <MenuItem
                    dense
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      mutateNotesTable((t) => tableAddColumn(t));
                      setTableAnchor(null);
                    }}
                    sx={{ fontSize: '0.82rem' }}
                  >
                    Spalte hinzufügen
                  </MenuItem>
                </Box>
              </Popover>
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
              <Tooltip title="Bild aus Datei oder GoodNotes: Lasso → Kopieren → hier einfügen">
                <IconButton size="small" onClick={onPickImages} sx={fmtBtnSx()}>
                  <ImageOutlinedIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Aus GoodNotes einfügen (zuerst in GoodNotes kopieren)">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={pasteFromGoodNotes}
                  sx={fmtBtnSx()}
                >
                  <ContentPasteGoIcon sx={{ fontSize: 16, color: '#f57f17' }} />
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
              <Tooltip
                title={
                  secureFlash
                    ? 'Gesichert — Arbeitsdatei + Backup - Notizen'
                    : 'Sichern (⌘S): Arbeitsdatei + Kopie nach Backup - Notizen'
                }
              >
                <IconButton
                  size="small"
                  onClick={() => {
                    void persistManualBackup();
                  }}
                  aria-label="Notizen sichern"
                  sx={fmtBtnSx(secureFlash)}
                >
                  <SaveOutlinedIcon sx={{ fontSize: 16, color: secureFlash ? '#2e7d32' : '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.4, borderColor: '#ffe082' }} />
              <Tooltip title="Tippen">
                <IconButton
                  size="small"
                  onClick={() => {
                    modeRef.current = 'text';
                    setMode('text');
                    window.requestAnimationFrame(() => editorRef.current?.focus());
                  }}
                  sx={fmtBtnSx(mode === 'text')}
                >
                  <KeyboardIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Stift (Apple Pencil schreibt immer)">
                <IconButton
                  size="small"
                  onClick={() => {
                    modeRef.current = 'pen';
                    setMode('pen');
                  }}
                  sx={fmtBtnSx(mode === 'pen')}
                >
                  <EditIcon sx={{ fontSize: 16, color: '#f57f17' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Radierer">
                <IconButton
                  size="small"
                  onClick={() => {
                    modeRef.current = 'eraser';
                    setMode('eraser');
                  }}
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
        <DialogContent
          sx={{ p: 0, bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
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
              touchAction: mode === 'text' ? 'auto' : 'none',
            }}
          >
            <Box
              ref={editorRef}
              contentEditable={mode === 'text'}
              suppressContentEditableWarning
              data-pres-notes-zone="true"
              data-pres-rich-zone="1"
              data-pres-base-fs={String(NOTE_DEFAULT_FONT_PX)}
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
              onMouseDown={(e) => {
                if (mode !== 'text') return;
                if (placeCaretBesidePresentationMath(e.nativeEvent)) {
                  e.preventDefault();
                  return;
                }
                if (
                  tryStartTableResizeFromPointer(editorRef.current, e, {
                    onDone: () => {
                      syncEditorToState();
                      if (editorRef.current) editorRef.current.style.cursor = '';
                    },
                  })
                ) {
                  e.preventDefault();
                  pushHistorySnapshot();
                }
              }}
              onMouseMove={(e) => {
                if (mode !== 'text') return;
                updateTableResizeHoverCursor(editorRef.current, e.clientX, e.clientY);
              }}
              onMouseLeave={() => {
                if (editorRef.current) editorRef.current.style.cursor = '';
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
                touchAction: 'pan-y',
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
                ...presentationNotesTableSx(),
                '& table': {
                  width: 'min(100%, 520px)',
                  maxWidth: '100%',
                  marginLeft: '0 !important',
                  marginRight: 'auto',
                  float: 'none',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                  my: 1.25,
                  fontSize: '0.92em',
                  lineHeight: 1.35,
                },
                '& th, & td': {
                  border: '1px solid #bdbdbd',
                  padding: '6px 8px',
                  verticalAlign: 'top',
                  wordBreak: 'break-word',
                  minHeight: 28,
                  textAlign: 'left !important',
                },
                '& th': {
                  backgroundColor: '#eceff1',
                  fontWeight: 700,
                  textAlign: 'left !important',
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
                  bottom: -4,
                  right: -4,
                  width: 28,
                  height: 28,
                  bgcolor: '#f57f17',
                  border: '2px solid #fff',
                  borderRadius: '4px',
                  cursor: 'nwse-resize',
                  zIndex: 20,
                  opacity: '1 !important',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  pointerEvents: 'auto',
                  display: 'block',
                  boxSizing: 'border-box',
                  touchAction: 'none',
                },
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 2,
                touchAction: 'none',
                cursor: mode === 'eraser' ? 'cell' : mode === 'pen' ? 'crosshair' : 'text',
                pointerEvents: mode === 'text' ? 'none' : 'auto',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
              }}
            />
          </Box>
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
              {mode === 'eraser'
                ? 'Radierer · ⌘Z rückgängig'
                : mode === 'pen'
                  ? 'Stift · rund wie auf den Folien · ⌘Z rückgängig'
                  : 'Apple Pencil schreibt direkt · GoodNotes: Lasso, Kopieren, hier einfügen'}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
