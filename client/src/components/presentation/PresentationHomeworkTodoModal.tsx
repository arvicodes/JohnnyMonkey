import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
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

type PendingFile = {
  localId: string;
  file: File;
  displayName: string;
  localUrl: string | null;
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
  return (
    String(name || '')
      .split('.')
      .pop()
      ?.toLowerCase() || ''
  );
}

function isImageExt(ext: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
}

function isImageSubmission(sub: { originalFileName: string; fileType?: string }) {
  return isImageExt(fileExt(sub.originalFileName)) || Boolean(sub.fileType?.startsWith('image/'));
}

function isPdfSubmission(sub: { originalFileName: string; fileType?: string }) {
  return fileExt(sub.originalFileName) === 'pdf' || Boolean(sub.fileType?.includes('pdf'));
}

function stripExt(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

function withExt(base: string, fromFileName: string) {
  const ext = pathExt(fromFileName);
  const clean = base.trim() || stripExt(fromFileName) || 'Abgabe';
  if (!ext) return clean;
  return pathExt(clean) ? clean : `${clean}${ext.startsWith('.') ? ext : `.${ext}`}`;
}

function pathExt(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i) : '';
}

function newLocalId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * SuS-Dashboard: ToDo-Modal mit Hausaufgabenfolie + Mehrfach-Upload.
 */
