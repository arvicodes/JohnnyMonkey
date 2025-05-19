import React, { useState } from 'react';
import './App.css';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { Snackbar, Alert } from '@mui/material';

interface User {
  id: string;
  name: string;
  role: string;
}

function App() {
  const [loginCode, setLoginCode] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loginCode }),
      });

      const data = await response.json();
      
      if (response.ok) {
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

  const renderDashboard = () => {
    if (!user) return null;
    
    return user.role === 'TEACHER' ? (
      <TeacherDashboard userId={user.id} />
    ) : (
      <StudentDashboard userId={user.id} />
    );
  };

  return (
    <div className="App">
      {!user ? (
        <div className="login-container">
          <h2>Willkommen!</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
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
          </form>
        </div>
      ) : (
        renderDashboard()
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

export default App;
