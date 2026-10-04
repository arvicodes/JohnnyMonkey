import React from 'react';
import { Box, Button } from '@mui/material';

type Props = {
  disabled?: boolean;
  onRestartTimer: () => void;
  onFullReset: () => void;
  onOpenPreview?: () => void;
};

/** Gleiche Optik wie `.exam-chrome` in Pruefung-Standardvorlage (linke Leiste). */
const CHROME_WIDTH = 148;

const chromeBtn = {
  width: '100%',
  maxWidth: CHROME_WIDTH,
  boxSizing: 'border-box' as const,
  border: 'none',
  borderRadius: '7px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textTransform: 'none' as const,
  lineHeight: 1.25,
  '&:disabled': {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};

export default function ExamSessionResetTrio({
  disabled,
  onRestartTimer,
  onFullReset,
  onOpenPreview,
}: Props) {
  return (
    <Box
      role="group"
      aria-label="Prüfung zurücksetzen"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '8px',
        width: '100%',
        maxWidth: CHROME_WIDTH,
        flexShrink: 0,
      }}
    >
      {onOpenPreview ? (
        <Button
          type="button"
          disabled={disabled}
          onClick={onOpenPreview}
          sx={{
            ...chromeBtn,
            bgcolor: '#1a1a1a',
            color: '#fff',
            fontSize: '11px',
            py: 0.85,
            px: 1,
            '&:hover': { bgcolor: '#333' },
          }}
        >
          Vorschau (Tab)
        </Button>
      ) : null}
      <Button
        type="button"
        disabled={disabled}
        onClick={onFullReset}
        sx={{
          ...chromeBtn,
          bgcolor: '#E10600',
          color: '#fff',
          fontSize: '11px',
          py: 0.9,
          px: 1,
          '&:hover': { bgcolor: '#B00500' },
        }}
      >
        Alles zurücksetzen
      </Button>
      <Button
        type="button"
        disabled={disabled}
        onClick={onRestartTimer}
        sx={{
          ...chromeBtn,
          bgcolor: '#81c784',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 700,
          py: 1.75,
          px: 1,
          borderRadius: '8px',
          whiteSpace: 'normal',
          '&:hover': { bgcolor: '#66bb6a' },
        }}
      >
        Zeit neu
        <br />
        starten
      </Button>
    </Box>
  );
}
