import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import PresentationSlideView from './PresentationSlideView';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  PresentationDeck,
  PresentationSlide,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  loadPresentationDeck,
  sortSlides,
} from '../../lib/presentationDeck';
import {
  findHomeworkSlides,
  presentationHomeworkAssignmentKey,
} from '../../lib/presentationSlideTemplates';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';
import { indeterminateLinearProgressSx } from '../../lib/muiLinearProgressSx';

type Props = {
  open: boolean;
  onClose: () => void;
  lessonPath: string;
  onUploadSuccess?: () => void;
};

type SubmissionInfo = {
  id: string;
  originalFileName: string;
  fileSize: number;
  fileType?: string;
  submittedAt: string;
  teacherComment?: string | null;
  commentedAt?: string | null;
};

function readAuthIds() {
  if (typeof window === 'undefined') return { studentId: '', teacherId: '' };
  return {
    studentId: localStorage.getItem('studentId') || localStorage.getItem('userId') || '',
    teacherId: localStorage.getItem('teacherId') || '',
  };
}

function friendlyError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/load failed|failed to fetch|networkerror|network request failed/i.test(msg)) {
    return 'Server nicht erreichbar. Bitte Seite neu laden oder App neu starten.';
  }
  return msg || fallback;
}

async function resolveTeacherIdForStudent(studentId: string): Promise<string | null> {
  const res = await fetch(`/api/learning-groups/student/${encodeURIComponent(studentId)}`);
  if (!res.ok) return null;
  const groups = await res.json();
  if (!Array.isArray(groups)) return null;
  for (const g of groups) {
    if (g?.teacher?.id) return g.teacher.id as string;
  }
  return null;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fileExt(name: string) {
  return String(name || '')
    .split('.')
    .pop()
    ?.toLowerCase() || '';
}

function isImageExt(ext: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
}

/**
 * SuS-Dashboard: ToDo-Modal mit Hausaufgabenfolie + Datei-Upload.
 */
export default function PresentationHomeworkTodoModal({
  open,
  onClose,
  lessonPath,
  onUploadSuccess,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(0.3);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [homeworkSlides, setHomeworkSlides] = useState<PresentationSlide[]>([]);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [studentId, setStudentId] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const slide = homeworkSlides[homeworkSlides.length - 1] ?? homeworkSlides[0] ?? null;
  const { fileName, filePath } = presentationHomeworkAssignmentKey(lessonPath);
  const submissionExt = fileExt(submission?.originalFileName || '');

  useLayoutEffect(() => {
    if (!open || !slide) return;
    const update = () => {
      const host = hostRef.current;
      if (!host) return;
      const w = host.clientWidth;
      if (w < 40) return;
      const next = w / SLIDE_REF_WIDTH;
      setScale((prev) => (Math.abs(prev - next) < 1e-4 ? prev : next));
    };
    update();
    const ro = new ResizeObserver(update);
    if (hostRef.current) ro.observe(hostRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [open, slide]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadPreview = useCallback(async (sub: SubmissionInfo) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/submissions/download/${sub.id}`);
      if (!response.ok) throw new Error('Vorschau fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const ensureAssignment = useCallback(async (): Promise<{
    assignmentId: string;
    studentId: string;
  } | null> => {
    const auth = readAuthIds();
    setStudentId(auth.studentId);

    if (!auth.studentId) {
      if (auth.teacherId) {
        setInfo('Vorschau (Lehrkraft): Die Folie siehst du hier. Upload geht nur als Schüler.');
        setError(null);
      } else {
        setError('Nicht als Schüler angemeldet.');
        setInfo(null);
      }
      return null;
    }

    let teacherId = await resolveTeacherIdForStudent(auth.studentId);
    if (!teacherId && auth.teacherId) teacherId = auth.teacherId;
    if (!teacherId) {
      setError('Kein Lehrer zur Lerngruppe gefunden. Bitte ab- und wieder anmelden.');
      return null;
    }

    const assignmentResponse = await fetch('/api/submissions/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, filePath, teacherId }),
    });
    if (!assignmentResponse.ok) {
      const errorData = await assignmentResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Aufgabe konnte nicht angelegt werden');
    }
    const assignmentData = await assignmentResponse.json();

    const checkResponse = await fetch(
      `/api/submissions/check?filePath=${encodeURIComponent(filePath)}&studentId=${encodeURIComponent(auth.studentId)}`
    );
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      const sub = checkData.hasSubmission ? (checkData.submission as SubmissionInfo) : null;
      setSubmission(sub);
      if (sub) void loadPreview(sub);
      else {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
    } else {
      setSubmission(null);
    }

    setAssignmentId(assignmentData.id);
    setError(null);
    setInfo(null);
    return { assignmentId: assignmentData.id as string, studentId: auth.studentId };
  }, [fileName, filePath, loadPreview]);

  useEffect(() => {
    if (!open || !lessonPath) return;
    let cancelled = false;
    setDeckLoading(true);
    setReady(false);
    setSelectedFile(null);
    setReplacing(false);
    setError(null);
    setInfo(null);
    setAssignmentId(null);
    setSubmission(null);
    setDeck(null);
    setHomeworkSlides([]);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    (async () => {
      try {
        const d = await loadPresentationDeck(lessonPath);
        if (cancelled) return;
        const slides = findHomeworkSlides(sortSlides(d.slides));
        setDeck(d);
        setHomeworkSlides(slides);
        if (slides.length === 0) {
          setError('In dieser Stunde ist keine Hausaufgabenfolie hinterlegt.');
          setReady(true);
          return;
        }
        await ensureAssignment();
      } catch (err) {
        if (!cancelled) setError(friendlyError(err, 'Hausaufgabe konnte nicht geladen werden'));
      } finally {
        if (!cancelled) {
          setDeckLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, lessonPath, ensureAssignment]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setError(null);
      let id = assignmentId;
      let sid = studentId;
      if (!id || !sid) {
        const ensured = await ensureAssignment();
        if (!ensured) return;
        id = ensured.assignmentId;
        sid = ensured.studentId;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assignmentId', id);
      formData.append('studentId', sid);

      const response = await fetch('/api/submissions/submit', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload fehlgeschlagen');
      }
      const submissionData = (await response.json()) as SubmissionInfo;
      setSubmission(submissionData);
      setSelectedFile(null);
      setReplacing(false);
      await loadPreview(submissionData);
      onUploadSuccess?.();
    } catch (err) {
      setError(friendlyError(err, 'Upload fehlgeschlagen'));
    } finally {
      setUploading(false);
    }
  };

  const handleViewSubmission = async () => {
    if (!submission) return;
    try {
      if (previewUrl) {
        window.open(previewUrl, '_blank');
        return;
      }
      const response = await fetch(`/api/submissions/download/${submission.id}`);
      if (!response.ok) throw new Error('Abgabe konnte nicht geladen werden');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (submissionExt === 'pdf' || isImageExt(submissionExt)) {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = submission.originalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      setError(friendlyError(err, 'Abgabe konnte nicht geöffnet werden'));
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submission || !studentId) return;
    if (!window.confirm('Möchtest du deine Abgabe wirklich löschen?')) return;
    try {
      const response = await fetch(`/api/submissions/submission/${submission.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      setSubmission(null);
      setReplacing(false);
      setSelectedFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      setError(friendlyError(err, 'Löschen fehlgeschlagen'));
    }
  };

  const canUpload = Boolean(assignmentId && studentId);
  const showUploadUi = canUpload && (!submission || replacing);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          width: 'min(1100px, 96vw)',
          maxWidth: '96vw',
        },
      }}
    >
      <DialogTitle
        sx={{
          ...dialogCloseTitleSx,
          bgcolor: JOHNNY_PRESENTATION.warm,
          color: '#fff',
          py: 1,
          px: 2,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
          ToDo · Hausaufgabe
        </Typography>
        <DialogCloseIconButton
          onClose={onClose}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 2, px: { xs: 1.5, sm: 2 } }}>
        {deckLoading && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <LinearProgress sx={indeterminateLinearProgressSx} />
            <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: '0.85rem' }}>
              Lade Hausaufgabe…
            </Typography>
          </Box>
        )}

        {!deckLoading && slide && deck && (
          <Box
            ref={hostRef}
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 1,
              border: '1px solid rgba(0,0,0,0.12)',
              bgcolor: '#fff',
              mb: 2,
              lineHeight: 0,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: SLIDE_REF_WIDTH,
                height: SLIDE_REF_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <PresentationSlideView
                slide={slide}
                scale={1}
                revealStep={999}
                revealEnabled={false}
                showSlideNumbers={deck.showSlideNumbers !== false}
                slideNumber={1}
                slideTotal={1}
                showSlideFooter={deck.showSlideFooter !== false}
                slideFooter={deck.slideFooter}
                deckTitle={deck.title ?? ''}
                lessonPath={deck.lessonPath ?? lessonPath}
                mediaInteractive={false}
              />
            </Box>
          </Box>
        )}

        {info && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {info}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {ready && !deckLoading && submission && (
          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              borderRadius: 1,
              bgcolor: '#e8f5e9',
              border: '1px solid #4caf50',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#2e7d32' }}>
                Deine Abgabe
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.8rem', mb: 0.25 }}>
              <strong>Datei:</strong> {submission.originalFileName}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', mb: 0.25 }}>
              <strong>Größe:</strong> {formatFileSize(submission.fileSize)}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', mb: 1 }}>
              <strong>Eingereicht:</strong> {formatDate(submission.submittedAt)}
            </Typography>

            {previewLoading && (
              <Box sx={{ py: 1.5 }}>
                <LinearProgress sx={indeterminateLinearProgressSx} />
              </Box>
            )}

            {!previewLoading && previewUrl && isImageExt(submissionExt) && (
              <Box
                sx={{
                  mb: 1.5,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.1)',
                  bgcolor: '#fafafa',
                  textAlign: 'center',
                }}
              >
                <Box
                  component="img"
                  src={previewUrl}
                  alt={submission.originalFileName}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 360,
                    objectFit: 'contain',
                    display: 'block',
                    mx: 'auto',
                  }}
                />
              </Box>
            )}

            {!previewLoading && previewUrl && submissionExt === 'pdf' && (
              <Box
                sx={{
                  mb: 1.5,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.1)',
                  height: { xs: 280, sm: 380 },
                  bgcolor: '#f5f5f5',
                }}
              >
                <Box
                  component="iframe"
                  title={submission.originalFileName}
                  src={previewUrl}
                  sx={{ width: '100%', height: '100%', border: 0 }}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                onClick={handleViewSubmission}
                sx={{ flex: '1 1 120px', fontSize: '0.75rem' }}
              >
                Anzeigen
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  setReplacing(true);
                  setSelectedFile(null);
                }}
                sx={{
                  flex: '1 1 120px',
                  fontSize: '0.75rem',
                  borderColor: JOHNNY_PRESENTATION.warm,
                  color: JOHNNY_PRESENTATION.warm,
                }}
              >
                Bearbeiten
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                onClick={handleDeleteSubmission}
                sx={{ flex: '1 1 120px', fontSize: '0.75rem' }}
              >
                Löschen
              </Button>
            </Box>

            {submission.teacherComment && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.25,
                  borderRadius: 1,
                  bgcolor: '#fff3e0',
                  border: '1px solid #ff9800',
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#e65100', mb: 0.5 }}>
                  Kommentar der Lehrkraft
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                  {submission.teacherComment}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {ready && !deckLoading && slide && showUploadUi && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {replacing && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                Neue Datei wählen — deine bisherige Abgabe wird ersetzt.
              </Typography>
            )}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
              onChange={handleFileSelect}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={!canUpload || uploading}
              sx={{
                alignSelf: 'flex-start',
                borderColor: JOHNNY_PRESENTATION.warm,
                color: JOHNNY_PRESENTATION.warm,
                fontWeight: 600,
                '&:hover': {
                  borderColor: JOHNNY_PRESENTATION.warm,
                  bgcolor: 'rgba(255,152,0,0.08)',
                },
              }}
            >
              {submission ? 'Neue Datei wählen' : 'Datei hochladen'}
            </Button>
            {selectedFile && (
              <>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                  Ausgewählt: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleUpload}
                    disabled={uploading || !canUpload}
                    startIcon={
                      uploading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <UploadIcon />
                      )
                    }
                    sx={{
                      bgcolor: JOHNNY_PRESENTATION.warm,
                      '&:hover': { bgcolor: '#F57C00' },
                      fontWeight: 600,
                    }}
                  >
                    {uploading
                      ? 'Wird hochgeladen…'
                      : submission
                        ? 'Abgabe ersetzen'
                        : 'Abgabe absenden'}
                  </Button>
                  {replacing && (
                    <Button
                      size="small"
                      variant="text"
                      disabled={uploading}
                      onClick={() => {
                        setReplacing(false);
                        setSelectedFile(null);
                      }}
                    >
                      Abbrechen
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
