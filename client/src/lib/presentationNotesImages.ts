import { slideImageUrl, type SlideElement } from './presentationDeck';

/** Frei verschiebbare Bilder in Folien-Notizen (contentEditable). */

export const PRES_NOTES_IMG_WRAP_CLASS = 'pres-notes-img-wrap';
export const PRES_NOTES_IMG_WRAP_ATTR = 'data-pres-notes-img-wrap';
export const PRES_NOTES_IMG_POS_ATTR = 'data-pres-notes-pos';
export const PRES_NOTES_IMG_ATTR = 'data-pres-notes-img';

const RESIZE_HANDLE_CLASS = 'pres-notes-img-resize';
const BOUND_ATTR = 'data-pres-notes-img-bound';

const WRAP_FLOW_STYLE =
  'position:relative;display:inline-block;width:fit-content;max-width:100%;vertical-align:middle;line-height:0;margin:0.45em 0.25em;cursor:grab;';

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

/** Editor-CSS: Bilder dürfen frei liegen, ohne den Textfluss zu sprengen. */
export function presentationNotesImageEditorSx() {
  return {
    position: 'relative' as const,
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}`]: {
      position: 'relative',
      display: 'inline-block',
      maxWidth: '100%',
      verticalAlign: 'middle',
      lineHeight: 0,
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_POS_ATTR}="1"]`]: {
      position: 'absolute',
      margin: 0,
      zIndex: 3,
      maxWidth: 'none',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS} img, & img[${PRES_NOTES_IMG_ATTR}]`]: {
      maxWidth: '100%',
      height: 'auto',
      display: 'block',
      margin: 0,
      borderRadius: '4px',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_POS_ATTR}="1"] img`]: {
      maxWidth: 'none',
      width: '100%',
      height: 'auto',
    },
    [`& .${RESIZE_HANDLE_CLASS}`]: {
      position: 'absolute',
      right: 1,
      bottom: 1,
      width: 14,
      height: 14,
      bgcolor: '#f57f17',
      border: '2px solid #fff',
      borderRadius: '3px',
      cursor: 'nwse-resize',
      zIndex: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
      pointerEvents: 'auto',
      boxSizing: 'border-box',
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
      maxWidth: '100%',
      verticalAlign: 'middle',
      lineHeight: 0,
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_POS_ATTR}="1"]`]: {
      position: 'absolute',
      margin: 0,
      zIndex: 2,
      maxWidth: 'none',
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
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}[${PRES_NOTES_IMG_POS_ATTR}="1"] img`]: {
      maxWidth: 'none',
      maxHeight: 'none',
      width: '100%',
      height: 'auto',
      my: 0,
    },
    [`& .${RESIZE_HANDLE_CLASS}`]: { display: 'none' },
  };
}

export function stripNotesImageChrome(root: ParentNode): void {
  root.querySelectorAll(`.${RESIZE_HANDLE_CLASS}`).forEach((n) => n.remove());
  root.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).forEach((node) => {
    const el = node as HTMLElement;
    el.style.outline = '';
    el.style.cursor = el.getAttribute(PRES_NOTES_IMG_POS_ATTR) === '1' ? 'grab' : '';
    el.removeAttribute(BOUND_ATTR);
    el.classList.remove('pres-notes-img-selected');
  });
}

