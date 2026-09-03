import { slideImageUrl, type SlideElement } from './presentationDeck';
import {
  imageFrameIsActive,
  imageFrameParts,
  applyImageFrameFromShortcut,
  type SlideImageFrame,
} from './presentationImageFrames';
import { JOHNNY_PRESENTATION } from './presentationTheme';
import { stripTableSelectionHtml } from './presentationTableSelection';

/** Notiz-Grafiken im Textfluss (contentEditable): Größe am Eckpunkt, Entf löscht. */

export const PRES_NOTES_IMG_WRAP_CLASS = 'pres-notes-img-wrap';
export const PRES_NOTES_IMG_WRAP_ATTR = 'data-pres-notes-img-wrap';
export const PRES_NOTES_IMG_POS_ATTR = 'data-pres-notes-pos';
export const PRES_NOTES_IMG_ATTR = 'data-pres-notes-img';
export const PRES_NOTES_IMG_SELECTED_CLASS = 'pres-notes-img-selected';
export const PRES_NOTES_IMG_FRAME_ATTR = 'data-pres-notes-img-frame';
export const PRES_NOTES_IMG_FRAME_COLOR_ATTR = 'data-pres-notes-img-frame-color';
export const PRES_NOTES_IMG_FRAME_JSON_ATTR = 'data-pres-notes-img-frame-json';
export const PRES_NOTES_IMG_ROTATION_ATTR = 'data-pres-notes-img-rotation';
export const PRES_NOTES_IMG_CROP_ATTR = 'data-pres-notes-crop';
export const NOTES_IMAGE_ELEMENT_ID = 'notes-image';
export const NOTES_IMAGE_FRAME_DEFAULT_COLOR = '#C62828';
export const NOTES_IMAGE_FRAME_BLACK_COLOR = '#1a1a1a';
export const NOTES_IMAGE_FRAME_DEFAULT_WIDTH = 3;

const RESIZE_HANDLE_CLASS = 'pres-notes-img-resize';
const CROP_EDGE_CLASS = 'pres-notes-img-crop-edge';
const DROP_MARKER_CLASS = 'pres-notes-img-drop';
const BOUND_ATTR = 'data-pres-notes-img-bound';

type NotesImageCrop = {
  boxW: number;
  boxH: number;
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
};

const WRAP_FLOW_STYLE =
  'position:relative;display:inline-block;vertical-align:top;max-width:100%;width:fit-content;margin:0.25em 0.4em 0.25em 0;line-height:0;cursor:grab;';

function isPrimaryPointer(e: { pointerType?: string; button?: number }): boolean {
  if (e.pointerType === 'mouse') return e.button === 0;
  return true;
}

/** iPad: Element-Capture oft tot — Window-Listener mit capture. */
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

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function presentationNotesImageInsertHtml(src: string, alt = ''): string {
  const safeSrc = escapeAttr(src);
  const safeAlt = escapeAttr(alt);
  return (
    `<span class="${PRES_NOTES_IMG_WRAP_CLASS}" contenteditable="false" ${PRES_NOTES_IMG_WRAP_ATTR}="1" ` +
    `style="${WRAP_FLOW_STYLE}">` +
    `<img src="${safeSrc}" alt="${safeAlt}" ${PRES_NOTES_IMG_ATTR}="1" draggable="false" ` +
    `style="max-width:100%;width:auto;height:auto;display:block;border-radius:4px;" />` +
    `</span>`
  );
}

