import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import { keyframes } from '@mui/system';
import { apiGet, apiPost } from '../lib/api';
import { determinateLinearProgressSx, linearGradientFromAccent } from '../lib/muiLinearProgressSx';
import { glassCardSx, REISEBEGLEITER_BG, scenicFooterQuote } from '../lib/reisebegleiterScenic';

export type JourneyState = {
  weitePoints: number;
  funkenPoints: number;
  hingabePoints: number;
  companionStage: string;
  eggCarePercent: number;
  eggFoundAt: string | null;
  hatchedAt: string | null;
  postHatchXp: number;
  journeyThreshold: number;
  journeyComplete: boolean;
  minOfThree: number;
  canCareToday: boolean;
};

export const STAGE_COPY: Record<
  string,
  { title: string; emoji: string; hint: string }
> = {
  JOURNEY: {
    title: 'Unterwegs',
    emoji: '🧭',
    hint: 'Sammle in allen drei Reisekräften genug – dann findest du ein Ei.',
  },
  EGG: {
    title: 'Ei gefunden',
    emoji: '🥚',
    hint: 'Komm täglich vorbei und pflege dein Ei, bis es schlüpft.',
  },
  HATCHLING: {
    title: 'Schlüpfling',
    emoji: '🐣',
    hint: 'Dein Begleiter ist da! Lern weiter – er wächst mit dir.',
  },
  YOUNG: {
    title: 'Wachstum',
    emoji: '🌿',
    hint: 'Stark! Noch ein Stück Erfahrung bis zur nächsten Stufe.',
  },
  BUDDY: {
    title: 'Treuer Begleiter',
    emoji: '✨',
    hint: 'Ihr seid ein gutes Team. Weiter die Reise genießen!',
  },
};

/** Ruhige Kompass-Bewegung (Unterwegs) */
const compassSeek = keyframes`
  0%, 100% { transform: rotate(-9deg); }
  50% { transform: rotate(9deg); }
`;

const compassEmojiMotion = {
  display: 'inline-block' as const,
  transformOrigin: '50% 52%',
  animation: `${compassSeek} 4.2s ease-in-out infinite`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
};

/** Ruhiges „Schweben“ der großen Emoji-Kachel im Popover */
const modalIconFloat = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
`;

/** Sehr zartes Atmen nur für das Emoji (nicht Kompass – der dreht) */
const modalEmojiBreath = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.025); }
`;

/** Kleine Funken in der Badge-Vorschau (Kraft „Funken“) */
const funkeTwinkle = keyframes`
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.65);
  }
  45% {
    opacity: 0.95;
    transform: scale(1);
  }
  58% {
    opacity: 0.65;
    transform: scale(0.88);
  }
`;

const FUNKEN_PREVIEW_COLOR = '#ff6f00';
const PREVIEW_SPARKS: Array<{
  key: string;
  sx: Record<string, string | number>;
  delay: string;
}> = [
  { key: 'a', delay: '0s', sx: { top: -2, right: 4 } },
  { key: 'b', delay: '0.45s', sx: { top: 12, left: -2 } },
  { key: 'c', delay: '0.9s', sx: { bottom: 0, right: 18 } },
  { key: 'd', delay: '1.35s', sx: { top: 22, right: -2 } },
];

/** Funken-Positionen für die große Emoji-Kachel im Popover (~108px) */
const MODAL_SPARKS: typeof PREVIEW_SPARKS = [
  { key: 'm-a', delay: '0s', sx: { top: -3, right: 12 } },
  { key: 'm-b', delay: '0.55s', sx: { top: 34, left: -3 } },
  { key: 'm-c', delay: '1.1s', sx: { bottom: -3, right: 42 } },
  { key: 'm-d', delay: '1.65s', sx: { top: 54, right: -3 } },
];

/** Passend zum Server: Schlupf → Wachstum bei 36 XP, Reife bei 96 XP */
const XP_TO_YOUNG = 36;
const XP_TO_BUDDY = 96;

