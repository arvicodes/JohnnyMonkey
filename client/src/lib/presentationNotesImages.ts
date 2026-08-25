import { slideImageUrl, type SlideElement } from './presentationDeck';

/** Notiz-Grafiken im Textfluss (contentEditable): Größe am Eckpunkt, Entf löscht. */

export const PRES_NOTES_IMG_WRAP_CLASS = 'pres-notes-img-wrap';
export const PRES_NOTES_IMG_WRAP_ATTR = 'data-pres-notes-img-wrap';
export const PRES_NOTES_IMG_POS_ATTR = 'data-pres-notes-pos';
export const PRES_NOTES_IMG_ATTR = 'data-pres-notes-img';
export const PRES_NOTES_IMG_SELECTED_CLASS = 'pres-notes-img-selected';

const RESIZE_HANDLE_CLASS = 'pres-notes-img-resize';
const DROP_MARKER_CLASS = 'pres-notes-img-drop';
const BOUND_ATTR = 'data-pres-notes-img-bound';

const WRAP_FLOW_STYLE =
  'position:relative;display:block;max-width:100%;width:fit-content;margin:0.5em 0;line-height:0;cursor:grab;';

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
      display: 'block',
      width: 'fit-content',
      maxWidth: '100%',
      lineHeight: 0,
      cursor: 'grab',
      userSelect: 'none',
      touchAction: 'none',
      my: 0.5,
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS} img, & img[${PRES_NOTES_IMG_ATTR}]`]: {
      maxWidth: '100%',
      width: 'auto',
      height: 'auto',
      display: 'block',
      margin: 0,
      borderRadius: '4px',
    },
    [`& .${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}`]: {
      outline: '2px solid #f57f17',
      outlineOffset: '2px',
    },
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
      display: 'block',
      maxWidth: '100%',
      width: 'fit-content',
      lineHeight: 0,
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
  root.querySelectorAll(`.${RESIZE_HANDLE_CLASS}, .${DROP_MARKER_CLASS}`).forEach((n) => n.remove());
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
    const img = el.querySelector('img') as HTMLImageElement | null;
    if (img) {
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
export function handleNotesImageDeleteKey(editor: HTMLElement, key: 'Backspace' | 'Delete'): boolean {
  const selected = editor.querySelector(
    `.${PRES_NOTES_IMG_WRAP_CLASS}.${PRES_NOTES_IMG_SELECTED_CLASS}`,
  ) as HTMLElement | null;
  if (selected) {
    removeNotesImageWrap(selected, editor);
    return true;
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;

  const wrap = findAdjacentNotesImageWrap(range, key, editor);
  if (!wrap || !editor.contains(wrap)) return false;
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
    handleEl.title = 'Ecke ziehen: Größe · Entf: Grafik löschen';
    wrap.appendChild(handleEl);
  }
  const handle: HTMLElement = handleEl;

  handle.addEventListener('pointerdown', (e) => {
    beginNotesDrag(editor);
    e.preventDefault();
    e.stopPropagation();
    selectNotesImageWrap(editor, wrap);
    editor.focus({ preventScroll: true });
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width || img.offsetWidth || 160;
    const maxW = Math.max(80, editor.clientWidth - 16);
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const nextW = Math.max(48, Math.min(maxW, startW + (ev.clientX - startX)));
      wrap.style.width = `${Math.round(nextW)}px`;
      wrap.style.maxWidth = '100%';
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('max-width', '100%', 'important');
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
    e.preventDefault();
    e.stopPropagation();
    selectNotesImageWrap(editor, wrap);
    editor.focus({ preventScroll: true });
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

  host.style.removeProperty('margin-top');
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

/** Resize-Handles an alle Notiz-Bilder hängen; Grafiken bleiben im Textfluss. */
export function enhancePresentationNotesImages(editor: HTMLElement | null, onChange: () => void): void {
  if (!editor || notesEditorIsDragging(editor)) return;
  releaseNotesImagesToFlow(editor);
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
