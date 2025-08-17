import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  School as SchoolIcon,
  QuestionAnswer as QuizIcon,
  Edit as EditIcon,
  Grade as GradeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { QuizResultsModal } from './QuizResultsModal';
import EmojiSelector from './EmojiSelector';

interface Teacher {
  id: string;
  name: string;
}

interface LearningGroup {
  id: string;
  name: string;
  teacher: Teacher;
}

interface Assignment {
  id: string;
  type: string;
  refId: string;
  name?: string;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface Block {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
}

interface Unit {
  id: string;
  name: string;
  description?: string;
  blockId: string;
}

interface Topic {
  id: string;
  name: string;
  description?: string;
  unitId: string;
}

interface Lesson {
  id: string;
  name: string;
  description?: string;
  topicId: string;
  materials?: any[];
  lessonQuizzes?: any[];
}

interface GradingSchema {
  id: string;
  name: string;
  structure: string;
  gradingSystem?: string;
}

interface Grade {
  id: string;
  categoryName: string;
  grade: number;
  weight: number;
}

interface StudentDashboardProps {
  userId: string;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const [lerngruppen, setLerngruppen] = useState<LearningGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  
  // States für Inhalte
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materialsMap, setMaterialsMap] = useState<{[key: string]: any[]}>({});
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [quizzesMap, setQuizzesMap] = useState<{[key: string]: any}>({});
  
  // States für Noten
  const [gradingSchemas, setGradingSchemas] = useState<{[groupId: string]: GradingSchema}>({});
  const [grades, setGrades] = useState<{[groupId: string]: Grade[]}>({});
  const [gradesLoading, setGradesLoading] = useState(false);
  
  // Assignment Maps wie im TeacherDashboard
  const [subjectAssignments, setSubjectAssignments] = useState<{ [subjectId: string]: string[] }>({});
  const [blockAssignments, setBlockAssignments] = useState<{ [blockId: string]: string[] }>({});
  const [unitAssignments, setUnitAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [topicAssignments, setTopicAssignments] = useState<{ [topicId: string]: string[] }>({});
  const [lessonAssignments, setLessonAssignments] = useState<{ [lessonId: string]: string[] }>({});

  // Emoji-Auswahl States
  const [selectedEmoji, setSelectedEmoji] = useState<string>('🧙‍♂️');
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [isUpdatingEmoji, setIsUpdatingEmoji] = useState(false);
  
  // Noten-Sektion aufklappbar
  const [gradesExpanded, setGradesExpanded] = useState(false);

  // Neue States für echte Ordner-Vorschau (exakt wie im TeacherDashboard)
  const [assignedFolderContents, setAssignedFolderContents] = useState<{[key: string]: any[]}>({});
  const [expandedAssignedFolders, setExpandedAssignedFolders] = useState<{[key: string]: Set<string>}>({});
  const [loadingFolderContents, setLoadingFolderContents] = useState<{[key: string]: boolean}>({});
  const [assignedFolders, setAssignedFolders] = useState<{[groupId: string]: string[]}>({});

  // Spielerische Farbpalette
  const colors = {
    primary: '#2E7D32', // Dunkleres Grün für besseren Kontrast
    secondary: '#F57C00', // Dunkleres Orange
    accent1: '#1976D2', // Dunkleres Blau
    accent2: '#C2185B', // Dunkleres Pink
    background: '#F8FAFC', // Helleres, moderneres Blau
    cardBg: '#FFFFFF',
    success: '#4CAF50',
    textPrimary: '#2C3E50', // Dunkler Text für bessere Lesbarkeit
    textSecondary: '#7F8C8D', // Grauer Text für Sekundärinformationen
  };

  // Emoji-Auswahl Handler
  const handleEmojiSelect = async (emoji: string) => {
    setSelectedEmoji(emoji);
    setIsUpdatingEmoji(true);
    
    try {
      const response = await fetch(`/api/users/${userId}/avatar-emoji`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarEmoji: emoji }),
      });
      
