/**
 * Formen & Pfeile als Folien-Elemente (Editor + Laptop-Ansicht).
 */
import React from 'react';
import type { PresentationShapeKind, SlideElement } from './presentationDeck';
import { JOHNNY_PRESENTATION } from './presentationTheme';

export const SLIDE_SHAPE_KINDS: PresentationShapeKind[] = ['arrow', 'line', 'rect', 'ellipse'];

export const SLIDE_SHAPE_LABELS: Record<PresentationShapeKind, string> = {
  arrow: 'Pfeil',
  line: 'Linie',
  rect: 'Rechteck',
  ellipse: 'Kreis / Oval',
};

export function defaultShapeSize(kind: PresentationShapeKind): { w: number; h: number } {
  switch (kind) {
    case 'arrow':
    case 'line':
      return { w: 28, h: 10 };
    case 'rect':
      return { w: 24, h: 16 };
    case 'ellipse':
      return { w: 18, h: 18 };
    default:
      return { w: 22, h: 14 };
  }
}

export function createShapeElement(
  kind: PresentationShapeKind,
  zIndex: number,
  accentColor?: string
): SlideElement {
  const size = defaultShapeSize(kind);
  const accent = accentColor || JOHNNY_PRESENTATION.primary;
  const isBox = kind === 'rect' || kind === 'ellipse';
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'shape',
    shapeKind: kind,
    x: 36,
    y: 40,
    w: size.w,
    h: size.h,
    zIndex,
    strokeColor: accent,
    strokeWidth: kind === 'line' || kind === 'arrow' ? 4 : 3,
    fillColor: isBox ? `${accent}33` : 'transparent',
    // Boxen (Rechteck/Oval) kommen standardmäßig mit integriertem Textfeld
    ...(isBox ? { html: '<p style="text-align:center"><br></p>' } : {}),
  };
}

/** Rechteck/Oval können integrierten Text haben. */
export function shapeSupportsText(el: Pick<SlideElement, 'type' | 'shapeKind'>): boolean {
  if (el.type !== 'shape') return false;
  const kind = el.shapeKind || 'arrow';
  return kind === 'rect' || kind === 'ellipse';
}

export function SlideShapeSvg({
  kind,
  strokeColor,
  fillColor,
  strokeWidth = 3,
  style,
}: {
  kind: PresentationShapeKind;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  const stroke = strokeColor || JOHNNY_PRESENTATION.primary;
  const fill =
    fillColor && fillColor !== 'transparent' && fillColor !== 'none' ? fillColor : 'none';
  const sw = Math.max(1.5, Math.min(12, strokeWidth));

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden
    >
      {kind === 'line' && (
        <line x1="8" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      )}
      {kind === 'arrow' && (
        <>
          <line x1="6" y1="50" x2="72" y2="50" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <polygon points="68,32 94,50 68,68" fill={stroke} />
        </>
      )}
      {kind === 'rect' && (
        <rect
          x="10"
          y="18"
          width="80"
          height="64"
          rx="4"
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
      )}
      {kind === 'ellipse' && (
        <ellipse cx="50" cy="50" rx="38" ry="34" fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
    </svg>
  );
}
