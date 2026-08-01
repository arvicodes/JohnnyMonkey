import React, { useCallback, useEffect, useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate, useLocation } from 'react-router-dom';
import { DialogCloseIconButton } from './ui/dialog-close-icon-button';
import { apiGetSafe } from '../lib/api';
import { entryTicketHeroSrc } from '../lib/ticketHeroImages';
import { entryTicketBandFromGroupNames } from '../lib/entryTicketGrade';
import { MODERATOR_ICON_SRC } from '../lib/moderatorIcon';
import {
  StudentExitTicketRender,
  TEMPLATE_IMAGE_SRC as EXIT_TICKET_TEMPLATE_IMAGE_SRC,
  withTemplateDefaults,
  type ExitTicketSubmitMeta,
  type ExitTicketTemplate,
} from './exit-ticket/ExitTicketStudentForm';
import { ExitTicketCardHeaderImage } from './exit-ticket/ExitTicketCardHeaderImage';

const EXIT_TICKET_MODAL_DISMISS_KEY = 'exitTicketModalDismissedSig';
const EXIT_TICKET_MODAL_SESSION_CUTOFF_KEY = 'exitTicketModalSessionCutoffIso';

function getExitTicketModalSessionCutoffIso(): string {
  const existing = sessionStorage.getItem(EXIT_TICKET_MODAL_SESSION_CUTOFF_KEY);
  if (existing) return existing;
  const iso = new Date().toISOString();
  sessionStorage.setItem(EXIT_TICKET_MODAL_SESSION_CUTOFF_KEY, iso);
  return iso;
}

function exitTicketModalDismissSig(
  pubAt: string | null | undefined,
  tpl: Pick<ExitTicketTemplate, 'id' | 'title'> | null,
) {
  return `${pubAt ?? ''}|${tpl?.id ?? ''}|${tpl?.title ?? ''}`;
}

const ENTRY_TICKET_MODAL_DISMISS_KEY = 'entryTicketModalDismissedSig';
const ENTRY_TICKET_MAX_AGE_MS = 3 * 60 * 60 * 1000;
const ENTRY_TICKET_POLL_MS = 400;
const EXIT_TICKET_POLL_MS = 2500;

function entryTicketModalDismissSig(
  startedAt: string | null | undefined,
  teacherId: string | null | undefined,
  lessonPath: string | null | undefined,
) {
  return `${startedAt ?? ''}|${teacherId ?? ''}|${lessonPath ?? ''}`;
}

/**
 * Exit- und Entry-Ticket-Popups für Schüler: immer gemountet (App-Ebene), nicht nur auf /dashboard —
 * sonst fehlt Live-Feedback auf anderen Routen (Quiz, Entry-Ticket-Seite, …).
 */
