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

function connectorEnds(flipH?: boolean, flipV?: boolean): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = flipH ? 94 : 6;
  const y1 = flipV ? 94 : 6;
  const x2 = flipH ? 6 : 94;
  const y2 = flipV ? 6 : 94;
  return { x1, y1, x2, y2 };
}

/** Achsennahe Verbinder: Mitte der Box, nicht die Diagonale (sonst wird die Spitze gequetscht). */
function straightenConnector(
  ends: { x1: number; y1: number; x2: number; y2: number },
  boxW: number,
  boxH: number,
  flipH: boolean,
  flipV: boolean,
): { x1: number; y1: number; x2: number; y2: number } {
  const w = Math.max(boxW, 0.01);
  const h = Math.max(boxH, 0.01);
  if (w / h < 0.28) {
    return { x1: 50, y1: flipV ? 94 : 6, x2: 50, y2: flipV ? 6 : 94 };
  }
  if (h / w < 0.28) {
    return { x1: flipH ? 94 : 6, y1: 50, x2: flipH ? 6 : 94, y2: 50 };
  }
  return ends;
}

function visualAngleDeg(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  boxW: number,
  boxH: number,
): number {
  const dx = (x2 - x1) * Math.max(boxW, 0.01) * 16;
  const dy = (y2 - y1) * Math.max(boxH, 0.01) * 9;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function SlideShapeSvg({
  kind,
  strokeColor,
  fillColor,
  strokeWidth = 3,
  flipH,
  flipV,
  boxW,
  boxH,
  style,
}: {
  kind: PresentationShapeKind;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  flipH?: boolean;
  flipV?: boolean;
  boxW?: number;
  boxH?: number;
  style?: React.CSSProperties;
}) {
  const stroke = strokeColor || JOHNNY_PRESENTATION.primary;
  const fill =
    fillColor && fillColor !== 'transparent' && fillColor !== 'none' ? fillColor : 'none';
  const sw = Math.max(1.5, Math.min(12, strokeWidth));
  const connector = flipH != null || flipV != null;
  const rawEnds = connector ? connectorEnds(Boolean(flipH), Boolean(flipV)) : null;
  const ends = rawEnds
    ? straightenConnector(rawEnds, boxW ?? 1, boxH ?? 1, Boolean(flipH), Boolean(flipV))
    : null;

  const connectorArrow =
    kind === 'arrow' && ends ? (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'visible',
          ...style,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
          aria-hidden
        >
          <line
            x1={ends.x1}
            y1={ends.y1}
            x2={ends.x1 + (ends.x2 - ends.x1) * 0.9}
            y2={ends.y1 + (ends.y2 - ends.y1) * 0.9}
            stroke={stroke}
            strokeWidth={Math.max(sw, 4)}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden
          style={{
            position: 'absolute',
            left: `${ends.x2}%`,
            top: `${ends.y2}%`,
            transform: `translate(-50%, -50%) rotate(${visualAngleDeg(
              ends.x1,
              ends.y1,
              ends.x2,
              ends.y2,
              boxW ?? 1,
              boxH ?? 1,
            )}deg)`,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <polygon points="1,2 15,8 1,14" fill={stroke} />
        </svg>
      </div>
    ) : null;

  if (connectorArrow) return connectorArrow;

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden
    >
      {kind === 'line' && ends && (
        <line
          x1={ends.x1}
          y1={ends.y1}
          x2={ends.x2}
          y2={ends.y2}
          stroke={stroke}
          strokeWidth={Math.max(sw, 4)}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {kind === 'line' && !ends && (
        <line x1="8" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      )}
      {kind === 'arrow' && !ends && (
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
