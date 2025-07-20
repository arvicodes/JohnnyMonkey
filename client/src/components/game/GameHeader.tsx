import { ArrowLeft, Star } from "lucide-react";

interface GameState {
  selectedTopicId: number | null;
  selectedDifficulty: string;
  currentPointIndex: number;
  score: number;
  completedPoints: string[];
  isCompleted: boolean;
}

interface GameHeaderProps {
  gameState: GameState | undefined;
  totalPoints: number;
  routeProgress?: { currentPointIndex: number; score: number; completedPoints: string[]; isCompleted: boolean };
  allPointsCount: number;
  onBackToTopics?: () => void;
  onBackToDashboard?: () => void;
}

export default function GameHeader({ gameState, totalPoints, routeProgress, allPointsCount, onBackToTopics, onBackToDashboard }: GameHeaderProps) {
  const progress = routeProgress ? (routeProgress.completedPoints.length / allPointsCount) * 100 : 0;

  return (
    <header className="bg-blue-600 text-white shadow-lg relative z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {onBackToTopics && (
            <button 
              onClick={onBackToTopics}
              className="p-1 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
              title="Zurück zu Themen"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                window.location.href = 'http://localhost:3003';
              }
            }}
            className="p-1 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors"
            title="Zurück zum Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-lg">🏫</span>
            </div>
            <div>
              <h1 className="text-lg font-medium">Informatik GeoCaching</h1>
              <p className="text-sm opacity-90">
                Thema {gameState?.selectedTopicId} - {gameState?.selectedDifficulty?.toUpperCase() || 'EASY'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-white bg-opacity-20 rounded-full px-3 py-1 flex items-center space-x-1">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">{routeProgress?.score || 0}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Fortschritt</span>
          <span>
            {routeProgress?.completedPoints.length || 0} / {allPointsCount}
          </span>
        </div>
        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  );
}
