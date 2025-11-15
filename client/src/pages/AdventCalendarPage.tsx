import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowBack as ArrowBackIcon
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

const AdventCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('studentId') || '';
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
      
      if (!loginCode) {
        console.error('Kein Login-Code im localStorage gefunden');
        setDoors([]);
        setLoading(false);
        return;
      }
      
      console.log('Lade Türchen für Jahr:', year, 'mit Login-Code:', loginCode ? 'vorhanden' : 'fehlt');
      
      const response = await fetch(`/api/advent-calendar/doors?year=${year}`, {
        headers: {
          'x-login-code': loginCode || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Türchen-API Antwort:', { 
          status: response.status,
          dataLength: Array.isArray(data) ? data.length : 'nicht ein Array', 
          data 
        });
        if (Array.isArray(data)) {
          if (data.length > 0) {
            setDoors(data);
          } else {
            console.warn('Leeres Array erhalten - keine Türchen gefunden');
            setDoors([]);
          }
        } else {
          console.error('Unerwartete Antwort-Format:', data);
          setDoors([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        console.error('API Fehler:', response.status, errorData);
        if (response.status === 401) {
          console.error('Authentifizierungsfehler - Login-Code fehlt oder ist ungültig');
        }
        setDoors([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Türchen:', error);
      setDoors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoorClick = async (door: AdventCalendarDoor) => {
    if (!door.isOpenable) return;

    setOpeningDoor(door.id);
    setTimeout(async () => {
      setSelectedDoor(door);
      setAnswer('');
      
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
    if (!selectedDoor || !answer.trim()) return;

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const isDecember = currentMonth === 12;

  // Icons für jedes Türchen
  const doorIcons = [
    '🎁', '🎄', '⭐', '❄️', '🎅', '🦌', '🔔', '🕯️',
    '🎀', '🧦', '🍪', '☕', '🎵', '🕎', '🌟', '🎊',
    '🎈', '🎪', '🎭', '🎨', '🎯', '🎲', '🎰', '🎮'
  ];

  // Wichtel-Emojis für die Öffnungs-Animation
  const wichtelEmojis = ['🧙‍♂️', '🧝‍♂️', '🧚', '🎅', '🧑‍🎄', '🤶'];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 3 }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: '#c62828', 
        color: '#fff', 
        p: 1.5, 
        mb: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 1000, mx: 'auto' }}>
          <IconButton 
            onClick={() => navigate('/dashboard')} 
            sx={{ 
              color: '#fff',
              width: 24,
              height: 24,
              p: 0,
              minWidth: 24,
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'scale(1.15)',
                bgcolor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16, width: '100%', height: '100%' }} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, fontSize: '1.1rem' }}>
            🎄 Adventskalender {new Date().getFullYear()}
            {!isDecember && (
              <Chip 
                label="Simulation" 
                size="small" 
                sx={{ 
                  ml: 1, 
                  bgcolor: 'rgba(255,255,255,0.3)', 
                  color: '#fff',
                  height: 18,
                  fontSize: '0.6rem',
                  '& .MuiChip-label': { px: 0.75 }
                }} 
              />
            )}
          </Typography>
        </Box>
      </Box>

      {/* Kalender - Tannenbaum-Form */}
      <Box sx={{ maxWidth: 700, mx: 'auto', px: 1.5 }}>
        {doors.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Keine Türchen gefunden.</Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            {/* Tannenbaum-Anordnung: 1, 2, 3, 4, 5, 6, 4 */}
            {[
              [1],           // Spitze
              [2, 3],        // Reihe 2
              [4, 5, 6],     // Reihe 3
              [7, 8, 9, 10], // Reihe 4
              [11, 12, 13, 14, 15], // Reihe 5
              [16, 17, 18, 19, 20, 21], // Reihe 6
              [22, 23, 24]   // Basis
            ].map((row, rowIndex) => (
              <Box 
                key={rowIndex} 
                sx={{ 
                  display: 'flex', 
                  gap: 0.5, 
                  justifyContent: 'center',
                  animation: 'fadeInDown 0.5s ease-out',
                  animationDelay: `${rowIndex * 0.1}s`,
                  '@keyframes fadeInDown': {
                    '0%': { opacity: 0, transform: 'translateY(-20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
              >
                {row.map((dayNum) => {
                  const door = doors.find(d => d.day === dayNum);
                  if (!door) return null;
                  
                  const isToday = door.isOpenable && !door.hasSubmission;
                  const isPast = door.isOpenable && door.hasSubmission;
                  const isFuture = !door.isOpenable;
                  const isOpening = openingDoor === door.id;
                  const doorIcon = doorIcons[door.day - 1] || '🎁';

                  return (
                    <Grow in={true} timeout={200 + door.day * 15} key={door.id}>
                      <Box
                        sx={{
                          position: 'relative',
                          cursor: door.isOpenable ? 'pointer' : 'not-allowed',
                          transform: isOpening ? 'rotateY(-90deg) scale(0.9)' : 'rotateY(0deg)',
                          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': door.isOpenable && !isOpening ? {
                            transform: 'translateY(-3px) scale(1.08)',
                            '& .door-card': {
                              boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
                              borderColor: isToday ? '#ffd700' : '#fff'
                            }
                          } : {}
                        }}
                        onClick={() => {
                          if (door.isOpenable && !isOpening) {
                            handleDoorClick(door);
                          }
                        }}
                      >
                        <Card
                          className="door-card"
                          sx={{
                            width: { xs: 50, sm: 60 },
                            height: { xs: 50, sm: 60 },
                            borderRadius: 1.2,
                            background: isToday
                              ? 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)'
                              : isPast
                              ? door.mySubmission?.isCorrect
                                ? 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)'
                                : 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)'
                              : 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
                            border: isToday 
                              ? '2px solid #ffd700'
                              : isPast
                              ? '2px solid #fff'
                              : '2px solid #9e9e9e',
                            boxShadow: isToday
                              ? '0 2px 6px rgba(46, 125, 50, 0.3)'
                              : '0 2px 4px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'visible',
                            opacity: isFuture ? 0.5 : 1,
                            p: 0.3
                          }}
                        >
                          {isOpening && (
                            <>
                              {/* Wichtel-Animation */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 15,
                                  animation: 'wichtelAppear 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '@keyframes wichtelAppear': {
                                    '0%': { 
                                      opacity: 0, 
                                      transform: 'translate(-50%, -50%) scale(0) rotate(-180deg)',
                                    },
                                    '30%': { 
                                      opacity: 1, 
                                      transform: 'translate(-50%, -120%) scale(1.3) rotate(0deg)',
                                    },
                                    '60%': { 
                                      opacity: 1, 
                                      transform: 'translate(-50%, -130%) scale(1.1) rotate(5deg)',
                                    },
                                    '100%': { 
                                      opacity: 0, 
                                      transform: 'translate(-50%, -150%) scale(0.8) rotate(10deg)',
                                    }
                                  }
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: { xs: '1.6rem', sm: '2rem' },
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                                    animation: 'wichtelWave 0.3s ease-in-out 0.2s infinite',
                                    '@keyframes wichtelWave': {
                                      '0%, 100%': { transform: 'rotate(0deg)' },
                                      '50%': { transform: 'rotate(-15deg)' }
                                    }
                                  }}
                                >
                                  {wichtelEmojis[door.day % wichtelEmojis.length]}
                                </Typography>
                              </Box>
                              {/* Türchen öffnet sich von links nach rechts */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  bgcolor: 'rgba(255,255,255,0.95)',
                                  zIndex: 10,
                                  borderRadius: 1.2,
                                  animation: 'doorOpen 0.8s ease-out',
                                  '@keyframes doorOpen': {
                                    '0%': { 
                                      clipPath: 'inset(0 0 0 0)',
                                    },
                                    '100%': { 
                                      clipPath: 'inset(0 100% 0 0)',
                                    }
                                  }
                                }}
                              />
                            </>
                          )}

                          {/* Icon */}
                          <Typography
                            sx={{
                              fontSize: { xs: '1.4rem', sm: '1.6rem' },
                              lineHeight: 1,
                              mb: 0.2,
                              zIndex: 1,
                              filter: isFuture ? 'grayscale(100%)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          >
                            {doorIcon}
                          </Typography>

                          {/* Tag-Nummer */}
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: '0.6rem', sm: '0.65rem' },
                              color: '#fff',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                              zIndex: 1,
                              lineHeight: 1
                            }}
                          >
                            {door.day}
                          </Typography>

                          {/* Status Icon */}
                          {door.hasSubmission && (
                            <Box 
                              sx={{ 
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                animation: 'fadeIn 0.3s ease-out',
                                '@keyframes fadeIn': {
                                  '0%': { opacity: 0 },
                                  '100%': { opacity: 1 }
                                }
                              }}
                            >
                              {door.mySubmission?.isCorrect ? (
                                <CheckCircleIcon 
                                  sx={{ 
                                    fontSize: 14, 
                                    color: '#fff',
                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                  }} 
                                />
                              ) : (
                                <CancelIcon 
                                  sx={{ 
                                    fontSize: 14, 
                                    color: '#fff',
                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                                  }} 
                                />
                              )}
                            </Box>
                          )}
                        </Card>
                      </Box>
                    </Grow>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Dialog */}
      <Dialog
        open={selectedDoor !== null}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: '#fff'
          }
        }}
      >
        {selectedDoor && (
          <>
            <DialogTitle sx={{ bgcolor: '#2e7d32', color: '#fff', py: 1, px: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {doorIcons[selectedDoor.day - 1] || '🎁'} Türchen {selectedDoor.day}
                </Typography>
                <IconButton 
                  onClick={handleCloseDialog} 
                  sx={{ 
                    color: '#fff',
                    width: 22,
                    height: 22,
                    p: 0,
                    minWidth: 22,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.2) rotate(90deg)',
                      bgcolor: 'rgba(255,255,255,0.2)'
                    }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14, width: '100%', height: '100%' }} />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 1.5, px: 1.5, pb: 1.5 }}>
              {!showResults ? (
                <>
                  <Fade in={true} timeout={200}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#2e7d32', fontSize: '0.85rem' }}>
                        💡 Fun Fact
                      </Typography>
                      <Card 
                        sx={{ 
                          bgcolor: '#e8f5e9', 
                          p: 1, 
                          borderRadius: 1
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.85rem', lineHeight: 1.6 }}>
                          {selectedDoor.funFact}
                        </Typography>
                      </Card>
                    </Box>
                  </Fade>

                  <Fade in={true} timeout={300}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#c62828', fontSize: '0.85rem' }}>
                        ❓ Aufgabe
                      </Typography>
                      <Card 
                        sx={{ 
                          bgcolor: '#ffebee', 
                          p: 1, 
                          borderRadius: 1, 
                          border: '2px solid #ef5350'
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.6 }}>
                          {selectedDoor.question}
                        </Typography>
                      </Card>
                    </Box>
                  </Fade>

                  {selectedDoor.hasSubmission ? (
                    <Box>
                      <Chip
                        label={selectedDoor.mySubmission?.isCorrect ? 'Richtig! ✅' : 'Falsch ❌'}
                        color={selectedDoor.mySubmission?.isCorrect ? 'success' : 'error'}
                        size="small"
                        sx={{ mb: 1, fontSize: '0.7rem', height: 22 }}
                      />
                      <Card sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>Deine Antwort:</strong> {selectedDoor.mySubmission?.answer}
                        </Typography>
                        {selectedDoor.explanation && (
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, whiteSpace: 'pre-line', fontSize: '0.75rem' }}>
                            {selectedDoor.explanation}
                          </Typography>
                        )}
                      </Card>
                      <Button
                        variant="contained"
                        onClick={handleViewResults}
                        size="small"
                        sx={{ 
                          bgcolor: '#2e7d32', 
                          '&:hover': { bgcolor: '#1b5e20' },
                          fontSize: '0.7rem',
                          py: 0.4,
                          px: 1,
                          minHeight: 26,
                          '& .MuiButton-startIcon': {
                            marginRight: 0.5,
                            '& svg': {
                              fontSize: 12
                            }
                          }
                        }}
                        startIcon={<RefreshIcon sx={{ fontSize: 12 }} />}
                      >
                        Ergebnisse anzeigen
                      </Button>
                    </Box>
                  ) : (
                    <TextField
                      fullWidth
                      label="Deine Antwort"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      multiline
                      rows={2}
                      size="small"
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: '0.85rem'
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 700 }}>Ergebnisse</Typography>
                    <IconButton 
                      onClick={handleRefreshResults} 
                      disabled={refreshingResults}
                      sx={{
                        width: 22,
                        height: 22,
                        p: 0,
                        minWidth: 22,
                        transition: 'all 0.2s',
                        '&:hover:not(:disabled)': {
                          transform: 'scale(1.2) rotate(180deg)',
                          bgcolor: 'rgba(46, 125, 50, 0.1)'
                        },
                        '&:disabled': {
                          opacity: 0.5
                        },
                        animation: refreshingResults ? 'spin 1s linear infinite' : 'none',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        }
                      }}
                    >
                      <RefreshIcon sx={{ fontSize: 14, width: '100%', height: '100%' }} />
                    </IconButton>
                  </Box>

                  {doorResults && (
                    <>
                      <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
                          <Chip label={`Gesamt: ${doorResults.statistics.totalSubmissions}`} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                          <Chip label={`Richtig: ${doorResults.statistics.correctSubmissions}`} color="success" size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                          <Chip label={`Falsch: ${doorResults.statistics.incorrectSubmissions}`} color="error" size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={doorResults.statistics.correctPercentage}
                          sx={{ height: 5, borderRadius: 2.5, mb: 0.5 }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          {doorResults.statistics.correctPercentage}% Erfolgsquote
                        </Typography>
                      </Box>

                      <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {doorResults.results.map((result, idx) => (
                          <Fade in={true} timeout={300 + idx * 100} key={result.id}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                p: 0.75,
                                mb: 0.5,
                                bgcolor: result.isMine ? '#e8f5e9' : '#f5f5f5',
                                borderRadius: 1,
                                border: result.isMine ? '1px solid #2e7d32' : '1px solid #e0e0e0',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  transform: 'translateX(2px)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }
                              }}
                            >
                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#2e7d32', fontSize: '0.9rem' }}>
                              {result.avatarEmoji}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: result.isMine ? 600 : 400, fontSize: '0.8rem' }}>
                                {result.studentName} {result.isMine && '(Du)'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                {result.answer}
                              </Typography>
                            </Box>
                            {result.isCorrect ? (
                              <CheckCircleIcon 
                                sx={{ 
                                  color: '#2e7d32', 
                                  fontSize: 18
                                }} 
                              />
                            ) : (
                              <CancelIcon 
                                sx={{ 
                                  color: '#c62828', 
                                  fontSize: 18
                                }} 
                              />
                            )}
                            </Box>
                          </Fade>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 1.5, py: 0.75, bgcolor: '#f5f5f5', gap: 0.75 }}>
              {!showResults && !selectedDoor.hasSubmission && (
                <>
                  <Button 
                    onClick={handleCloseDialog} 
                    size="small"
                    sx={{
                      fontSize: '0.7rem',
                      py: 0.4,
                      px: 1,
                      minHeight: 26,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.05)'
                      }
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleSubmitAnswer}
                    variant="contained"
                    disabled={!answer.trim() || submitting}
                    size="small"
                    sx={{ 
                      bgcolor: '#2e7d32', 
                      '&:hover:not(:disabled)': { 
                        bgcolor: '#1b5e20'
                      },
                      fontSize: '0.7rem',
                      py: 0.4,
                      px: 1,
                      minHeight: 26,
                      transition: 'all 0.2s',
                      '&:disabled': {
                        opacity: 0.6
                      }
                    }}
                  >
                    {submitting ? <CircularProgress size={12} sx={{ color: '#fff' }} /> : 'Einreichen'}
                  </Button>
                </>
              )}
              {showResults && (
                <Button 
                  onClick={() => setShowResults(false)} 
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    py: 0.4,
                    px: 1,
                    minHeight: 26,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.05)'
                    }
                  }}
                >
                  Zurück
                </Button>
              )}
              {selectedDoor.hasSubmission && !showResults && (
                <Button 
                  onClick={handleCloseDialog} 
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    py: 0.4,
                    px: 1,
                    minHeight: 26,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.05)'
                    }
                  }}
                >
                  Schließen
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdventCalendarPage;

