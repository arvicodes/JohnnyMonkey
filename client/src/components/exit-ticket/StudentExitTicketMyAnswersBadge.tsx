import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { apiGetSafe } from '../../lib/api';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { renderWithBoldOperators } from './ExitTicketStudentForm';
import { ExitTicketCardHeaderImage } from './ExitTicketCardHeaderImage';

export type ExitTicketMySubmissionPayload = {
  template: { id?: string; title?: string; questions?: string[]; description?: string } | null;
  publishedAt: string | null;
  myResponse: {
    answers: string[];
    drawingDataUrl?: string;
    photoDataUrl?: string;
    completionOnly?: boolean;
    submittedAt: string;
  } | null;
  teacherName?: string;
  lessonPath?: string;
};

function formatDeTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return iso;
  }
}

async function fetchMySubmission(groupId: string): Promise<ExitTicketMySubmissionPayload | null> {
  const res = await apiGetSafe(`/api/exit-ticket/my-submission?groupId=${encodeURIComponent(groupId)}`);
  if (!res?.ok) return null;
  try {
    return (await res.json()) as ExitTicketMySubmissionPayload;
  } catch {
    return null;
  }
}

/**
 * Kleines rundes „E“ hinter einer Stundenzeile: Exit-Ticket dieser Lerngruppe (Abgabe oder Hinweis).
 */