/** Editor-CSS: Bilder im Textfluss, Größe am Eckpunkt. */
export function presentationNotesImageEditorSx() {
  return {
    position: 'relative' as const,
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}`]: {
      position: 'relative',
      display: 'inline-block',
      verticalAlign: 'top',
      width: 'fit-content',
      maxWidth: '100%',
      lineHeight: 0,
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none',
      mr: 0.5,
      my: 0.25,
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS} img, & img[${PRES_NOTES_IMG_ATTR}]`]: {
      maxWidth: '100%',
      width: 'auto',
      height: 'auto',
      display: 'block',
      margin: 0,
      borderRadius: '4px',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_FRAME_ATTR}]:not([${PRES_NOTES_IMG_FRAME_JSON_ATTR}])`]: {
      border: `${NOTES_IMAGE_FRAME_DEFAULT_WIDTH}px solid ${NOTES_IMAGE_FRAME_DEFAULT_COLOR}`,
      boxSizing: 'border-box',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_CROP_ATTR}]`]: {
      overflow: 'hidden',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_CROP_ATTR}] img`]: {
      position: 'absolute',
      maxWidth: 'none',
      maxHeight: 'none',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_ROTATION_ATTR}]`]: {
      transformOrigin: 'center center',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}`]: {
      outline: '2px solid #f57f17',
      outlineOffset: '2px',
    },
    [`& .${CROP_EDGE_CLASS}`]: {
      position: 'absolute',
      zIndex: 4,
      background: 'transparent',
      touchAction: 'none',
      pointerEvents: 'auto',
    },
    [`& .${CROP_EDGE_CLASS}[data-edge="n"], & .${CROP_EDGE_CLASS}[data-edge="s"]`]: {
      left: 10,
      right: 10,
      height: 10,
      cursor: 'ns-resize',
    },
    [`& .${CROP_EDGE_CLASS}[data-edge="n"]`]: { top: 0 },
    [`& .${CROP_EDGE_CLASS}[data-edge="s"]`]: { bottom: 0 },
    [`& .${CROP_EDGE_CLASS}[data-edge="e"], & .${CROP_EDGE_CLASS}[data-edge="w"]`]: {
      top: 10,
      bottom: 10,
      width: 10,
      cursor: 'ew-resize',
    },
    [`& .${CROP_EDGE_CLASS}[data-edge="e"]`]: { right: 0 },
    [`& .${CROP_EDGE_CLASS}[data-edge="w"]`]: { left: 0 },
    [`& .${DROP_MARKER_CLASS}`]: {
      position: 'absolute',
      left: 8,
      right: 8,
      height: 3,
      bgcolor: '#f57f17',
      borderRadius: '1px',
      pointerEvents: 'none',
      zIndex: 6,
    },
    [`& .${RESIZE_HANDLE_CLASS}`]: {
      position: 'absolute',
      right: 1,
      bottom: 1,
      width: 18,
      height: 18,
      bgcolor: '#f57f17',
      border: '2px solid #fff',
      borderRadius: '4px',
      cursor: 'nwse-resize',
      zIndex: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
      pointerEvents: 'auto',
      boxSizing: 'border-box',
      touchAction: 'none',
      '@media (any-pointer: coarse)': {
        width: 28,
        height: 28,
        right: -4,
        bottom: -4,
      },
    },
  };
}

/** Anzeige (Laptop / Abgaben): gespeicherte Positionen respektieren. */
export function presentationNotesImageViewSx(options?: { maxHeight?: number | null }) {
  const maxHeight = options?.maxHeight;
  return {
    position: 'relative' as const,
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}`]: {
      position: 'relative',
      display: 'inline-block',
      verticalAlign: 'top',
      maxWidth: '100%',
      width: 'fit-content',
      lineHeight: 0,
      mr: 0.5,
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_FRAME_ATTR}]:not([${PRES_NOTES_IMG_FRAME_JSON_ATTR}])`]: {
      border: `${NOTES_IMAGE_FRAME_DEFAULT_WIDTH}px solid ${NOTES_IMAGE_FRAME_DEFAULT_COLOR}`,
      boxSizing: 'border-box',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_CROP_ATTR}]`]: {
      overflow: 'hidden',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_CROP_ATTR}] img`]: {
      position: 'absolute',
      maxWidth: 'none',
      maxHeight: 'none',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_ROTATION_ATTR}]`]: {
      transformOrigin: 'center center',
    },
    [`& img, & img[${PRES_NOTES_IMG_ATTR}]`]: {
      maxWidth: '100%',
      ...(maxHeight ? { maxHeight } : {}),
      width: 'auto',
      height: 'auto',
      objectFit: 'contain',
      display: 'block',
      my: 1,
      borderRadius: 0.75,
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS} img`]: {
      my: 0,
      ...(maxHeight ? { maxHeight } : {}),
    },
    [`& .${RESIZE_HANDLE_CLASS}`]: { display: 'none' },
  };
}

export function stripNotesImageChrome(root: ParentNode): void {
  root.querySelectorAll(`.${RESIZE_HANDLE_CLASS}, .${CROP_EDGE_CLASS}, .${DROP_MARKER_CLASS}`).forEach((n) => n.remove());
  root.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).forEach((node) => {
    const el = node as HTMLElement;
    el.style.outline = '';
    el.style.cursor = '';
    el.removeAttribute(BOUND_ATTR);
    el.classList.remove(PRES_NOTES_IMG_SELECTED_CLASS);
  });
}

export function serializePresentationNotesHtml(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  stripNotesImageChrome(clone);
  return stripTableSelectionHtml(clone.innerHTML);
}

export const JOHNNY_NOTES_COPY_ATTR = 'data-johnny-notes-copy';

function rangeCoversEditorContents(range: Range, editor: HTMLElement): boolean {
  const full = document.createRange();
  full.selectNodeContents(editor);
  try {
    return (
      range.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    );
  } catch {
    return false;
  }
}

/** Clipboard-Hülle, damit Einfügen die Notizen 1:1 erkennt und nicht als Word-Paste putzt. */
export function wrapJohnnyNotesCopyHtml(innerHtml: string): string {
  return `<!--johnny-notes-copy--><div ${JOHNNY_NOTES_COPY_ATTR}="1">${innerHtml}</div>`;
}

export function unwrapJohnnyNotesCopyHtml(html: string): string | null {
  if (!html || typeof document === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const marked = doc.querySelector(`[${JOHNNY_NOTES_COPY_ATTR}]`);
  if (marked) {
    stripNotesImageChrome(marked);
    return marked.innerHTML;
  }
  if (
    doc.body.querySelector(
      `[${PRES_NOTES_IMG_WRAP_ATTR}], [${PRES_NOTES_IMG_ATTR}], .${PRES_NOTES_IMG_WRAP_CLASS}`,
    )
  ) {
    stripNotesImageChrome(doc.body);
    return doc.body.innerHTML;
  }
  return null;
}

export const PRES_NOTES_DRAGGING_ATTR = 'data-pres-notes-dragging';

function notesEditorIsDragging(editor: HTMLElement | null): boolean {
  return editor?.getAttribute(PRES_NOTES_DRAGGING_ATTR) === '1';
}

function beginNotesDrag(editor: HTMLElement): void {
  editor.setAttribute(PRES_NOTES_DRAGGING_ATTR, '1');
}

function endNotesDrag(editor: HTMLElement, afterPersist?: () => void): void {
  afterPersist?.();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (editor.getAttribute(PRES_NOTES_DRAGGING_ATTR) === '1') {
        editor.removeAttribute(PRES_NOTES_DRAGGING_ATTR);
      }
    });
  });
}

function editorHasWidth(value: string): boolean {
  const v = value.trim();
  return Boolean(v) && v !== 'auto' && v !== 'fit-content';
}

/** Alte frei positionierte Notiz-Bilder zurück in den Textfluss holen. */
export function releaseNotesImagesToFlow(root: ParentNode): void {
  root.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).forEach((node) => {
    const el = node as HTMLElement;
    const keptWidth = el.style.width;
    el.removeAttribute(PRES_NOTES_IMG_POS_ATTR);
    el.style.cssText = WRAP_FLOW_STYLE;
    if (editorHasWidth(keptWidth)) {
      el.style.width = keptWidth;
      el.style.maxWidth = '100%';
    }
    applyNotesImageFrameStyleFromAttrs(el);
    applyNotesImageRotationStyle(el);
    const img = el.querySelector('img') as HTMLImageElement | null;
    if (notesImageCropIsOn(el) && img) {
      applyNotesImageCropStyle(el);
    } else if (img) {
      img.style.removeProperty('max-width');
      img.style.setProperty('max-width', '100%');
      img.style.setProperty('height', 'auto');
      img.style.setProperty('display', 'block');
      if (editorHasWidth(keptWidth)) {
        img.style.setProperty('width', '100%');
      } else {
        img.style.setProperty('width', 'auto');
      }
    }
  });
}

export function getSelectedNotesImageWrap(editor: HTMLElement | null): HTMLElement | null {
  if (!editor) return null;
  return editor.querySelector(
    `.${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}`,
  ) as HTMLElement | null;
}

export function notesImageFrameIsOn(wrap: HTMLElement): boolean {
  return wrap.getAttribute(PRES_NOTES_IMG_FRAME_ATTR) === '1' || Boolean(readNotesImageFrame(wrap));
}

function clearNotesImageFrameInlineStyle(wrap: HTMLElement): void {
  wrap.style.removeProperty('border');
  wrap.style.removeProperty('border-width');
  wrap.style.removeProperty('border-style');
  wrap.style.removeProperty('border-color');
  wrap.style.removeProperty('box-shadow');
  wrap.style.removeProperty('padding');
  wrap.style.removeProperty('background');
  wrap.style.removeProperty('border-radius');
}

function applyNotesImageFrameStyleFromAttrs(wrap: HTMLElement): void {
  const frame = readNotesImageFrame(wrap);
  if (!frame || !imageFrameIsActive(frame)) {
    if (wrap.getAttribute(PRES_NOTES_IMG_FRAME_ATTR) === '1') {
      const color = wrap.getAttribute(PRES_NOTES_IMG_FRAME_COLOR_ATTR) || NOTES_IMAGE_FRAME_DEFAULT_COLOR;
      wrap.style.border = `${NOTES_IMAGE_FRAME_DEFAULT_WIDTH}px solid ${color}`;
      wrap.style.boxSizing = 'border-box';
      return;
    }
    clearNotesImageFrameInlineStyle(wrap);
    return;
  }
  const parts = imageFrameParts(frame, 1, JOHNNY_PRESENTATION.primary);
  wrap.style.boxSizing = 'border-box';
  wrap.style.boxShadow = String(parts.wrap.boxShadow || '');
  wrap.style.borderRadius = String(parts.wrap.borderRadius || parts.inner.borderRadius || '');
  wrap.style.border = String(parts.inner.border || '');
  wrap.style.padding = String(parts.inner.padding || '');
  wrap.style.background = String(parts.inner.background || '');
}

export function readNotesImageFrame(wrap: HTMLElement): SlideImageFrame | undefined {
  const raw = wrap.getAttribute(PRES_NOTES_IMG_FRAME_JSON_ATTR);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SlideImageFrame;
      return imageFrameIsActive(parsed) ? parsed : undefined;
    } catch {
      /* fall through */
    }
  }
  if (wrap.getAttribute(PRES_NOTES_IMG_FRAME_ATTR) === '1') {
    return {
      preset: 'custom',
      color: wrap.getAttribute(PRES_NOTES_IMG_FRAME_COLOR_ATTR) || NOTES_IMAGE_FRAME_DEFAULT_COLOR,
      width: NOTES_IMAGE_FRAME_DEFAULT_WIDTH,
      dash: 'solid',
    };
  }
  return undefined;
}

export function writeNotesImageFrame(wrap: HTMLElement, frame?: SlideImageFrame | null): void {
  if (!frame || !imageFrameIsActive(frame)) {
    wrap.removeAttribute(PRES_NOTES_IMG_FRAME_ATTR);
    wrap.removeAttribute(PRES_NOTES_IMG_FRAME_COLOR_ATTR);
    wrap.removeAttribute(PRES_NOTES_IMG_FRAME_JSON_ATTR);
    clearNotesImageFrameInlineStyle(wrap);
    return;
  }
  wrap.setAttribute(PRES_NOTES_IMG_FRAME_ATTR, '1');
  if (frame.color) wrap.setAttribute(PRES_NOTES_IMG_FRAME_COLOR_ATTR, frame.color);
  wrap.setAttribute(PRES_NOTES_IMG_FRAME_JSON_ATTR, JSON.stringify(frame));
  applyNotesImageFrameStyleFromAttrs(wrap);
}

export function setNotesImageFrame(
  wrap: HTMLElement,
  on: boolean,
  color = NOTES_IMAGE_FRAME_DEFAULT_COLOR,
): void {
  writeNotesImageFrame(
    wrap,
    on
      ? { preset: 'custom', color, width: NOTES_IMAGE_FRAME_DEFAULT_WIDTH, dash: 'solid' }
      : undefined,
  );
}

/** Umschaltet die rote Umrandung am ausgewählten Notiz-Bild. */
export function toggleNotesImageFrame(editor: HTMLElement | null): boolean {
  const wrap = getSelectedNotesImageWrap(editor);
  if (!wrap) return false;
  setNotesImageFrame(wrap, !notesImageFrameIsOn(wrap));
  return true;
}

/** ⌘R: rot an/aus · doppeltes ⌘R: schwarz (wie auf Folien). */
export function applyNotesImageFrameShortcut(editor: HTMLElement | null): boolean {
  const wrap = getSelectedNotesImageWrap(editor);
  if (!wrap) return false;
  writeNotesImageFrame(wrap, applyImageFrameFromShortcut(readNotesImageFrame(wrap)));
  return true;
}

function normalizeNotesImageRotation(deg: number): number {
  return ((Math.round(deg) % 360) + 360) % 360;
}

export function getNotesImageRotation(wrap: HTMLElement): number {
  const raw = parseInt(wrap.getAttribute(PRES_NOTES_IMG_ROTATION_ATTR) || '0', 10);
  return Number.isFinite(raw) ? normalizeNotesImageRotation(raw) : 0;
}

function applyNotesImageRotationStyle(wrap: HTMLElement): void {
  const deg = getNotesImageRotation(wrap);
  if (deg === 0) {
    wrap.removeAttribute(PRES_NOTES_IMG_ROTATION_ATTR);
    wrap.style.removeProperty('transform');
    return;
  }
  wrap.setAttribute(PRES_NOTES_IMG_ROTATION_ATTR, String(deg));
  wrap.style.transform = `rotate(${deg}deg)`;
  wrap.style.transformOrigin = 'center center';
}

/** ±90° Drehung am ausgewählten Notiz-Bild. */
export function rotateSelectedNotesImage(editor: HTMLElement | null, delta: number): boolean {
  const wrap = getSelectedNotesImageWrap(editor);
  if (!wrap) return false;
  const next = normalizeNotesImageRotation(getNotesImageRotation(wrap) + delta);
  if (next === 0) wrap.removeAttribute(PRES_NOTES_IMG_ROTATION_ATTR);
  else wrap.setAttribute(PRES_NOTES_IMG_ROTATION_ATTR, String(next));
  applyNotesImageRotationStyle(wrap);
  return true;
}

function parseCropNumber(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function notesImageCropIsOn(wrap: HTMLElement): boolean {
  return wrap.getAttribute(PRES_NOTES_IMG_CROP_ATTR) === '1';
}

function readNotesImageCrop(wrap: HTMLElement): NotesImageCrop | null {
  if (!notesImageCropIsOn(wrap)) return null;
  const boxW = parseCropNumber(wrap.getAttribute('data-pres-notes-box-w'), 0);
  const boxH = parseCropNumber(wrap.getAttribute('data-pres-notes-box-h'), 0);
  const srcW = parseCropNumber(wrap.getAttribute('data-pres-notes-src-w'), boxW);
  const srcH = parseCropNumber(wrap.getAttribute('data-pres-notes-src-h'), boxH);
  if (boxW < 8 || boxH < 8 || srcW < 8 || srcH < 8) return null;
  return {
    boxW,
    boxH,
    srcX: parseCropNumber(wrap.getAttribute('data-pres-notes-src-x'), 0),
    srcY: parseCropNumber(wrap.getAttribute('data-pres-notes-src-y'), 0),
    srcW,
    srcH,
  };
}

function writeNotesImageCrop(wrap: HTMLElement, crop: NotesImageCrop): void {
  wrap.setAttribute(PRES_NOTES_IMG_CROP_ATTR, '1');
  wrap.setAttribute('data-pres-notes-box-w', String(Math.round(crop.boxW)));
  wrap.setAttribute('data-pres-notes-box-h', String(Math.round(crop.boxH)));
  wrap.setAttribute('data-pres-notes-src-x', String(Math.round(crop.srcX)));
  wrap.setAttribute('data-pres-notes-src-y', String(Math.round(crop.srcY)));
  wrap.setAttribute('data-pres-notes-src-w', String(Math.round(crop.srcW)));
  wrap.setAttribute('data-pres-notes-src-h', String(Math.round(crop.srcH)));
}

function applyNotesImageCropStyle(wrap: HTMLElement): void {
  const crop = readNotesImageCrop(wrap);
  const img = wrap.querySelector('img') as HTMLImageElement | null;
  if (!crop || !img) return;
  wrap.style.overflow = 'hidden';
  wrap.style.position = 'relative';
  wrap.style.width = `${crop.boxW}px`;
  wrap.style.maxWidth = '100%';
  wrap.style.aspectRatio = `${crop.boxW} / ${crop.boxH}`;
  wrap.style.height = 'auto';
  img.style.position = 'absolute';
  img.style.left = `${(crop.srcX / crop.boxW) * 100}%`;
  img.style.top = `${(crop.srcY / crop.boxH) * 100}%`;
  img.style.width = `${(crop.srcW / crop.boxW) * 100}%`;
  img.style.height = `${(crop.srcH / crop.boxH) * 100}%`;
  img.style.maxWidth = 'none';
  img.style.maxHeight = 'none';
  img.style.objectFit = 'fill';
}

function clearNotesImageCrop(wrap: HTMLElement): void {
  wrap.removeAttribute(PRES_NOTES_IMG_CROP_ATTR);
  wrap.removeAttribute('data-pres-notes-box-w');
  wrap.removeAttribute('data-pres-notes-box-h');
  wrap.removeAttribute('data-pres-notes-src-x');
  wrap.removeAttribute('data-pres-notes-src-y');
  wrap.removeAttribute('data-pres-notes-src-w');
  wrap.removeAttribute('data-pres-notes-src-h');
  wrap.style.removeProperty('overflow');
  wrap.style.removeProperty('aspect-ratio');
  wrap.style.removeProperty('height');
  const img = wrap.querySelector('img') as HTMLImageElement | null;
  if (img) {
    img.style.removeProperty('position');
    img.style.removeProperty('left');
    img.style.removeProperty('top');
    img.style.removeProperty('max-height');
    img.style.removeProperty('object-fit');
    img.style.setProperty('width', wrap.style.width ? '100%' : 'auto');
    img.style.setProperty('max-width', '100%');
    img.style.setProperty('height', 'auto');
  }
  wrap.querySelectorAll(`.${CROP_EDGE_CLASS}`).forEach((n) => n.remove());
}

function lockNotesImageCrop(wrap: HTMLElement): void {
  if (notesImageCropIsOn(wrap) && readNotesImageCrop(wrap)) {
    applyNotesImageCropStyle(wrap);
    return;
  }
  const img = wrap.querySelector('img') as HTMLImageElement | null;
  const rect = wrap.getBoundingClientRect();
  const imgRect = img?.getBoundingClientRect();
  const boxW = Math.max(48, rect.width || imgRect?.width || 160);
  const boxH = Math.max(36, rect.height || imgRect?.height || 120);
  writeNotesImageCrop(wrap, { boxW, boxH, srcX: 0, srcY: 0, srcW: boxW, srcH: boxH });
  applyNotesImageCropStyle(wrap);
}

function resetNotesImageCropWindow(wrap: HTMLElement): void {
  const crop = readNotesImageCrop(wrap);
  if (!crop) return;
  writeNotesImageCrop(wrap, {
    boxW: crop.srcW,
    boxH: crop.srcH,
    srcX: 0,
    srcY: 0,
    srcW: crop.srcW,
    srcH: crop.srcH,
  });
  applyNotesImageCropStyle(wrap);
}

const NOTES_CROP_SOURCE = { x: 0, y: 0, w: 40, h: 40 };
const NOTES_CROP_BOX = { x: 10, y: 10, w: 20, h: 15 };

export function notesWrapToSlideElement(wrap: HTMLElement): SlideElement {
  const img = wrap.querySelector('img') as HTMLImageElement | null;
  const crop = readNotesImageCrop(wrap);
  return {
    id: NOTES_IMAGE_ELEMENT_ID,
    type: 'image',
    src: img?.getAttribute('src')?.trim() || '',
    x: crop ? NOTES_CROP_BOX.x : 10,
    y: crop ? NOTES_CROP_BOX.y : 10,
    w: crop ? NOTES_CROP_BOX.w : 30,
    h: crop ? NOTES_CROP_BOX.h : 20,
    zIndex: 1,
    rotation: getNotesImageRotation(wrap) || undefined,
    imageFit: 'contain',
    imageSourceRect: crop ? { ...NOTES_CROP_SOURCE } : undefined,
    imageFrame: readNotesImageFrame(wrap),
  };
}

export function applyNotesImageElementPatch(wrap: HTMLElement, patch: Partial<SlideElement>): void {
  if ('imageSourceRect' in patch) {
    if (!patch.imageSourceRect) clearNotesImageCrop(wrap);
    else lockNotesImageCrop(wrap);
    const editor = wrap.closest('[data-pres-notes-zone="true"]') as HTMLElement | null;
    if (editor) {
      bindNotesImageCropEdges(wrap, editor, () => {
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  } else if (
    notesImageCropIsOn(wrap) &&
    patch.x === NOTES_CROP_SOURCE.x &&
    patch.y === NOTES_CROP_SOURCE.y &&
    patch.w === NOTES_CROP_SOURCE.w &&
    patch.h === NOTES_CROP_SOURCE.h
  ) {
    resetNotesImageCropWindow(wrap);
  }
  if (patch.rotation != null) {
    const next = normalizeNotesImageRotation(patch.rotation);
    if (next === 0) wrap.removeAttribute(PRES_NOTES_IMG_ROTATION_ATTR);
    else wrap.setAttribute(PRES_NOTES_IMG_ROTATION_ATTR, String(next));
    applyNotesImageRotationStyle(wrap);
  }
  if ('imageFrame' in patch) {
    writeNotesImageFrame(wrap, patch.imageFrame);
  }
}

export function deleteSelectedNotesImage(editor: HTMLElement | null): boolean {
  const wrap = getSelectedNotesImageWrap(editor);
  if (!wrap || !editor) return false;
  removeNotesImageWrap(wrap, editor);
  return true;
}

/** API-URL oder Pfad → speicherbarer Folien-Bildpfad (oder null = neu hochladen). */
export function notesImageSrcToSlidePath(src: string): string | null {
  const raw = (src || '').trim();
  if (!raw) return null;
  if (raw.startsWith('/api/file-system-paths/read-image')) {
    try {
      const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://local');
      const fp = u.searchParams.get('filePath');
      return fp?.trim() || null;
    } catch {
      return null;
    }
  }
  if (raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return null;
  if (raw.startsWith('/api/')) return null;
  return raw;
}

export type NotesImageToSlidePayload = {
  src: string;
  rotation: number;
  frameOn: boolean;
  frameColor: string;
  clientX: number;
  clientY: number;
  displayWidthPx: number;
  displayHeightPx: number;
};

export function takeNotesImagePayload(
  wrap: HTMLElement,
  clientX: number,
  clientY: number,
): NotesImageToSlidePayload | null {
  const img = wrap.querySelector('img') as HTMLImageElement | null;
  const src = img?.getAttribute('src')?.trim() || '';
  if (!src) return null;
  const rect = wrap.getBoundingClientRect();
  return {
    src,
    rotation: getNotesImageRotation(wrap),
    frameOn: notesImageFrameIsOn(wrap),
    frameColor: wrap.getAttribute(PRES_NOTES_IMG_FRAME_COLOR_ATTR) || NOTES_IMAGE_FRAME_DEFAULT_COLOR,
    clientX,
    clientY,
    displayWidthPx: Math.max(1, rect.width),
    displayHeightPx: Math.max(1, rect.height),
  };
}

export function slideSurfaceHits(clientX: number, clientY: number): HTMLElement | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.closest(`[${PRES_NOTES_DROP_ATTR}]`)) continue;
    if (node.closest('[data-pres-notes-zone="true"]')) continue;
    const slide = node.closest('[data-pres-slide]') as HTMLElement | null;
    if (slide) return slide;
  }
  return null;
}

export function applyNotesImageFlowToHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    releaseNotesImagesToFlow(doc.body);
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

export function clearNotesImageSelection(editor: HTMLElement): void {
  editor.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).forEach((node) => {
    const el = node as HTMLElement;
    el.classList.remove(PRES_NOTES_IMG_SELECTED_CLASS);
    el.style.outline = '';
  });
}

function selectNotesImageWrap(editor: HTMLElement, wrap: HTMLElement): void {
  clearNotesImageSelection(editor);
  wrap.classList.add(PRES_NOTES_IMG_SELECTED_CLASS);
  wrap.style.outline = '2px solid #f57f17';
  wrap.style.outlineOffset = '2px';
}

function isNotesImageWrap(node: Node | null): node is HTMLElement {
  return node instanceof HTMLElement && node.classList.contains(PRES_NOTES_IMG_WRAP_CLASS);
}

function skipEmptySibling(node: Node | null, dir: 'prev' | 'next'): Node | null {
  let n = node;
  while (n) {
    if (n.nodeType === Node.TEXT_NODE && !(n.textContent || '').replace(/\u00a0/g, '').trim()) {
      n = dir === 'prev' ? n.previousSibling : n.nextSibling;
      continue;
    }
    if (n instanceof HTMLElement && n.tagName === 'BR') {
      n = dir === 'prev' ? n.previousSibling : n.nextSibling;
      continue;
    }
    break;
  }
  return n;
}

function closestNotesBlock(node: Node, editor: HTMLElement): HTMLElement | null {
  let n: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (n && n !== editor) {
    if (n instanceof HTMLElement) {
      const tag = n.tagName;
      if (tag === 'P' || tag === 'LI' || tag === 'DIV' || tag === 'BLOCKQUOTE') return n;
    }
    n = n.parentNode;
  }
  return null;
}

function wrapAtEndOfPreviousBlock(node: Node, editor: HTMLElement): HTMLElement | null {
  const block = closestNotesBlock(node, editor);
  if (!block) return null;
  const prev = skipEmptySibling(block.previousSibling, 'prev');
  if (isNotesImageWrap(prev)) return prev;
  if (!(prev instanceof HTMLElement)) return null;
  const last = skipEmptySibling(prev.lastChild, 'prev');
  return isNotesImageWrap(last) ? last : null;
}

function wrapAtStartOfNextBlock(node: Node, editor: HTMLElement): HTMLElement | null {
  const block = closestNotesBlock(node, editor);
  if (!block) return null;
  const next = skipEmptySibling(block.nextSibling, 'next');
  if (isNotesImageWrap(next)) return next;
  if (!(next instanceof HTMLElement)) return null;
  const first = skipEmptySibling(next.firstChild, 'next');
  return isNotesImageWrap(first) ? first : null;
}

function findAdjacentNotesImageWrap(range: Range, key: 'Backspace' | 'Delete', editor: HTMLElement): HTMLElement | null {
  const container = range.startContainer;
  const offset = range.startOffset;

  if (key === 'Backspace') {
    if (container.nodeType === Node.TEXT_NODE) {
      if (offset > 0) return null;
      const prev = skipEmptySibling(container.previousSibling, 'prev');
      if (isNotesImageWrap(prev)) return prev;
      return wrapAtEndOfPreviousBlock(container, editor);
    }
    if (container.nodeType === Node.ELEMENT_NODE) {
      const el = container as HTMLElement;
      const childBefore = offset > 0 ? el.childNodes[offset - 1] : null;
      const prev = skipEmptySibling(childBefore, 'prev');
      if (isNotesImageWrap(prev)) return prev;
      if (offset === 0) return wrapAtEndOfPreviousBlock(el, editor);
    }
    return null;
  }

  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent || '';
    if (offset < text.length) return null;
    const next = skipEmptySibling(container.nextSibling, 'next');
    if (isNotesImageWrap(next)) return next;
    return wrapAtStartOfNextBlock(container, editor);
  }
  if (container.nodeType === Node.ELEMENT_NODE) {
    const el = container as HTMLElement;
    const childAfter = el.childNodes[offset] || null;
    const next = skipEmptySibling(childAfter, 'next');
    if (isNotesImageWrap(next)) return next;
    if (offset >= el.childNodes.length) return wrapAtStartOfNextBlock(el, editor);
  }
  return null;
}

function isEmptyNotesBlock(el: HTMLElement): boolean {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('br').forEach((b) => b.remove());
  return !(clone.textContent || '').replace(/\u00a0/g, ' ').trim() && !clone.querySelector('img');
}

function placeCaretAfterImageRemoval(
  editor: HTMLElement,
  parent: HTMLElement | null,
  nextSibling: ChildNode | null,
  prevSibling: ChildNode | null,
): void {
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (nextSibling && editor.contains(nextSibling)) {
    range.setStartBefore(nextSibling);
    range.collapse(true);
  } else if (prevSibling && editor.contains(prevSibling)) {
    range.setStartAfter(prevSibling);
    range.collapse(true);
  } else if (parent && editor.contains(parent)) {
    range.selectNodeContents(parent);
    range.collapse(false);
  } else {
    const host = ensureNotesTypingHost(editor);
    range.selectNodeContents(host);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function removeNotesImageWrap(wrap: HTMLElement, editor: HTMLElement): void {
  const parent = wrap.parentElement;
  const next = wrap.nextSibling;
  const prev = wrap.previousSibling;
  wrap.remove();
  if (parent && parent !== editor && isEmptyNotesBlock(parent)) {
    const afterBlock = parent.nextSibling;
    const beforeBlock = parent.previousSibling;
    parent.remove();
    placeCaretAfterImageRemoval(editor, editor, afterBlock, beforeBlock);
  } else {
    placeCaretAfterImageRemoval(editor, parent, next, prev);
  }
  ensureNotesTypingHost(editor);
}

/** Entf/Rücktaste: ausgewählte oder benachbarte Notiz-Grafik löschen. */
export function handleNotesImageDeleteKey(
  editor: HTMLElement,
  key: 'Backspace' | 'Delete',
  onBeforeRemove?: () => void,
): boolean {
  const selected = editor.querySelector(
    `.${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}`,
  ) as HTMLElement | null;
  if (selected) {
    onBeforeRemove?.();
    removeNotesImageWrap(selected, editor);
    return true;
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;

  const wrap = findAdjacentNotesImageWrap(range, key, editor);
  if (!wrap || !editor.contains(wrap)) return false;
  onBeforeRemove?.();
  removeNotesImageWrap(wrap, editor);
  return true;
}

function ensureNotesImageWrap(img: HTMLImageElement): HTMLElement {
  const parent = img.parentElement;
  if (parent?.classList.contains(PRES_NOTES_IMG_WRAP_CLASS)) {
    parent.setAttribute('contenteditable', 'false');
    parent.setAttribute(PRES_NOTES_IMG_WRAP_ATTR, '1');
    img.setAttribute(PRES_NOTES_IMG_ATTR, '1');
    img.setAttribute('draggable', 'false');
    return parent;
  }
  const wrap = document.createElement('span');
  wrap.className = PRES_NOTES_IMG_WRAP_CLASS;
  wrap.setAttribute('contenteditable', 'false');
  wrap.setAttribute(PRES_NOTES_IMG_WRAP_ATTR, '1');
  wrap.style.cssText = WRAP_FLOW_STYLE;
  parent?.insertBefore(wrap, img);
  wrap.appendChild(img);
  img.setAttribute(PRES_NOTES_IMG_ATTR, '1');
  img.setAttribute('draggable', 'false');
  img.style.display = 'block';
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.borderRadius = img.style.borderRadius || '4px';
  return wrap;
}

function notesCaretRangeFromPoint(editor: HTMLElement, x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (cx: number, cy: number) => Range | null;
    caretPositionFromPoint?: (cx: number, cy: number) => { offsetNode: Node; offset: number } | null;
  };
  let range = doc.caretRangeFromPoint?.(x, y) ?? null;
  if (!range && doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos?.offsetNode) {
      range = document.createRange();
      try {
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      } catch {
        return null;
      }
    }
  }
  if (!range || !editor.contains(range.startContainer)) return null;
  return range;
}

function takeNotesImageWrap(wrap: HTMLElement, editor: HTMLElement): HTMLElement {
  const parent = wrap.parentElement;
  wrap.remove();
  if (parent && parent !== editor && parent.tagName === 'P' && isEmptyNotesBlock(parent)) {
    parent.remove();
  }
  return wrap;
}

function dropRelationToWrap(other: HTMLElement, x: number, y: number): 'left' | 'right' | 'above' | 'below' {
  const r = other.getBoundingClientRect();
  const inY = y >= r.top - 10 && y <= r.bottom + 10;
  if (inY) return x < r.left + r.width / 2 ? 'left' : 'right';
  return y < r.top + r.height / 2 ? 'above' : 'below';
}

function fitNotesImagesSideBySide(a: HTMLElement, b: HTMLElement, editor: HTMLElement): void {
  const budget = Math.max(72, Math.floor((editor.clientWidth - 28) / 2));
  const aw = a.getBoundingClientRect().width;
  const bw = b.getBoundingClientRect().width;
  if (aw + bw <= editor.clientWidth - 20) return;
  const sizeWrap = (el: HTMLElement, w: number) => {
    el.style.width = `${w}px`;
    el.style.maxWidth = '100%';
    const img = el.querySelector('img') as HTMLImageElement | null;
    if (!img) return;
    img.style.setProperty('width', '100%');
    img.style.setProperty('max-width', '100%');
    img.style.setProperty('height', 'auto');
  };
  sizeWrap(a, budget);
  sizeWrap(b, budget);
}

function ensureNotesDropMarker(editor: HTMLElement): HTMLElement {
  let marker = editor.querySelector(`.${DROP_MARKER_CLASS}`) as HTMLElement | null;
  if (!marker) {
    marker = document.createElement('span');
    marker.className = DROP_MARKER_CLASS;
    marker.setAttribute('contenteditable', 'false');
    marker.style.cssText =
      'position:absolute;left:8px;right:8px;height:3px;background:#f57f17;border-radius:1px;pointer-events:none;z-index:6;';
    editor.appendChild(marker);
  }
  return marker;
}

function updateNotesDropMarker(
  editor: HTMLElement,
  marker: HTMLElement,
  wrap: HTMLElement,
  x: number,
  y: number,
): void {
  const er = editor.getBoundingClientRect();
  const other = notesImageWrapFromPoint(editor, wrap, x, y);
  marker.style.display = 'block';
  marker.style.background = '#f57f17';
  if (other) {
    const rel = dropRelationToWrap(other, x, y);
    const r = other.getBoundingClientRect();
    if (rel === 'left' || rel === 'right') {
      marker.style.width = '3px';
      marker.style.height = `${Math.round(r.height)}px`;
      marker.style.left = `${Math.round((rel === 'left' ? r.left : r.right) - er.left - 1)}px`;
      marker.style.right = 'auto';
      marker.style.top = `${Math.round(r.top - er.top + editor.scrollTop)}px`;
      return;
    }
    marker.style.left = '8px';
    marker.style.right = '8px';
    marker.style.width = 'auto';
    marker.style.height = '3px';
    marker.style.top = `${Math.max(0, Math.round((rel === 'above' ? r.top : r.bottom) - er.top + editor.scrollTop - 1))}px`;
    return;
  }
  marker.style.left = '8px';
  marker.style.right = '8px';
  marker.style.width = 'auto';
  marker.style.height = '3px';
  const range = notesCaretRangeFromPoint(editor, x, y);
  const rect = range?.getClientRects()[0] || range?.getBoundingClientRect();
  const top = rect && (rect.height || rect.width) ? rect.top : y;
  marker.style.top = `${Math.max(0, Math.round(top - er.top + editor.scrollTop - 1))}px`;
}

function notesImageWrapFromPoint(editor: HTMLElement, moving: HTMLElement | null, x: number, y: number): HTMLElement | null {
  const hit = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!hit || !editor.contains(hit)) return null;
  const wrap = hit.closest(`.${PRES_NOTES_IMG_WRAP_CLASS}`) as HTMLElement | null;
  if (!wrap || wrap === moving || !editor.contains(wrap)) return null;
  return wrap;
}

function moveNotesImageToPoint(wrap: HTMLElement, editor: HTMLElement, x: number, y: number): boolean {
  const er = editor.getBoundingClientRect();
  if (x < er.left - 8 || x > er.right + 8 || y < er.top - 8 || y > er.bottom + 8) return false;

  const other = notesImageWrapFromPoint(editor, wrap, x, y);
  if (other) {
    const rel = dropRelationToWrap(other, x, y);
    takeNotesImageWrap(wrap, editor);
    if (rel === 'left' || rel === 'right') {
      other.parentNode?.insertBefore(wrap, rel === 'left' ? other : other.nextSibling);
      fitNotesImagesSideBySide(wrap, other, editor);
      return true;
    }
    const block = closestNotesBlock(other, editor) || other;
    const line = document.createElement('p');
    line.appendChild(wrap);
    block.parentNode?.insertBefore(line, rel === 'above' ? block : block.nextSibling);
    return true;
  }

  const range = notesCaretRangeFromPoint(editor, x, y);
  takeNotesImageWrap(wrap, editor);
  if (range && editor.contains(range.startContainer) && !wrap.contains(range.startContainer)) {
    try {
      range.insertNode(wrap);
      return true;
    } catch {
      /* fall through */
    }
  }
  const hosts = editor.querySelectorAll(`p[${NOTES_TYPEHOST_ATTR}]`);
  const host = hosts[hosts.length - 1] as HTMLElement | undefined;
  if (host) editor.insertBefore(wrap, host);
  else editor.appendChild(wrap);
  return true;
}

function notesWrapsAreNeighbors(a: HTMLElement, b: HTMLElement): boolean {
  if (a.nextElementSibling === b || b.nextElementSibling === a) return true;
  const ap = a.parentElement;
  const bp = b.parentElement;
  if (ap && bp && ap !== bp && ap.nextElementSibling === bp) {
    const aSolo = ap.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).length === 1;
    const bSolo = bp.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).length === 1;
    return aSolo && bSolo;
  }
  return false;
}

/** Zwei gleiche, direkt hintereinander eingefügte Grafiken auf eine reduzieren. */
export function dedupeAdjacentNotesImages(root: ParentNode): void {
  const wraps = Array.from(root.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`)) as HTMLElement[];
  for (let i = wraps.length - 1; i > 0; i -= 1) {
    const cur = wraps[i];
    const prev = wraps[i - 1];
    const srcA = (cur.querySelector('img') as HTMLImageElement | null)?.getAttribute('src');
    const srcB = (prev.querySelector('img') as HTMLImageElement | null)?.getAttribute('src');
    if (!srcA || srcA !== srcB) continue;
    if (!notesWrapsAreNeighbors(prev, cur)) continue;
    const parent = cur.parentElement;
    cur.remove();
    if (parent && parent !== root && parent instanceof HTMLElement && parent.tagName === 'P' && isEmptyNotesBlock(parent)) {
      parent.remove();
    }
  }
}

