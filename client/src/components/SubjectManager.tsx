import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Snackbar, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Storage as StorageIcon, DragIndicator as DragIcon, GroupAdd as GroupAddIcon, Group as GroupIcon, Close as CloseIcon, Description as DescriptionIcon } from '@mui/icons-material';
import { Menu, MenuItem, Chip, Tooltip } from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LessonContentDialog from './LessonContentDialog';

interface Subject {
  id: string;
  name: string;
  description?: string;
  order?: number;
}

interface Unit {
  id: string;
  name: string;
  description?: string;
  blockId: string;
  order?: number;
}

interface Block {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
  order?: number;
}

interface Lesson {
  id: string;
  name: string;
  description?: string;
  topicId: string;
  order?: number;
}

interface Topic {
  id: string;
  name: string;
  description?: string;
  unitId: string;
  order?: number;
}

interface SubjectManagerProps {
  teacherId: string;
  subjectAssignments?: { [subjectId: string]: string[] };
  setSubjectAssignments?: React.Dispatch<React.SetStateAction<{ [subjectId: string]: string[] }>>;
  blockAssignments?: { [blockId: string]: string[] };
  setBlockAssignments?: React.Dispatch<React.SetStateAction<{ [blockId: string]: string[] }>>;
  unitAssignments?: { [unitId: string]: string[] };
  setUnitAssignments?: React.Dispatch<React.SetStateAction<{ [unitId: string]: string[] }>>;
  topicAssignments?: { [topicId: string]: string[] };
  setTopicAssignments?: React.Dispatch<React.SetStateAction<{ [topicId: string]: string[] }>>;
  lessonAssignments?: { [lessonId: string]: string[] };
  setLessonAssignments?: React.Dispatch<React.SetStateAction<{ [lessonId: string]: string[] }>>;
  setSubjects?: React.Dispatch<React.SetStateAction<any[]>>;
  setBlocks?: React.Dispatch<React.SetStateAction<any[]>>;
  setUnits?: React.Dispatch<React.SetStateAction<any[]>>;
  setTopics?: React.Dispatch<React.SetStateAction<any[]>>;
  setLessons?: React.Dispatch<React.SetStateAction<any[]>>;
  // Optional: Zeige nur dieses Fach (für Tabs-Ansicht)
  visibleSubjectId?: string;
  // Optional: Zeige nur diesen Block (für Untertabs-Ansicht)
  visibleBlockId?: string;
}

// Hilfsfunktion für Chips
const GroupChips = ({ groupIds, groups, onRemove }: { groupIds: string[], groups: {id: string, name: string}[], onRemove: (id: string) => void }) => (
  <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
    {groupIds.map(gid => {
      const group = groups.find(g => g.id === gid);
      if (!group) return null;
      return (
        <Chip
          key={gid}
          label={group.name}
          size="small"
          icon={<GroupIcon fontSize="small" />}
          onDelete={() => onRemove(gid)}
          sx={{ bgcolor: '#e3f0fc', color: '#0066cc', fontWeight: 500 }}
        />
      );
    })}
  </Box>
);

// Extrahiere fetchAssignments als Hilfsfunktion
export const fetchAssignments = async (
  groups: {id: string, name: string}[],
  subjectSetter: (v: any) => void,
  blockSetter: (v: any) => void,
  unitSetter: (v: any) => void,
  topicSetter: (v: any) => void,
  lessonSetter: (v: any) => void
) => {
  const subj: { [id: string]: string[] } = {};
  const block: { [id: string]: string[] } = {};
  const unit: { [id: string]: string[] } = {};
  const topic: { [id: string]: string[] } = {};
  const lesson: { [id: string]: string[] } = {};
  for (const group of groups) {
    const res = await fetch(`/api/learning-groups/${group.id}/assignments`);
    if (!res.ok) continue;
    const assignments = await res.json();
    for (const a of assignments) {
      if (a.type === 'subject') {
        subj[a.refId] = [...(subj[a.refId] || []), group.id];
      } else if (a.type === 'block') {
        block[a.refId] = [...(block[a.refId] || []), group.id];
      } else if (a.type === 'unit') {
        unit[a.refId] = [...(unit[a.refId] || []), group.id];
      } else if (a.type === 'topic') {
        topic[a.refId] = [...(topic[a.refId] || []), group.id];
      } else if (a.type === 'lesson') {
        lesson[a.refId] = [...(lesson[a.refId] || []), group.id];
      }
    }
  }
  subjectSetter(subj);
  blockSetter(block);
  unitSetter(unit);
  topicSetter(topic);
  lessonSetter(lesson);
};

// Sortable Components
const SortableSubject = ({ subject, onEdit, onDelete, onAddBlock, isCollapsed, onToggleCollapse, groups, assignments, setAssignments, setSubjectAssignments, setBlockAssignments, setUnitAssignments, setTopicAssignments, setLessonAssignments }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAddGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [subject.id]: [...(prev[subject.id] || []), groupId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    handleMenuClose();
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'subject', refId: subject.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };
  const handleRemoveGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [subject.id]: (prev[subject.id] || []).filter((id: string) => id !== groupId)
    }));
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'subject', refId: subject.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 0.5,
        borderRadius: 2,
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.035)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 30,
        px: 1.0,
        py: 0.5,
        borderLeft: '3px solid #1976D2',
        fontWeight: 600,
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          transform: 'translateY(-1px)',
          '& .plus-btn': { display: 'inline-flex' }
        }
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{
          color: '#0066cc',
          borderRadius: 1,
          width: 20,
          height: 20,
          p: 0.2,
          mr: 1,
          cursor: 'grab',
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
      >
        <DragIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{
          color: '#0066cc',
          borderRadius: 1,
          width: 20,
          height: 20,
          p: 0.2,
          mr: 1,
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
        onClick={onToggleCollapse}
      >
        {isCollapsed ? '▶️' : '🔽'}
      </IconButton>
      <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, color: '#0066cc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>{subject.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, ml: 1, mr: 4, position: 'relative' }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 22, height: 22, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(subject)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 22, height: 22, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(subject.id)}>🗑️</IconButton>
        <IconButton
          size="small"
          sx={{
            color: '#b0b8c1',
            borderRadius: 1,
            width: 18,
            height: 18,
            p: 0.15,
            ml: 0.4,
            // Entferne position: 'absolute', right: 36
            '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
          }}
          onClick={handleMenuOpen}
        >
          <Tooltip title="Zu Lerngruppe hinzufügen"><GroupAddIcon fontSize="small" /></Tooltip>
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          {groups.map((g: any) => (
            <MenuItem key={g.id} onClick={() => handleAddGroup(g.id)} disabled={(assignments[subject.id]||[]).includes(g.id)}>
              {g.name}
            </MenuItem>
          ))}
        </Menu>
        <GroupChips groupIds={assignments[subject.id]||[]} groups={groups} onRemove={handleRemoveGroup} />
      </Box>
      <IconButton
        className="plus-btn"
        size="small"
        sx={{
          color: '#b0b8c1',
          borderRadius: 1,
          width: 22,
          height: 22,
          p: 0.2,
          ml: 0.5,
          display: 'none',
          position: 'absolute',
          right: 2,
          '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
        }}
        onClick={() => onAddBlock(subject.id)}
      >
        ➕
      </IconButton>
    </Box>
  );
};

