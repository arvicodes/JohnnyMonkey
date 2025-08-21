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
  Play, 
  Edit, 
  Trash2,
  SortAsc,
  SortDesc,
  Star,
  Target,
  Clock
} from 'lucide-react';

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

  // Gefilterte und sortierte Decks
  const filteredAndSortedDecks = React.useMemo(() => {
    let filtered = decks.filter(deck => {
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
  }, [decks, searchTerm, selectedSubject, sortField, sortOrder, showOnlyAssigned, userRole]);

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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Karteidecks</h1>
          <p className="text-gray-600">
            {filteredAndSortedDecks.length} von {decks.length} Decks verfügbar
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