function bindNotesImageCropEdges(
  wrap: HTMLElement,
  editor: HTMLElement,
  onChange: () => void,
): void {
  wrap.querySelectorAll(`.${CROP_EDGE_CLASS}`).forEach((n) => n.remove());
  if (!notesImageCropIsOn(wrap)) return;
  (['n', 's', 'e', 'w'] as const).forEach((edge) => {
    const handle = document.createElement('span');
    handle.className = CROP_EDGE_CLASS;
    handle.setAttribute('data-edge', edge);
    handle.setAttribute('contenteditable', 'false');
    handle.setAttribute('aria-label', 'Ausschnitt ziehen');
    wrap.appendChild(handle);
    handle.addEventListener('pointerdown', (e) => {
      if (!isPrimaryPointer(e)) return;
      const crop0 = readNotesImageCrop(wrap);
      if (!crop0) return;
      beginNotesDrag(editor);
      e.preventDefault();
      e.stopPropagation();
      selectNotesImageWrap(editor, wrap);
      const startX = e.clientX;
      const startY = e.clientY;
      listenWindowPointerDrag(
        e.pointerId,
        (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const next = { ...crop0 };
          const minBox = 28;
          if (edge === 'e') {
            next.boxW = Math.max(minBox, Math.min(crop0.srcX + crop0.srcW - 4, crop0.boxW + dx));
          } else if (edge === 'w') {
            const nextW = Math.max(minBox, crop0.boxW - dx);
            const shift = crop0.boxW - nextW;
            next.boxW = nextW;
            next.srcX = crop0.srcX - shift;
          } else if (edge === 's') {
            next.boxH = Math.max(minBox, Math.min(crop0.srcY + crop0.srcH - 4, crop0.boxH + dy));
          } else if (edge === 'n') {
            const nextH = Math.max(minBox, crop0.boxH - dy);
            const shift = crop0.boxH - nextH;
            next.boxH = nextH;
            next.srcY = crop0.srcY - shift;
          }
          writeNotesImageCrop(wrap, next);
          applyNotesImageCropStyle(wrap);
        },
        () => {
          endNotesDrag(editor, () => {
            ensureNotesTypingHost(editor);
            onChange();
          });
        },
      );
    });
  });
}