const SortableBlock = ({ block, onEdit, onDelete, onAddUnit, isCollapsed, onToggleCollapse, groups, assignments, setAssignments, setSubjectAssignments, setBlockAssignments, setUnitAssignments, setTopicAssignments, setLessonAssignments }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAddGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [block.id]: [...(prev[block.id] || []), groupId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    handleMenuClose();
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'block', refId: block.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };
  const handleRemoveGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [block.id]: (prev[block.id] || []).filter((id: string) => id !== groupId)
    }));
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'block', refId: block.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 0.8,
        borderRadius: 1.8,
        background: '#ffffff',
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 32,
        px: 1.3,
        py: 0.6,
        borderLeft: '2px solid #2E7D32',
        fontWeight: 600,
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
          transform: 'translateY(-1px)',
          '& .plus-btn': { display: 'inline-flex' }
        }
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{
          color: '#3399ff',
          borderRadius: 1,
          width: 20,
          height: 20,
          p: 0.2,
          mr: 1,
          cursor: 'grab',
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
      >
        <DragIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{
          color: '#3399ff',
          borderRadius: 1,
          width: 20,
          height: 20,
          p: 0.2,
          mr: 1,
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
        onClick={onToggleCollapse}
      >
        {isCollapsed ? '▶️' : '🔽'}
      </IconButton>
      <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.78rem' }}>{block.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, ml: 1, mr: 4, position: 'relative' }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 22, height: 22, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(block)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 22, height: 22, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(block.id)}>🗑️</IconButton>
        <IconButton
          size="small"
          sx={{
            color: '#b0b8c1',
            borderRadius: 1,
            width: 18,
            height: 18,
            p: 0.15,
            ml: 0.4,
            // Entferne position: 'absolute', right: 36
            '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
          }}
          onClick={handleMenuOpen}
        >
          <Tooltip title="Zu Lerngruppe hinzufügen"><GroupAddIcon fontSize="small" /></Tooltip>
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          {groups.map((g: any) => (
            <MenuItem key={g.id} onClick={() => handleAddGroup(g.id)} disabled={(assignments[block.id]||[]).includes(g.id)}>
              {g.name}
            </MenuItem>
          ))}
        </Menu>
        <GroupChips groupIds={assignments[block.id]||[]} groups={groups} onRemove={handleRemoveGroup} />
      </Box>
      <IconButton
        className="plus-btn"
        size="small"
        sx={{
          color: '#b0b8c1',
          borderRadius: 1,
          width: 22,
          height: 22,
          p: 0.2,
          ml: 0.5,
          display: 'none',
          position: 'absolute',
          right: 2,
          '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
        }}
        onClick={() => onAddUnit(block.id)}
      >
        ➕
      </IconButton>
    </Box>
  );
};

const SortableUnit = ({ unit, onEdit, onDelete, onAddTopic, isCollapsed, onToggleCollapse, groups, assignments, setAssignments, setSubjectAssignments, setBlockAssignments, setUnitAssignments, setTopicAssignments, setLessonAssignments }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAddGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [unit.id]: [...(prev[unit.id] || []), groupId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    handleMenuClose();
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unit', refId: unit.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };
  const handleRemoveGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [unit.id]: (prev[unit.id] || []).filter((id: string) => id !== groupId)
    }));
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unit', refId: unit.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 0.7,
        borderRadius: 1.6,
        background: '#fafdff',
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 28,
        px: 1.2,
        py: 0.4,
        borderLeft: '2px solid #F57C00',
        fontStyle: 'italic',
        color: '#3a4a5d',
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          '& .plus-btn': { display: 'inline-flex' }
        }
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{
          color: '#3a4a5d',
          borderRadius: 1,
          width: 18,
          height: 18,
          p: 0.2,
          mr: 1,
          cursor: 'grab',
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
      >
        <DragIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{
          color: '#3a4a5d',
          borderRadius: 1,
          width: 18,
          height: 18,
          p: 0.2,
          mr: 1,
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
        onClick={onToggleCollapse}
      >
        {isCollapsed ? '▶️' : '🔽'}
      </IconButton>
      <Typography variant="caption" sx={{ flex: 1, fontStyle: 'italic', color: '#3a4a5d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.72rem' }}>{unit.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, ml: 1, mr: 4, position: 'relative' }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 20, height: 20, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(unit)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 20, height: 20, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(unit.id)}>🗑️</IconButton>
        <IconButton
          size="small"
          sx={{
            color: '#b0b8c1',
            borderRadius: 1,
            width: 18,
            height: 18,
            p: 0.15,
            ml: 0.4,
            // Entferne position: 'absolute', right: 36
            '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
          }}
          onClick={handleMenuOpen}
        >
          <Tooltip title="Zu Lerngruppe hinzufügen"><GroupAddIcon fontSize="small" /></Tooltip>
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          {groups.map((g: any) => (
            <MenuItem key={g.id} onClick={() => handleAddGroup(g.id)} disabled={(assignments[unit.id]||[]).includes(g.id)}>
              {g.name}
            </MenuItem>
          ))}
        </Menu>
        <GroupChips groupIds={assignments[unit.id]||[]} groups={groups} onRemove={handleRemoveGroup} />
      </Box>
      <IconButton
        className="plus-btn"
        size="small"
        sx={{
          color: '#b0b8c1',
          borderRadius: 1,
          width: 22,
          height: 22,
          p: 0.2,
          ml: 0.5,
          display: 'none',
          position: 'absolute',
          right: 4,
          '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
        }}
        onClick={() => onAddTopic(unit.id)}
      >
        ➕
      </IconButton>
    </Box>
  );
};