/** Ring-Füllstand 0–100 je Phase (Reise → Ei → Entwicklung) */
export function companionRingPercent(state: JourneyState): number {
  const th = Math.max(1, state.journeyThreshold);
  const minP = Math.min(state.weitePoints, state.funkenPoints, state.hingabePoints);
  switch (state.companionStage) {
    case 'JOURNEY':
      return Math.min(100, (minP / th) * 100);
    case 'EGG':
      return Math.min(100, state.eggCarePercent);
    case 'HATCHLING':
      return Math.min(100, (state.postHatchXp / XP_TO_YOUNG) * 100);
    case 'YOUNG': {
      const span = XP_TO_BUDDY - XP_TO_YOUNG;
      if (span <= 0) return 100;
      return Math.min(100, Math.max(0, ((state.postHatchXp - XP_TO_YOUNG) / span) * 100));
    }
    case 'BUDDY':
      return 100;
    default:
      return 0;
  }
}

function ringAccentColor(stage: string): string {
  switch (stage) {
    case 'JOURNEY':
      return '#1976d2';
    case 'EGG':
      return '#fb8c00';
    case 'HATCHLING':
      return '#43a047';
    case 'YOUNG':
      return '#8e24aa';
    case 'BUDDY':
      return '#5c6bc0';
    default:
      return '#1976d2';
  }
}

const FORCE_META = [
  {
    key: 'weitePoints' as const,
    label: 'Weite',
    sub: 'Vorankommen & Aktivität',
    color: '#1565c0',
  },
  {
    key: 'funkenPoints' as const,
    label: 'Funken',
    sub: 'Neugier & Entdecken',
    color: '#ef6c00',
  },
  {
    key: 'hingabePoints' as const,
    label: 'Hingabe',
    sub: 'Üben & Konsequenz',
    color: '#6a1b9a',
  },
] as const;

const RING_COL_W = FORCE_META[0].color;
const RING_COL_F = FORCE_META[1].color;
const RING_COL_H = FORCE_META[2].color;

/**
 * Ring in drei Farben: Bogenlänge ∝ Weite / Funken / Hingabe (Anteil an der Summe).
 * Er füllt immer den ganzen Kreis (z. B. für volle Anzeigen).
 */
export function tricolorConicGradient(state: JourneyState): string {
  const w = Math.max(0, state.weitePoints);
  const f = Math.max(0, state.funkenPoints);
  const h = Math.max(0, state.hingabePoints);
  const total = w + f + h;
  if (total === 0) {
    return `conic-gradient(from -90deg, ${RING_COL_W} 0deg 120deg, ${RING_COL_F} 120deg 240deg, ${RING_COL_H} 240deg 360deg)`;
  }
  const c1 = (w / total) * 360;
  const c2 = ((w + f) / total) * 360;
  return `conic-gradient(from -90deg, ${RING_COL_W} 0deg ${c1}deg, ${RING_COL_F} ${c1}deg ${c2}deg, ${RING_COL_H} ${c2}deg 360deg)`;
}

/** Sichtbarer „leerer“ Rest im Avatar-Badge; hell genug, dass Farbbögen davor kontrastieren */
const PREVIEW_RING_EMPTY = 'rgba(203, 213, 225, 0.92)';

/** Mindestwinkel (Grad), damit kleine Prozente am Ring noch als Farbbogen erkennbar sind */
const PREVIEW_MIN_FILL_DEG = 10;

/**
 * Füll-Prozent nur für die Avatar-Vorschau: Unterwegs zeigt das Minimum der drei Kräfte,
 * sobald alle > 0 sind (Ziel fürs Ei). Solange noch eine Kraft 0 ist, wirkt min() immer 0 –
 * dann nutzen wir den Mittelwert der drei „Tanks“, damit gesammelte Punkte sichtbar werden.
 */
function badgePreviewFillPercent(state: JourneyState): number {
  const th = Math.max(1, state.journeyThreshold);
  if (state.companionStage !== 'JOURNEY') {
    return companionRingPercent(state);
  }
  const w = Math.max(0, state.weitePoints);
  const f = Math.max(0, state.funkenPoints);
  const h = Math.max(0, state.hingabePoints);
  const minP = Math.min(w, f, h);
  const minPct = Math.min(100, (minP / th) * 100);
  const total = w + f + h;
  if (total === 0) return 0;
  if (minP > 0) return minPct;
  const avgPct = ((w / th + f / th + h / th) / 3) * 100;
  return Math.min(100, avgPct);
}

/**
 * Wie tricolorConicGradient, aber nur bis zur Vorschau-Füllung; der Rest bleibt als leerer Bogen.
 */
