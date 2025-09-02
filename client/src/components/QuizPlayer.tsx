import React from 'react';

interface QuizPlayerProps {
  quiz: any;
  onClose: () => void;
}

export default function QuizPlayer({ quiz, onClose }: QuizPlayerProps) {
  return (
    <div>
      <h1>Quiz Player</h1>
      <p>Quiz Player wird geladen...</p>
      <p>Quiz: {quiz?.title || 'Unbekannt'}</p>
      <button onClick={onClose}>Schließen</button>
    </div>
  );
}
