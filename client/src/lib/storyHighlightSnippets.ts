/** Farbige Highlight-Schnipsel im Story-Tagebuch-Text. */

export type StorySnippetVariant = 'gold' | 'sky' | 'rose' | 'mint';

export const STORY_SNIPPET_CLASS = 'story-snippet';
export const STORY_SNIPPET_HANDLE_CLASS = 'story-snippet-handle';
export const STORY_SNIPPET_DRAG_BTN_CLASS = 'story-snippet-drag-btn';
export const STORY_SNIPPET_DELETE_BTN_CLASS = 'story-snippet-delete-btn';
export const STORY_SNIPPET_TEXT_CLASS = 'story-snippet-text';
export const STORY_SNIPPET_RESIZE_BTN_CLASS = 'story-snippet-resize-btn';

export const STORY_SNIPPET_PLACEHOLDER = 'Notiz …';

/** Standard-/Grenzbreite beim Ziehen (px). */
export const STORY_SNIPPET_WIDTH_DEFAULT_PX = 184;
export const STORY_SNIPPET_WIDTH_MIN_PX = 56;
export const STORY_SNIPPET_WIDTH_MAX_PX = 320;

export const STORY_SNIPPET_OPTIONS: ReadonlyArray<{
  variant: StorySnippetVariant;
  label: string;
  tooltip: string;
  swatch: string;
  border: string;
}> = [
  {
    variant: 'gold',
    label: 'Gelb',
    tooltip: 'Gelbes Highlight-Schnipsel einfügen',
    swatch: '#fff9c4',
    border: '#fbc02d',
  },
  {
    variant: 'sky',
    label: 'Blau',
    tooltip: 'Blaues Highlight-Schnipsel einfügen',
    swatch: '#e3f2fd',
    border: '#42a5f5',
  },
  {
    variant: 'rose',
    label: 'Rosa',
    tooltip: 'Rosa Highlight-Schnipsel einfügen',
    swatch: '#fce4ec',
    border: '#f48fb1',
  },
  {
    variant: 'mint',
    label: 'Grün',
    tooltip: 'Grünes Highlight-Schnipsel einfügen',
    swatch: '#e8f5e9',
    border: '#66bb6a',
  },
];

const VARIANT_STYLES: Record<
  StorySnippetVariant,
  { background: string; borderColor: string; color: string; rotate: string }
> = {
  gold: { background: '#fff9c4', borderColor: 'rgba(251, 192, 45, 0.55)', color: '#5d4037', rotate: '-1.2deg' },
  sky: { background: '#e3f2fd', borderColor: 'rgba(66, 165, 245, 0.45)', color: '#1a237e', rotate: '0.8deg' },
  rose: { background: '#fce4ec', borderColor: 'rgba(244, 143, 177, 0.55)', color: '#880e4f', rotate: '-0.6deg' },
  mint: { background: '#e8f5e9', borderColor: 'rgba(102, 187, 106, 0.5)', color: '#1b5e20', rotate: '1deg' },
};

