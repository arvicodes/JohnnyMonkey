import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../components/ui/dialog-close-icon-button';

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
  const [showConfetti, setShowConfetti] = useState(false);
  const answerInputRef = useRef<HTMLInputElement>(null);
  const [dailyStats, setDailyStats] = useState<{ todayCorrect: number; todayTotal: number } | null>(null);
  const [showHint, setShowHint] = useState(false);

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

  // Fokussiere Input-Feld, wenn Dialog geöffnet wird
  useEffect(() => {
    if (selectedDoor && !selectedDoor.hasSubmission && answerInputRef.current) {
      // Kleine Verzögerung, damit der Dialog vollständig gerendert ist
      setTimeout(() => {
        answerInputRef.current?.focus();
      }, 100);
    }
  }, [selectedDoor]);

  // Keyboard-Navigation für Türchen (Pfeiltasten)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nur wenn kein Dialog offen ist
      if (selectedDoor !== null) return;
      
      const openableDoors = doors
        .filter(d => d.isOpenable)
        .sort((a, b) => a.day - b.day);
      
      if (openableDoors.length === 0) return;
      
      const currentFocused = document.activeElement;
      const currentDay = currentFocused?.getAttribute('data-door-day');
      
      if (!currentDay) {
        // Wenn nichts fokussiert ist, fokussiere das erste Türchen bei Pfeiltasten
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const firstDoor = openableDoors[0];
          const firstElement = document.querySelector(`[data-door-day="${firstDoor.day}"]`) as HTMLElement;
          firstElement?.focus();
        }
        return;
      }
      
      const currentIndex = openableDoors.findIndex(d => d.day.toString() === currentDay);
      if (currentIndex === -1) return;
      
      let nextIndex = currentIndex;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % openableDoors.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = currentIndex === 0 ? openableDoors.length - 1 : currentIndex - 1;
      } else {
        return;
      }
      
      e.preventDefault();
      const nextDoor = openableDoors[nextIndex];
      const nextElement = document.querySelector(`[data-door-day="${nextDoor.day}"]`) as HTMLElement;
      nextElement?.focus();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [doors, selectedDoor]);

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

  const fetchDailyStats = async (doorId: string) => {
    try {
      const response = await fetch(`/api/advent-calendar/doors/${doorId}/results`, {
        headers: {
          'x-login-code': loginCode || ''
        }
      });
      if (response.ok) {
        const results = await response.json();
        setDailyStats({
          todayCorrect: results.statistics.correctSubmissions,
          todayTotal: results.statistics.totalSubmissions
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der täglichen Statistiken:', error);
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
          // Lade tägliche Statistiken
          await fetchDailyStats(door.id);
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
        
        // Konfetti-Animation bei korrekter Antwort (nur bei 1. richtiger)
        if (submission.isCorrect) {
          const totalCorrect = doors.filter(d => d.hasSubmission && d.mySubmission?.isCorrect).length;
          if (totalCorrect === 0) {
            // Nur bei der ersten richtigen Antwort
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }
        }
        
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
        // Aktualisiere doors und Leaderboard, damit das Live-Update funktioniert
        // fetchDoors aktualisiert nur im Hintergrund, ohne globales Loading
        const refreshDoors = async () => {
          try {
            const year = new Date().getFullYear();
            const response = await fetch(`/api/advent-calendar/doors?year=${year}&theme=${encodeURIComponent(selectedTheme)}`, {
              headers: {
                'x-login-code': loginCode || '',
                'x-advent-theme': selectedTheme || ''
              }
            });
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                setDoors(data);
              }
            }
          } catch (error) {
            console.error('Fehler beim Aktualisieren der Türchen:', error);
          }
        };
        
        await Promise.all([
          refreshDoors(),
          fetchLeaderboard(),
          fetchDoorResults(selectedDoor.id),
          fetchDailyStats(selectedDoor.id)
        ]);
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
    { key: 'Mathe Basics', emoji: '➗', color: '#e3f2fd', description: 'Grundrechenarten, Zahlen, Kopfrechnen' },
    { key: 'Informatik', emoji: '💻', color: '#fff3e0', description: 'Binärsystem, Computer-Grundlagen, Logik' },
    { key: 'Tiere', emoji: '🐾', color: '#e8f5e9', description: 'Tierwissen, Naturkunde, Tier-Fakten' },
    { key: 'Weltraum', emoji: '🌌', color: '#ede7f6', description: 'Planeten, Sterne, Weltall-Mysterien' },
    { key: 'Natur & Umwelt', emoji: '🌿', color: '#e0f2f1', description: 'Umweltschutz, Natur, Nachhaltigkeit' },
    { key: 'Weihnachten', emoji: '🎅', color: '#ffebee', description: 'Weihnachtsbräuche, Traditionen, Festtagswissen' },
    { key: 'Spiele & Rätsel', emoji: '🧩', color: '#f3e5f5', description: 'Knobeln, Rätsel, Denkspiele' },
    { key: 'Geografie', emoji: '🌍', color: '#e1f5fe', description: 'Länder, Städte, Kontinente' },
    { key: 'Musik & Rhythmus', emoji: '🎵', color: '#fce4ec', description: 'Musiktheorie, Instrumente, Rhythmus' },
    { key: 'Essen & Küche', emoji: '🍎', color: '#fff8e1', description: 'Kochen, Lebensmittel, Rezepte' }
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
    setShowHint(false);
    setDailyStats(null);
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
          {doors.length > 0 && (() => {
            // Finde das nächste offene Türchen
            const currentDate = new Date();
            const currentDay = currentDate.getDate();
            const isDecember = currentDate.getMonth() === 11;
            const simulationMode = !isDecember;
            const maxOpenableDay = simulationMode ? 24 : currentDay;
            
            const openableDoors = doors.filter(d => d.isOpenable && !d.hasSubmission);
            const nextDoor = openableDoors.length > 0 
              ? openableDoors.sort((a, b) => a.day - b.day)[0]
              : null;
            
            return nextDoor && (
              <Card sx={{ mb: 1.5, p: 1, bgcolor: '#fff3cd', border: '1px solid #ffc107' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '1.2rem' }}>📅</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#856404' }}>
                      {isDecember 
                        ? `Heute (${currentDay}. Dez.): Türchen ${nextDoor.day}`
                        : `Als nächstes: Türchen ${nextDoor.day}`
                      }
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#856404' }}>
                      Klicke auf Türchen {nextDoor.day} um es zu öffnen!
                    </Typography>
                  </Box>
                </Box>
              </Card>
            );
          })()}
          {loading && doors.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              {/* Skeleton Loading */}
              {[
                [1],
                [2, 3],
                [4, 5, 6],
                [7, 8, 9, 10],
                [11, 12, 13, 14, 15],
                [16, 17, 18, 19, 20, 21],
                [22, 23, 24]
              ].map((row, rowIndex) => (
                <Box 
                  key={rowIndex}
                  sx={{ 
                    display: 'flex', 
                    gap: 0.5, 
                    justifyContent: 'center'
                  }}
                >
                  {row.map((dayNum) => (
                    <Card
                      key={dayNum}
                      sx={{
                        width: { xs: 50, sm: 60 },
                        height: { xs: 50, sm: 60 },
                        borderRadius: 1.2,
                        bgcolor: '#e0e0e0',
                        animation: 'pulse 1.5s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.5 }
                        }
                      }}
                    />
                  ))}
                </Box>
              ))}
            </Box>
          ) : doors.length === 0 ? (
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
                          tabIndex={door.isOpenable ? 0 : -1}
                          data-door-day={door.day}
                          role="button"
                          aria-label={`Türchen ${door.day} ${door.hasSubmission ? '(bereits geöffnet)' : door.isOpenable ? '(öffnen)' : '(noch nicht verfügbar)'}`}
                          sx={{
                            position: 'relative',
                            cursor: door.isOpenable ? 'pointer' : 'not-allowed',
                            transform: isOpening ? 'rotateY(-90deg) scale(0.9)' : 'rotateY(0deg)',
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            outline: 'none',
                            '&:focus-visible': {
                              outline: '2px solid #2e7d32',
                              outlineOffset: 2,
                              borderRadius: 1.2
                            },
                            '&:hover': door.isOpenable && !isOpening ? {
                              transform: 'translateY(-3px) scale(1.08)',
                              '& .door-card': {
                                boxShadow: '0 6px 12px rgba(0,0,0,0.25)',
                                borderColor: isToday ? '#ffd700' : '#fff'
                              }
                            } : {},
                            '&:active': door.isOpenable && !isOpening ? {
                              transform: 'translateY(0) scale(1.05)'
                            } : {}
                          }}
                          onClick={() => {
                            if (door.isOpenable && !isOpening) {
                              handleDoorClick(door);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (door.isOpenable && !isOpening) {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleDoorClick(door);
                              }
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

                            {/* Status Icon & Sterne */}
                            {(() => {
                              const totalCorrect = doors.filter(d => d.hasSubmission && d.mySubmission?.isCorrect).length;
                              const starCount = Math.min(5, Math.floor((totalCorrect / 24) * 5) + (door.mySubmission?.isCorrect ? 1 : 0));
                              
                              return (
                                <>
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
                                  {/* Farbige Sterne je nach Fortschritt */}
                                  {door.mySubmission?.isCorrect && (
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        bottom: 2,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        display: 'flex',
                                        gap: 0.1,
                                        animation: 'fadeIn 0.5s ease-out',
                                        '@keyframes fadeIn': {
                                          '0%': { opacity: 0, transform: 'translateX(-50%) scale(0)' },
                                          '100%': { opacity: 1, transform: 'translateX(-50%) scale(1)' }
                                        }
                                      }}
                                    >
                                      {Array.from({ length: Math.min(5, starCount) }).map((_, idx) => {
                                        const starColors = ['#ffd700', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
                                        return (
                                          <Typography
                                            key={idx}
                                            sx={{
                                              fontSize: '0.5rem',
                                              color: starColors[idx] || '#ffd700',
                                              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                                              animation: `twinkle ${1 + idx * 0.2}s ease-in-out infinite`,
                                              animationDelay: `${idx * 0.1}s`,
                                              '@keyframes twinkle': {
                                                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                '50%': { opacity: 0.7, transform: 'scale(0.9)' }
                                              }
                                            }}
                                          >
                                            ⭐
                                          </Typography>
                                        );
                                      })}
                                    </Box>
                                  )}
                                </>
                              );
                            })()}
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
                {/* Podium für Top 3 */}
                {leaderboard.leaderboard.length >= 3 && (
                  <Box sx={{ mb: 1.5, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666', mb: 0.5, display: 'block' }}>
                      🏆 Siegertreppchen
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0.5, px: 0.5 }}>
                      {/* 2. Platz (Silber) */}
                      {leaderboard.leaderboard[1] && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: '#c0c0c0',
                              fontSize: '1.2rem',
                              mb: 0.5,
                              boxShadow: '0 2px 8px rgba(192,192,192,0.4)',
                              border: '2px solid #9e9e9e'
                            }}
                          >
                            {leaderboard.leaderboard[1].avatarEmoji || '🎓'}
                          </Avatar>
                          <Box sx={{ bgcolor: '#e0e0e0', width: '100%', height: 40, borderRadius: '4px 4px 0 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#666' }}>
                              {leaderboard.leaderboard[1].studentName.split(' ')[0]}
                            </Typography>
                            <Box sx={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)' }}>
                              <Typography sx={{ fontSize: '1.2rem' }}>🥈</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      {/* 1. Platz (Gold) */}
                      {leaderboard.leaderboard[0] && (
                        <Box sx={{ flex: 1.1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 42,
                              height: 42,
                              bgcolor: '#ffd700',
                              fontSize: '1.3rem',
                              mb: 0.5,
                              boxShadow: '0 4px 12px rgba(255,215,0,0.5)',
                              border: '2px solid #ffed4e',
                              animation: 'glow 2s ease-in-out infinite',
                              '@keyframes glow': {
                                '0%, 100%': { boxShadow: '0 4px 12px rgba(255,215,0,0.5)' },
                                '50%': { boxShadow: '0 4px 16px rgba(255,215,0,0.8)' }
                              }
                            }}
                          >
                            {leaderboard.leaderboard[0].avatarEmoji || '👑'}
                          </Avatar>
                          <Box sx={{ bgcolor: '#ffd700', width: '100%', height: 50, borderRadius: '4px 4px 0 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#8b6914' }}>
                              {leaderboard.leaderboard[0].studentName.split(' ')[0]}
                            </Typography>
                            <Box sx={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)' }}>
                              <Typography sx={{ fontSize: '1.4rem' }}>🥇</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      {/* 3. Platz (Bronze) */}
                      {leaderboard.leaderboard[2] && (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: '#cd7f32',
                              fontSize: '1.2rem',
                              mb: 0.5,
                              boxShadow: '0 2px 8px rgba(205,127,50,0.4)',
                              border: '2px solid #b87333'
                            }}
                          >
                            {leaderboard.leaderboard[2].avatarEmoji || '🎓'}
                          </Avatar>
                          <Box sx={{ bgcolor: '#e8a87c', width: '100%', height: 35, borderRadius: '4px 4px 0 0', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#7a4f1f' }}>
                              {leaderboard.leaderboard[2].studentName.split(' ')[0]}
                            </Typography>
                            <Box sx={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)' }}>
                              <Typography sx={{ fontSize: '1.2rem' }}>🥉</Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
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
                            <Box
                              sx={{
                                position: 'relative',
                                '&:hover .runner-tooltip': {
                                  opacity: 1,
                                  visibility: 'visible',
                                  transform: 'translate(-50%, -100%) scale(1)'
                                }
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 30,
                                  height: 30,
                                  bgcolor: isMe ? '#2e7d32' : '#c62828',
                                  fontSize: '1rem',
                                  boxShadow: isMe ? '0 0 0 2px #ffd700' : 'none',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s',
                                  '&:hover': {
                                    transform: 'scale(1.15)'
                                  }
                                }}
                              >
                                {e.avatarEmoji || '🎓'}
                              </Avatar>
                              {/* Tooltip */}
                              <Box
                                className="runner-tooltip"
                                sx={{
                                  position: 'absolute',
                                  left: '50%',
                                  top: 0,
                                  transform: 'translate(-50%, -100%) scale(0.9)',
                                  transformOrigin: 'bottom center',
                                  opacity: 0,
                                  visibility: 'hidden',
                                  transition: 'all 0.2s ease',
                                  background: 'rgba(255,255,255,0.98)',
                                  border: `2px solid ${isMe ? '#2e7d32' : '#c62828'}`,
                                  borderRadius: 1,
                                  px: 0.75,
                                  py: 0.4,
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  mb: 0.5,
                                  zIndex: 1000,
                                  pointerEvents: 'none',
                                  '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: -6,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: `6px solid ${isMe ? '#2e7d32' : '#c62828'}`
                                  }
                                }}
                              >
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: isMe ? '#2e7d32' : '#c62828', mb: 0.2 }}>
                                  {isMe ? '👤 Du' : e.studentName}
                                </Typography>
                                <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>
                                  🏆 {e.correctSubmissions}/24 richtig • Rang {e.rank}
                                </Typography>
                              </Box>
                            </Box>
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
                    
                    // Badges/Achievements berechnen
                    const completedDoors = doors.filter(d => d.hasSubmission && d.mySubmission?.isCorrect);
                    const correctCount = completedDoors.length;
                    const earlyDoors = doors.filter(d => d.day <= 3 && d.hasSubmission && d.mySubmission?.isCorrect).length;
                    
                    // Streak berechnen: Tage in Folge
                    const submittedDays = doors
                      .filter(d => d.hasSubmission)
                      .map(d => d.day)
                      .sort((a, b) => a - b);
                    
                    let maxStreak = 0;
                    let currentStreak = 0;
                    let lastDay = 0;
                    for (const day of submittedDays) {
                      if (day === lastDay + 1) {
                        currentStreak++;
                      } else {
                        maxStreak = Math.max(maxStreak, currentStreak);
                        currentStreak = 1;
                      }
                      lastDay = day;
                    }
                    maxStreak = Math.max(maxStreak, currentStreak);
                    
                    // Vergleich mit anderen berechnen
                    const betterThan = leaderboard.leaderboard.filter(e => e.correctSubmissions < me.correctSubmissions).length;
                    const betterThanPercent = leaderboard.totalStudents > 0 
                      ? Math.round((betterThan / leaderboard.totalStudents) * 100)
                      : 0;
                    
                    const badges = [];
                    if (correctCount === 24) badges.push({ emoji: '🌟', label: 'Perfekt', color: '#ffd700' });
                    if (earlyDoors >= 3) badges.push({ emoji: '🚀', label: 'Schnellstarter', color: '#4caf50' });
                    if (maxStreak >= 7) badges.push({ emoji: '🔥', label: 'Ausdauer', color: '#ff5722' });
                    
                    return (
                      <Box>
                        {/* Streak-Counter */}
                        {maxStreak > 0 && (
                          <Box sx={{ mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              icon={<Typography sx={{ fontSize: '0.9rem' }}>🔥</Typography>}
                              label={`${maxStreak} Tag${maxStreak > 1 ? 'e' : ''} in Folge`}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                height: 22,
                                bgcolor: maxStreak >= 7 ? '#ff5722' : '#ff9800',
                                color: '#fff',
                                fontWeight: 600,
                                '& .MuiChip-icon': { color: '#fff' }
                              }}
                            />
                            {betterThanPercent > 0 && (
                              <Chip
                                label={`Besser als ${betterThanPercent}%`}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 22,
                                  bgcolor: '#4caf50',
                                  color: '#fff',
                                  fontWeight: 600
                                }}
                              />
                            )}
                          </Box>
                        )}
                        {badges.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75, flexWrap: 'wrap' }}>
                            {badges.map((badge, idx) => (
                              <Chip
                                key={idx}
                                icon={<Typography sx={{ fontSize: '0.9rem' }}>{badge.emoji}</Typography>}
                                label={badge.label}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: 22,
                                  bgcolor: badge.color,
                                  color: '#fff',
                                  fontWeight: 600,
                                  '& .MuiChip-icon': { color: '#fff' }
                                }}
                              />
                            ))}
                          </Box>
                        )}
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
        onKeyDown={(e) => {
          // Enter zum Schließen, wenn bereits eingereicht wurde
          if (e.key === 'Enter' && selectedDoor?.hasSubmission && !showResults) {
            e.preventDefault();
            handleCloseDialog();
          }
        }}
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
            <DialogTitle sx={{ bgcolor: '#2e7d32', color: '#fff', py: 1, px: 1.5, ...dialogCloseTitleSx }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                  {doorIcons[selectedDoor.day - 1] || '🎁'} Türchen {selectedDoor.day}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setShowThemePicker(true);
                    handleCloseDialog();
                  }}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.6)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    py: 0.2,
                    px: 0.6,
                    minWidth: 'auto',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderColor: '#fff'
                    }
                  }}
                >
                  Thema ändern
                </Button>
              </Box>
              <DialogCloseIconButton
                onClose={handleCloseDialog}
                sx={{
                  color: '#fff',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'scale(1.2) rotate(90deg)',
                    bgcolor: 'rgba(255,255,255,0.2)',
                  },
                }}
                iconSx={{ color: '#fff' }}
              />
            </DialogTitle>
            <DialogContent sx={{ mt: 1.5, px: 1.5, pb: 1.5, position: 'relative' }}>
              {/* Konfetti-Animation */}
              {showConfetti && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  {Array.from({ length: 50 }).map((_, idx) => {
                    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0'];
                    const left = Math.random() * 100;
                    const delay = Math.random() * 0.5;
                    const duration = 2 + Math.random() * 1;
                    const size = 8 + Math.random() * 8;
                    
                    return (
                      <Box
                        key={idx}
                        sx={{
                          position: 'absolute',
                          left: `${left}%`,
                          top: '-10px',
                          width: size,
                          height: size,
                          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                          borderRadius: '50%',
                          animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
                          '@keyframes confettiFall': {
                            '0%': {
                              transform: 'translateY(0) rotate(0deg)',
                              opacity: 1
                            },
                            '100%': {
                              transform: `translateY(600px) rotate(${360 + Math.random() * 360}deg)`,
                              opacity: 0
                            }
                          }
                        }}
                      />
                    );
                  })}
                </Box>
              )}
              {!showResults ? (
                <>
                  {/* Tägliche Statistiken */}
                  {dailyStats && dailyStats.todayTotal > 0 && (
                    <Box sx={{ mb: 1.5 }}>
                      <Card sx={{ bgcolor: '#e3f2fd', p: 0.75, borderRadius: 1, border: '1px solid #90caf9' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '1.2rem' }}>📊</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#1565c0' }}>
                              Heute haben {dailyStats.todayCorrect} von {dailyStats.todayTotal} Schülern richtig geantwortet
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(dailyStats.todayCorrect / dailyStats.todayTotal) * 100}
                              sx={{ 
                                height: 4, 
                                borderRadius: 2, 
                                mt: 0.5,
                                bgcolor: 'rgba(21, 101, 192, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: '#1565c0'
                                }
                              }}
                            />
                          </Box>
                        </Box>
                      </Card>
                    </Box>
                  )}
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#c62828', fontSize: '0.85rem' }}>
                          ❓ Aufgabe
                        </Typography>
                        {!selectedDoor.hasSubmission && (
                          <Button
                            size="small"
                            onClick={() => setShowHint(!showHint)}
                            sx={{
                              fontSize: '0.65rem',
                              py: 0.2,
                              px: 0.6,
                              minWidth: 'auto',
                              color: '#c62828',
                              '&:hover': {
                                bgcolor: 'rgba(198, 40, 40, 0.1)'
                              }
                            }}
                          >
                            {showHint ? '💡 Hinweis ausblenden' : '💡 Hinweis anzeigen'}
                          </Button>
                        )}
                      </Box>
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
                        {/* Optionaler Hinweis */}
                        {showHint && !selectedDoor.hasSubmission && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed rgba(198, 40, 40, 0.3)' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#c62828', display: 'block', mb: 0.5 }}>
                              💡 Tipp:
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#b71c1c', fontStyle: 'italic' }}>
                              {(() => {
                                const hints: Record<string, string[]> = {
                                  'Mathe Basics': [
                                    'Versuche die Aufgabe in kleinere Schritte zu zerlegen.',
                                    'Überlege, welche Rechenoperation du brauchst: Plus, Minus, Mal oder Geteilt?'
                                  ],
                                  'Informatik': [
                                    'Denke an das Binärsystem: 0 und 1 sind die Grundlage.',
                                    'Computer arbeiten mit 0 und 1 - das ist das Binärsystem.'
                                  ],
                                  'Tiere': [
                                    'Überlege, welche Tiere du kennst und zähle ihre Beine.',
                                    'Verschiedene Tiergruppen haben unterschiedlich viele Beine.'
                                  ],
                                  'Weltraum': [
                                    'Die Planeten sind in einer bestimmten Reihenfolge um die Sonne.',
                                    'Zähle die Planeten von innen nach außen.'
                                  ],
                                  'Natur & Umwelt': [
                                    'Denke an Dinge, die du täglich siehst und die recycelt werden können.',
                                    'Viele Materialien können wiederverwendet werden.'
                                  ],
                                  'Weihnachten': [
                                    'Überlege, was du über Weihnachten weißt.',
                                    'Traditionen und Bräuche können dir helfen.'
                                  ],
                                  'Spiele & Rätsel': [
                                    'Manchmal hilft es, rückwärts zu denken.',
                                    'Zerlege das Problem in kleinere Teile.'
                                  ],
                                  'Geografie': [
                                    'Europa hat viele Hauptstädte - denke an bekannte Länder.',
                                    'Kontinente sind große Landmassen auf der Erde.'
                                  ],
                                  'Musik & Rhythmus': [
                                    'Takte bestehen aus gleichmäßigen Schlägen.',
                                    'Überlege, welche Instrumente du kennst.'
                                  ],
                                  'Essen & Küche': [
                                    'Denke an alltägliche Dinge in der Küche.',
                                    'Viele Rezepte brauchen bestimmte Mengen.'
                                  ]
                                };
                                const themeHints = hints[selectedTheme] || ['Denke genau nach und überlege Schritt für Schritt.'];
                                return themeHints[(selectedDoor.day - 1) % themeHints.length];
                              })()}
                            </Typography>
                          </Box>
                        )}
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
                      <Card sx={{ 
                        bgcolor: selectedDoor.mySubmission?.isCorrect ? '#e8f5e9' : '#ffebee', 
                        p: 1, 
                        borderRadius: 1, 
                        mb: 1,
                        border: `1px solid ${selectedDoor.mySubmission?.isCorrect ? '#2e7d32' : '#c62828'}`
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#666' }}>
                            📝 Deine Antwort:
                          </Typography>
                          {selectedDoor.mySubmission?.submittedAt && (
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#999' }}>
                              {new Date(selectedDoor.mySubmission.submittedAt).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500, mb: 0.5 }}>
                          {selectedDoor.mySubmission?.answer}
                        </Typography>
                        {selectedDoor.explanation && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                            <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#666', mb: 0.25 }}>
                              💡 Erklärung:
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem' }}>
                              {selectedDoor.explanation}
                            </Typography>
                          </Box>
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
                      inputRef={answerInputRef}
                      fullWidth
                      label="Deine Antwort"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (answer.trim() && !submitting) {
                            handleSubmitAnswer();
                          }
                        }
                      }}
                      multiline
                      rows={2}
                      size="small"
                      autoFocus
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: '0.85rem'
                        }
                      }}
                      helperText="Tipp: Enter zum Einreichen, Shift+Enter für neue Zeile"
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
                    flexDirection: 'column',
                    gap: 0.5,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 12px rgba(0,0,0,0.12)'
                    },
                    border: selectedTheme === t.key ? '2px solid #2e7d32' : '1px solid #e0e0e0'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(0,0,0,0.05)' }}>{t.emoji}</Avatar>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{t.key}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666', mt: 0.25, lineHeight: 1.3 }}>
                    {t.description}
                  </Typography>
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


