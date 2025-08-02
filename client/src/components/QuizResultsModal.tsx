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
  CardContent
} from '@mui/material';

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
  if (!results) return null;

  const { answers } = results;
  const totalQuestions = answers.length;
  const correctAnswers = answers.filter((answer: any) => answer.isCorrect).length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" sx={{ textAlign: 'center', fontSize: '1.1rem' }}>
            Quiz Ergebnisse
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h5" sx={{ mb: 1, color: percentage === 100 ? '#4caf50' : '#ff9800', fontSize: '1.3rem' }}>
            {correctAnswers} von {totalQuestions} Fragen richtig
          </Typography>
          <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>
            {percentage}% Erfolg
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '0.9rem' }}>Detaillierte Ergebnisse:</Typography>
            {answers.map((answer: any, index: number) => {
              const isCorrect = answer.isCorrect;
              
              return (
                <Card key={index} sx={{ mb: 1, bgcolor: isCorrect ? '#e8f5e8' : '#ffebee' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.8rem' }}>
                      Frage {index + 1}: {answer.question}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isCorrect ? '#4caf50' : '#f44336', fontSize: '0.75rem' }}>
                      Ihre Antwort: {answer.selectedAnswer || 'Keine Antwort'}
                      {isCorrect ? ' ✓' : ' ✗'}
                    </Typography>
                    {!isCorrect && (
                      <Typography variant="body2" sx={{ color: '#4caf50', mt: 0.5, fontSize: '0.75rem' }}>
                        Richtige Antwort: {answer.correctAnswer}
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
}; 