import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Target,
  BarChart3,
  Play,
  Clock,
  Download
} from 'lucide-react';

import { FlashcardCreator } from '../components/FlashcardCreator';
import { FlashcardPlayer } from '../components/FlashcardPlayer';
import { ProgressTracker } from '../components/ProgressTracker';
import { DeckBrowser } from '../components/DeckBrowser';

// Use the same interfaces as FlashcardCreator
interface Flashcard {
  id?: string;
  front: string;
  back: string;
  hint?: string;
  difficulty: number;
  order: number;
}

interface FlashcardDeck {
  id?: string;
  title: string;
  description?: string;
  subjectId?: string;
  isPublic: boolean;
  cards: Flashcard[];
}

// Extended interface for display purposes
interface FlashcardDeckDisplay extends FlashcardDeck {
  id: string;
  subject?: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  _count: {
    cards: number;
  };
  assignments?: Array<{
    id: string;
    dueDate?: Date;
    group: {
      id: string;
      name: string;
    };
  }>;
}

interface FlashcardProgress {
  id: string;
  cardId: string;
  level: number;
  nextReview: Date;
  lastReviewed: Date | null;
  reviewCount: number;
  card: Flashcard;
}

interface Subject {
  id: string;
  name: string;
}

interface FlashcardPageProps {
  userRole?: 'STUDENT' | 'TEACHER';
  userId?: string;
}

