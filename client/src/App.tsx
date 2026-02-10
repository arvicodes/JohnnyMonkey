import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import LearningGroupPage from './pages/LearningGroupPage';
import QuizPlayerPage from './pages/QuizPlayerPage';
import QuizSessionPage from './pages/QuizSessionPage';
import QuizParticipationPage from './pages/QuizParticipationPage';

import FlashcardImportExportPage from './pages/FlashcardImportExportPage';
import SubmissionsGridPage from './pages/SubmissionsGridPage';
import WhiteboardPage from './pages/WhiteboardPage';
import JohnnyDemoPage from './pages/JohnnyDemoPage';
import FlashcardStudyPage from './pages/FlashcardStudyPage';
import JohnnyNavigationPage from './pages/JohnnyNavigationPage';
import AdventCalendarPage from './pages/AdventCalendarPage';

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
  const [johnnyVisible, setJohnnyVisible] = useState(false);
  const [elfVisible, setElfVisible] = useState(false);
  const navigate = useNavigate();
  const loginInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginCode }),
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', response.headers.get('content-type'));
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // If not JSON, read as text
        const text = await response.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error(`Server-Fehler: ${text.substring(0, 100)}`);
      }
      
      console.log('📦 Response data:', data);
      
      if (response.ok) {
        console.log('✅ Login successful, user data:', data.user);
        setUser(data.user);
        
        // Store user ID in localStorage based on role
        if (data.user.role === 'TEACHER') {
          localStorage.setItem('teacherId', data.user.id);
        } else {
          localStorage.setItem('studentId', data.user.id);
        }
        localStorage.setItem('loginCode', loginCode); // Speichere den Login-Code
        localStorage.setItem('userName', data.user.name); // Speichere den Benutzernamen
        
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
      } else {
        console.error('❌ Login failed:', data.message || data.error);
        setMessage(data.message || data.error || 'Login fehlgeschlagen');
        setUser(null);
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      const errorMessage = error?.message || 'Unbekannter Fehler';
      if (errorMessage.includes('Proxy') || errorMessage.includes('Unexpected token')) {
        setMessage('Server nicht erreichbar. Bitte überprüfen Sie, ob der Server läuft.');
      } else {
        setMessage('Verbindungsfehler zum Server: ' + errorMessage);
      }
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
    // Only handle ESC in login form, not in modals
    if (e.key === 'Escape' && !user) {
      setLoginCode('');
      setMessage('');
      loginInputRef.current?.focus();
      e.preventDefault();
    }
  };

  // Global keyboard shortcuts for companions
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check for shortcuts - single key presses
      // + key for Johnny (could be '=' on some keyboards, but we check for '+' and '=' with Shift)
      if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
        setJohnnyVisible(prev => !prev);
        e.preventDefault();
      } else if (e.key === '#' || (e.key === '3' && e.shiftKey)) {
        // # key for Elfe (could be '3' with Shift on some keyboards)
        setElfVisible(prev => !prev);
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Beim App-Start: Prüfe ob Benutzer bereits eingeloggt ist
  useEffect(() => {
    const checkExistingLogin = async () => {
      const storedLoginCode = localStorage.getItem('loginCode');
      const storedUserId = localStorage.getItem('studentId') || localStorage.getItem('teacherId');
      const storedUserName = localStorage.getItem('userName');
      
      if (storedLoginCode && storedUserId && storedUserName) {
        // Versuche automatisch einzuloggen mit gespeichertem Login-Code
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loginCode: storedLoginCode }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Auto-Login erfolgreich:', data.user.name);
            setUser(data.user);
            // Navigate to dashboard if on login page
            if (window.location.pathname === '/') {
              navigate('/dashboard');
            }
          } else {
            // Login-Code ist ungültig, lösche gespeicherte Daten
            console.log('⚠️ Auto-Login fehlgeschlagen, lösche gespeicherte Daten');
            localStorage.removeItem('teacherId');
            localStorage.removeItem('studentId');
            localStorage.removeItem('loginCode');
            localStorage.removeItem('userName');
          }
        } catch (error) {
          console.error('❌ Auto-Login Fehler:', error);
          // Bei Fehler: gespeicherte Daten löschen
          localStorage.removeItem('teacherId');
          localStorage.removeItem('studentId');
          localStorage.removeItem('loginCode');
          localStorage.removeItem('userName');
        }
      }
    };
    
    checkExistingLogin();
  }, []); // Nur einmal beim App-Start ausführen

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
                      type="password"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      placeholder="Login-Code eingeben"
                      required
                      autoFocus
                      autoComplete="off"
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
        <Route path="/quiz-player/:quizId" element={<QuizPlayerPage />} />
        <Route path="/quiz-session/:quizId" element={<QuizSessionPage />} />
        <Route path="/quiz-participation/:sessionId" element={<QuizParticipationPage />} />

        <Route path="/flashcard-import-export" element={<FlashcardImportExportPage />} />
        <Route path="/submissions-grid" element={<SubmissionsGridPage />} />
        <Route path="/whiteboard" element={<WhiteboardPage />} />
        <Route path="/johnny-demo" element={<JohnnyDemoPage />} />
        <Route path="/flashcard-study" element={<FlashcardStudyPage />} />
        <Route path="/johnny" element={<JohnnyNavigationPage />} />
        <Route path="/advent-calendar" element={<AdventCalendarPage />} />

      </Routes>
      
      {/* Johnny Companion - Für alle sichtbar, wenn eingeblendet */}
      {user && (
        <JohnnyCompanionSimple 
          userId={user?.id || 'guest-user'}
          userRole={user?.role as 'TEACHER' | 'STUDENT' || 'STUDENT'}
          currentPage="dashboard"
          isVisible={johnnyVisible}
        />
      )}
      
      {/* FlutterElf - Für alle sichtbar, wenn eingeblendet */}
      {user && (
        <FlutterElf isVisible={elfVisible} />
      )}
      
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
