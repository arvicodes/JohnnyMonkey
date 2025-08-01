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
import QuizPlayer from '../components/QuizPlayer';

interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  options: string[];
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  questions: QuizQuestion[];
}

export const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) {
        setError('Quiz ID ist erforderlich');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (!response.ok) {
          throw new Error('Quiz nicht gefunden');
        }
        const quizData = await response.json();
        setQuiz(quizData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden des Quiz');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleClose = () => {
    // Versuche den Tab zu schließen, falls er von JavaScript geöffnet wurde
    try {
      if (window.opener && !window.opener.closed) {
        window.close();
      } else {
        // Fallback: Navigiere zur Dashboard-Seite
        window.location.href = '/dashboard';
      }
    } catch (error) {
      // Falls window.close() nicht erlaubt ist, navigiere zur Dashboard-Seite
      window.location.href = '/dashboard';
    }
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
          onClick={() => navigate(-1)}
        >
          Zurück
        </Button>
      </Box>
    );
  }

  if (!quiz) {
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
          onClick={() => navigate(-1)}
        >
          Zurück
        </Button>
      </Box>
    );
  }

  return <QuizPlayer quiz={quiz} onClose={handleClose} />;
}; 