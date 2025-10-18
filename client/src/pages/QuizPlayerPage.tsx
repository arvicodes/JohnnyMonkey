import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import JohnnyCompanionSimple from '../components/JohnnyCompanionSimple';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

const QuizPlayerPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: '1',
      question: 'Was ist die Hauptstadt von Deutschland?',
      options: ['München', 'Berlin', 'Hamburg', 'Köln'],
      correctAnswer: 1,
      explanation: 'Berlin ist seit 1990 die Hauptstadt von Deutschland.'
    },
    {
      id: '2',
      question: 'Welcher Planet ist der Sonne am nächsten?',
      options: ['Venus', 'Merkur', 'Erde', 'Mars'],
      correctAnswer: 1,
      explanation: 'Merkur ist der sonnennächste Planet in unserem Sonnensystem.'
    },
    {
      id: '3',
      question: 'Was ist 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: '2 + 2 = 4'
    }
  ]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [userId] = useState('quiz-user-123');

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setShowResult(true);
    
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizCompleted(true);
      // Update learning progress
      const currentProgress = JSON.parse(localStorage.getItem(`learningProgress_${userId}`) || '{}');
      const newProgress = {
        totalQuizzesCompleted: (currentProgress.totalQuizzesCompleted || 0) + 1,
        totalFlashcardsStudied: currentProgress.totalFlashcardsStudied || 0,
        totalPointsEarned: (currentProgress.totalPointsEarned || 0) + Math.round((score + 1) * 10),
        currentStreak: (currentProgress.currentStreak || 0) + 1,
        lastActivity: new Date()
      };
      localStorage.setItem(`learningProgress_${userId}`, JSON.stringify(newProgress));
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizCompleted(false);
  };

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              🎉 Quiz abgeschlossen!
            </h1>
            <div className="text-6xl mb-4">
              {score === questions.length ? '🏆' : score >= questions.length * 0.7 ? '🎊' : '👍'}
            </div>
            <p className="text-xl text-gray-600 mb-4">
              Du hast {score} von {questions.length} Fragen richtig beantwortet!
            </p>
            <p className="text-lg text-gray-500 mb-8">
              Das entspricht {Math.round((score / questions.length) * 100)}%
            </p>
            <button
              onClick={resetQuiz}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Quiz wiederholen
            </button>
          </div>
        </div>
        
        <JohnnyCompanionSimple
          userId={userId}
          userRole="STUDENT"
          currentPage="quiz"
          onInteraction={() => {
            console.log('Johnny freut sich über das Quiz!');
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
                Quiz: {quizId || 'Demo Quiz'}
              </h1>
              <span className="text-sm text-gray-500">
                Frage {currentQuestionIndex + 1} von {questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {currentQuestion.question}
            </h2>
            
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                    selectedAnswer === index
                      ? showResult
                        ? index === currentQuestion.correctAnswer
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-red-500 bg-red-50 text-red-800'
                        : 'border-blue-500 bg-blue-50 text-blue-800'
                      : showResult && index === currentQuestion.correctAnswer
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>
          </div>

          {showResult && currentQuestion.explanation && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Erklärung:</h3>
              <p className="text-blue-700">{currentQuestion.explanation}</p>
            </div>
          )}

          <div className="flex justify-between">
            <div className="text-sm text-gray-500">
              Aktueller Score: {score} / {currentQuestionIndex + 1}
            </div>
            {!showResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Antwort abgeben
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Nächste Frage' : 'Quiz beenden'}
              </button>
            )}
          </div>
        </div>
      </div>

      <JohnnyCompanionSimple
        userId={userId}
        userRole="STUDENT"
        currentPage="quiz"
        onInteraction={() => {
          console.log('Johnny motiviert beim Quiz!');
        }}
      />
    </div>
  );
};

export default QuizPlayerPage; 