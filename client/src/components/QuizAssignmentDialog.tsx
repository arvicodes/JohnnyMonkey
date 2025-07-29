import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Alert,
  IconButton
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: { id: string }[];
  timeLimit: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
}

interface QuizAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  teacherId: string;
  onQuizAssigned: () => void;
}

const QuizAssignmentDialog: React.FC<QuizAssignmentDialogProps> = ({
  open,
  onClose,
  lessonId,
  teacherId,
  onQuizAssigned
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchAvailableQuizzes();
    }
  }, [open, teacherId]);

  const fetchAvailableQuizzes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lesson-quizzes/available/${teacherId}`);
      
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data);
      } else {
        setError('Fehler beim Laden der verfügbaren Quizze');
      }
    } catch (error) {
      setError('Fehler beim Laden der verfügbaren Quizze');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignQuiz = async (quizId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/lesson-quizzes/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonId,
          quizId
        })
      });

      if (response.ok) {
        onQuizAssigned();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Zuordnen des Quiz');
      }
    } catch (error) {
      setError('Fehler beim Zuordnen des Quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focusedIndex < quizzes.length - 1) {
        setFocusedIndex(focusedIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focusedIndex > 0) {
        setFocusedIndex(focusedIndex - 1);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (quizzes[focusedIndex]) {
        handleAssignQuiz(quizzes[focusedIndex].id);
      }
    }
  };

  useEffect(() => {
    if (open) {
      setFocusedIndex(0);
      dialogRef.current?.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onKeyDown={handleKeyDown}>
      <div ref={dialogRef} tabIndex={-1}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssignmentIcon sx={{ mr: 1, color: '#ff9800' }} />
              <Typography variant="h6">Quiz zuordnen</Typography>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body1" sx={{ mb: 2 }}>
            Wählen Sie ein Quiz aus, das Sie dieser Stunde zuordnen möchten:
          </Typography>

          {loading ? (
            <Typography>Lade Quizze...</Typography>
          ) : quizzes.length === 0 ? (
            <Alert severity="info">
              Keine Quizze verfügbar. Erstellen Sie zuerst ein Quiz im "Material & Quiz" Tab.
            </Alert>
          ) : (
            <List>
              {quizzes.map((quiz, index) => (
                <ListItem
                  key={quiz.id}
                  sx={{
                    border: focusedIndex === index ? '2px solid #ff9800' : '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: focusedIndex === index ? '#fff3e0' : 'transparent',
                    '&:hover': {
                      bgcolor: focusedIndex === index ? '#fff3e0' : '#f5f5f5'
                    }
                  }}
                  tabIndex={focusedIndex === index ? 0 : -1}
                >
                  <ListItemIcon>
                    <QuizIcon sx={{ color: '#ff9800' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={quiz.title}
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {quiz.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          Fragen: {quiz.questions.length} | Zeit: {quiz.timeLimit} Min. | 
                          Fragen mischen: {quiz.shuffleQuestions ? 'Ja' : 'Nein'} | 
                          Antworten mischen: {quiz.shuffleAnswers ? 'Ja' : 'Nein'}
                        </Typography>
                      </Box>
                    }
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleAssignQuiz(quiz.id)}
                    disabled={loading}
                    sx={{
                      bgcolor: '#ff9800',
                      '&:hover': { bgcolor: '#f57c00' }
                    }}
                  >
                    Zuordnen
                  </Button>
                </ListItem>
              ))}
            </List>
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
            Abbrechen
          </Button>
        </DialogActions>
        
        <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
            Tastatur: Pfeiltasten zum Navigieren, Enter zum Zuordnen, ESC zum Abbrechen
          </Typography>
        </Box>
      </div>
    </Dialog>
  );
};

export default QuizAssignmentDialog; 