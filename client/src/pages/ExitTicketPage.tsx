import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon, Close as CloseIcon } from '@mui/icons-material';
import { apiGet, apiPost } from '../lib/api';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../components/ui/dialog-close-icon-button';

type ExitTicketTemplateType =
  | 'feedback'
  | 'quick-check'
  | 'transfer'
  | 'draw'
  | 'error-hunt'
  | 'exam-question'
  | 'prediction';

type ExitTicketResponseMode = 'questions-only' | 'text-input' | 'photo-upload';

type ExitTicketTemplate = {
  id: ExitTicketTemplateType;
  title: string;
  description: string;
  questions: string[];
  responseMode: ExitTicketResponseMode;
};

type CollectedExitTicketResponse = {
  studentId: string;
  studentName: string;
  answers: string[];
  drawingDataUrl?: string;
  photoDataUrl?: string;
  completionOnly?: boolean;
  submittedAt: string;
};

const EXIT_TICKET_STORAGE_KEY = 'activeExitTicketTemplateV1';

const TEMPLATE_IMAGE_SRC: Record<ExitTicketTemplateType, string> = {
  feedback: '/exit-ticket/exit-ticket-feedback.svg',
  'quick-check': '/exit-ticket/exit-ticket-quick-check.svg',
  transfer: '/exit-ticket/exit-ticket-transfer.svg',
  draw: '/exit-ticket/exit-ticket-draw.svg',
  'error-hunt': '/exit-ticket/exit-ticket-quick-check.svg',
  'exam-question': '/exit-ticket/exit-ticket-feedback.svg',
  prediction: '/exit-ticket/exit-ticket-transfer.svg',
};

const FEEDBACK_TEMPLATE: ExitTicketTemplate = {
  id: 'feedback',
  title: '3-Fragen-Feedback',
  description: 'Reflexion zur Stunde aus Sicht der SuS.',
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
    description: `Automatisch erzeugte Kurzfragen zu "${cleanedTopic}".`,
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
  description: 'Übertrage das Gelernte auf eine neue Situation.',
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
  description: 'Zeig mit einer Zeichnung, was dir heute am wichtigsten war.',
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
  description: 'Finde und verbessere typische Denk- oder Rechenfehler.',
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
  description: 'Erstelle eine mögliche Prüfungsfrage zur heutigen Stunde.',
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
  description: 'Schätze, was als Nächstes kommt und warum.',
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

const withTemplateDefaults = (template: ExitTicketTemplate | null | undefined): ExitTicketTemplate | null => {
  if (!template) return null;
  return {
    ...template,
    responseMode: template.responseMode ?? 'questions-only',
  };
};

const OPERATOR_WORDS = [
  'Erkläre',
  'Nenne',
  'Beschreibe',
  'Formuliere',
  'Zeichne',
  'Beschrifte',
  'Gib',
  'Zeig',
  'Übertrage',
  'Schreibe',
  'Bearbeite',
  'Finde',
  'Korrigiere',
  'Erstelle',
  'Begründe',
  'Schätze',
];

const renderWithBoldOperators = (text: string, keyPrefix: string) => {
  const escapedWords = OPERATOR_WORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isOperatorWord = OPERATOR_WORDS.some((word) => word.toLowerCase() === part.toLowerCase());
    return (
      <Box component="span" key={`${keyPrefix}-${index}`} sx={isOperatorWord ? { fontWeight: 900 } : undefined}>
        {part}
      </Box>
    );
  });
};

