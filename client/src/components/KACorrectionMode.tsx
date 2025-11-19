import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Card,
  CardContent,
  Grid,
  Stack
} from '@mui/material';
import { 
  CheckCircle, 
  Cancel, 
  ArrowBack, 
  ArrowForward, 
  Person,
  AccessTime,
  Grade,
  Edit,
  Save,
  Close
} from '@mui/icons-material';

interface KASubmission {
  id: string;
  student: {
    id: string;
    name: string;
    loginCode: string;
  };
  submittedAt: string;
  expiredAt?: string;
  status: string;
  answers: string; // JSON string
  autoPoints: number;
  totalPoints: number;
  corrections: KACorrection[];
}

interface KACorrection {
  id: string;
  taskNumber: string;
  manualPoints?: number;
  comment?: string;
}

interface KACorrectionModeProps {
  kaFilePath: string;
  onClose: () => void;
}

type CorrectionMode = 'by-student' | 'by-task';

const KACorrectionMode: React.FC<KACorrectionModeProps> = ({ kaFilePath, onClose }) => {
  const [submissions, setSubmissions] = useState<KASubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CorrectionMode>('by-student');
  const [selectedSubmission, setSelectedSubmission] = useState<KASubmission | null>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [corrections, setCorrections] = useState<Record<string, { points?: number; comment?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, [kaFilePath]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Debug: Log den kaFilePath
      console.log('🔍 Lade Abgaben für:', kaFilePath);
      
      const response = await fetch(`/api/ka-corrections/submissions?kaFilePath=${encodeURIComponent(kaFilePath)}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fehler beim Laden:', response.status, errorText);
        throw new Error(`Fehler beim Laden der Abgaben: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Abgaben geladen:', data.submissions?.length || 0, 'Abgaben gefunden');
      console.log('📋 Daten:', data);
      setSubmissions(data.submissions || []);
      
      if (data.submissions && data.submissions.length > 0) {
        setSelectedSubmission(data.submissions[0]);
        loadCorrections(data.submissions[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const loadCorrections = async (submissionId: string) => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch(`/api/ka-corrections/submissions/${submissionId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Korrekturen');
      }

      const data = await response.json();
      const submission = data.submission;
      
      if (submission) {
        setSelectedSubmission(submission);
        // Lade bestehende Korrekturen
        const correctionsMap: Record<string, { points?: number; comment?: string }> = {};
        submission.corrections?.forEach((corr: KACorrection) => {
          correctionsMap[corr.taskNumber] = {
            points: corr.manualPoints,
            comment: corr.comment || ''
          };
        });
        setCorrections(correctionsMap);
      }
    } catch (err) {
      console.error('Error loading corrections:', err);
    }
  };

  const saveCorrection = async (taskNumber: string, points?: number, comment?: string, submissionIdOverride?: string) => {
    const targetSubmissionId = submissionIdOverride || selectedSubmission?.id;
    if (!targetSubmissionId) return;

    try {
      setSaving(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/ka-corrections/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({
          submissionId: targetSubmissionId,
          taskNumber,
          manualPoints: points,
          comment: comment || ''
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Korrektur');
      }

      const data = await response.json();
      
      // Update local state
      const correctionKey = submissionIdOverride ? `${submissionIdOverride}_${taskNumber}` : taskNumber;
      setCorrections(prev => ({
        ...prev,
        [correctionKey]: { points, comment }
      }));

      // Reload submission to get updated total points
      if (submissionIdOverride) {
        await loadCorrections(submissionIdOverride);
        // Reload all submissions to update totals
        await loadSubmissions();
      } else if (selectedSubmission) {
        await loadCorrections(selectedSubmission.id);
      }
    } catch (err) {
      console.error('Error saving correction:', err);
      alert('Fehler beim Speichern der Korrektur');
    } finally {
      setSaving(false);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < submissions.length - 1) {
      const nextIndex = currentStudentIndex + 1;
      setCurrentStudentIndex(nextIndex);
      setSelectedSubmission(submissions[nextIndex]);
      loadCorrections(submissions[nextIndex].id);
    }
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      const prevIndex = currentStudentIndex - 1;
      setCurrentStudentIndex(prevIndex);
      setSelectedSubmission(submissions[prevIndex]);
      loadCorrections(submissions[prevIndex].id);
    }
  };

  const handleResetAllSubmissions = async () => {
    if (!window.confirm(
      `⚠️ ACHTUNG: Möchten Sie wirklich ALLE Abgaben für "${kaFilePath}" zurücksetzen?\n\n` +
      `Dies löscht ${submissions.length} Abgabe(n) und alle zugehörigen Korrekturen.\n\n` +
      `Die Schüler können die Klassenarbeit dann erneut bearbeiten.\n\n` +
      `Diese Aktion kann nicht rückgängig gemacht werden!`
    )) {
      return;
    }

    try {
      setResetting(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      // API Base URL ermitteln (ähnlich wie in der HTML-Datei)
      const getApiBaseUrl = () => {
        try {
          if (window.opener && window.opener.location && window.opener.location.origin) {
            return window.opener.location.origin;
          }
          if (window.location.origin && !window.location.origin.startsWith('blob:')) {
            return window.location.origin;
          }
        } catch (e) {
          // Cross-origin, ignoriere
        }
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:3000'
          : 'https://johnnymonkey.onrender.com';
      };

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/ka-corrections/reset-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({ kaFilePath })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(errorData.error || 'Fehler beim Zurücksetzen');
      }

      const data = await response.json();
      alert(`✅ ${data.message || `${data.deletedCount} Abgabe(n) wurden zurückgesetzt`}`);
      
      // Lade die Liste neu (sollte jetzt leer sein)
      await loadSubmissions();
    } catch (error) {
      console.error('Fehler beim Zurücksetzen:', error);
      alert(error instanceof Error ? error.message : 'Fehler beim Zurücksetzen der Abgaben');
    } finally {
      setResetting(false);
    }
  };

  const parseAnswers = (answersJson: string) => {
    try {
      return JSON.parse(answersJson);
    } catch {
      return {};
    }
  };

  // Aufgaben mit Rechenweg (müssen manuell korrigiert werden)
  const tasksWithRechenweg = ['3', '4', '5', '6', '7', '8', '9'];

  // Notenberechnung
  const calculateGrade = (achieved: number, total: number): string => {
    if (total === 0) return '-';
    
    const percentage = (achieved / total) * 100;
    let grade: number;
    let tendency = '';
    
    if (percentage >= 92) {
      grade = 1;
      if (percentage >= 97) tendency = '+';
      else if (percentage < 95) tendency = '-';
    } else if (percentage >= 81) {
      grade = 2;
      if (percentage >= 86) tendency = '+';
      else if (percentage < 84) tendency = '-';
    } else if (percentage >= 67) {
      grade = 3;
      if (percentage >= 72) tendency = '+';
      else if (percentage < 70) tendency = '-';
    } else if (percentage >= 50) {
      grade = 4;
      if (percentage >= 55) tendency = '+';
      else if (percentage < 53) tendency = '-';
    } else if (percentage >= 30) {
      grade = 5;
      if (percentage >= 35) tendency = '+';
      else if (percentage < 33) tendency = '-';
    } else {
      grade = 6;
    }
    
    return `${grade}${tendency}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={onClose} sx={{ mt: 2 }}>Zurück</Button>
      </Box>
    );
  }

  if (submissions.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          Keine Abgaben gefunden
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Es wurden noch keine Abgaben für diese Klassenarbeit eingereicht.
        </Typography>
        <Button onClick={onClose} sx={{ mt: 2 }}>Zurück</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 2, bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
              📝 Korrekturmodus
            </Typography>
            <Box display="flex" gap={1}>
              {submissions.length > 0 && (
                <Button 
                  onClick={handleResetAllSubmissions}
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={resetting}
                  sx={{ 
                    borderColor: '#d32f2f',
                    color: '#d32f2f',
                    '&:hover': {
                      borderColor: '#c62828',
                      bgcolor: '#ffebee'
                    }
                  }}
                >
                  {resetting ? 'Zurücksetzen...' : '🗑️ Alle zurücksetzen'}
                </Button>
              )}
              <Button 
                onClick={onClose} 
                variant="outlined" 
                size="small"
                startIcon={<Close />}
              >
                Schließen
              </Button>
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {kaFilePath} {submissions.length > 0 && `(${submissions.length} Abgabe${submissions.length > 1 ? 'n' : ''})`}
          </Typography>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs 
        value={mode} 
        onChange={(_, v) => setMode(v)} 
        sx={{ 
          mb: 2,
          '& .MuiTab-root': {
            minHeight: 48,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.95rem'
          },
          '& .Mui-selected': {
            color: '#1976d2'
          }
        }}
        indicatorColor="primary"
      >
        <Tab label="👤 Schülerweise" value="by-student" />
        <Tab label="📋 Aufgabenweise" value="by-task" />
      </Tabs>

      {mode === 'by-student' && selectedSubmission && (
        <Box>
          {/* Student Header Card */}
          <Card sx={{ mb: 2, bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Person sx={{ color: '#1976d2' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                      {selectedSubmission.student.name}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip
                      icon={<Grade />}
                      label={`Auto: ${selectedSubmission.autoPoints.toFixed(1)} Pkt.`}
                      size="small"
                      sx={{ bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 600 }}
                    />
                    <Chip
                      icon={<Grade />}
                      label={`Gesamt: ${selectedSubmission.totalPoints.toFixed(1)} / 38 Pkt.`}
                      size="small"
                      sx={{ bgcolor: '#c8e6c9', color: '#2e7d32', fontWeight: 600 }}
                    />
                    <Chip
                      label={selectedSubmission.status === 'submitted' ? '✅ Abgegeben' : '⏰ Abgelaufen'}
                      size="small"
                      sx={{ 
                        bgcolor: selectedSubmission.status === 'submitted' ? '#e8f5e9' : '#fff3e0',
                        color: selectedSubmission.status === 'submitted' ? '#2e7d32' : '#f57c00',
                        fontWeight: 600
                      }}
                    />
                    <Chip
                      icon={<Grade />}
                      label={`Note: ${calculateGrade(selectedSubmission.totalPoints, 38)}`}
                      size="small"
                      sx={{ 
                        bgcolor: '#1976d2', 
                        color: '#fff', 
                        fontWeight: 700,
                        fontSize: '0.95rem'
                      }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTime sx={{ fontSize: 14, color: '#666' }} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(selectedSubmission.submittedAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Navigation */}
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton
                    onClick={handlePreviousStudent}
                    disabled={currentStudentIndex === 0}
                    size="small"
                    sx={{ 
                      bgcolor: currentStudentIndex === 0 ? '#f5f5f5' : '#e3f2fd',
                      '&:hover': { bgcolor: currentStudentIndex === 0 ? '#f5f5f5' : '#bbdefb' }
                    }}
                  >
                    <ArrowBack fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ 
                    px: 1.5, 
                    py: 0.5,
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    fontWeight: 600,
                    minWidth: 60,
                    textAlign: 'center'
                  }}>
                    {currentStudentIndex + 1} / {submissions.length}
                  </Typography>
                  <IconButton
                    onClick={handleNextStudent}
                    disabled={currentStudentIndex === submissions.length - 1}
                    size="small"
                    sx={{ 
                      bgcolor: currentStudentIndex === submissions.length - 1 ? '#f5f5f5' : '#e3f2fd',
                      '&:hover': { bgcolor: currentStudentIndex === submissions.length - 1 ? '#f5f5f5' : '#bbdefb' }
                    }}
                  >
                    <ArrowForward fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Answers Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#1a1a1a' }}>
              📝 Antworten und Korrekturen
            </Typography>
            
            <Grid container spacing={1.5}>
              {Object.entries(parseAnswers(selectedSubmission.answers)).map(([taskId, answer]) => {
                const taskNumMatch = taskId.match(/a(\d+)/);
                const taskNum = taskNumMatch ? taskNumMatch[1] : '';
                const needsManualCorrection = tasksWithRechenweg.includes(taskNum);
                const correction = corrections[taskNum] || {};

                return (
                  <Grid item xs={12} key={taskId}>
                    <Card sx={{ 
                      bgcolor: '#fff', 
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      border: needsManualCorrection ? '2px solid #ff9800' : '1px solid #e0e0e0',
                      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }
                    }}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                            Aufgabe {taskId.toUpperCase()}
                          </Typography>
                          {needsManualCorrection && (
                            <Chip
                              label="✏️ Rechenweg"
                              size="small"
                              sx={{ 
                                bgcolor: '#fff3e0', 
                                color: '#f57c00',
                                fontWeight: 600,
                                fontSize: '0.75rem'
                              }}
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ 
                          bgcolor: answer ? '#f5f5f5' : '#ffebee',
                          p: 1,
                          borderRadius: 1,
                          mb: needsManualCorrection ? 1.5 : 0,
                          border: '1px solid #e0e0e0'
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            Antwort:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            fontFamily: 'monospace',
                            fontWeight: answer ? 500 : 400,
                            color: answer ? '#1a1a1a' : '#d32f2f'
                          }}>
                            {String(answer) || '(keine Antwort)'}
                          </Typography>
                        </Box>

                        {needsManualCorrection && (
                          <Box sx={{ mt: 1.5 }}>
                            <Grid container spacing={1.5}>
                              <Grid item xs={12} sm={3}>
                                <TextField
                                  label="Punkte"
                                  type="number"
                                  value={correction.points ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                    setCorrections(prev => ({
                                      ...prev,
                                      [taskNum]: { ...prev[taskNum], points: value }
                                    }));
                                  }}
                                  onBlur={() => saveCorrection(taskNum, correction.points, correction.comment)}
                                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                                  size="small"
                                  fullWidth
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: '#fff'
                                    }
                                  }}
                                  helperText="Max. 2 Pkt."
                                />
                              </Grid>
                              <Grid item xs={12} sm={9}>
                                <TextField
                                  label="Kommentar (optional)"
                                  multiline
                                  rows={2}
                                  value={correction.comment ?? ''}
                                  onChange={(e) => {
                                    setCorrections(prev => ({
                                      ...prev,
                                      [taskNum]: { ...prev[taskNum], comment: e.target.value }
                                    }));
                                  }}
                                  onBlur={() => saveCorrection(taskNum, correction.points, correction.comment)}
                                  fullWidth
                                  size="small"
                                  placeholder="Feedback zum Rechenweg..."
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: '#fff'
                                    }
                                  }}
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Summary Card */}
            <Card sx={{ mt: 2, bgcolor: '#e3f2fd', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700, color: '#1976d2' }}>
                  📊 Gesamtübersicht
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Auto: ${selectedSubmission.autoPoints.toFixed(1)} Pkt.`}
                    sx={{ bgcolor: '#fff', color: '#1976d2', fontWeight: 600 }}
                  />
                  <Chip
                    label={`Manuell: ${(selectedSubmission.totalPoints - selectedSubmission.autoPoints).toFixed(1)} Pkt.`}
                    sx={{ bgcolor: '#fff', color: '#7b1fa2', fontWeight: 600 }}
                  />
                  <Chip
                    label={`Gesamt: ${selectedSubmission.totalPoints.toFixed(1)} / 38 Pkt.`}
                    sx={{ bgcolor: '#c8e6c9', color: '#2e7d32', fontWeight: 700 }}
                  />
                  <Chip
                    icon={<Grade />}
                    label={`Note: ${calculateGrade(selectedSubmission.totalPoints, 38)}`}
                    sx={{ 
                      bgcolor: '#1976d2', 
                      color: '#fff', 
                      fontWeight: 700,
                      fontSize: '1rem'
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {mode === 'by-task' && (
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#1a1a1a' }}>
            📋 Aufgabenweise Korrektur
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Alle Schülerantworten zu Aufgaben mit Rechenweg:
          </Typography>
          
          {tasksWithRechenweg.map(taskNum => {
            const taskSubmissions = submissions.map(sub => {
              const answers = parseAnswers(sub.answers);
              const taskAnswers = Object.entries(answers)
                .filter(([taskId]) => {
                  const match = taskId.match(/a(\d+)/);
                  return match && match[1] === taskNum;
                })
                .map(([taskId, answer]) => ({ taskId, answer }));
              
              return {
                submission: sub,
                answers: taskAnswers
              };
            }).filter(item => item.answers.length > 0);

            if (taskSubmissions.length === 0) return null;

            return (
              <Card key={taskNum} sx={{ mb: 2, bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      Aufgabe {taskNum}
                    </Typography>
                    <Chip
                      label="✏️ Rechenweg erforderlich"
                      size="small"
                      sx={{ 
                        bgcolor: '#fff3e0', 
                        color: '#f57c00',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  
                  <TableContainer>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1 } }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 700, width: '20%' }}>Schüler</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '30%' }}>Antworten</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '15%' }}>Punkte</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '35%' }}>Kommentar</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {taskSubmissions.map(({ submission, answers }, idx) => {
                          const correction = submission.corrections?.find(c => c.taskNumber === taskNum);
                          const correctionKey = `${submission.id}_${taskNum}`;
                          const correctionState = corrections[correctionKey] || {
                            points: correction?.manualPoints,
                            comment: correction?.comment || ''
                          };

                          return (
                            <TableRow 
                              key={submission.id}
                              sx={{ 
                                '&:nth-of-type(even)': { bgcolor: '#fafafa' },
                                '&:hover': { bgcolor: '#f0f0f0' }
                              }}
                            >
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <Person sx={{ fontSize: 16, color: '#666' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {submission.student.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {answers.map(({ taskId, answer }) => (
                                  <Box key={taskId} sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: '#666', mr: 0.5 }}>
                                      {taskId.toUpperCase()}:
                                    </Typography>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        fontFamily: 'monospace',
                                        fontWeight: answer ? 500 : 400,
                                        color: answer ? '#1a1a1a' : '#d32f2f',
                                        display: 'inline'
                                      }}
                                    >
                                      {String(answer) || '(leer)'}
                                    </Typography>
                                  </Box>
                                ))}
                              </TableCell>
                              <TableCell>
                                <TextField
                                  type="number"
                                  value={correctionState.points ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                    setCorrections(prev => ({
                                      ...prev,
                                      [correctionKey]: { ...prev[correctionKey], points: value }
                                    }));
                                  }}
                                  onBlur={() => saveCorrection(taskNum, correctionState.points, correctionState.comment, submission.id)}
                                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                                  size="small"
                                  sx={{ width: '90px' }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  multiline
                                  rows={2}
                                  value={correctionState.comment ?? ''}
                                  onChange={(e) => {
                                    setCorrections(prev => ({
                                      ...prev,
                                      [correctionKey]: { ...prev[correctionKey], comment: e.target.value }
                                    }));
                                  }}
                                  onBlur={() => saveCorrection(taskNum, correctionState.points, correctionState.comment, submission.id)}
                                  size="small"
                                  fullWidth
                                  placeholder="Kommentar..."
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: '#fff'
                                    }
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default KACorrectionMode;

