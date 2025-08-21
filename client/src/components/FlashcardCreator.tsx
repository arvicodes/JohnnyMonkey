import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

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

interface Subject {
  id: string;
  name: string;
}

interface FlashcardCreatorProps {
  onSave?: (deck: FlashcardDeck) => void;
  onCancel?: () => void;
  initialDeck?: FlashcardDeck;
  subjects?: Subject[];
}

export const FlashcardCreator: React.FC<FlashcardCreatorProps> = ({
  onSave,
  onCancel,
  initialDeck,
  subjects = []
}) => {
  const [deck, setDeck] = useState<FlashcardDeck>(
    initialDeck || {
      title: '',
      description: '',
      subjectId: '',
      isPublic: false,
      cards: []
    }
  );

  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState<Flashcard>({
    front: '',
    back: '',
    hint: '',
    difficulty: 1,
    order: 0
  });

  const [isEditing, setIsEditing] = useState(!!initialDeck);

  useEffect(() => {
    if (initialDeck) {
      setDeck(initialDeck);
      setIsEditing(true);
    }
  }, [initialDeck]);

  const handleDeckChange = (field: keyof FlashcardDeck, value: any) => {
    setDeck(prev => ({ ...prev, [field]: value }));
  };

  const addCard = () => {
    const newCard: Flashcard = {
      front: '',
      back: '',
      hint: '',
      difficulty: 1,
      order: deck.cards.length
    };
    
    setDeck(prev => ({
      ...prev,
      cards: [...prev.cards, newCard]
    }));
    
    setEditingCardIndex(deck.cards.length);
    setEditingCard(newCard);
  };

  const startEditCard = (index: number) => {
    setEditingCardIndex(index);
    setEditingCard({ ...deck.cards[index] });
  };

  const saveCard = () => {
    if (editingCardIndex !== null) {
      const updatedCards = [...deck.cards];
      
      if (editingCardIndex >= deck.cards.length) {
        // Neue Karte
        updatedCards.push(editingCard);
      } else {
        // Bestehende Karte bearbeiten
        updatedCards[editingCardIndex] = editingCard;
      }
      
      setDeck(prev => ({ ...prev, cards: updatedCards }));
      setEditingCardIndex(null);
      setEditingCard({
        front: '',
        back: '',
        hint: '',
        difficulty: 1,
        order: 0
      });
    }
  };

  const cancelEditCard = () => {
    setEditingCardIndex(null);
    setEditingCard({
      front: '',
      back: '',
      hint: '',
      difficulty: 1,
      order: 0
    });
  };

  const deleteCard = (index: number) => {
    const updatedCards = deck.cards.filter((_, i) => i !== index);
    // Reihenfolge neu nummerieren
    const reorderedCards = updatedCards.map((card, i) => ({
      ...card,
      order: i
    }));
    
    setDeck(prev => ({ ...prev, cards: reorderedCards }));
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === deck.cards.length - 1)
    ) {
      return;
    }

    const updatedCards = [...deck.cards];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Karten tauschen
    [updatedCards[index], updatedCards[newIndex]] = [updatedCards[newIndex], updatedCards[index]];
    
    // Reihenfolge aktualisieren
    updatedCards.forEach((card, i) => {
      card.order = i;
    });
    
    setDeck(prev => ({ ...prev, cards: updatedCards }));
  };

  const handleSave = () => {
    if (!deck.title.trim()) {
      alert('Bitte geben Sie einen Titel für das Karteideck ein.');
      return;
    }

    if (deck.cards.length === 0) {
      alert('Bitte fügen Sie mindestens eine Karte hinzu.');
      return;
    }

    // Alle Karten müssen ausgefüllt sein
    const hasEmptyCards = deck.cards.some(card => !card.front.trim() || !card.back.trim());
    if (hasEmptyCards) {
      alert('Bitte füllen Sie alle Karten vollständig aus.');
      return;
    }

    onSave?.(deck);
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Sehr einfach';
      case 2: return 'Einfach';
      case 3: return 'Mittel';
      case 4: return 'Schwer';
      case 5: return 'Sehr schwer';
      default: return 'Unbekannt';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEditing ? 'Karteideck bearbeiten' : 'Neues Karteideck erstellen'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deck-Informationen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={deck.title}
                onChange={(e) => handleDeckChange('title', e.target.value)}
                placeholder="Titel des Karteidecks"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Fach</Label>
              <Select
                value={deck.subjectId || 'none'}
                onValueChange={(value) => handleDeckChange('subjectId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fach auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Fach</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={deck.description || ''}
              onChange={(e) => handleDeckChange('description', e.target.value)}
              placeholder="Beschreibung des Karteidecks (optional)"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={deck.isPublic}
              onChange={(e) => handleDeckChange('isPublic', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isPublic">Öffentlich verfügbar</Label>
          </div>
        </CardContent>
      </Card>

      {/* Karten-Verwaltung */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Karten ({deck.cards.length})</CardTitle>
            <Button onClick={addCard} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Karte hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deck.cards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Noch keine Karten vorhanden.</p>
              <p className="text-sm">Klicken Sie auf "Karte hinzufügen" um zu beginnen.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deck.cards.map((card, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Karte {index + 1}</Badge>
                      <Badge className={getDifficultyColor(card.difficulty)}>
                        {getDifficultyText(card.difficulty)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveCard(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveCard(index, 'down')}
                        disabled={index === deck.cards.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditCard(index)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCard(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Vorderseite</Label>
                      <p className="mt-1 p-2 bg-gray-50 rounded border">
                        {card.front || <span className="text-gray-400">Nicht ausgefüllt</span>}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Rückseite</Label>
                      <p className="mt-1 p-2 bg-gray-50 rounded border">
                        {card.back || <span className="text-gray-400">Nicht ausgefüllt</span>}
                      </p>
                    </div>
                  </div>
                  
                  {card.hint && (
                    <div className="mt-3">
                      <Label className="text-sm font-medium">Tipp</Label>
                      <p className="mt-1 p-2 bg-blue-50 rounded border text-blue-800">
                        {card.hint}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Karten-Editor */}
      {editingCardIndex !== null && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCardIndex >= deck.cards.length ? 'Neue Karte' : `Karte ${editingCardIndex + 1} bearbeiten`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="front">Vorderseite *</Label>
                <Textarea
                  id="front"
                  value={editingCard.front}
                  onChange={(e) => setEditingCard(prev => ({ ...prev, front: e.target.value }))}
                  placeholder="Frage oder Begriff"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="back">Rückseite *</Label>
                <Textarea
                  id="back"
                  value={editingCard.back}
                  onChange={(e) => setEditingCard(prev => ({ ...prev, back: e.target.value }))}
                  placeholder="Antwort oder Definition"
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hint">Tipp (optional)</Label>
                <Input
                  id="hint"
                  value={editingCard.hint || ''}
                  onChange={(e) => setEditingCard(prev => ({ ...prev, hint: e.target.value }))}
                  placeholder="Hilfreicher Tipp"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Schwierigkeitsgrad</Label>
                <Select
                  value={editingCard.difficulty.toString()}
                  onValueChange={(value) => setEditingCard(prev => ({ ...prev, difficulty: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Sehr einfach</SelectItem>
                    <SelectItem value="2">2 - Einfach</SelectItem>
                    <SelectItem value="3">3 - Mittel</SelectItem>
                    <SelectItem value="4">4 - Schwer</SelectItem>
                    <SelectItem value="5">5 - Sehr schwer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEditCard}>
                <X className="w-4 h-4 mr-2" />
                Abbrechen
              </Button>
              <Button onClick={saveCard}>
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aktions-Buttons */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={deck.cards.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          {isEditing ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </div>
  );
};
