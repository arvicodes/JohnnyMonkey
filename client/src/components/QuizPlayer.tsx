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
  Avatar,
  Chip,
  Paper
} from '@mui/material';
import {
  Check as CheckIcon,
  Timer as TimerIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  Cancel as CancelIcon
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

  const finishQuiz = () => {
    const correctAnswers = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    setScore(correctAnswers);
    setShowResults(true);
  };

  const handleAbortQuiz = () => {
    if (window.confirm('Möchten Sie das Quiz wirklich abbrechen? Alle Antworten gehen verloren.')) {
      setWasAborted(true);
      finishQuiz();
    }
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
    const percentage = Math.round((score / questions.length) * 100);
    
    const getPerformanceColor = (percentage: number) => {
      if (percentage >= 90) return '#4caf50';
      if (percentage >= 70) return '#ff9800';
      if (percentage >= 50) return '#ff5722';
      return '#f44336';
    };

    const getPerformanceText = (percentage: number) => {
      if (percentage >= 90) return 'Ausgezeichnet!';
      if (percentage >= 70) return 'Gut gemacht!';
      if (percentage >= 50) return 'Befriedigend';
      return 'Verbesserung nötig';
    };

    const getPerformanceIcon = (percentage: number) => {
      if (percentage >= 90) return <TrophyIcon />;
      if (percentage >= 70) return <CheckIcon />;
      return <SchoolIcon />;
    };

    return (
      <Dialog 
        open={true} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 0.5, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '8px 8px 0 0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Avatar sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              width: 28, 
              height: 28 
            }}>
              {getPerformanceIcon(percentage)}
            </Avatar>
            <Typography variant="h6" sx={{ 
              textAlign: 'center', 
              fontSize: '1rem',
              fontWeight: 600,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              Quiz Ergebnisse
              {wasAborted && (
                <Typography component="span" variant="body2" sx={{ ml: 1, color: '#ffebee', fontSize: '0.7rem' }}>
                  (Vorzeitig abgebrochen)
                </Typography>
              )}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1.5, pb: 1 }}>
          {/* Performance Summary */}
          <Card sx={{ 
            mb: 1.5, 
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 1,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="h3" sx={{ 
                mb: 0.5, 
                color: getPerformanceColor(percentage),
                fontWeight: 700,
                fontSize: '1.8rem'
              }}>
                {percentage}%
              </Typography>
              
              <Typography variant="subtitle1" sx={{ 
                mb: 1, 
                color: getPerformanceColor(percentage),
                fontWeight: 600,
                fontSize: '0.8rem'
              }}>
                {getPerformanceText(percentage)}
              </Typography>

              <Box sx={{ mb: 1.5 }}>
                <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.9rem' }}>
                  {score} von {questions.length} Fragen richtig
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={percentage} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(90deg, ${getPerformanceColor(percentage)} 0%, ${getPerformanceColor(percentage)}dd 100%)`,
                      borderRadius: 4
                    }
                  }} 
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
                <Chip 
                  icon={<CheckIcon />}
                  label={`${score} Richtig`}
                  color="success"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                />
                <Chip 
                  icon={<CancelIcon />}
                  label={`${questions.length - score} Falsch`}
                  color="error"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card sx={{ 
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                mb: 2, 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <SchoolIcon color="primary" />
                Detaillierte Ergebnisse
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {questions.map((question, index) => {
                  const userAnswer = answers[question.id];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <Card 
                      key={question.id} 
                      sx={{ 
                        mb: 2, 
                        background: isCorrect 
                          ? 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
                          : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                        borderRadius: 2,
                        border: `2px solid ${isCorrect ? '#4caf50' : '#f44336'}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Avatar sx={{ 
                            bgcolor: isCorrect ? '#4caf50' : '#f44336',
                            width: 32,
                            height: 32,
                            fontSize: '0.9rem',
                            fontWeight: 600
                          }}>
                            {index + 1}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ 
                              fontWeight: 600, 
                              mb: 1,
                              color: isCorrect ? '#2e7d32' : '#c62828'
                            }}>
                              {question.question}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="body2" sx={{ 
                                color: isCorrect ? '#4caf50' : '#f44336',
                                fontWeight: 600
                              }}>
                                Ihre Antwort: {userAnswer || 'Keine Antwort'}
                              </Typography>
                              {isCorrect ? (
                                <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                              ) : (
                                <CancelIcon sx={{ color: '#f44336', fontSize: 20 }} />
                              )}
                            </Box>
                            
                            {!isCorrect && (
                              <Typography variant="body2" sx={{ 
                                color: '#4caf50',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                              }}>
                                <CheckIcon sx={{ fontSize: 16 }} />
                                Richtige Antwort: {question.correctAnswer}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </DialogContent>
        
        <DialogActions sx={{ 
          justifyContent: 'center', 
          pb: 3,
          px: 3
        }}>
          <Button 
            onClick={onClose} 
            variant="contained"
            size="large"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onClose();
              }
            }}
            sx={{
              minWidth: 120,
              height: 48,
              py: 1.5,
              px: 3,
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
              border: 'none',
              color: 'white',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
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
    <Dialog 
      open={true} 
      maxWidth="md" 
      fullWidth 
      onKeyDown={handleKeyDown}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }
      }}
    >
      <div ref={dialogRef} tabIndex={-1}>
        <DialogTitle sx={{ 
          pb: 1, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: 40, 
                height: 40 
              }}>
                <SchoolIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="h5" sx={{ 
                fontWeight: 600, 
                fontSize: '1.2rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {quiz.title}
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              bgcolor: 'rgba(255,255,255,0.2)',
              px: 2,
              py: 1,
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <TimerIcon sx={{ fontSize: '1.2rem' }} />
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                fontSize: '1.1rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}>
                {formatTime(timeLeft)}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {/* Progress Bar */}
          <Card sx={{ 
            mb: 3, 
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#1976d2',
                  fontSize: '1rem'
                }}>
                  Frage {currentQuestionIndex + 1} von {questions.length}
                </Typography>
                <Chip 
                  label={`${Math.round((currentQuestionIndex / questions.length) * 100)}% abgeschlossen`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(currentQuestionIndex / questions.length) * 100}
                sx={{ 
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 4
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Question Card */}
          <Card sx={{ 
            mb: 3,
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ 
                mb: 3,
                fontWeight: 600,
                color: '#333',
                lineHeight: 1.4,
                fontSize: '1.1rem'
              }}>
                {currentQuestion.question}
              </Typography>
              
              {answers[currentQuestion.id] && (
                <Box sx={{ 
                  mb: 3, 
                  p: 2, 
                  background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)', 
                  borderRadius: 2, 
                  border: '2px solid #4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <CheckIcon sx={{ fontSize: '1.2rem', color: '#4caf50' }} />
                  <Typography variant="body1" sx={{ 
                    color: '#2e7d32', 
                    fontSize: '0.9rem', 
                    fontWeight: 600 
                  }}>
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
                    <Paper
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        border: '2px solid',
                        borderColor: focusedOptionIndex === index ? '#1976d2' : '#e0e0e0',
                        borderRadius: 2,
                        background: focusedOptionIndex === index 
                          ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                          : 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                          borderColor: '#1976d2',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(25,118,210,0.2)'
                        }
                      }}
                      onClick={() => handleAnswerSelect(option)}
                    >
                      <FormControlLabel
                        value={option}
                        control={
                          <Radio 
                            sx={{
                              color: '#1976d2',
                              '&.Mui-checked': {
                                color: '#1976d2',
                              },
                              '& .MuiSvgIcon-root': {
                                fontSize: '1.2rem'
                              }
                            }}
                          />
                        }
                        label={option}
                        sx={{
                          width: '100%',
                          margin: 0,
                          '& .MuiFormControlLabel-label': {
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: '#333'
                          }
                        }}
                        tabIndex={focusedOptionIndex === index ? 0 : -1}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: 2
          }}>
            <Button
              variant="outlined"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              startIcon={<ArrowBackIcon />}
              size="large"
              sx={{
                minWidth: 120,
                height: 48,
                py: 1.5,
                px: 3,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                border: '2px solid #e0e0e0',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                color: '#495057',
                transition: 'all 0.3s ease',
                '&:hover': {
                  border: '2px solid #6c757d',
                  background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(108, 117, 125, 0.2)'
                },
                '&:disabled': {
                  opacity: 0.4,
                  background: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  color: '#adb5bd',
                  transform: 'none'
                }
              }}
            >
              Zurück
            </Button>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleAbortQuiz}
                size="large"
                sx={{
                  minWidth: 120,
                  height: 48,
                  py: 1.5,
                  px: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  border: '2px solid #dc3545',
                  background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
                  color: '#dc3545',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    border: '2px solid #c53030',
                    background: 'linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%)',
                    color: '#c53030',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
                  }
                }}
              >
                Abbrechen
              </Button>
              
              <Button
                variant="contained"
                onClick={handleNextQuestion}
                disabled={!answers[currentQuestion.id]}
                endIcon={<ArrowForwardIcon />}
                size="large"
                sx={{
                  minWidth: 120,
                  height: 48,
                  py: 1.5,
                  px: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  border: 'none',
                  background: currentQuestionIndex === questions.length - 1 
                    ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: currentQuestionIndex === questions.length - 1
                    ? '0 4px 16px rgba(76, 175, 80, 0.3)'
                    : '0 4px 16px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: currentQuestionIndex === questions.length - 1 
                      ? 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)'
                      : 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    boxShadow: currentQuestionIndex === questions.length - 1
                      ? '0 8px 24px rgba(76, 175, 80, 0.4)'
                      : '0 8px 24px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-2px) scale(1.02)'
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
              </Button>
            </Box>
          </Box>
        </DialogContent>
        
        <Box sx={{ 
          p: 2, 
          background: 'rgba(255,255,255,0.9)', 
          borderTop: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '0 0 12px 12px'
        }}>
          <Typography variant="caption" sx={{ 
            color: '#666', 
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}>
            ⌨️ Tastatur: ↑↓ Antworten navigieren • Enter Antwort auswählen/Weiter • ←→ Fragen wechseln • ESC abbrechen
          </Typography>
        </Box>
      </div>
    </Dialog>
  );
};

export default QuizPlayer; 