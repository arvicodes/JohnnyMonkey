import React from 'react';
import {
  Box,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { epoNotenPalette } from './epoNotenUi';

type Props = {
  categories: string[];
  scores: number[];
  onChange?: (scores: number[]) => void;
  readOnly?: boolean;
  label?: string;
  compact?: boolean;
};

export function EpoNotenCategoryGrid({ categories, scores, onChange, readOnly, label, compact }: Props) {
  const setScore = (index: number, value: number) => {
    if (readOnly || !onChange) return;
    const next = [...scores];
    next[index] = value;
    onChange(next);
  };

  return (
    <Box
      sx={{
        borderRadius: compact ? 1.5 : 2.5,
        border: compact ? '1px solid' : `2px solid ${epoNotenPalette.border}`,
        borderColor: epoNotenPalette.border,
        overflow: 'hidden',
        bgcolor: '#fafcff',
      }}
    >
      {label && (
        <Typography
          variant="subtitle2"
          sx={{
            mb: 0,
            px: compact ? 1 : 1.25,
            py: compact ? 0.45 : 0.75,
            fontWeight: 800,
            fontSize: compact ? '0.78rem' : undefined,
            bgcolor: epoNotenPalette.primaryTint,
            color: epoNotenPalette.heading,
          }}
        >
          {label}
        </Typography>
      )}
      <Table
        size={compact ? 'small' : 'medium'}
        sx={{ '& td, & th': { borderColor: epoNotenPalette.border, py: compact ? 0.35 : undefined } }}
      >
        <TableHead>
          <TableRow sx={{ bgcolor: epoNotenPalette.sand }}>
            <TableCell sx={{ fontWeight: 800, fontSize: compact ? '0.72rem' : '0.85rem' }}>Kategorie</TableCell>
            {[0, 1, 2, 3].map((p) => (
              <TableCell
                key={p}
                align="center"
                sx={{ width: compact ? 40 : 52, fontWeight: 800, fontSize: compact ? '0.82rem' : '1rem', px: 0.5 }}
              >
                {p}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map((text, i) => (
            <TableRow
              key={i}
              sx={{
                bgcolor: i % 2 === 0 ? '#fff' : '#f8fafc',
                '&:last-child td': { borderBottom: 0 },
              }}
            >
              <TableCell sx={{ py: compact ? 0.35 : 1.25, pr: 0.5 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: compact ? '0.78rem' : '0.92rem',
                    lineHeight: 1.35,
                    color: epoNotenPalette.textPrimary,
                  }}
                >
                  {i + 1}) {text}
                </Typography>
              </TableCell>
              {[0, 1, 2, 3].map((p) => (
                <TableCell key={p} align="center" padding="checkbox" sx={{ py: compact ? 0 : 0.5, px: 0.25 }}>
                  <Radio
                    size={compact ? 'small' : 'medium'}
                    name={`epo-noten-cat-${i}`}
                    checked={scores[i] === p}
                    onChange={() => setScore(i, p)}
                    disabled={readOnly}
                    value={p}
                    sx={{
                      p: compact ? 0.35 : 0.75,
                      '& .MuiSvgIcon-root': { fontSize: compact ? 20 : 26 },
                      color: 'rgba(25, 118, 210, 0.45)',
                      '&.Mui-checked': { color: epoNotenPalette.primary },
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
