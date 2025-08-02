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
  Avatar
} from '@mui/material';
import {
  School as SchoolIcon,
  QuestionAnswer as QuizIcon,
} from '@mui/icons-material';
import { QuizResultsModal } from './QuizResultsModal';

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
  
  // Charakterbild-System
  const [characterProfile, setCharacterProfile] = useState<any>(null);
  
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
  
  // Assignment Maps wie im TeacherDashboard
  const [subjectAssignments, setSubjectAssignments] = useState<{ [subjectId: string]: string[] }>({});
  const [blockAssignments, setBlockAssignments] = useState<{ [blockId: string]: string[] }>({});
  const [unitAssignments, setUnitAssignments] = useState<{ [unitId: string]: string[] }>({});
  const [topicAssignments, setTopicAssignments] = useState<{ [topicId: string]: string[] }>({});
  const [lessonAssignments, setLessonAssignments] = useState<{ [lessonId: string]: string[] }>({});

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

  // Charakterbild-Generierung basierend auf User-ID
  const generateCharacterProfile = (userId: string) => {
    // Hash der User-ID für konsistente, aber zufällige Werte
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Charaktertypen
    const characterTypes = [
      { emoji: '🧙‍♂️', role: 'MAGIER', description: 'Ein weiser Zauberer, der die Geheimnisse der Sterne studiert und mächtige Zauber wirken kann.' },
      { emoji: '⚔️', role: 'KRIEGER', description: 'Ein tapferer Krieger, der mit Schwert und Schild für Gerechtigkeit kämpft und Herausforderungen meistert.' },
      { emoji: '🏹', role: 'JÄGER', description: 'Ein geschickter Jäger, der mit Pfeil und Bogen zielt und die Natur versteht.' },
      { emoji: '🔮', role: 'HEXER', description: 'Ein mystischer Hexer, der die Kräfte der Magie beherrscht und in die Zukunft blickt.' },
      { emoji: '🛡️', role: 'PALADIN', description: 'Ein edler Paladin, der für das Gute kämpft und andere mit Heilung und Schutz unterstützt.' },
      { emoji: '🎭', role: 'BARD', description: 'Ein charismatischer Barde, der mit Musik und Geschichten die Herzen der Menschen berührt.' },
      { emoji: '🔧', role: 'INGENIEUR', description: 'Ein genialer Ingenieur, der komplexe Maschinen baut und Rätsel löst.' },
      { emoji: '🌿', role: 'DRUIDE', description: 'Ein naturverbundener Druide, der die Kräfte der Erde und des Lebens versteht.' },
      { emoji: '⚡', role: 'ELEMENTARIST', description: 'Ein mächtiger Elementarist, der Feuer, Wasser, Erde und Luft beherrscht.' },
      { emoji: '🎨', role: 'KÜNSTLER', description: 'Ein kreativer Künstler, der die Welt durch Farben und Formen neu erschafft.' }
    ];
    
    // Fähigkeiten
    const skills = [
      { name: 'Mathematik', color: '#E3F2FD', bgColor: '#1976d2' },
      { name: 'Sprachen', color: '#E8F5E8', bgColor: '#2E7D32' },
      { name: 'Naturwissenschaften', color: '#FFF3E0', bgColor: '#F57C00' },
      { name: 'Geschichte', color: '#F3E5F5', bgColor: '#7B1FA2' },
      { name: 'Kunst', color: '#FFEBEE', bgColor: '#D32F2F' },
      { name: 'Musik', color: '#E0F2F1', bgColor: '#00695C' },
      { name: 'Sport', color: '#E8F5E8', bgColor: '#388E3C' },
      { name: 'Informatik', color: '#E1F5FE', bgColor: '#0277BD' },
      { name: 'Philosophie', color: '#F1F8E9', bgColor: '#689F38' },
      { name: 'Geographie', color: '#FFF8E1', bgColor: '#FF8F00' }
    ];
    
    // Zufällige Auswahl basierend auf Hash
    const characterIndex = Math.abs(hash) % characterTypes.length;
    const character = characterTypes[characterIndex];
    
    // Zufällige Fähigkeiten (3-5 Stück)
    const numSkills = 3 + (Math.abs(hash) % 3); // 3-5 Fähigkeiten
    const selectedSkills = [];
    const usedIndices = new Set();
    
    for (let i = 0; i < numSkills; i++) {
      let skillIndex;
      do {
        skillIndex = Math.abs(hash + i * 1000) % skills.length;
      } while (usedIndices.has(skillIndex));
      
      usedIndices.add(skillIndex);
      selectedSkills.push(skills[skillIndex]);
    }
    
    // Zufällige Statistiken (basierend auf Hash)
    const baseStats = {
      intelligence: 50 + (Math.abs(hash) % 50), // 50-99
      creativity: 50 + (Math.abs(hash + 1000) % 50),
      determination: 50 + (Math.abs(hash + 2000) % 50),
      teamwork: 50 + (Math.abs(hash + 3000) % 50),
      curiosity: 50 + (Math.abs(hash + 4000) % 50)
    };
    
    return {
      ...character,
      skills: selectedSkills,
      stats: baseStats,
      level: 1 + (Math.abs(hash) % 20), // Level 1-20
      experience: Math.abs(hash) % 1000 // 0-999 XP
    };
  };

  // Hilfsfunktion zum Laden des Student-Namens und Generierung des Charakterbilds
  const fetchStudentName = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setStudentName(userData.name);
      }
    } catch (error) {
      console.error('Error fetching student name:', error);
      setStudentName("Schüler"); // Fallback
    }
    
    // Charakterbild generieren
    const profile = generateCharacterProfile(userId);
    setCharacterProfile(profile);
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
        await fetchStudentName(userId);
        
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
          
          // Temporär deaktiviert für schnelleres Laden
          // if (data.length > 0) {
          //   await fetchAllContent(data[0].teacher.id);
          // }
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
                {/* Character Header with Dynamic Emoji */}
                <Box sx={{ 
                  background: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
                  borderRadius: 2.1,
                  p: 2.1,
                  mb: 2.1,
                  textAlign: 'center'
                }}>
                  <Typography variant="h1" sx={{ fontSize: '3rem', mb: 1 }}>
                    {characterProfile?.emoji || '🧙‍♂️'}
                  </Typography>
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
                    {characterProfile?.role || 'SCHÜLER'}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: 'text.secondary', 
                    fontSize: '0.75rem',
                    mt: 1,
                    fontStyle: 'italic'
                  }}>
                    {characterProfile?.description || 'Ein fleißiger Schüler, der neues Wissen erobert und Herausforderungen meistert.'}
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
                        {characterProfile?.level || 1}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#333',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Level
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
                        {characterProfile?.stats?.intelligence || 75}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#333',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        Intelligenz
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
                        {characterProfile?.experience || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: '#333',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        XP
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
                    {characterProfile?.skills?.map((skill: any, index: number) => (
                      <Box key={index} sx={{ 
                        bgcolor: skill.color,
                        color: skill.bgColor,
                        px: 1.4,
                        py: 0.35,
                        borderRadius: 2.1,
                        fontSize: '0.65rem',
                        fontWeight: 600
                      }}>
                        {skill.name}
                      </Box>
                    )) || (
                      <>
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
                      </>
                    )}
                  </Box>
                </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                  <SchoolIcon sx={{ mr: 1.4, color: colors.primary, fontSize: 28 }} />
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: colors.primary, fontSize: '1.12rem' }}>
                    Deine Lerngruppen
                  </Typography>
                </Box>

                <Grid container spacing={1.4}>
                  {lerngruppen.map((gruppe) => (
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
    </Box>
  );
};

export default StudentDashboard;