export const FlashcardPage: React.FC<FlashcardPageProps> = ({
  userRole = 'STUDENT',
  userId
}) => {
  const [activeTab, setActiveTab] = useState('browse');
  const [decks, setDecks] = useState<FlashcardDeckDisplay[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeckDisplay | null>(null);
  const [progress, setProgress] = useState<FlashcardProgress[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMode, setCurrentMode] = useState<'browse' | 'create' | 'edit' | 'play' | 'progress'>(
    userRole === 'TEACHER' ? 'browse' : 'browse'
  );

  // Mock-Daten für die Demo (später durch echte API-Aufrufe ersetzen)
  useEffect(() => {
    // Simuliere das Laden von Daten
    const mockSubjects: Subject[] = [
      { id: '1', name: 'Mathematik' },
      { id: '2', name: 'Physik' },
      { id: '3', name: 'Informatik' },
      { id: '4', name: 'Deutsch' }
    ];

    const mockDecks: FlashcardDeckDisplay[] = [
      {
        id: '1',
        title: 'Mathematik Grundlagen',
        description: 'Grundlegende mathematische Konzepte',
        subjectId: '1',
        isPublic: true,
        teacher: { id: '1', name: 'Dr. Schmidt' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        _count: { cards: 20 },
        cards: [
          {
            id: '1',
            front: 'Was ist 2 + 2?',
            back: '4',
            hint: 'Zählen Sie die Zahlen',
            difficulty: 1,
            order: 0
          },
          {
            id: '2',
            front: 'Was ist 5 × 3?',
            back: '15',
            hint: 'Multiplikation',
            difficulty: 2,
            order: 1
          }
        ],
        assignments: [
          {
            id: '1',
            dueDate: new Date('2024-02-01'),
            group: { id: '1', name: 'Klasse 7a' }
          }
        ]
      },
      {
        id: '2',
        title: 'Deutsche Grammatik',
        description: 'Wichtige Grammatikregeln',
        subjectId: '2',
        isPublic: false,
        teacher: { id: '2', name: 'Frau Müller' },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        _count: { cards: 15 },
        cards: [
          {
            id: '3',
            front: 'Welcher Artikel? "___ Haus"',
            back: 'Das',
            hint: 'Neutrum',
            difficulty: 2,
            order: 0
          }
        ],
        assignments: []
      }
    ];

    const mockProgress: FlashcardProgress[] = [
      {
        id: '1',
        cardId: '1',
        level: 3,
        nextReview: new Date('2024-01-20'),
        lastReviewed: new Date('2024-01-18'),
        reviewCount: 5,
        card: {
          id: '1',
          front: 'Was ist 2 + 2?',
          back: '4',
          hint: 'Zählen Sie die Zahlen',
          difficulty: 1,
          order: 0
        }
      }
    ];

    setSubjects(mockSubjects);
    setDecks(mockDecks);
    setProgress(mockProgress);
  }, []);

  const handleDeckSelect = (deck: FlashcardDeckDisplay) => {
    setSelectedDeck(deck);
    setCurrentMode('browse');
  };

  const handleCreateDeck = () => {
    setIsCreating(true);
    setCurrentMode('create');
  };

  const handleEditDeck = (deck: FlashcardDeckDisplay) => {
    setSelectedDeck(deck);
    setIsEditing(true);
    setCurrentMode('edit');
  };

  const handleDeleteDeck = async (deck: FlashcardDeckDisplay) => {
    if (window.confirm(`Möchten Sie das Karteideck "${deck.title}" wirklich löschen?`)) {
      try {
        // Hier würde der API-Aufruf stehen
        // await deleteDeck(deck.id);
        
        setDecks(prev => prev.filter(d => d.id !== deck.id));
        if (selectedDeck?.id === deck.id) {
          setSelectedDeck(null);
          setCurrentMode('browse');
        }
      } catch (error) {
        console.error('Fehler beim Löschen des Karteidecks:', error);
      }
    }
  };

  const handleExportDeck = async (deck: FlashcardDeckDisplay) => {
    try {
      // Hier würde der API-Aufruf stehen, um die Karten zu laden
      // const cards = await getDeckCards(deck.id);
      
      // Für jetzt verwenden wir die vorhandenen Karten oder Mock-Daten
      const cards = deck.cards || [];
      
      if (!cards || cards.length === 0) {
        alert('Keine Karten zum Exportieren gefunden.');
        return;
      }

      // Erstelle ein einfaches Text-Format für den Export
      const exportContent = [
        `Deck: ${deck.title}`,
        deck.description ? `Beschreibung: ${deck.description}` : '',
        '',
        ...cards.map((card, index) => [
          `Karte ${index + 1}:`,
          `Frage: ${card.front}`,
          `Antwort: ${card.back}`,
          card.hint ? `Hinweis: ${card.hint}` : '',
          ''
        ].filter(Boolean).join('\n'))
      ].filter(Boolean).join('\n');

      // Erstelle und lade die Datei herunter
      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_karteideck.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`Deck "${deck.title}" erfolgreich exportiert!`);
    } catch (error) {
      console.error('Fehler beim Exportieren des Decks:', error);
      alert('Fehler beim Exportieren des Decks. Bitte versuchen Sie es erneut.');
    }
  };

  const handleSaveDeck = async (deck: FlashcardDeck) => {
    if (isEditing && selectedDeck) {
      // Bearbeiten
      const updatedDeck: FlashcardDeckDisplay = {
        ...selectedDeck,
        ...deck,
        cards: deck.cards.map((card, index) => ({
          ...card,
          id: card.id || `temp-${index}`,
          order: index
        }))
      };
      
      setDecks(prev => prev.map(d => d.id === selectedDeck.id ? updatedDeck : d));
      setSelectedDeck(updatedDeck);
      setIsEditing(false);
    } else {
      // Neu erstellen
      const newDeck: FlashcardDeckDisplay = {
        ...deck,
        id: Date.now().toString(),
        teacher: { id: userId || '1', name: 'Aktueller Lehrer' },
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { cards: deck.cards.length },
        cards: deck.cards.map((card, index) => ({
          ...card,
          id: card.id || `temp-${index}`,
          order: index
        })),
        assignments: []
      };
      
      setDecks(prev => [...prev, newDeck]);
      setSelectedDeck(newDeck);
      setIsCreating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setIsEditing(false);
    setCurrentMode('browse');
  };

  const handleStartPractice = () => {
    if (selectedDeck) {
      setCurrentMode('play');
    }
  };

  const handleStartReview = () => {
    if (selectedDeck) {
      setCurrentMode('play');
    }
  };

  const handleCardReview = async (cardId: string, quality: number) => {
    // Simuliere API-Aufruf
    console.log(`Card ${cardId} reviewed with quality ${quality}`);
    
    // Aktualisiere lokalen Fortschritt
    setProgress(prev => {
      const existing = prev.find(p => p.cardId === cardId);
      if (existing) {
        return prev.map(p => 
          p.cardId === cardId 
            ? { ...p, level: Math.min(5, Math.max(0, p.level + (quality >= 4 ? 1 : -1))) }
            : p
        );
      } else {
        // Neue Fortschritts-Eintrag erstellen
        const card = selectedDeck?.cards.find(c => c.id === cardId);
        if (card) {
          const newProgress: FlashcardProgress = {
            id: Date.now().toString(),
            cardId,
            level: quality >= 4 ? 1 : 0,
            nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
            lastReviewed: new Date(),
            reviewCount: 1,
            card
          };
          return [...prev, newProgress];
        }
      }
      return prev;
    });
  };

  const handleBackToBrowse = () => {
    setCurrentMode('browse');
    setSelectedDeck(null);
  };

  // Render-Modus basierend auf currentMode
  if (currentMode === 'create') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={handleCancelEdit}>
            ← Zurück zur Übersicht
          </Button>
        </div>
        <FlashcardCreator
          subjects={subjects}
          onSave={handleSaveDeck}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  if (currentMode === 'edit' && selectedDeck) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={handleCancelEdit}>
            ← Zurück zur Übersicht
          </Button>
        </div>
        <FlashcardCreator
          subjects={subjects}
          initialDeck={selectedDeck}
          onSave={handleSaveDeck}
          onCancel={handleCancelEdit}
        />
      </div>
    );
  }

  if (currentMode === 'play' && selectedDeck) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={handleBackToBrowse}>
            ← Zurück zur Übersicht
          </Button>
        </div>
        <FlashcardPlayer
          deck={selectedDeck}
          progress={progress.filter(p => selectedDeck.cards.some(c => c.id === p.cardId))}
          mode="practice"
          onCardReview={handleCardReview}
          onComplete={() => setCurrentMode('progress')}
        />
      </div>
    );
  }

  if (currentMode === 'progress' && selectedDeck) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="outline" onClick={handleBackToBrowse}>
            ← Zurück zur Übersicht
          </Button>
        </div>
        <ProgressTracker
          deck={selectedDeck}
          progress={progress.filter(p => selectedDeck.cards.some(c => c.id === p.cardId))}
        />
      </div>
    );
  }

  // Hauptansicht: Deck-Browser
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Karteikartensystem
          </h1>
          <p className="text-gray-600">
            {userRole === 'TEACHER' 
              ? 'Verwalten Sie Karteidecks für Ihre Schüler' 
              : 'Lernen Sie effektiv mit dem Spaced Repetition System'
            }
          </p>
        </div>
        
        {userRole === 'TEACHER' && (
          <Button onClick={handleCreateDeck} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Neues Deck erstellen
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${userRole === 'TEACHER' ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <TabsTrigger value="browse">Durchsuchen</TabsTrigger>
          <TabsTrigger value="my-decks">Meine Decks</TabsTrigger>
          {userRole === 'STUDENT' && (
            <TabsTrigger value="assignments">Zuweisungen</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <DeckBrowser
            decks={decks}
            subjects={subjects}
            userRole={userRole}
            onDeckSelect={handleDeckSelect}
            onEditDeck={userRole === 'TEACHER' ? handleEditDeck : undefined}
            onDeleteDeck={userRole === 'TEACHER' ? handleDeleteDeck : undefined}
          />
        </TabsContent>

        <TabsContent value="my-decks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks
              .filter(deck => userRole === 'TEACHER' ? deck.teacher.id === userId : true)
              .map(deck => (
                <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{deck.title}</CardTitle>
                        <p className="text-sm text-gray-600">{deck.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{deck._count.cards} Karten</Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportDeck(deck);
                            }}
                            title="Als Text-Datei exportieren"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {userRole === 'TEACHER' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditDeck(deck)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteDeck(deck)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      {deck.teacher.name}
                    </div>
                    {deck.subject && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <BookOpen className="w-4 h-4" />
                        {deck.subject.name}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {userRole === 'STUDENT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDeck(deck);
                            setCurrentMode('play');
                          }}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Üben
                        </Button>
                      )}
                      
                      {userRole === 'STUDENT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDeck(deck);
                            setCurrentMode('progress');
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Fortschritt
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks
              .filter(deck => deck.assignments && deck.assignments.length > 0)
              .map(deck => (
                <Card key={deck.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{deck.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Target className="w-4 h-4" />
                      Zugewiesen
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {deck.assignments?.map(assignment => (
                      <div key={assignment.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{assignment.group.name}</span>
                          {assignment.dueDate && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(assignment.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{deck.description}</p>
                      </div>
                    ))}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportDeck(deck);
                        }}
                        title="Als Text-Datei exportieren"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDeck(deck);
                          setCurrentMode('play');
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Jetzt üben
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
