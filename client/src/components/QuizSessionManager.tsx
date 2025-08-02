import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  People as PeopleIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Refresh as ResetIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { QuizResultsModal } from './QuizResultsModal';

interface QuizSessionManagerProps {
  quizId: string;
  teacherId: string;
}

interface QuizSession {
  id: string;
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
  participations?: Array<{
    id: string;
    student: {
      id: string;
      name: string;
    };
    score?: number;
    maxScore?: number;
    completedAt?: string;
  }>;
}

export const QuizSessionManager: React.FC<QuizSessionManagerProps> = ({
  quizId,
  teacherId
}) => {
  const [quiz, setQuiz] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [selectedResults, setSelectedResults] = useState<any>(null);

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(fetchActiveSession, 5000); // Alle 5 Sekunden aktualisieren
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const fetchQuizData = async () => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}`);
      if (response.ok) {
        const quizData = await response.json();
        setQuiz(quizData);
        await fetchActiveSession();
      } else {
        setError('Quiz konnte nicht geladen werden');
      }
    } catch (err) {
      setError('Fehler beim Laden des Quiz');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const response = await fetch(`/api/quiz-sessions/${quizId}/active`);
      if (response.ok) {
        const session = await response.json();
        setActiveSession(session);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Error fetching active session:', err);
    }
  };

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quiz-sessions/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      if (response.ok) {
        await fetchActiveSession();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Starten der Session');
      }
    } catch (err) {
      setError('Fehler beim Starten der Session');
    } finally {
      setLoading(false);
    }
  };

  const handleResetParticipation = async (participationId: string, studentName: string) => {
    if (!window.confirm(`Möchten Sie die Teilnahme von "${studentName}" wirklich zurücksetzen? Der Schüler kann dann das Quiz erneut bearbeiten.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/quiz-participations/${participationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      if (response.ok) {
        // Aktualisiere die Session-Daten
        await fetchActiveSession();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Zurücksetzen der Teilnahme');
      }
    } catch (err) {
      setError('Fehler beim Zurücksetzen der Teilnahme');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (participationId: string, studentName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quiz-participations/${participationId}/results`);
      if (response.ok) {
        const results = await response.json();
        setSelectedResults({
          ...results,
          studentName: studentName
        });
        setShowResults(true);
      } else {
        setError('Auswertung konnte nicht geladen werden');
      }
    } catch (err) {
      setError('Fehler beim Laden der Auswertung');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {quiz?.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {quiz?.description}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {quiz?.questions?.length || 0} Fragen • {quiz?.timeLimit || 0} Minuten Zeitlimit
          </Typography>
        </CardContent>
      </Card>

      {!activeSession ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quiz-Session starten
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Starten Sie eine Session, damit Ihre Schüler das Quiz bearbeiten können.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<StartIcon />}
              onClick={handleStartSession}
              disabled={loading}
            >
              Session starten
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Aktive Session
              </Typography>
              <Chip 
                label="Aktiv" 
                color="success" 
                icon={<CheckIcon />}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gestartet: {new Date(activeSession.startedAt).toLocaleString('de-DE')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PeopleIcon color="primary" />
              <Typography variant="body2">
                {activeSession.participations?.length || 0} Teilnehmer
              </Typography>
            </Box>

            {activeSession.participations && activeSession.participations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Teilnehmer:
                </Typography>
                <List dense>
                  {activeSession.participations.map((participation) => (
                    <ListItem key={participation.id} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      px: 1
                    }}>
                      <ListItemText
                        primary={participation.student.name}
                        secondary={
                          participation.completedAt 
                            ? `Abgeschlossen: ${participation.score}/${participation.maxScore} Punkte`
                            : 'Noch nicht abgeschlossen'
                        }
                        sx={{ flex: 1, mr: 2 }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          size="small"
                          label={participation.completedAt ? 'Abgeschlossen' : 'Aktiv'}
                          color={participation.completedAt ? 'success' : 'warning'}
                          icon={participation.completedAt ? <CheckIcon /> : <CancelIcon />}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                        {participation.completedAt && (
                          <>
                            <Tooltip title="Auswertung anzeigen">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleViewResults(participation.id, participation.student.name)}
                                disabled={loading}
                                sx={{ 
                                  width: 28, 
                                  height: 28,
                                  '&:hover': {
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.1s ease'
                                  }
                                }}
                              >
                                <ViewIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Teilnahme zurücksetzen">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleResetParticipation(participation.id, participation.student.name)}
                                disabled={loading}
                                sx={{ 
                                  width: 28, 
                                  height: 28,
                                  '&:hover': {
                                    transform: 'scale(1.05)',
                                    transition: 'transform 0.1s ease'
                                  }
                                }}
                              >
                                <ResetIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              Die Session läuft endlos. Schüler können das Quiz nur einmal bearbeiten.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Auswertungs-Modal */}
      {showResults && selectedResults && (
        <QuizResultsModal
          open={showResults}
          onClose={() => {
            setShowResults(false);
            setSelectedResults(null);
          }}
          results={selectedResults}
        />
      )}
    </Box>
  );
}; 