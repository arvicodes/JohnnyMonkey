import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Check as CheckIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

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

interface Participation {
  id: string;
  startedAt: string;
  maxScore: number;
}

interface QuizParticipationPlayerProps {
  sessionId: string;
  studentId: string;
  onClose: () => void;
}

export const QuizParticipationPlayer: React.FC<QuizParticipationPlayerProps> = ({
  sessionId,
  studentId,
  onClose
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(0);

  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [wasAborted, setWasAborted] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Prüfe den Status der Teilnahme beim Laden
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/quiz-participations/${sessionId}/status?studentId=${studentId}`);
        if (response.ok) {
          const status = await response.json();
          if (status.participation) {
            // Teilnahme bereits gestartet
            setParticipation(status.participation);
                         if (status.participation.completedAt) {
               // Quiz bereits abgeschlossen
               setShowResults(true);
               loadResults(status.participation.id);
             } else {
              // Quiz läuft noch
              loadQuizData();
            }
          } else {
            // Keine Teilnahme vorhanden
            setLoading(false);
          }
        } else {
          setError('Fehler beim Prüfen des Teilnahme-Status');
        }
      } catch (err) {
        setError('Fehler beim Prüfen des Teilnahme-Status');
      }
    };

    checkStatus();
  }, [sessionId, studentId]);

  const loadQuizData = async () => {
    try {
      const response = await fetch(`/api/quiz-sessions/session/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setQuiz(sessionData.quiz);
        setTimeLeft(sessionData.quiz.timeLimit * 60);
        
        // Fragen mischen wenn gewünscht
        let shuffledQuestions = [...sessionData.quiz.questions];
        if (sessionData.quiz.shuffleQuestions) {
          shuffledQuestions = shuffledQuestions.sort(() => Math.random() - 0.5);
        }
        
        // Antworten mischen wenn gewünscht
        if (sessionData.quiz.shuffleAnswers) {
          shuffledQuestions = shuffledQuestions.map(q => ({
            ...q,
            options: [...q.options].sort(() => Math.random() - 0.5)
          }));
        }
        
        setQuestions(shuffledQuestions);
      } else {
        setError('Quiz-Daten konnten nicht geladen werden');
      }
    } catch (err) {
      setError('Fehler beim Laden der Quiz-Daten');
    }
  };

  const loadResults = async (participationId: string) => {
    try {
      const response = await fetch(`/api/quiz-participations/${participationId}/results?studentId=${studentId}`);
      if (response.ok) {
        const results = await response.json();
        setScore(results.participation.score || 0);
      }
    } catch (err) {
      console.error('Error loading results:', err);
    }
  };

  const handleStartParticipation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quiz-participations/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Starten der Teilnahme');
      }

      const data = await response.json();
      setQuiz(data.quiz);
      setParticipation(data.participation);
      setTimeLeft(data.quiz.timeLimit * 60);
      
      // Fragen mischen wenn gewünscht
      let shuffledQuestions = [...data.quiz.questions];
      if (data.quiz.shuffleQuestions) {
        shuffledQuestions = shuffledQuestions.sort(() => Math.random() - 0.5);
      }
      
      // Antworten mischen wenn gewünscht
      if (data.quiz.shuffleAnswers) {
        shuffledQuestions = shuffledQuestions.map(q => ({
          ...q,
          options: [...q.options].sort(() => Math.random() - 0.5)
        }));
      }
      
      setQuestions(shuffledQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Starten der Teilnahme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft <= 0 && quiz) {
      setWasAborted(true);
      finishQuiz();
      return;
    }

    if (timeLeft > 0 && quiz) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, quiz]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(answers[questions[currentQuestionIndex + 1].id] || '');
      setFocusedOptionIndex(0);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(answers[questions[currentQuestionIndex - 1].id] || '');
      setFocusedOptionIndex(0);
    }
  };

  const finishQuiz = async () => {
    if (!participation) return;

    try {
      const response = await fetch(`/api/quiz-participations/${participation.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        const result = await response.json();
        setScore(result.score);
        setShowResults(true);
      } else {
        setError('Fehler beim Abschließen des Quiz');
      }
    } catch (err) {
      setError('Fehler beim Abschließen des Quiz');
    }
  };

  const handleAbortQuiz = () => {
    setWasAborted(true);
    finishQuiz();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleAbortQuiz();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentQuestion && focusedOptionIndex < currentQuestion.options.length - 1) {
        setFocusedOptionIndex(focusedOptionIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focusedOptionIndex > 0) {
        setFocusedOptionIndex(focusedOptionIndex - 1);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (currentQuestion) {
        // Wenn bereits eine Antwort ausgewählt wurde, gehe zur nächsten Frage
        if (answers[currentQuestion.id]) {
          if (currentQuestionIndex < questions.length - 1) {
            handleNextQuestion();
          } else {
            finishQuiz();
          }
        } else {
          // Ansonsten wähle die fokussierte Antwort aus
          const selectedOption = currentQuestion.options[focusedOptionIndex];
          if (selectedOption) {
            handleAnswerSelect(selectedOption);
          }
        }
      }
    } else if (e.key === 'ArrowRight' && currentQuestionIndex < questions.length - 1) {
      e.preventDefault();
      handleNextQuestion();
    } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
      e.preventDefault();
      handlePreviousQuestion();
    }
  };

  useEffect(() => {
    if (showResults) {
      setFocusedOptionIndex(0);
      dialogRef.current?.focus();
    }
  }, [currentQuestionIndex, showResults]);

  const currentQuestion = questions[currentQuestionIndex];

  // Zeige Start-Button wenn noch keine Teilnahme gestartet wurde
  if (!quiz && !participation) {
    return (
      <Dialog open={true} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Quiz-Teilnahme</Typography>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            Klicken Sie auf "Teilnahme starten", um mit dem Quiz zu beginnen.
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayIcon />}
            onClick={handleStartParticipation}
            disabled={loading}
            fullWidth
          >
            {loading ? 'Starte...' : 'Teilnahme starten'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!currentQuestion) {
    return (
      <Dialog open={true} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <Typography variant="body2">Lade Quiz...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (showResults) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" sx={{ textAlign: 'center', fontSize: '1.1rem' }}>
              Quiz Ergebnisse
              {wasAborted && (
                <Typography component="span" variant="body2" sx={{ ml: 1, color: '#f44336', fontSize: '0.8rem' }}>
                  (Vorzeitig abgebrochen)
                </Typography>
              )}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" sx={{ mb: 1, color: score === questions.length ? '#4caf50' : '#ff9800', fontSize: '1.3rem' }}>
              {score} von {questions.length} Fragen richtig
            </Typography>
            <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>
              {Math.round((score / questions.length) * 100)}% Erfolg
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, fontSize: '0.9rem' }}>Detaillierte Ergebnisse:</Typography>
              {questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = userAnswer === question.correctAnswer;
                
                return (
                  <Card key={question.id} sx={{ mb: 1, bgcolor: isCorrect ? '#e8f5e8' : '#ffebee' }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.8rem' }}>
                        Frage {index + 1}: {question.question}
                      </Typography>
                      <Typography variant="body2" sx={{ color: isCorrect ? '#4caf50' : '#f44336', fontSize: '0.75rem' }}>
                        Ihre Antwort: {userAnswer || 'Keine Antwort'}
                        {isCorrect ? ' ✓' : ' ✗'}
                      </Typography>
                      {!isCorrect && (
                        <Typography variant="body2" sx={{ color: '#4caf50', mt: 0.5, fontSize: '0.75rem' }}>
                          Richtige Antwort: {question.correctAnswer}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button 
            onClick={onClose} 
            variant="contained"
            size="small"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onClose();
              }
            }}
            sx={{
              minWidth: 80,
              height: 28,
              py: 0,
              px: 2,
              fontSize: '0.8rem',
              fontWeight: 'bold',
              borderRadius: 1,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              border: 'none',
              color: 'white',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
                transform: 'translateY(-2px) scale(1.02)'
              },
              '&:active': {
                transform: 'translateY(0px) scale(0.98)'
              }
            }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} maxWidth="md" fullWidth onKeyDown={handleKeyDown}>
      <div ref={dialogRef} tabIndex={-1}>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{quiz?.title}</Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              bgcolor: '#f5f5f5',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              border: '1px solid #e0e0e0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimerIcon color="primary" sx={{ fontSize: '1rem' }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '0.9rem' }}>
                  {formatTime(timeLeft)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '0.85rem' }}>
                Frage {currentQuestionIndex + 1} von {questions.length}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', fontWeight: 'bold', fontSize: '0.75rem' }}>
                {Math.round((currentQuestionIndex / questions.length) * 100)}% abgeschlossen
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(currentQuestionIndex / questions.length) * 100}
              sx={{ 
                height: 6,
                borderRadius: 3,
                bgcolor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: '#1976d2'
                }
              }}
            />
          </Box>

          <Card sx={{ 
            mb: 2,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body1" sx={{ 
                mb: 2,
                fontWeight: 'bold',
                fontSize: '0.95rem',
                lineHeight: 1.4,
                color: '#333'
              }}>
                {currentQuestion.question}
              </Typography>

              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <RadioGroup
                  value={selectedAnswer}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                >
                  {currentQuestion.options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option}
                      control={
                        <Radio 
                          sx={{
                            color: '#1976d2',
                            '&.Mui-checked': {
                              color: '#1976d2',
                            },
                          }}
                        />
                      }
                      label={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.9rem',
                            color: focusedOptionIndex === index ? '#1976d2' : '#333',
                            fontWeight: focusedOptionIndex === index ? 'bold' : 'normal'
                          }}
                        >
                          {option}
                        </Typography>
                      }
                      sx={{
                        margin: '8px 0',
                        padding: '8px 12px',
                        borderRadius: 1,
                        border: focusedOptionIndex === index ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        bgcolor: focusedOptionIndex === index ? '#f0f8ff' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: '#f5f5f5',
                          borderColor: '#1976d2'
                        }
                      }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              sx={{
                minWidth: 100,
                height: 36,
                fontSize: '0.8rem',
                fontWeight: 'bold',
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': {
                  borderColor: '#1565c0',
                  bgcolor: '#f0f8ff'
                }
              }}
            >
              Zurück
            </Button>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={finishQuiz}
                  disabled={Object.keys(answers).length < questions.length}
                  startIcon={<CheckIcon />}
                  sx={{
                    minWidth: 120,
                    height: 36,
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                      boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
                      transform: 'translateY(-1px)'
                    },
                    '&:disabled': {
                      background: '#ccc',
                      boxShadow: 'none',
                      transform: 'none'
                    }
                  }}
                >
                  Quiz beenden
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNextQuestion}
                  disabled={!selectedAnswer}
                  sx={{
                    minWidth: 100,
                    height: 36,
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      boxShadow: '0 4px 16px rgba(25, 118, 210, 0.4)',
                      transform: 'translateY(-1px)'
                    },
                    '&:disabled': {
                      background: '#ccc',
                      boxShadow: 'none',
                      transform: 'none'
                    }
                  }}
                >
                  Weiter
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
      </div>
    </Dialog>
  );
}; 