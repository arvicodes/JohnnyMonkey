import React from 'react';
import { Box, Button, ButtonGroup } from '@mui/material';
import { alpha } from '@mui/material/styles';

type Props = {
  disabled?: boolean;
  onRestartTimer: () => void;
  onFullReset: () => void;
};

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
};

export default function ExamSessionResetTrio({
  disabled,
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
          '& .MuiButtonGroup-grouped:first-of-type': {
            flex: '1.1 1 0',
            px: 0.66,
          },
          '& .MuiButtonGroup-grouped:not(:last-of-type)': {
            borderRightColor: 'rgba(0,0,0,0.12)',
          },
        }}
      >
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
          Zeit neu starten
        </Button>
      </ButtonGroup>
    </Box>
  );
}
