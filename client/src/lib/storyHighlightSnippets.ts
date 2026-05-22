/** Farbige Highlight-Schnipsel im Story-Tagebuch-Text. */

export type StorySnippetVariant = 'gold' | 'sky' | 'rose' | 'mint';

export const STORY_SNIPPET_CLASS = 'story-snippet';

export const STORY_SNIPPET_PLACEHOLDER = 'Notiz …';

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
    display: 'inline-block',
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
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    '&.story-snippet--dragging': {
      opacity: 0.45,
      cursor: 'grabbing',
    },
    '@media print': {
      boxShadow: 'none',
      transform: 'none',
      cursor: 'default',
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

export function createStorySnippetElement(variant: StorySnippetVariant, text = STORY_SNIPPET_PLACEHOLDER): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = `${STORY_SNIPPET_CLASS} ${STORY_SNIPPET_CLASS}--${variant}`;
  el.setAttribute('data-story-snippet', variant);
  el.draggable = true;
  el.textContent = text;
  return el;
}

export function selectElementContents(node: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
