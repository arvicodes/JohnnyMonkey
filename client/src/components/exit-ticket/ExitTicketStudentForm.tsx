import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import {
  EditNote as EditNoteIcon,
  PhotoCamera as PhotoCameraIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import { apiPost } from '../../lib/api';
import { TICKET_HERO_IMAGE_SRC } from '../../lib/ticketHeroImages';

/** Gleiche Optik wie Lehrer-Vorschau: drei Modus-Icons — für SuS wählbar */
function StudentResponseModePicker(props: {
  mode: ExitTicketResponseMode;
  onChange: (next: ExitTicketResponseMode) => void;
}) {
  const { mode, onChange } = props;
  const btn = (m: ExitTicketResponseMode, icon: React.ReactNode, title: string, label: string) => (
    <Tooltip title={title}>
      <IconButton
        size="small"
        onClick={() => onChange(m)}
        aria-label={label}
        aria-pressed={mode === m}
        sx={{
          p: 0.25,
          minWidth: 28,
          width: 28,
          height: 28,
          color: mode === m ? 'primary.contrastText' : 'action.active',
          bgcolor: mode === m ? 'primary.main' : 'transparent',
          '&:hover': {
            bgcolor: mode === m ? 'primary.dark' : 'action.hover',
          },
        }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap', mb: 3, mt: 0.5 }}>
      {btn('questions-only', <QuizIcon sx={{ fontSize: 18 }} />, 'Nur Fragen anzeigen', 'Nur Fragen anzeigen')}
      {btn('text-input', <EditNoteIcon sx={{ fontSize: 18 }} />, 'Antworten eingeben', 'Antworten eingeben')}
      {btn('photo-upload', <PhotoCameraIcon sx={{ fontSize: 18 }} />, 'Antworten fotografieren', 'Antworten fotografieren')}
    </Box>
  );
}

export type ExitTicketTemplateType =
  | 'feedback'
  | 'quick-check'
  | 'transfer'
  | 'draw'
  | 'error-hunt'
  | 'exam-question'
  | 'prediction';

export type ExitTicketResponseMode = 'questions-only' | 'text-input' | 'photo-upload';

export type ExitTicketTemplate = {
  id: ExitTicketTemplateType;
  title: string;
  description: string;
  questions: string[];
  responseMode: ExitTicketResponseMode;
};

/**
 * Karten-/Header-Motiv pro Vorlage (links in Dialogen, Kachel-Vorschau).
 */
export const EXIT_TICKET_CARD_IMAGE_SRC: Record<ExitTicketTemplateType, string> = {
  feedback: '/exit-ticket/exit-ticket-feedback.svg',
  'quick-check': '/exit-ticket/exit-ticket-quick-check.svg',
  transfer: '/exit-ticket/exit-ticket-transfer.svg',
  draw: '/exit-ticket/exit-ticket-draw.svg',
  'error-hunt': '/exit-ticket/exit-ticket-error-hunt.svg',
  'exam-question': '/exit-ticket/exit-ticket-exam-question.svg',
  prediction: '/exit-ticket/exit-ticket-prediction.svg',
};

/** Rechtes Motiv: dasselbe Naturbild-Set wie Entry-Ticket (`public/entry-ticket/`) */
export const TEMPLATE_IMAGE_SRC: Record<ExitTicketTemplateType, string> = {
  feedback: TICKET_HERO_IMAGE_SRC,
  'quick-check': TICKET_HERO_IMAGE_SRC,
  transfer: TICKET_HERO_IMAGE_SRC,
  draw: TICKET_HERO_IMAGE_SRC,
  'error-hunt': TICKET_HERO_IMAGE_SRC,
  'exam-question': TICKET_HERO_IMAGE_SRC,
  prediction: TICKET_HERO_IMAGE_SRC,
};

export const withTemplateDefaults = (template: ExitTicketTemplate | null | undefined): ExitTicketTemplate | null => {
  if (!template) return null;
  return {
    ...template,
    responseMode: template.responseMode ?? 'questions-only',
  };
};

/** Imperativ / Aufforderungswörter in Aufgaben — nur diese werden hervorgehoben, der Rest bleibt normal. */
const OPERATOR_WORDS = [
  'Erkläre',
  'Nenne',
  'Beschreibe',
  'Formuliere',
  'Zeichne',
  'Male',
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
  'Vergleiche',
  'Ordne',
  'Wähle',
  'Unterstreiche',
  'Markiere',
  'Beantworte',
  'Antworte',
  'Notiere',
  'Überlege',
  'Beurteile',
  'Bestimme',
  'Rechne',
  'Lies',
  'Lese',
  'Analysiere',
  'Stelle',
  'Kreuze',
  'Entscheide',
  'Vervollständige',
  'Ergänze',
];

export const renderWithBoldOperators = (text: string, keyPrefix: string) => {
  const escapedWords = OPERATOR_WORDS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isOperatorWord = OPERATOR_WORDS.some((word) => word.toLowerCase() === part.toLowerCase());
    return (
      <Box
        component="span"
        key={`${keyPrefix}-${index}`}
        sx={isOperatorWord ? { fontWeight: 700 } : { fontWeight: 400 }}
      >
        {part}
      </Box>
    );
  });
};

