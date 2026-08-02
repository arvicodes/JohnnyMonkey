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
  createCustomTask,
  createLessonSection,
  parseEntryTicketCardList,
  type EntryTicketCustomSet,
  type EntryTicketCustomTask,
  type EntryTicketLessonSection,
} from '../../lib/entryTicketCustomSets';
import { entryTicketShowCountStyle } from '../../lib/entryTicketRichText';
import { EntryTicketRichField } from './EntryTicketRichField';

/** Passend zum EntryTicket, dezent bunt. */
const ET = {
  ink: '#263238',
  accent: '#455a64',
  accentSoft: '#78909c',
  border: '#cfd8dc',
  surface: '#fafafa',
  white: '#ffffff',
  muted: '#78909c',
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

/** Sanfte Stunden-Farben (ohne Blau) */
const LESSON_PALETTES = [
  { bg: '#f5f5f5', border: '#bdbdbd', title: '#424242', chip: '#616161', soft: '#e0e0e0' },
  { bg: '#e8f5e9', border: '#81c784', title: '#2e7d32', chip: '#43a047', soft: '#c8e6c9' },
  { bg: '#fff3e0', border: '#ffb74d', title: '#ef6c00', chip: '#fb8c00', soft: '#ffe0b2' },
  { bg: '#f3e5f5', border: '#ce93d8', title: '#6a1b9a', chip: '#ab47bc', soft: '#e1bee7' },
  { bg: '#efebe9', border: '#a1887f', title: '#5d4037', chip: '#795548', soft: '#d7ccc8' },
  { bg: '#fce4ec', border: '#f48fb1', title: '#ad1457', chip: '#ec407a', soft: '#f8bbd0' },
  { bg: '#e0f2f1', border: '#80cbc4', title: '#00695c', chip: '#26a69a', soft: '#b2dfdb' },
  { bg: '#fff8e1', border: '#ffe082', title: '#f9a825', chip: '#fbc02d', soft: '#ffecb3' },
  { bg: '#f1f8e9', border: '#aed581', title: '#558b2f', chip: '#8bc34a', soft: '#dcedc8' },
  { bg: '#fbe9e7', border: '#ffab91', title: '#d84315', chip: '#ff7043', soft: '#ffccbc' },
  { bg: '#eceff1', border: '#90a4ae', title: '#455a64', chip: '#607d8b', soft: '#cfd8dc' },
  { bg: '#e8f5e9', border: '#66bb6a', title: '#1b5e20', chip: '#43a047', soft: '#c8e6c9' },
];

type Props = {
  set: EntryTicketCustomSet;
  activeLessonPath?: string | null;
  onChange: (next: EntryTicketCustomSet) => void;
  onRename: (name: string) => void;
  onDeleteSet: () => void;
  /** Wie oft die Karte schon im Play gezeigt wurde (sourceKey → count). */
  showCounts?: Record<string, number>;
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
  showCounts,
}: Props) {
  const [nameDraft, setNameDraft] = useState(set.name);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const lesson of set.lessons) {
      init[lesson.id] = true;
    }
    return init;
  });
  const [newLessonName, setNewLessonName] = useState('');
  const [listDraftByLesson, setListDraftByLesson] = useState<Record<string, string>>({});

  useEffect(() => {
    setNameDraft(set.name);
  }, [set.id, set.name]);

  const maxShowCount = useMemo(() => {
    if (!showCounts) return 0;
    let max = 0;
    for (const lesson of set.lessons) {
      for (const task of lesson.tasks) {
        const n = showCounts[`c:${set.id}:${task.id}`] || 0;
        if (n > max) max = n;
      }
    }
    return max;
  }, [showCounts, set.id, set.lessons]);

  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const lesson of set.lessons) {
      init[lesson.id] = true;
    }
    setExpanded(init);
  }, [set.id]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const lesson of set.lessons) {
        if (next[lesson.id] === undefined) {
          next[lesson.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [set.lessons]);

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
        mt: 0,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        borderRadius: 1.5,
        border: `1.5px solid ${ET.border}`,
        bgcolor: ET.white,
        overflow: 'hidden',
        boxShadow: 'none',
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
          borderBottom: `2.5px solid ${ET.accent}`,
          bgcolor: '#f5f5f5',
          boxSizing: 'border-box',
        }}
      >
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
              {!/^eigen\b/i.test(group.topic.trim()) && (
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
              )}

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

                        {lesson.tasks.length > 0 && (
                          <Box
                            sx={{
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: '28px minmax(0, 1fr) minmax(0, 1fr) 22px',
                              gap: 0.4,
                              boxSizing: 'border-box',
                            }}
                          >
                            <Box />
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                letterSpacing: 0.04,
                                textTransform: 'uppercase',
                                color: '#e65100',
                                bgcolor: '#ffe0b2',
                                border: '2px solid #ef6c00',
                                borderRadius: 0.75,
                                px: 0.6,
                                py: 0.2,
                                textAlign: 'center',
                              }}
                            >
                              Frage
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                letterSpacing: 0.04,
                                textTransform: 'uppercase',
                                color: '#1b5e20',
                                bgcolor: '#c8e6c9',
                                border: '2px solid #2e7d32',
                                borderRadius: 0.75,
                                px: 0.6,
                                py: 0.2,
                                textAlign: 'center',
                              }}
                            >
                              Antwort
                            </Typography>
                            <Box />
                          </Box>
                        )}

                        {lesson.tasks.map((task, taskIndex) => {
                          const countKey = `c:${set.id}:${task.id}`;
                          const shown = showCounts?.[countKey] || 0;
                          const tone = entryTicketShowCountStyle(shown, maxShowCount);
                          return (
                          <Box
                            key={task.id}
                            sx={{
                              position: 'relative',
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: '28px minmax(0, 1fr) minmax(0, 1fr) 22px',
                              gap: 0.4,
                              alignItems: 'start',
                              boxSizing: 'border-box',
                            }}
                          >
                            <Typography
                              component="span"
                              title={`Schon ${shown}× gezeigt`}
                              sx={{
                                mt: 0.45,
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                lineHeight: 1.15,
                                color: tone.color,
                                bgcolor: tone.bgcolor,
                                textAlign: 'center',
                                fontVariantNumeric: 'tabular-nums',
                                px: 0.3,
                                py: 0.15,
                                borderRadius: 0.5,
                              }}
                            >
                              {shown}×
                            </Typography>
                            <EntryTicketRichField
                              value={task.prompt}
                              onChange={(prompt) => updateTask(lesson.id, task.id, { prompt })}
                              placeholder={`${taskIndex + 1}. Frage`}
                              tone="prompt"
                              minHeight={56}
                            />
                            <EntryTicketRichField
                              value={task.solution}
                              onChange={(solution) => updateTask(lesson.id, task.id, { solution })}
                              placeholder="Antwort / Lösung"
                              tone="answer"
                              minHeight={56}
                            />
                            <Tooltip title="Karte löschen">
                              <IconButton
                                size="small"
                                onClick={() => deleteTask(lesson.id, task.id)}
                                aria-label="Karte löschen"
                                sx={{
                                  ...iconBtnSx,
                                  mt: 0.35,
                                  color: ET.muted,
                                  '&:hover': { color: '#c62828', bgcolor: 'rgba(198,40,40,0.08)' },
                                }}
                              >
                                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          );
                        })}

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
                '&:hover': { bgcolor: 'rgba(69,90,100,0.06)', borderColor: ET.accentSoft },
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
