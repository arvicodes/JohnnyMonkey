export interface PointOfInterest {
  id: number;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  puzzleType: string;
  puzzleData: {
    question: string;
    answer: string;
    hint1?: string;
    hint2?: string;
    points: number;
    explanation?: string;
    retryQuestion?: string;
    retryAnswer?: string;
  };
  topicId: number;
  difficulty: string;
}

export interface GameState {
  selectedTopicId: number | null;
  selectedDifficulty: string;
  currentPointIndex: number;
  score: number;
  completedPoints: string[];
  isCompleted: boolean;
}

export interface Topic {
  id: number;
  name: string;
  description: string;
  difficulties: string[];
}

export interface TopicProgress {
  topicId: number;
  difficulty: string;
  currentPointIndex: number;
  score: number;
  completedPoints: string[];
  isCompleted: boolean;
}

export interface PuzzleAnswerRequest {
  pointId: number;
  answer: string;
  hintsUsed?: number;
  gaveUp?: boolean;
}

export interface UserPosition {
  lat: number;
  lng: number;
} 