function previewRingConicGradient(state: JourneyState): string {
  const fillPct = badgePreviewFillPercent(state);
  if (fillPct >= 99.999) {
    return tricolorConicGradient(state);
  }
  let fillDeg = Math.max(0, Math.min(360, (fillPct / 100) * 360));
  if (fillPct > 0 && fillPct < 100) {
    fillDeg = Math.max(fillDeg, PREVIEW_MIN_FILL_DEG);
  }
  fillDeg = Math.min(360, fillDeg);

  const w = Math.max(0, state.weitePoints);
  const f = Math.max(0, state.funkenPoints);
  const h = Math.max(0, state.hingabePoints);
  const total = w + f + h;

  if (fillDeg <= 0) {
    return `conic-gradient(from -90deg, ${PREVIEW_RING_EMPTY} 0deg 360deg)`;
  }

  if (total === 0) {
    const a = fillDeg / 3;
    const b = (2 * fillDeg) / 3;
    return `conic-gradient(from -90deg, ${RING_COL_W} 0deg ${a}deg, ${RING_COL_F} ${a}deg ${b}deg, ${RING_COL_H} ${b}deg ${fillDeg}deg, ${PREVIEW_RING_EMPTY} ${fillDeg}deg 360deg)`;
  }

  const c1 = (w / total) * fillDeg;
  const c2 = ((w + f) / total) * fillDeg;
  return `conic-gradient(from -90deg, ${RING_COL_W} 0deg ${c1}deg, ${RING_COL_F} ${c1}deg ${c2}deg, ${RING_COL_H} ${c2}deg ${fillDeg}deg, ${PREVIEW_RING_EMPTY} ${fillDeg}deg 360deg)`;
}

type JourneyDetailProps = {
  state: JourneyState;
  careLoading: boolean;
  onCare: () => void;
  scenic?: boolean;
  compact?: boolean;
};

const WANDERKARTE_STEPS = [
  { stage: 'JOURNEY', label: 'Unterwegs', emoji: '🧭' },
  { stage: 'EGG', label: 'Ei finden', emoji: '🥚' },
  { stage: 'HATCHLING', label: 'Schlüpfen', emoji: '🐣' },
  { stage: 'YOUNG', label: 'Wachstum', emoji: '🌿' },
  { stage: 'BUDDY', label: 'Begleiter', emoji: '✨' },
] as const;

const mapHerePulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.28); }
  50% { box-shadow: 0 0 0 7px rgba(25, 118, 210, 0); }
