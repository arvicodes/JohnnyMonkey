import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Tooltip } from '@mui/material';
import { StudentExitTicketMyAnswersBadge } from './exit-ticket/StudentExitTicketMyAnswersBadge';

type PlanItem = {
  id: string;
  type: string;
  label: string;
  grade?: number;
  exitType?: string;
  linkedMaterialName?: string;
  linkedCollaborativeDeckId?: string;
  linkedCollaborativeDeckTitle?: string;
};

function fetchHeaders(): Record<string, string> {
  const loginCode = localStorage.getItem('loginCode')?.trim();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (loginCode) h['x-login-code'] = loginCode;
  return h;
}

function planChipStyle(type: string): { bg: string; border: string; text: string } {
  switch (type) {
    case 'entry-ticket':
      return { bg: '#e3f2fd', border: '#90caf9', text: '#1565c0' };
    case 'exit-ticket':
      return { bg: '#c8e6c9', border: '#388e3c', text: '#1b5e20' };
    case 'quiz':
      return { bg: '#ffebee', border: '#ef9a9a', text: '#c62828' };
    case 'leinwand':
      return { bg: '#e8f5e9', border: '#c8e6c9', text: '#2e7d32' };
    case 'tafel':
      return { bg: '#eceff1', border: '#b0bec5', text: '#37474f' };
    case 'input':
      return { bg: '#fff8e1', border: '#ffcc80', text: '#e65100' };
    case 'fortlaufend':
      return { bg: '#e0f7fa', border: '#4dd0e1', text: '#006064' };
    case 'karteikarten-erstellen':
      return { bg: '#f3e5f5', border: '#ba68c8', text: '#6a1b9a' };
    case 'karteikarten-gemeinsam-erstellen':
      return { bg: '#fff3e0', border: '#ffb74d', text: '#e65100' };
    case 'arbeitsauftrag':
      return { bg: '#e8eaf6', border: '#9fa8da', text: '#283593' };
    default:
      return { bg: '#f5f5f5', border: '#bdbdbd', text: '#424242' };
  }
}

