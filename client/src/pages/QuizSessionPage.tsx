import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { QuizSessionManager } from '../components/QuizSessionManager';

interface Quiz {
  id: string;
  title: string;
  description: string;
  teacherId: string;
}

export const QuizSessionPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    // Get teacher ID from localStorage or other auth mechanism
    const storedTeacherId = localStorage.getItem('teacherId');
    if (storedTeacherId) {
      setTeacherId(storedTeacherId);
    } else {
      setError('Lehrer-ID nicht gefunden. Bitte melden Sie sich erneut an.');
      setLoading(false);
      return;
    }

    const fetchQuiz = async () => {
      if (!quizId) {
        setError('Quiz-ID ist erforderlich');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) {
          throw new Error('Quiz nicht gefunden');
        }
        const quizData = await response.json();
        
        // Verify that the quiz belongs to the teacher
        if (quizData.teacherId !== storedTeacherId) {
          throw new Error('Sie haben keine Berechtigung für dieses Quiz');
        }
        
        setQuiz(quizData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden des Quiz');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Zurück
        </Button>
      </Box>
    );
  }

  if (!quiz || !teacherId) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <Typography variant="h6" color="text.secondary">
          Quiz nicht gefunden
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Zurück
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Zurück
        </Button>
        <Typography variant="h4">
          {quiz.title}
        </Typography>
      </Box>
      
      {quiz.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {quiz.description}
        </Typography>
      )}
      
      <QuizSessionManager
        quizId={quizId!}
        teacherId={teacherId}
      />
    </Box>
  );
}; 