import React from 'react';

interface PointOfInterest {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  type: 'castle' | 'museum' | 'landmark' | 'nature';
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
}

interface MapContainerProps {
  currentPosition: { lat: number; lng: number };
  targetPosition: { lat: number; lng: number };
  distanceToTarget: number;
}

export default function MapContainer({
  currentPosition,
  targetPosition,
  distanceToTarget,
}: MapContainerProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  return (
    <div 
      ref={mapRef}
      className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Karte</h3>
        <p className="text-sm text-gray-600 mb-2">
          Aktuelle Position: {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
        </p>
        <p className="text-sm text-gray-600 mb-2">
          Ziel: {targetPosition.lat.toFixed(4)}, {targetPosition.lng.toFixed(4)}
        </p>
        <p className="text-lg font-bold text-blue-600">
          Entfernung zum Ziel: {formatDistance(distanceToTarget)}
        </p>
      </div>
    </div>
  );
}
