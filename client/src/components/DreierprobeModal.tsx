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
import JSZip from 'jszip';

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

// Notenberechnung (wie in gradeConverter.ts - korrekte Tendenzen)
const calculateGrade = (achieved: number, total: number): { numeric: number; string: string } => {
  if (total === 0) return { numeric: 0, string: '-' };
  
  const percentage = (achieved / total) * 100;
  let grade: number;
  let gradeString: string;
  
  // Verwende die gleiche Logik wie percentageToGrade in gradeConverter.ts
  if (percentage >= 95.0) {
    grade = 1.0;
      gradeString = '1+';
  } else if (percentage >= 90.0) {
    grade = 1.3;
      gradeString = '1-';
  } else if (percentage >= 85.0) {
    grade = 1.7;
      gradeString = '2+';
  } else if (percentage >= 80.0) {
    grade = 2.0;
      gradeString = '2';
  } else if (percentage >= 75.0) {
    grade = 2.3;
    gradeString = '2-';
  } else if (percentage >= 70.0) {
    grade = 2.7;
      gradeString = '3+';
  } else if (percentage >= 65.0) {
    grade = 3.0;
      gradeString = '3';
  } else if (percentage >= 60.0) {
    grade = 3.3;
    gradeString = '3-';
  } else if (percentage >= 55.0) {
    grade = 3.7;
      gradeString = '4+';
  } else if (percentage >= 50.0) {
    grade = 4.0;
      gradeString = '4';
  } else if (percentage >= 45.0) {
    grade = 4.3;
    gradeString = '4-';
  } else if (percentage >= 40.0) {
    grade = 4.7;
      gradeString = '5+';
  } else if (percentage >= 35.0) {
    grade = 5.0;
    gradeString = '5';
  } else if (percentage >= 20.0) {
    grade = 5.3;
      gradeString = '5-';
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
  const [learningGroupId, setLearningGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailTab, setEmailTab] = useState(0);
  const [messagesSent, setMessagesSent] = useState(false);
  const [sentMessagesInfo, setSentMessagesInfo] = useState<{ date: string; hour: string; count: number } | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentHour, setAppointmentHour] = useState('');
  const [gradesReleased, setGradesReleased] = useState(false);
  const [exportingHTML, setExportingHTML] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [gradingSchemas, setGradingSchemas] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Array<{schemaId: string; schemaName: string; categoryName: string}>>([]);
  const [selectedCategory, setSelectedCategory] = useState<{schemaId: string; schemaName: string; categoryName: string} | null>(null);
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

  // Lade GradingSchemas und extrahiere Kategorien
  const loadGradingSchemas = async () => {
    if (!learningGroupId) return;
    
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch(`/api/grading-schemas/${learningGroupId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (response.ok) {
        const schemas = await response.json();
        setGradingSchemas(schemas);
        
        // Extrahiere alle Kategorien aus den Schemas
        const categories: Array<{schemaId: string; schemaName: string; categoryName: string}> = [];
        
        schemas.forEach((schema: any) => {
          try {
            const structure = schema.structure;
            // Prüfe ob JSON-Format
            let parsed: any;
            if (structure.trim().startsWith('{')) {
              parsed = JSON.parse(structure);
            } else {
              // Text-Format: Parse die Struktur zu einem Baum
              const lines = structure.split('\n').filter((line: string) => line.trim());
              if (lines.length === 0) return;
              
              // Erstelle einen Baum aus der Text-Struktur
              const root: any = { name: lines[0].trim(), children: [] };
              const stack: Array<{ node: any; indent: number }> = [{ node: root, indent: -1 }];
              
              for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                const indent = line.search(/\S/);
                // Verschiedene Formate unterstützen
                let match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
                if (!match) {
                  match = line.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)%?$/);
                }
                if (!match) {
                  match = line.trim().match(/^(.+?)\s*(\d+(?:\.\d+)?)%$/);
                }
                
                if (!match) continue;
                
                const [, name] = match;
                const node: any = {
                  name: name.trim(),
                  children: []
                };
                
                // Finde den richtigen Parent basierend auf Einrückung
                while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                  stack.pop();
                }
                
                const parent = stack[stack.length - 1].node;
                parent.children.push(node);
                stack.push({ node, indent });
              }
              
              parsed = root;
            }
            
            // JSON-Format: Rekursiv alle Blattknoten finden
            const extractLeafNodes = (node: any, path: string[] = []): void => {
              if (!node.children || node.children.length === 0) {
                // Blattknoten gefunden
                categories.push({
                  schemaId: schema.id,
                  schemaName: schema.name,
                  categoryName: node.name || path.join(' > ')
                });
              } else {
                node.children.forEach((child: any) => {
                  extractLeafNodes(child, [...path, node.name]);
                });
              }
            };
            
            extractLeafNodes(parsed);
          } catch (error) {
            console.error('Fehler beim Parsen des Schemas:', error);
          }
        });
        
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('Fehler beim Laden der GradingSchemas:', error);
    }
  };

  const handleReleaseAllGrades = async () => {
    // Lade zuerst die GradingSchemas und zeige dann den Dialog
    await loadGradingSchemas();
    setOpenCategoryDialog(true);
  };

  const handleConfirmReleaseGrades = async () => {
    if (!selectedCategory) {
      alert('Bitte wählen Sie eine Kategorie aus');
      return;
    }

    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      
      // Prüfe ob Submissions vorhanden sind
      if (!submissions || submissions.length === 0) {
        alert('❌ Keine Abgaben vorhanden. Bitte laden Sie die Abgaben erneut.');
        return;
      }
      
      console.log('📊 Speichere Noten für', submissions.length, 'Abgaben');
      console.log('📋 Kategorie:', selectedCategory.categoryName);
      console.log('📋 Schema ID:', selectedCategory.schemaId);
      
      // Finde die Gewichtung aus dem Schema
      const schema = gradingSchemas.find(s => s.id === selectedCategory.schemaId);
      let weight = 1.0; // Standard-Gewichtung
      
      if (schema) {
        try {
          const structure = schema.structure;
          const lines = structure.split('\n').filter((line: string) => line.trim());
          
          // Suche nach der Kategorie im Schema
          for (const line of lines) {
            const match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
            if (match) {
              const [, name] = match;
              const weightStr = match[2];
              if (name.trim() === selectedCategory.categoryName) {
                weight = parseFloat(weightStr);
                console.log('✅ Gewichtung gefunden:', weight, '% für', selectedCategory.categoryName);
                break;
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Fehler beim Extrahieren der Gewichtung, verwende Standard:', error);
        }
      }
      
      // Berechne Noten für alle Schüler
      const maxTotalPoints = calculateMaxTotalPoints();
      const gradesToSave: Array<{studentId: string; grade: number; weight: number}> = [];
      
      submissions.forEach(submission => {
        const totalPoints = submission.totalPoints || 0;
        const gradeResult = calculateGrade(totalPoints, maxTotalPoints);
        console.log(`📝 Schüler: ${submission.student.name}, Punkte: ${totalPoints}/${maxTotalPoints}, Note: ${gradeResult.numeric}`);
        gradesToSave.push({
          studentId: submission.student.id,
          grade: gradeResult.numeric,
          weight: weight
        });
      });
      
      console.log('💾 Speichere', gradesToSave.length, 'Noten...');
      console.log('📤 Request Body:', JSON.stringify({
        schemaId: selectedCategory.schemaId,
        categoryName: selectedCategory.categoryName,
        grades: gradesToSave
      }, null, 2));

      // Speichere Noten für alle Schüler
      const saveResponse = await fetch('/api/grades/save-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({
          schemaId: selectedCategory.schemaId,
          categoryName: selectedCategory.categoryName,
          grades: gradesToSave
        })
      });

      console.log('📥 Response Status:', saveResponse.status, saveResponse.statusText);

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('❌ Fehler beim Speichern:', errorText);
        throw new Error(errorText || 'Fehler beim Speichern der Noten');
      }
      
      const saveResult = await saveResponse.json();
      console.log('✅ Noten gespeichert:', saveResult);

      // Freigabe der Noten für alle Schüler
      const releaseResponse = await fetch('/api/grades/release-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify({
          schemaId: selectedCategory.schemaId,
          studentIds: submissions.map(s => s.student.id)
        })
      });

      if (!releaseResponse.ok) {
        const errorText = await releaseResponse.text();
        throw new Error(errorText || 'Fehler beim Freigeben der Noten');
      }

      setGradesReleased(true);
      setOpenCategoryDialog(false);
      setSelectedCategory(null);
      alert(`✅ Noten wurden erfolgreich in "${selectedCategory.categoryName}" gespeichert und freigegeben!`);
    } catch (error) {
      console.error('Fehler beim Speichern/Freigeben der Noten:', error);
      alert(`❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
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

  // PDF-Funktionen entfernt - nur noch HTML-Download verfügbar
  // Alle PDF-Funktionen (exportAllToPDF, createSolutionPDF, createSingleStudentPDF, createSingleStudentPDFAsBlob, exportAllIndividually) wurden entfernt

  // PDF-Funktionen entfernt - nur noch HTML-Download verfügbar
  // Alle PDF-Funktionen (createSolutionPDF, createSingleStudentPDF, createSingleStudentPDFAsBlob, exportAllToPDF) wurden entfernt

  // PDF-Funktionen entfernt - nur noch HTML-Download verfügbar
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
      background-color: transparent;
      border: 3px solid #1976d2;
      color: #1976d2;
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
    nameDiv.style.cssText = 'font-size: 1.1em; font-weight: bold;';
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
        <div style="font-size: 3em; font-weight: bold;">${gradeData.string}</div>
      </div>
    `;
    combinedHeader.appendChild(leftSection);
    combinedHeader.appendChild(rightSection);
    headerContainer.appendChild(combinedHeader);
    if (doc.body) {
      doc.body.insertBefore(headerContainer, doc.body.firstChild);
    }

    // Füge CSS hinzu
    const style = doc.createElement('style');
    style.textContent = `
      html, body {
        border: none !important;
        outline: none !important;
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
      }
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

    // Fülle alle Input-Felder mit den Antworten und markiere sie (vollständige Logik)
    Object.entries(answers).forEach(([taskId, answer]) => {
      let input = doc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!input) {
        input = doc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      }
      if (!input) {
        input = doc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      }
      
      if (input) {
        const isCorrect = isAnswerCorrect(taskId, answer);
        const maxPoints = pointsDistribution[taskId] || 0;
        let achievedPoints = isCorrect ? maxPoints : 0;
        
        // Für Aufgabe 3: Berücksichtige manuelle Korrekturen
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
        
        input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
        
        // Erstelle Container für Input und Badge
        const container = doc.createElement('span');
        container.style.display = 'inline-flex';
        container.style.alignItems = 'center';
        container.style.gap = '5px';
        container.style.position = 'relative';
        container.style.verticalAlign = 'middle';
        container.style.marginLeft = '5px';
        
        if (input.parentElement && !input.parentElement.classList.contains('answer-container')) {
          const parent = input.parentElement;
          parent.insertBefore(container, input);
          container.appendChild(input);
          container.classList.add('answer-container');
          
          const pointsBadge = doc.createElement('span');
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
    });

    // Füge Korrekturen DIREKT in doc ein, BEVOR es ins iframe geschrieben wird
    if (submission.corrections && submission.corrections.length > 0) {
      const task3SubtaskCorrections: Array<{taskNumber: string; manualPoints?: number}> = [];
      let task3Comment: string | null = null;
      
      submission.corrections.forEach((corr) => {
        if (corr.taskNumber.match(/^3[a-d]$/)) {
          task3SubtaskCorrections.push({
            taskNumber: corr.taskNumber,
            manualPoints: corr.manualPoints
          });
          if (corr.comment && !task3Comment) {
            task3Comment = corr.comment;
          }
        }
      });
      
      // Füge Konstruktionspunkte für jede Teilaufgabe hinzu
      task3SubtaskCorrections.forEach((corr) => {
        const taskNumber = corr.taskNumber;
        const subtaskLetter = taskNumber[1];
        const allInputs = Array.from(doc.querySelectorAll('input, textarea, select'));
        const taskInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith(`a3${subtaskLetter}`);
        });
        
        if (taskInputs.length > 0 && (corr.manualPoints !== undefined && corr.manualPoints !== null)) {
          taskInputs.sort((a, b) => {
            const posA = Array.from(doc.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(doc.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = taskInputs[0];
          
          if (lastInput) {
            const constructionDiv = doc.createElement('div');
            constructionDiv.setAttribute('data-correction', 'construction-points');
            constructionDiv.style.cssText = 'margin-top: 8px; margin-bottom: 12px; padding: 8px 12px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em; display: block; width: 100%;';
            constructionDiv.innerHTML = `<strong>Konstruktionspunkte:</strong> ${corr.manualPoints} / 2`;
            
            let parent = lastInput.parentElement;
            if (!parent) {
              parent = doc.createElement('div');
              lastInput.parentNode?.insertBefore(parent, lastInput);
              parent.appendChild(lastInput);
            }
            
            let insertAfter = lastInput;
            let nextSibling = lastInput.nextElementSibling;
            while (nextSibling) {
              const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
              if (nextTaskId.startsWith(`a3${subtaskLetter}`)) {
                insertAfter = nextSibling as Element;
                nextSibling = nextSibling.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (insertAfter.nextSibling) {
              parent.insertBefore(constructionDiv, insertAfter.nextSibling);
            } else {
              parent.appendChild(constructionDiv);
            }
          }
        }
      });
      
      // Füge Kommentar am Ende von Aufgabe 3 hinzu
      if (task3Comment) {
        const allInputs = Array.from(doc.querySelectorAll('input, textarea, select'));
        const task3dInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith('a3d');
        });
        
        if (task3dInputs.length > 0) {
          task3dInputs.sort((a, b) => {
            const posA = Array.from(doc.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(doc.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = task3dInputs[0];
          
          if (lastInput) {
            const commentDiv = doc.createElement('div');
            commentDiv.setAttribute('data-correction', 'task3-comment');
            commentDiv.style.cssText = 'margin-top: 16px; margin-bottom: 16px; padding: 12px 16px; background-color: #c8e6c9; border: 2px solid #4caf50; border-left: 5px solid #4caf50; border-radius: 6px; font-size: 0.95em; line-height: 1.6; display: block; width: 100%;';
            commentDiv.innerHTML = `
              <div style="font-weight: bold; font-size: 1.05em; color: #2e7d32; margin-bottom: 8px; border-bottom: 1px solid #81c784; padding-bottom: 4px;">Aufgabe 3 - Kommentar</div>
              <div style="color: #1b5e20; white-space: pre-wrap;">${task3Comment}</div>
            `;
            
            let parent = lastInput.parentElement;
            if (!parent) {
              parent = doc.createElement('div');
              lastInput.parentNode?.insertBefore(parent, lastInput);
              parent.appendChild(lastInput);
            }
            
            let insertAfter = lastInput;
            let nextSibling = lastInput.nextElementSibling;
            while (nextSibling) {
              const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
              if (nextTaskId.startsWith('a3')) {
                insertAfter = nextSibling as Element;
                nextSibling = nextSibling.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (insertAfter.nextSibling) {
              parent.insertBefore(commentDiv, insertAfter.nextSibling);
            } else {
              parent.appendChild(commentDiv);
            }
          }
        }
      }
    }

    // Setze HTML in iframe
    iframeDoc.open();
    iframeDoc.write(doc.documentElement.outerHTML);
    iframeDoc.close();

    await new Promise(resolve => setTimeout(resolve, 500));

    const body = iframeDoc.body;
    if (!body) {
      throw new Error('Iframe body nicht gefunden');
    }

    // Wende alle Änderungen im iframe an (vollständige Logik wie exportAllToPDF)
    body.innerHTML = body.innerHTML.replace(/Frau Christ/g, studentName);
    
    // Aktualisiere den kombinierten Header im iframe
    const iframeHeader = body.querySelector('[style*="border: 3px solid #1976d2"], [style*="background-color: #1976d2"]') as HTMLElement;
    if (iframeHeader) {
      const headerText = iframeHeader.textContent || '';
      if (headerText.includes('Abgabe vom') || headerText.includes(submission.student.name)) {
        iframeHeader.style.display = 'flex';
        iframeHeader.style.justifyContent = 'space-between';
        iframeHeader.style.alignItems = 'center';
        iframeHeader.style.flexWrap = 'wrap';
        iframeHeader.style.gap = '15px';
        iframeHeader.style.backgroundColor = 'transparent';
        iframeHeader.style.border = '3px solid #1976d2';
        iframeHeader.style.color = '#1976d2';
        
        const leftSection = iframeDoc.createElement('div');
        leftSection.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
        const nameDiv = iframeDoc.createElement('div');
        nameDiv.style.cssText = 'font-size: 1.1em; font-weight: bold;';
        nameDiv.textContent = studentName;
        const dateDiv = iframeDoc.createElement('div');
        dateDiv.style.cssText = 'font-size: 0.75em; font-weight: normal; opacity: 0.95;';
        dateDiv.textContent = `Abgabe vom ${new Date(submission.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(submission.submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
        leftSection.appendChild(nameDiv);
        leftSection.appendChild(dateDiv);
        
        const rightSection = iframeDoc.createElement('div');
        rightSection.style.cssText = 'display: flex; gap: 20px; align-items: center;';
        rightSection.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 0.75em; opacity: 0.9; margin-bottom: 2px;">Punkte</div>
            <div style="font-size: 1.2em; font-weight: bold;">${totalAchieved.toFixed(1)} / ${maxTotalPoints}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.75em; opacity: 0.9; margin-bottom: 2px;">Note</div>
            <div style="font-size: 3em; font-weight: bold;">${gradeData.string}</div>
          </div>
        `;
        
        iframeHeader.innerHTML = '';
        iframeHeader.appendChild(leftSection);
        iframeHeader.appendChild(rightSection);
      }
    }
    
    // Entferne Abgabebutton im iframe
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
    
    // Füge Antworten in iframe ein und markiere sie
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
        
        input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
        
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
    
    // Trenne Korrekturen für Aufgabe 3 (Teilaufgaben und Kommentar) - iframe Version
    const task3SubtaskCorrectionsIframe: Array<{taskNumber: string; manualPoints?: number}> = [];
    let task3CommentIframe: string | null = null;
    const otherTaskCorrectionsIframe: Array<{taskNumber: string; manualPoints?: number; comment?: string}> = [];
    
    if (submission.corrections && submission.corrections.length > 0) {
      submission.corrections.forEach((corr) => {
        if (corr.taskNumber.match(/^3[a-d]$/)) {
          task3SubtaskCorrectionsIframe.push({
            taskNumber: corr.taskNumber,
            manualPoints: corr.manualPoints
          });
          if (corr.comment && !task3CommentIframe) {
            task3CommentIframe = corr.comment;
          }
        } else {
          otherTaskCorrectionsIframe.push({
            taskNumber: corr.taskNumber,
            manualPoints: corr.manualPoints,
            comment: corr.comment
          });
        }
      });
    }
    
    // Füge Konstruktionspunkte am Ende jeder Teilaufgabe 3a, 3b, 3c, 3d ein - iframe
    task3SubtaskCorrectionsIframe.forEach((corr) => {
        const taskNumber = corr.taskNumber;
      const subtaskLetter = taskNumber[1];
        
        const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
        let inputsInSubtask: Element[] = [];
        
        allInputs.forEach((input) => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
            if (taskId.startsWith(`a3${subtaskLetter}`)) {
              inputsInSubtask.push(input);
          }
        });
        
        let lastInputInSubtask: Element | null = null;
        if (inputsInSubtask.length > 0) {
          inputsInSubtask.sort((a, b) => {
            const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
          return posB - posA;
          });
          lastInputInSubtask = inputsInSubtask[0];
        }
        
      if (lastInputInSubtask && (corr.manualPoints !== undefined && corr.manualPoints !== null)) {
        const constructionPointsDiv = iframeDoc.createElement('div');
        constructionPointsDiv.style.cssText = `
          margin-top: 8px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9em;
          display: block;
          width: 100%;
        `;
        constructionPointsDiv.innerHTML = `<strong>Konstruktionspunkte:</strong> ${corr.manualPoints} / 2`;
        
        if (lastInputInSubtask.parentElement) {
          const parent = lastInputInSubtask.parentElement;
          // Finde das nächste Element, das NICHT zu dieser Teilaufgabe gehört
          let insertAfter = lastInputInSubtask;
          let nextSibling = lastInputInSubtask.nextElementSibling;
          while (nextSibling) {
            const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
            if (nextTaskId.startsWith(`a3${subtaskLetter}`)) {
              insertAfter = nextSibling;
              nextSibling = nextSibling.nextElementSibling;
            } else {
              break;
            }
          }
          
          // Füge nach dem letzten Element dieser Teilaufgabe ein
          if (insertAfter.nextSibling) {
            parent.insertBefore(constructionPointsDiv, insertAfter.nextSibling);
          } else {
            parent.appendChild(constructionPointsDiv);
          }
              }
            }
          });
    
    // Füge Kommentar am Ende der gesamten Aufgabe 3 ein - iframe
    if (task3CommentIframe) {
      const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
      let lastTask3Input: Element | null = null;
      
      const task3dInputs = allInputs.filter(input => {
        const taskId = input.id || (input as HTMLInputElement).name || '';
        return taskId.startsWith('a3d');
      });
      
      if (task3dInputs.length > 0) {
        task3dInputs.sort((a, b) => {
          const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
          const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
          return posB - posA;
        });
        lastTask3Input = task3dInputs[0];
      }
      
      if (lastTask3Input) {
        const commentDiv = iframeDoc.createElement('div');
        commentDiv.style.cssText = `
          margin-top: 16px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background-color: #c8e6c9;
          border: 2px solid #4caf50;
          border-left: 5px solid #4caf50;
          border-radius: 6px;
          font-size: 0.95em;
          line-height: 1.6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: block;
          width: 100%;
        `;
        commentDiv.innerHTML = `
          <div style="font-weight: bold; font-size: 1.05em; color: #2e7d32; margin-bottom: 8px; border-bottom: 1px solid #81c784; padding-bottom: 4px;">Aufgabe 3 - Kommentar</div>
          <div style="color: #1b5e20; white-space: pre-wrap;">${task3CommentIframe}</div>
        `;
        
        if (lastTask3Input.parentElement) {
          const parent = lastTask3Input.parentElement;
          // Finde das letzte Element von Aufgabe 3
          let insertAfter = lastTask3Input;
          let nextSibling = lastTask3Input.nextElementSibling;
          while (nextSibling) {
            const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
            if (nextTaskId.startsWith('a3')) {
              insertAfter = nextSibling;
              nextSibling = nextSibling.nextElementSibling;
        } else {
              break;
            }
          }
          
          // Füge nach dem letzten Element von Aufgabe 3 ein
          if (insertAfter.nextSibling) {
            parent.insertBefore(commentDiv, insertAfter.nextSibling);
          } else {
            parent.appendChild(commentDiv);
          }
        }
      }
    }
    
    // Füge Korrekturen für andere Aufgaben (1, 2) ein - iframe
    otherTaskCorrectionsIframe.forEach((corr) => {
      const taskNumber = corr.taskNumber;
      
      const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
      let inputsInTask: Element[] = [];
      
      allInputs.forEach((input) => {
        const taskId = input.id || (input as HTMLInputElement).name || '';
        if (taskNumber === '1' && taskId.startsWith('a1')) {
          inputsInTask.push(input);
        } else if (taskNumber === '2' && taskId.startsWith('a2')) {
          inputsInTask.push(input);
        }
      });
      
      let lastInputInTask: Element | null = null;
      if (inputsInTask.length > 0) {
        inputsInTask.sort((a, b) => {
          const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
          const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
          return posB - posA;
        });
        lastInputInTask = inputsInTask[0];
      }
      
      let automaticPoints = 0;
          Object.entries(answers).forEach(([taskId, answer]) => {
            const taskNum = taskId.match(/a(\d+)/)?.[1];
            if (taskNum === taskNumber) {
              const isCorrect = isAnswerCorrect(taskId, answer);
              const maxPoints = pointsDistribution[taskId] || 0;
              if (isCorrect) {
                automaticPoints += maxPoints;
              }
            }
          });
        
        const correctionDiv = iframeDoc.createElement('div');
        correctionDiv.style.cssText = `
        margin-top: 12px;
        margin-bottom: 12px;
        padding: 12px 16px;
        background-color: #e3f2fd;
        border: 2px solid #1976d2;
        border-left: 5px solid #1976d2;
        border-radius: 6px;
        font-size: 0.95em;
        line-height: 1.6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      
      let correctionText = `<div style="font-weight: bold; font-size: 1.05em; color: #1976d2; margin-bottom: 8px; border-bottom: 1px solid #90caf9; padding-bottom: 4px;">Aufgabe ${taskNumber} - Korrektur</div>`;
      correctionText += '<div style="margin-bottom: 6px;">';
          if (automaticPoints > 0) {
        correctionText += `<span style="display: inline-block; margin-right: 15px;"><strong>Automatische Punkte:</strong> <span style="color: #2e7d32; font-weight: bold;">${automaticPoints.toFixed(2)}</span></span>`;
          }
          if (corr.manualPoints !== undefined && corr.manualPoints !== null) {
        correctionText += `<span style="display: inline-block;"><strong>Manuelle Punkte:</strong> <span style="color: #1976d2; font-weight: bold;">${corr.manualPoints}</span></span>`;
      }
      correctionText += '</div>';
      
        if (corr.comment) {
        correctionText += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #90caf9;"><strong style="color: #1976d2;">Kommentar:</strong><br><span style="color: #333; white-space: pre-wrap;">${corr.comment}</span></div>`;
        }
        
          correctionDiv.innerHTML = correctionText;
          
      if (lastInputInTask && lastInputInTask.parentElement) {
        const parent = lastInputInTask.parentElement;
        let nextSibling = lastInputInTask.nextElementSibling;
              while (nextSibling && (nextSibling.tagName === 'INPUT' || nextSibling.tagName === 'TEXTAREA' || nextSibling.tagName === 'SELECT' || nextSibling.tagName === 'LABEL')) {
                const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
          if ((taskNumber === '1' && nextTaskId.startsWith('a1')) || (taskNumber === '2' && nextTaskId.startsWith('a2'))) {
                    nextSibling = nextSibling.nextElementSibling;
                } else {
                  break;
                }
              }
              
              if (nextSibling) {
                parent.insertBefore(correctionDiv, nextSibling);
              } else {
          parent.insertBefore(correctionDiv, lastInputInTask.nextSibling);
          }
        }
      });
    
    // Füge CSS für farbliche Markierung im iframe hinzu
    const iframeStyle = iframeDoc.createElement('style');
    iframeStyle.textContent = `
      html, body {
        border: none !important;
        outline: none !important;
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
      }
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
    if (!iframeDoc.head.querySelector('style[data-export-style]')) {
      iframeStyle.setAttribute('data-export-style', 'true');
      iframeDoc.head.appendChild(iframeStyle);
    }
    
    // Fülle nur die "__" Platzhalter für Punkte und Note aus
    const walker = iframeDoc.createTreeWalker(
      body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      let text = textNode.textContent || '';
      let updated = false;
      
      const parentText = textNode.parentElement?.textContent || '';
      const fullContext = text + ' ' + parentText;
      
      if (text.includes('__') && text.includes('/') && 
          (fullContext.includes('Punkten erreicht') || fullContext.includes('Punkte erreicht') || 
           fullContext.includes('erreicht') && fullContext.includes('Punkt'))) {
        text = text.replace(/__+\s*\/\s*__+/g, (match) => {
          updated = true;
          return `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
        });
      }
      
      if (fullContext.includes('Note') && (text.includes('____') || text.includes('__'))) {
        text = text.replace(/____+/g, (match) => {
          updated = true;
          return gradeData.string;
        });
        text = text.replace(/Note\s*:\s*__+/g, (match) => {
          updated = true;
          return `Note: ${gradeData.string}`;
        });
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
    const pointsNoteInputs = body.querySelectorAll('input[type="text"], input:not([type]), textarea');
    pointsNoteInputs.forEach((input: Element) => {
      const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
      
      if (inputEl.value && inputEl.value.trim() && !inputEl.value.match(/^[_]+$/)) {
        return;
      }
      
      const parentText = inputEl.parentElement?.textContent || '';
      const previousSibling = inputEl.previousElementSibling?.textContent || '';
      const nextSibling = inputEl.nextElementSibling?.textContent || '';
      const context = parentText + ' ' + previousSibling + ' ' + nextSibling;
      
      if (context.includes('Punkten erreicht') || context.includes('Punkte erreicht') || 
          (context.includes('erreicht') && context.includes('Punkt'))) {
        const value = inputEl.value || '';
        const placeholder = inputEl.placeholder || '';
        if ((value.includes('__') || placeholder.includes('__')) && context.includes('/')) {
          inputEl.value = `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
        }
      }
      
      if (context.includes('Note')) {
        const value = inputEl.value || '';
        const placeholder = inputEl.placeholder || '';
        if (value.includes('__') || placeholder.includes('__') || value === '' || value.match(/^[_]+$/)) {
          inputEl.value = gradeData.string;
        }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Finde das Ende der letzten Aufgabe und entferne alles danach (aber nicht die Korrekturen!)
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
    
    // Finde alle Korrektur-Elemente, die wir hinzugefügt haben
    const correctionElements = body.querySelectorAll('[style*="background-color: #f5f5f5"], [style*="background-color: #c8e6c9"], [style*="background-color: #e3f2fd"]');
    const correctionElementSet = new Set(correctionElements);
    
    if (lastTaskElement) {
      let container = lastTaskElement.parentElement;
      while (container && container !== body) {
        let sibling = container.nextSibling;
        while (sibling) {
          const nextSibling = sibling.nextSibling;
          // Überspringe Korrektur-Elemente
          const siblingElement = sibling as Element;
          if (siblingElement && siblingElement.nodeType === Node.ELEMENT_NODE) {
            if (!correctionElementSet.has(siblingElement) && !Array.from(siblingElement.querySelectorAll('*')).some(el => correctionElementSet.has(el))) {
          if (sibling.parentNode) {
            sibling.parentNode.removeChild(sibling);
              }
            }
          } else {
            // Wenn es kein Element ist, entferne es normal
            if (sibling.parentNode) {
              sibling.parentNode.removeChild(sibling);
            }
          }
          sibling = nextSibling;
        }
        container = container.parentElement;
      }
      
      let sibling = lastTaskElement.nextSibling;
      while (sibling) {
        const nextSibling = sibling.nextSibling;
        // Überspringe Korrektur-Elemente
        const siblingElement = sibling as Element;
        if (siblingElement && siblingElement.nodeType === Node.ELEMENT_NODE) {
          if (!correctionElementSet.has(siblingElement) && !Array.from(siblingElement.querySelectorAll('*')).some(el => correctionElementSet.has(el))) {
        if (sibling.parentNode) {
          sibling.parentNode.removeChild(sibling);
            }
          }
        } else {
          // Wenn es kein Element ist, entferne es normal
          if (sibling.parentNode) {
            sibling.parentNode.removeChild(sibling);
          }
        }
        sibling = nextSibling;
      }
    }
    
    body.style.height = 'auto';
    body.style.overflow = 'visible';
    
    // Füge Korrekturen DIREKT in body ein, nachdem alles geladen ist
    if (submission.corrections && submission.corrections.length > 0) {
      const task3SubtaskCorrections: Array<{taskNumber: string; manualPoints?: number}> = [];
      let task3Comment: string | null = null;
      
      submission.corrections.forEach((corr) => {
        if (corr.taskNumber.match(/^3[a-d]$/)) {
          task3SubtaskCorrections.push({
            taskNumber: corr.taskNumber,
            manualPoints: corr.manualPoints
          });
          if (corr.comment && !task3Comment) {
            task3Comment = corr.comment;
          }
        }
      });
      
      // Füge Konstruktionspunkte für jede Teilaufgabe hinzu - DIREKT in body
      task3SubtaskCorrections.forEach((corr) => {
        const taskNumber = corr.taskNumber;
        const subtaskLetter = taskNumber[1];
        const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
        const taskInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith(`a3${subtaskLetter}`);
        });
        
        if (taskInputs.length > 0 && (corr.manualPoints !== undefined && corr.manualPoints !== null)) {
          taskInputs.sort((a, b) => {
            const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = taskInputs[0] as HTMLElement;
          
          if (lastInput) {
            // Erstelle sehr sichtbares Div
            const constructionDiv = iframeDoc.createElement('div');
            constructionDiv.setAttribute('data-correction', 'construction-points');
            constructionDiv.style.cssText = `
              margin-top: 10px !important;
              margin-bottom: 15px !important;
              padding: 10px 15px !important;
              background-color: #f5f5f5 !important;
              border: 2px solid #333 !important;
              border-radius: 5px !important;
              font-size: 1em !important;
              font-weight: bold !important;
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              position: relative !important;
              z-index: 9999 !important;
            `;
            constructionDiv.innerHTML = `<strong style="font-size: 1.1em;">Konstruktionspunkte:</strong> <span style="font-size: 1.2em; color: #1976d2;">${corr.manualPoints} / 2</span>`;
            
            // Füge direkt nach dem Input ein
            if (lastInput.nextSibling) {
              lastInput.parentElement?.insertBefore(constructionDiv, lastInput.nextSibling);
            } else {
              lastInput.parentElement?.appendChild(constructionDiv);
            }
          }
        }
      });
      
      // Füge Kommentar am Ende von Aufgabe 3 hinzu - DIREKT in body
      if (task3Comment) {
        const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
        const task3dInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith('a3d');
        });
        
        if (task3dInputs.length > 0) {
          task3dInputs.sort((a, b) => {
            const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = task3dInputs[0] as HTMLElement;
          
          if (lastInput) {
            // Erstelle sehr sichtbares Div
            const commentDiv = iframeDoc.createElement('div');
            commentDiv.setAttribute('data-correction', 'task3-comment');
            commentDiv.style.cssText = `
              margin-top: 20px !important;
              margin-bottom: 20px !important;
              padding: 15px 20px !important;
              background-color: #c8e6c9 !important;
              border: 3px solid #4caf50 !important;
              border-left: 6px solid #4caf50 !important;
              border-radius: 8px !important;
              font-size: 1em !important;
              line-height: 1.8 !important;
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              position: relative !important;
              z-index: 9999 !important;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
            `;
            commentDiv.innerHTML = `
              <div style="font-weight: bold; font-size: 1.2em; color: #2e7d32; margin-bottom: 10px; border-bottom: 2px solid #81c784; padding-bottom: 6px;">Aufgabe 3 - Kommentar</div>
              <div style="color: #1b5e20; white-space: pre-wrap; font-size: 1.05em;">${task3Comment}</div>
            `;
            
            // Finde das letzte Element von Aufgabe 3
            let insertAfter = lastInput;
            let nextSibling = lastInput.nextElementSibling;
            while (nextSibling) {
              const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
              if (nextTaskId.startsWith('a3')) {
                insertAfter = nextSibling as HTMLElement;
                nextSibling = nextSibling.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (insertAfter.nextSibling) {
              insertAfter.parentElement?.insertBefore(commentDiv, insertAfter.nextSibling);
            } else {
              insertAfter.parentElement?.appendChild(commentDiv);
            }
          }
        }
      }
    }
    
    // Warte, damit DOM aktualisiert wird
    await new Promise(resolve => setTimeout(resolve, 100));

    // Rendere Canvas mit optimierten Einstellungen
    const canvas = await html2canvas(body, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: body.scrollWidth,
      height: body.scrollHeight,
      removeContainer: false
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

  // Hilfsfunktion: Erstellt ein PDF für einen einzelnen Schüler als Blob
  const createSingleStudentPDFAsBlob = async (
    submission: KASubmission,
    htmlText: string,
    correctAnswers: Record<string, any>,
    pointsDistribution: Record<string, number>,
    isAnswerCorrect: (taskId: string, studentAnswer: any) => boolean,
    fileName: string
  ): Promise<{ blob: Blob; fileName: string }> => {
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

    // Parse HTML und wende alle Änderungen an (gleiche Logik wie createSingleStudentPDF)
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
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
    
    const allButtons = doc.querySelectorAll('button');
    allButtons.forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.toLowerCase().includes('submit') || onclick.toLowerCase().includes('abgeben')) {
        btn.remove();
      }
    });
    
    const timerElements = doc.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"], [id*="time"], [class*="time"]');
    timerElements.forEach(el => {
      const text = el.textContent || '';
      if (text.match(/\d+:\d+/) || text.includes('Verbleibend') || text.includes('verbleibend') || 
          text.includes('Zeit') || el.id?.toLowerCase().includes('timer')) {
        el.remove();
      }
    });

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

    const headerContainer = doc.createElement('div');
    headerContainer.style.cssText = 'margin-bottom: 20px; padding: 0;';
    const combinedHeader = doc.createElement('div');
    combinedHeader.style.cssText = `
      background-color: transparent;
      border: 3px solid #1976d2;
      color: #1976d2;
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
    nameDiv.style.cssText = 'font-size: 1.1em; font-weight: bold;';
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
        <div style="font-size: 3em; font-weight: bold;">${gradeData.string}</div>
      </div>
    `;
    combinedHeader.appendChild(leftSection);
    combinedHeader.appendChild(rightSection);
    headerContainer.appendChild(combinedHeader);
    if (doc.body) {
      doc.body.insertBefore(headerContainer, doc.body.firstChild);
    }

    const style = doc.createElement('style');
    style.textContent = `
      html, body {
        border: none !important;
        outline: none !important;
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
      }
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

    Object.entries(answers).forEach(([taskId, answer]) => {
      let input = doc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!input) {
        input = doc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      }
      if (!input) {
        input = doc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      }
      
      if (input) {
        const isCorrect = isAnswerCorrect(taskId, answer);
        const maxPoints = pointsDistribution[taskId] || 0;
        let achievedPoints = isCorrect ? maxPoints : 0;
        
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
        
        input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
        
        const container = doc.createElement('span');
        container.style.display = 'inline-flex';
        container.style.alignItems = 'center';
        container.style.gap = '5px';
        container.style.position = 'relative';
        container.style.verticalAlign = 'middle';
        container.style.marginLeft = '5px';
        
        if (input.parentElement && !input.parentElement.classList.contains('answer-container')) {
          const parent = input.parentElement;
          parent.insertBefore(container, input);
          container.appendChild(input);
          container.classList.add('answer-container');
          
          const pointsBadge = doc.createElement('span');
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
    });

    // Füge Korrekturen DIREKT in doc ein, BEVOR es ins iframe geschrieben wird
    if (submission.corrections && submission.corrections.length > 0) {
      const task3SubtaskCorrections: Array<{taskNumber: string; manualPoints?: number}> = [];
      let task3Comment: string | null = null;
      
      submission.corrections.forEach((corr) => {
        if (corr.taskNumber.match(/^3[a-d]$/)) {
          task3SubtaskCorrections.push({
            taskNumber: corr.taskNumber,
            manualPoints: corr.manualPoints
          });
          if (corr.comment && !task3Comment) {
            task3Comment = corr.comment;
          }
        }
      });
      
      // Füge Konstruktionspunkte für jede Teilaufgabe hinzu
      task3SubtaskCorrections.forEach((corr) => {
        const taskNumber = corr.taskNumber;
        const subtaskLetter = taskNumber[1];
        const allInputs = Array.from(doc.querySelectorAll('input, textarea, select'));
        const taskInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith(`a3${subtaskLetter}`);
        });
        
        if (taskInputs.length > 0 && (corr.manualPoints !== undefined && corr.manualPoints !== null)) {
          taskInputs.sort((a, b) => {
            const posA = Array.from(doc.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(doc.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = taskInputs[0];
          
          if (lastInput) {
            const constructionDiv = doc.createElement('div');
            constructionDiv.setAttribute('data-correction', 'construction-points');
            constructionDiv.style.cssText = 'margin-top: 8px; margin-bottom: 12px; padding: 8px 12px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em; display: block; width: 100%;';
            constructionDiv.innerHTML = `<strong>Konstruktionspunkte:</strong> ${corr.manualPoints} / 2`;
            
            let parent = lastInput.parentElement;
            if (!parent) {
              parent = doc.createElement('div');
              lastInput.parentNode?.insertBefore(parent, lastInput);
              parent.appendChild(lastInput);
            }
            
            let insertAfter = lastInput;
            let nextSibling = lastInput.nextElementSibling;
            while (nextSibling) {
              const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
              if (nextTaskId.startsWith(`a3${subtaskLetter}`)) {
                insertAfter = nextSibling as Element;
                nextSibling = nextSibling.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (insertAfter.nextSibling) {
              parent.insertBefore(constructionDiv, insertAfter.nextSibling);
            } else {
              parent.appendChild(constructionDiv);
            }
          }
        }
      });
      
      // Füge Kommentar am Ende von Aufgabe 3 hinzu
      if (task3Comment) {
        const allInputs = Array.from(doc.querySelectorAll('input, textarea, select'));
        const task3dInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith('a3d');
        });
        
        if (task3dInputs.length > 0) {
          task3dInputs.sort((a, b) => {
            const posA = Array.from(doc.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(doc.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = task3dInputs[0];
          
          if (lastInput) {
            const commentDiv = doc.createElement('div');
            commentDiv.setAttribute('data-correction', 'task3-comment');
            commentDiv.style.cssText = 'margin-top: 16px; margin-bottom: 16px; padding: 12px 16px; background-color: #c8e6c9; border: 2px solid #4caf50; border-left: 5px solid #4caf50; border-radius: 6px; font-size: 0.95em; line-height: 1.6; display: block; width: 100%;';
            commentDiv.innerHTML = `
              <div style="font-weight: bold; font-size: 1.05em; color: #2e7d32; margin-bottom: 8px; border-bottom: 1px solid #81c784; padding-bottom: 4px;">Aufgabe 3 - Kommentar</div>
              <div style="color: #1b5e20; white-space: pre-wrap;">${task3Comment}</div>
            `;
            
            let parent = lastInput.parentElement;
            if (!parent) {
              parent = doc.createElement('div');
              lastInput.parentNode?.insertBefore(parent, lastInput);
              parent.appendChild(lastInput);
            }
            
            let insertAfter = lastInput;
            let nextSibling = lastInput.nextElementSibling;
            while (nextSibling) {
              const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
              if (nextTaskId.startsWith('a3')) {
                insertAfter = nextSibling as Element;
                nextSibling = nextSibling.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (insertAfter.nextSibling) {
              parent.insertBefore(commentDiv, insertAfter.nextSibling);
            } else {
              parent.appendChild(commentDiv);
            }
          }
        }
      }
    }

    iframeDoc.open();
    iframeDoc.write(doc.documentElement.outerHTML);
    iframeDoc.close();

    await new Promise(resolve => setTimeout(resolve, 500));

    const body = iframeDoc.body;
    if (!body) {
      throw new Error('Iframe body nicht gefunden');
    }

    body.innerHTML = body.innerHTML.replace(/Frau Christ/g, studentName);
    
    const iframeHeader = body.querySelector('[style*="border: 3px solid #1976d2"], [style*="background-color: #1976d2"]') as HTMLElement;
    if (iframeHeader) {
      const headerText = iframeHeader.textContent || '';
      if (headerText.includes('Abgabe vom') || headerText.includes(submission.student.name)) {
        iframeHeader.style.display = 'flex';
        iframeHeader.style.justifyContent = 'space-between';
        iframeHeader.style.alignItems = 'center';
        iframeHeader.style.flexWrap = 'wrap';
        iframeHeader.style.gap = '15px';
        iframeHeader.style.backgroundColor = 'transparent';
        iframeHeader.style.border = '3px solid #1976d2';
        iframeHeader.style.color = '#1976d2';
        
        const leftSection = iframeDoc.createElement('div');
        leftSection.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';
        const nameDiv = iframeDoc.createElement('div');
        nameDiv.style.cssText = 'font-size: 1.1em; font-weight: bold;';
        nameDiv.textContent = studentName;
        const dateDiv = iframeDoc.createElement('div');
        dateDiv.style.cssText = 'font-size: 0.75em; font-weight: normal; opacity: 0.95;';
        dateDiv.textContent = `Abgabe vom ${new Date(submission.submittedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} um ${new Date(submission.submittedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
        leftSection.appendChild(nameDiv);
        leftSection.appendChild(dateDiv);
        
        const rightSection = iframeDoc.createElement('div');
        rightSection.style.cssText = 'display: flex; gap: 20px; align-items: center;';
        rightSection.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 0.75em; opacity: 0.9; margin-bottom: 2px;">Punkte</div>
            <div style="font-size: 1.2em; font-weight: bold;">${totalAchieved.toFixed(1)} / ${maxTotalPoints}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 0.75em; opacity: 0.9; margin-bottom: 2px;">Note</div>
            <div style="font-size: 3em; font-weight: bold;">${gradeData.string}</div>
          </div>
        `;
        
        iframeHeader.innerHTML = '';
        iframeHeader.appendChild(leftSection);
        iframeHeader.appendChild(rightSection);
      }
    }
    
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
    
    const iframeTimerElements = body.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"], [id*="time"], [class*="time"]');
    iframeTimerElements.forEach(el => {
      const text = el.textContent || '';
      if (text.match(/\d+:\d+/) || text.includes('Verbleibend') || text.includes('verbleibend') || 
          text.includes('Zeit') || el.id?.toLowerCase().includes('timer')) {
        el.remove();
      }
    });
    
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
        
        input.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
        
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
    
    // Korrekturen werden NACH dem Aufräumen hinzugefügt (siehe Zeile ~4562)
    
    const iframeStyle = iframeDoc.createElement('style');
    iframeStyle.textContent = `
      html, body {
        border: none !important;
        outline: none !important;
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
      }
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
    if (!iframeDoc.head.querySelector('style[data-export-style]')) {
      iframeStyle.setAttribute('data-export-style', 'true');
      iframeDoc.head.appendChild(iframeStyle);
    }
    
    const walker = iframeDoc.createTreeWalker(
      body,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let textNode;
    while (textNode = walker.nextNode()) {
      let text = textNode.textContent || '';
      let updated = false;
      
      const parentText = textNode.parentElement?.textContent || '';
      const fullContext = text + ' ' + parentText;
      
      if (text.includes('__') && text.includes('/') && 
          (fullContext.includes('Punkten erreicht') || fullContext.includes('Punkte erreicht') || 
           fullContext.includes('erreicht') && fullContext.includes('Punkt'))) {
        text = text.replace(/__+\s*\/\s*__+/g, (match) => {
          updated = true;
          return `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
        });
      }
      
      if (fullContext.includes('Note') && (text.includes('____') || text.includes('__'))) {
        text = text.replace(/____+/g, (match) => {
          updated = true;
          return gradeData.string;
        });
        text = text.replace(/Note\s*:\s*__+/g, (match) => {
          updated = true;
          return `Note: ${gradeData.string}`;
        });
        text = text.replace(/Note\s+__+/g, (match) => {
          updated = true;
          return match.replace(/__+/, gradeData.string);
        });
      }
      
      if (updated && textNode.textContent) {
        textNode.textContent = text;
      }
    }
    
    const pointsNoteInputs = body.querySelectorAll('input[type="text"], input:not([type]), textarea');
    pointsNoteInputs.forEach((input: Element) => {
      const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
      
      if (inputEl.value && inputEl.value.trim() && !inputEl.value.match(/^[_]+$/)) {
        return;
      }
      
      const parentText = inputEl.parentElement?.textContent || '';
      const previousSibling = inputEl.previousElementSibling?.textContent || '';
      const nextSibling = inputEl.nextElementSibling?.textContent || '';
      const context = parentText + ' ' + previousSibling + ' ' + nextSibling;
      
      if (context.includes('Punkten erreicht') || context.includes('Punkte erreicht') || 
          (context.includes('erreicht') && context.includes('Punkt'))) {
        const value = inputEl.value || '';
        const placeholder = inputEl.placeholder || '';
        if ((value.includes('__') || placeholder.includes('__')) && context.includes('/')) {
          inputEl.value = `${totalAchieved.toFixed(1)} / ${maxTotalPoints}`;
        }
      }
      
      if (context.includes('Note')) {
        const value = inputEl.value || '';
        const placeholder = inputEl.placeholder || '';
        if (value.includes('__') || placeholder.includes('__') || value === '' || value.match(/^[_]+$/)) {
          inputEl.value = gradeData.string;
        }
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
    
    if (lastTaskElement) {
      let container = lastTaskElement.parentElement;
      while (container && container !== body) {
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
    
    // Füge Korrekturen NACH dem Aufräumen hinzu, damit sie nicht entfernt werden
    if (submission.corrections && submission.corrections.length > 0) {
      const task3SubtaskCorrectionsFinal: Array<{taskNumber: string; manualPoints?: number}> = [];
      let task3CommentFinal: string | null = null;
      
      submission.corrections.forEach((corr) => {
        if (corr.taskNumber.match(/^3[a-d]$/)) {
          task3SubtaskCorrectionsFinal.push({
            taskNumber: corr.taskNumber,
            manualPoints: corr.manualPoints
          });
          if (corr.comment && !task3CommentFinal) {
            task3CommentFinal = corr.comment;
          }
        }
      });
      
      // Füge Konstruktionspunkte für jede Teilaufgabe hinzu
      task3SubtaskCorrectionsFinal.forEach((corr) => {
        const taskNumber = corr.taskNumber;
        const subtaskLetter = taskNumber[1];
        const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
        const taskInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith(`a3${subtaskLetter}`);
        });
        
        if (taskInputs.length > 0 && (corr.manualPoints !== undefined && corr.manualPoints !== null)) {
          taskInputs.sort((a, b) => {
            const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = taskInputs[0];
          
          if (lastInput) {
            const constructionDiv = iframeDoc.createElement('div');
            constructionDiv.setAttribute('data-correction', 'construction-points');
            constructionDiv.style.cssText = `
              margin-top: 10px !important;
              margin-bottom: 15px !important;
              padding: 10px 15px !important;
              background-color: #f5f5f5 !important;
              border: 2px solid #333 !important;
              border-radius: 5px !important;
              font-size: 1em !important;
              font-weight: bold !important;
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              position: relative !important;
              z-index: 9999 !important;
            `;
            constructionDiv.innerHTML = `<strong style="font-size: 1.1em;">Konstruktionspunkte:</strong> <span style="font-size: 1.2em; color: #1976d2;">${corr.manualPoints} / 2</span>`;
            
            if (lastInput.nextSibling) {
              lastInput.parentElement?.insertBefore(constructionDiv, lastInput.nextSibling);
            } else {
              lastInput.parentElement?.appendChild(constructionDiv);
            }
          }
        }
      });
      
      // Füge Kommentar am Ende von Aufgabe 3 hinzu
      if (task3CommentFinal) {
        const allInputs = Array.from(body.querySelectorAll('input, textarea, select'));
        const task3dInputs = allInputs.filter(input => {
          const taskId = input.id || (input as HTMLInputElement).name || '';
          return taskId.startsWith('a3d');
        });
        
        if (task3dInputs.length > 0) {
          task3dInputs.sort((a, b) => {
            const posA = Array.from(body.querySelectorAll('*')).indexOf(a);
            const posB = Array.from(body.querySelectorAll('*')).indexOf(b);
            return posB - posA;
          });
          const lastInput = task3dInputs[0];
          
          if (lastInput) {
            const commentDiv = iframeDoc.createElement('div');
            commentDiv.setAttribute('data-correction', 'task3-comment');
            commentDiv.style.cssText = `
              margin-top: 20px !important;
              margin-bottom: 20px !important;
              padding: 15px 20px !important;
              background-color: #c8e6c9 !important;
              border: 3px solid #4caf50 !important;
              border-left: 6px solid #4caf50 !important;
              border-radius: 8px !important;
              font-size: 1em !important;
              line-height: 1.8 !important;
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              position: relative !important;
              z-index: 9999 !important;
              box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
            `;
            commentDiv.innerHTML = `
              <div style="font-weight: bold; font-size: 1.2em; color: #2e7d32; margin-bottom: 10px; border-bottom: 2px solid #81c784; padding-bottom: 6px;">Aufgabe 3 - Kommentar</div>
              <div style="color: #1b5e20; white-space: pre-wrap; font-size: 1.05em;">${task3CommentFinal}</div>
            `;
            
            let insertAfter = lastInput as HTMLElement;
            let nextSibling = lastInput.nextElementSibling;
            while (nextSibling) {
              const nextTaskId = (nextSibling as HTMLElement).id || (nextSibling as HTMLInputElement).name || '';
              if (nextTaskId.startsWith('a3')) {
                insertAfter = nextSibling as HTMLElement;
                nextSibling = nextSibling.nextElementSibling;
              } else {
                break;
              }
            }
            
            if (insertAfter.nextSibling) {
              insertAfter.parentElement?.insertBefore(commentDiv, insertAfter.nextSibling);
            } else {
              insertAfter.parentElement?.appendChild(commentDiv);
            }
          }
        }
      }
    }
    
    // Warte, damit DOM aktualisiert wird
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(body, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: body.scrollWidth,
      height: body.scrollHeight,
      removeContainer: false
    });

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

    // Entferne temporären iframe
    document.body.removeChild(iframe);

    const pdfBlob = pdf.output('blob');
    const fileName_pdf = `${submission.student.name.replace(/[^a-z0-9]/gi, '_')}_${fileName.replace('.html', '') || 'abgabe'}.pdf`;
    
    return {
      blob: pdfBlob,
      fileName: fileName_pdf
    };
  };

  // Exportiere alle Abgaben als HTML-Dateien mit Farbmarkierungen und Musterlösungen
  const exportToHTML = async () => {
    try {
      setExportingHTML(true);
      
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
      
      // Richtige Antworten für die automatische Bewertung
      const correctAnswers: Record<string, any> = {
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

      // Erstelle ZIP-Datei
      const zip = new JSZip();
      
      // Erstelle Musterlösung
      const solutionParser = new DOMParser();
      const solutionDoc = solutionParser.parseFromString(htmlText, 'text/html');
      solutionDoc.body.innerHTML = solutionDoc.body.innerHTML.replace(/Frau Christ/g, 'Musterlösung');
      
      // Ersetze "Name: ____" durch "Name: Musterlösung" (mit TreeWalker für zuverlässige Ersetzung)
      const solutionWalker = solutionDoc.createTreeWalker(solutionDoc.body, NodeFilter.SHOW_TEXT, null);
      const solutionTextNodes: Text[] = [];
      let solutionNode: Node | null;
      while (solutionNode = solutionWalker.nextNode()) {
        solutionTextNodes.push(solutionNode as Text);
      }
      
      solutionTextNodes.forEach(textNode => {
        let text = textNode.textContent || '';
        const originalText = text;
        
        // Ersetze "Name: ____" durch "Name: Musterlösung"
        text = text.replace(/Name:\s*_+/gi, 'Name: Musterlösung');
        
        // Entferne "Viel Glück" und "Viel Erfolg"
        text = text.replace(/Viel Glück/gi, '');
        text = text.replace(/Viel Erfolg/gi, '');
        
        if (text !== originalText) {
          textNode.textContent = text;
        }
      });
      
      // Zusätzlich: Ersetze auch in Input-Feldern der Musterlösung
      const solutionAllInputs = solutionDoc.querySelectorAll('input, textarea');
      solutionAllInputs.forEach((input: Element) => {
        const inputEl = input as HTMLInputElement | HTMLTextAreaElement;
        if (inputEl.value) {
          let value = inputEl.value;
          value = value.replace(/Name:\s*_+/gi, 'Name: Musterlösung');
          inputEl.value = value;
        }
      });
      
      // Entferne alle Buttons und Submit-Buttons
      const solutionSubmitButtons = solutionDoc.querySelectorAll('button[type="submit"], input[type="submit"]');
      solutionSubmitButtons.forEach(btn => btn.remove());
      const solutionAllButtons = solutionDoc.querySelectorAll('button');
      solutionAllButtons.forEach(btn => btn.remove());
      const solutionTimerElements = solutionDoc.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"], [id*="time"], [class*="time"]');
      solutionTimerElements.forEach(el => el.remove());
      
      // Füge CSS für Musterlösung hinzu
      const solutionStyle = solutionDoc.createElement('style');
      solutionStyle.textContent = `
        html, body {
          border: none !important;
          outline: none !important;
          background-color: transparent !important;
          margin-top: 2% !important;
          margin-left: 2% !important;
          margin-right: 0 !important;
          margin-bottom: 0 !important;
          padding: 0 !important;
        }
        .answer-correct {
          background-color: #c8e6c9 !important;
          border: 2px solid #4caf50 !important;
          color: #1b5e20 !important;
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
        input[type="text"], input:not([type]), textarea, input[type="number"] {
          min-height: 24px !important;
          height: auto !important;
          padding: 4px 8px !important;
          line-height: 1.4 !important;
          font-size: 0.85em !important;
        }
      `;
      solutionDoc.head.appendChild(solutionStyle);
      
      // Fülle Musterlösung ein und füge Punkte hinzu
      Object.entries(correctAnswers).forEach(([taskId, correctAnswer]) => {
        let input = solutionDoc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (!input) {
          input = solutionDoc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        }
        if (!input) {
          input = solutionDoc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        }
        
        if (input) {
          const answerStr = String(correctAnswer || '').trim();
          const maxPoints = pointsDistribution[taskId] || 0;
          const achievedPoints = maxPoints; // In Musterlösung sind alle Antworten richtig
          
          if (input.tagName === 'INPUT') {
            const inputEl = input as HTMLInputElement;
            if (inputEl.type === 'radio' || inputEl.type === 'checkbox') {
              if (inputEl.value === answerStr || inputEl.id === taskId || inputEl.name === taskId) {
                inputEl.checked = true;
              }
            } else {
              inputEl.setAttribute('value', answerStr);
              inputEl.value = answerStr;
            }
          } else if (input.tagName === 'TEXTAREA') {
            const textareaEl = input as HTMLTextAreaElement;
            textareaEl.textContent = answerStr;
            textareaEl.value = answerStr;
          } else if (input.tagName === 'SELECT') {
            const selectEl = input as unknown as HTMLSelectElement;
            selectEl.value = answerStr;
            // Setze auch selectedIndex
            for (let i = 0; i < selectEl.options.length; i++) {
              if (selectEl.options[i].value === answerStr) {
                selectEl.selectedIndex = i;
                break;
              }
            }
          }
          
          input.classList.add('answer-correct');
          
          // Füge Punkte-Badge hinzu
          if (maxPoints > 0 && !input.parentElement?.querySelector('.points-badge')) {
            const container = solutionDoc.createElement('span');
            container.style.display = 'inline-flex';
            container.style.alignItems = 'center';
            container.style.gap = '5px';
            container.style.marginLeft = '5px';
            
            if (input.parentElement) {
              const parent = input.parentElement;
              parent.insertBefore(container, input);
              container.appendChild(input);
              
              const pointsBadge = solutionDoc.createElement('span');
              pointsBadge.className = 'points-badge points-correct';
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
      
      // Ersetze Input-Felder für Aufgabe 3 in Musterlösung durch Text (Format: A₁(-6/-4))
      const solutionTask3Inputs = solutionDoc.querySelectorAll('input[id^="a3"], input[name^="a3"]');
      solutionTask3Inputs.forEach((input) => {
        const inputEl = input as HTMLInputElement;
        const inputId = inputEl.id || inputEl.name || '';
        const answerValue = inputEl.value || '';
        
        if (answerValue.trim()) {
          // Finde Punkt-Label (A₁, B₁, C₁, etc.)
          let pointLabel = '';
          const matchA = inputId.match(/a3([a-d])_?A(\d?)/i);
          const matchB = inputId.match(/a3([a-d])_?B(\d?)/i);
          const matchC = inputId.match(/a3([a-d])_?C(\d?)/i);
          
          if (matchA) {
            const subtaskNum = matchA[1];
            pointLabel = 'A' + (subtaskNum === 'a' ? '₁' : subtaskNum === 'b' ? '₂' : subtaskNum === 'c' ? '₃' : '₄');
          } else if (matchB) {
            const subtaskNum = matchB[1];
            pointLabel = 'B' + (subtaskNum === 'a' ? '₁' : subtaskNum === 'b' ? '₂' : subtaskNum === 'c' ? '₃' : '₄');
          } else if (matchC) {
            const subtaskNum = matchC[1];
            pointLabel = 'C' + (subtaskNum === 'a' ? '₁' : subtaskNum === 'b' ? '₂' : subtaskNum === 'c' ? '₃' : '₄');
          }
          
          if (pointLabel) {
            const formattedAnswer = `${pointLabel}(${answerValue})`;
            const textSpan = solutionDoc.createElement('span');
            textSpan.textContent = formattedAnswer;
            textSpan.style.cssText = 'display: inline;';
            
            if (inputEl.parentElement) {
              inputEl.parentElement.replaceChild(textSpan, inputEl);
            }
          } else {
            // Fallback: Zeige einfach den Wert
            const textSpan = solutionDoc.createElement('span');
            textSpan.textContent = answerValue;
            textSpan.style.cssText = 'display: inline;';
            
            if (inputEl.parentElement) {
              inputEl.parentElement.replaceChild(textSpan, inputEl);
            }
          }
        } else {
          inputEl.remove();
        }
      });
      
      // Entferne alles nach Aufgabe 3 (für Musterlösung)
      const solutionAllTask3Inputs = solutionDoc.querySelectorAll(`input[id^="a3"], input[name^="a3"]`);
      if (solutionAllTask3Inputs.length > 0) {
        const solutionLastTask3Input = solutionAllTask3Inputs[solutionAllTask3Inputs.length - 1] as HTMLElement;
        
        // Finde das übergeordnete Container-Element, das alle Aufgabe-3 Inputs enthält
        let solutionTask3Container: HTMLElement | null = solutionLastTask3Input;
        while (solutionTask3Container && solutionTask3Container !== solutionDoc.body) {
          const tagName = solutionTask3Container.tagName.toLowerCase();
          if (['div', 'p', 'form', 'section', 'article', 'fieldset', 'li'].includes(tagName)) {
            const allInputsInContainer = solutionTask3Container.querySelectorAll(`input[id^="a3"], input[name^="a3"]`);
            if (allInputsInContainer.length === solutionAllTask3Inputs.length) {
              // Dieses Element enthält alle Aufgabe-3 Inputs
              // Entferne alle nachfolgenden Geschwister dieses Containers
              if (solutionTask3Container.parentElement) {
                let current: Node | null = solutionTask3Container.nextSibling;
                while (current && solutionTask3Container.parentElement) {
                  const next = current.nextSibling;
                  solutionTask3Container.parentElement.removeChild(current);
                  current = next;
                }
              }
              break;
            }
          }
          solutionTask3Container = solutionTask3Container.parentElement;
        }
      }
      
      // FINALE BEREINIGUNG für Musterlösung: Entferne ALLES nach Aufgabe 3
      const solutionFinalAllTask3Inputs = solutionDoc.querySelectorAll(`input[id^="a3"], input[name^="a3"]`);
      if (solutionFinalAllTask3Inputs.length > 0) {
        const solutionFinalLastTask3Input = solutionFinalAllTask3Inputs[solutionFinalAllTask3Inputs.length - 1] as HTMLElement;
        
        let solutionFinalTask3Container: HTMLElement | null = solutionFinalLastTask3Input;
        while (solutionFinalTask3Container && solutionFinalTask3Container !== solutionDoc.body) {
          const tagName = solutionFinalTask3Container.tagName.toLowerCase();
          if (['div', 'p', 'form', 'section', 'article', 'fieldset', 'li'].includes(tagName)) {
            const allInputsInContainer = solutionFinalTask3Container.querySelectorAll(`input[id^="a3"], input[name^="a3"]`);
            if (allInputsInContainer.length === solutionFinalAllTask3Inputs.length) {
              if (solutionFinalTask3Container.parentElement) {
                let current: Node | null = solutionFinalTask3Container.nextSibling;
                while (current && solutionFinalTask3Container.parentElement) {
                  const next = current.nextSibling;
                  solutionFinalTask3Container.parentElement.removeChild(current);
                  current = next;
                }
              }
              break;
            }
          }
          solutionFinalTask3Container = solutionFinalTask3Container.parentElement;
        }
      }
      
      // Zusätzlich: Entferne alle Body-Kinder, die nach dem Container kommen (Musterlösung)
      const solutionBodyChildren = Array.from(solutionDoc.body.children);
      const solutionAllTask3SpansForBody = Array.from(solutionDoc.querySelectorAll('span')).filter(span => {
        const text = span.textContent || '';
        return text.match(/[ABC][₁₂₃₄]\(/);
      });
      const solutionAllTask3InputsForBody = solutionDoc.querySelectorAll(`input[id^="a3"], input[name^="a3"]`);
      const solutionLastTask3ElementForBody = solutionAllTask3SpansForBody.length > 0 
        ? solutionAllTask3SpansForBody[solutionAllTask3SpansForBody.length - 1] as HTMLElement
        : (solutionAllTask3InputsForBody.length > 0 ? solutionAllTask3InputsForBody[solutionAllTask3InputsForBody.length - 1] as HTMLElement : null);
      if (solutionLastTask3ElementForBody) {
        let solutionFoundTask3 = false;
        for (const child of solutionBodyChildren) {
          if (child.contains(solutionLastTask3ElementForBody)) {
            solutionFoundTask3 = true;
          } else if (solutionFoundTask3) {
            child.remove();
          }
        }
      }
      
      zip.file(`00_Musterloesung_${fileName.replace('.html', '') || 'abgabe'}.html`, solutionDoc.documentElement.outerHTML);
      
      // Sortiere Submissions nach Schülernamen
      const sortedSubmissions = [...submissions].sort((a, b) => 
        a.student.name.localeCompare(b.student.name)
      );

      // Für jede Abgabe: Erstelle HTML mit Schülername, Antworten und Farbmarkierungen
      for (const submission of sortedSubmissions) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const studentName = submission.student.name;
        
        // Ersetze "Frau Christ" durch Schülername
        doc.body.innerHTML = doc.body.innerHTML.replace(/Frau Christ/g, studentName);
        
        // Entferne "Nicht angemeldet" Text
        doc.body.innerHTML = doc.body.innerHTML.replace(/Nicht angemeldet/gi, '');
        
        // Sammle Kommentar für Aufgabe 3 (falls vorhanden)
        let task3CommentForReplacement = '';
        if (submission.corrections) {
          // Suche nach Kommentaren für Aufgabe 3 - verschiedene Varianten
          const task3Corrections = submission.corrections.filter(corr => 
            corr.taskNumber === '3' || corr.taskNumber.match(/^3[a-d]$/)
          );
          
          // Nimm den ersten Kommentar, der gefunden wird (von "3" oder "3a"-"3d")
          for (const corr of task3Corrections) {
            if (corr.comment && corr.comment.trim()) {
              task3CommentForReplacement = corr.comment.trim();
              break;
            }
          }
          
          // Fallback: Suche auch in ALLEN Korrekturen nach Kommentaren, die "Aufgabe 3" enthalten
          if (!task3CommentForReplacement) {
            for (const corr of submission.corrections) {
              if (corr.comment && corr.comment.trim() && 
                  (corr.taskNumber.includes('3') || corr.comment.toLowerCase().includes('aufgabe 3'))) {
                task3CommentForReplacement = corr.comment.trim();
                break;
              }
            }
          }
        }
        
        // EINFACHER UND ROBUSTER ANSATZ: Ersetze "Name:" im gesamten HTML-Inhalt
        // Ersetze "Name:" gefolgt von Leerzeichen/Unterstrichen ODER nichts
        // Verwende einen einfachen replace auf dem gesamten innerHTML
        let bodyHTML = doc.body.innerHTML;
        
        // Methode 1: Ersetze "Name:" gefolgt von Unterstrichen
        bodyHTML = bodyHTML.replace(/Name:\s*_+/gi, `Name: ${studentName}`);
        
        // Methode 2: Ersetze "Name:" gefolgt von Leerzeichen und dann einem schließenden Tag oder Zeilenumbruch
        bodyHTML = bodyHTML.replace(/Name:\s+(?=\s*<|$|\n)/gi, `Name: ${studentName} `);
        
        // Methode 3: Ersetze "Name:" am Ende eines Text-Knotens (vor einem HTML-Tag)
        bodyHTML = bodyHTML.replace(/Name:\s*(?=[<\n])/gi, `Name: ${studentName}`);
        
        doc.body.innerHTML = bodyHTML;
        
        // Zusätzlich: Gehe durch alle Text-Knoten und ersetze
        const walkerForName = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
        let nameNode: Node | null;
        while (nameNode = walkerForName.nextNode()) {
          let text = nameNode.textContent || '';
          const originalText = text;
          
          // Ersetze "Name:" gefolgt von nichts oder nur Leerzeichen/Unterstrichen
          if (text.includes('Name:')) {
            // Prüfe, ob nach "Name:" wirklich nichts oder nur Leerzeichen/Unterstriche kommen
            const nameIndex = text.toLowerCase().indexOf('name:');
            if (nameIndex !== -1) {
              const afterName = text.substring(nameIndex + 5).trim();
              // Wenn nach "Name:" nichts oder nur Unterstriche/Leerzeichen kommen
              if (!afterName || /^[\s_]*$/.test(afterName)) {
                text = text.substring(0, nameIndex + 5) + ` ${studentName}` + text.substring(nameIndex + 5);
                nameNode.textContent = text;
              } else if (/^[\s_]+/.test(afterName)) {
                // Ersetze Unterstriche/Leerzeichen durch Schülername
                text = text.substring(0, nameIndex + 5) + ` ${studentName}` + afterName.replace(/^[\s_]+/, '');
                nameNode.textContent = text;
              }
            }
          }
        }
        
        // Ersetze "⚠️ Zeichne alles schön ordentlich in dein großes Koordinatensystem!" durch grüne Kommentar-Box (oder entferne Text, wenn kein Kommentar)
        // Suche nach Elementen, die den Text enthalten (kann in einem Container-Element wie div, p, span sein)
        const allElements = Array.from(doc.querySelectorAll('div, p, span, td, th, li, h1, h2, h3, h4, h5, h6'));
        let elementToReplace: Element | null = null;
        
        // Finde das kleinste Element, das den Text enthält (um Container-Elemente zu finden)
        for (const el of allElements) {
          const text = el.textContent || '';
          if (text.includes('⚠️') && text.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem') ||
              text.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem')) {
            // Prüfe, ob dieses Element keinen anderen Container-Element mit dem Text enthält
            const hasChildWithText = Array.from(el.querySelectorAll('div, p, span, td, th, li, h1, h2, h3, h4, h5, h6')).some(child => {
              const childText = child.textContent || '';
              return childText.includes('⚠️') && childText.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem') ||
                     childText.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem');
            });
            
            if (!hasChildWithText) {
              elementToReplace = el;
              break;
            }
          }
        }
        
        // Entferne das "⚠️ Zeichne alles..." Element - Kommentar wird später am Ende hinzugefügt
        if (elementToReplace) {
          elementToReplace.remove();
        }
        
        // Entferne auch Text-Nodes mit diesem Text
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        while (node = walker.nextNode()) {
          const text = node.textContent || '';
          if (text.includes('⚠️') && text.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem') ||
              text.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem')) {
            const parent = node.parentNode;
            if (parent && parent instanceof Element) {
              parent.removeChild(node);
              break;
            }
          }
        }
        
        // Entferne Text auch aus Text-Nodes, wenn kein Kommentar vorhanden
        if (!task3CommentForReplacement) {
          const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
          let node: Node | null;
          while (node = walker.nextNode()) {
            let text = node.textContent || '';
            if (text.includes('⚠️') && text.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem') ||
                text.includes('Zeichne alles schön ordentlich in dein großes Koordinatensystem')) {
              text = text.replace(/⚠️\s*Zeichne alles schön ordentlich in dein großes Koordinatensystem!/gi, '');
              text = text.replace(/Zeichne alles schön ordentlich in dein großes Koordinatensystem!/gi, '');
              text = text.replace(/Zeichne alles schön ordentlich in dein großes Koordinatensystem/gi, '');
              node.textContent = text;
              // Wenn der Text-Node jetzt leer ist, entferne ihn
              if (!text.trim() && node.parentNode) {
                node.parentNode.removeChild(node);
              }
            }
          }
        }
        
        // Entferne "Viel Glück", "Viel Erfolg" und "Nicht angemeldet" aus Text-Nodes
        const walkerForRemoval = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
        let removalNode: Node | null;
        while (removalNode = walkerForRemoval.nextNode()) {
          let text = removalNode.textContent || '';
          const originalText = text;
          
          text = text.replace(/Viel Glück/gi, '');
          text = text.replace(/Viel Erfolg/gi, '');
          text = text.replace(/Nicht angemeldet/gi, '');
          
          if (text !== originalText) {
            removalNode.textContent = text;
          }
        }
        
        // Entferne alle Buttons und Submit-Buttons
        const submitButtons = doc.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(btn => btn.remove());
        const allButtons = doc.querySelectorAll('button');
        allButtons.forEach(btn => btn.remove());
        const timerElements = doc.querySelectorAll('[id*="timer"], [class*="timer"], [id*="countdown"], [class*="countdown"], [id*="time"], [class*="time"]');
        timerElements.forEach(el => el.remove());
        
        // Erstelle Map für manuelle Korrekturen
        const correctionsMap: Record<string, { points?: number; constructionPoints?: number; comment?: string }> = {};
        if (submission.corrections) {
          submission.corrections.forEach((corr) => {
            if (corr.taskNumber.match(/^3[a-d]$/)) {
              correctionsMap[corr.taskNumber] = { 
                constructionPoints: corr.manualPoints,
                comment: corr.comment
              };
            } else {
              correctionsMap[corr.taskNumber] = { 
                points: corr.manualPoints,
                comment: corr.comment
              };
            }
          });
        }
        
        // Füge Header mit Punkten und Note hinzu
        const totalAchieved = submission.totalPoints;
        const maxTotalPoints = 25;
        const gradeData = calculateGrade(totalAchieved, maxTotalPoints);
        
        const headerContainer = doc.createElement('div');
        headerContainer.style.cssText = 'margin-bottom: 20px; padding: 0;';
        const combinedHeader = doc.createElement('div');
        combinedHeader.style.cssText = `
          background-color: transparent;
          border: 3px solid #1976d2;
          color: #1976d2;
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
        nameDiv.style.cssText = 'font-size: 1.1em; font-weight: bold;';
        nameDiv.textContent = `Name: ${studentName}`;
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
            <div style="font-size: 3em; font-weight: bold;">${gradeData.string}</div>
          </div>
        `;
        combinedHeader.appendChild(leftSection);
        combinedHeader.appendChild(rightSection);
        headerContainer.appendChild(combinedHeader);
        if (doc.body) {
          doc.body.insertBefore(headerContainer, doc.body.firstChild);
        }
        
        // Füge CSS hinzu
        const style = doc.createElement('style');
        style.textContent = `
          html, body {
            border: none !important;
            outline: none !important;
            background-color: transparent !important;
            margin-top: 2% !important;
            margin-left: 2% !important;
            margin-right: 0 !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
          }
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
            min-height: 24px !important;
            height: auto !important;
            padding: 4px 8px !important;
            line-height: 1.4 !important;
            font-size: 0.85em !important;
          }
        `;
        doc.head.appendChild(style);
        
        // Fülle Antworten ein und markiere sie
        const answers = parseAnswers(submission.answers);
        
        // Durchlaufe alle Antworten und füge sie ein
        Object.entries(answers).forEach(([taskId, answer]) => {
          // Versuche verschiedene Selektoren
          let input = doc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!input) {
            input = doc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          if (!input) {
            input = doc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          // Versuche auch mit escaped ID (für IDs mit Sonderzeichen)
          if (!input && taskId.includes('_')) {
            const escapedId = taskId.replace(/_/g, '\\_');
            input = doc.querySelector(`#${escapedId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          
          if (input) {
            const answerValue = String(answer || '').trim();
            
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
                if (subtaskCorrection && subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null) {
                  achievedPoints = Number(subtaskCorrection.constructionPoints) || 0;
                }
              }
            } else {
              const taskNum = taskId.match(/a(\d+)/)?.[1];
              if (taskNum && correctionsMap[taskNum]) {
                const correction = correctionsMap[taskNum];
                if (correction.points !== undefined && correction.points !== null) {
                  achievedPoints = Number(correction.points) || 0;
                }
              }
            }
            
            // Stelle sicher, dass achievedPoints immer eine Zahl ist
            achievedPoints = Number(achievedPoints) || 0;
            
            // Setze Antwort - WICHTIG: Schülerantworten müssen immer eingefügt werden
            if (input.tagName === 'INPUT') {
              const inputEl = input as HTMLInputElement;
              if (inputEl.type === 'radio' || inputEl.type === 'checkbox') {
                // Für Checkboxen/Radiobuttons: Prüfe ob die Checkbox/Radio die richtige Antwort ist
                if (inputEl.type === 'checkbox') {
                  // Für Checkboxen: Checke, ob diese Checkbox markiert werden soll
                  if (inputEl.id === taskId || inputEl.name === taskId || inputEl.value === answerValue) {
                    inputEl.checked = true;
                  }
                } else {
                  // Für Radiobuttons: Checke wie bisher
                  if (inputEl.value === answerValue || inputEl.id === taskId || inputEl.name === taskId) {
                    inputEl.checked = true;
                  }
                }
              } else {
                // Stelle sicher, dass die Schülerantwort eingefügt wird
                inputEl.setAttribute('value', answerValue); // Setze auch das Attribut
                inputEl.value = answerValue; // Setze den Wert
                inputEl.setAttribute('readonly', 'readonly'); // Verhindere Bearbeitung
                inputEl.removeAttribute('disabled'); // Stelle sicher, dass es nicht disabled ist
              }
            } else if (input.tagName === 'TEXTAREA') {
              const textareaEl = input as HTMLTextAreaElement;
              textareaEl.textContent = answerValue; // Setze auch textContent
              textareaEl.value = answerValue; // Setze den Wert
              textareaEl.setAttribute('readonly', 'readonly'); // Verhindere Bearbeitung
              textareaEl.removeAttribute('disabled'); // Stelle sicher, dass es nicht disabled ist
            } else if (input.tagName === 'SELECT') {
              const selectEl = input as HTMLSelectElement;
              selectEl.value = answerValue; // Setze den Wert
              // Für Select: Setze auch selectedIndex falls möglich
              for (let i = 0; i < selectEl.options.length; i++) {
                if (selectEl.options[i].value === answerValue) {
                  selectEl.selectedIndex = i;
                  break;
                }
              }
              selectEl.setAttribute('disabled', 'disabled'); // Verhindere Bearbeitung
            }
            
            // Markiere als richtig oder falsch
            if (achievedPoints > 0) {
              input.classList.add('answer-correct');
            } else if (maxPoints > 0) {
              input.classList.add('answer-incorrect');
            }
            
            // Füge Punkte-Badge hinzu
            // WICHTIG: Überspringe Aufgabe 3 Inputs - die werden später in blauen Kästen angezeigt
            const isTask3Input = taskId.startsWith('a3');
            // WICHTIG: Prüfe, ob dieses Input bereits ein Badge hat (nicht nur im Parent)
            const hasExistingBadge = input.parentElement?.querySelector(`.points-badge[data-input-id="${taskId}"]`) !== null;
            if (maxPoints > 0 && !hasExistingBadge && !isTask3Input) {
              const container = doc.createElement('span');
              container.style.display = 'inline-flex';
              container.style.alignItems = 'center';
              container.style.gap = '5px';
              container.style.marginLeft = '5px';
              
              if (input.parentElement) {
                const parent = input.parentElement;
                parent.insertBefore(container, input);
                container.appendChild(input);
                
                const pointsBadge = doc.createElement('span');
                pointsBadge.className = `points-badge ${achievedPoints > 0 ? 'points-correct' : 'points-incorrect'}`;
                pointsBadge.setAttribute('data-input-id', taskId);
                // Stelle sicher, dass achievedPoints eine Zahl ist, bevor toFixed() aufgerufen wird
                const safeAchievedPoints = Number(achievedPoints) || 0;
                const safeMaxPoints = Number(maxPoints) || 0;
                const pointsText = (safeMaxPoints % 1 === 0 && safeAchievedPoints % 1 === 0)
                  ? `${safeAchievedPoints}/${safeMaxPoints}` 
                  : `${safeAchievedPoints.toFixed(2)}/${safeMaxPoints}`;
                pointsBadge.textContent = pointsText;
                container.appendChild(pointsBadge);
              }
            }
          }
        });
        
        // Stelle sicher, dass alle Input-Werte im HTML erhalten bleiben - MACHEN WIR ZWEIMAL
        Object.entries(answers).forEach(([taskId, answer]) => {
          let input = doc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!input) {
            input = doc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          if (!input) {
            input = doc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          
          if (input) {
            const answerValue = String(answer || '').trim();
            // Setze sowohl value-Attribut als auch den Wert nochmal
            if (input.tagName === 'INPUT') {
              const inputEl = input as HTMLInputElement;
              if (inputEl.type !== 'radio' && inputEl.type !== 'checkbox') {
                inputEl.setAttribute('value', answerValue);
                inputEl.value = answerValue;
                // Entferne number input arrows
                if (inputEl.type === 'number') {
                  inputEl.style.cssText += ' -moz-appearance: textfield !important;';
                  // Entferne WebKit arrows
                  const style = doc.createElement('style');
                  style.textContent = `
                    input[type="number"]::-webkit-inner-spin-button,
                    input[type="number"]::-webkit-outer-spin-button {
                      -webkit-appearance: none !important;
                      margin: 0 !important;
                    }
                    input[type="number"] {
                      -moz-appearance: textfield !important;
                    }
                  `;
                  if (!doc.head.querySelector('style[data-hide-number-arrows]')) {
                    style.setAttribute('data-hide-number-arrows', 'true');
                    doc.head.appendChild(style);
                  }
                }
              }
            } else if (input.tagName === 'TEXTAREA') {
              const textareaEl = input as HTMLTextAreaElement;
              textareaEl.textContent = answerValue;
              textareaEl.value = answerValue;
            } else if (input.tagName === 'SELECT') {
              const selectEl = input as HTMLSelectElement;
              selectEl.value = answerValue;
              selectEl.setAttribute('value', answerValue);
            }
          }
        });
        
        // Füge CSS hinzu um number input arrows zu entfernen
        if (!doc.head.querySelector('style[data-hide-number-arrows]')) {
          const style = doc.createElement('style');
          style.setAttribute('data-hide-number-arrows', 'true');
          style.textContent = `
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button {
              -webkit-appearance: none !important;
              margin: 0 !important;
            }
            input[type="number"] {
              -moz-appearance: textfield !important;
            }
          `;
          doc.head.appendChild(style);
        }
        
        // Gruppiere Input-Felder für Aufgabe 3 im Format A₁(Input | Input), B₁(...), etc.
        // Struktur: a3a_x, a3a_y = A₁; a3b_x, a3b_y = B₁; a3c_x, a3c_y = C₁ (für Teilaufgabe a)
        //           a3d_x, a3d_y = A₂; a3e_x, a3e_y = B₂; a3f_x, a3f_y = C₂ (für Teilaufgabe b)
        //           etc.
        const task3InputsMap: Record<string, {xInput?: HTMLInputElement; yInput?: HTMLInputElement; pointLabel: string; subtask: string}> = {};
        
        // Sammle alle Aufgabe-3-Inputs
        const allTask3Inputs = doc.querySelectorAll('input[id^="a3"], input[name^="a3"]');
        
        allTask3Inputs.forEach((input) => {
          const inputEl = input as HTMLInputElement;
          const inputId = inputEl.id || inputEl.name || '';
          
          // Parse ID: a3a_x, a3a_y, etc.
          const match = inputId.match(/a3([a-l])_([xy])/i);
          if (match) {
            const letter = match[1].toLowerCase();
            const coord = match[2].toLowerCase();
            
            // Mappe Buchstaben zu Punkten und Teilaufgaben
            // a, b, c = A₁, B₁, C₁ (Teilaufgabe a)
            // d, e, f = A₂, B₂, C₂ (Teilaufgabe b)
            // g, h, i = A₃, B₃, C₃ (Teilaufgabe c)
            // j, k, l = A₄, B₄, C₄ (Teilaufgabe d)
            const pointMap: Record<string, {point: string; subtask: string}> = {
              'a': {point: 'A₁', subtask: 'a'}, 'b': {point: 'B₁', subtask: 'a'}, 'c': {point: 'C₁', subtask: 'a'},
              'd': {point: 'A₂', subtask: 'b'}, 'e': {point: 'B₂', subtask: 'b'}, 'f': {point: 'C₂', subtask: 'b'},
              'g': {point: 'A₃', subtask: 'c'}, 'h': {point: 'B₃', subtask: 'c'}, 'i': {point: 'C₃', subtask: 'c'},
              'j': {point: 'A₄', subtask: 'd'}, 'k': {point: 'B₄', subtask: 'd'}, 'l': {point: 'C₄', subtask: 'd'}
            };
            
            const pointInfo = pointMap[letter];
            if (pointInfo) {
              const key = `a3${letter}`;
              if (!task3InputsMap[key]) {
                task3InputsMap[key] = {pointLabel: pointInfo.point, subtask: pointInfo.subtask};
              }
              if (coord === 'x') {
                task3InputsMap[key].xInput = inputEl;
              } else if (coord === 'y') {
                task3InputsMap[key].yInput = inputEl;
              }
            }
          }
        });
        
        // Erstelle gruppierte Formatierung für jeden Punkt
        Object.entries(task3InputsMap).forEach(([key, pointData]) => {
          const {xInput, yInput, pointLabel} = pointData;
          
          if (xInput && yInput) {
            // Stelle sicher, dass die Werte gesetzt sind
            const xValue = answers[xInput.id] || xInput.value || '';
            const yValue = answers[yInput.id] || yInput.value || '';
            
            // Setze die Werte explizit
            xInput.value = String(xValue);
            xInput.setAttribute('value', String(xValue));
            yInput.value = String(yValue);
            yInput.setAttribute('value', String(yValue));
            
            // Finde das Container-DIV, das beide Inputs enthält (das div mit display: flex)
            // Die Struktur ist: <div style="display: flex; align-items: center; gap: 5px;">
            //   <span>A₁(</span>
            //   <input id="a3a_x">
            //   <span>|</span>
            //   <input id="a3a_y">
            //   <span>)</span>
            // </div>
            let containerDiv: HTMLElement | null = null;
            let current: HTMLElement | null = xInput.parentElement as HTMLElement;
            
            // Suche nach dem div-Container, der beide Inputs enthält
            while (current && current !== doc.body) {
              if (current.tagName === 'DIV' && 
                  current.contains(xInput) && 
                  current.contains(yInput) &&
                  current.style.display === 'flex') {
                containerDiv = current;
                break;
              }
              current = current.parentElement as HTMLElement;
            }
            
            if (containerDiv) {
              // Erstelle neuen Container für gruppierte Anzeige
              const newContainer = doc.createElement('span');
              newContainer.style.cssText = 'display: inline-block; margin-right: 8px;';
              
              // Label
              const labelSpan = doc.createElement('span');
              labelSpan.textContent = `${pointLabel}( `;
              labelSpan.style.cssText = 'display: inline;';
              newContainer.appendChild(labelSpan);
              
              // Entferne Inputs aus dem alten Container
              containerDiv.removeChild(xInput);
              containerDiv.removeChild(yInput);
              
              // Entferne auch die Separator-Spans (| und ))
              const spans = Array.from(containerDiv.querySelectorAll('span'));
              spans.forEach(span => {
                const text = span.textContent || '';
                if (text === '|' || text === ')') {
                  containerDiv!.removeChild(span);
                }
              });
              
              // Füge die Inputs in den neuen Container ein
              xInput.setAttribute('readonly', 'readonly');
              xInput.setAttribute('disabled', 'disabled');
              xInput.style.cssText = 'min-height: 24px; padding: 4px 8px; font-size: 0.85em; display: inline-block; width: 60px; -moz-appearance: textfield !important;';
              xInput.style.cssText += ' -webkit-appearance: none !important; margin: 0 !important;';
              newContainer.appendChild(xInput);
              
              // Separator
              const separatorSpan = doc.createElement('span');
              separatorSpan.textContent = ' | ';
              separatorSpan.style.cssText = 'display: inline; margin: 0 4px;';
              newContainer.appendChild(separatorSpan);
              
              yInput.setAttribute('readonly', 'readonly');
              yInput.setAttribute('disabled', 'disabled');
              yInput.style.cssText = 'min-height: 24px; padding: 4px 8px; font-size: 0.85em; display: inline-block; width: 60px; -moz-appearance: textfield !important;';
              yInput.style.cssText += ' -webkit-appearance: none !important; margin: 0 !important;';
              newContainer.appendChild(yInput);
              
              // Closing
              const closingSpan = doc.createElement('span');
              closingSpan.textContent = ' )';
              closingSpan.style.cssText = 'display: inline;';
              newContainer.appendChild(closingSpan);
              
              // Ersetze das alte Container-DIV durch den neuen Container
              if (containerDiv.parentElement) {
                containerDiv.parentElement.insertBefore(newContainer, containerDiv);
                containerDiv.remove();
              }
            }
          }
        });
        
        // Füge Bewertungen bei Aufgabe 3 hinzu (Koordinatenpunkte + Konstruktionspunkte und Kommentare)
        if (submission.corrections) {
          // Sammle alle Aufgabe-3-Korrekturen
          const task3Corrections = submission.corrections.filter(corr => corr.taskNumber.match(/^3[a-d]$/));
          
          // Gruppiere nach Teilaufgabe (a, b, c, d)
          const correctionsBySubtask: Record<string, typeof submission.corrections[0]> = {};
          let overallComment = '';
          
          task3Corrections.forEach((corr) => {
            const subtask = corr.taskNumber.replace('3', '');
            correctionsBySubtask[subtask] = corr;
            // Sammle Kommentare - der letzte Kommentar wird verwendet
            if (corr.comment) {
              overallComment = corr.comment;
            }
          });
          
          // Mappe Teilaufgaben zu Koordinaten-IDs
          const subtaskToCoordinates: Record<string, string[]> = {
            'a': ['a3a_x', 'a3a_y', 'a3b_x', 'a3b_y', 'a3c_x', 'a3c_y'],
            'b': ['a3d_x', 'a3d_y', 'a3e_x', 'a3e_y', 'a3f_x', 'a3f_y'],
            'c': ['a3g_x', 'a3g_y', 'a3h_x', 'a3h_y', 'a3i_x', 'a3i_y'],
            'd': ['a3j_x', 'a3j_y', 'a3k_x', 'a3k_y', 'a3l_x', 'a3l_y']
          };
          
          // Maximalpunkte: 1.5 Punkte für Koordinaten (6 × 0.25) + 2 Punkte für Konstruktion = 3.5 Punkte pro Teilaufgabe
          const maxCoordinatePoints = 1.5;
          const maxConstructionPoints = 2;
          
          // Füge Bewertungsbox direkt nach jeder Teilaufgabe hinzu (in neuer Zeile)
          // WICHTIG: Gehe in umgekehrter Reihenfolge (d, c, b, a), damit die Positionierung nicht durcheinander kommt
          ['d', 'c', 'b', 'a'].forEach((subtask) => {
            const corr = correctionsBySubtask[subtask];
            
            // Berechne erreichte Koordinatenpunkte für diese Teilaufgabe
            const coordinateIds = subtaskToCoordinates[subtask] || [];
            let achievedCoordinatePoints = 0;
            coordinateIds.forEach((coordId) => {
              const studentAnswer = answers[coordId];
              if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '') {
                if (isAnswerCorrect(coordId, studentAnswer)) {
                  achievedCoordinatePoints += 0.25;
                }
              }
            });
            
            // Hole Konstruktionspunkte aus Korrekturen
            const achievedConstructionPoints = corr && corr.manualPoints !== undefined && corr.manualPoints !== null 
              ? Number(corr.manualPoints) 
              : 0;
            
            // Finde den input-group Container für diese Teilaufgabe
            // Suche nach dem input-group, der die Koordinaten dieser Teilaufgabe enthält
            const subtaskLabel = subtask === 'a' ? '₁' : subtask === 'b' ? '₂' : subtask === 'c' ? '₃' : '₄';
            
            // Finde alle input-group Container
            const allInputGroups = Array.from(doc.querySelectorAll('.input-group.full-width'));
            let targetInputGroup: HTMLElement | null = null;
            
            // Suche nach dem input-group, der die Koordinaten dieser Teilaufgabe enthält
            for (const inputGroup of allInputGroups) {
              const label = inputGroup.querySelector('label');
              if (label) {
                const labelText = label.textContent || '';
                // Prüfe ob dieser input-group zu dieser Teilaufgabe gehört
                if (subtask === 'a' && labelText.includes('a)') && labelText.includes('A₁')) {
                  targetInputGroup = inputGroup as HTMLElement;
                  break;
                } else if (subtask === 'b' && labelText.includes('b)') && labelText.includes('A₂')) {
                  targetInputGroup = inputGroup as HTMLElement;
                  break;
                } else if (subtask === 'c' && labelText.includes('c)') && labelText.includes('A₃')) {
                  targetInputGroup = inputGroup as HTMLElement;
                  break;
                } else if (subtask === 'd' && labelText.includes('d)') && labelText.includes('A₄')) {
                  targetInputGroup = inputGroup as HTMLElement;
                  break;
                }
              }
            }
            
            if (targetInputGroup) {
              // Erstelle Bewertungsbox in neuer Zeile (blauer Kasten)
              const pointsBoxDiv = doc.createElement('div');
              pointsBoxDiv.style.cssText = `
                display: block !important;
                width: 100% !important;
                margin-top: 12px !important;
                margin-bottom: 16px !important;
                padding: 8px 12px !important;
                background-color: #e3f2fd !important;
                border: 1px solid #90caf9 !important;
                border-radius: 4px !important;
                font-size: 0.9em !important;
                clear: both !important;
              `;
              
              // Format: "xx / 1.5 Punkten + xx / 2 Konstruktionspunkte"
              const coordinatePointsText = achievedCoordinatePoints % 1 === 0 
                ? `${achievedCoordinatePoints.toFixed(0)}` 
                : `${achievedCoordinatePoints.toFixed(2)}`;
              const constructionPointsText = achievedConstructionPoints % 1 === 0
                ? `${achievedConstructionPoints.toFixed(0)}`
                : `${achievedConstructionPoints.toFixed(2)}`;
              
              pointsBoxDiv.innerHTML = `${coordinatePointsText} / ${maxCoordinatePoints.toFixed(1)} Punkten + ${constructionPointsText} / ${maxConstructionPoints.toFixed(0)} Konstruktionspunkten`;
              
              // Füge direkt nach dem input-group ein (neue Zeile)
              if (targetInputGroup.parentElement) {
                targetInputGroup.parentElement.insertBefore(pointsBoxDiv, targetInputGroup.nextSibling);
              }
            }
          });
          
          // Finde das letzte Element von Aufgabe 3 (die letzte Bewertungsbox für Teilaufgabe d)
          const allPointsBoxes = Array.from(doc.querySelectorAll('div')).filter(div => {
            const text = div.textContent || '';
            return text.includes('Punkten') && text.includes('Konstruktionspunkten');
          });
          
          let lastTask3Element: HTMLElement | null = null;
          if (allPointsBoxes.length > 0) {
            lastTask3Element = allPointsBoxes[allPointsBoxes.length - 1] as HTMLElement;
          }
          
          // Füge Kommentar ganz am Ende hinzu (falls vorhanden) - NACH allen Bewertungsboxen
          // WICHTIG: Nur einmal hinzufügen, nicht doppelt!
          if (task3CommentForReplacement && lastTask3Element) {
            // Prüfe ob bereits ein Kommentar-Kasten existiert
            const existingCommentBox = Array.from(doc.querySelectorAll('div')).find(div => {
              const text = div.textContent || '';
              return text.includes('💬 Kommentar:') || text.includes('Kommentar:');
            });
            
            if (!existingCommentBox) {
              const commentBox = doc.createElement('div');
              commentBox.style.cssText = `
                margin-top: 16px;
                margin-bottom: 16px;
                padding: 12px 16px;
                background-color: #c8e6c9;
                border: 2px solid #4caf50;
                border-left: 5px solid #4caf50;
                border-radius: 6px;
                font-size: 0.95em;
                line-height: 1.6;
                display: block;
                width: 100%;
              `;
              
              const titleDiv = doc.createElement('div');
              titleDiv.style.cssText = 'font-weight: bold; font-size: 1.05em; color: #2e7d32; margin-bottom: 8px;';
              titleDiv.textContent = '💬 Kommentar:';
              
              const commentDiv = doc.createElement('div');
              commentDiv.style.cssText = 'color: #1b5e20; white-space: pre-wrap;';
              commentDiv.textContent = task3CommentForReplacement;
              
              commentBox.appendChild(titleDiv);
              commentBox.appendChild(commentDiv);
              
              if (lastTask3Element.parentElement) {
                lastTask3Element.parentElement.insertBefore(commentBox, lastTask3Element.nextSibling);
                lastTask3Element = commentBox;
              }
            }
          }
          
          // FINALE BEREINIGUNG: Entferne ALLES nach dem letzten Aufgabe-3-Element (Bewertungsbox oder Kommentar)
          if (lastTask3Element) {
            // Finde das Container-Element, das das letzte Element enthält
            let container = lastTask3Element.parentElement;
            while (container && container !== doc.body) {
              // Entferne alle nachfolgenden Geschwister
              let nextSibling = container.nextSibling;
              while (nextSibling) {
                const toRemove = nextSibling;
                nextSibling = nextSibling.nextSibling;
                toRemove.remove();
              }
              container = container.parentElement;
            }
            
            // Entferne alle Body-Kinder nach dem Container
            const bodyChildren = Array.from(doc.body.children);
            let foundLastElement = false;
            for (const child of bodyChildren) {
              if (child.contains(lastTask3Element) || child === lastTask3Element) {
                foundLastElement = true;
                // Finde das größte Container-Element, das lastTask3Element enthält
                let largestContainer: Element = child;
                let current: Element | null = child;
                while (current && current !== doc.body) {
                  if (current.contains(lastTask3Element)) {
                    largestContainer = current;
                  }
                  current = current.parentElement;
                }
                // Entferne alle nachfolgenden Geschwister dieses Containers
                let nextSibling = largestContainer.nextSibling;
                while (nextSibling) {
                  const toRemove = nextSibling;
                  nextSibling = nextSibling.nextSibling;
                  toRemove.remove();
                }
              } else if (foundLastElement) {
                child.remove();
              }
            }
          }
        }
        
        // Stelle sicher, dass alle Input-Werte im HTML erhalten bleiben
        // Durchlaufe nochmal alle Inputs und setze die value-Attribute explizit
        Object.entries(answers).forEach(([taskId, answer]) => {
          let input = doc.querySelector(`#${taskId}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!input) {
            input = doc.querySelector(`[name="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          if (!input) {
            input = doc.querySelector(`[data-task-id="${taskId}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          }
          
          if (input) {
            const answerValue = String(answer || '').trim();
            // Setze sowohl value-Attribut als auch den Wert
            if (input.tagName === 'INPUT') {
              const inputEl = input as HTMLInputElement;
              if (inputEl.type !== 'radio' && inputEl.type !== 'checkbox') {
                inputEl.setAttribute('value', answerValue);
                inputEl.value = answerValue;
              }
            } else if (input.tagName === 'TEXTAREA') {
              const textareaEl = input as HTMLTextAreaElement;
              textareaEl.textContent = answerValue;
              textareaEl.value = answerValue;
            } else if (input.tagName === 'SELECT') {
              const selectEl = input as HTMLSelectElement;
              selectEl.value = answerValue;
              selectEl.setAttribute('value', answerValue);
            }
          }
        });
        
        // Konvertiere zurück zu HTML-String
        const modifiedHtml = doc.documentElement.outerHTML;
        const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
        zip.file(`${safeName}_${fileName.replace('.html', '') || 'abgabe'}.html`, modifiedHtml);
      }
      
      // Generiere ZIP und lade herunter
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFileName = `Alle_Abgaben_HTML_${fileName.replace('.html', '') || 'statistik'}.zip`;
      saveAs(zipBlob, zipFileName);

      alert(`✅ ${sortedSubmissions.length + 1} HTML-Dateien (inkl. Musterlösung) erfolgreich in ZIP-Datei gepackt!`);
    } catch (error) {
      console.error('Fehler beim HTML-Export:', error);
      alert(`❌ Fehler beim HTML-Export: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setExportingHTML(false);
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
          setLearningGroupId(group.id);
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
                Fehlende anschreiben
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Print sx={{ fontSize: 16 }} />}
                onClick={exportToHTML}
                disabled={exportingHTML}
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
                {exportingHTML ? 'Exportiert...' : 'HTML Download'}
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
                  <Box sx={{ p: 1, bgcolor: 'transparent', borderRadius: 1 }}>
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
                      bgcolor: 'transparent',
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

      {/* Dialog für Kategorieauswahl */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Noten freigeben - Kategorie auswählen
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            Wählen Sie die Kategorie aus dem Notenschema aus, in die die HÜ-Noten eingetragen werden sollen:
          </Typography>
          
          {availableCategories.length === 0 ? (
            <Alert severity="info">
              Keine Kategorien gefunden. Bitte erstellen Sie zuerst ein Notenschema für diese Lerngruppe.
            </Alert>
          ) : (
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {gradingSchemas.map((schema) => {
                const schemaCategories = availableCategories.filter(c => c.schemaId === schema.id);
                if (schemaCategories.length === 0) return null;
                
                return (
                  <Box key={schema.id} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1976d2' }}>
                      {schema.name}
                    </Typography>
                    {schemaCategories.map((category) => (
                      <Button
                        key={`${category.schemaId}_${category.categoryName}`}
                        fullWidth
                        variant={selectedCategory?.schemaId === category.schemaId && selectedCategory?.categoryName === category.categoryName ? 'contained' : 'outlined'}
                        onClick={() => setSelectedCategory(category)}
                        sx={{
                          mb: 0.5,
                          justifyContent: 'flex-start',
                          textTransform: 'none',
                          bgcolor: selectedCategory?.schemaId === category.schemaId && selectedCategory?.categoryName === category.categoryName ? '#1976d2' : 'transparent',
                          '&:hover': {
                            bgcolor: selectedCategory?.schemaId === category.schemaId && selectedCategory?.categoryName === category.categoryName ? '#1565c0' : '#f5f5f5'
                          }
                        }}
                      >
                        {category.categoryName}
                      </Button>
                    ))}
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenCategoryDialog(false);
            setSelectedCategory(null);
          }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirmReleaseGrades}
            variant="contained"
            disabled={!selectedCategory || availableCategories.length === 0}
            sx={{ bgcolor: '#1976d2' }}
          >
            Noten speichern und freigeben
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DreierprobeModal;

