import React from 'react';
import { Box, Typography } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import type { ExerciseDiagramKind } from '../../lib/presentationInteractiveExercise';

/** Anton-ähnliche Darstellung — gemeinsam für alle interaktiven Übungen. */
export const exercisePlaySurfaceSx = {
  bgcolor: '#ffffff',
};

export const exercisePromptSx = (scale: number) => ({
  fontSize: `${18 * scale}px`,
  fontWeight: 600,
  color: '#1a1a2e',
  lineHeight: 1.4,
  textAlign: 'center' as const,
  px: `${12 * scale}px`,
});

export const exercisePromptSubSx = (scale: number) => ({
  fontSize: `${15 * scale}px`,
  fontWeight: 500,
  color: '#333',
  textAlign: 'center' as const,
  px: `${12 * scale}px`,
  mt: `${4 * scale}px`,
});

const FIELD_WIDTH_FACTOR = 3;

/** Breite in px (ohne scale) — Lücken, Eingaben, Wortbank gleich. */
export function exerciseFieldWidthChars(chars: number): number {
  const c = Math.max(2, chars);
  const base = Math.min(96, Math.max(26, c * 7 + 10));
  return base * FIELD_WIDTH_FACTOR;
}

export function exerciseUniformFieldWidthPx(scale: number, labels: string[]): number {
  const maxLen = Math.max(2, 8, ...labels.map((t) => (t || '').length));
  return exerciseFieldWidthChars(maxLen) * scale;
}

export const exerciseInputFieldSx = (
  scale: number,
  widthPx: number,
  extra?: Record<string, unknown>,
) => ({
  width: `${widthPx}px`,
  minWidth: `${widthPx}px`,
  maxWidth: `${widthPx}px`,
  height: `${30 * scale}px`,
  textAlign: 'center' as const,
  border: 'none',
  borderRadius: `${6 * scale}px`,
  bgcolor: 'rgba(0,0,0,0.08)',
  fontSize: `${16 * scale}px`,
  fontWeight: 700,
  outline: 'none',
  boxSizing: 'border-box' as const,
  ...extra,
});

