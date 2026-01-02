import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import {
  Close,
  EmojiEvents,
  TrendingDown,
  TrendingUp,
  BarChart,
  PersonOff,
  Email,
  Print
} from '@mui/icons-material';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface KASubmission {
  id: string;
  student: {
    id: string;
    name: string;
    loginCode: string;
  };
  totalPoints: number;
  status: string;
  submittedAt: string;
  answers: string; // JSON string
  corrections?: Array<{
    id: string;
    taskNumber: string;
    manualPoints?: number;
    comment?: string;
  }>;
}

interface LearningGroupStudent {
  id: string;
  name: string;
  loginCode: string;
}

interface DreierprobeModalProps {
  open: boolean;
  onClose: () => void;
  kaFilePath: string;
  submissions: KASubmission[];
}

// Hilfsfunktion: Extrahiere Vornamen (alles vor dem ersten Leerzeichen)
const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

// Notenberechnung (wie in KACorrectionMode)
const calculateGrade = (achieved: number, total: number): { numeric: number; string: string } => {
  if (total === 0) return { numeric: 0, string: '-' };
  
  const percentage = (achieved / total) * 100;
  let grade: number;
  let gradeString: string;
  
  if (percentage >= 92) {
    if (percentage >= 97) {
      grade = 1.0; // 1+
      gradeString = '1+';
    } else if (percentage < 95) {
      grade = 1.3; // 1-
      gradeString = '1-';
    } else {
      grade = 1.2; // 1
      gradeString = '1';
    }
  } else if (percentage >= 81) {
    if (percentage >= 86) {
      grade = 2.0; // 2+
      gradeString = '2+';
    } else if (percentage < 84) {
      grade = 2.3; // 2-
      gradeString = '2-';
    } else {
      grade = 2.2; // 2
      gradeString = '2';
    }
  } else if (percentage >= 67) {
    if (percentage >= 72) {
      grade = 3.0; // 3+
      gradeString = '3+';
    } else if (percentage < 70) {
      grade = 3.3; // 3-
      gradeString = '3-';
    } else {
      grade = 3.2; // 3
      gradeString = '3';
    }
  } else if (percentage >= 50) {
    if (percentage >= 55) {
      grade = 4.0; // 4+
      gradeString = '4+';
    } else if (percentage < 53) {
      grade = 4.3; // 4-
      gradeString = '4-';
    } else {
      grade = 4.2; // 4
      gradeString = '4';
    }
  } else if (percentage >= 30) {
    if (percentage >= 35) {
      grade = 5.0; // 5+
      gradeString = '5+';
    } else if (percentage < 33) {
      grade = 5.3; // 5-
      gradeString = '5-';
    } else {
      grade = 5.2; // 5
      gradeString = '5';
    }
  } else {
    grade = 6.0;
    gradeString = '6';
  }
  
  return { numeric: grade, string: gradeString };
};

