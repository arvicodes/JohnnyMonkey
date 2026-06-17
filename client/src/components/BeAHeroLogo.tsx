import React from 'react';
import { Box, Tooltip, Typography, type SxProps, type Theme } from '@mui/material';
import { beAHeroPhaseChipSx, beAHeroPhaseStyle, protocolPalette } from '../lib/beAHeroUi';

const inlineFrameSx = {
  border: '1px solid',
  borderColor: 'rgba(25, 118, 210, 0.22)',
  borderRadius: 2,
  background: 'linear-gradient(145deg, #ffffff 0%, #f0f6ff 100%)',
};

const heroBannerFrameSx = {
  border: '1px solid rgba(255,255,255,0.28)',
  borderRadius: 2,
  background: 'rgba(255,255,255,0.14)',
  backdropFilter: 'blur(6px)',
};

export const BE_A_HERO_EMOJI = '🦸';
export const BE_A_HERO_TAGLINE = 'Warm-up · Workout · Cooldown';

type BeAHeroLogoProps = {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
  titleColor?: string;
  taglineColor?: string;
  layout?: 'inline' | 'stacked';
  framed?: boolean;
  heroBanner?: boolean;
  emoji?: string;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
};

export function BeAHeroLogo({
  size = 32,
  showWordmark = false,
  showTagline = false,
  titleColor = protocolPalette.heading,
  taglineColor,
  layout = 'inline',
  framed = false,
  heroBanner = false,
  emoji = BE_A_HERO_EMOJI,
  ariaLabel,
  sx,
}: BeAHeroLogoProps) {
  const stacked = layout === 'stacked';
  const resolvedTitleColor = heroBanner ? '#fff' : titleColor;
  const resolvedTaglineColor = heroBanner ? 'rgba(255,255,255,0.82)' : (taglineColor ?? protocolPalette.textSecondary);
  const flushInline = layout === 'inline' && showWordmark;
  const unifiedFrame = (framed || heroBanner) && flushInline;
  const soloFrame = framed && !flushInline && !heroBanner;

  const logo = (
    <Box
      sx={{
        width: flushInline ? 'auto' : size,
        height: flushInline ? '100%' : size,
        aspectRatio: flushInline ? '1' : undefined,
        flexShrink: 0,
        m: 0,
        p: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(soloFrame
          ? {
              border: '1px solid',
              borderColor: 'rgba(25, 118, 210, 0.22)',
              borderRadius: 2,
              background: 'linear-gradient(145deg, #ffffff 0%, #f0f6ff 100%)',
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.14)',
              filter: 'drop-shadow(0 2px 4px rgba(25, 118, 210, 0.15))',
            }
          : heroBanner && flushInline
            ? heroBannerFrameSx
            : {}),
        fontSize: framed ? (flushInline ? '1.35em' : size * 0.58) : size * 0.88,
        lineHeight: 1,
      }}
      aria-label={ariaLabel ?? (emoji === BE_A_HERO_EMOJI ? 'Be a Hero' : undefined)}
      role="img"
    >
      {emoji}
    </Box>
  );

  if (!showWordmark && !showTagline) {
    return <Box sx={sx}>{logo}</Box>;
  }

  const titleSize = flushInline
    ? `${Math.round(size * 0.26)}px`
    : size >= 72
      ? '1.15rem'
      : size >= 48
        ? '0.98rem'
        : size >= 36
          ? '0.92rem'
          : '0.88rem';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'center' : unifiedFrame ? 'center' : 'stretch',
        gap: flushInline ? (unifiedFrame ? 1 : 1.1) : stacked ? 1 : 0,
        m: 0,
        p: 0,
        minWidth: 0,
        height: flushInline ? '100%' : stacked ? undefined : size,
        maxHeight: flushInline ? '100%' : undefined,
        textAlign: stacked ? 'center' : 'left',
        ...(unifiedFrame
          ? heroBanner
            ? { ...heroBannerFrameSx, px: 1.35, py: 0, boxShadow: 'none' }
            : {
                ...inlineFrameSx,
                px: 1.25,
                py: 0,
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.14)',
              }
          : {}),
        ...sx,
      }}
    >
      {logo}
      <Box
        sx={{
          minWidth: 0,
          flex: flushInline ? 1 : undefined,
          height: flushInline ? '100%' : undefined,
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {showWordmark && (
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontWeight: 800,
              color: resolvedTitleColor,
              fontSize: titleSize,
              lineHeight: 1,
              letterSpacing: flushInline ? '0.04em' : '0.06em',
              whiteSpace: flushInline ? 'nowrap' : undefined,
            }}
          >
            BE A HERO
          </Typography>
        )}
        {showTagline && (
          <Typography
            component="span"
            sx={{
              display: 'block',
              color: resolvedTaglineColor,
              fontSize: '0.72rem',
              fontWeight: 600,
              lineHeight: 1.35,
              mt: showWordmark ? 0.25 : 0,
            }}
          >
            {BE_A_HERO_TAGLINE}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const PHASE_LEGEND: { key: 'warmup' | 'workout' | 'cooldown'; label: string }[] = [
  { key: 'warmup', label: 'Warm-up' },
  { key: 'workout', label: 'Workout' },
  { key: 'cooldown', label: 'Cooldown' },
];

export function BeAHeroPhaseLegend({ compact = false }: { compact?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 0.5 : 0.65,
        justifyContent: 'center',
      }}
    >
      {PHASE_LEGEND.map(({ key, label }) => (
        <Box key={key} sx={beAHeroPhaseChipSx(key, true)}>
          {label}
        </Box>
      ))}
    </Box>
  );
}

export function BeAHeroWorkoutPhaseDots({
  warmup,
  workout,
  cooldown,
}: {
  warmup: boolean;
  workout: boolean;
  cooldown: boolean;
}) {
  const items = [
    { key: 'warmup' as const, filled: warmup, title: 'Warm-up' },
    { key: 'workout' as const, filled: workout, title: 'Workout' },
    { key: 'cooldown' as const, filled: cooldown, title: 'Cooldown' },
  ];

  return (
    <Box sx={{ display: 'flex', gap: 0.55, mt: 0.45, alignItems: 'center' }}>
      {items.map(({ key, filled, title }) => {
        const s = beAHeroPhaseStyle(key);
        return (
          <Tooltip key={key} title={title}>
            <Box
              sx={{
        width: 11,
        height: 11,
        borderRadius: '50%',
        bgcolor: filled ? s.accentMain : 'rgba(13, 71, 161, 0.12)',
        boxShadow: filled ? `0 0 0 2px ${s.borderColor}, 0 0 8px ${s.progressGlow}` : 'none',
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
}
