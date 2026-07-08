import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { apiPut } from '../../lib/api';
import {
  DEFAULT_JOHNNY_PERIOD_TIMES,
  type PeriodTime,
} from '../../lib/periodTimes';
import { schedulePx, scheduleRem } from './scheduleUiScale';

interface ZeittafelJohnnyDialogProps {
  open: boolean;
  onClose: () => void;
  periodTimes: PeriodTime[];
  onSaved: (periods: PeriodTime[]) => void;
}

export default function ZeittafelJohnnyDialog({
  open,
  onClose,
  periodTimes,
  onSaved,
}: ZeittafelJohnnyDialogProps) {
  const [draft, setDraft] = useState<PeriodTime[]>(periodTimes);

  useEffect(() => {
    if (open) setDraft(periodTimes.length ? periodTimes : DEFAULT_JOHNNY_PERIOD_TIMES);
  }, [open, periodTimes]);

  const updateRow = (index: number, field: 'start' | 'end', value: string) => {
    setDraft((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = async () => {
    const res = await apiPut('/api/teacher-schedule/settings', { periodTimes: draft });
    if (res.ok) {
      const data = await res.json();
      onSaved(data.periodTimes);
      onClose();
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_JOHNNY_PERIOD_TIMES);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      PaperProps={{ sx: { maxWidth: schedulePx(444) } }}
    >
      <DialogTitle sx={{ ...dialogCloseTitleSx }}>
        <Typography variant="h6" sx={{ fontSize: scheduleRem(1) }}>
          Zeittafel Johnny
        </Typography>
        <DialogCloseIconButton onClose={onClose} />
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: scheduleRem(1.5), fontSize: scheduleRem(0.875) }}>
          Standardzeiten am Johannes-Gymnasium (editierbar)
        </Typography>
        <Table size="small" sx={{ '& .MuiTableCell-root': { fontSize: scheduleRem(0.875), py: scheduleRem(0.75) } }}>
          <TableHead>
            <TableRow>
              <TableCell>Stunde</TableCell>
              <TableCell>Von</TableCell>
              <TableCell>Bis</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {draft.map((row, index) => (
              <TableRow key={row.period}>
                <TableCell>{row.period}</TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.start}
                    onChange={(e) => updateRow(index, 'start', e.target.value)}
                    inputProps={{
                      style: {
                        fontSize: scheduleRem(0.85),
                        padding: `${schedulePx(4)}px ${schedulePx(8)}px`,
                      },
                    }}
                    sx={{ width: schedulePx(80) }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    value={row.end}
                    onChange={(e) => updateRow(index, 'end', e.target.value)}
                    inputProps={{
                      style: {
                        fontSize: scheduleRem(0.85),
                        padding: `${schedulePx(4)}px ${schedulePx(8)}px`,
                      },
                    }}
                    sx={{ width: schedulePx(80) }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions sx={{ px: scheduleRem(2), py: scheduleRem(1) }}>
        <Button size="small" onClick={handleReset} sx={{ fontSize: scheduleRem(0.8125) }}>
          Standard
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose} sx={{ fontSize: scheduleRem(0.8125) }}>
          Abbrechen
        </Button>
        <Button size="small" variant="contained" onClick={handleSave} sx={{ fontSize: scheduleRem(0.8125) }}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
