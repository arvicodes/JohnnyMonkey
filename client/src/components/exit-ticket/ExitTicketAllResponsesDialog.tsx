import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { apiGet } from '../../lib/api';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { renderWithBoldOperators } from './ExitTicketStudentForm';
import { ExitTicketCardHeaderImage } from './ExitTicketCardHeaderImage';
import { entryTicketHeroSrc } from '../../lib/ticketHeroImages';

const HEADER_TINT_PRIMARY = 'rgba(25, 118, 210, 0.08)';

/** Zyklische Hintergründe für SuS-Antworten — Gelb-/Orangetöne, gut unterscheidbar. */
const ANSWER_CELL_TINTS = [
  'rgba(255, 213, 79, 0.42)',
  'rgba(255, 183, 77, 0.38)',
  'rgba(255, 236, 179, 0.65)',
  'rgba(255, 171, 64, 0.35)',
  'rgba(255, 224, 130, 0.5)',
  'rgba(255, 152, 0, 0.28)',
] as const;

export type ExitTicketResponseRow = {
  studentId: string;
  studentName: string;
  answers: string[];
  drawingDataUrl?: string;
  photoDataUrl?: string;
  completionOnly?: boolean;
  submittedAt: string;
};

type ApiPayload = {
  template: { id?: string; title?: string; questions?: string[] } | null;
  responses: ExitTicketResponseRow[];
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

function HoverNameTip(props: { name: string; time: string; children: React.ReactElement }) {
  const { name, time, children } = props;
  return (
    <Tooltip
      placement="top"
      enterDelay={200}
      componentsProps={{
        tooltip: { sx: { maxWidth: 320 } },
      }}
      title={
        <Box sx={{ py: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {name || 'Schüler/in'}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.92 }}>
            {time}
          </Typography>
        </Box>
      }
    >
      {children}
    </Tooltip>
  );
}

export function ExitTicketAllResponsesDialog(props: {
  open: boolean;
  onClose: () => void;
  lessonPathFilter: string | null;
  /** Gleiches Naturmotiv wie Entry-/Exit-Ticket (rechts) */
  heroImageIndex?: number;
}) {
  const { open, onClose, lessonPathFilter, heroImageIndex = 0 } = props;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExitTicketResponseRow[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [title, setTitle] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const q = lessonPathFilter ? `?lessonPath=${encodeURIComponent(lessonPathFilter)}` : '';
      const res = await apiGet(`/api/exit-ticket/responses${q}`);
      if (!res.ok) {
        let detail = `Server antwortet mit ${res.status}.`;
        try {
          const errBody = (await res.json()) as { error?: string };
          if (typeof errBody?.error === 'string' && errBody.error.trim()) {
            detail = errBody.error.trim();
          }
        } catch {
          /* Antwort war kein JSON */
        }
        throw new Error(detail);
      }
      const data = (await res.json()) as ApiPayload;
      setRows(Array.isArray(data.responses) ? data.responses : []);
      const qs = data.template?.questions;
      setQuestions(Array.isArray(qs) ? qs : []);
      setTitle(typeof data.template?.title === 'string' ? data.template.title : '');
      setTemplateId(typeof data.template?.id === 'string' ? data.template.id : '');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, [lessonPathFilter]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load();
    const id = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(id);
  }, [open, load]);

  const perQuestionBlocks = useMemo(() => {
    if (!questions.length) return [];
    return questions.map((qText, qi) => {
      const entries = rows
        .map((r) => ({
          key: `${r.studentId}-${r.submittedAt}-q${qi}`,
          name: r.studentName || 'Schüler/in',
          time: formatDeTime(r.submittedAt),
          text: String(r.answers?.[qi] ?? '').trim(),
        }))
        .filter((e) => e.text.length > 0);
      return { index: qi, qText, entries };
    });
  }, [rows, questions]);

  const drawingEntries = useMemo(
    () =>
      rows
        .filter((r) => r.drawingDataUrl)
        .map((r) => ({
          key: `${r.studentId}-draw-${r.submittedAt}`,
          name: r.studentName || 'Schüler/in',
          time: formatDeTime(r.submittedAt),
          src: r.drawingDataUrl as string,
        })),
    [rows]
  );

  const photoEntries = useMemo(
    () =>
      rows
        .filter((r) => r.photoDataUrl)
        .map((r) => ({
          key: `${r.studentId}-photo-${r.submittedAt}`,
          name: r.studentName || 'Schüler/in',
          time: formatDeTime(r.submittedAt),
          src: r.photoDataUrl as string,
        })),
    [rows]
  );

  const completionOnlyRows = useMemo(
    () =>
      rows.filter((r) => {
        if (!r.completionOnly) return false;
        const hasText = r.answers?.some((a) => String(a).trim().length > 0);
        if (hasText) return false;
        if (r.drawingDataUrl || r.photoDataUrl) return false;
        return true;
      }),
    [rows]
  );

  const hasAnyContent =
    perQuestionBlocks.some((b) => b.entries.length > 0) ||
    drawingEntries.length > 0 ||
    photoEntries.length > 0 ||
    completionOnlyRows.length > 0;

  const isDrawTemplate = templateId === 'draw';
  const isPredictionTemplate = templateId === 'prediction';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          width: 'min(99vw, 1880px)',
          maxWidth: '1880px',
          height: 'min(97vh, 1180px)',
          maxHeight: '97vh',
          minHeight: { sm: 'min(90vh, 960px)' },
          m: { xs: 0.75, sm: 1.5 },
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2.5,
          overflow: 'hidden',
          boxShadow: '0 16px 56px rgba(15, 23, 42, 0.14)',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          display: 'flex',
          alignItems: 'flex-start',
          gap: { xs: 1.25, sm: 2 },
          pr: 5,
          pt: { xs: 2.5, sm: 2.25 },
          pb: 2.25,
          flexShrink: 0,
          background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.09) 0%, rgba(255,255,255,0.95) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <ExitTicketCardHeaderImage templateId={templateId || null} size={80} />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.85, pr: 1 }}>
          {isPredictionTemplate && title ? (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                lineHeight: 1.25,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          ) : null}
          {isDrawTemplate ? (
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                letterSpacing: 0.15,
                fontSize: { xs: '1rem', sm: '1.05rem' },
                lineHeight: 1.35,
              }}
            >
              Zeichne ein Bild zur Stunde
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: 104, sm: 160, md: 200 },
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
            aspectRatio: '16 / 10',
            alignSelf: 'flex-start',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
          }}
        >
          <Box
            component="img"
            src={entryTicketHeroSrc(heroImageIndex)}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
        <DialogCloseIconButton onClose={onClose} sx={{ flexShrink: 0, mt: -0.25 }} />
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          flex: '1 1 auto',
          overflow: 'auto',
          pt: 2.5,
          pb: 3.5,
          px: { xs: 2, sm: 3.25 },
          background: 'linear-gradient(180deg, #e4eaf6 0%, #eef2f9 12%, #f5f7fb 100%)',
        }}
      >
        {title && !isPredictionTemplate ? (
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.75, color: 'primary.dark', fontSize: '1.05rem' }}>
            {title}
          </Typography>
        ) : null}
        {loading && rows.length === 0 ? (
          <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : !hasAnyContent ? (
          <Typography variant="body2" color="text.secondary">
            Noch keine Abgaben.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.25, sm: 2.75 } }}>
            {perQuestionBlocks
              .filter((block) => block.entries.length > 0)
              .map((block) => (
                  <Paper
                    key={`q-block-${block.index}`}
                    elevation={0}
                    sx={{
                      overflow: 'hidden',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: '6px solid',
                      borderLeftColor: 'primary.main',
                      bgcolor: '#fff',
                      boxShadow: '0 6px 28px rgba(25, 118, 210, 0.1), 0 2px 10px rgba(15, 23, 42, 0.05)',
                    }}
                  >
                    <Box
                      sx={{
                        px: { xs: 2, sm: 2.5 },
                        py: { xs: 1.75, sm: 2.25 },
                        bgcolor: HEADER_TINT_PRIMARY,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 600,
                          lineHeight: 1.5,
                          fontSize: { xs: '1.12rem', sm: '1.28rem' },
                        }}
                      >
                        {renderWithBoldOperators(block.qText, `all-q-${block.index}`)}
                      </Typography>
                    </Box>
                    <Box sx={{ p: { xs: 0.85, sm: 1.1 }, bgcolor: 'rgba(255, 248, 225, 0.35)' }}>
                      <Grid container spacing={0.65}>
                        {block.entries.map((e, ei) => (
                          <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={e.key}>
                            <HoverNameTip name={e.name} time={e.time}>
                              <Box
                                component="article"
                                sx={{
                                  p: 0.45,
                                  borderRadius: 0.75,
                                  bgcolor: ANSWER_CELL_TINTS[ei % ANSWER_CELL_TINTS.length],
                                  border: '1px solid',
                                  borderColor: 'rgba(230, 162, 50, 0.35)',
                                  cursor: 'default',
                                  transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                                  '&:hover': {
                                    boxShadow: 2,
                                    borderColor: 'rgba(245, 124, 0, 0.55)',
                                  },
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: { xs: '0.76rem', sm: '0.8rem' },
                                    lineHeight: 1.4,
                                    color: 'rgba(62, 39, 35, 0.92)',
                                  }}
                                >
                                  {e.text}
                                </Typography>
                              </Box>
                            </HoverNameTip>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Paper>
              ))}

            {drawingEntries.length > 0 ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: '6px solid',
                  borderLeftColor: 'secondary.main',
                  bgcolor: '#fff',
                  overflow: 'hidden',
                  boxShadow: '0 6px 28px rgba(156, 39, 176, 0.1)',
                }}
              >
                <Box
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: { xs: 1.5, sm: 2 },
                    bgcolor: 'rgba(156, 39, 176, 0.07)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'secondary.dark', fontWeight: 800, fontSize: '0.72rem', letterSpacing: 0.8, display: 'block', mb: 0.5 }}>
                    Zeichnungen
                  </Typography>
                  {isDrawTemplate ? (
                    <Typography variant="body2" sx={{ color: 'secondary.dark', fontWeight: 600, fontSize: '0.95rem' }}>
                      Zeichne ein Bild zur Stunde — Abgaben der SuS
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ p: { xs: 1.25, sm: 1.75 } }}>
                  <Grid container spacing={1.25}>
                    {drawingEntries.map((e) => (
                      <Grid item xs={12} sm={6} md={4} lg={4} key={e.key}>
                        <HoverNameTip name={e.name} time={e.time}>
                          <Box
                            sx={{
                              borderRadius: 0.75,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: '#fafafa',
                              lineHeight: 0,
                              '&:hover': { boxShadow: 2 },
                            }}
                          >
                            <Box
                              component="img"
                              src={e.src}
                              alt=""
                              sx={{ width: '100%', height: 'auto', maxHeight: 280, objectFit: 'contain', display: 'block' }}
                            />
                          </Box>
                        </HoverNameTip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            ) : null}

            {photoEntries.length > 0 ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: '6px solid',
                  borderLeftColor: 'success.main',
                  bgcolor: '#fff',
                  overflow: 'hidden',
                  boxShadow: '0 6px 28px rgba(46, 125, 50, 0.08)',
                }}
              >
                <Box sx={{ px: { xs: 2, sm: 2.5 }, py: { xs: 1.5, sm: 1.75 }, bgcolor: 'rgba(46, 125, 50, 0.07)', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="overline" sx={{ color: 'success.dark', fontWeight: 800, fontSize: '0.72rem', letterSpacing: 0.8 }}>
                    Fotos
                  </Typography>
                </Box>
                <Box sx={{ p: { xs: 1.25, sm: 1.75 } }}>
                  <Grid container spacing={1.25}>
                    {photoEntries.map((e) => (
                      <Grid item xs={12} sm={6} md={4} lg={4} key={e.key}>
                        <HoverNameTip name={e.name} time={e.time}>
                          <Box
                            sx={{
                              borderRadius: 0.75,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: '#fafafa',
                              lineHeight: 0,
                              '&:hover': { boxShadow: 2 },
                            }}
                          >
                            <Box
                              component="img"
                              src={e.src}
                              alt=""
                              sx={{ width: '100%', height: 'auto', maxHeight: 280, objectFit: 'contain', display: 'block' }}
                            />
                          </Box>
                        </HoverNameTip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Paper>
            ) : null}

            {completionOnlyRows.length > 0 ? (
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                  p: { xs: 1.5, sm: 2 },
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 0.75, fontSize: '0.68rem' }}>
                  Ohne Text (nur durchgegangen)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {completionOnlyRows.map((r) => (
                    <HoverNameTip key={`${r.studentId}-${r.submittedAt}`} name={r.studentName || 'Schüler/in'} time={formatDeTime(r.submittedAt)}>
                      <Box component="span" sx={{ display: 'inline-flex' }}>
                        <Chip
                          size="small"
                          variant="outlined"
                          label="✓"
                          sx={{ height: 22, fontSize: '0.7rem', cursor: 'default', '&:hover': { bgcolor: 'action.hover' } }}
                        />
                      </Box>
                    </HoverNameTip>
                  ))}
                </Box>
              </Paper>
            ) : null}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
