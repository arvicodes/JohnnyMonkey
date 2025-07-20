import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import MapContainer from "../components/game/MapContainer";
import PuzzleModal from "../components/game/PuzzleModal";
import GameHeader from "../components/game/GameHeader";
import BottomNavigation from "../components/game/BottomNavigation";
import TopicSelector from "../components/game/TopicSelector";
import { Notification } from "../components/ui/notification";
import { calculateDistance } from "../lib/gameUtils";
import { useNavigate } from "react-router-dom";

// Define types locally since we don't have access to the shared schema
interface GameState {
  selectedTopicId: number | null;
  selectedDifficulty: string;
  currentPointIndex: number;
  score: number;
  completedPoints: string[];
  isCompleted: boolean;
}

interface PointOfInterest {
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

interface TopicProgress {
  topicId: number;
  difficulty: string;
  currentPointIndex: number;
  score: number;
  completedPoints: string[];
  isCompleted: boolean;
}

interface PuzzleAnswerRequest {
  pointId: number;
  answer: string;
  hintsUsed?: number;
  gaveUp?: boolean;
}

export default function GeoCodingQuest() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("map");
  const [selectedPoint, setSelectedPoint] = useState<PointOfInterest | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("easy");
  const [gameStarted, setGameStarted] = useState(false);
  const [userPosition, setUserPosition] = useState<{lat: number, lng: number}>({
    lat: 50.3101, 
    lng: 7.5953
  });

  const userId = 1; // Fixed for demo

  // Fetch user's topic progress from the real API
  const { data: userProgress = [] } = useQuery<TopicProgress[]>({
    queryKey: ["/api/users", userId, "progress"],
    queryFn: () => fetch(`http://localhost:5000/api/users/${userId}/progress`).then(res => res.json()),
    retry: false,
  });

