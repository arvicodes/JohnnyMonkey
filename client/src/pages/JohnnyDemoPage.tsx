import React, { useState } from 'react';
import JohnnyCompanionSimple from '../components/JohnnyCompanionSimple';

const JohnnyDemoPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [demoUserId] = useState('demo-user-123');

  const pages = [
    { id: 'dashboard', name: 'Dashboard', description: 'Hauptseite mit Übersicht' },
    { id: 'quiz', name: 'Quiz', description: 'Lernquiz mit Fragen' },
    { id: 'flashcards', name: 'Karteikarten', description: 'Karteikarten lernen' },
    { id: 'geocoding', name: 'GeoCoding', description: 'Geocaching Abenteuer' }
  ];

  const simulateProgress = () => {
    // Simulate learning progress
    const currentProgress = JSON.parse(localStorage.getItem(`learningProgress_${demoUserId}`) || '{}');
    const newProgress = {
      totalQuizzesCompleted: (currentProgress.totalQuizzesCompleted || 0) + 1,
      totalFlashcardsStudied: (currentProgress.totalFlashcardsStudied || 0) + 5,
      totalPointsEarned: (currentProgress.totalPointsEarned || 0) + 25,
      currentStreak: (currentProgress.currentStreak || 0) + 1,
      lastActivity: new Date()
    };
    localStorage.setItem(`learningProgress_${demoUserId}`, JSON.stringify(newProgress));
    window.location.reload(); // Refresh to show updated progress
  };

  const resetProgress = () => {
    localStorage.removeItem(`learningProgress_${demoUserId}`);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🐒 Johnny Monkey - Lernbegleiter Demo
          </h1>
          <p className="text-gray-600 mb-8">
            Klicke auf Johnny in der unteren rechten Ecke, um mit ihm zu interagieren!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Page Selector */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Seiten-Kontext</h2>
              <p className="text-sm text-gray-600">
                Johnny reagiert unterschiedlich je nach aktueller Seite:
              </p>
              <div className="space-y-2">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPage(page.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                      currentPage === page.id
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{page.name}</div>
                    <div className="text-sm opacity-75">{page.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Simulation */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Fortschritt simulieren</h2>
              <p className="text-sm text-gray-600">
                Simuliere Lernfortschritt um Johnny's Reaktionen zu sehen:
              </p>
              <div className="space-y-3">
                <button
                  onClick={simulateProgress}
                  className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  📈 Lernfortschritt hinzufügen
                </button>
                <button
                  onClick={resetProgress}
                  className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  🔄 Fortschritt zurücksetzen
                </button>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">💡 Tipps:</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Klicke auf Johnny für zufällige Nachrichten</li>
                  <li>• Doppelklick für Fortschrittsanzeige</li>
                  <li>• Johnny reagiert auf Lernfortschritt</li>
                  <li>• Warte 15-30 Sekunden für automatische Nachrichten</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Aktueller Status:</h3>
            <div className="text-sm text-blue-700">
              <p><strong>Seite:</strong> {pages.find(p => p.id === currentPage)?.name}</p>
              <p><strong>User ID:</strong> {demoUserId}</p>
              <p><strong>Rolle:</strong> STUDENT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Johnny Companion */}
      <JohnnyCompanionSimple
        userId={demoUserId}
        userRole="STUDENT"
        currentPage={currentPage}
        onInteraction={() => {
          console.log('Johnny wurde angeklickt!');
        }}
      />
    </div>
  );
};

export default JohnnyDemoPage;
