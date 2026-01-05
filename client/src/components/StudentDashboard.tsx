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
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Popover
} from '@mui/material';
import {
  School as SchoolIcon,
  QuestionAnswer as QuizIcon,
  Edit as EditIcon,
  Grade as GradeIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  RecordVoiceOver as ParticipationIcon,
  HelpOutline as HelpIcon
} from '@mui/icons-material';
import { QuizResultsModal } from './QuizResultsModal';
import EmojiSelector from './EmojiSelector';
import InboxModal from './InboxModal';
import QuizStartButton from './QuizStartButton';
import SubmissionUpload from './SubmissionUpload';

/**
 * Helper-Funktion: Prüft ob eine Datei eine korrigierbare Datei ist (KA_, HÜ_, HU_)
 */
const isCorrectionFile = (fileName: string): boolean => {
  return fileName.startsWith('KA_') || fileName.startsWith('HÜ_') || fileName.startsWith('HU_');
};

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
  const [gradeReleases, setGradeReleases] = useState<{[schemaId: string]: boolean}>({});
  
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
  
  // Flashcard Learning States
  const [flashcardLearningOpen, setFlashcardLearningOpen] = useState(false);
  
  // Abgabestatistik States
  const [showSubmissionStats, setShowSubmissionStats] = useState(false);
  const [submissionStats, setSubmissionStats] = useState<any[]>([]);
  
  // Inbox States
  const [showInbox, setShowInbox] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  // Neue States für echte Ordner-Vorschau (exakt wie im TeacherDashboard)
  const [assignedFolderContents, setAssignedFolderContents] = useState<{[key: string]: any[]}>({});
  const [expandedAssignedFolders, setExpandedAssignedFolders] = useState<{[key: string]: Set<string>}>({});
  const [loadingFolderContents, setLoadingFolderContents] = useState<{[key: string]: boolean}>({});
  const [assignedFolders, setAssignedFolders] = useState<{[groupId: string]: string[]}>({});

  // Submission States (Abgabesystem für H_ Dateien)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedSubmissionFile, setSelectedSubmissionFile] = useState<any>(null);
  const [submissionStatuses, setSubmissionStatuses] = useState<{[filePath: string]: boolean}>({});

  // File Share States (Datei-Freigaben für Lerngruppen)
  const [sharedFiles, setSharedFiles] = useState<{[groupId: string]: string[]}>({});

  // Mitarbeitsbewertung States
  const [participationData, setParticipationData] = useState<{[groupId: string]: {
    groupName: string;
    period1Hours: number | null;
    period2Hours: number | null;
    participations: {lessonIndex: number; value: number; comment?: string | null; period?: number}[];
    average: number;
    count: number;
    grade: number | null;
  }}>({});
  const [participationLoading, setParticipationLoading] = useState(false);
  const [participationExpanded, setParticipationExpanded] = useState(false);
  const [epoGrades, setEpoGrades] = useState<any[]>([]);

  // Hilfe-Popover State
  const [helpAnchorEl, setHelpAnchorEl] = useState<HTMLElement | null>(null);

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
      const loginCode = localStorage.getItem('loginCode');
      const response = await fetch(`/api/users/${userId}/avatar-emoji`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode || ''
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
      const loginCode = localStorage.getItem('loginCode');
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'x-login-code': loginCode || ''
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setStudentName(userData.name);
        // Lade gespeichertes Emoji oder verwende Standard
        if (userData.avatarEmoji) {
          setSelectedEmoji(userData.avatarEmoji);
        }
      } else {
        console.error('Failed to fetch student data:', response.status);
        setStudentName("Schüler"); // Fallback
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      setStudentName("Schüler"); // Fallback
    }
  };

  // Funktion zum Laden der Mitarbeitsbewertungen
  const fetchParticipationData = async (studentId: string) => {
    try {
      setParticipationLoading(true);
      const response = await fetch(`/api/participation/student/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipationData(data);
      } else {
        console.error('Fehler beim Laden der Mitarbeitsbewertungen');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeitsbewertungen:', error);
    } finally {
      setParticipationLoading(false);
    }
  };
  
  // Funktion zum Laden der EPO-Noten
  const fetchEpoGrades = async (studentId: string) => {
    try {
      const response = await fetch(`/api/participation/student/${studentId}/epo-grades`);
      if (response.ok) {
        const data = await response.json();
        setEpoGrades(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der EPO-Noten:', error);
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

  // Funktion zum Laden der geteilten Dateien für eine Gruppe
  const fetchSharedFilesForGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/file-shares/group/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setSharedFiles(prev => ({
          ...prev,
          [groupId]: data.filePaths || []
        }));
      }
    } catch (error) {
      console.error('Error fetching shared files:', error);
    }
  };

  // Neue Funktion zum Laden der zugeordneten Ordner (exakt wie im TeacherDashboard)
  const fetchAssignedFolders = async (groupId: string) => {
    try {
      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      const response = await fetch(`/api/learning-groups/${groupId}/folders?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const folders = await response.json();
        const folderPaths = folders.map((f: any) => f.path);
        
        // Lösche alle alten Daten für diese Gruppe
        setAssignedFolders(prev => {
          const newState = { ...prev };
          delete newState[groupId];
          return newState;
        });
        
        setAssignedFolderContents(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => {
            if (key.startsWith(`${groupId}:`)) {
              delete newState[key];
            }
          });
          return newState;
        });

        // Setze die neuen Daten
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

      // Cache-Busting Parameter hinzufügen
      const timestamp = Date.now();
      const response = await fetch(`/api/file-system-paths/read?path=${encodeURIComponent(folderPath)}&recursive=true&t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
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

        // Lade die geteilten Dateien für diese Gruppe
        fetchSharedFilesForGroup(groupId);
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

  // Hilfsfunktion: Filtert .wb Dateien aus, damit Schüler nur PDF-Dateien sehen
  const filterWbFiles = (items: any[]): any[] => {
    return items.filter((item) => {
      if (item.type === 'file' && item.name.endsWith('.wb')) {
        // Prüfe ob es eine entsprechende .pdf Datei gibt (irgendwo in der Liste)
        const pdfFileName = item.name.replace('.wb', '.pdf');
        const hasCorrespondingPdf = items.some((otherItem) => 
          otherItem.type === 'file' && 
          otherItem.name === pdfFileName
        );
        if (hasCorrespondingPdf) {
          return false; // .wb-Datei ausblenden
        }
      }
      return true;
    });
  };

  // Neue Funktion zum Rendern der echten Ordner-Vorschau (exakt wie im Screenshot)
  const renderAssignedFolderPreview = (groupId: string, folderPath: string) => {
    const items = assignedFolderContents[`${groupId}:${folderPath}`] || [];
    const isLoading = loadingFolderContents[`${groupId}:${folderPath}`] || false;
    
    // Filtere .wb-Dateien aus, damit Schüler nur PDF-Dateien sehen
    const filteredItems = filterWbFiles(items);
    
    // Hilfsfunktion: Prüft rekursiv, ob ein Ordner mindestens eine freigegebene Datei enthält
    const hasSharedFiles = (item: any): boolean => {
      const groupSharedFiles = sharedFiles[groupId] || [];
      
      // Wenn es eine Datei ist, prüfe ob sie freigegeben ist
      // K_ Dateien müssen explizit freigegeben werden (über Checkbox im Lehrerdashboard)
      if (item.type === 'file') {
        let isFileShared = groupSharedFiles.includes(item.path);
        
        // Spezielle Logik für PDF-Dateien: Wenn die entsprechende .wb Datei freigegeben ist,
        // dann ist auch die PDF-Datei freigegeben
        if (item.name.endsWith('.pdf') && !isFileShared) {
          const wbFilePath = item.path.replace('.pdf', '.wb');
          const isWbFileShared = groupSharedFiles.includes(wbFilePath);
          if (isWbFileShared) {
            isFileShared = true;
          }
        }
        
        return isFileShared;
      }
      
      // Wenn es ein Ordner ist, prüfe rekursiv alle Kinder
      if (item.type === 'directory' && item.children) {
        return item.children.some((child: any) => hasSharedFiles(child));
      }
      
      return false;
    };

    // Rekursive Funktion zum Rendern aller Ebenen
    const renderItemRecursively = (item: any, level: number = 0) => {
      // Prüfe, ob die Datei für diese Gruppe freigegeben ist
      const groupSharedFiles = sharedFiles[groupId] || [];
      // K_ Dateien müssen explizit freigegeben werden (über Checkbox im Lehrerdashboard)
      let isFileShared = groupSharedFiles.includes(item.path);
      
      // Spezielle Logik für PDF-Dateien: Wenn die entsprechende .wb Datei freigegeben ist,
      // dann ist auch die PDF-Datei freigegeben
      if (item.type === 'file' && item.name.endsWith('.pdf') && !isFileShared) {
        const wbFileName = item.name.replace('.pdf', '.wb');
        const wbFilePath = item.path.replace('.pdf', '.wb');
        const isWbFileShared = groupSharedFiles.includes(wbFilePath);
        if (isWbFileShared) {
          isFileShared = true;
        }
      }
      
      // Wenn es eine Datei ist und NICHT freigegeben, verberge sie
      if (item.type === 'file' && !isFileShared) {
        return null;
      }

      // Wenn es ein Ordner ist und KEINE freigegebenen Dateien enthält, verberge ihn
      if (item.type === 'directory' && !hasSharedFiles(item)) {
        return null;
      }

      // Quiz-Dateien werden für Schüler als "Quiz starten" Button angezeigt
      if (item.type === 'file' && item.name.startsWith('Quiz')) {
        return (
          <Box key={`${item.name}-${level}`} sx={{ mb: 0.7 }}>
            <QuizStartButton quizFile={item} userId={userId} />
          </Box>
        );
      }
      
      // Cards-Dateien werden weiterhin ausgeblendet
      // K_ Dateien werden angezeigt, wenn sie explizit freigegeben wurden
      
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
        if (isCorrectionFile(item.name)) {
          // Klassenarbeiten/Hausaufgabenüberprüfungen bekommen ein spezielles, größeres Icon
          icon = '📝'; // Klassenarbeit/HÜ-Icon
          color = '#ff9800'; // Gelb-orange für Klassenarbeiten/HÜ
          fontWeight = 700; // Fett für Klassenarbeiten/HÜ
        } else {
          icon = '📄'; // Dokument
          color = '#03a9f4'; // Hellblau für Dateien (wie im Screenshot)
          fontWeight = 400;
        }
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
            <span style={{ fontSize: isCorrectionFile(item.name) ? '1.3em' : '1em', marginRight: '4px' }}>{icon}</span>
            <span style={{ 
              fontWeight: isCorrectionFile(item.name) ? 700 : fontWeight,
              fontSize: isCorrectionFile(item.name) ? '0.9rem' : '0.75rem',
              color: isCorrectionFile(item.name) ? '#ff9800' : color
            }}>{item.name}</span>
            {/* Check-Icon für H_ Dateien mit Abgabe */}
            {item.type === 'file' && item.name.startsWith('H_') && submissionStatuses[item.path] && (
              <span style={{ marginLeft: '8px', color: '#4caf50', fontSize: '1.2em' }}>✓</span>
            )}
          </Typography>
          
      {/* Rekursive Anzeige für ALLE Unterordner und Dateien - IMMER aufgeklappt */}
      {item.type === 'directory' && item.children && item.children.length > 0 && (
        <Box sx={{ ml: 2, mb: 0.7 }}>
          {filterWbFiles(item.children).map((child: any, childIndex: number) => 
            renderItemRecursively(child, level + 1)
          )}
        </Box>
      )}
        </Box>
      );
    };
    
    // Prüfe, ob der Ordner überhaupt freigegebene Dateien enthält
    const hasSomeSharedFiles = items.some(item => hasSharedFiles(item));
    
    // Wenn keine freigegebenen Dateien, zeige den Ordner nicht an
    if (!isLoading && !hasSomeSharedFiles) {
      return null;
    }

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
              {filteredItems.map((item, index) => renderItemRecursively(item, 0)).filter(item => item !== null)}
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

  // Prüfe Submission-Status für H_ Dateien
  const checkSubmissionStatus = async (filePath: string) => {
    try {
      const response = await fetch(
        `/api/submissions/check?filePath=${encodeURIComponent(filePath)}&studentId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.hasSubmission;
      }
    } catch (err) {
      console.error('Fehler beim Prüfen der Abgabe:', err);
    }
    return false;
  };

  // Vorschau-Funktion für Dateien (ohne H_ Check) - für Submission Upload Modal
  const previewFile = async (item: any) => {
    if (item.type !== 'file') return;
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // Prüfe ob es eine korrigierbare Datei (KA_, HÜ_, HU_) ist und ob sie bereits abgegeben wurde
      const isCorrectionFileType = isCorrectionFile(item.name);
      if (isCorrectionFileType) {
        // Prüfe in der Datenbank, ob bereits abgegeben
        try {
          const loginCode = localStorage.getItem('loginCode');
          const kaFilePath = item.name; // z.B. "KA_prozent-zinsrechnung.html" oder "HU_geometrische-abbildungen.html"
          
          if (loginCode) {
            const response = await fetch(`/api/ka-corrections/check-my-submission?kaFilePath=${encodeURIComponent(kaFilePath)}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-login-code': loginCode
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.exists === true) {
                const fileType = item.name.startsWith('KA_') ? 'Klassenarbeit' : 'Hausaufgabenüberprüfung';
                alert(`⏳ Diese ${fileType} wurde bereits abgegeben.\n\nBitte warte auf die Korrektur durch deine Lehrkraft.`);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Fehler beim Prüfen der Abgabe:', error);
          // Bei Fehler: Datei trotzdem öffnen, die echte Prüfung erfolgt in der HTML-Datei
        }
      }
      
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
      // PowerPoint-Dateien direkt herunterladen
      try {
        const response = await fetch(`/api/file-system-paths/read-powerpoint?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PowerPoint-Datei:', error);
        alert('PowerPoint-Datei konnte nicht heruntergeladen werden.');
      }
    } else if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
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
    } else if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
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

  // Funktion zum Öffnen von Dateien - nutzt die bereits vorhandenen, schönen Vorschau-Methoden
  const handleFileClick = async (item: any) => {
    if (item.type !== 'file') return;
    
    // Prüfe ob es eine H_ Datei (Hausaufgaben-Abgabe) ist
    if (item.name.startsWith('H_')) {
      // Finde den Lehrer für diese Datei (aus den Lerngruppen)
      let teacherId = null;
      
      for (const gruppe of lerngruppen) {
        if (gruppe.teacher?.id) {
          teacherId = gruppe.teacher.id;
          break;
        }
      }
      
      if (teacherId) {
        setSelectedSubmissionFile({ ...item, teacherId });
        setShowSubmissionModal(true);
        return;
      } else {
        alert('Fehler: Kein Lehrer gefunden. Bitte melde dich ab und wieder an.');
        return;
      }
    }
    
    const fileExtension = item.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'html' || fileExtension === 'htm') {
      // Prüfe ob es eine korrigierbare Datei (KA_, HÜ_, HU_) ist und ob sie bereits abgegeben wurde
      const isCorrectionFileType = isCorrectionFile(item.name);
      if (isCorrectionFileType) {
        // Prüfe in der Datenbank, ob bereits abgegeben
        try {
          const loginCode = localStorage.getItem('loginCode');
          const kaFilePath = item.name; // z.B. "KA_prozent-zinsrechnung.html" oder "HU_geometrische-abbildungen.html"
          
          if (loginCode) {
            const response = await fetch(`/api/ka-corrections/check-my-submission?kaFilePath=${encodeURIComponent(kaFilePath)}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-login-code': loginCode
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.exists === true) {
                const fileType = item.name.startsWith('KA_') ? 'Klassenarbeit' : 'Hausaufgabenüberprüfung';
                alert(`⏳ Diese ${fileType} wurde bereits abgegeben.\n\nBitte warte auf die Korrektur durch deine Lehrkraft.`);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Fehler beim Prüfen der Abgabe:', error);
          // Bei Fehler: Datei trotzdem öffnen, die echte Prüfung erfolgt in der HTML-Datei
        }
      }
      
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
      // PDF-Dateien mit der bestehenden Implementierung öffnen
      try {
        const response = await fetch(`/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          // Erstelle Blob mit benutzerdefiniertem Namen
          const file = new File([blob], item.name || 'document.pdf', { type: 'application/pdf' });
          const url = URL.createObjectURL(file);
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            // Cleanup nach 5 Sekunden
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          }
        } else {
          throw new Error('PDF konnte nicht geladen werden');
        }
      } catch (error) {
        console.error('Fehler beim Öffnen der PDF-Datei:', error);
        alert('Fehler beim Öffnen der PDF-Datei. Bitte versuchen Sie es erneut.');
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
      // PowerPoint-Dateien direkt herunterladen
      try {
        const response = await fetch(`/api/file-system-paths/read-powerpoint?filePath=${encodeURIComponent(item.path)}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Fehler beim Laden der PowerPoint-Datei:', error);
        alert('PowerPoint-Datei konnte nicht heruntergeladen werden.');
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
      
      // Verwende den Server-Port (3001) für HTML-Dateien
      const fullUrl = ext === 'html' 
        ? 'https://johnnymonkey.onrender.com' + material.filePath 
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

  // Prüft rekursiv, ob ein Knoten oder seine Nachkommen "Sonstige Leistungen" oder "Klassensenarbeiten" enthalten
  const hasExcludedDescendant = (node: any): boolean => {
    const nodeName = node.name.toLowerCase();
    
    // Prüfe ob der Knoten selbst "Sonstige Leistungen" oder "Klassensenarbeiten"/"Klassenarbeiten" ist
    if ((nodeName.includes('sonstige') && nodeName.includes('leistung')) ||
        nodeName.includes('klassensenarbeiten') || 
        nodeName.includes('klassenarbeiten')) {
      return true;
    }
    
    // Prüfe rekursiv alle Nachkommen
    if (node.children && node.children.length > 0) {
      return node.children.some((child: any) => hasExcludedDescendant(child));
    }
    
    return false;
  };

  // Prüft, ob ein Knoten in einer ausgeschlossenen Kategorie ist (Sonstige Leistungen, Klassensenarbeiten oder deren Eltern)
  const isExcludedCategory = (node: any): boolean => {
    const nodeName = node.name.toLowerCase();
    
    // Prüfe ob der Knoten selbst "Sonstige Leistungen" oder "Klassensenarbeiten"/"Klassenarbeiten" ist
    if ((nodeName.includes('sonstige') && nodeName.includes('leistung')) ||
        nodeName.includes('klassensenarbeiten') || 
        nodeName.includes('klassenarbeiten')) {
      return true;
    }
    
    // Prüfe ob der Knoten ein Elternteil (direkt oder indirekt) von "Sonstige Leistungen" oder "Klassensenarbeiten" ist
    if (node.children && node.children.length > 0) {
      return hasExcludedDescendant(node);
    }
    
    return false;
  };

  // Formatiert eine Note mit Tendenzen, außer wenn sie in einer ausgeschlossenen Kategorie ist
  const formatGradeWithTendency = (grade: number, node: any, schema: GradingSchema): string => {
    if (schema?.gradingSystem === 'MSS') {
      return grade.toFixed(0);
    }
    
    // Wenn die Kategorie ausgeschlossen ist, formatiere ohne Tendenz (nur ganze Noten)
    if (isExcludedCategory(node)) {
      // Runde auf ganze Note ohne Tendenz
      const rounded = Math.round(grade);
      if (rounded >= 1 && rounded <= 6) {
        return rounded.toString();
      }
      return grade.toFixed(1);
    }
    
    // Für nicht-ausgeschlossene Kategorien: Formatiere IMMER mit Tendenz
    // Verwende einen Toleranzwert für Gleitkomma-Vergleiche
    const tolerance = 0.01;
    
    // Standardwerte mit Tendenzen - mit Toleranz für Gleitkomma-Vergleiche
    if (Math.abs(grade - 1.0) < tolerance) return '1+';
    if (Math.abs(grade - 1.3) < tolerance) return '1-';
    if (Math.abs(grade - 1.7) < tolerance) return '2+';
    if (Math.abs(grade - 2.0) < tolerance) return '2+';
    if (Math.abs(grade - 2.3) < tolerance) return '2-';
    if (Math.abs(grade - 2.7) < tolerance) return '3+';
    if (Math.abs(grade - 3.0) < tolerance) return '3+';
    if (Math.abs(grade - 3.3) < tolerance) return '3-';
    if (Math.abs(grade - 3.7) < tolerance) return '4+';
    if (Math.abs(grade - 4.0) < tolerance) return '4+';
    if (Math.abs(grade - 4.3) < tolerance) return '4-';
    if (Math.abs(grade - 4.7) < tolerance) return '5+';
    if (Math.abs(grade - 5.0) < tolerance) return '5+';
    if (Math.abs(grade - 5.3) < tolerance) return '5-';
    if (Math.abs(grade - 6.0) < tolerance) return '6';
    
    // Wenn die Note nicht exakt einem Standardwert entspricht, runde auf den nächsten Wert mit Tendenz
    const standardGrades = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 4.3, 4.7, 5.0, 5.3, 6.0];
    let closestGrade = standardGrades[0];
    let minDiff = Math.abs(grade - closestGrade);
    
    for (const stdGrade of standardGrades) {
      const diff = Math.abs(grade - stdGrade);
      if (diff < minDiff) {
        minDiff = diff;
        closestGrade = stdGrade;
      }
    }
    
    // Formatiere den nächsten Standardwert mit Tendenz
    if (Math.abs(closestGrade - 1.0) < tolerance) return '1+';
    if (Math.abs(closestGrade - 1.3) < tolerance) return '1-';
    if (Math.abs(closestGrade - 1.7) < tolerance) return '2+';
    if (Math.abs(closestGrade - 2.0) < tolerance) return '2+';
    if (Math.abs(closestGrade - 2.3) < tolerance) return '2-';
    if (Math.abs(closestGrade - 2.7) < tolerance) return '3+';
    if (Math.abs(closestGrade - 3.0) < tolerance) return '3+';
    if (Math.abs(closestGrade - 3.3) < tolerance) return '3-';
    if (Math.abs(closestGrade - 3.7) < tolerance) return '4+';
    if (Math.abs(closestGrade - 4.0) < tolerance) return '4+';
    if (Math.abs(closestGrade - 4.3) < tolerance) return '4-';
    if (Math.abs(closestGrade - 4.7) < tolerance) return '5+';
    if (Math.abs(closestGrade - 5.0) < tolerance) return '5+';
    if (Math.abs(closestGrade - 5.3) < tolerance) return '5-';
    if (Math.abs(closestGrade - 6.0) < tolerance) return '6';
    
    return grade.toFixed(1);
  };

  // Funktion zum Kombinieren von Schema und Noten
  const combineSchemaWithGrades = (schema: GradingSchema, grades: Grade[], groupId: string) => {
    const schemaStructure = parseSchemaStructure(schema.structure);
    const gradesMap = new Map(grades.map(g => [g.categoryName, g]));
    
    // Prüfe, welche EPO-Noten freigegeben sind
    // Erstelle ein Set mit verschiedenen Schreibweisen für case-insensitive Vergleich
    const releasedEpoGrades = new Set<string>();
    epoGrades.forEach((epo: any) => {
      if ((epo.groupId === groupId || epo.group?.id === groupId) && epo.isReleased) {
        const epoKey = `epo ${epo.period}`;
        releasedEpoGrades.add(epoKey.toLowerCase().trim());
        // Füge auch Varianten hinzu für besseren Abgleich
        releasedEpoGrades.add(`epo${epo.period}`);
        releasedEpoGrades.add(`EPO ${epo.period}`);
        releasedEpoGrades.add(`Epo ${epo.period}`);
      }
    });
    
    // Hilfsfunktion: Prüft, ob ein Knoten EPO-Noten enthält (direkt oder indirekt)
    const containsEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.some((child: any) => containsEpo(child));
      }
      return node.name.toLowerCase().includes('epo');
    };
    
    // Hilfsfunktion: Prüft, ob ein Knoten nur EPO-Noten enthält
    const containsOnlyEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.every((child: any) => containsOnlyEpo(child));
      }
      return node.name.toLowerCase().includes('epo');
    };
    
    // Hilfsfunktion: Prüft, ob ein Knoten nur nicht freigegebene EPO-Noten enthält
    const containsOnlyUnreleasedEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.every((child: any) => containsOnlyUnreleasedEpo(child));
      }
      const isEpo = node.name.toLowerCase().includes('epo');
      if (isEpo) {
        const epoKey = node.name.toLowerCase().trim();
        // Prüfe verschiedene Varianten des EPO-Namens
        const epoKeyVariants = [
          epoKey,
          epoKey.replace(/\s+/g, ''), // "epo1" statt "epo 1"
          node.name.trim() // Original-Name
        ];
        const isReleased = epoKeyVariants.some(variant => 
          releasedEpoGrades.has(variant.toLowerCase().trim())
        );
        return !isReleased;
      }
      return false;
    };
    
    // Hilfsfunktion: Prüft, ob mindestens eine EPO-Note in diesem Knoten freigegeben ist
    const hasAnyReleasedEpo = (node: any): boolean => {
      if (node.children && node.children.length > 0) {
        return node.children.some((child: any) => hasAnyReleasedEpo(child));
      }
      const isEpo = node.name.toLowerCase().includes('epo');
      if (isEpo) {
        const epoKey = node.name.toLowerCase().trim();
        // Prüfe verschiedene Varianten des EPO-Namens
        const epoKeyVariants = [
          epoKey,
          epoKey.replace(/\s+/g, ''), // "epo1" statt "epo 1"
          node.name.trim() // Original-Name
        ];
        return epoKeyVariants.some(variant => 
          releasedEpoGrades.has(variant.toLowerCase().trim())
        );
      }
      return false;
    };
    
    const processNode = (node: any): any => {
      const isEpo = node.name.toLowerCase().includes('epo');
      // Suche nach der Note - case-insensitive für EPO-Noten
      let grade = gradesMap.get(node.name);
      if (!grade && isEpo) {
        // Für EPO-Noten: Suche case-insensitive
        const nodeNameLower = node.name.toLowerCase().trim();
        for (const [categoryName, gradeData] of gradesMap.entries()) {
          if (categoryName.toLowerCase().trim() === nodeNameLower) {
            grade = gradeData;
            break;
          }
        }
      }
      
      // Für EPO-Noten: Nur anzeigen, wenn freigegeben
      if (isEpo) {
        const epoKey = node.name.toLowerCase().trim();
        // Prüfe verschiedene Varianten des EPO-Namens
        const epoKeyVariants = [
          epoKey,
          epoKey.replace(/\s+/g, ''), // "epo1" statt "epo 1"
          node.name.trim() // Original-Name
        ];
        const isReleased = epoKeyVariants.some(variant => 
          releasedEpoGrades.has(variant.toLowerCase().trim())
        );
        if (!isReleased) {
          grade = undefined; // Nicht freigegeben, also nicht anzeigen
        }
      }
      
      const processedChildren = node.children.map(processNode);
      
      // Prüfe, ob dieser Knoten EPO-Noten enthält, aber keine freigegeben sind
      // Dies betrifft übergeordnete Kategorien wie "Sonstige Leistungen" oder "Mündliche Leistungen"
      const hasEpoButNoneReleased = containsEpo(node) && !hasAnyReleasedEpo(node);
      
      // Markiere Knoten, die nur nicht freigegebene EPO-Noten enthalten
      // ABER: Nur wenn es KEINE übergeordnete Kategorie ist (die soll immer angezeigt werden)
      const onlyUnreleasedEpo = containsOnlyEpo(node) && containsOnlyUnreleasedEpo(node) && !hasEpoButNoneReleased;
      
      return {
        ...node,
        grade: grade?.grade,
        weight: grade?.weight || node.weight,
        children: processedChildren,
        onlyUnreleasedEpo: onlyUnreleasedEpo, // Nur für vollständig EPO-basierte Blattknoten
        hasEpoButNoneReleased: hasEpoButNoneReleased // Flag für übergeordnete Kategorien mit EPO
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
    const isGesamtnote = node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe");
    const isGradeReleased = gradeReleases[schema.id] || false;
    
    // Kategorien mit EPO-Noten werden immer angezeigt (auch wenn nicht freigegeben)
    // Sie zeigen dann einen grauen Platzhalter
    
    // Blende die oberste Ebene aus, wenn es "Unter- und Mittelstufe" ist
    if (level === 0 && isGesamtnote) {
      // Zeige immer die Kinder (Teilnoten), aber nur die Gesamtnote selbst wenn freigegeben
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
          borderLeft: (level > 0 || (node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe"))) 
            ? `3px solid ${getLevelColor(level, node.name, isLeafNode)}` 
            : '1px solid #e0e0e0'
        }}>
          <Typography variant="caption" sx={{ 
            color: colors.textPrimary,
            fontSize: level === 0 ? '0.75rem' : level === 1 ? '0.7rem' : '0.6rem',
            fontWeight: level === 0 ? 700 : level === 1 ? 600 : 500,
            fontStyle: level === 0 ? 'italic' : 'normal'
          }}>
            {level === 0 ? '📚 ' : level === 1 ? '📝 ' : '• '}{node.name.toLowerCase().includes("unter") && node.name.toLowerCase().includes("mittelstufe") ? "Gesamtnote" : node.name}
          </Typography>
          
          {/* Entfernt - wird später in der Hauptlogik behandelt */}
          
          {(!hasChildren && (node.grade !== undefined || (node.name.toLowerCase().includes('epo') && node.grade === undefined))) ? (
            // Nur für Blattknoten - eingegebene Noten oder EPO-Noten (auch wenn nicht freigegeben)
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {(() => {
                const isEpo = node.name.toLowerCase().includes('epo');
                // Für EPO-Noten: Prüfe ob Note vorhanden (freigegeben), sonst zeige grauen Platzhalter
                if (isEpo && node.grade === undefined) {
                  return (
                    <Box sx={{ 
                      bgcolor: '#9E9E9E',
                      color: 'white',
                      px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                      py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                      borderRadius: 1,
                      fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                      fontWeight: 'bold',
                      minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                      textAlign: 'center',
                      opacity: 0.6
                    }}>
                      -
                    </Box>
                  );
                }
                return (
                  <Box sx={{ 
                    bgcolor: getLevelColor(level, node.name, true),
                    color: 'white',
                    px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                    py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                    borderRadius: 1,
                    fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                    fontWeight: 'bold',
                    minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                    textAlign: 'center'
                  }}>
                    {formatGradeWithTendency(node.grade, node, schema)}
                  </Box>
                );
              })()}
            </Box>
          ) : (node.grade !== undefined || calculatedGrade !== null || node.hasEpoButNoneReleased) ? (
            // Wenn es die Gesamtnote ist und nicht freigegeben, zeige nichts im Feld
            isGesamtnote && !isGradeReleased ? (
              <Typography variant="caption" sx={{ 
                color: colors.textSecondary,
                fontSize: level === 0 ? '0.6rem' : level === 1 ? '0.55rem' : '0.5rem',
                fontStyle: 'italic'
              }}>
                {/* Feld bleibt leer */}
              </Typography>
            ) : node.hasEpoButNoneReleased ? (
              // Wenn keine EPO-Noten freigegeben sind, zeige grauen Platzhalter
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  bgcolor: '#9E9E9E',
                  color: 'white',
                  px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                  py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                  borderRadius: 1,
                  fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                  fontWeight: 'bold',
                  minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                  textAlign: 'center',
                  opacity: 0.6
                }}>
                  -
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ 
                  bgcolor: getLevelColor(level, node.name, isLeafNode),
                  color: 'white',
                  px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                  py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                  borderRadius: 1,
                  fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                  fontWeight: 'bold',
                  minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                  textAlign: 'center',
                  opacity: 0.9,
                  boxShadow: `0 2px 4px ${getLevelColor(level, node.name, isLeafNode)}40`
                }}>
                  {formatGradeWithTendency((node.grade !== undefined ? node.grade : calculatedGrade)!, node, schema)}
                </Box>
              </Box>
            )
          ) : isLeafNode ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                bgcolor: '#9E9E9E',
                color: 'white',
                px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                borderRadius: 1,
                fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                fontWeight: 'bold',
                minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                textAlign: 'center',
                opacity: 0.6,
                border: '1px solid #999'
              }}>
                -
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ 
                bgcolor: '#9E9E9E',
                color: 'white',
                px: level === 0 ? 1 : level === 1 ? 0.8 : 0.6,
                py: level === 0 ? 0.3 : level === 1 ? 0.25 : 0.2,
                borderRadius: 1,
                fontSize: level === 0 ? '0.7rem' : level === 1 ? '0.65rem' : '0.55rem',
                fontWeight: 'bold',
                minWidth: level === 0 ? '32px' : level === 1 ? '28px' : '24px',
                textAlign: 'center',
                opacity: 0.6,
                border: '1px solid #999'
              }}>
                -
              </Box>
            </Box>
          )}
        </Box>
        
        {hasChildren && (
          <Box sx={{ mt: 0.3 }}>
            {node.children
              .filter((child: any) => !child.onlyUnreleasedEpo) // Filtere nicht freigegebene EPO-Kategorien
              .map((child: any) => renderGradeNode(child, schema, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  // Funktion zur Bestimmung der Farbe basierend auf dem Level und Knotennamen
  const getLevelColor = (level: number, nodeName?: string, isLeafNode: boolean = false): string => {
    const name = (nodeName || '').toLowerCase();
    
    // Gesamtnote: Hellgrün (auch für "Unter- und Mittelstufe")
    if (name.includes('gesamtnote') || name.includes('gesamt') || 
        (name.includes('unter') && name.includes('mittelstufe'))) {
      return '#81C784'; // Hellgrün für Gesamtnote
    }
    
    // EPO 1: Hellblau
    if (name.includes('epo 1') || name.includes('epo1')) {
      return '#64B5F6'; // Hellblau für EPO 1
    }
    
    // EPO 2: Orange (bleibt wie bisher)
    if (name.includes('epo 2') || name.includes('epo2')) {
      return '#F57C00'; // Orange für EPO 2
    }
    
    // KA 1 und KA 2: Rosaiges Rot
    if (name.includes('ka 1') || name.includes('ka 2') || 
        name.includes('ka1') || name.includes('ka2') ||
        (name.includes('klassenarbeit') && (name.includes('1') || name.includes('2')))) {
      return '#F48FB1'; // Rosaiges Rot für KA 1 und KA 2
    }
    
    // Quizze / Hüs, Sonstiges und Mündliche Leistungen: Grün
    if (name.includes('quizze') || name.includes('hüs') || name.includes('hü') ||
        name.includes('sonstiges') || name.includes('mündlich')) {
      return '#2E7D32'; // Grün für Quizze/Hüs, Sonstiges und Mündliche Leistungen
    }
    
    // EPO-Noten (allgemein, falls nicht 1 oder 2): Orange
    if (name.includes('epo')) {
      return '#F57C00'; // Orange für EPO-Noten
    }
    
    // Allerunterste Ebene (Blattknoten): Gelb (nur wenn keine spezifische Kategorie)
    if (isLeafNode && !name.includes('ka') && !name.includes('epo') && 
        !name.includes('quizze') && !name.includes('hü') && !name.includes('sonstiges')) {
      return '#FFC107'; // Gelb für unterste Ebene
    }
    
    // Klassenarbeiten (allgemein): Lila
    if (name.includes('klassenarbeit') || name.includes('ka')) {
      return '#9C27B0'; // Lila für Klassenarbeiten
    }
    
    // Sonstige Leistungen: Lila
    if (name.includes('sonstige') || (name.includes('leistungen') && !name.includes('mündlich'))) {
      return '#9C27B0'; // Lila für Sonstige Leistungen
    }
    
    // Fallback basierend auf Level
    if (level === 0) return '#1565C0'; // Dunkelblau für oberste Ebene
    if (level === 1) return '#2E7D32'; // Grün für mittlere Ebene
    if (level >= 2) return '#FFC107'; // Gelb für untere Ebene
    
    return '#9E9E9E'; // Grau für weitere Ebenen
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
          
          // Lade Freigabestatus der Gesamtnote
          const releaseResponse = await fetch(`/api/grades/release/${userId}/${schema.id}`);
          if (releaseResponse.ok) {
            const releaseData = await releaseResponse.json();
            setGradeReleases(prev => ({ ...prev, [schema.id]: releaseData.isReleased || false }));
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

  // Lade Submission-Status für alle H_ Dateien
  useEffect(() => {
    const loadSubmissionStatuses = async () => {
      const statuses: {[filePath: string]: boolean} = {};
      
      // Durchsuche alle geladenen Ordnerinhalte nach H_ Dateien
      for (const key in assignedFolderContents) {
        const items = assignedFolderContents[key];
        
        const checkFilesRecursively = async (fileItems: any[]) => {
          for (const item of fileItems) {
            if (item.type === 'file' && item.name.startsWith('H_')) {
              const hasSubmission = await checkSubmissionStatus(item.path);
              statuses[item.path] = hasSubmission;
            }
            if (item.type === 'directory' && item.children) {
              await checkFilesRecursively(item.children);
            }
          }
        };
        
        await checkFilesRecursively(items);
      }
      
      setSubmissionStatuses(statuses);
    };
    
    if (Object.keys(assignedFolderContents).length > 0) {
      loadSubmissionStatuses();
    }
  }, [assignedFolderContents, userId]);

  // Lade ungelesene Nachrichten regelmäßig
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const loginCode = localStorage.getItem('loginCode') || '';
        const response = await fetch('/api/messages/unread-count', {
          headers: {
            'Content-Type': 'application/json',
            'x-login-code': loginCode
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadMessageCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Fehler beim Laden der ungelesenen Nachrichten:', error);
      }
    };

    loadUnreadCount();
    // Lade alle 30 Sekunden neu
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const fetchLerngruppen = async () => {
      try {
        // Lade zuerst den Student-Namen
        await fetchStudentData(userId);
        
        console.log('📚 Fetching learning groups for student:', userId);
        const response = await fetch(`/api/learning-groups/student/${userId}`);
        console.log('📡 Response status:', response.status, response.statusText);
        console.log('📡 Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          let errorData;
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            console.error('❌ Non-JSON error response:', text);
            throw new Error(`Server-Fehler: ${text.substring(0, 100)}`);
          }
          console.error('❌ Error loading groups:', errorData);
          throw new Error(errorData.error || errorData.message || 'Lerngruppen konnten nicht geladen werden');
        }
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error('❌ Non-JSON response:', text);
          throw new Error(`Server-Fehler: Ungültige Antwort vom Server`);
        }
        console.log('✅ Loaded', data.length, 'learning groups');
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
          
          // Lade Mitarbeitsbewertungen
          await fetchParticipationData(userId);
          await fetchEpoGrades(userId);
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
                    bgcolor: '#1976d2', // Blau wie die Fläche unten
                    boxShadow: '0 1.4px 2.8px rgba(0,0,0,0.12)'
                  }}
                >
                  {studentName.charAt(0)}
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto', alignItems: 'center' }}>
                {/* Logout Button */}
                <Button 
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{
                    minWidth: 70,
                    bgcolor: '#333',
                    color: 'white',
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#222' },
                    borderRadius: 1.4,
                    fontSize: '0.7rem',
                    py: 0.35,
                    px: 1.2
                  }}
                  onClick={onLogout}
                >
                  Logout
                </Button>
              </Box>
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

                </Box>

                {/* Character Stats */}
                <Grid container spacing={1.4} sx={{ mb: 2.1 }}>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#e0e0e0'
                      }
                    }}
                    onClick={() => {
                      setFlashcardLearningOpen(true);
                      setGradesExpanded(false);
                      setParticipationExpanded(false);
                    }}
                    >
                      <Typography variant="h4" sx={{ 
                        color: '#424242',
                        fontWeight: 'bold',
                        fontSize: '1.8rem',
                        mb: 0.35
                      }}>
                        🗂️
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#424242',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Karteikarten lernen
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#e0e0e0'
                      }
                    }}
                    onClick={() => {
                      setShowSubmissionStats(true);
                      setGradesExpanded(false);
                      setParticipationExpanded(false);
                    }}
                    >
                      <Typography variant="h4" sx={{ 
                        color: '#424242',
                        fontWeight: 'bold',
                        fontSize: '1.8rem',
                        mb: 0.35
                      }}>
                        📊
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#424242',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Abgabestatistik
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ 
                      bgcolor: '#f5f5f5',
                      borderRadius: 1.4,
                      p: 1.4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      '&:hover': {
                        bgcolor: '#e0e0e0'
                      }
                    }}
                    onClick={() => {
                      setShowInbox(true);
                      setGradesExpanded(false);
                      setParticipationExpanded(false);
                    }}
                    >
                      {unreadMessageCount > 0 && (
                        <Box sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: '#f44336',
                          color: '#fff',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          zIndex: 1
                        }}>
                          {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                        </Box>
                      )}
                      <Typography variant="h4" sx={{ 
                        color: '#424242',
                        fontWeight: 'bold',
                        fontSize: '1.8rem',
                        mb: 0.35
                      }}>
                        📬
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#424242',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Posteingang
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Noten und Mitarbeit Kacheln */}
                {lerngruppen.length > 0 && (
                  <Grid container spacing={1.4} sx={{ mb: 2.1 }}>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        bgcolor: '#f5f5f5',
                        borderRadius: 1.4,
                        p: 1.4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: '#e0e0e0'
                        }
                      }}
                      onClick={() => {
                        if (gradesExpanded) {
                          setGradesExpanded(false);
                        } else {
                          setGradesExpanded(true);
                          setParticipationExpanded(false);
                        }
                      }}
                      >
                        <Typography variant="h4" sx={{ 
                          color: '#424242',
                          fontWeight: 'bold',
                          fontSize: '1.8rem',
                          mb: 0.35
                        }}>
                          📝
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: '#424242',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          Noten
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        bgcolor: '#f5f5f5',
                        borderRadius: 1.4,
                        p: 1.4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: '#e0e0e0'
                        }
                      }}
                      onClick={() => {
                        if (participationExpanded) {
                          setParticipationExpanded(false);
                        } else {
                          setParticipationExpanded(true);
                          setGradesExpanded(false);
                        }
                      }}
                      >
                        <Typography variant="h4" sx={{ 
                          color: '#424242',
                          fontWeight: 'bold',
                          fontSize: '1.8rem',
                          mb: 0.35
                        }}>
                          👋
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: '#424242',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          Epochal
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {/* Noten Anzeige */}
                {lerngruppen.length > 0 && gradesExpanded && (
                  <Box sx={{ mt: 2.1 }}>
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
                              const hierarchicalGrades = combineSchemaWithGrades(schema, groupGrades, gruppe.id);

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
                  </Box>
                )}

                {/* Mitarbeitsbewertungen Anzeige */}
                {lerngruppen.length > 0 && participationExpanded && (
                  <Box sx={{ mt: 2.1 }}>
                    {participationLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, mt: 1 }}>
                            {Object.keys(participationData).length === 0 ? (
                              <Typography variant="caption" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.65rem',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                py: 1
                              }}>
                                Noch keine Epochalbewertungen vorhanden
                              </Typography>
                            ) : (
                              Object.keys(participationData).map((groupId) => {
                                const groupData = participationData[groupId];
                                const group = lerngruppen.find(g => g.id === groupId);
                                
                                if (!group) return null;
                                
                                const extractLessonKeywordFromComment = (text: string | undefined | null): string => {
                                  if (!text) return '';
                                  const m = text.match(/\[K:(.*?)\]/);
                                  return m ? m[1].trim() : '';
                                };
                                
                                const getValueEmoji = (value: number) => {
                                  if (value === 2) return '😄';
                                  if (value === 1) return '😊';
                                  if (value === 0) return '😐';
                                  if (value === -1) return '🙁';
                                  if (value === -2) return '😞';
                                  return '😐';
                                };
                                
                                const getValueColor = (value: number) => {
                                  if (value === 2) return '#4CAF50'; // Grün = sehr gut
                                  if (value === 1) return '#2196F3'; // Blau = gut
                                  if (value === 0) return '#9E9E9E';
                                  if (value === -1) return '#FFC107';
                                  if (value === -2) return '#F44336';
                                  return '#9E9E9E';
                                };
                                
                                const getGradeColor = (grade: number | null) => {
                                  if (!grade) return '#9E9E9E';
                                  if (grade <= 1.5) return '#4CAF50';
                                  if (grade <= 2.5) return '#8BC34A';
                                  if (grade <= 3.5) return '#FFC107';
                                  if (grade <= 4.5) return '#FF9800';
                                  return '#F44336';
                                };
                                
                                return (
                                  <Box key={groupId} sx={{ 
                                    p: 1.4,
                                    bgcolor: '#fff9e6',
                                    borderRadius: 1.4,
                                    border: '1px solid #ffcc80'
                                  }}>
                                    <Box sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center',
                                      mb: 1,
                                      pb: 0.5,
                                      borderBottom: `2px solid #ffcc8030`
                                    }}>
                                      <Typography variant="body2" sx={{ 
                                        color: '#F57C00',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                      }}>
                                        📚 {group.name}
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                      </Box>
                                    </Box>
                                    
                                    {/* Grober grafischer Verlauf */}
                                    {groupData.participations.length > 0 && (
                                      <Box sx={{ mb: 1.5, mt: 1 }}>
                                        {/* Zeitraum-Markierungen */}
                                        {((groupData.period1Hours && groupData.period1Hours > 0) || (groupData.period2Hours && groupData.period2Hours > 0)) && (
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            gap: 0.05,
                                            mb: 0.3,
                                            px: 0.2,
                                            fontSize: '0.55rem',
                                            color: 'text.secondary'
                                          }}>
                                            {(() => {
                                              const sortedParticipations = [...groupData.participations].sort((a, b) => a.lessonIndex - b.lessonIndex);
                                              const totalLessons = sortedParticipations.length;
                                              const period1Count = groupData.period1Hours ? Math.min(groupData.period1Hours, totalLessons) : 0;
                                              const period2Count = groupData.period2Hours ? Math.min(groupData.period2Hours, totalLessons - period1Count) : 0;
                                              
                                              return (
                                                <>
                                                  {period1Count > 0 && (
                                                    <Box sx={{ 
                                                      flex: period1Count,
                                                      textAlign: 'center',
                                                      color: '#1976D2',
                                                      fontWeight: 600,
                                                      fontSize: '0.6rem',
                                                      borderTop: '1.5px solid #1976D2',
                                                      pt: 0.2
                                                    }}>
                                                      Zeitraum 1
                                                    </Box>
                                                  )}
                                                  {period2Count > 0 && (
                                                    <Box sx={{ 
                                                      flex: period2Count,
                                                      textAlign: 'center',
                                                      color: '#F57C00',
                                                      fontWeight: 600,
                                                      fontSize: '0.6rem',
                                                      borderTop: '1.5px solid #F57C00',
                                                      pt: 0.2
                                                    }}>
                                                      Zeitraum 2
                                                    </Box>
                                                  )}
                                                </>
                                              );
                                            })()}
                                          </Box>
                                        )}
                                        <Box sx={{ 
                                          display: 'flex', 
                                          alignItems: 'flex-end',
                                          gap: 0,
                                          height: 32,
                                          px: 0.1,
                                          pb: 0.3,
                                          position: 'relative',
                                          width: '100%'
                                        }}>
                                          {groupData.participations
                                            .sort((a, b) => a.lessonIndex - b.lessonIndex)
                                            .map((participation, index) => {
                                              // Normalisiere Wert zu Höhe (0-32px) - kompakter
                                              // Grün (2 = sehr gut) höher als Blau (1 = gut)
                                              // -2 -> 6px, -1 -> 10px, 0 -> 14px, 2 (grün/sehr gut) -> 28px, 1 (blau/gut) -> 20px
                                              const height = participation.value === 2 ? 28 :  // Grün (sehr gut) = höher
                                                             participation.value === 1 ? 20 :  // Blau (gut) = niedriger
                                                             participation.value === 0 ? 14 :  // Grau (neutral)
                                                             participation.value === -1 ? 10 :  // Gelb (schlecht)
                                                             6; // Rot (sehr schlecht)
                                              // Balkenbreite: Maximal 2px pro Balken, damit alles passt
                                              const width = `${Math.max(0.5, 100 / groupData.participations.length)}%`;
                                              
                                              const hasComment = participation.comment && participation.comment.trim().length > 0;
                                              
                                              // Kommentar ohne Thema-Tag für Tooltip
                                              const tooltipTitle = participation.comment 
                                                ? participation.comment.replace(/\s*\[K:.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim()
                                                : '';
                                              
                                              // Bestimme Period-Farbe für Rahmen
                                              const participationPeriod = (participation as any).period || 0;
                                              const periodBorderColor = participationPeriod === 1 ? '#1976D2' : 
                                                                        participationPeriod === 2 ? '#F57C00' : 'transparent';
                                              
                                              // Prüfe ob dies der Start eines Zeitraums ist
                                              const prevParticipation = index > 0 ? groupData.participations[index - 1] : null;
                                              const prevPeriod = prevParticipation ? ((prevParticipation as any).period || 0) : 0;
                                              const isPeriodStart = participationPeriod > 0 && (index === 0 || prevPeriod !== participationPeriod);
                                              const isPeriodEnd = participationPeriod > 0 && (index === groupData.participations.length - 1 || 
                                                (index < groupData.participations.length - 1 && ((groupData.participations[index + 1] as any).period || 0) !== participationPeriod));
                                              
                                              const barBox = (
                                                <Box
                                                  key={participation.lessonIndex}
                                                  sx={{
                                                    flex: `0 0 ${width}`,
                                                    width: width,
                                                    minWidth: '1px',
                                                    height: `${height}px`,
                                                    bgcolor: getValueColor(participation.value),
                                                    borderRadius: '1px 1px 0 0',
                                                    opacity: 0.7,
                                                    transition: 'all 0.2s',
                                                    position: 'relative',
                                                    cursor: hasComment ? 'pointer' : 'default',
                                                    borderLeft: isPeriodStart ? `1px solid ${periodBorderColor}` : 'none',
                                                    borderRight: isPeriodEnd ? `1px solid ${periodBorderColor}` : 'none',
                                                    borderTop: periodBorderColor !== 'transparent' ? `1px solid ${periodBorderColor}` : 'none',
                                                    '&:hover': {
                                                      opacity: 1,
                                                      transform: 'scaleY(1.15)',
                                                      transformOrigin: 'bottom'
                                                    }
                                                  }}
                                                >
                                                  {hasComment && (
                                                    <Box
                                                      sx={{
                                                        position: 'absolute',
                                                        top: 1,
                                                        right: 1,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        bgcolor: '#FF9800',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.5rem',
                                                        fontWeight: 600,
                                                        color: 'white',
                                                        zIndex: 1,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                      }}
                                                    >
                                                      K
                                                    </Box>
                                                  )}
                                                </Box>
                                              );
                                              
                                              // Zeige Tooltip nur wenn Kommentar vorhanden ist
                                              if (tooltipTitle) {
                                                return (
                                                  <Tooltip
                                                    key={participation.lessonIndex}
                                                    title={tooltipTitle}
                                                    arrow
                                                    placement="top"
                                                  >
                                                    {barBox}
                                                  </Tooltip>
                                                );
                                              }
                                              
                                              return barBox;
                                            })}
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })
                            )}
                          </Box>
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
                          {/* Überschrift entfernt */}
                          
                          {/* Zugeordnete Ordner - direkt unterhalb des Headers, exakt wie im TeacherDashboard */}
                          {assignedFolders[gruppe.id] && assignedFolders[gruppe.id].length > 0 ? (
                            <Box>
                              {assignedFolders[gruppe.id]
                                .filter((folderPath: string) => {
                                  // Filtere Ordner mit dem Namen "Karteikarten" aus
                                  const folderName = folderPath.split('/').pop() || folderPath;
                                  return !folderName.toLowerCase().includes('karteikarten');
                                })
                                .map((folderPath: string) => {
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
                          {(() => {
                            // Prüfe, ob es tatsächlich zugeordnete Inhalte gibt
                            const hasAssignedContent = subjects.some(subject => 
                              (subjectAssignments[subject.id] || []).includes(gruppe.id)
                            );
                            
                            if (!hasAssignedContent) {
                              return null; // Keine Box anzeigen, wenn leer
                            }
                            
                            return (
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
                                </Box>
                              </Box>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
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

      {/* Flashcard Learning Modal */}
      {/* Inbox Modal */}
      <InboxModal
        open={showInbox}
        onClose={() => {
          setShowInbox(false);
          // Lade unreadCount neu wenn Modal geschlossen wird
          const loadUnreadCount = async () => {
            try {
              const loginCode = localStorage.getItem('loginCode') || '';
              const response = await fetch('/api/messages/unread-count', {
                headers: {
                  'Content-Type': 'application/json',
                  'x-login-code': loginCode
                }
              });
              if (response.ok) {
                const data = await response.json();
                setUnreadMessageCount(data.unreadCount || 0);
              }
            } catch (error) {
              console.error('Fehler:', error);
            }
          };
          loadUnreadCount();
        }}
      />

      <FlashcardLearningModal
        open={flashcardLearningOpen}
        onClose={() => setFlashcardLearningOpen(false)}
        studentId={userId}
      />

      {/* Submission Upload Modal für H__ Dateien */}
      {showSubmissionModal && selectedSubmissionFile && (
        <SubmissionUpload
          fileName={selectedSubmissionFile.name}
          filePath={selectedSubmissionFile.path}
          teacherId={selectedSubmissionFile.teacherId}
          studentId={userId}
          onViewFile={(item: any) => previewFile(item)}
          onClose={() => {
            setShowSubmissionModal(false);
            setSelectedSubmissionFile(null);
            // Aktualisiere Submission-Status nach dem Schließen
            if (selectedSubmissionFile.path) {
              checkSubmissionStatus(selectedSubmissionFile.path).then((hasSubmission: boolean) => {
                setSubmissionStatuses((prev: {[filePath: string]: boolean}) => ({
                  ...prev,
                  [selectedSubmissionFile.path]: hasSubmission
                }));
              });
            }
          }}
        />
      )}

      {/* Abgabestatistik Dialog */}
      <Dialog
        open={showSubmissionStats}
        onClose={() => setShowSubmissionStats(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0', py: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
              📊 Deine Abgabestatistik
            </Typography>
            <IconButton
              onClick={() => setShowSubmissionStats(false)}
              sx={{ width: 24, height: 24, p: 0 }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 2 }}>
          <SubmissionStatistics userId={userId} submissionStats={submissionStats} setSubmissionStats={setSubmissionStats} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// ===== FLASHCARD LEARNING MODAL KOMPONENTE =====

interface FlashcardLearningModalProps {
  open: boolean;
  onClose: () => void;
  studentId?: string;
  isTeacher?: boolean;
  teacherDeck?: any; // Deck für Lehrer-Modus
  teacherId?: string; // Lehrer-ID für Export
}

export const FlashcardLearningModal: React.FC<FlashcardLearningModalProps> = ({ open, onClose, studentId, isTeacher = false, teacherDeck, teacherId }) => {
  const [assignedDecks, setAssignedDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [learningMode, setLearningMode] = useState<'selection' | 'learning' | 'viewing'>('selection');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsReviewed: 0,
    correctAnswers: 0,
    incorrectAnswers: 0
  });
  const [helpAnchorEl, setHelpAnchorEl] = useState<HTMLElement | null>(null);
  // Für Lehrer: Track welche Karten bereits gelernt wurden
  const [teacherLearnedCards, setTeacherLearnedCards] = useState<Set<string>>(new Set());

  // Export-Funktionen für Lern-Fortschritt (Schüler) oder Deck-Daten (Lehrer)
  const exportLearningProgress = async (format: 'json' | 'csv', deckId?: string) => {
    try {
      const params = new URLSearchParams({
        format,
        ...(deckId && { deckId })
      });
      
      let response: Response;
      let filenamePrefix: string;
      
      if (isTeacher && teacherId) {
        // Lehrer-Export: Deck-Daten
        response = await fetch(`/api/flashcards/teacher/${teacherId}/export?${params}`);
        filenamePrefix = `flashcard-decks-${deckId ? 'deck-' + deckId : 'all'}`;
      } else if (studentId) {
        // Schüler-Export: Lern-Fortschritt
        response = await fetch(`/api/flashcards/student/${studentId}/export?${params}`);
        filenamePrefix = `learning-progress-${deckId ? 'deck-' + deckId : 'all'}`;
      } else {
        alert('Export nicht verfügbar: Keine Benutzer-ID gefunden.');
        return;
      }
      
      if (response.ok) {
        if (format === 'csv') {
          // CSV-Download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          // JSON-Download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('Export fehlgeschlagen:', response.statusText, errorData);
        alert(`Export fehlgeschlagen: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // Tastatur-Shortcuts für Bewertungen
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Leertaste zum Umdrehen der Karte (funktioniert in beiden Modi)
      if (event.key === ' ') {
        event.preventDefault();
        setShowAnswer(!showAnswer);
        return;
      }
      
      if (learningMode === 'learning' && showAnswer) {
        // Bewertungen nur im Lern-Modus (5-Stufen-System) - umgedreht für bessere UX
        switch (event.key) {
          case '1':
            handleNextCard(5); // Taste 1 = Beste Bewertung (5)
            break;
          case '2':
            handleNextCard(4); // Taste 2 = Gute Bewertung (4)
            break;
          case '3':
            handleNextCard(3); // Taste 3 = Mittelmäßige Bewertung (3)
            break;
          case '4':
            handleNextCard(2); // Taste 4 = Schlechte Bewertung (2)
            break;
          case '5':
            handleNextCard(1); // Taste 5 = Schlechteste Bewertung (1)
            break;
        }
      } else if (learningMode === 'viewing') {
        // Pfeiltasten für Navigation im Ansehen-Modus
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
            setShowAnswer(false); // Karte zurücksetzen
            break;
          case 'ArrowRight':
            event.preventDefault();
            setCurrentCardIndex(Math.min(selectedDeck?.cards?.length - 1 || 0, currentCardIndex + 1));
            setShowAnswer(false); // Karte zurücksetzen
            break;
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, learningMode, showAnswer]);

  // Funktion zum Formatieren von Karten-Text (Bold und Italic)
  const formatCardText = (text: string) => {
    if (!text) return '';
    
    // **text** wird zu <strong>text</strong> (nur der Text zwischen **)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // *text* wird zu <em>text</em> (aber nur wenn es nicht bereits bold ist)
    formattedText = formattedText.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    return formattedText;
  };

  // Lade zugewiesene Karteikarten beim Öffnen
  useEffect(() => {
    if (open) {
      if (isTeacher && teacherDeck) {
        // Lehrer-Modus: Deck als Array formatieren, wie bei Schülern
        // Berücksichtige bereits gelernte Karten
        const totalCards = teacherDeck.cards?.length || 0;
        const unlearnedCards = teacherDeck.cards?.filter((card: any) => !teacherLearnedCards.has(card.id)) || [];
        const dueCardsCount = unlearnedCards.length;
        
        const formattedDeck = {
          ...teacherDeck,
          totalCards: totalCards,
          dueCards: dueCardsCount, // Nur nicht gelernte Karten sind fällig
          completedCards: 0,
          progressPercentage: 0,
          qualityStats: { perfect: 0, partial: 0, notKnown: 0 },
          levelStats: { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
          dueCardsByDate: { today: dueCardsCount, tomorrow: 0, thisWeek: 0, later: 0 },
          reviewStats: { totalReviews: 0, avgReviewCount: 0, lastReviewDate: '-' }
        };
        setAssignedDecks([formattedDeck]);
        setLearningMode('selection');
        setSelectedDeck(null);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setLoading(false);
      } else if (studentId) {
        // Schüler-Modus: Decks laden
        fetchAssignedDecks();
      }
    } else {
      // Reset beim Schließen
      setSelectedDeck(null);
      setLearningMode('selection');
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setAssignedDecks([]);
    }
  }, [open, isTeacher, teacherDeck, studentId, teacherLearnedCards]);

  const fetchAssignedDecks = async () => {
    if (!studentId || isTeacher) return; // Nur für Schüler
    try {
      setLoading(true);
      const response = await fetch(`/api/flashcards/student/${studentId}/assigned`);
      if (response.ok) {
        const data = await response.json();
        const decks = data.decks || [];
        
        // Lade den Fortschritt für jedes Deck
        const decksWithProgress = await Promise.all(
          decks.map(async (deck: any) => {
            try {
              // Verwende den korrekten API-Endpoint für den Fortschritt
              const progressResponse = await fetch(`/api/flashcards/student/${studentId}/progress`);
              if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                
                // Extrahiere das progress Array aus der Antwort
                let progressArray = [];
                if (progressData && progressData.progress && Array.isArray(progressData.progress)) {
                  progressArray = progressData.progress;
                } else if (Array.isArray(progressData)) {
                  progressArray = progressData;
                } else {
                  console.warn('Progress data is not an array:', progressData);
                  progressArray = [];
                }
                
                // Filtere den Fortschritt für dieses spezifische Deck
                const deckProgress = progressArray.filter((item: any) => 
                  item.card && item.card.deckId === deck.id
                );
                
                // Berechne detaillierte Statistiken
                const totalCards = deck.cards?.length || 0;
                
                // Bewertungs-Statistiken für 5-Stufen-System
                const qualityStats = {
                  perfect: deckProgress.filter((item: any) => item.quality === 4 || item.quality === 5).length, // Gut/Sehr gut
                  partial: deckProgress.filter((item: any) => item.quality === 3).length, // Mittelmäßig
                  notKnown: deckProgress.filter((item: any) => item.quality === 1 || item.quality === 2).length // Sehr schlecht/Schlecht
                };
                
                // Level-Statistiken
                const levelStats = {
                  level0: deckProgress.filter((item: any) => item.level === 0).length,
                  level1: deckProgress.filter((item: any) => item.level === 1).length,
                  level2: deckProgress.filter((item: any) => item.level === 2).length,
                  level3: deckProgress.filter((item: any) => item.level === 3).length,
                  level4: deckProgress.filter((item: any) => item.level === 4).length,
                  level5: deckProgress.filter((item: any) => item.level === 5).length
                };
                
                // Fällige Karten nach Datum gruppiert
                const now = new Date();
                console.log('Debug - Current time:', now.toISOString());
                
                const dueCardsByDate = {
                  today: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return true;
                    // nextReview kann ein ISO-Datums-String oder Millisekunden-Timestamp sein
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      // Wenn es ein Millisekunden-Timestamp ist
                      reviewDate = new Date(item.nextReview);
                    } else {
                      // Wenn es ein ISO-String ist
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    // Setze beide Daten auf Mitternacht für korrekten Vergleich
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isDue = reviewDateMidnight <= nowMidnight;
                    
                    console.log(`Debug - Card ${item.cardId}: nextReview=${item.nextReview}, reviewDate=${reviewDate.toISOString()}, isDue=${isDue}`);
                    return isDue;
                  }).length,
                  tomorrow: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return false;
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      reviewDate = new Date(item.nextReview);
                    } else {
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);
                    return reviewDateMidnight > now && reviewDateMidnight <= tomorrow;
                  }).length,
                  thisWeek: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return false;
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      reviewDate = new Date(item.nextReview);
                    } else {
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    weekEnd.setHours(0, 0, 0, 0);
                    return reviewDateMidnight > now && reviewDateMidnight <= weekEnd;
                  }).length,
                  later: deckProgress.filter((item: any) => {
                    if (!item.nextReview) return false;
                    let reviewDate: Date;
                    if (typeof item.nextReview === 'number') {
                      reviewDate = new Date(item.nextReview);
                    } else {
                      reviewDate = new Date(item.nextReview);
                    }
                    
                    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    weekEnd.setHours(0, 0, 0, 0);
                    return reviewDateMidnight > weekEnd;
                  }).length
                };
                
                console.log('Debug - dueCardsByDate:', dueCardsByDate);
                
                // Berechne fällige Karten: 
                // 1. Gelernte Karten die fällig sind (mit Qualitätsbewertung)
                // 2. Karten ohne Qualitätsbewertung (müssen noch bewertet werden)
                const learnedCardsDue = dueCardsByDate.today;
                const cardsWithoutQuality = deckProgress.filter((item: any) => item.quality === null || item.quality === undefined).length;
                const unlearnedCards = (deck.cards?.length || 0) - deckProgress.length;
                const dueCards = learnedCardsDue + cardsWithoutQuality + unlearnedCards;
                
                const completedCards = deckProgress.filter((item: any) => 
                  item.level >= 3 && item.quality !== null && item.quality !== undefined
                ).length;
                
                // Review-Statistiken
                const reviewStats = {
                  totalReviews: deckProgress.reduce((sum: number, item: any) => sum + (item.reviewCount || 0), 0),
                  avgReviewCount: deckProgress.length > 0 ? Math.round(deckProgress.reduce((sum: number, item: any) => sum + (item.reviewCount || 0), 0) / deckProgress.length) : 0,
                  lastReviewDate: deckProgress.length > 0 ? new Date(Math.max(...deckProgress.map((item: any) => {
                    if (typeof item.lastReviewed === 'number') {
                      return item.lastReviewed;
                    } else {
                      return new Date(item.lastReviewed).getTime();
                    }
                  }))).toLocaleDateString('de-DE') : '-'
                };
                
                return {
                  ...deck,
                  totalCards,
                  dueCards: dueCards, // Verwende nur die tatsächlich fälligen Karten
                  completedCards,
                  progressPercentage: totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0,
                  qualityStats,
                  levelStats,
                  dueCardsByDate,
                  reviewStats
                };
              }
              return {
                ...deck,
                totalCards: deck.cards?.length || 0,
                dueCards: deck.cards?.length || 0, // Alle Karten sind fällig, wenn kein Fortschritt
                completedCards: 0,
                progressPercentage: 0,
                dueCardsByDate: {
                  today: deck.cards?.length || 0, // Alle Karten sind heute fällig
                  tomorrow: 0,
                  thisWeek: 0,
                  later: 0
                },
                qualityStats: { perfect: 0, partial: 0, notKnown: 0 },
                levelStats: { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
                reviewStats: { totalReviews: 0, avgReviewCount: 0, lastReviewDate: '-' }
              };
            } catch (error) {
              console.error(`Error loading progress for deck ${deck.id}:`, error);
              return {
                ...deck,
                totalCards: deck.cards?.length || 0,
                dueCards: deck.cards?.length || 0,
                completedCards: 0,
                progressPercentage: 0
              };
            }
          })
        );
        
        setAssignedDecks(decksWithProgress);
      }
    } catch (error) {
      console.error('Error fetching assigned decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const startLearningSession = async (deck: any) => {
    // Lehrer-Modus: Gleiche Logik wie Schüler
    if (isTeacher) {
      // Filtere nicht gelernte Karten für Lehrer
      const allCards = deck.cards || [];
      const unlearnedCards = allCards.filter((card: any) => !teacherLearnedCards.has(card.id));
      const dueCardsCount = unlearnedCards.length;
      
      const deckWithCards = {
        ...deck,
        cards: unlearnedCards.length > 0 ? unlearnedCards : allCards, // Wenn alle gelernt, zeige alle im viewing-Modus
        totalCards: allCards.length,
        dueCards: dueCardsCount
      };
      
      setSelectedDeck(deckWithCards);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setSessionStats({
        cardsReviewed: 0,
        correctAnswers: 0,
        incorrectAnswers: 0
      });
      
      // Bestimme den Modus basierend auf fälligen Karten (genau wie bei Schülern)
      if (dueCardsCount > 0) {
        setLearningMode('learning');
      } else {
        setLearningMode('viewing');
      }
      return;
    }
    try {
      // Lade den aktuellen Fortschritt für das Deck
      const progressResponse = await fetch(`/api/flashcards/student/${studentId}/progress`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        
        // progressData ist ein Objekt mit progress-Property, nicht ein Array
        const progressArray = progressData.progress || [];
        console.log('DEBUG - progressData:', progressData, 'progressArray:', progressArray);
        
        // Filtere den Fortschritt für dieses spezifische Deck
        const deckProgress = progressArray.filter((item: any) => 
          item.card && item.card.deckId === deck.id
        );
        
        // Erstelle eine Map für schnellen Zugriff auf den Fortschritt
        const progressMap = new Map();
        deckProgress.forEach((item: any) => {
          progressMap.set(item.cardId, item);
        });
        
        // Filtere Karten basierend auf Fortschritt - GLEICHE LOGIK WIE IM DASHBOARD
        let cardsToLearn = deck.cards || [];
        
        if (deck.dueCards > 0) {
          // Verwende die gleiche Logik wie im Dashboard
          const now = new Date();
          
          // 1. Gelernte Karten die fällig sind (mit Qualitätsbewertung)
          const learnedCardsDue = deck.cards.filter((card: any) => {
            const progress = progressMap.get(card.id);
            if (!progress || !progress.nextReview) return false;
            
            let reviewDate: Date;
            if (typeof progress.nextReview === 'number') {
              reviewDate = new Date(progress.nextReview);
            } else {
              reviewDate = new Date(progress.nextReview);
            }
            
            // Setze beide Daten auf Mitternacht für korrekten Vergleich
            const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
            const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            return reviewDateMidnight <= nowMidnight;
          });
          
          // 2. Karten ohne Qualitätsbewertung (müssen noch bewertet werden)
          const cardsWithoutQuality = deck.cards.filter((card: any) => {
            const progress = progressMap.get(card.id);
            return progress && (progress.quality === null || progress.quality === undefined);
          });
          
          // 3. Ungelernte Karten (kein Fortschritt)
          const unlearnedCards = deck.cards.filter((card: any) => !progressMap.has(card.id));
          
          // Kombiniere alle fälligen Karten
          cardsToLearn = [...learnedCardsDue, ...cardsWithoutQuality, ...unlearnedCards];
          
          console.log(`DEBUG - Filtered cards: ${cardsToLearn.length} of ${deck.cards.length} are due`);
          console.log(`DEBUG - Breakdown: ${learnedCardsDue.length} learned due, ${cardsWithoutQuality.length} without quality, ${unlearnedCards.length} unlearned`);
        }
        
        // Erstelle eine Kopie des Decks mit den zu lernenden Karten
        const deckWithCards = {
          ...deck,
          cards: cardsToLearn,
          totalCards: deck.cards?.length || 0,
          dueCards: cardsToLearn.length // ← Verwende die tatsächlich gefilterten Karten
        };
        
        // Versuche den Session-Fortschritt wiederherzustellen
        const progressRestored = await restoreSessionProgress(deckWithCards);
        
        if (!progressRestored) {
          // Kein Fortschritt wiederhergestellt - starte von vorne
          setCurrentCardIndex(0);
          setSessionStats({
            cardsReviewed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0
          });
        }
        
        setSelectedDeck(deckWithCards);
        setShowAnswer(false);
        
        // Debug: Was steht in deck.dueCards?
        console.log('DEBUG startLearningSession - deck.dueCards:', deck.dueCards, 'deck:', deck);
        
        // Bestimme den Modus basierend auf fälligen Karten
        if (deck.dueCards > 0) {
          setLearningMode('learning');
          // Starte Session nur für fällige Karten
          const sessionResponse = await fetch('/api/flashcards/student/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, deckId: deck.id })
          });
          
                  if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setSessionId(sessionData.session.id);
          // Session-Statistiken zurücksetzen
          setSessionStats({
            cardsReviewed: 0,
            correctAnswers: 0,
            incorrectAnswers: 0
          });
        }
        } else {
          setLearningMode('viewing'); // Neuer Ansehen-Modus
        }
      } else {
        // Fallback: Verwende alle Karten des Decks
        setSelectedDeck(deck);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setLearningMode('viewing'); // Ansehen-Modus als Fallback
      }
    } catch (error) {
      console.error('Error starting learning session:', error);
      // Fallback: Verwende alle Karten des Decks
      setSelectedDeck(deck);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setLearningMode('viewing'); // Ansehen-Modus als Fallback
    }
  };

  const updateCardProgress = async (quality: number) => {
    if (!selectedDeck) return;

    const currentCard = selectedDeck.cards[currentCardIndex];
    
    // Aktualisiere Session-Statistiken (für Lehrer und Schüler)
    setSessionStats(prev => ({
      cardsReviewed: prev.cardsReviewed + 1,
      correctAnswers: prev.correctAnswers + (quality >= 4 ? 1 : 0), // 4-5 = korrekt
      incorrectAnswers: prev.incorrectAnswers + (quality <= 2 ? 1 : 0) // 1-2 = inkorrekt
    }));

    // Für Lehrer: Track gelernte Karten lokal
    if (isTeacher) {
      setTeacherLearnedCards(prev => {
        const newLearnedCards = new Set([...prev, currentCard.id]);
        
        // Prüfe ob alle Karten gelernt wurden (nach dem Update)
        const allCardsLearned = selectedDeck.cards.every((card: any) => 
          newLearnedCards.has(card.id)
        );
        
        if (allCardsLearned) {
          // Alle Karten gelernt - wechsle zu viewing-Modus
          setTimeout(() => {
            setLearningMode('viewing');
            setCurrentCardIndex(0);
            setShowAnswer(false);
          }, 500); // Kurze Verzögerung für bessere UX
        }
        
        return newLearnedCards;
      });
      return; // Lehrer speichern keine Fortschritte in der DB
    }

    // Nur für Schüler: Fortschritt in der Datenbank speichern
    if (!studentId) {
      return;
    }
    
    try {
      const response = await fetch(`/api/flashcards/student/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId,
          cardId: currentCard.id,
          quality
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Card progress updated:', data);
        
        // Sofortige lokale Aktualisierung der Statistiken
        setAssignedDecks(prevDecks => 
          prevDecks.map(deck => {
            if (deck.id === selectedDeck.id) {
              // Aktualisiere die Statistiken für das aktuelle Deck
              const updatedDeck = { ...deck };
              
              // Initialisiere Statistiken falls sie nicht existieren
              if (!updatedDeck.qualityStats) {
                updatedDeck.qualityStats = { perfect: 0, partial: 0, notKnown: 0 };
              }
              if (!updatedDeck.levelStats) {
                updatedDeck.levelStats = { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
              }
              if (!updatedDeck.dueCardsByDate) {
                updatedDeck.dueCardsByDate = { today: 0, tomorrow: 0, thisWeek: 0, later: 0 };
              }
              
              // Aktualisiere die Bewertungs-Statistiken für 5-Stufen-System
              if (quality === 1 || quality === 2) {
                updatedDeck.qualityStats.notKnown = (updatedDeck.qualityStats.notKnown || 0) + 1; // Sehr schlecht/Schlecht
              } else if (quality === 3) {
                updatedDeck.qualityStats.partial = (updatedDeck.qualityStats.partial || 0) + 1; // Mittelmäßig
              } else if (quality === 4 || quality === 5) {
                updatedDeck.qualityStats.perfect = (updatedDeck.qualityStats.perfect || 0) + 1; // Gut/Sehr gut = Perfekt
              }
              
              // Aktualisiere die Level-Statistiken (alle Karten sind auf Level 0)
              updatedDeck.levelStats.level0 = (updatedDeck.levelStats.level0 || 0) + 1;
              
              // Aktualisiere die fälligen Karten (alle werden für morgen geplant)
              updatedDeck.dueCardsByDate.tomorrow = (updatedDeck.dueCardsByDate.tomorrow || 0) + 1;
              
              console.log('Updated deck stats:', updatedDeck);
              return updatedDeck;
            }
            return deck;
          })
        );
        
        // Aktualisiere auch den Backend-Fortschritt
        await fetchAssignedDecks();
        
        // Force re-render der UI
        setAssignedDecks(prevDecks => [...prevDecks]);
      }
    } catch (error) {
      console.error('Error updating card progress:', error);
    }
  };

  const handleNextCard = (quality: number) => {
    console.log(`handleNextCard called with quality: ${quality}, currentCardIndex: ${currentCardIndex}, totalCards: ${selectedDeck?.cards?.length}`);
    
    updateCardProgress(quality);
    
    if (currentCardIndex < selectedDeck.cards.length - 1) {
      console.log('Moving to next card...');
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Letzte Karte erreicht - Session beenden
      console.log('Letzte Karte erreicht, beende Session...');
      endLearningSession();
    }
  };

  const endLearningSession = async () => {
    // Session beenden, auch wenn keine sessionId vorhanden ist
    try {
      if (sessionId) {
      await fetch('/api/flashcards/student/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cardsReviewed: sessionStats.cardsReviewed,
          correctAnswers: sessionStats.correctAnswers,
          incorrectAnswers: sessionStats.incorrectAnswers
        })
      });
      }
    } catch (error) {
      console.error('Error ending learning session:', error);
    }

    // Lösche den gespeicherten Session-Fortschritt
    if (selectedDeck) {
      localStorage.removeItem(`flashcard_progress_${selectedDeck.id}_${studentId}`);
    }
    
    // Immer zur Deck-Auswahl zurückkehren
    setLearningMode('selection');
    setSelectedDeck(null);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionId(null);
    // Session-Statistiken zurücksetzen
    setSessionStats({
      cardsReviewed: 0,
      correctAnswers: 0,
      incorrectAnswers: 0
    });
  };

  const handleClose = () => {
    // Speichere den aktuellen Fortschritt bevor die Session beendet wird
    if (selectedDeck && currentCardIndex > 0) {
      saveSessionProgress();
    }
    
    if (sessionId) {
      endLearningSession();
    }
    onClose();
  };

  // Neue Funktion zum Speichern des Session-Fortschritts
  const saveSessionProgress = async () => {
    if (!selectedDeck) return;
    
    try {
      const progressData = {
        deckId: selectedDeck.id,
        studentId: studentId,
        currentCardIndex: currentCardIndex,
        cardsReviewed: sessionStats.cardsReviewed,
        timestamp: new Date().toISOString()
      };
      
      // Speichere in localStorage für lokale Wiederherstellung
      localStorage.setItem(`flashcard_progress_${selectedDeck.id}_${studentId}`, JSON.stringify(progressData));
      
      console.log('Session progress saved:', progressData);
    } catch (error) {
      console.error('Error saving session progress:', error);
    }
  };

  // Neue Funktion zum Wiederherstellen des Session-Fortschritts
  const restoreSessionProgress = async (deck: any) => {
    try {
      const savedProgress = localStorage.getItem(`flashcard_progress_${deck.id}_${studentId}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const isRecent = new Date(progress.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Max 24h alt
        
        if (isRecent) {
          // Frage den Benutzer, ob er den Fortschritt wiederherstellen möchte
          if (window.confirm(`Du hattest eine unvollständige Lernsession für dieses Deck. Möchtest du bei Karte ${progress.currentCardIndex + 1} von ${deck.cards.length} weitermachen?`)) {
            setCurrentCardIndex(progress.currentCardIndex);
            setSessionStats({
              cardsReviewed: progress.cardsReviewed,
              correctAnswers: 0, // Reset für neue Session
              incorrectAnswers: 0
            });
            console.log('Session progress restored:', progress);
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error restoring session progress:', error);
      return false;
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'rgba(0,0,0,0.8)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={handleClose}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
          borderRadius: 4,
          p: 2.5,
          width: '90%',
          height: '90%',
          maxWidth: '1000px',
          maxHeight: '800px',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 25px 70px rgba(255, 107, 53, 0.2)',
          border: '2px solid #ffb74d',
          backdropFilter: 'blur(10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - kompakt */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1.5,
          pb: 0.75,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold',
              color: '#2c3e50',
              mb: 0,
              fontSize: '1rem'
            }}>
              {learningMode === 'selection' ? '🗂️ Karteikarten lernen' : `📚 ${selectedDeck?.title || teacherDeck?.title || 'Karteikarten'}`}
            </Typography>
            {/* Hilfe-Icon für Hinweise */}
            {(learningMode === 'learning' || learningMode === 'viewing') && (
              <IconButton
                size="small"
                onClick={(e) => setHelpAnchorEl(e.currentTarget)}
                sx={{
                  width: 20,
                  height: 20,
                  color: '#6c757d',
                  '&:hover': {
                    color: '#495057',
                    bgcolor: '#f8f9fa'
                  }
                }}
              >
                <HelpIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
          
          {/* Header-Actions */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {/* Reset-Button für Lehrer - nur im Selection-Modus */}
            {isTeacher && learningMode === 'selection' && teacherLearnedCards.size > 0 && (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                sx={{ 
                  fontSize: '0.6rem', 
                  py: 0.3, 
                  px: 1,
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  minWidth: 'auto',
                  '&:hover': {
                    borderColor: '#f57c00',
                    color: '#f57c00',
                    bgcolor: '#fff3e0'
                  }
                }}
                onClick={() => {
                  setTeacherLearnedCards(new Set());
                  // Aktualisiere die Decks, um die fälligen Karten neu zu berechnen
                  if (teacherDeck) {
                    const totalCards = teacherDeck.cards?.length || 0;
                    const formattedDeck = {
                      ...teacherDeck,
                      totalCards: totalCards,
                      dueCards: totalCards,
                      completedCards: 0,
                      progressPercentage: 0,
                      qualityStats: { perfect: 0, partial: 0, notKnown: 0 },
                      levelStats: { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
                      dueCardsByDate: { today: totalCards, tomorrow: 0, thisWeek: 0, later: 0 },
                      reviewStats: { totalReviews: 0, avgReviewCount: 0, lastReviewDate: '-' }
                    };
                    setAssignedDecks([formattedDeck]);
                  }
                }}
              >
                🔄 Lernstand zurücksetzen
              </Button>
            )}
            {/* Session beenden Button - nur im Lern- oder Ansehen-Modus */}
            {(learningMode === 'learning' || learningMode === 'viewing') && (
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                sx={{ 
                  fontSize: '0.6rem', 
                  py: 0.3, 
                  px: 1,
                  borderColor: '#6c757d',
                  color: '#6c757d',
                  minWidth: 'auto',
                  '&:hover': {
                    borderColor: '#495057',
                    color: '#495057'
                  }
                }}
                onClick={endLearningSession}
              >
                🏁 Beenden
              </Button>
            )}
            {/* Export-Buttons nur im Selection-Modus */}
            {learningMode === 'selection' && (
              <>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => exportLearningProgress('json')}
                  sx={{
                    color: '#6c757d',
                    fontSize: '0.55rem',
                    py: 0.2,
                    px: 0.6,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#495057',
                      bgcolor: '#f8f9fa'
                    }
                  }}
                >
                  📊
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => exportLearningProgress('csv')}
                  sx={{
                    color: '#6c757d',
                    fontSize: '0.55rem',
                    py: 0.2,
                    px: 0.6,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#495057',
                      bgcolor: '#f8f9fa'
                    }
                  }}
                >
                  📈
                </Button>
              </>
            )}
            
            <IconButton 
              onClick={handleClose} 
              size="small"
              sx={{ 
                width: 24,
                height: 24,
                bgcolor: '#f8f9fa',
                color: '#6c757d',
                '&:hover': { bgcolor: '#e9ecef' }
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {learningMode === 'selection' ? (
          /* Deck-Auswahl */
          <Box>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : assignedDecks.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Keine Karteikarten zugewiesen
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {assignedDecks.map((deck) => (
                  <Grid item xs={12} sm={6} md={4} key={deck.id}>
                    <Card sx={{ 
                      cursor: 'pointer', 
                      transition: 'all 0.3s ease',
                      borderRadius: 4,
                      border: '2px solid #ffb74d',
                      background: 'linear-gradient(135deg, #fff 0%, #fff3e0 100%)',
                      boxShadow: '0 4px 20px rgba(255, 107, 53, 0.1)',
                      '&:hover': { 
                        transform: 'translateY(-2px) scale(1.01)',
                        boxShadow: '0 6px 15px rgba(255, 107, 53, 0.15)',
                        borderColor: '#ff6b35'
                      },
                      position: 'relative'
                    }}>
                      {/* Gesamtzahl der Karten oben rechts */}
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: '#f8f9fa',
                        borderRadius: 1,
                        px: 0.75,
                        py: 0.25
                      }}>
                        <Typography variant="caption" sx={{ 
                          color: '#6c757d',
                          fontSize: '0.65rem',
                          fontWeight: 600
                        }}>
                          {deck.totalCards || 0} Karten
                        </Typography>
                      </Box>
                      
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Box sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: '#ff6b35',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                        }}>
                          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                            📚
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ 
                          mb: 1.5, 
                          fontWeight: 700,
                          color: '#2c3e50'
                        }}>
                          {deck.title}
                        </Typography>

                        {/* Detaillierte Statistiken - ausklappbar */}
                        <Accordion sx={{ mb: 1.5, boxShadow: 'none', '&:before': { display: 'none' } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: '0.9rem' }} />} sx={{ minHeight: 32, py: 0 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#6c757d' }}>
                              📊 Details anzeigen
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                            {/* Bewertungs-Statistiken */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#6c757d', 
                                fontSize: '0.6rem', 
                                fontWeight: 600,
                                display: 'block',
                                mb: 0.5
                              }}>
                                📊 Bewertungen
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: '#d4edda',
                                  borderRadius: 0.5,
                                  border: '1px solid #c3e6cb'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#155724', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.qualityStats?.perfect || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: '#155724', 
                                    fontSize: '0.5rem'
                                  }}>
                                    ✅ 4-5
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: '#fff3cd',
                                  borderRadius: 0.5,
                                  border: '1px solid #ffeaa7'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#856404', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.qualityStats?.partial || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: '#856404', 
                                    fontSize: '0.5rem'
                                  }}>
                                    ℹ️ 3
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: '#f8d7da',
                                  borderRadius: 0.5,
                                  border: '1px solid #f5c6cb'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#721c24', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.qualityStats?.notKnown || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: '#721c24', 
                                    fontSize: '0.5rem'
                                  }}>
                                    ❌ 1-2
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* Level-Statistiken */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#6c757d', 
                                fontSize: '0.6rem', 
                                fontWeight: 600,
                                display: 'block',
                                mb: 0.5
                              }}>
                                🎯 Level-Verteilung
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                                {[0, 1, 2, 3, 4, 5].map((level) => (
                                  <Box key={level} sx={{ 
                                    textAlign: 'center', 
                                    flex: 1,
                                    p: 0.5,
                                    bgcolor: level >= 3 ? '#d4edda' : '#e9ecef',
                                    borderRadius: 0.5,
                                    border: `1px solid ${level >= 3 ? '#c3e6cb' : '#dee2e6'}`
                                  }}>
                                    <Typography variant="caption" sx={{ 
                                      color: level >= 3 ? '#155724' : '#6c757d', 
                                      fontSize: '0.6rem', 
                                      fontWeight: 'bold',
                                      display: 'block'
                                    }}>
                                      {deck.levelStats?.[`level${level}`] || 0}
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                      color: level >= 3 ? '#155724' : '#6c757d', 
                                      fontSize: '0.5rem'
                                    }}>
                                      L{level}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                            
                            {/* Fällige Karten nach Datum */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#6c757d', 
                                fontSize: '0.6rem', 
                                fontWeight: 600,
                                display: 'block',
                                mb: 0.5
                              }}>
                                📅 Nächste Reviews
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: deck.dueCardsByDate?.today > 0 ? '#fff3cd' : '#e9ecef',
                                  borderRadius: 0.5,
                                  border: `1px solid ${deck.dueCardsByDate?.today > 0 ? '#ffeaa7' : '#dee2e6'}`
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.today > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.dueCardsByDate?.today || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.today > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.5rem'
                                  }}>
                                    Heute
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: deck.dueCardsByDate?.tomorrow > 0 ? '#fff3cd' : '#e9ecef',
                                  borderRadius: 0.5,
                                  border: `1px solid ${deck.dueCardsByDate?.tomorrow > 0 ? '#ffeaa7' : '#dee2e6'}`
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.tomorrow > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.dueCardsByDate?.tomorrow || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.tomorrow > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.5rem'
                                  }}>
                                    Morgen
                                  </Typography>
                                </Box>
                                <Box sx={{ 
                                  textAlign: 'center', 
                                  flex: 1,
                                  p: 0.5,
                                  bgcolor: deck.dueCardsByDate?.thisWeek > 0 ? '#fff3cd' : '#e9ecef',
                                  borderRadius: 0.5,
                                  border: `1px solid ${deck.dueCardsByDate?.thisWeek > 0 ? '#ffeaa7' : '#dee2e6'}`
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.thisWeek > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.6rem', 
                                    fontWeight: 'bold',
                                    display: 'block'
                                  }}>
                                    {deck.dueCardsByDate?.thisWeek || 0}
                                  </Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: deck.dueCardsByDate?.thisWeek > 0 ? '#856404' : '#6c757d', 
                                    fontSize: '0.5rem'
                                  }}>
                                    Woche
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            {/* Export-Buttons */}
                            <Box sx={{ 
                              mt: 1,
                              display: 'flex',
                              gap: 0.5,
                              justifyContent: 'center'
                            }}>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => exportLearningProgress('json', deck.id)}
                                sx={{
                                  color: '#6c757d',
                                  fontSize: '0.6rem',
                                  py: 0.25,
                                  px: 0.75,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    color: '#495057',
                                    bgcolor: '#f8f9fa'
                                  }
                                }}
                              >
                                📊 JSON
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => exportLearningProgress('csv', deck.id)}
                                sx={{
                                  color: '#6c757d',
                                  fontSize: '0.6rem',
                                  py: 0.25,
                                  px: 0.75,
                                  minWidth: 'auto',
                                  '&:hover': {
                                    color: '#495057',
                                    bgcolor: '#f8f9fa'
                                  }
                                }}
                              >
                                📈 CSV
                              </Button>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{
                            bgcolor: '#ff6b35',
                            color: 'white',
                            fontWeight: 600,
                            py: 1,
                            borderRadius: 2,
                            fontSize: '0.8rem',
                            textTransform: 'none',
                            boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
                            '&:hover': {
                              bgcolor: '#e55a2b',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
                            }
                          }}
                          onClick={() => startLearningSession(deck)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              startLearningSession(deck);
                            }
                          }}
                        >
                          {deck.dueCards > 0 ? `📚 ${deck.dueCards} fällige Karten lernen` : '👁️ Karten ansehen'}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        ) : (
          /* Lern-Modus */
          <Box sx={{ position: 'relative', minHeight: '400px' }}>
            {selectedDeck && selectedDeck.cards && selectedDeck.cards[currentCardIndex] && (
              <>
                {/* Fortschritt und Level - kompakt */}
                <Box sx={{ 
                  mb: 1, 
                  textAlign: 'center',
                  bgcolor: '#f8f9fa',
                  p: 0.75,
                  borderRadius: 1
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ 
                      color: '#2c3e50',
                      fontWeight: 600,
                      fontSize: '0.65rem'
                    }}>
                      {currentCardIndex + 1} / {selectedDeck.cards.length}
                    </Typography>
                    
                    {/* Level-Anzeige */}
                    {selectedDeck.cards[currentCardIndex].progress && (
                      <Chip 
                        label={`Level ${selectedDeck.cards[currentCardIndex].progress.level}`}
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '0.6rem',
                          bgcolor: '#e3f2fd',
                          color: '#1976d2',
                          border: '1px solid #bbdefb'
                        }}
                      />
                    )}
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={((currentCardIndex + 1) / selectedDeck.cards.length) * 100}
                    sx={{ 
                      height: 2,
                      borderRadius: 1,
                      bgcolor: '#e9ecef',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 1,
                        bgcolor: '#ff6b35'
                      }
                    }}
                  />
                </Box>

                {/* Karteikarte - kompakter */}
                <Card sx={{ 
                  mb: 1, 
                  minHeight: 100,
                  width: '75%',
                  mx: 'auto',
                  perspective: '1000px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transformStyle: 'preserve-3d',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid #e0e0e0',
                  background: !showAnswer 
                    ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
                    : 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                  '&:hover': {
                    transform: 'translateY(0px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                  }
                }}
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    py: 1.5,
                    px: 2.5,
                    position: 'relative',
                    minHeight: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Box sx={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      transition: 'transform 0.6s',
                      transformStyle: 'preserve-3d'
                    }}>
                      {/* Vorderseite */}
                      <Box sx={{
                        position: 'absolute',
                        width: '100%',
                        backfaceVisibility: 'hidden',
                        transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        transition: 'transform 0.6s'
                      }}>
                        <Typography variant="body1" sx={{ 
                          mb: 0,
                          fontWeight: 400,
                          color: '#000000',
                          fontSize: '0.95rem'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatCardText(selectedDeck.cards[currentCardIndex].front) }}
                        />
                      </Box>
                      
                      {/* Rückseite */}
                      <Box sx={{
                        position: 'absolute',
                        width: '100%',
                        backfaceVisibility: 'hidden',
                        transform: showAnswer ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                        transition: 'transform 0.6s'
                      }}>
                        <Typography variant="body1" sx={{ 
                          mb: 0,
                          fontWeight: 400,
                          color: '#000000',
                          fontSize: '0.95rem'
                        }}
                        dangerouslySetInnerHTML={{ __html: formatCardText(selectedDeck.cards[currentCardIndex].back) }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Bewertungs-Buttons - nur im Lern-Modus */}
                {showAnswer && learningMode === 'learning' && (
                  <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      gap: 0.5, 
                      flexWrap: 'nowrap',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '600px',
                      mx: 'auto'
                    }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(1)}
                      >
                        🌟 Perfekt 1
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(2)}
                      >
                        ✅ Sehr gut 2
                      </Button>
                      <Button
                        variant="contained"
                        color="info"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(3)}
                      >
                        ℹ️ Gut 3
                      </Button>
                      <Button
                        variant="contained"
                        color="warning"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(4)}
                      >
                        ⚠️ Schwierig 4
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        sx={{ 
                          fontSize: '0.65rem', 
                          py: 0.5, 
                          px: 0.75,
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleNextCard(5)}
                      >
                        ❌ Nicht gewusst 5
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {/* Navigation für Ansehen-Modus */}
                {learningMode === 'viewing' && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ 
                          fontSize: '0.7rem', 
                          py: 0.5, 
                          px: 2,
                          borderColor: '#6c757d',
                          color: '#6c757d',
                          '&:hover': {
                            borderColor: '#495057',
                            color: '#495057'
                          }
                        }}
                        onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                        disabled={currentCardIndex === 0}
                      >
                        ⬅️ Zurück
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ 
                          fontSize: '0.7rem', 
                          py: 0.5, 
                          px: 2,
                          borderColor: '#6c757d',
                          color: '#6c757d',
                          '&:hover': {
                            borderColor: '#495057',
                            color: '#495057'
                          }
                        }}
                        onClick={() => setCurrentCardIndex(Math.min(selectedDeck.cards.length - 1, currentCardIndex + 1))}
                        disabled={currentCardIndex === selectedDeck.cards.length - 1}
                      >
                        Weiter ➡️
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* Hilfe-Popover */}
        <Popover
          open={Boolean(helpAnchorEl)}
          anchorEl={helpAnchorEl}
          onClose={() => setHelpAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          container={document.body}
          sx={{
            zIndex: 10001 // Höher als der Modal-Overlay (10000)
          }}
        >
          <Box sx={{ p: 1.5, maxWidth: 300 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.75rem' }}>
              💡 Hilfe
            </Typography>
            {learningMode === 'learning' && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                  • Karte anklicken zum Umdrehen
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                  • Tasten 1-5 oder Buttons zum Bewerten
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                  • 1-2 = Level steigt, 3 = bleibt gleich, 4-5 = Level sinkt
                </Typography>
              </>
            )}
            {learningMode === 'viewing' && (
              <>
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem' }}>
                  • Leertaste: Karte umdrehen
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                  • ← →: Navigation zwischen Karten
                </Typography>
              </>
            )}
          </Box>
        </Popover>
      </Box>
    </Box>
  );
};

// Abgabestatistik Komponente (exportiert für Verwendung im TeacherDashboard)
export const SubmissionStatistics: React.FC<{
  userId: string, 
  submissionStats: any[], 
  setSubmissionStats: (stats: any[]) => void,
  isTeacherView?: boolean
}> = ({ userId, submissionStats, setSubmissionStats, isTeacherView = false }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/submissions/student/${userId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setSubmissionStats(data);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Statistik:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (submissionStats.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body1" color="textSecondary">
          {isTeacherView 
            ? '📭 Dieser Schüler hat noch keine Abgaben getätigt.'
            : '📭 Du hast noch keine Abgaben getätigt.'
          }
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Statistik-Übersicht */}
      <Grid container spacing={1.5} sx={{ mt: '1%', mb: 2 }}>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e3f2fd' }}>
            <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold', fontSize: '1.8rem' }}>
              {submissionStats.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              Abgaben insgesamt
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fff3e0' }}>
            <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold', fontSize: '1.8rem' }}>
              {submissionStats.filter(s => s.hasComment).length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              Mit Kommentar
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f3e5f5' }}>
            <Typography variant="h4" sx={{ color: '#7b1fa2', fontWeight: 'bold', fontSize: '1.8rem' }}>
              {submissionStats.filter(s => !s.hasComment).length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
              Noch ohne Kommentar
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Liste der Abgaben */}
      <Typography variant="h6" sx={{ mb: 1.5, fontSize: '0.9rem', fontWeight: 600 }}>
        {isTeacherView ? 'Abgaben im Detail' : 'Deine Abgaben im Detail'}
      </Typography>
      
      <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {submissionStats.map((stat, index) => (
          <Paper key={stat.id} elevation={2} sx={{ p: 1.5, mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {stat.fileName}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Hochgeladen: {new Date(stat.submittedAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
                {!isTeacherView && (
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    Lehrkraft: {stat.teacherName}
                  </Typography>
                )}
              </Box>
              <Chip
                label={stat.hasComment ? '💬 Kommentar' : '⏳ Kein Kommentar'}
                size="small"
                color={stat.hasComment ? 'success' : 'default'}
                sx={{ fontSize: '0.65rem', height: '20px' }}
              />
            </Box>

            {stat.hasComment && stat.teacherComment && (
              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fff3e0', borderRadius: 1, borderLeft: '3px solid #f57c00' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#e65100', display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                  {isTeacherView ? '💬 Dein Kommentar:' : '💬 Kommentar deiner Lehrkraft:'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5d4037', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                  {stat.teacherComment}
                </Typography>
                {stat.commentedAt && (
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.8, fontStyle: 'italic', fontSize: '0.65rem' }}>
                    Kommentiert am: {new Date(stat.commentedAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default StudentDashboard;