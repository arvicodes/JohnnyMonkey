import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { determinateLinearProgressSx } from '../lib/muiLinearProgressSx';

interface QuizResultsModalProps {
  open: boolean;
  onClose: () => void;
  results: any;
}

export const QuizResultsModal: React.FC<QuizResultsModalProps> = ({
  open,
  onClose,
  results
}) => {
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Lade die vollständigen Quiz-Fragen mit Tips und Erklärungen
  useEffect(() => {
    if (open && results) {
      // Versuche die Quiz-ID aus verschiedenen Quellen zu holen
      let quizId = results.participation?.quizId;
      
      // Fallback: Suche nach der Quiz-ID in den answers
      if (!quizId && results.answers && results.answers.length > 0) {
        // Die erste Antwort sollte die Quiz-ID enthalten
        const firstAnswer = results.answers[0];
        
        // Versuche verschiedene Felder
        quizId = firstAnswer.quizId || firstAnswer.quizSessionId || firstAnswer.sessionId;
        
        if (quizId) {
        } else {
        }
      }
      
      if (quizId) {
        loadQuizQuestions(quizId);
      } else {
        console.error('🔍 Keine Quiz-ID gefunden in results:', results);
        console.log('🔍 Versuche es mit der bekannten Session-ID...');
        // Fallback: Verwende die bekannte Session-ID
        const knownSessionId = 'test-session-ti';
        loadQuizQuestions(knownSessionId);
      }
    }
  }, [open, results]);

  const loadQuizQuestions = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/quiz-sessions/${sessionId}/quiz`);
      
      if (response.ok) {
        const quizData = await response.json();
        setQuizQuestions(quizData.questions || []);
      } else {
        console.error('🔍 Fehler beim Laden der Quiz-Fragen:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔍 Error Response:', errorText);
      }
    } catch (error) {
      console.error('🔍 Fehler beim Laden der Quiz-Fragen:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!results) return null;

  const { answers, participation, student } = results;
  const totalQuestions = answers.length;
  const correctAnswers = answers.filter((answer: any) => answer.isCorrect).length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const score = participation?.score || correctAnswers;
  const maxScore = participation?.maxScore || totalQuestions;

  const getPerformanceColor = (pct: number) => {
    if (pct >= 90) return '#4caf50';
    if (pct >= 70) return '#ff9800';
    if (pct >= 50) return '#ff5722';
    return '#f44336';
  };
  const performanceAccent = getPerformanceColor(percentage);

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
      open={open} 
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
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1.5, pb: 1 }}>
        {/* Student Info */}
        {student && (
          <Card sx={{ 
            mb: 1.5, 
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 1,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main',
                  width: 32,
                  height: 32
                }}>
                  {student.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {student.name.split(' ')[0]} {student.name.split(' ').slice(-1)[0]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    ID: {participation?.id?.slice(-6)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

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
                {score} von {maxScore} Punkten
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={determinateLinearProgressSx(
                  `linear-gradient(90deg, ${performanceAccent}bb 0%, ${performanceAccent} 45%, ${performanceAccent} 100%)`,
                  { height: 10, barGlow: `${performanceAccent}55` }
                )}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
              <Chip 
                icon={<CheckIcon />}
                label={`${correctAnswers} Richtig`}
                color="success"
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20 }}
              />
              <Chip 
                icon={<CancelIcon />}
                label={`${totalQuestions - correctAnswers} Falsch`}
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
          borderRadius: 1,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem'
            }}>
              <SchoolIcon color="primary" sx={{ fontSize: 16 }} />
              Detaillierte Ergebnisse
            </Typography>
            
            <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
              {/* Debug-Info */}
              <Box sx={{ 
                mb: 1, 
                p: 1, 
                background: 'rgba(255,255,0,0.1)', 
                border: '1px solid orange',
                borderRadius: 1
              }}>
                <Typography variant="caption" sx={{ color: 'orange', fontSize: '0.6rem' }}>
                  🔍 DEBUG: {quizQuestions.length} Quiz-Fragen geladen, {quizQuestions.filter(q => q.explanation).length} mit Erklärungen
                </Typography>
                {loading && (
                  <Typography variant="caption" sx={{ color: 'orange', fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
                    ⏳ Lade Quiz-Fragen...
                  </Typography>
                )}
              </Box>
              
              {answers.map((answer: any, index: number) => {
                const isCorrect = answer.isCorrect;
                const selected = answer.selectedAnswer;
                const correct = answer.correctAnswer;
                const opts: string[] = answer.questionOptions || [];
                const findText = (key: string) => {
                  const opt = opts.find((o: string) => o.startsWith(key + ')'));
                  return opt ? opt.replace(/^[a-d]\)\s*/, '') : '';
                };
                
                return (
                  <Card 
                    key={index} 
                    sx={{ 
                      mb: 1, 
                      background: isCorrect 
                        ? 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
                        : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
                      borderRadius: 1,
                      border: `1px solid ${isCorrect ? '#4caf50' : '#f44336'}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Avatar sx={{ 
                          bgcolor: isCorrect ? '#4caf50' : '#f44336',
                          width: 20,
                          height: 20,
                          fontSize: '0.6rem',
                          fontWeight: 600
                        }}>
                          {index + 1}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 600, 
                            mb: 0.5,
                            color: isCorrect ? '#2e7d32' : '#c62828',
                            fontSize: '0.7rem',
                            lineHeight: 1.2
                          }}>
                            {answer.question}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <Typography variant="caption" sx={{ 
                              color: isCorrect ? '#4caf50' : '#f44336',
                              fontWeight: 600,
                              fontSize: '0.6rem'
                            }}>
                              Deine Antwort: {selected ? `${selected}: ${findText(selected)}` : 'Keine Antwort'}
                            </Typography>
                            {isCorrect ? (
                              <CheckIcon sx={{ color: '#4caf50', fontSize: 14 }} />
                            ) : (
                              <CancelIcon sx={{ color: '#f44336', fontSize: 14 }} />
                            )}
                          </Box>
                          
                          {!isCorrect && (
                            <Typography variant="caption" sx={{ 
                              color: '#4caf50',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              fontSize: '0.6rem'
                            }}>
                              <CheckIcon sx={{ fontSize: 12 }} />
                              Richtige Antwort: {correct}: {findText(correct)}
                            </Typography>
                          )}
                          
                          {/* Erklärung anzeigen */}
                          {(() => {
                            // Finde die entsprechende Quiz-Frage mit Erklärung
                            const quizQuestion = quizQuestions.find(q => q.question === answer.question);
                            const explanation = quizQuestion?.explanation;
                            
                            // Prüfe, ob die Erklärung existiert und nicht leer ist
                            if (explanation && explanation.trim() !== '') {
                              return (
                                <Box sx={{ 
                                  mt: 1, 
                                  p: 1, 
                                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', 
                                  borderRadius: 0.5, 
                                  border: '1px solid #2196f3'
                                }}>
                                  <Typography variant="caption" sx={{ 
                                    color: '#1565c0', 
                                    fontWeight: 500,
                                    fontStyle: 'italic',
                                    fontSize: '0.6rem'
                                  }}>
                                    📚 <strong>Erklärung:</strong> {explanation}
                                  </Typography>
                                </Box>
                              );
                            }
                            
                            // Keine Erklärung verfügbar
                            return null;
                          })()}
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
        pb: 1.5,
        px: 2
      }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          size="small"
          sx={{
            minWidth: 80,
            height: 32,
            py: 0.5,
            px: 2,
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            border: 'none',
            color: 'white',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(-1px) scale(1.02)'
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
}; 