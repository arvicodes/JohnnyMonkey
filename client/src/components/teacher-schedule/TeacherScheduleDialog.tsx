import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Schedule as ScheduleIcon } from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { apiGet, apiPut } from '../../lib/api';
import { DEFAULT_JOHNNY_PERIOD_TIMES, type PeriodTime } from '../../lib/periodTimes';
import ZeittafelJohnnyDialog from './ZeittafelJohnnyDialog';
import ScheduleGrid, { type ScheduleGroup, type ScheduleSlotData } from './ScheduleGrid';
import { schedulePx, scheduleRem } from './scheduleUiScale';

interface TeacherScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  groups: ScheduleGroup[];
}

export default function TeacherScheduleDialog({
  open,
  onClose,
  groups,
}: TeacherScheduleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<ScheduleSlotData[]>([]);
  const [startWindow, setStartWindow] = useState(5);
  const [endWindow, setEndWindow] = useState(5);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(DEFAULT_JOHNNY_PERIOD_TIMES);
  const [zeittafelOpen, setZeittafelOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const activeGroups = groups.filter((g) => !(g as { isArchived?: boolean }).isArchived);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/api/teacher-schedule/settings');
      if (!res.ok) throw new Error('Laden fehlgeschlagen');
      const data = await res.json();
      setStartWindow(data.settings.startWindowMinutes);
      setEndWindow(data.settings.endWindowMinutes);
      setPeriodTimes(data.settings.periodTimes);
      setSlots(
        (data.slots || []).map((s: ScheduleSlotData) => ({
          groupId: s.groupId,
          dayOfWeek: s.dayOfWeek,
          periodNumber: s.periodNumber,
          lessonPath: s.lessonPath,
        }))
      );
    } catch {
      setMessage('Einstellungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadSettings();
      setMessage(null);
    }
  }, [open, loadSettings]);

  const saveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const settingsRes = await apiPut('/api/teacher-schedule/settings', {
        startWindowMinutes: startWindow,
        endWindowMinutes: endWindow,
      });
      if (!settingsRes.ok) throw new Error('Einstellungen speichern fehlgeschlagen');

      const slotsRes = await apiPut('/api/teacher-schedule/slots', { slots });
      if (!slotsRes.ok) throw new Error('Stundenplan speichern fehlgeschlagen');

      setMessage('Stundenplan gespeichert.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        scroll="body"
        PaperProps={{
          sx: {
            maxWidth: schedulePx(900),
            width: '100%',
            maxHeight: `calc(100vh - ${schedulePx(48)}px)`,
          },
        }}
      >
        <DialogTitle
          sx={{
            ...dialogCloseTitleSx,
            bgcolor: '#1976d2',
            color: '#fff',
            py: scheduleRem(0.75),
            minHeight: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: scheduleRem(0.75) }}>
            <ScheduleIcon sx={{ fontSize: schedulePx(18) }} />
            <Typography variant="h6" sx={{ fontSize: scheduleRem(0.9), color: '#fff' }}>
              Stundenplan
            </Typography>
          </Box>
          <DialogCloseIconButton
            onClose={onClose}
            sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
            iconSx={{ color: '#fff' }}
          />
        </DialogTitle>

        <DialogContent dividers sx={{ px: scheduleRem(1.5), py: scheduleRem(1), overflow: 'visible' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: scheduleRem(3) }}>
              <CircularProgress size={schedulePx(28)} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: scheduleRem(0.75) }}>
              {message && (
                <Alert
                  severity={message.includes('gespeichert') ? 'success' : 'error'}
                  onClose={() => setMessage(null)}
                  sx={{ py: 0, '& .MuiAlert-message': { fontSize: scheduleRem(0.75) } }}
                >
                  {message}
                </Alert>
              )}

              <ScheduleGrid
                groups={activeGroups}
                slots={slots}
                periodTimes={periodTimes}
                onChange={setSlots}
                startWindow={startWindow}
                endWindow={endWindow}
                onStartWindowChange={setStartWindow}
                onEndWindowChange={setEndWindow}
                onOpenZeittafel={() => setZeittafelOpen(true)}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: scheduleRem(1.5), py: scheduleRem(0.5), minHeight: 0 }}>
          <Button size="small" onClick={onClose} sx={{ fontSize: scheduleRem(0.75) }}>
            Schließen
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={saveAll}
            disabled={saving || loading}
            sx={{ fontSize: scheduleRem(0.75) }}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      <ZeittafelJohnnyDialog
        open={zeittafelOpen}
        onClose={() => setZeittafelOpen(false)}
        periodTimes={periodTimes}
        onSaved={setPeriodTimes}
      />
    </>
  );
}
