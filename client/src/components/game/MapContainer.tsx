import { useState, useRef, useEffect } from "react";

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

interface MapContainerProps {
  userPosition: { lat: number; lng: number };
  visiblePoints: PointOfInterest[];
  currentTarget: PointOfInterest | null;
  onPointClick: (point: PointOfInterest) => void;
  distanceToTarget: number | null;
}

export default function MapContainer({
  userPosition,
  visiblePoints,
  currentTarget,
  onPointClick,
  distanceToTarget,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  return (
    <div className="relative h-[calc(100vh-140px)] overflow-hidden">
      {/* Simple Map Representation */}
      <div 
        ref={mapRef}
        className="w-full h-full bg-gray-100 relative"
      >
        {/* User Position */}
        <div 
          className="absolute w-12 h-12 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center pulse-animation"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <span className="text-white text-lg">👤</span>
        </div>

        {/* Points of Interest */}
        {visiblePoints.map((point, index) => {
          const isCurrent = currentTarget?.id === point.id;
          const isCompleted = !isCurrent;
          
          return (
            <div
              key={point.id}
              className={`absolute w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center cursor-pointer transition-all ${
                isCurrent 
                  ? 'bg-yellow-500 pulse-animation' 
                  : isCompleted 
                    ? 'bg-green-500' 
                    : 'bg-gray-400'
              }`}
              style={{
                left: `${50 + (index - 1) * 15}%`,
                top: `${40 + (index % 2) * 15}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => onPointClick(point)}
            >
              <span className="text-white text-sm">
                {isCurrent ? '❓' : isCompleted ? '✅' : '📍'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button 
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-700">+</span>
        </button>
        <button 
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-700">−</span>
        </button>
        <button 
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-700">📍</span>
        </button>
      </div>

      {/* Distance Indicator */}
      {distanceToTarget !== null && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">📍</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatDistance(distanceToTarget)}
              </p>
              <p className="text-xs text-gray-600">zum Ziel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