export function StudentExitTicketMyAnswersBadge({ groupId, userId }: { groupId: string; userId: string }) {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<ExitTicketMySubmissionPayload | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [reloadSeq, setReloadSeq] = useState(0);

  const reload = useCallback(() => {
    setReloadSeq((s) => s + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPayload(undefined);
    void fetchMySubmission(groupId).then((data) => {
      if (!cancelled) setPayload(data);
    });
    return () => {
      cancelled = true;
    };
  }, [groupId, userId, reloadSeq]);

  useEffect(() => {
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent<{ groupId?: string }>).detail;
      if (d?.groupId && d.groupId !== groupId) return;
      reload();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('exit-ticket-my-submission-changed', onEvt);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('exit-ticket-my-submission-changed', onEvt);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [groupId, reload]);

  const hasTemplate = Boolean(payload?.template);
  const hasMine = Boolean(payload?.myResponse);
  const loadFailed = payload === null;
  const loading = payload === undefined;

  const tpl = payload?.template;
  const resp = payload?.myResponse;
  const filled = hasMine;
  const questions = filled && resp && tpl ? (Array.isArray(tpl.questions) ? tpl.questions : []) : [];
  const titleHint = loadFailed
    ? 'Exit Ticket — Status konnte nicht geladen werden'
    : filled
      ? 'Mein Exit Ticket (Abgabe für diese Lerngruppe)'
      : hasTemplate
        ? 'Exit Ticket — noch keine Abgabe (Klick für Details)'
        : 'Exit Ticket — für diese Klasse noch nicht freigegeben';

  if (loading) {
    return (
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          width: 20,
          height: 20,
          minWidth: 20,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          opacity: 0.45,
        }}
      />
    );
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={titleHint}
        sx={{
          flexShrink: 0,
          width: 20,
          height: 20,
          minWidth: 20,
          p: 0,
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '0.65rem',
          fontWeight: 900,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: filled ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease',
          fontFamily: 'inherit',
          ...(loadFailed
            ? {
                border: '1px dashed',
                borderColor: 'text.disabled',
                bgcolor: 'grey.100',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'grey.200' },
              }
            : filled
              ? {
                  border: 'none',
                  bgcolor: '#2e7d32',
                  color: '#fff',
                  '&:hover': {
                    transform: 'scale(1.08)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    bgcolor: '#1b5e20',
                  },
                }
              : {
                  border: '2px solid',
                  borderColor: '#43a047',
                  bgcolor: 'rgba(67, 160, 71, 0.12)',
                  color: '#1b5e20',
                  '&:hover': {
                    transform: 'scale(1.06)',
                    bgcolor: 'rgba(67, 160, 71, 0.22)',
                  },
                }),
        }}
      >
        E
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle
          sx={{
            ...dialogCloseTitleSx,
            pr: 5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <ExitTicketCardHeaderImage templateId={tpl?.id} size={64} />
          <Box sx={{ pr: 1, flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {loadFailed ? 'Exit Ticket' : filled ? 'Mein Exit Ticket' : 'Exit Ticket'}
            </Typography>
            {tpl?.title ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {tpl.title}
              </Typography>
            ) : null}
            {loadFailed ? (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Status konnte nicht geladen werden. Bitte kurz warten und erneut öffnen oder die Seite neu laden.
              </Typography>
            ) : filled && resp ? (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Abgabe: {formatDeTime(resp.submittedAt)}
              </Typography>
            ) : hasTemplate ? (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Für diese Klasse liegt noch keine gespeicherte Abgabe von dir vor.
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Für diese Lerngruppe ist aktuell kein Exit Ticket freigegeben.
              </Typography>
            )}
          </Box>
          <DialogCloseIconButton onClose={() => setOpen(false)} />
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f8fafc', pt: 2 }}>
          {loadFailed ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Die Verbindung zum Server hat nicht geklappt. Versuche es gleich noch einmal oder lade die Seite neu.
            </Typography>
          ) : !hasTemplate ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Sobald deine Lehrkraft ein Exit Ticket für diese Klasse freigibt, kannst du es auf der Exit-Ticket-Seite
              ausfüllen. Deine Antworten siehst du danach hier.
            </Typography>
          ) : !filled ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Sobald du das Exit Ticket ausfüllst und absendest, erscheinen deine Antworten hier dauerhaft. Du kannst die
              Abgabe auch über die Startseite öffnen.
            </Typography>
          ) : null}

          {tpl?.description?.trim() ? (
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {renderWithBoldOperators(tpl.description, 'my-et-desc')}
            </Typography>
          ) : null}

          {filled && resp ? (
            <>
              {resp.completionOnly &&
              !resp.drawingDataUrl &&
              !resp.photoDataUrl &&
              !(resp.answers || []).some((a) => String(a).trim()) ? (
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                  Du hast das Exit Ticket als erledigt markiert (ohne Text).
                </Typography>
              ) : null}

              {questions.map((q, qi) => {
                const text = String(resp.answers?.[qi] ?? '').trim();
                if (!text) return null;
                return (
                  <Box
                    key={`my-et-q-${qi}`}
                    sx={{
                      mb: 1.75,
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: '#fff',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: '4px solid',
                      borderLeftColor: 'primary.main',
                    }}
                  >
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, lineHeight: 1.45 }}>
                      {renderWithBoldOperators(q, `my-et-qtext-${qi}`)}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {text}
                    </Typography>
                  </Box>
                );
              })}

              {resp.drawingDataUrl ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.75, color: 'secondary.dark' }}>
                    Zeichnung
                  </Typography>
                  <Box
                    component="img"
                    src={resp.drawingDataUrl}
                    alt=""
                    sx={{ maxWidth: '100%', height: 'auto', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  />
                </Box>
              ) : null}

              {resp.photoDataUrl ? (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.75, color: 'success.dark' }}>
                    Foto
                  </Typography>
                  <Box
                    component="img"
                    src={resp.photoDataUrl}
                    alt=""
                    sx={{ maxWidth: '100%', height: 'auto', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                  />
                </Box>
              ) : null}
            </>
          ) : null}
        </DialogContent>
        {hasTemplate && !filled && !loadFailed ? (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="contained" color="success" onClick={() => navigate('/exit-ticket')}>
              Zum Exit Ticket
            </Button>
          </DialogActions>
        ) : null}
      </Dialog>
    </>
  );
}
