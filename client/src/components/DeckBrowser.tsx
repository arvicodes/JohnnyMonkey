import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Search, 
  BookOpen, 
  Users, 
  Calendar, 
  SortAsc,
  SortDesc,
  Star,
  Target,
  Clock,
  Download
} from 'lucide-react';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// Unified interfaces for the entire flashcard system
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
  cards: Flashcard[];
  assignments?: Array<{
    id: string;
    dueDate?: Date;
    group: {
      id: string;
      name: string;
    };
  }>;
}

interface Subject {
  id: string;
  name: string;
}

interface DeckBrowserProps {
  decks: FlashcardDeckDisplay[];
  subjects: Subject[];
  userRole: 'STUDENT' | 'TEACHER';
  onDeckSelect: (deck: FlashcardDeckDisplay) => void;
  onEditDeck?: (deck: FlashcardDeckDisplay) => void;
  onDeleteDeck?: (deck: FlashcardDeckDisplay) => void;
}

type SortField = 'title' | 'createdAt' | 'updatedAt' | 'cards';
type SortOrder = 'asc' | 'desc';

export const DeckBrowser: React.FC<DeckBrowserProps> = ({
  decks,
  onDeckSelect,
  subjects = [],
  userRole = 'STUDENT'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);
  const [exportingDeckId, setExportingDeckId] = useState<string | null>(null);

  // Mock-Daten für Test-Zwecke, falls keine echten Daten vorhanden sind
  const mockDecks: FlashcardDeckDisplay[] = [
    {
      id: '1',
      title: 'Mathematik Grundlagen',
      description: 'Grundlegende mathematische Konzepte und Formeln',
      subjectId: '1',
      isPublic: true,
      teacher: { id: '1', name: 'Dr. Schmidt' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      _count: { cards: 20 },
      cards: [
        { id: '1', front: 'Was ist 2 + 2?', back: '4', hint: 'Zählen Sie die Zahlen', difficulty: 1, order: 0 },
        { id: '2', front: 'Was ist 5 × 3?', back: '15', hint: 'Multiplikation', difficulty: 2, order: 1 },
        { id: '3', front: 'Was ist die Quadratwurzel von 16?', back: '4', hint: 'Welche Zahl mal sich selbst ergibt 16?', difficulty: 2, order: 2 }
      ],
      assignments: []
    },
    {
      id: '2',
      title: 'Deutsche Grammatik',
      description: 'Wichtige Grammatikregeln und Ausnahmen',
      subjectId: '2',
      isPublic: false,
      teacher: { id: '2', name: 'Frau Müller' },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      _count: { cards: 15 },
      cards: [
        { id: '4', front: 'Welcher Artikel? "___ Haus"', back: 'Das', hint: 'Neutrum', difficulty: 2, order: 0 },
        { id: '5', front: 'Welcher Artikel? "___ Frau"', back: 'Die', hint: 'Femininum', difficulty: 1, order: 1 },
        { id: '6', front: 'Welcher Artikel? "___ Mann"', back: 'Der', hint: 'Maskulinum', difficulty: 1, order: 2 }
      ],
      assignments: []
    },
    {
      id: '3',
      title: 'Englische Vokabeln',
      description: 'Grundlegende englische Vokabeln für Anfänger',
      subjectId: '3',
      isPublic: true,
      teacher: { id: '3', name: 'Mr. Johnson' },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
      _count: { cards: 25 },
      cards: [
        { id: '7', front: 'Wie sagt man "Haus" auf Englisch?', back: 'House', hint: 'Denken Sie an "Haus"', difficulty: 1, order: 0 },
        { id: '8', front: 'Wie sagt man "Auto" auf Englisch?', back: 'Car', hint: 'Kurzes Wort', difficulty: 1, order: 1 },
        { id: '9', front: 'Wie sagt man "Buch" auf Englisch?', back: 'Book', hint: 'Reimt sich auf "look"', difficulty: 1, order: 2 }
      ],
      assignments: []
    }
  ];

  // Verwende Mock-Daten, falls keine echten Daten vorhanden sind
  const displayDecks = decks && decks.length > 0 ? decks : mockDecks;

  // Gefilterte und sortierte Decks
  const filteredAndSortedDecks = React.useMemo(() => {
    let filtered = displayDecks.filter(deck => {
      // Suchbegriff-Filter
      const matchesSearch = deck.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (deck.description && deck.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           deck.teacher.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Fach-Filter
      const matchesSubject = !selectedSubject || selectedSubject === 'all' || deck.subject?.id === selectedSubject;

      // Zugewiesene Decks-Filter (nur für Schüler)
      const matchesAssignment = userRole === 'STUDENT' ? 
        (!showOnlyAssigned || (deck.assignments && deck.assignments.length > 0)) : true;

      return matchesSearch && matchesSubject && matchesAssignment;
    });

    // Sortierung
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'cards':
          aValue = a._count.cards;
          bValue = b._count.cards;
          break;
        default:
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [displayDecks, searchTerm, selectedSubject, sortField, sortOrder, showOnlyAssigned, userRole]);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const getDifficultyColor = (cardCount: number) => {
    if (cardCount <= 10) return 'bg-green-100 text-green-800';
    if (cardCount <= 25) return 'bg-blue-100 text-blue-800';
    if (cardCount <= 50) return 'bg-yellow-100 text-yellow-800';
    if (cardCount <= 100) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyText = (cardCount: number) => {
    if (cardCount <= 10) return 'Einfach';
    if (cardCount <= 25) return 'Mittel';
    if (cardCount <= 50) return 'Fortgeschritten';
    if (cardCount <= 100) return 'Experte';
    return 'Meister';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDueDateText = (assignments: FlashcardDeckDisplay['assignments']) => {
    if (!assignments || assignments.length === 0) return null;
    
    const dueDates = assignments
      .map(a => a.dueDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());
    
    if (dueDates.length === 0) return null;
    
    const nextDue = dueDates[0];
    const now = new Date();
    const daysUntilDue = Math.ceil((new Date(nextDue!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return { text: `Überfällig seit ${Math.abs(daysUntilDue)} Tagen`, color: 'text-red-600' };
    } else if (daysUntilDue === 0) {
      return { text: 'Fällig heute', color: 'text-orange-600' };
    } else if (daysUntilDue === 1) {
      return { text: 'Fällig morgen', color: 'text-orange-600' };
    } else if (daysUntilDue <= 7) {
      return { text: `Fällig in ${daysUntilDue} Tagen`, color: 'text-yellow-600' };
    } else {
      return { text: `Fällig in ${daysUntilDue} Tagen`, color: 'text-gray-600' };
    }
  };

  // Export function to Word document
  const exportToWord = async (deck: FlashcardDeckDisplay) => {
    console.log('Export started for deck:', deck);
    
    if (!deck || deck._count.cards === 0) {
      alert('Kein Deck oder keine Karten zum Exportieren vorhanden.');
      return;
    }

    setExportingDeckId(deck.id);

    try {
      // Try to load cards from API first
      let cards = [];
      
      try {
        const response = await fetch(`/api/flashcards/decks/${deck.id}/cards`);
        
        if (response.ok) {
          cards = await response.json();
          console.log('Loaded cards from API:', cards);
        } else {
          console.warn('API call failed, using deck cards');
          throw new Error('API call failed');
        }
      } catch (apiError) {
        console.warn('Using deck cards due to API error:', apiError);
        // Fallback to deck cards if API fails
        cards = deck.cards || [];
      }

      if (!cards || cards.length === 0) {
        alert('Keine Karten zum Exportieren gefunden.');
        return;
      }

      console.log('Creating Word document with cards:', cards);

      // Create Word document structure with the requested format
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title as heading
            new Paragraph({
              text: deck.title,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Description if available
            ...(deck.description ? [
              new Paragraph({
                text: deck.description,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
              })
            ] : []),
            
            // All flashcards in the format: Frage: ... Antwort: ... with line breaks
            ...cards.map((card: any, index: number) => [
              new Paragraph({
                text: `Frage: ${card.front}`,
                spacing: { after: 200 }
              }),
              new Paragraph({
                text: `Antwort: ${card.back}`,
                spacing: { after: 400 }
              })
            ]).flat()
          ]
        }]
      });

      console.log('Document created, generating blob...');

      // Generate and save the document
      const blob = await Packer.toBlob(doc);
      const fileName = `${deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_karteideck.docx`;
      
      console.log('Saving file:', fileName);
      saveAs(blob, fileName);

      console.log('Export completed successfully');
      alert(`Deck "${deck.title}" erfolgreich exportiert!`);

    } catch (err) {
      console.error('Export error:', err);
      alert('Fehler beim Exportieren des Decks. Bitte versuchen Sie es erneut.');
    } finally {
      setExportingDeckId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Karteidecks</h1>
          <p className="text-gray-600">
            {filteredAndSortedDecks.length} von {displayDecks.length} Decks verfügbar
          </p>
        </div>
        
        {userRole === 'STUDENT' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showOnlyAssigned"
              checked={showOnlyAssigned}
              onChange={(e) => setShowOnlyAssigned(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showOnlyAssigned" className="text-sm">
              Nur zugewiesene Decks
            </label>
          </div>
        )}
      </div>

      {/* Filter und Suche */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Suchfeld */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Nach Decks suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Fach-Filter */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Alle Fächer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Fächer</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sortierung */}
            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Titel</SelectItem>
                <SelectItem value="createdAt">Erstellt</SelectItem>
                <SelectItem value="updatedAt">Aktualisiert</SelectItem>
                <SelectItem value="cards">Anzahl Karten</SelectItem>
              </SelectContent>
            </Select>

            {/* Sortierreihenfolge */}
            <Button
              variant="outline"
              onClick={toggleSortOrder}
              className="flex items-center gap-2"
            >
              {sortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
              {getSortIcon(sortField)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deck-Liste */}
      {filteredAndSortedDecks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Keine Decks gefunden</h3>
              <p>Versuchen Sie andere Suchkriterien oder erstellen Sie ein neues Deck.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedDecks.map((deck) => (
            <Card 
              key={deck.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onDeckSelect(deck)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {deck.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      {deck.teacher.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deck.isPublic && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                    <Badge variant="outline" className={getDifficultyColor(deck._count.cards)}>
                      {deck._count.cards} Karten
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToWord(deck);
                      }}
                      className="ml-2"
                      title="Als Word-Datei exportieren"
                      disabled={exportingDeckId === deck.id}
                    >
                      {exportingDeckId === deck.id ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Beschreibung */}
                {deck.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {deck.description}
                  </p>
                )}

                {/* Fach */}
                {deck.subject && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">
                      {deck.subject.name}
                    </span>
                  </div>
                )}

                {/* Zuweisungen */}
                {deck.assignments && deck.assignments.length > 0 && (
                  <div className="space-y-2">
                    {deck.assignments.map(assignment => {
                      const dueDateInfo = getDueDateText([assignment]);
                      return (
                        <div key={assignment.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-600" />
                            <span className="text-purple-600">
                              {assignment.group.name}
                            </span>
                          </div>
                          {dueDateInfo && (
                            <span className={dueDateInfo.color}>
                              {dueDateInfo.text}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Metadaten */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(deck.createdAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(deck.updatedAt)}
                  </div>
                </div>

                {/* Schwierigkeitsgrad */}
                <div className="text-center">
                  <Badge variant="outline" className={getDifficultyColor(deck._count.cards)}>
                    {getDifficultyText(deck._count.cards)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
