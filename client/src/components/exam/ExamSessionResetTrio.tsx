import React from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';
import { alpha } from '@mui/material/styles';

type Props = {
  disabled?: boolean;
  onResetSubmissions: () => void;
  onRestartTimer: () => void;
  onFullReset: () => void;
};

const SUBMISSIONS_COLOR = '#3949ab';
const TIMER_COLOR = '#00695c';
const FULL_RESET_COLOR = '#c62828';

const groupedBtn = {
  minWidth: 0,
  height: 28,
  px: 0.6,
  fontSize: 'calc(0.56rem + 3px)',
  fontWeight: 700,
  textTransform: 'none' as const,
  lineHeight: 1.15,
  whiteSpace: 'nowrap' as const,
  flex: '0 1 auto',
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
          '& .MuiButtonGroup-grouped': groupedBtn,
          '& .MuiButtonGroup-grouped:not(:last-of-type)': {
            borderRightColor: 'rgba(0,0,0,0.12)',
          },
        }}
      >
        <Button
          onClick={onResetSubmissions}
          sx={{
            color: SUBMISSIONS_COLOR,
            borderColor: `${SUBMISSIONS_COLOR} !important`,
            bgcolor: alpha(SUBMISSIONS_COLOR, 0.08),
            '&:hover': {
              bgcolor: alpha(SUBMISSIONS_COLOR, 0.16),
              borderColor: `${SUBMISSIONS_COLOR} !important`,
            },
          }}
        >
          Abgaben zurücksetzen
        </Button>
        <Button
          onClick={onRestartTimer}
          sx={{
            color: TIMER_COLOR,
            borderColor: `${TIMER_COLOR} !important`,
            bgcolor: alpha(TIMER_COLOR, 0.08),
            '&:hover': {
              bgcolor: alpha(TIMER_COLOR, 0.16),
              borderColor: `${TIMER_COLOR} !important`,
            },
          }}
        >
          Zeit für alle neu starten
        </Button>
        <Button
          onClick={onFullReset}
          sx={{
            color: FULL_RESET_COLOR,
            borderColor: `${FULL_RESET_COLOR} !important`,
            bgcolor: alpha(FULL_RESET_COLOR, 0.08),
            '&:hover': {
              bgcolor: alpha(FULL_RESET_COLOR, 0.16),
              borderColor: `${FULL_RESET_COLOR} !important`,
            },
          }}
        >
          Alles zurücksetzen
        </Button>
      </ButtonGroup>
    </Box>
  );
}