export default function ExitTicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTeacher = useMemo(() => Boolean(localStorage.getItem('teacherId')), []);
  const [selectedType, setSelectedType] = useState<ExitTicketTemplateType>('feedback');
  const [selectedResponseMode, setSelectedResponseMode] = useState<ExitTicketResponseMode>('questions-only');
  const [quickCheckTopic, setQuickCheckTopic] = useState('');
  const [publishedTemplate, setPublishedTemplate] = useState<ExitTicketTemplate | null>(parseStoredTemplate());
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [responses, setResponses] = useState<CollectedExitTicketResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [draftTemplateType, setDraftTemplateType] = useState<ExitTicketTemplateType>('feedback');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftResponseMode, setDraftResponseMode] = useState<ExitTicketResponseMode>('questions-only');
  const [draftAnswers, setDraftAnswers] = useState<string[]>([]);
  const [draftPhotoDataUrl, setDraftPhotoDataUrl] = useState<string>('');
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const template = params.get('template');
    const allowed: ExitTicketTemplateType[] = [
      'feedback',
      'quick-check',
      'transfer',
      'draw',
      'error-hunt',
      'exam-question',
      'prediction',
    ];
    if (template && allowed.includes(template as ExitTicketTemplateType)) {
      setSelectedType(template as ExitTicketTemplateType);
    }
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentTemplate = async () => {
      setLoading(true);
      try {
        const response = await apiGet('/api/exit-ticket/current');
        if (!response.ok) throw new Error('Laden fehlgeschlagen');
        const data = await response.json();
        if (!mounted) return;
        setPublishedTemplate(withTemplateDefaults(data?.template ?? null));
      } catch {
        if (mounted) {
          // Fallback for existing local state in case API is temporarily unavailable.
          setPublishedTemplate(withTemplateDefaults(parseStoredTemplate()));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadResponses = async () => {
      if (!isTeacher) return;
      setLoadingResponses(true);
      try {
        const response = await apiGet('/api/exit-ticket/responses');
        if (!response.ok) throw new Error('Antworten konnten nicht geladen werden');
        const data = await response.json();
        if (!mounted) return;
        setResponses(Array.isArray(data?.responses) ? data.responses : []);
      } catch {
        if (mounted) setResponses([]);
      } finally {
        if (mounted) setLoadingResponses(false);
      }
    };

    loadCurrentTemplate();
    loadResponses();

    return () => {
      mounted = false;
    };
  }, [isTeacher]);

  const refreshResponses = async () => {
    if (!isTeacher) return;
    setLoadingResponses(true);
    try {
      const response = await apiGet('/api/exit-ticket/responses');
      if (!response.ok) throw new Error('Antworten konnten nicht geladen werden');
      const data = await response.json();
      setResponses(Array.isArray(data?.responses) ? data.responses : []);
    } catch {
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

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
      navigate('/dashboard');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

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
      'feedback',
      'quick-check',
      'transfer',
      'draw',
      'error-hunt',
      'exam-question',
      'prediction',
    ];

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const currentIndex = templateOrder.indexOf(selectedType);
      if (currentIndex < 0) return;

      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = Math.min(templateOrder.length - 1, Math.max(0, currentIndex + delta));
      setSelectedType(templateOrder[nextIndex]);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTeacher, selectedType]);

  const selectedTemplate = useMemo(() => {
    const baseTemplate =
      selectedType === 'feedback'
        ? FEEDBACK_TEMPLATE
        : selectedType === 'quick-check'
          ? buildQuickCheckTemplate(quickCheckTopic)
          : selectedType === 'error-hunt'
            ? ERROR_HUNT_TEMPLATE
            : selectedType === 'exam-question'
              ? EXAM_QUESTION_TEMPLATE
              : selectedType === 'prediction'
                ? PREDICTION_TEMPLATE
                : selectedType === 'draw'
                  ? DRAW_TEMPLATE
                  : TRANSFER_TEMPLATE;
    return { ...baseTemplate, responseMode: selectedResponseMode };
  }, [selectedType, quickCheckTopic, selectedResponseMode]);

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

  const publishTemplate = async (templateToPublish: ExitTicketTemplate = selectedTemplate) => {
    setPublishing(true);
    try {
      const response = await apiPost('/api/exit-ticket/publish', { template: templateToPublish });
      if (!response.ok) throw new Error('Veröffentlichen fehlgeschlagen');
      localStorage.setItem(EXIT_TICKET_STORAGE_KEY, JSON.stringify(templateToPublish));
      setPublishedTemplate(templateToPublish);
      await refreshResponses();
    } catch {
      // Keep UI stable if server fails.
    } finally {
      setPublishing(false);
    }
  };

  const TEMPLATE_CARDS: Array<{ id: ExitTicketTemplateType; title: string; description: string }> = [
    {
      id: 'feedback',
      title: FEEDBACK_TEMPLATE.title,
      description: 'Reflexion: Was bleibt hängen?',
    },
    {
      id: 'quick-check',
      title: '3 kurze Fragen (auto)',
      description: 'Zum Thema passende Mini-Fragen.',
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
  ];

  const openTemplateModal = (templateType: ExitTicketTemplateType) => {
    setSelectedType(templateType);
    setDraftTemplateType(templateType);
    setDraftTopic(quickCheckTopic);
    setDraftResponseMode(selectedResponseMode);
    setDraftAnswers(new Array(3).fill(''));
    setDraftPhotoDataUrl('');
    setTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
  };

  const publishFromModal = async () => {
    setSelectedType(draftTemplateType);
    setQuickCheckTopic(draftTopic);
    setSelectedResponseMode(draftResponseMode);
    await publishTemplate(draftTemplate);
    setTemplateModalOpen(false);
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
          <Tooltip title="Zurück">
            <IconButton
              onClick={() => navigate(-1)}
              size="small"
              aria-label="Zurück"
              sx={{ p: 0, minWidth: 32, width: 32, height: 32, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ color: '#1a237e' }}>
            ExitTicket
          </Typography>
          <Tooltip title="Schließen (zum Dashboard)">
            <IconButton
              onClick={() => navigate('/dashboard')}
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
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 1.2,
                  }}
                >
                  {TEMPLATE_CARDS.map((card) => {
                    const isActive = selectedType === card.id;
                    return (
                      <ButtonBase
                        key={card.id}
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
                              src={TEMPLATE_IMAGE_SRC[card.id]}
                              alt={card.title}
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </Box>
                          <Typography variant="subtitle2" sx={{ mt: 0.8, fontWeight: 800 }}>
                            {card.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {card.description}
                          </Typography>
                        </Box>
                      </ButtonBase>
                    );
                  })}
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Vorlage anklicken, um sie im Modal mit Antwortmodus und Funktionalität zu konfigurieren.
                </Typography>

                <Card variant="outlined" sx={{ mt: 1, bgcolor: '#fff' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        Antworten gesammelt ({responses.length})
                      </Typography>
                      <Button size="small" variant="outlined" onClick={refreshResponses}>
                        Aktualisieren
                      </Button>
                    </Box>
                    {loadingResponses ? (
                      <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={20} />
                      </Box>
                    ) : responses.length === 0 ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Noch keine Antworten vorhanden.
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'grid', gap: 1 }}>
                        {responses.map((item) => (
                          <Card key={item.studentId} variant="outlined" sx={{ bgcolor: '#f8fbff' }}>
                            <CardContent sx={{ py: 1.1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.4 }}>
                                {item.studentName}
                              </Typography>
                              {item.answers.map((answer, idx) => (
                                <Typography key={`${item.studentId}-${idx}`} variant="body2" sx={{ mb: 0.35 }}>
                                  {idx + 1}. {answer || '—'}
                                </Typography>
                              ))}
                              {item.completionOnly && (
                                <Typography variant="body2" sx={{ mb: 0.35, fontStyle: 'italic', color: 'text.secondary' }}>
                                  Nur angezeigt / als gesehen markiert
                                </Typography>
                              )}
                              {item.drawingDataUrl && (
                                <Box
                                  component="img"
                                  src={item.drawingDataUrl}
                                  alt={`Zeichnung von ${item.studentName}`}
                                  sx={{ mt: 0.8, width: 220, maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                />
                              )}
                              {item.photoDataUrl && (
                                <Box
                                  component="img"
                                  src={item.photoDataUrl}
                                  alt={`Antwortfoto von ${item.studentName}`}
                                  sx={{ mt: 0.8, width: 220, maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                />
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Dein ExitTicket
                </Typography>
                {!publishedTemplate ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Es wurde noch kein ExitTicket freigegeben.
                  </Typography>
                ) : (
                  <StudentExitTicketRender
                    publishedTemplate={publishedTemplate}
                    TEMPLATE_IMAGE_SRC={TEMPLATE_IMAGE_SRC}
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
          <Dialog open={templateModalOpen} onClose={closeTemplateModal} maxWidth="md" fullWidth>
            <DialogTitle sx={{ ...dialogCloseTitleSx }}>
              <Typography variant="h6">
                Vorlage konfigurieren: {draftTemplate.title}
              </Typography>
              <DialogCloseIconButton onClose={closeTemplateModal} />
            </DialogTitle>
            <DialogContent dividers>
              {draftTemplateType === 'quick-check' && (
                <TextField
                  size="small"
                  fullWidth
                  sx={{ mb: 1.2 }}
                  label="Thema für automatische Fragen"
                  placeholder="z. B. Alan Turing und Enigma"
                  value={draftTopic}
                  onChange={(e) => setDraftTopic(e.target.value)}
                />
              )}

              <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 1.2 }}>
                <Button
                  size="small"
                  variant={draftResponseMode === 'questions-only' ? 'contained' : 'outlined'}
                  onClick={() => setDraftResponseMode('questions-only')}
                >
                  Nur Fragen anzeigen
                </Button>
                <Button
                  size="small"
                  variant={draftResponseMode === 'text-input' ? 'contained' : 'outlined'}
                  onClick={() => setDraftResponseMode('text-input')}
                >
                  Antworten eingeben
                </Button>
                <Button
                  size="small"
                  variant={draftResponseMode === 'photo-upload' ? 'contained' : 'outlined'}
                  onClick={() => setDraftResponseMode('photo-upload')}
                >
                  Antworten fotografieren
                </Button>
              </Box>

              <Card variant="outlined" sx={{ bgcolor: '#f0f7ff' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 1.4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 260 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                        {renderWithBoldOperators(draftTemplate.title, 'draft-title')}
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.9 }}>
                        {renderWithBoldOperators(draftTemplate.description, 'draft-desc')}
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: '100%', sm: 220 }, height: { xs: 140, sm: 128 }, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box component="img" src={TEMPLATE_IMAGE_SRC[draftTemplate.id]} alt={draftTemplate.title} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </Box>
                  </Box>

                  {draftTemplate.questions.map((question, index) => (
                    <Box key={`draft-q-${index}`} sx={{ mb: 0.7 }}>
                      <Typography variant="body1" sx={{ mb: 0.4 }}>
                        {index + 1}. {renderWithBoldOperators(question, `draft-q-${index}`)}
                      </Typography>
                      {draftResponseMode === 'text-input' && (
                        <TextField
                          size="small"
                          multiline
                          minRows={2}
                          fullWidth
                          placeholder="Antwortfeld für SuS"
                          value={draftAnswers[index] ?? ''}
                          onChange={(e) => {
                            const next = [...draftAnswers];
                            next[index] = e.target.value;
                            setDraftAnswers(next);
                          }}
                        />
                      )}
                    </Box>
                  ))}

                  {draftTemplate.id === 'draw' && draftResponseMode === 'text-input' && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                        Malfläche (SuS-Ansicht)
                      </Typography>
                      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
                        <canvas
                          ref={draftCanvasRef}
                          width={720}
                          height={260}
                          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
                          onPointerDown={onDraftCanvasPointer}
                          onPointerMove={onDraftCanvasPointer}
                          onPointerUp={onDraftCanvasPointer}
                          onPointerCancel={onDraftCanvasPointer}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.7 }}>
                        <Button size="small" variant="outlined" onClick={clearDraftCanvas}>Malfläche leeren</Button>
                      </Box>
                    </Box>
                  )}

                  {draftResponseMode === 'photo-upload' && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
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
                        <Box component="img" src={draftPhotoDataUrl} alt="Vorschau" sx={{ mt: 0.8, width: 220, maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.2 }}>
              <Button onClick={closeTemplateModal}>Abbrechen</Button>
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={publishFromModal}
                disabled={publishing}
              >
                Für SuS freigeben
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Box>
  );
}

function StudentExitTicketRender(props: {
  publishedTemplate: ExitTicketTemplate;
  TEMPLATE_IMAGE_SRC: Record<ExitTicketTemplateType, string>;
  onSubmitted: () => void;
}) {
  const { publishedTemplate, TEMPLATE_IMAGE_SRC, onSubmitted } = props;
  const studentId = localStorage.getItem('studentId') || localStorage.getItem('userId') || 'guest';
  const drawStorageKey = `exitTicketResponse_draw_${studentId}_v1`;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Array<HTMLElement | null>>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  useEffect(() => {
    if (publishedTemplate.id !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const raw = localStorage.getItem(drawStorageKey);
    if (raw) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsReady(true);
      };
      img.src = raw;
    } else {
      // Ensure the canvas has a clean white background.
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setIsReady(true);
    }
  }, [drawStorageKey, publishedTemplate.id]);

  useEffect(() => {
    setActiveQuestionIndex(0);
    questionRefs.current = [];
    setAnswers(new Array(publishedTemplate.questions.length).fill(''));
    setPhotoDataUrl('');
  }, [publishedTemplate.id, publishedTemplate.questions.length]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      // For student: navigate between questions and scroll the active one into view.
      const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = Math.min(
        publishedTemplate.questions.length - 1,
        Math.max(0, activeQuestionIndex + delta),
      );
      if (nextIndex === activeQuestionIndex) return;

      e.preventDefault();
      setActiveQuestionIndex(nextIndex);

      // Scroll after state update tick.
      window.setTimeout(() => {
        const el = questionRefs.current[nextIndex];
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeQuestionIndex, publishedTemplate.questions, publishedTemplate.questions.length]);

  const beginPathAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a237e';
    ctx.beginPath();
    ctx.moveTo(x, y);

    canvas.setPointerCapture(e.pointerId);
  };

  const strokeTo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (e.buttons === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endPath = (_e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem(drawStorageKey, dataUrl);
    } catch {
      // ignore (e.g. quota exceeded)
    }
  };

  const submitAnswers = async () => {
    if (publishedTemplate.responseMode === 'text-input') {
      const hasAnyText = answers.some((entry) => entry.trim().length > 0);
      if (!hasAnyText) return;
    }

    if (publishedTemplate.responseMode === 'photo-upload' && !photoDataUrl) return;

    setSubmitting(true);
    try {
      const drawingDataUrl = publishedTemplate.id === 'draw' ? canvasRef.current?.toDataURL('image/png') : undefined;
      const response = await apiPost('/api/exit-ticket/submit', {
        answers: publishedTemplate.responseMode === 'text-input' ? answers : [],
        drawingDataUrl,
        photoDataUrl: publishedTemplate.responseMode === 'photo-upload' ? photoDataUrl : undefined,
        completionOnly: publishedTemplate.responseMode === 'questions-only',
      });
      if (!response.ok) throw new Error('Speichern fehlgeschlagen');
      if (drawingDataUrl) {
        localStorage.setItem(drawStorageKey, drawingDataUrl);
      }
      onSubmitted();
    } catch {
      // keep page stable
    } finally {
      setSubmitting(false);
    }
  };

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPhotoDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card variant="outlined" sx={{ bgcolor: '#f0f7ff' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.6, flexWrap: 'wrap', mt: 0.6 }}>
          <Box sx={{ flex: 1, minWidth: 260, pt: 0.3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.45, lineHeight: 1.15 }}>
              {renderWithBoldOperators(publishedTemplate.title, `stud-title-${publishedTemplate.id}`)}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1.2 }}>
              {renderWithBoldOperators(publishedTemplate.description, `stud-desc-${publishedTemplate.id}`)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.2 }}>
              Modus: {publishedTemplate.responseMode === 'questions-only'
                ? 'Nur Fragen'
                : publishedTemplate.responseMode === 'text-input'
                  ? 'Antworten eingeben'
                  : 'Antworten fotografieren'}
            </Typography>
          </Box>
          <Box
            sx={{
              width: { xs: '100%', sm: 240 },
              maxWidth: '100%',
              height: { xs: 150, sm: 136 },
              borderRadius: 2,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#edf3ff',
              boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Box
              component="img"
              src={TEMPLATE_IMAGE_SRC[publishedTemplate.id]}
              alt={publishedTemplate.title}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </Box>
        </Box>

        {publishedTemplate.questions.map((question, index) => (
          <Box
            key={`${publishedTemplate.id}-${index}`}
            ref={(el: HTMLElement | null) => {
              questionRefs.current[index] = el;
            }}
            sx={{ scrollMarginTop: 90 }}
          >
            <Typography
              variant="body1"
              sx={{
                mb: 0.5,
                fontWeight: index === activeQuestionIndex ? 900 : undefined,
              }}
            >
              {index + 1}. {renderWithBoldOperators(question, `stud-q-${publishedTemplate.id}-${index}`)}
            </Typography>
            {publishedTemplate.responseMode === 'text-input' && (
              <TextField
                size="small"
                multiline
                minRows={2}
                fullWidth
                placeholder="Deine Antwort..."
                value={answers[index] ?? ''}
                onChange={(e) => {
                  const next = [...answers];
                  next[index] = e.target.value;
                  setAnswers(next);
                }}
                sx={{ mb: 1 }}
              />
            )}
          </Box>
        ))}

        {publishedTemplate.responseMode === 'photo-upload' && (
          <Box sx={{ mt: 1, mb: 1.2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.6 }}>
              Foto deiner Antworten hochladen
            </Typography>
            <Button variant="outlined" component="label" size="small">
              Foto auswählen
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
              />
            </Button>
            {photoDataUrl && (
              <Box
                component="img"
                src={photoDataUrl}
                alt="Antwortfoto"
                sx={{ mt: 1, width: 260, maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
              />
            )}
          </Box>
        )}

        {publishedTemplate.id === 'draw' && publishedTemplate.responseMode === 'text-input' && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.8 }}>
              Zeichne hier:
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#fff',
                width: '100%',
                maxWidth: 760,
                mx: 'auto',
              }}
            >
              <canvas
                ref={canvasRef}
                width={760}
                height={420}
                style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
                onPointerDown={beginPathAt}
                onPointerMove={strokeTo}
                onPointerUp={endPath}
                onPointerCancel={endPath}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button variant="outlined" onClick={clearCanvas} size="small">
                Löschen
              </Button>
              <Button variant="contained" onClick={saveDrawing} size="small" disabled={!isReady}>
                Bild speichern
              </Button>
            </Box>
          </Box>
        )}

        {publishedTemplate.responseMode === 'questions-only' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button variant="contained" onClick={submitAnswers} disabled={submitting}>
              {submitting ? 'Sende...' : 'Als gesehen markieren'}
            </Button>
          </Box>
        )}

        {publishedTemplate.responseMode !== 'questions-only' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="contained"
              onClick={submitAnswers}
              disabled={
                submitting
                || (publishedTemplate.responseMode === 'photo-upload' && !photoDataUrl)
                || (publishedTemplate.responseMode === 'text-input' && !answers.some((entry) => entry.trim().length > 0))
              }
            >
              {submitting ? 'Sende...' : 'Antworten senden'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