export const clozeBlankSx = (
  scale: number,
  opts: {
    selected?: boolean;
    status?: 'idle' | 'correct' | 'wrong' | 'revealed';
    /** Feste Breite (px), gleich wie Wortbank-Chips. */
    widthPx: number;
  },
) => {
  const st = opts.status || 'idle';
  const color =
    st === 'correct' || st === 'revealed'
      ? '#2E7D32'
      : st === 'wrong'
        ? '#C62828'
        : '#111';
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${opts.widthPx}px`,
    minWidth: `${opts.widthPx}px`,
    maxWidth: `${opts.widthPx}px`,
    height: `${30 * scale}px`,
    boxSizing: 'border-box',
    mx: `${2 * scale}px`,
    my: `${1 * scale}px`,
    px: `${4 * scale}px`,
    border: opts.selected ? '2px solid #90caf9' : '1px solid #d0d0d0',
    borderRadius: `${4 * scale}px`,
    bgcolor: '#ebebeb',
    color,
    fontWeight: 600,
    fontSize: `${14 * scale}px`,
    cursor: 'pointer',
    verticalAlign: 'middle',
    textDecoration: st === 'wrong' ? 'line-through' : 'none',
  };
};

export const wordBankRowSx = {
  display: 'flex',
  flexDirection: 'row' as const,
  flexWrap: 'nowrap' as const,
  gap: '8px',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  overflowX: 'auto' as const,
  py: 0.5,
};

export const wordBankChipSx = (scale: number, used: boolean, widthPx: number) => ({
  width: `${widthPx}px`,
  minWidth: `${widthPx}px`,
  maxWidth: `${widthPx}px`,
  height: `${30 * scale}px`,
  px: `${4 * scale}px`,
  flexShrink: 0,
  bgcolor: used ? 'rgba(0,0,0,0.04)' : '#d8d8d8',
  color: used ? 'rgba(0,0,0,0.28)' : '#111',
  fontWeight: 700,
  textTransform: 'none' as const,
  borderRadius: `${5 * scale}px`,
  fontSize: `${13 * scale}px`,
  boxShadow: used ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
  border: '1px solid rgba(0,0,0,0.06)',
  boxSizing: 'border-box' as const,
});

export const sortRowCardSx = (scale: number, filled: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: `${44 * scale}px`,
  mb: `${6 * scale}px`,
  bgcolor: '#efefef',
  border: '1px solid #e2e2e2',
  borderRadius: `${4 * scale}px`,
  boxShadow: '0 2px 4px rgba(0,0,0,0.07)',
  color: filled ? '#111' : 'rgba(0,0,0,0.35)',
});

export const matchTileSx = (
  scale: number,
  borderColor: string,
  side: 'left' | 'right',
) => ({
  border: `${2 * scale}px solid ${borderColor}`,
  bgcolor: '#efefef',
  color: '#111',
  borderRadius: `${6 * scale}px`,
  px: `${10 * scale}px`,
  py: `${8 * scale}px`,
  minWidth: side === 'right' ? `${52 * scale}px` : `${72 * scale}px`,
  minHeight: `${52 * scale}px`,
  fontSize: `${(side === 'right' ? 17 : 15) * scale}px`,
  fontWeight: side === 'right' ? 800 : 600,
  textAlign: 'center' as const,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  lineHeight: 1.25,
});

export function MeasureText({ value, scale }: { value: string; scale: number }) {
  const m = value.trim().match(/^([\d\s,.]+)\s*([a-zäöü]+)$/i);
  if (!m) {
    return (
      <Typography component="span" sx={{ fontSize: `${18 * scale}px`, fontWeight: 700 }}>
        {value}
      </Typography>
    );
  }
  return (
    <Typography component="span" sx={{ fontSize: `${18 * scale}px`, fontWeight: 700 }}>
      {m[1]}
      <Box component="span" sx={{ fontStyle: 'italic' }}> {m[2]}</Box>
    </Typography>
  );
}

export function SortRowHandle({ scale }: { scale: number }) {
  return (
    <UnfoldMoreIcon
      sx={{
        fontSize: `${22 * scale}px`,
        color: '#b0b0b0',
        mx: `${8 * scale}px`,
        flexShrink: 0,
      }}
    />
  );
}

function LengthMassUnitDiagram({ scale }: { scale: number }) {
  return (
    <Box sx={{ textAlign: 'center', py: `${16 * scale}px`, px: `${8 * scale}px` }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: `${28 * scale}px`, mb: `${6 * scale}px` }}>
        <Typography sx={{ fontSize: `${14 * scale}px`, fontWeight: 700, color: '#1e88e5' }}>
          Maßzahl
        </Typography>
        <Typography sx={{ fontSize: `${14 * scale}px`, fontWeight: 700, color: '#e57373' }}>
          Einheit
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${6 * scale}px` }}>
        <Box
          sx={{
            width: `${52 * scale}px`,
            height: `${52 * scale}px`,
            borderRadius: '50%',
            border: `2px solid #1e88e5`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${26 * scale}px`,
            fontWeight: 800,
            color: '#1565c0',
          }}
        >
          25
        </Box>
        <Typography sx={{ fontSize: `${32 * scale}px`, fontWeight: 800, color: '#111' }}>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: `${48 * scale}px`,
              height: `${48 * scale}px`,
              borderRadius: '50%',
              border: `2px solid #e57373`,
              fontSize: `${22 * scale}px`,
              fontStyle: 'italic',
              ml: `${4 * scale}px`,
            }}
          >
            cm
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}

function LengthCommaShiftDiagram({ scale }: { scale: number }) {
  const arrowSx = {
    fontSize: `${13 * scale}px`,
    fontWeight: 800,
    color: '#e65100',
  };
  return (
    <Box sx={{ textAlign: 'center', py: `${12 * scale}px` }}>
      <Typography sx={{ fontSize: `${28 * scale}px`, fontWeight: 800, mb: `${8 * scale}px` }}>
        25,00 <Box component="span" sx={{ fontStyle: 'italic' }}>dm</Box>
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: `${40 * scale}px`,
          alignItems: 'flex-start',
        }}
      >
        <Box>
          <Typography sx={arrowSx}>÷ 10</Typography>
          <Typography sx={{ fontSize: `${20 * scale}px`, fontWeight: 800, mt: `${6 * scale}px` }}>
            2,500 <Box component="span" sx={{ fontStyle: 'italic' }}>m</Box>
          </Typography>
        </Box>
        <Box>
          <Typography sx={arrowSx}>· 100</Typography>
          <Typography sx={{ fontSize: `${20 * scale}px`, fontWeight: 800, mt: `${6 * scale}px` }}>
            2500,0 <Box component="span" sx={{ fontStyle: 'italic' }}>mm</Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function ExerciseDiagram({
  kind,
  scale,
}: {
  kind?: ExerciseDiagramKind;
  scale: number;
}) {
  if (!kind) return null;
  if (kind === 'length-mass-unit') return <LengthMassUnitDiagram scale={scale} />;
  if (kind === 'length-comma-shift') return <LengthCommaShiftDiagram scale={scale} />;
  return null;
}
