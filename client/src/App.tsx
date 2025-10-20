import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LearningGroupPage from './pages/LearningGroupPage';
import GeoCodingQuest from './pages/GeoCodingQuest';
import QuizPlayerPage from './pages/QuizPlayerPage';
import QuizSessionPage from './pages/QuizSessionPage';
import QuizParticipationPage from './pages/QuizParticipationPage';

import FlashcardImportExportPage from './pages/FlashcardImportExportPage';
import SubmissionsGridPage from './pages/SubmissionsGridPage';
import WhiteboardPage from './pages/WhiteboardPage';
import JohnnyDemoPage from './pages/JohnnyDemoPage';
import FlashcardStudyPage from './pages/FlashcardStudyPage';
import JohnnyNavigationPage from './pages/JohnnyNavigationPage';

import { Snackbar, Alert } from '@mui/material';
import JohnnyCompanionSimple from './components/JohnnyCompanionSimple';
import FlutterElf from './components/FlutterElf';

interface User {
  id: string;
  name: string;
  role: string;
}

function AppContent() {
  const [loginCode, setLoginCode] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [johnnyVisible, setJohnnyVisible] = useState(true);
  const [elfVisible, setElfVisible] = useState(true);
  const navigate = useNavigate();
  const loginInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginCode }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Login successful, user data:', data.user);
        setUser(data.user);
        
        // Store user ID in localStorage based on role
        if (data.user.role === 'TEACHER') {
          localStorage.setItem('teacherId', data.user.id);
        } else {
          localStorage.setItem('studentId', data.user.id);
        }
        localStorage.setItem('loginCode', loginCode); // Speichere den Login-Code
        
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
      } else {
        setMessage(data.message);
        setUser(null);
      }
    } catch (error) {
      setMessage('Verbindungsfehler zum Server');
      setUser(null);
    }
  };

  const handleLogout = () => {
    setUser(null);
    // Clear stored user IDs and login code
    localStorage.removeItem('teacherId');
    localStorage.removeItem('studentId');
    localStorage.removeItem('loginCode'); // Lösche auch den Login-Code
    navigate('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLoginCode('');
      setMessage('');
      loginInputRef.current?.focus();
      e.preventDefault();
    }
  };

  // Global keyboard shortcuts for companions
  useEffect(() => {
    let keySequence = '';
    let sequenceTimeout: NodeJS.Timeout;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      keySequence += e.key.toLowerCase();
      
      // Clear sequence after 1 second
      clearTimeout(sequenceTimeout);
      sequenceTimeout = setTimeout(() => {
        keySequence = '';
      }, 1000);

      // Check for shortcuts
      if (keySequence === 'jj') {
        setJohnnyVisible(prev => !prev);
        keySequence = '';
        e.preventDefault();
      } else if (keySequence === 'ff') {
        setElfVisible(prev => !prev);
        keySequence = '';
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      clearTimeout(sequenceTimeout);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      loginInputRef.current?.focus();
    }
  }, [user]);

  const renderDashboard = () => {
    if (!user) return <Navigate to="/" />;
    
    return user.role === 'TEACHER' ? (
      <TeacherDashboard userId={user.id} onLogout={handleLogout} />
    ) : (
      <StudentDashboard userId={user.id} onLogout={handleLogout} />
    );
  };

  return (
    <div className="App" onKeyDown={handleKeyDown}>
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <div className="login-container">
                <h2>Willkommen!</h2>
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <input
                      ref={loginInputRef}
                      type="text"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      placeholder="Login-Code eingeben"
                      required
                      autoFocus
                    />
                  </div>
                  <button type="submit">Anmelden</button>
                  {message && <p className="message">{message}</p>}
                  <p className="keyboard-help">
                    Tastatur: Enter zum Anmelden, ESC zum Zurücksetzen
                  </p>
                </form>
              </div>
            ) : (
              <Navigate to="/dashboard" />
            )
          }
        />
        <Route path="/dashboard" element={renderDashboard()} />
        <Route path="/learning-group/:id" element={<LearningGroupPage />} />
        <Route path="/geocoding-quest" element={<GeoCodingQuest />} />
        <Route path="/quiz-player/:quizId" element={<QuizPlayerPage />} />
        <Route path="/quiz-session/:quizId" element={<QuizSessionPage />} />
        <Route path="/quiz-participation/:sessionId" element={<QuizParticipationPage />} />

        <Route path="/flashcard-import-export" element={<FlashcardImportExportPage />} />
        <Route path="/submissions-grid" element={<SubmissionsGridPage />} />
        <Route path="/whiteboard" element={<WhiteboardPage />} />
        <Route path="/johnny-demo" element={<JohnnyDemoPage />} />
        <Route path="/flashcard-study" element={<FlashcardStudyPage />} />
        <Route path="/johnny" element={<JohnnyNavigationPage />} />

      </Routes>
      
      {/* Johnny Companion - Global auf allen Seiten */}
      <JohnnyCompanionSimple 
        userId={user?.id || 'guest-user'}
        userRole={user?.role as 'TEACHER' | 'STUDENT' || 'STUDENT'}
        currentPage="dashboard"
        isVisible={johnnyVisible}
      />
      
      {/* FlutterElf - Animierte Begleiterfigur auf allen Seiten */}
      <FlutterElf isVisible={elfVisible} />
      
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSuccessMessage(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Login erfolgreich!
        </Alert>
      </Snackbar>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