      if (response.ok) {
        console.log('Avatar emoji saved successfully:', emoji);
      } else {
        console.error('Failed to save avatar emoji');
        // Fallback: Emoji zurücksetzen
        setSelectedEmoji('🧙‍♂️');
      }
    } catch (error) {
      console.error('Error saving avatar emoji:', error);
      // Fallback: Emoji zurücksetzen
      setSelectedEmoji('🧙‍♂️');
    } finally {
      setIsUpdatingEmoji(false);
    }
  };

  const handleOpenEmojiSelector = () => {
    setShowEmojiSelector(true);
  };

  const handleCloseEmojiSelector = () => {
    setShowEmojiSelector(false);
  };

  // Hilfsfunktion zum Laden des Student-Namens und Avatar-Emojis
  const fetchStudentData = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setStudentName(userData.name);
        // Lade gespeichertes Emoji oder verwende Standard
        if (userData.avatarEmoji) {
          setSelectedEmoji(userData.avatarEmoji);
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      setStudentName("Schüler"); // Fallback
    }
  };

  // Hilfsfunktion zum Laden der Zuweisungen
  const fetchAssignments = async (groups: LearningGroup[]) => {
    const assignmentsData: Assignment[] = [];
    const subj: { [id: string]: string[] } = {};
    const block: { [id: string]: string[] } = {};
    const unit: { [id: string]: string[] } = {};
    const topic: { [id: string]: string[] } = {};
    const lesson: { [id: string]: string[] } = {};
    
    for (const group of groups) {
      try {
        const response = await fetch(`/api/learning-groups/${group.id}/assignments`);
        if (response.ok) {
          const data = await response.json();
          assignmentsData.push(...data);
          
          // Erstelle Assignment Maps wie im TeacherDashboard
          for (const a of data) {
            if (a.type === 'subject') {
              subj[a.refId] = [...(subj[a.refId] || []), group.id];
            } else if (a.type === 'block') {
              block[a.refId] = [...(block[a.refId] || []), group.id];
            } else if (a.type === 'unit') {
              unit[a.refId] = [...(unit[a.refId] || []), group.id];
            } else if (a.type === 'topic') {
              topic[a.refId] = [...(topic[a.refId] || []), group.id];
            } else if (a.type === 'lesson') {
              lesson[a.refId] = [...(lesson[a.refId] || []), group.id];
            }
          }
        }
      } catch (error) {
        console.error('Error fetching assignments for group:', group.id, error);
      }
    }
    
    setAssignments(assignmentsData);
    setSubjectAssignments(subj);
    setBlockAssignments(block);
    setUnitAssignments(unit);
    setTopicAssignments(topic);
    setLessonAssignments(lesson);
    
    return assignmentsData;
  };

  // Hilfsfunktion zum Laden der Namen für Assignments
  const fetchNameForAssignment = async (type: string, refId: string) => {
    let url = '';
    if (type === 'subject') url = `/api/subjects/${refId}`;
    if (type === 'block') url = `/api/blocks/${refId}`;
    if (type === 'unit') url = `/api/units/${refId}`;
    if (type === 'topic') url = `/api/topics/${refId}`;
    if (type === 'lesson') url = `/api/lessons/${refId}`;
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return data.name || null;
    } catch {
      return null;
    }
  };

  // Neue Funktion zum Laden der zugeordneten Ordner (exakt wie im TeacherDashboard)
  const fetchAssignedFolders = async (groupId: string) => {
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/folders`);
      if (response.ok) {
        const folders = await response.json();
        const folderPaths = folders.map((f: any) => f.path);
        
        setAssignedFolders(prev => ({
          ...prev,
          [groupId]: folderPaths
        }));

        // Lade den Inhalt aller zugeordneten Ordner
        folderPaths.forEach((folderPath: string) => {
          fetchAssignedFolderContent(groupId, folderPath);
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der zugeordneten Ordner:', error);
    }
  };

  // Neue Funktion zum Laden des Inhalts zugeordneter Ordner (exakt wie im TeacherDashboard)
  const fetchAssignedFolderContent = async (groupId: string, folderPath: string) => {
    try {
      setLoadingFolderContents(prev => ({
        ...prev,
        [`${groupId}:${folderPath}`]: true
      }));

      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=true`);
      if (response.ok) {
        const content = await response.json();
        console.log('API Response for folder:', folderPath, content); // Debug-Ausgabe
        
        let items: any[] = [];
        if (content.root) {
          items = content.root.children || [];
        } else if (content.items) {
          items = content.items;
        }
        
        console.log('Processed items:', items); // Debug-Ausgabe
        
        setAssignedFolderContents(prev => ({
          ...prev,
          [`${groupId}:${folderPath}`]: items
        }));
      }
    } catch (error) {
      console.error('Fehler beim Laden des Ordnerinhalts:', error);
    } finally {
      setLoadingFolderContents(prev => ({
        ...prev,
        [`${groupId}:${folderPath}`]: false
      }));
    }
  };

  // Neue Funktion zum Umschalten der Vorschau zugeordneter Ordner (exakt wie im TeacherDashboard)
  const toggleAssignedFolderExpanded = (groupId: string, folderPath: string) => {
    setExpandedAssignedFolders(prev => {
      const groupExpanded = prev[groupId] || new Set();
      const newGroupExpanded = new Set(groupExpanded);
      
      if (newGroupExpanded.has(folderPath)) {
        newGroupExpanded.delete(folderPath);
      } else {
        newGroupExpanded.add(folderPath);
      }
      
      return {
        ...prev,
        [groupId]: newGroupExpanded
      };
    });
  };

  // Neue Funktion zum Rendern der echten Ordner-Vorschau (exakt wie im Screenshot)
  const renderAssignedFolderPreview = (groupId: string, folderPath: string) => {
    const items = assignedFolderContents[`${groupId}:${folderPath}`] || [];
    const isLoading = loadingFolderContents[`${groupId}:${folderPath}`] || false;
    
    // Rekursive Funktion zum Rendern aller Ebenen
    const renderItemRecursively = (item: any, level: number = 0) => {
      
      // Bestimme Icon und Farbe basierend auf dem Screenshot
      let icon = '📁';
      let color = '#666';
      let fontWeight = 400;
      
      if (item.type === 'directory') {
        // Exakte Icons und Farben aus dem Screenshot
        if (level === 0) {
          // Level 0: Top-Level (wie "3D Druck", "Micro Bit", "Ganze und rationale Zahlen")
          icon = '📚'; // Bücher für Hauptthemen
          color = '#9c27b0'; // Lila
          fontWeight = 600;
        } else if (level === 1) {
          // Level 1: Second-Level (wie "1. Grundlagen", "Grundlagen")
          icon = '📖'; // Buch für Unterkategorien
          color = '#1976d2'; // Blau
          fontWeight = 500;
        } else if (level === 2) {
          // Level 2: Third-Level (wie "1. Blick in die Vergangenheit", "2. Technischer Aufbau")
          icon = '📚'; // Grüner Bücherstapel
          color = '#2e7d32'; // Grün
          fontWeight = 500;
        } else if (level === 3) {
          // Level 3: Fourth-Level und weitere Ebenen
          icon = '📁'; // Standard Ordner
          color = '#666'; // Grau
          fontWeight = 400;
        } else {
          // Weitere Ebenen
          icon = '📁'; // Standard Ordner
          color = '#666'; // Grau
          fontWeight = 400;
        }
      } else {
        // Dateien
        icon = '📄'; // Dokument
        color = '#03a9f4'; // Hellblau für Dateien (wie im Screenshot)
        fontWeight = 400;
      }
      
      return (
        <Box key={`${item.name}-${level}`} sx={{ mb: 0.7 }}>
          <Typography variant="body2" sx={{ 
            color: color,
            fontSize: '0.75rem',
            fontWeight: fontWeight,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0.5,
            mb: 0.5,
            cursor: item.type === 'file' ? 'pointer' : 'default',
            textDecoration: 'none',
            wordBreak: 'break-word',
            maxWidth: '100%',
            '&:hover': item.type === 'file' ? {
              color: '#1976D2'
            } : {}
          }}
          onClick={() => {
            if (item.type === 'file') {
              handleFileClick(item);
            }
          }}
          >
            {/* Dreiecke nur für Ordner - exakt wie im Screenshot */}
            {item.type === 'directory' ? (
              level === 0 ? (
                <span style={{ color: '#9c27b0' }}>▼</span> // Lila für Level 0
              ) : level === 1 ? (
                <span style={{ color: '#1976d2' }}>▼</span> // Blau für Level 1
              ) : level === 2 ? (
                <span style={{ color: '#2e7d32' }}>▼</span> // Grün für Level 2
              ) : level === 3 ? (
                <span style={{ color: '#666' }}>▼</span> // Grau für Level 3
              ) : (
                <span style={{ color: '#666' }}>▼</span> // Grau für weitere Ebenen
              )
            ) : null} {/* Kein Dreieck für Dateien */}
            {icon} {item.name}
          </Typography>
          
          {/* Rekursive Anzeige für ALLE Unterordner und Dateien - IMMER aufgeklappt */}
          {item.type === 'directory' && item.children && item.children.length > 0 && (
            <Box sx={{ ml: 2, mb: 0.7 }}>
              {item.children.map((child: any, childIndex: number) => 
                renderItemRecursively(child, level + 1)
              )}
            </Box>
          )}
        </Box>
      );
    };
    
    return (
      <Box key={folderPath} sx={{ mb: 1.4 }}>
        {/* Hauptordner - Grauer Ordner mit rotem Dreieck (immer aufgeklappt) */}
        <Box sx={{ 
          p: 1.4,
          borderRadius: 1.4,
          bgcolor: '#f8f9fa',
          border: '1px solid #e9ecef',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: '#e9ecef'
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ 
              color: '#D32F2F', // Rot wie im Screenshot
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              ▼ 📁 {folderPath.split('/').pop() || folderPath}
            </Typography>
          </Box>
        </Box>
        
        {/* Vorschau des Ordnerinhalts - IMMER aufgeklappt */}
        <Box sx={{ ml: 2, mt: 1 }}>
          {isLoading ? (
            <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
              Lade Inhalt...
            </Typography>
          ) : items.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
              Ordner ist leer
            </Typography>
          ) : (
            <Box>
              {items.map((item, index) => renderItemRecursively(item, 0))}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Schöne Vorschau-Modals (aus FileSystemPathManager kopiert)
  const showFilePreviewModal = (fileName: string, htmlContent: string, filePath: string, fileType: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    
    // Für PowerPoint-Dateien breiter (aber 20% reduziert)
    if (fileType === 'powerpoint') {
      modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 95%;
        width: 960px;
        max-height: 90%;
        overflow: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
      `;
    } else {
      modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        border: 1px solid #e0e0e0;
      `;
    }
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Datei konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download der Datei. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
    
    // Für PowerPoint-Dateien keinen Inhalt und keinen Rahmen anzeigen
    if (fileType === 'powerpoint') {
      content.innerHTML = '';
      content.style.cssText = `
        padding: 0;
        margin: 0;
        border: none;
        background: transparent;
        max-height: none;
        overflow: visible;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      `;
    } else {
      // Für andere Dateitypen den normalen Inhalt und Rahmen anzeigen
      content.innerHTML = htmlContent;
      content.style.cssText = `
        border: 1px solid #e0e0e0;
        padding: 20px;
        border-radius: 8px;
        background: #fafafa;
        max-height: 400px;
        overflow: auto;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      `;
    }
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // ESC-Taste zum Schließen - mit Modal-Fokus
    modal.setAttribute('tabindex', '0');
    modal.focus();
    
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleModalKeyDown);
        }
      }
    };
    
    document.addEventListener('keydown', handleModalKeyDown);
  };

  const showImagePreviewModal = (fileName: string, imageData: any, filePath: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Bild konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download des Bildes. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      text-align: center;
    `;
    
    const img = document.createElement('img');
    img.src = imageData.dataUrl || imageData.url;
    img.alt = fileName;
    img.style.cssText = `
      max-width: 100%;
      max-height: 400px;
      object-fit: contain;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    imageContainer.appendChild(img);
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(imageContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // ESC-Taste zum Schließen - mit Modal-Fokus
    modal.setAttribute('tabindex', '0');
    modal.focus();
    
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleModalKeyDown);
        }
      }
    };
    
    document.addEventListener('keydown', handleModalKeyDown);
  };

  const showTextPreviewModal = (fileName: string, textContent: string, filePath: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      border: 1px solid #e0e0e0;
    `;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 20px;
      background: #f5f5f5;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      font-weight: bold;
      line-height: 1;
    `;
    closeButton.onmouseover = () => {
      closeButton.style.background = '#e0e0e0';
      closeButton.style.color = '#333';
    };
    closeButton.onmouseout = () => {
      closeButton.style.background = '#f5f5f5';
      closeButton.style.color = '#666';
    };
    closeButton.onclick = () => document.body.removeChild(modal);
    
    const title = document.createElement('h2');
    title.textContent = `Vorschau: ${fileName}`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #1976d2;
      font-size: 20px;
      font-weight: 600;
      border-bottom: 2px solid #e3f2fd;
      padding-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    `;
    
    const downloadButton = document.createElement('button');
    downloadButton.textContent = '📥 Download';
    downloadButton.style.cssText = `
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      width: auto;
      margin: 0;
      order: -1;
    `;
    downloadButton.onclick = async () => {
      try {
        downloadButton.textContent = '⏳ Läuft...';
        downloadButton.disabled = true;
        downloadButton.style.background = 'linear-gradient(135deg, #666 0%, #555 100%)';
        downloadButton.style.cursor = 'not-allowed';
        
        const downloadResponse = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          downloadButton.textContent = '✅ Fertig!';
          downloadButton.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
          setTimeout(() => {
            downloadButton.textContent = '📥 Download';
            downloadButton.disabled = false;
            downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
            downloadButton.style.cursor = 'pointer';
          }, 2000);
        } else {
          alert(`Textdatei konnte nicht heruntergeladen werden: ${downloadResponse.statusText}`);
          downloadButton.textContent = '📥 Download';
          downloadButton.disabled = false;
          downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
          downloadButton.style.cursor = 'pointer';
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Fehler beim Download der Textdatei. Bitte versuchen Sie es erneut.');
        downloadButton.textContent = '📥 Download';
        downloadButton.disabled = false;
        downloadButton.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
        downloadButton.style.cursor = 'pointer';
      }
    };
    
    title.insertBefore(downloadButton, title.firstChild);
    
    const content = document.createElement('div');
    content.textContent = textContent;
    content.style.cssText = `
      border: 1px solid #e0e0e0;
      padding: 20px;
      border-radius: 8px;
      background: #fafafa;
      max-height: 400px;
      overflow: auto;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
    `;
    
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // ESC-Taste zum Schließen - mit Modal-Fokus
    modal.setAttribute('tabindex', '0');
    modal.focus();
    
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleModalKeyDown);
        }
      }
    };
    
    document.addEventListener('keydown', handleModalKeyDown);
  };

  // Funktion zum Öffnen von Dateien - nutzt die bereits vorhandenen, schönen Vorschau-Methoden
  const handleFileClick = async (item: any) => {
    if (item.type !== 'file') return;
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // HTML-Dateien im neuen Tab öffnen
      try {
        const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const htmlContent = await response.text();
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Laden der HTML-Datei:', error);
        alert('HTML-Datei konnte nicht geöffnet werden.');
      }
    } else if (fileExtension === 'pdf') {
      // PDF-Dateien im neuen Tab öffnen
      try {
        const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PDF-Datei:', error);
        alert('PDF-Datei konnte nicht geöffnet werden.');
      }
    } else if (fileExtension === 'docx') {
      // DOCX-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-docx?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'docx');
        }
      } catch (error) {
        console.error('Fehler beim Laden der DOCX-Datei:', error);
        alert('DOCX-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Excel-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-excel?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'excel');
        }
      } catch (error) {
        console.error('Fehler beim Laden der Excel-Datei:', error);
        alert('Excel-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'pptx' || fileExtension === 'ppt') {
      // PowerPoint-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-powerpoint?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'powerpoint');
        }
      } catch (error) {
        console.error('Fehler beim Laden der PowerPoint-Datei:', error);
        alert('PowerPoint-Vorschau konnte nicht geladen werden.');
      }
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
      // Bild-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-image?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const imageData = await response.json();
          showImagePreviewModal(item.name, imageData, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Bildes:', error);
        alert('Bild-Vorschau konnte nicht geladen werden.');
      }
    } else if (fileExtension === 'goodnotes' || fileExtension === 'gn') {
      // GoodNotes-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-goodnotes?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const htmlContent = await response.text();
          showFilePreviewModal(item.name, htmlContent, item.path, 'goodnotes');
        }
      } catch (error) {
        console.error('Fehler beim Laden der GoodNotes-Datei:', error);
        alert('GoodNotes-Vorschau konnte nicht geladen werden.');
      }
    } else if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
      // Text-Vorschau über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/read-text?filePath=${encodeURIComponent(item.path)}&preview=true`);
        if (response.ok) {
          const textContent = await response.text();
          showTextPreviewModal(item.name, textContent, item.path);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Textdatei:', error);
        alert('Text-Vorschau konnte nicht geladen werden.');
      }
    } else {
      // Download über den bestehenden Endpunkt
      try {
        const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error('Fehler beim Download:', error);
        alert('Datei konnte nicht heruntergeladen werden.');
      }
    }
  };

  // Hilfsfunktion: Hole Materialien für eine Lesson
  const fetchLessonMaterials = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}`);
      if (response.ok) {
        const materials = await response.json();
        return materials;
      }
      return [];
    } catch (error) {
      console.error('Error fetching lesson materials:', error);
      return [];
    }
  };

  // Hilfsfunktion: Hole Quiz für eine Lesson
  const fetchLessonQuiz = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/lesson-quizzes/lesson/${lessonId}`);
      if (response.ok) {
        const quiz = await response.json();
        return quiz;
      } else if (response.status === 404) {
        return null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching lesson quiz:', error);
      return null;
    }
  };

  // Hilfsfunktion: Öffne Material oder Quiz für eine Lesson
  const openLessonContent = async (lessonId: string, lessonName: string) => {
    // Prüfe zuerst auf Quiz
    const quiz = await fetchLessonQuiz(lessonId);
    if (quiz) {
      console.log('Quiz gefunden:', quiz);
      
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        alert('Schüler-ID nicht gefunden. Bitte melden Sie sich erneut an.');
        return;
      }

      // Prüfe zuerst, ob eine aktive Session läuft
      try {
        const sessionResponse = await fetch(`/api/quiz-sessions/${quiz.quiz.id}/active`);
        console.log('Session Response Status:', sessionResponse.status);
        
        if (sessionResponse.ok) {
          const session = await sessionResponse.json();
          console.log('Aktive Session gefunden:', session);
          
          if (session && session.id) {
            // Prüfe, ob der Schüler bereits teilgenommen hat
            const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${studentId}`);
            if (participationResponse.ok) {
              const participation = await participationResponse.json();
              
              // Wenn der Schüler bereits abgeschlossen hat, zeige Auswertung
              if (participation.hasParticipated && participation.isCompleted && participation.participationId) {
                const resultsResponse = await fetch(`/api/quiz-participations/${participation.participationId}/results?studentId=${studentId}`);
                if (resultsResponse.ok) {
                  const results = await resultsResponse.json();
                  setQuizResults(results);
                  setShowQuizResults(true);
                  return;
                }
              } else {
                // Schüler hat noch nicht teilgenommen oder nicht abgeschlossen - kann starten
                const participationUrl = `/quiz-participation/${session.id}`;
                navigate(participationUrl);
                return;
              }
            }
            
            // Fallback: Navigiere zur Quiz-Teilnahme
            const participationUrl = `/quiz-participation/${session.id}`;
            navigate(participationUrl);
            return;
          }
        }
        
        // Keine aktive Session - prüfe auf letzte Ergebnisse
        console.log('Keine aktive Session, prüfe auf letzte Ergebnisse...');
        const sessionsResponse = await fetch(`/api/quiz-sessions/${quiz.quiz.id}/sessions`);
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          
          // Suche nach der letzten Session mit Teilnahme des Schülers
          for (const session of sessions.reverse()) { // Neueste zuerst
            const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${studentId}`);
            if (participationResponse.ok) {
              const participation = await participationResponse.json();
              
              if (participation.hasParticipated && participation.isCompleted && participation.participationId) {
                // Schüler hat an dieser Session teilgenommen - zeige Auswertung
                const resultsResponse = await fetch(`/api/quiz-participations/${participation.participationId}/results?studentId=${studentId}`);
                if (resultsResponse.ok) {
                  const results = await resultsResponse.json();
                  setQuizResults(results);
                  setShowQuizResults(true);
                  return;
                }
              }
            }
          }
        }
        
        // Keine Ergebnisse gefunden - zeige Meldung
        alert('Keine aktive Quiz-Session und keine vorherigen Ergebnisse gefunden. Bitte warten Sie, bis der Lehrer das Quiz startet.');
        return;
        
      } catch (error) {
        console.error('Fehler beim Prüfen der Quiz-Session:', error);
        alert('Fehler beim Prüfen der Quiz-Session.');
        return;
      }
    }

    // Falls kein Quiz, prüfe auf Material
    const materials = await fetchLessonMaterials(lessonId);
    if (materials.length > 0) {
      const lessonMaterial = materials[0]; // Öffne das erste Material
      const material = lessonMaterial.material; // Access the material property
      
      if (!material || !material.filePath) {
        alert('Material-Daten sind unvollständig.');
        return;
      }
      
      const ext = material.filePath.split('.').pop()?.toLowerCase();
      
      // Verwende den Server-Port (3005) für HTML-Dateien
      const fullUrl = ext === 'html' 
        ? 'http://localhost:3005' + material.filePath 
        : window.location.origin + material.filePath;
      
      const newWindow = window.open(fullUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert('Das Material konnte nicht geöffnet werden. Versuchen Sie es erneut.');
      }
    } else {
      alert(`Keine Materialien oder Quizze für "${lessonName}" gefunden.`);
    }
  };

  // Hilfsfunktion zum Laden aller Inhalte
  // Hilfsfunktionen für Notenformatierung
  const formatGermanGrade = (grade: number): string => {
    if (grade === 1.0) return '1';
    if (grade === 1.3) return '1-';
    if (grade === 1.7) return '2+';
    if (grade === 2.0) return '2';
    if (grade === 2.3) return '2-';
    if (grade === 2.7) return '3+';
    if (grade === 3.0) return '3';
    if (grade === 3.3) return '3-';
    if (grade === 3.7) return '4+';
    if (grade === 4.0) return '4';
    if (grade === 4.3) return '4-';
    if (grade === 4.7) return '5+';
    if (grade === 5.0) return '5';
    if (grade === 5.3) return '5-';
    if (grade === 6.0) return '6';
    return grade.toFixed(1);
  };

  // Funktion zum Kombinieren von Schema und Noten
  const combineSchemaWithGrades = (schema: GradingSchema, grades: Grade[]) => {
    const schemaStructure = parseSchemaStructure(schema.structure);
    const gradesMap = new Map(grades.map(g => [g.categoryName, g]));
    
    const processNode = (node: any): any => {
      const grade = gradesMap.get(node.name);
      return {
        ...node,
        grade: grade?.grade,
        weight: grade?.weight || node.weight,
        children: node.children.map(processNode)
      };
    };
    
    return schemaStructure.map(processNode);
  };

  // Funktion zum Berechnen der gewichteten Note aus Kindern
  const calculateWeightedGrade = (node: any): number | null => {
    if (!node.children || node.children.length === 0) {
      return node.grade !== undefined ? node.grade : null;
    }

    const validChildren = node.children.filter((child: any) => {
      const childGrade = calculateWeightedGrade(child);
      return childGrade !== null;
    });

    if (validChildren.length === 0) {
      return null;
    }

    const totalWeight = validChildren.reduce((sum: number, child: any) => sum + child.weight, 0);
    if (totalWeight === 0) {
      return null;
    }

    const weightedSum = validChildren.reduce((sum: number, child: any) => {
      const childGrade = calculateWeightedGrade(child);
      return sum + (childGrade! * child.weight);
    }, 0);

    return weightedSum / totalWeight;
  };

  // Rekursive Komponente für hierarchische Noten-Anzeige
  const renderGradeNode = (node: any, schema: GradingSchema, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isLeafNode = !hasChildren;
    const calculatedGrade = hasChildren ? calculateWeightedGrade(node) : null;
    
    // Blende die oberste Ebene aus, wenn es "Unter- und Mittelstufe" ist
    if (level === 0 && node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe")) {
      return (
        <Box key={node.name}>
          {hasChildren && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {node.children.map((child: any) => renderGradeNode(child, schema, level + 1))}
            </Box>
          )}
        </Box>
      );
    }
    
    return (
      <Box key={node.name} sx={{ mb: 0.5 }}>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
          bgcolor: level === 0 ? '#f0f8ff' : level === 1 ? '#f8f9fa' : 'white',
          borderRadius: 0.7,
          border: '1px solid #e0e0e0',
          ml: level * 2.5, // Einrückung basierend auf Level
          borderLeft: level > 0 ? `3px solid ${level === 1 ? '#1976d2' : level === 2 ? '#2E7D32' : '#F57C00'}` : '1px solid #e0e0e0'
        }}>
          <Typography variant="caption" sx={{ 
            color: colors.textPrimary,
            fontSize: level === 0 ? '0.75rem' : level === 1 ? '0.7rem' : '0.6rem',
            fontWeight: level === 0 ? 700 : level === 1 ? 600 : 500,
            fontStyle: level === 0 ? 'italic' : 'normal'
          }}>
            {level === 0 ? '📚 ' : level === 1 ? '📝 ' : '• '}{node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe") ? "Gesamtnote" : node.name}
          </Typography>
          
          {node.grade !== undefined && !hasChildren ? (
            // Nur für Blattknoten - eingegebene Noten
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                bgcolor: getGradeColor(node.grade, schema?.gradingSystem),
                color: 'white',
                px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                borderRadius: 1,
                fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                fontWeight: 'bold',
                minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                textAlign: 'center'
              }}>
                {schema?.gradingSystem === 'MSS' ? 
                  node.grade.toFixed(0) : 
                  formatGermanGrade(node.grade)
                }
              </Box>
              <Typography variant="caption" sx={{ 
                color: colors.textSecondary,
                fontSize: level === 0 ? '0.6rem' : level === 1 ? '0.55rem' : '0.5rem'
              }}>
                ({node.weight}%)
              </Typography>
            </Box>
          ) : (node.grade !== undefined || calculatedGrade !== null) ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                bgcolor: getGradeColor((node.grade !== undefined ? node.grade : calculatedGrade)!, schema?.gradingSystem),
                color: 'white',
                px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                borderRadius: 1,
                fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                fontWeight: 'bold',
                minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                textAlign: 'center',
                opacity: 0.8,
                border: '2px solid #1976d2',
                boxShadow: '0 2px 4px rgba(25, 118, 210, 0.3)'
              }}>
                {schema?.gradingSystem === 'MSS' ? 
                  (node.grade !== undefined ? node.grade : calculatedGrade)!.toFixed(0) : 
                  formatGermanGrade((node.grade !== undefined ? node.grade : calculatedGrade)!)
                }
              </Box>
              <Typography variant="caption" sx={{ 
                color: colors.textSecondary,
                fontSize: level === 0 ? '0.6rem' : level === 1 ? '0.55rem' : '0.5rem',
                fontStyle: 'italic'
              }}>
                berechnet
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" sx={{ 
              color: colors.textSecondary,
              fontSize: level === 0 ? '0.6rem' : level === 1 ? '0.55rem' : '0.5rem',
              fontStyle: 'italic'
            }}>
              {isLeafNode ? 'Keine Note' : 'Keine Daten'}
            </Typography>
          )}
        </Box>
        
        {hasChildren && (
          <Box sx={{ mt: 0.3 }}>
            {node.children.map((child: any) => renderGradeNode(child, schema, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const getGradeColor = (grade: number, gradingSystem: string = 'GERMAN'): string => {
    if (gradingSystem === 'MSS') {
      if (grade >= 13) return '#4CAF50';
      if (grade >= 10) return '#8BC34A';
      if (grade >= 7) return '#FF9800';
      if (grade >= 4) return '#F57C00';
      if (grade >= 1) return '#FF5722';
      return '#C2185B';
    } else {
      if (grade >= 1.0 && grade <= 1.7) return '#4CAF50';
      if (grade >= 2.0 && grade <= 2.7) return '#8BC34A';
      if (grade >= 3.0 && grade <= 3.7) return '#FF9800';
      if (grade >= 4.0 && grade <= 4.7) return '#F57C00';
      if (grade >= 5.0 && grade <= 6.0) return '#C2185B';
      return '#9E9E9E';
    }
  };

  // Funktion zum Umbenennen von "Unter- und Mittelstufe" zu "Gesamtnote"
  const getDisplayName = (originalName: string): string => {
    // Flexiblere Suche für verschiedene Schreibweisen
    if (originalName.toLowerCase().includes("unter") && originalName.toLowerCase().includes("mittelstufe")) {
      return "Gesamtnote";
    }
    return originalName;
  };

  // Hilfsfunktion zum Parsen des Schemas
  const parseSchemaStructure = (schemaStr: string) => {
    const lines = schemaStr.split('\n').filter(line => line.trim());
    const result: any[] = [];
    const stack: { node: any; indent: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      
      if (!match) continue;

      const [, name, weightStr] = match;
      const weight = parseFloat(weightStr);

      if (isNaN(weight)) continue;

      const node = {
        name: name.trim(),
        weight: weight,
        level: Math.floor(indent / 2),
        children: []
      };

      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(node);
      } else {
        stack[stack.length - 1].node.children.push(node);
      }

      stack.push({ node, indent });
    }

    return result;
  };

  const fetchGrades = async (groupId: string) => {
    try {
      setGradesLoading(true);
      
      // Lade Bewertungsschema für die Lerngruppe
      const schemaResponse = await fetch(`/api/grading-schemas/${groupId}`);
      if (schemaResponse.ok) {
        const schemas = await schemaResponse.json();
        if (schemas.length > 0) {
          const schema = schemas[0];
          setGradingSchemas(prev => ({ ...prev, [groupId]: schema }));
          
          // Lade Noten für den Schüler
          const gradesResponse = await fetch(`/api/grades/${userId}/${schema.id}`);
          if (gradesResponse.ok) {
            const studentGrades = await gradesResponse.json();
            setGrades(prev => ({ ...prev, [groupId]: studentGrades }));
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Noten:', error);
    } finally {
      setGradesLoading(false);
    }
  };

  const fetchAllContent = async (teacherId: string) => {
    try {
      // Subjects
      const resSubjects = await fetch(`/api/subjects?teacherId=${teacherId}`);
      const subjectsData = resSubjects.ok ? await resSubjects.json() : [];
      setSubjects(subjectsData);

      // Blocks
      let allBlocks: Block[] = [];
      for (const subj of subjectsData) {
        const resBlocks = await fetch(`/api/blocks?subjectId=${subj.id}`);
        const blocksData = resBlocks.ok ? await resBlocks.json() : [];
        allBlocks = allBlocks.concat(blocksData);
      }
      setBlocks(allBlocks);

      // Units
      let allUnits: Unit[] = [];
      for (const block of allBlocks) {
        const resUnits = await fetch(`/api/units?blockId=${block.id}`);
        const unitsData = resUnits.ok ? await resUnits.json() : [];
        allUnits = allUnits.concat(unitsData);
      }
      setUnits(allUnits);

      // Topics
      let allTopics: Topic[] = [];
      for (const unit of allUnits) {
        const resTopics = await fetch(`/api/topics?unitId=${unit.id}`);
        const topicsData = resTopics.ok ? await resTopics.json() : [];
        allTopics = allTopics.concat(topicsData);
      }
      setTopics(allTopics);

      // Lessons
      let allLessons: Lesson[] = [];
      for (const topic of allTopics) {
        const resLessons = await fetch(`/api/lessons?topicId=${topic.id}`);
        const lessonsData = resLessons.ok ? await resLessons.json() : [];
        allLessons = allLessons.concat(lessonsData);
      }
      setLessons(allLessons);

      // Materialien und Quizze für alle Lessons laden
      const materialsMap: {[key: string]: any[]} = {};
      const quizzesMap: {[key: string]: any} = {};
      
      for (const lesson of allLessons) {
        // Materialien laden
        const materials = await fetchLessonMaterials(lesson.id);
        materialsMap[lesson.id] = materials;
        
        // Quizze laden
        const quiz = await fetchLessonQuiz(lesson.id);
        if (quiz) {
          quizzesMap[lesson.id] = quiz;
        }
      }
      
      setMaterialsMap(materialsMap);
      setQuizzesMap(quizzesMap);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  useEffect(() => {
    const fetchLerngruppen = async () => {
      try {
        // Lade zuerst den Student-Namen
        await fetchStudentData(userId);
        
        const response = await fetch(`/api/learning-groups/student/${userId}`);
        if (!response.ok) {
          throw new Error('Lerngruppen konnten nicht geladen werden');
        }
        const data = await response.json();
        setLerngruppen(data);
        
        // Wenn Lerngruppen geladen sind, lade die Zuweisungen und Inhalte
        if (data.length > 0) {
          const assignmentsData = await fetchAssignments(data);
          
          // Lade Namen für alle Assignments
          const assignmentsWithNames = await Promise.all(
            assignmentsData.map(async (assignment) => {
              const name = await fetchNameForAssignment(assignment.type, assignment.refId);
              return { ...assignment, name };
            })
          );
          setAssignments(assignmentsWithNames);
          
          // Lade alle Inhalte für die Lehrer der Lerngruppen
          for (const group of data) {
            await fetchAllContent(group.teacher.id);
            // Lade Noten für jede Lerngruppe
            await fetchGrades(group.id);
            // Lade zugeordnete Ordner für jede Lerngruppe
            await fetchAssignedFolders(group.id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    fetchLerngruppen();
  }, [userId]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh" sx={{ bgcolor: colors.background }}>
      <CircularProgress sx={{ color: colors.primary }} />
    </Box>
  );
  
  if (error) return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        <Grid item xs={12}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: colors.cardBg 
            }}>
              <CardContent>
                <Typography color="error">{error}</Typography>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', bgcolor: colors.background, p: 0 }}>
      <Grid container spacing={0}>
        {/* Header Section - Full Width */}
        <Grid item xs={12}>
          <Box sx={{ 
            p: 1.05,
            background: '#f8f9fa',
            color: '#222',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    bgcolor: colors.secondary,
                    boxShadow: '0 1.4px 2.8px rgba(0,0,0,0.12)'
                  }}
                >
                  {studentName.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h1" sx={{ fontWeight: 600, fontSize: '0.77rem', mb: 0 }}>
                    Hallo {studentName.split(' ')[0]}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.67rem', opacity: 0.85 }}>
                    Willkommen zurück
                  </Typography>
                </Box>
              </Box>
              <Button 
                variant="contained"
                color="primary"
                size="small"
                sx={{
                  width: '5%',
                  minWidth: 49,
                  ml: 'auto',
                  bgcolor: '#333',
                  color: 'white',
                  fontWeight: 500,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#222' },
                  borderRadius: 1.4,
                  fontSize: '0.7rem',
                  py: 0.35,
                  px: 0.7
                }}
                onClick={onLogout}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Character Profile Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                {/* Character Header with Wizard Emoji */}
                <Box sx={{ 
                  background: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
                  borderRadius: 2.1,
                  p: 2.1,
                  mb: 2.1,
                  textAlign: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }
                }}
                onClick={handleOpenEmojiSelector}
              >
                <Typography variant="h1" sx={{ fontSize: '4rem', mb: 1 }}>
                  {isUpdatingEmoji ? '⏳' : selectedEmoji}
                </Typography>
                <Tooltip title="Avatar ändern" placement="top">
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.95)',
                        transform: 'scale(1.05)'
                      }
                    }}
                    size="small"
                  >
                    <EditIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>

                {/* Character Name and Role */}
                <Box sx={{ textAlign: 'center', mb: 2.1 }}>
                  <Typography variant="h5" component="h2" sx={{ 
                    fontWeight: 'bold', 
                    color: '#1976d2', 
                    fontSize: '1.12rem',
                    mb: 0.7
                  }}>
                    {studentName || "Schüler"}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#333',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Schüler
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.75rem',
                    mt: 1,
                    fontStyle: 'italic'
                  }}>
                    Ein fleißiger Schüler, der neues Wissen erobert und Herausforderungen meistert.
                  </Typography>
                </Box>

                {/* Character Stats */}
                <Grid container spacing={1.4} sx={{ mb: 2.1 }}>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center'
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#1976d2',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        mb: 0.35
                      }}>
                        {assignments.length}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#333',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Aufgaben
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center'
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#1976d2',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        mb: 0.35
                      }}>
                        {lerngruppen.length}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#333',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Gruppen
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center'
                    }}>
                      <Typography variant="h4" sx={{ 
                        color: '#1976d2',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        mb: 0.35
                      }}>
                        {lessons.length}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#333',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Lektionen
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Character Skills */}
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    mb: 1,
                    fontWeight: 600
                  }}>
                    Fähigkeiten:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap' }}>
                    <Box sx={{ 
                      bgcolor: '#E3F2FD',
                      color: '#1976d2',
                      px: 1.4,
                      py: 0.35,
                      borderRadius: 2.1,
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}>
                      Mathematik
                    </Box>
                    <Box sx={{ 
                      bgcolor: '#E8F5E8',
                      color: '#2E7D32',
                      px: 1.4,
                      py: 0.35,
                      borderRadius: 2.1,
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}>
                      Sprachen
                    </Box>
                    <Box sx={{ 
                      bgcolor: '#FFF3E0',
                      color: '#F57C00',
                      px: 1.4,
                      py: 0.35,
                      borderRadius: 2.1,
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}>
                      Naturwissenschaften
                    </Box>
                  </Box>
                </Box>

                {/* Noten Anzeige */}
                {lerngruppen.length > 0 && (
                  <Box sx={{ mt: 2.1 }}>
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: gradesExpanded ? '#f0f8ff' : 'transparent',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: '#f0f8ff'
                        }
                      }}
                      onClick={() => setGradesExpanded(!gradesExpanded)}
                    >
                      <Typography variant="body2" sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                        <GradeIcon sx={{ fontSize: 16 }} />
                        Noten
                      </Typography>
                      {gradesExpanded ? (
                        <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      )}
                    </Box>
                    
                    {gradesExpanded && (
                      <>
                        {gradesLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                            {lerngruppen.map((gruppe) => {
                              const groupGrades = grades[gruppe.id] || [];
                              const schema = gradingSchemas[gruppe.id];
                              
                              if (groupGrades.length === 0) {
                                return (
                                  <Box key={gruppe.id} sx={{ 
                                    p: 1.4,
                                    bgcolor: '#f8f9fa',
                                    borderRadius: 1.4,
                                    border: '1px solid #e0e0e0'
                                  }}>
                                                                      <Typography variant="body2" sx={{ 
                                    color: colors.primary,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    mb: 0.7
                                  }}>
                                    📚 {getDisplayName(gruppe.name)}
                                  </Typography>
                                    <Typography variant="caption" sx={{ 
                                      color: colors.textSecondary,
                                      fontSize: '0.65rem',
                                      fontStyle: 'italic'
                                    }}>
                                      Noch keine Noten vorhanden
                                    </Typography>
                                  </Box>
                                );
                              }

                              // Kombiniere Schema mit Noten für hierarchische Anzeige
                              const hierarchicalGrades = combineSchemaWithGrades(schema, groupGrades);

                              return (
                                <Box key={gruppe.id} sx={{ 
                                  p: 1.4,
                                  bgcolor: '#f8f9fa',
                                  borderRadius: 1.4,
                                  border: '1px solid #e0e0e0'
                                }}>
                                  <Typography variant="body2" sx={{ 
                                    color: colors.primary,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    mb: 1,
                                    pb: 0.5,
                                    borderBottom: `2px solid ${colors.primary}30`
                                  }}>
                                    📚 {getDisplayName(gruppe.name)}
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                    {hierarchicalGrades.map((node) => renderGradeNode(node, schema))}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Learning Groups Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                <Grid container spacing={1.4}>
                  {lerngruppen
                    .filter(gruppe => !gruppe.name.toLowerCase().includes("unter") || !gruppe.name.toLowerCase().includes("mittelstufe"))
                    .map((gruppe) => (
                    <Grid item xs={12} key={gruppe.id}>
                      <Card variant="outlined" sx={{ 
                        borderRadius: 2.8,
                        border: '1px solid #e0e0e0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          transform: 'translateY(-1px)'
                        }
                      }}>
                        <CardContent sx={{ p: 2.1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="h6" sx={{ 
                                color: colors.textPrimary, 
                                fontWeight: 'bold', 
                                fontSize: '0.9rem',
                                letterSpacing: '0.5px'
                              }}>
                                {gruppe.name}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontSize: '0.75rem', 
                                color: colors.textSecondary,
                                fontWeight: 500
                              }}>
                                • {gruppe.teacher.name}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {/* Zugeordnete Ordner - direkt unterhalb des Headers, exakt wie im TeacherDashboard */}
                          {assignedFolders[gruppe.id] && assignedFolders[gruppe.id].length > 0 ? (
                            <Box>
                              {assignedFolders[gruppe.id].map((folderPath: string) => {
                                return renderAssignedFolderPreview(gruppe.id, folderPath);
                              })}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ 
                              color: colors.textSecondary,
                              fontSize: '0.75rem',
                              fontStyle: 'italic'
                            }}>
                              Keine Ordner zugeordnet
                            </Typography>
                          )}
                          
                          {/* Zugeordnete Inhalte anzeigen */}
                          {assignments.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              
                              {/* Verschachtelte Darstellung wie im TeacherDashboard */}
                              <Box sx={{ 
                                ml: 1,
                                p: 1.4,
                                bgcolor: '#fafbfc',
                                borderRadius: 1.4,
                                border: '1px solid #f0f0f0'
                              }}>
                                {subjects
                                  .filter(subject => (subjectAssignments[subject.id] || []).includes(gruppe.id))
                                  .map(subject => (
                                    <Box key={subject.id} sx={{ mb: 1.4 }}>
                                      <Typography variant="body2" sx={{ 
                                        fontWeight: 'bold', 
                                        color: colors.accent1, 
                                        fontSize: '0.8rem',
                                        mb: 0.7,
                                        pb: 0.3,
                                        borderBottom: `2px solid ${colors.accent1}30`
                                      }}>
                                        📚 {subject.name}
                                      </Typography>
                                      {/* Blöcke */}
                                      {blocks
                                        .filter(block => block.subjectId === subject.id && (blockAssignments[block.id] || []).includes(gruppe.id))
                                        .map(block => (
                                          <Box key={block.id} sx={{ ml: 2, mb: 0.7 }}>
                                            <Typography variant="body2" sx={{ 
                                              color: colors.primary, 
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 0.5
                                            }}>
                                              📦 {block.name}
                                            </Typography>
                                            {/* Units */}
                                            {units
                                              .filter(unit => unit.blockId === block.id && (unitAssignments[unit.id] || []).includes(gruppe.id))
                                              .map(unit => (
                                                <Box key={unit.id} sx={{ ml: 2, mb: 0.7 }}>
                                                  <Typography variant="body2" sx={{ 
                                                    color: colors.secondary, 
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5
                                                  }}>
                                                    📋 {unit.name}
                                                  </Typography>
                                                  {/* Themen */}
                                                  {topics
                                                    .filter(topic => topic.unitId === unit.id && (topicAssignments[topic.id] || []).includes(gruppe.id))
                                                    .map(topic => (
                                                      <Box key={topic.id} sx={{ ml: 2, mb: 0.7 }}>
                                                        <Typography variant="body2" sx={{ 
                                                          color: colors.accent2, 
                                                          fontSize: '0.75rem',
                                                          fontWeight: 600,
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          gap: 0.5
                                                        }}>
                                                          💡 {topic.name}
                                                        </Typography>
                                                        {/* Stunden */}
                                                        {lessons
                                                          .filter(lesson => lesson.topicId === topic.id && (lessonAssignments[lesson.id] || []).includes(gruppe.id))
                                                          .map(lesson => (
                                                            <Box key={lesson.id} sx={{ 
                                                              ml: 2, 
                                                              display: 'flex', 
                                                              alignItems: 'center', 
                                                              gap: '6px',
                                                              p: 0.5,
                                                              borderRadius: 1,
                                                              bgcolor: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? '#f0f8ff' : 'transparent',
                                                              transition: 'all 0.2s ease',
                                                              '&:hover': {
                                                                bgcolor: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? '#e3f2fd' : 'transparent'
                                                              }
                                                            }}>
                                                              <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                  color: colors.textSecondary,
                                                                  cursor: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? 'pointer' : 'default',
                                                                  fontSize: '0.75rem',
                                                                  fontWeight: 500,
                                                                  '&:hover': {
                                                                    color: (materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? colors.primary : colors.textSecondary
                                                                  }
                                                                }}
                                                                onClick={e => {
                                                                  e.stopPropagation();
                                                                  if ((materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id]) {
                                                                    openLessonContent(lesson.id, lesson.name);
                                                                  }
                                                                }}
                                                                title={(materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id] ? "Material/Quiz öffnen" : ""}
                                                              >
                                                                📖 {lesson.name}
                                                              </Typography>
                                                              {((materialsMap[lesson.id] && materialsMap[lesson.id].length > 0) || quizzesMap[lesson.id]) && (
                                                                <span 
                                                                  style={{ 
                                                                    color: colors.secondary, 
                                                                    fontSize: '0.8em', 
                                                                    cursor: 'pointer',
                                                                    marginLeft: '4px',
                                                                    transition: 'all 0.2s ease'
                                                                  }}
                                                                  onClick={e => {
                                                                    e.stopPropagation();
                                                                    openLessonContent(lesson.id, lesson.name);
                                                                  }}
                                                                  title="Material/Quiz öffnen"
                                                                >
                                                                  {quizzesMap[lesson.id] ? '🧩' : '📄'}
                                                                </span>
                                                              )}
                                                            </Box>
                                                          ))}
                                                      </Box>
                                                    ))}
                                                </Box>
                                              ))}
                                          </Box>
                                        ))}
                                    </Box>
                                  ))}
                                {/* Falls keine Inhalte */}
                                {!(subjects.some(subject => (subjectAssignments[subject.id] || []).includes(gruppe.id)) ||
                                  blocks.some(block => (blockAssignments[block.id] || []).includes(gruppe.id)) ||
                                  units.some(unit => (unitAssignments[unit.id] || []).includes(gruppe.id)) ||
                                  topics.some(topic => (topicAssignments[topic.id] || []).includes(gruppe.id)) ||
                                  lessons.some(lesson => (lessonAssignments[lesson.id] || []).includes(gruppe.id))) && (
                                  <Box sx={{ 
                                    textAlign: 'center', 
                                    py: 2,
                                    color: colors.textSecondary,
                                    fontStyle: 'italic'
                                  }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                      📝 Noch keine Inhalte zugeordnet
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* GeoQuests Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 1.4 }}>
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: colors.cardBg,
              transition: 'transform 0.14s',
              '&:hover': {
                transform: 'translateY(-2.8px)'
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                  <QuizIcon sx={{ mr: 1.4, color: colors.accent1, fontSize: 28 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.accent1, fontSize: '1.12rem' }}>
                    Deine GeoQuests
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ mb: 2.1, color: 'text.secondary', fontSize: '0.84rem' }}>
                  Starte spannende GeoCoding-Abenteuer! 🗺️
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ 
                    bgcolor: colors.accent1,
                    '&:hover': {
                      bgcolor: colors.accent1,
                      filter: 'brightness(1.1)'
                    },
                    borderRadius: 2.1,
                    px: 2.8,
                    fontSize: '0.7rem',
                    py: 0.35
                  }}
                  onClick={() => window.open('http://localhost:5000', '_blank')}
                >
                  GeoCodingQuest starten 🌍
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Grid>


      </Grid>

      {/* Quiz Results Modal */}
      <QuizResultsModal
        open={showQuizResults}
        onClose={() => setShowQuizResults(false)}
        results={quizResults}
      />

      {/* Emoji Selector Modal */}
      <EmojiSelector
        open={showEmojiSelector}
        onClose={handleCloseEmojiSelector}
        onSelect={handleEmojiSelect}
        currentEmoji={selectedEmoji}
      />
    </Box>
  );
};

export default StudentDashboard;