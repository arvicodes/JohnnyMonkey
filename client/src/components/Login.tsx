import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add actual authentication logic here
    if (username && password) {
      console.log('Logging in with:', username);
      // For demo purposes, we'll just navigate to dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <h2>Willkommen zurück!</h2>
      <p>Bitte melden Sie sich an, um fortzufahren.</p>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Benutzername:</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Benutzername eingeben" 
            required
          />
        </div>
        <div>
          <label>Passwort:</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort eingeben" 
            required
          />
        </div>
        <button type="submit">Anmelden</button>
      </form>
      
      <div className="login-footer">
        <p>Testbenutzer: admin / Passwort: admin</p>
      </div>
    </div>
  );
};

export default Login; 