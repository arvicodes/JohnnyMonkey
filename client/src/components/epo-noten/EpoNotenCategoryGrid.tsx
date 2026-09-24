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

const studentGhostPurple = '#9c27b0';

type Props = {
  categories: string[];
  scores: number[];
  onChange?: (scores: number[]) => void;
  readOnly?: boolean;
  label?: string;
  compact?: boolean;
  /** SuS-Selbsteinschätzung: lila, nur Anzeige */
  studentGhost?: boolean;
  /** Lehrer-Raster: SuS-Wahl pro Zeile leicht lila hinterlegen */
  studentOverlayScores?: number[];
  /** Eindeutige Radio-Gruppen pro Zeile (z. B. Schüler-ID) */
  radioGroupId?: string;
};

export function EpoNotenCategoryGrid({
  categories,
  scores,
  onChange,
  readOnly,
  label,
  compact,
  studentGhost,
  studentOverlayScores,
  radioGroupId = 'default',
}: Props) {
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
        borderColor: studentGhost ? 'rgba(156, 39, 176, 0.35)' : epoNotenPalette.border,
        overflow: 'hidden',
        bgcolor: studentGhost ? 'rgba(250, 245, 255, 0.85)' : '#fafcff',
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
            bgcolor: studentGhost ? 'rgba(156, 39, 176, 0.14)' : epoNotenPalette.primaryTint,
            color: studentGhost ? studentGhostPurple : epoNotenPalette.heading,
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
              {[0, 1, 2, 3].map((p) => {
                const teacherChecked = scores[i] === p;
                const studentPick =
                  studentOverlayScores != null &&
                  studentOverlayScores[i] >= 0 &&
                  studentOverlayScores[i] === p;
                const interactive = !readOnly && !studentGhost && Boolean(onChange);

                return (
                  <TableCell
                    key={p}
                    align="center"
                    padding="checkbox"
                    onClick={interactive ? () => setScore(i, p) : undefined}
                    sx={{
                      py: compact ? 0 : 0.5,
                      px: 0.25,
                      cursor: interactive ? 'pointer' : undefined,
                      bgcolor: studentPick && !studentGhost ? 'rgba(186, 104, 200, 0.16)' : undefined,
                      boxShadow:
                        studentPick && !studentGhost
                          ? 'inset 0 0 0 1px rgba(156, 39, 176, 0.28)'
                          : undefined,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: compact ? 28 : 34,
                        minWidth: compact ? 28 : 34,
                      }}
                    >
                      <Radio
                        size={compact ? 'small' : 'medium'}
                        name={
                          studentGhost
                            ? `epo-noten-ghost-${radioGroupId}-cat-${i}`
                            : `epo-noten-${radioGroupId}-cat-${i}`
                        }
                        checked={teacherChecked}
                        onChange={() => setScore(i, p)}
                        disabled={readOnly || studentGhost}
                        value={p}
                        tabIndex={interactive ? 0 : -1}
                        sx={{
                          p: compact ? 0.35 : 0.75,
                          pointerEvents: interactive ? 'auto' : 'none',
                          '& .MuiSvgIcon-root': { fontSize: compact ? 20 : 26 },
                          color:
                            studentPick && !teacherChecked && !studentGhost
                              ? 'rgba(156, 39, 176, 0.55)'
                              : studentGhost
                                ? 'rgba(156, 39, 176, 0.35)'
                                : 'rgba(25, 118, 210, 0.45)',
                          '&.Mui-checked': {
                            color: studentGhost ? studentGhostPurple : epoNotenPalette.primary,
                          },
                          ...(studentPick &&
                            teacherChecked &&
                            !studentGhost && {
                              '&.Mui-checked': {
                                color: epoNotenPalette.primary,
                                filter: 'drop-shadow(0 0 0 2px rgba(156, 39, 176, 0.35))',
                              },
                            }),
                        }}
                      />
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
