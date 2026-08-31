/**
 * Formen & Pfeile als Folien-Elemente (Editor + Laptop-Ansicht).
 */
import React from 'react';
import type { PresentationShapeKind, SlideElement } from './presentationDeck';
import { JOHNNY_PRESENTATION } from './presentationTheme';
import {
  buildLinePathD,
  isLineLikeShapeKind,
  normalizeShapeElement,
  resolveArrowHeadSize,
  resolveCurveControl,
  resolveShapePoints,
  shapeHasArrowHead,
} from './presentationShapePaths';

export {
  connectorElementFromSlidePoints,
  clientToShapeLocal,
  isLineLikeShapeKind,
  normalizeShapeElement,
} from './presentationShapePaths';

export const SLIDE_SHAPE_KINDS: PresentationShapeKind[] = [
  'arrow',
  'curved-arrow',
  'connector',
  'line',
  'rect',
  'ellipse',
];

export const SLIDE_SHAPE_LABELS: Record<PresentationShapeKind, string> = {
  arrow: 'Pfeil',
  'curved-arrow': 'Gebogener Pfeil',
  connector: 'Ecken-Pfeil',
  line: 'Linie',
  rect: 'Rechteck',
  ellipse: 'Kreis / Oval',
};

/** Standard-Linienstärke für Pfeile/Linien (früher ~3.5; 3× für klare Erkennbarkeit). */
export const DEFAULT_ARROW_STROKE_WIDTH = 10.5;
/** Standard-Pfeilspitze in lokaler Box (0–100); mit kürzerer Länge etwas größer. */
export const DEFAULT_ARROW_HEAD_SIZE = 22;

export function defaultShapeSize(kind: PresentationShapeKind): { w: number; h: number } {
  switch (kind) {
    case 'arrow':
    case 'line':
      // Länge ~halb gegenüber früherem Standard (32 → 16)
      return { w: 16, h: 10 };
    case 'curved-arrow':
      return { w: 15, h: 14 };
    case 'connector':
      return { w: 16, h: 22 };
    case 'rect':
      return { w: 24, h: 16 };
    case 'ellipse':
      return { w: 18, h: 18 };
    default:
      return { w: 22, h: 14 };
  }
}

const DEFAULT_LINE_COLOR = '#212121';

export function createShapeElement(
  kind: PresentationShapeKind,
  zIndex: number,
  accentColor?: string,
): SlideElement {
  const size = defaultShapeSize(kind);
  const accent = accentColor || JOHNNY_PRESENTATION.primary;
  const isBox = kind === 'rect' || kind === 'ellipse';
  const lineLike = isLineLikeShapeKind(kind);
  const plainArrow = kind === 'arrow' || kind === 'line';
  const el: SlideElement = {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'shape',
    shapeKind: kind,
    x: 34,
    y: 44,
    w: size.w,
    h: size.h,
    zIndex,
    strokeColor: plainArrow ? DEFAULT_LINE_COLOR : accent,
    strokeWidth: lineLike ? DEFAULT_ARROW_STROKE_WIDTH : 3,
    fillColor: isBox ? `${accent}33` : 'transparent',
    arrowHeadSize: shapeHasArrowHead(kind) ? DEFAULT_ARROW_HEAD_SIZE : undefined,
    ...(isBox ? { html: '<p style="text-align:center"><br></p>' } : {}),
  };
  return normalizeShapeElement(el);
}

/** Rechteck/Oval können integrierten Text haben. */
export function shapeSupportsText(el: Pick<SlideElement, 'type' | 'shapeKind'>): boolean {
  if (el.type !== 'shape') return false;
  const kind = el.shapeKind || 'arrow';
  return kind === 'rect' || kind === 'ellipse';
}

export function SlideShapeSvg({
  element,
  kind: kindProp,
  strokeColor,
  fillColor,
  strokeWidth = DEFAULT_ARROW_STROKE_WIDTH,
  flipH,
  flipV,
  curveBend,
  shapePoints,
  shapeCurveControl,
  arrowHeadSize,
  boxW,
  boxH,
  style,
}: {
  element?: SlideElement;
  kind?: PresentationShapeKind;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  flipH?: boolean;
  flipV?: boolean;
  curveBend?: number;
  shapePoints?: Array<{ x: number; y: number }>;
  shapeCurveControl?: { x: number; y: number };
  arrowHeadSize?: number;
  boxW?: number;
  boxH?: number;
  style?: React.CSSProperties;
}) {
  const base: SlideElement = element ?? {
    id: 'preview',
    type: 'shape',
    shapeKind: kindProp || 'arrow',
    x: 0,
    y: 0,
    w: boxW ?? 28,
    h: boxH ?? 10,
    zIndex: 1,
    strokeColor,
    fillColor,
    strokeWidth,
    flipH,
    flipV,
    curveBend,
    shapePoints,
    shapeCurveControl,
    arrowHeadSize,
  };
  const norm = normalizeShapeElement({
    ...base,
    strokeColor: strokeColor ?? base.strokeColor,
    fillColor: fillColor ?? base.fillColor,
    strokeWidth: strokeWidth ?? base.strokeWidth,
  });
  const kind = norm.shapeKind || 'arrow';
  const stroke = norm.strokeColor || (kind === 'arrow' || kind === 'line' ? '#212121' : JOHNNY_PRESENTATION.primary);
  const fill =
    norm.fillColor && norm.fillColor !== 'transparent' && norm.fillColor !== 'none'
      ? norm.fillColor
      : 'none';
  const sw = Math.max(1.5, Math.min(28, norm.strokeWidth ?? DEFAULT_ARROW_STROKE_WIDTH));
  const points = resolveShapePoints(norm);
  const curveControl = kind === 'curved-arrow' ? resolveCurveControl(points, norm) : null;
  const headSize = resolveArrowHeadSize(norm);
  const boxAspect = Math.max((norm.w || 1) / Math.max(norm.h || 1, 0.5), 0.15);
  const { shaftOnly, head } = buildLinePathD(kind, points, curveControl, headSize, boxAspect);
  const showHead = shapeHasArrowHead(kind) && head;

  if (isLineLikeShapeKind(kind)) {
    return (
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible', ...style }}
        aria-hidden
      >
        <path
          d={shaftOnly}
          fill="none"
          stroke={stroke}
          strokeWidth={Math.max(sw, 2)}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {showHead ? <polygon points={head!} fill={stroke} stroke="none" /> : null}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible', ...style }}
      aria-hidden
    >
      {kind === 'rect' && (
        <rect x="10" y="18" width="80" height="64" rx="4" fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
      {kind === 'ellipse' && (
        <ellipse cx="50" cy="50" rx="38" ry="34" fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
    </svg>
  );
}
