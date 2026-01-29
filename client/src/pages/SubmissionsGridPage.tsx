import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  SortByAlpha as SortByAlphaIcon,
  CalendarToday as CalendarIcon,
  RateReview as RateReviewIcon,
  Close as CloseIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Check as CheckIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';

interface Student {
  id: string;
  name: string;
  avatarEmoji?: string;
}

interface Submission {
  id: string;
  originalFileName?: string;
  fileSize?: number;
  fileType?: string;
  submittedAt?: string;
  student: Student;
  missing?: boolean;
  teacherComment?: string;
  commentedAt?: string;
}

const SubmissionsGridPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('filePath');
  const fileName = searchParams.get('fileName');
  const teacherId = searchParams.get('teacherId');
  const groupId = searchParams.get('groupId');

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [, setAllStudents] = useState<Student[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [error, setError] = useState<string | null>(null);
  
  // Bewertungs-Modus States
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [currentComment, setCurrentComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const commentFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (filePath && teacherId && groupId) {
      loadSubmissions();
    }
  }, [filePath, teacherId, groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // PDF als Blob laden für bessere Darstellung
  useEffect(() => {
    const loadPdfBlob = async () => {
      const sortedSubmissions = [...submissions].sort((a, b) => {
        if (sortBy === 'name') {
          const nameA = a.student.name.split(' ').pop() || '';
          const nameB = b.student.name.split(' ').pop() || '';
          return nameA.localeCompare(nameB);
        } else {
          if (a.missing && !b.missing) return 1;
          if (!a.missing && b.missing) return -1;
          if (a.missing && b.missing) return 0;
          return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
        }
      });
      const submissionsToReview = sortedSubmissions.filter(s => !s.missing);
      
      if (!reviewMode || !submissionsToReview[currentReviewIndex]) {
        setPdfBlobUrl(null);
        return;
      }

      const submission = submissionsToReview[currentReviewIndex];
      if (!submission.fileType?.includes('pdf')) {
        setPdfBlobUrl(null);
        return;
      }

      try {
        const response = await fetch(`/api/submissions/download/${submission.id}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PDF:', error);
        setPdfBlobUrl(null);
      }
    };

    loadPdfBlob();

    // Cleanup: Revoke blob URL when changing submission
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [reviewMode, currentReviewIndex, submissions, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tastatursteuerung für Bewertungs-Modal
  useEffect(() => {
    if (!reviewMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Wenn vergrößerte Vorschau offen ist, nur Esc erlauben
      if (expandedPreview) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setExpandedPreview(false);
        }
        return;
      }

      // Ignoriere Tastatureingaben wenn in einem Input-Feld
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        // Erlaube nur Enter im Textfeld
        if (e.key === 'Enter' && !e.shiftKey && target.tagName === 'TEXTAREA') {
          e.preventDefault();
          handleSaveComment();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'arrowleft':
          e.preventDefault();
          handlePreviousSubmission();
          break;
        case 'arrowright':
          e.preventDefault();
          handleNextSubmission();
          break;
        case 'enter':
          e.preventDefault();
          handleSaveComment();
          break;
        case 'k':
          e.preventDefault();
          commentFieldRef.current?.focus();
          break;
        case 'escape':
          e.preventDefault();
          setReviewMode(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reviewMode, currentReviewIndex, currentComment, savingComment, expandedPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSubmissions = async () => {
    try {
      setLoading(true);

      // Erstelle oder hole Assignment
      const assignmentResponse = await fetch('/api/submissions/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, filePath, teacherId })
      });

      if (!assignmentResponse.ok) {
        throw new Error('Fehler beim Laden des Assignments');
      }

      const assignment = await assignmentResponse.json();

      // Hole alle Submissions
      const submissionsResponse = await fetch(
        `/api/submissions/assignment/${assignment.id}/submissions`
      );

      if (!submissionsResponse.ok) {
        throw new Error('Fehler beim Laden der Abgaben');
      }

      const submissionsData = await submissionsResponse.json();

      // Hole nur die Schüler der spezifischen Lerngruppe
      if (groupId) {
        const groupResponse = await fetch(`/api/learning-groups/${groupId}`);
        if (groupResponse.ok) {
          const group = await groupResponse.json();
          const groupStudents = group.students || [];
          
          setAllStudents(groupStudents);
          
          // Erstelle Submissions für alle Schüler dieser Gruppe (auch die ohne Abgabe)
          const submissionsWithMissing = groupStudents.map((student: Student) => {
            const existing = submissionsData.find((s: Submission) => s.student.id === student.id);
            return existing || {
              id: `missing-${student.id}`,
              student: student,
              missing: true
            };
          });
          
          setSubmissions(submissionsWithMissing);
        } else {
          setSubmissions(submissionsData);
        }
      } else {
        setSubmissions(submissionsData);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden:', err);
      setError(err.message || 'Fehler beim Laden der Abgaben');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSortChange = (event: React.MouseEvent<HTMLElement>, newSort: 'name' | 'date' | null) => {
    if (newSort !== null) {
      setSortBy(newSort);
    }
  };

  // Sortierte Submissions
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.student.name.split(' ').pop() || a.student.name;
      const nameB = b.student.name.split(' ').pop() || b.student.name;
      return nameA.localeCompare(nameB, 'de');
    } else {
      // Nach Datum - fehlende Abgaben ans Ende
      if (a.missing && !b.missing) return 1;
      if (!a.missing && b.missing) return -1;
      if (a.missing && b.missing) {
        const nameA = a.student.name.split(' ').pop() || a.student.name;
        const nameB = b.student.name.split(' ').pop() || b.student.name;
        return nameA.localeCompare(nameB, 'de');
      }
      return new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime();
    }
  });

  // Schüler ohne Abgabe
  const missingStudents = submissions.filter(s => s.missing);

  // Nur Submissions mit tatsächlichen Abgaben für Bewertung
  const submissionsToReview = sortedSubmissions.filter(s => !s.missing);

  const handleStartReview = () => {
    if (submissionsToReview.length === 0) {
      alert('Keine Abgaben zum Bewerten vorhanden');
      return;
    }
    setCurrentReviewIndex(0);
    setCurrentComment(submissionsToReview[0].teacherComment || '');
    setReviewMode(true);
  };

  const handleSaveComment = async () => {
    const submission = submissionsToReview[currentReviewIndex];
    if (!submission || submission.missing) return;

    try {
      setSavingComment(true);
      
      const response = await fetch(`/api/submissions/submission/${submission.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: currentComment,
          teacherId: teacherId
        })
      });

      if (!response.ok) throw new Error('Fehler beim Speichern');

      await response.json();
      
      // Aktualisiere lokale Submissions
      setSubmissions(prev => prev.map(s => 
        s.id === submission.id ? { ...s, teacherComment: currentComment, commentedAt: new Date().toISOString() } : s
      ));

      // Gehe zur nächsten Abgabe oder schließe
      if (currentReviewIndex < submissionsToReview.length - 1) {
        setCurrentReviewIndex(currentReviewIndex + 1);
        setCurrentComment(submissionsToReview[currentReviewIndex + 1].teacherComment || '');
      } else {
        alert('✅ Alle Abgaben bewertet!');
        setReviewMode(false);
      }
    } catch (err) {
      console.error('Fehler beim Speichern des Kommentars:', err);
      alert('Fehler beim Speichern des Kommentars');
    } finally {
      setSavingComment(false);
    }
  };

  const handlePreviousSubmission = () => {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex(currentReviewIndex - 1);
      setCurrentComment(submissionsToReview[currentReviewIndex - 1].teacherComment || '');
    }
  };

  const handleNextSubmission = () => {
    if (currentReviewIndex < submissionsToReview.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
      setCurrentComment(submissionsToReview[currentReviewIndex + 1].teacherComment || '');
    }
  };

  const handleViewSubmission = async (submission: Submission) => {
    if (submission.missing || !submission.originalFileName) return;
    
    try {
      const response = await fetch(`/api/submissions/download/${submission.id}`);
      if (!response.ok) throw new Error('Fehler beim Laden');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const fileExtension = submission.originalFileName.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'pdf' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '')) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = submission.originalFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Fehler beim Anzeigen:', err);
      alert('Fehler beim Öffnen der Datei');
    }
  };

  const handleCopyImageToClipboard = async (submission: Submission) => {
    if (submission.missing || !submission.originalFileName) return;
    
    const fileExtension = submission.originalFileName.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '')) {
      alert('Nur Bilder können kopiert werden');
      return;
    }

    try {
      // Lade das Bild
      const response = await fetch(`/api/submissions/download/${submission.id}`);
      if (!response.ok) throw new Error('Fehler beim Laden des Bildes');

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      // Erstelle ein Image-Element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Erstelle Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas nicht unterstützt');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Konvertiere zu Blob
      const canvasBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      // Kopiere in Zwischenablage
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': canvasBlob
        })
      ]);
      
      // Cleanup
      URL.revokeObjectURL(imageUrl);
      
      // Erfolgreich kopiert - kein Popup
    } catch (err: any) {
      console.error('Kopieren fehlgeschlagen:', err);
      alert('❌ Kopieren fehlgeschlagen. Versuche es nochmal.');
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <Paper sx={{ p: 4 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', p: 0, m: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Paper sx={{ p: 1.5, mb: 1, bgcolor: 'white', borderRadius: 0, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '1.2rem' }}>
              📥 Schüler-Abgaben
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
              Aufgabe: {fileName}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.3, fontSize: '0.85rem' }}>
              {submissions.filter(s => !s.missing).length} von {submissions.length} Abgaben eingereicht
            </Typography>
          </Box>
          
          {/* Sortier-Optionen und Bewerten-Button */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<RateReviewIcon />}
              onClick={handleStartReview}
              disabled={submissionsToReview.length === 0}
              sx={{ fontSize: '0.75rem', py: 0.5 }}
            >
              Bewerten
            </Button>
            
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={handleSortChange}
              size="small"
              sx={{ height: 'fit-content' }}
            >
              <ToggleButton value="name" sx={{ px: 2, py: 0.5, fontSize: '0.75rem' }}>
                <SortByAlphaIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Name
              </ToggleButton>
              <ToggleButton value="date" sx={{ px: 2, py: 0.5, fontSize: '0.75rem' }}>
                <CalendarIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Datum
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Fehlende Abgaben */}
        {missingStudents.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.8, fontSize: '0.8rem', color: '#d32f2f' }}>
              ⚠️ Fehlende Abgaben ({missingStudents.length}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {missingStudents.map(s => (
                <Chip
                  key={s.id}
                  label={s.student.name}
                  size="small"
                  sx={{
                    bgcolor: '#ffebee',
                    color: '#d32f2f',
                    fontWeight: 500,
                    fontSize: '0.7rem',
                    border: '1px solid #ef5350'
                  }}
                  avatar={
                    <Avatar sx={{ bgcolor: '#f44336', width: 20, height: 20, fontSize: '0.7rem' }}>
                      {s.student.avatarEmoji || s.student.name.charAt(0)}
                    </Avatar>
                  }
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Grid mit Submissions */}
      <Box sx={{ p: 0, m: 0, width: '100%' }}>
        {submissions.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <PersonIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Noch keine Abgaben
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Bisher hat kein Schüler eine Abgabe hochgeladen.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={1} sx={{ m: 0, width: '100%' }}>
          {sortedSubmissions.map((submission) => (
            <Grid item xs={12} sm={6} md={6} lg={4} xl={3} key={submission.id} sx={{ p: 0.5 }}>
              <Card 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  bgcolor: submission.missing ? '#ffebee' : 'white',
                  border: submission.missing ? '2px solid #f44336' : 'none',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {/* Schüler Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Avatar sx={{ 
                      bgcolor: submission.missing ? '#f44336' : '#1976d2', 
                      width: 32, 
                      height: 32, 
                      fontSize: '1rem' 
                    }}>
                      {submission.student.avatarEmoji || submission.student.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap sx={{ 
                        fontWeight: 'bold', 
                        fontSize: '0.85rem',
                        color: submission.missing ? '#d32f2f' : 'inherit'
                      }}>
                        {submission.student.name.split(' ')[0]} {submission.student.name.split(' ').slice(-1)[0]}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        fontSize: '0.65rem',
                        color: submission.missing ? '#d32f2f' : 'text.secondary'
                      }}>
                        {submission.missing ? 'Keine Abgabe' : formatDate(submission.submittedAt!).split(',')[0]}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Vorschau-Bereich - GROSS */}
                  <Box 
                    sx={{ 
                      height: 200,
                      bgcolor: submission.missing ? '#ffcdd2' : '#f5f5f5',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1.5,
                      border: submission.missing ? '2px dashed #f44336' : '1px solid #e0e0e0',
                      overflow: 'hidden'
                    }}
                  >
                    {submission.missing ? (
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 64, color: '#f44336' }}>⚠️</Typography>
                        <Typography variant="caption" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                          Keine Abgabe
                        </Typography>
                      </Box>
                    ) : submission.fileType?.includes('image') ? (
                      <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img 
                          src={`/api/submissions/download/${submission.id}`}
                          alt={submission.originalFileName}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain',
                            borderRadius: '4px'
                          }}
                        />
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyImageToClipboard(submission);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            bgcolor: 'rgba(0, 0, 0, 0.5)',
                            width: 20,
                            height: 20,
                            p: 0,
                            opacity: 0.8,
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.7)',
                              opacity: 1,
                            }
                          }}
                          title="Bild kopieren"
                        >
                          <ContentCopyIcon sx={{ fontSize: 12, color: 'white' }} />
                        </IconButton>
                      </Box>
                    ) : submission.fileType?.includes('pdf') ? (
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 48 }}>📄</Typography>
                        <Typography variant="caption" color="textSecondary">PDF</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 48 }}>📝</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {submission.fileType?.includes('word') ? 'Word' : 
                           submission.fileType?.includes('excel') ? 'Excel' : 
                           submission.fileType?.includes('powerpoint') ? 'PowerPoint' : 'Dokument'}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Datei-Info kompakt */}
                  {!submission.missing && (
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontSize: '0.7rem', color: 'text.secondary' }} noWrap>
                      📎 {submission.originalFileName}
                    </Typography>
                  )}

                  {/* Anzeigen Button */}
                  {!submission.missing && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                      onClick={() => handleViewSubmission(submission)}
                      sx={{ fontSize: '0.7rem', py: 0.5 }}
                    >
                      Öffnen
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        )}
      </Box>

      {/* Bewertungs-Modal */}
      <Dialog
        open={reviewMode}
        onClose={() => setReviewMode(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', py: 1, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 36, height: 36, fontSize: '0.9rem' }}>
              {submissionsToReview[currentReviewIndex]?.student.avatarEmoji || 
               submissionsToReview[currentReviewIndex]?.student.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                {submissionsToReview[currentReviewIndex]?.student.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                Abgabe {currentReviewIndex + 1} / {submissionsToReview.length} • {formatDate(submissionsToReview[currentReviewIndex]?.submittedAt!)}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setReviewMode(false)}
            sx={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, p: 0 }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: '1%', pt: 0, pb: 1.5 }}>
          {submissionsToReview[currentReviewIndex] && (
            <>
              {/* Layout: Vorschau links, Kommentar rechts */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'flex-start' }}>
                {/* Datei-Vorschau */}
                <Paper 
                  elevation={2}
                  sx={{ 
                    flex: '1 1 75%',
                    height: 500,
                    flexShrink: 0,
                    bgcolor: '#fafafa',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': { 
                      bgcolor: '#f5f5f5',
                      '&::after': {
                        content: '"🔍 Klicken zum Vergrößern"',
                        position: 'absolute',
                        bottom: 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        pointerEvents: 'none'
                      }
                    }
                  }}
                  onClick={() => setExpandedPreview(true)}
                >
                  {submissionsToReview[currentReviewIndex].fileType?.includes('image') ? (
                    <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={`/api/submissions/download/${submissionsToReview[currentReviewIndex].id}`}
                        alt={submissionsToReview[currentReviewIndex].originalFileName}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain'
                        }}
                      />
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyImageToClipboard(submissionsToReview[currentReviewIndex]);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(0, 0, 0, 0.5)',
                          width: 24,
                          height: 24,
                          p: 0,
                          opacity: 0.8,
                          '&:hover': {
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                            opacity: 1,
                          }
                        }}
                        title="Bild kopieren"
                      >
                        <ContentCopyIcon sx={{ fontSize: 14, color: 'white' }} />
                      </IconButton>
                    </Box>
                  ) : submissionsToReview[currentReviewIndex].fileType?.includes('pdf') ? (
                    pdfBlobUrl ? (
                      <iframe
                        src={`${pdfBlobUrl}#view=FitH`}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none'
                        }}
                        title={submissionsToReview[currentReviewIndex].originalFileName}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress sx={{ mb: 1 }} />
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          PDF wird geladen...
                        </Typography>
                      </Box>
                    )
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 48, mb: 0.5 }}>
                        📝
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.8, fontSize: '0.85rem' }}>
                        {submissionsToReview[currentReviewIndex].originalFileName}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                        sx={{ fontSize: '0.75rem', py: 0.5 }}
                      >
                        Klicken zum Öffnen
                      </Button>
                    </Box>
                  )}
                </Paper>

                {/* Kommentar-Bereich rechts */}
                <Box sx={{ flex: '1 1 25%', display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', mt: 0 }}>
                  <Typography variant="caption" sx={{ mb: 0.5, fontSize: '0.75rem', color: '#666', fontWeight: 500 }}>
                    Dein Kommentar zur Abgabe
                  </Typography>
                  <TextField
                    multiline
                    rows={10}
                    fullWidth
                    inputRef={commentFieldRef}
                    value={currentComment}
                    onChange={(e) => setCurrentComment(e.target.value)}
                    placeholder="Schreibe einen Kommentar für den Schüler..."
                    variant="outlined"
                    sx={{
                      '& .MuiInputBase-root': {
                        alignItems: 'flex-start',
                        fontSize: '0.85rem'
                      }
                    }}
                  />

                  {submissionsToReview[currentReviewIndex].commentedAt && (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.8, fontStyle: 'italic', fontSize: '0.7rem' }}>
                      Zuletzt kommentiert: {formatDate(submissionsToReview[currentReviewIndex].commentedAt!)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 1.5, py: 1, bgcolor: '#f5f5f5', justifyContent: 'space-between' }}>
          <Box>
            <Button
              startIcon={<NavigateBeforeIcon sx={{ fontSize: 18 }} />}
              onClick={handlePreviousSubmission}
              disabled={currentReviewIndex === 0}
              size="small"
              sx={{ fontSize: '0.8rem', py: 0.5 }}
            >
              Zurück
            </Button>
          </Box>

          <Button
            variant="contained"
            color="success"
            startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
            onClick={handleSaveComment}
            disabled={savingComment}
            size="small"
            sx={{ fontSize: '0.8rem', py: 0.5, px: 2 }}
          >
            {savingComment ? 'Speichert...' : 'Speichern & Weiter'}
          </Button>

          <Box>
            <Button
              endIcon={<NavigateNextIcon sx={{ fontSize: 18 }} />}
              onClick={handleNextSubmission}
              disabled={currentReviewIndex === submissionsToReview.length - 1}
              size="small"
              sx={{ fontSize: '0.8rem', py: 0.5 }}
            >
              Weiter
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Vergrößerte Vorschau Dialog */}
      <Dialog
        open={expandedPreview}
        onClose={() => setExpandedPreview(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: '0.9rem' }}>
            {submissionsToReview[currentReviewIndex]?.originalFileName}
          </Typography>
          <IconButton
            onClick={() => setExpandedPreview(false)}
            sx={{ width: 24, height: 24, p: 0 }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          {submissionsToReview[currentReviewIndex] && (
            <>
              {submissionsToReview[currentReviewIndex].fileType?.includes('image') ? (
                <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src={`/api/submissions/download/${submissionsToReview[currentReviewIndex].id}`}
                    alt={submissionsToReview[currentReviewIndex].originalFileName}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '85vh', 
                      objectFit: 'contain'
                    }}
                  />
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyImageToClipboard(submissionsToReview[currentReviewIndex]);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      width: 28,
                      height: 28,
                      p: 0,
                      opacity: 0.8,
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)',
                        opacity: 1,
                      }
                    }}
                    title="Bild kopieren"
                  >
                    <ContentCopyIcon sx={{ fontSize: 16, color: 'white' }} />
                  </IconButton>
                </Box>
              ) : submissionsToReview[currentReviewIndex].fileType?.includes('pdf') ? (
                pdfBlobUrl ? (
                  <iframe
                    src={`${pdfBlobUrl}#view=FitH`}
                    style={{
                      width: '100%',
                      height: '85vh',
                      border: 'none'
                    }}
                    title={submissionsToReview[currentReviewIndex].originalFileName}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <CircularProgress sx={{ mb: 2, color: 'white' }} />
                    <Typography variant="body1">
                      PDF wird geladen...
                    </Typography>
                  </Box>
                )
              ) : (
                <Box sx={{ textAlign: 'center', color: 'white', p: 4 }}>
                  <Typography sx={{ fontSize: 64, mb: 2 }}>
                    📝
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {submissionsToReview[currentReviewIndex].originalFileName}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      setExpandedPreview(false);
                      handleViewSubmission(submissionsToReview[currentReviewIndex]);
                    }}
                  >
                    Datei öffnen
                  </Button>
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default SubmissionsGridPage;

