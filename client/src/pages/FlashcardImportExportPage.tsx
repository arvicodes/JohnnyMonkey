import React, { useState } from 'react';
import { FlashcardImportExport } from '../components/FlashcardImportExport';

// Define types
interface FlashcardCard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  cards: FlashcardCard[];
}

// Demo deck for testing
const demoDeck: FlashcardDeck = {
  id: 'demo-1',
  title: 'Demo Karteideck',
  description: 'Ein Beispiel-Karteideck zum Testen der Import/Export-Funktionalität',
  cards: [
    {
      id: '1',
      front: 'Was ist die Hauptstadt von Deutschland?',
      back: 'Berlin'
    },
    {
      id: '2',
      front: 'Wie viele Planeten hat unser Sonnensystem?',
      back: '8 (seit 2006, als Pluto zum Zwergplaneten degradiert wurde)'
    },
    {
      id: '3',
      front: 'Was ist die chemische Formel für Wasser?',
      back: 'H₂O'
    }
  ]
};

export const FlashcardImportExportPage: React.FC = () => {
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(demoDeck);
  const [importedDeck, setImportedDeck] = useState<FlashcardDeck | null>(null);

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
                  <h3 className="font-medium">{currentDeck?.title}</h3>
                  <p className="text-sm text-gray-600">{currentDeck?.description}</p>
                  <p className="text-sm text-gray-500">{currentDeck?.cards.length} Karten</p>
                </div>
                
                <div className="space-y-2">
                  {currentDeck?.cards.map((card, index) => (
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
                        {/* Removed hint and difficulty as they are not in the new demoDeck structure */}
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
                {importedDeck.cards.map((card: FlashcardCard, index: number) => (
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
                      {/* Removed hint and difficulty as they are not in the new demoDeck structure */}
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





