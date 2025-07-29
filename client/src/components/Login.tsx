import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add actual authentication logic here
    if (username && password) {
      console.log('Logging in with:', username);
      // For demo purposes, we'll just navigate to dashboard
      navigate('/dashboard');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setUsername('');
      setPassword('');
      usernameRef.current?.focus();
    } else if (e.key === 'Enter' && e.target === passwordRef.current) {
      handleSubmit(e as any);
    }
  };

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  return (
    <div className="login-container">
      <h2>Willkommen zurück!</h2>
      <p>Bitte melden Sie sich an, um fortzufahren.</p>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Benutzername:</label>
          <input 
            ref={usernameRef}
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Benutzername eingeben" 
            required
          />
        </div>
        <div>
          <label>Passwort:</label>
          <input 
            ref={passwordRef}
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Passwort eingeben" 
            required
          />
        </div>
        <button ref={submitRef} type="submit">Anmelden</button>
      </form>
      
      <div className="login-footer">
        <p>Testbenutzer: admin / Passwort: admin</p>
        <p>Tastatur: ESC zum Zurücksetzen, Enter zum Anmelden, Tab zum Navigieren</p>
      </div>
    </div>
  );
};

export default Login; 