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
  MenuItem,
  Paper
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  Create as CreateIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Storage as StorageIcon,
  MoreVert as MoreVertIcon,
  Build as BuildIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import DatabaseViewer from './DatabaseViewer';
import SubjectManager from './SubjectManager';
import { fetchAssignments } from './SubjectManager';
import MaterialCreator from './MaterialCreator';

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
  const [groupContents, setGroupContents] = useState<{ [groupId: string]: string[] }>({});
  const [contentInputs, setContentInputs] = useState<{ [groupId: string]: string }>({});
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupId, setEditGroupId] = useState<string | null>(null);

  // Spielerische Farbpalette
  const colors = {
    primary: '#4CAF50', // Freundliches Grün
    secondary: '#FF9800', // Warmes Orange
    accent1: '#2196F3', // Helles Blau
    accent2: '#E91E63', // Fröhliches Pink
    background: '#F5F9FD', // Helles, freundliches Blau
    cardBg: '#FFFFFF',
    success: '#8BC34A',
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
      // Bestätigung für Quiz-Start anzeigen
      if (window.confirm(`Prüfung "${quiz.quiz.title}" starten?`)) {
        // Öffne den Quiz-Player in einem neuen Tab
        const quizUrl = `/quiz-player/${quiz.quiz.id}`;
        window.open(quizUrl, '_blank');
      }
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
              <Tab icon={<GroupIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Lerngruppen</span>} sx={{ minHeight: 28, px: 0.7 }} />
              <Tab icon={<StorageIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Datenbank</span>} sx={{ minHeight: 28, px: 0.7 }} />
              <Tab icon={<SchoolIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Meine Fächer</span>} sx={{ minHeight: 28, px: 0.7 }} />
              <Tab icon={<BuildIcon sx={{ fontSize: 16 }} />} label={<span style={{ fontSize: '0.65rem' }}>Material & Quiz</span>} sx={{ minHeight: 28, px: 0.7 }} />
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
                              <Grid item xs={12} sm={6} md={6} lg={4} key={student.id}>
                                <Card variant="outlined" sx={{ 
                                  borderRadius: 2.1,
                                  border: 'none',
                                  bgcolor: '#f8f9fa',
                                  transition: 'transform 0.14s',
                                  '&:hover': {
                                    transform: 'translateY(-2.8px)',
                                    boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)'
                                  }
                                }}>
                                  <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.4 }}>
                                      <Avatar sx={{ bgcolor: colors.accent1, mr: 1.4, width: 22, height: 22 }}>
                                        {student.name.charAt(0)}
                                      </Avatar>
                                      <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}>
                                          {student.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                          Code: {student.loginCode}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Chip 
                                        label="Aktiv" 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: colors.success,
                                          color: 'white',
                                          fontWeight: 'bold',
                                          fontSize: '0.7rem',
                                          height: 18
                                        }} 
                                      />
                                      <IconButton 
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveStudent(group.id, student.id);
                                        }}
                                        sx={{ 
                                          color: colors.accent2,
                                          '&:hover': {
                                            bgcolor: `${colors.accent2}10`
                                          },
                                          fontSize: '1.1rem'
                                        }}
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                              Zugeordnete Inhalte
                            </Typography>
                            {/* Verschachtelte Darstellung */}
                            <Box sx={{ ml: 1 }}>
                              {subjects
                                .filter(subject => (subjectAssignments[subject.id] || []).includes(group.id))
                                .map(subject => (
                                  <Box key={subject.id} sx={{ mb: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: colors.accent1 }}>
                                      Fach: {subject.name}
                                    </Typography>
                                    {/* Blöcke */}
                                    {blocks
                                      .filter(block => block.subjectId === subject.id && (blockAssignments[block.id] || []).includes(group.id))
                                      .map(block => (
                                        <Box key={block.id} sx={{ ml: 2, mb: 0.5 }}>
                                          <Typography variant="body2" sx={{ color: colors.primary }}>
                                            Block: {block.name}
                                          </Typography>
                                          {/* Units */}
                                          {units
                                            .filter(unit => unit.blockId === block.id && (unitAssignments[unit.id] || []).includes(group.id))
                                            .map(unit => (
                                              <Box key={unit.id} sx={{ ml: 2, mb: 0.5 }}>
                                                <Typography variant="body2" sx={{ color: colors.secondary }}>
                                                  Reihe: {unit.name}
                                                </Typography>
                                                {/* Themen */}
                                                {topics
                                                  .filter(topic => topic.unitId === unit.id && (topicAssignments[topic.id] || []).includes(group.id))
                                                  .map(topic => (
                                                    <Box key={topic.id} sx={{ ml: 2, mb: 0.5 }}>
                                                      <Typography variant="body2" sx={{ color: colors.accent2 }}>
                                                        Thema: {topic.name}
                                                      </Typography>
                                                      {/* Stunden */}
                                                      {lessons
                                                        .filter(lesson => lesson.topicId === topic.id && (lessonAssignments[lesson.id] || []).includes(group.id))
                                                        .map(lesson => (
                                                          <Box key={lesson.id} sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Typography 
                                                              variant="body2" 
                                                              sx={{ 
                                                                color: '#888',
                                                                cursor: (lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? 'pointer' : 'default'
                                                              }}
                                                              onClick={e => {
                                                                e.stopPropagation();
                                                                if ((lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id]) {
                                                                  openLessonContent(lesson.id, lesson.name);
                                                                }
                                                              }}
                                                              title={(lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id] ? "Material/Quiz öffnen" : ""}
                                                            >
                                                              Stunde: {lesson.name}
                                                            </Typography>
                                                            {((lessonMaterials[lesson.id] && lessonMaterials[lesson.id].length > 0) || lessonQuizzes[lesson.id]) && (
                                                              <span 
                                                                style={{ 
                                                                  color: '#ff9800', 
                                                                  fontSize: '0.8em', 
                                                                  cursor: 'pointer',
                                                                  marginLeft: '4px'
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
                                <Typography variant="body2" color="text.secondary">Noch keine Inhalte zugeordnet.</Typography>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Abbrechen</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained" disabled={!(confirmDelete1 && confirmDelete2)}>Löschen</Button>
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