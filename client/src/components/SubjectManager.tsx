import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Snackbar, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Storage as StorageIcon, DragIndicator as DragIcon } from '@mui/icons-material';
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
}

// Sortable Components
const SortableSubject = ({ subject, onEdit, onDelete, onAddBlock, isCollapsed, onToggleCollapse }: any) => {
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

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        borderRadius: 2,
        background: '#e8f4fd',
        border: 'none',
        boxShadow: '0 2px 4px rgba(51,153,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 44,
        px: 2,
        py: 0.5,
        borderLeft: '4px solid #0066cc',
        fontWeight: 600,
        position: 'relative',
        '&:hover .plus-btn': { display: 'inline-flex' }
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
      <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700, color: '#0066cc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(subject)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(subject.id)}>🗑️</IconButton>
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
        onClick={() => onAddBlock(subject.id)}
      >
        ➕
      </IconButton>
    </Box>
  );
};

const SortableBlock = ({ block, onEdit, onDelete, onAddUnit, isCollapsed, onToggleCollapse }: any) => {
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

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        borderRadius: 2,
        background: '#f6f9fc',
        border: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 40,
        px: 2,
        py: 0.5,
        borderLeft: '4px solid #3399ff',
        fontWeight: 600,
        position: 'relative',
        '&:hover .plus-btn': { display: 'inline-flex' }
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
      <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(block)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(block.id)}>🗑️</IconButton>
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
        onClick={() => onAddUnit(block.id)}
      >
        ➕
      </IconButton>
    </Box>
  );
};

const SortableUnit = ({ unit, onEdit, onDelete, onAddTopic, isCollapsed, onToggleCollapse }: any) => {
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

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        borderRadius: 2,
        background: '#fafdff',
        border: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 36,
        px: 2,
        py: 0.3,
        borderLeft: '4px solid #b3cef6',
        fontStyle: 'italic',
        color: '#3a4a5d',
        position: 'relative',
        '&:hover .plus-btn': { display: 'inline-flex' }
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
      <Typography variant="body2" sx={{ flex: 1, fontStyle: 'italic', color: '#3a4a5d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(unit)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(unit.id)}>🗑️</IconButton>
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

const SortableTopic = ({ topic, onEdit, onDelete, onAddLesson, isCollapsed, onToggleCollapse }: any) => {
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

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        borderRadius: 2,
        background: '#fefeff',
        border: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 34,
        px: 2,
        py: 0.2,
        borderLeft: '4px solid #d0e6f7',
        fontWeight: 500,
        color: '#4a5a6d',
        position: 'relative',
        '&:hover .plus-btn': { display: 'inline-flex' }
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
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, color: '#4a5a6d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(topic)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(topic.id)}>🗑️</IconButton>
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

const SortableLesson = ({ lesson, onEdit, onDelete }: any) => {
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

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        borderRadius: 2,
        background: '#fefeff',
        border: 'none',
        boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
        display: 'flex',
        alignItems: 'center',
        minHeight: 32,
        px: 2,
        py: 0.2,
        borderLeft: '4px solid #e0e7ef',
        fontWeight: 400,
        color: '#5a6a7d',
        position: 'relative'
      }}
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
      >
        <DragIcon fontSize="small" />
      </IconButton>
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 400, color: '#5a6a7d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onEdit(lesson)}>✏️</IconButton>
        <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => onDelete(lesson.id)}>🗑️</IconButton>
      </Box>
    </Box>
  );
};

