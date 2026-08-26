/** JohnnyMonkey Präsentations-Design */
export const JOHNNY_PRESENTATION = {
  primary: '#2E7D32',
  primaryLight: '#66BB6A',
  primaryDark: '#1B5E20',
  warm: '#FF9800',
  slideBg: '#FFFFFF',
  textPrimary: '#1a1a2e',
  textSecondary: '#424242',
  textMuted: '#757575',
  logoUrl: '/johnny-logo.png',
};

export const JOHNNY_ACCENT_PRESETS = [
  '#2E7D32',
  '#1B5E20',
  '#66BB6A',
  '#00897B',
  '#1565C0',
  '#0D47A1',
  '#0288D1',
  '#6A1B9A',
  '#5E35B1',
  '#C62828',
  '#D81B60',
  '#FF9800',
  '#F9A825',
  '#37474F',
  '#455A64',
  '#5D4037',
];

export const TEXT_COLOR_PRESETS = [
  '#1a1a2e',
  '#212121',
  '#424242',
  '#757575',
  '#9E9E9E',
  '#FFFFFF',
  '#1B5E20',
  '#2E7D32',
  '#66BB6A',
  '#00897B',
  '#0D47A1',
  '#1565C0',
  '#1976D2',
  '#0288D1',
  '#B71C1C',
  '#C62828',
  '#D81B60',
  '#E91E63',
  '#E65100',
  '#FF9800',
  '#FBC02D',
  '#F9A825',
  '#4A148C',
  '#6A1B9A',
  '#7B1FA2',
  '#5E35B1',
  '#3E2723',
  '#5D4037',
  '#795548',
];

export const HIGHLIGHT_PRESETS = [
  '#FFF59D',
  '#FFF176',
  '#FFEE58',
  '#C5E1A5',
  '#A5D6A7',
  '#B2DFDB',
  '#80DEEA',
  '#90CAF9',
  '#81D4FA',
  '#B39DDB',
  '#CE93D8',
  '#F8BBD0',
  '#FFCCBC',
  '#FFCC80',
  '#E0E0E0',
  '#CFD8DC',
];

/** Textmarker-Hintergrund: Wort bleibt lesbar. */
export const PRESENTATION_HIGHLIGHT_ALPHA = 0.22;

/** Notizen: kräftiger, damit die Markierung auf weißem Papier klar zu sehen ist. */
export const NOTES_HIGHLIGHT_ALPHA = 0.62;

export function toHighlightFill(color: string, alpha = PRESENTATION_HIGHLIGHT_ALPHA): string {
  const c = (color || '').trim();
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
  let h = c.replace('#', '');
  if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  if (h.length !== 6) return `rgba(255,245,157,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(255,245,157,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function restampNotesHighlights(root: ParentNode): void {
  root.querySelectorAll('[data-pres-highlight], mark').forEach((node) => {
    const el = node as HTMLElement;
    const raw = el.getAttribute('data-pres-highlight') || el.style.backgroundColor || '';
    if (!raw) return;
    el.style.setProperty('background-color', toHighlightFill(raw, NOTES_HIGHLIGHT_ALPHA), 'important');
  });
}

export function restampNotesHighlightsHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    restampNotesHighlights(doc.body);
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

export function presentationNotesHighlightSx() {
  return {
    '& [data-pres-highlight], & mark': {
      borderRadius: '3px',
      padding: '0.05em 0.16em',
      boxDecorationBreak: 'clone',
      WebkitBoxDecorationBreak: 'clone',
      boxShadow: 'inset 0 -0.18em 0 rgba(0,0,0,0.08)',
    },
  } as const;
}

export function accentGradient(color: string): string {
  return `linear-gradient(90deg, ${color} 0%, ${color}88 45%, transparent 100%)`;
}
