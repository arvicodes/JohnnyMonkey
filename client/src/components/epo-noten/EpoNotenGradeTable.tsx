import React from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { EPO_NOTEN_POINTS_TO_GRADE } from '../../lib/epoNotenShared';

type Props = {
  highlightMinPoints?: number | null;
  pulseGrade?: string | null;
};

export function EpoNotenGradeTable({ highlightMinPoints, pulseGrade }: Props) {
  const rows = [...EPO_NOTEN_POINTS_TO_GRADE].sort((a, b) => b.minPoints - a.minPoints);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        minWidth: { xs: '100%', sm: 200 },
        flex: { sm: '0 0 auto' },
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, display: 'block', px: 1, py: 0.5, bgcolor: 'action.hover' }}
      >
        Punkte → Note
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 0.5, fontSize: '0.72rem' }}>ab</TableCell>
            <TableCell sx={{ py: 0.5, fontSize: '0.72rem' }}>Note</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const active = highlightMinPoints === row.minPoints;
            const gradePulse = active && pulseGrade === row.grade;
            return (
              <TableRow
                key={row.minPoints}
                sx={{
                  transition: 'background-color 0.35s ease, transform 0.35s ease',
                  bgcolor: active ? 'rgba(46, 125, 50, 0.18)' : 'transparent',
                  transform: active ? 'scale(1.02)' : 'none',
                  ...(gradePulse && {
                    animation: 'epoRowPulse 0.9s ease-in-out 2',
                    '@keyframes epoRowPulse': {
                      '0%, 100%': { bgcolor: 'rgba(46, 125, 50, 0.18)' },
                      '50%': { bgcolor: 'rgba(46, 125, 50, 0.42)' },
                    },
                  }),
                }}
              >
                <TableCell sx={{ py: 0.35, fontSize: '0.78rem', fontWeight: active ? 800 : 400 }}>
                  {row.minPoints}
                </TableCell>
                <TableCell
                  sx={{
                    py: 0.35,
                    fontSize: '0.85rem',
                    fontWeight: active ? 900 : 500,
                    color: active ? 'success.dark' : 'text.primary',
                  }}
                >
                  {row.grade}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

export function minPointsForTotal(total: number): number {
  const t = Math.max(0, Math.min(15, Math.round(total)));
  for (const row of EPO_NOTEN_POINTS_TO_GRADE) {
    if (t >= row.minPoints) return row.minPoints;
  }
  return 0;
}
