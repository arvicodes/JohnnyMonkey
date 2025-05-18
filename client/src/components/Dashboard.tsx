import React, { useState } from 'react';

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

  return (
    <div className="dashboard-container">
      <h2>Schulverwaltung Dashboard</h2>
      <p className="dashboard-welcome">Willkommen im Schulverwaltungssystem</p>
      
      <div className="dashboard-content">
        <div className="dashboard-card">
          <h3>Schüler</h3>
          <p className="stat-number">{stats.students}</p>
          <p className="stat-label">Gesamtanzahl der Schüler</p>
          <button onClick={() => alert('Schülerliste wird geladen...')}>
            Schülerliste anzeigen
          </button>
        </div>

        <div className="dashboard-card">
          <h3>Lehrer</h3>
          <p className="stat-number">{stats.teachers}</p>
          <p className="stat-label">Aktive Lehrkräfte</p>
          <button onClick={() => alert('Lehrerliste wird geladen...')}>
            Lehrerliste anzeigen
          </button>
        </div>

        <div className="dashboard-card">
          <h3>Klassen</h3>
          <p className="stat-number">{stats.classes}</p>
          <p className="stat-label">Aktive Klassen</p>
          <button onClick={() => alert('Klassenübersicht wird geladen...')}>
            Klassenübersicht
          </button>
        </div>

        <div className="dashboard-card">
          <h3>Notendurchschnitt</h3>
          <p className="stat-number">{stats.averageGrade.toFixed(1)}</p>
          <p className="stat-label">Gesamtdurchschnitt</p>
          <button onClick={() => alert('Notenstatistik wird geladen...')}>
            Notenstatistik
          </button>
        </div>
      </div>

      <div className="dashboard-actions">
        <h3>Schnellzugriff</h3>
        <div className="action-buttons">
          <button onClick={() => alert('Neue Klasse erstellen...')}>
            Neue Klasse erstellen
          </button>
          <button onClick={() => alert('Neuen Schüler hinzufügen...')}>
            Neuen Schüler hinzufügen
          </button>
          <button onClick={() => alert('Neue Lehrkraft hinzufügen...')}>
            Neue Lehrkraft hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 