`;

function JourneyWanderkarte({
  currentStage,
  scenic = false,
  compact = false,
}: {
  currentStage: string;
  scenic?: boolean;
  compact?: boolean;
}) {
  const currentIdx = Math.max(0, WANDERKARTE_STEPS.findIndex((s) => s.stage === currentStage));
  const accent = ringAccentColor(currentStage);

  return (
    <Box
      component="section"
      aria-label="Wanderkarte der Reise"
      sx={{
        mb: scenic ? (compact ? 1.25 : 1.5) : 2.25,
        p: scenic ? (compact ? 1.1 : 1.35) : 1.5,
        borderRadius: 2.5,
        position: 'relative',
        overflow: 'hidden',
        ...(scenic
          ? {
              border: '1px solid rgba(255, 255, 255, 0.55)',
              backgroundImage: `url(${REISEBEGLEITER_BG})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 55%',
              boxShadow: '0 4px 18px rgba(15, 23, 42, 0.12)',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.82) 55%, rgba(248,250,252,0.9) 100%)',
                pointerEvents: 'none',
              },
            }
          : {
              border: '1px solid rgba(120, 90, 55, 0.18)',
              background: `
                linear-gradient(165deg, rgba(255, 252, 245, 0.97) 0%, rgba(236, 245, 236, 0.55) 42%, rgba(232, 240, 252, 0.65) 100%)
              `,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                opacity: 0.07,
                pointerEvents: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath fill='%234a3728' d='M0 40h20l10-8 10 8 20-12v12H0z'/%3E%3C/svg%3E")`,
                backgroundSize: '80px 80px',
              },
            }),
      }}
    >
      <Typography
        sx={{
          position: 'relative',
          zIndex: 1,
          fontSize: '0.62rem',
          fontWeight: 800,
          letterSpacing: '0.14em',
          color: 'rgba(71, 55, 40, 0.75)',
          mb: 1.1,
          textTransform: 'uppercase',
        }}
      >
        Wanderkarte
      </Typography>
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 0,
          overflowX: 'auto',
          pb: 0.25,
          mx: -0.25,
          px: 0.25,
          scrollbarWidth: 'thin',
        }}
      >
        {WANDERKARTE_STEPS.map((step, i) => {
          const done = i < currentIdx;
          const here = i === currentIdx;
          const ahead = i > currentIdx;

          return (
            <React.Fragment key={step.stage}>
              {i > 0 && (
                <Box
                  sx={{
                    flex: '1 1 8px',
                    minWidth: 6,
                    mt: 2.25,
                    height: 0,
                    borderTopWidth: 2,
                    borderTopStyle: done ? 'solid' : 'dashed',
                    borderTopColor: done ? 'rgba(76, 175, 80, 0.65)' : 'rgba(148, 163, 184, 0.55)',
                    opacity: ahead ? 0.65 : 1,
                  }}
                />
              )}
              <Box
                sx={{
                  flex: '0 0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 56,
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    lineHeight: 1,
                    bgcolor: done
                      ? 'rgba(76, 175, 80, 0.2)'
                      : here
                        ? 'rgba(255,255,255,0.95)'
                        : 'rgba(241, 245, 249, 0.9)',
                    border: '2px solid',
                    borderColor: here ? accent : done ? 'rgba(56, 142, 60, 0.55)' : 'rgba(203, 213, 225, 0.95)',
                    opacity: ahead ? 0.5 : 1,
                    filter: ahead ? 'grayscale(0.25)' : 'none',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    ...(here
                      ? {
                          transform: 'scale(1.06)',
                          animation: `${mapHerePulse} 2.6s ease-in-out infinite`,
                          '@media (prefers-reduced-motion: reduce)': {
                            animation: 'none',
                            boxShadow: `0 0 0 2px ${accent}40`,
                          },
                        }
                      : {}),
                  }}
                  aria-hidden
                >
                  {done ? '✓' : step.emoji}
                </Box>
                <Typography
                  sx={{
                    mt: 0.45,
                    fontSize: '0.58rem',
                    fontWeight: here ? 800 : 600,
                    lineHeight: 1.2,
                    color: ahead ? 'rgba(100, 116, 139, 0.75)' : 'rgba(51, 65, 85, 0.92)',
                    maxWidth: 56,
                  }}
                >
                  {step.label}
                </Typography>
                {here && (
                  <Typography
                    sx={{
                      mt: 0.2,
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: accent,
                      textTransform: 'uppercase',
                    }}
                  >
                    Du bist hier
                  </Typography>
                )}
              </Box>
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}

export function ReisebegleiterDetailContent({
  state,
  careLoading,
  onCare,
  scenic = false,
  compact = false,
}: JourneyDetailProps) {
  const stage = STAGE_COPY[state.companionStage] || STAGE_COPY.JOURNEY;
  const th = state.journeyThreshold;
  const accent = ringAccentColor(state.companionStage);
  const isCompass = state.companionStage === 'JOURNEY';
  const thDetail = Math.max(1, state.journeyThreshold);
  const funkBoostDetail = 0.55 + 0.45 * Math.min(1, state.funkenPoints / thDetail);
  const iconSize = compact ? 80 : scenic ? 96 : 108;
  const iconEmojiSize = compact ? '2.75rem' : scenic ? '3.2rem' : '3.65rem';

  const heroBox = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: compact ? 1.25 : 2,
        mb: scenic ? (compact ? 1.25 : 1.5) : 2.5,
        p: compact ? 1.35 : 2,
        ...(scenic
          ? glassCardSx
          : {
              borderRadius: 2.5,
              background: `linear-gradient(135deg, ${accent}10 0%, rgba(255,255,255,0.9) 100%)`,
              border: '1px solid rgba(15, 23, 42, 0.06)',
            }),
      }}
    >
        <Box
          sx={{
            position: 'relative',
            width: iconSize,
            height: iconSize,
            borderRadius: scenic ? '18px' : '20px',
            bgcolor: 'rgba(255,255,255,0.95)',
            boxShadow: '0 3px 12px rgba(15,23,42,0.11)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'visible',
            animation: `${modalIconFloat} 5.6s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
          aria-hidden
        >
          {MODAL_SPARKS.map((s) => (
            <Box
              key={`d-${s.key}`}
              sx={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 2,
                bgcolor: FUNKEN_PREVIEW_COLOR,
                boxShadow: `0 0 8px 2px ${FUNKEN_PREVIEW_COLOR}aa`,
                opacity: funkBoostDetail,
                animation: `${funkeTwinkle} 3.4s ease-in-out infinite`,
                animationDelay: s.delay,
                '@media (prefers-reduced-motion: reduce)': {
                  animation: 'none',
                  opacity: 0.5 * funkBoostDetail,
                },
                ...s.sx,
              }}
            />
          ))}
          <Typography
            sx={{
              position: 'relative',
              zIndex: 1,
              fontSize: iconEmojiSize,
              lineHeight: 1,
              ...(isCompass
                ? compassEmojiMotion
                : {
                    display: 'inline-block',
                    transformOrigin: '50% 55%',
                    animation: `${modalEmojiBreath} 5.2s ease-in-out infinite`,
                    '@media (prefers-reduced-motion: reduce)': {
                      animation: 'none',
                    },
                  }),
            }}
          >
            {stage.emoji}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.35 }}>
          <Typography
            sx={{
              fontWeight: 800,
              color: '#1e293b',
              fontSize: compact ? '1rem' : scenic ? '1.1rem' : '1.2rem',
              lineHeight: 1.25,
            }}
          >
            {stage.title}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              mt: 0.65,
              lineHeight: 1.5,
              fontSize: compact ? '0.82rem' : scenic ? '0.88rem' : '0.95rem',
            }}
          >
            {stage.hint}
          </Typography>
        </Box>
    </Box>
  );

  const statsSection = (
    <>
      <Typography
        sx={{
          display: 'block',
          mb: 0.6,
          color: scenic ? 'rgba(51, 65, 85, 0.85)' : 'text.secondary',
          letterSpacing: '0.06em',
          fontSize: '0.62rem',
          fontWeight: 700,
        }}
      >
        Reisekräfte · Ziel je {th}
      </Typography>

      {FORCE_META.map((f) => {
        const v = state[f.key];
        const pct = Math.min(100, (v / th) * 100);
        return (
          <Box key={f.key} sx={{ mb: compact ? 0.85 : 1.05 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.35 }}>
              <Box component="span" sx={{ lineHeight: 1.22 }}>
                <Typography component="span" sx={{ fontWeight: 800, color: f.color, fontSize: '0.82rem' }}>
                  {f.label}
                </Typography>
                <Typography component="span" color="text.secondary" sx={{ ml: 0.45, fontSize: '0.68rem' }}>
                  {f.sub}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, color: '#64748b', fontVariantNumeric: 'tabular-nums', fontSize: '0.78rem' }}>
                {v} / {th}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={determinateLinearProgressSx(linearGradientFromAccent(f.color), {
                height: compact ? 7 : 8,
                barGlow: `${f.color}28`,
              })}
            />
          </Box>
        );
      })}
    </>
  );

  return (
    <>
      {heroBox}

      <JourneyWanderkarte currentStage={state.companionStage} scenic={scenic} compact={compact} />

      {state.companionStage === 'EGG' && (
        <Box
          sx={{
            mb: scenic ? 1.5 : 2.5,
            p: 1.75,
            ...(scenic
              ? { ...glassCardSx, bgcolor: 'rgba(255, 252, 248, 0.88)' }
              : {
                  borderRadius: 2.5,
                  bgcolor: 'rgba(251, 140, 0, 0.06)',
                  border: '1px solid rgba(251, 140, 0, 0.2)',
                }),
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
            <Typography sx={{ fontWeight: 700, color: '#e65100', fontSize: '0.85rem', letterSpacing: '0.04em' }}>
              Brutfürsorge
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#37474f', fontSize: '0.95rem' }}>
              {state.eggCarePercent} / 100
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={state.eggCarePercent}
            sx={determinateLinearProgressSx(
              'linear-gradient(90deg, #ffb74d 0%, #fb8c00 45%, #e65100 100%)',
              { height: 13, barGlow: 'rgba(251, 140, 0, 0.35)' }
            )}
          />
          <Button
            variant="contained"
            disabled={!state.canCareToday || careLoading}
            onClick={onCare}
            disableElevation
            sx={{
              mt: 1.6,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              py: 0.9,
              px: 2,
              minHeight: 0,
              fontSize: '0.95rem',
              bgcolor: '#fb8c00',
              '&:hover': { bgcolor: '#f57c00' },
            }}
          >
            {state.canCareToday ? '🤲 Heute pflegen (+25)' : 'Heute schon gepflegt'}
          </Button>
        </Box>
      )}

      {(state.companionStage === 'HATCHLING' || state.companionStage === 'YOUNG') && (
        <Typography
          sx={{
            display: 'block',
            mb: scenic ? 1.25 : 1.85,
            color: 'text.secondary',
            fontSize: compact ? '0.88rem' : '0.98rem',
            lineHeight: 1.45,
            ...(scenic ? { ...glassCardSx, p: 1.25 } : {}),
          }}
        >
          <strong style={{ color: '#475569' }}>{state.postHatchXp}</strong> XP · Quiz, Karten, Abgaben
        </Typography>
      )}

      {scenic ? (
        <Box sx={{ ...glassCardSx, p: compact ? 1.25 : 1.5 }}>{statsSection}</Box>
      ) : (
        statsSection
      )}
    </>
  );
}

type BadgeProps = {
  refreshKey?: number;
  compact?: boolean;
  /**
   * Temporär: Badge sichtbar, aber ausgegraut und ohne Interaktion
   * (Feature kommt später wieder).
   */
  paused?: boolean;
};

/** Bis das Feature wieder aktiv ist: Platzhalter ausgegraut lassen. */
const REISEBEGLEITER_PAUSED_BY_DEFAULT = true;

const BADGE_SIZES = {
  default: { outer: 56, inner: 50, core: 34, emoji: '1.28rem', spark: 6, left: 6, bottom: 6 },
  compact: { outer: 38, inner: 34, core: 23, emoji: '0.95rem', spark: 4, left: -2, bottom: -2 },
} as const;

/**
 * Kleines Ei/Begleiter-Icon am Avatar, Details im Popover.
 */
export function ReisebegleiterAvatarBadge({
  refreshKey = 0,
  compact = false,
  paused = REISEBEGLEITER_PAUSED_BY_DEFAULT,
}: BadgeProps) {
  const [state, setState] = useState<JourneyState | null>(null);
  const [loading, setLoading] = useState(!paused);
  const [error, setError] = useState<string | null>(null);
  const [careLoading, setCareLoading] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (paused) {
      setLoading(false);
      setError(null);
      setState(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/api/journey');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Laden fehlgeschlagen');
      }
      const data = await res.json();
      setState(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [paused]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleCare = async () => {
    setCareLoading(true);
    try {
      const res = await apiPost('/api/journey/care');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pflege nicht möglich');
      }
      setState(data);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Pflege fehlgeschlagen');
    } finally {
      setCareLoading(false);
    }
  };

  if (!paused && (error || (!loading && !state))) {
    return null;
  }

  const stage = state ? STAGE_COPY[state.companionStage] || STAGE_COPY.JOURNEY : STAGE_COPY.JOURNEY;
  const ringColor = paused ? '#9e9e9e' : state ? ringAccentColor(state.companionStage) : '#1976d2';
  const conicBg = !paused && state ? previewRingConicGradient(state) : '';
  const isCompass = !paused && state?.companionStage === 'JOURNEY';
  const sz = compact ? BADGE_SIZES.compact : BADGE_SIZES.default;
  const interactive = !paused && !(loading && !state);

  return (
    <>
      <Tooltip
        title={
          paused
            ? 'Reisebegleiter — kommt bald wieder'
            : state
              ? `${stage.title} · W${state.weitePoints} F${state.funkenPoints} H${state.hingabePoints}`
              : 'Reisebegleiter'
        }
        placement="left"
        enterDelay={400}
      >
        <Box
          role="button"
          tabIndex={interactive ? 0 : -1}
          aria-label={paused ? 'Reisebegleiter (vorübergehend pausiert)' : 'Reisebegleiter, Details anzeigen'}
          aria-disabled={paused || undefined}
          onClick={(e) => {
            if (!interactive) return;
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (!interactive) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setAnchor(e.currentTarget as unknown as HTMLElement);
            }
          }}
          sx={{
            position: 'absolute',
            left: sz.left,
            bottom: sz.bottom,
            zIndex: 4,
            width: sz.outer,
            height: sz.outer,
            overflow: 'visible',
            borderRadius: '50%',
            bgcolor: paused ? 'rgba(245,245,245,0.98)' : 'rgba(255,255,255,0.98)',
            boxShadow: paused
              ? '0 1px 3px rgba(15,23,42,0.06)'
              : '0 1px 2px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
            border: paused ? '1px solid rgba(158,158,158,0.45)' : '1px solid rgba(255,255,255,0.9)',
            outline: paused ? '2px solid rgba(158, 158, 158, 0.2)' : '2px solid rgba(15, 23, 42, 0.07)',
            outlineOffset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: interactive ? 'pointer' : 'default',
            pointerEvents: 'auto',
            opacity: paused ? 0.48 : loading && !state ? 0.9 : 1,
            filter: paused ? 'grayscale(1)' : 'none',
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s ease',
            '&:hover': interactive
              ? {
                  transform: 'scale(1.05)',
                  boxShadow: `0 4px 16px ${ringColor}35, 0 2px 8px rgba(15,23,42,0.1)`,
                  outline: `2px solid ${ringColor}33`,
                }
              : {},
          }}
        >
          {!paused &&
            !loading &&
            state &&
            PREVIEW_SPARKS.map((s) => {
              const th = Math.max(1, state.journeyThreshold);
              const funkBoost = 0.55 + 0.45 * Math.min(1, state.funkenPoints / th);
              return (
                <Box
                  key={s.key}
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    width: sz.spark,
                    height: sz.spark,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 6,
                    bgcolor: FUNKEN_PREVIEW_COLOR,
                    boxShadow: `0 0 6px 1px ${FUNKEN_PREVIEW_COLOR}99, 0 0 2px #fff`,
                    opacity: funkBoost,
                    animation: `${funkeTwinkle} 2.4s ease-in-out infinite`,
                    animationDelay: s.delay,
                    '@media (prefers-reduced-motion: reduce)': {
                      animation: 'none',
                      opacity: 0.55 * funkBoost,
                    },
                    ...s.sx,
                  }}
                />
              );
            })}
          {!paused && loading && !state ? (
            <CircularProgress size={compact ? 18 : 24} thickness={4} sx={{ color: '#1976d2' }} />
          ) : (
            <Box
              sx={{
                position: 'relative',
                width: sz.inner,
                height: sz.inner,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
              }}
            >
              <CircularProgress
                variant="determinate"
                value={100}
                size={sz.inner}
                thickness={3.4}
                sx={{
                  position: 'absolute',
                  color: paused ? 'rgba(158, 158, 158, 0.28)' : 'rgba(15, 23, 42, 0.09)',
                }}
              />
              {!paused && (
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    width: sz.inner,
                    height: sz.inner,
                    borderRadius: '50%',
                    background: conicBg,
                  }}
                />
              )}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  width: sz.core,
                  height: sz.core,
                  borderRadius: '50%',
                  bgcolor: paused ? 'rgba(238,238,238,0.98)' : 'rgba(255,255,255,0.98)',
                  zIndex: 1,
                  boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.04)',
                }}
              />
              <Typography
                component="span"
                sx={{
                  fontSize: sz.emoji,
                  lineHeight: 1,
                  position: 'relative',
                  zIndex: 2,
                  userSelect: 'none',
                  ...(isCompass ? compassEmojiMotion : {}),
                }}
              >
                {paused ? '🧭' : stage.emoji}
              </Typography>
            </Box>
          )}
        </Box>
      </Tooltip>

      {!paused && (
        <Popover
          open={Boolean(anchor)}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                maxWidth: 440,
                width: 'min(92vw, 440px)',
                mt: 0.6,
                ml: 0,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 20px 48px rgba(15, 23, 42, 0.22), 0 6px 18px rgba(15, 23, 42, 0.12)',
                bgcolor: 'transparent',
              },
            },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {state && (
            <Box
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                backgroundImage: `url(${REISEBEGLEITER_BG})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 40%',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(15, 40, 70, 0.45) 0%, rgba(10, 30, 55, 0.58) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <Box sx={{ position: 'relative', zIndex: 1, p: 1.75 }}>
                <Typography
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontSize: '1.15rem',
                    lineHeight: 1.3,
                    mb: 1.25,
                    textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  }}
                >
                  Reisebegleiter
                </Typography>
                <ReisebegleiterDetailContent
                  state={state}
                  careLoading={careLoading}
                  onCare={handleCare}
                  scenic
                  compact
                />
                <Box sx={{ ...glassCardSx, mt: 1.25, py: 1.1, px: 1.35, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      color: 'rgba(51, 65, 85, 0.88)',
                      fontStyle: 'italic',
                      lineHeight: 1.45,
                      fontWeight: 500,
                    }}
                  >
                    {scenicFooterQuote}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Popover>
      )}
    </>
  );
}

export default ReisebegleiterAvatarBadge;
