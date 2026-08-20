import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import { DialogCloseIconButton, dialogCloseTitleSx } from './ui/dialog-close-icon-button';
import { resolveAvatarUrl } from '../lib/avatarUrl';

export type NameTrainerStudent = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  groupName: string;
  students: NameTrainerStudent[];
};

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudentNameTrainerDialog({ open, onClose, groupName, students }: Props) {
  const withPhoto = useMemo(
    () =>
      students
        .filter((s) => Boolean(resolveAvatarUrl(s.avatarUrl)))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [students],
  );

  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [showName, setShowName] = useState(false);
  const [randomMode, setRandomMode] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ids = withPhoto.map((s) => s.id);
    setOrderIds(ids);
    setIndex(0);
    setShowName(false);
    setRandomMode(false);
  }, [open, withPhoto]);

  const ordered = useMemo(() => {
    const byId = new Map(withPhoto.map((s) => [s.id, s]));
    return orderIds.map((id) => byId.get(id)).filter(Boolean) as NameTrainerStudent[];
  }, [orderIds, withPhoto]);

  const current = ordered[index] ?? null;
  const photoUrl = resolveAvatarUrl(current?.avatarUrl);
  const total = ordered.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!total) return;
      setIndex((i) => (i + dir + total) % total);
      setShowName(false);
    },
    [total],
  );

  const toggleRandom = useCallback(() => {
    setRandomMode((on) => {
      const next = !on;
      const currentId = ordered[index]?.id;
      if (next) {
        const shuffled = shuffleIds(withPhoto.map((s) => s.id));
        setOrderIds(shuffled);
        setIndex(0);
      } else {
        const sorted = withPhoto.map((s) => s.id);
        setOrderIds(sorted);
        const keep = currentId ? sorted.indexOf(currentId) : 0;
        setIndex(keep >= 0 ? keep : 0);
      }
      setShowName(false);
      return next;
    });
  }, [index, ordered, withPhoto]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setShowName((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, go, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#111',
          backgroundImage: 'none',
          borderRadius: 2,
          overflow: 'hidden',
          minHeight: '70vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          color: '#fff',
          bgcolor: '#1a1a1a',
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', flex: 1, pr: 4 }}>
          Namen lernen · {groupName}
        </Typography>
        <DialogCloseIconButton
          onClose={onClose}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          bgcolor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        {!total || !current || !photoUrl ? (
          <Typography sx={{ color: '#bbb', py: 8, textAlign: 'center' }}>
            In dieser Gruppe gibt es noch keine SuS-Fotos.
          </Typography>
        ) : (
          <>
            <Typography sx={{ color: '#9e9e9e', fontSize: '0.85rem' }}>
              {index + 1} / {total}
              {randomMode ? ' · zufällig' : ''}
            </Typography>
            <Box
              onClick={() => setShowName((v) => !v)}
              sx={{
                width: 'min(72vh, 100%)',
                maxWidth: 560,
                aspectRatio: '1',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                bgcolor: '#111',
                boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
              }}
            >
              <Box
                component="img"
                src={photoUrl}
                alt={showName ? current.name : 'Schülerfoto'}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
            <Box
              sx={{
                minHeight: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showName ? (
                <Typography sx={{ color: '#fff', fontSize: '1.85rem', fontWeight: 800, textAlign: 'center' }}>
                  {current.name}
                </Typography>
              ) : (
                <Typography sx={{ color: '#666', fontSize: '0.95rem' }}>Leertaste: Name anzeigen</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
              <IconButton onClick={() => go(-1)} sx={{ color: '#fff' }} aria-label="Vorheriges Foto">
                <ChevronLeftIcon />
              </IconButton>
              <Tooltip title={randomMode ? 'Reihenfolge A–Z' : 'Zufällige Reihenfolge'}>
                <Button
                  variant={randomMode ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<ShuffleIcon />}
                  onClick={toggleRandom}
                  sx={{
                    textTransform: 'none',
                    color: randomMode ? '#111' : '#fff',
                    borderColor: 'rgba(255,255,255,0.35)',
                    bgcolor: randomMode ? '#fff' : 'transparent',
                    '&:hover': {
                      bgcolor: randomMode ? '#eee' : 'rgba(255,255,255,0.08)',
                      borderColor: '#fff',
                    },
                  }}
                >
                  Zufall
                </Button>
              </Tooltip>
              <IconButton onClick={() => go(1)} sx={{ color: '#fff' }} aria-label="Nächstes Foto">
                <ChevronRightIcon />
              </IconButton>
            </Box>
            <Typography sx={{ color: '#555', fontSize: '0.75rem', pb: 0.5 }}>
              ← → blättern · Leertaste Name · Esc schließen
            </Typography>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
