import React from 'react';
import { Box } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { assignedFolderSortableId } from '../lib/folderAssignmentOrder';

interface AssignedFolderSortableShellProps {
  groupId: string;
  folderPath: string;
  children: (dragHandleProps: {
    attributes: ReturnType<typeof useSortable>['attributes'];
    listeners: ReturnType<typeof useSortable>['listeners'];
  }) => React.ReactNode;
}

const AssignedFolderSortableShell: React.FC<AssignedFolderSortableShellProps> = ({
  groupId,
  folderPath,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignedFolderSortableId(groupId, folderPath) });

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
      {children({ attributes, listeners })}
    </Box>
  );
};

export default AssignedFolderSortableShell;
