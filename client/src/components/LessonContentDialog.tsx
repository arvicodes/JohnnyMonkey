import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  Alert,
  Radio,
  RadioGroup,
  FormControl,
  IconButton
} from '@mui/material';
import {
  Description as DescriptionIcon,
  Quiz as QuizIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import QuizAssignmentDialog from './QuizAssignmentDialog';
import QuizPlayer from './QuizPlayer';

interface MaterialFile {
  fileName: string;
  filePath: string;
  fileSize: number;
}

interface LessonMaterial {
  id: string;
  material: {
    id: string;
    fileName: string;
    filePath: string;
    type: string;
  };
  createdAt: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  questions: {
    id: string;
    question: string;
    correctAnswer: string;
    options: string[];
    order: number;
  }[];
}

interface LessonQuiz {
  id: string;
  quiz: Quiz;
  createdAt: string;
}

interface LessonContentDialogProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  lessonName: string;
  teacherId: string;
}

const LessonContentDialog: React.FC<LessonContentDialogProps> = ({
  open,
  onClose,
  lessonId,
  lessonName,
  teacherId
}) => {
  const [availableMaterials, setAvailableMaterials] = useState<MaterialFile[]>([]);
  const [lessonMaterials, setLessonMaterials] = useState<LessonMaterial[]>([]);
  const [lessonQuiz, setLessonQuiz] = useState<LessonQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQuizAssignment, setShowQuizAssignment] = useState(false);
  const [showQuizPlayer, setShowQuizPlayer] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialFile | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);

  // Lade verfügbare Materialien
  const fetchAvailableMaterials = async () => {
    try {
      const response = await fetch('/api/materials/available');
      if (response.ok) {
        const materials = await response.json();
        setAvailableMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching available materials:', error);
    }
  };

  // Lade verfügbare Quizze
  const fetchAvailableQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      if (response.ok) {
        const quizzes = await response.json();
        setAvailableQuizzes(quizzes);
      }
    } catch (error) {
      console.error('Error fetching available quizzes:', error);
    }
  };

  // Lade Materialien der Lesson
  const fetchLessonMaterials = async () => {
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}`);
      if (response.ok) {
        const materials = await response.json();
        setLessonMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching lesson materials:', error);
    }
  };

  // Lade Quiz der Lesson
  const fetchLessonQuiz = async () => {
    try {
      const response = await fetch(`/api/lesson-quizzes/lesson/${lessonId}`);
      if (response.ok) {
        const quiz = await response.json();
        setLessonQuiz(quiz);
      } else if (response.status === 404) {
        setLessonQuiz(null);
      }
    } catch (error) {
      console.error('Error fetching lesson quiz:', error);
      setLessonQuiz(null);
    }
  };

  // Material zu Lesson hinzufügen
  const addMaterialToLesson = async (material: MaterialFile) => {
    setLoading(true);
    try {
      // Entferne zuerst alle Quizze von dieser Stunde
      await fetch(`/api/lesson-quizzes/lesson/${lessonId}`, {
        method: 'DELETE'
      });

      const response = await fetch('/api/materials/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          fileName: material.fileName,
          filePath: material.filePath
        }),
      });

      if (response.ok) {
        await fetchLessonMaterials();
        await fetchLessonQuiz();
        setSelectedMaterial(null);
        setSelectedQuiz(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Hinzufügen des Materials');
      }
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Fehler beim Hinzufügen des Materials');
    } finally {
      setLoading(false);
    }
  };

  // Material von Lesson entfernen
  const removeMaterialFromLesson = async (materialId: string) => {
    if (!window.confirm('Möchten Sie dieses Material wirklich entfernen?')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}/${materialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchLessonMaterials();
        await fetchLessonQuiz();
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Entfernen des Materials');
      }
    } catch (error) {
      console.error('Error removing material:', error);
      alert('Fehler beim Entfernen des Materials');
    } finally {
      setLoading(false);
    }
  };

  // Quiz zu Lesson hinzufügen
  const addQuizToLesson = async (quiz: Quiz) => {
    setLoading(true);
    try {
      // Entferne zuerst alle Materialien von dieser Stunde
      await fetch(`/api/materials/lesson/${lessonId}`, {
        method: 'DELETE'
      });

      const response = await fetch('/api/lesson-quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          quizId: quiz.id
        }),
      });

      if (response.ok) {
        await fetchLessonMaterials();
        await fetchLessonQuiz();
        setSelectedMaterial(null);
        setSelectedQuiz(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Hinzufügen des Quiz');
      }
    } catch (error) {
      console.error('Error adding quiz:', error);
      alert('Fehler beim Hinzufügen des Quiz');
    } finally {
      setLoading(false);
    }
  };

  // Gemeinsame Hinzufügen-Funktion
  const handleAddSelected = () => {
    // Prüfe, ob bereits etwas zugeordnet ist
    if (lessonMaterials.length > 0 || lessonQuiz) {
      alert('Es ist bereits ein Material oder Quiz zugeordnet. Bitte entfernen Sie es zuerst.');
      return;
    }
    
    if (selectedMaterial) {
      addMaterialToLesson(selectedMaterial);
    } else if (selectedQuiz) {
      addQuizToLesson(selectedQuiz);
    }
  };

  // Quiz von Lesson entfernen
  const removeQuizFromLesson = async () => {
    if (!window.confirm('Möchten Sie dieses Quiz wirklich entfernen?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/lesson-quizzes/lesson/${lessonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchLessonQuiz();
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Entfernen des Quiz');
      }
    } catch (error) {
      console.error('Error removing quiz:', error);
      alert('Fehler beim Entfernen des Quiz');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleQuizAssigned = () => {
    setShowQuizAssignment(false);
    fetchLessonQuiz();
  };

  // Quiz spielen
  const handlePlayQuiz = () => {
    setShowQuizPlayer(true);
  };

  // Keyboard Handler für Enter-Taste
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (selectedMaterial || selectedQuiz)) {
      handleAddSelected();
    }
  };

  // Lade Daten beim Öffnen des Dialogs
  useEffect(() => {
    if (open) {
      fetchAvailableMaterials();
      fetchAvailableQuizzes();
      fetchLessonMaterials();
      fetchLessonQuiz();
      setSelectedMaterial(null);
      setSelectedQuiz(null);
    }
  }, [open, lessonId]);

  // Filtere bereits zugeordnete Materialien aus
  const unassignedMaterials = availableMaterials.filter(
    material => !lessonMaterials.some(lessonMaterial => lessonMaterial.material.fileName === material.fileName)
  );

  // Filtere bereits zugeordnete Quizze aus
  const unassignedQuizzes = availableQuizzes.filter(
    quiz => !lessonQuiz || lessonQuiz.quiz.id !== quiz.id
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onKeyDown={handleKeyDown}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6">
              Inhalt für "{lessonName}"
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Material-Bereich */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold' }}>
                Verfügbare Materialien ({unassignedMaterials.length})
              </Typography>
              
              {/* Zugeordnete Materialien anzeigen */}
              {lessonMaterials.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                    Zugeordnete Materialien:
                  </Typography>
                  {lessonMaterials.map((lessonMaterial) => (
                    <Card key={lessonMaterial.id} sx={{ p: 1, mb: 0.5, bgcolor: '#e8f5e8', border: '1px solid #4caf50', position: 'relative' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, pr: 4 }}>
                          <DescriptionIcon sx={{ mr: 1, color: '#4caf50', fontSize: 20 }} />
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lessonMaterial.material.fileName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {lessonMaterial.material.type}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeMaterialFromLesson(lessonMaterial.material.id)}
                          disabled={loading}
                          sx={{ 
                            float: 'right',
                            p: 0,
                            m: 0,
                            minWidth: 'auto',
                            '&:hover': { bgcolor: 'transparent' }
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}

              {/* Verfügbare Materialien */}
              {unassignedMaterials.length === 0 ? (
                <Typography variant="body2" color="textSecondary">Alle verfügbaren Materialien sind bereits zugeordnet</Typography>
              ) : (
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup
                    value={selectedMaterial?.fileName || ''}
                    onChange={(e) => {
                      const material = unassignedMaterials.find(m => m.fileName === e.target.value);
                      setSelectedMaterial(material || null);
                      setSelectedQuiz(null); // Deselektiere Quiz
                    }}
                  >
                    {unassignedMaterials.map((material) => (
                      <ListItem 
                        key={material.fileName} 
                        sx={{ 
                          border: '1px solid #e0e0e0', 
                          mb: 0.5, 
                          borderRadius: 1, 
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                        onClick={() => {
                          setSelectedMaterial(material);
                          setSelectedQuiz(null);
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Radio value={material.fileName} size="small" />
                        </ListItemIcon>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <DescriptionIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={material.fileName}
                          secondary={`${formatFileSize(material.fileSize)}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
            </Box>

            {/* Quiz-Bereich */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold' }}>
                Verfügbare Quizze ({unassignedQuizzes.length})
              </Typography>
              
              {/* Zugeordnetes Quiz anzeigen */}
              {lessonQuiz && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                    Zugeordnetes Quiz:
                  </Typography>
                                    <Card sx={{ p: 1, mb: 1, bgcolor: '#fff3e0', border: '1px solid #ff9800', position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, pr: 4 }}>
                        <QuizIcon sx={{ mr: 1, color: '#ff9800', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                          {lessonQuiz.quiz.title}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={removeQuizFromLesson}
                        disabled={loading}
                        sx={{ 
                          float: 'right',
                          p: 0,
                          m: 0,
                          minWidth: 'auto',
                          '&:hover': { bgcolor: 'transparent' }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                      {lessonQuiz.quiz.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                      {lessonQuiz.quiz.questions.length} Fragen | {lessonQuiz.quiz.timeLimit} Min.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<PlayIcon />}
                      onClick={handlePlayQuiz}
                      sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' }, mt: 0.5 }}
                    >
                      Spielen
                    </Button>
                  </Card>
                </Box>
              )}

              {/* Verfügbare Quizze */}
              {unassignedQuizzes.length === 0 ? (
                <Typography variant="body2" color="textSecondary">Keine verfügbaren Quizze</Typography>
              ) : (
                <FormControl component="fieldset" fullWidth>
                  <RadioGroup
                    value={selectedQuiz?.id || ''}
                    onChange={(e) => {
                      const quiz = unassignedQuizzes.find(q => q.id === e.target.value);
                      setSelectedQuiz(quiz || null);
                      setSelectedMaterial(null); // Deselektiere Material
                    }}
                  >
                    {unassignedQuizzes.map((quiz) => (
                      <ListItem 
                        key={quiz.id} 
                        sx={{ 
                          border: '1px solid #e0e0e0', 
                          mb: 0.5, 
                          borderRadius: 1, 
                          p: 1,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                        onClick={() => {
                          setSelectedQuiz(quiz);
                          setSelectedMaterial(null);
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Radio value={quiz.id} size="small" />
                        </ListItemIcon>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <QuizIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={quiz.title}
                          secondary={`${quiz.questions.length} Fragen | ${quiz.timeLimit} Min.`}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
            </Box>
          </Box>

          {(lessonQuiz || lessonMaterials.length > 0) && (
            <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
              Sie können einer Stunde genau ein Material ODER genau ein Quiz zuordnen.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={onClose} 
            color="inherit"
            startIcon={<CloseIcon />}
          >
            Schließen
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={loading || (!selectedMaterial && !selectedQuiz) || (lessonMaterials.length > 0 || !!lessonQuiz)}
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
          >
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quiz-Zuordnungs-Dialog */}
      <QuizAssignmentDialog
        open={showQuizAssignment}
        onClose={() => setShowQuizAssignment(false)}
        lessonId={lessonId}
        teacherId={teacherId}
        onQuizAssigned={handleQuizAssigned}
      />

      {/* Quiz-Player */}
      {lessonQuiz && (
        <QuizPlayer
          quiz={lessonQuiz.quiz}
          onClose={() => setShowQuizPlayer(false)}
        />
      )}
    </>
  );
};

export default LessonContentDialog; 