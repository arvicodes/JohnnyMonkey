import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  CircularProgress,
  Avatar,
  LinearProgress,
  IconButton,
  Fade,
  Zoom,
  Grow
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Star as StarIcon
} from '@mui/icons-material';

interface AdventCalendarDoor {
  id: string;
  day: number;
  year: number;
  funFact: string;
  question: string;
  correctAnswer: string;
  explanation?: string;
  isOpenable: boolean;
  isOpened: boolean;
  hasSubmission: boolean;
  mySubmission?: {
    id: string;
    answer: string;
    isCorrect: boolean;
    submittedAt: string;
  };
}

interface DoorResult {
  id: string;
  studentName: string;
  avatarEmoji: string;
  isCorrect: boolean;
  submittedAt: string;
  isMine: boolean;
  answer: string;
}

interface DoorResults {
  door: {
    id: string;
    day: number;
    funFact: string;
    question: string;
    explanation?: string;
  };
  statistics: {
    totalSubmissions: number;
    correctSubmissions: number;
    incorrectSubmissions: number;
    correctPercentage: number;
  };
  results: DoorResult[];
}

interface AdventCalendarProps {
  userId: string;
}

const AdventCalendar: React.FC<AdventCalendarProps> = ({ userId }) => {
  const [doors, setDoors] = useState<AdventCalendarDoor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoor, setSelectedDoor] = useState<AdventCalendarDoor | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doorResults, setDoorResults] = useState<DoorResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [refreshingResults, setRefreshingResults] = useState(false);
  const [openingDoor, setOpeningDoor] = useState<string | null>(null);

  const loginCode = localStorage.getItem('loginCode');

  useEffect(() => {
    fetchDoors();
  }, []);

  const fetchDoors = async () => {
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const response = await fetch(`/api/advent-calendar/doors?year=${year}`, {
        headers: {
          'x-login-code': loginCode || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Geladene Türchen:', data);
        console.log('Anzahl Türchen:', data.length);
        if (Array.isArray(data) && data.length > 0) {
          setDoors(data);
        } else {
          console.warn('Keine Türchen in der Antwort erhalten');
          setDoors([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fehler beim Laden der Türchen:', response.status, errorData);
        setDoors([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Türchen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoorClick = async (door: AdventCalendarDoor) => {
    if (!door.isOpenable) {
      return;
    }

    // Öffnungs-Animation starten
    setOpeningDoor(door.id);
    
    // Kurze Verzögerung für Animation
    setTimeout(async () => {
      setSelectedDoor(door);
      setAnswer('');
      
      // Lade das vollständige Türchen
      try {
        const response = await fetch(`/api/advent-calendar/doors/${door.id}`, {
          headers: {
            'x-login-code': loginCode || ''
          }
        });

        if (response.ok) {
          const fullDoor = await response.json();
          setSelectedDoor(fullDoor);
          if (fullDoor.mySubmission) {
            setAnswer(fullDoor.mySubmission.answer || '');
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden des Türchens:', error);
      } finally {
        setOpeningDoor(null);
      }
    }, 300);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedDoor || !answer.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/advent-calendar/doors/${selectedDoor.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode || ''
        },
        body: JSON.stringify({ answer: answer.trim() })
      });

      if (response.ok) {
        const submission = await response.json();
        // Aktualisiere das Türchen in der Liste
        setDoors(prevDoors =>
          prevDoors.map(door =>
            door.id === selectedDoor.id
              ? {
                  ...door,
                  isOpened: true,
                  hasSubmission: true,
                  mySubmission: {
                    id: submission.id,
                    answer: submission.answer || answer.trim(),
                    isCorrect: submission.isCorrect,
                    submittedAt: submission.submittedAt
                  }
                }
              : door
          )
        );
        setSelectedDoor({
          ...selectedDoor,
          isOpened: true,
          hasSubmission: true,
          mySubmission: {
            id: submission.id,
            answer: submission.answer || answer.trim(),
            isCorrect: submission.isCorrect,
            submittedAt: submission.submittedAt
          }
        });
        // Lade Ergebnisse
        await fetchDoorResults(selectedDoor.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Fehler beim Einreichen der Antwort');
      }
    } catch (error) {
      console.error('Fehler beim Einreichen der Antwort:', error);
      alert('Fehler beim Einreichen der Antwort');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDoorResults = async (doorId: string) => {
    try {
      setRefreshingResults(true);
      const response = await fetch(`/api/advent-calendar/doors/${doorId}/results`, {
        headers: {
          'x-login-code': loginCode || ''
        }
      });

      if (response.ok) {
        const results = await response.json();
        setDoorResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Ergebnisse:', error);
    } finally {
      setRefreshingResults(false);
    }
  };

  const handleViewResults = async () => {
    if (selectedDoor) {
      await fetchDoorResults(selectedDoor.id);
    }
  };

  const handleCloseDialog = () => {
    setSelectedDoor(null);
    setAnswer('');
    setShowResults(false);
    setDoorResults(null);
    setOpeningDoor(null);
  };

  const handleRefreshResults = async () => {
    if (selectedDoor) {
      await fetchDoorResults(selectedDoor.id);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // SIMULATION: Adventskalender ist immer verfügbar (auch außerhalb des Dezembers)
  const currentMonth = new Date().getMonth() + 1;
  const isDecember = currentMonth === 12;

  return (
    <>
      <Card sx={{ 
        borderRadius: 4, 
        p: 3, 
        bgcolor: '#fff',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        mb: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.3
        }
      }}>
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 1, 
                fontWeight: 700,
                color: '#fff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                fontSize: { xs: '1.8rem', md: '2.5rem' }
              }}
            >
              🎄 Adventskalender {new Date().getFullYear()} 🎄
              {!isDecember && (
                <Chip 
                  label="Simulationsmodus" 
                  size="small" 
                  sx={{ 
                    ml: 1, 
                    bgcolor: 'rgba(255,255,255,0.3)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }} 
                />
              )}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'rgba(255,255,255,0.95)',
                fontSize: { xs: '0.9rem', md: '1rem' },
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}
            >
              {isDecember 
                ? 'Öffne jeden Tag ein Türchen mit spannenden Fun Facts und Aufgaben!'
                : '🎮 Alle 24 Türchen sind jetzt öffnenbar! Teste den Adventskalender!'
              }
            </Typography>
          </Box>

          {doors.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Keine Türchen gefunden. Bitte erstelle zuerst die Adventskalender-Daten.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              {doors.map((door, index) => {
                const isToday = door.isOpenable && !door.hasSubmission;
                const isPast = door.isOpenable && door.hasSubmission;
                const isFuture = !door.isOpenable;
                const isOpening = openingDoor === door.id;

                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={door.id}>
                    <Grow in={true} timeout={300 + index * 50}>
                      <Box
                        sx={{
                          position: 'relative',
                          perspective: '1000px',
                          cursor: door.isOpenable ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                            transform: isOpening ? 'rotateY(-90deg)' : 'rotateY(0deg)',
                            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': door.isOpenable && !isOpening ? {
                              transform: 'translateY(-8px) scale(1.05)',
                              '& .door-front': {
                                boxShadow: '0 12px 24px rgba(0,0,0,0.3)'
                              }
                            } : {}
                          }}
                          onClick={() => {
                            if (door.isOpenable && !isOpening) {
                              handleDoorClick(door);
                            }
                          }}
                        >
                          {/* Türchen Vorderseite */}
                          <Box
                            className="door-front"
                            sx={{
                              position: 'relative',
                              width: '100%',
                              aspectRatio: '1',
                              borderRadius: 3,
                              background: isToday
                                ? 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
                                : isPast
                                ? door.mySubmission?.isCorrect
                                  ? 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'
                                  : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                                : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                              border: isToday 
                                ? '3px solid #ffd700'
                                : isPast
                                ? '3px solid #4caf50'
                                : '2px solid rgba(255,255,255,0.3)',
                              boxShadow: isToday
                                ? '0 8px 16px rgba(255, 215, 0, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)'
                                : '0 4px 12px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              opacity: isFuture ? 0.5 : 1,
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: isToday 
                                  ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 50%)'
                                  : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 50%)',
                                pointerEvents: 'none'
                              }
                            }}
                          >
                            {/* Dekorative Elemente */}
                            {isToday && (
                              <>
                                <StarIcon 
                                  sx={{ 
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    fontSize: 20,
                                    color: '#ffd700',
                                    animation: 'twinkle 2s infinite',
                                    '@keyframes twinkle': {
                                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                      '50%': { opacity: 0.5, transform: 'scale(1.2)' }
                                    }
                                  }} 
                                />
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '60%',
                                    height: '60%',
                                    border: '2px dashed rgba(255,255,255,0.5)',
                                    borderRadius: 2,
                                    opacity: 0.3
                                  }}
                                />
                              </>
                            )}

                            {/* Türchen Nummer */}
                            <Typography
                              variant="h3"
                              sx={{
                                fontWeight: 800,
                                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                                color: isToday 
                                  ? '#fff'
                                  : isPast
                                  ? '#fff'
                                  : 'rgba(255,255,255,0.7)',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                zIndex: 1,
                                position: 'relative'
                              }}
                            >
                              {door.day}
                            </Typography>

                            {/* Status Icons */}
                            {door.hasSubmission && (
                              <Box 
                                sx={{ 
                                  position: 'absolute',
                                  bottom: 8,
                                  zIndex: 2
                                }}
                              >
                                {door.mySubmission?.isCorrect ? (
                                  <CheckCircleIcon 
                                    sx={{ 
                                      fontSize: 28, 
                                      color: '#fff',
                                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                                    }} 
                                  />
                                ) : (
                                  <CancelIcon 
                                    sx={{ 
                                      fontSize: 28, 
                                      color: '#fff',
                                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                                    }} 
                                  />
                                )}
                              </Box>
                            )}

                            {/* "Öffnen" Text für öffnenbare Türchen */}
                            {isToday && (
                              <Typography
                                variant="caption"
                                sx={{
                                  position: 'absolute',
                                  bottom: 8,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: '#fff',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                                  textTransform: 'uppercase',
                                  letterSpacing: 1,
                                  zIndex: 2
                                }}
                              >
                                Öffnen
                              </Typography>
                            )}

                            {/* Öffnungs-Animation Overlay */}
                            {isOpening && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  bgcolor: 'rgba(255,255,255,0.9)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 10,
                                  borderRadius: 3
                                }}
                              >
                                <CircularProgress size={40} />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Grow>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Dialog für Türchen */}
      <Dialog
        open={selectedDoor !== null}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)'
          }
        }}
      >
        {selectedDoor && (
          <>
            <DialogTitle sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  🎁 Türchen {selectedDoor.day}
                </Typography>
                <IconButton onClick={handleCloseDialog} size="small" sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ bgcolor: '#fff', mt: 0 }}>
              {!showResults ? (
                <>
                  <Fade in={true}>
                    <Box sx={{ mb: 3, mt: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#667eea' }}>
                        💡 Fun Fact
                      </Typography>
                      <Card sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 2 }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                          {selectedDoor.funFact}
                        </Typography>
                      </Card>
                    </Box>
                  </Fade>

                  <Fade in={true} timeout={300}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#764ba2' }}>
                        ❓ Aufgabe
                      </Typography>
                      <Card sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 2, border: '2px solid #ffb74d' }}>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontWeight: 500 }}>
                          {selectedDoor.question}
                        </Typography>
                      </Card>
                    </Box>
                  </Fade>

                  {selectedDoor.hasSubmission ? (
                    <Fade in={true} timeout={400}>
                      <Box>
                        <Chip
                          label={selectedDoor.mySubmission?.isCorrect ? 'Richtig! ✅' : 'Leider falsch ❌'}
                          color={selectedDoor.mySubmission?.isCorrect ? 'success' : 'error'}
                          sx={{ mb: 2, fontSize: '1rem', py: 2.5, px: 1 }}
                        />
                        <Card sx={{ bgcolor: '#e3f2fd', p: 2, borderRadius: 2, mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                            Deine Antwort: <strong>{selectedDoor.mySubmission?.answer}</strong>
                          </Typography>
                          {selectedDoor.explanation && (
                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
                              {selectedDoor.explanation}
                            </Typography>
                          )}
                        </Card>
                        <Button
                          variant="contained"
                          onClick={handleViewResults}
                          sx={{ 
                            mt: 2,
                            bgcolor: '#667eea',
                            '&:hover': { bgcolor: '#5568d3' }
                          }}
                          startIcon={<RefreshIcon />}
                        >
                          Ergebnisse anderer Schüler anzeigen
                        </Button>
                      </Box>
                    </Fade>
                  ) : (
                    <Fade in={true} timeout={500}>
                      <TextField
                        fullWidth
                        label="Deine Antwort"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        multiline
                        rows={3}
                        sx={{ mb: 2 }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleSubmitAnswer();
                          }
                        }}
                      />
                    </Fade>
                  )}
                </>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Ergebnisse</Typography>
                    <IconButton onClick={handleRefreshResults} size="small" disabled={refreshingResults}>
                      <RefreshIcon />
                    </IconButton>
                  </Box>

                  {doorResults && (
                    <>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Statistiken
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Chip label={`Gesamt: ${doorResults.statistics.totalSubmissions}`} />
                          <Chip label={`Richtig: ${doorResults.statistics.correctSubmissions}`} color="success" />
                          <Chip label={`Falsch: ${doorResults.statistics.incorrectSubmissions}`} color="error" />
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            Erfolgsquote: {doorResults.statistics.correctPercentage}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={doorResults.statistics.correctPercentage}
                            sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Fun Fact
                        </Typography>
                        <Card sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 2 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line' }}>
                            {doorResults.door.funFact}
                          </Typography>
                        </Card>
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          Antworten der anderen Schüler
                        </Typography>
                        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                          {doorResults.results.map((result) => (
                            <Box
                              key={result.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                p: 1.5,
                                mb: 1,
                                bgcolor: result.isMine ? '#e3f2fd' : '#f8f9fa',
                                borderRadius: 2,
                                border: result.isMine ? '2px solid #667eea' : '1px solid #e0e0e0',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  transform: 'translateX(4px)',
                                  boxShadow: 2
                                }
                              }}
                            >
                              <Avatar sx={{ width: 40, height: 40, bgcolor: '#667eea' }}>
                                {result.avatarEmoji}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: result.isMine ? 700 : 400 }}>
                                  {result.studentName} {result.isMine && '(Du)'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {result.answer}
                                </Typography>
                              </Box>
                              {result.isCorrect ? (
                                <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 24 }} />
                              ) : (
                                <CancelIcon sx={{ color: '#f44336', fontSize: 24 }} />
                              )}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ bgcolor: 'rgba(255,255,255,0.1)', px: 3, py: 2 }}>
              {!showResults && !selectedDoor.hasSubmission && (
                <>
                  <Button onClick={handleCloseDialog} sx={{ color: '#fff' }}>Abbrechen</Button>
                  <Button
                    onClick={handleSubmitAnswer}
                    variant="contained"
                    disabled={!answer.trim() || submitting}
                    sx={{
                      bgcolor: '#fff',
                      color: '#667eea',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                  >
                    {submitting ? <CircularProgress size={20} /> : 'Antwort einreichen'}
                  </Button>
                </>
              )}
              {showResults && (
                <Button onClick={() => setShowResults(false)} sx={{ color: '#fff' }}>Zurück</Button>
              )}
              {selectedDoor.hasSubmission && !showResults && (
                <Button onClick={handleCloseDialog} sx={{ color: '#fff' }}>Schließen</Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default AdventCalendar;
