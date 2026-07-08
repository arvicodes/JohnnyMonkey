import {
  DEFAULT_LEARNING_GROUP_COLOR,
  LEARNING_GROUP_COLOR_PRESETS,
} from '../lib/learningGroupAppearance';

export const DEFAULT_PROFILE_COLOR = DEFAULT_LEARNING_GROUP_COLOR;

export { LEARNING_GROUP_COLOR_PRESETS as PROFILE_COLOR_PRESETS };

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function profileHeaderGradient(color: string): string {
  const c = color || DEFAULT_PROFILE_COLOR;
  return `linear-gradient(135deg, ${hexWithAlpha(c, 0.22)} 0%, ${hexWithAlpha(c, 0.45)} 50%, ${hexWithAlpha(c, 0.72)} 100%)`;
}

export function profileTitleGradient(color: string): string {
  const c = color || DEFAULT_PROFILE_COLOR;
  return `linear-gradient(135deg, ${c} 0%, ${hexWithAlpha(c, 0.85)} 100%)`;
}

export function profileSoftBg(color: string): string {
  return hexWithAlpha(color || DEFAULT_PROFILE_COLOR, 0.12);
}
