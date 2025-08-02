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
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  LinearProgress,
  Divider,
  Paper
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  People as PeopleIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Refresh as ResetIcon,
  Visibility as ViewIcon,
  Timer as TimerIcon,
  School as SchoolIcon,
  Stop as StopIcon
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
    if (!activeSession) {
      // Wenn keine aktive Session, lade die letzten Ergebnisse
      fetchLastSessionResults();
    }
  }, [activeSession]);

  useEffect(() => {
    if (activeSession && activeSession.isActive) {
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
      } else if (response.status === 404) {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Fehler beim Laden der aktiven Session:', err);
    }
  };

  const fetchLastSessionResults = async () => {
    try {
      const response = await fetch(`/api/quiz-sessions/${quizId}/last`);
      if (response.ok) {
        const session = await response.json();
        setActiveSession(session);
      }
    } catch (err) {
      console.error('Fehler beim Laden der letzten Session:', err);
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
        setError(errorData.error || 'Session konnte nicht gestartet werden');
      }
    } catch (err) {
      setError('Fehler beim Starten der Session');
    } finally {
      setLoading(false);
    }
  };

  const handleResetParticipation = async (participationId: string, studentName: string) => {
    if (!window.confirm(`Möchten Sie die Teilnahme von ${studentName} wirklich zurücksetzen?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/quiz-participations/${participationId}/reset`, {
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
        setError(errorData.error || 'Teilnahme konnte nicht zurückgesetzt werden');
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
      const response = await fetch(`/api/quiz-participations/${participationId}/results/teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teacherId }),
      });

      if (response.ok) {
        const results = await response.json();
        setSelectedResults(results);
        setShowResults(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Auswertung konnte nicht geladen werden');
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
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            Lade Quiz-Daten...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2, borderRadius: 1, fontSize: '0.8rem' }}>
        {error}
      </Alert>
    );
  }

  const completedParticipations = activeSession?.participations?.filter(p => p.completedAt) || [];
  const activeParticipations = activeSession?.participations?.filter(p => !p.completedAt) || [];
  const totalParticipations = activeSession?.participations?.length || 0;
  const completionRate = totalParticipations > 0 ? Math.round((completedParticipations.length / totalParticipations) * 100) : 0;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      {/* Quiz Header */}
      <Card sx={{ 
        mb: 2, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
      }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Avatar sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              width: 40, 
              height: 40 
            }}>
              <SchoolIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25, fontSize: '1.1rem' }}>
                {quiz?.title}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                {quiz?.description}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<SchoolIcon />}
              label={`${quiz?.questions?.length || 0} Fragen`}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 24
              }}
            />
            <Chip 
              icon={<TimerIcon />}
              label={`${quiz?.timeLimit || 0} Min.`}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 24
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {!activeSession ? (
        /* Start Session Card */
        <Card sx={{ 
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
            <Avatar sx={{ 
              bgcolor: 'primary.main',
              width: 56,
              height: 56,
              mx: 'auto',
              mb: 2
            }}>
              <StartIcon sx={{ fontSize: 28 }} />
            </Avatar>
            
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
              Quiz Session starten
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontSize: '0.8rem' }}>
              Starten Sie eine neue Quiz-Session für Ihre Schüler
            </Typography>
            
            <Button
              variant="contained"
              size="medium"
              startIcon={<StartIcon />}
              onClick={handleStartSession}
              disabled={loading}
              sx={{
                minWidth: 140,
                height: 40,
                py: 1,
                px: 2.5,
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Session starten
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Active Session Card */
        <Card sx={{ 
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <CardContent sx={{ p: 2 }}>
            {/* Session Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ 
                  bgcolor: activeSession.isActive ? 'success.main' : 'grey.500',
                  width: 36,
                  height: 36
                }}>
                  {activeSession.isActive ? <StartIcon /> : <StopIcon />}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {activeSession.isActive ? 'Aktive Session' : 'Letzte Session'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {activeSession.isActive ? 'Gestartet' : 'Beendet'}: {new Date(activeSession.isActive ? activeSession.startedAt : (activeSession.endedAt || activeSession.startedAt)).toLocaleString('de-DE')}
                  </Typography>
                </Box>
              </Box>
              
              <Chip 
                label={activeSession.isActive ? "Aktiv" : "Beendet"} 
                color={activeSession.isActive ? "success" : "default"}
                icon={activeSession.isActive ? <CheckIcon /> : <CancelIcon />}
                size="small"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 24
                }}
              />
            </Box>

            {/* Participation Stats */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <PeopleIcon color="primary" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                  Teilnehmer: {totalParticipations}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    Fortschritt
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
                    {completionRate}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={completionRate} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #4caf50 0%, #45a049 100%)',
                      borderRadius: 3
                    }
                  }} 
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<CheckIcon />}
                  label={`${completedParticipations.length} Abgeschlossen`}
                  color="success"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                />
                <Chip 
                  icon={<TimerIcon />}
                  label={`${activeParticipations.length} Aktiv`}
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Participants List */}
            {activeSession.participations && activeSession.participations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}>
                  <PeopleIcon color="primary" sx={{ fontSize: 16 }} />
                  Teilnehmer
                </Typography>
                
                <List sx={{ p: 0 }}>
                  {activeSession.participations.map((participation) => {
                    const isCompleted = !!participation.completedAt;
                    const percentage = participation.maxScore && participation.score 
                      ? Math.round((participation.score / participation.maxScore) * 100) 
                      : 0;
                    
                    return (
                      <Paper 
                        key={participation.id} 
                        sx={{ 
                          mb: 1, 
                          borderRadius: 1,
                          background: isCompleted 
                            ? 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
                            : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                          border: `1px solid ${isCompleted ? '#4caf50' : '#ff9800'}`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 3px 8px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <ListItem sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                            <Avatar sx={{ 
                              bgcolor: isCompleted ? '#4caf50' : '#ff9800',
                              width: 28,
                              height: 28
                            }}>
                              {participation.student.name.charAt(0).toUpperCase()}
                            </Avatar>
                            
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25, fontSize: '0.75rem' }}>
                                {participation.student.name}
                              </Typography>
                              
                              {isCompleted ? (
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.65rem' }}>
                                    {participation.score}/{participation.maxScore} Punkte ({percentage}%)
                                  </Typography>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={percentage} 
                                    sx={{ 
                                      height: 4, 
                                      borderRadius: 2,
                                      backgroundColor: 'rgba(0,0,0,0.1)',
                                      '& .MuiLinearProgress-bar': {
                                        background: percentage >= 70 
                                          ? 'linear-gradient(90deg, #4caf50 0%, #45a049 100%)'
                                          : percentage >= 50
                                          ? 'linear-gradient(90deg, #ff9800 0%, #f57c00 100%)'
                                          : 'linear-gradient(90deg, #f44336 0%, #d32f2f 100%)',
                                        borderRadius: 2
                                      }
                                    }} 
                                  />
                                </Box>
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                  Noch nicht abgeschlossen
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              size="small"
                              label={isCompleted ? 'Abgeschlossen' : 'Aktiv'}
                              color={isCompleted ? 'success' : 'warning'}
                              icon={isCompleted ? <CheckIcon /> : <TimerIcon />}
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.6rem',
                                height: 20
                              }}
                            />
                            
                            {isCompleted && (
                              <>
                                <Tooltip title="Auswertung anzeigen">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleViewResults(participation.id, participation.student.name)}
                                    disabled={loading}
                                    sx={{ 
                                      width: 24, 
                                      height: 24,
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      '&:hover': {
                                        bgcolor: 'primary.dark',
                                        transform: 'scale(1.05)',
                                        transition: 'all 0.2s ease'
                                      }
                                    }}
                                  >
                                    <ViewIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Teilnahme zurücksetzen">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handleResetParticipation(participation.id, participation.student.name)}
                                    disabled={loading}
                                    sx={{ 
                                      width: 24, 
                                      height: 24,
                                      bgcolor: 'warning.main',
                                      color: 'white',
                                      '&:hover': {
                                        bgcolor: 'warning.dark',
                                        transform: 'scale(1.05)',
                                        transition: 'all 0.2s ease'
                                      }
                                    }}
                                  >
                                    <ResetIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </ListItem>
                      </Paper>
                    );
                  })}
                </List>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic', textAlign: 'center', fontSize: '0.65rem' }}>
              Die Session läuft endlos. Schüler können das Quiz nur einmal bearbeiten.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Results Modal */}
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