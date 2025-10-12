import React, { useState, useEffect } from 'react';
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
  Chip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  SortByAlpha as SortByAlphaIcon,
  CalendarToday as CalendarIcon
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
}

const SubmissionsGridPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const filePath = searchParams.get('filePath');
  const fileName = searchParams.get('fileName');
  const teacherId = searchParams.get('teacherId');
  const groupId = searchParams.get('groupId');

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filePath && teacherId && groupId) {
      loadSubmissions();
    }
  }, [filePath, teacherId, groupId]);

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
          
          {/* Sortier-Optionen */}
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
                        {submission.student.name}
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
    </Box>
  );
};

export default SubmissionsGridPage;

