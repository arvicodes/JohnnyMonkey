/** Listen-Symbole für Präsentations-Editoren (verschachtelt + Outline-Ebenen). */

export const PRESENTATION_MAX_LIST_LEVEL = 8;

export const UL_LIST_LEVEL_MARKERS = ['disc', 'circle', 'square'] as const;
export const OL_LIST_LEVEL_MARKERS = ['decimal', 'lower-alpha', 'lower-roman'] as const;

/** Gespeicherte Nummerierungsart auf `<ol data-pres-list="…">`. */
export const PRES_OL_ATTR = 'data-pres-list';

export const PRESENTATION_OL_STYLE_IDS = [
  'decimal',
  'lower-alpha',
  'upper-alpha',
  'lower-roman',
  'upper-roman',
  'paren-alpha',
  'alpha-paren',
] as const;

export type PresentationOlStyleId = (typeof PRESENTATION_OL_STYLE_IDS)[number];

export const PRESENTATION_OL_STYLES: Array<{
  id: PresentationOlStyleId;
  label: string;
  sample: string;
}> = [
  { id: 'decimal', label: '1, 2, 3', sample: '1.' },
  { id: 'lower-alpha', label: 'a, b, c', sample: 'a.' },
  { id: 'upper-alpha', label: 'A, B, C', sample: 'A.' },
  { id: 'lower-roman', label: 'i, ii, iii', sample: 'i.' },
  { id: 'upper-roman', label: 'I, II, III', sample: 'I.' },
  { id: 'paren-alpha', label: '(a), (b), (c)', sample: '(a)' },
  { id: 'alpha-paren', label: 'a), b), c)', sample: 'a)' },
];

export function isPresentationOlStyleId(value: string | null | undefined): value is PresentationOlStyleId {
  return Boolean(value && (PRESENTATION_OL_STYLE_IDS as readonly string[]).includes(value));
}

function nestedTagRules(tag: 'ul' | 'ol', markers: readonly string[], maxDepth = 6) {
  const rules: Record<string, { listStyleType: string }> = {};
  rules[`& ${tag}`] = { listStyleType: `${markers[0]} !important` };
  let selector = `& ${tag}`;
  for (let depth = 2; depth <= maxDepth; depth += 1) {
    selector += ` ${tag}`;
    rules[selector] = { listStyleType: `${markers[(depth - 1) % markers.length]} !important` };
  }
  return rules;
}

type NestedListSxOptions = {
  scale?: number;
  listPaddingPx?: number | string;
  itemGapPx?: number;
  listGapPx?: number;
  listTextAlign?: 'start' | 'left' | 'center' | 'right' | 'justify';
  itemTextAlign?: 'start' | 'left' | 'center' | 'right' | 'justify';
};

/** MUI-sx für Listen in Rich-Zonen, Notizen und Text-Elementen. */
export function presentationNestedListSx(options: NestedListSxOptions = {}) {
  const scale = options.scale ?? 1;
  const listPadding =
    options.listPaddingPx != null
      ? typeof options.listPaddingPx === 'number'
        ? `${options.listPaddingPx}px`
        : options.listPaddingPx
      : `${28 * scale}px`;
  const itemGap = options.itemGapPx ?? 4 * scale;
  const listGap = options.listGapPx ?? 8 * scale;

  return {
    '& ul, & ol': {
      m: 0,
      pl: listPadding,
      mb: `${listGap}px`,
      listStylePosition: 'outside' as const,
      textAlign: options.listTextAlign,
    },
    ...nestedTagRules('ul', UL_LIST_LEVEL_MARKERS),
    ...nestedTagRules('ol', OL_LIST_LEVEL_MARKERS),
    '& li': {
      mb: `${itemGap}px`,
      display: 'list-item',
      listStylePosition: 'outside' as const,
      textAlign: options.itemTextAlign,
    },
    '& .pres-reveal-hidden, & li.pres-reveal-hidden': {
      display: 'none !important',
      visibility: 'hidden',
      pointerEvents: 'none',
    },
    '& li > ul, & li > ol': {
      mt: `${4 * scale}px`,
      mb: 0,
    },
    '& ol[data-pres-list="decimal"]': { listStyleType: 'decimal !important' },
    '& ol[data-pres-list="lower-alpha"]': { listStyleType: 'lower-alpha !important' },
    '& ol[data-pres-list="upper-alpha"]': { listStyleType: 'upper-alpha !important' },
    '& ol[data-pres-list="lower-roman"]': { listStyleType: 'lower-roman !important' },
    '& ol[data-pres-list="upper-roman"]': { listStyleType: 'upper-roman !important' },
    '& ol[data-pres-list="paren-alpha"]': { listStyleType: 'lower-alpha !important' },
    '& ol[data-pres-list="alpha-paren"]': { listStyleType: 'lower-alpha !important' },
  };
}

/** Tabellen in Notizen (Editor + Laptop-Anzeige). */
export function presentationNotesTableSx() {
  return {
    '& table, & table[data-pres-table]': {
      width: '100%',
      borderCollapse: 'collapse' as const,
      tableLayout: 'fixed' as const,
      my: 1,
      fontSize: '0.92em',
      lineHeight: 1.35,
    },
    '& th, & td': {
      border: '1px solid #BDBDBD',
      padding: '4px 6px',
      verticalAlign: 'top' as const,
      wordBreak: 'break-word' as const,
    },
    '& thead th, & th': {
      backgroundColor: '#E8E8E8',
      fontWeight: 700,
      textAlign: 'left' as const,
    },
    '& tbody tr:nth-of-type(even) td': {
      backgroundColor: 'rgba(0,0,0,0.03)',
    },
  };
}
