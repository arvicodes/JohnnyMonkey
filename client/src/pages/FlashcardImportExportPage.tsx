import React, { useState } from 'react';
import { FlashcardImportExport } from '../components/FlashcardImportExport';

// Demo deck for testing
const demoDeck = {
  id: 'demo-1',
  title: 'Demo Karteideck',
  description: 'Ein Beispiel-Deck zum Testen der Import/Export-Funktionalität',
  subjectId: 'demo-subject',
  isPublic: true,
  cards: [
    {
      id: 'card-1',
      front: 'Was ist die Hauptstadt von Deutschland?',
      back: 'Berlin',
      hint: 'Die größte Stadt Deutschlands',
      difficulty: 1,
      order: 0
    },
    {
      id: 'card-2',
      front: 'Wie viele Planeten hat unser Sonnensystem?',
      back: '8',
      hint: 'Pluto zählt nicht mehr als Planet',
      difficulty: 2,
      order: 1
    },
    {
      id: 'card-3',
      front: 'Was ist 2 + 2?',
      back: '4',
      hint: 'Grundrechenart Addition',
      difficulty: 1,
      order: 2
    }
  ]
};

export const FlashcardImportExportPage: React.FC = () => {
  const [currentDeck, setCurrentDeck] = useState(demoDeck);
  const [importedDeck, setImportedDeck] = useState<any>(null);

  const handleImport = (deck: any) => {
    setImportedDeck(deck);
    console.log('Imported deck:', deck);
  };

  const handleExport = (deck: any) => {
    console.log('Exporting deck:', deck);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Karteideck Import/Export Demo
          </h1>
          <p className="text-gray-600">
            Testen Sie die Import- und Export-Funktionalität für Karteidecks
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Deck Display */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Aktuelles Deck</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">{currentDeck.title}</h3>
                  <p className="text-sm text-gray-600">{currentDeck.description}</p>
                  <p className="text-sm text-gray-500">{currentDeck.cards.length} Karten</p>
                </div>
                
                <div className="space-y-2">
                  {currentDeck.cards.map((card, index) => (
                    <div key={card.id} className="border rounded p-3 bg-gray-50">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Vorderseite:</span>
                          <p className="text-sm">{card.front}</p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Rückseite:</span>
                          <p className="text-sm">{card.back}</p>
                        </div>
                        {card.hint && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Tipp:</span>
                            <p className="text-sm text-blue-600">{card.hint}</p>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Schwierigkeit: {card.difficulty}/5
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Import/Export Component */}
          <div>
            <FlashcardImportExport
              onImport={handleImport}
              onExport={handleExport}
              existingDeck={currentDeck}
            />
          </div>
        </div>

        {/* Imported Deck Display */}
        {importedDeck && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Importiertes Deck</h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">{importedDeck.title}</h3>
                <p className="text-sm text-gray-600">{importedDeck.description}</p>
                <p className="text-sm text-gray-500">{importedDeck.cards.length} Karten</p>
              </div>
              
              <div className="space-y-2">
                {importedDeck.cards.map((card: any, index: number) => (
                  <div key={index} className="border rounded p-3 bg-green-50">
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Vorderseite:</span>
                        <p className="text-sm">{card.front}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Rückseite:</span>
                        <p className="text-sm">{card.back}</p>
                      </div>
                      {card.hint && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Tipp:</span>
                          <p className="text-sm text-blue-600">{card.hint}</p>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Schwierigkeit: {card.difficulty}/5
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


