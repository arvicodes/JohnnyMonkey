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
  Stack,
  Tooltip
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
  const [corrections, setCorrections] = useState<Record<string, { points?: number; comment?: string; constructionPoints?: number }>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showDreierprobe, setShowDreierprobe] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Helper-Funktion: Bestimmt den Dateityp für Texte
  const getFileTypeName = (): string => {
    const fileName = kaFilePath.split('/').pop() || kaFilePath;
    if (fileName.startsWith('KA_')) {
      return 'Klassenarbeit';
    } else if (fileName.startsWith('HÜ_') || fileName.startsWith('HU_')) {
      return 'Hausaufgabenüberprüfung';
    }
    return 'Klassenarbeit'; // Fallback
  };

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
    if (!targetSubmissionId) {
      console.error('Keine Submission-ID verfügbar');
      alert('Fehler: Keine Abgabe ausgewählt');
      return;
    }

    try {
      setSaving(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      if (!loginCode) {
        throw new Error('Nicht angemeldet');
      }

      const requestBody = {
        submissionId: targetSubmissionId,
        taskNumber,
        manualPoints: points !== undefined && points !== null ? points : null,
        comment: comment || ''
      };

      console.log('💾 Speichere Korrektur:', requestBody);

      const response = await fetch('/api/ka-corrections/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Fehler beim Speichern der Korrektur';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('❌ API Fehler:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Korrektur gespeichert:', data);
      
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
      console.error('❌ Fehler beim Speichern der Korrektur:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert(`Fehler beim Speichern der Korrektur:\n\n${errorMessage}\n\nBitte öffnen Sie die Browser-Konsole für weitere Details.`);
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
      `Die Schüler können die ${getFileTypeName()} dann erneut bearbeiten.\n\n` +
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

  // Punkteverteilung für jede Aufgabe
  const pointsDistribution: Record<string, number> = {
    a1a: 1, a1b: 1, a1c: 1, a1d: 1, a1e: 1, a1f: 1, a1g: 1, a1h: 1,  // Aufgabe 1: 8 Punkte (je 1 Punkt pro Lücke)
    a2a: 1, a2b: 1, a2c: 1,  // Aufgabe 2: 3 Punkte (je 1 Punkt pro Frage)
    // Aufgabe 3: Koordinaten einzeln (je 0.25 Punkte pro Koordinate) + 2 Punkte Konstruktion = 5 Punkte pro Teilaufgabe
    'a3a_x': 0.25, 'a3a_y': 0.25, 'a3b_x': 0.25, 'a3b_y': 0.25, 'a3c_x': 0.25, 'a3c_y': 0.25,  // a) A₁, B₁, C₁
    'a3d_x': 0.25, 'a3d_y': 0.25, 'a3e_x': 0.25, 'a3e_y': 0.25, 'a3f_x': 0.25, 'a3f_y': 0.25,  // b) A₂, B₂, C₂
    'a3g_x': 0.25, 'a3g_y': 0.25, 'a3h_x': 0.25, 'a3h_y': 0.25, 'a3i_x': 0.25, 'a3i_y': 0.25,  // c) A₃, B₃, C₃
    'a3j_x': 0.25, 'a3j_y': 0.25, 'a3k_x': 0.25, 'a3k_y': 0.25, 'a3l_x': 0.25, 'a3l_y': 0.25   // d) A₄, B₄, C₄
  };

  // Richtige Antworten für die automatische Bewertung
  const correctAnswers: Record<string, any> = {
    // Aufgabe 1: Lückentext
    a1a: 'Mittelsenkrechte',
    a1b: 'Winkelhalbierende',
    a1c: 'Achsenspiegelung', // Alternative: Geradenspiegelung
    a1d: 'Punktspiegelung', // Alternative: Zentralspiegelung
    a1e: 'Verschiebung', // Alternative: Translation
    a1f: 'Drehung', // Alternative: Rotation
    a1g: 'Kongruenzabbildung', // Alternative: Isometrie
    a1h: 'Doppelspiegelung',
    // Aufgabe 2: Multiple Choice
    a2a: 'b',
    a2b: 'a',
    a2c: 'a',
    // Aufgabe 3: Koordinaten
    'a3a_x': -6, 'a3a_y': -4,
    'a3b_x': -3, 'a3b_y': -7,
    'a3c_x': -4, 'a3c_y': -2,
    'a3d_x': -4, 'a3d_y': -6,
    'a3e_x': -7, 'a3e_y': -3,
    'a3f_x': -2, 'a3f_y': -4,
    'a3g_x': 2, 'a3g_y': 7,
    'a3h_x': 5, 'a3h_y': 10,
    'a3i_x': 4, 'a3i_y': 5,
    'a3j_x': 10, 'a3j_y': -6,
    'a3k_x': 7, 'a3k_y': -9,
    'a3l_x': 8, 'a3l_y': -4
  };

  // Hilfsfunktion: Formatiert taskId zu "A1 a" Format
  const formatTaskId = (taskId: string): string => {
    // Beispiel: "a1a" -> "A1 a", "a2b" -> "A2 b", "a3a_x" -> "A3 a x"
    const match = taskId.match(/^a(\d+)([a-z])(?:_([xy]))?$/);
    if (match) {
      const taskNum = match[1];
      const subTask = match[2].toUpperCase();
      const coord = match[3] ? ` ${match[3]}` : '';
      return `A${taskNum} ${subTask.toLowerCase()}${coord}`;
    }
    // Fallback: Großbuchstaben mit Leerzeichen
    return taskId.replace(/([a-z])(\d)/g, '$1 $2').toUpperCase();
  };

  // Hilfsfunktion: Prüft ob eine Antwort richtig ist (ignoriert Groß-/Kleinschreibung)
  const isAnswerCorrect = (taskId: string, studentAnswer: any): boolean => {
    const correctAnswer = correctAnswers[taskId];
    if (correctAnswer === undefined) return false; // Keine automatische Bewertung
    
    const studentValue = String(studentAnswer || '').trim();
    const correctValue = String(correctAnswer).trim();
    
    // Für Koordinaten: numerischer Vergleich
    if (taskId.includes('_x') || taskId.includes('_y')) {
      const studentNum = parseFloat(studentValue);
      const correctNum = parseFloat(correctValue);
      return !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
    }
    
    // Für Text/Multiple Choice: Groß-/Kleinschreibung ignorieren
    return studentValue.toLowerCase() === correctValue.toLowerCase();
  };

  // Gruppiere Koordinaten von Aufgabe 3 nach Teilaufgaben (a, b, c, d)
  const groupTask3BySubtask = (task3Answers: Array<{ taskId: string; answer: any; isCorrect?: boolean; points?: number }>) => {
    const subtasks: Record<string, Array<{ taskId: string; answer: any; isCorrect?: boolean; points?: number }>> = {
      'a': [],
      'b': [],
      'c': [],
      'd': []
    };

    task3Answers.forEach(({ taskId, answer, isCorrect, points }) => {
      // a3a_x, a3a_y, a3b_x, a3b_y, a3c_x, a3c_y → a
      // a3d_x, a3d_y, a3e_x, a3e_y, a3f_x, a3f_y → b
      // a3g_x, a3g_y, a3h_x, a3h_y, a3i_x, a3i_y → c
      // a3j_x, a3j_y, a3k_x, a3k_y, a3l_x, a3l_y → d
      if (taskId.match(/a3[a-c][_xy]/)) {
        subtasks['a'].push({ taskId, answer, isCorrect, points });
      } else if (taskId.match(/a3[d-f][_xy]/)) {
        subtasks['b'].push({ taskId, answer, isCorrect, points });
      } else if (taskId.match(/a3[g-i][_xy]/)) {
        subtasks['c'].push({ taskId, answer, isCorrect, points });
      } else if (taskId.match(/a3[j-l][_xy]/)) {
        subtasks['d'].push({ taskId, answer, isCorrect, points });
      }
    });

    return subtasks;
  };

  // Gruppiere Antworten nach Aufgaben
  const groupAnswersByTask = (answers: Record<string, any>) => {
    const grouped: Record<string, Array<{ taskId: string; answer: any; isCorrect?: boolean; points?: number }>> = {
      '1': [],
      '2': [],
      '3': []
    };

    Object.entries(answers).forEach(([taskId, answer]) => {
      const taskMatch = taskId.match(/a(\d+)/);
      if (taskMatch) {
        const taskNum = taskMatch[1];
        if (['1', '2', '3'].includes(taskNum)) {
          const isCorrect = isAnswerCorrect(taskId, answer);
          const points = pointsDistribution[taskId] || 0;
          if (!grouped[taskNum]) grouped[taskNum] = [];
          grouped[taskNum].push({ taskId, answer, isCorrect, points });
        }
      }
    });

    return grouped;
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

  // Punkte-zu-Note-Zuordnung für Tooltip
  const getGradeScale = (total: number): string => {
    const scale = [
      `1+: ${Math.ceil(total * 0.97)} - ${total} Punkte`,
      `1: ${Math.ceil(total * 0.95)} - ${Math.floor(total * 0.97)} Punkte`,
      `1-: ${Math.ceil(total * 0.92)} - ${Math.floor(total * 0.95)} Punkte`,
      `2+: ${Math.ceil(total * 0.86)} - ${Math.floor(total * 0.92)} Punkte`,
      `2: ${Math.ceil(total * 0.84)} - ${Math.floor(total * 0.86)} Punkte`,
      `2-: ${Math.ceil(total * 0.81)} - ${Math.floor(total * 0.84)} Punkte`,
      `3+: ${Math.ceil(total * 0.72)} - ${Math.floor(total * 0.81)} Punkte`,
      `3: ${Math.ceil(total * 0.70)} - ${Math.floor(total * 0.72)} Punkte`,
      `3-: ${Math.ceil(total * 0.67)} - ${Math.floor(total * 0.70)} Punkte`,
      `4+: ${Math.ceil(total * 0.55)} - ${Math.floor(total * 0.67)} Punkte`,
      `4: ${Math.ceil(total * 0.53)} - ${Math.floor(total * 0.55)} Punkte`,
      `4-: ${Math.ceil(total * 0.50)} - ${Math.floor(total * 0.53)} Punkte`,
      `5+: ${Math.ceil(total * 0.35)} - ${Math.floor(total * 0.50)} Punkte`,
      `5: ${Math.ceil(total * 0.33)} - ${Math.floor(total * 0.35)} Punkte`,
      `5-: ${Math.ceil(total * 0.30)} - ${Math.floor(total * 0.33)} Punkte`,
      `6: 0 - ${Math.floor(total * 0.30)} Punkte`
    ];
    return scale.join('\n');
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
        alert(`${getFileTypeName()} konnte nicht geöffnet werden. (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Fehler beim Öffnen der Klassenarbeit:', error);
      alert(`Fehler beim Öffnen der ${getFileTypeName()}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
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
      const title = doc.querySelector('title')?.textContent || getFileTypeName();
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
      
      alert(`${getFileTypeName()} erfolgreich als Word-Datei exportiert!`);
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
            Es wurden noch keine Abgaben für diese {getFileTypeName()} eingereicht.
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
                    <Tooltip 
                      title={getGradeScale(38)}
                      arrow
                      placement="top"
                    >
                      <Chip
                        label={`Note: ${calculateGrade(selectedSubmission.totalPoints, 38)}`}
                        size="small"
                        sx={{ 
                          bgcolor: '#1976d2', 
                          color: '#fff', 
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          height: 24,
                          cursor: 'help'
                        }}
                      />
                    </Tooltip>
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

          {/* Answers Section - Gruppiert nach Aufgaben */}
          <Box>
            {(() => {
              const answers = parseAnswers(selectedSubmission.answers);
              const groupedAnswers = groupAnswersByTask(answers);
              
              const taskSections: React.ReactElement[] = [];
              
              ['1', '2', '3'].forEach((taskNum: string) => {
                const taskAnswers = groupedAnswers[taskNum] || [];
                if (taskAnswers.length === 0) return;

                // Berechne erreichte und maximale Punkte für diese Aufgabe
                let totalPoints = 0;
                let achievedPoints = 0;
                
                if (taskNum === '3') {
                  // Aufgabe 3: Spezielle Behandlung - Koordinatenpunkte (automatisch, 0.25 pro Koordinate) + Konstruktionspunkte (manuell, 0-2)
                  const subtasks = groupTask3BySubtask(taskAnswers);
                  const processedSubtasks = new Set<string>();
                  
                  // Iteriere nur über die Teilaufgaben (a, b, c, d), nicht über alle Koordinaten
                  ['a', 'b', 'c', 'd'].forEach((subtaskLetter: string) => {
                    const subtaskKey = `3${subtaskLetter}`;
                    const subtaskAnswers = subtasks[subtaskLetter] || [];
                    
                    if (subtaskAnswers.length > 0) {
                      const subtaskCorrection = corrections[subtaskKey] || {};
                      
                      // Automatische Bewertung: jede richtige Koordinate = 0.25 Punkte
                      const coordinatePoints = subtaskAnswers.reduce((sum, item) => {
                        if (item.isCorrect === true) {
                          return sum + (pointsDistribution[item.taskId] || 0);
                        }
                        return sum;
                      }, 0);
                      
                      // Konstruktionspunkte (0-2) aus manueller Korrektur
                      const constructionPoints = subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null 
                        ? subtaskCorrection.constructionPoints 
                        : 0;
                      
                      achievedPoints += coordinatePoints + constructionPoints;
                      
                      // Gesamtpunkte: 3.5 Punkte pro Teilaufgabe (1.5 Punkte für Koordinaten maximal + 2 Punkte Konstruktion)
                      totalPoints += 3.5;
                    }
                  });
                } else {
                  // Aufgabe 1 und 2: Normale Berechnung
                  taskAnswers.forEach(({ taskId, isCorrect }) => {
                    const maxPoints = pointsDistribution[taskId] || 0;
                    totalPoints += maxPoints;
                    
                    if (isCorrect === true) {
                      achievedPoints += maxPoints;
                    } else if (isCorrect === false) {
                      achievedPoints += 0;
                    } else if (taskNum === '1') {
                      // Aufgabe 1: Manuelle Korrektur, verwende points aus correction falls vorhanden
                      const correction = corrections[taskId] || {};
                      achievedPoints += correction.points || 0;
                    }
                  });
                }

                taskSections.push(
                  <Box key={taskNum} sx={{ mb: 1.5 }}>
                    {/* Aufgabenüberschrift */}
                    <Typography variant="subtitle2" sx={{ 
                      mb: 0.75, 
                      fontWeight: 700, 
                      color: '#1976d2', 
                      fontSize: '0.9rem',
                      borderBottom: '2px solid #1976d2',
                      pb: 0.5
                    }}>
                      Aufgabe {taskNum} <span style={{ color: '#666', fontWeight: 500, fontSize: '0.85rem' }}>({achievedPoints % 1 === 0 ? achievedPoints : achievedPoints.toFixed(2)} / {totalPoints % 1 === 0 ? totalPoints : totalPoints.toFixed(2)})</span>
            </Typography>
            
                    {/* Lösungen dieser Aufgabe */}
                    <Grid container spacing={0.5}>
                      {taskNum === '3' ? (
                        // Aufgabe 3: Nach Teilaufgaben gruppiert (a, b, c, d)
                        (() => {
                          const subtasks = groupTask3BySubtask(taskAnswers);
                          const needsManualCorrection = tasksWithRechenweg.includes('3');
                          const task3CommentKey = '3_comment';
                          const task3Comment = corrections[task3CommentKey]?.comment || '';
                          
                          return (
                            <>
                              {['a', 'b', 'c', 'd'].map((subtask: string) => {
                            const subtaskAnswers = subtasks[subtask] || [];
                            if (subtaskAnswers.length === 0) return null;

                            // Berechne Gesamtpunkte für diese Teilaufgabe
                            // Pro Teilaufgabe: 6 Koordinaten (A_x, A_y, B_x, B_y, C_x, C_y) × 0.25 = 1.5 Punkte + 2 Punkte für Konstruktion = 3.5 Punkte
                            const coordinatePoints = subtaskAnswers.reduce((sum, item) => {
                              const maxPoints = pointsDistribution[item.taskId] || 0;
                              return sum + maxPoints;
                            }, 0);
                            const constructionPoints = 2; // Zusätzliche Punkte für Konstruktion
                            const totalPoints = coordinatePoints + constructionPoints; // 1.5 + 2 = 3.5 Punkte

                            // Korrektur für diese Teilaufgabe (z.B. "3a")
                            const subtaskKey = `3${subtask}`;
                            const correction = corrections[subtaskKey] || {};
                            
                            // Berechne erreichte Punkte: Koordinatenpunkte (automatisch) + Konstruktionspunkte (manuell)
                            // Automatische Bewertung: jede richtige Koordinate = 0.5 Punkte
                            const coordinateAchieved = subtaskAnswers.reduce((sum, item) => {
                              const maxPoints = pointsDistribution[item.taskId] || 0;
                              if (item.isCorrect === true) {
                                return sum + maxPoints;
                              } else {
                                return sum + 0;
                              }
                            }, 0);
                            
                            // Konstruktionspunkte (0-2) aus manueller Korrektur
                            const constructionAchieved = correction && correction.constructionPoints !== undefined && correction.constructionPoints !== null 
                              ? correction.constructionPoints 
                              : 0;
                            
                            const achievedPoints = coordinateAchieved + constructionAchieved;
                            const needsManualCorrection = tasksWithRechenweg.includes('3');

                            // Bestimme Hintergrundfarbe basierend auf Bewertung
                            let bgColor = '#f5f5f5';
                            let borderColor = '#e0e0e0';
                            const allCorrect = subtaskAnswers.every(item => item.isCorrect === true);
                            const someCorrect = subtaskAnswers.some(item => item.isCorrect === true);
                            
                            if (allCorrect && subtaskAnswers.length > 0) {
                              bgColor = '#e8f5e9';
                              borderColor = '#4caf50';
                            } else if (someCorrect) {
                              bgColor = '#fff3e0';
                              borderColor = '#ff9800';
                            } else {
                              bgColor = '#ffebee';
                              borderColor = '#f44336';
                            }

                            // Formatiere Koordinaten für Anzeige in Punkt-Schreibweise
                            const formatCoordinates = () => {
                              // Gruppiere x und y Koordinaten nach Punkt
                              const points: Record<string, { x?: any; y?: any }> = {};
                              subtaskAnswers.forEach(({ taskId, answer }) => {
                                const pointMatch = taskId.match(/a3([a-l])/);
                                if (pointMatch) {
                                  const pointLetter = pointMatch[1];
                                  const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97)); // a->A, b->B, etc.
                                  if (!points[pointName]) points[pointName] = {};
                                  if (taskId.includes('_x')) {
                                    points[pointName].x = answer;
                                  } else if (taskId.includes('_y')) {
                                    points[pointName].y = answer;
                                  }
                                }
                              });
                              
                              // Formatiere als P(x|y)
                              return Object.entries(points)
                                .map(([pointName, coords]) => {
                                  const x = coords.x !== undefined && coords.x !== null && coords.x !== '' ? coords.x : '?';
                                  const y = coords.y !== undefined && coords.y !== null && coords.y !== '' ? coords.y : '?';
                                  return `${pointName}(${x}|${y})`;
                                })
                                .join(', ');
                            };

                            // Formatiere korrekte Koordinaten in Punkt-Schreibweise
                            const formatCorrectCoordinates = () => {
                              // Gruppiere x und y Koordinaten nach Punkt
                              const points: Record<string, { x?: any; y?: any }> = {};
                              subtaskAnswers.forEach(({ taskId }) => {
                                const correctAnswer = correctAnswers[taskId];
                                if (correctAnswer !== undefined) {
                                  const pointMatch = taskId.match(/a3([a-l])/);
                                  if (pointMatch) {
                                    const pointLetter = pointMatch[1];
                                    const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97));
                                    if (!points[pointName]) points[pointName] = {};
                                    if (taskId.includes('_x')) {
                                      points[pointName].x = correctAnswer;
                                    } else if (taskId.includes('_y')) {
                                      points[pointName].y = correctAnswer;
                                    }
                                  }
                                }
                              });
                              
                              // Formatiere als P(x|y)
                              return Object.entries(points)
                                .map(([pointName, coords]) => {
                                  const x = coords.x !== undefined ? coords.x : '?';
                                  const y = coords.y !== undefined ? coords.y : '?';
                                  return `${pointName}(${x}|${y})`;
                                })
                                .join(', ');
                            };

                            return (
                              <Grid item xs={12} sm={6} md={4} key={`3${subtask}`}>
                                <Card sx={{ 
                                  bgcolor: bgColor,
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                  border: `1px solid ${borderColor}`,
                                  '&:hover': { boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
                                  height: '100%'
                                }}>
                                  <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
                                    {/* Header: Teilaufgabe + Punkte */}
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
                                      <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.7rem' }}>
                                          A3 {subtask}
                                        </Typography>
                                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                                      {achievedPoints % 1 === 0 ? achievedPoints : achievedPoints.toFixed(2)} / {totalPoints % 1 === 0 ? totalPoints : totalPoints.toFixed(2)}
                                    </Typography>
                                      </Box>
                                      <Box display="flex" gap={0.25} alignItems="center">
                                        {allCorrect && (
                                          <Chip
                                            label="✓"
                                            size="small"
                                            sx={{ 
                                              bgcolor: '#4caf50', 
                                              color: '#fff',
                                              height: 18,
                                              fontSize: '0.6rem',
                                              fontWeight: 700,
                                              '& .MuiChip-label': { px: 0.5 }
                                            }}
                                          />
                                        )}
                                        {!allCorrect && someCorrect && (
                                          <Chip
                                            label="~"
                                            size="small"
                                            sx={{ 
                                              bgcolor: '#ff9800', 
                                              color: '#fff',
                                              height: 18,
                                              fontSize: '0.6rem',
                                              fontWeight: 700,
                                              '& .MuiChip-label': { px: 0.5 }
                                            }}
                                          />
                                        )}
                                        {!someCorrect && subtaskAnswers.length > 0 && (
                                          <Chip
                                            label="✗"
                                            size="small"
                                            sx={{ 
                                              bgcolor: '#f44336', 
                                              color: '#fff',
                                              height: 18,
                                              fontSize: '0.6rem',
                                              fontWeight: 700,
                                              '& .MuiChip-label': { px: 0.5 }
                                            }}
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                    
                                    {/* Koordinaten Anzeige */}
                                    <Box sx={{ 
                                      bgcolor: 'rgba(255,255,255,0.5)',
                                      p: 0.25,
                                      borderRadius: 0.25,
                                      mb: needsManualCorrection ? 0.5 : 0,
                                      border: '1px solid rgba(0,0,0,0.1)',
                                      minHeight: 24
                                    }}>
                                      <Typography variant="caption" sx={{ 
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        lineHeight: 1.2
                                      }}>
                                        {(() => {
                                          // Gruppiere x und y Koordinaten nach Punkt
                                          const points: Record<string, { x?: any; y?: any; xCorrect?: boolean; yCorrect?: boolean }> = {};
                                          subtaskAnswers.forEach(({ taskId, answer, isCorrect }) => {
                                            const pointMatch = taskId.match(/a3([a-l])/);
                                            if (pointMatch) {
                                              const pointLetter = pointMatch[1];
                                              const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97));
                                              if (!points[pointName]) points[pointName] = {};
                                              if (taskId.includes('_x')) {
                                                points[pointName].x = answer;
                                                points[pointName].xCorrect = isCorrect;
                                              } else if (taskId.includes('_y')) {
                                                points[pointName].y = answer;
                                                points[pointName].yCorrect = isCorrect;
                                              }
                                            }
                                          });
                                          
                                          // Formatiere als P(x|y) mit Farben
                                          return Object.entries(points).map(([pointName, coords], idx) => {
                                            const x = coords.x !== undefined && coords.x !== null && coords.x !== '' ? coords.x : '?';
                                            const y = coords.y !== undefined && coords.y !== null && coords.y !== '' ? coords.y : '?';
                                            const xColor = coords.xCorrect === true ? '#2e7d32' : coords.xCorrect === false ? '#c62828' : '#1a1a1a';
                                            const yColor = coords.yCorrect === true ? '#2e7d32' : coords.yCorrect === false ? '#c62828' : '#1a1a1a';
                                            
                                            return (
                                              <span key={pointName}>
                                                {idx > 0 && ', '}
                                                {pointName}(
                                                <span style={{ color: xColor }}>{x}</span>|
                                                <span style={{ color: yColor }}>{y}</span>)
                                              </span>
                                            );
                                          });
                                        })()}
                                      </Typography>
                                      <Typography variant="caption" sx={{ 
                                        fontFamily: 'monospace',
                                        fontSize: '0.7rem',
                                        lineHeight: 1.2,
                                        color: '#2e7d32',
                                        display: 'block',
                                        mt: 0.25
                                      }}>
                                        {formatCorrectCoordinates()}
                                      </Typography>
                                    </Box>

                                    {/* Eingabefeld: Konstruktionspunkte pro Teilaufgabe */}
                                    {needsManualCorrection && (
                                      <Box sx={{ mt: 0.5 }}>
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                          <TextField
                                            label="Konstruktion"
                                            type="number"
                                            value={correction.constructionPoints ?? ''}
                                            onChange={(e) => {
                                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                              setCorrections(prev => ({
                                                ...prev,
                                                [subtaskKey]: { ...prev[subtaskKey], constructionPoints: value }
                                              }));
                                            }}
                                            onBlur={() => {
                                              // Speichere die Konstruktionspunkte
                                              const currentCorrection = corrections[subtaskKey] || {};
                                              saveCorrection(subtaskKey, currentCorrection.points, currentCorrection.comment);
                                            }}
                                            inputProps={{ min: 0, max: 2, step: 0.5 }}
                                            size="small"
                                            sx={{ 
                                              width: 100,
                                              '& .MuiOutlinedInput-root': {
                                                bgcolor: '#e3f2fd',
                                                border: '2px solid #9c27b0',
                                                fontSize: '0.7rem',
                                                height: 32,
                                                '&:hover': {
                                                  border: '2px solid #7b1fa2'
                                                },
                                                '&.Mui-focused': {
                                                  border: '2px solid #7b1fa2'
                                                }
                                              },
                                              '& .MuiInputLabel-root': {
                                                fontSize: '0.65rem'
                                              }
                                            }}
                                          />
                                          <Typography variant="caption" sx={{ color: '#9c27b0', fontSize: '0.7rem', fontWeight: 500 }}>
                                            max: 2
                                          </Typography>
                                        </Box>
                                      </Box>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          }).filter(Boolean)}
                          
                          {/* Kommentarbox für die ganze Aufgabe 3 - direkt nach den Teilaufgaben */}
                          {needsManualCorrection && (
                            <Grid item xs={12} sx={{ mt: 0.5 }}>
                              <TextField
                                label="Kommentar"
                                multiline
                                rows={3}
                                value={task3Comment}
                                onChange={(e) => {
                                  setCorrections(prev => ({
                                    ...prev,
                                    [task3CommentKey]: { ...prev[task3CommentKey], comment: e.target.value }
                                  }));
                                }}
                                onBlur={() => {
                                  const currentCorrection = corrections[task3CommentKey] || {};
                                  saveCorrection(task3CommentKey, currentCorrection.points, currentCorrection.comment);
                                }}
                                size="small"
                                placeholder="Kommentar für die gesamte Aufgabe 3..."
                                fullWidth
                                sx={{ 
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: '#e3f2fd',
                                    border: '2px solid #9c27b0',
                                    fontSize: '0.7rem',
                                    '&:hover': {
                                      border: '2px solid #7b1fa2'
                                    },
                                    '&.Mui-focused': {
                                      border: '2px solid #7b1fa2'
                                    }
                                  },
                                  '& .MuiInputLabel-root': {
                                    fontSize: '0.65rem'
                                  }
                                }}
                              />
                            </Grid>
                          )}
                        </>
                        );
                        })()
                      ) : (
                        // Aufgabe 1 und 2: Einzelne Antworten
                        taskAnswers.map(({ taskId, answer, isCorrect, points }) => {
                const needsManualCorrection = tasksWithRechenweg.includes(taskNum);
                const correction = corrections[taskNum] || {};
                        
                        // Bestimme Hintergrundfarbe basierend auf Bewertung
                        let bgColor = '#f5f5f5';
                        let borderColor = '#e0e0e0';
                        let textColor = '#1a1a1a';
                        
                        if (answer && answer.toString().trim() !== '') {
                          if (isCorrect !== undefined) {
                            if (isCorrect) {
                              bgColor = '#e8f5e9';
                              borderColor = '#4caf50';
                              textColor = '#2e7d32';
                            } else {
                              if (taskNum === '1') {
                                // Aufgabe 1: Keine automatische Bewertung, neutral
                                bgColor = '#fff3e0';
                                borderColor = '#ff9800';
                              } else {
                                bgColor = '#ffebee';
                                borderColor = '#f44336';
                                textColor = '#c62828';
                              }
                            }
                          }
                        } else {
                          bgColor = '#ffebee';
                          borderColor = '#f44336';
                          textColor = '#d32f2f';
                        }

                        // Berechne erreichte Punkte
                        let achievedPoints = 0;
                        if (isCorrect === true) {
                          achievedPoints = points || 0;
                        } else if (isCorrect === false) {
                          achievedPoints = 0;
                        } else {
                          // Aufgabe 1: Keine automatische Bewertung
                          achievedPoints = points || 0; // Wird manuell korrigiert
                        }

                return (
                          <Grid item xs={12} sm={6} md={4} key={taskId}>
                    <Card sx={{ 
                              bgcolor: bgColor,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              border: `1px solid ${borderColor}`,
                              '&:hover': { boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
                              height: '100%'
                            }}>
                              <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
                                {/* Kompakte Header-Zeile: Aufgabe + Status + Punkte */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.7rem' }}>
                                      {formatTaskId(taskId)}
                          </Typography>
                                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                                      {Math.round(achievedPoints)} / {Math.round(points || 0)}
                                    </Typography>
                                  </Box>
                                  <Box display="flex" gap={0.25} alignItems="center">
                                    {isCorrect === true && (
                                      <Chip
                                        label="✓"
                                        size="small"
                                        sx={{ 
                                          bgcolor: '#4caf50', 
                                          color: '#fff',
                                          height: 18,
                                          fontSize: '0.6rem',
                                          fontWeight: 700,
                                          '& .MuiChip-label': { px: 0.5 }
                                        }}
                                      />
                                    )}
                                    {isCorrect === false && taskNum !== '1' && (
                                      <Chip
                                        label="✗"
                                        size="small"
                                        sx={{ 
                                          bgcolor: '#f44336', 
                                          color: '#fff',
                                          height: 18,
                                          fontSize: '0.6rem',
                                          fontWeight: 700,
                                          '& .MuiChip-label': { px: 0.5 }
                                        }}
                                      />
                                    )}
                          {needsManualCorrection && (
                            <Chip
                              label="✏️"
                              size="small"
                              sx={{ 
                                bgcolor: '#fff3e0', 
                                color: '#f57c00',
                                          height: 18,
                                          fontSize: '0.6rem',
                                          '& .MuiChip-label': { px: 0.5 }
                              }}
                            />
                          )}
                                  </Box>
                        </Box>
                        
                                {/* Antwort kompakt */}
                        <Box sx={{ 
                                  bgcolor: 'rgba(255,255,255,0.5)',
                                  p: 0.25,
                                  borderRadius: 0.25,
                                  mb: needsManualCorrection ? 0.5 : 0,
                                  border: '1px solid rgba(0,0,0,0.1)',
                                  minHeight: 24
                        }}>
                          <Typography variant="caption" sx={{ 
                            fontFamily: 'monospace',
                            fontWeight: answer ? 500 : 400,
                                    color: textColor,
                                    fontSize: '0.7rem',
                                    lineHeight: 1.2,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                          }}>
                            {String(answer) || '(leer)'}
                                    {correctAnswers[taskId] !== undefined && (
                                      <span style={{ color: '#2e7d32', marginLeft: '8px' }}>
                                        ({String(correctAnswers[taskId])})
                                      </span>
                                    )}
                          </Typography>
                        </Box>

                                {/* Eingabefelder kompakt in einer Zeile */}
                        {needsManualCorrection && (
                                  <Box sx={{ mt: 0.5 }}>
                                    <Box display="flex" gap={0.5} alignItems="flex-start">
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
                                  sx={{ 
                                          width: 70,
                                    '& .MuiOutlinedInput-root': {
                                            bgcolor: '#fff3e0',
                                            border: '1px solid #ff9800',
                                            fontSize: '0.7rem',
                                            height: 32
                                    },
                                    '& .MuiInputLabel-root': {
                                            fontSize: '0.65rem'
                                    }
                                  }}
                                />
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
                                  size="small"
                                        placeholder="..."
                                  sx={{ 
                                          flex: 1,
                                    '& .MuiOutlinedInput-root': {
                                      bgcolor: '#fff',
                                            fontSize: '0.7rem',
                                            height: 32
                                    },
                                    '& .MuiInputLabel-root': {
                                            fontSize: '0.65rem'
                                    }
                                  }}
                                />
                                    </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
                      })
                      )}
            </Grid>
                  </Box>
                );
              });
              
              return taskSections;
            })()}
          </Box>
          
          {/* Summary Card - Kompakt */}
          <Card sx={{ mt: 0.75, bgcolor: '#e3f2fd', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }}>
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
                  <Tooltip 
                    title={getGradeScale(38)}
                    arrow
                    placement="top"
                  >
                    <Chip
                      label={`Note: ${calculateGrade(selectedSubmission.totalPoints, 38)}`}
                      size="small"
                      sx={{ 
                        bgcolor: '#1976d2', 
                        color: '#fff', 
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 22,
                        cursor: 'help'
                      }}
                    />
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
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

