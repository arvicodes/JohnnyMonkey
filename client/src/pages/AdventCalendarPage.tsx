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

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  avatarEmoji: string;
  totalSubmissions: number;
  correctSubmissions: number;
  progressPercent: number; // relative zu maxCorrect
  isMe: boolean;
}

interface LeaderboardResponse {
  year: number;
  totalStudents: number;
  maxCorrect: number;
  leaderboard: LeaderboardEntry[];
}

const AdventCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('studentId') || '';
  const [doors, setDoors] = useState<AdventCalendarDoor[]>([]);
  const [loading, setLoading] = useState<boolean>(!!localStorage.getItem('adventTheme'));
  const [selectedDoor, setSelectedDoor] = useState<AdventCalendarDoor | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doorResults, setDoorResults] = useState<DoorResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [refreshingResults, setRefreshingResults] = useState(false);
  const [openingDoor, setOpeningDoor] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [refreshingLeaderboard, setRefreshingLeaderboard] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(localStorage.getItem('adventTheme') || '');
  const [showThemePicker, setShowThemePicker] = useState<boolean>(true);

  const loginCode = localStorage.getItem('loginCode');

  useEffect(() => {
    if (selectedTheme) {
      setLoading(true);
      fetchDoors();
      fetchLeaderboard();
    } else {
      setLoading(false);
    }
  }, [selectedTheme]);

  // Öffne den Themen-Dialog automatisch, wenn kein Thema gewählt ist
  useEffect(() => {
    if (!selectedTheme) {
      setShowThemePicker(true);
    }
  }, [selectedTheme]);
  // Live-Update des Leaderboards (sanftes Vorrücken)
  useEffect(() => {
    // Guard für SSR/Umgebungen ohne DOM
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    let intervalId: number | undefined;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    // Poll alle 5s, nur wenn Tab sichtbar
    intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard();
      }
    }, 5000);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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
      
      console.log('Lade Türchen für Jahr:', year, 'Thema:', selectedTheme, 'mit Login-Code:', loginCode ? 'vorhanden' : 'fehlt');
      
      const response = await fetch(`/api/advent-calendar/doors?year=${year}&theme=${encodeURIComponent(selectedTheme)}`, {
        headers: {
          'x-login-code': loginCode || '',
          'x-advent-theme': selectedTheme || ''
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

  const fetchLeaderboard = async () => {
    try {
      setRefreshingLeaderboard(true);
      const year = new Date().getFullYear();
      const response = await fetch(`/api/advent-calendar/leaderboard?year=${year}&theme=${encodeURIComponent(selectedTheme)}`, {
        headers: {
          'x-login-code': loginCode || '',
          'x-advent-theme': selectedTheme || ''
        }
      });
      if (response.ok) {
        const data = await response.json() as LeaderboardResponse;
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Fehler beim Laden des Leaderboards:', e);
    } finally {
      setRefreshingLeaderboard(false);
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
            // Bereits geöffnet: automatisch Ergebnisse anzeigen
            await fetchDoorResults(fullDoor.id);
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
        await fetchLeaderboard();
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

  // Themenauswahl
  const themes = [
    { key: 'Mathe Basics', emoji: '➗', color: '#e3f2fd' },
    { key: 'Informatik', emoji: '💻', color: '#fff3e0' },
    { key: 'Tiere', emoji: '🐾', color: '#e8f5e9' },
    { key: 'Weltraum', emoji: '🌌', color: '#ede7f6' },
    { key: 'Natur & Umwelt', emoji: '🌿', color: '#e0f2f1' },
    { key: 'Weihnachten', emoji: '🎅', color: '#ffebee' },
    { key: 'Spiele & Rätsel', emoji: '🧩', color: '#f3e5f5' },
    { key: 'Geografie', emoji: '🌍', color: '#e1f5fe' },
    { key: 'Musik & Rhythmus', emoji: '🎵', color: '#fce4ec' },
    { key: 'Essen & Küche', emoji: '🍎', color: '#fff8e1' }
  ];

  const applyTheme = (key: string) => {
    // Persist and update state; fetching is handled by useEffect([selectedTheme])
    localStorage.setItem('adventTheme', key);
    setSelectedTheme(key);
    // Reset current data to reflect upcoming reload
    setDoors([]);
    setLeaderboard(null);
    setLoading(true);
    setShowThemePicker(false);
  };

  const handleCloseDialog = () => {
    setSelectedDoor(null);
    setAnswer('');
    setShowResults(false);
    setOpeningDoor(null);
  };

  const handleRefreshResults = async () => {
    if (selectedDoor) {
      await fetchDoorResults(selectedDoor.id);
    }
    await fetchLeaderboard();
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 1200, mx: 'auto' }}>
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
          {selectedTheme && (
            <Chip 
              label={`Thema: ${selectedTheme}`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: '#fff',
                height: 22,
                fontSize: '0.7rem',
                '& .MuiChip-label': { px: 0.75 },
                mr: 1
              }} 
              onClick={() => {
                setShowThemePicker(true);
              }}
            />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowThemePicker(true)}
            sx={{
              borderColor: 'rgba(255,255,255,0.6)',
              color: '#fff',
              fontSize: '0.7rem',
              py: 0.3,
              px: 0.8,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: '#fff' }
            }}
          >
            Thema wählen
          </Button>
        </Box>
      </Box>

      {/* Inhalt: Baum links, Wichtelrennen rechts */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1.5 }}>
        {/* Kalender - Tannenbaum-Form */}
        <Box>
          {doors.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ mb: 1 }}>
                {selectedTheme ? 'Keine Türchen gefunden.' : 'Bitte zuerst ein Thema wählen.'}
              </Typography>
              {!selectedTheme && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setShowThemePicker(true)}
                  sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                >
                  Thema wählen
                </Button>
              )}
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

        {/* Wichtelrennen - Seitenpanel */}
        <Box sx={{ position: 'relative' }}>
          <Card sx={{ p: 1.25, borderRadius: 2, position: 'sticky', top: 12 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  🧭 Nordpol‑Wichtelrennen
                </Typography>
                <Chip
                  label="LIVE"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    bgcolor: '#e53935',
                    color: '#fff',
                    '& .MuiChip-label': { px: 0.6 },
                    boxShadow: '0 0 0 2px rgba(229,57,53,0.2)'
                  }}
                />
              </Box>
              <IconButton 
                onClick={async () => {
                  await fetchLeaderboard();
                }}
                disabled={refreshingLeaderboard}
                sx={{ width: 22, height: 22, p: 0, minWidth: 22 }}
                title="Aktualisieren"
              >
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {!leaderboard ? (
              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                Beantworte Türchen – dein Fortschritt fließt ins Rennen ein. Hier siehst du, wer die meisten richtigen Antworten hat.
              </Typography>
            ) : (
              <>
                {/* Großes Rennen */}
                {(() => {
                  const entriesAll = leaderboard.leaderboard;
                  const entries = entriesAll.slice(0, 10); // Top 10
                  const count = entries.length || 1;
                  const maxCorrect = Math.max(leaderboard.maxCorrect, 1);
                  return (
                    <Box
                      sx={{
                        position: 'relative',
                        height: { xs: 260, md: 360 }, // kompakter
                        borderRadius: 1.5,
                        background: 'linear-gradient(180deg, #e3f2fd 0%, #bbdefb 60%, #e8f5e9 100%)',
                        border: '1px solid #90caf9',
                        overflow: 'hidden',
                        px: 1,
                        mb: 1.5,
                        boxShadow: 'inset 0 -30px 0 0 rgba(255,255,255,0.8), inset 0 30px 0 0 rgba(255,255,255,0.4)'
                      }}
                    >
                      {/* Vertikale Lanes (Spuren) */}
                      {Array.from({ length: Math.min(10, count) }).map((_, laneIdx) => (
                        <Box
                          key={laneIdx}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${(laneIdx + 1) * (100 / (Math.min(10, count) + 1))}%`,
                            width: 2,
                            background: 'rgba(0,0,0,0.08)',
                            transform: 'translateX(-1px)'
                          }}
                        />
                      ))}
                      {/* Ziellinie (unten) */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 10,
                          height: 12,
                          background:
                            'repeating-linear-gradient( to right, #c62828, #c62828 12px, #fff 12px, #fff 24px )',
                          borderRadius: 1
                        }}
                      />
                      {/* Schnee (Boden) */}
                      <Box sx={{ position: 'absolute', left: -40, right: -40, bottom: -10, height: 50, background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 60%, rgba(255,255,255,0) 100%)' }} />

                      {entries.map((e, idx) => {
                        const laneCount = Math.min(10, count);
                        const laneX = (idx + 1) * (100 / (laneCount + 1));
                        // Weg 0 -> oben, 24 -> unten (Ziel unten)
                        const yPercent = 10 + (Math.min(24, e.correctSubmissions) / 24) * 85; // oben ~10%, unten ~95%
                        const isMe = e.isMe;
                        const runner = '🧝‍♂️';
                        return (
                          <Box
                            key={e.studentId}
                            sx={{
                              position: 'absolute',
                              top: `${yPercent}%`,
                              left: `${laneX}%`,
                              transform: 'translate(-50%, -50%)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.6,
                              transition: 'top 0.6s ease',
                              animation: `popIn 0.3s ease, wobble ${2.5 + (idx % 5) * 0.2}s ease-in-out ${idx * 0.15}s infinite`,
                              '@keyframes popIn': {
                                '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.8)' },
                                '100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
                              },
                              '@keyframes wobble': {
                                '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
                                '25%': { transform: 'translate(calc(-50% - 2px), -50%) rotate(-2deg)' },
                                '50%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
                                '75%': { transform: 'translate(calc(-50% + 2px), -50%) rotate(2deg)' },
                                '100%': { transform: 'translate(-50%, -50%) rotate(0deg)' }
                              }
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 30,
                                height: 30,
                                bgcolor: isMe ? '#2e7d32' : '#c62828',
                                fontSize: '1rem',
                                boxShadow: isMe ? '0 0 0 2px #ffd700' : 'none'
                              }}
                            >
                              {e.avatarEmoji || '🎓'}
                            </Avatar>
                            <Box sx={{ position: 'relative' }}>
                              <Box
                                sx={{
                                  display: 'none',
                                  position: 'absolute',
                                  left: 12,
                                  top: -6,
                                  transform: 'translateY(-100%)',
                                  background: 'rgba(255,255,255,0.95)',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: 0.75,
                                  px: 0.6,
                                  py: 0.25,
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                  fontSize: '0.8rem',
                                  fontWeight: isMe ? 700 : 500,
                                  color: isMe ? '#2e7d32' : '#333'
                                }}
                                className="runner-label"
                              >
                                {runner} {isMe ? 'Du' : e.studentName.split(' ')[0]} • {e.correctSubmissions}
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                position: 'absolute',
                                width: 40,
                                height: 40,
                                top: -5,
                                left: -5,
                                '&:hover ~ .runner-label, &:hover .runner-label': { display: 'block' }
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })()}

                {/* Zusammenfassung */}
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
                    <Chip label={`Teilnehmer: ${leaderboard.totalStudents}`} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                    <Chip label={`Max. richtig: ${leaderboard.maxCorrect}`} color="success" size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                  </Box>
                  {(() => {
                    const me = leaderboard.leaderboard.find(e => e.isMe);
                    if (!me) return null;
                    const percentOf24 = Math.round((me.correctSubmissions / 24) * 100);
                    return (
                      <Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentOf24}
                          sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                          Dein Fortschritt: {me.correctSubmissions}/24 richtige ({percentOf24}%)
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>
              </>
            )}
          </Card>
        </Box>
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
                        {/* Optional: kleine, thematische Zusatzaufgabe */}
                        {selectedTheme && (
                          <Typography variant="body2" sx={{ mt: 0.75, fontSize: '0.8rem', color: '#b71c1c' }}>
                            {(() => {
                              const themeHints: Record<string, string[]> = {
                                'Mathe Basics': [
                                  'Rechne zusätzlich: 12 + 13 = ?',
                                  'Finde zwei Zahlen, die zusammen 20 ergeben.'
                                ],
                                'Informatik': [
                                  'Schreibe die Zahl 5 im Binärsystem.',
                                  'Zähle in Zweierschritten bis 10.'
                                ],
                                'Tiere': [
                                  'Nenne ein Tier mit 4 Beinen und eins mit 2.',
                                  'Wie viele Beine haben 3 Spinnen zusammen?'
                                ],
                                'Weltraum': [
                                  'Wie viele Planeten sind innen näher an der Sonne als die Erde?',
                                  'Zähle die Buchstaben von „Sonne“.'
                                ],
                                'Natur & Umwelt': [
                                  'Nenne zwei Dinge, die man recyceln kann.',
                                  'Wie viele Jahreszeiten gibt es?'
                                ],
                                'Weihnachten': [
                                  'Zähle die Rentiere vom Weihnachtsmann.',
                                  'Wie viele Kerzen hat ein Adventskranz?'
                                ],
                                'Spiele & Rätsel': [
                                  'Finde ein Wort, das mit dem gleichen Buchstaben beginnt wie dein Name.',
                                  'Zähle rückwärts von 10 zu 1.'
                                ],
                                'Geografie': [
                                  'Nenne eine Hauptstadt in Europa.',
                                  'Wie viele Kontinente gibt es?'
                                ],
                                'Musik & Rhythmus': [
                                  'Klatsche 4-mal in gleichmäßigen Abständen.',
                                  'Nenne ein Musikinstrument.'
                                ],
                                'Essen & Küche': [
                                  'Welche 3 Obstsorten kennst du?',
                                  'Wie viele Eier brauchst du für 2 Spiegeleier?'
                                ]
                              };
                              const list = themeHints[selectedTheme] || [];
                              const hint = list[(selectedDoor.day - 1) % Math.max(1, list.length)] || '';
                              return hint ? `Zusatz: ${hint}` : '';
                            })()}
                          </Typography>
                        )}
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
      {/* Theme Picker Dialog */}
      <Dialog
        open={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            Thema auswählen
          </Typography>
          <Chip label="10 Themen" size="small" sx={{ ml: 1 }} />
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={1}>
            {themes.map((t) => (
              <Grid item xs={6} sm={4} md={3} key={t.key}>
                <Card
                  onClick={() => applyTheme(t.key)}
                  sx={{
                    bgcolor: t.color,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 12px rgba(0,0,0,0.12)'
                    },
                    border: selectedTheme === t.key ? '2px solid #2e7d32' : '1px solid #e0e0e0'
                  }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,0,0,0.05)' }}>{t.emoji}</Avatar>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.key}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          {selectedTheme && (
            <Button
              variant="contained"
              onClick={() => setShowThemePicker(false)}
              size="small"
              sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
            >
              Weiter
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdventCalendarPage;


