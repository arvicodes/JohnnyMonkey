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
  height: 28,
  px: 1.1,
  py: 0.25,
  fontSize: 'calc(0.56rem + 3px)',
  fontWeight: 700,
  textTransform: 'none' as const,
  lineHeight: 1.15,
  whiteSpace: 'nowrap' as const,
  minWidth: 'max-content',
  flex: '0 0 auto',
  overflow: 'visible',
};

export default function ExamSessionResetTrio({
  disabled,
  onRestartTimer,
  onFullReset,
}: Props) {
  return (
    <Box
      role="group"
      aria-label="Prüfung zurücksetzen"
      sx={{ flexShrink: 0, width: '100%', display: 'flex', justifyContent: 'flex-end' }}
    >
      <ButtonGroup
        disabled={disabled}
        size="small"
        variant="outlined"
        sx={{
          width: 'auto',
          flexShrink: 0,
          '& .MuiButtonGroup-grouped': groupedBtn,
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
