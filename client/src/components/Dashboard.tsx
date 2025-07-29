import React, { useState, useRef, useEffect } from 'react';

interface StatsType {
  students: number;
  teachers: number;
  classes: number;
  averageGrade: number;
}

const Dashboard = () => {
  const [stats] = useState<StatsType>({
    students: 150,
    teachers: 20,
    classes: 12,
    averageGrade: 2.3
  });

  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalButtons = buttonRefs.current.length;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % totalButtons);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + totalButtons) % totalButtons);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        buttonRefs.current[focusedIndex]?.click();
        break;
      case 'Escape':
        e.preventDefault();
        // Could navigate back or close modal
        break;
    }
  };

  useEffect(() => {
    buttonRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target === document.body) {
        handleKeyDown(e as any);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [focusedIndex]);

  return (
    <div className="dashboard-container" tabIndex={-1} onKeyDown={handleKeyDown}>
      <h2>Schulverwaltung Dashboard</h2>
      <p className="dashboard-welcome">Willkommen im Schulverwaltungssystem</p>
      
      <div className="dashboard-content">
        <div className="dashboard-card">
          <h3>Schüler</h3>
          <p className="stat-number">{stats.students}</p>
          <p className="stat-label">Gesamtanzahl der Schüler</p>
          <button 
            ref={(el) => buttonRefs.current[0] = el}
            onClick={() => alert('Schülerliste wird geladen...')}
            tabIndex={focusedIndex === 0 ? 0 : -1}
          >
            Schülerliste anzeigen
          </button>
        </div>

        <div className="dashboard-card">
          <h3>Lehrer</h3>
          <p className="stat-number">{stats.teachers}</p>
          <p className="stat-label">Aktive Lehrkräfte</p>
          <button 
            ref={(el) => buttonRefs.current[1] = el}
            onClick={() => alert('Lehrerliste wird geladen...')}
            tabIndex={focusedIndex === 1 ? 0 : -1}
          >
            Lehrerliste anzeigen
          </button>
        </div>

        <div className="dashboard-card">
          <h3>Klassen</h3>
          <p className="stat-number">{stats.classes}</p>
          <p className="stat-label">Aktive Klassen</p>
          <button 
            ref={(el) => buttonRefs.current[2] = el}
            onClick={() => alert('Klassenübersicht wird geladen...')}
            tabIndex={focusedIndex === 2 ? 0 : -1}
          >
            Klassenübersicht
          </button>
        </div>

        <div className="dashboard-card">
          <h3>Notendurchschnitt</h3>
          <p className="stat-number">{stats.averageGrade.toFixed(1)}</p>
          <p className="stat-label">Gesamtdurchschnitt</p>
          <button 
            ref={(el) => buttonRefs.current[3] = el}
            onClick={() => alert('Notenstatistik wird geladen...')}
            tabIndex={focusedIndex === 3 ? 0 : -1}
          >
            Notenstatistik
          </button>
        </div>
      </div>

      <div className="dashboard-actions">
        <h3>Schnellzugriff</h3>
        <div className="action-buttons">
          <button 
            ref={(el) => buttonRefs.current[4] = el}
            onClick={() => alert('Neue Klasse erstellen...')}
            tabIndex={focusedIndex === 4 ? 0 : -1}
          >
            Neue Klasse erstellen
          </button>
          <button 
            ref={(el) => buttonRefs.current[5] = el}
            onClick={() => alert('Neuen Schüler hinzufügen...')}
            tabIndex={focusedIndex === 5 ? 0 : -1}
          >
            Neuen Schüler hinzufügen
          </button>
          <button 
            ref={(el) => buttonRefs.current[6] = el}
            onClick={() => alert('Neue Lehrkraft hinzufügen...')}
            tabIndex={focusedIndex === 6 ? 0 : -1}
          >
            Neue Lehrkraft hinzufügen
          </button>
        </div>
      </div>
      
      <div className="keyboard-help">
        <p>Tastatur: Pfeiltasten zum Navigieren, Enter zum Aktivieren, ESC zum Abbrechen</p>
      </div>
    </div>
  );
};

export default Dashboard; 