function bindNotesImage(
  wrap: HTMLElement,
  img: HTMLImageElement,
  editor: HTMLElement,
  onChange: () => void,
  onMoveToSlide?: (payload: NotesImageToSlidePayload) => boolean | Promise<boolean>,
) {
  if (wrap.getAttribute(BOUND_ATTR) === '2') return;
  if (wrap.getAttribute(BOUND_ATTR)) {
    const fresh = wrap.cloneNode(true) as HTMLElement;
    fresh.removeAttribute(BOUND_ATTR);
    wrap.parentNode?.replaceChild(fresh, wrap);
    wrap = fresh;
    const nextImg = wrap.querySelector('img') as HTMLImageElement | null;
    if (!nextImg) return;
    img = nextImg;
  }
  wrap.setAttribute(BOUND_ATTR, '2');
  wrap.setAttribute('contenteditable', 'false');
  applyNotesImageRotationStyle(wrap);
  applyNotesImageFrameStyleFromAttrs(wrap);
  if (notesImageCropIsOn(wrap)) applyNotesImageCropStyle(wrap);
  bindNotesImageCropEdges(wrap, editor, onChange);

  let handleEl = wrap.querySelector(`.${RESIZE_HANDLE_CLASS}`) as HTMLElement | null;
  if (!handleEl) {
    handleEl = document.createElement('span');
    handleEl.className = RESIZE_HANDLE_CLASS;
    handleEl.setAttribute('contenteditable', 'false');
    handleEl.setAttribute('aria-label', 'Bildgröße ändern');
    handleEl.title = 'Ziehen: Notizen oder zurück auf Folie · Ecke: Größe · Entf: löschen';
    wrap.appendChild(handleEl);
  }
  const handle: HTMLElement = handleEl;

  handle.addEventListener('pointerdown', (e) => {
    if (!isPrimaryPointer(e)) return;
    beginNotesDrag(editor);
    e.preventDefault();
    e.stopPropagation();
    selectNotesImageWrap(editor, wrap);
    editor.focus({ preventScroll: true });
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width || img.offsetWidth || 160;
    const maxW = Math.max(80, editor.clientWidth - 16);
    document.body.style.cursor = 'nwse-resize';
    listenWindowPointerDrag(
      e.pointerId,
      (ev) => {
        const nextW = Math.max(48, Math.min(maxW, startW + (ev.clientX - startX)));
        const crop = readNotesImageCrop(wrap);
        if (crop) {
          const scale = nextW / Math.max(crop.boxW, 1);
          writeNotesImageCrop(wrap, {
            boxW: crop.boxW * scale,
            boxH: crop.boxH * scale,
            srcX: crop.srcX * scale,
            srcY: crop.srcY * scale,
            srcW: crop.srcW * scale,
            srcH: crop.srcH * scale,
          });
          applyNotesImageCropStyle(wrap);
          return;
        }
        wrap.style.width = `${Math.round(nextW)}px`;
        wrap.style.maxWidth = '100%';
        img.style.setProperty('width', '100%', 'important');
        img.style.setProperty('max-width', '100%', 'important');
        img.style.setProperty('height', 'auto', 'important');
      },
      () => {
        document.body.style.cursor = '';
        endNotesDrag(editor, () => {
          ensureNotesTypingHost(editor);
          onChange();
        });
      },
    );
  });

  wrap.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest(`.${RESIZE_HANDLE_CLASS}`)) return;
    if (!isPrimaryPointer(e)) return;
    beginNotesDrag(editor);
    e.preventDefault();
    e.stopPropagation();
    selectNotesImageWrap(editor, wrap);
    editor.focus({ preventScroll: true });
    const originX = e.clientX;
    const originY = e.clientY;
    const grab = wrap.getBoundingClientRect();
    const grabX = e.clientX - grab.left;
    const grabY = e.clientY - grab.top;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let marker: HTMLElement | null = null;

    listenWindowPointerDrag(
      e.pointerId,
      (ev) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - originX, ev.clientY - originY) < 6) return;
          dragging = true;
          wrap.style.opacity = '0.35';
          wrap.style.pointerEvents = 'none';
          wrap.style.cursor = 'grabbing';
          ghost = wrap.cloneNode(true) as HTMLElement;
          ghost.removeAttribute(BOUND_ATTR);
          ghost.classList.remove(PRES_NOTES_IMG_SELECTED_CLASS);
          ghost.querySelector(`.${RESIZE_HANDLE_CLASS}`)?.remove();
          ghost.style.position = 'fixed';
          ghost.style.left = `${ev.clientX - grabX}px`;
          ghost.style.top = `${ev.clientY - grabY}px`;
          ghost.style.margin = '0';
          ghost.style.zIndex = '10000';
          ghost.style.opacity = '0.9';
          ghost.style.pointerEvents = 'none';
          ghost.style.outline = '2px solid #f57f17';
          ghost.style.width = `${Math.round(grab.width)}px`;
          document.body.appendChild(ghost);
          marker = ensureNotesDropMarker(editor);
          document.body.style.cursor = 'grabbing';
        }
        const box = editor.getBoundingClientRect();
        if (ev.clientY < box.top + 28) editor.scrollTop -= 16;
        else if (ev.clientY > box.bottom - 28) editor.scrollTop += 16;
        if (ghost) {
          ghost.style.left = `${ev.clientX - grabX}px`;
          ghost.style.top = `${ev.clientY - grabY}px`;
        }
        if (marker) updateNotesDropMarker(editor, marker, wrap, ev.clientX, ev.clientY);
      },
      (ev) => {
        wrap.style.opacity = '';
        wrap.style.pointerEvents = '';
        wrap.style.cursor = '';
        ghost?.remove();
        marker?.remove();
        document.body.style.cursor = '';
        let moved = false;
        if (dragging) {
          moved = moveNotesImageToPoint(wrap, editor, ev.clientX, ev.clientY);
          if (!moved && onMoveToSlide && slideSurfaceHits(ev.clientX, ev.clientY)) {
            const payload = takeNotesImagePayload(wrap, ev.clientX, ev.clientY);
            if (payload) {
              void (async () => {
                let ok = false;
                try {
                  ok = Boolean(await Promise.resolve(onMoveToSlide(payload)));
                } catch {
                  ok = false;
                }
                if (ok) {
                  removeNotesImageWrap(wrap, editor);
                  endNotesDrag(editor, () => {
                    ensureNotesTypingHost(editor);
                    onChange();
                  });
                  return;
                }
                selectNotesImageWrap(editor, wrap);
                endNotesDrag(editor, () => ensureNotesTypingHost(editor));
              })();
              return;
            }
          }
          selectNotesImageWrap(editor, wrap);
        }
        endNotesDrag(editor, () => {
          ensureNotesTypingHost(editor);
          if (moved) onChange();
        });
      },
    );
  });

  wrap.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectNotesImageWrap(editor, wrap);
    editor.focus({ preventScroll: true });
  });
}

