import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider,
  Modal,
  Tabs,
  Tab,
  Alert,
  ListItemIcon,
  Card,
  TextField,
  Paper
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Description as DescriptionIcon, 
  OpenInNew as OpenInNewIcon,
  Quiz as QuizIcon,
  PlayArrow as PlayIcon,
  Assignment as AssignmentIcon,
  Note as NoteIcon
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
  fileName: string;
  filePath: string;
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

interface Note {
  id: string;
  title: string;
  content: string;
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
  const [activeTab, setActiveTab] = useState(0);
  const [availableMaterials, setAvailableMaterials] = useState<MaterialFile[]>([]);
  const [lessonMaterials, setLessonMaterials] = useState<LessonMaterial[]>([]);
  const [lessonQuiz, setLessonQuiz] = useState<LessonQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<string | null>(null);
  const [showQuizAssignment, setShowQuizAssignment] = useState(false);
  const [showQuizPlayer, setShowQuizPlayer] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);

  // Verfügbare Materialien laden
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

  // Materialien der Lesson laden
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

  // Quiz der Lesson laden
  const fetchLessonQuiz = async () => {
    try {
      const response = await fetch(`/api/lesson-quizzes/lesson/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLessonQuiz(data);
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
    
    try {
      const response = await fetch(`/api/materials/lesson/${lessonId}/${materialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchLessonMaterials();
        alert('Material erfolgreich entfernt');
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Entfernen des Materials');
      }
    } catch (error) {
      console.error('Error removing material:', error);
      alert('Fehler beim Entfernen des Materials');
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
        alert('Quiz erfolgreich entfernt');
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Entfernen des Quiz');
      }
    } catch (error) {
      console.error('Error removing quiz:', error);
      alert('Fehler beim Entfernen des Quiz');
    }
  };

  // Material in neuem Tab öffnen
  const openMaterial = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    // Verwende den Server-Port (3005) für HTML-Dateien
    const fullUrl = ext === 'html' 
      ? 'http://localhost:3005' + filePath 
      : window.location.origin + filePath;
    
    const newWindow = window.open(fullUrl, '_blank');
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      alert('Das Material konnte nicht geöffnet werden. Versuchen Sie es erneut.');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Quiz zuordnen
  const handleQuizAssigned = () => {
    fetchLessonQuiz();
    fetchLessonMaterials(); // Entferne Materialien
  };

  // Quiz spielen
  const handlePlayQuiz = () => {
    setShowQuizPlayer(true);
  };

  // Notizen laden
  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/notes/lesson/${lessonId}`);
      if (response.ok) {
        const notesData = await response.json();
        setNotes(notesData);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  // Neue Notiz hinzufügen
  const addNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          title: newNoteTitle.trim(),
          content: newNoteContent.trim()
        }),
      });

      if (response.ok) {
        setNewNoteTitle('');
        setNewNoteContent('');
        setShowNoteForm(false);
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  // Notiz löschen
  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableMaterials();
      fetchLessonMaterials();
      fetchLessonQuiz();
      fetchNotes();
    }
  }, [open, lessonId]);

  // Filtere bereits zugeordnete Materialien aus
  const unassignedMaterials = availableMaterials.filter(
    material => !lessonMaterials.some(lessonMaterial => lessonMaterial.fileName === material.fileName)
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6">
              Inhalt für "{lessonName}"
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Material" />
            <Tab label="Quiz" />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Linke Seite - Notizzettel */}
              <Box sx={{ width: '30%', minWidth: 250 }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  <NoteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Notizzettel ({notes.length})
                </Typography>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  sx={{ mb: 2, width: '100%' }}
                >
                  {showNoteForm ? 'Abbrechen' : 'Notiz hinzufügen'}
                </Button>

                {/* Formular für neue Notiz */}
                {showNoteForm && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                    <TextField
                      fullWidth
                      label="Überschrift"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      size="small"
                      sx={{ mb: 2 }}
                      placeholder="Kurze Überschrift..."
                    />
                    <TextField
                      fullWidth
                      label="Notiz"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      multiline
                      rows={3}
                      size="small"
                      sx={{ mb: 2 }}
                      placeholder="Deine Notiz hier..."
                    />
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={() => {
                          setShowNoteForm(false);
                          setNewNoteTitle('');
                          setNewNoteContent('');
                        }}
                      >
                        Abbrechen
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={addNote}
                        disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
                      >
                        Hinzufügen
                      </Button>
                    </Box>
                  </Paper>
                )}

                {/* Anzeige der Notizen */}
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {notes.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Noch keine Notizen vorhanden. Füge deine erste Notiz hinzu!
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {notes.map((note) => (
                        <Paper
                          key={note.id}
                          sx={{
                            p: 2,
                            bgcolor: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            position: 'relative',
                            '&:hover': {
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                              {note.title}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => deleteNote(note.id)}
                              color="error"
                              sx={{ p: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                            {note.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(note.createdAt).toLocaleDateString('de-DE')} {new Date(note.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Rechte Seite - Materialien */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Verfügbare Materialien ({unassignedMaterials.length})
                </Typography>
                
                {unassignedMaterials.length === 0 ? (
                  <Alert severity="info">
                    Keine Materialien verfügbar. Laden Sie zuerst Materialien im "Material & Quiz" Tab hoch.
                  </Alert>
                ) : (
                  <List>
                    {unassignedMaterials.map((material) => (
                      <ListItem key={material.fileName} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                        <ListItemText
                          primary={material.fileName}
                          secondary={formatFileSize(material.fileSize)}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => addMaterialToLesson(material)}
                            disabled={loading}
                            color="primary"
                          >
                            <AddIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                  Zugeordnete Materialien ({lessonMaterials.length})
                </Typography>
                
                {lessonMaterials.length === 0 ? (
                  <Typography color="textSecondary">Keine Materialien zugeordnet</Typography>
                ) : (
                  <List>
                    {lessonMaterials.map((material) => (
                      <ListItem key={material.id} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                        <ListItemIcon>
                          <DescriptionIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={material.fileName}
                          secondary={`Zugeordnet am ${new Date(material.createdAt).toLocaleDateString()}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => openMaterial(material.filePath)}
                            color="primary"
                          >
                            <OpenInNewIcon />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => removeMaterialFromLesson(material.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Box>
          )}

          {activeTab === 1 && (
            <Box>
              {lessonQuiz ? (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Zugeordnetes Quiz
                  </Typography>
                  
                  <Card sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <QuizIcon sx={{ mr: 1, color: '#ff9800' }} />
                      <Typography variant="h6" sx={{ color: '#ff9800' }}>
                        {lessonQuiz.quiz.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {lessonQuiz.quiz.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Fragen: {lessonQuiz.quiz.questions.length} | Zeit: {lessonQuiz.quiz.timeLimit} Min. | 
                      Fragen mischen: {lessonQuiz.quiz.shuffleQuestions ? 'Ja' : 'Nein'} | 
                      Antworten mischen: {lessonQuiz.quiz.shuffleAnswers ? 'Ja' : 'Nein'}
                    </Typography>
                  </Card>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={handlePlayQuiz}
                      sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
                    >
                      Quiz spielen
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={removeQuizFromLesson}
                    >
                      Quiz entfernen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Quiz zuordnen
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Sie können nur entweder Material ODER ein Quiz einer Stunde zuordnen.
                  </Alert>

                  <Button
                    variant="contained"
                    startIcon={<AssignmentIcon />}
                    onClick={() => setShowQuizAssignment(true)}
                    sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
                  >
                    Quiz zuordnen
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={onClose} 
            color="inherit"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onClose();
              }
            }}
          >
            Schließen
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