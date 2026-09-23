import React from 'react';
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { EpoNotenStudentSession } from '../../lib/epoNotenShared';
import { epoNotenCardSx, epoNotenPalette, epoNotenSectionTitleSx } from './epoNotenUi';

function formatRoundDate(date: string): string {
  if (!date) return '—';
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusChip(session: EpoNotenStudentSession) {
  if (session.isArchived) {
    return <Chip size="small" variant="outlined" label="Bearbeitet" sx={{ opacity: 0.85 }} />;
  }
  if (session.actionRequired && session.needsSelfAssessment) {
    return (
      <Chip
        size="small"
        color="warning"
        label="Offen — jetzt ausfüllen"
        sx={{
          fontWeight: 800,
          animation: 'epoOpenBlink 1.1s ease-in-out infinite',
          '@keyframes epoOpenBlink': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 124, 0, 0.55)' },
            '50%': { boxShadow: '0 0 0 8px rgba(245, 124, 0, 0)' },
          },
        }}
      />
    );
  }
  if (session.actionRequired && session.needsGoals) {
    return (
      <Chip
        size="small"
        color="secondary"
        label="Ziele festlegen"
        sx={{
          fontWeight: 800,
          animation: 'epoOpenBlink 1.1s ease-in-out infinite',
          '@keyframes epoOpenBlink': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(156, 39, 176, 0.45)' },
            '50%': { boxShadow: '0 0 0 8px rgba(156, 39, 176, 0)' },
          },
        }}
      />
    );
  }
  if (session.isActive && session.studentSubmitted && !session.teacherReleased) {
    return <Chip size="small" color="info" label="Warte auf Lehrkraft" />;
  }
  if (session.isActive) return <Chip size="small" color="success" label="Aktuell" />;
  return <Chip size="small" variant="outlined" label="Bearbeitet" />;
}

type Props = {
  sessions: EpoNotenStudentSession[];
  onSelect: (roundId: string) => void;
};

export function EpoNotenStudentRoundList({ sessions, onSelect }: Props) {
  const sorted = [...sessions].sort((a, b) => {
    if (a.actionRequired !== b.actionRequired) return a.actionRequired ? -1 : 1;
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const da = a.date || '';
    const db = b.date || '';
    if (da !== db) return db.localeCompare(da);
    return a.title.localeCompare(b.title, 'de');
  });

  return (
    <Box sx={epoNotenCardSx}>
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1.5, pb: 0.75, ...epoNotenSectionTitleSx, fontSize: '1.25rem' }}>
        Deine EPO-Runden
      </Typography>
      <Typography variant="body2" sx={{ px: 2, pb: 1, color: epoNotenPalette.textSecondary }}>
        Blinkend = du sollst hier noch etwas eintragen. Ältere Runden sind ausgegraut.
      </Typography>
      <List dense disablePadding>
        {sorted.map((s) => {
          const archived = s.isArchived;
          return (
            <ListItemButton
              key={`${s.id}-${s.groupId}`}
              onClick={() => onSelect(s.id)}
              sx={{
                py: 1.5,
                px: 2,
                borderBottom: `1px solid ${epoNotenPalette.border}`,
                opacity: archived ? 0.52 : 1,
                bgcolor: s.actionRequired ? 'rgba(245, 124, 0, 0.06)' : archived ? 'rgba(0,0,0,0.02)' : 'transparent',
                '&:last-child': { borderBottom: 0 },
                '&:hover': { opacity: archived ? 0.65 : 1 },
              }}
            >
              <ListItemText
                primary={s.title}
                secondary={`${formatRoundDate(s.date)} · ${s.groupName}`}
                primaryTypographyProps={{
                  fontWeight: 700,
                  fontSize: archived ? '0.9rem' : '1.05rem',
                  color: archived ? epoNotenPalette.textSecondary : epoNotenPalette.textPrimary,
                }}
                secondaryTypographyProps={{ fontSize: '0.82rem' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {statusChip(s)}
                <ChevronRightIcon fontSize="small" color="action" />
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
