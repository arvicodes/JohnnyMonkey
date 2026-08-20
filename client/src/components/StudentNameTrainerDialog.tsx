import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
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
  const [photoVisible, setPhotoVisible] = useState(true);

  useEffect(() => {
    if (!open) return;
    setOrderIds(withPhoto.map((s) => s.id));
    setIndex(0);
    setShowName(false);
    setRandomMode(false);
    setPhotoVisible(true);
  }, [open, withPhoto]);

  const ordered = useMemo(() => {
    const byId = new Map(withPhoto.map((s) => [s.id, s]));
    return orderIds.map((id) => byId.get(id)).filter(Boolean) as NameTrainerStudent[];
  }, [orderIds, withPhoto]);

  const current = ordered[index] ?? null;
  const photoUrl = resolveAvatarUrl(current?.avatarUrl);
  const total = ordered.length;

  useEffect(() => {
    if (!open || !total) return;
    [index + 1, index - 1].forEach((i) => {
      const s = ordered[(i + total) % total];
      const url = resolveAvatarUrl(s?.avatarUrl);
      if (!url) return;
      const img = new Image();
      img.src = url;
    });
  }, [open, index, ordered, total]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!total) return;
      setPhotoVisible(false);
      setShowName(false);
      window.setTimeout(() => {
        setIndex((i) => (i + dir + total) % total);
        setPhotoVisible(true);
      }, 120);
    },
    [total],
  );

  const toggleRandom = useCallback(() => {
    const currentId = ordered[index]?.id;
    setRandomMode((on) => {
      const next = !on;
      if (next) {
        setOrderIds(shuffleIds(withPhoto.map((s) => s.id)));
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
          bgcolor: '#0d0d0d',
          backgroundImage: 'none',
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          color: '#fff',
          bgcolor: 'transparent',
          py: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.95rem', opacity: 0.7, pr: 4 }}>
          {groupName}
          {total ? `  ${index + 1}/${total}` : ''}
        </Typography>
        <DialogCloseIconButton
          onClose={onClose}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>
      <DialogContent
        sx={{
          px: 2,
          pb: 2.5,
          pt: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {!total || !current || !photoUrl ? (
          <Typography sx={{ color: '#bbb', py: 8, textAlign: 'center' }}>
            In dieser Gruppe gibt es noch keine SuS-Fotos.
          </Typography>
        ) : (
          <>
            <Box
              onClick={() => setShowName((v) => !v)}
              sx={{
                width: 'min(68vh, 100%)',
                maxWidth: 540,
                aspectRatio: '1',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                bgcolor: '#111',
              }}
            >
              <Box
                component="img"
                src={photoUrl}
                alt=""
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: photoVisible ? 1 : 0,
                  transition: 'opacity 0.14s ease',
                }}
              />
            </Box>
            <Box
              sx={{
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mt: 1,
              }}
            >
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '1.7rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  opacity: showName ? 1 : 0,
                  transform: showName ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  pointerEvents: 'none',
                }}
              >
                {current.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={() => go(-1)} sx={{ color: '#fff' }} aria-label="Zurück">
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={toggleRandom}
                aria-label="Zufall"
                sx={{ color: randomMode ? '#fff' : 'rgba(255,255,255,0.4)' }}
              >
                <ShuffleIcon />
              </IconButton>
              <IconButton onClick={() => go(1)} sx={{ color: '#fff' }} aria-label="Weiter">
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
