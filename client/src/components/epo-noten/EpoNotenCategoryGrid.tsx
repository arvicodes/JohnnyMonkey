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
  /** Lehrer-Raster deutlich in Blau (eigene Bewertung) */
  teacherEmphasis?: boolean;
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
  teacherEmphasis,
  radioGroupId = 'default',
}: Props) {
  const isTeacherOwn = teacherEmphasis && !studentGhost;
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
        border: isTeacherOwn ? '2px solid' : compact ? '1px solid' : `2px solid ${epoNotenPalette.border}`,
        borderColor: studentGhost
          ? 'rgba(156, 39, 176, 0.2)'
          : isTeacherOwn
            ? 'rgba(25, 118, 210, 0.55)'
            : epoNotenPalette.border,
        overflow: 'hidden',
        bgcolor: studentGhost
          ? 'rgba(250, 245, 255, 0.42)'
          : isTeacherOwn
            ? 'rgba(227, 242, 253, 0.75)'
            : '#fafcff',
        boxShadow: isTeacherOwn ? '0 2px 10px rgba(25, 118, 210, 0.12)' : undefined,
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
            bgcolor: studentGhost
              ? 'rgba(156, 39, 176, 0.07)'
              : isTeacherOwn
                ? 'rgba(25, 118, 210, 0.22)'
                : epoNotenPalette.primaryTint,
            color: studentGhost ? 'rgba(106, 27, 154, 0.75)' : isTeacherOwn ? '#0d47a1' : epoNotenPalette.heading,
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

                const pickScore = () => {
                  if (!interactive) return;
                  setScore(i, p);
                };

                return (
                  <TableCell
                    key={p}
                    align="center"
                    padding="checkbox"
                    onClick={(e) => {
                      e.stopPropagation();
                      pickScore();
                    }}
                    sx={{
                      py: compact ? 0 : 0.5,
                      px: 0.25,
                      cursor: interactive ? 'pointer' : 'default',
                      bgcolor: studentPick && !studentGhost ? 'rgba(186, 104, 200, 0.09)' : undefined,
                      boxShadow:
                        studentPick && !studentGhost
                          ? 'inset 0 0 0 1px rgba(156, 39, 176, 0.18)'
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
                        pointerEvents: 'none',
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
                        readOnly
                        disabled={readOnly || studentGhost}
                        value={p}
                        tabIndex={-1}
                        sx={{
                          p: compact ? 0.35 : 0.75,
                          pointerEvents: 'none',
                          '& .MuiSvgIcon-root': { fontSize: compact ? 20 : 26 },
                          color:
                            studentPick && !teacherChecked && !studentGhost
                              ? 'rgba(156, 39, 176, 0.38)'
                              : studentGhost
                                ? 'rgba(156, 39, 176, 0.28)'
                                : isTeacherOwn
                                  ? 'rgba(25, 118, 210, 0.55)'
                                  : 'rgba(25, 118, 210, 0.45)',
                          '&.Mui-checked': {
                            color: studentGhost
                              ? 'rgba(156, 39, 176, 0.55)'
                              : isTeacherOwn
                                ? '#1565c0'
                                : epoNotenPalette.primary,
                          },
                          ...(studentPick &&
                            teacherChecked &&
                            !studentGhost && {
                              '&.Mui-checked': {
                                color: isTeacherOwn ? '#1565c0' : epoNotenPalette.primary,
                                filter: 'drop-shadow(0 0 0 2px rgba(156, 39, 176, 0.22))',
                              },
                            }),
                          ...(isTeacherOwn &&
                            teacherChecked && {
                              '&.Mui-checked .MuiSvgIcon-root': {
                                fontSize: compact ? 22 : 28,
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
