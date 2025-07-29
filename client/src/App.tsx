import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { LearningGroupPage } from './pages/LearningGroupPage';
import GeoCodingQuest from './pages/GeoCodingQuest';
import { QuizPlayerPage } from './pages/QuizPlayerPage';

import { Snackbar, Alert } from '@mui/material';

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

      </Routes>
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
