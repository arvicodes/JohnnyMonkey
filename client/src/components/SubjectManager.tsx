import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Snackbar, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Storage as StorageIcon } from '@mui/icons-material';

interface Subject {
  id: string;
  name: string;
  description?: string;
}

interface Unit {
  id: string;
  name: string;
  description?: string;
  blockId: string;
}

interface Block {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
}

interface Lesson {
  id: string;
  name: string;
  description?: string;
  topicId: string;
}

interface Topic {
  id: string;
  name: string;
  description?: string;
  unitId: string;
}

interface SubjectManagerProps {
  teacherId: string;
}

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

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
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
      {subjects.map(subject => (
        <React.Fragment key={subject.id}>
          <Box
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
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700, color: '#0066cc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
              <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleOpenDialog(subject)}>✏️</IconButton>
              <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleDelete(subject.id)}>🗑️</IconButton>
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
              onClick={() => handleOpenBlockDialog(subject.id)}
            >
              ➕
            </IconButton>
          </Box>
          <Box sx={{ ml: 4, mb: 1 }}>
            {(blocks[subject.id] || []).map(block => (
              <React.Fragment key={block.id}>
                <Box
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
                  <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
                    <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleOpenBlockDialog(subject.id, block)}>✏️</IconButton>
                    <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleDeleteBlock(subject.id, block.id)}>🗑️</IconButton>
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
                    onClick={() => handleOpenUnitDialog(block.id)}
                  >
                    ➕
                  </IconButton>
                </Box>
                <Box sx={{ ml: 4, mb: 1 }}>
                  {(units[block.id] || []).map(unit => (
                    <React.Fragment key={unit.id}>
                      <Box
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
                        <Typography variant="body2" sx={{ flex: 1, fontStyle: 'italic', color: '#3a4a5d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{unit.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
                          <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleOpenUnitDialog(block.id, unit)}>✏️</IconButton>
                          <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleDeleteUnit(block.id, unit.id)}>🗑️</IconButton>
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
                          onClick={() => handleOpenTopicDialog(unit.id)}
                        >
                          ➕
                        </IconButton>
                      </Box>
                      <Box sx={{ ml: 4, mb: 1 }}>
                        {(topics[unit.id] || []).map(topic => (
                          <React.Fragment key={topic.id}>
                            <Box
                              sx={{
                                mb: 1,
                                borderRadius: 2,
                                background: '#f7fbff',
                                border: 'none',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                display: 'flex',
                                alignItems: 'center',
                                minHeight: 32,
                                px: 2,
                                py: 0.2,
                                borderLeft: '4px solid #d0e6f7',
                                fontStyle: 'italic',
                                color: '#6a7a8c',
                                position: 'relative',
                                '&:hover .plus-btn': { display: 'inline-flex' }
                              }}
                            >
                              <Typography variant="body2" sx={{ flex: 1, fontStyle: 'italic', color: '#6a7a8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topic.name}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
                                <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleOpenTopicDialog(unit.id, topic)}>✏️</IconButton>
                                <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleDeleteTopic(unit.id, topic.id)}>🗑️</IconButton>
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
                                onClick={() => handleOpenLessonDialog(topic.id)}
                              >
                                ➕
                              </IconButton>
                            </Box>
                            <Box sx={{ ml: 4, mb: 1 }}>
                              {(lessons[topic.id] || []).map(lesson => (
                                <Box key={lesson.id} sx={{
                                  mb: 0.5,
                                  borderRadius: 2,
                                  background: '#fafdff',
                                  border: 'none',
                                  boxShadow: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  minHeight: 28,
                                  px: 2,
                                  py: 0.1,
                                  borderLeft: '4px solid #e0e7ef',
                                  fontStyle: 'italic',
                                  color: '#8a99a8'
                                }}>
                                  <Typography variant="body2" sx={{ flex: 1, fontStyle: 'italic', color: '#8a99a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.name}</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, mr: 8 }}>
                                    <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleOpenLessonDialog(topic.id, lesson)}>✏️</IconButton>
                                    <IconButton size="small" sx={{ color: '#3399ff', borderRadius: 1, width: 28, height: 28, p: 0.5, '&:hover': { bgcolor: '#e3f0fc', borderRadius: 1 } }} onClick={() => handleDeleteLesson(topic.id, lesson.id)}>🗑️</IconButton>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          </React.Fragment>
                        ))}
                      </Box>
                    </React.Fragment>
                  ))}
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </React.Fragment>
      ))}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{editSubject ? 'Fach bearbeiten' : 'Neues Fach anlegen'}</DialogTitle>
        <DialogContent>
          <TextField 
            label="Fachname" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            fullWidth 
            sx={{ mb: 2 }}
            inputRef={nameInputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
          <TextField 
            label="Beschreibung" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            fullWidth 
            multiline 
            minRows={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSave();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openBlockDialog} onClose={handleCloseBlockDialog}>
        <DialogTitle>{editBlock ? 'Block bearbeiten' : 'Neuen Block anlegen'}</DialogTitle>
        <DialogContent>
          <TextField 
            label="Blockname" 
            value={blockName} 
            onChange={e => setBlockName(e.target.value)} 
            fullWidth 
            sx={{ mb: 2 }}
            inputRef={blockNameInputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveBlock();
              }
            }}
          />
          <TextField 
            label="Beschreibung" 
            value={blockDescription} 
            onChange={e => setBlockDescription(e.target.value)} 
            fullWidth 
            multiline 
            minRows={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSaveBlock();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBlockDialog}>Abbrechen</Button>
          <Button onClick={handleSaveBlock} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openUnitDialog} onClose={handleCloseUnitDialog}>
        <DialogTitle>{editUnit ? 'Unterrichtsreihe bearbeiten' : 'Neue Unterrichtsreihe anlegen'}</DialogTitle>
        <DialogContent>
          <TextField 
            label="Name der Unterrichtsreihe" 
            value={unitName} 
            onChange={e => setUnitName(e.target.value)} 
            fullWidth 
            sx={{ mb: 2 }}
            inputRef={unitNameInputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveUnit();
              }
            }}
          />
          <TextField 
            label="Beschreibung" 
            value={unitDescription} 
            onChange={e => setUnitDescription(e.target.value)} 
            fullWidth 
            multiline 
            minRows={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSaveUnit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnitDialog}>Abbrechen</Button>
          <Button onClick={handleSaveUnit} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openTopicDialog} onClose={handleCloseTopicDialog}>
        <DialogTitle>{editTopic ? 'Thema bearbeiten' : 'Neues Thema anlegen'}</DialogTitle>
        <DialogContent>
          <TextField 
            label="Themenname" 
            value={topicName} 
            onChange={e => setTopicName(e.target.value)} 
            fullWidth 
            sx={{ mb: 2 }}
            inputRef={topicNameInputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveTopic();
              }
            }}
          />
          <TextField 
            label="Beschreibung" 
            value={topicDescription} 
            onChange={e => setTopicDescription(e.target.value)} 
            fullWidth 
            multiline 
            minRows={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSaveTopic();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTopicDialog}>Abbrechen</Button>
          <Button onClick={handleSaveTopic} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openLessonDialog} onClose={handleCloseLessonDialog}>
        <DialogTitle>{editLesson ? 'Stunde bearbeiten' : 'Neue Stunde anlegen'}</DialogTitle>
        <DialogContent>
          <TextField 
            label="Stundenname" 
            value={lessonName} 
            onChange={e => setLessonName(e.target.value)} 
            fullWidth 
            sx={{ mb: 2 }}
            inputRef={lessonNameInputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveLesson();
              }
            }}
          />
          <TextField 
            label="Beschreibung" 
            value={lessonDescription} 
            onChange={e => setLessonDescription(e.target.value)} 
            fullWidth 
            multiline 
            minRows={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSaveLesson();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLessonDialog}>Abbrechen</Button>
          <Button onClick={handleSaveLesson} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SubjectManager; 