export default function PresentationHomeworkTodoModal({
  open,
  onClose,
  lessonPath,
  onUploadSuccess,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGenRef = useRef(0);
  const pendingUploadSuccessRef = useRef(false);
  const onUploadSuccessRef = useRef(onUploadSuccess);
  onUploadSuccessRef.current = onUploadSuccess;
  const thumbUrlsRef = useRef<Record<string, string>>({});

  const [scale, setScale] = useState(0);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [homeworkSlides, setHomeworkSlides] = useState<PresentationSlide[]>([]);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [studentId, setStudentId] = useState('');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{
    title: string;
    url: string;
    kind: 'image' | 'pdf' | 'other';
  } | null>(null);

  const slide = homeworkSlides[homeworkSlides.length - 1] ?? homeworkSlides[0] ?? null;
  const { fileName, filePath } = presentationHomeworkAssignmentKey(lessonPath);
  const canUpload = Boolean(assignmentId && studentId);

  const revokeThumb = useCallback((id: string) => {
    const url = thumbUrlsRef.current[id];
    if (url) {
      URL.revokeObjectURL(url);
      delete thumbUrlsRef.current[id];
    }
  }, []);

  const setThumb = useCallback((id: string, url: string | null) => {
    setThumbs((prev) => {
      const next = { ...prev };
      if (prev[id]) {
        URL.revokeObjectURL(prev[id]);
        delete thumbUrlsRef.current[id];
      }
      if (url) {
        next[id] = url;
        thumbUrlsRef.current[id] = url;
      } else {
        delete next[id];
      }
      return next;
    });
  }, []);

  const loadThumb = useCallback(
    async (sub: SubmissionInfo) => {
      if (!isImageSubmission(sub) && !isPdfSubmission(sub)) return;
      try {
        const response = await fetch(`/api/submissions/download/${sub.id}`);
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setThumb(sub.id, url);
      } catch {
        /* ignore */
      }
    },
    [setThumb]
  );

  const isLoadCurrent = useCallback((gen: number) => gen === loadGenRef.current, []);

  const ensureAssignment = useCallback(
    async (
      gen?: number
    ): Promise<{
      assignmentId: string;
      studentId: string;
    } | null> => {
      const activeGen = gen ?? loadGenRef.current;
      const stillOk = () => isLoadCurrent(activeGen);

      const auth = readAuthIds();
      if (stillOk()) setStudentId(auth.studentId);

      if (!auth.studentId) {
        if (!stillOk()) return null;
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
      if (!stillOk()) return null;
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
      if (!stillOk()) return null;
      if (!assignmentResponse.ok) {
        const errorData = await assignmentResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Aufgabe konnte nicht angelegt werden');
      }
      const assignmentData = await assignmentResponse.json();
      if (!stillOk()) return null;

      const checkResponse = await fetch(
        `/api/submissions/check?filePath=${encodeURIComponent(filePath)}&studentId=${encodeURIComponent(auth.studentId)}`
      );
      if (!stillOk()) return null;
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (!stillOk()) return null;
        const list: SubmissionInfo[] = Array.isArray(checkData.submissions)
          ? checkData.submissions
          : checkData.hasSubmission && checkData.submission
            ? [checkData.submission]
            : [];
        setSubmissions(list);
        list.forEach((s) => void loadThumb(s));
      } else if (stillOk()) {
        setSubmissions([]);
      }

      if (!stillOk()) return null;
      setAssignmentId(assignmentData.id);
      setError(null);
      setInfo(null);
      return { assignmentId: assignmentData.id as string, studentId: auth.studentId };
    },
    [fileName, filePath, loadThumb, isLoadCurrent]
  );

  const ensureAssignmentRef = useRef(ensureAssignment);
  ensureAssignmentRef.current = ensureAssignment;

  useLayoutEffect(() => {
    if (!open || !slide || deckLoading) return;
    const update = () => {
      const host = hostRef.current;
      if (!host) return;
      const w = host.clientWidth;
      if (w < 40) return;
      const next = w / SLIDE_REF_WIDTH;
      setScale((prev) => (Math.abs(prev - next) < 1e-4 ? prev : next));
    };
    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });
    const ro = new ResizeObserver(update);
    if (hostRef.current) ro.observe(hostRef.current);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [open, slide, deckLoading]);

  useEffect(() => {
    if (!open || !lessonPath) return;
    const gen = ++loadGenRef.current;
    pendingUploadSuccessRef.current = false;
    setDeckLoading(true);
    setReady(false);
    setPendingFiles((prev) => {
      prev.forEach((p) => {
        if (p.localUrl) URL.revokeObjectURL(p.localUrl);
      });
      return [];
    });
    setError(null);
    setInfo(null);
    setAssignmentId(null);
    setSubmissions([]);
    setViewer(null);
    Object.keys(thumbUrlsRef.current).forEach(revokeThumb);
    setThumbs({});
    setDeck(null);
    setHomeworkSlides([]);

    (async () => {
      try {
        const d = await loadPresentationDeck(lessonPath);
        if (!isLoadCurrent(gen)) return;
        const slides = findHomeworkSlides(sortSlides(d.slides));
        setDeck(d);
        setHomeworkSlides(slides);
        if (slides.length === 0) {
          setError('In dieser Stunde ist keine Hausaufgabenfolie hinterlegt.');
          setReady(true);
          return;
        }
        await ensureAssignmentRef.current(gen);
      } catch (err) {
        if (isLoadCurrent(gen)) setError(friendlyError(err, 'Hausaufgabe konnte nicht geladen werden'));
      } finally {
        if (isLoadCurrent(gen)) {
          setDeckLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      if (loadGenRef.current === gen) loadGenRef.current += 1;
    };
  }, [open, lessonPath, isLoadCurrent, revokeThumb]);

  useEffect(() => {
    return () => {
      Object.keys(thumbUrlsRef.current).forEach((id) => {
        const url = thumbUrlsRef.current[id];
        if (url) URL.revokeObjectURL(url);
      });
      thumbUrlsRef.current = {};
    };
  }, []);

  const handleClose = useCallback(() => {
    if (uploading) return;
    if (pendingUploadSuccessRef.current) {
      pendingUploadSuccessRef.current = false;
      onUploadSuccessRef.current?.();
    }
    onClose();
  }, [uploading, onClose]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    setPendingFiles((prev) => [
      ...prev,
      ...files.map((file) => {
        const localUrl =
          file.type.startsWith('image/') || file.type === 'application/pdf'
            ? URL.createObjectURL(file)
            : null;
        return {
          localId: newLocalId(),
          file,
          displayName: stripExt(file.name) || 'Abgabe',
          localUrl,
        };
      }),
    ]);
  };

  const updatePendingName = (localId: string, displayName: string) => {
    setPendingFiles((prev) => prev.map((p) => (p.localId === localId ? { ...p, displayName } : p)));
  };

  const removePending = (localId: string) => {
    setPendingFiles((prev) => {
      const item = prev.find((p) => p.localId === localId);
      if (item?.localUrl) URL.revokeObjectURL(item.localUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) return;
    try {
      setUploading(true);
      setError(null);
      let id = assignmentId;
      let sid = studentId;
      if (!id || !sid) {
        const ensured = await ensureAssignmentRef.current(loadGenRef.current);
        if (!ensured) return;
        id = ensured.assignmentId;
        sid = ensured.studentId;
      }

      loadGenRef.current += 1;
      const uploaded: SubmissionInfo[] = [];
      const keepLocalUrls = new Set<string>();

      for (const pending of pendingFiles) {
        const formData = new FormData();
        formData.append('file', pending.file);
        formData.append('assignmentId', id);
        formData.append('studentId', sid);
        formData.append('displayName', withExt(pending.displayName, pending.file.name));
        formData.append('allowMultiple', 'true');

        const response = await fetch('/api/submissions/submit', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Upload fehlgeschlagen: ${pending.displayName}`);
        }
        const raw = await response.json();
        if (!raw?.id) throw new Error('Upload-Antwort ohne Abgabe-ID');
        const submissionData: SubmissionInfo = {
          id: String(raw.id),
          originalFileName: raw.originalFileName || withExt(pending.displayName, pending.file.name),
          fileSize: typeof raw.fileSize === 'number' ? raw.fileSize : pending.file.size,
          fileType: raw.fileType || pending.file.type,
          submittedAt: raw.submittedAt || new Date().toISOString(),
          teacherComment: raw.teacherComment ?? null,
          commentedAt: raw.commentedAt ?? null,
        };
        uploaded.push(submissionData);
        if (pending.localUrl && (isImageSubmission(submissionData) || isPdfSubmission(submissionData))) {
          setThumb(submissionData.id, pending.localUrl);
          keepLocalUrls.add(pending.localUrl);
        } else {
          void loadThumb(submissionData);
        }
      }

      setSubmissions((prev) => [...uploaded, ...prev]);
      setPendingFiles((prev) => {
        prev.forEach((p) => {
          if (p.localUrl && !keepLocalUrls.has(p.localUrl)) URL.revokeObjectURL(p.localUrl);
        });
        return [];
      });
      setReady(true);
      pendingUploadSuccessRef.current = true;
    } catch (err) {
      setError(friendlyError(err, 'Upload fehlgeschlagen'));
    } finally {
      setUploading(false);
    }
  };

  const openViewerForSubmission = async (sub: SubmissionInfo) => {
    try {
      const existing = thumbs[sub.id];
      let url = existing;
      if (!url) {
        const response = await fetch(`/api/submissions/download/${sub.id}`);
        if (!response.ok) throw new Error('Datei konnte nicht geladen werden');
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        if (isImageSubmission(sub) || isPdfSubmission(sub)) setThumb(sub.id, url);
      }
      const kind = isImageSubmission(sub) ? 'image' : isPdfSubmission(sub) ? 'pdf' : 'other';
      if (kind === 'other') {
        const link = document.createElement('a');
        link.href = url;
        link.download = sub.originalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      setViewer({ title: sub.originalFileName, url, kind });
    } catch (err) {
      setError(friendlyError(err, 'Datei konnte nicht geöffnet werden'));
    }
  };

  const openViewerForPending = (p: PendingFile) => {
    if (!p.localUrl) return;
    const kind = p.file.type.startsWith('image/')
      ? 'image'
      : p.file.type === 'application/pdf' || fileExt(p.file.name) === 'pdf'
        ? 'pdf'
        : 'other';
    if (kind === 'other') return;
    setViewer({
      title: withExt(p.displayName, p.file.name),
      url: p.localUrl,
      kind,
    });
  };

  const renderMini = (
    url: string | null | undefined,
    kind: 'image' | 'pdf' | 'other',
    onOpen?: () => void
  ) => (
    <Box
      onClick={onOpen}
      sx={{
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 0.75,
        border: '1px solid rgba(0,0,0,0.12)',
        bgcolor: '#f5f5f5',
        overflow: 'hidden',
        cursor: onOpen ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url && kind === 'image' ? (
        <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : url && kind === 'pdf' ? (
        <Box
          component="iframe"
          src={url}
          title="pdf"
          sx={{
            width: '200%',
            height: '200%',
            border: 0,
            pointerEvents: 'none',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
          }}
        />
      ) : (
        <FileIcon sx={{ color: '#90a4ae', fontSize: 16 }} />
      )}
    </Box>
  );

  const miniIconBtnSx = {
    p: 0.25,
    width: 22,
    height: 22,
    '& .MuiSvgIcon-root': { fontSize: 14 },
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={(_e, reason) => {
          if (uploading) return;
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') handleClose();
        }}
        disableEscapeKeyDown={uploading}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: 'min(2016px, 98vw)',
            maxWidth: '98vw',
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
            onClose={handleClose}
            disabled={uploading}
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

          {!deckLoading && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                alignItems: 'stretch',
              }}
            >
              {slide && deck && (
                <Box
                  ref={hostRef}
                  sx={{
                    flex: { xs: '1 1 auto', md: '1 1 62%' },
                    width: { xs: '100%', md: '62%' },
                    maxWidth: { md: '62%' },
                    aspectRatio: '16 / 9',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 1,
                    border: '1px solid rgba(0,0,0,0.12)',
                    bgcolor: '#111',
                    lineHeight: 0,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: SLIDE_REF_WIDTH,
                      height: SLIDE_REF_HEIGHT,
                      transform: `scale(${scale || 0.01})`,
                      transformOrigin: 'top left',
                      visibility: scale > 0.01 ? 'visible' : 'hidden',
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

              <Box
                sx={{
                  flex: { xs: '1 1 auto', md: '1 1 38%' },
                  width: { xs: '100%', md: '38%' },
                  minWidth: { md: 280 },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: { md: 'min(78vh, 720px)' },
                  overflow: 'auto',
                }}
              >
                {info && (
                  <Alert severity="info" sx={{ py: 0.25, fontSize: '0.75rem' }}>
                    {info}
                  </Alert>
                )}
                {error && (
                  <Alert severity="error" sx={{ py: 0.25, fontSize: '0.75rem' }}>
                    {error}
                  </Alert>
                )}

                {ready && canUpload && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.75,
                      p: 1,
                      borderRadius: 1,
                      border: '1px dashed rgba(0,0,0,0.22)',
                      bgcolor: 'rgba(255,152,0,0.05)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, flex: 1 }}>
                        {submissions.length > 0 ? 'Weitere Dateien' : 'Hochladen'}
                      </Typography>
                      <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                        onChange={handleFileSelect}
                      />
                      <Button
                        type="button"
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        disabled={uploading}
                        sx={{
                          minHeight: 28,
                          minWidth: 0,
                          py: 0.25,
                          px: 0.55,
                          fontSize: '0.72rem',
                          bgcolor: JOHNNY_PRESENTATION.warm,
                          fontWeight: 600,
                          '& .MuiButton-startIcon': { mr: 0.2, ml: -0.25 },
                          '&:hover': { bgcolor: '#F57C00' },
                        }}
                      >
                        Wählen
                      </Button>
                    </Box>

                    {pendingFiles.length > 0 && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {pendingFiles.map((p) => {
                          const kind = p.file.type.startsWith('image/')
                            ? 'image'
                            : p.file.type === 'application/pdf' || fileExt(p.file.name) === 'pdf'
                              ? 'pdf'
                              : 'other';
                          return (
                            <Box
                              key={p.localId}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                p: 0.75,
                                borderRadius: 1,
                                bgcolor: '#fff',
                                border: '1px solid',
                                borderColor: JOHNNY_PRESENTATION.warm,
                              }}
                            >
                              {renderMini(
                                p.localUrl,
                                kind,
                                p.localUrl ? () => openViewerForPending(p) : undefined
                              )}
                              <TextField
                                size="small"
                                fullWidth
                                label="Name"
                                value={p.displayName}
                                onChange={(e) => updatePendingName(p.localId, e.target.value)}
                                helperText={withExt(p.displayName, p.file.name)}
                                FormHelperTextProps={{
                                  sx: {
                                    fontSize: '0.62rem',
                                    mx: 0,
                                    mt: 0.15,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  },
                                }}
                                inputProps={{ maxLength: 120 }}
                                sx={{
                                  '& .MuiInputBase-root': { bgcolor: '#fffde7' },
                                  '& .MuiInputBase-input': { fontSize: '0.8rem', fontWeight: 600, py: 0.6 },
                                  '& .MuiInputLabel-root': { fontSize: '0.75rem' },
                                  '& .MuiInputLabel-shrink': { fontSize: '0.7rem' },
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => removePending(p.localId)}
                                disabled={uploading}
                                aria-label="Entfernen"
                                sx={miniIconBtnSx}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          );
                        })}

                        <Button
                          type="button"
                          variant="contained"
                          size="small"
                          disabled={uploading}
                          startIcon={
                            uploading ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <UploadIcon sx={{ fontSize: 16 }} />
                            )
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleUploadAll();
                          }}
                          sx={{
                            minHeight: 30,
                            bgcolor: JOHNNY_PRESENTATION.warm,
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            '& .MuiButton-startIcon': { mr: 0.5 },
                            '&:hover': { bgcolor: '#F57C00' },
                          }}
                        >
                          {uploading
                            ? 'Hochladen…'
                            : pendingFiles.length === 1
                              ? 'Absenden'
                              : `${pendingFiles.length} absenden`}
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}

                {submissions.length > 0 && (
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', mb: 0.5 }}>
                      Abgegeben ({submissions.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {submissions.map((sub) => {
                        const kind = isImageSubmission(sub)
                          ? 'image'
                          : isPdfSubmission(sub)
                            ? 'pdf'
                            : 'other';
                        return (
                          <Box
                            key={sub.id}
                            sx={{
                              display: 'flex',
                              gap: 0.75,
                              alignItems: 'center',
                              py: 0.5,
                              px: 0.75,
                              borderRadius: 1,
                              bgcolor: '#e8f5e9',
                              border: '1px solid #a5d6a7',
                            }}
                          >
                            {renderMini(thumbs[sub.id], kind, () => void openViewerForSubmission(sub))}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.74rem',
                                  lineHeight: 1.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={sub.originalFileName}
                              >
                                {sub.originalFileName}
                              </Typography>
                              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.2 }}>
                                {formatFileSize(sub.fileSize)} · {formatDate(sub.submittedAt)}
                              </Typography>
                              {sub.teacherComment && (
                                <Typography sx={{ fontSize: '0.65rem', color: '#e65100', mt: 0.15 }}>
                                  Kommentar: {sub.teacherComment}
                                </Typography>
                              )}
                            </Box>
                            <Tooltip title="Ansehen">
                              <IconButton
                                size="small"
                                onClick={() => void openViewerForSubmission(sub)}
                                aria-label="Ansehen"
                                sx={miniIconBtnSx}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {ready && !slide && !error && (
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    Keine Hausaufgabenfolie in dieser Stunde.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewer)}
        onClose={() => setViewer(null)}
        maxWidth="lg"
        fullWidth
        disableEnforceFocus
        PaperProps={{ sx: { borderRadius: 2, minHeight: '70vh' } }}
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx, py: 1, pr: 5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.9rem', pr: 2 }} noWrap>
            {viewer?.title}
          </Typography>
          <DialogCloseIconButton onClose={() => setViewer(null)} />
        </DialogTitle>
        <DialogContent sx={{ pt: 1, pb: 2, display: 'flex', justifyContent: 'center', bgcolor: '#111' }}>
          {viewer?.kind === 'image' && (
            <Box
              component="img"
              src={viewer.url}
              alt={viewer.title}
              sx={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
            />
          )}
          {viewer?.kind === 'pdf' && (
            <Box
              component="iframe"
              src={viewer.url}
              title={viewer.title}
              sx={{ width: '100%', height: '75vh', border: 0, bgcolor: '#fff' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
