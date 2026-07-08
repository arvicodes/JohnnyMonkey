import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Button,
} from '@mui/material';
import { DialogCloseIconButton } from './ui/dialog-close-icon-button';
import { apiGetSafe } from '../lib/api';

const POLL_MS = 5000;
const DISMISS_KEY = 'autoLessonDismissed';

type ActiveSession = {
  id: string;
  groupId: string;
  periodNumber: number;
  lessonPath: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  group: {
    id: string;
    name: string;
    iconEmoji?: string | null;
    color?: string | null;
  };
};

/**
 * Benachrichtigt Schüler, wenn eine Unterrichtsstunde automatisch gestartet wurde.
 */
export default function StudentAutoLessonAlerts({ userId }: { userId: string }) {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [open, setOpen] = useState(false);

  const poll = useCallback(async () => {
    if (!userId || !localStorage.getItem('loginCode')?.trim()) return;
    try {
      const res = await apiGetSafe('/api/teacher-schedule/active-lessons/student');
      if (!res?.ok) return;
      const data = await res.json();
      const sessions: ActiveSession[] = data.sessions || [];
      const active = sessions.find((s) => s.status === 'ACTIVE') || sessions[0];
      if (!active) {
        setSession(null);
        setOpen(false);
        return;
      }

      const dismissed = sessionStorage.getItem(`${DISMISS_KEY}_${active.id}`);
      if (dismissed) return;

      setSession(active);
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [userId, poll]);

  const dismiss = () => {
    if (session) sessionStorage.setItem(`${DISMISS_KEY}_${session.id}`, '1');
    setOpen(false);
  };

  if (!session) return null;

  return (
    <Dialog open={open} onClose={dismiss} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ position: 'relative', pr: 5 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
          Unterrichtsstunde gestartet
        </Typography>
        <DialogCloseIconButton onClose={dismiss} />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Typography sx={{ fontSize: '2rem', mb: 1 }}>
            {session.group.iconEmoji || '📚'}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {session.group.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Stunde {session.periodNumber} – Die Unterrichtsstunde läuft jetzt.
            Materialien sind freigegeben.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="contained" onClick={dismiss}>
            Verstanden
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
