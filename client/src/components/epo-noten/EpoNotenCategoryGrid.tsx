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
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          {label}
        </Typography>
      )}
      <Table size="small" sx={{ '& td, & th': { borderColor: 'divider' } }}>
        <TableHead>
          <TableRow>
            <TableCell>Kategorie</TableCell>
            {[0, 1, 2, 3].map((p) => (
              <TableCell key={p} align="center" sx={{ width: 44 }}>
                {p}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.map((text, i) => (
            <TableRow key={i}>
              <TableCell>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {i + 1}) {text}
                </Typography>
              </TableCell>
              {[0, 1, 2, 3].map((p) => (
                <TableCell key={p} align="center" padding="checkbox">
                  <Radio
                    size="small"
                    name={`epo-noten-cat-${i}`}
                    checked={scores[i] === p}
                    onChange={() => setScore(i, p)}
                    disabled={readOnly}
                    value={p}
                    sx={{ p: 0.25 }}
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
