import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  countCustomSetTasks,
  createCustomTask,
  createLessonSection,
  parseEntryTicketCardList,
  type EntryTicketCustomSet,
  type EntryTicketCustomTask,
  type EntryTicketLessonSection,
} from '../../lib/entryTicketCustomSets';

/** Passend zum EntryTicket, dezent bunt. */
const ET = {
  ink: '#1a237e',
  accent: '#3949ab',
  accentSoft: '#5c6bc0',
  border: '#d9e0ff',
  surface: '#f8faff',
  white: '#ffffff',
  muted: '#5c6b8a',
} as const;

const iconBtnSx = {
  minWidth: 22,
  width: 22,
  height: 22,
  p: 0,
} as const;

const fieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    bgcolor: ET.white,
    '& fieldset': { borderColor: ET.border },
    '&:hover fieldset': { borderColor: ET.accentSoft },
    '&.Mui-focused fieldset': { borderColor: ET.accent },
  },
  '& .MuiInputBase-input': { py: 0.35, px: 0.75, fontSize: '0.78rem' },
} as const;

/** Sanfte Stunden-Farben */
const LESSON_PALETTES = [
  { bg: '#eef2ff', border: '#9fa8da', title: '#283593', chip: '#5c6bc0', soft: '#c5cae9' },
  { bg: '#e3f7fc', border: '#4fc3f7', title: '#0277bd', chip: '#039be5', soft: '#b3e5fc' },
  { bg: '#e8f5f1', border: '#4db6ac', title: '#00695c', chip: '#26a69a', soft: '#b2dfdb' },
  { bg: '#f3eef8', border: '#ba68c8', title: '#6a1b9a', chip: '#ab47bc', soft: '#e1bee7' },
  { bg: '#e8f1fb', border: '#64b5f6', title: '#1565c0', chip: '#42a5f5', soft: '#bbdefb' },
  { bg: '#fceef3', border: '#f06292', title: '#ad1457', chip: '#ec407a', soft: '#f8bbd0' },
  { bg: '#e5f7f8', border: '#4dd0e1', title: '#00838f', chip: '#26c6da', soft: '#b2ebf2' },
  { bg: '#eeedf7', border: '#7e57c2', title: '#4527a0', chip: '#7e57c2', soft: '#d1c4e9' },
  { bg: '#fff8e7', border: '#ffb74d', title: '#ef6c00', chip: '#ffa726', soft: '#ffe0b2' },
  { bg: '#f1f7e9', border: '#9ccc65', title: '#558b2f', chip: '#8bc34a', soft: '#dcedc8' },
  { bg: '#fff0ea', border: '#ff8a65', title: '#d84315', chip: '#ff7043', soft: '#ffccbc' },
  { bg: '#e8f4f2', border: '#4db6ac', title: '#00695c', chip: '#26a69a', soft: '#b2dfdb' },
];

type Props = {
  set: EntryTicketCustomSet;
  activeLessonPath?: string | null;
  onChange: (next: EntryTicketCustomSet) => void;
  onRename: (name: string) => void;
  onDeleteSet: () => void;
};

function lessonMatchesPath(lesson: EntryTicketLessonSection, lessonPath?: string | null): boolean {
  if (!lessonPath) return false;
  const want = lessonPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const wantName = want.split('/').pop() || '';
  if (lesson.lessonKey) {
    const key = lesson.lessonKey.replace(/\\/g, '/').replace(/\/+$/, '');
    if (key === want || key.endsWith(`/${wantName}`)) return true;
  }
  return lesson.lessonName.trim() === wantName;
}

type TopicGroup = {
  topic: string;
  lessons: Array<{ lesson: EntryTicketLessonSection; globalIndex: number }>;
};

function groupLessonsByTopic(lessons: EntryTicketLessonSection[]): TopicGroup[] {
  const groups: TopicGroup[] = [];
  const topicIndex = new Map<string, number>();
  for (let i = 0; i < lessons.length; i += 1) {
    const lesson = lessons[i];
    const topic = lesson.topicName?.trim() || 'Stunden';
    let gi = topicIndex.get(topic);
    if (gi === undefined) {
      gi = groups.length;
      topicIndex.set(topic, gi);
      groups.push({ topic, lessons: [] });
    }
    groups[gi].lessons.push({ lesson, globalIndex: i });
  }
  return groups;
}

