import React from 'react';
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
  Divider,
  Grid
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

interface QuizStatisticsModalProps {
  open: boolean;
  onClose: () => void;
  statistics: any;
}

export const QuizStatisticsModal: React.FC<QuizStatisticsModalProps> = ({
  open,
  onClose,
  statistics
}) => {
  if (!statistics) return null;

  const { quizTitle, totalParticipations, averageScore, averagePercentage, questionStats } = statistics;

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 60) return '#ff9800';
    if (percentage >= 40) return '#ff5722';
    return '#f44336';
  };

  const getPerformanceText = (percentage: number) => {
    if (percentage >= 80) return 'Sehr gut';
    if (percentage >= 60) return 'Gut';
    if (percentage >= 40) return 'Mittelmäßig';
    return 'Schwierig';
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        pb: 1,
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <AnalyticsIcon sx={{ fontSize: 24 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Quiz-Statistik
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', opacity: 0.9 }}>
          {quizTitle}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {/* Overall Statistics */}
        <Card sx={{ 
          mb: 2, 
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.9rem', color: '#333' }}>
              Gesamtübersicht
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ 
                    color: getPerformanceColor(averagePercentage),
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}>
                    {averagePercentage}%
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#666' }}>
                    Durchschnitt
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ 
                    color: '#1976d2',
                    fontWeight: 700,
                    fontSize: '1.5rem'
                  }}>
                    {totalParticipations}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.7rem', color: '#666' }}>
                    Teilnehmer
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.75rem', color: '#666' }}>
                Durchschnittliche Punktzahl: {averageScore.toFixed(1)} Punkte
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={averagePercentage} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${getPerformanceColor(averagePercentage)} 0%, ${getPerformanceColor(averagePercentage)}dd 100%)`,
                    borderRadius: 3
                  }
                }} 
              />
            </Box>
          </CardContent>
        </Card>

        {/* Question Statistics */}
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>
          Aufgaben-Statistik
        </Typography>

        {questionStats.map((question: any, index: number) => (
          <Card key={question.questionId} sx={{ 
            mb: 1.5, 
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 1.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  color: '#333'
                }}>
                  Aufgabe {index + 1}
                </Typography>
                <Chip
                  size="small"
                  label={getPerformanceText(question.correctPercentage)}
                  color={question.correctPercentage >= 80 ? 'success' : question.correctPercentage >= 60 ? 'warning' : 'error'}
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '0.6rem',
                    height: 20
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ 
                mb: 1, 
                fontSize: '0.75rem',
                color: '#555',
                lineHeight: 1.4
              }}>
                {question.question}
              </Typography>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  fontSize: '0.7rem',
                  color: '#666'
                }}>
                  Richtige Antwort: <strong>{question.correctAnswer}</strong>
                </Typography>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  fontSize: '0.7rem',
                  color: '#666'
                }}>
                  {question.correctAnswers} von {question.totalAnswers} richtig ({question.correctPercentage}%)
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={question.correctPercentage} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(90deg, ${getPerformanceColor(question.correctPercentage)} 0%, ${getPerformanceColor(question.correctPercentage)}dd 100%)`,
                      borderRadius: 3
                    }
                  }} 
                />
              </Box>

              {/* Answer Distribution */}
              <Box>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  fontSize: '0.7rem',
                  color: '#666'
                }}>
                  Antwortverteilung:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {Object.entries(question.answerDistribution).map(([answer, count]: [string, any]) => (
                    <Chip
                      key={answer}
                      size="small"
                      label={`${answer}: ${count}`}
                      color={answer === question.correctAnswer ? 'success' : 'default'}
                      variant={answer === question.correctAnswer ? 'filled' : 'outlined'}
                      sx={{ 
                        fontSize: '0.6rem',
                        height: 18,
                        '&.MuiChip-colorSuccess': {
                          bgcolor: '#4caf50',
                          color: 'white'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.3)'
            },
            borderRadius: 1.5,
            fontSize: '0.8rem',
            px: 2
          }}
        >
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 