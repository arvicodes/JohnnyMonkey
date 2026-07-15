import React from 'react';
import { Box } from '@mui/material';
import QuizStartButton from './QuizStartButton';

export default function StudentQuizFileItem({ item, userId }: { item: any; userId: string }) {
  return (
    <Box sx={{ mb: 0.7 }}>
      <QuizStartButton quizFile={item} userId={userId} />
    </Box>
  );
}
