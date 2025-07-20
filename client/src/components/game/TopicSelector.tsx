import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Code, 
  Database, 
  Globe, 
  Shield, 
  Layers, 
  Cpu, 
  Users,
  BookOpen,
  Trophy,
  Target
} from 'lucide-react';

interface Topic {
  id: number;
  name: string;
  description: string;
  category: string;
  color: string;
  icon: string;
  order: number;
}

interface TopicSelectorProps {
  onTopicSelect: (topicId: number, difficulty: string) => void;
  userProgress?: any[];
}

const iconMap = {
  code: Code,
  database: Database,
  web: Globe,
  group: Users,
  category: Layers,
  memory: Cpu,
  storage: Database
};

const difficultyConfig = {
  easy: {
    label: "Einfach",
    description: "Grundlagen & Einsteiger",
    color: "bg-green-500",
    points: "15-20 Punkte"
  },
  medium: {
    label: "Mittel", 
    description: "Fortgeschritten",
    color: "bg-yellow-500",
    points: "25-35 Punkte"
  },
  hard: {
    label: "Schwer",
    description: "Experte & Komplexe Probleme",
    color: "bg-red-500",
    points: "40-80 Punkte"
  }
};

export default function TopicSelector({ onTopicSelect, userProgress = [] }: TopicSelectorProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('easy');
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);

  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ['/api/topics'],
    queryFn: () => fetch('http://localhost:5000/api/topics').then(res => res.json()),
    retry: false,
  });

  const getProgressForTopic = (topicId: number, difficulty: string) => {
    return userProgress.find(p => p.topicId === topicId && p.difficulty === difficulty);
  };

  const getTopicIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || BookOpen;
    return <IconComponent className="w-5 h-5" />;
  };

  const handleTopicClick = (topic: Topic) => {
    setSelectedTopic(topic);
    setSelectedDifficulty('easy');
    setShowDifficultyDialog(true);
  };

  const handleStartGame = () => {
    if (selectedTopic) {
      onTopicSelect(selectedTopic.id, selectedDifficulty);
      setShowDifficultyDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Back Button - EXTREMELY prominent at top */}
      <div className="mb-8 bg-red-100 p-8 rounded-2xl border-4 border-red-300 shadow-2xl">
        <button
          onClick={() => {
            if (window.opener) {
              window.close();
            } else {
              window.location.href = 'http://localhost:3003';
            }
          }}
          className="px-10 py-5 text-xl font-black text-red-700 bg-white border-4 border-red-400 rounded-2xl hover:bg-red-50 hover:border-red-500 flex items-center gap-4 transition-all shadow-lg"
        >
          ← ZURÜCK ZUM SUS DASHBOARD
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Informatik GeoCaching</h1>
        <p className="text-gray-600">Wähle ein Thema und Schwierigkeitsgrad für dein Abenteuer</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {topics?.map((topic) => {
          const hasProgress = userProgress.some(p => p.topicId === topic.id);
          
          return (
            <div
              key={topic.id}
              className="border-2 border-gray-300 rounded-lg p-6 bg-white hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all duration-200"
              onClick={() => handleTopicClick(topic)}
            >
              <div className="flex items-center space-x-4">
                <div 
                  className="p-3 rounded-lg text-white"
                  style={{ backgroundColor: topic.color }}
                >
                  {getTopicIcon(topic.icon)}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {topic.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {topic.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {topic.category}
                  </Badge>
                </div>
                
                {hasProgress && (
                  <Trophy className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Difficulty Selection Dialog */}
      <Dialog open={showDifficultyDialog} onOpenChange={setShowDifficultyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schwierigkeitsgrad wählen</DialogTitle>
          </DialogHeader>
          
          {selectedTopic && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Ausgewähltes Thema: <span className="font-medium">{selectedTopic.name}</span>
                </p>
              </div>

              <div className="grid gap-3">
                {Object.entries(difficultyConfig).map(([key, config]) => {
                  const progress = getProgressForTopic(selectedTopic.id, key);
                  const isCompleted = progress?.isCompleted;
                  const currentScore = progress?.score || 0;
                  
                  return (
                    <div 
                      key={key}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedDifficulty === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDifficulty(key)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${config.color}`} />
                          <div>
                            <h4 className="font-semibold">{config.label}</h4>
                            <p className="text-sm text-gray-600">{config.description}</p>
                          </div>
                        </div>
                        {isCompleted && (
                          <Trophy className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{config.points}</span>
                        </div>
                        {progress && (
                          <div className="flex items-center space-x-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium">{currentScore} Punkte</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowDifficultyDialog(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button 
                  onClick={handleStartGame}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Spiel starten
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}