export type ExitTicketSubmitMeta = { teacherId: string; lessonPath: string };

export function StudentExitTicketRender(props: {
  publishedTemplate: ExitTicketTemplate;
  TEMPLATE_IMAGE_SRC: Record<ExitTicketTemplateType, string>;
  onSubmitted: () => void;
  /** Von GET /api/exit-ticket/current — nötig, damit Submit dieselbe Zeile trifft (gruppenspezifisch) */
  submitMeta?: ExitTicketSubmitMeta | null;
  /** Titel bereits im umgebenden Dialog → kein zweites Mal */
  omitTitle?: boolean;
  /** Gleiches Motiv wie Entry-Ticket (heroImageIndex → entry-ticket/entry-NN.jpg) */
  heroImageSrc?: string;
}) {
  const { publishedTemplate, TEMPLATE_IMAGE_SRC: imageSrc, onSubmitted, submitMeta, omitTitle = false, heroImageSrc } =
    props;
  const sideImageSrc = heroImageSrc ?? imageSrc[publishedTemplate.id];
  const studentId = localStorage.getItem('studentId') || localStorage.getItem('userId') || 'guest';
  const drawStorageKey = `exitTicketResponse_draw_${studentId}_v1`;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const questionRefs = useRef<Array<HTMLElement | null>>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [responseMode, setResponseMode] = useState<ExitTicketResponseMode>(
    publishedTemplate.responseMode ?? 'questions-only',
  );

  useEffect(() => {
    setResponseMode(publishedTemplate.responseMode ?? 'questions-only');
  }, [publishedTemplate.id, publishedTemplate.responseMode]);

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

      const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = Math.min(
        publishedTemplate.questions.length - 1,
        Math.max(0, activeQuestionIndex + delta),
      );
      if (nextIndex === activeQuestionIndex) return;

      e.preventDefault();
      setActiveQuestionIndex(nextIndex);

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
      // ignore
    }
  };

  const submitAnswers = async () => {
    if (responseMode === 'text-input') {
      const hasAnyText = answers.some((entry) => entry.trim().length > 0);
      if (!hasAnyText) return;
    }

    if (responseMode === 'photo-upload' && !photoDataUrl) return;

    setSubmitting(true);
    try {
      const drawingDataUrl = publishedTemplate.id === 'draw' ? canvasRef.current?.toDataURL('image/png') : undefined;
      const body: Record<string, unknown> = {
        answers: responseMode === 'text-input' ? answers : [],
        drawingDataUrl,
        photoDataUrl: responseMode === 'photo-upload' ? photoDataUrl : undefined,
        completionOnly: responseMode === 'questions-only',
      };
      if (submitMeta?.teacherId && submitMeta.lessonPath) {
        body.teacherId = submitMeta.teacherId;
        body.lessonPath = submitMeta.lessonPath;
      }
      const response = await apiPost('/api/exit-ticket/submit', body);
      if (!response.ok) throw new Error('Speichern fehlgeschlagen');
      if (drawingDataUrl) {
        localStorage.setItem(drawStorageKey, drawingDataUrl);
      }
      const gm = submitMeta?.lessonPath?.match(/^__exit_ticket_g_(.+?)__$/);
      if (gm?.[1]) {
        window.dispatchEvent(
          new CustomEvent('exit-ticket-my-submission-changed', { detail: { groupId: gm[1] } }),
        );
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
    <Card
      elevation={0}
      variant="outlined"
      sx={{
        bgcolor: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ pt: 0, px: 0, pb: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ mb: 0 }}>
          {!omitTitle && (
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75, lineHeight: 1.25, color: 'text.primary' }}>
              {renderWithBoldOperators(publishedTemplate.title, `stud-title-${publishedTemplate.id}`)}
            </Typography>
          )}
          {publishedTemplate.description.trim() ? (
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.65, fontSize: '1.02rem' }}
            >
              {renderWithBoldOperators(publishedTemplate.description, `stud-desc-${publishedTemplate.id}`)}
            </Typography>
          ) : null}
          <StudentResponseModePicker mode={responseMode} onChange={setResponseMode} />
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 3,
            alignItems: 'flex-start',
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 0, order: { xs: 1, sm: 1 } }}>
            {publishedTemplate.questions.map((question, index) => (
              <Box
                key={`${publishedTemplate.id}-${index}`}
                ref={(el: HTMLElement | null) => {
                  questionRefs.current[index] = el;
                }}
                sx={{
                  scrollMarginTop: 110,
                  mb: { xs: 3.25, sm: 4 },
                  py: { xs: 2.75, sm: 3.5 },
                  px: { xs: 2.25, sm: 3 },
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.97)' : 'rgba(248, 250, 252, 0.98)',
                  border: '1px solid',
                  borderColor: index === activeQuestionIndex ? 'primary.light' : 'divider',
                  boxShadow:
                    index === activeQuestionIndex
                      ? '0 10px 40px rgba(25, 118, 210, 0.16), 0 4px 16px rgba(15, 23, 42, 0.06)'
                      : '0 6px 28px rgba(15, 23, 42, 0.07)',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 7,
                    borderRadius: '14px 0 0 14px',
                    background:
                      index === activeQuestionIndex
                        ? 'linear-gradient(180deg, #1565c0 0%, #42a5f5 100%)'
                        : 'linear-gradient(180deg, #1976d2 0%, #64b5f6 100%)',
                    opacity: index === activeQuestionIndex ? 1 : 0.85,
                  },
                }}
              >
                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2.25 }, alignItems: 'flex-start', pl: 0.5 }}>
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: { xs: 40, sm: 44 },
                      height: { xs: 40, sm: 44 },
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: { xs: '1.05rem', sm: '1.15rem' },
                      color: 'primary.contrastText',
                      background: 'linear-gradient(145deg, #1565c0 0%, #42a5f5 55%, #90caf9 100%)',
                      boxShadow: '0 6px 18px rgba(25, 118, 210, 0.35)',
                      border: '2px solid rgba(255,255,255,0.85)',
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{
                        fontWeight: 500,
                        fontSize: { xs: '1.18rem', sm: '1.35rem' },
                        lineHeight: 1.55,
                        color: 'text.primary',
                        mb: responseMode === 'text-input' ? 1.75 : 0,
                        letterSpacing: 0.01,
                      }}
                    >
                      {renderWithBoldOperators(question, `stud-q-${publishedTemplate.id}-${index}`)}
                    </Typography>
                    {responseMode === 'text-input' && (
                      <TextField
                        multiline
                        minRows={4}
                        fullWidth
                        placeholder="Deine Antwort …"
                        value={answers[index] ?? ''}
                        onChange={(e) => {
                          const next = [...answers];
                          next[index] = e.target.value;
                          setAnswers(next);
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.95)',
                            fontSize: '1.02rem',
                            lineHeight: 1.55,
                            borderRadius: 2,
                          },
                          '& .MuiInputBase-input': { py: 1.5 },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              width: { xs: '100%', sm: 260 },
              flexShrink: 0,
              order: { xs: 2, sm: 2 },
              alignSelf: 'flex-start',
            }}
          >
            <Box
              sx={{
                position: { sm: 'sticky' },
                top: { sm: 8 },
                borderRadius: 2.5,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#fff',
                aspectRatio: '16 / 10',
                maxHeight: { sm: 280 },
                boxShadow: '0 8px 28px rgba(15, 23, 42, 0.1)',
              }}
            >
              <Box
                component="img"
                src={sideImageSrc}
                alt={publishedTemplate.title}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
          </Box>
        </Box>

        {responseMode === 'photo-upload' && (
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

        {publishedTemplate.id === 'draw' && responseMode === 'text-input' && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.25, color: 'primary.dark', letterSpacing: 0.2 }}>
              Deine Leinwand
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, maxWidth: 720 }}>
              Nutze die Fläche unten für deine Zeichnung zur Stunde — sie wird mit deiner Abgabe gesendet.
            </Typography>
            <Box
              sx={{
                border: '2px solid',
                borderColor: 'primary.light',
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#fff',
                width: '100%',
                maxWidth: 920,
                mx: 'auto',
                boxShadow: '0 12px 48px rgba(25, 118, 210, 0.12), inset 0 0 0 1px rgba(255,255,255,0.6)',
              }}
            >
              <canvas
                ref={canvasRef}
                width={920}
                height={480}
                style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
                onPointerDown={beginPathAt}
                onPointerMove={strokeTo}
                onPointerUp={endPath}
                onPointerCancel={endPath}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
              <Button variant="outlined" onClick={clearCanvas} size="small">
                Löschen
              </Button>
              <Button variant="contained" onClick={saveDrawing} size="small" disabled={!isReady}>
                Bild speichern
              </Button>
            </Box>
          </Box>
        )}

        {responseMode === 'questions-only' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
            <Button variant="contained" onClick={submitAnswers} disabled={submitting}>
              {submitting ? 'Sende...' : 'Als gesehen markieren'}
            </Button>
          </Box>
        )}

        {responseMode !== 'questions-only' && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
            <Button
              variant="contained"
              onClick={submitAnswers}
              disabled={
                submitting
                || (responseMode === 'photo-upload' && !photoDataUrl)
                || (responseMode === 'text-input' && !answers.some((entry) => entry.trim().length > 0))
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
