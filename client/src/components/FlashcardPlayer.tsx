import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Play, 
  Target,
  BarChart3,
  Clock,
  Check,
  X,
  RotateCw
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

interface FlashcardProgress {
  id: string;
  cardId: string;
  level: number;
  nextReview: Date;
  lastReviewed: Date | null;
  reviewCount: number;
  card: Flashcard;
}

interface FlashcardPlayerProps {
  deck: FlashcardDeck;
  progress?: FlashcardProgress[];
  mode: 'practice' | 'review' | 'test';
  onCardReview?: (cardId: string, quality: number) => void;
  onComplete?: () => void;
}

export const FlashcardPlayer: React.FC<FlashcardPlayerProps> = ({
  deck,
  progress,
  mode = 'practice',
  onCardReview,
  onComplete
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [reviewQuality, setReviewQuality] = useState<number | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: deck.cards.length,
    reviewed: 0,
    correct: 0,
    incorrect: 0
  });

  // Filtere Karten basierend auf dem Modus
  const filteredCards = React.useMemo(() => {
    if (mode === 'review') {
      // Nur fällige Karten für Review
      return deck.cards.filter(card => 
        progress && 
        progress.find(p => p.cardId === card.id) &&
        new Date(progress.find(p => p.cardId === card.id)?.nextReview || '') <= new Date()
      );
    } else if (mode === 'test') {
      // Alle Karten für Test
      return deck.cards;
    } else {
      // Alle Karten für Übung
      return deck.cards;
    }
  }, [deck.cards, mode, progress]);

  const currentCard = filteredCards[currentCardIndex];
  const isLastCard = currentCardIndex === filteredCards.length - 1;
  const isFirstCard = currentCardIndex === 0;

  useEffect(() => {
    if (filteredCards.length === 0) {
      return;
    }
    
    // Setze den ersten fälligen Karten-Index für Review-Modus
    if (mode === 'review') {
      const firstDueIndex = filteredCards.findIndex(card => 
        progress && 
        progress.find(p => p.cardId === card.id) &&
        new Date(progress.find(p => p.cardId === card.id)?.nextReview || '') <= new Date()
      );
      if (firstDueIndex !== -1) {
        setCurrentCardIndex(firstDueIndex);
      }
    }
  }, [filteredCards, mode, progress]);

  const handleCorrect = () => {
    if (currentCard && onCardReview) {
      onCardReview(currentCard.id || currentCardIndex.toString(), 5); // Sehr gut
    }
    setSessionStats(prev => ({ ...prev, correct: prev.correct + 1, reviewed: prev.reviewed + 1 }));
    nextCard();
  };

  const handleIncorrect = () => {
    if (currentCard && onCardReview) {
      onCardReview(currentCard.id || currentCardIndex.toString(), 1); // Schlecht
    }
    setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1, reviewed: prev.reviewed + 1 }));
    nextCard();
  };

  const nextCard = () => {
    if (currentCardIndex < filteredCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowBack(false);
      setReviewQuality(null);
    } else {
      onComplete?.();
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowBack(false);
      setReviewQuality(null);
    }
  };

  const flipCard = () => {
    setShowBack(!showBack);
  };

  const handleQualitySelect = async (quality: number) => {
    if (!currentCard) return;

    setIsReviewing(true);
    setReviewQuality(quality);

    try {
      if (onCardReview) {
        await onCardReview(currentCard.id || '', quality);
      }
      
      // Statistiken aktualisieren
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (quality >= 4 ? 1 : 0),
        incorrect: prev.incorrect + (quality <= 2 ? 1 : 0)
      }));

      // Automatisch zur nächsten Karte nach kurzer Verzögerung
      setTimeout(() => {
        if (!isLastCard) {
          nextCard();
        }
      }, 1500);
    } catch (error) {
      console.error('Fehler beim Speichern des Reviews:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setShowBack(false);
    setReviewQuality(null);
    setSessionStats({
      total: filteredCards.length,
      reviewed: 0,
      correct: 0,
      incorrect: 0
    });
  };

  const getProgressPercentage = () => {
    if (filteredCards.length === 0) return 0;
    return ((currentCardIndex + 1) / filteredCards.length) * 100;
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-green-100 text-green-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: number) => {
    switch (level) {
      case 0: return 'Neu';
      case 1: return 'L1';
      case 2: return 'L2';
      case 3: return 'L3';
      case 4: return 'L4';
      case 5: return 'L5';
      default: return '?';
    }
  };

  if (filteredCards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Keine Karten verfügbar</h3>
              <p>Für diesen Modus sind keine Karten verfügbar.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex">
            <div className="w-8 h-10 bg-green-500 rounded-t-lg"></div>
            <div className="w-8 h-10 bg-orange-500 rounded-b-lg -ml-2"></div>
          </div>
          <h1 className="text-3xl font-bold text-white">{deck.title}</h1>
        </div>
        <p className="text-white/80 text-lg">Karteikarten zum Wiederholen</p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/20 rounded-xl p-4 mb-6 max-w-2xl mx-auto">
        <Progress 
          value={(currentCardIndex / filteredCards.length) * 100} 
          className="h-2 mb-3"
        />
        <div className="text-center text-white font-medium">
          Karte {currentCardIndex + 1} von {filteredCards.length} | 
          Richtig: {sessionStats.correct} | 
          Falsch: {sessionStats.incorrect}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white shadow-xl">
          <CardContent className="p-8">
            {/* Question Label */}
            <div className="mb-6">
              <Badge className="bg-blue-600 text-white px-3 py-1 text-sm">
                Frage
              </Badge>
            </div>

            {/* Question/Answer */}
            <div className="min-h-[200px] flex items-center justify-center">
              {!showBack ? (
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    {currentCard?.front}
                  </h2>
                  <p className="text-gray-600">Klicken Sie auf "Antwort zeigen" um die Antwort zu sehen.</p>
                </div>
              ) : (
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                    {currentCard?.back}
                  </h2>
                  {currentCard?.hint && (
                    <p className="text-gray-600 text-sm mt-2">
                      <em>Hinweis: {currentCard.hint}</em>
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowBack(!showBack)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
          >
            <RotateCw className="w-5 h-5 mr-2" />
            {showBack ? 'Frage zeigen' : 'Antwort zeigen'}
          </Button>

          {showBack && (
            <>
              <Button
                size="lg"
                onClick={handleCorrect}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="w-5 h-5 mr-2" />
                Richtig
              </Button>

              <Button
                size="lg"
                onClick={handleIncorrect}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <X className="w-5 h-5 mr-2" />
                Falsch
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={nextCard}
            disabled={currentCardIndex >= filteredCards.length - 1}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
          >
            <ChevronRight className="w-5 h-5 mr-2" />
            Nächste
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mt-6">
          <Button
            variant="ghost"
            onClick={prevCard}
            disabled={currentCardIndex === 0}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </div>
      </div>
    </div>
  );
};
