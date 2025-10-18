import { useState, useEffect, useCallback } from 'react';

interface LearningProgress {
  totalQuizzesCompleted: number;
  totalFlashcardsStudied: number;
  totalPointsEarned: number;
  currentStreak: number;
  lastActivity: Date | null;
}

interface UseLearningProgressReturn {
  progress: LearningProgress;
  updateQuizProgress: (quizId: string, score: number) => void;
  updateFlashcardProgress: (deckId: string, cardsStudied: number) => void;
  updatePoints: (points: number) => void;
  resetProgress: () => void;
  getProgressPercentage: () => number;
}

export const useLearningProgress = (userId: string): UseLearningProgressReturn => {
  const [progress, setProgress] = useState<LearningProgress>({
    totalQuizzesCompleted: 0,
    totalFlashcardsStudied: 0,
    totalPointsEarned: 0,
    currentStreak: 0,
    lastActivity: null
  });

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(`learningProgress_${userId}`);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress({
          ...parsed,
          lastActivity: parsed.lastActivity ? new Date(parsed.lastActivity) : null
        });
      } catch (error) {
        console.error('Error loading learning progress:', error);
      }
    }
  }, [userId]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`learningProgress_${userId}`, JSON.stringify(progress));
  }, [progress, userId]);

  // Update quiz progress
  const updateQuizProgress = useCallback((quizId: string, score: number) => {
    setProgress(prev => ({
      ...prev,
      totalQuizzesCompleted: prev.totalQuizzesCompleted + 1,
      totalPointsEarned: prev.totalPointsEarned + Math.round(score * 10), // Convert score to points
      lastActivity: new Date(),
      currentStreak: prev.currentStreak + 1
    }));
  }, []);

  // Update flashcard progress
  const updateFlashcardProgress = useCallback((deckId: string, cardsStudied: number) => {
    setProgress(prev => ({
      ...prev,
      totalFlashcardsStudied: prev.totalFlashcardsStudied + cardsStudied,
      totalPointsEarned: prev.totalPointsEarned + cardsStudied * 2, // 2 points per card
      lastActivity: new Date(),
      currentStreak: prev.currentStreak + 1
    }));
  }, []);

  // Update points directly
  const updatePoints = useCallback((points: number) => {
    setProgress(prev => ({
      ...prev,
      totalPointsEarned: prev.totalPointsEarned + points,
      lastActivity: new Date()
    }));
  }, []);

  // Reset progress
  const resetProgress = useCallback(() => {
    setProgress({
      totalQuizzesCompleted: 0,
      totalFlashcardsStudied: 0,
      totalPointsEarned: 0,
      currentStreak: 0,
      lastActivity: null
    });
  }, []);

  // Calculate overall progress percentage
  const getProgressPercentage = useCallback(() => {
    const totalActivities = progress.totalQuizzesCompleted + Math.floor(progress.totalFlashcardsStudied / 10);
    const maxActivities = 100; // Target: 100 activities for 100%
    return Math.min((totalActivities / maxActivities) * 100, 100);
  }, [progress]);

  return {
    progress,
    updateQuizProgress,
    updateFlashcardProgress,
    updatePoints,
    resetProgress,
    getProgressPercentage
  };
};
