import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  RestartAlt as RestartAltIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
} from '@mui/icons-material';

type EntryTicketTask = {
  category: string;
  prompt: string;
  solution: string;
};

const SLIDE_DURATION_SEC = 10;
const TARGET_TASK_COUNT = 20;
const DISPLAY_BOX_WIDTH = 1320;
const DISPLAY_BOX_HEIGHT = 340;
const FINAL_DISPLAY_BOX_HEIGHT = 500;
const OPERATOR_COLOR = '#ef6c00';
const QUESTION_COLOR = '#d32f2f';

const ENTRY_TICKET_TASK_POOL: EntryTicketTask[] = [
  { category: 'Kopfrechnen', prompt: '375 + 489 - 126 = ?', solution: '738' },
  { category: 'Negativzahlen', prompt: '-12 + 35 - 9 = ?', solution: '14' },
  { category: 'Multiplikation', prompt: '24 · 16 = ?', solution: '384' },
  { category: 'Proportional', prompt: '3 Hefte kosten 4,50 €. 7 Hefte kosten ?', solution: '10,50 €' },
  { category: 'Division', prompt: '840 : 24 = ?', solution: '35' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 3/4 ist kleiner als 2/3.', solution: 'Falsch' },
  { category: 'Überschlag', prompt: '49,80 € + 19,90 € grob gerundet = ?', solution: 'ca. 70 €' },
  { category: 'Geld', prompt: '50 € - 18,70 € - 9,95 € = ?', solution: '21,35 €' },
  { category: 'Einheiten', prompt: '3,75 m = ? cm', solution: '375 cm' },
  { category: 'Einheiten', prompt: '2,4 l = ? ml', solution: '2400 ml' },
  { category: 'Umfang', prompt: 'Rechteck 8 cm und 5 cm: Umfang = ?', solution: '26 cm' },
  { category: 'Zeit', prompt: 'Start 09:35 Uhr, Dauer 2 h 25 min. Ende um ? Uhr.', solution: '12:00 Uhr' },
  { category: 'Zeit', prompt: 'Von 08:50 Uhr bis 11:35 Uhr = ? min', solution: '165 min' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 2,5 l sind 250 ml.', solution: 'Falsch' },
  { category: 'Bruch', prompt: '3/4 + 2/3 = ?', solution: '17/12 (1 5/12)' },
  { category: 'Bruch', prompt: '5/8 von 64 = ?', solution: '40' },
  { category: 'Dezimal', prompt: '4,75 + 2,9 - 1,35 = ?', solution: '6,30' },
  { category: 'Dezimal', prompt: '0,25 · 48 = ?', solution: '12' },
  { category: 'Prozent', prompt: '15% von 240 = ?', solution: '36' },
  { category: 'Prozent', prompt: '240 € + 12% = ?', solution: '268,80 €' },
  { category: 'Prozent', prompt: '320 € - 17,5% = ?', solution: '264 €' },
  { category: 'Supermarkt', prompt: '6 · 1,79 € + 3 · 2,49 € = ?', solution: '18,21 €' },
  { category: 'Schätzen', prompt: '1,98 m ist näher an 1,5 m oder 2,0 m?', solution: '2,0 m' },
  { category: 'Regalmaße', prompt: '2 Bretter 118 cm + 3 Bretter 74 cm = ?', solution: '458 cm' },
  { category: 'Regalmaße', prompt: 'Wand 2,60 m - Regal 2,15 m = ? cm', solution: '45 cm' },
  { category: 'Kopfrechnen', prompt: '48 · 25 = ?', solution: '1200' },
  { category: 'Kopfrechnen', prompt: '1331 : 11 = ?', solution: '121' },
  { category: 'Muster', prompt: 'Zahlenmuster: 3, 6, 12, 24, ... nächste Zahl = ?', solution: '48' },
  { category: 'Einheiten', prompt: '2,75 km + 850 m = ? m', solution: '3600 m' },
  { category: 'Zeit', prompt: 'Film 1 h 58 min, Start 20:17 Uhr. Ende um ? Uhr.', solution: '22:15 Uhr' },
  { category: 'Bruch/Dezimal', prompt: '7/8 als Dezimalzahl = ?', solution: '0,875' },
  { category: 'Prozent', prompt: '3,5% von 800 = ?', solution: '28' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 15% von 200 sind 25.', solution: 'Falsch' },
  { category: 'Alltag', prompt: '36 km bei 90 km/h = ? min', solution: '24 min' },
  { category: 'Logik', prompt: '3 Kisten mit je 12 Flaschen, 5 Flaschen kaputt. Wie viele ganz?', solution: '31' },
  { category: 'Mittelwert', prompt: 'Noten 2, 3, 2, 1. Durchschnitt = ?', solution: '2,0' },
  { category: 'Fläche', prompt: 'Rechteck 12 cm · 7 cm: Fläche = ?', solution: '84 cm²' },
  { category: 'Skalierung', prompt: 'Rezept für 4 Personen, du kochst für 6: Faktor = ?', solution: '1,5' },
  { category: 'Wahr/Falsch', prompt: 'Wahr oder falsch: 0,4 entspricht 40%.', solution: 'Wahr' },
  { category: 'Reihenfolge', prompt: 'Ordne aufsteigend: 0,5 ; 0,05 ; 0,55.', solution: '0,05 < 0,5 < 0,55' },
  { category: 'Geometrie', prompt: 'Quadrat mit Seitenlänge 9 cm: Fläche = ?', solution: '81 cm²' },
  { category: 'Kombi', prompt: '2 T-Shirts à 14,90 € und 1 Hose 39,90 €: Gesamt = ?', solution: '69,70 €' },
];

export default function EntryTicketPage() {
  const navigate = useNavigate();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<EntryTicketTask[]>(
    ENTRY_TICKET_TASK_POOL.slice(0, TARGET_TASK_COUNT),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(SLIDE_DURATION_SEC);
  const [isRunning, setIsRunning] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [sessionDone, setSessionDone] = useState(false);

  const isTeacher = useMemo(() => Boolean(localStorage.getItem('teacherId')), []);
  const activeTasks = selectedTasks;
  const totalRunSeconds = activeTasks.length * SLIDE_DURATION_SEC;
  const currentTask = activeTasks[currentIndex] ?? activeTasks[0];
  const completedSlides = currentIndex + (sessionDone ? 1 : 0);
  const progressPercent =
    activeTasks.length > 0 ? Math.min((completedSlides / activeTasks.length) * 100, 100) : 0;
  const elapsedSeconds = currentIndex * SLIDE_DURATION_SEC + (SLIDE_DURATION_SEC - secondsLeft);
  const remainingSeconds = Math.max(totalRunSeconds - elapsedSeconds, 0);

  useEffect(() => {
    if (!sessionStarted || !isRunning || sessionDone || activeTasks.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        setCurrentIndex((prevIndex) => {
          const next = prevIndex + 1;
          if (next >= activeTasks.length) {
            setSessionDone(true);
            setIsRunning(false);
            return prevIndex;
          }
          return next;
        });
        return SLIDE_DURATION_SEC;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTasks.length, isRunning, sessionDone, sessionStarted]);

  const startSession = () => {
    setSessionStarted(true);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(SLIDE_DURATION_SEC);
    setShowSolutions(false);
    setTeacherNotes('');
    setIsRunning(true);
  };

  const startOrResume = () => {
    if (sessionDone) {
      setSessionDone(false);
      setCurrentIndex(0);
      setSecondsLeft(SLIDE_DURATION_SEC);
    }
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
  };

  const replaceTaskAtIndex = (index: number) => {
    setSelectedTasks((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const currentPrompt = prev[index].prompt;
      const usedPrompts = new Set(prev.map((task) => task.prompt));
      usedPrompts.delete(currentPrompt);
      const replacement = ENTRY_TICKET_TASK_POOL.find(
        (task) => task.prompt !== currentPrompt && !usedPrompts.has(task.prompt),
      );
      if (!replacement) return prev;
      const next = [...prev];
      next[index] = replacement;
      return next;
    });
  };

  const handleBack = () => {
    if (sessionStarted) {
      setSessionStarted(false);
      setIsRunning(false);
      setSessionDone(false);
      setCurrentIndex(0);
      setSecondsLeft(SLIDE_DURATION_SEC);
      setShowSolutions(false);
      return;
    }
    navigate(-1);
  };

  const restart = () => {
    setIsRunning(false);
    setSessionDone(false);
    setCurrentIndex(0);
    setSecondsLeft(SLIDE_DURATION_SEC);
    setShowSolutions(false);
    setTeacherNotes('');
  };

  const goNext = () => {
    if (sessionDone) return;
    if (currentIndex >= activeTasks.length - 1) {
      setSessionDone(true);
      setIsRunning(false);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSecondsLeft(SLIDE_DURATION_SEC);
  };

  const goPrevious = () => {
    if (sessionDone) {
      setSessionDone(false);
      setCurrentIndex(activeTasks.length - 1);
      setSecondsLeft(SLIDE_DURATION_SEC);
      return;
    }
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setSecondsLeft(SLIDE_DURATION_SEC);
  };

  const formatMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (sessionStarted) goPrevious();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (sessionStarted) goNext();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!sessionStarted) {
          startSession();
          return;
        }
        if (isRunning) {
          pause();
        } else {
          startOrResume();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, handleBack, isRunning, sessionStarted, startOrResume]);

  const formatPromptForDisplay = (prompt: string): string => {
    return prompt
      .replace(/\. /g, '.\n')
      .replace(/, Dauer /g, ',\nDauer ')
      .replace(/ bis /g, '\nbis ');
  };

  const cleanPrompt = (prompt: string): string =>
    prompt.replace(/\s{2,}/g, ' ').trim();

  const colorizeOperators = (text: string, keyPrefix: string, large = false) => {
    const parts = text.split(/([+\-·:÷=<>%?])/g);
    return parts.map((part, index) => {
      const isOperator = /^[+\-·:÷=<>%]$/.test(part);
      const isQuestionMark = part === '?';
      if (!isOperator && !isQuestionMark) return <Box component="span" key={`${keyPrefix}-t-${index}`}>{part}</Box>;
      if (isQuestionMark) {
        return (
          <Box
            component="span"
            key={`${keyPrefix}-q-${index}`}
            sx={{ color: QUESTION_COLOR, fontWeight: 800, fontSize: '1.08em' }}
          >
            ?
          </Box>
        );
      }
      return (
        <Box
          component="span"
          key={`${keyPrefix}-o-${index}`}
          sx={{
            color: OPERATOR_COLOR,
            fontWeight: 900,
            mx: large ? 0.15 : 0.05,
            px: 0,
            textShadow: '0 0 0.2px currentColor',
          }}
        >
          {part}
        </Box>
      );
    });
  };

  const renderPrompt = (prompt: string, keyPrefix: string, large = false, singleLine = false) => {
    const text = cleanPrompt(prompt);
    const normalized = text.toLowerCase();
    const wfPrefix = 'wahr oder falsch:';

    if (normalized.startsWith(wfPrefix)) {
      const statement = text.slice(wfPrefix.length).trim();
      if (singleLine) {
        return (
          <>
            <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
              Wahr oder falsch?
            </Box>{' '}
            {colorizeOperators(statement, `${keyPrefix}-wf-inline`, large)}
          </>
        );
      }
      return (
        <>
          <Box component="span" sx={{ fontWeight: 700, color: '#37474f' }}>
            Wahr oder falsch?
          </Box>{' '}
          {colorizeOperators(statement, `${keyPrefix}-wf`, large)}
        </>
      );
    }

    return <>{colorizeOperators(text, `${keyPrefix}-std`, large)}</>;
  };

  const renderPromptWithInlineGreenSolution = (prompt: string, solution: string, keyPrefix: string) => {
    const cleaned = cleanPrompt(prompt);
    const questionIndex = cleaned.indexOf('?');
    if (questionIndex < 0) return renderPrompt(cleaned, keyPrefix, false, true);

    const before = cleaned.slice(0, questionIndex);
    const after = cleaned.slice(questionIndex + 1);
    const needsSpaceBefore = before.length > 0 && !before.endsWith(' ');
    const needsSpaceAfter = after.length > 0 && !after.startsWith(' ');
    return (
      <>
        {renderPrompt(before, `${keyPrefix}-before`, false, true)}
        {needsSpaceBefore ? ' ' : ''}
        <Box component="span" sx={{ color: 'success.dark', fontWeight: 800 }}>
          {solution}
        </Box>
        {needsSpaceAfter ? ' ' : ''}
        {renderPrompt(after, `${keyPrefix}-after`, false, true)}
      </>
    );
  };

  const formattedPrompt = currentTask ? formatPromptForDisplay(cleanPrompt(currentTask.prompt)) : '';
  const finalSlideRows = Math.ceil(activeTasks.length / 2);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fb', py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2.5 } }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Tooltip title="Zurück">
            <IconButton
              onClick={handleBack}
              size="small"
              aria-label="Zurück"
              sx={{
                p: 0,
                minWidth: 32,
                width: 32,
                height: 32,
                bgcolor: 'white',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <Typography variant="h6" sx={{ color: '#1a237e' }}>
            EntryTicket
          </Typography>

          <Box sx={{ width: 32, height: 32 }} />
        </Box>

        <Card sx={{ borderRadius: 2, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {!sessionStarted ? (
              <Box
                sx={{
                  width: DISPLAY_BOX_WIDTH,
                  minWidth: DISPLAY_BOX_WIDTH,
                  maxWidth: DISPLAY_BOX_WIDTH,
                  borderRadius: 2,
                  border: '1px solid #d9e0ff',
                  bgcolor: '#f8faff',
                  p: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Auswahl vor Start ({activeTasks.length}/{TARGET_TASK_COUNT})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedTasks(ENTRY_TICKET_TASK_POOL.slice(0, TARGET_TASK_COUNT))}
                    >
                      Reset
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                      onClick={startSession}
                      sx={{ minWidth: 96 }}
                    >
                      Start
                    </Button>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: `repeat(${Math.ceil(activeTasks.length / 2)}, minmax(0, auto))`,
                    gridAutoFlow: 'column',
                    gap: 0.65,
                  }}
                >
                  {activeTasks.map((task, index) => (
                    <Box
                      key={`${index}-${task.prompt}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 0.75,
                        p: 0.7,
                        borderRadius: 1.25,
                        bgcolor: 'white',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
                        <Box component="span" sx={{ fontWeight: 400 }}>
                          {index + 1}.
                        </Box>{' '}
                        <Box component="span" sx={{ fontWeight: 700 }}>
                          {renderPrompt(task.prompt, `selection-${index}`, false, true)}
                        </Box>
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => replaceTaskAtIndex(index)}
                        sx={{ minWidth: 22, width: 22, height: 22, p: 0, lineHeight: 1 }}
                      >
                        ×
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 10,
                    borderRadius: 99,
                    mb: 1.25,
                    bgcolor: '#e3e9ff',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, #3949ab 0%, #1e88e5 100%)',
                    },
                  }}
                />

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 0.75,
                    flexWrap: 'nowrap',
                    mb: 1,
                    overflowX: 'auto',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, whiteSpace: 'nowrap' }}>
                    <Chip size="small" label={`${sessionDone ? activeTasks.length : currentIndex + 1}/${activeTasks.length}`} />
                    <Chip size="small" label={formatMMSS(remainingSeconds)} color="info" />
                    {!sessionDone && <Chip size="small" label={`${secondsLeft}s`} color="warning" />}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
                <Tooltip title="Vorherige Folie">
                  <span>
                    <IconButton
                      size="small"
                      onClick={goPrevious}
                      aria-label="Vorherige Folie"
                      disabled={currentIndex === 0 && !sessionDone}
                      sx={{
                        p: 0,
                        minWidth: 24,
                        width: 24,
                        height: 24,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <SkipPreviousIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                {!isRunning ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                    onClick={startOrResume}
                    sx={{ minHeight: 24, py: 0, px: 0.75, minWidth: 64 }}
                  >
                    {sessionDone ? 'Neu' : 'Weiter'}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<PauseIcon sx={{ fontSize: 18 }} />}
                    onClick={pause}
                    sx={{ minHeight: 24, py: 0, px: 0.75, minWidth: 64 }}
                  >
                    Pause
                  </Button>
                )}
                <Tooltip title="Nächste Folie">
                  <span>
                    <IconButton
                      size="small"
                      onClick={goNext}
                      aria-label="Nächste Folie"
                      disabled={sessionDone}
                      sx={{
                        p: 0,
                        minWidth: 24,
                        width: 24,
                        height: 24,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <SkipNextIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  size="small"
                  onClick={restart}
                  aria-label="Zurücksetzen"
                  sx={{
                    p: 0,
                    minWidth: 24,
                    width: 24,
                    height: 24,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <RestartAltIcon sx={{ fontSize: 19 }} />
                </IconButton>
                  </Box>
                </Box>

                {!sessionDone ? (
                  <Box
                    sx={{
                      width: DISPLAY_BOX_WIDTH,
                      minWidth: DISPLAY_BOX_WIDTH,
                      maxWidth: DISPLAY_BOX_WIDTH,
                      height: DISPLAY_BOX_HEIGHT,
                      minHeight: DISPLAY_BOX_HEIGHT,
                      maxHeight: DISPLAY_BOX_HEIGHT,
                      borderRadius: 2,
                      p: { xs: 2, sm: 3 },
                      border: '1px solid #d9e0ff',
                      bgcolor: '#f8faff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: 1.2,
                    }}
                  >
                    <Typography
                      sx={{
                        width: '100%',
                        maxWidth: DISPLAY_BOX_WIDTH - 40,
                        fontSize: '4.5rem',
                        lineHeight: 1.1,
                        fontWeight: 500,
                        whiteSpace: 'pre-line',
                      }}
                    >
                      {renderPrompt(formattedPrompt, 'live', true)}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: DISPLAY_BOX_WIDTH,
                      minWidth: DISPLAY_BOX_WIDTH,
                      maxWidth: DISPLAY_BOX_WIDTH,
                      height: FINAL_DISPLAY_BOX_HEIGHT,
                      minHeight: FINAL_DISPLAY_BOX_HEIGHT,
                      maxHeight: FINAL_DISPLAY_BOX_HEIGHT,
                      borderRadius: 2,
                      p: { xs: 1.5, sm: 2 },
                      border: '1px solid #d9e0ff',
                      bgcolor: '#f8faff',
                      overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Alle Aufgaben
                      </Typography>
                      {isTeacher && (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={showSolutions}
                              onChange={(e) => setShowSolutions(e.target.checked)}
                            />
                          }
                          label="Lösungen anzeigen"
                          sx={{ mr: 0 }}
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gridTemplateRows: `repeat(${finalSlideRows}, minmax(0, auto))`,
                        gridAutoFlow: 'column',
                        gap: 0.8,
                        mt: 0.75,
                      }}
                    >
                      {activeTasks.map((task, index) => (
                        <Box
                          key={`${index}-${task.prompt}`}
                          sx={{
                            p: 0.72,
                            borderRadius: 1.5,
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontSize: '0.98rem', lineHeight: 1.16 }}>
                            {index + 1}.{' '}
                            {showSolutions
                              ? renderPromptWithInlineGreenSolution(task.prompt, task.solution, `final-${index}`)
                              : renderPrompt(task.prompt, `final-${index}`, false, true)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </>
            )}

            {sessionStarted && sessionDone && isTeacher && (
              <TextField
                multiline
                minRows={4}
                fullWidth
                label="Notizen / Rechenwege"
                placeholder="Rechenwege..."
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                sx={{ mt: 1.25 }}
              />
            )}

          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
