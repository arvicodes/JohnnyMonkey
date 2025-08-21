import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Target,
  Award
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

interface ProgressTrackerProps {
  deck: FlashcardDeck;
  progress: FlashcardProgress[];
  onStartReview?: () => void;
  onStartPractice?: () => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  deck,
  progress,
  onStartReview,
  onStartPractice
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');

  // Statistiken berechnen
  const stats = React.useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let filteredProgress = progress;
    if (selectedTimeframe === 'week') {
      filteredProgress = progress.filter(p => 
        p.lastReviewed && new Date(p.lastReviewed) >= weekAgo
      );
    } else if (selectedTimeframe === 'month') {
      filteredProgress = progress.filter(p => 
        p.lastReviewed && new Date(p.lastReviewed) >= monthAgo
      );
    }

    const totalCards = progress.length;
    const reviewedCards = progress.filter(p => p.reviewCount > 0).length;
    const dueCards = progress.filter(p => new Date(p.nextReview) <= now).length;
    const masteredCards = progress.filter(p => p.level >= 4).length;
    const strugglingCards = progress.filter(p => p.level <= 1).length;

    const totalReviews = filteredProgress.reduce((sum, p) => sum + p.reviewCount, 0);
    const correctReviews = filteredProgress.reduce((sum, p) => {
      // Schätzung: Level 4-5 = korrekte Antworten
      return sum + (p.level >= 4 ? p.reviewCount : 0);
    }, 0);

    const accuracy = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0;
    const completionRate = totalCards > 0 ? (reviewedCards / totalCards) * 100 : 0;
    const masteryRate = totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;

    return {
      totalCards,
      reviewedCards,
      dueCards,
      masteredCards,
      strugglingCards,
      totalReviews,
      correctReviews,
      accuracy: Math.round(accuracy),
      completionRate: Math.round(completionRate),
      masteryRate: Math.round(masteryRate)
    };
  }, [progress, selectedTimeframe]);

  // Level-Verteilung
  const levelDistribution = React.useMemo(() => {
    const distribution = [0, 0, 0, 0, 0, 0]; // Level 0-5
    progress.forEach(p => {
      if (p.level >= 0 && p.level <= 5) {
        distribution[p.level]++;
      }
    });
    return distribution;
  }, [progress]);

  // Fällige Karten nach Priorität sortieren
  const dueCards = React.useMemo(() => {
    const now = new Date();
    return progress
      .filter(p => new Date(p.nextReview) <= now)
      .sort((a, b) => {
        // Höhere Priorität für niedrigere Level und längere Überfälligkeit
        const aPriority = a.level + (now.getTime() - new Date(a.nextReview).getTime()) / (1000 * 60 * 60 * 24);
        const bPriority = b.level + (now.getTime() - new Date(b.nextReview).getTime()) / (1000 * 60 * 60 * 24);
        return aPriority - bPriority;
      })
      .slice(0, 5); // Top 5 fällige Karten
  }, [progress]);

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

  const getTimeframeLabel = (timeframe: 'week' | 'month' | 'all') => {
    switch (timeframe) {
      case 'week': return 'Letzte 7 Tage';
      case 'month': return 'Letzte 30 Tage';
      case 'all': return 'Gesamt';
      default: return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gesamt</p>
                <p className="text-2xl font-bold">{stats.totalCards}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fällig</p>
                <p className="text-2xl font-bold text-orange-600">{stats.dueCards}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meistert</p>
                <p className="text-2xl font-bold text-green-600">{stats.masteredCards}</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Genauigkeit</p>
                <p className="text-2xl font-bold text-purple-600">{stats.accuracy}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aktions-Buttons */}
      <div className="flex flex-wrap gap-4">
        {stats.dueCards > 0 && (
          <Button onClick={onStartReview} size="lg" className="bg-orange-600 hover:bg-orange-700">
            <Clock className="w-4 h-4 mr-2" />
            Review starten ({stats.dueCards} fällig)
          </Button>
        )}
        
        <Button onClick={onStartPractice} variant="outline" size="lg">
          <Target className="w-4 h-4 mr-2" />
          Übungsmodus starten
        </Button>
      </div>

      {/* Fortschrittsbalken */}
      <Card>
        <CardHeader>
          <CardTitle>Fortschritt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Vervollständigung</span>
              <span>{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Meisterschaft</span>
              <span>{stats.masteryRate}%</span>
            </div>
            <Progress value={stats.masteryRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Level-Verteilung */}
      <Card>
        <CardHeader>
          <CardTitle>Level-Verteilung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {levelDistribution.map((count, level) => (
              <div key={level} className="text-center">
                <div className={`p-2 rounded-lg ${getLevelColor(level)}`}>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs">{getLevelText(level)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fällige Karten */}
      {dueCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Fällige Karten ({dueCards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dueCards.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getLevelColor(item.level)}>
                        {getLevelText(item.level)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {item.reviewCount} Reviews
                      </span>
                    </div>
                    <p className="font-medium">{item.card.front}</p>
                    <p className="text-sm text-gray-600">{item.card.back}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>Fällig seit</div>
                    <div>
                      {Math.ceil((new Date().getTime() - new Date(item.nextReview).getTime()) / (1000 * 60 * 60 * 24))} Tagen
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zeitraum-Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {(['week', 'month', 'all'] as const).map((timeframe) => (
              <Button
                key={timeframe}
                variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeframe(timeframe)}
              >
                {getTimeframeLabel(timeframe)}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Aktivität</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reviews</span>
                  <span className="font-medium">{stats.totalReviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Korrekte Antworten</span>
                  <span className="font-medium text-green-600">{stats.correctReviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Genauigkeit</span>
                  <span className="font-medium">{stats.accuracy}%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Überprüft</span>
                  <span className="font-medium">{stats.reviewedCards}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Schwierig</span>
                  <span className="font-medium text-red-600">{stats.strugglingCards}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Meistert</span>
                  <span className="font-medium text-green-600">{stats.masteredCards}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