export default function StudentLiveTicketAlerts({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [exitTicketModalOpen, setExitTicketModalOpen] = useState(false);
  const [exitTicketModalTemplate, setExitTicketModalTemplate] = useState<ExitTicketTemplate | null>(null);
  const [exitTicketModalPublishedAt, setExitTicketModalPublishedAt] = useState<string | null>(null);
  const [exitTicketModalSubmitMeta, setExitTicketModalSubmitMeta] = useState<ExitTicketSubmitMeta | null>(null);
  const [exitTicketHeroImageIndex, setExitTicketHeroImageIndex] = useState(0);

  const [entryTicketModalOpen, setEntryTicketModalOpen] = useState(false);
  const [entryTicketModalStartedAt, setEntryTicketModalStartedAt] = useState<string | null>(null);
  const [entryTicketModalTeacherId, setEntryTicketModalTeacherId] = useState<string | null>(null);
  const [entryTicketModalLessonPath, setEntryTicketModalLessonPath] = useState<string | null>(null);
  const [entryTicketHeroImageIndex, setEntryTicketHeroImageIndex] = useState(0);
  const [entryTicketIsModerator, setEntryTicketIsModerator] = useState(false);
  const [entryTicketGroupId, setEntryTicketGroupId] = useState<string | null>(null);
  const [entryTicketGroupName, setEntryTicketGroupName] = useState<string | null>(null);
  const [entryTicketGrade, setEntryTicketGrade] = useState<string | null>(null);
  const [entryTicketTaskSeed, setEntryTicketTaskSeed] = useState<number | null>(null);
  const [entryTicketMaterialLessonPath, setEntryTicketMaterialLessonPath] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getExitTicketModalSessionCutoffIso();
  }, [userId]);

  const pollExitTicketForModal = useCallback(async () => {
    if (!userId || !localStorage.getItem('loginCode')?.trim()) return;
    try {
      const res = await apiGetSafe('/api/exit-ticket/current');
      if (!res?.ok) return;
      const data = await res.json();
      const tpl = data.template;
      if (!tpl || typeof tpl !== 'object') return;

      const pubAt = typeof data.publishedAt === 'string' ? data.publishedAt.trim() : '';
      if (!pubAt) return;

      const cutoff = getExitTicketModalSessionCutoffIso();
      if (pubAt <= cutoff) return;

      const sig = exitTicketModalDismissSig(pubAt, tpl as ExitTicketTemplate);

      const dismissed = sessionStorage.getItem(EXIT_TICKET_MODAL_DISMISS_KEY);
      if (dismissed === sig) return;

      const normalized = withTemplateDefaults(tpl as ExitTicketTemplate);
      if (!normalized) return;

      const tid = typeof data.teacherId === 'string' ? data.teacherId : '';
      const lp = typeof data.lessonPath === 'string' ? data.lessonPath : '';
      if (tid && lp) setExitTicketModalSubmitMeta({ teacherId: tid, lessonPath: lp });
      else setExitTicketModalSubmitMeta(null);

      const exHi = data.heroImageIndex;
      setExitTicketHeroImageIndex(typeof exHi === 'number' ? exHi : 0);

      setExitTicketModalTemplate(normalized);
      setExitTicketModalPublishedAt(pubAt || null);
      setExitTicketModalOpen(true);
    } catch {
      // ignore
    }
  }, [userId]);

  const pollEntryTicketForModal = useCallback(async () => {
    if (!userId || !localStorage.getItem('loginCode')?.trim()) return;
    // Auf der Ticket-Seite kein Startbild-Popup
    if (location.pathname === '/entry-ticket') return;
    try {
      const res = await apiGetSafe('/api/entry-ticket/current');
      if (!res?.ok) return;
      const data = await res.json();
      const startedAt = typeof data.startedAt === 'string' ? data.startedAt : '';
      if (!startedAt) {
        /** Lehrer/Moderator hat „Erledigt“ markiert → Popup schließen, Dashboard wieder normal */
        setEntryTicketModalOpen(false);
        setEntryTicketModalStartedAt(null);
        setEntryTicketModalTeacherId(null);
        setEntryTicketModalLessonPath(null);
        try {
          sessionStorage.removeItem(ENTRY_TICKET_MODAL_DISMISS_KEY);
        } catch {
          /* ignore */
        }
        return;
      }

      const startedMs = new Date(startedAt).getTime();
      if (Number.isNaN(startedMs)) return;
      if (Date.now() - startedMs > ENTRY_TICKET_MAX_AGE_MS) return;

      const tid = typeof data.teacherId === 'string' ? data.teacherId : '';
      const lp = typeof data.lessonPath === 'string' ? data.lessonPath : '';
      const sig = entryTicketModalDismissSig(startedAt, tid || null, lp || null);
      const dismissed = sessionStorage.getItem(ENTRY_TICKET_MODAL_DISMISS_KEY);
      if (dismissed === sig) return;

      const hi = data.heroImageIndex;
      const heroIndex = typeof hi === 'number' ? hi : 0;

      setEntryTicketHeroImageIndex(heroIndex);
      setEntryTicketModalStartedAt(startedAt);
      setEntryTicketModalTeacherId(tid || null);
      setEntryTicketModalLessonPath(lp || null);
      setEntryTicketIsModerator(data.isModerator === true);
      setEntryTicketGroupId(
        typeof data.learningGroupId === 'string' && data.learningGroupId ? data.learningGroupId : null,
      );
      setEntryTicketGroupName(typeof data.groupName === 'string' ? data.groupName : null);
      setEntryTicketGrade(typeof data.grade === 'string' && data.grade ? data.grade : null);
      setEntryTicketTaskSeed(typeof data.taskSeed === 'number' ? data.taskSeed : null);
      setEntryTicketMaterialLessonPath(
        typeof data.materialLessonPath === 'string' && data.materialLessonPath
          ? data.materialLessonPath
          : null,
      );
      setEntryTicketModalOpen(true);
    } catch {
      // ignore
    }
  }, [userId, location.pathname]);

  const openFullEntryTicketAsModerator = () => {
    const sig = entryTicketModalDismissSig(
      entryTicketModalStartedAt,
      entryTicketModalTeacherId,
      entryTicketModalLessonPath,
    );
    sessionStorage.setItem(ENTRY_TICKET_MODAL_DISMISS_KEY, sig);
    setEntryTicketModalOpen(false);

    const band =
      entryTicketGrade ||
      String(entryTicketBandFromGroupNames(entryTicketGroupName ? [entryTicketGroupName] : []));
    const qs = new URLSearchParams();
    qs.set('grade', band);
    qs.set('autostart', '1');
    qs.set('r', String(Date.now()));
    qs.set('hero', String(entryTicketHeroImageIndex));
    if (entryTicketTaskSeed != null) qs.set('seed', String(entryTicketTaskSeed));
    if (entryTicketGroupId) qs.set('groupId', entryTicketGroupId);
    if (entryTicketMaterialLessonPath) qs.set('lessonPath', entryTicketMaterialLessonPath);
    navigate(`/entry-ticket?${qs.toString()}`);
  };

  useEffect(() => {
    if (!userId) return;
    const runExit = () => {
      void pollExitTicketForModal();
    };
    const runEntry = () => {
      void pollEntryTicketForModal();
    };
    const runBoth = () => {
      runExit();
      runEntry();
    };
    runBoth();
    const idExit = window.setInterval(runExit, EXIT_TICKET_POLL_MS);
    const idEntry = window.setInterval(runEntry, ENTRY_TICKET_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') runBoth();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(idExit);
      window.clearInterval(idEntry);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId, pollExitTicketForModal, pollEntryTicketForModal]);

  return (
    <>
      <Dialog
        open={exitTicketModalOpen && !!exitTicketModalTemplate}
        onClose={() => {
          setExitTicketModalOpen(false);
          sessionStorage.setItem(
            EXIT_TICKET_MODAL_DISMISS_KEY,
            exitTicketModalDismissSig(exitTicketModalPublishedAt, exitTicketModalTemplate),
          );
        }}
        maxWidth={false}
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            width: 'min(98vw, 1400px)',
            maxWidth: '1400px',
            height: 'min(96vh, 1120px)',
            maxHeight: '96vh',
            minHeight: { sm: 'min(88vh, 900px)' },
            display: 'flex',
            flexDirection: 'column',
            mt: { xs: 'max(8px, env(safe-area-inset-top, 0px))', sm: 1.5 },
            mx: { xs: 1, sm: 2 },
            mb: { xs: 1, sm: 2 },
            borderRadius: 2.5,
            overflow: 'hidden',
            boxShadow: '0 12px 48px rgba(15, 23, 42, 0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: { xs: 1.25, sm: 2 },
            pr: 2,
            pt: { xs: 2.75, sm: 2.25 },
            pb: 2.25,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.07) 0%, rgba(255,255,255,0.92) 100%)',
          }}
        >
          <ExitTicketCardHeaderImage templateId={exitTicketModalTemplate?.id} size={80} />
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75, pr: 1 }}>
            {exitTicketModalTemplate?.id === 'prediction' ? (
              <>
                <Typography
                  variant="h6"
                  component="span"
                  sx={{
                    lineHeight: 1.25,
                    fontWeight: 800,
                    fontSize: { xs: '1.15rem', sm: '1.28rem' },
                    color: 'text.primary',
                  }}
                >
                  {exitTicketModalTemplate.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.35 }}>
                  Exit Ticket
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" component="span" sx={{ lineHeight: 1.3, fontWeight: 800 }}>
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 700, mr: 0.75 }}>
                    ExitTicket:
                  </Box>
                  {exitTicketModalTemplate?.title ?? 'Exit Ticket'}
                </Typography>
                {exitTicketModalTemplate?.id === 'draw' ? (
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: 'primary.main',
                      letterSpacing: 0.2,
                      fontSize: { xs: '1rem', sm: '1.05rem' },
                      lineHeight: 1.35,
                    }}
                  >
                    Zeichne ein Bild zur Stunde
                  </Typography>
                ) : null}
              </>
            )}
          </Box>
          <DialogCloseIconButton
            onClose={() => {
              setExitTicketModalOpen(false);
              sessionStorage.setItem(
                EXIT_TICKET_MODAL_DISMISS_KEY,
                exitTicketModalDismissSig(exitTicketModalPublishedAt, exitTicketModalTemplate),
              );
            }}
            sx={{ position: 'static', transform: 'none', top: 'auto', right: 'auto', flexShrink: 0, mt: -0.25 }}
          />
        </DialogTitle>
        <DialogContent
          sx={{
            flex: '1 1 auto',
            overflow: 'auto',
            pt: { xs: 3, sm: 3.25 },
            pb: 3.5,
            px: { xs: 2.25, sm: 3.5 },
            background: 'linear-gradient(180deg, #e8eef8 0%, #f4f7fc 14%, #f8fafc 32%)',
          }}
        >
          {exitTicketModalTemplate && (
            <StudentExitTicketRender
              publishedTemplate={exitTicketModalTemplate}
              TEMPLATE_IMAGE_SRC={EXIT_TICKET_TEMPLATE_IMAGE_SRC}
              heroImageSrc={entryTicketHeroSrc(exitTicketHeroImageIndex)}
              submitMeta={exitTicketModalSubmitMeta}
              omitTitle
              onSubmitted={() => {
                sessionStorage.setItem(
                  EXIT_TICKET_MODAL_DISMISS_KEY,
                  exitTicketModalDismissSig(exitTicketModalPublishedAt, exitTicketModalTemplate),
                );
                setExitTicketModalOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={entryTicketModalOpen && !!entryTicketModalStartedAt}
        onClose={() => {
          setEntryTicketModalOpen(false);
          sessionStorage.setItem(
            ENTRY_TICKET_MODAL_DISMISS_KEY,
            entryTicketModalDismissSig(
              entryTicketModalStartedAt,
              entryTicketModalTeacherId,
              entryTicketModalLessonPath,
            ),
          );
        }}
        maxWidth={false}
        fullWidth
        scroll="paper"
        sx={{ zIndex: (t) => t.zIndex.modal + 2 }}
        PaperProps={{
          sx: {
            width: 'min(96vw, 720px)',
            maxWidth: 720,
            minHeight: 280,
            p: 0,
            m: 0,
            overflow: 'hidden',
            mt: { xs: 'max(12px, env(safe-area-inset-top, 0px))', sm: 2 },
            mx: { xs: 1, sm: 2 },
            mb: { xs: 1, sm: 2 },
            borderRadius: 2,
            boxShadow: entryTicketIsModerator
              ? '0 16px 48px rgba(198, 40, 40, 0.28)'
              : '0 16px 48px rgba(30, 136, 229, 0.22)',
            border: '1px solid',
            borderColor: entryTicketIsModerator ? 'rgba(198, 40, 40, 0.35)' : 'rgba(30, 136, 229, 0.2)',
            bgcolor: 'grey.100',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            minHeight: { xs: 220, sm: 260 },
            maxHeight: { xs: 'min(52vh, 400px)', sm: 'min(62vh, 520px)' },
            aspectRatio: '3 / 2',
            overflow: 'hidden',
            bgcolor: 'grey.300',
          }}
        >
          <Box
            component="img"
            src={entryTicketHeroSrc(entryTicketHeroImageIndex)}
            alt="Entry Ticket"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).onerror = null;
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          {entryTicketIsModerator && (
            <>
              <Box
                component="img"
                src={MODERATOR_ICON_SRC}
                alt="Moderator"
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  zIndex: 2,
                  width: { xs: 64, sm: 80 },
                  height: { xs: 64, sm: 80 },
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.4))',
                  pointerEvents: 'none',
                }}
              />
              <IconButton
                onClick={openFullEntryTicketAsModerator}
                aria-label="Entry Ticket starten"
                title="Entry Ticket starten"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  zIndex: 3,
                  transform: 'translate(-50%, -50%)',
                  width: { xs: 72, sm: 88 },
                  height: { xs: 72, sm: 88 },
                  bgcolor: 'rgba(198, 40, 40, 0.92)',
                  color: '#fff',
                  border: '3px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                  '&:hover': {
                    bgcolor: '#b71c1c',
                    transform: 'translate(-50%, -50%) scale(1.06)',
                  },
                }}
              >
                <PlayArrowIcon sx={{ fontSize: { xs: 42, sm: 52 } }} />
              </IconButton>
            </>
          )}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              pt: 8,
              pb: 2.5,
              px: 2.5,
              background: entryTicketIsModerator
                ? 'linear-gradient(to top, rgba(183,28,28,0.9) 0%, rgba(183,28,28,0.35) 55%, transparent 100%)'
                : 'linear-gradient(to top, rgba(13,71,161,0.88) 0%, rgba(13,71,161,0.35) 55%, transparent 100%)',
            }}
          >
            <Typography
              variant="h4"
              component="p"
              sx={{
                m: 0,
                color: '#fff',
                fontWeight: 800,
                letterSpacing: 0.3,
                textShadow: '0 2px 16px rgba(0,0,0,0.35)',
                fontSize: { xs: '1.65rem', sm: '2rem' },
              }}
            >
              Entry Ticket
              {entryTicketIsModerator ? ' · Moderator' : ''}
            </Typography>
          </Box>
          <DialogCloseIconButton
            onClose={() => {
              setEntryTicketModalOpen(false);
              sessionStorage.setItem(
                ENTRY_TICKET_MODAL_DISMISS_KEY,
                entryTicketModalDismissSig(
                  entryTicketModalStartedAt,
                  entryTicketModalTeacherId,
                  entryTicketModalLessonPath,
                ),
              );
            }}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 2,
              transform: 'none',
              bgcolor: 'rgba(255,255,255,0.92)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.98)' },
            }}
            iconSx={{ color: 'text.primary' }}
          />
        </Box>
      </Dialog>
    </>
  );
}
