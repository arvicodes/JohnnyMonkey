import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Bookmark as BookmarkIcon,
  BookmarkAdd as BookmarkAddIcon,
  Class as ClassIcon,
  DeleteOutline as DeleteOutlineIcon,
  History as HistoryIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  copyTaskIdsToLaterSection,
  createCustomTask,
  createLessonSection,
  customSetReihePaths,
  ensureSpecialLessonSections,
  isGeneralLessonSection,
  isLaterLessonSection,
  laterSectionContainsTask,
  mergeDiscoveredLessonsIntoSet,
  parseEntryTicketCardList,
  sortLessonsChronologically,
  withCustomSetReihePaths,
  type EntryTicketCustomSet,
  type EntryTicketCustomTask,
  type EntryTicketLessonSection,
} from '../../lib/entryTicketCustomSets';
import {
  discoverLessonsForCustomSet,
  loadEntryTicketReihenCatalog,
} from '../../lib/entryTicketReiheLessons';
import { reiheLabelFromPath, type WorkingReiheOption } from '../../lib/dashboardWorkingReihen';
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

const LATER_PALETTE = {
  bg: '#fff8e1',
  border: '#ffcc02',
  title: '#e65100',
  chip: '#fb8c00',
  soft: '#ffe082',
} as const;

type Props = {
  set: EntryTicketCustomSet;
  activeLessonPath?: string | null;
  onChange: (next: EntryTicketCustomSet) => void;
  onRename: (name: string) => void;
  onDeleteSet: () => void;
  /** Wie oft die Karte schon im Play gezeigt wurde (sourceKey → count). */
  showCounts?: Record<string, number>;
  /** z. B. „47 Fragen im Set · Spiel: 10“ — rechts neben dem Namen. */
  playSourceLabel?: string | null;
  onOpenHistory?: () => void;
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
  const ordered = sortLessonsChronologically(lessons);
  const groups: TopicGroup[] = [];
  const topicIndex = new Map<string, number>();
  for (let i = 0; i < ordered.length; i += 1) {
    const lesson = ordered[i];
    const topic = isGeneralLessonSection(lesson)
      ? 'Allgemein'
      : isLaterLessonSection(lesson)
        ? 'Für später'
        : lesson.topicName?.trim() || 'Stunden';
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
  playSourceLabel,
  onOpenHistory,
}: Props) {
  const [nameDraft, setNameDraft] = useState(set.name);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const lesson of set.lessons) {
      init[lesson.id] = lessonMatchesPath(lesson, activeLessonPath);
    }
    return init;
  });
  const [newLessonName, setNewLessonName] = useState('');
  const [listDraftByLesson, setListDraftByLesson] = useState<Record<string, string>>({});
  /** Markierte Karten pro Stunde (taskIds). */
  const [selectedTaskIdsByLesson, setSelectedTaskIdsByLesson] = useState<Record<string, string[]>>({});
  const [reiheOptions, setReiheOptions] = useState<WorkingReiheOption[]>([]);
  const [reiheOptionsLoading, setReiheOptionsLoading] = useState(false);
  const [reiheBusy, setReiheBusy] = useState(false);
  const catalogRequestedRef = useRef(false);

  useEffect(() => {
    setNameDraft(set.name);
  }, [set.id, set.name]);

  const ensureReihenCatalog = () => {
    if (catalogRequestedRef.current) return;
    catalogRequestedRef.current = true;
    setReiheOptionsLoading(true);
    void loadEntryTicketReihenCatalog(customSetReihePaths(set))
      .then(setReiheOptions)
      .finally(() => setReiheOptionsLoading(false));
  };

  const assignedReihePaths = customSetReihePaths(set);
  const catalogOptions = useMemo(() => {
    const byPath = new Map(reiheOptions.map((o) => [o.path, o]));
    for (const path of assignedReihePaths) {
      if (!byPath.has(path)) {
        byPath.set(path, { path, label: reiheLabelFromPath(path) });
      }
    }
    return Array.from(byPath.values());
  }, [assignedReihePaths, reiheOptions]);
  const selectedReihen = useMemo(
    () =>
      assignedReihePaths
        .map((path) => catalogOptions.find((o) => o.path === path))
        .filter((o): o is WorkingReiheOption => Boolean(o)),
    [assignedReihePaths, catalogOptions],
  );

  const applyReihePaths = async (paths: string[]) => {
    const next = withCustomSetReihePaths(set, paths);
    onChange(next);
    setReiheBusy(true);
    try {
      const discovered = await discoverLessonsForCustomSet(next);
      const merged = mergeDiscoveredLessonsIntoSet(next, discovered);
      if (merged !== next) onChange(merged);
    } catch {
      /* ignore */
    } finally {
      setReiheBusy(false);
    }
  };

  // Bestehende Sets ohne „Allgemein“ / „Für später“ nachziehen (Laden sorgt i. d. R. schon dafür)
  useEffect(() => {
    const ensured = ensureSpecialLessonSections(set);
    if (ensured !== set) onChange(ensured);
    // nur beim Wechsel des Sets; sonst Risiko von Update-Schleifen
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set.id
  }, [set.id]);

  // Auswahl bereinigen, wenn Karten wegfallen / Stunde wechselt
  useEffect(() => {
    setSelectedTaskIdsByLesson((prev) => {
      let changed = false;
      const next: Record<string, string[]> = {};
      for (const lesson of set.lessons) {
        const valid = new Set(lesson.tasks.map((t) => t.id));
        const kept = (prev[lesson.id] || []).filter((id) => valid.has(id));
        if (kept.length > 0) next[lesson.id] = kept;
        if (kept.length !== (prev[lesson.id] || []).length) changed = true;
      }
      for (const id of Object.keys(prev)) {
        if (!set.lessons.some((l) => l.id === id) && (prev[id] || []).length > 0) changed = true;
      }
      return changed || Object.keys(prev).length !== Object.keys(next).length ? next : prev;
    });
  }, [set.lessons]);

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
      init[lesson.id] = lessonMatchesPath(lesson, activeLessonPath);
    }
    setExpanded(init);
  }, [set.id]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const lesson of set.lessons) {
        if (next[lesson.id] === undefined) {
          next[lesson.id] = lessonMatchesPath(lesson, activeLessonPath);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [set.lessons]);

  const topicGroups = useMemo(() => groupLessonsByTopic(set.lessons), [set.lessons]);
  const displayGroups = useMemo(() => {
    const generalGroup = topicGroups.find((g) => /^allgemein$/i.test(g.topic));
    const laterGroup = topicGroups.find((g) => /^für später$/i.test(g.topic));
    const hourGroups = topicGroups.filter(
      (g) => !/^allgemein$/i.test(g.topic) && !/^für später$/i.test(g.topic),
    );
    const rows: Array<{
      key: string;
      topic: string;
      lessons: TopicGroup['lessons'];
      special?: boolean;
    }> = [];
    const specialLessons = [...(generalGroup?.lessons || []), ...(laterGroup?.lessons || [])];
    if (specialLessons.length > 0) {
      rows.push({ key: '__special__', topic: '', lessons: specialLessons, special: true });
    }
    for (const g of hourGroups) {
      rows.push({ key: g.topic, topic: g.topic, lessons: g.lessons });
    }
    return rows;
  }, [topicGroups]);

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
    if (isGeneralLessonSection(lesson)) {
      window.alert('„Allgemein“ kann nicht gelöscht werden — dort liegen klassenübergreifende Karten vor der ersten Stunde.');
      return;
    }
    if (isLaterLessonSection(lesson)) {
      window.alert('„Für später“ kann nicht gelöscht werden — einzelne Karten kannst du dort entfernen.');
      return;
    }
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
    setSelectedTaskIdsByLesson((prev) => {
      const kept = (prev[lessonId] || []).filter((id) => id !== taskId);
      if (kept.length === (prev[lessonId] || []).length) return prev;
      const next = { ...prev };
      if (kept.length === 0) delete next[lessonId];
      else next[lessonId] = kept;
      return next;
    });
  };

  const toggleTaskSelected = (lessonId: string, taskId: string) => {
    setSelectedTaskIdsByLesson((prev) => {
      const cur = prev[lessonId] || [];
      const has = cur.includes(taskId);
      const kept = has ? cur.filter((id) => id !== taskId) : [...cur, taskId];
      const next = { ...prev };
      if (kept.length === 0) delete next[lessonId];
      else next[lessonId] = kept;
      return next;
    });
  };

  const setAllTasksSelected = (lessonId: string, taskIds: string[], selected: boolean) => {
    setSelectedTaskIdsByLesson((prev) => {
      const next = { ...prev };
      if (!selected || taskIds.length === 0) delete next[lessonId];
      else next[lessonId] = [...taskIds];
      return next;
    });
  };

  const deleteSelectedTasks = (lessonId: string) => {
    const selected = selectedTaskIdsByLesson[lessonId] || [];
    if (selected.length === 0) return;
    const lesson = set.lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    if (
      !window.confirm(
        `${selected.length} markierte Karte${selected.length === 1 ? '' : 'n'} in „${lesson.lessonName}“ löschen?`,
      )
    ) {
      return;
    }
    const remove = new Set(selected);
    updateLessons(
      set.lessons.map((l) => {
        if (l.id !== lessonId) return l;
        return { ...l, tasks: l.tasks.filter((t) => !remove.has(t.id)) };
      }),
    );
    setSelectedTaskIdsByLesson((prev) => {
      const next = { ...prev };
      delete next[lessonId];
      return next;
    });
  };

  const copySelectedTasksToLater = (lessonId: string) => {
    const selected = selectedTaskIdsByLesson[lessonId] || [];
    if (selected.length === 0) return;
    const lesson = set.lessons.find((l) => l.id === lessonId);
    if (!lesson || isLaterLessonSection(lesson)) return;
    const next = copyTaskIdsToLaterSection(set, lessonId, selected);
    if (next !== set) {
      const later = next.lessons.find(isLaterLessonSection);
      if (later) setExpanded((prev) => ({ ...prev, [later.id]: true }));
      onChange(next);
    }
  };

  const copyTaskToLater = (lessonId: string, taskId: string) => {
    const lesson = set.lessons.find((l) => l.id === lessonId);
    if (!lesson || isLaterLessonSection(lesson)) return;
    const next = copyTaskIdsToLaterSection(set, lessonId, [taskId]);
    if (next !== set) {
      const later = next.lessons.find(isLaterLessonSection);
      if (later) setExpanded((prev) => ({ ...prev, [later.id]: true }));
      onChange(next);
    }
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
      {/* Name links, Historie Mitte, Kartenzahl rechts */}
      <Box
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 0.75,
          px: 0.75,
          py: 0.45,
          borderBottom: `1.5px solid ${ET.border}`,
          bgcolor: '#f5f5f5',
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
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
            placeholder="Set-Name"
            sx={{
              ...fieldSx,
              width: 168,
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
                color: ET.muted,
                '&:hover': { color: '#c62828', bgcolor: 'rgba(198,40,40,0.08)' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
        {onOpenHistory ? (
          <Tooltip title="Historie">
            <IconButton
              size="small"
              onClick={onOpenHistory}
              aria-label="Historie"
              sx={{
                ...iconBtnSx,
                width: 26,
                height: 26,
                color: ET.accent,
                '&:hover': { bgcolor: 'rgba(69,90,100,0.1)' },
              }}
            >
              <HistoryIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Box />
        )}
        {playSourceLabel ? (
          <Typography
            sx={{
              minWidth: 0,
              color: '#546e7a',
              fontSize: '0.72rem',
              fontWeight: 600,
              textAlign: 'right',
              lineHeight: 1.25,
            }}
          >
            {playSourceLabel}
          </Typography>
        ) : (
          <Box />
        )}
      </Box>

      <Box
        sx={{
          width: '100%',
          px: 0.6,
          pt: 0.55,
          pb: 0,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0.55,
        }}
      >
        <TextField
          size="small"
          multiline
          minRows={2}
          maxRows={5}
          value={set.notes || ''}
          onChange={(e) =>
            onChange({
              ...set,
              notes: e.target.value.slice(0, 4000),
            })
          }
          placeholder="Notizen nur für dich (nicht sichtbar für SuS)…"
          sx={{
            ...fieldSx,
            flex: 1,
            minWidth: 0,
            '& .MuiOutlinedInput-root': {
              ...fieldSx['& .MuiOutlinedInput-root'],
              bgcolor: '#fffde7',
              '& fieldset': { borderColor: '#fff59d' },
              '&:hover fieldset': { borderColor: '#fbc02d' },
              '&.Mui-focused fieldset': { borderColor: '#f9a825' },
            },
            '& .MuiInputBase-input': {
              ...fieldSx['& .MuiInputBase-input'],
              fontSize: '0.72rem',
              lineHeight: 1.35,
              color: '#000',
            },
            '& textarea': { color: '#000' },
          }}
          inputProps={{ 'aria-label': 'Persönliche Notizen zum Fragenset' }}
        />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 0.45 }}>
          <Autocomplete
            multiple
            size="small"
            disableClearable
            disableCloseOnSelect
            options={catalogOptions}
            value={selectedReihen}
            loading={reiheOptionsLoading || reiheBusy}
            onOpen={ensureReihenCatalog}
            onChange={(_, next) => {
              void applyReihePaths(next.map((o) => o.path));
            }}
            isOptionEqualToValue={(a, b) => a.path === b.path}
            getOptionLabel={(o) => o.label || reiheLabelFromPath(o.path)}
            renderTags={() => null}
            renderOption={(props, option, { selected }) => {
              const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & {
                key?: React.Key;
              };
              return (
                <li
                  key={key}
                  {...rest}
                  style={{
                    ...((rest as { style?: React.CSSProperties }).style || {}),
                    opacity: selected ? 0.55 : 1,
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {option.label}
                  {option.subject ? (
                    <Typography
                      component="span"
                      sx={{ ml: 1, fontSize: '0.7rem', color: 'text.secondary' }}
                    >
                      {option.subject}
                    </Typography>
                  ) : null}
                  {selected ? (
                    <Typography
                      component="span"
                      sx={{ ml: 1, fontSize: '0.7rem', color: 'text.secondary' }}
                    >
                      · gewählt
                    </Typography>
                  ) : null}
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Reihe…"
                inputProps={{
                  ...params.inputProps,
                  'aria-label': 'Unterrichtsreihen zum Kartenset',
                }}
              />
            )}
            sx={{
              width: '100%',
              '& .MuiInputBase-root': {
                fontSize: '0.72rem',
                minHeight: 32,
                py: 0.15,
                pr: '32px !important',
              },
              '& .MuiAutocomplete-endAdornment': {
                right: 4,
              },
              '& .MuiAutocomplete-popupIndicator': {
                p: 0.25,
              },
              '& .MuiAutocomplete-clearIndicator': {
                display: 'none',
              },
            }}
          />
          {selectedReihen.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mt: 0.35 }}>
              {selectedReihen.map((option) => (
                <Chip
                  key={option.path}
                  size="small"
                  label={option.label}
                  onDelete={() => {
                    void applyReihePaths(
                      selectedReihen.filter((o) => o.path !== option.path).map((o) => o.path),
                    );
                  }}
                  sx={{
                    height: 20,
                    fontWeight: 700,
                    fontSize: '0.62rem',
                    bgcolor: '#e8f5e9',
                    color: '#2e7d32',
                    '& .MuiChip-deleteIcon': { fontSize: 13, color: '#66bb6a' },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ width: '100%', p: 0.6, display: 'grid', gap: 0.55, boxSizing: 'border-box' }}>
        {set.lessons.length === 0 && (
          <Typography sx={{ color: ET.muted, fontSize: '0.75rem', textAlign: 'center', py: 1.25 }}>
            Noch keine Stunden — Reihenname prüfen oder unten ergänzen.
          </Typography>
        )}

        {displayGroups.map((group, groupIndex) => {
          const accent = LESSON_PALETTES[groupIndex % LESSON_PALETTES.length];
          const nextAccent = LESSON_PALETTES[(groupIndex + 4) % LESSON_PALETTES.length];
          const isSpecialRow = Boolean(group.special);
          const isFirstHourGroup =
            !isSpecialRow && displayGroups.findIndex((g) => !g.special) === groupIndex;
          return (
            <Box key={group.key} sx={{ width: '100%', boxSizing: 'border-box', display: 'grid', gap: 0.45 }}>
              {groupIndex > 0 && !isSpecialRow && (
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
              {!isSpecialRow && (isFirstHourGroup || Boolean(group.topic.trim())) && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  width: 'fit-content',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: accent.bg,
                  border: `1px solid ${accent.border}`,
                  color: accent.title,
                }}
              >
                <ClassIcon sx={{ fontSize: 13 }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.7rem', lineHeight: 1.2 }}>
                  {isFirstHourGroup && !group.topic.trim() ? 'Stunden' : group.topic}
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
                const isOpen = expanded[lesson.id] === true;
                const isActive = lessonMatchesPath(lesson, activeLessonPath);
                const isGeneral = isGeneralLessonSection(lesson);
                const isLater = isLaterLessonSection(lesson);
                const palette = isLater ? LATER_PALETTE : LESSON_PALETTES[globalIndex % LESSON_PALETTES.length];
                const selectedIds = selectedTaskIdsByLesson[lesson.id] || [];
                const allTaskIds = lesson.tasks.map((t) => t.id);
                const allSelected =
                  allTaskIds.length > 0 && allTaskIds.every((id) => selectedIds.includes(id));
                const someSelected = selectedIds.length > 0 && !allSelected;

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
                        {isLater ? (
                          <BookmarkIcon sx={{ fontSize: 12 }} />
                        ) : isGeneral ? (
                          'A'
                        ) : (
                          <ClassIcon sx={{ fontSize: 12 }} />
                        )}
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
                      {selectedIds.length > 0 && !isLater && (
                        <Tooltip title={`${selectedIds.length} markierte Karte${selectedIds.length === 1 ? '' : 'n'} nach „Für später“ kopieren`}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              copySelectedTasksToLater(lesson.id);
                            }}
                            aria-label="Markierte Karten nach Für später kopieren"
                            sx={{
                              ...iconBtnSx,
                              width: 'auto',
                              minWidth: 22,
                              px: 0.45,
                              borderRadius: 0.75,
                              bgcolor: '#fff8e1',
                              border: '1px solid #ffcc02',
                              color: '#e65100',
                              '&:hover': { bgcolor: '#ffe082' },
                            }}
                          >
                            <BookmarkAddIcon sx={{ fontSize: 14 }} />
                            <Typography component="span" sx={{ fontSize: '0.58rem', fontWeight: 800, ml: 0.2 }}>
                              {selectedIds.length}
                            </Typography>
                          </IconButton>
                        </Tooltip>
                      )}
                      {selectedIds.length > 0 && (
                        <Tooltip title={`${selectedIds.length} markierte Karten löschen`}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSelectedTasks(lesson.id);
                            }}
                            aria-label="Markierte Karten löschen"
                            sx={{
                              ...iconBtnSx,
                              width: 'auto',
                              minWidth: 22,
                              px: 0.45,
                              borderRadius: 0.75,
                              bgcolor: '#ffebee',
                              border: '1px solid #ef9a9a',
                              color: '#c62828',
                              '&:hover': { bgcolor: '#ffcdd2' },
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                            <Typography component="span" sx={{ fontSize: '0.58rem', fontWeight: 800, ml: 0.2 }}>
                              {selectedIds.length}
                            </Typography>
                          </IconButton>
                        </Tooltip>
                      )}
                      {!isGeneral && !isLater && (
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
                              ml: selectedIds.length > 0 ? 0 : 'auto',
                              color: ET.muted,
                              '&:hover': { color: '#c62828', bgcolor: 'rgba(198,40,40,0.08)' },
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    <Collapse in={isOpen} unmountOnExit>
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

                        {lesson.tasks.length === 0 && (
                          <Typography sx={{ color: ET.muted, fontSize: '0.65rem', px: 0.15 }}>
                            {isLater
                              ? 'Noch keine Karten — über das Lesezeichen an einer Karte hierher kopieren.'
                              : (
                                <>
                                  Noch keine Karten — Liste oben: <strong>Frage; Antwort</strong>
                                </>
                              )}
                          </Typography>
                        )}

                        {lesson.tasks.length > 0 && (
                          <Box
                            sx={{
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: '22px 28px minmax(0, 1fr) minmax(0, 1fr) 22px 22px',
                              gap: 0.4,
                              alignItems: 'center',
                              boxSizing: 'border-box',
                            }}
                          >
                            <Tooltip title={allSelected ? 'Auswahl aufheben' : 'Alle Karten markieren'}>
                              <Checkbox
                                size="small"
                                checked={allSelected}
                                indeterminate={someSelected}
                                onChange={(e) =>
                                  setAllTasksSelected(lesson.id, allTaskIds, e.target.checked)
                                }
                                inputProps={{ 'aria-label': 'Alle Karten dieser Stunde markieren' }}
                                sx={{
                                  p: 0.15,
                                  color: palette.chip,
                                  '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: palette.title },
                                }}
                              />
                            </Tooltip>
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
                            <Box />
                          </Box>
                        )}

                        {lesson.tasks.map((task, taskIndex) => {
                          const countKey = `c:${set.id}:${task.id}`;
                          const shown = showCounts?.[countKey] || 0;
                          const tone = entryTicketShowCountStyle(shown, maxShowCount);
                          const isSelected = selectedIds.includes(task.id);
                          const alreadyLater = isLater || laterSectionContainsTask(set, task);
                          return (
                          <Box
                            key={task.id}
                            sx={{
                              position: 'relative',
                              width: '100%',
                              display: 'grid',
                              gridTemplateColumns: '22px 28px minmax(0, 1fr) minmax(0, 1fr) 22px 22px',
                              gap: 0.4,
                              alignItems: 'start',
                              boxSizing: 'border-box',
                              borderRadius: 0.75,
                              outline: isSelected ? `1.5px solid ${palette.chip}` : 'none',
                              outlineOffset: 0,
                              bgcolor: isSelected ? `${palette.chip}10` : 'transparent',
                            }}
                          >
                            <Checkbox
                              size="small"
                              checked={isSelected}
                              onChange={() => toggleTaskSelected(lesson.id, task.id)}
                              inputProps={{ 'aria-label': `Karte ${taskIndex + 1} markieren` }}
                              sx={{
                                p: 0.15,
                                mt: 0.35,
                                color: palette.chip,
                                '&.Mui-checked': { color: palette.title },
                              }}
                            />
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
                            {isLater ? (
                              <Box />
                            ) : (
                              <Tooltip
                                title={
                                  alreadyLater
                                    ? 'Bereits in „Für später“'
                                    : 'Nach „Für später“ kopieren'
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => copyTaskToLater(lesson.id, task.id)}
                                    disabled={alreadyLater}
                                    aria-label="Nach Für später kopieren"
                                    sx={{
                                      ...iconBtnSx,
                                      mt: 0.35,
                                      color: alreadyLater ? '#fb8c00' : ET.muted,
                                      '&:hover': { color: '#e65100', bgcolor: 'rgba(251,140,0,0.12)' },
                                      '&.Mui-disabled': { color: '#fb8c00', opacity: 1 },
                                    }}
                                  >
                                    {alreadyLater ? (
                                      <BookmarkIcon sx={{ fontSize: 14 }} />
                                    ) : (
                                      <BookmarkAddIcon sx={{ fontSize: 14 }} />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
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
