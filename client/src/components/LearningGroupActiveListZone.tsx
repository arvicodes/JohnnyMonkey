import React from 'react';
import { Box } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';

interface LearningGroupActiveListZoneProps {
  children: React.ReactNode;
}

const LearningGroupActiveListZone: React.FC<LearningGroupActiveListZoneProps> = ({ children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'active-list-zone' });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        borderRadius: 1,
        outline: isOver ? '2px dashed #1976d2' : 'none',
        outlineOffset: 2,
        bgcolor: isOver ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
        transition: 'background-color 0.15s ease',
      }}
    >
      {children}
    </Box>
  );
};

export default LearningGroupActiveListZone;