  // Fetch game state for current topic/difficulty
  const { data: gameState, isLoading: gameLoading } = useQuery<GameState>({
    queryKey: ["/api/game/state", userId, selectedTopic, selectedDifficulty],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTopic) params.append('topicId', selectedTopic.toString());
      params.append('difficulty', selectedDifficulty);
      
      const response = await fetch(`http://localhost:5000/api/game/state/${userId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch game state');
      return response.json();
    },
    enabled: gameStarted && !!selectedTopic,
  });

  // Fetch points by topic and difficulty
  const { data: allPoints = [], isLoading: pointsLoading } = useQuery<PointOfInterest[]>({
    queryKey: ["/api/game/points", selectedTopic, selectedDifficulty],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedTopic) params.append('topicId', selectedTopic.toString());
      params.append('difficulty', selectedDifficulty);
      
      return fetch(`http://localhost:5000/api/game/points?${params}`).then(res => res.json());
    },
    enabled: gameStarted && !!selectedTopic,
  });

  // Submit puzzle answer mutation
  const answerMutation = useMutation({
    mutationFn: async (answerData: PuzzleAnswerRequest) => {
      const response = await fetch('http://localhost:5000/api/game/puzzle/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...answerData,
          userId: userId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.correct) {
        setSuccessMessage(`Rätsel gelöst! +${data.points} Punkte`);
        setShowSuccess(true);
        setSelectedPoint(null);
        
        // Refetch user progress to update the UI
        queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "progress"] });
        
        setTimeout(() => setShowSuccess(false), 3000);
      }
    },
  });

  // Update player position mutation
  const updatePositionMutation = useMutation({
    mutationFn: async (position: {lat: number, lng: number}) => {
      const response = await fetch(`http://localhost:5000/api/game/position/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(position),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update position');
      }
      
      return response.json();
    },
  });

  // Handle geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserPosition(newPosition);
          
          if (gameStarted) {
            updatePositionMutation.mutate(newPosition);
          }
        },
        (error) => {
          console.log("Geolocation not available, using default position");
        }
      );
    }
  }, [gameStarted]);

  const handleTopicSelect = (topicId: number, difficulty: string) => {
    setSelectedTopic(topicId);
    setSelectedDifficulty(difficulty);
    setGameStarted(true);
  };

  const handleOpenPuzzle = (point: PointOfInterest) => {
    setSelectedPoint(point);
  };

  const handleClosePuzzle = () => {
    setSelectedPoint(null);
  };

  const handleSubmitAnswer = (pointId: number, answer: string, hintsUsed?: number, gaveUp?: boolean) => {
    answerMutation.mutate({
      pointId,
      answer,
      hintsUsed,
      gaveUp,
    });
  };

  const handleBackToTopics = () => {
    setGameStarted(false);
    setSelectedTopic(null);
    setSelectedDifficulty("easy");
    setCurrentTab("map");
  };

  const handleBackToDashboard = () => {
    // If opened from SUS dashboard (has opener), close the tab
    if (window.opener) {
      window.close();
    } 
    // If opened directly, go back in history
    else if (window.history.length > 1) {
      window.history.back();
    } 
    // Fallback: redirect to SUS dashboard
    else {
      window.location.href = 'http://localhost:3003';
    }
  };

  // Get current topic progress
  const currentTopicProgress = userProgress.find(
    p => p.topicId === selectedTopic && p.difficulty === selectedDifficulty
  );

  // Filter visible points based on current progress
  const visiblePoints = allPoints.filter((point, index) => {
    if (!currentTopicProgress) return index === 0; // Show only first point if no progress
    // Show all points up to and including the current target
    return index <= currentTopicProgress.currentPointIndex;
  });

  // Get current target point - use the currentPointIndex from progress
  const currentTarget = (() => {
    if (!currentTopicProgress || !allPoints.length) return allPoints[0];
    
    // The current target is the point at currentPointIndex
    return allPoints[currentTopicProgress.currentPointIndex] || null;
  })();

  // Calculate distance to target
  const distanceToTarget = currentTarget 
    ? calculateDistance(
        userPosition.lat,
        userPosition.lng,
        parseFloat(currentTarget.latitude),
        parseFloat(currentTarget.longitude)
      )
    : null;

  // Get total points for current topic/difficulty
  const totalPoints = currentTopicProgress?.score || 0;

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-xl font-semibold text-gray-900">GeoCodingQuest</h1>
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                ← Zurück
              </button>
            </div>
          </div>
        </div>
        <TopicSelector onTopicSelect={handleTopicSelect} userProgress={userProgress} />
      </div>
    );
  }

  if (gameLoading || pointsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button - Always visible */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-gray-900">GeoCodingQuest</h1>
            <button
              onClick={handleBackToDashboard}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              ← Zurück
            </button>
          </div>
        </div>
      </div>

      <GameHeader
        gameState={gameState}
        totalPoints={totalPoints}
        routeProgress={currentTopicProgress}
        allPointsCount={allPoints.length}
        onBackToTopics={handleBackToTopics}
        onBackToDashboard={handleBackToDashboard}
      />

      <div className="flex-1 relative">
        {currentTab === "map" && (
          <MapContainer
            userPosition={userPosition}
            visiblePoints={visiblePoints}
            currentTarget={currentTarget}
            onPointClick={handleOpenPuzzle}
            distanceToTarget={distanceToTarget}
          />
        )}
        
        {currentTab === "progress" && (
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Fortschritt</h2>
            <div className="space-y-4">
              {userProgress.map((progress) => (
                <div key={`${progress.topicId}-${progress.difficulty}`} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      Thema {progress.topicId} - {progress.difficulty}
                    </span>
                    <span className="text-sm text-gray-600">
                      {progress.score} Punkte
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(progress.currentPointIndex / allPoints.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === "collection" && (
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Sammlung</h2>
            <div className="grid grid-cols-1 gap-4">
              {visiblePoints.map((point) => (
                <div key={point.id} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-bold">{point.name}</h3>
                  <p className="text-sm text-gray-600">{point.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Typ: {point.puzzleType}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === "profile" && (
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Profil</h2>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold mb-2">Gesamtstatistik</h3>
                <p>Gesamtpunkte: {userProgress.reduce((sum, p) => sum + p.score, 0)}</p>
                <p>Abgeschlossene Routen: {userProgress.filter(p => p.isCompleted).length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation currentTab={currentTab} onTabChange={setCurrentTab} />

      {selectedPoint && (
        <PuzzleModal
          point={selectedPoint}
          onClose={handleClosePuzzle}
          onSubmit={handleSubmitAnswer}
        />
      )}

      {showSuccess && (
        <Notification
          message={successMessage}
          type="success"
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
}