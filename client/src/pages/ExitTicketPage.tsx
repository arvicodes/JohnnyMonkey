import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  ButtonBase,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  EditNote as EditNoteIcon,
  PhotoCamera as PhotoCameraIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import { apiGet, apiPost } from '../lib/api';
import { DialogCloseIconButton } from '../components/ui/dialog-close-icon-button';
import {
  StudentExitTicketRender,
  EXIT_TICKET_CARD_IMAGE_SRC,
  TEMPLATE_IMAGE_SRC,
  renderWithBoldOperators,
  withTemplateDefaults,
  type ExitTicketSubmitMeta,
  type ExitTicketTemplate,
  type ExitTicketTemplateType,
  type ExitTicketResponseMode,
} from '../components/exit-ticket/ExitTicketStudentForm';
import { ExitTicketAllResponsesDialog } from '../components/exit-ticket/ExitTicketAllResponsesDialog';
import { ExitTicketCardHeaderImage } from '../components/exit-ticket/ExitTicketCardHeaderImage';
import { entryTicketHeroSrc } from '../lib/ticketHeroImages';

const EXIT_TICKET_STORAGE_KEY = 'activeExitTicketTemplateV1';

const FEEDBACK_TEMPLATE: ExitTicketTemplate = {
  id: 'feedback',
  title: '3-Fragen-Feedback',
  description: '',
  responseMode: 'questions-only',
  questions: [
    'Was ist das Wichtigste, das du aus der heutigen Stunde mitnimmst?',
    'Was war heute neu oder besonders interessant für dich?',
    'Welche Frage ist bei dir noch offen?',
  ],
};

const buildQuickCheckTemplate = (topic: string): ExitTicketTemplate => {
  const cleanedTopic = topic.trim() || 'dem heutigen Thema';
  return {
    id: 'quick-check',
    title: '3 kurze Fragen zum Thema',
    description: '',
    responseMode: 'questions-only',
    questions: [
      `Erkläre in 1-2 Sätzen die Kernidee von ${cleanedTopic}.`,
      `Nenne zwei wichtige Begriffe aus ${cleanedTopic} und erkläre sie kurz.`,
      `Gib ein kurzes Beispiel zu ${cleanedTopic} aus Alltag oder Unterricht.`,
    ],
  };
};

const TRANSFER_TEMPLATE: ExitTicketTemplate = {
  id: 'transfer',
  title: 'Transferaufgabe',
  description: '',
  responseMode: 'questions-only',
  questions: [
    'Beschreibe eine reale Situation, in der das heutige Thema vorkommt.',
    'Erkläre, wie du das Gelernte auf diese Situation anwendest.',
    'Formuliere zum Schluss einen kurzen Merksatz.',
  ],
};

const DRAW_TEMPLATE: ExitTicketTemplate = {
  id: 'draw',
  title: 'Zeichne ein Bild zur Stunde',
  description: '',
  responseMode: 'questions-only',
  questions: [
    'Zeichne ein Bild, das deine wichtigste Idee aus der Stunde zeigt.',
    'Beschrifte mindestens 1 Teil deiner Zeichnung.',
    'Schreibe 1 Satz dazu: „Das bedeutet für mich …“',
  ],
};

const ERROR_HUNT_TEMPLATE: ExitTicketTemplate = {
  id: 'error-hunt',
  title: 'Fehler-Fahndung',
  description: '',
  responseMode: 'questions-only',
  questions: [
    'Finde einen typischen Fehler zum heutigen Thema.',
    'Korrigiere den Fehler und erkläre kurz, warum er falsch ist.',
    'Formuliere eine Merkhilfe, damit der Fehler nicht noch einmal passiert.',
  ],
};

const EXAM_QUESTION_TEMPLATE: ExitTicketTemplate = {
  id: 'exam-question',
  title: 'Prüfungsfrage bauen',
  description: '',
  responseMode: 'questions-only',
  questions: [
    'Erstelle eine sinnvolle Prüfungsfrage zum heutigen Thema.',
    'Gib eine kurze Musterlösung dazu an.',
    'Begründe in 1 Satz, warum diese Frage wichtig ist.',
  ],
};

