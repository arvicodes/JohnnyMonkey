import React, { useState } from 'react';
import './App.css';

interface User {
  id: string;
  name: string;
  role: string;
  groups: Array<{
    id: string;
    name: string;
  }>;
}

function App() {
  const [loginCode, setLoginCode] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);

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
        setMessage(data.message);
        setUser(data.user);
      } else {
        setMessage(data.message);
        setUser(null);
      }
    } catch (error) {
      setMessage('Verbindungsfehler zum Server');
      setUser(null);
    }
  };

  return (
    <div className="App">
      <div className="login-container">
        <h1>Login</h1>
        {message && <div className="message">{message}</div>}
        
        {!user ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Login-Code:</label>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                placeholder="Code eingeben"
                required
              />
            </div>
            <button type="submit">Anmelden</button>
          </form>
        ) : (
          <div className="user-info">
            <h2>Willkommen, {user.name}!</h2>
            <p>Rolle: {user.role === 'TEACHER' ? 'Lehrer' : 'Schüler'}</p>
            {user.groups.length > 0 && (
              <>
                <p>Ihre Gruppen:</p>
                <ul>
                  {user.groups.map(group => (
                    <li key={group.id}>{group.name}</li>
                  ))}
                </ul>
              </>
            )}
            <button onClick={() => { setUser(null); setLoginCode(''); setMessage(''); }}>
              Ausloggen
            </button>
          </div>
        )}

        {!user && (
          <div className="login-hint">
            Beispiel-Codes:<br />
            Lehrer: TEACH001, TEACH002<br />
            Schüler: STUD001 bis STUD008
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
