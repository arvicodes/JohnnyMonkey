import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, ButtonGroup, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { apiDelete, apiGetSafe } from '../../lib/api';

export const ENTRY_TICKET_BOX_BG = '#e8f3fc';
export const ENTRY_TICKET_BOX_BORDER = '#90caf9';
export const ENTRY_TICKET_TEXT_COLOR = '#1565c0';

export type EntryTicketCompletedListItem = {
  index: number;
  startedAt: string;
  completedAt: string;
  grade: string | null;
  customSetId: string | null;
  setName: string;
  reihePath: string | null;
  materialLessonPath: string | null;
  taskCount: number;
};

type Props = {
  groupId: string;
  /** Lehrkraft: einzelne Tickets per × entfernen (für alle unsichtbar). */
  editable?: boolean;
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

function openCompletedTicket(groupId: string, item: EntryTicketCompletedListItem) {
  const u = new URL('/entry-ticket', window.location.origin);
  u.searchParams.set('review', '1');
  u.searchParams.set('groupId', groupId);
  u.searchParams.set('index', String(item.index));
  u.searchParams.set('returnTo', `${window.location.pathname}${window.location.search}`);
  window.location.assign(u.pathname + u.search);
}

/** Blauer Kasten: erledigte Entry Tickets als kompakte nummerierte Buttons (1, 2, …). */
export default function EntryTicketCompletedRow({ groupId, editable = false }: Props) {
  const [items, setItems] = useState<EntryTicketCompletedListItem[]>([]);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!groupId || groupId.startsWith('__')) {
      setItems([]);
      return;
    }
    try {
      const res = await apiGetSafe(`/api/entry-ticket/completed-list?groupId=${encodeURIComponent(groupId)}`);
      if (!res || !res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { items?: EntryTicketCompletedListItem[] };
      const next = Array.isArray(data.items) ? data.items : [];
      next.sort((a, b) => a.index - b.index);
      setItems(next);
    } catch {
      setItems([]);
    }
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    const t = setInterval(() => {
      if (!cancelled) void load();
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [load]);

  const removeItem = async (item: EntryTicketCompletedListItem) => {
    const label = item.setName || 'Entry Ticket';
    const when = formatWhen(item.completedAt);
    if (
      !window.confirm(
        `Entry Ticket ${item.index} (${label}, ${when}) wirklich entfernen?\n\nEs verschwindet dann für alle Schülerinnen und Schüler.`,
      )
    ) {
      return;
    }
    setBusyIndex(item.index);
    try {
      const qs = new URLSearchParams({
        groupId,
        index: String(item.index),
      });
      const res = await apiDelete(`/api/entry-ticket/completed?${qs.toString()}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(err.error || 'Entry Ticket konnte nicht entfernt werden.');
        return;
      }
      const data = (await res.json()) as { items?: EntryTicketCompletedListItem[] };
      const next = Array.isArray(data.items) ? data.items : [];
      next.sort((a, b) => a.index - b.index);
      setItems(next);
    } catch {
      window.alert('Entry Ticket konnte nicht entfernt werden.');
    } finally {
      setBusyIndex(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 0.75,
        width: '100%',
        minWidth: 0,
        border: `1px solid ${ENTRY_TICKET_BOX_BORDER}`,
        borderRadius: 1.25,
        bgcolor: ENTRY_TICKET_BOX_BG,
        px: 0.75,
        py: 0.4,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0.65,
      }}
    >
      <Typography
        component="div"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: ENTRY_TICKET_TEXT_COLOR,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Entry Tickets
      </Typography>
      <ButtonGroup
        variant="outlined"
        size="small"
        aria-label="Erledigte Entry Tickets"
        sx={{
          minWidth: 0,
          flexWrap: 'wrap',
          '& .MuiButtonGroup-grouped': {
            minWidth: 22,
            width: 'auto',
            height: 22,
            px: '6px',
            py: 0,
            position: 'relative',
            borderColor: '#90caf9',
            color: ENTRY_TICKET_TEXT_COLOR,
            bgcolor: '#fff',
            fontWeight: 800,
            fontSize: '0.68rem',
            lineHeight: 1,
            textTransform: 'none',
            '&:hover': { bgcolor: '#bbdefb', borderColor: '#64b5f6' },
          },
        }}
      >
        {items.map((item) => {
          const title = [
            `${item.index}. ${item.setName || 'Entry Ticket'}`,
            formatWhen(item.completedAt),
            lessonLabel(item.materialLessonPath),
            item.taskCount ? `${item.taskCount} Frage${item.taskCount === 1 ? '' : 'n'}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Button
              key={`${item.index}-${item.completedAt}`}
              title={title}
              onClick={() => openCompletedTicket(groupId, item)}
              aria-label={`Entry Ticket ${item.index} ansehen`}
            >
              {item.index}
              {editable ? (
                <IconButton
                  size="small"
                  disabled={busyIndex === item.index}
                  aria-label={`Entry Ticket ${item.index} entfernen`}
                  title="Entfernen"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void removeItem(item);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 7,
                    height: 7,
                    minWidth: 7,
                    minHeight: 7,
                    p: 0,
                    bgcolor: '#c62828',
                    color: '#fff',
                    borderRadius: '0 2px 0 2px',
                    '&:hover': { bgcolor: '#b71c1c' },
                    '&.Mui-disabled': { bgcolor: '#ef9a9a', color: '#fff' },
                    '& .MuiSvgIcon-root': { fontSize: 6 },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              ) : null}
            </Button>
          );
        })}
      </ButtonGroup>
    </Box>
  );
}
