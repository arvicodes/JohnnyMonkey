import React from 'react';
import { Box, Button } from '@mui/material';

type Props = {
  disabled?: boolean;
  onResetSubmissions: () => void;
  onRestartTimer: () => void;
  onFullReset: () => void;
};

/** Wie Druck/Word/Word+L in der Prüfungs-Leiste — drei Aktionen in einem Block. */
export default function ExamSessionResetTrio({
  disabled,
  onResetSubmissions,
  onRestartTimer,
  onFullReset,
}: Props) {
  const base = {
    flex: 1,
    minWidth: 0,
    borderRadius: 0,
    fontSize: 8,
    lineHeight: 1.1,
    fontWeight: 800,
    py: 0.35,
    px: 0.25,
    minHeight: 0,
    whiteSpace: 'nowrap' as const,
    textTransform: 'uppercase' as const,
  };

  const divider = { borderRight: '1px solid rgba(255,255,255,0.35)' };

  return (
    <Box
      role="group"
      aria-label="Prüfung zurücksetzen"
      sx={{
        display: 'inline-flex',
        flexDirection: 'row',
        width: '100%',
        minWidth: 0,
        borderRadius: '5px',
        overflow: 'hidden',
        border: '1px solid #E10600',
      }}
    >
      <Button
        disabled={disabled}
        onClick={onResetSubmissions}
        sx={{
          ...base,
          bgcolor: '#fff',
          color: '#8B1538',
          borderRight: '1px solid #e0e0e0',
          '&:hover': { bgcolor: '#fff5f5' },
        }}
      >
        Abgaben zurücksetzen
      </Button>
      <Button
        disabled={disabled}
        onClick={onRestartTimer}
        sx={{
          ...base,
          ...divider,
          bgcolor: '#FF8F00',
          color: '#fff',
          '&:hover': { bgcolor: '#F57C00' },
        }}
      >
        Zeit für alle neu starten
      </Button>
      <Button
        disabled={disabled}
        onClick={onFullReset}
        sx={{
          ...base,
          bgcolor: '#E10600',
          color: '#fff',
          '&:hover': { bgcolor: '#c70500' },
        }}
      >
        Alles zurücksetzen
      </Button>
    </Box>
  );
}
