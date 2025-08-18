import React, { useState, useEffect, useRef } from 'react';
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

export const QuizStartButton: React.FC<QuizStartButtonProps> = ({ quizFile, userId }) => {
  const navigate = useNavigate();
  const [quizStatus, setQuizStatus] = useState<'loading' | 'available' | 'completed' | 'error'>('loading');
  const [quizId, setQuizId] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [resultsReleased, setResultsReleased] = useState(false);
  
  // Use ref to store current participationId immediately
  const currentParticipationIdRef = useRef<string | null>(null);

  useEffect(() => {
    checkQuizStatus();
    
    // Polling für Freigabe-Status alle 5 Sekunden
    const interval = setInterval(() => {
      if (quizStatus === 'completed') {
        checkQuizStatus();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [quizFile.path]);

  const checkQuizStatus = async () => {
    if (!quizFile.path || !userId) return;
    
    try {
      setQuizStatus('loading');
      
      // Check if quiz exists for this file
      const quizResponse = await fetch(`/api/quizzes/check/exists?sourceFile=${encodeURIComponent(quizFile.path)}`);
      if (!quizResponse.ok) {
        setQuizStatus('available');
        return;
      }
      
      const quizData = await quizResponse.json();
      if (!quizData.exists || !quizData.quiz) {
        setQuizStatus('available');
        return;
      }
      
      const foundQuizId = quizData.quiz.id;
      setQuizId(foundQuizId);
      
      // Get the most recent session for this quiz
      const sessionsResponse = await fetch(`/api/quiz-sessions/${foundQuizId}/sessions`);
      if (!sessionsResponse.ok) {
        setQuizStatus('available');
        return;
      }
      
      const sessions = await sessionsResponse.json();
      if (!sessions || sessions.length === 0) {
        setQuizStatus('available');
        return;
      }
      
      // Get the most recent active session
      const session = sessions[0]; // Most recent session
      console.log('Found session:', session);
      
      // Check if student has participated and completed
      const participationResponse = await fetch(`/api/quiz-participations/${session.id}/status?studentId=${userId}`);
      console.log('Participation response status:', participationResponse.status);
      
      if (!participationResponse.ok) {
        console.log('Participation response not ok, setting status to available');
        setQuizStatus('available');
        return;
      }
      
      const participation = await participationResponse.json();
      console.log('Participation data:', participation);
      
      if (participation.completed) {
        console.log('Quiz completed, setting participationId:', participation.id);
        setParticipationId(participation.id);
        
        // Check if results are released by teacher - get this directly from the session
        const sessionDetailsResponse = await fetch(`/api/quiz-sessions/session/${session.id}`);
        console.log('Session details response status:', sessionDetailsResponse.status);
        
        if (sessionDetailsResponse.ok) {
          const sessionDetails = await sessionDetailsResponse.json();
          console.log('Session details:', sessionDetails);
          
          if (sessionDetails.resultsReleased) {
            setResultsReleased(true);
            setQuizStatus('completed');
            console.log('Results are released! participationId should be:', participation.id);
            
            // Store participationId in a ref or use it directly
            // This ensures we have the correct value immediately
            currentParticipationIdRef.current = participation.id;
          } else {
            setResultsReleased(false);
            setQuizStatus('completed'); // Quiz abgeschlossen, aber Ergebnisse noch nicht freigegeben
            console.log('Results not released yet');
            currentParticipationIdRef.current = participation.id;
          }
        } else {
          console.log('Failed to get session details, setting resultsReleased to false');
          setResultsReleased(false);
          setQuizStatus('completed');
          currentParticipationIdRef.current = participation.id;
        }
      } else {
        setQuizStatus('available');
      }
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
    console.log('handleViewResults called with:', { participationId, resultsReleased, quizStatus });
    
    // Get the current participationId from the most recent checkQuizStatus call
    const currentParticipationId = currentParticipationIdRef.current || participationId;
    console.log('Using participationId:', currentParticipationId);
    
    if (!currentParticipationId) {
      console.error('No participationId available');
      alert('Fehler: Keine Teilnahme-ID verfügbar. Bitte laden Sie die Seite neu.');
      return;
    }
    
    // Prüfe zuerst, ob Ergebnisse freigegeben sind
    if (!resultsReleased) {
      console.log('Results not released yet');
      alert('Die Ergebnisse wurden noch nicht vom Lehrer freigegeben. Bitte warten Sie, bis der Lehrer die Ergebnisse freigibt.');
      return;
    }
    
    console.log('Fetching results for participation:', currentParticipationId);
    
    try {
      const participationResponse = await fetch(`/api/quiz-participations/${currentParticipationId}/results?studentId=${userId}`);
      if (participationResponse.ok) {
        const results = await participationResponse.json();
        setQuizResults(results);
        setShowQuizResults(true);
      } else if (participationResponse.status === 403) {
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
        onClick={onClickHandler}
        disabled={isButtonDisabled}
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
