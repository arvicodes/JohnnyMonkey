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
  if (session.needsGoals) return <Chip size="small" color="secondary" label="Ziele festlegen" />;
  if (session.teacherReleased) return <Chip size="small" color="success" label="Note da" />;
  if (session.studentSubmitted) return <Chip size="small" label="Abgegeben" />;
  if (session.needsSelfAssessment) return <Chip size="small" color="warning" label="Offen" />;
  return <Chip size="small" variant="outlined" label="EPO" />;
}

type Props = {
  sessions: EpoNotenStudentSession[];
  onSelect: (roundId: string) => void;
};

export function EpoNotenStudentRoundList({ sessions, onSelect }: Props) {
  const sorted = [...sessions].sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    if (da !== db) return db.localeCompare(da);
    return a.title.localeCompare(b.title, 'de');
  });

  return (
    <Box sx={epoNotenCardSx}>
      <Typography variant="subtitle2" sx={{ px: 1.5, pt: 1.25, pb: 0.5, ...epoNotenSectionTitleSx }}>
        Deine EPO-Runden
      </Typography>
      <List dense disablePadding>
        {sorted.map((s) => (
          <ListItemButton
            key={`${s.id}-${s.groupId}`}
            onClick={() => onSelect(s.id)}
            sx={{
              py: 1.25,
              borderBottom: `1px solid ${epoNotenPalette.border}`,
              '&:last-child': { borderBottom: 0 },
            }}
          >
            <ListItemText
              primary={s.title}
              secondary={`${formatRoundDate(s.date)} · ${s.groupName}`}
              primaryTypographyProps={{ fontWeight: 700, fontSize: '0.92rem' }}
              secondaryTypographyProps={{ fontSize: '0.78rem' }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {statusChip(s)}
              <ChevronRightIcon fontSize="small" color="action" />
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
