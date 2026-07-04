import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LearningGroupSortableShellProps {
  groupId: string;
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}

const LearningGroupSortableShell: React.FC<LearningGroupSortableShellProps> = ({
  groupId,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: groupId });

  const dragHandle = (
    <Tooltip title="Reihenfolge ändern (ziehen)">
      <IconButton
        size="small"
        aria-label="Reihenfolge ändern"
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: 24,
          height: 24,
          p: 0,
          cursor: 'grab',
          color: 'inherit',
          opacity: 0.65,
          '&:active': { cursor: 'grabbing' },
          '&:hover': { opacity: 1 },
        }}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Tooltip>
  );

  return (
    <Box
      ref={setNodeRef}
      sx={{
        mb: 1.4,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : 'auto',
      }}
    >
      {children(dragHandle)}
    </Box>
  );
};

export default LearningGroupSortableShell;
