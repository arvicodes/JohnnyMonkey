import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  CircularProgress,
  Box
} from '@mui/material';
import {
  QuestionAnswer as QuizIcon,
  Assessment as ResultsIcon
} from '@mui/icons-material';
import { QuizResultsModal } from './QuizResultsModal';

interface QuizStartButtonProps {
  quizFile: any;
  userId: string;
}

const QuizStartButton: React.FC<QuizStartButtonProps> = ({ quizFile, userId }) => {
  const navigate = useNavigate();
  const [quizStatus, setQuizStatus] = useState<'loading' | 'available' | 'completed' | 'error'>('loading');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);

  useEffect(() => {
    checkQuizStatus();
  }, [quizFile.path]);

  const checkQuizStatus = async () => {
    try {
      setQuizStatus('loading');
      
      // Suche nach dem Quiz basierend auf der Quelldatei
      const quizResponse = await fetch(`/api/quizzes/check/exists?sourceFile=${encodeURIComponent(quizFile.path)}`);
      if (!quizResponse.ok) {
        setQuizStatus('error');
        return;
      }
      
      const quizData = await quizResponse.json();
      if (!quizData.exists || !quizData.quiz) {
        setQuizStatus('error');
        return;
      }
      
      const foundQuizId = quizData.quiz.id;
      setQuizId(foundQuizId);
      
      // Prüfe, ob eine aktive Session läuft
      const sessionResponse = await fetch(`/api/quiz-sessions/${foundQuizId}/active`);
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        
        if (session && session.id) {
          // Prüfe, ob der Schüler bereits teilgenommen hat
          const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${userId}`);
          if (participationResponse.ok) {
            const participation = await participationResponse.json();
            
            // Wenn der Schüler bereits abgeschlossen hat
            if (participation.hasParticipated && participation.isCompleted && participation.participationId) {
              setParticipationId(participation.participationId);
              setQuizStatus('completed');
              return;
            } else {
              // Quiz ist verfügbar
              setQuizStatus('available');
              return;
            }
          }
        }
      }
      
      // Keine aktive Session - prüfe auf letzte Ergebnisse
      const sessionsResponse = await fetch(`/api/quiz-sessions/${foundQuizId}/sessions`);
      if (sessionsResponse.ok) {
        const sessions = await sessionsResponse.json();
        if (sessions && sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          const participationResponse = await fetch(`/api/quiz-participations/${lastSession.id}/status?studentId=${userId}`);
          if (participationResponse.ok) {
            const participation = await participationResponse.json();
            if (participation.hasParticipated && participation.participationId) {
              setParticipationId(participation.participationId);
              setQuizStatus('completed');
              return;
            }
          }
        }
      }
      
      setQuizStatus('available');
      
    } catch (error) {
      console.error('Error checking quiz status:', error);
      setQuizStatus('error');
    }
  };

  const handleQuizStart = async () => {
    if (!quizId) return;
    
    try {
      // Prüfe, ob eine aktive Session läuft
      const sessionResponse = await fetch(`/api/quiz-sessions/${quizId}/active`);
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        
        if (session && session.id) {
          const participationUrl = `/quiz-participation/${session.id}`;
          navigate(participationUrl);
          return;
        }
      }
      
      // Keine aktive Session
      alert('Aktuell ist keine Quiz-Session aktiv. Bitte warten Sie, bis Ihr Lehrer das Quiz startet.');
      
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Fehler beim Starten des Quiz. Bitte versuchen Sie es erneut.');
    }
  };

  const handleViewResults = async () => {
    if (participationId) {
      try {
        const participationResponse = await fetch(`/api/quiz-participations/${participationId}/results?studentId=${userId}`);
        if (participationResponse.ok) {
          const results = await participationResponse.json();
          setQuizResults(results);
          setShowQuizResults(true);
        } else {
          alert('Fehler beim Laden der Ergebnisse. Bitte versuchen Sie es erneut.');
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        alert('Fehler beim Laden der Ergebnisse. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleCloseQuizResults = () => {
    setShowQuizResults(false);
    setQuizResults(null);
  };

  const getButtonText = () => {
    const quizName = quizFile.name.replace('Quiz ', '').replace('.docx', '').replace('.doc', '').replace('.txt', '');
    
    switch (quizStatus) {
      case 'loading':
        return 'Lade...';
      case 'available':
        return `Quiz starten: ${quizName}`;
      case 'completed':
        return `Ergebnisse: ${quizName}`;
      case 'error':
        return `Quiz nicht verfügbar: ${quizName}`;
      default:
        return `Quiz: ${quizName}`;
    }
  };

  const getButtonIcon = () => {
    switch (quizStatus) {
      case 'loading':
        return <CircularProgress size={16} />;
      case 'available':
        return <QuizIcon sx={{ fontSize: 16 }} />;
      case 'completed':
        return <ResultsIcon sx={{ fontSize: 16 }} />;
      case 'error':
        return <QuizIcon sx={{ fontSize: 16 }} />;
      default:
        return <QuizIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getButtonVariant = () => {
    switch (quizStatus) {
      case 'loading':
        return 'outlined';
      case 'available':
        return 'contained';
      case 'completed':
        return 'outlined';
      case 'error':
        return 'outlined';
      default:
        return 'outlined';
    }
  };

  const getButtonColor = () => {
    switch (quizStatus) {
      case 'loading':
        return 'primary';
      case 'available':
        return 'success';
      case 'completed':
        return 'info';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const isButtonDisabled = quizStatus === 'loading' || quizStatus === 'error';
  const onClickHandler = quizStatus === 'completed' ? handleViewResults : handleQuizStart;

  return (
    <Box>
      <Button
        variant={getButtonVariant()}
        color={getButtonColor()}
        startIcon={getButtonIcon()}
        onClick={onClickHandler}
        disabled={isButtonDisabled}
        size="small"
        sx={{
          fontSize: '0.7rem',
          fontWeight: 500,
          textTransform: 'none',
          borderRadius: 1.5,
          px: 1.5,
          py: 0.3,
          minHeight: '28px',
          maxWidth: '280px',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          },
          '&:disabled': {
            opacity: 0.6
          }
        }}
      >
        {getButtonText()}
      </Button>
      
      {showQuizResults && quizResults && (
        <QuizResultsModal
          open={showQuizResults}
          results={quizResults}
          onClose={handleCloseQuizResults}
        />
      )}
    </Box>
  );
};

export default QuizStartButton;
