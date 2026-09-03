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
import { examAnswerMatches, formatExamCorrect, parseExamAnswerKey } from '../lib/examAnswerKey';

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
  const [learningGroupStudents, setLearningGroupStudents] = useState<Array<{ id: string; name: string; loginCode: string }>>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, any>>({});
  const [examPoints, setExamPoints] = useState<Record<string, number>>({});
  const [examMaxPoints, setExamMaxPoints] = useState(0);
  const [useGeometryTask3, setUseGeometryTask3] = useState(false);

  // Helper-Funktion: Bestimmt den Dateityp für Texte
  const getFileTypeName = (): string => {
    const fileName = kaFilePath.split('/').pop() || kaFilePath;
    if (fileName.startsWith('KA_')) {
      return 'Klassenarbeit';
    } else if (fileName.startsWith('HÜ_') || fileName.startsWith('HU_')) {
      return 'Hausaufgabenüberprüfung';
    } else if (fileName.startsWith('QZ_')) {
      return 'Quiz';
    }
    return 'Klassenarbeit'; // Fallback
  };

  useEffect(() => {
    loadSubmissions();
  }, [kaFilePath]);

  useEffect(() => {
    let cancelled = false;
    const loadKey = async () => {
      try {
        const res = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`,
        );
        if (!res.ok) throw new Error('html');
        const html = await res.text();
        if (cancelled) return;
        const parsed = parseExamAnswerKey(html);
        if (Object.keys(parsed.answers).length > 0) {
          setExamAnswers(parsed.answers);
          setExamPoints(parsed.points);
          setExamMaxPoints(parsed.maxPoints);
          setUseGeometryTask3(parsed.isGeometry);
          return;
        }
      } catch {
        /* Datei ohne Schlüssel */
      }
      if (cancelled) return;
      if (/geometr/i.test(kaFilePath)) {
        setExamAnswers(GEOMETRY_ANSWERS);
        setExamPoints(GEOMETRY_POINTS);
        setExamMaxPoints(25);
        setUseGeometryTask3(true);
      } else {
        setExamAnswers({});
        setExamPoints({});
        setExamMaxPoints(0);
        setUseGeometryTask3(false);
      }
    };
    void loadKey();
    return () => {
      cancelled = true;
    };
  }, [kaFilePath]);

  useEffect(() => {
    loadLearningGroup();
  }, [submissions]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Verwende den vollständigen kaFilePath, nicht nur den Dateinamen
      // Die API kann mit verschiedenen Pfad-Varianten umgehen (getPossiblePaths)
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
        // Kein Fehler werfen, sondern einfach leere Liste setzen
        setSubmissions([]);
        return;
      }

      const data = await response.json();
      console.log('✅ Abgaben geladen:', data.submissions?.length || 0, 'Abgaben gefunden');
      console.log('📋 Daten:', data);
      setSubmissions(data.submissions || []);
      
      // Lade alle Korrekturen für alle Submissions in den State (für aufgabenweise Ansicht)
      const allCorrections: Record<string, { points?: number; comment?: string; constructionPoints?: number }> = {};
      data.submissions?.forEach((submission: KASubmission) => {
        submission.corrections?.forEach((corr: KACorrection) => {
          const correctionKey = `${submission.id}_${corr.taskNumber}`;
          // Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d): manualPoints sind die Konstruktionspunkte
          if (corr.taskNumber.match(/^3[a-d]$/)) {
            allCorrections[correctionKey] = {
              constructionPoints: corr.manualPoints,
              comment: corr.comment || ''
            };
          } else if (corr.taskNumber === '3_comment') {
            // Kommentar für die ganze Aufgabe 3
            allCorrections[correctionKey] = {
              comment: corr.comment || ''
            };
          } else {
            // Für andere Aufgaben: manualPoints sind die normalen Punkte
            allCorrections[correctionKey] = {
              points: corr.manualPoints,
              comment: corr.comment || ''
            };
          }
        });
      });
      setCorrections(allCorrections);
      
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

  const loadLearningGroup = async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Lade alle Lerngruppen des Lehrers
      const response = await fetch('/api/learning-groups', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const groups = await response.json();
        
        // Wenn Submissions vorhanden, finde die Gruppe basierend auf dem ersten Schüler
        if (submissions.length > 0) {
          const firstStudentId = submissions[0]?.student?.id;
          if (firstStudentId) {
            const group = groups.find((g: any) => 
              g.students?.some((s: any) => s.id === firstStudentId)
            );
            
            if (group && group.students) {
              setLearningGroupStudents(group.students);
              return;
            }
          }
        }
        
        // Wenn keine Submissions oder keine passende Gruppe gefunden,
        // nimm die erste verfügbare Gruppe
        if (groups.length > 0 && groups[0].students) {
          setLearningGroupStudents(groups[0].students);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Lerngruppe:', error);
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
        // Lade bestehende Korrekturen - verwende das gleiche Key-Format wie loadSubmissions
        // Aktualisiere nur die Korrekturen für diesen Schüler, überschreibe nicht den gesamten State
        // Wichtig: Setze Werte aus der DB, auch wenn sie bereits im State sind (beim Neuladen)
        // Aber nur wenn der Wert im State undefined ist, um lokale Änderungen zu erhalten
        setCorrections(prev => {
          const updated = { ...prev };
        submission.corrections?.forEach((corr: KACorrection) => {
            const correctionKey = `${submission.id}_${corr.taskNumber}`;
            // Setze Wert aus DB, wenn Key nicht existiert oder Wert im State undefined ist
            const currentValue = updated[correctionKey];
            if (currentValue === undefined || 
                (corr.taskNumber.match(/^3[a-d]$/) && currentValue.constructionPoints === undefined) ||
                (!corr.taskNumber.match(/^3[a-d]$/) && corr.taskNumber !== '3_comment' && currentValue.points === undefined)) {
          // Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d): manualPoints sind die Konstruktionspunkte
          if (corr.taskNumber.match(/^3[a-d]$/)) {
                updated[correctionKey] = {
                  ...currentValue,
              constructionPoints: corr.manualPoints,
                  comment: corr.comment || currentValue?.comment || ''
                };
              } else if (corr.taskNumber === '3_comment') {
                // Kommentar für die ganze Aufgabe 3
                updated[correctionKey] = {
                  ...currentValue,
              comment: corr.comment || ''
            };
          } else {
            // Für andere Aufgaben: manualPoints sind die normalen Punkte
                updated[correctionKey] = {
                  ...currentValue,
            points: corr.manualPoints,
                  comment: corr.comment || currentValue?.comment || ''
          };
              }
          }
        });
          return updated;
        });
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

      // Validiere Punkte: Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d) sind nur 0-2 erlaubt
      let validatedPoints: number | undefined = points;
      if (taskNumber.match(/^3[a-d]$/)) {
        if (validatedPoints !== undefined && validatedPoints !== null) {
          // Wenn Wert außerhalb des Bereichs: nicht speichern (undefined setzen)
          if (validatedPoints < 0 || validatedPoints > 2) {
            validatedPoints = undefined;
          }
        }
      }

      const requestBody = {
        submissionId: targetSubmissionId,
        taskNumber,
        manualPoints: validatedPoints !== undefined && validatedPoints !== null ? validatedPoints : null,
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
      
      // Update local state - preserve existing constructionPoints
      const correctionKey = submissionIdOverride ? `${submissionIdOverride}_${taskNumber}` : taskNumber;
      // Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d): points sind die Konstruktionspunkte
      if (taskNumber.match(/^3[a-d]$/)) {
        setCorrections(prev => ({
          ...prev,
          [correctionKey]: { ...prev[correctionKey], constructionPoints: points, comment }
        }));
      } else {
      setCorrections(prev => ({
        ...prev,
        [correctionKey]: { ...prev[correctionKey], points, comment }
      }));
      }

      // Update submission in local state without reloading all submissions
      // This prevents the modal from reloading on every blur event
      if (submissionIdOverride) {
        setSubmissions(prev => prev.map(sub => {
          if (sub.id === submissionIdOverride) {
            // Update corrections array
            const updatedCorrections = sub.corrections ? [...sub.corrections] : [];
            const existingCorrectionIndex = updatedCorrections.findIndex(c => c.taskNumber === taskNumber);
            
            if (existingCorrectionIndex >= 0) {
              updatedCorrections[existingCorrectionIndex] = {
                ...updatedCorrections[existingCorrectionIndex],
                manualPoints: points,
                comment: comment || ''
              };
            } else {
              updatedCorrections.push({
                id: '',
                taskNumber,
                manualPoints: points,
                comment: comment || ''
              });
            }
            
            // Recalculate totalPoints
            const autoPoints = sub.autoPoints || 0;
            const manualPointsSum = updatedCorrections.reduce((sum, c) => sum + (c.manualPoints || 0), 0);
            const newTotalPoints = autoPoints + manualPointsSum;
            
            return {
              ...sub,
              corrections: updatedCorrections,
              totalPoints: newTotalPoints
            };
          }
          return sub;
        }));
      } else if (selectedSubmission) {
        // Update selected submission
        const updatedCorrections = selectedSubmission.corrections ? [...selectedSubmission.corrections] : [];
        const existingCorrectionIndex = updatedCorrections.findIndex(c => c.taskNumber === taskNumber);
        
        if (existingCorrectionIndex >= 0) {
          updatedCorrections[existingCorrectionIndex] = {
            ...updatedCorrections[existingCorrectionIndex],
            manualPoints: points,
            comment: comment || ''
          };
        } else {
          updatedCorrections.push({
            id: '',
            taskNumber,
            manualPoints: points,
            comment: comment || ''
          });
        }
        
        // Recalculate totalPoints
        const autoPoints = selectedSubmission.autoPoints || 0;
        const manualPointsSum = updatedCorrections.reduce((sum, c) => sum + (c.manualPoints || 0), 0);
        const newTotalPoints = autoPoints + manualPointsSum;
        
        const updatedSubmission = {
          ...selectedSubmission,
          corrections: updatedCorrections,
          totalPoints: newTotalPoints
        };
        
        setSelectedSubmission(updatedSubmission);
        
        // Also update in submissions array
        setSubmissions(prev => prev.map(sub => 
          sub.id === selectedSubmission.id ? updatedSubmission : sub
        ));
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

  const GEOMETRY_POINTS: Record<string, number> = {
    a1a: 1, a1b: 1, a1c: 1, a1d: 1, a1e: 1, a1f: 1, a1g: 1, a1h: 1,
    a2a: 1, a2b: 1, a2c: 1,
    'a3a_x': 0.25, 'a3a_y': 0.25, 'a3b_x': 0.25, 'a3b_y': 0.25, 'a3c_x': 0.25, 'a3c_y': 0.25,
    'a3d_x': 0.25, 'a3d_y': 0.25, 'a3e_x': 0.25, 'a3e_y': 0.25, 'a3f_x': 0.25, 'a3f_y': 0.25,
    'a3g_x': 0.25, 'a3g_y': 0.25, 'a3h_x': 0.25, 'a3h_y': 0.25, 'a3i_x': 0.25, 'a3i_y': 0.25,
    'a3j_x': 0.25, 'a3j_y': 0.25, 'a3k_x': 0.25, 'a3k_y': 0.25, 'a3l_x': 0.25, 'a3l_y': 0.25
  };

  const GEOMETRY_ANSWERS: Record<string, any> = {
    a1a: 'Mittelsenkrechte',
    a1b: 'Winkelhalbierende',
    a1c: 'Achsenspiegelung',
    a1d: 'Punktspiegelung',
    a1e: 'Verschiebung',
    a1f: 'Drehung',
    a1g: 'Kongruenzabbildung',
    a1h: 'Doppelspiegelung',
    a2a: 'b',
    a2b: 'a',
    a2c: 'a',
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

  const pointsDistribution: Record<string, number> = examPoints;
  const correctAnswers: Record<string, any> = examAnswers;

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
    if (correctAnswer === undefined) return false;
    if (taskId.includes('_x') || taskId.includes('_y')) {
      const studentNum = parseFloat(String(studentAnswer || ''));
      const correctNum = parseFloat(String(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer));
      return !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
    }
    return examAnswerMatches(correctAnswer, studentAnswer);
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
          const points = pointsDistribution[taskId] ?? 1;
          if (!grouped[taskNum]) grouped[taskNum] = [];
          grouped[taskNum].push({ taskId, answer, isCorrect, points });
        }
      }
    });

    return grouped;
  };

  // Aufgaben mit Rechenweg (müssen manuell korrigiert werden) — Aufgabe 3 nur bei Geometrie-Koordinaten
  const tasksWithRechenweg = useGeometryTask3
    ? ['3', '4', '5', '6', '7', '8', '9']
    : ['4', '5', '6', '7', '8', '9'];

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

  const calculateMaxTotalPoints = (): number => {
    if (examMaxPoints > 0) return examMaxPoints;
    const fromDist = Object.values(pointsDistribution).reduce((sum, n) => sum + (Number(n) || 0), 0);
    return fromDist > 0 ? fromDist : 0;
  };

  const maxTotalPoints = calculateMaxTotalPoints();

  // Punkte-zu-Note-Zuordnung für Tooltip
  const getGradeScale = (total: number, currentPoints?: number): React.ReactNode => {
    // Hilfsfunktion: Prüft ob ein Punktestand in einem Prozentbereich liegt
    const isInRange = (points: number, minPercent: number, maxPercent: number): boolean => {
      const percentage = (points / total) * 100;
      return percentage >= minPercent && (maxPercent === 100 ? percentage <= maxPercent : percentage < maxPercent);
    };

    // Bestimme welche Note der aktuelle Punktestand hat
    let currentGrade = '';
    if (currentPoints !== undefined) {
      const percentage = (currentPoints / total) * 100;
      if (percentage >= 97) currentGrade = '1+';
      else if (percentage >= 95) currentGrade = '1';
      else if (percentage >= 92) currentGrade = '1-';
      else if (percentage >= 86) currentGrade = '2+';
      else if (percentage >= 84) currentGrade = '2';
      else if (percentage >= 81) currentGrade = '2-';
      else if (percentage >= 72) currentGrade = '3+';
      else if (percentage >= 70) currentGrade = '3';
      else if (percentage >= 67) currentGrade = '3-';
      else if (percentage >= 55) currentGrade = '4+';
      else if (percentage >= 53) currentGrade = '4';
      else if (percentage >= 50) currentGrade = '4-';
      else if (percentage >= 35) currentGrade = '5+';
      else if (percentage >= 33) currentGrade = '5';
      else if (percentage >= 30) currentGrade = '5-';
      else currentGrade = '6';
    }

    const ranges = [
      { grade: '1+', minPercent: 97, maxPercent: 100 },
      { grade: '1', minPercent: 95, maxPercent: 97 },
      { grade: '1-', minPercent: 92, maxPercent: 95 },
      { grade: '2+', minPercent: 86, maxPercent: 92 },
      { grade: '2', minPercent: 84, maxPercent: 86 },
      { grade: '2-', minPercent: 81, maxPercent: 84 },
      { grade: '3+', minPercent: 72, maxPercent: 81 },
      { grade: '3', minPercent: 70, maxPercent: 72 },
      { grade: '3-', minPercent: 67, maxPercent: 70 },
      { grade: '4+', minPercent: 55, maxPercent: 67 },
      { grade: '4', minPercent: 53, maxPercent: 55 },
      { grade: '4-', minPercent: 50, maxPercent: 53 },
      { grade: '5+', minPercent: 35, maxPercent: 50 },
      { grade: '5', minPercent: 33, maxPercent: 35 },
      { grade: '5-', minPercent: 30, maxPercent: 33 },
      { grade: '6', minPercent: 0, maxPercent: 30 }
    ];

    const scale = ranges.map((range) => {
      const minPoints = range.minPercent === 0 ? 0 : Math.ceil(total * (range.minPercent / 100));
      const maxPoints = range.maxPercent === 100 ? total : Math.floor(total * (range.maxPercent / 100));
      const isCurrent = currentGrade === range.grade;
      return { range, minPoints, maxPoints, isCurrent };
    });

    // Erstelle JSX-Elemente mit farblicher Hervorhebung
    const result: React.ReactNode[] = [];
    scale.forEach((item, index) => {
      const { range, minPoints, maxPoints, isCurrent } = item;
      const lineContent = `${range.grade}: ${minPoints} - ${maxPoints} Punkte${isCurrent ? ' ← Aktuell' : ''}`;
      
      result.push(
        <Box
          key={`grade-${range.grade}`}
          component="div"
          sx={{
            backgroundColor: isCurrent ? '#e3f2fd' : 'transparent',
            color: isCurrent ? '#1976d2' : 'inherit',
            fontWeight: isCurrent ? 600 : 400,
            padding: '2px 4px',
            borderRadius: isCurrent ? '4px' : '0',
            display: 'block',
            minHeight: '20px',
            lineHeight: '1.6'
          }}
        >
          {lineContent}
        </Box>
      );
      
      // Leerzeile nach 1-, 2-, 3-, 4-, 5-
      if (range.grade === '1-' || range.grade === '2-' || range.grade === '3-' || range.grade === '4-' || range.grade === '5-') {
        result.push(<Box key={`spacer-${index}`} component="div" sx={{ height: '4px', display: 'block', flexShrink: 0 }} />);
      }
    });

    return (
      <Box 
        component="div" 
        sx={{ 
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {result}
      </Box>
    );
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

      // Entferne Scripts und Styles
      doc.querySelectorAll('script, style').forEach(el => el.remove());
      
      const fileName = kaFilePath.split('/').pop()?.replace('.html', '') || 'klassenarbeit';
      
      // Hilfsfunktion: Erstellt TextRun mit Aptos-Schriftart
      const createTextRun = (text: string, options?: { bold?: boolean; italics?: boolean; size?: number; color?: string }) => {
        return new TextRun({
          text,
          font: 'Aptos',
          bold: options?.bold,
          italics: options?.italics,
          size: options?.size || 22, // 11pt = 22 half-points
          color: options?.color || '1a1a1a' // Dunkles Grau statt Schwarz
        });
      };
      
      // Erstelle Word-Dokument
      const paragraphs: Paragraph[] = [];
      
      // Header-Bereich
      const header = doc.querySelector('.header');
      if (header) {
        const headerTitle = header.querySelector('.header-title')?.textContent?.trim();
        const headerDate = header.querySelector('.header-date')?.textContent?.trim();
        const headerBottom = header.querySelector('.header-bottom');
        const headerName = header.querySelector('.header-name');
        
        if (headerTitle) {
      paragraphs.push(
        new Paragraph({
              children: [createTextRun(headerTitle, { bold: true, size: 32, color: '1565C0' })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
              spacing: { after: 240, line: 360 }
            })
          );
        }
        
        if (headerDate) {
          paragraphs.push(
            new Paragraph({
              children: [createTextRun(headerDate, { bold: true, size: 24, color: '1565C0' })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240, line: 300 }
            })
          );
        }
        
        if (headerBottom) {
          const bottomText = Array.from(headerBottom.children)
            .map(child => child.textContent?.trim())
            .filter(Boolean)
            .join(' • ');
          if (bottomText) {
            paragraphs.push(
              new Paragraph({
                children: [createTextRun(bottomText, { bold: true, size: 20, color: '2E7D32' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 240, line: 280 }
              })
            );
          }
        }
        
        if (headerName) {
          const nameText = headerName.textContent?.trim();
          if (nameText) {
            paragraphs.push(
              new Paragraph({
                children: [createTextRun(nameText, { size: 22 })],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 360, line: 300 }
              })
            );
          }
        }
      }

      // Info-Box
      const infoBox = doc.querySelector('.info-box');
      if (infoBox) {
        const infoTitle = infoBox.querySelector('strong')?.textContent?.trim();
        const infoList = infoBox.querySelectorAll('li');
        
        if (infoTitle) {
          paragraphs.push(
            new Paragraph({
              children: [
                createTextRun('ℹ️ ', { size: 24, color: 'D32F2F' }),
                createTextRun(infoTitle, { bold: true, size: 24, color: 'D32F2F' })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: infoList.length > 0 ? 0 : 120, line: 300 },
              indent: { left: 200 },
              border: {
                top: {
                  color: 'D32F2F',
                  size: 12,
                  style: 'single'
                },
                left: {
                  color: 'D32F2F',
                  size: 12,
                  style: 'single'
                },
                right: {
                  color: 'D32F2F',
                  size: 12,
                  style: 'single'
                }
              }
            })
          );
        }
        
        infoList.forEach((li, index) => {
          const text = li.textContent?.trim();
          if (text) {
            const isLast = index === infoList.length - 1;
            paragraphs.push(
              new Paragraph({
                children: [
                  createTextRun('• ', { size: 22, color: 'D32F2F' }),
                  createTextRun(text, { size: 22 })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: isLast ? 120 : 80, line: 280 },
                indent: { left: 400 },
                border: {
                  left: {
                    color: 'D32F2F',
                    size: 12,
                    style: 'single'
                  },
                  right: {
                    color: 'D32F2F',
                    size: 12,
                    style: 'single'
                  },
                  ...(isLast ? {
                    bottom: {
                      color: 'D32F2F',
                      size: 12,
                      style: 'single'
                    }
                  } : {})
                }
              })
            );
          }
        });
        
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { after: 360 }
          })
        );
      }

      // Extrahiere alle Aufgaben
      const tasks = doc.querySelectorAll('.task');
      tasks.forEach((task) => {
        const taskHeader = task.querySelector('.task-header');
        const taskNumber = taskHeader?.querySelector('.task-number')?.textContent?.trim();
        const taskContent = task.querySelector('.task-content');
        
        if (taskNumber) {
          // Trenne Aufgabenname und Punkteangabe
          const match = taskNumber.match(/^(.*?)\s*(\(.*?\))$/);
          let runs: TextRun[] = [];
          
          if (match) {
            const taskName = match[1].trim(); // z.B. "Aufgabe 1"
            const pointsInfo = match[2]; // z.B. "(8 Punkte - je 1 Punkt pro Lücke)"
            
            runs.push(createTextRun(taskName, { bold: true, size: 26, color: '1565C0' }));
            runs.push(createTextRun(' ', { size: 26 }));
            runs.push(createTextRun(pointsInfo, { bold: false, size: 18, color: '999999' }));
          } else {
            // Fallback: Wenn kein Klammer-Teil gefunden wird
            runs.push(createTextRun(taskNumber, { bold: true, size: 26, color: '1565C0' }));
          }
          
          paragraphs.push(
            new Paragraph({
              children: runs,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 480, after: 240, line: 320 }
            })
          );
        }
        
        if (taskContent) {
          // Alle Absätze im task-content - mit spezieller Behandlung für Input-Felder
          const allParagraphs = taskContent.querySelectorAll('p');
          allParagraphs.forEach(p => {
            // Prüfe ob es ein Lösungsparagraph ist
            const isSolution = p.closest('.solution');
            if (isSolution && !includeSolutions) return;
            
            // Wenn es ein Lösungsparagraph ist, wird er separat verarbeitet - überspringe hier
            if (isSolution) return;
            
            // Prüfe ob der Absatz Input-Felder enthält (Lückentext)
            const hasInputs = p.querySelector('input[type="text"]');
            
            if (hasInputs) {
              // Spezielle Behandlung für Lückentext-Absätze
              const runs: TextRun[] = [];
              const processNodeWithInputs = (node: Node): void => {
                if (node.nodeType === Node.TEXT_NODE) {
                  const text = node.textContent || '';
                  if (text) {
                    runs.push(createTextRun(text));
                  }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  if (element.tagName === 'INPUT' && element.getAttribute('type') === 'text') {
                    // Erstelle unterstrichene Lücke
                    const placeholder = element.getAttribute('placeholder') || '_____________';
                    const gapLength = Math.max(placeholder.length, 15);
                    const gapText = '_'.repeat(gapLength);
                    runs.push(new TextRun({
                      text: gapText,
                      font: 'Aptos',
                      underline: { type: 'single', color: '64B5F6' },
                      color: '64B5F6',
                      size: 22
                    }));
                    runs.push(createTextRun(' ')); // Leerzeichen nach Lücke
                  } else if (element.tagName === 'STRONG' || element.tagName === 'B') {
                    // Verarbeite Kindknoten, um Leerzeichen zu erhalten
                    Array.from(element.childNodes).forEach(processNodeWithInputs);
                  } else if (element.tagName === 'EM' || element.tagName === 'I') {
                    // Verarbeite Kindknoten, um Leerzeichen zu erhalten
                    Array.from(element.childNodes).forEach(processNodeWithInputs);
                  } else {
                    Array.from(element.childNodes).forEach(processNodeWithInputs);
                  }
                }
              };
              Array.from(p.childNodes).forEach(processNodeWithInputs);
              
              if (runs.length > 0) {
              paragraphs.push(
                new Paragraph({
                    children: runs,
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 180, line: 300 }
                })
              );
            }
            } else {
              // Normale Absätze ohne Input-Felder
              const text = p.textContent?.trim();
              if (text) {
                // Prüfe auf fettgedruckte Teile
                const boldElements = p.querySelectorAll('strong');
                if (boldElements.length > 0 || p.querySelector('em')) {
                  // Erstelle TextRun-Array für gemischte Formatierung
                  const runs: TextRun[] = [];
                  let currentText = p.innerHTML;
                  
                  // Einfache Lösung: Extrahiere Text und markiere <strong> als fett
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = currentText;
                  const processNode = (node: Node, isBold = false, isItalic = false): void => {
                    if (node.nodeType === Node.TEXT_NODE) {
                      const text = node.textContent || '';
                      if (text) {
                        runs.push(createTextRun(text, { bold: isBold, italics: isItalic }));
                      }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                      const element = node as Element;
                      if (element.tagName === 'STRONG' || element.tagName === 'B') {
                        // Verarbeite Kindknoten mit bold-Flag, um Leerzeichen zu erhalten
                        Array.from(element.childNodes).forEach(child => processNode(child, true, isItalic));
                      } else if (element.tagName === 'EM' || element.tagName === 'I') {
                        // Verarbeite Kindknoten mit italic-Flag, um Leerzeichen zu erhalten
                        Array.from(element.childNodes).forEach(child => processNode(child, isBold, true));
                      } else {
                        Array.from(element.childNodes).forEach(child => processNode(child, isBold, isItalic));
                      }
                    }
                  };
                  Array.from(tempDiv.childNodes).forEach((node) => processNode(node));
                  
                  if (runs.length > 0) {
                    paragraphs.push(
                      new Paragraph({
                        children: runs,
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 180, line: 300 }
                      })
                    );
                  }
                } else {
                  paragraphs.push(
                    new Paragraph({
                      children: [createTextRun(text, { size: 22 })],
                      alignment: AlignmentType.JUSTIFIED,
                      spacing: { after: 180, line: 300 }
                    })
                  );
                }
              }
            }
          });
          
          // Input-Gruppen (Fragen mit Eingabefeldern)
          const inputGroups = taskContent.querySelectorAll('.input-group');
          inputGroups.forEach((group) => {
            const label = group.querySelector('label');
            if (label) {
              const labelText = label.textContent?.trim();
              if (labelText) {
                // Entferne Radio-Button-Markierungen aus dem Text
                const cleanText = labelText.replace(/^\s*[a-z]\)\s*/, '').trim();
              paragraphs.push(
                new Paragraph({
                    children: [createTextRun(cleanText, { bold: true, size: 22 })],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 120, line: 300 }
                  })
                );
              }
              
              // Radio-Buttons oder Checkboxen
              const options = group.querySelectorAll('label');
              options.forEach(option => {
                const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
                if (input) {
                  const optionText = option.textContent?.trim().replace(/^\s*[a-z]\)\s*/, '').trim();
                  if (optionText) {
                    paragraphs.push(
                      new Paragraph({
                        children: [createTextRun(`○ ${optionText}`, { size: 22, color: '64B5F6' })],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 80, line: 280 },
                        indent: { left: 400 }
                      })
                    );
                  }
                }
              });
              
              // Text-Input-Felder
              const textInputs = group.querySelectorAll('input[type="text"]');
              if (textInputs.length > 0) {
                const placeholder = textInputs[0].getAttribute('placeholder') || '_____________';
                paragraphs.push(
                  new Paragraph({
                    children: [createTextRun(`[${placeholder}]`, { size: 22, color: '64B5F6' })],
                    spacing: { after: 120, line: 300 },
                    indent: { left: 400 }
                  })
                );
              }
              
              // Number-Input-Felder (Koordinaten) - als schöne Koordinaten-Formatierung
              const numberInputs = group.querySelectorAll('input[type="number"]');
              if (numberInputs.length > 0) {
                // Gruppiere Koordinaten nach Punkten (A, B, C, etc.)
                const coordGroups: { point: string; x?: string; y?: string }[] = [];
                numberInputs.forEach((input) => {
                  const id = input.getAttribute('id') || '';
                  const match = id.match(/a\d+([a-z])_([xy])/);
                  if (match) {
                    const pointLetter = match[1];
                    const coord = match[2];
                    const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97)); // a->A, b->B, etc.
                    const pointIndex = pointName.charCodeAt(0) - 65;
                    const subscript = pointIndex > 0 ? String(pointIndex + 1) : '';
                    const fullPointName = `P${subscript || ''}`;
                    
                    let group = coordGroups.find(g => g.point === fullPointName);
                    if (!group) {
                      group = { point: fullPointName };
                      coordGroups.push(group);
                    }
                    
                    const placeholder = input.getAttribute('placeholder') || coord;
                    if (coord === 'x') {
                      group.x = placeholder;
                    } else if (coord === 'y') {
                      group.y = placeholder;
                    }
                  }
                });
                
                if (coordGroups.length > 0) {
                  const coordText = coordGroups.map(g => {
                    const xGap = '_'.repeat(Math.max(g.x?.length || 3, 5));
                    const yGap = '_'.repeat(Math.max(g.y?.length || 3, 5));
                    return `${g.point}(${xGap}|${yGap})`;
                  }).join(', ');
                  
                  const runs: TextRun[] = [];
                  coordGroups.forEach((g, idx) => {
                    if (idx > 0) runs.push(createTextRun(', '));
                    runs.push(createTextRun(g.point + '(', { size: 22 }));
                    const xGap = '_'.repeat(Math.max(g.x?.length || 3, 5));
                    runs.push(new TextRun({
                      text: xGap,
                      font: 'Aptos',
                      underline: { type: 'single', color: '64B5F6' },
                      color: '64B5F6',
                      size: 22
                    }));
                    runs.push(createTextRun('|', { size: 22 }));
                    const yGap = '_'.repeat(Math.max(g.y?.length || 3, 5));
                    runs.push(new TextRun({
                      text: yGap,
                      font: 'Aptos',
                      underline: { type: 'single', color: '64B5F6' },
                      color: '64B5F6',
                      size: 22
                    }));
                    runs.push(createTextRun(')', { size: 22 }));
                  });
                  
                  paragraphs.push(
                    new Paragraph({
                      children: runs,
                      alignment: AlignmentType.JUSTIFIED,
                      spacing: { after: 120, line: 300 },
                      indent: { left: 400 }
                    })
                  );
                }
              }
            }
          });

          // Rechenweg-Hinweis
          const rechenweg = taskContent.querySelector('.rechenweg-required');
          if (rechenweg) {
            const rechenwegText = rechenweg.textContent?.trim();
            if (rechenwegText) {
            paragraphs.push(
              new Paragraph({
                  children: [
                    createTextRun('⚠️ ', { size: 24, color: 'F57C00' }),
                    createTextRun(rechenwegText, { bold: true, size: 22, color: 'F57C00' })
                  ],
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { before: 120, after: 240, line: 300 },
                  indent: { left: 200 }
                })
              );
            }
          }
          
          // SVG-Grafiken (als schöner Hinweis)
          const svgs = taskContent.querySelectorAll('svg');
          if (svgs.length > 0) {
              paragraphs.push(
                new Paragraph({
                children: [
                  createTextRun('📐 ', { size: 24 }),
                  createTextRun('Koordinatensystem mit Konstruktion', { 
                    bold: true, 
                    size: 22, 
                    color: '1976D2' 
                  }),
                  createTextRun(' - siehe Original-Datei für vollständige Grafik', { 
                    size: 20, 
                    color: '666666', 
                    italics: true 
                  })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 240, after: 240, line: 300 },
                indent: { left: 400 }
              })
            );
          }

          // Lösung (nur wenn includeSolutions)
          if (includeSolutions) {
            const solution = taskContent.querySelector('.solution');
            if (solution) {
              // Entferne h4-Überschriften "Musterlösung:" aus der Lösung
              const h4Elements = solution.querySelectorAll('h4');
              h4Elements.forEach(h4 => {
                if (h4.textContent?.trim().toLowerCase().includes('musterlösung')) {
                  h4.remove();
                }
              });
              
              const solutionParagraphs = solution.querySelectorAll('p');
              solutionParagraphs.forEach((p) => {
                const text = p.textContent?.trim();
                if (text) {
                  // Prüfe auf fettgedruckte Teile
                  const boldElements = p.querySelectorAll('strong');
                  if (boldElements.length > 0 || p.querySelector('em')) {
                    const runs: TextRun[] = [];
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = p.innerHTML;
                    const processNode = (node: Node, isBold = false, isItalic = false): void => {
                      if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent || '';
                        if (text) {
                          runs.push(createTextRun(text, { bold: isBold, italics: isItalic, color: 'D32F2F' }));
                        }
                      } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        if (element.tagName === 'STRONG' || element.tagName === 'B') {
                          // Verarbeite Kindknoten mit bold-Flag, um Leerzeichen zu erhalten
                          Array.from(element.childNodes).forEach(child => processNode(child, true, isItalic));
                        } else if (element.tagName === 'EM' || element.tagName === 'I') {
                          // Verarbeite Kindknoten mit italic-Flag, um Leerzeichen zu erhalten
                          Array.from(element.childNodes).forEach(child => processNode(child, isBold, true));
                        } else {
                          Array.from(element.childNodes).forEach(child => processNode(child, isBold, isItalic));
                        }
                      }
                    };
                    Array.from(tempDiv.childNodes).forEach((node) => processNode(node));
                    
                    if (runs.length > 0) {
                  paragraphs.push(
                    new Paragraph({
                          children: runs,
                          alignment: AlignmentType.JUSTIFIED,
                          spacing: { after: 120, line: 300 }
                        })
                      );
                    }
                  } else {
                  paragraphs.push(
                    new Paragraph({
                        children: [createTextRun(text, { size: 22, color: 'D32F2F' })],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 120, line: 300 }
                    })
                  );
                  }
                }
              });
            }
          }

          paragraphs.push(
            new Paragraph({
              text: '',
              spacing: { after: 400 }
            })
          );
        }
      });

      // Erstelle das Word-Dokument mit professioneller Formatierung
      const wordDoc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 2.54cm = 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: paragraphs
        }],
        styles: {
          default: {
            document: {
              run: {
                font: 'Aptos',
                size: 22, // 11pt
                color: '1a1a1a' // Dunkles Grau statt Schwarz
              },
              paragraph: {
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                  line: 300, // 1.5 line spacing
                  lineRule: 'auto'
                }
              }
            }
          }
        }
      });

      // Generiere und speichere
      const blob = await Packer.toBlob(wordDoc);
      const exportFileName = `${fileName}${includeSolutions ? '_mit_Musterloesung' : '_ohne_Musterloesung'}.docx`;
      saveAs(blob, exportFileName);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      throw error;
    }
  };

  const exportBothWordVersions = async () => {
    try {
      setExporting(true);
      // Lade beide Versionen nacheinander
      await exportToWord(false);
      // Kurze Verzögerung, damit der Browser beide Downloads verarbeiten kann
      await new Promise(resolve => setTimeout(resolve, 500));
      await exportToWord(true);
      // Erfolgreich - kein Popup mehr
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
            <Box display="flex" gap={0.5} alignItems="center" flexWrap="nowrap">
              <Button 
                onClick={handleOpenKA}
                variant="outlined"
                size="small"
                startIcon={<Description />}
                tabIndex={-1}
                sx={{ 
                  fontSize: '0.75rem',
                  px: 1,
                  py: 0.5,
                  minWidth: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                KA öffnen
              </Button>
              <Button 
                onClick={exportBothWordVersions}
                variant="outlined"
                size="small"
                startIcon={<FileDownload />}
                disabled={exporting}
                tabIndex={-1}
                sx={{ 
                  fontSize: '0.75rem',
                  px: 1,
                  py: 0.5,
                  minWidth: 'auto',
                  whiteSpace: 'nowrap'
                }}
              >
                {exporting ? 'Exportiert...' : 'Word Download'}
              </Button>
              {submissions.length > 0 && (
                <>
                  <Button 
                    onClick={() => setShowDreierprobe(true)}
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<BarChart />}
                    tabIndex={-1}
                    sx={{ 
                      fontSize: '0.75rem',
                      px: 1,
                      py: 0.5,
                      minWidth: 'auto',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Dreierprobe
                  </Button>
                <Button 
                  onClick={handleResetAllSubmissions}
                  variant="outlined"
                  color="error"
                  size="small"
                  disabled={resetting}
                  tabIndex={-1}
                  sx={{ 
                    fontSize: '0.75rem',
                    px: 1,
                    py: 0.5,
                    minWidth: 'auto',
                    whiteSpace: 'nowrap'
                  }}
                  >
                    {resetting ? 'Zurücksetzen...' : '🗑️ Zurücksetzen'}
                </Button>
                </>
              )}
              <IconButton
                onClick={onClose} 
                tabIndex={-1}
                sx={{ 
                  p: 0.5,
                  minWidth: 28,
                  width: 28,
                  height: 28,
                  ml: 0.5,
                  '& .MuiSvgIcon-root': {
                    fontSize: 18
                  }
                }}
              >
                <Close sx={{ width: '100%', height: '100%' }} />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Breadcrumb-Liste aller Schüler */}
      {learningGroupStudents.length > 0 && (
        <Box sx={{ 
          mb: 1, 
          p: 0.75, 
          bgcolor: '#fff', 
          borderRadius: 1, 
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center'
        }}>
          {/* Schüler mit Abgaben */}
          {submissions.map((submission, index) => {
            // Prüfe ob korrigiert: status === 'corrected' oder corrections vorhanden
            const isCorrected = submission.status === 'corrected' || 
                                (submission.corrections && submission.corrections.length > 0);
            const isSelected = selectedSubmission?.id === submission.id;
            
            // Prüfe ob alle Korrekturfelder von mir ausgefüllt sind
            const checkAllFieldsFilled = () => {
              // Bestimme welche Aufgaben vorhanden sind basierend auf den Antworten des Schülers
              const answers = parseAnswers(submission.answers);
              const existingTasks = new Set<string>();
              Object.keys(answers).forEach(taskId => {
                const match = taskId.match(/a(\d+)/);
                if (match) {
                  existingTasks.add(match[1]);
                }
              });
              
              // Prüfe nur Aufgaben, die manuell korrigiert werden müssen (tasksWithRechenweg)
              // Aufgabe 1 und 2 werden automatisch korrigiert, daher nicht prüfen
              
              // Prüfe Aufgabe 3: Alle 4 Teilaufgaben (3a, 3b, 3c, 3d) müssen Konstruktionspunkte haben
              // Aber nur wenn Aufgabe 3 vorhanden ist
              // Verwende die gleiche Logik wie in der aufgabenweisen Ansicht (Zeile 2963-2967)
              let allTask3Filled = true;
              if (existingTasks.has('3')) {
                const subtaskKeys = ['3a', '3b', '3c', '3d'];
                allTask3Filled = subtaskKeys.filter(subtask => {
                  // Verwende den gleichen Key-Format wie in der aufgabenweisen Ansicht
                  const subtaskKey = `${submission.id}_${subtask}`;
                  // Verwende die gleiche Logik wie in der aufgabenweisen Ansicht: || {} für Fallback
                  const subtaskCorrection = corrections[subtaskKey] || {};
                  return subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null;
                }).length === subtaskKeys.length;
              }
              
              // Prüfe andere Aufgaben mit Rechenweg (4, 5, 6, 7, 8, 9): Punkte müssen gesetzt sein
              // Nur wenn die Aufgabe vorhanden ist UND manuell korrigiert werden muss
              const tasksNeedingManualCorrection: string[] = [];
              if (existingTasks.has('3')) {
                tasksNeedingManualCorrection.push('3');
              }
              // Prüfe auch andere Aufgaben mit Rechenweg, falls vorhanden
              ['4', '5', '6', '7', '8', '9'].forEach(taskNum => {
                if (existingTasks.has(taskNum)) {
                  tasksNeedingManualCorrection.push(taskNum);
                }
              });
              
              // Prüfe ob alle Aufgaben mit Rechenweg von mir korrigiert wurden
              const allTasksFilled = tasksNeedingManualCorrection.every(taskNum => {
                if (taskNum === '3' && useGeometryTask3) {
                  return allTask3Filled;
                } else {
                  // Für andere Aufgaben: Punkte müssen von mir gesetzt sein
                  // Verwende die gleiche Logik wie in der aufgabenweisen Ansicht
                  const taskKey = `${submission.id}_${taskNum}`;
                  const taskCorrection = corrections[taskKey] || {};
                  // Prüfe ob Punkte gesetzt sind
                  return taskCorrection.points !== undefined && taskCorrection.points !== null;
                }
              });
              
              // Wenn keine Aufgaben mit Rechenweg vorhanden sind, gelte als ausgefüllt (nichts zu korrigieren)
              return tasksNeedingManualCorrection.length === 0 || allTasksFilled;
            };
            
            const allFieldsFilled = checkAllFieldsFilled();
            const hasSomeFieldsFilled = () => {
              // Prüfe ob mindestens ein Feld ausgefüllt ist
              const subtaskKeys = ['3a', '3b', '3c', '3d'];
              const someTask3Filled = subtaskKeys.some(subtask => {
                const subtaskKey = `${submission.id}_3${subtask}`;
                const subtaskCorrection = corrections[subtaskKey];
                return subtaskCorrection?.constructionPoints !== undefined && subtaskCorrection?.constructionPoints !== null;
              });
              
              const task1Key = `${submission.id}_1`;
              const task2Key = `${submission.id}_2`;
              const task1Filled = corrections[task1Key]?.points !== undefined && corrections[task1Key]?.points !== null;
              const task2Filled = corrections[task2Key]?.points !== undefined && corrections[task2Key]?.points !== null;
              
              return someTask3Filled || task1Filled || task2Filled;
            };
            
            const someFieldsFilled = hasSomeFieldsFilled();
            
            // Extrahiere Vornamen (alles vor dem ersten Leerzeichen)
            const firstName = submission.student.name.split(' ')[0];
            
            // Berechne Note
            const grade = calculateGrade(submission.totalPoints, maxTotalPoints);
            
            // Bestimme Farbe basierend auf Note
            const getGradeColor = (gradeStr: string): string => {
              if (gradeStr === '-' || !gradeStr) return '#666';
              const gradeNum = parseFloat(gradeStr.replace(/[+-]/g, ''));
              if (gradeNum <= 1.3) return '#2e7d32'; // Grün für 1, 1+, 1-
              if (gradeNum <= 2.3) return '#4caf50'; // Hellgrün für 2, 2+, 2-
              if (gradeNum <= 3.3) return '#ff9800'; // Orange für 3, 3+, 3-
              if (gradeNum <= 4.3) return '#f57c00'; // Dunkelorange für 4, 4+, 4-
              if (gradeNum <= 5.3) return '#f44336'; // Rot für 5, 5+, 5-
              return '#c62828'; // Dunkelrot für 6
            };
            
            const gradeColor = getGradeColor(grade);
            
            return (
              <Chip
                key={submission.id}
                label={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ color: allFieldsFilled ? '#2e7d32' : '#f57c00' }}>{firstName}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.9, fontWeight: 600, color: allFieldsFilled ? '#2e7d32' : gradeColor }}>{grade}</span>
                  </Box>
                }
                onClick={() => {
                  setCurrentStudentIndex(index);
                  setSelectedSubmission(submission);
                  loadCorrections(submission.id);
                }}
                tabIndex={-1}
                sx={{
                  height: 24,
                  fontSize: '0.7rem',
                  fontWeight: isSelected ? 600 : 400,
                  bgcolor: allFieldsFilled 
                    ? '#e8f5e9' 
                    : '#fff3e0',
                  color: allFieldsFilled 
                    ? '#2e7d32' 
                    : '#f57c00',
                  border: isSelected 
                    ? '2px solid #1976d2' 
                    : allFieldsFilled 
                      ? '1px solid #4caf50' 
                      : '1px solid #ffb74d',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: allFieldsFilled 
                      ? '#c8e6c9' 
                      : '#ffe0b2',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)'
                  },
                  '& .MuiChip-label': {
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center'
                  }
                }}
              />
            );
          })}
          
          {/* Fehlende Schüler (noch nicht abgegeben) */}
          {learningGroupStudents.length > 0 && submissions.length > 0 && (() => {
            const submittedStudentIds = new Set(submissions.map(sub => sub.student.id));
            const missingStudents = learningGroupStudents.filter(
              student => !submittedStudentIds.has(student.id)
            );
            
            return missingStudents.map((student) => {
              const firstName = student.name.split(' ')[0];
              
              return (
                <Chip
                  key={student.id}
                  label={firstName}
                  sx={{
                    height: 24,
                    fontSize: '0.7rem',
                    fontWeight: 400,
                    bgcolor: '#ffebee',
                    color: '#b71c1c',
                    opacity: 0.5,
                    border: '1px solid #ef9a9a',
                    cursor: 'default',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      opacity: 0.7
                    }
                  }}
                />
              );
            });
          })()}
        </Box>
      )}

      {/* Tabs */}
      {submissions.length > 0 && (
      <Tabs 
        value={mode} 
        onChange={(_, v) => setMode(v)} 
        TabIndicatorProps={{ tabIndex: -1 }}
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
        <Tab label="👤 Schülerweise" value="by-student" tabIndex={-1} />
        <Tab label="📋 Aufgabenweise" value="by-task" tabIndex={-1} />
      </Tabs>
      )}

      {submissions.length === 0 && !loading && (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#fff', borderRadius: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', mb: 1 }}>
          <Typography variant="body1" sx={{ mb: 1, color: '#666' }}>
            📭 Noch keine Abgaben
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', mb: 2 }}>
            Das ist die Korrekturansicht. Solange niemand abgegeben hat, bleibt sie leer.
            Zum Ansehen/Bearbeiten der {getFileTypeName()} nutze die Buttons unten oder das Stift-Icon im Dateibaum.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                window.open(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`, '_blank');
              }}
            >
              {getFileTypeName()} öffnen
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={onClose}
            >
              Schließen &amp; im Dateibaum Stift nutzen
            </Button>
          </Stack>
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
                    tabIndex={-1}
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
                    tabIndex={-1}
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
              
              {/* Info Row: Chips */}
              <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
                    <Chip
                      label={`${selectedSubmission.totalPoints.toFixed(2)} von ${maxTotalPoints} (davon ${selectedSubmission.autoPoints.toFixed(2)} auto)`}
                      size="small"
                    sx={{ 
                        bgcolor: '#c8e6c9', 
                        color: '#2e7d32', 
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 24
                    }}
                    />
                    <Tooltip 
                      title={
                        <Box component="div" sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                          {getGradeScale(maxTotalPoints, selectedSubmission.totalPoints)}
                        </Box>
                      }
                      arrow
                      placement="top"
                      enterDelay={100}
                      leaveDelay={0}
                      PopperProps={{
                        modifiers: [
                          {
                            name: 'preventOverflow',
                            enabled: true,
                            options: {
                              altAxis: true,
                              altBoundary: true,
                              tether: false,
                              rootBoundary: 'viewport',
                              padding: 8,
                            },
                          },
                          {
                            name: 'flip',
                            enabled: true,
                            options: {
                              altBoundary: true,
                              rootBoundary: 'viewport',
                              padding: 8,
                            },
                          },
                          {
                            name: 'offset',
                            enabled: true,
                            options: {
                              offset: [0, 8],
                            },
                          },
                        ],
                      }}
                    >
                    <Chip
                        label={`Note: ${calculateGrade(selectedSubmission.totalPoints, maxTotalPoints)}`}
                        size="medium"
                        sx={{ 
                          bgcolor: '#1976d2', 
                          color: '#fff', 
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          height: 32,
                          cursor: 'help',
                          px: 1.5
                        }}
                      />
                    </Tooltip>
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
                let autoPoints = 0;
                let manualPoints = 0;
                
                if (taskNum === '3' && useGeometryTask3) {
                  // Aufgabe 3: Spezielle Behandlung - Koordinatenpunkte (automatisch, 0.25 pro Koordinate) + Konstruktionspunkte (manuell, 0-2)
                  const subtasks = groupTask3BySubtask(taskAnswers);
                  const processedSubtasks = new Set<string>();
                  
                  // Iteriere nur über die Teilaufgaben (a, b, c, d), nicht über alle Koordinaten
                  ['a', 'b', 'c', 'd'].forEach((subtaskLetter: string) => {
                    const subtaskKey = `3${subtaskLetter}`;
                    const subtaskAnswers = subtasks[subtaskLetter] || [];
                    
                    if (subtaskAnswers.length > 0) {
                      // Verwende den gleichen Key-Format wie im aufgabenweisen Modus
                      const subtaskCorrectionKey = selectedSubmission ? `${selectedSubmission.id}_${subtaskKey}` : subtaskKey;
                      const subtaskCorrection = corrections[subtaskCorrectionKey] || {};
                      
                      // Automatische Bewertung: jede richtige Koordinate = 0.25 Punkte
                      const coordinatePoints = subtaskAnswers.reduce((sum, item) => {
                        if (item.isCorrect === true) {
                          return sum + (pointsDistribution[item.taskId] || 0);
                        }
                        return sum;
                      }, 0);
                      
                      // Konstruktionspunkte (0-2) aus manueller Korrektur
                      let constructionPoints = subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null 
                        ? subtaskCorrection.constructionPoints 
                        : 0;
                      // Validiere: nur Werte zwischen 0 und 2 erlauben
                      if (constructionPoints < 0) constructionPoints = 0;
                      if (constructionPoints > 2) constructionPoints = 2;
                      
                      autoPoints += coordinatePoints;
                      manualPoints += constructionPoints;
                      achievedPoints += coordinatePoints + constructionPoints;
                      
                      // Gesamtpunkte: 3.5 Punkte pro Teilaufgabe (1.5 Punkte für Koordinaten maximal + 2 Punkte Konstruktion)
                      totalPoints += 3.5;
                    }
                  });
                } else {
                  // Aufgabe 1 und 2: Normale Berechnung
                  taskAnswers.forEach(({ taskId, isCorrect }) => {
                    const maxPoints = pointsDistribution[taskId] ?? 1;
                    totalPoints += maxPoints;
                    
                    if (taskNum === '1') {
                      // Aufgabe 1: Manuelle Korrektur pro Input-Feld, aber zeige automatische Punkte wenn keine manuelle Korrektur vorhanden
                      // Der Key sollte `${selectedSubmission.id}_${taskId}` sein (z.B. "submissionId_a1a")
                      const correctionKey = selectedSubmission ? `${selectedSubmission.id}_${taskId}` : taskId;
                      const correction = corrections[correctionKey] || {};
                      
                      // Wenn manuelle Korrektur vorhanden, verwende diese, sonst automatische Punkte
                      if (correction.points !== undefined && correction.points !== null) {
                        // Manuelle Korrektur vorhanden
                        const points = Number(correction.points) || 0;
                        manualPoints += points;
                        achievedPoints += points;
                      } else {
                        // Keine manuelle Korrektur: verwende automatische Punkte
                        if (isCorrect === true) {
                          autoPoints += maxPoints;
                          achievedPoints += maxPoints;
                        }
                      }
                    } else {
                    if (isCorrect === true) {
                        autoPoints += maxPoints;
                      achievedPoints += maxPoints;
                    } else if (isCorrect === false) {
                      achievedPoints += 0;
                      }
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
                      Aufgabe {taskNum} <span style={{ color: '#666', fontWeight: 500, fontSize: '0.85rem' }}>
                        {Math.round(achievedPoints)} / {Math.round(totalPoints)}
                      </span>
            </Typography>
            
                    {/* Lösungen dieser Aufgabe */}
                    <Grid container spacing={0.5}>
                      {taskNum === '3' && useGeometryTask3 ? (
                        // Aufgabe 3: Nach Teilaufgaben gruppiert (a, b, c, d)
                        (() => {
                          const subtasks = groupTask3BySubtask(taskAnswers);
                          const needsManualCorrection = tasksWithRechenweg.includes('3');
                          // Verwende den gleichen Key-Format wie im aufgabenweisen Modus
                          const task3CommentKey = selectedSubmission ? `${selectedSubmission.id}_3_comment` : '3_comment';
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
                            // Verwende den gleichen Key-Format wie im aufgabenweisen Modus: ${submission.id}_${subtaskKey}
                            const correctionKey = selectedSubmission ? `${selectedSubmission.id}_${subtaskKey}` : subtaskKey;
                            // Wichtig: Nur Fallback verwenden, wenn Key nicht im State existiert (nicht wenn Wert undefined ist)
                            const savedCorrection = selectedSubmission?.corrections?.find(c => c.taskNumber === subtaskKey);
                            const correction = corrections[correctionKey] !== undefined
                              ? corrections[correctionKey]
                              : {
                                  constructionPoints: savedCorrection?.manualPoints,
                                  comment: savedCorrection?.comment || ''
                                };
                            
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
                            let constructionAchieved = correction && correction.constructionPoints !== undefined && correction.constructionPoints !== null 
                              ? correction.constructionPoints 
                              : 0;
                            // Validiere: nur Werte zwischen 0 und 2 erlauben
                            if (constructionAchieved < 0) constructionAchieved = 0;
                            if (constructionAchieved > 2) constructionAchieved = 2;
                            
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
                                      <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.7rem' }}>
                                          A3 {subtask}
                                        </Typography>
                                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                                          {Math.round(achievedPoints)} / {Math.round(totalPoints)}
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
                                        fontSize: '0.6rem',
                                        fontStyle: 'italic',
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
                                          <Box sx={{ position: 'relative', width: 100 }}>
                                          <TextField
                                            label="Konstruktion"
                                            type="number"
                                            value={correction.constructionPoints ?? ''}
                                            onChange={(e) => {
                                                const inputValue = e.target.value.trim().toLowerCase();
                                                let value: number | undefined = undefined;
                                                
                                                // Wenn "x" eingegeben wird, leere das Feld
                                                if (inputValue === 'x') {
                                                  value = undefined;
                                                } else if (inputValue === '') {
                                                  value = undefined;
                                                } else {
                                                const numValue = parseFloat(e.target.value);
                                                  if (!isNaN(numValue)) {
                                                    // Validiere: nur Werte zwischen 0 und 2 erlauben
                                                    if (numValue >= 0 && numValue <= 2) {
                                                      value = numValue;
                                                    }
                                                    // Wenn Wert außerhalb des Bereichs: ignorieren (nicht setzen)
                                                  }
                                                }
                                                
                                                // Nur setzen, wenn Wert gültig ist, leer oder "x"
                                                // Verwende den gleichen Key-Format wie im aufgabenweisen Modus
                                                const correctionKey = selectedSubmission ? `${selectedSubmission.id}_${subtaskKey}` : subtaskKey;
                                                if (value !== undefined || e.target.value === '' || inputValue === 'x') {
                                              setCorrections(prev => ({
                                                ...prev,
                                                [correctionKey]: { ...prev[correctionKey], constructionPoints: value }
                                              }));
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // Speichere die Konstruktionspunkte als manualPoints für diese Teilaufgabe
                                                // Verwende den gleichen Key-Format wie im aufgabenweisen Modus
                                                const correctionKey = selectedSubmission ? `${selectedSubmission.id}_${subtaskKey}` : subtaskKey;
                                              const currentCorrection = corrections[correctionKey] || {};
                                                let constructionPoints = currentCorrection.constructionPoints;
                                                
                                                // Prüfe den aktuellen Wert im TextField
                                                const inputValue = e.target.value.trim().toLowerCase();
                                                
                                                // Wenn "x" eingegeben wurde, leere das Feld
                                                if (inputValue === 'x') {
                                                  constructionPoints = undefined;
                                                  // Aktualisiere den State
                                                  setCorrections(prev => ({
                                                    ...prev,
                                                    [correctionKey]: { ...prev[correctionKey], constructionPoints: undefined }
                                                  }));
                                                  // Leere das TextField
                                                  e.target.value = '';
                                                } else if (inputValue !== '') {
                                                  const numValue = parseFloat(inputValue);
                                                  if (!isNaN(numValue)) {
                                                    // Validiere: nur Werte zwischen 0 und 2 erlauben
                                                    if (numValue >= 0 && numValue <= 2) {
                                                      constructionPoints = numValue;
                                                      // Aktualisiere den State mit dem neuen Wert
                                                      setCorrections(prev => ({
                                                        ...prev,
                                                        [correctionKey]: { ...prev[correctionKey], constructionPoints }
                                                      }));
                                                    } else {
                                                      // Ungültiger Wert: auf vorherigen Wert zurücksetzen oder undefined
                                                      constructionPoints = currentCorrection.constructionPoints;
                                                      // Setze das TextField auf den gültigen Wert zurück
                                                      e.target.value = constructionPoints !== undefined ? String(constructionPoints) : '';
                                                    }
                                                  }
                                                }
                                                
                                                // Speichere nur, wenn ein gültiger Wert vorhanden ist (oder undefined für "x")
                                                if (constructionPoints === undefined || (constructionPoints !== null && constructionPoints >= 0 && constructionPoints <= 2)) {
                                                saveCorrection(subtaskKey, constructionPoints, currentCorrection.comment, selectedSubmission?.id);
                                                }
                                            }}
                                            inputProps={{ min: 0, max: 2, step: 0.5 }}
                                            size="small"
                                            sx={{ 
                                              width: 100,
                                              '& .MuiOutlinedInput-root': {
                                                  bgcolor: (correction.constructionPoints !== undefined && correction.constructionPoints !== null && !isNaN(correction.constructionPoints) && correction.constructionPoints >= 0 && correction.constructionPoints <= 2) ? '#e8f5e9' : '#ffebee',
                                                  border: (correction.constructionPoints !== undefined && correction.constructionPoints !== null && !isNaN(correction.constructionPoints) && correction.constructionPoints >= 0 && correction.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336',
                                                fontSize: '0.7rem',
                                                height: 32,
                                                '&:hover': {
                                                    border: (correction.constructionPoints !== undefined && correction.constructionPoints !== null && !isNaN(correction.constructionPoints) && correction.constructionPoints >= 0 && correction.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336'
                                                },
                                                '&.Mui-focused': {
                                                    border: (correction.constructionPoints !== undefined && correction.constructionPoints !== null && !isNaN(correction.constructionPoints) && correction.constructionPoints >= 0 && correction.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336'
                                                }
                                              },
                                              '& .MuiInputLabel-root': {
                                                fontSize: '0.65rem'
                                              }
                                            }}
                                          />
                                            {(correction.constructionPoints !== undefined && correction.constructionPoints !== null && !isNaN(correction.constructionPoints) && correction.constructionPoints >= 0 && correction.constructionPoints <= 2) && (
                                              <CheckCircle 
                                                sx={{ 
                                                  position: 'absolute',
                                                  right: 4,
                                                  top: '50%',
                                                  transform: 'translateY(-50%)',
                                                  fontSize: 18,
                                                  color: '#4caf50'
                                                }}
                                              />
                                            )}
                                          </Box>
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
                            <Grid item xs={12} sx={{ mt: 2 }}>
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
                                  saveCorrection('3_comment', currentCorrection.points, currentCorrection.comment, selectedSubmission?.id);
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
                // Für Aufgabe 1: Verwende taskId (z.B. "a1a") statt taskNum ("1")
                const correctionKey = taskNum === '1' 
                  ? (selectedSubmission ? `${selectedSubmission.id}_${taskId}` : taskId)
                  : (selectedSubmission ? `${selectedSubmission.id}_${taskNum}` : taskNum);
                const correction = corrections[correctionKey] || {};
                        
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
                                        ({formatExamCorrect(correctAnswers[taskId])})
                                      </span>
                                    )}
                          </Typography>
                        </Box>

                                {/* Eingabefelder kompakt in einer Zeile */}
                        {needsManualCorrection && (
                                  <Box sx={{ mt: 0.5 }}>
                                    <Box display="flex" gap={0.5} alignItems="flex-start">
                                <Box sx={{ position: 'relative', width: 70 }}>
                                <TextField
                                  label="Pkt."
                                  type="number"
                                  value={correction.points ?? ''}
                                  onChange={(e) => {
                                      const inputValue = e.target.value.trim().toLowerCase();
                                      let value: number | undefined = undefined;
                                      
                                      // Wenn "x" eingegeben wird, leere das Feld
                                      if (inputValue === 'x') {
                                        value = undefined;
                                      } else if (inputValue === '') {
                                        value = undefined;
                                      } else {
                                      const numValue = parseFloat(e.target.value);
                                        value = !isNaN(numValue) ? numValue : undefined;
                                      }
                                      
                                    // Für Aufgabe 1: Verwende taskId (z.B. "a1a") statt taskNum ("1")
                                    const correctionKey = taskNum === '1' 
                                      ? (selectedSubmission ? `${selectedSubmission.id}_${taskId}` : taskId)
                                      : (selectedSubmission ? `${selectedSubmission.id}_${taskNum}` : taskNum);
                                    setCorrections(prev => ({
                                      ...prev,
                                      [correctionKey]: { ...prev[correctionKey], points: value }
                                    }));
                                  }}
                                  onBlur={() => {
                                    // Für Aufgabe 1: Verwende taskId (z.B. "a1a") statt taskNum ("1")
                                    const saveTaskNumber = taskNum === '1' ? taskId : taskNum;
                                    saveCorrection(saveTaskNumber, correction.points, correction.comment);
                                  }}
                                  inputProps={{ min: 0, max: 10, step: 0.5 }}
                                  size="small"
                                  sx={{ 
                                          width: 70,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: (correction.points !== undefined && correction.points !== null && !isNaN(correction.points) && correction.points >= 0 && correction.points <= 10) ? '#e8f5e9' : '#ffebee',
                                        border: (correction.points !== undefined && correction.points !== null && !isNaN(correction.points) && correction.points >= 0 && correction.points <= 10) ? '2px solid #4caf50' : '2px solid #f44336',
                                            fontSize: '0.7rem',
                                        height: 32,
                                        pr: (correction.points !== undefined && correction.points !== null && !isNaN(correction.points) && correction.points >= 0 && correction.points <= 10) ? 3 : 1
                                    },
                                    '& .MuiInputLabel-root': {
                                            fontSize: '0.65rem'
                                    }
                                  }}
                                />
                                  {(correction.points !== undefined && correction.points !== null && !isNaN(correction.points) && correction.points >= 0 && correction.points <= 10) && (
                                    <CheckCircle 
                                      sx={{ 
                                        position: 'absolute',
                                        right: 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: 16,
                                        color: '#4caf50'
                                      }}
                                    />
                                  )}
                                </Box>
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
                                          mt: 2,
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
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip
                    label={`${selectedSubmission.totalPoints.toFixed(2)} von ${maxTotalPoints} (davon ${selectedSubmission.autoPoints.toFixed(2)} auto)`}
                    size="small"
                    sx={{ bgcolor: '#c8e6c9', color: '#2e7d32', fontWeight: 600, fontSize: '0.7rem', height: 24 }}
                  />
                  <Tooltip 
                    title={
                      <Box component="div" sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                        {getGradeScale(maxTotalPoints, selectedSubmission.totalPoints)}
                      </Box>
                    }
                    arrow
                    placement="top"
                    enterDelay={100}
                    leaveDelay={0}
                    PopperProps={{
                      modifiers: [
                        {
                          name: 'preventOverflow',
                          enabled: true,
                          options: {
                            altAxis: true,
                            altBoundary: true,
                            tether: false,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                        {
                          name: 'flip',
                          enabled: true,
                          options: {
                            altBoundary: true,
                            rootBoundary: 'viewport',
                            padding: 8,
                          },
                        },
                        {
                          name: 'offset',
                          enabled: true,
                          options: {
                            offset: [0, 8],
                          },
                        },
                      ],
                    }}
                  >
                  <Chip
                      label={`Note: ${calculateGrade(selectedSubmission.totalPoints, maxTotalPoints)}`}
                      size="medium"
                    sx={{ 
                      bgcolor: '#1976d2', 
                      color: '#fff', 
                      fontWeight: 700,
                        fontSize: '0.9rem',
                        height: 32,
                        cursor: 'help',
                        px: 1.5
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
                          {taskNum === '3' && useGeometryTask3 ? (
                            <>
                              <TableCell sx={{ fontWeight: 700, width: '12%', fontSize: '0.7rem' }}>Schüler</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3a</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3b</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3c</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3d</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '16%', fontSize: '0.7rem' }}>Kommentar</TableCell>
                            </>
                          ) : (
                            <>
                          <TableCell sx={{ fontWeight: 700, width: '20%', fontSize: '0.7rem' }}>Schüler</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '30%', fontSize: '0.7rem' }}>Antwort</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '15%', fontSize: '0.7rem' }}>Pkt.</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '35%', fontSize: '0.7rem' }}>Kommentar</TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {taskSubmissions.map(({ submission, answers }, idx) => {
                          const correction = submission.corrections?.find(c => c.taskNumber === taskNum);
                          const correctionKey = `${submission.id}_${taskNum}`;
                          // Wichtig: Nur Fallback verwenden, wenn Key nicht im State existiert (nicht wenn Wert undefined ist)
                          const correctionState = corrections[correctionKey] !== undefined
                            ? corrections[correctionKey]
                            : {
                            points: correction?.manualPoints,
                            comment: correction?.comment || ''
                          };

                          // Für Aufgabe 3: Zeige Teilaufgaben (a, b, c, d) separat, aber Kommentar nur einmal
                          if (taskNum === '3' && useGeometryTask3) {
                            const subtasks = groupTask3BySubtask(answers.map(({ taskId, answer }) => {
                              const parsedAnswers = parseAnswers(submission.answers);
                              const isCorrect = parsedAnswers[taskId]?.isCorrect;
                              return { taskId, answer, isCorrect };
                            }));
                            
                            // Kommentar für die ganze Aufgabe 3 (nur einmal pro Schüler)
                            const task3CommentKey = '3_comment';
                            const task3CommentCorrectionKey = `${submission.id}_${task3CommentKey}`;
                            // Lade Kommentar aus State oder aus submission.corrections
                            // Wichtig: Nur Fallback verwenden, wenn Key nicht im State existiert (nicht wenn Wert undefined ist)
                            const savedTask3Comment = submission.corrections?.find(c => c.taskNumber === task3CommentKey);
                            const task3Comment = corrections[task3CommentCorrectionKey] !== undefined
                              ? corrections[task3CommentCorrectionKey]
                              : {
                                  comment: savedTask3Comment?.comment || ''
                                };
                            
                            // Formatiere korrekte Koordinaten
                            const formatCorrectCoordinates = (subtaskAnswers: Array<{ taskId: string; answer: any; isCorrect?: boolean }>) => {
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
                              return Object.entries(points)
                                .map(([pointName, coords]) => {
                                  const x = coords.x !== undefined ? coords.x : '?';
                                  const y = coords.y !== undefined ? coords.y : '?';
                                  return `${pointName}(${x}|${y})`;
                                })
                                .join(', ');
                            };
                            
                            // Prüfe ob alle Felder für diese Aufgabe ausgefüllt sind
                            const subtaskKeys = ['3a', '3b', '3c', '3d'];
                            const filledFields = subtaskKeys.filter(subtask => {
                              const subtaskKey = `${submission.id}_${subtask}`;
                              const subtaskCorrection = corrections[subtaskKey] || {};
                              return subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null;
                            });
                            const allFieldsFilled = filledFields.length === subtaskKeys.length;
                            const someFieldsFilled = filledFields.length > 0 && filledFields.length < subtaskKeys.length;
                            
                            // Render-Funktion für eine Teilaufgabe
                            const renderSubtask = (subtask: string) => {
                              const subtaskAnswers = subtasks[subtask] || [];
                              if (subtaskAnswers.length === 0) return null;
                              
                              const subtaskKey = `3${subtask}`;
                              const subtaskCorrectionKey = `${submission.id}_${subtaskKey}`;
                              // Lade Korrektur aus State oder aus submission.corrections
                              // Wichtig: Nur Fallback verwenden, wenn Key nicht im State existiert (nicht wenn Wert undefined ist)
                              const savedCorrection = submission.corrections?.find(c => c.taskNumber === subtaskKey);
                              const subtaskCorrection = corrections[subtaskCorrectionKey] !== undefined
                                ? corrections[subtaskCorrectionKey]
                                : {
                                    constructionPoints: savedCorrection?.manualPoints,
                                    comment: savedCorrection?.comment || ''
                                  };
                              
                              // Berechne Koordinatenpunkte (automatisch)
                              const coordinateAchieved = subtaskAnswers.reduce((sum, item) => {
                                const maxPoints = pointsDistribution[item.taskId] || 0;
                                if (item.isCorrect === true) {
                                  return sum + maxPoints;
                                }
                                return sum;
                              }, 0);
                              
                              // Konstruktionspunkte (manuell)
                              let constructionAchieved = subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null 
                                ? subtaskCorrection.constructionPoints 
                                : 0;
                              // Validiere: nur Werte zwischen 0 und 2 erlauben
                              if (constructionAchieved < 0) constructionAchieved = 0;
                              if (constructionAchieved > 2) constructionAchieved = 2;
                              
                              const achievedPoints = coordinateAchieved + constructionAchieved;
                              const coordinatePoints = subtaskAnswers.reduce((sum, item) => {
                                return sum + (pointsDistribution[item.taskId] || 0);
                              }, 0);
                              const totalPoints = coordinatePoints + 2; // 1.5 + 2 = 3.5
                              
                              // Bestimme Hintergrundfarbe basierend auf Bewertung
                              const allCorrect = subtaskAnswers.every(item => item.isCorrect === true);
                              const someCorrect = subtaskAnswers.some(item => item.isCorrect === true);
                              
                              return (
                                <Box>
                                  {/* Header: Teilaufgabe + Punkte + Status */}
                                  <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap" mb={0.25}>
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontWeight: 700, 
                                        color: '#1976d2', 
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      A3 {subtask}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                                      {Math.round(achievedPoints)} / {Math.round(totalPoints)}
                                    </Typography>
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
                                    mb: 0.5,
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
                                      fontSize: '0.6rem',
                                      fontStyle: 'italic',
                                      lineHeight: 1.2,
                                      color: '#2e7d32',
                                      display: 'block',
                                      mt: 0.25
                                    }}>
                                      {formatCorrectCoordinates(subtaskAnswers)}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Eingabefeld: Konstruktionspunkte */}
                                  <Box sx={{ mt: 0.5 }}>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                      <Box sx={{ position: 'relative', width: 100 }}>
                                        <TextField
                                          label="Konstruktion"
                                          type="number"
                                          value={subtaskCorrection.constructionPoints ?? ''}
                                          onChange={(e) => {
                                            const inputValue = e.target.value.trim().toLowerCase();
                                            let value: number | undefined = undefined;
                                            
                                            // Wenn "x" eingegeben wird, leere das Feld
                                            if (inputValue === 'x') {
                                              value = undefined;
                                            } else if (inputValue === '') {
                                              value = undefined;
                          } else {
                                              const numValue = parseFloat(e.target.value);
                                              if (!isNaN(numValue)) {
                                                // Validiere: nur Werte zwischen 0 und 2 erlauben
                                                if (numValue >= 0 && numValue <= 2) {
                                                  value = numValue;
                                                }
                                                // Wenn Wert außerhalb des Bereichs: ignorieren (nicht setzen)
                                              }
                                            }
                                            
                                            // Nur setzen, wenn Wert gültig ist, leer oder "x"
                                            if (value !== undefined || e.target.value === '' || inputValue === 'x') {
                                              setCorrections(prev => ({
                                                ...prev,
                                                [subtaskCorrectionKey]: { ...prev[subtaskCorrectionKey], constructionPoints: value }
                                              }));
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const currentCorrection = corrections[subtaskCorrectionKey] || {};
                                            let constructionPoints = currentCorrection.constructionPoints;
                                            
                                            // Prüfe den aktuellen Wert im TextField
                                            const inputValue = e.target.value.trim().toLowerCase();
                                            
                                            // Wenn "x" eingegeben wurde, leere das Feld
                                            if (inputValue === 'x') {
                                              constructionPoints = undefined;
                                              // Aktualisiere den State
                                              setCorrections(prev => ({
                                                ...prev,
                                                [subtaskCorrectionKey]: { ...prev[subtaskCorrectionKey], constructionPoints: undefined }
                                              }));
                                              // Leere das TextField
                                              e.target.value = '';
                                            } else if (inputValue !== '') {
                                              const numValue = parseFloat(inputValue);
                                              if (!isNaN(numValue)) {
                                                // Validiere: nur Werte zwischen 0 und 2 erlauben
                                                if (numValue >= 0 && numValue <= 2) {
                                                  constructionPoints = numValue;
                                                  // Aktualisiere den State mit dem neuen Wert
                                                  setCorrections(prev => ({
                                                    ...prev,
                                                    [subtaskCorrectionKey]: { ...prev[subtaskCorrectionKey], constructionPoints }
                                                  }));
                                                } else {
                                                  // Ungültiger Wert: auf vorherigen Wert zurücksetzen oder undefined
                                                  constructionPoints = currentCorrection.constructionPoints;
                                                  // Setze das TextField auf den gültigen Wert zurück
                                                  e.target.value = constructionPoints !== undefined ? String(constructionPoints) : '';
                                                }
                                              }
                                            }
                                            
                                            // Speichere nur, wenn ein gültiger Wert vorhanden ist (oder undefined für "x")
                                            if (constructionPoints === undefined || (constructionPoints !== null && constructionPoints >= 0 && constructionPoints <= 2)) {
                                              saveCorrection(subtaskKey, constructionPoints, currentCorrection.comment, submission.id);
                                            }
                                          }}
                                          inputProps={{ min: 0, max: 2, step: 0.5 }}
                                          tabIndex={idx * 5 + (subtask === 'a' ? 1 : subtask === 'b' ? 2 : subtask === 'c' ? 3 : 4)}
                                          size="small"
                                          sx={{ 
                                            width: 100,
                                            '& .MuiOutlinedInput-root': {
                                              bgcolor: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '#e8f5e9' : '#ffebee',
                                              border: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336',
                                              fontSize: '0.7rem',
                                              height: 32,
                                              '&:hover': {
                                                border: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336'
                                              },
                                              '&.Mui-focused': {
                                                border: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336'
                                              }
                                            },
                                            '& .MuiInputLabel-root': {
                                              fontSize: '0.65rem'
                                            }
                                          }}
                                        />
                                        {(subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) && (
                                          <CheckCircle 
                                            sx={{ 
                                              position: 'absolute',
                                              right: 4,
                                              top: '50%',
                                              transform: 'translateY(-50%)',
                                              fontSize: 18,
                                              color: '#4caf50'
                                            }}
                                          />
                                        )}
                                      </Box>
                                      <Typography variant="caption" sx={{ color: '#9c27b0', fontSize: '0.7rem', fontWeight: 500 }}>
                                        max: 2
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              );
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
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.7rem',
                                      color: allFieldsFilled ? '#2e7d32' : (someFieldsFilled ? '#f57c00' : '#d32f2f'),
                                      bgcolor: allFieldsFilled ? 'transparent' : (someFieldsFilled ? '#fff3e0' : 'transparent'),
                                      px: someFieldsFilled ? 0.5 : 0,
                                      py: someFieldsFilled ? 0.25 : 0,
                                      borderRadius: someFieldsFilled ? 0.5 : 0
                                    }}
                                  >
                                    {submission.student.name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('a')}
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('b')}
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('c')}
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('d')}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    multiline
                                    rows={4}
                                    value={task3Comment.comment ?? ''}
                                    onChange={(e) => {
                                      setCorrections(prev => ({
                                        ...prev,
                                        [task3CommentCorrectionKey]: { ...prev[task3CommentCorrectionKey], comment: e.target.value }
                                      }));
                                    }}
                                    onBlur={() => {
                                      const correction = corrections[task3CommentCorrectionKey] || {};
                                      saveCorrection(task3CommentKey, undefined, correction.comment, submission.id);
                                    }}
                                    tabIndex={idx * 5 + 5}
                                    size="small"
                                    fullWidth
                                    placeholder="Kommentar für die gesamte Aufgabe 3..."
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
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Für Aufgabe 1 und 2: Normale Darstellung
                          let allFieldsFilled = correctionState.points !== undefined && correctionState.points !== null;

                          return (
                            <TableRow 
                              key={submission.id}
                              sx={{ 
                                '&:nth-of-type(even)': { bgcolor: '#fafafa' },
                                '&:hover': { bgcolor: '#f0f0f0' }
                              }}
                            >
                              <TableCell>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.7rem',
                                    color: allFieldsFilled ? '#2e7d32' : '#f57c00',
                                    bgcolor: allFieldsFilled ? 'transparent' : '#fff3e0',
                                    px: !allFieldsFilled ? 0.5 : 0,
                                    py: !allFieldsFilled ? 0.25 : 0,
                                    borderRadius: !allFieldsFilled ? 0.5 : 0
                                  }}
                                >
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
                                <Box sx={{ position: 'relative', width: '70px' }}>
                                <TextField
                                  type="number"
                                  value={correctionState.points ?? ''}
                                  onChange={(e) => {
                                      const inputValue = e.target.value.trim().toLowerCase();
                                      let value: number | undefined = undefined;
                                      
                                      // Wenn "x" eingegeben wird, leere das Feld
                                      if (inputValue === 'x') {
                                        value = undefined;
                                      } else if (inputValue === '') {
                                        value = undefined;
                                      } else {
                                      const numValue = parseFloat(e.target.value);
                                        value = !isNaN(numValue) ? numValue : undefined;
                                      }
                                      
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
                                        bgcolor: (correctionState.points !== undefined && correctionState.points !== null && !isNaN(correctionState.points) && correctionState.points >= 0 && correctionState.points <= 10) ? '#e8f5e9' : '#ffebee',
                                        border: (correctionState.points !== undefined && correctionState.points !== null && !isNaN(correctionState.points) && correctionState.points >= 0 && correctionState.points <= 10) ? '2px solid #4caf50' : '2px solid #f44336',
                                        fontSize: '0.7rem',
                                        pr: (correctionState.points !== undefined && correctionState.points !== null && !isNaN(correctionState.points) && correctionState.points >= 0 && correctionState.points <= 10) ? 3 : 1
                                    }
                                  }}
                                />
                                  {(correctionState.points !== undefined && correctionState.points !== null && !isNaN(correctionState.points) && correctionState.points >= 0 && correctionState.points <= 10) && (
                                    <CheckCircle 
                                      sx={{ 
                                        position: 'absolute',
                                        right: 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        fontSize: 16,
                                        color: '#4caf50'
                                      }}
                                    />
                                  )}
                                </Box>
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
                                    mt: 2,
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

