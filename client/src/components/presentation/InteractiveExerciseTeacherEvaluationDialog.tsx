import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  flattenExerciseTasks,
  resolveInteractiveExercise,
  type SlideInteractiveExercise,
} from '../../lib/presentationInteractiveExercise';
import {
  fetchTeacherInteractiveExerciseProgress,
  type TeacherInteractiveExerciseProgressRow,
} from '../../lib/lessonInteractiveExerciseProgress';
import { teacherIdFromStorage } from '../../lib/lessonInteractiveExerciseBeacon';

const POLL_MS = 4000;

function percentCell(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)} %`;
}

function percentColor(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '#888';
  if (value >= 90) return '#2E7D32';
  if (value >= 60) return '#F9A825';
  return '#C62828';
}

type Props = {
  open: boolean;
  onClose: () => void;
  exercise: SlideInteractiveExercise;
  groupId: string;
  lessonPath: string;
};

export default function InteractiveExerciseTeacherEvaluationDialog({
  open,
  onClose,
  exercise: rawExercise,
  groupId,
  lessonPath,
}: Props) {
  const exercise = useMemo(
    () => resolveInteractiveExercise(rawExercise) || rawExercise,
    [rawExercise],
  );
  const columns = useMemo(() => flattenExerciseTasks(exercise), [exercise]);
  const [rows, setRows] = useState<TeacherInteractiveExerciseProgressRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const teacherId = teacherIdFromStorage();
    const gid = groupId.trim();
    if (!teacherId || !gid || !exercise?.id) return;
    try {
      const data = await fetchTeacherInteractiveExerciseProgress({
        teacherId,
        groupId: gid,
        lessonPath,
        exerciseId: exercise.id,
      });
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    }
  }, [groupId, lessonPath, exercise?.id]);

  useEffect(() => {
    if (!open) return;
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [open, load]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ ...dialogCloseTitleSx, pr: 5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem' }}>
          Auswertung · {exercise.title}
        </Typography>
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {error ? (
          <Typography sx={{ color: '#C62828', mb: 1, fontSize: '0.85rem' }}>{error}</Typography>
        ) : null}
        <Typography sx={{ fontSize: '0.75rem', color: '#666', mb: 1.5 }}>
          Erfolg in Prozent pro Schüler und Aufgabe (aktualisiert sich automatisch).
        </Typography>
        <TableContainer sx={{ maxHeight: '70vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, minWidth: 140, bgcolor: '#fafafa' }}>
                  Schüler
                </TableCell>
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    align="center"
                    sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: '#fafafa', minWidth: 72 }}
                    title={`${col.topicTitle} — ${col.label}`}
                  >
                    <Box sx={{ maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {col.label}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.studentId} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {row.studentName}
                  </TableCell>
                  {columns.map((col) => {
                    const pct = row.questionPercents[col.key];
                    return (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: percentColor(pct),
                        }}
                      >
                        {percentCell(pct)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {rows.length === 0 && !error ? (
          <Typography sx={{ mt: 2, textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
            Noch keine Daten — SuS müssen die Übung in der Lerngruppe bearbeiten.
          </Typography>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