const DreierprobeModal: React.FC<DreierprobeModalProps> = ({
  open,
  onClose,
  kaFilePath,
  submissions
}) => {
  const [learningGroupStudents, setLearningGroupStudents] = useState<LearningGroupStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailTab, setEmailTab] = useState(0);
  const [messagesSent, setMessagesSent] = useState(false);
  const [sentMessagesInfo, setSentMessagesInfo] = useState<{ date: string; hour: string; count: number } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentHour, setAppointmentHour] = useState('');
  const [gradesReleased, setGradesReleased] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingIndividually, setExportingIndividually] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(`Liebe/r XYZ,

ich hoffe es geht dir nicht allzu schlecht und wünsche dir auf jeden Fall schon einmal gute Besserung und dass du dich gut und schnell erholst.

Ich möchte dir hiermit den Termin zum Nachschreiben der heutigen Arbeit mitteilen: [TERMIN] in Raum EDV-A2.
Deine Lehrkräfte für diese Stunde informiere ich entsprechend.

Gute Besserung,
Viele Grüße
Vera Christ`);

  useEffect(() => {
    if (open && submissions.length > 0) {
      loadLearningGroup();
    }
  }, [open, submissions]);

  useEffect(() => {
    if (open && learningGroupStudents.length > 0 && submissions.length > 0) {
      checkSentMessages();
      checkGradesReleased();
    }
  }, [open, learningGroupStudents, submissions, kaFilePath]);

  const checkGradesReleased = async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch(`/api/ka-corrections/release-status?kaFilePath=${encodeURIComponent(kaFilePath)}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGradesReleased(data.isReleased || false);
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Freigabe:', error);
    }
  };

  const handleReleaseAllGrades = async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/ka-corrections/release-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({ kaFilePath })
      });

      if (response.ok) {
        const data = await response.json();
        setGradesReleased(data.isReleased || false);
      } else {
        const errorText = await response.text();
        let errorMessage = 'Unbekannter Fehler';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('Fehler beim Freigeben:', errorMessage);
        alert(`❌ Fehler: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Fehler beim Freigeben:', error);
      alert(`❌ Fehler beim Freigeben der Noten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const parseAnswers = (answersJson: string) => {
    try {
      return JSON.parse(answersJson);
    } catch {
      return {};
    }
  };

  const formatTaskId = (taskId: string): string => {
    // Formatiere taskId zu "A1 a" Format
    const match = taskId.match(/a(\d+)([a-z]?)/);
    if (match) {
      const taskNum = match[1];
      const subTask = match[2] || '';
      return `A${taskNum}${subTask ? ' ' + subTask : ''}`;
    }
    return taskId.replace(/([a-z])(\d)/g, '$1 $2').toUpperCase();
  };

  const exportAllToPDF = async () => {
    try {
      setExporting(true);
      
      // Dynamisch jsPDF und html2canvas importieren
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Lade die HTML-Datei
      const loginCode = localStorage.getItem('loginCode') || '';
      const fileName = kaFilePath.split('/').pop() || kaFilePath;
      const htmlResponse = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`, {
        headers: {
          'x-login-code': loginCode
        }
      });
      
      if (!htmlResponse.ok) {
        const errorText = await htmlResponse.text();
        throw new Error(`HTML-Datei konnte nicht geladen werden: ${errorText}`);
      }
      
      const htmlText = await htmlResponse.text();
      
      // Richtige Antworten für die automatische Bewertung (aus KACorrectionMode)
      const correctAnswers: Record<string, any> = {
        // Aufgabe 1: Lückentext
        a1a: 'Mittelsenkrechte',
        a1b: 'Winkelhalbierende',
        a1c: 'Achsenspiegelung',
        a1d: 'Punktspiegelung',
        a1e: 'Verschiebung',
        a1f: 'Drehung',
        a1g: 'Kongruenzabbildung',
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

      // Punkteverteilung
      const pointsDistribution: Record<string, number> = {
        a1a: 1, a1b: 1, a1c: 1, a1d: 1, a1e: 1, a1f: 1, a1g: 1, a1h: 1,
        a2a: 1, a2b: 1, a2c: 1,
        'a3a_x': 0.25, 'a3a_y': 0.25, 'a3b_x': 0.25, 'a3b_y': 0.25, 'a3c_x': 0.25, 'a3c_y': 0.25,
        'a3d_x': 0.25, 'a3d_y': 0.25, 'a3e_x': 0.25, 'a3e_y': 0.25, 'a3f_x': 0.25, 'a3f_y': 0.25,
        'a3g_x': 0.25, 'a3g_y': 0.25, 'a3h_x': 0.25, 'a3h_y': 0.25, 'a3i_x': 0.25, 'a3i_y': 0.25,
        'a3j_x': 0.25, 'a3j_y': 0.25, 'a3k_x': 0.25, 'a3k_y': 0.25, 'a3l_x': 0.25, 'a3l_y': 0.25
      };

      // Prüft ob eine Antwort richtig ist
      const isAnswerCorrect = (taskId: string, studentAnswer: any): boolean => {
        const correctAnswer = correctAnswers[taskId];
        if (correctAnswer === undefined) return false;
        
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

      // Sortiere Submissions nach Schülernamen
      const sortedSubmissions = [...submissions].sort((a, b) => 
        a.student.name.localeCompare(b.student.name)
      );

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Für jede Abgabe
      for (let i = 0; i < sortedSubmissions.length; i++) {
        const submission = sortedSubmissions[i];
        const answers = parseAnswers(submission.answers);

        // Erstelle ein temporäres iframe für vollständiges Rendering
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.width = '210mm';
        iframe.style.height = '297mm';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // Warte bis iframe geladen ist
        await new Promise<void>((resolve) => {
          iframe.onload = () => resolve();
          iframe.src = 'about:blank';
        });

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Iframe konnte nicht erstellt werden');
        }

        // Parse HTML und füge Antworten mit Bewertungen ein
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        // Ersetze "Frau Christ" durch Schülername überall im Dokument
        const studentName = submission.student.name;
        const bodyText = doc.body.innerHTML;
        doc.body.innerHTML = bodyText.replace(/Frau Christ/g, studentName);
        
        // Entferne Abgabebutton
        const submitButtons = doc.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(btn => {
          const text = btn.textContent || (btn as HTMLInputElement).value || '';
          if (text.toLowerCase().includes('abgeben') || text.toLowerCase().includes('submit') || 
              btn.id?.toLowerCase().includes('submit') || btn.className?.toLowerCase().includes('submit')) {
            btn.remove();
          }
        });
        
        // Entferne auch Buttons mit onclick-Handlern, die submit enthalten
        const allButtons = doc.querySelectorAll('button');
        allButtons.forEach(btn => {
          const onclick = btn.getAttribute('onclick') || '';
          if (onclick.toLowerCase().includes('submit') || onclick.toLowerCase().includes('abgeben')) {
            btn.remove();
          }
        });
        
        // Entferne Timer-Elemente
        const timerElements = doc.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"], [id*="time"], [class*="time"]');
        timerElements.forEach(el => {
          const text = el.textContent || '';
          if (text.match(/\d+:\d+/) || text.includes('Verbleibend') || text.includes('verbleibend') || 
              text.includes('Zeit') || el.id?.toLowerCase().includes('timer')) {
            el.remove();
          }
        });
        
        // Berechne Gesamtpunkte und Note (berücksichtigt manuelle Korrekturen)
        // Verwende totalPoints aus submission, da dies bereits alle Korrekturen enthält
        const totalAchieved = submission.totalPoints;
        const maxTotalPoints = 25; // Aufgabe 1: 8, Aufgabe 2: 3, Aufgabe 3: 14
        const gradeData = calculateGrade(totalAchieved, maxTotalPoints);
        
        // Füge Punkte und Note in die HTML ein (falls es Felder dafür gibt)
        const pointsInput = doc.querySelector('#points, [name="points"], [id*="punkt"], [name*="punkt"]') as HTMLInputElement;
        if (pointsInput) {
          pointsInput.value = `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
        }
        
        const gradeInput = doc.querySelector('#grade, [name="grade"], [id*="note"], [name*="note"]') as HTMLInputElement;
        if (gradeInput) {
          gradeInput.value = gradeData.string;
        }
        
        // Erstelle Map für manuelle Korrekturen
        const correctionsMap: Record<string, { points?: number; constructionPoints?: number }> = {};
        if (submission.corrections) {
          submission.corrections.forEach((corr) => {
            if (corr.taskNumber.match(/^3[a-d]$/)) {
              // Aufgabe 3 Teilaufgaben: manualPoints sind Konstruktionspunkte
              correctionsMap[corr.taskNumber] = { constructionPoints: corr.manualPoints };
            } else {
              // Andere Aufgaben: manualPoints sind normale Punkte
              correctionsMap[corr.taskNumber] = { points: corr.manualPoints };
            }
          });
        }
        
        // Füge kombinierte Header-Box oben hinzu
        const headerContainer = doc.createElement('div');
        headerContainer.style.cssText = `
          margin-bottom: 20px;
          padding: 0;
        `;
        
        const combinedHeader = doc.createElement('div');
        combinedHeader.style.cssText = `
          background-color: #1976d2;
          color: white;
          padding: 15px 20px;
          border-radius: 5px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        `;
        
        // Linke Seite: Name und Datum
        const leftSection = doc.createElement('div');
        leftSection.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
        const nameDiv = doc.createElement('div');
        nameDiv.style.cssText = 'font-size: 1.3em; font-weight: bold;';
        nameDiv.textContent = submission.student.name;
        const dateDiv = doc.createElement('div');
        dateDiv.style.cssText = 'font-size: 0.85em; font-weight: normal; opacity: 0.95;';
        dateDiv.textContent = `Abgabe vom ${new Date(submission.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(submission.submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
        leftSection.appendChild(nameDiv);
        leftSection.appendChild(dateDiv);
        
        // Rechte Seite: Punkte und Note
        const rightSection = doc.createElement('div');
        rightSection.style.cssText = 'display: flex; gap: 30px; align-items: center;';
        rightSection.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Punkte</div>
            <div style="font-size: 1.2em; font-weight: bold;">${totalAchieved.toFixed(1)} / ${maxTotalPoints}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Note</div>
            <div style="font-size: 1.2em; font-weight: bold;">${gradeData.string}</div>
          </div>
        `;
        
        combinedHeader.appendChild(leftSection);
        combinedHeader.appendChild(rightSection);
        headerContainer.appendChild(combinedHeader);
        
        // Füge Header am Anfang des Body ein
        if (doc.body) {
          doc.body.insertBefore(headerContainer, doc.body.firstChild);
        }
        
        // Füge CSS für farbliche Markierung hinzu
        const style = doc.createElement('style');
        style.textContent = `
          .answer-correct {
            background-color: #c8e6c9 !important;
            border: 2px solid #4caf50 !important;
            color: #1b5e20 !important;
          }
          .answer-incorrect {
            background-color: #ffcdd2 !important;
            border: 2px solid #f44336 !important;
            color: #b71c1c !important;
          }
          .points-badge {
            display: inline-block;
            margin-left: 5px;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: bold;
          }
          .points-correct {
            background-color: #4caf50;
            color: white;
          }
          .points-incorrect {
            background-color: #f44336;
            color: white;
          }
        `;
        doc.head.appendChild(style);
        
        // Fülle alle Input-Felder mit den Antworten und markiere sie
        Object.entries(answers).forEach(([taskId, answer]) => {
          // Suche nach Input-Feldern mit diesem taskId als id oder name
          // Versuche verschiedene Selektoren
          let input = doc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!input) {
            input = doc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          if (!input) {
            // Versuche auch mit data-task-id Attribut
            input = doc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          
          if (input) {
            const isCorrect = isAnswerCorrect(taskId, answer);
            const maxPoints = pointsDistribution[taskId] || 0;
            
            // Berechne erreichte Punkte
            let achievedPoints = isCorrect ? maxPoints : 0;
            
            // Für Aufgabe 3: Berücksichtige manuelle Korrekturen
            if (taskId.startsWith('a3')) {
              // Extrahiere Teilaufgabe (a, b, c, d) aus taskId
              const match = taskId.match(/a3([a-d])/);
              if (match) {
                const subtask = match[1];
                const subtaskKey = `3${subtask}`;
                const subtaskCorrection = correctionsMap[subtaskKey];
                
                // Koordinatenpunkte (automatisch)
                if (isCorrect) {
                  achievedPoints = maxPoints; // 0.25 pro richtige Koordinate
                }
                
                // Konstruktionspunkte werden separat für die gesamte Teilaufgabe angezeigt
                // Hier zeigen wir nur die Koordinatenpunkte
              }
            } else {
              // Für andere Aufgaben: Prüfe manuelle Korrekturen
              const taskNum = taskId.match(/a(\d+)/)?.[1];
              if (taskNum && correctionsMap[taskNum]) {
                const correction = correctionsMap[taskNum];
                if (correction.points !== undefined && correction.points !== null) {
                  // Manuelle Korrektur überschreibt automatische Bewertung
                  achievedPoints = correction.points;
                }
              }
            }
            
            // Setze Wert basierend auf Element-Typ
            const answerStr = String(answer || '').trim();
            if (input.tagName === 'INPUT') {
              const inputEl = input as HTMLInputElement;
              if (inputEl.type === 'radio' || inputEl.type === 'checkbox') {
                // Für Radio/Checkbox: Prüfe ob value übereinstimmt
                if (inputEl.value === answerStr || inputEl.id === taskId || inputEl.name === taskId) {
                  inputEl.checked = true;
                }
              } else {
                inputEl.value = answerStr;
              }
            } else if (input.tagName === 'TEXTAREA') {
              (input as HTMLTextAreaElement).value = answerStr;
            } else if (input.tagName === 'SELECT') {
              (input as unknown as HTMLSelectElement).value = answerStr;
            } else {
              // Für andere Elemente: Setze textContent
              input.textContent = answerStr;
            }
            
            // Markiere Input-Feld farblich
            input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
            
            // Erstelle Container für Input und Badge
            const container = doc.createElement('span');
            container.style.display = 'inline-flex';
            container.style.alignItems = 'center';
            container.style.gap = '5px';
            container.style.position = 'relative';
            container.style.verticalAlign = 'middle';
            container.style.marginLeft = '5px';
            
            // Wrappe Input in Container (nur wenn noch nicht gewrappt)
            if (input.parentElement && !input.parentElement.classList.contains('answer-container')) {
              const parent = input.parentElement;
              parent.insertBefore(container, input);
              container.appendChild(input);
              container.classList.add('answer-container');
              
              // Füge Punkte-Badge hinzu
              const pointsBadge = doc.createElement('span');
              pointsBadge.className = `points-badge ${achievedPoints > 0 ? 'points-correct' : 'points-incorrect'}`;
              // Zeige Punkte ohne Dezimalstellen wenn möglich
              const pointsText = maxPoints % 1 === 0 && achievedPoints % 1 === 0 
                ? `${achievedPoints}/${maxPoints}` 
                : `${achievedPoints.toFixed(2)}/${maxPoints}`;
              pointsBadge.textContent = pointsText;
              pointsBadge.style.whiteSpace = 'nowrap';
              pointsBadge.style.marginLeft = '3px';
              container.appendChild(pointsBadge);
            }
          } else {
            // Debug: Log wenn Input nicht gefunden wird
            console.warn(`Input-Feld nicht gefunden für taskId: ${taskId}, answer: ${answer}`);
          }
        });

        // Setze HTML in iframe
        iframeDoc.open();
        iframeDoc.write(doc.documentElement.outerHTML);
        iframeDoc.close();

        // Warte bis alles gerendert ist
        await new Promise(resolve => setTimeout(resolve, 500));

        // Rendere iframe body als Canvas
        const body = iframeDoc.body;
        if (!body) {
          throw new Error('Iframe body nicht gefunden');
        }
        
        // Wende alle Änderungen auch im iframe-DOM an (da das iframe ein neues DOM hat)
        // 1. Ersetze "Frau Christ" durch Schülername
        const iframeBodyText = body.innerHTML;
        body.innerHTML = iframeBodyText.replace(/Frau Christ/g, studentName);
        
        // 1b. Aktualisiere den kombinierten Header im iframe
        const iframeHeader = body.querySelector('[style*="background-color: #1976d2"]') as HTMLElement;
        if (iframeHeader) {
          const headerText = iframeHeader.textContent || '';
          if (headerText.includes('Abgabe vom') || headerText.includes(submission.student.name)) {
            // Header bereits vorhanden, aktualisiere ihn zu kombinierter Version
            iframeHeader.style.display = 'flex';
            iframeHeader.style.justifyContent = 'space-between';
            iframeHeader.style.alignItems = 'center';
            iframeHeader.style.flexWrap = 'wrap';
            iframeHeader.style.gap = '15px';
            
            // Linke Seite: Name und Datum
            const leftSection = iframeDoc.createElement('div');
            leftSection.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
            const nameDiv = iframeDoc.createElement('div');
            nameDiv.style.cssText = 'font-size: 1.3em; font-weight: bold;';
            nameDiv.textContent = studentName;
            const dateDiv = iframeDoc.createElement('div');
            dateDiv.style.cssText = 'font-size: 0.85em; font-weight: normal; opacity: 0.95;';
            dateDiv.textContent = `Abgabe vom ${new Date(submission.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(submission.submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
            leftSection.appendChild(nameDiv);
            leftSection.appendChild(dateDiv);
            
            // Rechte Seite: Punkte und Note
            const rightSection = iframeDoc.createElement('div');
            rightSection.style.cssText = 'display: flex; gap: 30px; align-items: center;';
            rightSection.innerHTML = `
              <div style="text-align: center;">
                <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Punkte</div>
                <div style="font-size: 1.2em; font-weight: bold;">${totalAchieved.toFixed(1)} / ${maxTotalPoints}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Note</div>
                <div style="font-size: 1.2em; font-weight: bold;">${gradeData.string}</div>
              </div>
            `;
            
            iframeHeader.innerHTML = '';
            iframeHeader.appendChild(leftSection);
            iframeHeader.appendChild(rightSection);
          }
        }
        
        // 2. Entferne Abgabebutton im iframe
        const iframeSubmitButtons = body.querySelectorAll('button[type="submit"], input[type="submit"]');
        iframeSubmitButtons.forEach(btn => {
          const text = btn.textContent || (btn as HTMLInputElement).value || '';
          if (text.toLowerCase().includes('abgeben') || text.toLowerCase().includes('submit') || 
              btn.id?.toLowerCase().includes('submit') || btn.className?.toLowerCase().includes('submit')) {
            btn.remove();
          }
        });
        
        const iframeAllButtons = body.querySelectorAll('button');
        iframeAllButtons.forEach(btn => {
          const onclick = btn.getAttribute('onclick') || '';
          const text = btn.textContent || '';
          if (onclick.toLowerCase().includes('submit') || onclick.toLowerCase().includes('abgeben') ||
              text.toLowerCase().includes('abgeben') || text.toLowerCase().includes('submit')) {
            btn.remove();
          }
        });
        
        // Entferne Timer-Elemente im iframe
        const iframeTimerElements = body.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"], [id*="time"], [class*="time"]');
        iframeTimerElements.forEach(el => {
          const text = el.textContent || '';
          if (text.match(/\d+:\d+/) || text.includes('Verbleibend') || text.includes('verbleibend') || 
              text.includes('Zeit') || el.id?.toLowerCase().includes('timer')) {
            el.remove();
          }
        });
        
        // 3. Füge Antworten in iframe ein und markiere sie
        Object.entries(answers).forEach(([taskId, answer]) => {
          let input = body.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!input) {
            input = body.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          if (!input) {
            input = body.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          
          if (input) {
            const isCorrect = isAnswerCorrect(taskId, answer);
            const maxPoints = pointsDistribution[taskId] || 0;
            let achievedPoints = isCorrect ? maxPoints : 0;
            
            // Berücksichtige manuelle Korrekturen
            if (taskId.startsWith('a3')) {
              const match = taskId.match(/a3([a-d])/);
              if (match) {
                const subtask = match[1];
                const subtaskKey = `3${subtask}`;
                const subtaskCorrection = correctionsMap[subtaskKey];
                if (isCorrect) {
                  achievedPoints = maxPoints;
                }
              }
            } else {
              const taskNum = taskId.match(/a(\d+)/)?.[1];
              if (taskNum && correctionsMap[taskNum]) {
                const correction = correctionsMap[taskNum];
                if (correction.points !== undefined && correction.points !== null) {
                  achievedPoints = correction.points;
                }
              }
            }
            
            // Setze Wert
            const answerStr = String(answer || '').trim();
            if (input.tagName === 'INPUT') {
              const inputEl = input as HTMLInputElement;
              if (inputEl.type === 'radio' || inputEl.type === 'checkbox') {
                if (inputEl.value === answerStr || inputEl.id === taskId || inputEl.name === taskId) {
                  inputEl.checked = true;
                }
              } else {
                inputEl.value = answerStr;
              }
            } else if (input.tagName === 'TEXTAREA') {
              (input as HTMLTextAreaElement).value = answerStr;
            } else if (input.tagName === 'SELECT') {
              (input as unknown as HTMLSelectElement).value = answerStr;
            } else {
              input.textContent = answerStr;
            }
            
            // Markiere farblich
            input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
            
            // Füge Punkte-Badge hinzu (nur wenn noch nicht vorhanden)
            if (!input.parentElement?.querySelector('.points-badge')) {
              const container = iframeDoc.createElement('span');
              container.style.display = 'inline-flex';
              container.style.alignItems = 'center';
              container.style.gap = '5px';
              container.style.marginLeft = '5px';
              
              if (input.parentElement) {
                const parent = input.parentElement;
                parent.insertBefore(container, input);
                container.appendChild(input);
                
                const pointsBadge = iframeDoc.createElement('span');
                pointsBadge.className = `points-badge ${achievedPoints > 0 ? 'points-correct' : 'points-incorrect'}`;
                const pointsText = maxPoints % 1 === 0 && achievedPoints % 1 === 0 
                  ? `${achievedPoints}/${maxPoints}` 
                  : `${achievedPoints.toFixed(2)}/${maxPoints}`;
                pointsBadge.textContent = pointsText;
                pointsBadge.style.whiteSpace = 'nowrap';
                pointsBadge.style.marginLeft = '3px';
                container.appendChild(pointsBadge);
              }
            }
          }
        });
        
        // 4. Füge CSS für farbliche Markierung im iframe hinzu
        const iframeStyle = iframeDoc.createElement('style');
        iframeStyle.textContent = `
          .answer-correct {
            background-color: #c8e6c9 !important;
            border: 2px solid #4caf50 !important;
            color: #1b5e20 !important;
          }
          .answer-incorrect {
            background-color: #ffcdd2 !important;
            border: 2px solid #f44336 !important;
            color: #b71c1c !important;
          }
          .points-badge {
            display: inline-block;
            margin-left: 5px;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
            font-weight: bold;
          }
          .points-correct {
            background-color: #4caf50;
            color: white;
          }
          .points-incorrect {
            background-color: #f44336;
            color: white;
          }
          /* Sicherstellen, dass Input-Felder nicht abgeschnitten werden */
          input[type="text"], input:not([type]), textarea, input[type="number"] {
            min-height: 40px !important;
            height: auto !important;
            padding: 8px 12px !important;
            line-height: 1.6 !important;
            overflow: visible !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            box-sizing: border-box !important;
            vertical-align: top !important;
          }
          /* Speziell für Koordinaten-Input-Felder */
          input[type="number"], input[id*="x"], input[id*="y"], input[name*="x"], input[name*="y"] {
            min-height: 45px !important;
            padding: 10px 12px !important;
            font-size: 1em !important;
          }
          textarea {
            resize: vertical !important;
            min-height: 70px !important;
            padding: 10px 12px !important;
          }
          /* Verhindere Seitenumbrüche innerhalb von Elementen - KRITISCH */
          input, textarea, select, label, .answer-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 10px !important;
            margin-top: 5px !important;
          }
          /* Verhindere Seitenumbrüche innerhalb von Aufgaben und Containern */
          div, section, article, p, form, fieldset {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Verhindere dass Input-Felder am Seitenende abgeschnitten werden */
          input, textarea {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          /* Mehr Abstand zwischen Elementen für bessere Lesbarkeit und Seitenumbrüche */
          * {
            margin-top: 3px !important;
            margin-bottom: 3px !important;
          }
          /* Zusätzlicher Abstand für bessere Trennung */
          br {
            line-height: 1.5 !important;
          }
        `;
        if (!iframeDoc.head.querySelector('style[data-export-style]')) {
          iframeStyle.setAttribute('data-export-style', 'true');
          iframeDoc.head.appendChild(iframeStyle);
        }
        
        // 5. Fülle nur die "__" Platzhalter für Punkte und Note aus
        // WICHTIG: Nur in spezifischen Kontexten, nicht in den Antwort-Feldern der Aufgaben
        
        // Durchsuche alle Textknoten und ersetze nur "__" Platzhalter im richtigen Kontext
        const walker = iframeDoc.createTreeWalker(
          body,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let textNode;
        while (textNode = walker.nextNode()) {
          let text = textNode.textContent || '';
          let updated = false;
          
          // Prüfe den Kontext - muss "Punkten erreicht" oder ähnliches enthalten
          const parentText = textNode.parentElement?.textContent || '';
          const fullContext = text + ' ' + parentText;
          
          // Ersetze "__ / __" Pattern für Punkte NUR wenn im Kontext von "Punkten erreicht" oder "erreicht"
          if (text.includes('__') && text.includes('/') && 
              (fullContext.includes('Punkten erreicht') || fullContext.includes('Punkte erreicht') || 
               fullContext.includes('erreicht') && fullContext.includes('Punkt'))) {
            text = text.replace(/__+\s*\/\s*__+/g, (match) => {
              updated = true;
              return `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
            });
          }
          
          // Ersetze "____" oder "__" für Note NUR wenn im Kontext von "Note"
          if (fullContext.includes('Note') && (text.includes('____') || text.includes('__'))) {
            // Ersetze "____" für Note
            text = text.replace(/____+/g, (match) => {
              updated = true;
              return gradeData.string;
            });
            // Ersetze "__" nach "Note:"
            text = text.replace(/Note\s*:\s*__+/g, (match) => {
              updated = true;
              return `Note: ${gradeData.string}`;
            });
            // Ersetze "__" wenn es direkt nach "Note" kommt
            text = text.replace(/Note\s+__+/g, (match) => {
              updated = true;
              return match.replace(/__+/, gradeData.string);
            });
          }
          
          if (updated && textNode.textContent) {
            textNode.textContent = text;
          }
        }
        
        // Suche nach Input-Feldern, die NUR für Punkte/Note gedacht sind
        // Prüfe, ob das Input-Feld im Kontext von "Punkten erreicht" oder "Note" steht
        const pointsNoteInputs = body.querySelectorAll('input[type="text"], input:not([type]), textarea');
        pointsNoteInputs.forEach((input: Element) => {
          const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
          
          // Prüfe ob dieses Input-Feld bereits eine Antwort enthält (dann nicht ändern!)
          if (inputEl.value && inputEl.value.trim() && !inputEl.value.match(/^[_]+$/)) {
            return; // Überspringe, wenn bereits ein Wert vorhanden ist
          }
          
          // Prüfe den Kontext des Input-Felds
          const parentText = inputEl.parentElement?.textContent || '';
          const previousSibling = inputEl.previousElementSibling?.textContent || '';
          const nextSibling = inputEl.nextElementSibling?.textContent || '';
          const context = parentText + ' ' + previousSibling + ' ' + nextSibling;
          
          // Prüfe auf Punkte-Pattern - muss "Punkten erreicht" oder ähnliches im Kontext haben
          if (context.includes('Punkten erreicht') || context.includes('Punkte erreicht') || 
              (context.includes('erreicht') && context.includes('Punkt'))) {
            // Prüfe ob der Wert oder Placeholder "__" enthält
            const value = inputEl.value || '';
            const placeholder = inputEl.placeholder || '';
            if ((value.includes('__') || placeholder.includes('__')) && context.includes('/')) {
              inputEl.value = `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
            }
          }
          
          // Prüfe auf Note-Pattern - muss "Note" im Kontext haben
          if (context.includes('Note')) {
            const value = inputEl.value || '';
            const placeholder = inputEl.placeholder || '';
            if (value.includes('__') || placeholder.includes('__') || value === '' || value.match(/^[_]+$/)) {
              // Nur wenn es wirklich ein Note-Feld ist (im Kontext von "Note")
              inputEl.value = gradeData.string;
            }
          }
        });
        
        // Warte kurz, damit alle Änderungen gerendert werden
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Finde das Ende der letzten Aufgabe und entferne alles danach
        // Suche nach dem letzten Input-Feld, das zu einer Aufgabe gehört (nicht Punkte/Note)
        const taskInputs = body.querySelectorAll('input, textarea, select');
        let lastTaskElement: Element | null = null;
        
        if (taskInputs.length > 0) {
          // Finde das letzte Input-Feld, das zu einer Aufgabe gehört
          for (let i = taskInputs.length - 1; i >= 0; i--) {
            const input = taskInputs[i];
            const parentText = input.parentElement?.textContent || '';
            // Überspringe Input-Felder für Punkte/Note
            if (!parentText.includes('Punkten erreicht') && !parentText.includes('Note:')) {
              lastTaskElement = input;
              break;
            }
          }
        }
        
        // Wenn kein Input-Feld gefunden, suche nach "Note" oder "Punkten erreicht"
        if (!lastTaskElement) {
          const allElements = Array.from(body.querySelectorAll('*'));
          for (let i = allElements.length - 1; i >= 0; i--) {
            const el = allElements[i];
            const text = el.textContent || '';
            if (text.includes('Note:') || text.includes('Punkten erreicht')) {
              lastTaskElement = el;
              break;
            }
          }
        }
        
        // Entferne alle Elemente nach dem letzten Aufgaben-Element
        if (lastTaskElement) {
          // Finde den Container, der das letzte Element enthält
          let container = lastTaskElement.parentElement;
          while (container && container !== body) {
            // Entferne alle nachfolgenden Geschwister
            let sibling = container.nextSibling;
            while (sibling) {
              const nextSibling = sibling.nextSibling;
              if (sibling.parentNode) {
                sibling.parentNode.removeChild(sibling);
              }
              sibling = nextSibling;
            }
            container = container.parentElement;
          }
          
          // Entferne auch alle nachfolgenden Geschwister des letzten Elements selbst
          let sibling = lastTaskElement.nextSibling;
          while (sibling) {
            const nextSibling = sibling.nextSibling;
            if (sibling.parentNode) {
              sibling.parentNode.removeChild(sibling);
            }
            sibling = nextSibling;
          }
        }
        
        // Setze die Höhe des Body auf den Inhalt
        body.style.height = 'auto';
        body.style.overflow = 'visible';
        
        // Warte nochmal, damit alle Änderungen gerendert werden
        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(body, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: body.scrollWidth,
          height: body.scrollHeight
        });

        // Berechne Dimensionen für PDF mit sicherer Seitenumbrüche-Logik
        const margin = 15; // Rand für jede Seite
        const safetyMargin = 20; // Zusätzlicher Sicherheitsabstand für Seitenumbrüche
        const imgWidth = pageWidth - 2 * margin;
        const scale = imgWidth / canvas.width;
        const imgHeight = canvas.height * scale;
        const usablePageHeight = pageHeight - 2 * margin - safetyMargin; // Sicherheitsabstand abziehen

        // Neue Seite für jeden Schüler (außer dem ersten)
        if (i > 0) {
          pdf.addPage();
        }

        // Wenn das Bild auf eine Seite passt
        if (imgHeight <= usablePageHeight) {
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        } else {
          // Teile auf mehrere Seiten auf - mit Sicherheitsabstand
          let sourceY = 0;
          let pageNum = 0;
          
          while (sourceY < canvas.height) {
            if (pageNum > 0) {
              pdf.addPage();
            }
            
            // Berechne wie viel auf diese Seite passt (mit Sicherheitsabstand)
            const remainingHeight = canvas.height - sourceY;
            // Verwende Math.floor für saubere Pixel-Grenzen
            const maxClipHeight = Math.floor(usablePageHeight / scale);
            const clipHeight = Math.min(remainingHeight, maxClipHeight);
            const displayHeight = clipHeight * scale;
            
            // Erstelle temporäres Canvas für diesen Ausschnitt
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = clipHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              // Zeichne den entsprechenden Ausschnitt des Original-Canvas
              tempCtx.drawImage(
                canvas,
                0, sourceY, canvas.width, clipHeight,  // Source rectangle
                0, 0, canvas.width, clipHeight         // Destination rectangle
              );
              
              const tempImgData = tempCanvas.toDataURL('image/png');
              // Füge mit Sicherheitsabstand hinzu
              pdf.addImage(tempImgData, 'PNG', margin, margin, imgWidth, displayHeight);
            }
            
            sourceY += clipHeight;
            pageNum++;
          }
        }

        // Entferne temporären iframe
        document.body.removeChild(iframe);
      }

      // Speichere PDF
      const fileName_pdf = `Alle_Abgaben_${fileName.replace('.html', '') || 'statistik'}.pdf`;
      pdf.save(fileName_pdf);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`❌ Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setExporting(false);
    }
  };

  // Hilfsfunktion: Erstellt ein PDF für einen einzelnen Schüler
  const createSingleStudentPDF = async (
    submission: KASubmission,
    htmlText: string,
    correctAnswers: Record<string, any>,
    pointsDistribution: Record<string, number>,
    isAnswerCorrect: (taskId: string, studentAnswer: any) => boolean,
    fileName: string
  ): Promise<void> => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    const answers = parseAnswers(submission.answers);
    const totalAchieved = submission.totalPoints;
    const maxTotalPoints = 25;
    const gradeData = calculateGrade(totalAchieved, maxTotalPoints);
    const studentName = submission.student.name;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Erstelle iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.src = 'about:blank';
    });

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Iframe konnte nicht erstellt werden');
    }

    // Parse HTML und wende alle Änderungen an (gleiche Logik wie exportAllToPDF)
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const bodyText = doc.body.innerHTML;
    doc.body.innerHTML = bodyText.replace(/Frau Christ/g, studentName);

    // Entferne Buttons und Timer
    const submitButtons = doc.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitButtons.forEach(btn => btn.remove());
    const allButtons = doc.querySelectorAll('button');
    allButtons.forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.toLowerCase().includes('submit') || onclick.toLowerCase().includes('abgeben')) {
        btn.remove();
      }
    });
    const timerElements = doc.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"]');
    timerElements.forEach(el => el.remove());

    // Erstelle Map für manuelle Korrekturen
    const correctionsMap: Record<string, { points?: number; constructionPoints?: number }> = {};
    if (submission.corrections) {
      submission.corrections.forEach((corr) => {
        if (corr.taskNumber.match(/^3[a-d]$/)) {
          correctionsMap[corr.taskNumber] = { constructionPoints: corr.manualPoints };
        } else {
          correctionsMap[corr.taskNumber] = { points: corr.manualPoints };
        }
      });
    }

    // Füge kombinierte Header-Box hinzu
    const headerContainer = doc.createElement('div');
    headerContainer.style.cssText = 'margin-bottom: 20px; padding: 0;';
    const combinedHeader = doc.createElement('div');
    combinedHeader.style.cssText = `
      background-color: #1976d2;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    `;
    const leftSection = doc.createElement('div');
    leftSection.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
    const nameDiv = doc.createElement('div');
    nameDiv.style.cssText = 'font-size: 1.3em; font-weight: bold;';
    nameDiv.textContent = studentName;
    const dateDiv = doc.createElement('div');
    dateDiv.style.cssText = 'font-size: 0.85em; font-weight: normal; opacity: 0.95;';
    dateDiv.textContent = `Abgabe vom ${new Date(submission.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(submission.submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    leftSection.appendChild(nameDiv);
    leftSection.appendChild(dateDiv);
    const rightSection = doc.createElement('div');
    rightSection.style.cssText = 'display: flex; gap: 30px; align-items: center;';
    rightSection.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Punkte</div>
        <div style="font-size: 1.2em; font-weight: bold;">${totalAchieved.toFixed(1)} / ${maxTotalPoints}</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 4px;">Note</div>
        <div style="font-size: 1.2em; font-weight: bold;">${gradeData.string}</div>
      </div>
    `;
    combinedHeader.appendChild(leftSection);
    combinedHeader.appendChild(rightSection);
    headerContainer.appendChild(combinedHeader);
    if (doc.body) {
      doc.body.insertBefore(headerContainer, doc.body.firstChild);
    }

    // Füge CSS hinzu (gleiche Logik wie exportAllToPDF)
    const style = doc.createElement('style');
    style.textContent = `
      .answer-correct {
        background-color: #c8e6c9 !important;
        border: 2px solid #4caf50 !important;
        color: #1b5e20 !important;
      }
      .answer-incorrect {
        background-color: #ffcdd2 !important;
        border: 2px solid #f44336 !important;
        color: #b71c1c !important;
      }
      .points-badge {
        display: inline-block;
        margin-left: 5px;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.85em;
        font-weight: bold;
      }
      .points-correct {
        background-color: #4caf50;
        color: white;
      }
      .points-incorrect {
        background-color: #f44336;
        color: white;
      }
      input[type="text"], input:not([type]), textarea, input[type="number"] {
        min-height: 40px !important;
        height: auto !important;
        padding: 8px 12px !important;
        line-height: 1.6 !important;
        overflow: visible !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        box-sizing: border-box !important;
        vertical-align: top !important;
      }
      input[type="number"], input[id*="x"], input[id*="y"], input[name*="x"], input[name*="y"] {
        min-height: 45px !important;
        padding: 10px 12px !important;
        font-size: 1em !important;
      }
      textarea {
        resize: vertical !important;
        min-height: 70px !important;
        padding: 10px 12px !important;
      }
      input, textarea, select, label, .answer-container {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 10px !important;
        margin-top: 5px !important;
      }
      div, section, article, p, form, fieldset {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      input, textarea {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      * {
        margin-top: 3px !important;
        margin-bottom: 3px !important;
      }
    `;
    doc.head.appendChild(style);

    // Fülle Antworten ein (vereinfacht - sollte die vollständige Logik verwenden)
    Object.entries(answers).forEach(([taskId, answer]) => {
      let input = doc.querySelector(`#${taskId}, [name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input) {
        const isCorrect = isAnswerCorrect(taskId, answer);
        const answerStr = String(answer || '').trim();
        if (input.tagName === 'INPUT') {
          const inputEl = input as HTMLInputElement;
          if (inputEl.type !== 'radio' && inputEl.type !== 'checkbox') {
            inputEl.value = answerStr;
          }
        } else if (input.tagName === 'TEXTAREA') {
          (input as HTMLTextAreaElement).value = answerStr;
        } else if (input.tagName === 'SELECT') {
          (input as unknown as HTMLSelectElement).value = answerStr;
        }
        input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
      }
    });

    // Setze HTML in iframe
    iframeDoc.open();
    iframeDoc.write(doc.documentElement.outerHTML);
    iframeDoc.close();

    await new Promise(resolve => setTimeout(resolve, 500));

    const body = iframeDoc.body;
    if (!body) {
      throw new Error('Iframe body nicht gefunden');
    }

    // Wende alle Änderungen im iframe an (vereinfacht)
    body.innerHTML = body.innerHTML.replace(/Frau Christ/g, studentName);

    // Fülle Antworten im iframe
    Object.entries(answers).forEach(([taskId, answer]) => {
      let input = body.querySelector(`#${taskId}, [name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input) {
        const answerStr = String(answer || '').trim();
        if (input.tagName === 'INPUT') {
          const inputEl = input as HTMLInputElement;
          if (inputEl.type !== 'radio' && inputEl.type !== 'checkbox') {
            inputEl.value = answerStr;
          }
        } else if (input.tagName === 'TEXTAREA') {
          (input as HTMLTextAreaElement).value = answerStr;
        } else if (input.tagName === 'SELECT') {
          (input as unknown as HTMLSelectElement).value = answerStr;
        }
        const isCorrect = isAnswerCorrect(taskId, answer);
        input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
      }
    });

    // Entferne alles nach der letzten Aufgabe
    const taskInputs = body.querySelectorAll('input, textarea, select');
    let lastTaskElement: Element | null = null;
    if (taskInputs.length > 0) {
      for (let i = taskInputs.length - 1; i >= 0; i--) {
        const input = taskInputs[i];
        const parentText = input.parentElement?.textContent || '';
        if (!parentText.includes('Punkten erreicht') && !parentText.includes('Note:')) {
          lastTaskElement = input;
          break;
        }
      }
    }
    if (lastTaskElement) {
      let sibling = lastTaskElement.nextSibling;
      while (sibling) {
        const nextSibling = sibling.nextSibling;
        if (sibling.parentNode) {
          sibling.parentNode.removeChild(sibling);
        }
        sibling = nextSibling;
      }
    }

    body.style.height = 'auto';
    body.style.overflow = 'visible';
    await new Promise(resolve => setTimeout(resolve, 300));

    // Rendere Canvas
    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: body.scrollWidth,
      height: body.scrollHeight
    });

    // Füge zu PDF hinzu (gleiche Logik wie exportAllToPDF)
    const margin = 15;
    const safetyMargin = 20;
    const imgWidth = pageWidth - 2 * margin;
    const scale_pdf = imgWidth / canvas.width;
    const imgHeight = canvas.height * scale_pdf;
    const usablePageHeight = pageHeight - 2 * margin - safetyMargin;

    if (imgHeight <= usablePageHeight) {
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      let sourceY = 0;
      let pageNum = 0;
      while (sourceY < canvas.height) {
        if (pageNum > 0) {
          pdf.addPage();
        }
        const remainingHeight = canvas.height - sourceY;
        const maxClipHeight = Math.floor(usablePageHeight / scale_pdf);
        const clipHeight = Math.min(remainingHeight, maxClipHeight);
        const displayHeight = clipHeight * scale_pdf;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = clipHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, sourceY, canvas.width, clipHeight, 0, 0, canvas.width, clipHeight);
          const tempImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(tempImgData, 'PNG', margin, margin, imgWidth, displayHeight);
        }
        sourceY += clipHeight;
        pageNum++;
      }
    }

    document.body.removeChild(iframe);

    // Speichere einzelnes PDF
    const safeName = submission.student.name.replace(/[^a-z0-9]/gi, '_');
    const fileName_pdf = `${safeName}_${fileName.replace('.html', '') || 'abgabe'}.pdf`;
    pdf.save(fileName_pdf);
  };

  const exportAllIndividually = async () => {
    try {
      setExportingIndividually(true);
      
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const loginCode = localStorage.getItem('loginCode') || '';
      const fileName = kaFilePath.split('/').pop() || kaFilePath;
      const htmlResponse = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`, {
        headers: {
          'x-login-code': loginCode
        }
      });
      
      if (!htmlResponse.ok) {
        const errorText = await htmlResponse.text();
        throw new Error(`HTML-Datei konnte nicht geladen werden: ${errorText}`);
      }
      
      const htmlText = await htmlResponse.text();
      
      // Richtige Antworten und Punkteverteilung
      const correctAnswers: Record<string, any> = {
        a1a: 'Mittelsenkrechte', a1b: 'Winkelhalbierende', a1c: 'Achsenspiegelung',
        a1d: 'Punktspiegelung', a1e: 'Verschiebung', a1f: 'Drehung',
        a1g: 'Kongruenzabbildung', a1h: 'Doppelspiegelung',
        a2a: 'b', a2b: 'a', a2c: 'a',
        'a3a_x': -6, 'a3a_y': -4, 'a3b_x': -3, 'a3b_y': -7, 'a3c_x': -4, 'a3c_y': -2,
        'a3d_x': -4, 'a3d_y': -6, 'a3e_x': -7, 'a3e_y': -3, 'a3f_x': -2, 'a3f_y': -4,
        'a3g_x': 2, 'a3g_y': 7, 'a3h_x': 5, 'a3h_y': 10, 'a3i_x': 4, 'a3i_y': 5,
        'a3j_x': 10, 'a3j_y': -6, 'a3k_x': 7, 'a3k_y': -9, 'a3l_x': 8, 'a3l_y': -4
      };

      const pointsDistribution: Record<string, number> = {
        a1a: 1, a1b: 1, a1c: 1, a1d: 1, a1e: 1, a1f: 1, a1g: 1, a1h: 1,
        a2a: 1, a2b: 1, a2c: 1,
        'a3a_x': 0.25, 'a3a_y': 0.25, 'a3b_x': 0.25, 'a3b_y': 0.25, 'a3c_x': 0.25, 'a3c_y': 0.25,
        'a3d_x': 0.25, 'a3d_y': 0.25, 'a3e_x': 0.25, 'a3e_y': 0.25, 'a3f_x': 0.25, 'a3f_y': 0.25,
        'a3g_x': 0.25, 'a3g_y': 0.25, 'a3h_x': 0.25, 'a3h_y': 0.25, 'a3i_x': 0.25, 'a3i_y': 0.25,
        'a3j_x': 0.25, 'a3j_y': 0.25, 'a3k_x': 0.25, 'a3k_y': 0.25, 'a3l_x': 0.25, 'a3l_y': 0.25
      };

      const isAnswerCorrect = (taskId: string, studentAnswer: any): boolean => {
        const correctAnswer = correctAnswers[taskId];
        if (correctAnswer === undefined) return false;
        const studentValue = String(studentAnswer || '').trim();
        const correctValue = String(correctAnswer).trim();
        if (taskId.includes('_x') || taskId.includes('_y')) {
          const studentNum = parseFloat(studentValue);
          const correctNum = parseFloat(correctValue);
          return !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
        }
        return studentValue.toLowerCase() === correctValue.toLowerCase();
      };

      const sortedSubmissions = [...submissions].sort((a, b) => 
        a.student.name.localeCompare(b.student.name)
      );

      // Erstelle für jeden Schüler ein separates PDF
      for (let i = 0; i < sortedSubmissions.length; i++) {
        await createSingleStudentPDF(
          sortedSubmissions[i],
          htmlText,
          correctAnswers,
          pointsDistribution,
          isAnswerCorrect,
          fileName
        );
      }

      alert(`✅ ${sortedSubmissions.length} PDF-Dateien erfolgreich heruntergeladen!`);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`❌ Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setExportingIndividually(false);
    }
  };

  const exportAllToWord = async () => {
    try {
      setExporting(true);
      
      // Berechne maximale Punktzahl
      const calculateMaxTotalPoints = (): number => {
        const task1Points = 8;
        const task2Points = 3;
        const task3Points = 14;
        return task1Points + task2Points + task3Points;
      };

      const maxTotalPoints = calculateMaxTotalPoints();

      // Berechne fehlende Schüler
      const submittedStudentIds = new Set(submissions.map(sub => sub.student.id));
      const missingStudentsList = learningGroupStudents.filter(
        student => !submittedStudentIds.has(student.id)
      );

      // Berechne Noten für alle Submissions
      const submissionsWithGrades = submissions.map(sub => {
        const gradeData = calculateGrade(sub.totalPoints, maxTotalPoints);
        return {
          ...sub,
          grade: gradeData.numeric,
          gradeString: gradeData.string,
          corrections: sub.corrections || []
        };
      }).sort((a, b) => a.grade - b.grade);

      // Erstelle Word-Dokument
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: 'Dreierprobe-Statistik',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            new Paragraph({
              text: kaFilePath.split('/').pop() || kaFilePath,
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),
            new Paragraph({
              text: `Gesamt: ${submissions.length} Abgabe(n)`,
              spacing: { after: 400 }
            }),
            new DocxTable({
              columnWidths: [3000, 1500, 1500, 1500],
              rows: [
                new DocxTableRow({
                  children: [
                    new DocxTableCell({
                      children: [new Paragraph({ text: 'Schüler', heading: HeadingLevel.HEADING_3 })],
                      width: { size: 30, type: WidthType.PERCENTAGE }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ text: 'Punkte', heading: HeadingLevel.HEADING_3 })],
                      width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ text: 'Note', heading: HeadingLevel.HEADING_3 })],
                      width: { size: 15, type: WidthType.PERCENTAGE }
                    }),
                    new DocxTableCell({
                      children: [new Paragraph({ text: 'Status', heading: HeadingLevel.HEADING_3 })],
                      width: { size: 15, type: WidthType.PERCENTAGE }
                    })
                  ]
                }),
                ...submissionsWithGrades.map(sub => {
                  const isCorrected = sub.status === 'corrected' || (sub.corrections && sub.corrections.length > 0);
                  return new DocxTableRow({
                    children: [
                      new DocxTableCell({
                        children: [new Paragraph(sub.student.name)]
                      }),
                      new DocxTableCell({
                        children: [new Paragraph(`${sub.totalPoints.toFixed(1)} / ${maxTotalPoints}`)]
                      }),
                      new DocxTableCell({
                        children: [new Paragraph(sub.gradeString)]
                      }),
                      new DocxTableCell({
                        children: [new Paragraph(isCorrected ? 'Korrigiert' : 'Offen')]
                      })
                    ]
                  });
                })
              ]
            }),
            ...(missingStudentsList.length > 0 ? [
              new Paragraph({
                text: `Fehlende Schüler (${missingStudentsList.length}):`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),
              ...missingStudentsList.map(student => 
                new Paragraph({
                  text: `• ${student.name}`,
                  spacing: { after: 100 }
                })
              )
            ] : [])
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `Dreierprobe_${kaFilePath.split('/').pop()?.replace('.html', '') || 'statistik'}.docx`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`❌ Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setExporting(false);
    }
  };

  const checkSentMessages = async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch('/api/messages/teacher', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        
        // Prüfe ob Nachrichten an fehlende Schüler gesendet wurden
        const submittedStudentIds = new Set(submissions.map(sub => sub.student.id));
        const missingStudentIds = learningGroupStudents
          .filter(s => !submittedStudentIds.has(s.id))
          .map(s => s.id);
        
        // Finde Nachrichten mit Betreff "Nachschreibtermin" an fehlende Schüler
        const relevantMessages = messages.filter((msg: any) => 
          msg.subject === 'Nachschreibtermin' && 
          missingStudentIds.includes(msg.studentId)
        );

        if (relevantMessages.length > 0) {
          // Extrahiere Termin aus der ersten Nachricht
          const firstMessage = relevantMessages[0];
          const content = firstMessage.content || '';
          
          // Versuche Termin zu extrahieren (z.B. "XX der x.x.x in der xx Stunde")
          const dateMatch = content.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          const hourMatch = content.match(/der (\d{1,2})\. Stunde/);
          
          if (dateMatch || hourMatch) {
            setSentMessagesInfo({
              date: dateMatch ? `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}` : '',
              hour: hourMatch ? hourMatch[1] : '',
              count: relevantMessages.length
            });
            setMessagesSent(true);
          } else {
            setSentMessagesInfo({
              date: '',
              hour: '',
              count: relevantMessages.length
            });
            setMessagesSent(true);
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Nachrichten:', error);
    }
  };

  const loadLearningGroup = async () => {
    try {
      setLoading(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Finde die Lerngruppe basierend auf dem ersten Schüler
      const firstStudentId = submissions[0]?.student?.id;
      if (!firstStudentId) {
        setLoading(false);
        return;
      }

      // Lade alle Lerngruppen des Lehrers
      const response = await fetch('/api/learning-groups', {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const groups = await response.json();
        // Finde die Gruppe, die den ersten Schüler enthält
        const group = groups.find((g: any) => 
          g.students?.some((s: any) => s.id === firstStudentId)
        );
        
        if (group && group.students) {
          setLearningGroupStudents(group.students);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Lerngruppe:', error);
    } finally {
      setLoading(false);
    }
  };

  // Berechne maximale Punktzahl (wie in KACorrectionMode)
  const calculateMaxTotalPoints = (): number => {
    // Aufgabe 1: 8 Punkte
    const task1Points = 8;
    // Aufgabe 2: 3 Punkte
    const task2Points = 3;
    // Aufgabe 3: 4 Teilaufgaben × 3.5 Punkte = 14 Punkte
    const task3Points = 14;
    return task1Points + task2Points + task3Points; // 25 Punkte
  };

  const maxTotalPoints = calculateMaxTotalPoints();

  // Berechne Noten für alle Submissions
  const submissionsWithGrades = submissions.map(sub => {
    const gradeData = calculateGrade(sub.totalPoints, maxTotalPoints);
    return {
      ...sub,
      grade: gradeData.numeric,
      gradeString: gradeData.string
    };
  }).sort((a, b) => a.grade - b.grade);

  // Beste, schlechteste und mittlere Note
  const bestSubmission = submissionsWithGrades[0];
  const worstSubmission = submissionsWithGrades[submissionsWithGrades.length - 1];
  const middleIndex = Math.floor(submissionsWithGrades.length / 2);
  const middleSubmission = submissionsWithGrades[middleIndex];

  // Notenschnitt (basierend auf Durchschnittspunkten)
  const averagePoints = submissionsWithGrades.length > 0
    ? submissionsWithGrades.reduce((sum, sub) => sum + sub.totalPoints, 0) / submissionsWithGrades.length
    : 0;
  const averageGradeData = calculateGrade(averagePoints, maxTotalPoints);

  // Notenverteilung
  const gradeDistribution: Record<string, number> = {};
  submissionsWithGrades.forEach(sub => {
    const gradeStr = sub.gradeString;
    gradeDistribution[gradeStr] = (gradeDistribution[gradeStr] || 0) + 1;
  });

  // Drittelregelung
  const totalSubmissions = submissionsWithGrades.length;
  const thirdSize = Math.ceil(totalSubmissions / 3);
  const upperThird = submissionsWithGrades.slice(0, thirdSize);
  const middleThird = submissionsWithGrades.slice(thirdSize, thirdSize * 2);
  const lowerThird = submissionsWithGrades.slice(thirdSize * 2);

  const upperThirdPercentage = totalSubmissions > 0 ? (upperThird.length / totalSubmissions) * 100 : 0;
  const middleThirdPercentage = totalSubmissions > 0 ? (middleThird.length / totalSubmissions) * 100 : 0;
  const lowerThirdPercentage = totalSubmissions > 0 ? (lowerThird.length / totalSubmissions) * 100 : 0;

  // Fehlende Schüler
  const submittedStudentIds = new Set(submissions.map(sub => sub.student.id));
  const missingStudents = learningGroupStudents.filter(
    student => !submittedStudentIds.has(student.id)
  );

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ 
        bgcolor: '#1976d2', 
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <BarChart />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Dreierprobe-Statistik
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Button
            variant="contained"
            onClick={handleReleaseAllGrades}
            size="small"
            sx={{
              minWidth: 160,
              height: 28,
              px: 1.5,
              fontSize: '0.7rem',
              fontWeight: 600,
              borderRadius: 1,
              whiteSpace: 'nowrap',
              bgcolor: gradesReleased ? '#4caf50' : '#f44336',
              color: 'white',
              boxShadow: gradesReleased 
                ? '0 1px 4px rgba(76, 175, 80, 0.3)' 
                : '0 1px 4px rgba(244, 67, 54, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: gradesReleased ? '#45a049' : '#da190b',
                boxShadow: gradesReleased 
                  ? '0 2px 6px rgba(76, 175, 80, 0.4)' 
                  : '0 2px 6px rgba(244, 67, 54, 0.4)',
                transform: 'translateY(-1px)'
              },
              '&:active': {
                transform: 'translateY(0px)'
              }
            }}
          >
            Alle Noten freigeben
          </Button>
          {missingStudents.length > 0 && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Email sx={{ fontSize: 16 }} />}
                onClick={() => setEmailTab(1)}
                sx={{ 
                  height: 28,
                  minWidth: 180,
                  px: 2,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 1,
                  whiteSpace: 'nowrap',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: '#fff',
                  borderWidth: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    borderColor: '#fff',
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)'
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: 0.5,
                    marginLeft: 0
                  }
                }}
              >
                Fehlende Schüler anschreiben
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Print sx={{ fontSize: 16 }} />}
                onClick={exportAllToPDF}
                disabled={exporting}
                sx={{ 
                  height: 28,
                  minWidth: 140,
                  px: 1.5,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 1,
                  whiteSpace: 'nowrap',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: '#fff',
                  borderWidth: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    borderColor: '#fff',
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.4)'
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: 0.5,
                    marginLeft: 0
                  }
                }}
              >
                {exporting ? 'Exportiert...' : 'Alle ausdrucken'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Print sx={{ fontSize: 16 }} />}
                onClick={exportAllIndividually}
                disabled={exportingIndividually}
                sx={{ 
                  height: 28,
                  minWidth: 180,
                  px: 1.5,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 1,
                  whiteSpace: 'nowrap',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: '#fff',
                  borderWidth: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    borderColor: '#fff',
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateY(-1px)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)'
                  },
                  '&.Mui-disabled': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.4)'
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: 0.5,
                    marginLeft: 0
                  }
                }}
              >
                {exportingIndividually ? 'Exportiert...' : 'Alle einzeln herunterladen'}
              </Button>
            </>
          )}
        <IconButton
          onClick={onClose}
          sx={{ 
            color: '#fff', 
            p: 0,
            minWidth: 32,
            width: 32,
            height: 32,
              ml: 0.5,
            '& .MuiSvgIcon-root': {
              fontSize: 20
              },
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          <Close sx={{ width: '100%', height: '100%' }} />
        </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, bgcolor: '#f5f7fa' }}>
        {/* Tabs - nur anzeigen wenn fehlende Schüler vorhanden */}
        {missingStudents.length > 0 && (
          <Tabs value={emailTab} onChange={(_, v) => setEmailTab(v)} sx={{ mb: 2 }}>
            <Tab label="Statistik" />
            <Tab label="Fehlende anschreiben" />
          </Tabs>
        )}
        
        {emailTab === 0 && (
          <>
            {/* Kompakte Liste für beste/schlechteste/mittlere Note */}
            <Box sx={{ mb: 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0', p: 1 }}>
              <Box display="flex" flexDirection="column" gap={0.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    🥇 Beste:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {bestSubmission?.gradeString || '-'} ({bestSubmission?.student.name || '-'})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    📊 Mittlere:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {middleSubmission?.gradeString || '-'} ({middleSubmission?.student.name || '-'})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    🥉 Schlechteste:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {worstSubmission?.gradeString || '-'} ({worstSubmission?.student.name || '-'})
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, fontSize: '0.7rem', minWidth: 80 }}>
                    ⌀ Schnitt:
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#1976d2' }}>
                    {averageGradeData.string} ({submissions.length}/{learningGroupStudents.length || submissions.length})
                  </Typography>
                </Box>
              </Box>
            </Box>

        {/* Kompakte Tabellen */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Notenverteilung
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 600, py: 0.5, fontSize: '0.75rem' }}>Note</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, py: 0.5, fontSize: '0.75rem' }}>Anzahl</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, py: 0.5, fontSize: '0.75rem' }}>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(gradeDistribution)
                        .sort(([a], [b]) => {
                          const numA = parseFloat(a.replace(/[+-]/g, ''));
                          const numB = parseFloat(b.replace(/[+-]/g, ''));
                          if (numA !== numB) return numA - numB;
                          const orderA = a.endsWith('+') ? 0 : (a.endsWith('-') ? 2 : 1);
                          const orderB = b.endsWith('+') ? 0 : (b.endsWith('-') ? 2 : 1);
                          return orderA - orderB;
                        })
                        .map(([grade, count]) => (
                          <TableRow key={grade}>
                            <TableCell sx={{ py: 0.5, fontSize: '0.8rem' }}>{grade}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem' }}>{count}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5, fontSize: '0.8rem' }}>
                              {((count / totalSubmissions) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Drittelregelung
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                      Oberes: {upperThird.length} ({upperThirdPercentage.toFixed(1)}%)
                    </Typography>
                    {upperThird.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: '0.7rem' }}>
                        {upperThird[upperThird.length - 1]?.gradeString} - {upperThird[0]?.gradeString}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#1976d2' }}>
                      Mitte: {middleThird.length} ({middleThirdPercentage.toFixed(1)}%)
                    </Typography>
                    {middleThird.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: '0.7rem' }}>
                        {middleThird[middleThird.length - 1]?.gradeString} - {middleThird[0]?.gradeString}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#c62828' }}>
                      Unteres: {lowerThird.length} ({lowerThirdPercentage.toFixed(1)}%)
                    </Typography>
                    {lowerThird.length > 0 && (
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', fontSize: '0.7rem' }}>
                        {lowerThird[lowerThird.length - 1]?.gradeString} - {lowerThird[0]?.gradeString}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Fehlende Schüler */}
        {missingStudents.length > 0 && (
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonOff sx={{ color: '#f57c00', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Fehlende Schüler ({missingStudents.length})
                  </Typography>
                </Box>
                  {messagesSent && sentMessagesInfo && (
                    <Chip
                      label={`✅ ${sentMessagesInfo.count} gesendet${sentMessagesInfo.date && sentMessagesInfo.hour ? ` • ${sentMessagesInfo.date}, ${sentMessagesInfo.hour}. Stunde` : ''}`}
                      size="small"
                      sx={{
                        bgcolor: '#e8f5e9',
                        color: '#2e7d32',
                        fontSize: '0.7rem',
                        height: 24
                      }}
                    />
                  )}
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {missingStudents.map(student => (
                  <Chip
                    key={student.id}
                    label={student.name}
                    size="small"
                    sx={{
                      bgcolor: '#fff3e0',
                      color: '#f57c00',
                      fontWeight: 500,
                      fontSize: '0.75rem'
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

            {missingStudents.length === 0 && learningGroupStudents.length > 0 && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ Alle Schüler haben abgegeben
              </Alert>
            )}
            {messagesSent && missingStudents.length === 0 && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ Alle Nachschreiber wurden erfolgreich angeschrieben
              </Alert>
            )}
          </>
        )}

        {/* Email-Editor Tab */}
        {emailTab === 1 && missingStudents.length > 0 && (
          <Box>
              <Card variant="outlined">
                <CardContent>
                  {/* Status-Anzeige */}
                  {messagesSent && sentMessagesInfo && (
                    <Alert severity="info" sx={{ mb: 1.5, fontSize: '0.8rem' }}>
                      ✅ Bereits {sentMessagesInfo.count} Nachricht(en) gesendet
                      {sentMessagesInfo.date && sentMessagesInfo.hour && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                          Termin: {sentMessagesInfo.date} in der {sentMessagesInfo.hour}. Stunde
                        </Typography>
                      )}
                    </Alert>
                  )}
                  
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    E-Mail-Vorlage (anpassbar)
                  </Typography>
                  
                  {/* Termin-Eingabe */}
                  <Grid container spacing={1} sx={{ mb: 1.5 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="Datum (z.B. 15.01.2025)"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        placeholder="DD.MM.YYYY"
                        size="small"
                        fullWidth
                        sx={{ fontSize: '0.8rem' }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Stunde"
                        value={appointmentHour}
                        onChange={(e) => setAppointmentHour(e.target.value)}
                        placeholder="z.B. 3"
                        type="number"
                        size="small"
                        fullWidth
                        inputProps={{ min: 1, max: 10 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <TextField
                    multiline
                    rows={6}
                    fullWidth
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value)}
                    placeholder="E-Mail-Vorlage..."
                    size="small"
                    sx={{ mb: 1.5, fontSize: '0.8rem' }}
                  />
                  <Box sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75, fontSize: '0.7rem' }}>
                      Vorschau (erste 3):
                    </Typography>
                    {missingStudents.slice(0, 3).map((student, idx) => {
                      const firstName = getFirstName(student.name);
                      const term = appointmentDate && appointmentHour 
                        ? `${appointmentDate} in der ${appointmentHour}. Stunde`
                        : '[TERMIN]';
                      let preview = emailTemplate.replace(/XYZ/g, firstName);
                      preview = preview.replace(/\[TERMIN\]/g, term);
                      return (
                        <Box key={student.id} sx={{ mb: 1, p: 1, bgcolor: '#fff', borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                            An: {firstName}
                          </Typography>
                          <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.7rem' }}>
                            {preview}
                          </Typography>
                        </Box>
                      );
                    })}
                    {missingStudents.length > 3 && (
                      <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic', fontSize: '0.7rem' }}>
                        ... und {missingStudents.length - 3} weitere
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={async () => {
                      try {
                        if (!appointmentDate || !appointmentHour) {
                          alert('Bitte geben Sie Datum und Stunde für den Termin ein.');
                          return;
                        }
                        
                        const loginCode = localStorage.getItem('loginCode') || '';
                        const term = `${appointmentDate} in der ${appointmentHour}. Stunde`;
                        const messages = missingStudents.map(student => {
                          const firstName = getFirstName(student.name);
                          let content = emailTemplate.replace(/XYZ/g, firstName);
                          content = content.replace(/\[TERMIN\]/g, term);
                          return {
                            studentId: student.id,
                            subject: 'Nachschreibtermin',
                            content: content
                          };
                        });

                        const response = await fetch('/api/messages/send-bulk', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-login-code': loginCode
                          },
                          body: JSON.stringify({ messages })
                        });

                        if (response.ok) {
                          const data = await response.json();
                          setMessagesSent(true);
                          setSentMessagesInfo({
                            date: appointmentDate,
                            hour: appointmentHour,
                            count: data.count || missingStudents.length
                          });
                          // Zeige Bestätigung und wechsle zurück zur Statistik
                          setEmailTab(0);
                        } else {
                          const errorText = await response.text();
                          let errorMessage = 'Unbekannter Fehler';
                          try {
                            const error = JSON.parse(errorText);
                            errorMessage = error.error || errorMessage;
                          } catch {
                            errorMessage = errorText || errorMessage;
                          }
                          console.error('Fehler beim Senden:', errorMessage);
                          alert(`❌ Fehler: ${errorMessage}`);
                        }
                      } catch (error) {
                        console.error('Fehler beim Senden:', error);
                        alert(`❌ Fehler beim Senden der Nachrichten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
                      }
                    }}
                    sx={{ bgcolor: '#1976d2' }}
                  >
                    📧 Alle {missingStudents.length} Schüler anschreiben
                  </Button>
                </CardContent>
              </Card>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DreierprobeModal;

