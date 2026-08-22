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

  let handle = wrap.querySelector(`.${RESIZE_HANDLE_CLASS}`) as HTMLElement | null;
  if (!handle) {
    handle = document.createElement('span');
    handle.className = RESIZE_HANDLE_CLASS;
    handle.setAttribute('contenteditable', 'false');
    handle.setAttribute('aria-label', 'Bildgröße ändern');
    handle.title = 'Ziehen: Größe · Bild ziehen: Position';
    wrap.appendChild(handle);
  }

  const selectWrap = () => {
    editor.querySelectorAll(`.${PRES_NOTES_IMG_WRAP_CLASS}`).forEach((el) => {
      (el as HTMLElement).style.outline = '';
    });
    wrap.style.outline = '2px solid #f57f17';
    wrap.style.outlineOffset = '2px';
  };

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectWrap();
    const startX = e.clientX;
    const startW = wrap.getBoundingClientRect().width || img.offsetWidth || 160;
    const maxW = Math.max(120, editor.clientWidth - 16);
    const onMove = (ev: PointerEvent) => {
      const nextW = Math.max(48, Math.min(maxW, startW + (ev.clientX - startX)));
      wrap.style.width = `${Math.round(nextW)}px`;
      wrap.style.maxWidth = 'none';
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('max-width', 'none', 'important');
      img.style.setProperty('height', 'auto', 'important');
    };
    const onUp = () => {
      editor.removeAttribute('data-pres-notes-dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      onChange();
    };
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    editor.setAttribute('data-pres-notes-dragging', '1');
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  wrap.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest(`.${RESIZE_HANDLE_CLASS}`)) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    selectWrap();
    if (wrap.getAttribute(PRES_NOTES_IMG_POS_ATTR) !== '1') {
      pinWrapToEditor(wrap, editor);
    }
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = parseFloat(wrap.style.left || '0') || 0;
    const startTop = parseFloat(wrap.style.top || '0') || 0;
    wrap.style.cursor = 'grabbing';
    editor.setAttribute('data-pres-notes-dragging', '1');
    const onMove = (ev: PointerEvent) => {
      const nextLeft = startLeft + (ev.clientX - startX);
      const nextTop = startTop + (ev.clientY - startY);
      const wr = wrap.getBoundingClientRect();
      const maxLeft = Math.max(0, editor.clientWidth - 32);
      const maxTop = Math.max(0, Math.max(editor.scrollHeight, editor.clientHeight) - 24);
      wrap.style.left = `${Math.round(Math.max(-wr.width + 32, Math.min(maxLeft, nextLeft)))}px`;
      wrap.style.top = `${Math.round(Math.max(0, Math.min(maxTop, nextTop)))}px`;
    };
    const onUp = () => {
      wrap.style.cursor = 'grab';
      editor.removeAttribute('data-pres-notes-dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      onChange();
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  wrap.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWrap();
  });
}

/** Resize-Handles + Ziehen zum Verschieben an alle Notiz-Bilder hängen. */
export function enhancePresentationNotesImages(editor: HTMLElement | null, onChange: () => void): void {
  if (!editor) return;
  editor.querySelectorAll('img').forEach((node) => {
    const img = node as HTMLImageElement;
    if (!img.getAttribute('src')) return;
    const wrap = ensureNotesImageWrap(img);
    bindNotesImage(wrap, img, editor, onChange);
  });
}
