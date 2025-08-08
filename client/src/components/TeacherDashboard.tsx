import React, { useState, useEffect, useRef } from 'react';
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
  MenuItem
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
  Grade as GradeIcon
} from '@mui/icons-material';
import DatabaseViewer from './DatabaseViewer';
import SubjectManager from './SubjectManager';
import { fetchAssignments } from './SubjectManager';
import MaterialCreator from './MaterialCreator';
import GradingSchemaModal from './GradingSchemaModal';
import GradesModal from './GradesModal';

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
  
  // Debug: Log userId
  console.log('TeacherDashboard received userId:', userId);
  const [groups, setGroups] = useState<LearningGroup[]>([]);
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
  const [topicAssignments, setTopicAssignments] = useState<{ [topicId: string]: string[] }>({});
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
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Lerngruppen:', error);
    }
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

  const handleMainTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setMainTabValue(newValue);
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
      } else if (name.includes('quiz') || name.includes('quizz') || name.includes('test')) {
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.1 }}>
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
                        ml: 1.4,
                        py: 0.35,
                        px: 1.4,
                        fontSize: '0.525rem',
                        height: '22.4px',
                        width: '14%'
                      }}
                    >
                      Neue Gruppe
                    </Button>
                  </Box>

                  {groups.map((group) => (
                    <Box key={group.id} sx={{ mb: 2.8 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 1.4,
                        p: 1.4,
                        bgcolor: `${colors.primary}10`,
                        borderRadius: 1.4,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: `${colors.primary}20`,
                        }
                      }} onClick={() => handleGroupClick(group.id)}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h6" sx={{ 
                            color: colors.primary, 
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.84rem'
                          }}>
                            {group.name}
                          </Typography>
                          <Chip 
                            label={`${group.students.length} Schüler`}
                            size="small" 
                            sx={{ 
                              ml: 1.4, 
                              bgcolor: colors.primary,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                              height: 18
                            }} 
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            aria-label="Mehr"
                            onClick={e => { e.stopPropagation(); handleMenuOpen(e, group.id); }}
                            sx={{ ml: 1 }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Grid container spacing={1.4}>
                        <Grid item xs={12} md={8}>
                          <Grid container spacing={1.4}>
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
                        <Grid item xs={12} md={4}>
                          <Box sx={{ 
                            p: 2.1, 
                            bgcolor: '#fff', 
                            borderRadius: 2.8, 
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            border: '1px solid #e0e0e0'
                          }}>
                            <Typography variant="subtitle2" sx={{ 
                              fontWeight: 'bold', 
                              mb: 1.4,
                              color: colors.textPrimary,
                              fontSize: '0.85rem'
                            }}>
                              Zugeordnete Inhalte
                            </Typography>
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
            <SubjectManager
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
            />
          </TabPanel>
          <TabPanel value={mainTabValue} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Hauptbereich - MaterialCreator */}
              <Box>
                <MaterialCreator teacherId={userId} />
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
      >
        <MenuItem onClick={() => { handleOpenAddStudents(menuGroupId!); handleMenuClose(); }}>
          <PersonAddIcon fontSize="small" sx={{ mr: 1 }} /> Schüler hinzufügen
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

      {/* Grades Modal */}
      {selectedStudent && (
        <GradesModal
          open={gradesModalOpen}
          onClose={handleGradesDialogClose}
          groupId={gradesGroupId || ''}
          groupName={gradesGroupName}
          student={selectedStudent}
        />
      )}

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
    </Box>
  );
};

export default TeacherDashboard; 