const NOTES_TYPEHOST_ATTR = 'data-pres-notes-typehost';

/** Solange nur Bilder (contenteditable=false) in den Notizen stehen, gibt es keinen Caret. */
export function ensureNotesTypingHost(editor: HTMLElement): HTMLElement {
  const hosts = editor.querySelectorAll(`p[${NOTES_TYPEHOST_ATTR}]`);
  let host = hosts[hosts.length - 1] as HTMLElement | null;
  if (!host) {
    const last = editor.lastElementChild as HTMLElement | null;
    const lastIsEmptyTextP =
      last &&
      last.tagName === 'P' &&
      !last.querySelector('img, [contenteditable="false"]') &&
      !(last.textContent || '').replace(/\u00a0/g, ' ').trim();
    if (lastIsEmptyTextP) {
      host = last;
    } else {
      host = document.createElement('p');
      host.appendChild(document.createElement('br'));
      editor.appendChild(host);
    }
    host.setAttribute(NOTES_TYPEHOST_ATTR, '1');
  }

  host.style.removeProperty('margin-top');
  if (!host.querySelector('br') && !(host.textContent || '').trim()) {
    host.appendChild(document.createElement('br'));
  }
  return host;
}

export function placeNotesCaretAtPoint(editor: HTMLElement, clientX: number, clientY: number): boolean {
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return false;
  const wrap = notesImageWrapFromPoint(editor, null, clientX, clientY);
  if (wrap && editor.contains(wrap)) {
    const r = wrap.getBoundingClientRect();
    const after = clientX > r.left + r.width / 2 || clientY > r.top + r.height / 2;
    const range = document.createRange();
    if (after) range.setStartAfter(wrap);
    else range.setStartBefore(wrap);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  const range = notesCaretRangeFromPoint(editor, clientX, clientY);
  if (range && editor.contains(range.startContainer)) {
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  const end = document.createRange();
  end.selectNodeContents(editor);
  end.collapse(false);
  sel.removeAllRanges();
  sel.addRange(end);
  return true;
}

export function selectAllNotesContent(editor: HTMLElement): void {
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(editor);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** HTML für ⌘C: Auswahl, sonst markiertes Bild, sonst ganze Notiz (inkl. Bilder). */
export function notesClipboardHtml(editor: HTMLElement): string {
  const sel = window.getSelection();
  if (
    sel &&
    sel.rangeCount > 0 &&
    !sel.isCollapsed &&
    editor.contains(sel.anchorNode) &&
    editor.contains(sel.focusNode)
  ) {
    const range = sel.getRangeAt(0);
    if (rangeCoversEditorContents(range, editor)) {
      return serializePresentationNotesHtml(editor);
    }
    const holder = document.createElement('div');
    holder.appendChild(range.cloneContents());
    return serializePresentationNotesHtml(holder);
  }
  const selected = editor.querySelector(
    `.${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}`,
  ) as HTMLElement | null;
  if (selected) {
    const holder = document.createElement('div');
    holder.appendChild(selected.cloneNode(true));
    return serializePresentationNotesHtml(holder);
  }
  return serializePresentationNotesHtml(editor);
}

export function placeNotesCaretInTypingHost(editor: HTMLElement): void {
  const host = ensureNotesTypingHost(editor);
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(host);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Resize-Handles an alle Notiz-Bilder hängen; Grafiken bleiben im Textfluss. */
export function enhancePresentationNotesImages(
  editor: HTMLElement | null,
  onChange: () => void,
  options?: {
    skipDedupe?: boolean;
    onMoveToSlide?: (payload: NotesImageToSlidePayload) => boolean | Promise<boolean>;
  },
): void {
  if (!editor || notesEditorIsDragging(editor)) return;
  releaseNotesImagesToFlow(editor);
  editor.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement;
    if (!img.getAttribute('src')) return;
    const wrap = ensureNotesImageWrap(img);
    bindNotesImage(wrap, img, editor, onChange, options?.onMoveToSlide);
  });
  if (!options?.skipDedupe) dedupeAdjacentNotesImages(editor);
  ensureNotesTypingHost(editor);
}

/** Drop-Ziel: Notizleiste (auch wenn das gezogene Folien-Element darüber liegt). */
export const PRES_NOTES_DROP_ATTR = 'data-pres-notes-drop';

export function notesDropTargetHits(clientX: number, clientY: number): boolean {
  const targets = document.querySelectorAll(`[${PRES_NOTES_DROP_ATTR}]`);
  for (const node of targets) {
    const r = node.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return true;
    }
  }
  return false;
}

export function slideElementToNotesInsertHtml(el: SlideElement): string | null {
  if (el.type === 'image' && el.src?.trim()) {
    const name = (el.src.split('/').pop() || 'Bild').replace(/\+/g, ' ');
    let html = presentationNotesImageInsertHtml(slideImageUrl(el.src, 960), name);
    const rotation = normalizeNotesImageRotation(el.rotation ?? 0);
    if (rotation !== 0) {
      html = html.replace(
        `style="${WRAP_FLOW_STYLE}"`,
        `${PRES_NOTES_IMG_ROTATION_ATTR}="${rotation}" style="${WRAP_FLOW_STYLE}transform:rotate(${rotation}deg);transform-origin:center center;"`,
      );
    }
    return html;
  }
  if (el.type === 'text' && el.html?.trim()) return el.html;
  if (el.type === 'card') {
    const title = el.titleHtml?.trim() || '';
    const body = el.html?.trim() || '';
    if (!title && !body) return null;
    return `${title}${body}`;
  }
  if (el.type === 'table' && el.html?.trim()) return el.html;
  if ((el.type === 'video' || el.type === 'embed') && el.src?.trim()) {
    const href = escapeAttr(el.src);
    return `<p><a href="${href}">${href}</a></p>`;
  }
  return null;
}

function appendNotesHtml(existing: string, extra: string): string {
  const base = (existing || '').trim();
  if (!base || base === '<p><br></p>' || base === '<p></p>') return extra;
  return `${base}${extra}`;
}

function setCaretInNotesEditor(editor: HTMLElement, clientX?: number, clientY?: number) {
  const sel = window.getSelection();
  if (!sel) return;
  if (typeof clientX === 'number' && typeof clientY === 'number') {
    const caretDoc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const range = caretDoc.caretRangeFromPoint?.(clientX, clientY);
    if (range && editor.contains(range.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  }
  const end = document.createRange();
  end.selectNodeContents(editor);
  end.collapse(false);
  sel.removeAllRanges();
  sel.addRange(end);
}

/** HTML in das offene Notizfeld einfügen. false = Panel zu / kein Editor. */
export function insertHtmlIntoOpenNotesEditor(
  html: string,
  clientX?: number,
  clientY?: number,
): boolean {
  const editor = document.querySelector('[data-pres-notes-zone="true"]') as HTMLElement | null;
  if (!editor || editor.getAttribute('contenteditable') === 'false') return false;
  editor.focus({ preventScroll: true });
  if (typeof clientX === 'number' && typeof clientY === 'number') {
    placeNotesCaretAtPoint(editor, clientX, clientY);
  } else {
    setCaretInNotesEditor(editor);
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const frag = tpl.content;
  if (!frag.childNodes.length) return false;
  const last = frag.lastChild;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(frag);
    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    editor.appendChild(frag);
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

export function appendHtmlToNotesValue(existing: string, extra: string): string {
  return appendNotesHtml(existing, extra);
}