const SortableTopic = ({ topic, onEdit, onDelete, onAddLesson, isCollapsed, onToggleCollapse, groups, assignments, setAssignments, setSubjectAssignments, setBlockAssignments, setUnitAssignments, setTopicAssignments, setLessonAssignments }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleAddGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [topic.id]: [...(prev[topic.id] || []), groupId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    handleMenuClose();
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'topic', refId: topic.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };
  const handleRemoveGroup = async (groupId: string) => {
    setAssignments((prev: any) => ({
      ...prev,
      [topic.id]: (prev[topic.id] || []).filter((id: string) => id !== groupId)
    }));
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'topic', refId: topic.id })
    });
    fetchAssignments(
      groups,
      setSubjectAssignments,
      setBlockAssignments,
      setUnitAssignments,
      setTopicAssignments,
      setLessonAssignments
    );
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 0.6,
        borderRadius: 1.4,
        background: '#fefeff',
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 26,
        px: 1,
        py: 0.3,
        borderLeft: '2px solid #C2185B',
        fontWeight: 500,
        color: '#4a5a6d',
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          '& .plus-btn': { display: 'inline-flex' }
        }
      }}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{
          color: '#4a5a6d',
          borderRadius: 1,
          width: 16,
          height: 16,
          p: 0.2,
          mr: 1,
          cursor: 'grab',
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
      >
        <DragIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{
          color: '#4a5a6d',
          borderRadius: 1,
          width: 16,
          height: 16,
          p: 0.2,
          mr: 1,
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
        onClick={onToggleCollapse}
      >
        {isCollapsed ? '▶️' : '🔽'}
      </IconButton>
      <Typography variant="caption" sx={{ flex: 1, fontWeight: 500, color: '#4a5a6d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{topic.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, ml: 1, mr: 4, position: 'relative' }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 18, height: 18, p: 0.25, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(topic)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 18, height: 18, p: 0.25, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(topic.id)}>🗑️</IconButton>
        <IconButton
          size="small"
          sx={{
            color: '#b0b8c1',
            borderRadius: 1,
            width: 18,
            height: 18,
            p: 0.15,
            ml: 0.4,
            // Entferne position: 'absolute', right: 36
            '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
          }}
          onClick={handleMenuOpen}
        >
          <Tooltip title="Zu Lerngruppe hinzufügen"><GroupAddIcon fontSize="small" /></Tooltip>
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          {groups.map((g: any) => (
            <MenuItem key={g.id} onClick={() => handleAddGroup(g.id)} disabled={(assignments[topic.id]||[]).includes(g.id)}>
              {g.name}
            </MenuItem>
          ))}
        </Menu>
        <GroupChips groupIds={assignments[topic.id]||[]} groups={groups} onRemove={handleRemoveGroup} />
      </Box>
      <IconButton
        className="plus-btn"
        size="small"
        sx={{
          color: '#b0b8c1',
          borderRadius: 1,
          width: 22,
          height: 22,
          p: 0.2,
          ml: 0.5,
          display: 'none',
          position: 'absolute',
          right: 4,
          '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
        }}
        onClick={() => onAddLesson(topic.id)}
      >
        ➕
      </IconButton>
    </Box>
  );
};

const SortableLesson = ({ lesson, subject, onOpenMaterialDialog, ...props }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([]);
  const [lessonQuiz, setLessonQuiz] = useState<any>(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Materialien der Lesson laden
  const fetchLessonMaterials = async () => {
    try {
      const response = await fetch(`/api/materials/lesson/${lesson.id}`);
      if (response.ok) {
        const materials = await response.json();
        setLessonMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching lesson materials:', error);
    }
  };

  // Quiz der Lesson laden
  const fetchLessonQuiz = async () => {
    try {
      const response = await fetch(`/api/lesson-quizzes/lesson/${lesson.id}`);
      if (response.ok) {
        const data = await response.json();
        setLessonQuiz(data);
      } else if (response.status === 404) {
        setLessonQuiz(null);
      }
    } catch (error) {
      console.error('Error fetching lesson quiz:', error);
      setLessonQuiz(null);
    }
  };

  // Beim ersten Laden Materialien und Quiz abrufen
  useEffect(() => {
    fetchLessonMaterials();
    fetchLessonQuiz();
  }, [lesson.id]);

  // Inhalt öffnen (Material oder Quiz)
  const handleLessonClick = () => {
    if (lessonMaterials.length > 0) {
      // Öffne das erste Material in einem neuen Tab
      const materialPath = lessonMaterials[0].material.filePath;
      const ext = materialPath.split('.').pop()?.toLowerCase();
      
      // Verwende den Server-Port (3005) für HTML-Dateien
      const fullUrl = ext === 'html' 
        ? 'http://localhost:3005' + materialPath 
        : window.location.origin + materialPath;
      
      // Versuche zuerst, die Datei in einem neuen Tab zu öffnen
      const newWindow = window.open(fullUrl, '_blank');
      
      // Falls das nicht funktioniert, zeige eine Meldung
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert('Das Material konnte nicht geöffnet werden. Versuchen Sie es erneut oder verwenden Sie die Vorschau-Funktion.');
      }
    } else if (lessonQuiz) {
      // Bestätigung für Quiz-Start anzeigen
      if (window.confirm(`Prüfung "${lessonQuiz.quiz.title}" starten?`)) {
        // Öffne den Quiz-Player in einem neuen Tab
        const quizUrl = `/quiz-player/${lessonQuiz.quiz.id}`;
        window.open(quizUrl, '_blank');
      }
    }
  };

  // Material entfernen (Rechtsklick)
  const handleLessonRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (lessonMaterials.length > 0) {
              if (window.confirm(`Möchten Sie das Material "${lessonMaterials[0].material.fileName}" von dieser Lesson entfernen?`)) {
        fetch(`/api/materials/lesson/${lesson.id}/${lessonMaterials[0].id}`, {
          method: 'DELETE',
        }).then(() => {
          fetchLessonMaterials();
        }).catch(error => {
          console.error('Error removing material:', error);
          alert('Fehler beim Entfernen des Materials');
        });
      }
    }
  };
  const handleAddGroup = async (groupId: string) => {
    props.setAssignments((prev: any) => ({
      ...prev,
      [lesson.id]: [...(prev[lesson.id] || []), groupId].filter((v, i, a) => a.indexOf(v) === i)
    }));
    handleMenuClose();
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lesson', refId: lesson.id })
    });
    fetchAssignments(
      props.groups,
      props.setSubjectAssignments,
      props.setBlockAssignments,
      props.setUnitAssignments,
      props.setTopicAssignments,
      props.setLessonAssignments
    );
  };
  const handleRemoveGroup = async (groupId: string) => {
    props.setAssignments((prev: any) => ({
      ...prev,
      [lesson.id]: (prev[lesson.id] || []).filter((id: string) => id !== groupId)
    }));
    await fetch(`/api/learning-groups/${groupId}/assign`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'lesson', refId: lesson.id })
    });
    fetchAssignments(
      props.groups,
      props.setSubjectAssignments,
      props.setBlockAssignments,
      props.setUnitAssignments,
      props.setTopicAssignments,
      props.setLessonAssignments
    );
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 0.5,
        borderRadius: 1.2,
        background: '#fefeff',
        border: '1px solid #e8e8e8',
        boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 24,
        px: 0.8,
        py: 0.2,
        borderLeft: '2px solid #7F8C8D',
        fontWeight: 400,
        color: '#5a6a7d',
        position: 'relative',
        cursor: (lessonMaterials.length > 0 || lessonQuiz) ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': (lessonMaterials.length > 0 || lessonQuiz) ? { 
          background: '#e3f0fc',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        } : {},
      }}
      onClick={handleLessonClick}
      onContextMenu={handleLessonRightClick}
    >
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{
          color: '#5a6a7d',
          borderRadius: 1,
          width: 16,
          height: 16,
          p: 0.2,
          mr: 1,
          cursor: 'grab',
          '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 }
        }}
        onClick={e => e.stopPropagation()}
      >
        <DragIcon fontSize="small" />
      </IconButton>
      <Typography
        variant="body2"
        sx={{ 
          flex: 1, 
          fontWeight: 400, 
          color: '#5a6a7d', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        {lesson.name}
        {lessonMaterials.length > 0 && (
          <span style={{ color: '#ff9800', fontSize: '0.8em' }}>📄</span>
        )}
        {lessonQuiz && (
          <span style={{ color: '#ff9800', fontSize: '0.8em' }}>🧩</span>
        )}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, position: 'relative' }}>
        <IconButton 
          size="small" 
          sx={{ color: '#3399ff', borderRadius: 1, width: 22, height: 22, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} 
          onClick={e => { e.stopPropagation(); props.onEdit(lesson); }}
        >
          ✏️
        </IconButton>
        <IconButton 
          size="small" 
          sx={{ color: '#3399ff', borderRadius: 1, width: 22, height: 22, p: 0.3, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} 
          onClick={e => { e.stopPropagation(); props.onDelete(lesson.id); }}
        >
          🗑️
        </IconButton>
        <IconButton
          size="small"
          sx={{
            color: '#ff9800',
            borderRadius: 1,
            width: 22,
            height: 22,
            p: 0.2,
            ml: 0.5,
            '&:hover': { bgcolor: '#fff3e0', color: '#f57c00', borderRadius: 1 }
          }}
          onClick={e => { e.stopPropagation(); onOpenMaterialDialog(lesson); }}
        >
          <Tooltip title="Material hinzufügen"><DescriptionIcon fontSize="small" /></Tooltip>
        </IconButton>
        <IconButton
          size="small"
          sx={{
            color: '#b0b8c1',
            borderRadius: 1,
            width: 22,
            height: 22,
            p: 0.2,
            ml: 0.5,
            '&:hover': { bgcolor: '#f0f4f8', color: '#3399ff', borderRadius: 1 }
          }}
          onClick={e => { e.stopPropagation(); handleMenuOpen(e); }}
        >
          <Tooltip title="Zu Lerngruppe hinzufügen"><GroupAddIcon fontSize="small" /></Tooltip>
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          {props.groups.map((g: any) => (
            <MenuItem key={g.id} onClick={() => handleAddGroup(g.id)} disabled={(props.assignments[lesson.id]||[]).includes(g.id)}>
              {g.name}
            </MenuItem>
          ))}
        </Menu>
        <GroupChips groupIds={props.assignments[lesson.id]||[]} groups={props.groups} onRemove={handleRemoveGroup} />
      </Box>
    </Box>
  );
};

