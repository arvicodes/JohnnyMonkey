/** Bildrahmen wie PowerPoint: Formatvorlagen + Linie (Farbe, Stärke, Strich). */

import type { CSSProperties } from 'react';
import { JOHNNY_PRESENTATION } from './presentationTheme';

export type ImageFrameDash = 'solid' | 'dashed' | 'dotted' | 'double';
export type ImageFrameShadow = 'none' | 'soft' | 'hard';

export type ImageFramePresetId =
  | 'none'
  | 'simple-black'
  | 'simple-white'
  | 'simple-gray'
  | 'simple-accent'
  | 'mat-white'
  | 'mat-black'
  | 'intense-black'
  | 'intense-gold'
  | 'rounded'
  | 'shadow'
  | 'polaroid'
  | 'dashed';

export interface SlideImageFrame {
  preset?: ImageFramePresetId | 'custom';
  color?: string;
  width?: number;
  dash?: ImageFrameDash;
  radius?: number;
  pad?: number;
  padBottom?: number;
  padColor?: string;
  shadow?: ImageFrameShadow;
}

export const IMAGE_FRAME_PRESETS: Record<ImageFramePresetId, SlideImageFrame> = {
  none: { preset: 'none' },
  'simple-black': {
    preset: 'simple-black',
    color: '#1a1a1a',
    width: 3,
    dash: 'solid',
  },
  'simple-white': {
    preset: 'simple-white',
    color: '#ffffff',
    width: 4,
    dash: 'solid',
    shadow: 'soft',
  },
  'simple-gray': {
    preset: 'simple-gray',
    color: '#757575',
    width: 2,
    dash: 'solid',
  },
  'simple-accent': {
    preset: 'simple-accent',
    color: 'accent',
    width: 3,
    dash: 'solid',
  },
  'mat-white': {
    preset: 'mat-white',
    color: '#bdbdbd',
    width: 1,
    dash: 'solid',
    pad: 10,
    padColor: '#ffffff',
    shadow: 'soft',
  },
  'mat-black': {
    preset: 'mat-black',
    color: '#111111',
    width: 1,
    dash: 'solid',
    pad: 10,
    padColor: '#1a1a1a',
    shadow: 'hard',
  },
  'intense-black': {
    preset: 'intense-black',
    color: '#111111',
    width: 10,
    dash: 'solid',
  },
  'intense-gold': {
    preset: 'intense-gold',
    color: '#C9A227',
    width: 8,
    dash: 'solid',
    shadow: 'soft',
  },
  rounded: {
    preset: 'rounded',
    color: '#1a1a1a',
    width: 2,
    dash: 'solid',
    radius: 14,
    shadow: 'soft',
  },
  shadow: {
    preset: 'shadow',
    width: 0,
    radius: 2,
    shadow: 'hard',
  },
  polaroid: {
    preset: 'polaroid',
    color: '#e0e0e0',
    width: 1,
    dash: 'solid',
    pad: 8,
    padBottom: 22,
    padColor: '#ffffff',
    shadow: 'soft',
  },
  dashed: {
    preset: 'dashed',
    color: '#424242',
    width: 2,
    dash: 'dashed',
  },
};

export const IMAGE_FRAME_PRESET_ORDER: ImageFramePresetId[] = [
  'none',
  'simple-black',
  'simple-white',
  'simple-gray',
  'simple-accent',
  'mat-white',
  'mat-black',
  'intense-black',
  'intense-gold',
  'rounded',
  'shadow',
  'polaroid',
  'dashed',
];

export const IMAGE_FRAME_PRESET_LABELS: Record<ImageFramePresetId, string> = {
  none: 'Kein Rahmen',
  'simple-black': 'Einfach, Schwarz',
  'simple-white': 'Einfach, Weiß',
  'simple-gray': 'Einfach, Grau',
  'simple-accent': 'Einfach, Akzent',
  'mat-white': 'Passepartout, Weiß',
  'mat-black': 'Passepartout, Schwarz',
  'intense-black': 'Intensiv, Schwarz',
  'intense-gold': 'Intensiv, Gold',
  rounded: 'Abgerundet',
  shadow: 'Schatten',
  polaroid: 'Polaroid',
  dashed: 'Gestrichelt',
};

export const IMAGE_FRAME_WIDTHS = [1, 2, 3, 4, 6, 8] as const;

