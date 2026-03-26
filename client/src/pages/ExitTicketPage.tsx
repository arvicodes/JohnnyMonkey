import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  ButtonBase,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon, Close as CloseIcon } from '@mui/icons-material';
import { apiGet, apiPost } from '../lib/api';

type ExitTicketTemplateType = 'feedback' | 'quick-check' | 'transfer' | 'draw';

type ExitTicketTemplate = {
  id: ExitTicketTemplateType;
  title: string;
  description: string;
  questions: string[];
};

type CollectedExitTicketResponse = {
  studentId: string;
  studentName: string;
  answers: string[];
  drawingDataUrl?: string;
  submittedAt: string;
};

const EXIT_TICKET_STORAGE_KEY = 'activeExitTicketTemplateV1';

const TEMPLATE_IMAGE_SRC: Record<ExitTicketTemplateType, string> = {
  feedback: '/exit-ticket/exit-ticket-feedback.svg',
  'quick-check': '/exit-ticket/exit-ticket-quick-check.svg',
  transfer: '/exit-ticket/exit-ticket-transfer.svg',
  draw: '/exit-ticket/exit-ticket-draw.svg',
};

const FEEDBACK_TEMPLATE: ExitTicketTemplate = {
  id: 'feedback',
  title: '3-Fragen-Feedback',
  description: 'Reflexion zur Stunde aus Sicht der SuS.',
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
  questions: [
    'Zeichne ein Bild, das deine wichtigste Idee aus der Stunde zeigt.',
    'Beschrifte mindestens 1 Teil deiner Zeichnung.',
    'Schreibe 1 Satz dazu: „Das bedeutet für mich …“',
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
  const [quickCheckTopic, setQuickCheckTopic] = useState('');
  const [publishedTemplate, setPublishedTemplate] = useState<ExitTicketTemplate | null>(parseStoredTemplate());
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [responses, setResponses] = useState<CollectedExitTicketResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const template = params.get('template');
    const allowed: ExitTicketTemplateType[] = ['feedback', 'quick-check', 'transfer', 'draw'];
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
        setPublishedTemplate(data?.template ?? null);
      } catch {
        if (mounted) {
          // Fallback for existing local state in case API is temporarily unavailable.
          setPublishedTemplate(parseStoredTemplate());
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

    const templateOrder: ExitTicketTemplateType[] = ['feedback', 'quick-check', 'transfer', 'draw'];

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
    if (selectedType === 'feedback') return FEEDBACK_TEMPLATE;
    if (selectedType === 'quick-check') return buildQuickCheckTemplate(quickCheckTopic);
    if (selectedType === 'draw') return DRAW_TEMPLATE;
    return TRANSFER_TEMPLATE;
  }, [selectedType, quickCheckTopic]);

  const publishTemplate = async () => {
    setPublishing(true);
    try {
      const response = await apiPost('/api/exit-ticket/publish', { template: selectedTemplate });
      if (!response.ok) throw new Error('Veröffentlichen fehlgeschlagen');
      localStorage.setItem(EXIT_TICKET_STORAGE_KEY, JSON.stringify(selectedTemplate));
      setPublishedTemplate(selectedTemplate);
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
  ];

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
                        onClick={() => setSelectedType(card.id)}
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

                {selectedType === 'quick-check' && (
                  <TextField
                    size="small"
                    label="Thema für automatische Fragen"
                    placeholder="z. B. Alan Turing und Enigma"
                    value={quickCheckTopic}
                    onChange={(e) => setQuickCheckTopic(e.target.value)}
                  />
                )}

                <Card variant="outlined" sx={{ bgcolor: '#f0f7ff' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.6, flexWrap: 'wrap', mt: 0.6 }}>
                      <Box sx={{ flex: 1, minWidth: 260, pt: 0.3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5, lineHeight: 1.15 }}>
                          Vorschau: {renderWithBoldOperators(selectedTemplate.title, `prev-title-${selectedTemplate.id}`)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1.2 }}>
                          {renderWithBoldOperators(selectedTemplate.description, `prev-desc-${selectedTemplate.id}`)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: { xs: '100%', sm: 220 },
                          maxWidth: '100%',
                          height: { xs: 140, sm: 128 },
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
                          src={TEMPLATE_IMAGE_SRC[selectedTemplate.id]}
                          alt={selectedTemplate.title}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </Box>
                    </Box>
                    {selectedTemplate.questions.map((question, index) => (
                      <Typography key={`${selectedTemplate.id}-${index}`} variant="body1" sx={{ mb: 0.5 }}>
                        {index + 1}. {renderWithBoldOperators(question, `prev-q-${selectedTemplate.id}-${index}`)}
                      </Typography>
                    ))}
                  </CardContent>
                </Card>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    onClick={publishTemplate}
                    disabled={publishing}
                  >
                    Für SuS freigeben
                  </Button>
                </Box>

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
                              {item.drawingDataUrl && (
                                <Box
                                  component="img"
                                  src={item.drawingDataUrl}
                                  alt={`Zeichnung von ${item.studentName}`}
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
  }, [publishedTemplate.id]);

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
    setSubmitting(true);
    try {
      const drawingDataUrl = publishedTemplate.id === 'draw' ? canvasRef.current?.toDataURL('image/png') : undefined;
      const response = await apiPost('/api/exit-ticket/submit', {
        answers,
        drawingDataUrl,
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
          </Box>
        ))}

        {publishedTemplate.id === 'draw' && (
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button variant="contained" onClick={submitAnswers} disabled={submitting}>
            {submitting ? 'Sende...' : 'Antworten senden'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
