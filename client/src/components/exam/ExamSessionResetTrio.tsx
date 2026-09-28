import React from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';
import { alpha } from '@mui/material/styles';

type Props = {
  disabled?: boolean;
  onResetSubmissions: () => void;
  onRestartTimer: () => void;
  onFullReset: () => void;
};

const EXAM_RED = '#9c403d';
const EXERCISE_ACCENT = '#e6a78d';
const FULL_RESET_RED = '#c62828';

const groupedBtn = {
  minWidth: 'max-content',
  height: 25,
  px: 0.75,
  fontSize: '0.56rem',
  fontWeight: 800,
  textTransform: 'none' as const,
  lineHeight: 1.1,
  whiteSpace: 'nowrap' as const,
  flex: '1 0 auto',
};

/** Wie „Prüfung / Interaktive Übung an diese Folie“ in der Folienleiste. */
export default function ExamSessionResetTrio({
  disabled,
  onResetSubmissions,
  onRestartTimer,
  onFullReset,
}: Props) {
  return (
    <Box role="group" aria-label="Prüfung zurücksetzen" sx={{ flexShrink: 0 }}>
      <ButtonGroup
        disabled={disabled}
        size="small"
        variant="outlined"
        sx={{
          width: 'max-content',
          maxWidth: 'none',
          '& .MuiButtonGroup-grouped': groupedBtn,
          '& .MuiButtonGroup-grouped:not(:last-of-type)': {
            borderRightColor: 'rgba(0,0,0,0.08)',
          },
        }}
      >
        <Button
          onClick={onResetSubmissions}
          sx={{
            color: EXAM_RED,
            borderColor: `${EXAM_RED} !important`,
            bgcolor: '#fdf2f2',
            '&:hover': {
              bgcolor: alpha(EXAM_RED, 0.12),
              borderColor: `${EXAM_RED} !important`,
            },
          }}
        >
          Abgaben zurücksetzen
        </Button>
        <Button
          onClick={onRestartTimer}
          sx={{
            color: '#c76b4a',
            borderColor: `${EXERCISE_ACCENT} !important`,
            bgcolor: '#fff9f0',
            '&:hover': {
              bgcolor: alpha(EXERCISE_ACCENT, 0.35),
              borderColor: `${EXERCISE_ACCENT} !important`,
            },
          }}
        >
          Zeit für alle neu starten
        </Button>
        <Button
          onClick={onFullReset}
          sx={{
            color: FULL_RESET_RED,
            borderColor: `${FULL_RESET_RED} !important`,
            bgcolor: alpha(FULL_RESET_RED, 0.08),
            '&:hover': {
              bgcolor: alpha(FULL_RESET_RED, 0.16),
              borderColor: `${FULL_RESET_RED} !important`,
            },
          }}
        >
          Alles zurücksetzen
        </Button>
      </ButtonGroup>
    </Box>
  );
}
