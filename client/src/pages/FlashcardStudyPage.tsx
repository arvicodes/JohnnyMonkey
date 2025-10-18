import React, { useState, useEffect } from 'react';
import JohnnyCompanionSimple from '../components/JohnnyCompanionSimple';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const FlashcardStudyPage: React.FC = () => {
  const [cards] = useState<Flashcard[]>([
    {
      id: '1',
      front: 'Was ist die Hauptstadt von Frankreich?',
      back: 'Paris',
      difficulty: 'easy'
    },
    {
      id: '2',
      front: 'Wie viele Planeten hat unser Sonnensystem?',
      back: '8 (seit Pluto nicht mehr als Planet gilt)',
      difficulty: 'medium'
    },
    {
      id: '3',
      front: 'Was ist die chemische Formel für Wasser?',
      back: 'H₂O',
      difficulty: 'easy'
    },
    {
      id: '4',
      front: 'Wer schrieb "Romeo und Julia"?',
      back: 'William Shakespeare',
      difficulty: 'medium'
    },
    {
      id: '5',
      front: 'Was ist die Quadratwurzel von 144?',
      back: '12',
      difficulty: 'hard'
    }
  ]);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studiedCards, setStudiedCards] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [userId] = useState('flashcard-user-123');

  const currentCard = cards[currentCardIndex];

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleNextCard = () => {
    setStudiedCards(studiedCards + 1);
    
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      setSessionCompleted(true);
      // Update learning progress
      const currentProgress = JSON.parse(localStorage.getItem(`learningProgress_${userId}`) || '{}');
      const newProgress = {
        totalQuizzesCompleted: currentProgress.totalQuizzesCompleted || 0,
        totalFlashcardsStudied: (currentProgress.totalFlashcardsStudied || 0) + cards.length,
        totalPointsEarned: (currentProgress.totalPointsEarned || 0) + cards.length * 2,
        currentStreak: (currentProgress.currentStreak || 0) + 1,
        lastActivity: new Date()
      };
      localStorage.setItem(`learningProgress_${userId}`, JSON.stringify(newProgress));
    }
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setStudiedCards(0);
    setSessionCompleted(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Einfach';
      case 'medium': return 'Mittel';
      case 'hard': return 'Schwer';
      default: return 'Unbekannt';
    }
  };

  if (sessionCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              🎉 Karteikarten-Session abgeschlossen!
            </h1>
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl text-gray-600 mb-4">
              Du hast {cards.length} Karteikarten durchgearbeitet!
            </p>
            <p className="text-lg text-gray-500 mb-8">
              Weiter so! Du machst große Fortschritte! 🚀
            </p>
            <button
              onClick={resetSession}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Session wiederholen
            </button>
          </div>
        </div>
        
        <JohnnyCompanionSimple
          userId={userId}
          userRole="STUDENT"
          currentPage="flashcards"
          onInteraction={() => {
            console.log('Johnny freut sich über die Karteikarten!');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-800">
                Karteikarten lernen
              </h1>
              <span className="text-sm text-gray-500">
                Karte {currentCardIndex + 1} von {cards.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(currentCard.difficulty)}`}>
                {getDifficultyText(currentCard.difficulty)}
              </span>
              <span className="text-sm text-gray-500">
                Gelernt: {studiedCards} / {cards.length}
              </span>
            </div>
          </div>

          <div className="mb-8">
            <div className="bg-gray-50 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {showAnswer ? 'Antwort:' : 'Frage:'}
                </h2>
                <p className="text-lg text-gray-700">
                  {showAnswer ? currentCard.back : currentCard.front}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <div className="text-sm text-gray-500">
              Klicke auf "Antwort zeigen" um die Lösung zu sehen
            </div>
            {!showAnswer ? (
              <button
                onClick={handleShowAnswer}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Antwort zeigen
              </button>
            ) : (
              <button
                onClick={handleNextCard}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {currentCardIndex < cards.length - 1 ? 'Nächste Karte' : 'Session beenden'}
              </button>
            )}
          </div>
        </div>
      </div>

      <JohnnyCompanionSimple
        userId={userId}
        userRole="STUDENT"
        currentPage="flashcards"
        onInteraction={() => {
          console.log('Johnny motiviert beim Karteikarten lernen!');
        }}
      />
    </div>
  );
};

export default FlashcardStudyPage;
