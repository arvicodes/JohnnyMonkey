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
  const [resultsReleased, setResultsReleased] = useState(false);

  useEffect(() => {
    checkQuizStatus();
  }, [quizFile.path]);

  const checkQuizStatus = async () => {
    try {
      setQuizStatus('loading');
      
      // Check if quiz exists for this file
      const quizResponse = await fetch(`/api/quizzes/check/exists?sourceFile=${encodeURIComponent(quizFile.path)}`);
      if (!quizResponse.ok) {
        setQuizStatus('error');
        return;
      }
      
      const quizData = await quizResponse.json();
      if (!quizData.exists) {
        setQuizStatus('error');
        return;
      }
      
      const foundQuizId = quizData.quiz.id;
      setQuizId(foundQuizId);
      
      // Check if there's an active session first
      const activeSessionResponse = await fetch(`/api/quiz-sessions/${foundQuizId}/active`);
      let session = null;
      
      if (activeSessionResponse.ok) {
        session = await activeSessionResponse.json();
      }
      
      // If no active session, check for the most recent session
      if (!session) {
        const sessionsResponse = await fetch(`/api/quiz-sessions/${foundQuizId}/sessions`);
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          if (sessions && sessions.length > 0) {
            session = sessions[0]; // Most recent session
          }
        }
      }
      
      if (!session) {
        setQuizStatus('available');
        return;
      }
      
      // Check if student has participated and completed
      const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${userId}`);
      if (!participationResponse.ok) {
        setQuizStatus('available');
        return;
      }
      
      const participation = await participationResponse.json();
      
      if (participation.completed) {
        setParticipationId(participation.id);
        
        // Check if results are released by teacher
        if (participation.resultsReleased) {
          setResultsReleased(true);
          setQuizStatus('completed');
        } else {
          setResultsReleased(false);
          setQuizStatus('completed'); // Quiz abgeschlossen, aber Ergebnisse noch nicht freigegeben
        }
      } else {
        setQuizStatus('available');
      }
    } catch (error) {
      console.error('Error checking quiz status:', error);
      setQuizStatus('available');
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
    if (!participationId) return;
    
    // Prüfe zuerst, ob Ergebnisse freigegeben sind
    if (!resultsReleased) {
      alert('Die Ergebnisse wurden noch nicht vom Lehrer freigegeben. Bitte warten Sie, bis der Lehrer die Ergebnisse freigibt.');
      return;
    }
    
    try {
      const participationResponse = await fetch(`/api/quiz-participations/${participationId}/results?studentId=${userId}`);
      if (participationResponse.ok) {
        const results = await participationResponse.json();
        setQuizResults(results);
        setShowQuizResults(true);
      } else if (participationResponse.status === 403) {
        // Ergebnisse noch nicht freigegeben
        alert('Die Ergebnisse wurden noch nicht vom Lehrer freigegeben. Bitte warten Sie, bis der Lehrer die Ergebnisse freigibt.');
      } else {
        alert('Fehler beim Laden der Ergebnisse. Bitte versuchen Sie es erneut.');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      alert('Fehler beim Laden der Ergebnisse. Bitte versuchen Sie es erneut.');
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
        // Prüfe, ob Ergebnisse freigegeben sind
        if (quizId) {
          // Hier können wir den Freigabe-Status aus dem State abrufen
          // Für jetzt zeigen wir immer "Ergebnisse" an, wenn Quiz abgeschlossen ist
          return `Ergebnisse: ${quizName}`;
        }
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
      case 'completed':
        return 'contained';
      default:
        return 'outlined';
    }
  };

  const getButtonColor = () => {
    switch (quizStatus) {
      case 'completed':
        return 'primary';
      case 'available':
        return 'success';
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
        variant="contained"
        size="small"
        startIcon={getButtonIcon()}
        onClick={quizStatus === 'completed' ? handleViewResults : handleQuizStart}
        disabled={quizStatus === 'loading' || quizStatus === 'error'}
        sx={{
          fontSize: '0.7rem',
          px: 1.5,
          py: 0.3,
          minHeight: '28px',
          maxWidth: '280px',
          borderRadius: 1.5,
          backgroundColor: quizStatus === 'completed' && !resultsReleased ? '#ccc' : undefined,
          color: quizStatus === 'completed' && !resultsReleased ? '#666' : undefined,
          cursor: quizStatus === 'completed' && !resultsReleased ? 'not-allowed' : 'pointer',
          '&:hover': quizStatus === 'completed' && !resultsReleased ? {
            backgroundColor: '#ccc'
          } : undefined
        }}
        title={quizStatus === 'completed' && !resultsReleased ? 
          'Ergebnisse noch nicht freigegeben' : 
          quizStatus === 'completed' ? 
          'Ergebnisse anzeigen' : 
          'Quiz starten'
        }
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
