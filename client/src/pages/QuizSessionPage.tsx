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
        width="100%"
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
        width="100%"
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
        width="100%"
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
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      {/* Back Button - Top Left */}
      <Box sx={{ 
        position: 'absolute', 
        top: 16, 
        left: 16, 
        zIndex: 1000 
      }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{
            bgcolor: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2,
            px: 2,
            py: 1,
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.95)',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }
          }}
        >
          Zurück
        </Button>
      </Box>
      
      {/* Full Width Quiz Session Manager */}
      <Box sx={{ width: '100%', pt: 2 }}>
        <QuizSessionManager
          quizId={quizId!}
          teacherId={teacherId}
        />
      </Box>
    </Box>
  );
}; 