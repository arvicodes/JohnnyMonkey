import React from 'react';
import { Box, Typography } from '@mui/material';
import { Archive as ArchiveIcon } from '@mui/icons-material';
import { useDroppable } from '@dnd-kit/core';

interface LearningGroupArchiveSectionProps {
  isEmpty: boolean;
  children: React.ReactNode;
}

const LearningGroupArchiveSection: React.FC<LearningGroupArchiveSectionProps> = ({
  isEmpty,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'archive-drop-zone' });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        mt: 2.5,
        pt: 1.5,
        borderTop: '1px solid #e0e0e0',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <ArchiveIcon sx={{ fontSize: 18, color: '#757575' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#616161', fontSize: '0.8rem' }}>
          Archiv
        </Typography>
      </Box>
      <Box
        sx={{
          minHeight: isEmpty ? 72 : 0,
          p: isEmpty ? 1.5 : 0,
          borderRadius: 1.5,
          border: '2px dashed',
          borderColor: isOver ? '#1976d2' : '#e0e0e0',
          bgcolor: isOver ? 'rgba(25, 118, 210, 0.06)' : isEmpty ? '#fafafa' : 'transparent',
          transition: 'all 0.15s ease',
        }}
      >
        {isEmpty && !isOver && (
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', color: '#bdbdbd', fontSize: '0.65rem' }}
          >
            Noch keine archivierten Lerngruppen
          </Typography>
        )}
        {isEmpty && isOver && (
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', color: '#1976d2', fontSize: '0.65rem', fontWeight: 600 }}
          >
            Loslassen zum Archivieren
          </Typography>
        )}
        {children}
      </Box>
    </Box>
  );
};

export default LearningGroupArchiveSection;
