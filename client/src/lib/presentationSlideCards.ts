/**
 * Info-Karten für Präsentationen: farbiger Titelkopf + Inhaltsbereich
 * (wie „Schwache KI“ / „Starke KI“-Boxen).
 */
import type { SlideElement } from './presentationDeck';
import { JOHNNY_PRESENTATION } from './presentationTheme';

/** Typische Karten-Farben (Rahmen + Titel). */
export const CARD_ACCENT_PRESETS = [
  '#1565C0',
  '#2E7D32',
  '#6A1B9A',
  '#C62828',
  '#00897B',
  '#EF6C00',
  '#37474F',
  '#AD1457',
] as const;

/** Helle Kopffläche aus Akzentfarbe (≈ 14 % Deckung auf Weiß). */
export function cardHeaderFill(accent: string): string {
  const hex = (accent || '').replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r},${g},${b},0.14)`;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].every((n) => !Number.isNaN(n))) {
      return `rgba(${r},${g},${b},0.14)`;
    }
  }
  return 'rgba(21,101,192,0.14)';
}

export function createCardElement(
  zIndex: number,
  opts?: {
    accent?: string;
    title?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  },
): SlideElement {
  const accent = opts?.accent || JOHNNY_PRESENTATION.primary;
  const title = (opts?.title || 'Titel').trim() || 'Titel';
  return {
    id: `el-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'card',
    x: opts?.x ?? 10,
    y: opts?.y ?? 20,
    w: opts?.w ?? 38,
    h: opts?.h ?? 56,
    zIndex,
    strokeColor: accent,
    strokeWidth: 2.5,
    fillColor: cardHeaderFill(accent),
    titleHtml: `<p style="text-align:center"><strong>${escapeXml(title)}</strong></p>`,
    html: '<p style="text-align:center"><br></p>',
    stackLayer: 'background',
  };
}

/** Zwei gleich große Karten nebeneinander (Vergleichs-Layout). */
export function createCardPair(
  zIndexStart: number,
  opts?: { leftAccent?: string; rightAccent?: string; leftTitle?: string; rightTitle?: string },
): SlideElement[] {
  const gap = 3.5;
  const w = (100 - 8 - 8 - gap) / 2;
  const y = 18;
  const h = 62;
  const left = createCardElement(zIndexStart, {
    accent: opts?.leftAccent || '#1565C0',
    title: opts?.leftTitle || 'Titel links',
    x: 8,
    y,
    w,
    h,
  });
  const right = createCardElement(zIndexStart + 1, {
    accent: opts?.rightAccent || '#2E7D32',
    title: opts?.rightTitle || 'Titel rechts',
    x: 8 + w + gap,
    y,
    w,
    h,
  });
  // IDs eindeutig halten
  right.id = `el-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-b`;
  return [left, right];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
