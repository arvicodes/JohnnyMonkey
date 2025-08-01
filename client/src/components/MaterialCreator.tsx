import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Chip,
  CircularProgress
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
  DragIndicator as DragIcon,
  ContentCopy as CopyIcon
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
  authorId: string;
  isPrivate: boolean;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

const MaterialCreator: React.FC<MaterialCreatorProps> = ({ teacherId }) => {
  console.log('MaterialCreator received teacherId:', teacherId, 'type:', typeof teacherId);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Quiz states
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
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



  const handleMaterialDialogOpen = () => {
    setMaterialDialogOpen(true);
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
      setQuizzesLoading(true);
      const response = await fetch(`/api/quizzes/teacher/${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setQuizzesLoading(false);
    }
  }, [teacherId]);

  // Load quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleQuizDialogOpen = () => {
    setQuizDialogOpen(true);
    setUploadedWordFile(null);
    setQuizTitle('');
    setQuizDescription('Eine neue Frage beginnt immer mit einem Listenpunkt (•, -, *, oder 1.). Die möglichen Antworten darunter sind mit a), b) etc. bezeichnet. Die erste Antwort ist immer die richtige. Unterstützte Dateiformate: .docx, .doc, .txt');
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
      console.log('Creating quiz with teacherId:', teacherId);
      
      if (!uploadedWordFile) {
        showSnackbar('Bitte wählen Sie eine Datei aus (.docx, .doc, oder .txt)', 'error');
        return;
      }

      // 1. Word-Datei hochladen
      const formData = new FormData();
      formData.append('wordFile', uploadedWordFile);

      console.log('Uploading Word file:', uploadedWordFile.name);
      const uploadResponse = await fetch('/api/materials/word-upload', {
        method: 'POST',
        body: formData
      });

      console.log('Upload response status:', uploadResponse.status);
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        console.error('Upload error:', error);
        showSnackbar(error.error || 'Fehler beim Hochladen der Datei', 'error');
        return;
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload result:', uploadResult);

      // 2. Quiz erstellen
      const quizData = {
        teacherId,
        sourceFile: uploadResult.sourceFile,
        title: quizTitle,
        description: quizDescription,
        timeLimit: quizTimeLimit,
        shuffleQuestions,
        shuffleAnswers
      };
      
      console.log('Creating quiz with data:', quizData);
      const quizResponse = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData)
      });

      console.log('Quiz response status:', quizResponse.status);
      if (quizResponse.ok) {
        const quizResult = await quizResponse.json();
        console.log('Quiz created successfully:', quizResult);
        showSnackbar('Quiz erfolgreich erstellt', 'success');
        handleQuizDialogClose();
        fetchQuizzes(); // Aktualisiere die Quiz-Liste
      } else {
        const error = await quizResponse.json();
        console.error('Quiz creation error:', error);
        showSnackbar(error.error || 'Fehler beim Erstellen des Quiz', 'error');
      }
    } catch (error) {
      console.error('Exception in handleCreateQuiz:', error);
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

  // React Query für Notizen
  const queryClient = useQueryClient();
  
  // Fetch notes
  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['notes', teacherId],
    queryFn: async (): Promise<Note[]> => {
      const response = await fetch(`/api/notes?userId=${teacherId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return response.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: { title: string; content: string; authorId: string; isPrivate: boolean; tags?: string }) => {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteData.title,
          content: noteData.content,
          authorId: noteData.authorId,
          isPrivate: noteData.isPrivate,
          tags: noteData.tags
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create note');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchNotes();
      setNewNoteTitle('');
      setNewNoteContent('');
      setNewNoteColor('#4CAF50');
      setShowNoteForm(false);
      showSnackbar('Notiz erfolgreich erstellt', 'success');
    },
    onError: () => {
      showSnackbar('Fehler beim Erstellen der Notiz', 'error');
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, noteData }: { id: string; noteData: { title: string; content: string; authorId: string; isPrivate: boolean; tags?: string } }) => {
      const response = await fetch(`/api/notes/${id}?userId=${noteData.authorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteData.title,
          content: noteData.content,
          isPrivate: noteData.isPrivate,
          tags: noteData.tags
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update note');
      }
      return response.json();
    },
    onSuccess: () => {
      refetchNotes();
      setEditNoteDialogOpen(false);
      setEditingNote(null);
      showSnackbar('Notiz erfolgreich aktualisiert', 'success');
    },
    onError: () => {
      showSnackbar('Fehler beim Aktualisieren der Notiz', 'error');
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async ({ id, authorId }: { id: string; authorId: string }) => {
      const response = await fetch(`/api/notes/${id}?userId=${authorId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      refetchNotes();
      setDeleteNoteDialogOpen(false);
      setNoteToDelete(null);
      showSnackbar('Notiz erfolgreich gelöscht', 'success');
    },
    onError: () => {
      showSnackbar('Fehler beim Löschen der Notiz', 'error');
    },
  });

  // Reorder notes mutation
  const reorderNotesMutation = useMutation({
    mutationFn: async ({ userId, noteIds }: { userId: string; noteIds: string[] }) => {
      const requestBody = { noteIds };
      console.log('Sending reorder request:', { userId, noteIds });
      console.log('Request body stringified:', JSON.stringify(requestBody));
      
      console.log('Making fetch request to: /api/notes/reorder');
      console.log('Request method: PUT');
      console.log('Request headers:', { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
      
      const response = await fetch(`/api/notes/reorder?userId=${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response received:', response);
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      
      console.log('Reorder response status:', response.status);
      console.log('Reorder response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Reorder error response:', errorText);
        throw new Error(`Failed to reorder notes: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      console.log('Reorder success response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Reorder mutation successful, refetching notes');
      refetchNotes();
    },
    onError: (error) => {
      console.error('Reorder mutation error:', error);
      showSnackbar('Fehler beim Umsortieren der Notizen', 'error');
    },
  });

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



  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Notizzettel Funktionen
  const addNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    
    createNoteMutation.mutate({
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      authorId: teacherId,
      isPrivate: true,
      tags: newNoteColor // Verwende die Farbe als Tag
    });
  };

  const deleteNote = async (noteId: string) => {
    deleteNoteMutation.mutate({ id: noteId, authorId: teacherId });
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
    setDeleteNoteDialogOpen(true);
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
    
    console.log('Drag & Drop:', { draggedNoteId, draggedIndex, targetIndex, notesLength: notes.length });
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;
    
    const updatedNotes = [...notes];
    const [draggedNote] = updatedNotes.splice(draggedIndex, 1);
    updatedNotes.splice(targetIndex, 0, draggedNote);
    
    console.log('Updated notes order:', updatedNotes.map(n => ({ id: n.id, title: n.title })));
    
    // Aktualisiere die Reihenfolge in der Datenbank
    updateNoteOrder(updatedNotes);
  };

  // Funktion zum Aktualisieren der Notizen-Reihenfolge
  const updateNoteOrder = async (reorderedNotes: Note[]) => {
    const noteIds = reorderedNotes.map(note => note.id);
    console.log('Updating note order:', { teacherId, noteIds, teacherIdType: typeof teacherId });
    if (!teacherId) {
      console.error('teacherId is missing or empty');
      showSnackbar('Fehler: Benutzer-ID fehlt', 'error');
      return;
    }
    reorderNotesMutation.mutate({ userId: teacherId, noteIds });
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
    
    updateNoteMutation.mutate({
      id: editingNote.id,
      noteData: {
        title: editingNote.title,
        content: editingNote.content,
        authorId: teacherId,
        isPrivate: true,
        tags: editingNote.tags || '#4CAF50' // Verwende die Farbe als Tag
      }
    });
  };

  // Funktion zum Kopieren des Notiz-Inhalts in die Zwischenablage
  const handleCopyNoteContent = async (note: Note) => {
    try {
      await navigator.clipboard.writeText(note.content);
      showSnackbar('Inhalt in die Zwischenablage kopiert!', 'success');
    } catch (error) {
      console.error('Fehler beim Kopieren:', error);
      showSnackbar('Fehler beim Kopieren in die Zwischenablage', 'error');
    }
  };

  return (
    <Box sx={{ p: 0.8 }}>
      <Typography variant="h5" component="h2" sx={{ 
        fontWeight: 'bold', 
        color: '#2C3E50',
        mb: 1.2,
        fontSize: '0.9rem'
      }}>
        Material & Quiz erstellen
      </Typography>

      <Grid container spacing={1.2}>
        {/* Material hinzufügen Box */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 1.5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            bgcolor: '#ffffff',
            height: '100%'
          }}>
            <CardContent sx={{ p: 1.2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.2 }}>
                <DescriptionIcon sx={{ mr: 0.8, color: '#1976D2', fontSize: 20 }} />
                <Typography variant="h6" component="h3" sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976D2',
                  fontSize: '0.8rem'
                }}>
                  Material hinzufügen
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1.2, color: '#7F8C8D', fontSize: '0.75rem' }}>
                Laden Sie Dateien aus der Dateistruktur und speichern Sie diese im Material-Ordner.
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleMaterialDialogOpen}
                sx={{
                  bgcolor: '#1976D2',
                  '&:hover': { bgcolor: '#1565c0' },
                  borderRadius: 1.2,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  py: 0.4,
                  px: 1
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
            borderRadius: 1.5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            bgcolor: '#ffffff',
            height: '100%'
          }}>
            <CardContent sx={{ p: 1.2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.2 }}>
                <QuizIcon sx={{ mr: 0.8, color: '#F57C00', fontSize: 20 }} />
                <Typography variant="h6" component="h3" sx={{ 
                  fontWeight: 'bold', 
                  color: '#F57C00',
                  fontSize: '0.8rem'
                }}>
                  Quiz erstellen
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1.2, color: '#7F8C8D', fontSize: '0.75rem' }}>
                Erstellen Sie Quizze aus Word-Dateien mit automatischer Fragen-Generierung.
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleQuizDialogOpen}
                sx={{
                  bgcolor: '#F57C00',
                  '&:hover': { bgcolor: '#E65100' },
                  borderRadius: 1.2,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  py: 0.4,
                  px: 1
                }}
              >
                Quiz erstellen
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quiz-Liste und Notizzettel */}
        <Grid container spacing={1.2} sx={{ mt: 0.3 }}>
        {/* Notizzettel-Pinwand */}
          <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 1.5,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            bgcolor: '#ffffff',
            height: '100%'
          }}>
            <CardContent sx={{ p: 1.2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.2 }}>
                <NoteIcon sx={{ mr: 0.8, color: '#2E7D32', fontSize: 20 }} />
                <Typography variant="h6" component="h3" sx={{ 
                  fontWeight: 'bold', 
                  color: '#2E7D32',
                  fontSize: '0.8rem'
                }}>
                  Notizzettel ({notes.length})
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1.2, color: '#7F8C8D', fontSize: '0.75rem' }}>
                Fügen Sie kurze Notizen hinzu, um wichtige Informationen zu notieren.
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowNoteForm(!showNoteForm)}
                sx={{
                  bgcolor: '#2E7D32',
                  '&:hover': { bgcolor: '#1B5E20' },
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  mb: 1.2,
                  fontSize: '0.7rem',
                  py: 0.3,
                  px: 1
                }}
              >
                {showNoteForm ? 'Abbrechen' : 'Notiz hinzufügen'}
              </Button>

              {/* Formular für neue Notiz */}
              {showNoteForm && (
                <Paper sx={{ 
                  p: 1.2, 
                  mb: 1.2, 
                  bgcolor: '#f8f9fa', 
                  borderRadius: 1,
                  border: '1px solid #e0e0e0'
                }}>
                  <TextField
                    fullWidth
                    label="Überschrift"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    size="small"
                    sx={{ mb: 1.2 }}
                    placeholder="Kurze Überschrift..."
                  />
                  <TextField
                    fullWidth
                    label="Notiz"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    multiline
                    rows={2}
                    size="small"
                    sx={{ mb: 1.2 }}
                    placeholder="Deine Notiz hier..."
                  />
                  <FormControl fullWidth sx={{ mb: 1.2 }}>
                    <InputLabel>Farbe</InputLabel>
                    <Select
                      value={newNoteColor}
                      label="Farbe"
                      onChange={(e) => setNewNoteColor(e.target.value as string)}
                      size="small"
                    >
                      {noteColors.map((color) => (
                        <MenuItem key={color.value} value={color.value}>
                          <Chip label={color.name} sx={{ backgroundColor: color.value, fontSize: '0.65rem' }} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ display: 'flex', gap: 0.6, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setShowNoteForm(false);
                        setNewNoteTitle('');
                        setNewNoteContent('');
                        setNewNoteColor('#4CAF50'); // Zurücksetzen auf Standardfarbe
                      }}
                      sx={{ borderRadius: 1, textTransform: 'none', fontSize: '0.7rem' }}
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
                        borderRadius: 1,
                        textTransform: 'none',
                        fontSize: '0.7rem'
                      }}
                    >
                      Hinzufügen
                    </Button>
                  </Box>
                </Paper>
              )}

              {/* Anzeige der Notizen */}
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {notes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 3, fontSize: '0.75rem' }}>
                    Noch keine Notizen vorhanden. Füge deine erste Notiz hinzu!
                  </Typography>
                ) : (
                  <List dense>
                    {notes.map((note, index) => (
                      <ListItem
                        key={note.id}
                        sx={{ 
                          background: `linear-gradient(135deg, ${note.tags || '#4CAF50'}15 0%, ${note.tags || '#4CAF50'}25 100%)`,
                          border: `1px solid ${note.tags || '#4CAF50'}40`,
                          mb: 0.8, 
                          borderRadius: 0.8,
                          position: 'relative',
                          pr: 0.8, // Weniger Padding rechts für Icons
                          pl: 1.5, // Mehr Padding links für Text
                          cursor: 'grab',
                          '&:active': {
                            cursor: 'grabbing'
                          },
                          '&:hover': {
                            background: `linear-gradient(135deg, ${note.tags || '#4CAF50'}25 0%, ${note.tags || '#4CAF50'}35 100%)`,
                            border: `1px solid ${note.tags || '#4CAF50'}60`
                          }
                        }}
                        draggable
                        onDragStart={(e) => handleNoteDragStart(e, note.id)}
                        onDragOver={handleNoteDragOver}
                        onDrop={(e) => handleNoteDrop(e, index)}
                      >
                        <ListItemIcon sx={{ minWidth: 28, mr: 0.8 }}>
                          <DragIcon sx={{ color: note.tags || '#4CAF50', fontSize: 16 }} />
                        </ListItemIcon>
                        <Box sx={{ 
                          flex: 1,
                          mr: 0.8 // Abstand zu den Icons
                        }}>
                          {/* Primary content */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.4 }}>
                            <Typography variant="subtitle2" component="div" sx={{ 
                              fontWeight: 'bold', 
                              color: note.tags || '#4CAF50',
                              fontSize: '0.8rem'
                            }}>
                              {note.title}
                            </Typography>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: note.tags || '#4CAF50',
                                border: '1px solid #fff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }}
                            />
                          </Box>
                          {/* Secondary content */}
                          <Box>
                            <Typography variant="body2" component="div" sx={{ 
                              color: '#333', 
                              mb: 0.4,
                              lineHeight: 1.3,
                              whiteSpace: 'pre-wrap',
                              fontSize: '0.75rem'
                            }}>
                              {note.content}
                            </Typography>
                            <Typography variant="caption" component="div" sx={{ 
                              color: '#666',
                              fontSize: '0.65rem'
                            }}>
                              {new Date(note.createdAt).toLocaleDateString('de-DE')} {new Date(note.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: 0.3,
                          alignItems: 'flex-start',
                          pt: 0.3
                        }}>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyNoteContent(note)}
                            color="info"
                            title="Inhalt kopieren"
                            sx={{ 
                              p: 0.6,
                              '& .MuiSvgIcon-root': { fontSize: '1rem' },
                              '&:hover': {
                                backgroundColor: '#e3f2fd'
                              }
                            }}
                          >
                            <CopyIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditNote(note)}
                            color="primary"
                            title="Notiz bearbeiten"
                            sx={{ 
                              p: 0.6,
                              '& .MuiSvgIcon-root': { fontSize: '1rem' },
                              '&:hover': {
                                backgroundColor: `${note.tags || '#4CAF50'}20`
                              }
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteNote(note)}
                            color="error"
                            title="Notiz löschen"
                            sx={{ 
                              p: 0.6,
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
              borderRadius: 1.5,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              bgcolor: '#fff3e0',
              height: '100%'
            }}>
              <CardContent sx={{ p: 1.2 }}>
                <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 'bold', color: '#ff9800', fontSize: '0.8rem' }}>
                  Erstellte Quizze ({quizzes.length})
                </Typography>
                {quizzesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                    <CircularProgress size={20} sx={{ color: '#ff9800' }} />
                  </Box>
                ) : (
                <List dense>
                  {quizzes.map((quiz) => (
                    <ListItem key={quiz.id} sx={{ 
                      bgcolor: '#fff', 
                      mb: 0.8, 
                      borderRadius: 0.8,
                      border: '1px solid #ffcc80',
                      p: 0.8
                    }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <QuizIcon sx={{ color: '#ff9800', fontSize: 18 }} />
                      </ListItemIcon>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold', color: '#333', fontSize: '0.8rem' }}>
                          {quiz.title}
                        </Typography>
                        <Box>
                          <Typography variant="body2" component="div" sx={{ color: '#666', fontSize: '0.75rem' }}>
                            {quiz.description}
                          </Typography>
                          <Typography variant="caption" component="div" sx={{ color: '#666', fontSize: '0.65rem' }}>
                            Fragen: {quiz.questions.length} | Zeit: {quiz.timeLimit} Min.
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: 0.3,
                        alignItems: 'flex-start',
                        pt: 0.3
                      }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditQuiz(quiz)}
                          color="primary"
                          title="Quiz bearbeiten"
                          sx={{ 
                            p: 0.6,
                            '& .MuiSvgIcon-root': { fontSize: '1rem' },
                            '&:hover': {
                              backgroundColor: '#e3f2fd'
                            }
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          color="error"
                          title="Quiz löschen"
                          sx={{ 
                            p: 0.6,
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
            <Grid item xs={12}>
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


          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleMaterialDialogClose} 
            color="inherit"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleMaterialDialogClose();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleAddMaterial} 
            variant="contained"
            disabled={selectedFiles.length === 0}
            sx={{ bgcolor: '#1976d2' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedFiles.length > 0) {
                handleAddMaterial();
              }
            }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (uploadedWordFile && quizTitle) {
                      handleCreateQuiz();
                    }
                  }
                }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (uploadedWordFile && quizTitle) {
                      handleCreateQuiz();
                    }
                  }
                }}
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
          <Button 
            onClick={handleQuizDialogClose} 
            color="inherit"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleQuizDialogClose();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleCreateQuiz} 
            variant="contained" 
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
            disabled={!uploadedWordFile || !quizTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && uploadedWordFile && quizTitle) {
                handleCreateQuiz();
              }
            }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUpdateQuiz();
                  }
                }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUpdateQuiz();
                  }
                }}
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
          <Button 
            onClick={handleEditDialogClose} 
            color="inherit"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditDialogClose();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleUpdateQuiz} 
            variant="contained" 
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdateQuiz();
              }
            }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUpdateNote();
                  }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Farbe</InputLabel>
                <Select
                  value={editingNote?.tags || '#4CAF50'}
                  label="Farbe"
                  onChange={(e) => setEditingNote(prev => prev ? { ...prev, tags: e.target.value as string } : null)}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleUpdateNote();
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleEditNoteDialogClose} 
            color="inherit"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEditNoteDialogClose();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleUpdateNote} 
            variant="contained" 
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#f57c00' } }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUpdateNote();
              }
            }}
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
          <Button 
            onClick={() => setDeleteNoteDialogOpen(false)} 
            color="primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setDeleteNoteDialogOpen(false);
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={() => {
              if (noteToDelete) {
                deleteNote(noteToDelete.id);
              }
            }} 
            color="error" 
            variant="contained"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (noteToDelete) {
                  deleteNote(noteToDelete.id);
                }
              }
            }}
          >
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialCreator; 