import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  downloadTeacherFullArchive,
  OPEN_TEACHER_FULL_ARCHIVE_EVENT,
} from '../../lib/teacherFullArchive';

type Phase = 'idle' | 'run' | 'done' | 'error';

export default function TeacherFullArchiveModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const openIt = () => {
      setOpen(true);
      setPhase('run');
      setMessage('Ich packe Präsentationen, Notizen und Entry Tickets …');
      setFileName('');
      void (async () => {
        try {
          const result = await downloadTeacherFullArchive();
          setFileName(result.fileName);
          const parts = [
            result.presentations ? `${result.presentations} Präsentationen` : null,
            result.notesFiles ? `Notizen` : 'Notizen',
            'Entry Tickets',
          ].filter(Boolean);
          setMessage(
            `Fertig. ZIP ist heruntergeladen (${parts.join(', ')}). ` +
              'Eine Kopie liegt auch unter J-M-Reihen/Backup - Downloads.'
          );
          setPhase('done');
        } catch (err) {
          setPhase('error');
          setMessage(err instanceof Error ? err.message : 'Download fehlgeschlagen.');
        }
      })();
    };
    window.addEventListener(OPEN_TEACHER_FULL_ARCHIVE_EVENT, openIt);
    return () => window.removeEventListener(OPEN_TEACHER_FULL_ARCHIVE_EVENT, openIt);
  }, []);

  return (
    <Dialog open={open} onClose={() => phase !== 'run' && setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={dialogCloseTitleSx}>
        Alles sichern
        <DialogCloseIconButton
          onClose={() => phase !== 'run' && setOpen(false)}
          disabled={phase === 'run'}
        />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1 }}>
          {phase === 'run' && <CircularProgress size={22} sx={{ mt: 0.3 }} />}
          <Box>
            <Typography sx={{ fontSize: '0.92rem', lineHeight: 1.45 }}>{message}</Typography>
            {fileName ? (
              <Typography sx={{ mt: 1, fontSize: '0.78rem', color: 'text.secondary' }}>{fileName}</Typography>
            ) : null}
            {phase === 'run' ? (
              <Typography sx={{ mt: 1.25, fontSize: '0.78rem', color: 'text.secondary' }}>
                PDF und PPTX werden mitgepackt. Das kann eine Minute dauern.
              </Typography>
            ) : null}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
