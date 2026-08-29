import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  fetchTeacherGitBackupPreview,
  pushTeacherGitBackup,
  type StandChange,
} from '../../lib/teacherGitBackup';

type Phase = 'preview' | 'push' | 'done' | 'error';

const KIND_LABEL: Record<StandChange['kind'], string> = {
  added: 'Neu',
  changed: 'Geändert',
  removed: 'Weg',
};

const KIND_COLOR: Record<StandChange['kind'], string> = {
  added: '#2e7d32',
  changed: '#1565c0',
  removed: '#c62828',
};

const LIST_CAP = 80;

type TeacherGitStandModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function TeacherGitStandModal({ open, onClose }: TeacherGitStandModalProps) {
  const [phase, setPhase] = useState<Phase>('preview');
  const [explanation, setExplanation] = useState('Ich schaue, was sich geändert hat …');
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const [changes, setChanges] = useState<StandChange[]>([]);

  const running = phase === 'preview' || phase === 'push';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('preview');
    setExplanation('Ich schaue, was sich geändert hat …');
    setSummary('');
    setMessage('');
    setChanges([]);

    void (async () => {
      let nextChanges: StandChange[] = [];
      try {
        const preview = await fetchTeacherGitBackupPreview();
        if (cancelled) return;
        nextChanges = preview.changes || [];
        setChanges(nextChanges);
        setExplanation(preview.explanation || preview.hint);
        setSummary(preview.summary);
        if (!preview.available) {
          setPhase('error');
          setMessage(preview.hint || preview.explanation);
          return;
        }
        if (nextChanges.length === 0) {
          setPhase('done');
          setMessage(preview.summary || 'GitHub hat schon genau diesen Stand.');
          return;
        }
      } catch {
        if (cancelled) return;
        setExplanation('Liste der Änderungen nicht geladen — ich schicke den Stand trotzdem.');
      }

      if (cancelled) return;
      setPhase('push');
      try {
        const result = await pushTeacherGitBackup();
        if (cancelled) return;
        if (result.changes?.length) setChanges(result.changes);
        setExplanation(result.explanation || explanation);
        setMessage(result.message);
        setPhase(result.ok ? 'done' : 'error');
      } catch {
        if (cancelled) return;
        setPhase('error');
        setMessage('Push fehlgeschlagen. GitHub-Zugang prüfen.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const extra = Math.max(0, changes.length - LIST_CAP);
  const visible = changes.slice(0, LIST_CAP);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!running) onClose();
      }}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: { borderRadius: 2.5, overflow: 'hidden' },
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          bgcolor: '#e3f2fd',
          borderBottom: '1px solid #bbdefb',
          py: 1.25,
          px: 2,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#1565c0' }}>
          Stand nach GitHub
        </Typography>
        <DialogCloseIconButton onClose={onClose} disabled={running} />
      </DialogTitle>
      <DialogContent sx={{ px: 2, py: 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, mb: 1.25 }}>
          {running ? <CircularProgress size={22} sx={{ mt: 0.15, color: '#1565c0' }} /> : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#37474f', lineHeight: 1.4 }}>
              {phase === 'preview'
                ? 'Ich schaue, was sich geändert hat …'
                : phase === 'push'
                  ? 'Schiebe nach GitHub … das kann einen Moment dauern.'
                  : message || (phase === 'error' ? 'Nicht geschafft.' : 'Fertig.')}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#546e7a', mt: 0.5, lineHeight: 1.45 }}>
              {explanation}
            </Typography>
            {summary && phase !== 'preview' ? (
              <Typography sx={{ fontSize: '0.68rem', color: '#1565c0', mt: 0.45, fontWeight: 700 }}>
                {summary}
              </Typography>
            ) : null}
          </Box>
        </Box>

        {visible.length ? (
          <Box
            sx={{
              maxHeight: 320,
              overflow: 'auto',
              border: '1px solid #e3f2fd',
              borderRadius: 1.5,
              bgcolor: '#fafcfe',
            }}
          >
            {visible.map((item, i) => (
              <Box
                key={`${item.kind}-${item.path}-${i}`}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 1.1,
                  py: 0.7,
                  borderBottom: i < visible.length - 1 ? '1px solid #eef5fb' : 'none',
                }}
              >
                <Chip
                  label={KIND_LABEL[item.kind]}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    bgcolor: `${KIND_COLOR[item.kind]}14`,
                    color: KIND_COLOR[item.kind],
                    flexShrink: 0,
                    mt: 0.1,
                  }}
                />
                <Typography sx={{ fontSize: '0.7rem', color: '#37474f', lineHeight: 1.35 }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : running ? (
          <Typography sx={{ fontSize: '0.68rem', color: '#90a4ae' }}>
            Liste kommt gleich …
          </Typography>
        ) : null}

        {extra > 0 ? (
          <Typography sx={{ fontSize: '0.65rem', color: '#78909c', mt: 0.75 }}>
            und {extra} weitere
          </Typography>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
