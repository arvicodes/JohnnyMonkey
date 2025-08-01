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
  Alert,
  IconButton
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Check as CheckIcon,
  Close as CloseIcon,
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

interface QuizPlayerProps {
  quiz: Quiz;
  onClose: () => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onClose }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit * 60); // Konvertiere zu Sekunden
  const [isFinished, setIsFinished] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [wasAborted, setWasAborted] = useState(false);
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fragen mischen wenn gewünscht
    let shuffledQuestions = [...quiz.questions];
    if (quiz.shuffleQuestions) {
      shuffledQuestions = shuffledQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Antworten mischen wenn gewünscht
    if (quiz.shuffleAnswers) {
      shuffledQuestions = shuffledQuestions.map(q => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5)
      }));
    }
    
    setQuestions(shuffledQuestions);
  }, [quiz]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setWasAborted(true);
      finishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(answers[questions[currentQuestionIndex + 1].id] || '');
    } else {
      finishQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(answers[questions[currentQuestionIndex - 1].id] || '');
    }
  };

  const finishQuiz = () => {
    let correctAnswers = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correctAnswer) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    setIsFinished(true);
    setShowResults(true);
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

  if (!currentQuestion) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2">Lade Quiz...</Typography>
      </Box>
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
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{quiz.title}</Typography>
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
                color: '#333',
                lineHeight: 1.3,
                fontSize: '0.9rem'
              }}>
                {currentQuestion.question}
              </Typography>
              
              {answers[currentQuestion.id] && (
                <Box sx={{ 
                  mb: 2, 
                  p: 1, 
                  bgcolor: '#e8f5e8', 
                  borderRadius: 1, 
                  border: '1px solid #4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <CheckIcon sx={{ fontSize: '1rem', color: '#4caf50' }} />
                  <Typography variant="body2" sx={{ color: '#2e7d32', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    Antwort ausgewählt: "{answers[currentQuestion.id]}"
                  </Typography>
                </Box>
              )}

              <FormControl component="fieldset" fullWidth>
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
                            '& .MuiSvgIcon-root': {
                              fontSize: '1rem'
                            }
                          }}
                        />
                      }
                      label={option}
                      sx={{
                        mb: 1,
                        p: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        width: '100%',
                        transition: 'all 0.2s ease-in-out',
                        bgcolor: focusedOptionIndex === index ? '#e3f2fd' : 'transparent',
                        borderColor: focusedOptionIndex === index ? '#1976d2' : '#e0e0e0',
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.8rem'
                        },
                        '&:hover': {
                          bgcolor: '#f8f9fa',
                          borderColor: '#1976d2',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                        },
                        '&.Mui-checked': {
                          bgcolor: '#e3f2fd',
                          borderColor: '#1976d2',
                          boxShadow: '0 1px 4px rgba(25,118,210,0.2)'
                        }
                      }}
                      tabIndex={focusedOptionIndex === index ? 0 : -1}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>

          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 2,
            pt: 2,
            borderTop: '1px solid #e0e0e0'
          }}>
            <Button
              variant="outlined"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              size="small"
              sx={{
                minWidth: 70,
                height: 28,
                py: 0,
                px: 1.5,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                borderRadius: 1,
                border: '2px solid #e0e0e0',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                color: '#495057',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  border: '2px solid #6c757d',
                  background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(108, 117, 125, 0.2)'
                },
                '&:active': {
                  transform: 'translateY(0px)'
                },
                '&:disabled': {
                  opacity: 0.4,
                  background: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  color: '#adb5bd'
                }
              }}
            >
              ← Zurück
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleAbortQuiz}
                size="small"
                sx={{
                  minWidth: 100,
                  height: 28,
                  py: 0,
                  px: 1.5,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  borderRadius: 1,
                  border: '2px solid #dc3545',
                  background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
                  color: '#dc3545',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    border: '2px solid #c53030',
                    background: 'linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%)',
                    color: '#c53030',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)'
                  }
                }}
              >
                Abbrechen
              </Button>
              
              <Button
                variant="contained"
                onClick={handleNextQuestion}
                disabled={!answers[currentQuestion.id]}
                size="small"
                sx={{
                  minWidth: 100,
                  height: 28,
                  py: 0,
                  px: 1.5,
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  borderRadius: 1,
                  border: 'none',
                  background: currentQuestionIndex === questions.length - 1 
                    ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                    : 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                  color: 'white',
                  boxShadow: currentQuestionIndex === questions.length - 1
                    ? '0 2px 8px rgba(72, 187, 120, 0.3)'
                    : '0 2px 8px rgba(66, 153, 225, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: currentQuestionIndex === questions.length - 1 
                      ? 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)'
                      : 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                    boxShadow: currentQuestionIndex === questions.length - 1
                      ? '0 4px 16px rgba(72, 187, 120, 0.4)'
                      : '0 4px 16px rgba(66, 153, 225, 0.4)',
                    transform: 'translateY(-2px) scale(1.02)'
                  },
                  '&:active': {
                    transform: 'translateY(0px) scale(0.98)'
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    background: '#e0e0e0',
                    color: '#666',
                    transform: 'none',
                    boxShadow: 'none'
                  }
                }}
              >
                {currentQuestionIndex === questions.length - 1 ? 'Beenden' : 'Weiter'}
                {answers[currentQuestion.id] && (
                  <Typography component="span" sx={{ ml: 0.5, fontSize: '0.6rem', opacity: 0.8 }}>
                    (Enter)
                  </Typography>
                )}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
            ⌨️ Tastatur: ↑↓ Antworten navigieren • Enter Antwort auswählen/Weiter • ←→ Fragen wechseln • ESC abbrechen
          </Typography>
        </Box>
      </div>
    </Dialog>
  );
};

export default QuizPlayer; 