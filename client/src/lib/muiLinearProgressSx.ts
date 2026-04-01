import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Einheitlicher Look für determinate LinearProgress:
 * leicht eingelassene Spur, abgerundeter Balken mit Verlauf und weichem Übergang bei Wertänderung.
 */
export function determinateLinearProgressSx(
  barBackground: string,
  options?: { height?: number; barGlow?: string }
): SxProps<Theme> {
  const height = options?.height ?? 10;
  const glow = options?.barGlow ?? 'rgba(15, 23, 42, 0.12)';
  return {
    height,
    borderRadius: 9999,
    overflow: 'hidden',
    bgcolor: 'rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: 'inset 0 1px 3px rgba(15, 23, 42, 0.07)',
    '& .MuiLinearProgress-bar': {
      borderRadius: 9999,
      background: barBackground,
      boxShadow: `0 1px 14px ${glow}`,
      transition: 'transform 0.55s cubic-bezier(0.33, 1, 0.68, 1)',
    },
  };
}

/** Gradient aus einer Akzentfarbe (für z. B. Reisekräfte). */
export function linearGradientFromAccent(accent: string): string {
  return `linear-gradient(90deg, ${accent}99 0%, ${accent} 48%, ${accent}cc 100%)`;
}

/** Indeterminate Balken (Ladezustand): gleiche Spur, farbiger Streifen. */
export const indeterminateLinearProgressSx: SxProps<Theme> = {
  height: 7,
  borderRadius: 9999,
  overflow: 'hidden',
  bgcolor: 'rgba(15, 23, 42, 0.06)',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.06)',
  '& .MuiLinearProgress-bar': {
    borderRadius: 9999,
    background: 'linear-gradient(90deg, #64b5f6 0%, #1976d2 50%, #0d47a1 100%)',
  },
};
