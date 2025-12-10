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
  Close,
  BarChart,
  Description,
  FileDownload
} from '@mui/icons-material';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import DreierprobeModal from './DreierprobeModal';

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
  const [showDreierprobe, setShowDreierprobe] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, [kaFilePath]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Extrahiere nur den Dateinamen aus dem Pfad (für die Datenbank)
      const fileName = kaFilePath.split('/').pop() || kaFilePath;
      
      // Debug: Log den kaFilePath
      console.log('🔍 Lade Abgaben für:', kaFilePath, '(Dateiname:', fileName, ')');
      
      const response = await fetch(`/api/ka-corrections/submissions?kaFilePath=${encodeURIComponent(fileName)}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fehler beim Laden:', response.status, errorText);
        // Kein Fehler werfen, sondern einfach leere Liste setzen
        setSubmissions([]);
        return;
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
      console.error('Fehler beim Laden der Abgaben:', err);
      // Kein Fehler setzen, sondern einfach leere Liste
      setSubmissions([]);
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

  // Keine Blockade mehr - Modal wird immer angezeigt

  const handleOpenKA = async () => {
    try {
      // kaFilePath sollte jetzt der vollständige Pfad sein
      const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`);
      if (response.ok) {
        const htmlContent = await response.text();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const errorText = await response.text().catch(() => 'Unbekannter Fehler');
        console.error('Fehler beim Öffnen:', response.status, errorText);
        alert(`Klassenarbeit konnte nicht geöffnet werden. (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Fehler beim Öffnen der Klassenarbeit:', error);
      alert(`Fehler beim Öffnen der Klassenarbeit: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const exportToWord = async (includeSolutions: boolean) => {
    try {
      setExporting(true);
      const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`);
      
      if (!response.ok) {
        throw new Error(`Fehler beim Laden: ${response.status}`);
      }

      const htmlContent = await response.text();
      
      // Erstelle ein temporäres DOM-Element zum Parsen
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Entferne Lösungsteile, wenn ohne Musterlösung
      if (!includeSolutions) {
        const solutions = doc.querySelectorAll('.solution');
        solutions.forEach(sol => sol.remove());
      }

      // Extrahiere den Titel
      const title = doc.querySelector('title')?.textContent || 'Klassenarbeit';
      const fileName = kaFilePath.split('/').pop()?.replace('.html', '') || 'klassenarbeit';
      
      // Erstelle Word-Dokument
      const paragraphs: Paragraph[] = [];
      
      // Titel
      paragraphs.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );

      // Extrahiere alle Aufgaben
      const tasks = doc.querySelectorAll('.task');
      tasks.forEach((task, taskIndex) => {
        const taskNumber = task.querySelector('.task-number')?.textContent || `Aufgabe ${taskIndex + 1}`;
        const taskContent = task.querySelector('.task-content');
        
        if (taskContent) {
          // Aufgabenüberschrift
          paragraphs.push(
            new Paragraph({
              text: taskNumber,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 }
            })
          );

          // Szenario/Text
          const scenario = taskContent.querySelector('.task-scenario');
          if (scenario) {
            const scenarioText = scenario.textContent?.trim() || '';
            if (scenarioText) {
              paragraphs.push(
                new Paragraph({
                  text: scenarioText,
                  spacing: { after: 200 }
                })
              );
            }
          }

          // Input-Gruppen (Fragen)
          const inputGroups = taskContent.querySelectorAll('.input-group');
          inputGroups.forEach((group) => {
            const label = group.querySelector('label')?.textContent?.trim() || '';
            if (label) {
              paragraphs.push(
                new Paragraph({
                  text: label,
                  spacing: { after: 100 }
                })
              );
            }
          });

          // Rechenweg-Hinweis
          const rechenweg = taskContent.querySelector('.rechenweg-required');
          if (rechenweg) {
            paragraphs.push(
              new Paragraph({
                text: rechenweg.textContent?.trim() || '',
                spacing: { after: 200 }
              })
            );
          }

          // Lösung (nur wenn includeSolutions)
          if (includeSolutions) {
            const solution = taskContent.querySelector('.solution');
            if (solution) {
              paragraphs.push(
                new Paragraph({
                  text: 'Musterlösung:',
                  heading: HeadingLevel.HEADING_3,
                  spacing: { before: 200, after: 100 }
                })
              );
              
              const solutionParagraphs = solution.querySelectorAll('p');
              solutionParagraphs.forEach((p) => {
                const text = p.textContent?.trim() || '';
                if (text) {
                  paragraphs.push(
                    new Paragraph({
                      text: text,
                      spacing: { after: 100 }
                    })
                  );
                }
              });
            }
          }

          paragraphs.push(
            new Paragraph({
              text: '',
              spacing: { after: 300 }
            })
          );
        }
      });

      // Erstelle das Word-Dokument
      const wordDoc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      // Generiere und speichere
      const blob = await Packer.toBlob(wordDoc);
      const exportFileName = `${fileName}${includeSolutions ? '_mit_Musterloesung' : ''}.docx`;
      saveAs(blob, exportFileName);
      
      alert(`Klassenarbeit erfolgreich als Word-Datei exportiert!`);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ p: 1, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 1.5, bgcolor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.25 }}>
              📝 Korrekturmodus
            </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {kaFilePath.split('/').pop() || kaFilePath} {submissions.length > 0 && `• ${submissions.length} Abgabe${submissions.length > 1 ? 'n' : ''}`}
              </Typography>
            </Box>
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <Button 
                onClick={handleOpenKA}
                variant="outlined"
                size="small"
                startIcon={<Description />}
                sx={{ fontSize: '0.8rem' }}
              >
                KA öffnen
              </Button>
              <Button 
                onClick={() => exportToWord(false)}
                variant="outlined"
                size="small"
                startIcon={<FileDownload />}
                disabled={exporting}
                sx={{ fontSize: '0.8rem' }}
              >
                {exporting ? 'Exportiert...' : 'Als Word (ohne Lösung)'}
              </Button>
              <Button 
                onClick={() => exportToWord(true)}
                variant="outlined"
                size="small"
                startIcon={<FileDownload />}
                disabled={exporting}
                sx={{ fontSize: '0.8rem' }}
              >
                {exporting ? 'Exportiert...' : 'Als Word (mit Lösung)'}
              </Button>
              {submissions.length > 0 && (
                <>
                  <Button 
                    onClick={() => setShowDreierprobe(true)}
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<BarChart />}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    Dreierprobe
                  </Button>
                <Button 
                  onClick={handleResetAllSubmissions}
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={resetting}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {resetting ? 'Zurücksetzen...' : '🗑️ Zurücksetzen'}
                </Button>
                </>
              )}
              <IconButton
                onClick={onClose} 
                sx={{ 
                  p: 0,
                  minWidth: 32,
                  width: 32,
                  height: 32,
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  }
                }}
              >
                <Close sx={{ width: '100%', height: '100%' }} />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      {submissions.length > 0 && (
      <Tabs 
        value={mode} 
        onChange={(_, v) => setMode(v)} 
        sx={{ 
            mb: 1,
            minHeight: 36,
          '& .MuiTab-root': {
              minHeight: 36,
            fontWeight: 600,
            textTransform: 'none',
              fontSize: '0.8rem',
              py: 0.5,
              px: 1
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
      )}

      {submissions.length === 0 && !loading && (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#fff', borderRadius: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', mb: 1 }}>
          <Typography variant="body1" sx={{ mb: 1, color: '#666' }}>
            📭 Noch keine Abgaben
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            Es wurden noch keine Abgaben für diese Klassenarbeit eingereicht.
          </Typography>
        </Box>
      )}

      {mode === 'by-student' && selectedSubmission && (
        <Box>
          {/* Student Header Card - Kompakt */}
          <Card sx={{ mb: 1, bgcolor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              {/* Header Row: Navigation + Student Name */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75} flexWrap="wrap" gap={0.5}>
                {/* Navigation Links */}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <IconButton
                    onClick={handlePreviousStudent}
                    disabled={currentStudentIndex === 0}
                    size="small"
                    sx={{ 
                      p: 0.5,
                      width: 28,
                      height: 28
                    }}
                  >
                    <ArrowBack sx={{ fontSize: 16 }} />
                  </IconButton>
                  
                  <Box sx={{ 
                    px: 1, 
                    py: 0.25,
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    minWidth: 50,
                    textAlign: 'center'
                  }}>
                    <Typography variant="caption" sx={{ 
                      fontWeight: 700,
                      color: '#1976d2',
                      fontSize: '0.75rem'
                    }}>
                      {currentStudentIndex + 1}/{submissions.length}
                    </Typography>
                  </Box>
                  
                  <IconButton
                    onClick={handleNextStudent}
                    disabled={currentStudentIndex === submissions.length - 1}
                    size="small"
                    sx={{ 
                      p: 0.5,
                      width: 28,
                      height: 28
                    }}
                  >
                    <ArrowForward sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
                
                {/* Student Name */}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Person sx={{ color: '#1976d2', fontSize: 18 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a1a1a', fontSize: '0.85rem' }}>
                      {selectedSubmission.student.name}
                    </Typography>
                  </Box>
              </Box>
              
              {/* Info Row: Chips und Zeit */}
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                    <Chip
                    label={`Auto: ${selectedSubmission.autoPoints.toFixed(1)}`}
                      size="small"
                    sx={{ 
                      bgcolor: '#e3f2fd', 
                      color: '#1976d2', 
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 24
                    }}
                    />
                    <Chip
                    label={`Gesamt: ${selectedSubmission.totalPoints.toFixed(1)}/38`}
                      size="small"
                    sx={{ 
                      bgcolor: '#c8e6c9', 
                      color: '#2e7d32', 
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 24
                    }}
                    />
                    <Chip
                    label={selectedSubmission.status === 'submitted' ? '✅' : '⏰'}
                      size="small"
                      sx={{ 
                        bgcolor: selectedSubmission.status === 'submitted' ? '#e8f5e9' : '#fff3e0',
                        color: selectedSubmission.status === 'submitted' ? '#2e7d32' : '#f57c00',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 24
                      }}
                    />
                    <Chip
                      label={`Note: ${calculateGrade(selectedSubmission.totalPoints, 38)}`}
                      size="small"
                      sx={{ 
                        bgcolor: '#1976d2', 
                        color: '#fff', 
                        fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 24
                      }}
                    />
                  </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      {new Date(selectedSubmission.submittedAt).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Answers Section */}
          <Box>
            <Typography variant="caption" sx={{ mb: 0.75, fontWeight: 600, color: '#1a1a1a', fontSize: '0.8rem', display: 'block' }}>
              📝 Antworten
            </Typography>
            
            <Grid container spacing={0.75}>
              {Object.entries(parseAnswers(selectedSubmission.answers)).map(([taskId, answer]) => {
                const taskNumMatch = taskId.match(/a(\d+)/);
                const taskNum = taskNumMatch ? taskNumMatch[1] : '';
                const needsManualCorrection = tasksWithRechenweg.includes(taskNum);
                const correction = corrections[taskNum] || {};

                return (
                  <Grid item xs={12} key={taskId}>
                    <Card sx={{ 
                      bgcolor: '#fff', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      border: needsManualCorrection ? '1px solid #ff9800' : '1px solid #e0e0e0',
                      '&:hover': { boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }
                    }}>
                      <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.75rem' }}>
                            {taskId.toUpperCase()}
                          </Typography>
                          {needsManualCorrection && (
                            <Chip
                              label="✏️"
                              size="small"
                              sx={{ 
                                bgcolor: '#fff3e0', 
                                color: '#f57c00',
                                fontWeight: 600,
                                fontSize: '0.65rem',
                                height: 20
                              }}
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ 
                          bgcolor: answer ? '#f5f5f5' : '#ffebee',
                          p: 0.5,
                          borderRadius: 0.5,
                          mb: needsManualCorrection ? 0.75 : 0,
                          border: '1px solid #e0e0e0'
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontFamily: 'monospace',
                            fontWeight: answer ? 500 : 400,
                            color: answer ? '#1a1a1a' : '#d32f2f',
                            fontSize: '0.75rem'
                          }}>
                            {String(answer) || '(leer)'}
                          </Typography>
                        </Box>

                        {needsManualCorrection && (
                          <Box sx={{ mt: 0.75 }}>
                            <Grid container spacing={0.5}>
                              <Grid item xs={12} sm={3}>
                                <TextField
                                  label="Pkt."
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
                                      bgcolor: '#fff',
                                      fontSize: '0.75rem'
                                    },
                                    '& .MuiInputLabel-root': {
                                      fontSize: '0.7rem'
                                    }
                                  }}
                                />
                              </Grid>
                              <Grid item xs={12} sm={9}>
                                <TextField
                                  label="Kommentar"
                                  multiline
                                  rows={1}
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
                                  placeholder="Feedback..."
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: '#fff',
                                      fontSize: '0.75rem'
                                    },
                                    '& .MuiInputLabel-root': {
                                      fontSize: '0.7rem'
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
            <Card sx={{ mt: 1, bgcolor: '#e3f2fd', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 0.75, '&:last-child': { pb: 0.75 } }}>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Auto: ${selectedSubmission.autoPoints.toFixed(1)}`}
                    size="small"
                    sx={{ bgcolor: '#fff', color: '#1976d2', fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={`Manuell: ${(selectedSubmission.totalPoints - selectedSubmission.autoPoints).toFixed(1)}`}
                    size="small"
                    sx={{ bgcolor: '#fff', color: '#7b1fa2', fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={`Gesamt: ${selectedSubmission.totalPoints.toFixed(1)}/38`}
                    size="small"
                    sx={{ bgcolor: '#c8e6c9', color: '#2e7d32', fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={`Note: ${calculateGrade(selectedSubmission.totalPoints, 38)}`}
                    size="small"
                    sx={{ 
                      bgcolor: '#1976d2', 
                      color: '#fff', 
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 22
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
          <Typography variant="caption" sx={{ mb: 0.75, fontWeight: 600, color: '#1a1a1a', fontSize: '0.8rem', display: 'block' }}>
            📋 Aufgabenweise Korrektur
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
              <Card key={taskNum} sx={{ mb: 1, bgcolor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.75}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.8rem' }}>
                      Aufgabe {taskNum}
                    </Typography>
                    <Chip
                      label="✏️"
                      size="small"
                      sx={{ 
                        bgcolor: '#fff3e0', 
                        color: '#f57c00',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 20
                      }}
                    />
                  </Box>
                  
                  <TableContainer>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 700, width: '20%', fontSize: '0.7rem' }}>Schüler</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '30%', fontSize: '0.7rem' }}>Antwort</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '15%', fontSize: '0.7rem' }}>Pkt.</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '35%', fontSize: '0.7rem' }}>Kommentar</TableCell>
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
                                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                                    {submission.student.name}
                                  </Typography>
                              </TableCell>
                              <TableCell>
                                {answers.map(({ taskId, answer }) => (
                                    <Typography 
                                    key={taskId}
                                    variant="caption" 
                                      sx={{ 
                                        fontFamily: 'monospace',
                                        fontWeight: answer ? 500 : 400,
                                        color: answer ? '#1a1a1a' : '#d32f2f',
                                      fontSize: '0.7rem',
                                      display: 'block'
                                      }}
                                    >
                                      {String(answer) || '(leer)'}
                                    </Typography>
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
                                  sx={{ 
                                    width: '70px',
                                    '& .MuiOutlinedInput-root': {
                                      fontSize: '0.7rem'
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <TextField
                                  multiline
                                  rows={1}
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
                                  placeholder="..."
                                  sx={{ 
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: '#fff',
                                      fontSize: '0.7rem'
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

      {/* Dreierprobe Modal */}
      <DreierprobeModal
        open={showDreierprobe}
        onClose={() => setShowDreierprobe(false)}
        kaFilePath={kaFilePath}
        submissions={submissions}
      />
    </Box>
  );
};

export default KACorrectionMode;

