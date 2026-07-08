/** Alpenlandschaft – Hintergrund für Reisebegleiter (SuS & Lehrkraft) */
export const REISEBEGLEITER_BG = '/reisebegleiter/alpenlandschaft.png';

export const glassCardSx = {
  borderRadius: 3,
  bgcolor: 'rgba(255, 255, 255, 0.78)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255, 255, 255, 0.65)',
  boxShadow: '0 8px 28px rgba(15, 23, 42, 0.1)',
} as const;

export const scenicOverlaySx = {
  position: 'absolute' as const,
  inset: 0,
  background:
    'linear-gradient(180deg, rgba(15, 40, 70, 0.42) 0%, rgba(10, 30, 55, 0.55) 45%, rgba(8, 25, 45, 0.62) 100%)',
  pointerEvents: 'none' as const,
};

export const scenicFrameSx = (compact?: boolean) => ({
  position: 'relative' as const,
  borderRadius: 3,
  overflow: 'hidden' as const,
  minHeight: compact ? 320 : 420,
  backgroundImage: `url(${REISEBEGLEITER_BG})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center 40%',
});

export const scenicFooterQuote =
  'Jeder Schritt zählt. Deine Reise wächst mit dir.';
