/** Listen-Symbole für Präsentations-Editoren (verschachtelt + Outline-Ebenen). */

export const PRESENTATION_MAX_LIST_LEVEL = 8;

export const UL_LIST_LEVEL_MARKERS = ['disc', 'circle', 'square'] as const;
export const OL_LIST_LEVEL_MARKERS = ['decimal', 'lower-alpha', 'lower-roman'] as const;

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
    },
    ...nestedTagRules('ul', UL_LIST_LEVEL_MARKERS),
    ...nestedTagRules('ol', OL_LIST_LEVEL_MARKERS),
    '& li': {
      mb: `${itemGap}px`,
      display: 'list-item',
      listStylePosition: 'outside' as const,
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
  };
}
