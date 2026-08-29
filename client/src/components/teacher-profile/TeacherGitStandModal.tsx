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
  pullTeacherGitBackup,
  pushTeacherGitBackup,
  type StandChange,
} from '../../lib/teacherGitBackup';
import { NOTES_FROM_GIT_EVENT } from '../TeacherQuickNotes';

type Phase = 'preview' | 'run' | 'done' | 'error';

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

export type TeacherGitStandMode = 'push' | 'pull';

type TeacherGitStandModalProps = {
  open: boolean;
  mode: TeacherGitStandMode;
  onClose: () => void;
};

export default function TeacherGitStandModal({ open, mode, onClose }: TeacherGitStandModalProps) {
  const isPull = mode === 'pull';
  const [phase, setPhase] = useState<Phase>('preview');
  const [explanation, setExplanation] = useState('Ich schaue, was sich geändert hat …');
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const [changes, setChanges] = useState<StandChange[]>([]);

  const running = phase === 'preview' || phase === 'run';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase('preview');
    setExplanation('Ich schaue, was sich geändert hat …');
    setSummary('');
    setMessage('');
    setChanges([]);

    void (async () => {
      try {
        const preview = await fetchTeacherGitBackupPreview(mode);
        if (cancelled) return;
        setChanges(preview.changes || []);
        setExplanation(preview.explanation || preview.hint);
        setSummary(preview.summary);
        if (!preview.available) {
          setPhase('error');
          setMessage(preview.hint || preview.explanation);
          return;
        }
        if ((preview.changes || []).length === 0) {
          setPhase('done');
          setMessage(preview.summary || 'GitHub und dieser Rechner sind gleich.');
          return;
        }
      } catch {
        if (cancelled) return;
        setExplanation(
          isPull
            ? 'Liste nicht geladen — ich hole den Stand trotzdem.'
            : 'Liste nicht geladen — ich schicke den Stand trotzdem.'
        );
      }

      if (cancelled) return;
      setPhase('run');
      try {
        const result = isPull ? await pullTeacherGitBackup() : await pushTeacherGitBackup();
        if (cancelled) return;
        if (result.changes?.length) setChanges(result.changes);
        if (result.explanation) setExplanation(result.explanation);
        setMessage(result.message);
        setPhase(result.ok ? 'done' : 'error');
        if (isPull && result.ok && typeof window !== 'undefined') {
          window.dispatchEvent(new Event(NOTES_FROM_GIT_EVENT));
        }
      } catch {
        if (cancelled) return;
        setPhase('error');
        setMessage(isPull ? 'Holen fehlgeschlagen. GitHub-Zugang prüfen.' : 'Push fehlgeschlagen. GitHub-Zugang prüfen.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mode, isPull]);

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
      PaperProps={{
        sx: { borderRadius: 2.5, overflow: 'hidden' },
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
          {isPull ? 'Stand von GitHub holen' : 'Stand nach GitHub'}
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
                : phase === 'run'
                  ? isPull
                    ? 'Hole von GitHub … das kann einen Moment dauern.'
                    : 'Schiebe nach GitHub … das kann einen Moment dauern.'
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
