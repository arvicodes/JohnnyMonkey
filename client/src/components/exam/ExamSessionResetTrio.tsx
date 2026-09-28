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
    fontSize: 9,
    lineHeight: 1.15,
    fontWeight: 800,
    py: 0.85,
    px: 0.5,
    whiteSpace: 'normal' as const,
    textTransform: 'uppercase' as const,
  };

  return (
    <Box
      role="group"
      aria-label="Prüfung zurücksetzen"
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 320,
        borderRadius: 1,
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
          borderBottom: '1px solid #e0e0e0',
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
          bgcolor: '#FF8F00',
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,0.35)',
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