const SubjectManager: React.FC<SubjectManagerProps> = ({
  teacherId,
  subjectAssignments: subjectAssignmentsProp,
  setSubjectAssignments: setSubjectAssignmentsProp,
  blockAssignments: blockAssignmentsProp,
  setBlockAssignments: setBlockAssignmentsProp,
  unitAssignments: unitAssignmentsProp,
  setUnitAssignments: setUnitAssignmentsProp,
  topicAssignments: topicAssignmentsProp,
  setTopicAssignments: setTopicAssignmentsProp,
  lessonAssignments: lessonAssignmentsProp,
  setLessonAssignments: setLessonAssignmentsProp,
  setSubjects: setSubjectsProp,
  setBlocks: setBlocksProp,
  setUnits: setUnitsProp,
  setTopics: setTopicsProp,
  setLessons: setLessonsProp,
  visibleSubjectId,
  visibleBlockId,
}) => {
  // Spielerische Farbpalette
  const colors = {
    primary: '#2E7D32', // Dunkleres Grün für besseren Kontrast
    secondary: '#F57C00', // Dunkleres Orange
    accent1: '#1976D2', // Dunkleres Blau
    accent2: '#C2185B', // Dunkleres Pink
    background: '#F8FAFC', // Helleres, moderneres Blau
    cardBg: '#FFFFFF',
    success: '#4CAF50',
    textPrimary: '#2C3E50', // Dunkler Text für bessere Lesbarkeit
    textSecondary: '#7F8C8D', // Grauer Text für Sekundärinformationen
  };
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<{ [subjectId: string]: Block[] }>({});
  const [units, setUnits] = useState<{ [blockId: string]: Unit[] }>({});
  const [topics, setTopics] = useState<{ [unitId: string]: Topic[] }>({});
  const [lessons, setLessons] = useState<{ [topicId: string]: Lesson[] }>({});
  // Gruppen-Logik
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  // Zuordnungen: Map von Element-ID zu Array von Group-IDs
  const [subjectAssignmentsState, setSubjectAssignmentsState] = useState<{ [subjectId: string]: string[] }>({});
  const [blockAssignmentsState, setBlockAssignmentsState] = useState<{ [blockId: string]: string[] }>({});
  const [unitAssignmentsState, setUnitAssignmentsState] = useState<{ [unitId: string]: string[] }>({});
  const [topicAssignmentsState, setTopicAssignmentsState] = useState<{ [topicId: string]: string[] }>({});
  const [lessonAssignmentsState, setLessonAssignmentsState] = useState<{ [lessonId: string]: string[] }>({});
  const subjectAssignments = subjectAssignmentsProp ?? subjectAssignmentsState;
  const setSubjectAssignments = setSubjectAssignmentsProp ?? setSubjectAssignmentsState;
  const blockAssignments = blockAssignmentsProp ?? blockAssignmentsState;
  const setBlockAssignments = setBlockAssignmentsProp ?? setBlockAssignmentsState;
  const unitAssignments = unitAssignmentsProp ?? unitAssignmentsState;
  const setUnitAssignments = setUnitAssignmentsProp ?? setUnitAssignmentsState;
  const topicAssignments = topicAssignmentsProp ?? topicAssignmentsState;
  const setTopicAssignments = setTopicAssignmentsProp ?? setTopicAssignmentsState;
  const lessonAssignments = lessonAssignmentsProp ?? lessonAssignmentsState;
  const setLessonAssignments = setLessonAssignmentsProp ?? setLessonAssignmentsState;
  const [openDialog, setOpenDialog] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [openBlockDialog, setOpenBlockDialog] = useState(false);
  const [editBlock, setEditBlock] = useState<Block | null>(null);
  const [blockName, setBlockName] = useState('');
  const [blockDescription, setBlockDescription] = useState('');
  const [currentSubjectId, setCurrentSubjectId] = useState<string>('');
  const [openUnitDialog, setOpenUnitDialog] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [unitName, setUnitName] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  const [currentBlockId, setCurrentBlockId] = useState<string>('');
  const [openTopicDialog, setOpenTopicDialog] = useState(false);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [currentUnitId, setCurrentUnitId] = useState<string>('');
  const [openLessonDialog, setOpenLessonDialog] = useState(false);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [lessonName, setLessonName] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [currentTopicId, setCurrentTopicId] = useState<string>('');
  const [collapsedSubjects, setCollapsedSubjects] = useState<{ [key: string]: boolean }>({});
  const [collapsedBlocks, setCollapsedBlocks] = useState<{ [key: string]: boolean }>({});
  const [collapsedUnits, setCollapsedUnits] = useState<{ [key: string]: boolean }>({});
  const [collapsedTopics, setCollapsedTopics] = useState<{ [key: string]: boolean }>({});
  const [openMaterialDialog, setOpenMaterialDialog] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const blockNameInputRef = useRef<HTMLInputElement>(null);
  const unitNameInputRef = useRef<HTMLInputElement>(null);
  const topicNameInputRef = useRef<HTMLInputElement>(null);
  const lessonNameInputRef = useRef<HTMLInputElement>(null);

  // Nach den useState/Props-Zuweisungen am Anfang der Komponente:
  const subjectAssignmentsSetter = setSubjectAssignmentsProp ?? setSubjectAssignmentsState;
  const blockAssignmentsSetter = setBlockAssignmentsProp ?? setBlockAssignmentsState;
  const unitAssignmentsSetter = setUnitAssignmentsProp ?? setUnitAssignmentsState;
  const topicAssignmentsSetter = setTopicAssignmentsProp ?? setTopicAssignmentsState;
  const lessonAssignmentsSetter = setLessonAssignmentsProp ?? setLessonAssignmentsState;

  useEffect(() => {
    fetchSubjects();
  }, [teacherId]);

  // Lade Blöcke automatisch, wenn Fächer geladen werden
  useEffect(() => {
    subjects.forEach(subject => {
      if (!blocks[subject.id]) {
        fetchBlocks(subject.id);
      }
    });
  }, [subjects]);

  // Lade Unterrichtsreihen automatisch, wenn Blöcke geladen werden
  useEffect(() => {
    Object.values(blocks).flat().forEach(block => {
      if (!units[block.id]) {
        fetchUnits(block.id);
      }
    });
  }, [blocks]);

  // Lade Themen automatisch, wenn Unterrichtsreihen geladen werden
  useEffect(() => {
    Object.values(units).flat().forEach(unit => {
      if (!topics[unit.id]) {
        fetchTopics(unit.id);
      }
    });
  }, [units]);

  // Lade Stunden automatisch, wenn Themen geladen werden
  useEffect(() => {
    Object.values(topics).flat().forEach(topic => {
      if (!lessons[topic.id]) {
        fetchLessons(topic.id);
      }
    });
  }, [topics]);

  // Gruppen laden
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`/api/learning-groups/teacher/${teacherId}`);
        if (res.ok) {
          const data = await res.json();
          setGroups(data.map((g: any) => ({ id: g.id, name: g.name })));
        }
      } catch (e) {
        // Fehlerbehandlung optional
      }
    };
    fetchGroups();
  }, [teacherId]);

  // Nach dem Laden der Gruppen: Zuordnungen aus Backend laden
  useEffect(() => {
    if (groups.length === 0) return;
    fetchAssignments(
      groups,
      subjectAssignmentsSetter,
      blockAssignmentsSetter,
      unitAssignmentsSetter,
      topicAssignmentsSetter,
      lessonAssignmentsSetter
    );
    // eslint-disable-next-line
  }, [groups.length]);

  useEffect(() => {
    if (openDialog) {
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 200);
    }
  }, [openDialog]);

  useEffect(() => {
    if (openBlockDialog) {
      setTimeout(() => {
        if (blockNameInputRef.current) {
          blockNameInputRef.current.focus();
        }
      }, 200);
    }
  }, [openBlockDialog]);

  useEffect(() => {
    if (openUnitDialog) {
      setTimeout(() => {
        if (unitNameInputRef.current) {
          unitNameInputRef.current.focus();
        }
      }, 200);
    }
  }, [openUnitDialog]);

  useEffect(() => {
    if (openTopicDialog) {
      setTimeout(() => {
        if (topicNameInputRef.current) {
          topicNameInputRef.current.focus();
        }
      }, 200);
    }
  }, [openTopicDialog]);

  useEffect(() => {
    if (openLessonDialog) {
      setTimeout(() => {
        if (lessonNameInputRef.current) {
          lessonNameInputRef.current.focus();
        }
      }, 200);
    }
  }, [openLessonDialog]);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`/api/subjects?teacherId=${teacherId}`);
      if (res.ok) {
        const subjectsData = await res.json();
        setSubjects(subjectsData);
        // Lade auch alle zugehörigen Daten neu
        subjectsData.forEach((subject: Subject) => {
          fetchBlocks(subject.id);
        });
      }
    } catch (e) {
      showSnackbar('Fehler beim Laden der Fächer', 'error');
    }
  };

  const fetchBlocks = async (subjectId: string) => {
    try {
      const res = await fetch(`/api/blocks?subjectId=${subjectId}`);
      if (res.ok) {
        const blocksData = await res.json();
        setBlocks(prev => ({ ...prev, [subjectId]: blocksData }));
      }
    } catch (e) {
      showSnackbar('Fehler beim Laden der Blöcke', 'error');
    }
  };

  const fetchUnits = async (blockId: string) => {
    try {
      const res = await fetch(`/api/units?blockId=${blockId}`);
      if (res.ok) {
        const unitsData = await res.json();
        setUnits(prev => ({ ...prev, [blockId]: unitsData }));
      }
    } catch (e) {
      showSnackbar('Fehler beim Laden der Unterrichtsreihen', 'error');
    }
  };

  const fetchTopics = async (unitId: string) => {
    try {
      const res = await fetch(`/api/topics?unitId=${unitId}`);
      if (res.ok) {
        const topicsData = await res.json();
        setTopics(prev => ({ ...prev, [unitId]: topicsData }));
      }
    } catch (e) {
      showSnackbar('Fehler beim Laden der Themen', 'error');
    }
  };

  const fetchLessons = async (topicId: string) => {
    try {
      const res = await fetch(`/api/lessons?topicId=${topicId}`);
      if (res.ok) {
        const lessonsData = await res.json();
        setLessons(prev => ({ ...prev, [topicId]: lessonsData }));
      }
    } catch (e) {
      showSnackbar('Fehler beim Laden der Stunden', 'error');
    }
  };

  const handleOpenDialog = (subject?: Subject) => {
    setEditSubject(subject || null);
    setName(subject?.name || '');
    setDescription(subject?.description || '');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditSubject(null);
    setName('');
    setDescription('');
  };

  const handleSave = async () => {
    try {
      const method = editSubject ? 'PUT' : 'POST';
      const url = editSubject ? `/api/subjects/${editSubject.id}` : '/api/subjects';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, teacherId }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      await fetchSubjects();
      handleCloseDialog();
      showSnackbar(editSubject ? 'Fach aktualisiert' : 'Fach erstellt', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Speichern', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchSubjects();
      showSnackbar('Fach gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    }
  };

  const handleOpenBlockDialog = async (subjectId: string, block?: Block) => {
    setCurrentSubjectId(subjectId);
    setEditBlock(block || null);
    setBlockName(block?.name || '');
    setBlockDescription(block?.description || '');
    setOpenBlockDialog(true);
  };

  const handleCloseBlockDialog = () => {
    setOpenBlockDialog(false);
    setEditBlock(null);
    setBlockName('');
    setBlockDescription('');
  };

  const handleSaveBlock = async () => {
    try {
      const method = editBlock ? 'PUT' : 'POST';
      const url = editBlock ? `/api/blocks/${editBlock.id}` : '/api/blocks';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: blockName, description: blockDescription, subjectId: currentSubjectId }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      await fetchBlocks(currentSubjectId);
      handleCloseBlockDialog();
      showSnackbar(editBlock ? 'Block aktualisiert' : 'Block erstellt', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Speichern', 'error');
    }
  };

  const handleDeleteBlock = async (subjectId: string, id: string) => {
    try {
      const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchBlocks(subjectId);
      showSnackbar('Block gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    }
  };

  const handleOpenUnitDialog = async (blockId: string, unit?: Unit) => {
    setCurrentBlockId(blockId);
    setEditUnit(unit || null);
    setUnitName(unit?.name || '');
    setUnitDescription(unit?.description || '');
    setOpenUnitDialog(true);
  };

  const handleCloseUnitDialog = () => {
    setOpenUnitDialog(false);
    setEditUnit(null);
    setUnitName('');
    setUnitDescription('');
  };

  const handleSaveUnit = async () => {
    try {
      const method = editUnit ? 'PUT' : 'POST';
      const url = editUnit ? `/api/units/${editUnit.id}` : '/api/units';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: unitName, description: unitDescription, blockId: currentBlockId }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      await fetchUnits(currentBlockId);
      handleCloseUnitDialog();
      showSnackbar(editUnit ? 'Unterrichtsreihe aktualisiert' : 'Unterrichtsreihe erstellt', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Speichern', 'error');
    }
  };

  const handleDeleteUnit = async (blockId: string, id: string) => {
    try {
      const res = await fetch(`/api/units/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchUnits(blockId);
      showSnackbar('Unterrichtsreihe gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    }
  };

  const handleOpenTopicDialog = async (unitId: string, topic?: Topic) => {
    setCurrentUnitId(unitId);
    setEditTopic(topic || null);
    setTopicName(topic?.name || '');
    setTopicDescription(topic?.description || '');
    setOpenTopicDialog(true);
  };

  const handleCloseTopicDialog = () => {
    setOpenTopicDialog(false);
    setEditTopic(null);
    setTopicName('');
    setTopicDescription('');
  };

  const handleSaveTopic = async () => {
    try {
      const method = editTopic ? 'PUT' : 'POST';
      const url = editTopic ? `/api/topics/${editTopic.id}` : '/api/topics';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: topicName, description: topicDescription, unitId: currentUnitId }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      await fetchTopics(currentUnitId);
      handleCloseTopicDialog();
      showSnackbar(editTopic ? 'Thema aktualisiert' : 'Thema erstellt', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Speichern', 'error');
    }
  };

  const handleDeleteTopic = async (unitId: string, topicId: string) => {
    try {
      const res = await fetch(`/api/topics/${topicId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchTopics(unitId);
      showSnackbar('Thema gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    }
  };

  const handleOpenLessonDialog = async (topicId: string, lesson?: Lesson) => {
    setCurrentTopicId(topicId);
    setEditLesson(lesson || null);
    setLessonName(lesson?.name || '');
    setLessonDescription(lesson?.description || '');
    setOpenLessonDialog(true);
  };

  const handleCloseLessonDialog = () => {
    setOpenLessonDialog(false);
    setEditLesson(null);
    setLessonName('');
    setLessonDescription('');
  };

  const handleSaveLesson = async () => {
    try {
      const method = editLesson ? 'PUT' : 'POST';
      const url = editLesson ? `/api/lessons/${editLesson.id}` : '/api/lessons';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: lessonName, description: lessonDescription, topicId: currentTopicId }),
      });
      if (!res.ok) throw new Error('Fehler beim Speichern');
      await fetchLessons(currentTopicId);
      handleCloseLessonDialog();
      showSnackbar(editLesson ? 'Stunde aktualisiert' : 'Stunde erstellt', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Speichern', 'error');
    }
  };

  const handleDeleteLesson = async (topicId: string, lessonId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchLessons(topicId);
      showSnackbar('Stunde gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    }
  };

  const handleOpenMaterialDialog = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setOpenMaterialDialog(true);
  };

  const handleCloseMaterialDialog = () => {
    setOpenMaterialDialog(false);
    setSelectedLesson(null);
  };

  const refreshAllData = async () => {
    await fetchSubjects();
  };

  const toggleSubjectCollapse = (subjectId: string) => {
    setCollapsedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const toggleBlockCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const toggleUnitCollapse = (unitId: string) => {
    setCollapsedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleTopicCollapse = (topicId: string) => {
    setCollapsedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Drag & Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sortier-Funktionen
  const handleSubjectReorder = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = subjects.findIndex(s => s.id === active.id);
      const newIndex = subjects.findIndex(s => s.id === over?.id);
      const newSubjects = arrayMove(subjects, oldIndex, newIndex);
      setSubjects(newSubjects);
      
      try {
        await fetch('/api/subjects/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            subjectIds: newSubjects.map(s => s.id),
            teacherId 
          }),
        });
        showSnackbar('Reihenfolge der Fächer aktualisiert', 'success');
      } catch (error) {
        showSnackbar('Fehler beim Aktualisieren der Reihenfolge', 'error');
      }
    }
  };

  const handleBlockReorder = async (event: DragEndEvent, subjectId: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const currentBlocks = blocks[subjectId] || [];
      const oldIndex = currentBlocks.findIndex(b => b.id === active.id);
      const newIndex = currentBlocks.findIndex(b => b.id === over?.id);
      const newBlocks = arrayMove(currentBlocks, oldIndex, newIndex);
      
      setBlocks(prev => ({ ...prev, [subjectId]: newBlocks }));
      
      try {
        await fetch('/api/subjects/blocks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            blockIds: newBlocks.map(b => b.id),
            subjectId 
          }),
        });
        showSnackbar('Reihenfolge der Blöcke aktualisiert', 'success');
      } catch (error) {
        showSnackbar('Fehler beim Aktualisieren der Reihenfolge', 'error');
      }
    }
  };

  const handleUnitReorder = async (event: DragEndEvent, blockId: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const currentUnits = units[blockId] || [];
      const oldIndex = currentUnits.findIndex(u => u.id === active.id);
      const newIndex = currentUnits.findIndex(u => u.id === over?.id);
      const newUnits = arrayMove(currentUnits, oldIndex, newIndex);
      
      setUnits(prev => ({ ...prev, [blockId]: newUnits }));
      
      try {
        await fetch('/api/subjects/units/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            unitIds: newUnits.map(u => u.id),
            blockId 
          }),
        });
        showSnackbar('Reihenfolge der Unterrichtsreihen aktualisiert', 'success');
      } catch (error) {
        showSnackbar('Fehler beim Aktualisieren der Reihenfolge', 'error');
      }
    }
  };

  const handleTopicReorder = async (event: DragEndEvent, unitId: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const currentTopics = topics[unitId] || [];
      const oldIndex = currentTopics.findIndex(t => t.id === active.id);
      const newIndex = currentTopics.findIndex(t => t.id === over?.id);
      const newTopics = arrayMove(currentTopics, oldIndex, newIndex);
      
      setTopics(prev => ({ ...prev, [unitId]: newTopics }));
      
      try {
        await fetch('/api/subjects/topics/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            topicIds: newTopics.map(t => t.id),
            unitId 
          }),
        });
        showSnackbar('Reihenfolge der Themen aktualisiert', 'success');
      } catch (error) {
        showSnackbar('Fehler beim Aktualisieren der Reihenfolge', 'error');
      }
    }
  };

  const handleLessonReorder = async (event: DragEndEvent, topicId: string) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const currentLessons = lessons[topicId] || [];
      const oldIndex = currentLessons.findIndex(l => l.id === active.id);
      const newIndex = currentLessons.findIndex(l => l.id === over?.id);
      const newLessons = arrayMove(currentLessons, oldIndex, newIndex);
      
      setLessons(prev => ({ ...prev, [topicId]: newLessons }));
      
      try {
        await fetch('/api/subjects/lessons/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lessonIds: newLessons.map(l => l.id),
            topicId 
          }),
        });
        showSnackbar('Reihenfolge der Stunden aktualisiert', 'success');
      } catch (error) {
        showSnackbar('Fehler beim Aktualisieren der Reihenfolge', 'error');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 2, minHeight: 40 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleOpenDialog()}>
            ➕
          </IconButton>
        </Box>
      </Box>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSubjectReorder}
      >
        <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {subjects
            .filter(s => !visibleSubjectId || s.id === visibleSubjectId)
            .map(subject => (
            <React.Fragment key={subject.id}>
              <SortableSubject
                subject={subject}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
                onAddBlock={handleOpenBlockDialog}
                isCollapsed={collapsedSubjects[subject.id]}
                onToggleCollapse={() => toggleSubjectCollapse(subject.id)}
                groups={groups}
                assignments={subjectAssignments}
                setAssignments={setSubjectAssignments}
                setSubjectAssignments={setSubjectAssignments}
                setBlockAssignments={setBlockAssignments}
                setUnitAssignments={setUnitAssignments}
                setTopicAssignments={setTopicAssignments}
                setLessonAssignments={setLessonAssignments}
              />
              {!collapsedSubjects[subject.id] && (
                <Box sx={{ ml: 4, mb: 1 }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleBlockReorder(event, subject.id)}
                  >
                    <SortableContext items={((blocks[subject.id] || []).filter(b => !visibleBlockId || b.id === visibleBlockId)).map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {(blocks[subject.id] || []).filter(b => !visibleBlockId || b.id === visibleBlockId).map(block => (
                        <React.Fragment key={block.id}>
                          <SortableBlock
                            block={block}
                            onEdit={(block: Block) => handleOpenBlockDialog(subject.id, block)}
                            onDelete={(id: string) => handleDeleteBlock(subject.id, id)}
                            onAddUnit={handleOpenUnitDialog}
                            isCollapsed={collapsedBlocks[block.id]}
                            onToggleCollapse={() => toggleBlockCollapse(block.id)}
                            groups={groups}
                            assignments={blockAssignments}
                            setAssignments={setBlockAssignments}
                            setSubjectAssignments={setSubjectAssignments}
                            setBlockAssignments={setBlockAssignments}
                            setUnitAssignments={setUnitAssignments}
                            setTopicAssignments={setTopicAssignments}
                            setLessonAssignments={setLessonAssignments}
                          />
                          {!collapsedBlocks[block.id] && (
                            <Box sx={{ ml: 4, mb: 1 }}>
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(event) => handleUnitReorder(event, block.id)}
                              >
                                <SortableContext items={(units[block.id] || []).map(u => u.id)} strategy={verticalListSortingStrategy}>
                                  {(units[block.id] || []).map(unit => (
                                    <React.Fragment key={unit.id}>
                                      <SortableUnit
                                        unit={unit}
                                        onEdit={(unit: Unit) => handleOpenUnitDialog(block.id, unit)}
                                        onDelete={(id: string) => handleDeleteUnit(block.id, id)}
                                        onAddTopic={handleOpenTopicDialog}
                                        isCollapsed={collapsedUnits[unit.id]}
                                        onToggleCollapse={() => toggleUnitCollapse(unit.id)}
                                        groups={groups}
                                        assignments={unitAssignments}
                                        setAssignments={setUnitAssignments}
                                        setSubjectAssignments={setSubjectAssignments}
                                        setBlockAssignments={setBlockAssignments}
                                        setUnitAssignments={setUnitAssignments}
                                        setTopicAssignments={setTopicAssignments}
                                        setLessonAssignments={setLessonAssignments}
                                      />
                                      {!collapsedUnits[unit.id] && (
                                        <Box sx={{ ml: 4, mb: 1 }}>
                                          <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(event) => handleTopicReorder(event, unit.id)}
                                          >
                                            <SortableContext items={(topics[unit.id] || []).map(t => t.id)} strategy={verticalListSortingStrategy}>
                                              {(topics[unit.id] || []).map(topic => (
                                                <React.Fragment key={topic.id}>
                                                  <SortableTopic
                                                    topic={topic}
                                                    onEdit={(topic: Topic) => handleOpenTopicDialog(unit.id, topic)}
                                                    onDelete={(id: string) => handleDeleteTopic(unit.id, id)}
                                                    onAddLesson={handleOpenLessonDialog}
                                                    isCollapsed={collapsedTopics[topic.id]}
                                                    onToggleCollapse={() => toggleTopicCollapse(topic.id)}
                                                    groups={groups}
                                                    assignments={topicAssignments}
                                                    setAssignments={setTopicAssignments}
                                                    setSubjectAssignments={setSubjectAssignments}
                                                    setBlockAssignments={setBlockAssignments}
                                                    setUnitAssignments={setUnitAssignments}
                                                    setTopicAssignments={setTopicAssignments}
                                                    setLessonAssignments={setLessonAssignments}
                                                  />
                                                  {!collapsedTopics[topic.id] && (
                                                    <Box sx={{ ml: 4, mb: 1 }}>
                                                      <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={(event) => handleLessonReorder(event, topic.id)}
                                                      >
                                                        <SortableContext items={(lessons[topic.id] || []).map(l => l.id)} strategy={verticalListSortingStrategy}>
                                                          {(lessons[topic.id] || []).map(lesson => (
                                                            <SortableLesson
                                                              key={lesson.id}
                                                              lesson={lesson}
                                                              subject={subject}
                                                              teacherId={teacherId}
                                                              onEdit={(lesson: Lesson) => handleOpenLessonDialog(topic.id, lesson)}
                                                              onDelete={(id: string) => handleDeleteLesson(topic.id, id)}
                                                              onOpenMaterialDialog={handleOpenMaterialDialog}
                                                              groups={groups}
                                                              assignments={lessonAssignments}
                                                              setAssignments={setLessonAssignments}
                                                              setSubjectAssignments={setSubjectAssignments}
                                                              setBlockAssignments={setBlockAssignments}
                                                              setUnitAssignments={setUnitAssignments}
                                                              setTopicAssignments={setTopicAssignments}
                                                              setLessonAssignments={setLessonAssignments}
                                                            />
                                                          ))}
                                                        </SortableContext>
                                                      </DndContext>
                                                    </Box>
                                                  )}
                                                </React.Fragment>
                                              ))}
                                            </SortableContext>
                                          </DndContext>
                                        </Box>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </SortableContext>
                              </DndContext>
                            </Box>
                          )}
                        </React.Fragment>
                      ))}
                    </SortableContext>
                  </DndContext>
                </Box>
              )}
            </React.Fragment>
          ))}
        </SortableContext>
      </DndContext>

      {/* Dialogs */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle>{editSubject ? 'Fach bearbeiten' : 'Neues Fach'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputRef={nameInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCloseDialog();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openBlockDialog} 
        onClose={handleCloseBlockDialog} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle>{editBlock ? 'Block bearbeiten' : 'Neuer Block'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            inputRef={blockNameInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveBlock();
              }
            }}
          />
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={blockDescription}
            onChange={(e) => setBlockDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveBlock();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseBlockDialog}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCloseBlockDialog();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveBlock} 
            variant="contained"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveBlock();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openUnitDialog} 
        onClose={handleCloseUnitDialog} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle>{editUnit ? 'Unterrichtsreihe bearbeiten' : 'Neue Unterrichtsreihe'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            inputRef={unitNameInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveUnit();
              }
            }}
          />
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={unitDescription}
            onChange={(e) => setUnitDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveUnit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseUnitDialog}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCloseUnitDialog();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveUnit} 
            variant="contained"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveUnit();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openTopicDialog} 
        onClose={handleCloseTopicDialog} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle>{editTopic ? 'Thema bearbeiten' : 'Neues Thema'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            inputRef={topicNameInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveTopic();
              }
            }}
          />
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={topicDescription}
            onChange={(e) => setTopicDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveTopic();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseTopicDialog}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCloseTopicDialog();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveTopic} 
            variant="contained"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveTopic();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openLessonDialog} 
        onClose={handleCloseLessonDialog} 
        maxWidth="sm" 
        fullWidth
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
          }
        }}
      >
        <DialogTitle>{editLesson ? 'Stunde bearbeiten' : 'Neue Stunde'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={lessonName}
            onChange={(e) => setLessonName(e.target.value)}
            inputRef={lessonNameInputRef}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveLesson();
              }
            }}
          />
          <TextField
            margin="dense"
            label="Beschreibung"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={lessonDescription}
            onChange={(e) => setLessonDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveLesson();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseLessonDialog}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCloseLessonDialog();
              }
            }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSaveLesson} 
            variant="contained"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveLesson();
              }
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {selectedLesson && (
        <LessonContentDialog
          open={openMaterialDialog}
          onClose={handleCloseMaterialDialog}
          lessonId={selectedLesson.id}
          lessonName={selectedLesson.name}
          teacherId={teacherId}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SubjectManager; 