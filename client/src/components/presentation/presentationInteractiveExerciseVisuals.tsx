import React from 'react';
import { Box, Typography } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import type { EquationPart, ExerciseDiagramKind } from '../../lib/presentationInteractiveExercise';

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

/** Standard-Mindestbreite (Anteil am Textblock); Inhalt darf breiter werden. */
export const EXERCISE_FIELD_WIDTH_PCT = 20;
const FIELD_LONG_CHAR_THRESHOLD = 10;

/** Basis-Breite des Lückentext-Blocks (px × scale); +20 % gegenüber früher 520. */
export const EXERCISE_CLOZE_TEXT_MAX_WIDTH = 624;

const LEADING_PUNCT_RE = /^(\s*)([.,;:!?…]+)(.*)$/u;

/** Leerzeichen vor Satzzeichen → geschütztes Leerzeichen (kein Zeilenbruch davor). */
export function typographicClozeText(text: string): string {
  return text.replace(/(\S) ([.,;:!?…]+)/gu, '$1\u00A0$2');
}

type ClozeInlinePiece =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; correct: string; index: number };

export type ClozeRenderUnit =
  | { kind: 'break' }
  | { kind: 'text'; text: string }
  | { kind: 'blank'; correct: string; index: number }
  | { kind: 'nowrap'; children: ClozeInlinePiece[] };

function glueLeadingPunctuation(units: ClozeRenderUnit[], punct: string, rest: string) {
  if (!punct) {
    if (rest) units.push({ kind: 'text', text: typographicClozeText(rest) });
    return;
  }
  const last = units[units.length - 1];
  if (!last) {
    units.push({ kind: 'text', text: typographicClozeText(punct + rest) });
    return;
  }
  if (last.kind === 'blank') {
    units[units.length - 1] = {
      kind: 'nowrap',
      children: [
        { kind: 'blank', correct: last.correct, index: last.index },
        { kind: 'text', text: punct },
      ],
    };
  } else if (last.kind === 'text') {
    units[units.length - 1] = { kind: 'text', text: last.text + punct };
  } else if (last.kind === 'nowrap') {
    last.children.push({ kind: 'text', text: punct });
  } else {
    units.push({ kind: 'text', text: punct });
  }
  if (rest) units.push({ kind: 'text', text: typographicClozeText(rest) });
}

/** Lückentext in typografisch sinnvolle Einheiten (Satzzeichen an vorheriges Wort/Lücke). */
export function buildClozeRenderUnits(parts: EquationPart[]): ClozeRenderUnit[] {
  const units: ClozeRenderUnit[] = [];
  let blankIndex = 0;

  for (const part of parts) {
    if (part.type === 'break') {
      units.push({ kind: 'break' });
      continue;
    }
    if (part.type === 'blank') {
      units.push({ kind: 'blank', correct: part.correct, index: blankIndex++ });
      continue;
    }
    const raw = part.text;
    const m = raw.match(LEADING_PUNCT_RE);
    if (m && m[2]) {
      glueLeadingPunctuation(units, m[1] + m[2], m[3]);
      continue;
    }
    units.push({ kind: 'text', text: typographicClozeText(raw) });
  }
  return units;
}

export const clozeParagraphSx = (scale: number) => ({
  m: 0,
  width: '100%',
  fontSize: `${17 * scale}px`,
  lineHeight: 1.75,
  color: '#222',
  px: `${4 * scale}px`,
  textAlign: 'left' as const,
  textWrap: 'pretty' as const,
  wordBreak: 'normal' as const,
  overflowWrap: 'break-word' as const,
  hyphens: 'none' as const,
});

export const clozeTextSpanSx = {
  fontWeight: 500,
};

export const clozeParagraphBreakSx = (scale: number) => ({
  display: 'block',
  height: 0,
  marginTop: `${10 * scale}px`,
});

export const clozeNowrapGroupSx = {
  whiteSpace: 'nowrap' as const,
  display: 'inline' as const,
};

function fieldContentMinCh(chars: number) {
  return Math.min(Math.max(chars + 4, 4), 48);
}

export function exerciseFieldSizeSx(scale: number, label: string) {
  const text = (label || '').trim() || '…';
  const chars = Math.max(2, text.length);
  const ch = fieldContentMinCh(chars);
  const tooLong = chars > FIELD_LONG_CHAR_THRESHOLD;
  if (!tooLong) {
    return {
      width: 'auto',
      minWidth: `max(${EXERCISE_FIELD_WIDTH_PCT}%, ${ch}ch)`,
      maxWidth: 'none',
      flex: '0 0 auto',
      height: `${30 * scale}px`,
      boxSizing: 'border-box' as const,
    };
  }
  return {
    width: 'auto',
    minWidth: `${ch}ch`,
    maxWidth: 'none',
    flex: '0 0 auto',
    height: `${30 * scale}px`,
    boxSizing: 'border-box' as const,
  };
}

export function exerciseUniformFieldWidthPx(_scale: number, _labels: string[]): number {
  return 0;
}

export const exerciseInputFieldSx = (
  scale: number,
  label: string,
  extra?: Record<string, unknown>,
) => ({
  ...exerciseFieldSizeSx(scale, label),
  textAlign: 'center' as const,
  border: 'none',
  borderRadius: `${6 * scale}px`,
  bgcolor: 'rgba(0,0,0,0.08)',
  fontSize: `${16 * scale}px`,
  fontWeight: 700,
  outline: 'none',
  ...extra,
});

export const clozeBlankSx = (
  scale: number,
  opts: {
    selected?: boolean;
    status?: 'idle' | 'correct' | 'wrong' | 'revealed';
    label: string;
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
    ...exerciseFieldSizeSx(scale, opts.label),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'baseline',
    mx: `${2 * scale}px`,
    px: `${4 * scale}px`,
    border: opts.selected ? '2px solid #90caf9' : '1px solid #d0d0d0',
    borderRadius: `${4 * scale}px`,
    bgcolor: '#ebebeb',
    color,
    fontWeight: 600,
    fontSize: `${14 * scale}px`,
    cursor: 'pointer',
    textDecoration: st === 'wrong' ? 'line-through' : 'none',
    whiteSpace: 'nowrap' as const,
  };
};

export const wordBankRowSx = (scale: number) => ({
  display: 'flex',
  flexDirection: 'row' as const,
  flexWrap: 'wrap' as const,
  gap: `${8 * scale}px`,
  rowGap: `${10 * scale}px`,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  py: 0.5,
});

/** Wortbank / Zieh-Kärtchen — gleiche Logik wie Lücken (20 % oder breiter). */
export const wordBankChipSx = (
  scale: number,
  used: boolean,
  interactive: boolean,
  label: string,
) => ({
  ...exerciseFieldSizeSx(scale, label),
  px: `${6 * scale}px`,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: used ? 'rgba(0,0,0,0.04)' : '#d8d8d8',
  color: used ? 'rgba(0,0,0,0.28)' : '#111',
  fontWeight: 700,
  fontFamily: 'inherit',
  borderRadius: `${5 * scale}px`,
  fontSize: `${13 * scale}px`,
  lineHeight: 1.2,
  boxShadow: used ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
  border: '1px solid rgba(0,0,0,0.06)',
  boxSizing: 'border-box' as const,
  cursor: used || !interactive ? 'default' : 'pointer',
  whiteSpace: 'nowrap' as const,
  '&:disabled': { opacity: used ? 0.35 : 0.5 },
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
