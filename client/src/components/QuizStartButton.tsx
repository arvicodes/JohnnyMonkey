import React from 'react';

interface QuizStartButtonProps {
  quizFile: any;
  userId: string;
}

export default function QuizStartButton({ quizFile, userId }: QuizStartButtonProps) {
  return (
    <div>
      <h1>Quiz Start Button</h1>
      <p>Quiz Start Button wird geladen...</p>
      <p>Quiz File: {quizFile?.name || 'Unbekannt'}</p>
      <p>User ID: {userId}</p>
    </div>
  );
}