const PREDICTION_TEMPLATE: ExitTicketTemplate = {
  id: 'prediction',
  title: 'Vorhersage fürs nächste Mal',
  description: '',
  responseMode: 'questions-only',
  questions: [
    'Schätze: Was wird in der nächsten Stunde wahrscheinlich behandelt?',
    'Begründe deine Vorhersage mit Bezug zur heutigen Stunde.',
    'Formuliere eine Frage, die du in der nächsten Stunde klären willst.',
  ],
};

const parseStoredTemplate = (): ExitTicketTemplate | null => {
  const raw = localStorage.getItem(EXIT_TICKET_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExitTicketTemplate;
    if (!parsed || !parsed.id || !parsed.title || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const ALLOWED_EXIT_TICKET_TEMPLATE_PARAMS: ExitTicketTemplateType[] = [
  'feedback',
  'quick-check',
  'transfer',
  'draw',
  'error-hunt',
  'exam-question',
  'prediction',
];

function getExitTicketTemplateFromSearch(search: string): ExitTicketTemplateType | null {
  const params = new URLSearchParams(search);
  const template = params.get('template');
  if (!template || !ALLOWED_EXIT_TICKET_TEMPLATE_PARAMS.includes(template as ExitTicketTemplateType)) {
    return null;
  }
  return template as ExitTicketTemplateType;
}

const EXIT_TICKET_LEGACY_LESSON_PATH = '__exit_ticket_active__';

/** Optional: Exit-Ticket-Zeile (Gruppe oder Legacy), für gefilterte Lehrer-Antwortliste */
function parseExitTicketLessonPathFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const lp = params.get('lessonPath');
  if (!lp) return null;
  if (lp === EXIT_TICKET_LEGACY_LESSON_PATH) return lp;
  if (lp.startsWith('__exit_ticket_g_') && lp.endsWith('__') && lp.length > 20) return lp;
  return null;
}

/** Nur gleiche Origin + /teacher/stunde mit groupId & lessonPath (Open-Redirect vermeiden) */
function parseSafeStundeReturnTo(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('returnTo');
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname !== '/teacher/stunde') return null;
    const gid = url.searchParams.get('groupId');
    const lp = url.searchParams.get('lessonPath');
    if (!gid?.trim() || !lp?.trim()) return null;
    const pm = url.searchParams.get('planMode');
    if (pm !== null && pm !== 'create' && pm !== 'run' && pm !== 'background') {
      url.searchParams.delete('planMode');
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export default function ExitTicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const safeStundeReturnTo = useMemo(() => parseSafeStundeReturnTo(location.search), [location.search]);
  const exitTicketLessonPathFilter = useMemo(() => parseExitTicketLessonPathFromSearch(location.search), [location.search]);
  /** Karten-Markierung + Button auch ohne vorherigen Klick, wenn ?template= in der URL steht */
  const templateFromUrlForCard = useMemo(
    () => getExitTicketTemplateFromSearch(location.search),
    [location.search]
  );
  const isTeacher = useMemo(() => Boolean(localStorage.getItem('teacherId')), []);
  /** Kein Default „feedback“ — erst nach Klick auf eine Karte oder ?template= in der URL */
  const [selectedType, setSelectedType] = useState<ExitTicketTemplateType | null>(null);
  const activeExitTicketCardId = useMemo(
    () => selectedType ?? templateFromUrlForCard,
    [selectedType, templateFromUrlForCard]
  );
  const [selectedResponseMode, setSelectedResponseMode] = useState<ExitTicketResponseMode>('questions-only');
  const [quickCheckTopic, setQuickCheckTopic] = useState('');
  /** SuS: kein localStorage — sonst wirkt „3-Fragen-Feedback“ aus Lehrer-Cache/Altstand */
  const [publishedTemplate, setPublishedTemplate] = useState<ExitTicketTemplate | null>(null);
  const [exitTicketSubmitMeta, setExitTicketSubmitMeta] = useState<ExitTicketSubmitMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [draftTemplateType, setDraftTemplateType] = useState<ExitTicketTemplateType>('exam-question');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftResponseMode, setDraftResponseMode] = useState<ExitTicketResponseMode>('questions-only');
  const [draftAnswers, setDraftAnswers] = useState<string[]>([]);
  const [draftPhotoDataUrl, setDraftPhotoDataUrl] = useState<string>('');
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Verhindert mehrfaches Auto-Öffnen bei gleichem ?template= solange die URL gleich bleibt */
  const lastAutoOpenedTemplateFromUrlRef = useRef<ExitTicketTemplateType | null>(null);
  const [allResponsesOpen, setAllResponsesOpen] = useState(false);
  /** Gleicher Index wie Entry-Ticket (API heroImageIndex) */
  const [exitHeroImageIndex, setExitHeroImageIndex] = useState(0);

  /** „Vorhersage …“ oben in der Seitenleiste statt nur „ExitTicket“, wenn diese Vorlage aktiv ist */
  const exitTicketPageHeaderTitle = useMemo(() => {
    if (activeExitTicketCardId === 'prediction') return PREDICTION_TEMPLATE.title;
    if (!isTeacher && publishedTemplate?.id === 'prediction' && publishedTemplate.title) return publishedTemplate.title;
    return 'ExitTicket';
  }, [activeExitTicketCardId, isTeacher, publishedTemplate]);

  const loadCurrentTemplate = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiGet('/api/exit-ticket/current');
      if (!response.ok) throw new Error('Laden fehlgeschlagen');
      const data = await response.json();

      if (typeof data?.heroImageIndex === 'number') {
        setExitHeroImageIndex(data.heroImageIndex);
      }

      if (isTeacher) {
        setPublishedTemplate(withTemplateDefaults(data?.template ?? null));
        setExitTicketSubmitMeta(null);
      } else {
        const tid = typeof data?.teacherId === 'string' ? data.teacherId : '';
        const lp = typeof data?.lessonPath === 'string' ? data.lessonPath : '';
        const pubAt = typeof data?.publishedAt === 'string' ? data.publishedAt.trim() : '';
        const tpl = withTemplateDefaults(data?.template ?? null);
        if (!pubAt || !tpl) {
          setPublishedTemplate(null);
          setExitTicketSubmitMeta(null);
        } else {
          setPublishedTemplate(tpl);
          if (tid && lp) setExitTicketSubmitMeta({ teacherId: tid, lessonPath: lp });
          else setExitTicketSubmitMeta(null);
        }
      }
    } catch {
      if (isTeacher) {
        setPublishedTemplate(withTemplateDefaults(parseStoredTemplate()));
      } else {
        setPublishedTemplate(null);
        setExitTicketSubmitMeta(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    void loadCurrentTemplate(false);
  }, [loadCurrentTemplate]);

  /** SuS: sanftes Nachladen, sobald die Lehrkraft freigibt (ohne Dashboard-Popup) */
  useEffect(() => {
    if (isTeacher) return;
    const id = window.setInterval(() => {
      void loadCurrentTemplate(true);
    }, 5000);
    return () => window.clearInterval(id);
  }, [isTeacher, loadCurrentTemplate]);

  useEffect(() => {
    if (isTeacher) return;
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadCurrentTemplate(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isTeacher, loadCurrentTemplate]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      navigate(safeStundeReturnTo ?? '/dashboard');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, safeStundeReturnTo]);

  useEffect(() => {
    if (!isTeacher) return;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const templateOrder: ExitTicketTemplateType[] = [
      'quick-check',
      'transfer',
      'draw',
      'error-hunt',
      'exam-question',
      'prediction',
      'feedback',
    ];

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      e.preventDefault();
      if (selectedType === null) {
        setSelectedType(e.key === 'ArrowRight' ? templateOrder[0] : templateOrder[templateOrder.length - 1]);
        return;
      }
      const currentIndex = templateOrder.indexOf(selectedType);
      if (currentIndex < 0) return;

      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = Math.min(templateOrder.length - 1, Math.max(0, currentIndex + delta));
      setSelectedType(templateOrder[nextIndex]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTeacher, selectedType]);

  const draftTemplate = useMemo(() => {
    const baseTemplate =
      draftTemplateType === 'feedback'
        ? FEEDBACK_TEMPLATE
        : draftTemplateType === 'quick-check'
          ? buildQuickCheckTemplate(draftTopic)
          : draftTemplateType === 'error-hunt'
            ? ERROR_HUNT_TEMPLATE
            : draftTemplateType === 'exam-question'
              ? EXAM_QUESTION_TEMPLATE
              : draftTemplateType === 'prediction'
                ? PREDICTION_TEMPLATE
                : draftTemplateType === 'draw'
                  ? DRAW_TEMPLATE
                  : TRANSFER_TEMPLATE;
    return { ...baseTemplate, responseMode: draftResponseMode };
  }, [draftTemplateType, draftTopic, draftResponseMode]);

  const publishTemplate = async (templateToPublish: ExitTicketTemplate): Promise<boolean> => {
    setPublishing(true);
    try {
      const response = await apiPost('/api/exit-ticket/publish', { template: templateToPublish });
      if (!response.ok) throw new Error('Veröffentlichen fehlgeschlagen');
      const data = (await response.json()) as { lessonPath?: string };
      localStorage.setItem(EXIT_TICKET_STORAGE_KEY, JSON.stringify(templateToPublish));
      setPublishedTemplate(templateToPublish);
      if (typeof data?.lessonPath === 'string' && data.lessonPath.trim()) {
        const next = new URLSearchParams(location.search);
        next.set('lessonPath', data.lessonPath.trim());
        navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
      }
      return true;
    } catch {
      return false;
    } finally {
      setPublishing(false);
    }
  };

  const openTemplateModal = useCallback((templateType: ExitTicketTemplateType) => {
    setSelectedType(templateType);
    setDraftTemplateType(templateType);
    setDraftTopic(quickCheckTopic);
    setDraftResponseMode(selectedResponseMode);
    setDraftAnswers(new Array(3).fill(''));
    setDraftPhotoDataUrl('');
    setTemplateModalOpen(true);
  }, [quickCheckTopic, selectedResponseMode]);

  /** Stundenplan / Deep-Link: ?template=draw öffnet direkt den Vorlagen-Dialog (wie Klick auf die Karte) */
  useEffect(() => {
    const valid = getExitTicketTemplateFromSearch(location.search);
    if (!valid) {
      lastAutoOpenedTemplateFromUrlRef.current = null;
      return;
    }
    if (!isTeacher || loading) return;
    if (lastAutoOpenedTemplateFromUrlRef.current === valid) return;
    lastAutoOpenedTemplateFromUrlRef.current = valid;
    openTemplateModal(valid);
  }, [isTeacher, loading, location.search, openTemplateModal]);

  const TEMPLATE_CARDS: Array<{ id: ExitTicketTemplateType; title: string; description: string }> = [
    {
      id: 'quick-check',
      title: '3 kurze Fragen (auto)',
      description: '',
    },
    {
      id: 'transfer',
      title: TRANSFER_TEMPLATE.title,
      description: 'Übertragung auf neue Situationen.',
    },
    {
      id: 'draw',
      title: DRAW_TEMPLATE.title,
      description: 'Zeichnung + kurzer Merksatz.',
    },
    {
      id: 'error-hunt',
      title: ERROR_HUNT_TEMPLATE.title,
      description: 'Typische Fehler finden und verbessern.',
    },
    {
      id: 'exam-question',
      title: EXAM_QUESTION_TEMPLATE.title,
      description: 'Eigene Prüfungsfrage + Lösung formulieren.',
    },
    {
      id: 'prediction',
      title: PREDICTION_TEMPLATE.title,
      description: 'Inhalt der nächsten Stunde vorhersagen.',
    },
    {
      id: 'feedback',
      title: FEEDBACK_TEMPLATE.title,
      description: 'Reflexion: Was bleibt hängen?',
    },
  ];

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
    if (safeStundeReturnTo) navigate(safeStundeReturnTo);
  };

  const publishFromModal = async () => {
    setSelectedType(draftTemplateType);
    setQuickCheckTopic(draftTopic);
    setSelectedResponseMode(draftResponseMode);
    const ok = await publishTemplate(draftTemplate);
    setTemplateModalOpen(false);
    if (ok && safeStundeReturnTo) navigate(safeStundeReturnTo);
  };

  const clearDraftCanvas = () => {
    const canvas = draftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const onDraftCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = draftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (e.type === 'pointerdown') {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a237e';
      ctx.beginPath();
      ctx.moveTo(x, y);
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (e.type === 'pointermove') {
      if (e.buttons === 0) return;
      ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }
    ctx.closePath();
  };

  const onDraftPhotoPick = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setDraftPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!templateModalOpen) return;
    if (draftTemplateType !== 'draw' || draftResponseMode !== 'text-input') return;
    clearDraftCanvas();
  }, [templateModalOpen, draftTemplateType, draftResponseMode]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fb', py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2.5 } }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Tooltip title={safeStundeReturnTo ? 'Zurück zur Stunde' : 'Zurück'}>
            <IconButton
              onClick={() => (safeStundeReturnTo ? navigate(safeStundeReturnTo) : navigate(-1))}
              size="small"
              aria-label="Zurück"
              sx={{ p: 0, minWidth: 32, width: 32, height: 32, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="h6"
            sx={{
              color: '#1a237e',
              textAlign: 'center',
              px: 1,
              lineHeight: 1.25,
              maxWidth: { xs: '70vw', sm: 480 },
              fontWeight: exitTicketPageHeaderTitle !== 'ExitTicket' ? 800 : 600,
              fontSize: exitTicketPageHeaderTitle !== 'ExitTicket' ? { xs: '0.92rem', sm: '1.05rem' } : undefined,
            }}
          >
            {exitTicketPageHeaderTitle}
          </Typography>
          <Tooltip title={safeStundeReturnTo ? 'Schließen (zurück zur Stunde)' : 'Schließen (zum Dashboard)'}>
            <IconButton
              onClick={() => navigate(safeStundeReturnTo ?? '/dashboard')}
              size="small"
              aria-label="Schließen"
              sx={{ p: 0, minWidth: 32, width: 32, height: 32, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Card sx={{ borderRadius: 2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {loading ? (
              <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={26} />
              </Box>
            ) : isTeacher ? (
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  ExitTicket-Vorlage auswählen
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Klicke eine Karte — es gibt keine voreingestellte Vorlage.
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 1.2,
                  }}
                >
                  {TEMPLATE_CARDS.map((card) => {
                    const isActive = activeExitTicketCardId === card.id;
                    return (
                      <Box
                        key={card.id}
                        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0.75 }}
                      >
                        <ButtonBase
                          onClick={() => openTemplateModal(card.id)}
                          sx={{ borderRadius: 2, overflow: 'hidden', height: '100%', textAlign: 'left' }}
                        >
                          <Box
                            sx={{
                              borderRadius: 2,
                              border: '1px solid',
                              borderColor: isActive ? 'primary.main' : 'divider',
                              bgcolor: isActive ? 'rgba(25, 118, 210, 0.06)' : 'white',
                              p: 1.1,
                              transition: 'all 0.15s ease',
                              width: '100%',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: isActive ? '0 10px 22px rgba(25,118,210,0.12)' : '0 8px 16px rgba(0,0,0,0.06)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                height: 124,
                                borderRadius: 1.6,
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: '#f7faff',
                              }}
                            >
                              <Box
                                component="img"
                                src={EXIT_TICKET_CARD_IMAGE_SRC[card.id]}
                                alt={card.title}
                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            </Box>
                            <Typography variant="subtitle2" sx={{ mt: 0.8, fontWeight: 800 }}>
                              {card.title}
                            </Typography>
                            {card.description.trim() ? (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {card.description}
                              </Typography>
                            ) : null}
                          </Box>
                        </ButtonBase>
                        {isActive ? (
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            startIcon={<AssignmentTurnedInIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setAllResponsesOpen(true)}
                            sx={{ py: 0.35, fontSize: '0.72rem', minHeight: 30 }}
                          >
                            Alle Antworten
                          </Button>
                        ) : null}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Dein ExitTicket
                </Typography>
                {!publishedTemplate ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Es wurde noch kein ExitTicket freigegeben. Die Seite lädt automatisch nach, sobald deine Lehrkraft
                    etwas veröffentlicht.
                  </Typography>
                ) : (
                  <StudentExitTicketRender
                    publishedTemplate={publishedTemplate}
                    TEMPLATE_IMAGE_SRC={TEMPLATE_IMAGE_SRC}
                    heroImageSrc={entryTicketHeroSrc(exitHeroImageIndex)}
                    submitMeta={exitTicketSubmitMeta}
                    omitTitle={publishedTemplate.id === 'prediction'}
                    onSubmitted={() => {
                      // no-op in student view, but keeps future extension easy
                    }}
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {isTeacher && (
          <ExitTicketAllResponsesDialog
            open={allResponsesOpen}
            onClose={() => setAllResponsesOpen(false)}
            lessonPathFilter={exitTicketLessonPathFilter}
            heroImageIndex={exitHeroImageIndex}
          />
        )}

        {isTeacher && (
          <Dialog
            open={templateModalOpen}
            onClose={closeTemplateModal}
            maxWidth={false}
            fullWidth
            PaperProps={{
              sx: {
                width: 'min(96vw, 1320px)',
                maxWidth: '1320px',
                height: 'min(92vh, 960px)',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                m: { xs: 1, sm: 2 },
              },
            }}
          >
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.25, sm: 2 },
                pr: 2,
                pt: 2,
                pb: 1.5,
                flexShrink: 0,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ExitTicketCardHeaderImage templateId={draftTemplate.id} size={72} />
              <Typography variant="h6" component="span" sx={{ flex: 1, minWidth: 0, pr: 1, lineHeight: 1.25 }}>
                {draftTemplate.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                <Tooltip title="Nur Fragen anzeigen">
                  <IconButton
                    size="small"
                    onClick={() => setDraftResponseMode('questions-only')}
                    aria-label="Nur Fragen anzeigen"
                    aria-pressed={draftResponseMode === 'questions-only'}
                    sx={{
                      p: 0.25,
                      minWidth: 28,
                      width: 28,
                      height: 28,
                      color: draftResponseMode === 'questions-only' ? 'primary.contrastText' : 'action.active',
                      bgcolor: draftResponseMode === 'questions-only' ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: draftResponseMode === 'questions-only' ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    <QuizIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Antworten eingeben">
                  <IconButton
                    size="small"
                    onClick={() => setDraftResponseMode('text-input')}
                    aria-label="Antworten eingeben"
                    aria-pressed={draftResponseMode === 'text-input'}
                    sx={{
                      p: 0.25,
                      minWidth: 28,
                      width: 28,
                      height: 28,
                      color: draftResponseMode === 'text-input' ? 'primary.contrastText' : 'action.active',
                      bgcolor: draftResponseMode === 'text-input' ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: draftResponseMode === 'text-input' ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    <EditNoteIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Antworten fotografieren">
                  <IconButton
                    size="small"
                    onClick={() => setDraftResponseMode('photo-upload')}
                    aria-label="Antworten fotografieren"
                    aria-pressed={draftResponseMode === 'photo-upload'}
                    sx={{
                      p: 0.25,
                      minWidth: 28,
                      width: 28,
                      height: 28,
                      color: draftResponseMode === 'photo-upload' ? 'primary.contrastText' : 'action.active',
                      bgcolor: draftResponseMode === 'photo-upload' ? 'primary.main' : 'transparent',
                      '&:hover': {
                        bgcolor: draftResponseMode === 'photo-upload' ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={publishing ? 'Wird freigegeben …' : 'Für SuS freigeben'}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => void publishFromModal()}
                      disabled={publishing}
                      aria-label="Für SuS freigeben"
                      color="primary"
                      sx={{
                        p: 0.25,
                        minWidth: 28,
                        width: 28,
                        height: 28,
                        ml: 0.25,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                      }}
                    >
                      {publishing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
                <DialogCloseIconButton
                  onClose={closeTemplateModal}
                  sx={{ position: 'static', transform: 'none', top: 'auto', right: 'auto', ml: 0.25 }}
                />
              </Box>
            </DialogTitle>
            <DialogContent
              sx={{
                flex: '1 1 auto',
                overflow: 'auto',
                pt: 4,
                pb: 3,
                px: { xs: 2, sm: 3 },
                bgcolor: '#f8fafc',
              }}
            >
              <Box sx={{ pt: 2 }}>
                {draftTemplate.description.trim() ? (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mb: 2.5, lineHeight: 1.5 }}
                  >
                    {renderWithBoldOperators(draftTemplate.description, 'draft-desc')}
                  </Typography>
                ) : null}

                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    alignItems: 'flex-start',
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <Box sx={{ flex: '1 1 auto', minWidth: 0, order: { xs: 1, sm: 1 } }}>
                  {draftTemplate.questions.map((question, index) => (
                    <Box
                      key={`draft-q-${index}`}
                      sx={{
                        mb: 2.25,
                        pl: 2.25,
                        py: 2,
                        pr: 2,
                        borderRadius: 2,
                        bgcolor: '#fff',
                        borderLeft: '5px solid',
                        borderColor: 'primary.main',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      }}
                    >
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{
                          fontWeight: 400,
                          fontSize: { xs: '1.05rem', sm: '1.15rem' },
                          lineHeight: 1.45,
                          color: 'text.primary',
                          mb: draftResponseMode === 'text-input' ? 1.25 : 0,
                        }}
                      >
                        <Box component="span" sx={{ color: 'primary.main', mr: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {index + 1}.
                        </Box>
                        {renderWithBoldOperators(question, `draft-q-${index}`)}
                      </Typography>
                      {draftResponseMode === 'text-input' && (
                        <TextField
                          size="small"
                          multiline
                          minRows={2}
                          fullWidth
                          placeholder="Antwortfeld"
                          value={draftAnswers[index] ?? ''}
                          onChange={(e) => {
                            const next = [...draftAnswers];
                            next[index] = e.target.value;
                            setDraftAnswers(next);
                          }}
                          sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fafafa' } }}
                        />
                      )}
                    </Box>
                  ))}

                  {draftTemplate.id === 'draw' && draftResponseMode === 'text-input' && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                        Malfläche (SuS-Ansicht)
                      </Typography>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
                        <canvas
                          ref={draftCanvasRef}
                          width={960}
                          height={320}
                          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
                          onPointerDown={onDraftCanvasPointer}
                          onPointerMove={onDraftCanvasPointer}
                          onPointerUp={onDraftCanvasPointer}
                          onPointerCancel={onDraftCanvasPointer}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.7 }}>
                        <Button size="small" variant="outlined" onClick={clearDraftCanvas}>
                          Malfläche leeren
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {draftResponseMode === 'photo-upload' && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                        Bild-Upload (SuS-Ansicht)
                      </Typography>
                      <Button variant="outlined" component="label" size="small">
                        Foto auswählen
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          hidden
                          onChange={(e) => onDraftPhotoPick(e.target.files?.[0])}
                        />
                      </Button>
                      {draftPhotoDataUrl && (
                        <Box
                          component="img"
                          src={draftPhotoDataUrl}
                          alt="Vorschau"
                          sx={{ mt: 1, width: 260, maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                        />
                      )}
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    width: { xs: '100%', sm: 220 },
                    flexShrink: 0,
                    order: { xs: 2, sm: 2 },
                    alignSelf: 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      position: { sm: 'sticky' },
                      top: { sm: 8 },
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: '#fff',
                      aspectRatio: '16 / 10',
                      maxHeight: { sm: 200 },
                    }}
                  >
                    <Box
                      component="img"
                      src={entryTicketHeroSrc(exitHeroImageIndex)}
                      alt={draftTemplate.title}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                </Box>
              </Box>
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                flexShrink: 0,
                px: { xs: 1.5, sm: 2 },
                py: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: '#f4f6fb',
                justifyContent: 'stretch',
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<AssignmentTurnedInIcon sx={{ fontSize: 16 }} />}
                onClick={() => setAllResponsesOpen(true)}
                sx={{ py: 0.5, fontSize: '0.8rem' }}
              >
                Alle Antworten
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Box>
  );
}
