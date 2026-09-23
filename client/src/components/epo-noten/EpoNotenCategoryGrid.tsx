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
};

export function EpoNotenCategoryGrid({ categories, scores, onChange, readOnly, label }: Props) {
  const setScore = (index: number, value: number) => {
    if (readOnly || !onChange) return;
    const next = [...scores];
    next[index] = value;
    onChange(next);
  };

  return (
    <Box
      sx={{
        borderRadius: 2.5,
        border: `2px solid ${epoNotenPalette.border}`,
        overflow: 'hidden',
        bgcolor: '#fafcff',
      }}
    >
      {label && (
        <Typography
          variant="subtitle2"
          sx={{ mb: 0, px: 1.25, py: 0.75, fontWeight: 800, bgcolor: epoNotenPalette.primaryTint, color: epoNotenPalette.heading }}
        >
          {label}
        </Typography>
      )}
      <Table size="medium" sx={{ '& td, & th': { borderColor: epoNotenPalette.border } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: epoNotenPalette.sand }}>
            <TableCell sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Kategorie</TableCell>
            {[0, 1, 2, 3].map((p) => (
              <TableCell key={p} align="center" sx={{ width: 52, fontWeight: 800, fontSize: '1rem' }}>
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
              <TableCell sx={{ py: 1.25 }}>
                <Typography variant="body1" sx={{ fontSize: '0.92rem', lineHeight: 1.45, color: epoNotenPalette.textPrimary }}>
                  {i + 1}) {text}
                </Typography>
              </TableCell>
              {[0, 1, 2, 3].map((p) => (
                <TableCell key={p} align="center" padding="checkbox" sx={{ py: 0.5 }}>
                  <Radio
                    size="medium"
                    name={`epo-noten-cat-${i}`}
                    checked={scores[i] === p}
                    onChange={() => setScore(i, p)}
                    disabled={readOnly}
                    value={p}
                    sx={{
                      p: 0.75,
                      '& .MuiSvgIcon-root': { fontSize: 26 },
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
