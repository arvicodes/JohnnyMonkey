import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { QuizParticipationPlayer } from '../components/QuizParticipationPlayer';

interface QuizSession {
  id: string;
  isActive: boolean;
  startedAt: string;
  quiz: {
    id: string;
    title: string;
    description: string;
  };
}

export const QuizParticipationPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Get student ID from localStorage or other auth mechanism
    const storedStudentId = localStorage.getItem('studentId');
    if (storedStudentId) {
      setStudentId(storedStudentId);
    } else {
      setError('Schüler-ID nicht gefunden. Bitte melden Sie sich erneut an.');
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      if (!sessionId) {
        setError('Session-ID ist erforderlich');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching session data for sessionId:', sessionId);
        const response = await fetch(`/api/quiz-sessions/session/${sessionId}`);
        console.log('Session response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Keine Quiz-Session gefunden');
        }
        const sessionData = await response.json();
        console.log('Session data:', sessionData);
        setSession(sessionData);
      } catch (err) {
        console.error('Error fetching session:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleClose = () => {
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
          onClick={() => navigate(-1)}
        >
          Zurück
        </Button>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Keine aktive Quiz-Session
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Es läuft derzeit keine aktive Quiz-Session. Bitte warten Sie, bis der Lehrer eine Session startet.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
            >
              Zurück
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!studentId) {
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
          Schüler-ID nicht gefunden
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

  return (
    <Box sx={{ p: 3 }}>
      <QuizParticipationPlayer
        sessionId={sessionId!}
        studentId={studentId}
        onClose={handleClose}
      />
    </Box>
  );
}; 