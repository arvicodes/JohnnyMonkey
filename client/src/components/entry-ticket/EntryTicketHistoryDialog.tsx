import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { apiGet } from '../../lib/api';
import {
  decorateEntryTicketDisplayHtml,
  entryTicketLooksLikeHtml,
  entryTicketPlainText,
} from '../../lib/entryTicketRichText';

export type EntryTicketHistoryTask = {
  category: string;
  prompt: string;
  solution: string;
};

export type EntryTicketHistoryItem = {
  index: number;
  learningGroupId: string;
  groupName: string;
  startedAt: string;
  completedAt: string;
  grade: string | null;
  setName: string;
  materialLessonPath: string | null;
  tasks: EntryTicketHistoryTask[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional: Historie nur dieser Lerngruppe */
  groupId?: string | null;
  /** Optional: Historie nur dieses Fragensets */
  customSetId?: string | null;
  /** Anzeigename des Sets (Dialogtitel) */
  setName?: string | null;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function lessonLabel(path: string | null): string | null {
  if (!path) return null;
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

function TaskPrompt({ prompt }: { prompt: string }) {
  if (entryTicketLooksLikeHtml(prompt)) {
    return (
      <Box
        component="span"
        sx={{
          display: 'block',
          fontSize: '0.86rem',
          lineHeight: 1.35,
          color: '#263238',
          '& img': { maxWidth: '100%', maxHeight: 120, borderRadius: 1 },
        }}
        dangerouslySetInnerHTML={{ __html: decorateEntryTicketDisplayHtml(prompt) }}
      />
    );
  }
  return (
    <Typography sx={{ fontSize: '0.86rem', lineHeight: 1.35, color: '#263238', whiteSpace: 'pre-wrap' }}>
      {entryTicketPlainText(prompt) || prompt}
    </Typography>
  );
}

/** Modal: erledigte Entry-Ticket-Durchläufe, optional nur für ein Fragenset. */
export function EntryTicketHistoryDialog({ open, onClose, groupId, customSetId, setName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<EntryTicketHistoryItem[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const qs = new URLSearchParams();
        if (groupId) qs.set('groupId', groupId);
        if (customSetId) qs.set('setId', customSetId);
        const url = qs.toString()
          ? `/api/entry-ticket/history?${qs.toString()}`
          : '/api/entry-ticket/history';
        const res = await apiGet(url);
        if (!res.ok) {
          if (!cancelled) setError('Historie konnte nicht geladen werden.');
          return;
        }
        const data = (await res.json()) as { items?: EntryTicketHistoryItem[] };
        if (!cancelled) setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!cancelled) setError('Historie konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, groupId, customSetId]);

  const title = setName?.trim() ? `Historie · ${setName.trim()}` : 'Historie';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: '#455a64', color: '#fff', py: 1.25 }}>
        {title}
        <DialogCloseIconButton
          onClose={onClose}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>
      <DialogContent sx={{ pt: 2, pb: 2 }}>
        <Typography sx={{ fontSize: '0.82rem', color: '#607d8b', mb: 1.5 }}>
          {customSetId
            ? 'Alle bisher mit diesem Fragenset gestellten Fragen — nummeriert in der Reihenfolge, in der die Tickets als erledigt markiert wurden (1 = zuerst).'
            : 'Alle bisher gestellten Fragen — nummeriert in der Reihenfolge, in der die Tickets als erledigt markiert wurden (1 = zuerst).'}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ fontSize: '0.9rem' }}>
            {error}
          </Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ fontSize: '0.9rem', color: '#78909c', py: 2 }}>
            Noch keine erledigten Entry Tickets
            {customSetId ? ' in diesem Fragenset' : ' in der Historie'}.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {items.map((item) => {
              const lesson = lessonLabel(item.materialLessonPath);
              const meta = [
                customSetId ? null : formatWhen(item.completedAt),
                !groupId ? item.groupName : null,
                lesson,
                `${item.tasks.length} Frage${item.tasks.length === 1 ? '' : 'n'}`,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Box
                  key={`${item.learningGroupId}-${item.completedAt}-${item.index}`}
                  sx={{
                    border: '1px solid #cfd8dc',
                    borderRadius: 1.5,
                    bgcolor: '#fff',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 1,
                      flexWrap: 'wrap',
                      px: 1.25,
                      py: 0.85,
                      bgcolor: '#eceff1',
                      borderBottom: '1px solid #cfd8dc',
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: '#37474f',
                        minWidth: 28,
                      }}
                    >
                      {item.index}.
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#263238' }}>
                      {customSetId ? formatWhen(item.completedAt) : item.setName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#607d8b' }}>{meta}</Typography>
                  </Box>
                  <Box component="ol" sx={{ m: 0, pl: 3.25, pr: 1.25, py: 1, listStyle: 'decimal' }}>
                    {item.tasks.map((t, ti) => (
                      <Box
                        component="li"
                        key={`${item.index}-${ti}`}
                        sx={{ mb: 0.85, pl: 0.25 }}
                      >
                        {t.category ? (
                          <Typography
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#78909c',
                              textTransform: 'uppercase',
                              letterSpacing: 0.3,
                              mb: 0.15,
                            }}
                          >
                            {t.category}
                          </Typography>
                        ) : null}
                        <TaskPrompt prompt={t.prompt} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
          <Button onClick={onClose} variant="contained" size="small" sx={{ bgcolor: '#546e7a' }}>
            Schließen
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default EntryTicketHistoryDialog;
