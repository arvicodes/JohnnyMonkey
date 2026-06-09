import React from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import {
  formatEditDeadlineLabel,
  type ExcursionAvailableSession,
} from '../../lib/excursionProtocolTypes';
import { protocolCardSx, protocolPalette } from './excursionProtocolUi';

type Props = {
  sessions: ExcursionAvailableSession[];
  selectedId?: string;
  onSelect: (session: ExcursionAvailableSession) => void;
  formatShortDate: (isoDate: string) => string;
};

export function ExcursionProtocolStudentList({ sessions, selectedId, onSelect, formatShortDate }: Props) {
  if (sessions.length === 0) return null;

  return (
    <Card elevation={0} sx={protocolCardSx}>
      <CardContent sx={{ p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: protocolPalette.textPrimary }}>
          Deine Protokolle
        </Typography>
        <Stack spacing={0.75}>
          {sessions.map((session) => {
            const selected = session.id === selectedId;
            const statusLabel = session.studentSubmitted
              ? session.studentCanEdit === false
                ? 'Abgegeben · gesperrt'
                : 'Abgegeben'
              : 'Offen';
            const statusColor = session.studentSubmitted
              ? session.studentCanEdit === false
                ? 'default'
                : 'success'
              : 'warning';

            return (
              <Box
                key={session.id}
                onClick={() => onSelect(session)}
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: selected ? protocolPalette.secondary : 'divider',
                  bgcolor: selected ? 'rgba(245, 124, 0, 0.08)' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: protocolPalette.secondary,
                    boxShadow: '0 2px 8px rgba(245, 124, 0, 0.12)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.25 }} noWrap>
                      {session.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                      {formatShortDate(session.date)}
                      {session.groupName ? ` · ${session.groupName}` : ''}
                    </Typography>
                    {session.studentSubmittedAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Abgegeben: {new Date(session.studentSubmittedAt).toLocaleString('de-DE')}
                      </Typography>
                    )}
                    {session.editDeadline && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {formatEditDeadlineLabel(session.editDeadline)}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={statusLabel}
                    color={statusColor}
                    sx={{ height: 22, fontWeight: 700, fontSize: '0.68rem', flexShrink: 0 }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
