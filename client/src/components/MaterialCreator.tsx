import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Description as DescriptionIcon,
  FileUpload as FileUploadIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as CloudUploadIcon,
  Quiz as QuizIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Note as NoteIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

interface MaterialCreatorProps {
  teacherId: string;
}

interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  sourceFile: string;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  timeLimit: number;
  questions: QuizQuestion[];
  createdAt: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  options: string[];
  order: number;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  color: string;
  order: number;
}

const MaterialCreator: React.FC<MaterialCreatorProps> = ({ teacherId }) => {
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [availableFiles, setAvailableFiles] = useState<FileInfo[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Quiz states
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [uploadedWordFile, setUploadedWordFile] = useState<File | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('Eine neue Frage beginnt immer mit einem Listenpunkt. Die möglichen Antworten darunter sind mit a), b) etc. bezeichnet. Die erste Antwort ist immer die richtige.');
  const [quizTimeLimit, setQuizTimeLimit] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  
  // Quiz editing states
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Notizzettel states
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('#4CAF50');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteDialogOpen, setEditNoteDialogOpen] = useState(false);
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Verfügbare Farben für Notizen
  const noteColors = [
    { name: 'Grün', value: '#4CAF50' },
    { name: 'Blau', value: '#2196F3' },
    { name: 'Orange', value: '#FF9800' },
    { name: 'Rot', value: '#F44336' },
    { name: 'Lila', value: '#9C27B0' },
    { name: 'Pink', value: '#E91E63' },
    { name: 'Türkis', value: '#00BCD4' },
    { name: 'Gelb', value: '#FFC107' },
    { name: 'Grau', value: '#9E9E9E' },
    { name: 'Braun', value: '#795548' }
  ];

  // Mock-Daten für verfügbare Dateien (später durch API-Aufruf ersetzen)
  const mockAvailableFiles: FileInfo[] = [
    { name: '3D-Druck-Intro.html', path: '/material/3D-Druck-Intro.html', size: 2048, type: 'html' },
    { name: 'Mathematik-Übung.pdf', path: '/material/Mathematik-Übung.pdf', size: 1536, type: 'pdf' },
    { name: 'Physik-Experiment.docx', path: '/material/Physik-Experiment.docx', size: 3072, type: 'docx' }
  ];

  const handleMaterialDialogOpen = async () => {
    setMaterialDialogOpen(true);
    try {
      const response = await fetch('/api/materials/files');
      if (response.ok) {
        const files = await response.json();
        setAvailableFiles(files);
      } else {
        setAvailableFiles(mockAvailableFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setAvailableFiles(mockAvailableFiles);
    }
  };

  const handleMaterialDialogClose = () => {
    setMaterialDialogOpen(false);
    setSelectedFiles([]);
    setIsDragOver(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  // Drag & Drop Funktionen
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['html', 'pdf', 'docx', 'pptx', 'txt', 'md', 'doc'].includes(ext || '');
    });
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleAddMaterial = async () => {
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(result.message, 'success');
        handleMaterialDialogClose();
        // Aktualisiere die verfügbaren Dateien
        handleMaterialDialogOpen();
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Fehler beim Hochladen', 'error');
      }
    } catch (error) {
      showSnackbar('Fehler beim Hinzufügen des Materials', 'error');
    }
  };

  // Quiz Funktionen
  const fetchQuizzes = useCallback(async () => {
    try {
      const response = await fetch(`/api/quizzes/teacher/${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  }, [teacherId]);

  const handleQuizDialogOpen = () => {
    setQuizDialogOpen(true);
    setUploadedWordFile(null);
    setQuizTitle('');
    setQuizDescription('Eine neue Frage beginnt immer mit einem Listenpunkt. Die möglichen Antworten darunter sind mit a), b) etc. bezeichnet. Die erste Antwort ist immer die richtige.');
    setQuizTimeLimit(30);
    setShuffleQuestions(true);
    setShuffleAnswers(true);
  };

  const handleQuizDialogClose = () => {
    setQuizDialogOpen(false);
  };

  const handleWordFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setUploadedWordFile(file);
      // Automatisch den Titel aus dem Dateinamen setzen
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Entferne Dateiendung
      setQuizTitle(fileName);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      if (!uploadedWordFile) {
        showSnackbar('Bitte wählen Sie eine Word-Datei aus', 'error');
        return;
      }

      // 1. Word-Datei hochladen
      const formData = new FormData();
      formData.append('wordFile', uploadedWordFile);

      const uploadResponse = await fetch('/api/materials/word-upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        showSnackbar(error.error || 'Fehler beim Hochladen der Word-Datei', 'error');
        return;
      }

      const uploadResult = await uploadResponse.json();

      // 2. Quiz erstellen
      const quizResponse = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          sourceFile: uploadResult.sourceFile,
          title: quizTitle,
          description: quizDescription,
          timeLimit: quizTimeLimit,
          shuffleQuestions,
          shuffleAnswers
        })
      });

      if (quizResponse.ok) {
        showSnackbar('Quiz erfolgreich erstellt', 'success');
        handleQuizDialogClose();
        fetchQuizzes(); // Aktualisiere die Quiz-Liste
      } else {
        const error = await quizResponse.json();
        showSnackbar(error.error || 'Fehler beim Erstellen des Quiz', 'error');
      }
    } catch (error) {
      showSnackbar('Fehler beim Erstellen des Quiz', 'error');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (window.confirm('Möchten Sie dieses Quiz wirklich löschen?')) {
      try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showSnackbar('Quiz erfolgreich gelöscht', 'success');
          fetchQuizzes(); // Aktualisiere die Quiz-Liste
        } else {
          const error = await response.json();
          showSnackbar(error.error || 'Fehler beim Löschen', 'error');
        }
      } catch (error) {
        showSnackbar('Fehler beim Löschen des Quiz', 'error');
      }
    }
  };

  // Quiz editing functions
  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingQuiz(null);
  };

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return;

    try {
      const response = await fetch(`/api/quizzes/${editingQuiz.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingQuiz.title,
          description: editingQuiz.description,
          timeLimit: editingQuiz.timeLimit,
          shuffleQuestions: editingQuiz.shuffleQuestions,
          shuffleAnswers: editingQuiz.shuffleAnswers
        })
      });

      if (response.ok) {
        showSnackbar('Quiz erfolgreich aktualisiert', 'success');
        handleEditDialogClose();
        fetchQuizzes(); // Aktualisiere die Quiz-Liste
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Fehler beim Aktualisieren', 'error');
      }
    } catch (error) {
      showSnackbar('Fehler beim Aktualisieren des Quiz', 'error');
    }
  };

  // Lade Quizze beim ersten Rendern
  React.useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAvailableFile = async (fileName: string) => {
    if (window.confirm(`Möchten Sie die Datei "${fileName}" wirklich löschen?`)) {
      try {
        const response = await fetch(`/api/materials/files/${encodeURIComponent(fileName)}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showSnackbar(`Datei "${fileName}" erfolgreich gelöscht`, 'success');
          // Aktualisiere die verfügbaren Dateien
          handleMaterialDialogOpen();
        } else {
          const error = await response.json();
          showSnackbar(error.error || 'Fehler beim Löschen', 'error');
        }
      } catch (error) {
        showSnackbar('Fehler beim Löschen der Datei', 'error');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Notizzettel Funktionen
  const fetchNotes = async () => {
    try {
      // Für jetzt verwenden wir lokale Daten, da die API noch nicht existiert
      // const response = await fetch('/api/notes');
      // if (response.ok) {
      //   const notesData = await response.json();
      //   setNotes(notesData);
      // }
      console.log('Notizen werden geladen...');
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    
    try {
      // Für jetzt verwenden wir lokale Daten, da die API noch nicht existiert
      const newNote: Note = {
        id: Date.now().toString(), // Einfache ID-Generierung
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        createdAt: new Date().toISOString(),
        color: newNoteColor,
        order: notes.length // Neue Notiz am Ende hinzufügen
      };
      
      setNotes(prevNotes => [...prevNotes, newNote]);
      setNewNoteTitle('');
      setNewNoteContent('');
      setNewNoteColor('#4CAF50');
      setShowNoteForm(false);
      
      // API-Aufruf (später aktivieren):
      // const response = await fetch('/api/notes', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     title: newNoteTitle.trim(),
      //     content: newNoteContent.trim(),
      //     color: newNoteColor
      //   }),
      // });

      // if (response.ok) {
      //   setNewNoteTitle('');
      //   setNewNoteContent('');
      //   setNewNoteColor('#4CAF50');
      //   setShowNoteForm(false);
      //   await fetchNotes();
      // }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      // Für jetzt verwenden wir lokale Daten, da die API noch nicht existiert
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
      
      // API-Aufruf (später aktivieren):
      // const response = await fetch(`/api/notes/${noteId}`, {
      //   method: 'DELETE',
      // });

      // if (response.ok) {
      //   await fetchNotes();
      // }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Drag & Drop Funktionen für Notizen
  const handleNoteDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
  };

  const handleNoteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleNoteDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const draggedNoteId = e.dataTransfer.getData('text/plain');
    const draggedIndex = notes.findIndex(note => note.id === draggedNoteId);
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;
    
    const updatedNotes = [...notes];
    const [draggedNote] = updatedNotes.splice(draggedIndex, 1);
    updatedNotes.splice(targetIndex, 0, draggedNote);
    
    // Order neu setzen
    const reorderedNotes = updatedNotes.map((note, index) => ({
      ...note,
      order: index
    }));
    
    setNotes(reorderedNotes);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditNoteDialogOpen(true);
  };

  const handleEditNoteDialogClose = () => {
    setEditNoteDialogOpen(false);
    setEditingNote(null);
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;
    
    try {
      // Für jetzt verwenden wir lokale Daten, da die API noch nicht existiert
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === editingNote.id 
            ? { ...editingNote, createdAt: note.createdAt, order: note.order }
            : note
        )
      );
      
      setEditNoteDialogOpen(false);
      setEditingNote(null);
      
      // API-Aufruf (später aktivieren):
      // const response = await fetch(`/api/notes/${editingNote.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     title: editingNote.title,
      //     content: editingNote.content,
      //     color: editingNote.color
      //   })
      // });

      // if (response.ok) {
      //   setEditNoteDialogOpen(false);
      //   setEditingNote(null);
      //   await fetchNotes();
      // }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  return (
    <Box sx={{ p: 1.4 }}>
      <Typography variant="h5" component="h2" sx={{ 
        fontWeight: 'bold', 
        color: '#1976d2',
        mb: 2.1,
        fontSize: '1.12rem'
      }}>
        Material & Quiz erstellen
      </Typography>

      <Grid container spacing={2.1}>
        {/* Material hinzufügen Box */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 2.8,
            boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
            bgcolor: '#ffffff',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                <DescriptionIcon sx={{ mr: 1.4, color: '#1976d2', fontSize: 28 }} />
                <Typography variant="h6" component="h3" sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976d2',
                  fontSize: '1rem'
                }}>
                  Material hinzufügen
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2.1, color: '#666' }}>
                Laden Sie Dateien aus der Dateistruktur und speichern Sie diese im Material-Ordner.
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleMaterialDialogOpen}
                sx={{
                  bgcolor: '#1976d2',
                  '&:hover': { bgcolor: '#1565c0' },
                  borderRadius: 1.4,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                Material hinzufügen
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quiz erstellen Box */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 2.8,
            boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
            bgcolor: '#ffffff',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                <QuizIcon sx={{ mr: 1.4, color: '#ff9800', fontSize: 28 }} />
                <Typography variant="h6" component="h3" sx={{ 
                  fontWeight: 'bold', 
                  color: '#ff9800',
                  fontSize: '1rem'
                }}>
                  Quiz erstellen
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2.1, color: '#666' }}>
                Erstellen Sie Quizze aus Word-Dateien mit automatischer Fragen-Generierung.
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleQuizDialogOpen}
                sx={{
                  bgcolor: '#ff9800',
                  '&:hover': { bgcolor: '#f57c00' },
                  borderRadius: 1.4,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                Quiz erstellen
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quiz-Liste und Notizzettel */}
        <Grid container spacing={2.1} sx={{ mt: 1 }}>
        {/* Notizzettel-Pinwand */}
          <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 2.8,
            boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
            bgcolor: '#ffffff',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.1 }}>
                <NoteIcon sx={{ mr: 1.4, color: '#4CAF50', fontSize: 28 }} />
                <Typography variant="h6" component="h3" sx={{ 
                  fontWeight: 'bold', 
                  color: '#4CAF50',
                  fontSize: '1rem'
                }}>
                  Notizzettel ({notes.length})
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 2.1, color: '#666' }}>
                Fügen Sie kurze Notizen hinzu, um wichtige Informationen zu notieren.
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowNoteForm(!showNoteForm)}
                sx={{
                  bgcolor: '#4CAF50',
                  '&:hover': { bgcolor: '#388E3C' },
                  borderRadius: 1.4,
                  textTransform: 'none',
                  fontWeight: 500,
                  mb: 2.1
                }}
              >
                {showNoteForm ? 'Abbrechen' : 'Notiz hinzufügen'}
              </Button>

              {/* Formular für neue Notiz */}
              {showNoteForm && (
                <Paper sx={{ 
                  p: 2.1, 
                  mb: 2.1, 
                  bgcolor: '#f8f9fa', 
                  borderRadius: 1.4,
                  border: '1px solid #e0e0e0'
                }}>
                  <TextField
                    fullWidth
                    label="Überschrift"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    size="small"
                    sx={{ mb: 2.1 }}
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
                    sx={{ mb: 2.1 }}
                    placeholder="Deine Notiz hier..."
                  />
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Farbe</InputLabel>
                    <Select
                      value={newNoteColor}
                      label="Farbe"
                      onChange={(e) => setNewNoteColor(e.target.value as string)}
                    >
                      {noteColors.map((color) => (
                        <MenuItem key={color.value} value={color.value}>
                          <Chip label={color.name} sx={{ backgroundColor: color.value }} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setShowNoteForm(false);
                        setNewNoteTitle('');
                        setNewNoteContent('');
                        setNewNoteColor('#4CAF50'); // Zurücksetzen auf Standardfarbe
                      }}
                      sx={{ borderRadius: 1.4, textTransform: 'none' }}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={addNote}
                      disabled={!newNoteTitle.trim() || !newNoteContent.trim()}
                      sx={{ 
                        bgcolor: '#4CAF50',
                        '&:hover': { bgcolor: '#388E3C' },
                        borderRadius: 1.4,
                        textTransform: 'none'
                      }}
                    >
                      Hinzufügen
                    </Button>
                  </Box>
                </Paper>
              )}

              {/* Anzeige der Notizen */}
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {notes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 4 }}>
                    Noch keine Notizen vorhanden. Füge deine erste Notiz hinzu!
                  </Typography>
                ) : (
                  <List dense>
                    {notes.map((note, index) => (
                      <ListItem
                        key={note.id}
                        sx={{ 
                          background: `linear-gradient(135deg, ${note.color}15 0%, ${note.color}25 100%)`,
                          border: `2px solid ${note.color}40`,
                          mb: 1, 
                          borderRadius: 1,
                          position: 'relative',
                          pr: 1, // Weniger Padding rechts für Icons
                          pl: 2, // Mehr Padding links für Text
                          cursor: 'grab',
                          '&:active': {
                            cursor: 'grabbing'
                          },
                          '&:hover': {
                            background: `linear-gradient(135deg, ${note.color}25 0%, ${note.color}35 100%)`,
                            border: `2px solid ${note.color}60`
                          }
                        }}
                        draggable
                        onDragStart={(e) => handleNoteDragStart(e, note.id)}
                        onDragOver={handleNoteDragOver}
                        onDrop={(e) => handleNoteDrop(e, index)}
                      >
                        <ListItemIcon sx={{ minWidth: 32, mr: 1 }}>
                          <DragIcon sx={{ color: note.color, fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ 
                                fontWeight: 'bold', 
                                color: note.color,
                                fontSize: '0.9rem',
                                mb: 0.5
                              }}>
                                {note.title}
                              </Typography>
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: note.color,
                                  border: '1px solid #fff',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ 
                                color: '#333', 
                                mb: 0.5,
                                lineHeight: 1.4,
                                whiteSpace: 'pre-wrap'
                              }}>
                                {note.content}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: '#666',
                                fontSize: '0.75rem'
                              }}>
                                {new Date(note.createdAt).toLocaleDateString('de-DE')} {new Date(note.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                          }
                          sx={{ 
                            flex: 1,
                            mr: 1 // Abstand zu den Icons
                          }}
                        />
                        <Box sx={{ 
                          display: 'flex', 
                          gap: 0.5,
                          alignItems: 'flex-start',
                          pt: 0.5
                        }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditNote(note)}
                            color="primary"
                            title="Notiz bearbeiten"
                            sx={{ 
                              p: 0.5,
                              '& .MuiSvgIcon-root': { fontSize: '1rem' },
                              '&:hover': {
                                backgroundColor: `${note.color}20`
                              }
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setNoteToDelete(note);
                              setDeleteNoteDialogOpen(true);
                            }}
                            color="error"
                            title="Notiz löschen"
                            sx={{ 
                              p: 0.5,
                              '& .MuiSvgIcon-root': { fontSize: '1rem' },
                              '&:hover': {
                                backgroundColor: '#ffebee'
                              }
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>
          </Grid>

        {/* Erstellte Quizze */}
          <Grid item xs={12} md={6}>
          {quizzes.length > 0 && (
            <Card sx={{ 
              borderRadius: 2.8,
              boxShadow: '0 2.8px 8.4px rgba(0,0,0,0.07)',
              bgcolor: '#fff3e0',
              height: '100%'
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#ff9800' }}>
                  Erstellte Quizze ({quizzes.length})
                </Typography>
                <List dense>
                  {quizzes.map((quiz) => (
                    <ListItem key={quiz.id} sx={{ 
                      bgcolor: '#fff', 
                      mb: 1, 
                      borderRadius: 1,
                      border: '1px solid #ffcc80'
                    }}>
                      <ListItemIcon>
                        <QuizIcon sx={{ color: '#ff9800' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={quiz.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ color: '#666' }}>
                              {quiz.description}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Fragen: {quiz.questions.length} | Zeit: {quiz.timeLimit} Min.
                            </Typography>
                          </Box>
                        }
                      />
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditQuiz(quiz)}
                          color="primary"
                          title="Quiz bearbeiten"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          color="error"
                          title="Quiz löschen"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
          </Grid>
        </Grid>

      {/* Material hinzufügen Dialog */}
      <Dialog 
        open={materialDialogOpen} 
        onClose={handleMaterialDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1, color: '#1976d2' }} />
            Material hinzufügen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Datei-Upload Bereich */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Neue Dateien hochladen
              </Typography>
              
              {/* Drag & Drop Bereich */}
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: isDragOver ? '#1976d2' : '#ccc',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: isDragOver ? '#f0f8ff' : '#fafafa',
                  transition: 'all 0.3s ease',
                  mb: 2,
                  cursor: 'pointer'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
                <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                  Dateien hierher ziehen oder klicken zum Auswählen
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Unterstützte Formate: HTML, PDF, DOCX, PPTX, TXT, MD, DOC
                </Typography>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".html,.pdf,.docx,.pptx,.txt,.md,.doc"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </Box>

              {/* Ausgewählte Dateien */}
              {selectedFiles.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Ausgewählte Dateien ({selectedFiles.length})
                  </Typography>
                  <List dense>
                    {selectedFiles.map((file, index) => (
                      <ListItem key={index} sx={{ bgcolor: '#f5f5f5', mb: 1, borderRadius: 1 }}>
                        <ListItemIcon>
                          <FileIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={formatFileSize(file.size)}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeSelectedFile(index)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Grid>

            {/* Verfügbare Dateien */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Verfügbare Dateien ({availableFiles.length})
              </Typography>
              
              {availableFiles.length > 0 ? (
                <List dense>
                  {availableFiles.map((file, index) => (
                    <ListItem key={index} sx={{ bgcolor: '#f5f5f5', mb: 1, borderRadius: 1 }}>
                      <ListItemIcon>
                        <FileIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={formatFileSize(file.size)}
                      />
                      <Box sx={{ ml: 'auto' }}>
                        <IconButton
                          size="small"
                          onClick={() => removeAvailableFile(file.name)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <FolderIcon sx={{ fontSize: 48, mb: 1 }} />
                  <Typography>Keine Dateien verfügbar</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMaterialDialogClose} color="inherit">
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddMaterial} 
            variant="contained"
            disabled={selectedFiles.length === 0}
            sx={{ bgcolor: '#1976d2' }}
          >
            Hochladen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quiz erstellen Dialog */}
      <Dialog 
        open={quizDialogOpen} 
        onClose={handleQuizDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QuizIcon sx={{ mr: 1, color: '#ff9800' }} />
            Quiz erstellen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Word-Datei hochladen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#ff9800' }}>
                Word-Datei hochladen
              </Typography>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<FileUploadIcon />}
                sx={{ mb: 2, width: '100%' }}
              >
                Word-Datei auswählen
                <input
                  type="file"
                  accept=".docx,.doc"
                  hidden
                  onChange={handleWordFileUpload}
                />
              </Button>

              {uploadedWordFile && (
                <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FileIcon sx={{ mr: 1, color: '#ff9800' }} />
                    <Typography variant="body2">
                      {uploadedWordFile.name} ({formatFileSize(uploadedWordFile.size)})
                    </Typography>
                  </Box>
                </Paper>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

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
                <InputLabel>Fragen mischen</InputLabel>
                <Select
                  value={shuffleQuestions ? 'true' : 'false'}
                  label="Fragen mischen"
                  onChange={(e) => setShuffleQuestions(e.target.value === 'true')}
                >
                  <MenuItem value="true">Ja</MenuItem>
                  <MenuItem value="false">Nein</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Antworten mischen</InputLabel>
                <Select
                  value={shuffleAnswers ? 'true' : 'false'}
                  label="Antworten mischen"
                  onChange={(e) => setShuffleAnswers(e.target.value === 'true')}
                >
                  <MenuItem value="true">Ja</MenuItem>
                  <MenuItem value="false">Nein</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleQuizDialogClose} color="inherit">
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateQuiz} 
            variant="contained" 
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
            disabled={!uploadedWordFile || !quizTitle}
          >
            Quiz erstellen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quiz bearbeiten Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 1, color: '#ff9800' }} />
            Quiz bearbeiten
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Titel des Quiz"
                value={editingQuiz?.title || ''}
                onChange={(e) => setEditingQuiz(prev => prev ? { ...prev, title: e.target.value } : null)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Zeitlimit (Minuten)"
                type="number"
                value={editingQuiz?.timeLimit || 30}
                onChange={(e) => setEditingQuiz(prev => prev ? { ...prev, timeLimit: parseInt(e.target.value) || 30 } : null)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={3}
                value={editingQuiz?.description || ''}
                onChange={(e) => setEditingQuiz(prev => prev ? { ...prev, description: e.target.value } : null)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Fragen mischen</InputLabel>
                <Select
                  value={editingQuiz?.shuffleQuestions ? 'true' : 'false'}
                  label="Fragen mischen"
                  onChange={(e) => setEditingQuiz(prev => prev ? { ...prev, shuffleQuestions: e.target.value === 'true' } : null)}
                >
                  <MenuItem value="true">Ja</MenuItem>
                  <MenuItem value="false">Nein</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Antworten mischen</InputLabel>
                <Select
                  value={editingQuiz?.shuffleAnswers ? 'true' : 'false'}
                  label="Antworten mischen"
                  onChange={(e) => setEditingQuiz(prev => prev ? { ...prev, shuffleAnswers: e.target.value === 'true' } : null)}
                >
                  <MenuItem value="true">Ja</MenuItem>
                  <MenuItem value="false">Nein</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Quiz-Fragen anzeigen */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#ff9800' }}>
                Quiz-Fragen ({editingQuiz?.questions.length || 0})
              </Typography>
              {editingQuiz?.questions.map((question, index) => (
                <Paper key={question.id} sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Frage {index + 1}: {question.question}
                  </Typography>
                  <Box sx={{ ml: 2 }}>
                    {question.options.map((option, optIndex) => (
                      <Typography 
                        key={optIndex} 
                        variant="body2" 
                        sx={{ 
                          color: option === question.correctAnswer ? '#4caf50' : '#666',
                          fontWeight: option === question.correctAnswer ? 'bold' : 'normal'
                        }}
                      >
                        {String.fromCharCode(97 + optIndex)}) {option}
                        {option === question.correctAnswer && ' ✓'}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              ))}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose} color="inherit">
            Abbrechen
          </Button>
          <Button 
            onClick={handleUpdateQuiz} 
            variant="contained" 
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notiz bearbeiten Dialog */}
      <Dialog 
        open={editNoteDialogOpen} 
        onClose={handleEditNoteDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 1, color: '#ff9800' }} />
            Notiz bearbeiten
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Überschrift"
                value={editingNote?.title || ''}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Farbe</InputLabel>
                <Select
                  value={editingNote?.color || '#4CAF50'}
                  label="Farbe"
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, color: e.target.value as string } : null)}
                >
                  {noteColors.map((color) => (
                    <MenuItem key={color.value} value={color.value}>
                      <Chip label={color.name} sx={{ backgroundColor: color.value }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notiz"
                value={editingNote?.content || ''}
                onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                multiline
                rows={3}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditNoteDialogClose} color="inherit">
            Abbrechen
          </Button>
          <Button 
            onClick={handleUpdateNote} 
            variant="contained" 
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Benachrichtigungen */}
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

      {/* Notiz löschen Dialog */}
      <Dialog
        open={deleteNoteDialogOpen}
        onClose={() => setDeleteNoteDialogOpen(false)}
        aria-labelledby="delete-note-dialog-title"
        aria-describedby="delete-note-dialog-description"
      >
        <DialogTitle id="delete-note-dialog-title">Notiz löschen</DialogTitle>
        <DialogContent>
          <Typography id="delete-note-dialog-description">
            Möchten Sie die Notiz "{noteToDelete?.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteNoteDialogOpen(false)} color="primary">
            Abbrechen
          </Button>
          <Button onClick={() => {
            if (noteToDelete) {
              deleteNote(noteToDelete.id);
              setDeleteNoteDialogOpen(false);
            }
          }} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialCreator; 