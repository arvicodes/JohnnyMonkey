import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Snackbar,
  Alert,
  Tab,
  Tabs,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel
} from '@mui/material';
import {
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Storage as StorageIcon,
  MoreVert as MoreVertIcon,
  Build as BuildIcon,
  Grade as GradeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import DatabaseViewer from './DatabaseViewer';
import SubjectManager from './SubjectManager';
import { fetchAssignments } from './SubjectManager';
import MaterialCreator from './MaterialCreator';
import GradingSchemaModal from './GradingSchemaModal';
import GradesModal from './GradesModal';
import FileSystemPathManager from './FileSystemPathManager';
import FolderAssignmentSelector from './FolderAssignmentSelector';

interface TeacherDashboardProps {
  userId: string;
  onLogout: () => void;
}

interface LearningGroup {
  id: string;
  name: string;
  students: Student[];
}

interface Student {
  id: string;
  name: string;
  loginCode: string;
  avatarEmoji?: string;
}

// Mini-Noten: Schema/Grade Typen
interface GradingSchemaMini {
  id: string;
  name: string;
  structure: string;
  gradingSystem?: string;
}
interface GradeMini {
  id: string;
  categoryName: string;
  grade: number;
  weight: number;
}

// Kompakte Mini-Noten-Knoten für hierarchische Anzeige
interface MiniGradeNode {
  name: string;
  grade: number | null;
  children: MiniGradeNode[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const subjectManagerRef = useRef<any>(null);
  const materialCreatorRef = useRef<any>(null);
  
  // Debug: Log userId
  console.log('TeacherDashboard received userId:', userId);
  const [groups, setGroups] = useState<LearningGroup[]>([]);
  const [subjectTabValue, setSubjectTabValue] = useState(0);
  const [blockTabValue, setBlockTabValue] = useState(0);
  useEffect(() => {
    setBlockTabValue(0);
  }, [subjectTabValue]);

  // Wenn genau 2 Fächer vorhanden sind, automatisch mit rechtem (Informatik) starten
  useEffect(() => {
    // Warten bis subjects-State existiert (weiter unten deklariert)
    // Dieser Effekt wird nach der Erst-Initialisierung erneut getriggert
  }, []);
  // Track which groups are expanded (default: expanded)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Ensure newly loaded groups get a default expanded state
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    setExpandedGroups(prev => {
      const next: Record<string, boolean> = { ...prev };
      for (const g of groups) {
        if (next[g.id] === undefined) next[g.id] = false; // default collapsed
      }
      return next;
    });
  }, [groups]);

  // Debug: Überprüfe den MaterialCreator-Ref
  useEffect(() => {
    console.log('MaterialCreator ref status:', {
      ref: materialCreatorRef.current,
      hasRef: !!materialCreatorRef.current,
      hasOpenQuizWithSource: materialCreatorRef.current?.openQuizWithSource
    });
  }, [materialCreatorRef.current]);

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !(prev[groupId] ?? false) }));
  };
  const [openNewGroupDialog, setOpenNewGroupDialog] = useState(false);
  const [openAddStudentsDialog, setOpenAddStudentsDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [mainTabValue, setMainTabValue] = useState(0);
  const [lessonMaterials, setLessonMaterials] = useState<{[key: string]: any[]}>({});
  const [lessonQuizzes, setLessonQuizzes] = useState<{[key: string]: any}>({});

  // Im TeacherDashboard State:
  const [subjectAssignments, setSubjectAssignments] = useState<{ [subjectId: string]: string[] }>({});
  const [blockAssignments, setBlockAssignments] = useState<{ [blockId: string]: string[] }>({});
  const [unitAssignments, setUnitAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [topicAssignments, setTopicAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [lessonAssignments, setLessonAssignments] = useState<{ [lessonId: string]: string[] }>({});
  // Listen für Namen
  const [subjects, setSubjects] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuGroupId, setMenuGroupId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [confirmDelete1, setConfirmDelete1] = useState(false);
  const [confirmDelete2, setConfirmDelete2] = useState(false);
  const [confirmDeleteWord, setConfirmDeleteWord] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [gradingGroupId, setGradingGroupId] = useState<string | null>(null);
  const [gradingGroupName, setGradingGroupName] = useState('');
  const [gradesModalOpen, setGradesModalOpen] = useState(false);
  const [gradesGroupId, setGradesGroupId] = useState<string | null>(null);
  const [gradesGroupName, setGradesGroupName] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Menü pro Schüler
  const [studentMenuAnchorEl, setStudentMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [studentMenuCtx, setStudentMenuCtx] = useState<null | { groupId: string; student: Student }>(null);
  
  // Student removal confirmation
  const [removeStudentDialogOpen, setRemoveStudentDialogOpen] = useState(false);
  const [removeStudentCtx, setRemoveStudentCtx] = useState<{ groupId: string; student: Student } | null>(null);
  const [confirmRemoveStudent1, setConfirmRemoveStudent1] = useState(false);
  const [confirmRemoveStudent2, setConfirmRemoveStudent2] = useState(false);
  const [confirmRemoveStudentWord, setConfirmRemoveStudentWord] = useState('');

  // Mini-Noten Cache: key = `${groupId}:${studentId}`
  const [miniGradesMap, setMiniGradesMap] = useState<{ [key: string]: { loading: boolean; gradingSystem: string; overall?: number | null; nodes: MiniGradeNode[] } }>({});

  // Neue States für echte Ordner-Vorschau
  const [assignedFolderContents, setAssignedFolderContents] = useState<{[key: string]: any[]}>({});
  const [expandedAssignedFolders, setExpandedAssignedFolders] = useState<{[key: string]: Set<string>}>({});
  const [loadingFolderContents, setLoadingFolderContents] = useState<{[key: string]: boolean}>({});

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

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups();
  }, [userId]);

  // Nach dem Laden der Gruppen: Zuweisungen und Listen laden
  useEffect(() => {
    if (groups.length === 0) return;
    // Zuweisungen laden
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
    // Listen laden
    const fetchAll = async () => {
      // Subjects
      const resSubjects = await fetch(`/api/subjects?teacherId=${userId}`);
      const subjectsData = resSubjects.ok ? await resSubjects.json() : [];
      setSubjects(subjectsData);
      if (subjectsData.length === 2) {
        setSubjectTabValue(1);
      }
      // Blocks
      let allBlocks: any[] = [];
      for (const subj of subjectsData) {
        const resBlocks = await fetch(`/api/blocks?subjectId=${subj.id}`);
        const blocksData = resBlocks.ok ? await resBlocks.json() : [];
        allBlocks = allBlocks.concat(blocksData);
      }
      setBlocks(allBlocks);
      // Units
      let allUnits: any[] = [];
      for (const block of allBlocks) {
        const resUnits = await fetch(`/api/units?blockId=${block.id}`);
        const unitsData = resUnits.ok ? await resUnits.json() : [];
        allUnits = allUnits.concat(unitsData);
      }
      setUnits(allUnits);
      // Topics
      let allTopics: any[] = [];
      for (const unit of allUnits) {
        const resTopics = await fetch(`/api/topics?unitId=${unit.id}`);
        const topicsData = resTopics.ok ? await resTopics.json() : [];
        allTopics = allTopics.concat(topicsData);
      }
      setTopics(allTopics);
      // Lessons
      let allLessons: any[] = [];
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
        const materials = await fetchLessonMaterials(lesson.id);
        const quiz = await fetchLessonQuiz(lesson.id);
        materialsMap[lesson.id] = materials;
        if (quiz) {
          quizzesMap[lesson.id] = quiz;
        }
      }
      setLessonMaterials(materialsMap);
      setLessonQuizzes(quizzesMap);
    };
    fetchAll();
  }, [groups, userId]);

  // Mini-Noten für alle Schüler pro Gruppe vorab laden, damit alles sofort sichtbar ist
  useEffect(() => {
    if (!groups || groups.length === 0) return;
    for (const group of groups) {
      for (const student of group.students) {
        ensureMiniGrades(group.id, student.id);
      }
    }
  }, [groups]);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`/api/learning-groups/teacher/${userId}`);
      if (!response.ok) throw new Error('Fehler beim Laden der Gruppen');
      const groupsData = await response.json();
      setGroups(groupsData);
      
      // Lade zugeordnete Ordner für alle Gruppen
      for (const group of groupsData) {
        await fetchAssignedFolders(group.id);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Gruppen:', error);
      showSnackbar('Fehler beim Laden der Gruppen', 'error');
    }
  };

  // Neue Funktion zum Laden der zugeordneten Ordner
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

  // Neue Funktion zum Laden des Inhalts zugeordneter Ordner
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

  // Neue Funktion zum Umschalten der Vorschau zugeordneter Ordner
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

  // Neue Funktion zum Rendern der echten Ordner-Vorschau
  const renderAssignedFolderPreview = (groupId: string, folderPath: string) => {
    const items = assignedFolderContents[`${groupId}:${folderPath}`] || [];
    const isLoading = loadingFolderContents[`${groupId}:${folderPath}`] || false;
    
    console.log('Rendering folder preview for:', groupId, folderPath, 'Items:', items, 'Loading:', isLoading); // Debug-Ausgabe
    
    // Rekursive Funktion zum Rendern aller Ebenen
    const renderItemRecursively = (item: any, level: number = 0) => {
      console.log(`Rendering item: ${item.name}, type: ${item.type}, level: ${level}`); // Debug
      
      // Bestimme Icon und Farbe basierend auf dem Screenshot
      let icon = '📁';
      let color = '#666';
      let fontWeight = 400;
      let showCreateIcon = false;
      let createIcon = '';
      let createTooltip = '';
      
      if (item.type === 'directory') {
        // Exakte Icons und Farben aus dem Screenshot
        if (level === 0) {
          // Level 0: Top-Level (wie "3D Druck", "Micro Bit", "Ganze und rationale Zahlen")
          icon = '📚'; // Bücher für Hauptthemen
          color = '#9c27b0'; // Lila
          fontWeight = 600;
          console.log(`Level 0: ${item.name} -> Lila, Icon: ${icon}`); // Debug
        } else if (level === 1) {
          // Level 1: Second-Level (wie "1. Grundlagen", "Grundlagen")
          icon = '📖'; // Buch für Unterkategorien
          color = '#1976d2'; // Blau
          fontWeight = 500;
          console.log(`Level 1: ${item.name} -> Blau, Icon: ${icon}`); // Debug
        } else if (level === 2) {
          // Level 2: Third-Level (wie "1. Blick in die Vergangenheit", "2. Technischer Aufbau")
          icon = '📚'; // Grüner Bücherstapel
          color = '#2e7d32'; // Grün
          fontWeight = 500;
          console.log(`Level 2: ${item.name} -> Grün, Icon: ${icon}`); // Debug
        } else if (level === 3) {
          // Level 3: Fourth-Level und weitere Ebenen
          icon = '📁'; // Standard Ordner
          color = '#666'; // Grau
          fontWeight = 400;
          console.log(`Level 3: ${item.name} -> Grau, Icon: ${icon}`); // Debug
        } else {
          // Weitere Ebenen
          icon = '📁'; // Standard Ordner
          color = '#666'; // Grau
          fontWeight = 400;
          console.log(`Level ${level}: ${item.name} -> Grau, Icon: ${icon}`); // Debug
        }
      } else {
        // Dateien
        icon = '📄'; // Dokument
        color = '#03a9f4'; // Hellblau für Dateien (wie im Screenshot)
        fontWeight = 400;
        console.log(`File: ${item.name} -> Hellblau, Icon: ${icon}`); // Debug
        
        // Prüfe ob es sich um Quiz- oder Cards-Dateien handelt
        if (item.name.startsWith('Quiz')) {
          showCreateIcon = true;
          createIcon = '🎯';
          createTooltip = 'Quiz erstellen';
          console.log('Quiz-Datei erkannt:', item.name, 'showCreateIcon:', showCreateIcon);
        } else if (item.name.startsWith('Cards')) {
          showCreateIcon = true;
          createIcon = '🗂️';
          createTooltip = 'Karteikarten erstellen';
          console.log('Cards-Datei erkannt:', item.name, 'showCreateIcon:', showCreateIcon);
        }
      }
      
      return (
        <Box key={`${item.name}-${level}`} sx={{ mb: 0.7 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'space-between',
            gap: 0.5
          }}>
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
              flex: 1,
              '&:hover': item.type === 'file' ? {
                color: '#1976D2'
              } : {}
            }}
            onClick={() => {
              if (item.type === 'file') {
                console.log('File clicked:', item);
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
            
            {/* Erstellungs-Icons für Quiz- und Cards-Dateien */}
            {showCreateIcon && (
              <Typography variant="caption" sx={{ 
                color: '#666',
                fontSize: '0.7rem',
                userSelect: 'none',
                cursor: 'pointer',
                ml: 0.2,
                border: '1px solid #ccc',
                borderRadius: '2px',
                padding: '1px',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              title={createTooltip}
              onClick={() => {
                console.log('Quiz-Icon clicked for:', item.name, 'Path:', item.path);
                if (item.name.startsWith('Quiz')) {
                  // Öffne das Quiz-Erstellungsmodal direkt im Dashboard
                  console.log('Opening quiz dialog for:', item.path, item.name);
                  handleQuizDialogOpen(item.path, item.name);
                } else if (item.name.startsWith('Cards')) {
                  // TODO: Implementiere Karteikarten-Erstellung
                  console.log('Karteikarten-Erstellung für:', item.name);
                }
              }}
              >
                {createIcon}
              </Typography>
            )}
            
            {/* Quiz starten Icon - wenn bereits ein Quiz existiert */}
            {item.type === 'file' && item.name.startsWith('Quiz') && quizStatusMap.get(item.path)?.exists && (
              <Typography variant="caption" sx={{ 
                fontSize: '0.7rem',
                userSelect: 'none',
                cursor: 'pointer',
                ml: 0.2,
                border: '1px solid #4caf50',
                borderRadius: '2px',
                padding: '1px',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              title={`Quiz starten: ${quizStatusMap.get(item.path)?.title || 'Unbekanntes Quiz'}`}
              onClick={() => {
                const quizId = quizStatusMap.get(item.path)?.quizId;
                if (quizId) {
                  handleStartQuiz(quizId);
                }
              }}
              >
                ▶️
              </Typography>
            )}

            {/* Ergebnisse freigeben Button - wenn Quiz beendet ist aber Ergebnisse noch nicht freigegeben */}
            {item.type === 'file' && item.name.startsWith('Quiz') &&
             quizStatusMap.get(item.path)?.exists &&
             quizStatusMap.get(item.path)?.sessionId && (
              <Typography variant="caption" sx={{
                fontSize: '0.7rem',
                userSelect: 'none',
                cursor: 'pointer',
                ml: 0.2,
                border: quizStatusMap.get(item.path)?.resultsReleased ? '1px solid #4caf50' : '1px solid #f44336',
                borderRadius: '2px',
                padding: '1px',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              title={quizStatusMap.get(item.path)?.resultsReleased ? 
                'Ergebnisse zurücknehmen' : 
                'Ergebnisse jetzt freigeben'
              }
              onClick={() => {
                const sessionId = quizStatusMap.get(item.path)?.sessionId;
                if (sessionId) {
                  handleReleaseResults(sessionId, item.path);
                }
              }}
              >
                {quizStatusMap.get(item.path)?.resultsReleased ? '🔒' : '🔓'}
              </Typography>
            )}

            {/* Ergebnisse bereits freigegeben - grüner Haken */}
            
          </Box>
          
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
        {/* Hauptordner - Hellgrauer Ordner mit rotem Dreieck (immer aufgeklappt) */}
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
              Ordner ist leer (Debug: {items.length} Items geladen)
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

  const handleCreateGroup = async () => {
    try {
      const response = await fetch('/api/learning-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, teacherId: userId }),
      });
      if (!response.ok) throw new Error('Fehler beim Erstellen der Gruppe');
      await fetchGroups();
      setNewGroupName('');
      setOpenNewGroupDialog(false);
      showSnackbar('Lerngruppe erfolgreich erstellt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Erstellen der Lerngruppe', 'error');
    }
  };

  const handleOpenAddStudents = async (groupId: string) => {
    setSelectedGroupId(groupId);
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/available-students`);
      if (!response.ok) throw new Error('Fehler beim Laden der verfügbaren Schüler');
      const data = await response.json();
      setAvailableStudents(data);
      setOpenAddStudentsDialog(true);
    } catch (error) {
      showSnackbar('Fehler beim Laden der verfügbaren Schüler', 'error');
    }
  };

  const handleAddStudents = async () => {
    try {
      const response = await fetch(`/api/learning-groups/${selectedGroupId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });
      if (!response.ok) throw new Error('Fehler beim Hinzufügen der Schüler');
      await fetchGroups();
      setOpenAddStudentsDialog(false);
      setSelectedStudents([]);
      showSnackbar('Schüler erfolgreich hinzugefügt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Hinzufügen der Schüler', 'error');
    }
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    try {
      const response = await fetch(`/api/learning-groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Fehler beim Entfernen des Schülers');
      await fetchGroups();
      showSnackbar('Schüler erfolgreich entfernt', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Entfernen des Schülers', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
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
      // Zeige Quiz-Session-Manager für Lehrer
      const quizUrl = `/quiz-session/${quiz.quiz.id}`;
      navigate(quizUrl);
      return;
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
        ? 'http://localhost:3001' + material.filePath 
        : window.location.origin + material.filePath;
      
      const newWindow = window.open(fullUrl, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert('Das Material konnte nicht geöffnet werden. Versuchen Sie es erneut.');
      }
    } else {
      alert(`Keine Materialien oder Quizze für "${lessonName}" gefunden.`);
    }
  };

  const handleMainTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
  };

  const handleSubjectTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === -1) {
      // "+" tab clicked - open subject dialog
      handleOpenSubjectDialog();
      return;
    }
    setSubjectTabValue(newValue);
    setBlockTabValue(0); // Reset block tab when subject changes
  };

  const handleOpenSubjectDialog = () => {
    // Call the SubjectManager's handleOpenDialog function
    if (subjectManagerRef.current?.handleOpenDialog) {
      subjectManagerRef.current.handleOpenDialog();
    }
  };

  const handleGroupClick = (groupId: string) => {
    navigate(`/learning-group/${groupId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, groupId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuGroupId(groupId);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuGroupId(null);
  };
  const handleDeleteDialogOpen = (groupId: string) => {
    setDeleteGroupId(groupId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteGroupId(null);
    setConfirmDelete1(false);
    setConfirmDelete2(false);
    setConfirmDeleteWord('');
  };
  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    try {
      const res = await fetch(`/api/learning-groups/${deleteGroupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchGroups();
      showSnackbar('Lerngruppe gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    } finally {
      handleDeleteDialogClose();
    }
  };

  const handleEditDialogOpen = (groupId: string, currentName: string) => {
    setEditGroupId(groupId);
    setEditGroupName(currentName);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditGroupId(null);
    setEditGroupName('');
  };

  const handleEditGroup = async () => {
    if (!editGroupId || !editGroupName.trim()) return;
    try {
      const response = await fetch(`/api/learning-groups/${editGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editGroupName.trim() }),
      });
      if (!response.ok) throw new Error('Fehler beim Bearbeiten der Lerngruppe');
      await fetchGroups();
      showSnackbar('Lerngruppe erfolgreich bearbeitet', 'success');
      handleEditDialogClose();
    } catch (error) {
      showSnackbar('Fehler beim Bearbeiten der Lerngruppe', 'error');
    }
  };

  const handleGradingDialogOpen = (groupId: string, groupName: string) => {
    setGradingGroupId(groupId);
    setGradingGroupName(groupName);
    setGradingModalOpen(true);
    handleMenuClose();
  };

  const handleGradingDialogClose = () => {
    setGradingModalOpen(false);
    setGradingGroupId(null);
    setGradingGroupName('');
  };

  const handleGradesDialogOpen = (groupId: string, groupName: string, student: Student) => {
    setGradesGroupId(groupId);
    setGradesGroupName(groupName);
    setSelectedStudent(student);
    setGradesModalOpen(true);
    handleMenuClose();
  };

  const handleGradesDialogClose = () => {
    setGradesModalOpen(false);
    setGradesGroupId(null);
    setGradesGroupName('');
    setSelectedStudent(null);
  };

  const handleFolderAssignmentOpen = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setFolderAssignmentGroupId(groupId);
      setFolderAssignmentGroupName(group.name);
      setFolderAssignmentModalOpen(true);
      handleMenuClose();
    }
  };

  const handleFolderAssignmentClose = () => {
    setFolderAssignmentModalOpen(false);
    setFolderAssignmentGroupId(null);
    setFolderAssignmentGroupName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onLogout();
      e.preventDefault();
    } else if (e.key === 'Tab') {
      return; // Let Tab work normally for accessibility
            } else if (e.key === 'ArrowRight' && mainTabValue < 3) {
      e.preventDefault();
      setMainTabValue(mainTabValue + 1);
    } else if (e.key === 'ArrowLeft' && mainTabValue > 0) {
      e.preventDefault();
      setMainTabValue(mainTabValue - 1);
    }
  };

  useEffect(() => {
    dashboardRef.current?.focus();
  }, []);

  // Helfer: Schema parsen -> Hierarchie
  const parseSchemaStructureMini = (schemaStr: string) => {
    const lines = schemaStr.split('\n').filter(l => l.trim());
    const result: any[] = [];
    const stack: { node: any; indent: number }[] = [];
    for (const line of lines) {
      const indent = line.search(/\S/);
      const m = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      if (!m) continue;
      const name = m[1].trim();
      const weight = parseFloat(m[2]);
      const node = { name, weight, children: [] as any[] };
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      if (stack.length === 0) result.push(node); else stack[stack.length - 1].node.children.push(node);
      stack.push({ node, indent });
    }
    return result;
  };

  const calculateWeightedMini = (node: any, gradesByName: Map<string, GradeMini>): number | null => {
    if (!node.children || node.children.length === 0) {
      const g = gradesByName.get(node.name);
      return g ? g.grade : null;
    }
    const childGrades: { grade: number; weight: number }[] = [];
    for (const child of node.children) {
      const cg = calculateWeightedMini(child, gradesByName);
      if (cg !== null) childGrades.push({ grade: cg, weight: child.weight });
    }
    if (childGrades.length === 0) return null;
    const totalW = childGrades.reduce((s, c) => s + c.weight, 0);
    if (totalW === 0) return null;
    const sum = childGrades.reduce((s, c) => s + c.grade * c.weight, 0);
    return sum / totalW;
  };

  const computeNodeWithGrade = (node: any, gradesByName: Map<string, GradeMini>): MiniGradeNode => {
    const gradeValue = calculateWeightedMini(node, gradesByName);
    const children: MiniGradeNode[] = (node.children || []).map((c: any) => computeNodeWithGrade(c, gradesByName));
    return { name: node.name, grade: gradeValue, children };
  };

  const collectLeaves = (node: MiniGradeNode): MiniGradeNode[] => {
    if (!node.children || node.children.length === 0) return [node];
    return node.children.flatMap(collectLeaves);
  };

  const groupLeavesBySecondLevel = (root: MiniGradeNode): { group: string; leaves: MiniGradeNode[] }[] => {
    // Gruppiere nach unmittelbaren Kindern von root
    return (root.children || []).map(second => ({ group: second.name, leaves: collectLeaves(second) }));
  };

  const shouldHideRoot = (name: string): boolean => {
    const n = name.toLowerCase();
    // Anzeige für Unter- und Mittelstufe weglassen
    return n.includes('unter') || n.includes('mittel');
  };

  const sortNodesByPriority = (nodes: MiniGradeNode[]): MiniGradeNode[] => {
    const priority = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('schrift') || n.includes('kursarbeit')) return 1; // Schriftlich/Klassenarbeiten zuerst
      if (n.includes('epo') || n.includes('epo')) return 2; // EPO danach
      if (n.includes('quiz') || n.includes('quiz')) return 3; // Quizze danach
      if (n.includes('sonstig')) return 4; // Sonstiges zuletzt
      return 99;
    };
    return [...nodes].sort((a, b) => priority(a.name) - priority(b.name));
  };

  const getGradeStats = (nodes: MiniGradeNode[], gradingSystem: string) => {
    const stats = {
      klassenarbeiten: { values: [] as number[], label: 'KAs', individualGrades: [] as { name: string; grade: number }[] },
      epo: { values: [] as number[], label: 'EPO', individualGrades: [] as { name: string; grade: number }[] },
      quizze: { values: [] as number[], label: 'Quizze', individualGrades: [] as { name: string; grade: number }[] },
      sonstiges: { values: [] as number[], label: 'Sonstige', individualGrades: [] as { name: string; grade: number }[] }
    };

    // Sammle alle Blatt-Noten und gruppiere sie
    const allLeaves = nodes.flatMap(root => collectLeaves(root));
    
    for (const leaf of allLeaves) {
      if (leaf.grade === null || leaf.grade === undefined) continue;
      
      const name = leaf.name.toLowerCase();
      if (name.includes('ka') || name.includes('klassenarbeit') || name.includes('schrift')) {
        stats.klassenarbeiten.values.push(leaf.grade);
        stats.klassenarbeiten.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      } else if (name.includes('epo')) {
        stats.epo.values.push(leaf.grade);
        stats.epo.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      } else if (name.includes('quiz') || name.includes('quiz') || name.includes('test')) {
        stats.quizze.values.push(leaf.grade);
        stats.quizze.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      } else {
        stats.sonstiges.values.push(leaf.grade);
        stats.sonstiges.individualGrades.push({ name: leaf.name, grade: leaf.grade });
      }
    }

    return stats;
  };

  const formatGradeValue = (values: number[], gradingSystem: string) => {
    if (values.length === 0) return '–';
    if (values.length === 1) {
      return gradingSystem === 'MSS' ? values[0].toFixed(0) : formatGermanMini(values[0]);
    }
    // Bei mehreren Werten: Durchschnitt
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return gradingSystem === 'MSS' ? avg.toFixed(0) : formatGermanMini(avg);
  };

  const formatGermanMini = (grade: number) => {
    // gleiche Logik wie StudentDashboard, kurz gefasst
    return grade.toFixed(1).replace('.', ',');
  };

  const getGradeColorMini = (grade: number, gradingSystem: string = 'GERMAN'): string => {
    if (gradingSystem === 'MSS') {
      if (grade >= 13) return '#4CAF50';
      if (grade >= 10) return '#8BC34A';
      if (grade >= 7) return '#FF9800';
      if (grade >= 4) return '#F57C00';
      if (grade >= 1) return '#FF5722';
      return '#C2185B';
    }
    if (grade <= 1.7) return '#4CAF50';
    if (grade <= 2.7) return '#8BC34A';
    if (grade <= 3.7) return '#FF9800';
    if (grade <= 4.7) return '#F57C00';
    if (grade <= 6.0) return '#C2185B';
    return '#9E9E9E';
  };

  const ensureMiniGrades = async (groupId: string, studentId: string) => {
    const key = `${groupId}:${studentId}`;
    if (miniGradesMap[key]?.loading || miniGradesMap[key]?.overall !== undefined) return;
    setMiniGradesMap(prev => ({ ...prev, [key]: { loading: true, gradingSystem: 'GERMAN', overall: undefined, nodes: [] } }));
    try {
      const schemaRes = await fetch(`/api/grading-schemas/${groupId}`);
      if (!schemaRes.ok) throw new Error('schema');
      const schemas: GradingSchemaMini[] = await schemaRes.json();
      if (schemas.length === 0) throw new Error('no schema');
      const schema = schemas[0];
      const gradesRes = await fetch(`/api/grades/${studentId}/${schema.id}`);
      const studentGrades: GradeMini[] = gradesRes.ok ? await gradesRes.json() : [];
      const gradesMap = new Map(studentGrades.map(g => [g.categoryName, g] as const));
      const roots = parseSchemaStructureMini(schema.structure);
      // overall: gewichtetes Mittel der Root-Knoten
      const rootWithCalc = roots.map((r: any) => ({ name: r.name, grade: calculateWeightedMini(r, gradesMap) }));
      const validRoots = rootWithCalc.filter(r => r.grade !== null) as { name: string; grade: number }[];
      let overall: number | null = null;
      if (validRoots.length > 0) {
        // benutze Root-Gewichte aus Struktur
        const totalW = roots.reduce((s: number, r: any) => s + r.weight, 0);
        if (totalW > 0) {
          const sum = roots.reduce((s: number, r: any) => {
            const g = rootWithCalc.find(x => x.name === r.name)?.grade;
            return g !== null && g !== undefined ? s + (g as number) * r.weight : s;
          }, 0);
          overall = sum / totalW;
        }
      }
      // Hierarchische Knoten für Anzeige berechnen
      const nodes: MiniGradeNode[] = roots.map((r: any) => computeNodeWithGrade(r, gradesMap));
      setMiniGradesMap(prev => ({ ...prev, [key]: { loading: false, gradingSystem: schema.gradingSystem || 'GERMAN', overall, nodes } }));
    } catch (e) {
      setMiniGradesMap(prev => ({ ...prev, [key]: { loading: false, gradingSystem: 'GERMAN', overall: null, nodes: [] } }));
    }
  };

  const handleStudentMenuOpen = (e: React.MouseEvent<HTMLElement>, groupId: string, student: Student) => {
    e.stopPropagation();
    setStudentMenuAnchorEl(e.currentTarget);
    setStudentMenuCtx({ groupId, student });
  };

  const handleStudentCardClick = (groupId: string, student: Student) => {
    const cardElement = document.querySelector(`[data-student-id="${student.id}"]`);
    setStudentMenuAnchorEl(cardElement as HTMLElement);
    setStudentMenuCtx({ groupId, student });
  };
  const handleStudentMenuClose = () => {
    setStudentMenuAnchorEl(null);
    setStudentMenuCtx(null);
  };

  const handleRemoveStudentDialogOpen = (groupId: string, student: Student) => {
    setRemoveStudentCtx({ groupId, student });
    setRemoveStudentDialogOpen(true);
    setConfirmRemoveStudent1(false);
    setConfirmRemoveStudent2(false);
    setConfirmRemoveStudentWord('');
    handleStudentMenuClose();
  };

  const handleRemoveStudentDialogClose = () => {
    setRemoveStudentDialogOpen(false);
    setRemoveStudentCtx(null);
    setConfirmRemoveStudent1(false);
    setConfirmRemoveStudent2(false);
    setConfirmRemoveStudentWord('');
  };

  const handleRemoveStudentConfirm = async () => {
    if (!removeStudentCtx) return;
    try {
      await handleRemoveStudent(removeStudentCtx.groupId, removeStudentCtx.student.id);
      handleRemoveStudentDialogClose();
    } catch (error) {
      // Error handling is already in handleRemoveStudent
    }
  };

  // Ordner-Zuordnung States
  const [folderAssignmentModalOpen, setFolderAssignmentModalOpen] = useState(false);
  const [folderAssignmentGroupId, setFolderAssignmentGroupId] = useState<string | null>(null);
  const [folderAssignmentGroupName, setFolderAssignmentGroupName] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<{[groupId: string]: string[]}>({});

  // Test-Funktion für den MaterialCreator-Ref
  const testMaterialCreatorRef = () => {
    console.log('Testing MaterialCreator ref:', materialCreatorRef.current);
    if (materialCreatorRef.current) {
      console.log('Ref is available, testing openQuizWithSource...');
      materialCreatorRef.current.openQuizWithSource('/test/path', 'TestQuiz.docx');
    } else {
      console.error('MaterialCreator ref is not available');
    }
  };

  // Neue States für Quiz-Erstellung direkt im Dashboard
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedQuizFile, setSelectedQuizFile] = useState<{ path: string; name: string } | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [gradeCategory, setGradeCategory] = useState<string>('');
  const [selectedGradeSchema, setSelectedGradeSchema] = useState<string>('');
  const [availableGradeCategories, setAvailableGradeCategories] = useState<Array<{ schemaId: string; schemaName: string; category: string }>>([]);
  
  // State für Quiz-Status
  const [quizStatusMap, setQuizStatusMap] = useState<Map<string, { 
    exists: boolean; 
    quizId?: string; 
    title?: string;
    sessionId?: string;
    resultsReleased?: boolean;
  }>>(new Map());

  // Quiz-Erstellung direkt im Dashboard
  const handleQuizDialogOpen = (filePath: string, fileName: string) => {
    setSelectedQuizFile({ path: filePath, name: fileName });
    setQuizTitle(fileName.replace(/\.[^/.]+$/, "")); // Titel aus Dateinamen
    setQuizDescription('');
    setQuizTimeLimit(30);
    setShuffleQuestions(true);
    setShuffleAnswers(true);
    setGradeCategory('');
    setSelectedGradeSchema('');
    setQuizDialogOpen(true);
    loadGradeSchemas();
  };

  const handleQuizDialogClose = () => {
    setQuizDialogOpen(false);
    setSelectedQuizFile(null);
    setQuizTitle('');
    setQuizDescription('');
    setQuizTimeLimit(30);
    setShuffleQuestions(true);
    setShuffleAnswers(true);
    setGradeCategory('');
    setSelectedGradeSchema('');
  };

  const loadGradeSchemas = async () => {
    try {
      const response = await fetch('/api/grading-schemas/all');
      if (!response.ok) {
        throw new Error('Failed to fetch grading schemas');
      }
      
      const schemas = await response.json();
      
      // Extract ONLY quiz-related grade categories from all schemas
      const quizCategories: Array<{category: string, schemaName: string, schemaId: string}> = [];
      
      schemas.forEach((schema: any) => {
        const structure = schema.structure;
        const lines = structure.split('\n');
        
        lines.forEach((line: string) => {
          const trimmedLine = line.trim();
          // ONLY look for lines that contain the word "Quiz" (case insensitive) AND exclude "Hüs"
          if (trimmedLine.toLowerCase().includes('quiz') && !trimmedLine.toLowerCase().includes('hüs')) {
            
            // Extract the category name (remove percentages and extra info)
            const categoryMatch = trimmedLine.match(/^([^(]+)/);
            if (categoryMatch) {
              const category = categoryMatch[1].trim();
              quizCategories.push({
                category,
                schemaName: schema.name,
                schemaId: schema.id
              });
            }
          }
        });
      });
      
      setAvailableGradeCategories(quizCategories);
      
    } catch (error) {
      console.error('Error loading grade schemas:', error);
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedQuizFile) return;

    try {
      console.log('Starting quiz creation...');
      console.log('Selected file:', selectedQuizFile);
      console.log('Quiz data:', {
        teacherId: userId,
        sourceFile: selectedQuizFile.path,
        title: quizTitle,
        description: quizDescription,
        timeLimit: quizTimeLimit,
        shuffleQuestions,
        shuffleAnswers,
        gradeCategory: gradeCategory || null,
        
      });

      const quizData = {
        teacherId: userId,
        sourceFile: selectedQuizFile.path,
        title: quizTitle,
        description: quizDescription,
        timeLimit: quizTimeLimit,
        shuffleQuestions,
        shuffleAnswers,
        gradeCategory: gradeCategory || null,
        
      };
      
      console.log('Sending quiz creation request to:', '/api/quizzes/create');
      const quizResponse = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      console.log('Quiz response status:', quizResponse.status);
      console.log('Quiz response headers:', quizResponse.headers);

      if (quizResponse.ok) {
        const quizResult = await quizResponse.json();
        console.log('Quiz created successfully:', quizResult);
        alert('Quiz erfolgreich erstellt!');
        
        // Quiz-Status aktualisieren, um das "Quiz starten" Icon anzuzeigen
        await checkQuizStatus(selectedQuizFile.path);
        
        handleQuizDialogClose();
      } else {
        const errorText = await quizResponse.text();
        console.error('Quiz creation error - Status:', quizResponse.status);
        console.error('Quiz creation error - Response:', errorText);
        
        let errorMessage = 'Fehler beim Erstellen des Quiz';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${quizResponse.status}: ${errorText}`;
        }
        
        alert(`Fehler beim Erstellen des Quiz:\n${errorMessage}`);
      }
    } catch (error) {
      console.error('Exception in handleCreateQuiz:', error);
      alert(`Fehler beim Erstellen des Quiz:\n${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Quiz-Status prüfen
  const checkQuizStatus = async (filePath: string) => {
    try {
      const response = await fetch(`/api/quizzes/check/exists?sourceFile=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.exists && data.quiz?.id) {
          // Prüfe den Freigabe-Status der Ergebnisse
          const activeSessionResponse = await fetch(`/api/quiz-sessions/${data.quiz.id}/active`);
          let session: { id: string; resultsReleased?: boolean } | null = null;
          
          if (activeSessionResponse.ok) {
            session = await activeSessionResponse.json();
          }
          
          // If no active session, check for the most recent session
          if (!session) {
            const sessionsResponse = await fetch(`/api/quiz-sessions/${data.quiz.id}/sessions`);
            if (sessionsResponse.ok) {
              const sessions = await sessionsResponse.json();
              if (sessions && sessions.length > 0) {
                session = sessions[0]; // Most recent session
              }
            }
          }
          
          if (session && session.id) {
            const sessionId = session.id;
            const resultsReleased = session.resultsReleased || false;
            setQuizStatusMap(prev => new Map(prev.set(filePath, {
              exists: data.exists,
              quizId: data.quiz?.id,
              title: data.quiz?.title,
              sessionId: sessionId,
              resultsReleased: resultsReleased
            })));
          } else {
            setQuizStatusMap(prev => new Map(prev.set(filePath, {
              exists: data.exists,
              quizId: data.quiz?.id,
              title: data.quiz?.title
            })));
          }
        } else {
          setQuizStatusMap(prev => new Map(prev.set(filePath, {
            exists: data.exists,
            quizId: data.quiz?.id,
            title: data.quiz?.title
          })));
        }
      }
    } catch (error) {
      console.error('Error checking quiz status:', error);
    }
  };

  // Quiz-Status für alle Quiz-Dateien prüfen
  const checkAllQuizStatuses = async () => {
    // Sammle alle Quiz-Dateien aus allen zugewiesenen Ordnern
    const allQuizFiles: Array<{ path: string; name: string }> = [];
    
    Object.entries(assignedFolderContents).forEach(([key, items]) => {
      const quizFiles = items.filter((item: any) => 
        item.type === 'file' && item.name.startsWith('Quiz')
      );
      allQuizFiles.push(...quizFiles);
    });
    
    for (const file of allQuizFiles) {
      await checkQuizStatus(file.path);
    }
  };

  // Quiz-Status beim Laden der Dateien prüfen
  useEffect(() => {
    if (Object.keys(assignedFolderContents).length > 0) {
      checkAllQuizStatuses();
    }
  }, [assignedFolderContents]);

  // Quiz starten
  const handleStartQuiz = async (quizId: string) => {
    try {
      console.log('Starting quiz with ID:', quizId);
      // Navigiere zur bestehenden Quiz-Session-Seite
      window.location.href = `/quiz-session/${quizId}`;
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Fehler beim Starten des Quiz');
    }
  };

  // Quiz-Ergebnisse freigeben
  const handleReleaseResults = async (sessionId: string, filePath: string) => {
    try {
      const response = await fetch(`/api/quiz-sessions/${sessionId}/release-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId: userId })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await checkQuizStatus(filePath);
      } else {
        const errorText = await response.text();
        alert(`Fehler beim Freigeben/Zurücknehmen der Ergebnisse: ${errorText}`);
      }
    } catch (error) {
      console.error('Error toggling results release:', error);
      alert('Fehler beim Freigeben/Zurücknehmen der Ergebnisse');
    }
  };

  return (
    <Box 
      sx={{ width: '100%', bgcolor: colors.background, p: 0 }}
      ref={dashboardRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <Grid container spacing={0}>
        {/* Header Section */}
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
                  L
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h1" sx={{ fontWeight: 600, fontSize: '0.77rem', mb: 0 }}>
                    Lehrer-Dashboard
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.67rem', opacity: 0.85 }}>
                    Willkommen im Lehrerbereich
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

        <Grid item xs={12}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 1.4 }}>
            <Tabs value={mainTabValue} onChange={handleMainTabChange} aria-label="dashboard tabs" sx={{ minHeight: 28 }}>
              <Tab icon={<GroupIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Lerngruppen</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StorageIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Datenbank</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<SchoolIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Meine Fächer</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<BuildIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Material & Quiz</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
            </Tabs>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TabPanel value={mainTabValue} index={0}>
            {/* Learning Groups Section */}
            <Box sx={{ p: 1.4 }}>
              <Card sx={{ 
                borderRadius: 2.8,
                boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
                bgcolor: colors.cardBg
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                      <GroupIcon sx={{ mr: 1.4, color: colors.primary, fontSize: 28 }} />
                      <Typography variant="h5" component="h2" sx={{ 
                        fontWeight: 'bold', 
                        color: colors.primary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '1.12rem'
                      }}>
                        Meine Lerngruppen
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenNewGroupDialog(true)}
                      sx={{ 
                        bgcolor: colors.primary,
                        '&:hover': { bgcolor: colors.primary, filter: 'brightness(1.1)' },
                        ml: 1.0,
                        py: 0.25,
                        px: 1.0,
                        fontSize: '0.48rem',
                        height: '20px',
                        width: '12%'
                      }}
                    >
                      Neue Gruppe
                    </Button>
                  </Box>

                  {groups.map((group) => (
                    <Box key={group.id} sx={{ mb: 1.4 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 0.8,
                        p: 1.0,
                        bgcolor: `${colors.primary}10`,
                        borderRadius: 1.4,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: `${colors.primary}20`,
                        }
                      }} onClick={() => toggleGroupExpanded(group.id)}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h6" sx={{ 
                            color: colors.primary, 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.72rem'
                          }}>
                            {group.name}
                          </Typography>
                          <Chip 
                            label={`${group.students.length} Schüler`}
                            size="small" 
                            sx={{ 
                              ml: 1.0, 
                              bgcolor: colors.primary,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.6rem',
                              height: 16
                            }} 
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, transform: 'translateX(-10%)' }}>
                          <IconButton
                            aria-label={expandedGroups[group.id] === false ? 'Aufklappen' : 'Zuklappen'}
                            onClick={e => { e.stopPropagation(); toggleGroupExpanded(group.id); }}
                            size="small"
                            sx={{ width: 24, height: 24, p: 0.25 }}
                          >
                            {expandedGroups[group.id] === false ? (
                              <ExpandMoreIcon />
                            ) : (
                              <ExpandLessIcon />
                            )}
                          </IconButton>
                          <IconButton
                            aria-label="Mehr"
                            onClick={e => { e.stopPropagation(); handleMenuOpen(e, group.id); }}
                            size="small"
                            sx={{ width: 24, height: 24, p: 0.25 }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Grid container spacing={0.8} sx={{ display: expandedGroups[group.id] === false ? 'none' : 'flex' }}>
                        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Grid container spacing={0.8}>
                            {group.students.map((student) => (
                              <Grid item xs={12} sm={6} md={6} lg={3} key={student.id}>
                                <Card 
                                  variant="outlined" 
                                  sx={{ 
                                    borderRadius: 2.8,
                                    border: '1px solid #e0e0e0',
                                    bgcolor: '#ffffff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    transition: 'all 0.2s ease-in-out',
                                    cursor: 'pointer',
                                    p: 0,
                                    '&:hover': {
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                      transform: 'translateY(-1px)'
                                    }
                                  }}
                                  onMouseEnter={() => ensureMiniGrades(group.id, student.id)}
                                  onClick={() => handleStudentCardClick(group.id, student)}
                                  data-student-id={student.id}
                                >
                                  <CardContent sx={{ p: 0, pb: 0, pt: 0, pl: 0, pr: 0, overflow: 'hidden' }}>
                                    {/* Top Section - Avatar and Name */}
                                    <Box sx={{ 
                                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                      p: 1,
                                      textAlign: 'center',
                                      position: 'relative'
                                    }}>
                                      <Avatar sx={{ 
                                        bgcolor: student.avatarEmoji ? 'transparent' : colors.accent1, 
                                        width: 36, 
                                        height: 36,
                                        fontSize: student.avatarEmoji ? '1.2rem' : '1rem',
                                        mx: 'auto',
                                        mb: 0.7,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                      }}>
                                        {student.avatarEmoji || student.name.charAt(0)}
                                      </Avatar>
                                      <Typography variant="h6" sx={{ 
                                        fontWeight: 'bold', 
                                        fontSize: '0.8rem',
                                        color: colors.textPrimary,
                                        mb: 0.3,
                                        cursor: 'help'
                                      }}
                                      title={`Code: ${student.loginCode}`}
                                      >
                                        {student.name}
                                      </Typography>
                                    </Box>

                                    {/* Bottom Section - Grade Stats */}
                                    <Box sx={{ p: 1, pb: 0 }}>
                                      {(() => {
                                        const key = `${group.id}:${student.id}`;
                                        const mini = miniGradesMap[key];
                                        if (!mini || mini.loading) {
                                          return (
                                            <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                                                Lade Noten...
                                              </Typography>
                                            </Box>
                                          );
                                        }

                                        const stats = getGradeStats(mini.nodes, mini.gradingSystem);
                                        
                                        return (
                                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {/* Grade Stat Boxes */}
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                                              {/* Klassenarbeiten */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.7, 
                                                borderRadius: 1.4,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0'
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '1rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.3
                                                }}>
                                                  {formatGradeValue(stats.klassenarbeiten.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.6rem', 
                                                  color: colors.textSecondary,
                                                  fontWeight: 600
                                                }}>
                                                  {stats.klassenarbeiten.label}
                                                </Typography>
                                                {stats.klassenarbeiten.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.5rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.5 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>

                                              {/* EPO Noten */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.7, 
                                                borderRadius: 1.4,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0'
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '1rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.3
                                                }}>
                                                  {formatGradeValue(stats.epo.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.6rem', 
                                                  color: colors.textSecondary,
                                                  fontWeight: 600
                                                }}>
                                                  {stats.epo.label}
                                                </Typography>
                                                {stats.epo.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.5rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.5 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>

                                              {/* Quizze */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.7, 
                                                borderRadius: 1.4,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0'
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '1rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.3
                                                }}>
                                                  {formatGradeValue(stats.quizze.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.6rem', 
                                                  color: colors.textSecondary,
                                                  fontWeight: 600
                                                }}>
                                                  {stats.quizze.label}
                                                </Typography>
                                                {stats.quizze.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.5rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.5 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>

                                              {/* Sonstiges */}
                                              <Box sx={{ 
                                                bgcolor: '#f5f5f5', 
                                                p: 0.7, 
                                                borderRadius: 1.4,
                                                textAlign: 'center',
                                                border: '1px solid #e0e0e0'
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '1rem', 
                                                  fontWeight: 'bold', 
                                                  color: colors.primary,
                                                  mb: 0.3
                                                }}>
                                                  {formatGradeValue(stats.sonstiges.values, mini.gradingSystem)}
                                                </Typography>
                                                <Typography sx={{ 
                                                  fontSize: '0.6rem', 
                                                  color: colors.textSecondary,
                                                  fontWeight: 600
                                                }}>
                                                  {stats.sonstiges.label}
                                                </Typography>
                                                {stats.sonstiges.individualGrades.map((item, index) => (
                                                  <Typography key={index} variant="body2" sx={{ 
                                                    fontSize: '0.5rem', 
                                                    color: index % 2 === 0 ? '#666666' : '#999999', 
                                                    display: 'inline', 
                                                    mr: 0.5 
                                                  }}>
                                                    {formatGermanMini(item.grade)}
                                                  </Typography>
                                                ))}
                                              </Box>
                                            </Box>

                                            {/* Overall Grade if available */}
                                            {mini.overall !== null && mini.overall !== undefined && (
                                              <Box sx={{ 
                                                textAlign: 'center', 
                                                mt: 0,
                                                p: 0.3,
                                                bgcolor: `${getGradeColorMini(mini.overall, mini.gradingSystem)}15`,
                                                borderRadius: 0.7,
                                                border: `1px solid ${getGradeColorMini(mini.overall, mini.gradingSystem)}30`
                                              }}>
                                                <Typography sx={{ 
                                                  fontSize: '0.8rem', 
                                                  fontWeight: 'bold', 
                                                  color: getGradeColorMini(mini.overall, mini.gradingSystem)
                                                }}>
                                                  {mini.gradingSystem === 'MSS' ? mini.overall.toFixed(0) : formatGermanMini(mini.overall)}
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>
                                        );
                                      })()}
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                          {/* Zugeordnete Ordner */}
                          <Box sx={{ 
                            p: 2.1, 
                            bgcolor: '#fff', 
                            borderRadius: 2.8, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0'
                          }}>

                            <Box sx={{ 
                              ml: 1,
                              p: 1.4,
                              bgcolor: '#fafbfc',
                              borderRadius: 1.4,
                              border: '1px solid #f0f0f0'
                            }}>
                              {assignedFolders[group.id] && assignedFolders[group.id].length > 0 ? (
                                <Box>
                                  {assignedFolders[group.id].map((folderPath: string) => {
                                    return renderAssignedFolderPreview(group.id, folderPath);
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
                            </Box>
                          </Box>
                          
                          {/* Zugeordnete Inhalte */}
                          <Box sx={{ 
                            p: 2.1, 
                            bgcolor: '#fff', 
                            borderRadius: 2.8, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0'
                          }}>

                            {/* Verschachtelte Darstellung */}
                            <Box sx={{ 
                              ml: 1,
                              p: 1.4,
                              bgcolor: '#fafbfc',
                              borderRadius: 1.4,
                              border: '1px solid #f0f0f0'
                            }}>
                              {subjects
                                .filter(subject => (subjectAssignments[subject.id] || []).includes(group.id))
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
                                      .filter(block => block.subjectId === subject.id && (blockAssignments[block.id] || []).includes(group.id))
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
                                            .filter(unit => unit.blockId === block.id && (unitAssignments[unit.id] || []).includes(group.id))
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
                                                  .filter(topic => topic.unitId === unit.id && (topicAssignments[topic.id] || []).includes(group.id))
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
                                                        .filter(lesson => lesson.topicId === topic.id && (lessonAssignments[lesson.id] || []).includes(group.id))
                                                        .map(lesson => (
                                                                                                                  <Box key={lesson.id} sx={{ 
                                                          ml: 2, 
                                                          display: 'flex', 
                                                          alignItems: 'center', 
                                                          gap: '6px',
                                                          p: 0.5,
                                                          borderRadius: 1,
                                                          bgcolor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? '#f0f8ff' : 'transparent',
                                                          transition: 'all 0.2s ease',
                                                          '&:hover': {
                                                            bgcolor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? '#e3f2fd' : 'transparent'
                                                          }
                                                        }}>
                                                          <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                              color: colors.textSecondary,
                                                              cursor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? 'pointer' : 'default',
                                                              fontSize: '0.75rem',
                                                              fontWeight: 500,
                                                              '&:hover': {
                                                                color: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? colors.primary : colors.textSecondary
                                                              }
                                                            }}
                                                              onClick={e => {
                                                                e.stopPropagation();
                                                                if ((lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id]) {
                                                                  openLessonContent(lesson.id, lesson.name);
                                                                }
                                                              }}
                                                              title={(lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? "Material/Quiz öffnen" : ""}
                                                            >
                                                              📖 {lesson.name}
                                                            </Typography>
                                                            {((lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id]) && (
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
                                                                {lessonQuizzes[lesson.id] ? '🧩' : '📄'}
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
                              {!(subjects.some(subject => (subjectAssignments[subject.id] || []).includes(group.id)) ||
                                blocks.some(block => (blockAssignments[block.id] || []).includes(group.id)) ||
                                units.some(unit => (unitAssignments[unit.id] || []).includes(group.id)) ||
                                topics.some(topic => (topicAssignments[topic.id] || []).includes(group.id)) ||
                                lessons.some(lesson => (lessonAssignments[lesson.id] || []).includes(group.id))) && (
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
                          

                        </Grid>
                      </Grid>
                      

                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={1}>
            <Box sx={{ fontSize: '0.7rem' }}>
              <DatabaseViewer />
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={2}>
            {/* Subtabs: Fächer als Tabs */}
            <Box sx={{ mb: 0.15 }}>
              <Tabs
                value={subjectTabValue}
                onChange={handleSubjectTabChange}
                variant="scrollable"
                scrollButtons={false}
                aria-label="subjects tabs"
                sx={{
                  minHeight: 32,
                  '& .MuiTabs-flexContainer': { gap: 0.5 },
                  '& .MuiTabs-indicator': { display: 'none' },
                  '& .MuiTab-root': {
                    minHeight: 30,
                    textTransform: 'none',
                    padding: '6px 10px',
                    borderRadius: '16px',
                    fontSize: '0.82rem',
                    color: '#2C3E50',
                    opacity: 1,
                  },
                  '& .MuiTab-root.Mui-selected': {
                    backgroundColor: '#e3f0fc',
                    color: '#1976D2',
                    fontWeight: 600,
                  },
                  '& .MuiTab-root:first-of-type': {
                    width: '7%',
                    minWidth: '56px',
                    maxWidth: '70px',
                  },
                  '& .MuiTab-root:not(:first-of-type)': {
                    flex: 1,
                    maxWidth: subjects.length === 1 ? '90%' : '45%',
                  },
                }}
              >
                {/* + Tab für "Fach hinzufügen" */}
                <Tab 
                  label="➕" 
                  value={-1} 
                  sx={{ 
                    fontSize: '1.2rem',
                    color: '#1976D2',
                    '&:hover': {
                      backgroundColor: '#e3f0fc',
                    }
                  }}
                />
                {subjects.map((s, i) => (
                  <Tab key={s.id} label={s.name} value={i} />
                ))}
              </Tabs>
            </Box>

            {/* Unter-Tabs: Blöcke direkt unterhalb der jeweiligen Obertabs (bei genau 2 Fächern links/rechts 50%) */}
            {subjects.length === 2 ? (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.15, mb: 2.5 }}>
                <Box sx={{ width: '50%', ml: '6%' }}>
                  {subjectTabValue === 0 && (
                    <Tabs
                      value={blockTabValue}
                      onChange={(_, v) => setBlockTabValue(v)}
                      variant="standard"
                      aria-label="blocks tabs left"
                      sx={{
                        minHeight: 20,
                        width: '100%',
                        '& .MuiTabs-flexContainer': { gap: 0.25, flexWrap: 'wrap' },
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTab-root': {
                          minHeight: 18,
                          textTransform: 'none',
                          padding: '1px 4px',
                          borderRadius: '10px',
                          fontSize: '0.6rem',
                          color: '#2C3E50',
                          opacity: 1,
                          backgroundColor: '#f1f5f9',
                          width: '20%',
                          minWidth: 0,
                        },
                        '& .MuiTab-root.Mui-selected': {
                          backgroundColor: '#e8f5e9',
                          color: '#2E7D32',
                          fontWeight: 600,
                        },
                      }}
                    >
                      {(blocks.filter(b => b.subjectId === subjects[0]?.id) || []).map((b, i) => (
                        <Tab key={b.id} label={b.name} value={i} />
                      ))}
                    </Tabs>
                  )}
                </Box>
                <Box sx={{ width: '50%', display: 'flex', justifyContent: 'flex-start' }}>
                  {subjectTabValue === 1 && (
                    <Tabs
                      value={blockTabValue}
                      onChange={(_, v) => setBlockTabValue(v)}
                      variant="standard"
                      aria-label="blocks tabs right"
                      sx={{
                        minHeight: 20,
                        width: '100%',
                        '& .MuiTabs-flexContainer': { gap: 0.25, flexWrap: 'wrap', justifyContent: 'flex-start' },
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTab-root': {
                          minHeight: 18,
                          textTransform: 'none',
                          padding: '1px 4px',
                          borderRadius: '10px',
                          fontSize: '0.6rem',
                          color: '#2C3E50',
                          opacity: 1,
                          backgroundColor: '#f1f5f9',
                          width: '20%',
                          minWidth: 0,
                        },
                        '& .MuiTab-root.Mui-selected': {
                          backgroundColor: '#e8f5e9',
                          color: '#2E7D32',
                          fontWeight: 600,
                        },
                      }}
                    >
                      {(blocks.filter(b => b.subjectId === subjects[1]?.id) || []).map((b, i) => (
                        <Tab key={b.id} label={b.name} value={i} />
                      ))}
                    </Tabs>
                  )}
                </Box>
              </Box>
            ) : (
              <Box sx={{ mt: 0.15, mb: 2.5 }}>
                <Tabs
                  value={blockTabValue}
                  onChange={(_, v) => setBlockTabValue(v)}
                  variant="standard"
                  aria-label="blocks tabs"
                  sx={{
                    minHeight: 20,
                    width: '100%',
                    '& .MuiTabs-flexContainer': { gap: 0.25, flexWrap: 'wrap' },
                    '& .MuiTabs-indicator': { display: 'none' },
                    '& .MuiTab-root': {
                      minHeight: 18,
                      textTransform: 'none',
                      padding: '1px 4px',
                      borderRadius: '10px',
                      fontSize: '0.6rem',
                      color: '#2C3E50',
                      opacity: 1,
                      backgroundColor: '#f1f5f9',
                      width: '20%',
                      minWidth: 0,
                    },
                    '& .MuiTab-root.Mui-selected': {
                      backgroundColor: '#e8f5e9',
                      color: '#2E7D32',
                      fontWeight: 600,
                    },
                  }}
               >
                  {(blocks.filter(b => b.subjectId === subjects[subjectTabValue]?.id) || []).map((b, i) => (
                    <Tab key={b.id} label={b.name} value={i} />
                  ))}
                </Tabs>
              </Box>
            )}

            <SubjectManager
              ref={subjectManagerRef}
              teacherId={userId}
              subjectAssignments={subjectAssignments}
              setSubjectAssignments={setSubjectAssignments}
              blockAssignments={blockAssignments}
              setBlockAssignments={setBlockAssignments}
              unitAssignments={unitAssignments}
              setUnitAssignments={setUnitAssignments}
              topicAssignments={topicAssignments}
              setTopicAssignments={setTopicAssignments}
              lessonAssignments={lessonAssignments}
              setLessonAssignments={setLessonAssignments}
              setSubjects={setSubjects}
              setBlocks={setBlocks}
              setUnits={setUnits}
              setTopics={setTopics}
              setLessons={setLessons}
              visibleSubjectId={subjects[subjectTabValue]?.id}
              visibleBlockId={(blocks.filter(b => b.subjectId === subjects[subjectTabValue]?.id) || [])[blockTabValue]?.id}
              onOpenSubjectDialog={handleOpenSubjectDialog}
            />
          </TabPanel>
          <TabPanel value={mainTabValue} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Dateisystem-Pfade verwalten */}
              <Box sx={{ mb: 2 }}>
                <FileSystemPathManager teacherId={userId} />
              </Box>
              
              {/* Hauptbereich - MaterialCreator */}
              <Box>
                {/* Test-Button für MaterialCreator-Ref */}
                <Button 
                  variant="outlined" 
                  onClick={testMaterialCreatorRef}
                  sx={{ mb: 2 }}
                >
                  Test MaterialCreator Ref
                </Button>
                
                <MaterialCreator teacherId={userId} ref={materialCreatorRef} />
              </Box>
            </Box>
          </TabPanel>

        </Grid>
      </Grid>

      {/* New Group Dialog */}
      <Dialog open={openNewGroupDialog} onClose={() => setOpenNewGroupDialog(false)}>
        <DialogTitle>Neue Lerngruppe erstellen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name der Lerngruppe"
            type="text"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenNewGroupDialog(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setOpenNewGroupDialog(false);
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateGroup} 
            variant="contained" 
            color="primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateGroup();
              }
            }}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Students Dialog */}
      <Dialog open={openAddStudentsDialog} onClose={() => setOpenAddStudentsDialog(false)}>
        <DialogTitle>Schüler hinzufügen</DialogTitle>
        <DialogContent>
          <List>
            {availableStudents.map((student) => (
              <ListItem key={student.id}>
                <ListItemText 
                  primary={student.name}
                  secondary={`Login-Code: ${student.loginCode}`}
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={(event) => {
                      setSelectedStudents(
                        event.target.checked
                          ? [...selectedStudents, student.id]
                          : selectedStudents.filter(id => id !== student.id)
                      );
                    }}
                    checked={selectedStudents.includes(student.id)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenAddStudentsDialog(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setOpenAddStudentsDialog(false);
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddStudents} 
            variant="contained" 
            color="primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddStudents();
              }
            }}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Kontextmenü für Gruppen */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        PaperProps={{
          sx: {
            mt: 0.5,
            transform: 'translateX(-12px)'
          }
        }}
      >
        <MenuItem onClick={() => { handleOpenAddStudents(menuGroupId!); handleMenuClose(); }}>
          <PersonAddIcon fontSize="small" sx={{ mr: 1 }} /> Schüler hinzufügen
        </MenuItem>
        <MenuItem onClick={() => handleFolderAssignmentOpen(menuGroupId!)}>
          <FolderIcon fontSize="small" sx={{ mr: 1 }} /> Ordner zuordnen
        </MenuItem>
        <MenuItem onClick={() => handleEditDialogOpen(menuGroupId!, groups.find(g => g.id === menuGroupId!)?.name || '')}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Bearbeiten
        </MenuItem>
        <MenuItem onClick={() => handleGradingDialogOpen(menuGroupId!, groups.find(g => g.id === menuGroupId!)?.name || '')}>
          <AssessmentIcon fontSize="small" sx={{ mr: 1 }} /> Benotung festlegen
        </MenuItem>
        {(() => {
          const group = groups.find(g => g.id === menuGroupId!);
          return group && group.students.length > 0 ? (
            <MenuItem onClick={() => handleGradesDialogOpen(menuGroupId!, group.name, group.students[0])}>
              <GradeIcon fontSize="small" sx={{ mr: 1 }} /> Noten anzeigen
            </MenuItem>
          ) : null;
        })()}
        <MenuItem onClick={() => handleDeleteDialogOpen(menuGroupId!)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Löschen
        </MenuItem>
      </Menu>
      {/* Bearbeitungsdialog für Lerngruppe */}
      <Dialog open={editDialogOpen} onClose={handleEditDialogClose}>
        <DialogTitle>Lerngruppe bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name der Lerngruppe"
            type="text"
            fullWidth
            value={editGroupName}
            onChange={(e) => setEditGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditGroup();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleEditGroup} 
            variant="contained" 
            color="primary"
            disabled={!editGroupName.trim()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditGroup();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bestätigungsdialog für Löschen */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>Lerngruppe löschen</DialogTitle>
        <DialogContent>
          <Typography>Möchtest du diese Lerngruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</Typography>
          <Typography sx={{ color: 'error.main', mt: 2, fontWeight: 'bold' }}>
            Achtung: Diese Aktion löscht alle Zuweisungen und Bewertungsschemata dieser Gruppe unwiderruflich!
          </Typography>
          <Box sx={{ mt: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={confirmDelete1} onChange={e => setConfirmDelete1(e.target.checked)} style={{ marginRight: 8 }} />
              Ich habe verstanden, dass alle Inhalte und Zuweisungen gelöscht werden.
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={confirmDelete2} onChange={e => setConfirmDelete2(e.target.checked)} style={{ marginRight: 8 }} />
              Ich möchte diese Gruppe wirklich unwiderruflich löschen.
            </label>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'error.main', fontWeight: 'bold' }}>
                Zur Bestätigung: Gib "ENTFERNEN" ein
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={confirmDeleteWord}
                onChange={(e) => setConfirmDeleteWord(e.target.value)}
                placeholder="ENTFERNEN eingeben"
                sx={{ mb: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Abbrechen</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained" disabled={!(confirmDelete1 && confirmDelete2 && confirmDeleteWord === 'ENTFERNEN')} onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDeleteGroup();
              }
            }}>Löschen</Button>
        </DialogActions>
      </Dialog>

      {/* Grading Schema Modal */}
      <GradingSchemaModal
        open={gradingModalOpen}
        onClose={handleGradingDialogClose}
        groupId={gradingGroupId || ''}
        groupName={gradingGroupName}
      />

      {/* Schüler Menü */}
      <Menu anchorEl={studentMenuAnchorEl} open={Boolean(studentMenuAnchorEl)} onClose={handleStudentMenuClose}>
        <MenuItem onClick={() => { if (studentMenuCtx) handleGradesDialogOpen(studentMenuCtx.groupId, groups.find(g=>g.id===studentMenuCtx.groupId)?.name || '', studentMenuCtx.student); handleStudentMenuClose(); }}>
          <GradeIcon fontSize="small" style={{ marginRight: 8 }} /> Noten eintragen
        </MenuItem>
        <MenuItem onClick={() => { if (studentMenuCtx) handleRemoveStudentDialogOpen(studentMenuCtx.groupId, studentMenuCtx.student); handleStudentMenuClose(); }}>
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Entfernen
        </MenuItem>
      </Menu>

      {/* Schüler Entfernung Bestätigungsdialog */}
      <Dialog open={removeStudentDialogOpen} onClose={handleRemoveStudentDialogClose}>
        <DialogTitle>Schüler entfernen</DialogTitle>
        <DialogContent>
          <Typography>Möchtest du diesen Schüler wirklich aus der Lerngruppe entfernen?</Typography>
          <Typography sx={{ color: 'error.main', mt: 2, fontWeight: 'bold' }}>
            Achtung: Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={confirmRemoveStudent1} onChange={e => setConfirmRemoveStudent1(e.target.checked)} style={{ marginRight: 8 }} />
              Ich habe verstanden, dass dieser Schüler unwiderruflich entfernt wird.
            </label>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <input type="checkbox" checked={confirmRemoveStudent2} onChange={e => setConfirmRemoveStudent2(e.target.checked)} style={{ marginRight: 8 }} />
              Ich möchte diesen Schüler wirklich unwiderruflich entfernen.
            </label>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'error.main', fontWeight: 'bold' }}>
                Zur Bestätigung: Gib "ENTFERNEN" ein
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={confirmRemoveStudentWord}
                onChange={(e) => setConfirmRemoveStudentWord(e.target.value)}
                placeholder="ENTFERNEN eingeben"
                sx={{ mb: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRemoveStudentDialogClose}>Abbrechen</Button>
          <Button 
            onClick={handleRemoveStudentConfirm} 
            color="error" 
            variant="contained" 
            disabled={!(confirmRemoveStudent1 && confirmRemoveStudent2 && confirmRemoveStudentWord === 'ENTFERNEN')}
          >
            Entfernen
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0', mt: 2 }}>
        <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
          Tastatur: Tab zum Navigieren, Pfeiltasten für Tabs, ESC zum Logout
        </Typography>
      </Box>

      {/* Ordner-Zuordnungs-Dialog */}
      <Dialog 
        open={folderAssignmentModalOpen} 
        onClose={handleFolderAssignmentClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            minHeight: '80vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          Ordner zuordnen: {folderAssignmentGroupName}
        </DialogTitle>
        <DialogContent>
          <FolderAssignmentSelector
            groupId={folderAssignmentGroupId || ''}
            onClose={handleFolderAssignmentClose}
            onFoldersAssigned={() => {
              if (folderAssignmentGroupId) {
                fetchAssignedFolders(folderAssignmentGroupId);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Grades Modal */}
      {selectedStudent && (
        <GradesModal
          open={gradesModalOpen}
          onClose={handleGradesDialogClose}
          student={selectedStudent}
          groupId={gradesGroupId || ''}
          groupName={gradesGroupName}
        />
      )}

      {/* Quiz-Erstellungsmodal */}
      <Dialog 
        open={quizDialogOpen} 
        onClose={handleQuizDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuizIcon sx={{ mr: 1, color: '#ff9800' }} />
            Quiz erstellen aus: {selectedQuizFile?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Quiz-Einstellungen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#ff9800' }}>
                Quiz-Einstellungen
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Titel des Quiz"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Zeitlimit (Minuten)"
                type="number"
                value={quizTimeLimit}
                onChange={(e) => setQuizTimeLimit(parseInt(e.target.value) || 30)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={3}
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Notenkategorie</InputLabel>
                <Select
                  value={gradeCategory}
                  onChange={(e) => setGradeCategory(e.target.value)}
                  label="Notenkategorie"
                >
                  {availableGradeCategories.map((cat) => (
                    <MenuItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.schemaName})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Notenschema</InputLabel>
                <Select
                  value={selectedGradeSchema}
                  onChange={(e) => setSelectedGradeSchema(e.target.value)}
                  label="Notenschema"
                >
                  {availableGradeCategories
                    .filter(cat => !gradeCategory || cat.category === gradeCategory)
                    .map((cat) => (
                      <MenuItem key={cat.schemaId} value={cat.schemaId}>
                        {cat.schemaName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                  />
                }
                label="Fragen mischen"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shuffleAnswers}
                    onChange={(e) => setShuffleAnswers(e.target.checked)}
                  />
                }
                label="Antworten mischen"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleQuizDialogClose}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateQuiz} 
            variant="contained" 
            color="primary"
            disabled={!quizTitle.trim()}
          >
            Quiz erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherDashboard; 