export function serializePresentationNotesHtml(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  stripNotesImageChrome(clone);
  return clone.innerHTML;
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

function editorPadding(editor: HTMLElement): { left: number; top: number } {
  const cs = getComputedStyle(editor);
  return {
    left: (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0),
    top: (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0),
  };
}

function pinWrapToEditor(wrap: HTMLElement, editor: HTMLElement): void {
  const er = editor.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  const pad = editorPadding(editor);
  const left = Math.round(wr.left - er.left - pad.left + editor.scrollLeft);
  const top = Math.round(wr.top - er.top - pad.top + editor.scrollTop);
  const width = Math.round(wr.width);
  wrap.style.position = 'absolute';
  wrap.style.left = `${Math.max(0, left)}px`;
  wrap.style.top = `${Math.max(0, top)}px`;
  wrap.style.width = `${Math.max(48, width)}px`;
  wrap.style.margin = '0';
  wrap.style.maxWidth = 'none';
  wrap.style.zIndex = '3';
  wrap.setAttribute(PRES_NOTES_IMG_POS_ATTR, '1');
  const img = wrap.querySelector('img') as HTMLImageElement | null;
  if (img) {
    img.style.setProperty('width', '100%', 'important');
    img.style.setProperty('max-width', 'none', 'important');
    img.style.setProperty('height', 'auto', 'important');
  }
}

function ensureNotesImageWrap(img: HTMLImageElement): HTMLElement {
  const parent = img.parentElement;
  if (parent?.classList.contains(PRES_NOTES_IMG_WRAP_CLASS)) {
    parent.setAttribute('contenteditable', 'false');
    parent.setAttribute(PRES_NOTES_IMG_WRAP_ATTR, '1');
    if (parent.getAttribute(PRES_NOTES_IMG_POS_ATTR) !== '1') {
      parent.style.position = parent.style.position || 'relative';
      parent.style.display = parent.style.display || 'inline-block';
      parent.style.maxWidth = parent.style.maxWidth || '100%';
      parent.style.verticalAlign = parent.style.verticalAlign || 'middle';
      parent.style.lineHeight = parent.style.lineHeight || '0';
      parent.style.cursor = parent.style.cursor || 'grab';
    }
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
  img.style.borderRadius = img.style.borderRadius || '4px';
  return wrap;
}

function bindNotesImage(wrap: HTMLElement, img: HTMLImageElement, editor: HTMLElement, onChange: () => void) {
  if (wrap.getAttribute(BOUND_ATTR) === '1') return;
  wrap.setAttribute(BOUND_ATTR, '1');
  wrap.setAttribute('contenteditable', 'false');

  let handleEl = wrap.querySelector(`.${RESIZE_HANDLE_CLASS}`) as HTMLElement | null;
  if (!handleEl) {
    handleEl = document.createElement('span');
    handleEl.className = RESIZE_HANDLE_CLASS;
    handleEl.setAttribute('contenteditable', 'false');
    handleEl.setAttribute('aria-label', 'Bildgröße ändern');
    handleEl.title = 'Ziehen: Größe · Bild ziehen: Position';
    wrap.appendChild(handleEl);
  }
  const handle: HTMLElement = handleEl;

  const selectWrap = () => {
    editor.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).forEach((el) => {
      (el as HTMLElement).style.outline = '';
    });
    wrap.style.outline = '2px solid #f57f17';
    wrap.style.outlineOffset = '2px';
  };

  handle.addEventListener('pointerdown', (e) => {
    beginNotesDrag(editor);
    e.preventDefault();
    e.stopPropagation();
    selectWrap();
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width || img.offsetWidth || 160;
    const maxW = Math.max(120, editor.clientWidth - 16);
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const nextW = Math.max(48, Math.min(maxW, startW + (ev.clientX - startX)));
      wrap.style.width = `${Math.round(nextW)}px`;
      wrap.style.maxWidth = 'none';
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('max-width', 'none', 'important');
      img.style.setProperty('height', 'auto', 'important');
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endNotesDrag(editor, () => {
        ensureNotesTypingHost(editor);
        onChange();
      });
    };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });

  wrap.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest(`.${RESIZE_HANDLE_CLASS}`)) return;
    if (e.button !== 0) return;
    beginNotesDrag(editor);
    e.preventDefault();
    e.stopPropagation();
    selectWrap();
    let originX = e.clientX;
    let originY = e.clientY;
    let dragging = wrap.getAttribute(PRES_NOTES_IMG_POS_ATTR) === '1';
    let startLeft = parseFloat(wrap.style.left || '0') || 0;
    let startTop = parseFloat(wrap.style.top || '0') || 0;
    try {
      wrap.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!dragging) {
        if (Math.hypot(ev.clientX - originX, ev.clientY - originY) < 4) return;
        dragging = true;
        if (wrap.getAttribute(PRES_NOTES_IMG_POS_ATTR) !== '1') {
          pinWrapToEditor(wrap, editor);
        }
        startLeft = parseFloat(wrap.style.left || '0') || 0;
        startTop = parseFloat(wrap.style.top || '0') || 0;
        originX = ev.clientX;
        originY = ev.clientY;
        wrap.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }
      const nextLeft = startLeft + (ev.clientX - originX);
      const nextTop = startTop + (ev.clientY - originY);
      const wr = wrap.getBoundingClientRect();
      const maxLeft = Math.max(0, editor.clientWidth - 32);
      const maxTop = Math.max(0, Math.max(editor.scrollHeight, editor.clientHeight) - 24);
      wrap.style.left = `${Math.round(Math.max(-wr.width + 32, Math.min(maxLeft, nextLeft)))}px`;
      wrap.style.top = `${Math.round(Math.max(0, Math.min(maxTop, nextTop)))}px`;
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
      wrap.style.cursor = 'grab';
      document.body.style.userSelect = '';
      try {
        wrap.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endNotesDrag(editor, () => {
        ensureNotesTypingHost(editor);
        if (dragging) onChange();
      });
    };
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
  });

  wrap.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWrap();
  });
}

const NOTES_TYPEHOST_ATTR = 'data-pres-notes-typehost';

/** Solange nur Bilder (contenteditable=false) in den Notizen stehen, gibt es keinen Caret. */
export function ensureNotesTypingHost(editor: HTMLElement): HTMLElement {
  const abs = Array.from(
    editor.querySelectorAll(`[${PRES_NOTES_IMG_POS_ATTR}="1"]`),
  ) as HTMLElement[];
  let maxBottom = 0;
  for (const el of abs) {
    const top = parseFloat(el.style.top) || 0;
    maxBottom = Math.max(maxBottom, top + (el.offsetHeight || 0));
  }

  let host = editor.querySelector(`p[${NOTES_TYPEHOST_ATTR}]`) as HTMLElement | null;
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

  if (maxBottom > 40) {
    const gap = `${Math.max(8, Math.round(maxBottom + 12))}px`;
    if (host.style.marginTop !== gap) host.style.marginTop = gap;
  } else {
    host.style.removeProperty('margin-top');
  }
  if (!host.querySelector('br') && !(host.textContent || '').trim()) {
    host.appendChild(document.createElement('br'));
  }
  return host;
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

/** Resize-Handles + Ziehen zum Verschieben an alle Notiz-Bilder hängen. */
export function enhancePresentationNotesImages(editor: HTMLElement | null, onChange: () => void): void {
  if (!editor || notesEditorIsDragging(editor)) return;
  editor.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement;
    if (!img.getAttribute('src')) return;
    const wrap = ensureNotesImageWrap(img);
    bindNotesImage(wrap, img, editor, onChange);
  });
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
    return `<p>${presentationNotesImageInsertHtml(slideImageUrl(el.src, 960), name)}</p>`;
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
  setCaretInNotesEditor(editor, clientX, clientY);
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  const ok = document.execCommand('insertHTML', false, html);
  if (!ok) {
    editor.innerHTML = appendNotesHtml(editor.innerHTML, html);
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

export function appendHtmlToNotesValue(existing: string, extra: string): string {
  return appendNotesHtml(existing, extra);
}