const SubjectManager: React.FC<SubjectManagerProps> = ({ teacherId }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<{ [subjectId: string]: Block[] }>({});
  const [units, setUnits] = useState<{ [blockId: string]: Unit[] }>({});
  const [topics, setTopics] = useState<{ [unitId: string]: Topic[] }>({});
  const [lessons, setLessons] = useState<{ [topicId: string]: Lesson[] }>({});
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const blockNameInputRef = useRef<HTMLInputElement>(null);
  const unitNameInputRef = useRef<HTMLInputElement>(null);
  const topicNameInputRef = useRef<HTMLInputElement>(null);
  const lessonNameInputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch(`http://localhost:3005/api/subjects?teacherId=${teacherId}`);
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
      const res = await fetch(`http://localhost:3005/api/blocks?subjectId=${subjectId}`);
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
      const res = await fetch(`http://localhost:3005/api/units?blockId=${blockId}`);
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
      const res = await fetch(`http://localhost:3005/api/topics?unitId=${unitId}`);
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
      const res = await fetch(`http://localhost:3005/api/lessons?topicId=${topicId}`);
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
      const url = editSubject ? `http://localhost:3005/api/subjects/${editSubject.id}` : 'http://localhost:3005/api/subjects';
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
      const res = await fetch(`http://localhost:3005/api/subjects/${id}`, { method: 'DELETE' });
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
      const url = editBlock ? `http://localhost:3005/api/blocks/${editBlock.id}` : 'http://localhost:3005/api/blocks';
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
      const res = await fetch(`http://localhost:3005/api/blocks/${id}`, { method: 'DELETE' });
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
      const url = editUnit ? `http://localhost:3005/api/units/${editUnit.id}` : 'http://localhost:3005/api/units';
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
      const res = await fetch(`http://localhost:3005/api/units/${id}`, { method: 'DELETE' });
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
      const url = editTopic ? `http://localhost:3005/api/topics/${editTopic.id}` : 'http://localhost:3005/api/topics';
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
      const res = await fetch(`http://localhost:3005/api/topics/${topicId}`, { method: 'DELETE' });
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
      const url = editLesson ? `http://localhost:3005/api/lessons/${editLesson.id}` : 'http://localhost:3005/api/lessons';
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
      const res = await fetch(`http://localhost:3005/api/lessons/${lessonId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchLessons(topicId);
      showSnackbar('Stunde gelöscht', 'success');
    } catch (e) {
      showSnackbar('Fehler beim Löschen', 'error');
    }
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
        await fetch('http://localhost:3005/api/subjects/reorder', {
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
        await fetch('http://localhost:3005/api/subjects/blocks/reorder', {
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
        await fetch('http://localhost:3005/api/subjects/units/reorder', {
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
        await fetch('http://localhost:3005/api/subjects/topics/reorder', {
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
        await fetch('http://localhost:3005/api/subjects/lessons/reorder', {
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, minHeight: 40 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
          Meine Fächer
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={refreshAllData}>
            🔄
          </IconButton>
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
          {subjects.map(subject => (
            <React.Fragment key={subject.id}>
              <SortableSubject
                subject={subject}
                onEdit={handleOpenDialog}
                onDelete={handleDelete}
                onAddBlock={handleOpenBlockDialog}
                isCollapsed={collapsedSubjects[subject.id]}
                onToggleCollapse={() => toggleSubjectCollapse(subject.id)}
              />
              {!collapsedSubjects[subject.id] && (
                <Box sx={{ ml: 4, mb: 1 }}>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleBlockReorder(event, subject.id)}
                  >
                    <SortableContext items={(blocks[subject.id] || []).map(b => b.id)} strategy={verticalListSortingStrategy}>
                      {(blocks[subject.id] || []).map(block => (
                        <React.Fragment key={block.id}>
                          <SortableBlock
                            block={block}
                            onEdit={(block: Block) => handleOpenBlockDialog(subject.id, block)}
                            onDelete={(id: string) => handleDeleteBlock(subject.id, id)}
                            onAddUnit={handleOpenUnitDialog}
                            isCollapsed={collapsedBlocks[block.id]}
                            onToggleCollapse={() => toggleBlockCollapse(block.id)}
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
                                                              onEdit={(lesson: Lesson) => handleOpenLessonDialog(topic.id, lesson)}
                                                              onDelete={(id: string) => handleDeleteLesson(topic.id, id)}
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openBlockDialog} onClose={handleCloseBlockDialog} maxWidth="sm" fullWidth>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBlockDialog}>Abbrechen</Button>
          <Button onClick={handleSaveBlock} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openUnitDialog} onClose={handleCloseUnitDialog} maxWidth="sm" fullWidth>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnitDialog}>Abbrechen</Button>
          <Button onClick={handleSaveUnit} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTopicDialog} onClose={handleCloseTopicDialog} maxWidth="sm" fullWidth>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTopicDialog}>Abbrechen</Button>
          <Button onClick={handleSaveTopic} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLessonDialog} onClose={handleCloseLessonDialog} maxWidth="sm" fullWidth>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLessonDialog}>Abbrechen</Button>
          <Button onClick={handleSaveLesson} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

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