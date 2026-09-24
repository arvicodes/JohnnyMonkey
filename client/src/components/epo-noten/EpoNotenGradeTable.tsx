import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  EPO_NOTEN_POINTS_TO_GRADE,
  type EpoNotenAssessmentMode,
  minPointsThresholdForTotal,
} from '../../lib/epoNotenShared';
import { epoNotenPalette } from './epoNotenUi';

type Props = {
  mode?: EpoNotenAssessmentMode;
  /** Noten-Tabelle: Schwellenwert der Spalte */
  highlightMinPoints?: number | null;
  /** MSS-Tabelle: exakte Punktzahl (0–15) */
  highlightExactPoints?: number | null;
};

const activeColumnSx = {
  bgcolor: 'rgba(46, 125, 50, 0.22)',
  boxShadow: `inset 0 0 0 2px ${epoNotenPalette.accent}`,
  color: epoNotenPalette.accent,
  fontWeight: 900,
  position: 'relative' as const,
  zIndex: 1,
};

export function EpoNotenGradeTable({
  mode = 'note',
  highlightMinPoints,
  highlightExactPoints,
}: Props) {
  if (mode === 'mss') {
    const cols = Array.from({ length: 16 }, (_, i) => 15 - i);
    const activePts =
      highlightExactPoints != null && Number.isFinite(highlightExactPoints)
        ? Math.max(0, Math.min(15, Math.round(highlightExactPoints)))
        : null;

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
          MSS-Punkte (0–15)
        </Typography>
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', px: 0.5, pb: 0.75 }}>
          <Box
            sx={{
              minWidth: cols.length * 40,
              display: 'grid',
              gridTemplateColumns: `64px repeat(${cols.length}, minmax(36px, 1fr))`,
            }}
          >
            <Box sx={{ p: 0.75, fontWeight: 800, fontSize: '0.72rem', color: 'text.secondary', alignSelf: 'center' }}>
              Punkte
            </Box>
            {cols.map((pts) => {
              const active = activePts === pts;
              return (
                <Box
                  key={`mss-${pts}`}
                  sx={{
                    textAlign: 'center',
                    py: 0.85,
                    px: 0.2,
                    fontSize: '0.88rem',
                    fontWeight: active ? 900 : 600,
                    borderRadius: 1,
                    ...(active ? activeColumnSx : { color: epoNotenPalette.textPrimary }),
                  }}
                >
                  {pts}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    );
  }

  const cols = [...EPO_NOTEN_POINTS_TO_GRADE].sort((a, b) => b.minPoints - a.minPoints);

  const colActive = (minPoints: number) => highlightMinPoints === minPoints;

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
      <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', px: 0.5, pb: 0.75 }}>
        <Box
          sx={{
            minWidth: cols.length * 52,
            display: 'grid',
            gridTemplateColumns: `72px repeat(${cols.length}, minmax(44px, 1fr))`,
          }}
        >
          <Box sx={{ p: 0.75, fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary', alignSelf: 'end' }}>
            ab Punkte
          </Box>
          {cols.map((col) => {
            const active = colActive(col.minPoints);
            return (
              <Box
                key={`p-${col.minPoints}`}
                sx={{
                  textAlign: 'center',
                  py: 0.75,
                  px: 0.25,
                  fontSize: '0.9rem',
                  borderRadius: active ? '8px 8px 0 0' : 1,
                  ...(active ? activeColumnSx : { fontWeight: 600, color: epoNotenPalette.textPrimary }),
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
            const active = colActive(col.minPoints);
            return (
              <Box
                key={`g-${col.minPoints}`}
                sx={{
                  textAlign: 'center',
                  py: 0.85,
                  px: 0.25,
                  fontSize: active ? '1.05rem' : '0.95rem',
                  borderRadius: active ? '0 0 8px 8px' : 1,
                  bgcolor: active ? undefined : epoNotenPalette.sand,
                  ...(active
                    ? { ...activeColumnSx, borderRadius: '0 0 8px 8px', boxShadow: `inset 0 -2px 0 0 ${epoNotenPalette.accent}, inset 2px 0 0 ${epoNotenPalette.accent}, inset -2px 0 0 ${epoNotenPalette.accent}` }
                    : { fontWeight: 700, color: epoNotenPalette.textPrimary }),
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