/** MUI-sx für Editor und Vorschau — kleine Zettel, nicht volle Breite */
export const storySnippetContainerSx = {
  [`& .${STORY_SNIPPET_CLASS}`]: {
    display: 'inline-flex',
    alignItems: 'flex-start',
    gap: '0.12em',
    width: 'auto',
    maxWidth: '11.5rem',
    minWidth: '3.5rem',
    margin: '0.2em 0.4em 0.25em 0.1em',
    padding: '0.28em 0.45em 0.32em',
    borderRadius: '1px 1px 1px 0',
    fontSize: '0.76rem',
    lineHeight: 1.32,
    fontWeight: 500,
    textAlign: 'left',
    verticalAlign: 'baseline',
    boxShadow: '1px 2px 4px rgba(93, 64, 55, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.35) inset',
    border: '1px solid',
    boxSizing: 'border-box',
    wordBreak: 'break-word',
    cursor: 'text',
    position: 'relative',
    '&.story-snippet--dragging, &.story-snippet--resizing': {
      opacity: 0.45,
    },
    '@media print': {
      boxShadow: 'none',
      transform: 'none !important',
    },
  },
  [`& .${STORY_SNIPPET_HANDLE_CLASS}`]: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.1em',
    lineHeight: 1,
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  [`& .${STORY_SNIPPET_DRAG_BTN_CLASS}`]: {
    cursor: 'grab',
    fontSize: '0.62rem',
    opacity: 0.55,
    padding: '0.1em 0.05em',
    lineHeight: 1,
    '&:active': {
      cursor: 'grabbing',
    },
  },
  [`& .${STORY_SNIPPET_DELETE_BTN_CLASS}`]: {
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontWeight: 700,
    lineHeight: 1,
    opacity: 0.45,
    padding: '0.05em 0.1em',
    color: '#8d6e63',
    '&:hover': {
      opacity: 1,
      color: '#c62828',
    },
  },
  [`& .${STORY_SNIPPET_RESIZE_BTN_CLASS}`]: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    cursor: 'nwse-resize',
    opacity: 0.35,
    lineHeight: 0,
    fontSize: 0,
    background: 'linear-gradient(135deg, transparent 50%, rgba(93, 64, 55, 0.35) 50%)',
    borderBottomRightRadius: 1,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    '&:hover': {
      opacity: 0.75,
    },
  },
  [`& .${STORY_SNIPPET_CLASS}:hover .${STORY_SNIPPET_RESIZE_BTN_CLASS}`]: {
    opacity: 0.55,
  },
  [`& .${STORY_SNIPPET_TEXT_CLASS}`]: {
    minWidth: 0,
    flex: '1 1 auto',
    cursor: 'text',
    userSelect: 'text',
    WebkitUserSelect: 'text',
    '& mark, & .story-snippet-mark': {
      background: 'rgba(255, 235, 59, 0.65)',
      color: 'inherit',
      padding: '0 0.05em',
      borderRadius: '1px',
    },
  },
  ...Object.fromEntries(
    (Object.keys(VARIANT_STYLES) as StorySnippetVariant[]).map((v) => [
      `& .${STORY_SNIPPET_CLASS}--${v}`,
      {
        background: VARIANT_STYLES[v].background,
        borderColor: VARIANT_STYLES[v].borderColor,
        color: VARIANT_STYLES[v].color,
        transform: `rotate(${VARIANT_STYLES[v].rotate})`,
      },
    ]),
  ),
};

/** Vorschau: Bedienleisten ausblenden (Styles der Zettel bleiben in storySnippetContainerSx). */
export const storySnippetPreviewReadonlySx = {
  [`& .${STORY_SNIPPET_HANDLE_CLASS}`]: { display: 'none !important' },
  [`& .${STORY_SNIPPET_DRAG_BTN_CLASS}`]: { display: 'none !important' },
  [`& .${STORY_SNIPPET_DELETE_BTN_CLASS}`]: { display: 'none !important' },
  [`& .${STORY_SNIPPET_RESIZE_BTN_CLASS}`]: { display: 'none !important' },
};

function createSnippetHandle(): HTMLSpanElement {
  const handle = document.createElement('span');
  handle.className = STORY_SNIPPET_HANDLE_CLASS;
  handle.setAttribute('contenteditable', 'false');

  const dragBtn = document.createElement('span');
  dragBtn.className = STORY_SNIPPET_DRAG_BTN_CLASS;
  dragBtn.setAttribute('contenteditable', 'false');
  dragBtn.setAttribute('aria-label', 'Zettel verschieben');
  dragBtn.title = 'Ziehen zum Verschieben';
  dragBtn.textContent = '⋮⋮';

  const deleteBtn = document.createElement('span');
  deleteBtn.className = STORY_SNIPPET_DELETE_BTN_CLASS;
  deleteBtn.setAttribute('contenteditable', 'false');
  deleteBtn.setAttribute('aria-label', 'Zettel löschen');
  deleteBtn.title = 'Zettel löschen';
  deleteBtn.textContent = '×';

  handle.appendChild(dragBtn);
  handle.appendChild(deleteBtn);
  return handle;
}

function createSnippetResizeHandle(): HTMLSpanElement {
  const resize = document.createElement('span');
  resize.className = STORY_SNIPPET_RESIZE_BTN_CLASS;
  resize.setAttribute('contenteditable', 'false');
  resize.setAttribute('aria-label', 'Zettelbreite ziehen');
  resize.title = 'Breite ziehen';
  return resize;
}

function ensureSnippetResizeHandle(snip: HTMLElement): void {
  if (snip.querySelector(`.${STORY_SNIPPET_RESIZE_BTN_CLASS}`)) return;
  snip.appendChild(createSnippetResizeHandle());
}

export function applyStorySnippetWidth(snip: HTMLElement, widthPx: number): void {
  const w = Math.round(
    Math.min(STORY_SNIPPET_WIDTH_MAX_PX, Math.max(STORY_SNIPPET_WIDTH_MIN_PX, widthPx)),
  );
  snip.style.width = `${w}px`;
  snip.style.maxWidth = `${w}px`;
}

export function readStorySnippetWidthPx(snip: HTMLElement): number {
  const parsed = parseInt(snip.style.width || snip.style.maxWidth || '', 10);
  if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  const rect = snip.getBoundingClientRect();
  return Math.round(rect.width) || STORY_SNIPPET_WIDTH_DEFAULT_PX;
}