function formatExtraLine(p: PlanItem): string | null {
  const parts: string[] = [];
  if (p.type === 'entry-ticket' && p.grade != null) parts.push(`Stufe ${p.grade}`);
  if (p.type === 'exit-ticket' && p.exitType) parts.push(String(p.exitType));
  if (p.type === 'arbeitsauftrag' && p.linkedMaterialName) parts.push(p.linkedMaterialName);
  if (p.type === 'karteikarten-gemeinsam-erstellen' && p.linkedCollaborativeDeckTitle) {
    parts.push(`Deck: ${p.linkedCollaborativeDeckTitle}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

/** Im Stunden-Modal: Tickets an die passenden Bausteine; Materialien unter dem ersten Input-Baustein. */
export type StudentLessonModalFlowActions = {
  userId: string;
  groupId: string;
  onEntryTicket: () => void;
  onExitTicket: () => void;
  exitTicketDisabled: boolean;
  exitTicketTooltip: string;
  /** Karteikarten-Modal: optional konkretes Deck; ohne Id nur Übersicht */
  onOpenFlashcardLearning?: (deckId?: string) => void;
  /** Gemeinsames Karteikarten-Deck (Live-Session) für diese Stunde */
  onOpenCollaborativeFlashcards?: () => void;
};

export type StudentLessonActivityLineProps = {
  groupId: string;
  lessonPath: string;
  modalFlowActions?: StudentLessonModalFlowActions;
  /** Gesamter Block „Materialien“ (Überschrift + Inhalt) — wird unter dem ersten Input-Schritt eingefügt, sonst unter dem Ablauf. */
  modalMaterialsSlot?: React.ReactNode;
};

/**
 * Zeigt die vom Lehrer festgelegte Reihenfolge der Unterrichtsbausteine („Lernlinie“) für eine Stunde.
 */
export const StudentLessonActivityLine: React.FC<StudentLessonActivityLineProps> = ({
  groupId,
  lessonPath,
  modalFlowActions,
  modalMaterialsSlot,
}) => {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<PlanItem[]>([]);
  const [groupFlashcardDecks, setGroupFlashcardDecks] = useState<Array<{ id: string; title: string }>>([]);
  const firstInputStepIndex = useMemo(() => steps.findIndex((s) => s.type === 'input'), [steps]);
  const needsGroupFlashcardDecks = useMemo(
    () => steps.some((s) => s.type === 'karteikarten-erstellen'),
    [steps]
  );

  useEffect(() => {
    if (!needsGroupFlashcardDecks || !groupId || !modalFlowActions?.onOpenFlashcardLearning) {
      setGroupFlashcardDecks([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/flashcards/assignments/group/${encodeURIComponent(groupId)}`, { headers: fetchHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { decks?: any[] } | null) => {
        if (cancelled || !data?.decks) return;
        setGroupFlashcardDecks(
          data.decks.map((d: any) => ({
            id: d.id,
            title: typeof d.title === 'string' ? d.title : 'Deck',
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setGroupFlashcardDecks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, needsGroupFlashcardDecks, modalFlowActions?.onOpenFlashcardLearning]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSteps([]);
    (async () => {
      try {
        const res = await fetch(
          `/api/lesson-instructions/by-group/${encodeURIComponent(groupId)}?lessonPath=${encodeURIComponent(lessonPath)}`,
          { headers: fetchHeaders() }
        );
        if (!res.ok || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = (await res.json()) as { content?: { lessonPlan?: unknown } };
        const raw = data.content?.lessonPlan;
        const list = Array.isArray(raw) ? raw : [];
        const parsed: PlanItem[] = list
          .filter((x: any) => x && typeof x.id === 'string' && typeof x.type === 'string')
          .map((x: any) => ({
            id: x.id,
            type: x.type,
            label: typeof x.label === 'string' ? x.label : x.type,
            grade: typeof x.grade === 'number' ? x.grade : undefined,
            exitType: typeof x.exitType === 'string' ? x.exitType : undefined,
            linkedMaterialName: typeof x.linkedMaterialName === 'string' ? x.linkedMaterialName : undefined,
            linkedCollaborativeDeckId:
              typeof x.linkedCollaborativeDeckId === 'string' ? x.linkedCollaborativeDeckId : undefined,
            linkedCollaborativeDeckTitle:
              typeof x.linkedCollaborativeDeckTitle === 'string' ? x.linkedCollaborativeDeckTitle : undefined,
          }));
        if (!cancelled) setSteps(parsed);
      } catch {
        if (!cancelled) setSteps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, lessonPath]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 0.5 }}>
        <CircularProgress size={16} thickness={5} />
        <Typography variant="caption" color="text.secondary">
          Ablauf wird geladen …
        </Typography>
      </Box>
    );
  }

  if (steps.length === 0) {
    if (modalFlowActions && modalMaterialsSlot) {
      return (
        <Box
          sx={{
            mb: 1.25,
            mt: 0.5,
            p: 1.25,
            borderRadius: 2,
            border: '1px solid #e3e8ef',
            background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 100%)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#475569',
              mb: 0.75,
              textTransform: 'uppercase',
              fontSize: '0.65rem',
            }}
          >
            Ablauf der Stunde
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
            Noch kein Ablauf hinterlegt — hier die Materialien:
          </Typography>
          {modalMaterialsSlot}
        </Box>
      );
    }
    return null;
  }

  return (
    <Box
      sx={{
        mb: 1.25,
        mt: 0.5,
        p: 1.25,
        borderRadius: 2,
        border: '1px solid #e3e8ef',
        background: 'linear-gradient(165deg, #f8fafc 0%, #f1f5f9 100%)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#475569',
          mb: 1,
          textTransform: 'uppercase',
          fontSize: '0.65rem',
        }}
      >
        Ablauf der Stunde
      </Typography>
      <Box sx={{ position: 'relative', pl: 2.25 }}>
        <Box
          sx={{
            position: 'absolute',
            left: 10,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 1,
            background: 'linear-gradient(180deg, #94a3b8 0%, #cbd5e1 50%, #94a3b8 100%)',
          }}
        />
        {steps.map((step, index) => {
          const st = planChipStyle(step.type);
          const extra = formatExtraLine(step);
          const flow = modalFlowActions;
          return (
            <Box
              key={step.id}
              sx={{
                position: 'relative',
                pb: index < steps.length - 1 ? 1.15 : 0,
                pl: 0.5,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: -19,
                  top: 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  bgcolor: '#fff',
                  border: `3px solid ${st.border}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  zIndex: 1,
                }}
              />
              <Box
                sx={{
                  display: 'inline-block',
                  px: 1,
                  py: 0.35,
                  borderRadius: 1,
                  bgcolor: st.bg,
                  border: `1px solid ${st.border}`,
                  mb: extra ? 0.35 : 0,
                }}
              >
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: st.text,
                    fontSize: '0.72rem',
                    lineHeight: 1.25,
                  }}
                >
                  {index + 1}. {step.label}
                </Typography>
              </Box>
              {extra ? (
                <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontSize: '0.65rem', pl: 0.25 }}>
                  {extra}
                </Typography>
              ) : null}
              {flow && step.type === 'entry-ticket' ? (
                <Box sx={{ mt: 0.45, pl: 0.25 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ py: 0.15, px: 0.75, fontSize: '0.65rem', minHeight: 26, lineHeight: 1.2 }}
                    onClick={flow.onEntryTicket}
                  >
                    Entry Ticket
                  </Button>
                </Box>
              ) : null}
              {flow && step.type === 'input' && index === firstInputStepIndex && modalMaterialsSlot ? (
                <Box
                  sx={{
                    mt: 1,
                    ml: -0.75,
                    mr: -0.5,
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: 'rgba(255, 248, 225, 0.45)',
                    border: '1px solid rgba(255, 204, 128, 0.7)',
                  }}
                >
                  {modalMaterialsSlot}
                </Box>
              ) : null}
              {flow && step.type === 'exit-ticket' ? (
                <Box sx={{ mt: 0.45, pl: 0.25, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
                  <Tooltip title={flow.exitTicketTooltip}>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        disabled={flow.exitTicketDisabled}
                        sx={{ py: 0.15, px: 0.75, fontSize: '0.65rem', minHeight: 26, lineHeight: 1.2 }}
                        onClick={flow.onExitTicket}
                      >
                        Exit Ticket
                      </Button>
                    </span>
                  </Tooltip>
                  <StudentExitTicketMyAnswersBadge groupId={flow.groupId} userId={flow.userId} />
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>
      {modalFlowActions && modalMaterialsSlot && firstInputStepIndex < 0 ? (
        <Box sx={{ mt: 1.25 }}>{modalMaterialsSlot}</Box>
      ) : null}
      {!modalFlowActions ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94a3b8', fontSize: '0.6rem' }}>
          Unten findest du die Materialien und Aufgaben zu dieser Stunde.
        </Typography>
      ) : modalMaterialsSlot && firstInputStepIndex >= 0 ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94a3b8', fontSize: '0.6rem' }}>
          Materialien stehen beim Baustein Input.
        </Typography>
      ) : modalMaterialsSlot ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#94a3b8', fontSize: '0.6rem' }}>
          Materialien siehst du direkt unter dem Ablauf.
        </Typography>
      ) : null}
    </Box>
  );
};
