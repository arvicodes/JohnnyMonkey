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
  '#FF9800',
  '#1565C0',
  '#6A1B9A',
  '#C62828',
  '#37474F',
];

export const TEXT_COLOR_PRESETS = [
  '#1a1a2e',
  '#2E7D32',
  '#1B5E20',
  '#1565C0',
  '#C62828',
  '#FF9800',
  '#6A1B9A',
  '#37474F',
  '#FFFFFF',
];

export const HIGHLIGHT_PRESETS = [
  '#FFF59D',
  '#C5E1A5',
  '#90CAF9',
  '#F8BBD0',
  '#FFCC80',
  '#CE93D8',
  '#E0E0E0',
];

export function accentGradient(color: string): string {
  return `linear-gradient(90deg, ${color} 0%, ${color}88 45%, transparent 100%)`;
}