export function EntryTicketFragensetEditor({
  set,
  activeLessonPath,
  onChange,
  onRename,
  onDeleteSet,
}: Props) {
  const [nameDraft, setNameDraft] = useState(set.name);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const lesson of set.lessons) {
      init[lesson.id] = lessonMatchesPath(lesson, activeLessonPath) || lesson.tasks.length === 0;
    }
    return init;
  });
  const [newLessonName, setNewLessonName] = useState('');
  const [listDraftByLesson, setListDraftByLesson] = useState<Record<string, string>>({});

  useEffect(() => {
    setNameDraft(set.name);
  }, [set.id, set.name]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const lesson of set.lessons) {
        if (next[lesson.id] === undefined) {
          next[lesson.id] = lessonMatchesPath(lesson, activeLessonPath) || lesson.tasks.length === 0;
        }
      }
      return next;
    });
  }, [set.lessons, activeLessonPath]);

  const totalQuestions = countCustomSetTasks(set);
  const topicGroups = useMemo(() => groupLessonsByTopic(set.lessons), [set.lessons]);

  const updateLessons = (lessons: EntryTicketLessonSection[]) => {
    onChange({ ...set, lessons });
  };

  const toggleLesson = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addLesson = () => {
    const name = newLessonName.trim() || `Stunde ${set.lessons.length + 1}`;
    const section = createLessonSection(name);
    updateLessons([...set.lessons, section]);
    setExpanded((prev) => ({ ...prev, [section.id]: true }));
    setNewLessonName('');
  };

  const deleteLesson = (lessonId: string) => {
    const lesson = set.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    if (
      lesson.tasks.length > 0 &&
      !window.confirm(`Stunde „${lesson.lessonName}“ mit ${lesson.tasks.length} Fragen löschen?`)
    ) {
      return;
    }
    updateLessons(set.lessons.filter((l) => l.id !== lessonId));
  };

  const addTasksFromList = (lessonId: string) => {
    const raw = listDraftByLesson[lessonId] || '';
    const parsed = parseEntryTicketCardList(raw);
    if (parsed.length === 0) return;
    const tasks = parsed.map((p) => createCustomTask(p.prompt, p.solution));
    updateLessons(
      set.lessons.map((l) => (l.id === lessonId ? { ...l, tasks: [...l.tasks, ...tasks] } : l)),
    );
    setListDraftByLesson((prev) => ({ ...prev, [lessonId]: '' }));
  };

  const updateTask = (lessonId: string, taskId: string, patch: Partial<EntryTicketCustomTask>) => {
    updateLessons(
      set.lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return { ...l, tasks: l.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) };
      }),
    );
  };

  const deleteTask = (lessonId: string, taskId: string) => {
    updateLessons(
      set.lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) };
      }),
    );
  };

  return (
    <Box
      sx={{
        mt: 0.75,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        borderRadius: 1.5,
        border: `1px solid ${ET.border}`,
        bgcolor: ET.surface,
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(26, 35, 126, 0.06)',
      }}
    >
      {/* Kopfzeile */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1,
          py: 0.55,
          borderBottom: `1px solid ${ET.border}`,
          bgcolor: 'rgba(57, 73, 171, 0.07)',
          boxSizing: 'border-box',
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.72rem',
            color: ET.ink,
            letterSpacing: 0.02,
            flexShrink: 0,
          }}
        >
          Fragenset
        </Typography>
        <TextField
          size="small"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const next = nameDraft.trim();
            if (next && next !== set.name) onRename(next);
            else setNameDraft(set.name);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Reihe"
          sx={{
            ...fieldSx,
            width: 148,
            flexShrink: 0,
            '& .MuiInputBase-input': { ...fieldSx['& .MuiInputBase-input'], fontWeight: 700, color: ET.ink },
          }}
        />
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.68rem',
            fontWeight: 650,
            color: ET.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {set.lessons.length} Std. · {totalQuestions} Karten · Play = vorherige Stunden
        </Typography>
        <Tooltip title="Fragenset löschen">
          <IconButton
            size="small"
            onClick={onDeleteSet}
            aria-label="Fragenset löschen"
            sx={{
              ...iconBtnSx,
              ml: 'auto',
              color: ET.muted,
              '&:hover': { color: '#c62828', bgcolor: 'rgba(198,40,40,0.08)' },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ width: '100%', p: 0.6, display: 'grid', gap: 0.55, boxSizing: 'border-box' }}>
        {set.lessons.length === 0 && (
          <Typography sx={{ color: ET.muted, fontSize: '0.75rem', textAlign: 'center', py: 1.25 }}>
            Noch keine Stunden — Reihenname prüfen oder unten ergänzen.
          </Typography>
        )}

        {topicGroups.map((group, groupIndex) => {
          const accent = LESSON_PALETTES[groupIndex % LESSON_PALETTES.length];
          const nextAccent = LESSON_PALETTES[(groupIndex + 4) % LESSON_PALETTES.length];
          return (
            <Box key={group.topic} sx={{ width: '100%', boxSizing: 'border-box', display: 'grid', gap: 0.45 }}>
              {groupIndex > 0 && (
                <Box
                  sx={{
                    width: '100%',
                    mt: 1.4,
                    mb: 0.4,
                    height: 3,
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${accent.chip}, ${accent.soft}, ${nextAccent.chip})`,
                    opacity: 0.9,
                  }}
                />
              )}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  width: 'fit-content',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: accent.bg,
                  border: `1px solid ${accent.border}`,
                  color: accent.title,
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', lineHeight: 1.2 }}>
                  {group.topic}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 0.5,
                  alignItems: 'start',
                  boxSizing: 'border-box',
                }}
              >
              {group.lessons.map(({ lesson, globalIndex }) => {
                const isOpen = expanded[lesson.id] !== false;
                const isActive = lessonMatchesPath(lesson, activeLessonPath);
                const palette = LESSON_PALETTES[globalIndex % LESSON_PALETTES.length];

                return (
                  <Box
                    key={lesson.id}
                    sx={{
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      borderRadius: 1.15,
                      border: `1.5px solid ${isActive ? palette.chip : palette.border}`,
                      bgcolor: palette.bg,
                      overflow: 'hidden',
                      boxShadow: isActive ? `0 0 0 2px ${palette.chip}22` : 'none',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.4,
                        px: 0.5,
                        py: 0.35,
                        cursor: 'pointer',
                        bgcolor: isActive ? `${palette.chip}16` : 'rgba(255,255,255,0.55)',
                        borderBottom: isOpen ? `1px solid ${palette.soft}` : 'none',
                        '&:hover': { bgcolor: `${palette.chip}12` },
                      }}
                      onClick={() => toggleLesson(lesson.id)}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLesson(lesson.id);
                        }}
                        aria-label={isOpen ? 'Zuklappen' : 'Aufklappen'}
                        sx={{ ...iconBtnSx, color: palette.chip }}
                      >
                        {isOpen ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                      <Box
                        sx={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 0.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: palette.chip,
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.6rem',
                        }}
                      >
                        {globalIndex + 1}
                      </Box>
                      <Typography
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          lineHeight: 1.2,
                          color: palette.title,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={lesson.lessonName}
                      >
                        {lesson.lessonName}
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: palette.title,
                          bgcolor: ET.white,
                          border: `1px solid ${palette.soft}`,
                          borderRadius: 0.75,
                          px: 0.55,
                          py: 0.1,
                          lineHeight: 1.3,
                        }}
                      >
                        {lesson.tasks.length}
                      </Typography>
                      <Tooltip title="Stunde löschen">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLesson(lesson.id);
                          }}
                          aria-label="Stunde löschen"
                          sx={{
                            ...iconBtnSx,
                            ml: 'auto',
                            color: ET.muted,
                            '&:hover': { color: '#c62828', bgcolor: 'rgba(198,40,40,0.08)' },
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Collapse in={isOpen}>
                      <Box
                        sx={{
                          width: '100%',
                          px: 0.6,
                          pb: 0.55,
                          pt: 0.25,
                          display: 'grid',
                          gap: 0.35,
                          bgcolor: 'rgba(255,255,255,0.82)',
                          borderTop: `1px solid ${palette.soft}`,
                          boxSizing: 'border-box',
                        }}
                      >
                        {lesson.tasks.length === 0 && (
                          <Typography sx={{ color: ET.muted, fontSize: '0.65rem', px: 0.15 }}>
                            Noch keine Karten — Liste: <strong>Frage; Antwort</strong>
                          </Typography>
                        )}

                        {lesson.tasks.map((task, taskIndex) => (
                          <Box
                            key={task.id}
                            sx={{
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 22px',
                              gap: 0.4,
                              alignItems: 'center',
                              boxSizing: 'border-box',
                            }}
                          >
                            <TextField
                              size="small"
                              value={task.prompt}
                              onChange={(e) => updateTask(lesson.id, task.id, { prompt: e.target.value })}
                              placeholder={`${taskIndex + 1}. Frage`}
                              sx={fieldSx}
                            />
                            <TextField
                              size="small"
                              value={task.solution}
                              onChange={(e) => updateTask(lesson.id, task.id, { solution: e.target.value })}
                              placeholder="Antwort"
                              sx={{
                                ...fieldSx,
                                '& .MuiOutlinedInput-root': {
                                  ...fieldSx['& .MuiOutlinedInput-root'],
                                  bgcolor: 'rgba(232, 245, 233, 0.55)',
                                },
                              }}
                            />
                            <Tooltip title="Karte löschen">
                              <IconButton
                                size="small"
                                onClick={() => deleteTask(lesson.id, task.id)}
                                aria-label="Karte löschen"
                                sx={{
                                  ...iconBtnSx,
                                  color: ET.muted,
                                  '&:hover': { color: '#c62828', bgcolor: 'rgba(198,40,40,0.08)' },
                                }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ))}

                        {(() => {
                          const listDraft = listDraftByLesson[lesson.id] || '';
                          const previewCount = parseEntryTicketCardList(listDraft).length;
                          return (
                            <Box
                              sx={{
                                width: '100%',
                                display: 'grid',
                                gridTemplateColumns: 'minmax(0, 1fr) 22px',
                                gap: 0.4,
                                alignItems: 'start',
                                boxSizing: 'border-box',
                              }}
                            >
                              <TextField
                                size="small"
                                multiline
                                minRows={2}
                                maxRows={8}
                                value={listDraft}
                                onChange={(e) =>
                                  setListDraftByLesson((prev) => ({
                                    ...prev,
                                    [lesson.id]: e.target.value,
                                  }))
                                }
                                placeholder={'Frage; Antwort\nNächste Frage; Nächste Antwort'}
                                sx={{
                                  ...fieldSx,
                                  '& .MuiInputBase-input': {
                                    ...fieldSx['& .MuiInputBase-input'],
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    lineHeight: 1.35,
                                  },
                                }}
                                onKeyDown={(e) => {
                                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    addTasksFromList(lesson.id);
                                  }
                                }}
                              />
                              <Tooltip title={previewCount > 0 ? `${previewCount} Karten übernehmen (⌘/Ctrl+Enter)` : 'Liste: Frage; Antwort'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => addTasksFromList(lesson.id)}
                                    disabled={previewCount === 0}
                                    aria-label="Karten aus Liste hinzufügen"
                                    sx={{
                                      ...iconBtnSx,
                                      mt: 0.35,
                                      bgcolor: palette.chip,
                                      color: '#fff',
                                      borderRadius: 0.75,
                                      '&:hover': { bgcolor: palette.title },
                                      '&.Mui-disabled': {
                                        bgcolor: palette.soft,
                                        color: 'rgba(255,255,255,0.85)',
                                      },
                                    }}
                                  >
                                    <AddIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Box>
                          );
                        })()}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
              </Box>
            </Box>
          );
        })}

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 22px',
            gap: 0.4,
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <TextField
            size="small"
            value={newLessonName}
            onChange={(e) => setNewLessonName(e.target.value)}
            placeholder="Weitere Stunde hinzufügen…"
            sx={fieldSx}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLesson();
              }
            }}
          />
          <Tooltip title="Stunde hinzufügen">
            <IconButton
              size="small"
              onClick={addLesson}
              aria-label="Stunde hinzufügen"
              sx={{
                ...iconBtnSx,
                border: `1px solid ${ET.border}`,
                color: ET.accent,
                borderRadius: 0.75,
                bgcolor: ET.white,
                '&:hover': { bgcolor: 'rgba(57,73,171,0.06)', borderColor: ET.accentSoft },
              }}
            >
              <AddIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