function createSnippetTextNode(text: string): HTMLSpanElement {
  const body = document.createElement('span');
  body.className = STORY_SNIPPET_TEXT_CLASS;
  body.textContent = text;
  return body;
}

/** Alte einzeilige Zettel → Griff (⋮⋮ + ×) + Textkörper. */
export function ensureStorySnippetStructure(snip: HTMLElement): void {
  if (!snip.classList.contains(STORY_SNIPPET_CLASS)) return;
  snip.draggable = false;

  const existingHandle = snip.querySelector<HTMLElement>(`.${STORY_SNIPPET_HANDLE_CLASS}`);
  if (existingHandle?.querySelector(`.${STORY_SNIPPET_DRAG_BTN_CLASS}`)) {
    if (!existingHandle.querySelector(`.${STORY_SNIPPET_DELETE_BTN_CLASS}`)) {
      const deleteBtn = document.createElement('span');
      deleteBtn.className = STORY_SNIPPET_DELETE_BTN_CLASS;
      deleteBtn.setAttribute('contenteditable', 'false');
      deleteBtn.setAttribute('aria-label', 'Zettel löschen');
      deleteBtn.title = 'Zettel löschen';
      deleteBtn.textContent = '×';
      existingHandle.appendChild(deleteBtn);
    }
    ensureSnippetResizeHandle(snip);
    return;
  }

  const existingBody = snip.querySelector<HTMLElement>(`.${STORY_SNIPPET_TEXT_CLASS}`);
  const savedHtml = existingBody?.innerHTML.trim() ?? '';
  const savedText =
    existingBody?.textContent?.trim() ??
    (snip.textContent ?? '').replace(/[⋮×]/g, '').trim();

  if (existingHandle) existingHandle.remove();
  existingBody?.remove();

  snip.textContent = '';
  snip.appendChild(createSnippetHandle());
  const body = createSnippetTextNode('');
  if (savedHtml && savedHtml !== savedText) body.innerHTML = savedHtml;
  else body.textContent = savedText || STORY_SNIPPET_PLACEHOLDER;
  snip.appendChild(body);
  ensureSnippetResizeHandle(snip);
}

export function createStorySnippetElement(variant: StorySnippetVariant, text = STORY_SNIPPET_PLACEHOLDER): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = `${STORY_SNIPPET_CLASS} ${STORY_SNIPPET_CLASS}--${variant}`;
  el.setAttribute('data-story-snippet', variant);
  el.draggable = false;
  el.appendChild(createSnippetHandle());
  el.appendChild(createSnippetTextNode(text));
  ensureSnippetResizeHandle(el);
  return el;
}

export function selectElementContents(node: HTMLElement): void {
  const textEl = node.querySelector<HTMLElement>(`.${STORY_SNIPPET_TEXT_CLASS}`) ?? node;
  const range = document.createRange();
  range.selectNodeContents(textEl);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function getStorySnippetTextElement(snip: HTMLElement): HTMLElement {
  return snip.querySelector<HTMLElement>(`.${STORY_SNIPPET_TEXT_CLASS}`) ?? snip;
}

export function isHighlightMarkElement(el: HTMLElement): boolean {
  return el.tagName === 'MARK' || el.classList.contains('story-snippet-mark');
}

function findHighlightMarkAncestor(node: Node, host: HTMLElement): HTMLElement | null {
  let n: Node | null = node;
  while (n && n !== host) {
    if (n instanceof HTMLElement && isHighlightMarkElement(n)) return n;
    n = n.parentNode;
  }
  return null;
}

/** Gelbe <mark>-Markierungen in der aktuellen Auswahl. */
export function getHighlightMarksInEditorRange(host: HTMLElement, range: Range): HTMLElement[] {
  const marks = new Set<HTMLElement>();
  const startMark = findHighlightMarkAncestor(range.startContainer, host);
  const endMark = findHighlightMarkAncestor(range.endContainer, host);
  if (startMark) marks.add(startMark);
  if (endMark) marks.add(endMark);

  if (!range.collapsed) {
    host.querySelectorAll<HTMLElement>(`mark, .story-snippet-mark`).forEach((el) => {
      try {
        if (range.intersectsNode(el)) marks.add(el);
      } catch {
        /* ignore */
      }
    });
  }

  return [...marks];
}

/** Markierung aufheben, Text bleibt erhalten. */
export function unwrapHighlightMark(mark: HTMLElement): void {
  const parent = mark.parentNode;
  if (!parent) return;
  const normalizeTarget = mark.parentElement;
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
  normalizeTarget?.normalize();
}
