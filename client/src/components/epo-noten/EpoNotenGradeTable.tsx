import React from 'react';
import { Box, Typography } from '@mui/material';
import { EPO_NOTEN_POINTS_TO_GRADE, minPointsThresholdForTotal } from '../../lib/epoNotenShared';
import { epoNotenPalette } from './epoNotenUi';

type Props = {
  highlightMinPoints?: number | null;
  pulseGrade?: string | null;
};

export function EpoNotenGradeTable({ highlightMinPoints, pulseGrade }: Props) {
  const cols = [...EPO_NOTEN_POINTS_TO_GRADE].sort((a, b) => b.minPoints - a.minPoints);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        borderRadius: 2.5,
        overflow: 'hidden',
        border: `2px solid ${epoNotenPalette.border}`,
        bgcolor: epoNotenPalette.cardBg,
        boxShadow: '0 4px 14px rgba(25, 55, 109, 0.08)',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          px: 1.25,
          py: 0.75,
          bgcolor: epoNotenPalette.primaryTint,
          color: epoNotenPalette.heading,
          fontSize: '0.85rem',
        }}
      >
        Punkte → Note
      </Typography>
      <Box
        sx={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          px: 0.5,
          pb: 0.75,
        }}
      >
        <Box sx={{ minWidth: cols.length * 52, display: 'grid', gridTemplateColumns: `72px repeat(${cols.length}, minmax(44px, 1fr))` }}>
          <Box sx={{ p: 0.75, fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', alignSelf: 'end' }}>
            ab Punkte
          </Box>
          {cols.map((col) => {
            const active = highlightMinPoints === col.minPoints;
            const pulse = active && pulseGrade === col.grade;
            return (
              <Box
                key={`p-${col.minPoints}`}
                sx={{
                  textAlign: 'center',
                  py: 0.75,
                  px: 0.25,
                  fontWeight: active ? 900 : 600,
                  fontSize: '0.9rem',
                  borderRadius: 1.5,
                  bgcolor: active ? epoNotenPalette.accentTint : 'transparent',
                  color: active ? epoNotenPalette.accent : epoNotenPalette.textPrimary,
                  transition: 'background-color 0.35s ease, transform 0.35s ease',
                  transform: active ? 'scale(1.04)' : 'none',
                  ...(pulse && {
                    animation: 'epoColPulse 0.9s ease-in-out 2',
                    '@keyframes epoColPulse': {
                      '0%, 100%': { bgcolor: epoNotenPalette.accentTint },
                      '50%': { bgcolor: 'rgba(46, 125, 50, 0.35)' },
                    },
                  }),
                }}
              >
                {col.minPoints}
              </Box>
            );
          })}

          <Box sx={{ p: 0.75, fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', alignSelf: 'end' }}>
            Note
          </Box>
          {cols.map((col) => {
            const active = highlightMinPoints === col.minPoints;
            const pulse = active && pulseGrade === col.grade;
            return (
              <Box
                key={`g-${col.minPoints}`}
                sx={{
                  textAlign: 'center',
                  py: 0.85,
                  px: 0.25,
                  fontWeight: active ? 900 : 700,
                  fontSize: active ? '1.05rem' : '0.95rem',
                  borderRadius: 1.5,
                  bgcolor: active ? epoNotenPalette.accentTint : epoNotenPalette.sand,
                  color: active ? epoNotenPalette.accent : epoNotenPalette.textPrimary,
                  border: active ? `2px solid ${epoNotenPalette.accent}` : '2px solid transparent',
                  transition: 'all 0.35s ease',
                  ...(pulse && {
                    animation: 'epoGradeColPop 0.5s ease',
                    '@keyframes epoGradeColPop': {
                      '0%': { transform: 'scale(0.92)' },
                      '100%': { transform: 'scale(1.04)' },
                    },
                  }),
                }}
              >
                {col.grade}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

/** @deprecated use minPointsThresholdForTotal from epoNotenShared */
export function minPointsForTotal(total: number): number {
  return minPointsThresholdForTotal(total);
}
