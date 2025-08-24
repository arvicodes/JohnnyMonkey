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
  Style as StyleIcon,
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
  Quiz as QuizIcon,
  Refresh as RefreshIcon,

  Add,
  Edit,
  Delete,
  Group,
  Description,
  Public,
  Lock
} from '@mui/icons-material';
import { GripVertical, Trash2 } from 'lucide-react';
import DatabaseViewer from './DatabaseViewer';
import SubjectManager from './SubjectManager';
import { fetchAssignments } from './SubjectManager';
import MaterialCreator from './MaterialCreator';
import GradingSchemaModal from './GradingSchemaModal';
import GradesModal from './GradesModal';
import FileSystemPathManager from './FileSystemPathManager';
import FolderAssignmentSelector from './FolderAssignmentSelector';
import { RichTextEditor } from './ui/rich-text-editor';
import { FlashcardCreationModal } from './FlashcardCreationModal';

interface TeacherDashboardProps {
  userId: string;
  onLogout: () => void;
}

interface Subject {
  id: string;
  name: string;
  description?: string;
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

// Flashcard-Interfaces
interface Flashcard {
  id?: string;
  front: string;
  back: string;
  hint?: string;
  difficulty: number;
  order: number;
}

interface FlashcardDeck {
  id?: string;
  title: string;
  description?: string;
  subjectId?: string;
  teacherId: string;
  imageUrl?: string; // URL für das Deck-Bild
  imageColor?: string; // Fallback-Farbe für das Deck-Bild
  imageIcon?: string; // Fallback-Emoji/Icon für das Deck
  cards: Flashcard[];
  subject?: Subject;
  assignments?: FlashcardAssignment[];
}

interface FlashcardAssignment {
  id: string;
  deckId: string;
  groupId: string;
  dueDate?: string;
  group: LearningGroup;
}

interface DocumentProcessingHistory {
  id: string;
  sourceFile: string;
  fileName: string;
  teacherId: string;
  action: 'created_deck' | 'added_to_deck';
  deckId: string;
  deckTitle: string;
  cardsCount: number;
  processedAt: string;
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

// Hilfsfunktion zum Konvertieren von HTML zu Plaintext für Vorschau
const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  // Erstelle ein temporäres div-Element
  const temp = document.createElement('div');
  temp.innerHTML = html;
  // Extrahiere nur den Text-Inhalt
  return temp.textContent || temp.innerText || '';
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userId, onLogout }) => {
  const navigate = useNavigate();
  const subjectManagerRef = useRef<any>(null);
  const materialCreatorRef = useRef<any>(null);
  
  // Debug: Log userId
  
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
  
  // Flashcard States
  const [flashcardDecks, setFlashcardDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [openNewDeckDialog, setOpenNewDeckDialog] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  
  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  
  // Flashcard Management States
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [draggedCard, setDraggedCard] = useState<Flashcard | null>(null);

  // Document Processing History States
  const [documentHistoryMap, setDocumentHistoryMap] = useState<{[key: string]: DocumentProcessingHistory[]}>({});


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
    accent1: '#1976D32', // Dunkleres Blau
    accent2: '#C2185B', // Dunkleres Pink
    background: '#F8FAFC', // Helleres, moderneres Blau
    cardBg: '#FFFFFF',
    success: '#4CAF50',
    error: '#F44336', // Fehlerfarbe
    warning: '#FF9800', // Warnfarbe
    textPrimary: '#2C3E50', // Dunkler Text für bessere Lesbarkeit
    textSecondary: '#7F8C8D', // Grauer Text für Sekundärinformationen
    border: '#E0E0E0', // Rahmenfarbe für Karten und Modals
  };

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroups();
  }, [userId]);

  // Lade Karteikarten-Decks aus der Datenbank
  const fetchFlashcardDecks = async () => {
    try {
      console.log('Lade Karteikarten-Decks...');
      const response = await fetch(`/api/flashcards/teacher/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        const decks = data.decks || [];
        console.log(`Erfolgreich ${decks.length} Karteikarten-Decks geladen:`, decks);
        
        setFlashcardDecks(decks);
        console.log('Alle Decks mit Karten geladen:', decks);
      } else {
        console.error(`HTTP-Fehler beim Laden der Karteikarten-Decks: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Karteikarten-Decks:', error);
    }
  };

  // Lade Flashcard-Assignments für alle Decks
  const fetchFlashcardAssignments = async () => {
    try {
      // Die Assignments sind bereits in den Decks enthalten, da wir sie mit den Decks laden
      console.log('Flashcard-Assignments sind bereits in den Decks enthalten');
    } catch (error) {
      console.error('Fehler beim Laden der Flashcard-Assignments:', error);
    }
  };

  // Lade Verarbeitungshistorie für ein Dokument
  const fetchDocumentProcessingHistory = async (sourceFile: string): Promise<DocumentProcessingHistory[]> => {
    try {
      const response = await fetch(`/api/flashcards/document-history?teacherId=${userId}&sourceFile=${encodeURIComponent(sourceFile)}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.history || [];
      } else {
        console.error(`HTTP-Fehler beim Laden der Verarbeitungshistorie: ${response.status} ${response.statusText}`);
        return [];
      }
    } catch (error) {
      console.error('Fehler beim Laden der Verarbeitungshistorie:', error);
      return [];
    }
  };

  // Lade alle Karten für ein spezifisches Deck
  const fetchDeckCards = async (deckId: string) => {
    try {
      console.log(`Lade Karten für Deck ${deckId}...`);
      const response = await fetch(`/api/flashcards/${deckId}`);
      
      if (response.ok) {
        const data = await response.json();
        const deck = data.deck;
        console.log(`Erfolgreich Deck mit ${deck.cards.length} Karten geladen:`, deck);
        
        // Aktualisiere das Deck mit den Karten
        setFlashcardDecks(prev => prev.map(d => 
          d.id === deckId 
            ? deck
            : d
        ));
        
        return deck.cards || [];
      } else {
        console.error(`HTTP-Fehler beim Laden der Karten: ${response.status} ${response.statusText}`);
        return [];
      }
    } catch (error) {
      console.error('Fehler beim Laden der Deck-Karten:', error);
      return [];
    }
  };



  // Erstelle oder aktualisiere Lerngruppen-Zuweisungen
  const handleAssignGroups = async (deckId: string, groupIds: string[]) => {
    try {
      // Lösche alle bestehenden Zuweisungen für dieses Deck
      const existingAssignments = flashcardDecks.find(d => d.id === deckId)?.assignments || [];
      for (const assignment of existingAssignments) {
        await fetch(`/api/flashcards/assignments/${assignment.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            teacherId: userId
          })
        });
      }

      // Erstelle neue Zuweisungen
      for (const groupId of groupIds) {
        await fetch('/api/flashcards/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deckId,
            groupId,
            teacherId: userId
          })
        });
      }

      // Lade Assignments neu
      await fetchFlashcardAssignments();
      
      setSnackbar({
        open: true,
        message: 'Lerngruppen erfolgreich zugewiesen',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Zuweisen der Lerngruppen:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Zuweisen der Lerngruppen',
        severity: 'error'
      });
    }
  };

  // Lade Daten beim ersten Laden und wenn sich userId ändert
  useEffect(() => {
    if (userId) {
      console.log('Loading flashcard decks for userId:', userId);
      fetchFlashcardDecks();
    }
  }, [userId]);

  // Lade Assignments nachdem Decks geladen wurden
  useEffect(() => {
    if (flashcardDecks && flashcardDecks.length > 0) {
      fetchFlashcardAssignments();
    }
  }, [flashcardDecks?.length]);

  // Gruppen laden
  useEffect(() => {
    fetchGroups();
  }, [userId]);

  // Flashcard-Zuweisungen laden, nachdem Gruppen geladen wurden
  useEffect(() => {
    if (groups.length > 0) {
      fetchFlashcardAssignments();
    }
  }, [groups, userId]);

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
      if (!response.ok) {
        // Fallback: Mock-Gruppen verwenden wenn Server nicht erreichbar
        const mockGroups = [
          {
            id: '1',
            name: '7a Mathematik',
            students: []
          },
          {
            id: '2',
            name: '7b Deutsch',
            students: []
          },
          {
            id: '3',
            name: '8a Informatik',
            students: []
          },
          {
            id: '4',
            name: '8b Informatik',
            students: []
          }
        ];
        setGroups(mockGroups);
        return;
      }
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
        let items: any[] = [];
        if (content.root) {
          items = content.root.children || [];
        } else if (content.root.children) {
          items = content.root.children;
        } else if (content.items) {
          items = content.items;
        }
        
        setAssignedFolderContents(prev => ({
          ...prev,
          [`${groupId}:${folderPath}`]: items
        }));

        // Verarbeitungshistorie wird jetzt im useEffect geladen
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
    
    // Rekursive Funktion zum Rendern aller Ebenen
    const renderItemRecursively = (item: any, level: number = 0) => {
      
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

        
        // Prüfe ob es sich um Quiz- oder Cards-Dateien handelt
        if (item.name.startsWith('Quiz')) {
          showCreateIcon = true;
          createIcon = '🎯';
          createTooltip = 'Quiz erstellen';

        } else if (item.name.startsWith('Cards')) {
          showCreateIcon = true;
          createIcon = '🗂️';
          createTooltip = 'Karteikarten erstellen';

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
                if (item.name.startsWith('Quiz')) {
                  // Öffne das Quiz-Erstellungsmodal direkt im Dashboard
                  handleQuizDialogOpen(item.path, item.name);
                } else if (item.name.startsWith('Cards')) {
                  // Öffne das Karteikarten-Erstellungsmodal
                  handleFlashcardDialogOpen(item.path, item.name);
                }
              }}
              >
                {createIcon}
              </Typography>
            )}

            {/* Verarbeitungshistorie für Cards-Dateien als grünes Icon rechts neben dem Karteikarten-Icon */}
            {item.type === 'file' && item.name.startsWith('Cards') && documentHistoryMap[item.path] && documentHistoryMap[item.path].length > 0 && (
              <Typography variant="caption" sx={{ 
                color: '#4caf50',
                fontSize: '0.7rem',
                ml: 0.2,
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              title={documentHistoryMap[item.path].map((history, index) => 
                `${history.action === 'created_deck' ? '✅' : '➕'} ${history.deckTitle} (${history.cardsCount} Karten) - ${new Date(history.processedAt).toLocaleDateString('de-DE')}`
              ).join('\n')}
              onClick={() => {
                const historyText = documentHistoryMap[item.path].map((history, index) => 
                  `${history.action === 'created_deck' ? '✅' : '➕'} ${history.deckTitle} (${history.cardsCount} Karten) - ${new Date(history.processedAt).toLocaleDateString('de-DE')}`
                ).join('\n');
                
                alert(`Verarbeitungshistorie für ${item.name}:\n\n${historyText}`);
              }}
              >
                ✅
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
  
  // Flashcard creation modal state
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardSourceFile, setFlashcardSourceFile] = useState('');
  const [flashcardFileName, setFlashcardFileName] = useState('');
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

  // Flashcard creation handlers
  const handleFlashcardDialogOpen = (filePath: string, fileName: string) => {
    setFlashcardSourceFile(filePath);
    setFlashcardFileName(fileName);
    setFlashcardModalOpen(true);
  };

  const handleFlashcardDialogClose = () => {
    setFlashcardModalOpen(false);
    setFlashcardSourceFile('');
    setFlashcardFileName('');
  };

  const handleFlashcardSuccess = () => {
    // Refresh data if needed
    console.log('Flashcard deck created/updated successfully');
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

  // Verarbeitungshistorie beim Laden der Dateien prüfen
  useEffect(() => {
    console.log('🔍 useEffect triggered, assignedFolderContents:', Object.keys(assignedFolderContents));
    
    const loadDocumentHistory = async () => {
      if (Object.keys(assignedFolderContents).length > 0) {
        // Sammle alle Cards-Dateien aus allen Ordnern
        const allCardsFiles: any[] = [];
        Object.entries(assignedFolderContents).forEach(([key, items]) => {
          const cardsFiles = items.filter((item: any) => 
            item.type === 'file' && item.name.startsWith('Cards')
          );
          allCardsFiles.push(...cardsFiles);
        });
        
        console.log('🔍 Found Cards files:', allCardsFiles.length);
        
        // Lade Verarbeitungshistorie für alle Cards-Dateien
        for (const cardsFile of allCardsFiles) {
          const history = await fetchDocumentProcessingHistory(cardsFile.path);
          console.log('🔍 History for', cardsFile.name, ':', history);
          setDocumentHistoryMap(prev => ({
            ...prev,
            [cardsFile.path]: history
          }));
        }
      }
    };
    
    loadDocumentHistory();
  }, [assignedFolderContents]);

  // Zusätzlich: Lade Verarbeitungshistorie für bekannte Cards-Dateien, auch wenn der Ordner noch nicht geladen ist
  useEffect(() => {
    const loadKnownCardsHistory = async () => {
      const knownCardsFiles = [
        '/Users/verachrist/Documents/Z. UNTERRICHT/J-M-Reihen/Mathe/Klasse 7/1. Ganze und rationale Zahlen (Kapitel 5)/1. Unser Grundwissen .../1. Ganz verschiedene Arten von Zahlen/Cards Didaktik_Bruchrechnung_Didaktikfokus.docx'
      ];
      
      for (const filePath of knownCardsFiles) {
        const history = await fetchDocumentProcessingHistory(filePath);
        if (history.length > 0) {
          console.log('🔍 Loading known Cards history for:', filePath, history);
          setDocumentHistoryMap(prev => ({
            ...prev,
            [filePath]: history
          }));
        }
      }
    };
    
    loadKnownCardsHistory();
  }, []); // Nur einmal beim Laden der Komponente

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

  // Flashcard Functions
  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Titel ein',
        severity: 'error'
      });
      return;
    }

    const newDeck: FlashcardDeck = {
      id: Date.now().toString(),
      title: newDeckTitle,
      description: newDeckDescription,

              teacherId: "01ed6e10-397e-446c-9254-2ad7fd4ec777",
      
      imageColor: '#1976D2',
      imageIcon: '📚',
      cards: []
    };

    setFlashcardDecks(prev => [...prev, newDeck]);
    setOpenNewDeckDialog(false);
    
    // Reset form
    setNewDeckTitle('');
    setNewDeckDescription('');


    setSnackbar({
      open: true,
      message: 'Karteideck erfolgreich erstellt',
      severity: 'success'
    });
  };

  const handleEditDeck = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setNewDeckTitle(deck.title);
    setNewDeckDescription(deck.description || '');
    
    // Lade bestehende Zuweisungen
    if (deck.assignments && deck.assignments.length > 0) {
      setSelectedGroupIds(deck.assignments.map(a => a.groupId));
    } else {
      setSelectedGroupIds([]);
    }
    
    setOpenNewDeckDialog(true);
  };





  const handleUpdateDeck = async () => {
    if (!editingDeck || !newDeckTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Titel ein',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch(`/api/flashcards/decks/${editingDeck.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      title: newDeckTitle,
      description: newDeckDescription,
          teacherId: userId
        })
      });

      if (response.ok) {
        const updatedDeck = await response.json();
    setFlashcardDecks(prev => prev.map(d => d.id === editingDeck.id ? updatedDeck : d));
        
        // Aktualisiere Zuweisungen für ausgewählte Gruppen
        if (editingDeck.id) {
          await handleAssignGroups(editingDeck.id, selectedGroupIds);
        }
        
    setOpenNewDeckDialog(false);
    setEditingDeck(null);
    
    // Reset form
    setNewDeckTitle('');
    setNewDeckDescription('');
        setSelectedGroupIds([]);


    setSnackbar({
      open: true,
      message: 'Karteideck erfolgreich aktualisiert',
      severity: 'success'
      });
      } else {
        throw new Error('Fehler beim Aktualisieren des Karteidecks');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Karteidecks:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Aktualisieren des Karteidecks',
        severity: 'error'
      });
    }
  };

  const handleViewCards = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    
    // Lade alle Karten für das ausgewählte Deck
    if (deck.id) {
      try {
        const cards = await fetchDeckCards(deck.id);
        console.log(`Geladene Karten für Deck ${deck.title}:`, cards);
        
        // Aktualisiere das lokale Deck mit den geladenen Karten
        setFlashcardDecks(prev => prev.map(d => 
          d.id === deck.id 
            ? { ...d, cards: cards }
            : d
        ));
        
        // Aktualisiere auch das selectedDeck
        setSelectedDeck(prev => prev ? { ...prev, cards: cards } : null);
      } catch (error) {
        console.error('Fehler beim Laden der Karten:', error);
        // Fallback: Verwende vorhandene Karten falls verfügbar
        if (deck.cards && deck.cards.length > 0) {
          console.log('Verwende bereits geladene Karten:', deck.cards);
        }
      }
    }
  };

  // Verbesserte Funktion zum Öffnen des Karteikarten-Modals
  const handleOpenFlashcardModal = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    
    // Lade Karten, falls sie noch nicht geladen sind
    if (deck.id && (!deck.cards || deck.cards.length === 0)) {
      try {
        console.log(`Lade Karten für Deck ${deck.title}...`);
        const cards = await fetchDeckCards(deck.id);
        
        // Aktualisiere das lokale Deck mit den geladenen Karten
        setFlashcardDecks(prev => prev.map(d => 
          d.id === deck.id 
            ? { ...d, cards: cards }
            : d
        ));
        
        // Aktualisiere auch das selectedDeck
        setSelectedDeck(prev => prev ? { ...prev, cards: cards } : null);
        
        console.log(`Karten für Deck ${deck.title} geladen:`, cards);
      } catch (error) {
        console.error(`Fehler beim Laden der Karten für Deck ${deck.title}:`, error);
        // Fallback: Verwende vorhandene Karten falls verfügbar
        if (deck.cards && deck.cards.length > 0) {
          console.log('Verwende bereits geladene Karten:', deck.cards);
        }
      }
    } else if (deck.cards && deck.cards.length > 0) {
      console.log(`Verwende bereits geladene Karten für Deck ${deck.title}:`, deck.cards);
    }
  };

  // Funktion zum Neuladen der Karten für ein spezifisches Deck
  const refreshDeckCards = async (deckId: string) => {
    try {
      console.log(`Lade Karten für Deck ${deckId} neu...`);
      const cards = await fetchDeckCards(deckId);
      
      // Aktualisiere das lokale Deck mit den geladenen Karten
      setFlashcardDecks(prev => prev.map(d => 
        d.id === deckId 
          ? { ...d, cards: cards }
          : d
      ));
      
      // Aktualisiere auch das selectedDeck falls es das gleiche Deck ist
      setSelectedDeck(prev => prev && prev.id === deckId ? { ...prev, cards: cards } : prev);
      
      console.log(`Karten für Deck ${deckId} erfolgreich neu geladen:`, cards);
      return cards;
    } catch (error) {
      console.error(`Fehler beim Neuladen der Karten für Deck ${deckId}:`, error);
      return [];
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    const deck = flashcardDecks.find(d => d.id === deckId);
    if (deck) {
      setDeckToDelete(deck);
      setDeleteModalOpen(true);
    }
  };

  const handleExportDeck = async (deck: FlashcardDeck) => {
    try {
      // Lade die Karten für das Deck, falls noch nicht vorhanden
      let cards = deck.cards || [];
      if (cards.length === 0 && deck.id) {
        cards = await fetchDeckCards(deck.id);
      }
      
      if (!cards || cards.length === 0) {
        setSnackbar({
          open: true,
          message: 'Keine Karten zum Exportieren gefunden.',
          severity: 'error'
        });
        return;
      }

      // Direkt Word-Export starten (ohne Popup)
      await exportToWord(deck, cards);

    } catch (error) {
      console.error('Fehler beim Exportieren des Decks:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Exportieren des Decks. Bitte versuchen Sie es erneut.',
        severity: 'error'
      });
    }
  };

  const exportToWord = async (deck: FlashcardDeck, cards: Flashcard[]) => {
    try {
      // Importiere die benötigten docx-Module dynamisch
      const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, BorderStyle, WidthType, Table, TableRow, TableCell } = await import('docx');
      
      // Erstelle Word-Dokument mit verbessertem Styling
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Deck-Titel als Hauptüberschrift mit Styling
            new Paragraph({
              children: [
                new TextRun({
                  text: deck.title,
                  bold: true,
                  size: 32,
                  color: "2E7D32" // Dunkelgrün wie in der App
                })
              ],
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 600 },
              border: {
                bottom: {
                  color: "4CAF50", // Akzentfarbe
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6
                }
              }
            }),
            
            // Beschreibung falls vorhanden
            ...(deck.description ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: deck.description,
                    size: 20,
                    color: "666666" // Grau für Beschreibung
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 }
              })
            ] : []),
            
            // Karten-Counter
            new Paragraph({
              children: [
                new TextRun({
                  text: `${cards.length} Karteikarten`,
                  bold: true,
                  size: 18,
                  color: "4CAF50"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Alle Karteikarten mit verbessertem Styling
            ...cards.map((card, index) => [
              // Karten-Header mit Nummer
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Karte ${index + 1}`,
                    bold: true,
                    size: 24,
                    color: "1976D2" // Blau für Karten-Header
                  })
                ],
                spacing: { before: 400, after: 200 }
              }),
              
              // Frage in einem schönen Box-Design
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Frage:",
                    bold: true,
                    size: 18,
                    color: "D32F2F" // Rot für Fragen
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: card.front.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen
                    size: 20,
                    color: "333333"
                  })
                ],
                spacing: { after: 300 },
                border: {
                  left: {
                    color: "D32F2F",
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 4
                  }
                },
                indent: { left: 200 }
              }),
              
              // Antwort in einem schönen Box-Design
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Antwort:",
                    bold: true,
                    size: 18,
                    color: "388E3C" // Grün für Antworten
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: card.back.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen
                    size: 20,
                    color: "333333"
                  })
                ],
                spacing: { after: 300 },
                border: {
                  left: {
                    color: "388E3C",
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 4
                  }
                },
                indent: { left: 200 }
              }),
              
              // Hinweis falls vorhanden
              ...(card.hint ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Hinweis:",
                      bold: true,
                      size: 16,
                      color: "FF9800" // Orange für Hinweise
                    })
                  ],
                  spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: card.hint.replace(/<[^>]*>/g, ''), // HTML-Tags entfernen
                      size: 18,
                      color: "666666",
                      italics: true
                    })
                  ],
                  spacing: { after: 300 },
                  border: {
                    left: {
                      color: "FF9800",
                      space: 1,
                      style: BorderStyle.SINGLE,
                      size: 3
                    }
                  },
                  indent: { left: 200 }
                })
              ] : []),
              
              // Trennlinie zwischen Karten
              new Paragraph({
                children: [
                  new TextRun({
                    text: "─".repeat(50),
                    size: 16,
                    color: "CCCCCC"
                  })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 200 }
              })
            ]).flat()
          ]
        }]
      });

      // Generiere und lade das Dokument herunter
      const blob = await Packer.toBlob(doc);
      const fileName = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_karteideck.docx`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSnackbar({
        open: true,
        message: `Deck "${deck.title}" erfolgreich als Word-Datei exportiert!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Word-Export:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Word-Export. Bitte versuchen Sie es erneut.',
        severity: 'error'
      });
    }
  };

  const confirmDeleteDeck = async () => {
    if (!deckToDelete || deleteConfirmWord !== 'LÖSCHEN') {
      setSnackbar({
        open: true,
        message: 'Löschvorgang abgebrochen - falsches Bestätigungswort',
        severity: 'error'
      });
      return;
    }

    try {
      const deckId = deckToDelete!.id;
      if (!deckId) {
        throw new Error('Deck-ID ist nicht definiert');
      }
      let deckToDeleteWithData = deckToDelete!;

      // Stelle sicher, dass alle verknüpften Daten geladen sind
      console.log('Lade verknüpfte Daten vor dem Löschen...');
      
      // Lade Karten, falls noch nicht vorhanden
      if (!deckToDeleteWithData.cards || deckToDeleteWithData.cards.length === 0) {
        console.log('Lade Deck-Karten...');
        const cards = await fetchDeckCards(deckId!);
        deckToDeleteWithData = { ...deckToDeleteWithData, cards: cards };
      }

      // Lade Assignments neu, falls noch nicht vorhanden
      if (!deckToDeleteWithData.assignments || deckToDeleteWithData.assignments.length === 0) {
        console.log('Lade Deck-Assignments...');
        await fetchFlashcardAssignments();
        deckToDeleteWithData = flashcardDecks.find(d => d.id === deckId) || deckToDeleteWithData;
      }

      // Jetzt das Deck selbst löschen
      if (!userId) {
        throw new Error('Benutzer-ID ist nicht definiert');
      }
      
      const requestBody = { teacherId: userId };
      console.log('Lösche Karteideck...', { deckId, userId, deckToDelete: deckToDelete?.title, requestBody });
      const response = await fetch(`/api/flashcards/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Server-Response:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        // Aus dem lokalen State entfernen
        setFlashcardDecks(prev => prev.filter(d => d.id !== deckId));
        
        // Falls das gelöschte Deck gerade angezeigt wird, zurücksetzen
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(null);
        }
        if (editingDeck?.id === deckId) {
          setEditingDeck(null);
        }
        
              setSnackbar({
          open: true,
          message: `Karteideck erfolgreich gelöscht`,
          severity: 'success'
        });
        
        // Modal schließen und States zurücksetzen
        setDeleteModalOpen(false);
        setDeckToDelete(null);
        setDeleteConfirmWord('');
      } else {
        const errorData = await response.text();
        console.error('Server-Fehler beim Löschen:', response.status, errorData);
        console.log('Error Response Body:', errorData);
        
        let errorMessage = 'Fehler beim Löschen des Karteidecks';
        switch (response.status) {
          case 403:
            errorMessage = 'Zugriff verweigert - Sie haben keine Berechtigung, dieses Karteideck zu löschen';
            break;
          case 404:
            errorMessage = 'Karteideck nicht gefunden';
            break;
          case 401:
            errorMessage = 'Nicht authentifiziert - Bitte melden Sie sich erneut an';
            break;
          case 500:
            errorMessage = 'Server-Fehler - Bitte versuchen Sie es später erneut';
            break;
          default:
            errorMessage = `Fehler beim Löschen des Karteidecks: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Karteidecks:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen des Karteidecks: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
      
      // Modal schließen und States zurücksetzen
      setDeleteModalOpen(false);
      setDeckToDelete(null);
      setDeleteConfirmWord('');
    }
  };

  // Flashcard Management Functions
  const handleAddCard = () => {
    setIsAddingCard(true);
    setNewCardFront('');
    setNewCardBack('');
  };

  const handleSaveCard = async () => {
    if (!selectedDeck || !newCardFront.trim() || !newCardBack.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte füllen Sie beide Felder aus',
        severity: 'error'
      });
      return;
    }

    try {
      console.log('Erstelle neue Karteikarte...', {
        front: newCardFront,
        back: newCardBack,
        deckId: selectedDeck.id,
        teacherId: userId
      });

      const response = await fetch('/api/flashcards/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          front: newCardFront,
          back: newCardBack,
          deckId: selectedDeck.id,
          teacherId: userId,
          difficulty: 1, // Standard-Schwierigkeit
          order: (selectedDeck.cards?.length || 0) + 1 // Nächste Reihenfolge
        })
      });

      if (response.ok) {
        const newCard = await response.json();
        console.log('Neue Karte erfolgreich erstellt:', newCard);
        
        // Aktualisiere das lokale Deck
        setSelectedDeck(prev => prev ? {
          ...prev,
          cards: [...(prev.cards || []), newCard]
        } : null);
        
        // Aktualisiere auch den globalen State
        setFlashcardDecks(prev => prev.map(deck => 
          deck.id === selectedDeck.id 
            ? { ...deck, cards: [...(deck.cards || []), newCard] }
            : deck
        ));

        setIsAddingCard(false);
        setNewCardFront('');
        setNewCardBack('');
        
        setSnackbar({
          open: true,
          message: 'Karteikarte erfolgreich hinzugefügt',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error(`HTTP-Fehler: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Fehler beim Hinzufügen der Karteikarte: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Karteikarte:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Hinzufügen der Karteikarte: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleEditCard = (card: Flashcard) => {
    if (editingCard?.id === card.id) {
      // Wenn die gleiche Karte bereits bearbeitet wird, beende den Bearbeitungsmodus
      setEditingCard(null);
      setNewCardFront('');
      setNewCardBack('');
    } else {
      // Bearbeitungsmodus sofort aktivieren - der useEffect kümmert sich um die Werte
      setEditingCard(card);
      
      console.log('Bearbeite Karte:', {
        id: card.id,
        front: card.front,
        back: card.back,
        hasFront: !!card.front,
        hasBack: !!card.back,
        frontLength: (card.front || '').length,
        backLength: (card.back || '').length
      });
    }
  };

  // Hilfsfunktion um HTML-Content korrekt zu verarbeiten
  const processHtmlContent = (htmlContent: string): string => {
    if (!htmlContent) return '';
    
    // Falls es bereits HTML ist, direkt zurückgeben
    if (htmlContent.includes('<p>') || htmlContent.includes('<br>') || htmlContent.includes('<div>')) {
      return htmlContent;
    }
    
    // Falls es Plain Text mit \n ist, in HTML umwandeln
    if (htmlContent.includes('\n')) {
      return htmlContent.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
    }
    
    // Falls es nur Text ist, in Paragraph wrappen
    return `<p>${htmlContent}</p>`;
  };

  // useEffect um sicherzustellen, dass die RichTextEditor-Werte korrekt gesetzt werden
  useEffect(() => {
    if (editingCard) {
      const frontContent = processHtmlContent(editingCard.front || '');
      const backContent = processHtmlContent(editingCard.back || '');
      
      console.log('useEffect - Setting editor values:', {
        cardId: editingCard.id,
        originalFront: editingCard.front,
        originalBack: editingCard.back,
        processedFront: frontContent,
        processedBack: backContent,
        frontLength: frontContent.length,
        backLength: backContent.length
      });
      
      // Sofort setzen, ohne Verzögerung
      setNewCardFront(frontContent);
      setNewCardBack(backContent);
    } else {
      // Wenn kein editingCard mehr vorhanden ist, leere die Felder
      setNewCardFront('');
      setNewCardBack('');
    }
  }, [editingCard]);

  const handleUpdateCard = async () => {
    if (!editingCard || !newCardFront.trim() || !newCardBack.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte füllen Sie beide Felder aus',
        severity: 'error'
      });
      return;
    }

    try {
      console.log('Aktualisiere Karteikarte...', {
        cardId: editingCard.id,
        front: newCardFront,
        back: newCardBack,
        teacherId: userId
      });

      const response = await fetch(`/api/flashcards/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          front: newCardFront,
          back: newCardBack,
          teacherId: userId
        })
      });

      if (response.ok) {
        const updatedCard = await response.json();
        console.log('Karte erfolgreich aktualisiert:', updatedCard);
        
        // Aktualisiere das lokale Deck
        setSelectedDeck(prev => prev ? {
          ...prev,
          cards: prev.cards?.map(c => c.id === editingCard.id ? updatedCard : c) || []
        } : null);
        
        // Aktualisiere auch den globalen State
        setFlashcardDecks(prev => prev.map(deck => 
          deck.id === selectedDeck?.id 
            ? { ...deck, cards: deck.cards?.map(c => c.id === editingCard.id ? updatedCard : c) || [] }
            : deck
        ));

        setEditingCard(null);
        setNewCardFront('');
        setNewCardBack('');
        
        setSnackbar({
          open: true,
          message: 'Karteikarte erfolgreich aktualisiert',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error(`HTTP-Fehler: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Fehler beim Aktualisieren der Karteikarte: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Karteikarte:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Aktualisieren der Karteikarte: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!selectedDeck) return;

    try {
      console.log(`Lösche Karteikarte ${cardId}...`);

      const response = await fetch(`/api/flashcards/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId: userId
        })
      });

      if (response.ok) {
        console.log('Karte erfolgreich gelöscht');
        
        // Entferne die Karte aus dem lokalen State
        setSelectedDeck(prev => prev ? {
          ...prev,
          cards: prev.cards?.filter(c => c.id !== cardId) || []
        } : null);
        
        // Aktualisiere auch den globalen State
        setFlashcardDecks(prev => prev.map(deck => 
          deck.id === selectedDeck.id 
            ? { ...deck, cards: deck.cards?.filter(c => c.id !== cardId) || [] }
            : deck
        ));

        setSnackbar({
          open: true,
          message: 'Karteikarte erfolgreich gelöscht',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error(`HTTP-Fehler: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Fehler beim Löschen der Karteikarte: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Karteikarte:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Löschen der Karteikarte: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        severity: 'error'
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, card: Flashcard) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', card.id || '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedCard || !selectedDeck || !selectedDeck.cards) return;

    try {
      const draggedIndex = selectedDeck.cards.findIndex(card => card.id === draggedCard.id);
      if (draggedIndex === -1 || draggedIndex === dropIndex) return;

      // Karten neu ordnen
      const updatedCards = [...selectedDeck.cards];
      const cardToMove = updatedCards[draggedIndex];
      
      // Karte aus der ursprünglichen Position entfernen
      updatedCards.splice(draggedIndex, 1);
      
      // Karte an der neuen Position einfügen
      updatedCards.splice(dropIndex, 0, cardToMove);
      
      // Reihenfolge aktualisieren
      updatedCards.forEach((card, i) => {
        card.order = i;
      });

      // Deck aktualisieren
      const updatedDeck = { ...selectedDeck, cards: updatedCards };
      setSelectedDeck(updatedDeck);

      // Hier würde die API-Aktualisierung erfolgen
      setSnackbar({
        open: true,
        message: 'Kartenreihenfolge aktualisiert',
        severity: 'success'
      });
    } catch (error) {
      console.error('Fehler beim Verschieben der Karte:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Verschieben der Karte',
        severity: 'error'
      });
    } finally {
      setDraggedCard(null);
    }
  };

  const handleNewDeckSubmit = async () => {
    if (!newDeckTitle.trim()) {
      setSnackbar({
        open: true,
        message: 'Bitte geben Sie einen Titel ein',
        severity: 'error'
      });
      return;
    }

    try {
      const response = await fetch('/api/flashcards/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newDeckTitle,
          description: newDeckDescription,
          teacherId: userId
        })
      });

      if (response.ok) {
        const newDeck = await response.json();
        setFlashcardDecks(prev => [...prev, newDeck]);
        
        // Erstelle Zuweisungen für ausgewählte Gruppen
        if (selectedGroupIds.length > 0) {
          await handleAssignGroups(newDeck.id, selectedGroupIds);
        }
        
        setOpenNewDeckDialog(false);
        
        // Reset form
        setNewDeckTitle('');
        setNewDeckDescription('');
        setSelectedGroupIds([]);


    setSnackbar({
      open: true,
          message: 'Karteideck erfolgreich erstellt',
      severity: 'success'
    });
      } else {
        throw new Error('Fehler beim Erstellen des Karteidecks');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Karteidecks:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen des Karteidecks',
        severity: 'error'
      });
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
              <Tab icon={<BuildIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Verwalten</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StyleIcon sx={{ fontSize: 18 }} />} label={<span style={{ fontSize: '0.65rem' }}>Karteikarten</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StorageIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem', color: '#9E9E9E' }}>Datenbank</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
              <Tab icon={<StyleIcon sx={{ fontSize: 18 }} />} label={<span style={{ fontSize: '0.65rem', color: '#9E9E9E' }}>Meine Fächer</span>} sx={{ minHeight: 28, px: 0, minWidth: 'auto', width: '12%' }} />
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Dateisystem-Pfade verwalten */}
              <Box sx={{ mb: 2 }}>
                <FileSystemPathManager teacherId={userId} />
              </Box>
              
              {/* Hauptbereich - MaterialCreator */}
              <Box>
                <MaterialCreator teacherId={userId} ref={materialCreatorRef} />
              </Box>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={2}>
            {/* Karteikarten Section */}
            <Box sx={{ p: 1.4 }}>
              {/* Header */}
              <Card sx={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                bgcolor: colors.cardBg,
                mb: 1.5,
                border: `1px solid ${colors.border}`
              }}>
                <CardContent sx={{ p: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="h2" sx={{ 
                      fontWeight: '600', 
                      color: colors.primary,
                      fontSize: '1rem'
                    }}>
                      Karteikarten
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setOpenNewDeckDialog(true)}
                      sx={{
                        bgcolor: colors.accent1,
                        color: 'white',
                        fontWeight: '500',
                        borderRadius: '6px',
                        px: 0.4,
                        py: 0.4,
                        fontSize: '0.6rem',
                        minWidth: 'auto',
                        width: '25%',
                        '&:hover': {
                          bgcolor: colors.accent1 + 'dd'
                        }
                      }}
                    >
                      <Add sx={{ fontSize: 10, mr: 0.1 }} />
                      Neues Deck
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Karteidecks Grid */}
              <Grid container spacing={1.4}>
                {flashcardDecks.map((deck) => (
                                    <Grid item xs={12} sm={6} md={4} key={deck.id}>
                    <Card sx={{ 
                      borderRadius: '12px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      bgcolor: colors.cardBg,
                      height: '100%',
                      cursor: 'pointer',
                      minHeight: 180,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                        borderColor: colors.accent1
                      },
                      border: `1px solid ${colors.border}`,
                      position: 'relative',
                      overflow: 'hidden',
                      background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`
                    }}
                    onClick={() => handleEditDeck(deck)}
                    >
                      {/* Header with gradient accent */}
                      <Box sx={{ 
                        height: '3px',
                        background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        width: '100%'
                      }} />
                      
                      <CardContent sx={{ p: 1.2, height: '100%', display: 'flex', flexDirection: 'column' }}>

                        
                        {/* Title and Actions Row */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.4 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.15 }}>
                            <Typography variant="h6" component="h3" sx={{ 
                              fontWeight: '600', 
                              color: colors.primary,
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                                letterSpacing: '0.3px',
                                flex: 1,
                                minWidth: 0
                            }}>
                              {deck.title}
                            </Typography>
                              <Chip 
                                label={`${deck.cards?.length || 0}`}
                                size="small"
                                sx={{ 
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontSize: '0.45rem',
                                  height: '12px',
                                  fontWeight: '500',
                                  border: `1px solid ${colors.primary}30`,
                                  minWidth: '20px'
                                }}
                              />
                            </Box>
                            {deck.description && (
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.55rem',
                                lineHeight: 1.3,
                                mb: 0.4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: 0.8
                              }}>
                                {deck.description}
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFlashcardModal(deck);
                              }}
                              sx={{ 
                                color: colors.accent1,
                                bgcolor: colors.accent1 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent1 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 20,
                                height: 20
                              }}
                              title="Karteikarten bearbeiten"
                            >
                              <StyleIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportDeck(deck);
                              }}
                              sx={{ 
                                color: colors.accent2,
                                bgcolor: colors.accent2 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent2 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 20,
                                height: 20
                              }}
                              title="Deck exportieren"
                            >
                              <Description sx={{ fontSize: 11 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (deck.id) {
                                  handleDeleteDeck(deck.id || '');
                                }
                              }}
                              sx={{ 
                                color: colors.error,
                                bgcolor: colors.error + '10',
                                '&:hover': { 
                                  bgcolor: colors.error + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 20,
                                height: 20
                              }}
                              title="Deck löschen"
                            >
                              <Delete sx={{ fontSize: 11 }} />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        {/* Learning Groups - kompakter */}
                        <Box sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ 
                            color: colors.textSecondary,
                            fontSize: '0.55rem',
                            mb: 0.25,
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3
                          }}>
                            <Group sx={{ fontSize: 11 }} />
                            Zugewiesene Gruppen:
                          </Typography>
                          {deck.assignments && deck.assignments.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                              {deck.assignments.map((assignment) => {
                                const group = assignment.group;
                                return group ? (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.3,
                                    p: 0.2,
                                    borderRadius: '4px',
                                    bgcolor: colors.primary + '12',
                                    border: `1px solid ${colors.primary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 5, 
                                      height: 5, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.accent2 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.55rem',
                                      fontWeight: '500',
                                      color: colors.accent2,
                                      flex: 1
                                    }}>
                                      {group.name}
                                    </Typography>
                                <Chip 
                                      label={`${group.students?.length || 0}`}
                                  size="small"
                                  sx={{ 
                                        bgcolor: colors.accent2 + '20',
                                        color: colors.accent2,
                                        fontSize: '0.45rem',
                                        height: 12,
                                        fontWeight: '500',
                                        minWidth: 18
                                      }}
                                    />
                            </Box>
                          ) : (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.3,
                                    p: 0.2,
                                    borderRadius: '4px',
                                    bgcolor: colors.textSecondary + '15',
                                    border: `1px solid ${colors.textSecondary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 5, 
                                      height: 5, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.textSecondary 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.55rem',
                                      fontWeight: '500',
                              color: colors.textSecondary,
                              fontStyle: 'italic'
                            }}>
                                      Unbekannte Gruppe
                            </Typography>
                        </Box>
                                );
                              })}
                            </Box>
                          ) : (
                        <Box sx={{ 
                              p: 0.3,
                              borderRadius: '4px',
                              bgcolor: colors.textSecondary + '10',
                              border: `1px solid ${colors.textSecondary}20`
                            }}>
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.5rem',
                                fontStyle: 'italic',
                                textAlign: 'center'
                              }}>
                                Keine Gruppen
                          </Typography>
                            </Box>
                          )}
                        </Box>
                        

                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={3}>
            <Box sx={{ fontSize: '0.7rem' }}>
              <DatabaseViewer />
            </Box>
          </TabPanel>
          <TabPanel value={mainTabValue} index={4}>
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

          <TabPanel value={mainTabValue} index={5}>
            {/* Karteikarten Section */}
            <Box sx={{ p: 1.4 }}>
              {/* Header */}
              <Card sx={{ 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                bgcolor: colors.cardBg,
                mb: 1.5,
                border: `1px solid ${colors.border}`
              }}>
                <CardContent sx={{ p: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="h2" sx={{ 
                      fontWeight: '600', 
                      color: colors.primary,
                      fontSize: '1rem'
                    }}>
                      Karteikarten
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setOpenNewDeckDialog(true)}
                      sx={{
                        bgcolor: colors.accent1,
                        color: 'white',
                        fontWeight: '500',
                        borderRadius: '6px',
                        px: 0.4,
                        py: 0.4,
                        fontSize: '0.6rem',
                        minWidth: 'auto',
                        width: '25%',
                        '&:hover': {
                          bgcolor: colors.accent1 + 'dd'
                        }
                      }}
                    >
                      <Add sx={{ fontSize: 10, mr: 0.1 }} />
                      Neues Deck
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Karteidecks Grid */}
              <Grid container spacing={1.4}>
                {flashcardDecks.map((deck) => (
                  <Grid item xs={12} sm={6} md={4} key={deck.id}>
                                        <Card sx={{ 
                      borderRadius: '12px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      bgcolor: colors.cardBg,
                      height: '100%',
                      cursor: 'pointer',
                      minHeight: 180,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                        borderColor: colors.accent1
                      },
                      border: `1px solid ${colors.border}`,
                      position: 'relative',
                      overflow: 'hidden',
                      background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`
                    }}
                    onClick={() => handleEditDeck(deck)}
                    >
                      {/* Header with gradient accent */}
                      <Box sx={{ 
                        height: '3px',
                        background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        width: '100%'
                      }} />
                      
                      <CardContent sx={{ p: 1.2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Title and Actions Row */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.8 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.3 }}>
                            <Typography variant="h6" component="h3" sx={{ 
                              fontWeight: '600', 
                              color: colors.primary,
                              fontSize: '0.9rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                                letterSpacing: '0.3px',
                                flex: 1,
                                minWidth: 0
                            }}>
                              {deck.title}
                            </Typography>
                              <Chip 
                                label={`${deck.cards?.length || 0}`}
                                size="small"
                                sx={{ 
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontSize: '0.55rem',
                                  height: '16px',
                                  fontWeight: '500',
                                  border: `1px solid ${colors.primary}30`,
                                  minWidth: '24px'
                                }}
                              />
                            </Box>
                            {deck.description && (
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.7rem',
                                lineHeight: 1.3,
                                mb: 0.8,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                opacity: 0.8
                              }}>
                                {deck.description}
                              </Typography>
                            )}
                          </Box>
                          
                          {/* Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenFlashcardModal(deck);
                              }}
                              sx={{ 
                                color: colors.accent1,
                                bgcolor: colors.accent1 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent1 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 26,
                                height: 26
                              }}
                              title="Karteikarten bearbeiten"
                            >
                              <StyleIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportDeck(deck);
                              }}
                              sx={{ 
                                color: colors.accent2,
                                bgcolor: colors.accent2 + '10',
                                '&:hover': { 
                                  bgcolor: colors.accent2 + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 26,
                                height: 26
                              }}
                              title="Deck exportieren"
                            >
                              <Description sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (deck.id) {
                                  handleDeleteDeck(deck.id || '');
                                }
                              }}
                              sx={{ 
                                color: colors.error,
                                bgcolor: colors.error + '10',
                                '&:hover': { 
                                  bgcolor: colors.error + '20',
                                  transform: 'scale(1.05)'
                                },
                                transition: 'all 0.15s ease',
                                width: 26,
                                height: 26
                              }}
                              title="Deck löschen"
                            >
                              <Delete sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        {/* Learning Groups - DEUTLICH nach oben, direkt unter dem Titel */}
                        <Box sx={{ mb: 0.8 }}>
                          <Typography variant="body2" sx={{ 
                            color: colors.textSecondary,
                            fontSize: '0.65rem',
                            mb: 0.4,
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3
                          }}>
                            <Group sx={{ fontSize: 14 }} />
                            Zugewiesen an:
                          </Typography>
                          {deck.assignments && deck.assignments.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              {deck.assignments.map((assignment) => {
                                const group = assignment.group;
                                return group ? (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.4,
                                    p: 0.25,
                                    borderRadius: '6px',
                                    bgcolor: colors.primary + '12',
                                    border: `1px solid ${colors.primary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.accent2 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.6rem',
                                      fontWeight: '500',
                                      color: colors.accent2,
                                      flex: 1
                                    }}>
                                      {group.name}
                                    </Typography>
                                    <Chip 
                                      label={`${group.students?.length || 0}`}
                                      size="small"
                                      sx={{ 
                                        bgcolor: colors.accent2 + '20',
                                        color: colors.accent2,
                                        fontSize: '0.45rem',
                                        height: 14,
                                        fontWeight: '500'
                                      }}
                                    />
                                  </Box>
                                ) : (
                                  <Box key={assignment.id} sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 0.4,
                                    p: 0.25,
                                    borderRadius: '6px',
                                    bgcolor: colors.textSecondary + '15',
                                    border: `1px solid ${colors.textSecondary}25`
                                  }}>
                                    <Box sx={{ 
                                      width: 6, 
                                      height: 6, 
                                      borderRadius: '50%', 
                                      bgcolor: colors.textSecondary 
                                    }} />
                                    <Typography sx={{ 
                                      fontSize: '0.6rem',
                                      fontWeight: '500',
                                      color: colors.textSecondary,
                                      fontStyle: 'italic'
                                    }}>
                                      Unbekannte Gruppe
                                    </Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          ) : (
                            <Box sx={{ 
                              p: 0.4,
                              borderRadius: '6px',
                              bgcolor: colors.textSecondary + '10',
                              border: `1px solid ${colors.textSecondary}20`
                            }}>
                              <Typography variant="body2" sx={{ 
                                color: colors.textSecondary,
                                fontSize: '0.55rem',
                                fontStyle: 'italic',
                                textAlign: 'center'
                              }}>
                                Keine Lerngruppen zugewiesen
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        
                        {/* Icon Box - Smaller */}
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          width: 50,
                          height: 50,
                          borderRadius: '12px',
                          background: `linear-gradient(135deg, ${deck.imageColor || colors.accent2} 0%, ${deck.imageColor || colors.accent2}dd 100%)`,
                          mb: 1,
                          alignSelf: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                        }}>
                          <Typography sx={{ 
                            fontSize: '1.5rem',
                            color: 'white',
                            fontWeight: 'bold',
                            textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                          }}>
                            {deck.imageIcon || '📚'}
                          </Typography>
                        </Box>
                        

                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Leerer Zustand */}
              {flashcardDecks.length === 0 && (
                <Card sx={{ 
                  borderRadius: 2.8,
                  boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
                  bgcolor: colors.cardBg,
                  textAlign: 'center',
                  p: 3,
                  border: `1px solid ${colors.border}`
                }}>
                  <Typography variant="h6" sx={{ 
                    color: colors.textSecondary,
                    mb: 1,
                    fontSize: '1rem'
                  }}>
                      Keine Karteidecks vorhanden
                    </Typography>
                  <Typography variant="body2" sx={{ 
                    color: colors.textSecondary + '80',
                    mb: 2,
                    fontSize: '0.8rem'
                  }}>
                      Erstellen Sie Ihr erstes Karteideck, um mit dem Lernen zu beginnen.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setOpenNewDeckDialog(true)}
                      sx={{
                      bgcolor: colors.accent1,
                      color: 'white',
                      '&:hover': {
                        bgcolor: colors.accent1 + 'dd'
                      }
                    }}
                  >
                    <Add sx={{ mr: 1, fontSize: 16 }} />
                      Erstes Deck erstellen
                    </Button>
                </Card>
              )}
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

      {/* Neues Karteideck Dialog */}
      <Dialog 
        open={openNewDeckDialog} 
        onClose={() => {
          setOpenNewDeckDialog(false);
          setEditingDeck(null);
          setNewDeckTitle('');
          setNewDeckDescription('');
          setSelectedGroupIds([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1, pt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: '600' }}>
              {editingDeck ? 'Karteideck bearbeiten' : 'Neues Karteideck erstellen'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 1.5 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titel *"
                value={newDeckTitle}
                onChange={(e) => setNewDeckTitle(e.target.value)}
                required
                size="small"
                sx={{ mb: 1.5 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={2}
                value={newDeckDescription}
                onChange={(e) => setNewDeckDescription(e.target.value)}
                size="small"
                sx={{ mb: 1.5 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Lerngruppen zuweisen</InputLabel>
                <Select
                  multiple
                  value={selectedGroupIds}
                  onChange={(e) => {
                    const value = e.target.value as string[];
                    console.log('Gruppenauswahl geändert:', value);
                    setSelectedGroupIds(value);
                  }}
                  label="Lerngruppen zuweisen"
                  renderValue={(selected: string[]) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                      {selected.map((value: string) => {
                        const group = groups.find(g => g.id === value);
                        return (
                          <Chip 
                            key={value} 
                            label={group?.name || value} 
                            size="small" 
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {groups && groups.length > 0 ? groups.map((group) => (
                    <MenuItem key={group.id} value={group.id} dense>
                      <Checkbox 
                        checked={selectedGroupIds.includes(group.id)}
                        size="small"
                      />
                      <ListItemText 
                        primary={group.name} 
                        primaryTypographyProps={{ fontSize: '0.8rem' }}
                      />
                    </MenuItem>
                  )) : (
                    <MenuItem disabled>
                      <Typography variant="body2" color="textSecondary">
                        Keine Lerngruppen verfügbar
                      </Typography>
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
              
              {/* Anzeige der bereits zugewiesenen Lerngruppen */}
              {false && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: colors.textSecondary, 
                    fontSize: '0.7rem', 
                    mb: 0.5,
                    fontWeight: '500'
                  }}>
                    Bereits zugewiesen:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                    {/* TODO: Implement assignment display */}
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 1.5, pt: 0 }}>
          <Button 
            onClick={() => {
              setOpenNewDeckDialog(false);
              setEditingDeck(null);
              setNewDeckTitle('');
              setNewDeckDescription('');
            setSelectedGroupIds([]);
            }}
            size="small"
          >
            Abbrechen
          </Button>
          <Button 
            onClick={editingDeck ? handleUpdateDeck : handleNewDeckSubmit} 
            variant="contained" 
            color="primary"
            disabled={!newDeckTitle.trim()}
            size="small"
          >
            {editingDeck ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Karteikarten-Verwaltungs-Modal */}
      {selectedDeck && (
        <Dialog 
          open={!!selectedDeck} 
          onClose={() => {
            setSelectedDeck(null);
            setEditingCard(null);
            setIsAddingCard(false);
            setNewCardFront('');
            setNewCardBack('');
          }}
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              minHeight: '85vh',
              maxHeight: '95vh',
              width: '98vw',
              maxWidth: '1600px',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`,
              overflow: 'hidden'
            }
          }}
        >
          {/* Header mit Gradient */}
          <Box sx={{ 
            height: '6px',
            background: `linear-gradient(90deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
            width: '100%'
          }} />
          
          {/* Modal Header */}
          <DialogTitle sx={{ 
            pb: 1,
            pt: 1.5,
            background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.accent1}08 100%)`,
            borderBottom: `1px solid ${colors.border}`,
            position: 'relative'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: '600',
                    color: colors.textPrimary,
                    letterSpacing: '0.2px',
                    fontSize: '1.1rem',
                    mb: 0.3
                  }}>
                    {selectedDeck?.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`${selectedDeck?.cards?.length || 0} Karten`}
                      size="small"
                      sx={{
                        bgcolor: colors.primary + '20',
                        color: colors.primary,
                        fontWeight: '600',
                        fontSize: '0.7rem',
                        height: '22px'
                      }}
                    />

                    {selectedDeck?.subject && (
                      <Chip 
                        label={selectedDeck.subject.name}
                        size="small"
                        sx={{
                          bgcolor: colors.secondary + '20',
                          color: colors.secondary,
                          fontWeight: '600',
                          fontSize: '0.7rem',
                          height: '22px'
                        }}
                      />
                    )}
                  </Box>

                </Box>
              </Box>
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddCard}
                  sx={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent1} 100%)`,
                    borderRadius: '6px',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    minWidth: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Add sx={{ fontSize: 16, mr: 0.5, color: 'white' }} />
                  Neue Karte
                </Button>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0, overflow: 'auto', height: '100%', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-track': { background: colors.border + '20' }, '&::-webkit-scrollbar-thumb': { background: colors.primary + '40', borderRadius: '4px' } }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* Neue Karte hinzufügen */}
              {isAddingCard && (
                <Box sx={{ 
                  p: 3, 
                  mb: 2, 
                  background: `linear-gradient(135deg, ${colors.accent1}08 0%, ${colors.accent2}08 100%)`,
                  border: `2px solid ${colors.accent1}30`,
                  borderRadius: '16px',
                  mx: 2,
                  mt: 2,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    fontWeight: '600',
                    color: colors.accent1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Add sx={{ fontSize: 20 }} />
                    Neue Karteikarte hinzufügen
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: '600', color: colors.textPrimary }}>
                          Frage *
                        </Typography>
                        <RichTextEditor
                          value={newCardFront}
                          onChange={(value) => setNewCardFront(value)}
                          placeholder="Frage eingeben..."
                          rows={3}
                          compact={true}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: '600', color: colors.textPrimary }}>
                          Antwort *
                        </Typography>
                        <RichTextEditor
                          value={newCardBack}
                          onChange={(value) => setNewCardBack(value)}
                          placeholder="Antwort eingeben..."
                          rows={3}
                          compact={true}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setIsAddingCard(false);
                        setNewCardFront('');
                        setNewCardBack('');
                      }}
                      sx={{
                        borderColor: colors.textSecondary,
                        color: colors.textSecondary,
                        borderRadius: '8px',
                        px: 2,
                        py: 0.8,
                        fontSize: '0.8rem'
                      }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveCard}
                      disabled={!newCardFront.trim() || !newCardBack.trim()}
                      sx={{
                        background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                        borderRadius: '8px',
                        px: 3,
                        py: 0.8,
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        '&:disabled': {
                          opacity: 0.6
                        }
                      }}
                    >
                      Karte speichern
                    </Button>
                  </Box>
                </Box>
              )}



              {/* Karteikarten-Übersicht */}
              <Box sx={{ flex: 1, overflow: 'visible', p: 1.5 }}>
                {(!selectedDeck.cards || selectedDeck.cards.length === 0) ? (
                                      <Card sx={{ 
                      p: 6, 
                      textAlign: 'center', 
                      bgcolor: colors.background,
                      borderRadius: '20px',
                      border: `2px dashed ${colors.border}`,
                      mx: 2,
                      boxShadow: '0 6px 24px rgba(0,0,0,0.08)'
                    }}>
                      <StyleIcon sx={{ fontSize: 60, color: colors.textSecondary, mb: 2, opacity: 0.4 }} />
                      <Typography variant="h5" sx={{ color: colors.textSecondary, mb: 1.5, fontWeight: '600' }}>
                        Keine Karteikarten vorhanden
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 3, fontSize: '1rem', opacity: 0.8 }}>
                        Erstellen Sie Ihre erste Karteikarte, um mit dem Lernen zu beginnen.
                      </Typography>
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={handleAddCard}
                        sx={{
                          background: `linear-gradient(135deg, ${colors.accent1} 0%, ${colors.accent2} 100%)`,
                          borderRadius: '16px',
                          px: 4,
                          py: 1.5,
                          fontSize: '1rem',
                          fontWeight: '600',
                          boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Add sx={{ fontSize: 24, mr: 1 }} />
                        Erste Karte erstellen
                      </Button>
                    </Card>
                ) : (
                  <Box>
                    {/* Bearbeitungsbereich - wird angezeigt wenn editingCard gesetzt ist */}
                    {editingCard && (
                      <Box sx={{ 
                        mb: 3, 
                        p: 2, 
                        background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.background} 100%)`,
                        border: `2px solid ${colors.primary}`,
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="h6" sx={{ 
                          mb: 2, 
                          color: colors.primary, 
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}>
                          ✏️ Karte bearbeiten
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{
                            fontWeight: '700',
                            mb: 1,
                            color: colors.primary,
                            fontSize: '0.8rem'
                          }}>
                            Frage:
                          </Typography>
                          <RichTextEditor
                            value={newCardFront}
                            onChange={(value) => setNewCardFront(value)}
                            placeholder="Frage eingeben..."
                            rows={3}
                            compact={false}
                            key={`front-${editingCard?.id || 'new'}`}
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{
                            fontWeight: '600',
                            mb: 1,
                            color: colors.secondary,
                            fontSize: '0.8rem'
                          }}>
                            Antwort:
                          </Typography>
                          <RichTextEditor
                            value={newCardBack}
                            onChange={(value) => setNewCardBack(value)}
                            placeholder="Antwort eingeben..."
                            rows={3}
                            compact={false}
                            key={`back-${editingCard?.id || 'new'}`}
                          />
                        </Box>
                        
                        {/* Aktions-Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setEditingCard(null);
                              setNewCardFront('');
                              setNewCardBack('');
                            }}
                            sx={{
                              borderColor: colors.textSecondary,
                              color: colors.textSecondary,
                              borderRadius: '8px',
                              px: 2,
                              py: 0.8,
                              fontSize: '0.8rem'
                            }}
                          >
                            Abbrechen
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleUpdateCard}
                            disabled={!newCardFront.trim() || !newCardBack.trim()}
                            sx={{
                              background: colors.primary,
                              borderRadius: '8px',
                              px: 2,
                              py: 0.8,
                              fontSize: '0.8rem',
                              '&:disabled': {
                                opacity: 0.6
                              }
                            }}
                          >
                            Speichern
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {/* Karteikarten-Liste mit Drag & Drop und Löschen-Funktion - Vier Spalten */}
                    <Grid container spacing={2}>
                      {selectedDeck.cards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={card.id || index}>
                          <Card 
                            sx={{ 
                              height: '100%',
                              minHeight: '320px',
                              background: `linear-gradient(135deg, ${colors.cardBg} 0%, ${colors.background} 100%)`,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              transition: 'all 0.2s ease',
                              cursor: editingCard?.id === card.id ? 'default' : 'pointer',
                              '&:hover': {
                                borderColor: colors.primary,
                                transform: editingCard?.id === card.id ? 'none' : 'translateY(-1px)',
                                boxShadow: editingCard?.id === card.id ? '0 2px 8px rgba(0,0,0,0.06)' : '0 4px 16px rgba(0,0,0,0.12)'
                              },
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => {
                              if (editingCard?.id !== card.id) {
                                handleEditCard(card);
                              }
                            }}
                          >
                          {/* Header mit Nummerierung und Aktionen */}
                          <Box sx={{ 
                            p: 1.5, 
                            pb: 0.5,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            borderBottom: `1px solid ${colors.border}20`
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {/* Drag Handle */}
                              <Box 
                                sx={{ 
                                  cursor: 'grab',
                                  color: colors.textSecondary,
                                  '&:hover': { color: colors.primary },
                                  transition: 'color 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Karte verschieben"
                              >
                                <GripVertical size={18} />
                              </Box>
                              
                              {/* Karten-Nummer */}
                              <Chip 
                                label={`Karte ${index + 1}`}
                                size="small"
                                sx={{
                                  bgcolor: colors.primary + '20',
                                  color: colors.primary,
                                  fontWeight: '600',
                                  fontSize: '0.7rem',
                                  height: '24px'
                                }}
                              />
                            </Box>
                            
                            {/* Aktions-Buttons */}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCard(card);
                                }}
                                sx={{
                                  borderColor: colors.accent1,
                                  color: colors.accent1,
                                  bgcolor: colors.accent1 + '10',
                                  '&:hover': { 
                                    bgcolor: colors.accent1 + '20',
                                    transform: 'scale(1.05)'
                                  },
                                  transition: 'all 0.15s ease',
                                  width: 28,
                                  height: 28,
                                  minWidth: 'auto',
                                  p: 0
                                }}
                                title="Karte bearbeiten"
                              >
                                <EditIcon sx={{ fontSize: 14 }} />
                              </Button>
                              
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCard(card.id || index.toString());
                                }}
                                sx={{
                                  borderColor: colors.error,
                                  color: colors.error,
                                  bgcolor: colors.error + '10',
                                  '&:hover': { 
                                    bgcolor: colors.error + '20',
                                    transform: 'scale(1.05)'
                                  },
                                  transition: 'all 0.15s ease',
                                  width: 28,
                                  height: 28,
                                  minWidth: 'auto',
                                  p: 0
                                }}
                                title="Karte löschen"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </Box>
                          </Box>
                          
                          {/* Karten-Inhalt */}
                          <CardContent sx={{ p: 1.5, pt: 0.5 }}>
                                                              {/* Anzeigemodus - immer sichtbar */}
                                <Box sx={{ mb: 0.1 }}>
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: '700', 
                                    mb: 0.1, 
                                    color: colors.primary,
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                  }}>
                                    Frage:
                                  </Typography>
                                  <Box sx={{ 
                                    mb: 0.1,
                                    fontSize: '0.65rem',
                                    lineHeight: 1.1,
                                    color: colors.textPrimary,
                                    minHeight: '1.1em',
                                    fontWeight: '500',
                                    '& p': { margin: '0 0 0.5em 0' },
                                    '& p:last-child': { margin: 0 },
                                    '& br': { lineHeight: '1.1em' }
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: card.front || 'Keine Frage eingegeben'
                                  }}
                                  />
                                  
                                  <Typography variant="subtitle2" sx={{ 
                                    fontWeight: '600', 
                                    mb: 0.1, 
                                    mt: 0.5,
                                    color: colors.secondary,
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                  }}>
                                    Antwort:
                                  </Typography>
                                  <Box sx={{ 
                                    mb: 0,
                                    fontSize: '0.65rem',
                                    lineHeight: 1.1,
                                    color: colors.textPrimary,
                                    minHeight: '1.1em',
                                    fontWeight: '500',
                                    '& p': { margin: '0 0 0.5em 0' },
                                    '& p:last-child': { margin: 0 },
                                    '& br': { lineHeight: '1.1em' }
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: card.back || 'Keine Antwort eingegeben'
                                  }}
                                  />
                                </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ 
            p: 1.5, 
            pt: 1,
            background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background}dd 100%)`,
            borderTop: `1px solid ${colors.border}`
          }}>
            <Button 
              onClick={() => {
                setSelectedDeck(null);
                setEditingCard(null);
                setIsAddingCard(false);
                setNewCardFront('');
                setNewCardBack('');
              }}
              variant="outlined"
              size="small"
              sx={{
                borderColor: colors.textSecondary,
                color: colors.textSecondary,
                borderRadius: '8px',
                px: 2,
                py: 0.8,
                fontSize: '0.8rem',
                fontWeight: '500'
              }}
            >
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog 
        open={deleteModalOpen} 
        onClose={() => {
          setDeleteModalOpen(false);
          setDeckToDelete(null);
          setDeleteConfirmWord('');
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(220, 38, 38, 0.3)',
            border: '2px solid #ef4444'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          pt: 2,
          backgroundColor: '#fef2f2',
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
          borderBottom: '1px solid #fecaca'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ 
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}>
              <Typography variant="h6" sx={{ color: 'white', fontSize: '1.2rem' }}>
                ⚠️
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ 
                fontSize: '1.2rem', 
                fontWeight: '600',
                color: '#dc2626',
                mb: 0.5
              }}>
                Karteideck löschen
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#7f1d1d',
                fontSize: '0.85rem'
              }}>
                Diese Aktion kann nicht rückgängig gemacht werden
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3, backgroundColor: '#fef2f2' }}>
          <Typography variant="body1" sx={{ 
            mb: 3, 
            color: '#7f1d1d',
            fontSize: '0.95rem',
            lineHeight: 1.6
          }}>
            Sie sind dabei, das Karteideck <strong>"{deckToDelete?.title}"</strong> zu löschen.
            <br />
            <br />
            <strong>Alle folgenden Daten werden unwiderruflich gelöscht:</strong>
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            backgroundColor: '#fee2e2', 
            borderRadius: '8px',
            border: '1px solid #fecaca',
            mb: 3
          }}>
            <Typography variant="body2" sx={{ color: '#991b1b', mb: 1 }}>
              • Alle Karteikarten in diesem Deck
            </Typography>
            <Typography variant="body2" sx={{ color: '#991b1b', mb: 1 }}>
              • Alle Gruppen-Zuweisungen
            </Typography>
            <Typography variant="body2" sx={{ color: '#991b1b' }}>
              • Alle Lernfortschritte der Schüler
            </Typography>
          </Box>
          
          <Typography variant="body1" sx={{ 
            mb: 2, 
            color: '#7f1d1d',
            fontWeight: '600'
          }}>
            Geben Sie <span style={{ color: '#dc2626' }}>LÖSCHEN</span> ein, um zu bestätigen:
          </Typography>
          
          <TextField
            fullWidth
            value={deleteConfirmWord}
            onChange={(e) => setDeleteConfirmWord(e.target.value)}
            placeholder="LÖSCHEN"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#dc2626',
                    borderWidth: '2px'
                  }
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#ef4444'
                }
              }
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 2,
          backgroundColor: '#fef2f2',
          borderBottomLeftRadius: '14px',
          borderBottomRightRadius: '14px'
        }}>
            <Button 
              onClick={() => {
              setDeleteModalOpen(false);
              setDeckToDelete(null);
              setDeleteConfirmWord('');
            }}
            variant="outlined"
            sx={{
              borderColor: '#9ca3af',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#6b7280',
                backgroundColor: '#f9fafb'
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={confirmDeleteDeck}
              variant="contained"
            disabled={deleteConfirmWord !== 'LÖSCHEN'}
            sx={{
              backgroundColor: '#dc2626',
              color: 'white',
              fontWeight: '600',
              '&:hover': {
                backgroundColor: '#b91c1c'
              },
              '&:disabled': {
                backgroundColor: '#fca5a5',
                color: '#fecaca'
              }
            }}
          >
            Endgültig löschen
            </Button>
        </DialogActions>
      </Dialog>

      {/* Flashcard Creation Modal */}
      <FlashcardCreationModal
        open={flashcardModalOpen}
        onClose={handleFlashcardDialogClose}
        sourceFile={flashcardSourceFile}
        fileName={flashcardFileName}
        teacherId={userId}
        onSuccess={handleFlashcardSuccess}
      />

    </Box>
  );
};

export default TeacherDashboard; 