export const IMAGE_FRAME_DASHES: Array<{ id: ImageFrameDash; label: string }> = [
  { id: 'solid', label: 'Durchgezogen' },
  { id: 'dashed', label: 'Gestrichelt' },
  { id: 'dotted', label: 'Gepunktet' },
  { id: 'double', label: 'Doppelt' },
];

export const IMAGE_FRAME_COLORS = [
  '#1a1a1a',
  '#ffffff',
  '#757575',
  '#424242',
  '#5D4037',
  '#C9A227',
];

function resolveFrameColor(color: string | undefined, accent: string): string {
  if (!color || color === 'accent') return accent || JOHNNY_PRESENTATION.primary;
  return color;
}

export function imageFrameIsActive(frame?: SlideImageFrame | null): boolean {
  if (!frame || frame.preset === 'none') return false;
  return Boolean(
    (frame.width && frame.width > 0) ||
      (frame.pad && frame.pad > 0) ||
      (frame.padBottom && frame.padBottom > 0) ||
      (frame.radius && frame.radius > 0) ||
      (frame.shadow && frame.shadow !== 'none'),
  );
}

function shadowCss(kind: ImageFrameShadow | undefined, scale: number): string | undefined {
  if (kind === 'soft') {
    return `0 ${2 * scale}px ${10 * scale}px rgba(0,0,0,0.22)`;
  }
  if (kind === 'hard') {
    return `0 ${4 * scale}px ${14 * scale}px rgba(0,0,0,0.38)`;
  }
  return undefined;
}

export function imageFrameParts(
  frame: SlideImageFrame | undefined,
  scale: number,
  accent = JOHNNY_PRESENTATION.primary,
): { wrap: CSSProperties; inner: CSSProperties; img: CSSProperties; active: boolean } {
  const empty = { wrap: {}, inner: {}, img: {}, active: false };
  if (!imageFrameIsActive(frame) || !frame) return empty;

  const width = Math.max(0, (frame.width || 0) * scale);
  const pad = Math.max(0, (frame.pad || 0) * scale);
  const padBottom = Math.max(pad, (frame.padBottom || frame.pad || 0) * scale);
  const radius = Math.max(0, (frame.radius || 0) * scale);
  const color = resolveFrameColor(frame.color, accent);
  const dash = frame.dash || 'solid';
  const lineWidth = dash === 'double' ? Math.max(width, 3 * scale) : width;

  const wrap: CSSProperties = {
    boxShadow: shadowCss(frame.shadow, scale),
    borderRadius: radius ? `${radius}px` : undefined,
    overflow: 'visible',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
  };

  const inner: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderRadius: radius ? `${radius}px` : undefined,
    border:
      lineWidth > 0 ? `${lineWidth}px ${dash} ${color}` : undefined,
    padding:
      pad > 0 || padBottom > 0
        ? `${pad}px ${pad}px ${padBottom}px ${pad}px`
        : undefined,
    background: pad > 0 || padBottom > 0 ? frame.padColor || '#fff' : undefined,
  };

  const img: CSSProperties = {
    borderRadius: radius && pad <= 0 ? `${Math.max(0, radius - lineWidth)}px` : undefined,
  };

  return { wrap, inner, img, active: true };
}

export function withImageFrameColor(
  frame: SlideImageFrame | undefined,
  color: string,
): SlideImageFrame {
  const base = frame && frame.preset !== 'none' ? { ...frame } : { ...IMAGE_FRAME_PRESETS['simple-black'] };
  return {
    ...base,
    preset: 'custom',
    color,
    width: base.width && base.width > 0 ? base.width : 3,
    dash: base.dash || 'solid',
  };
}

export function withImageFrameWidth(
  frame: SlideImageFrame | undefined,
  width: number,
): SlideImageFrame {
  const base = frame && frame.preset !== 'none' ? { ...frame } : { ...IMAGE_FRAME_PRESETS['simple-black'] };
  return {
    ...base,
    preset: 'custom',
    width,
    color: base.color || '#1a1a1a',
    dash: base.dash || 'solid',
  };
}

export function withImageFrameDash(
  frame: SlideImageFrame | undefined,
  dash: ImageFrameDash,
): SlideImageFrame {
  const base = frame && frame.preset !== 'none' ? { ...frame } : { ...IMAGE_FRAME_PRESETS['simple-black'] };
  return {
    ...base,
    preset: 'custom',
    dash,
    color: base.color || '#1a1a1a',
    width: Math.max(base.width || 3, dash === 'double' ? 4 : 2),
  };
}
