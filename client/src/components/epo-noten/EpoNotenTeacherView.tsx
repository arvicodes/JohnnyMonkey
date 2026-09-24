import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListSubheader,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { apiDelete, apiGetSafe, apiPost, apiPut } from '../../lib/api';
import {
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenRound,
  allCategoriesSelected,
  assessmentModeForGroup,
  formatSuggestedGradeDisplay,
  minPointsThresholdForTotal,
  rasterResultFromTotal,
  type EpoNotenAssessmentMode,
  normalizeCategoryScores,
  shouldPrefillTeacherFromSelf,
  sumCategoryScores,
  teacherFormGradeFromEntry,
  teacherFormScoresFromEntry,
} from '../../lib/epoNotenShared';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import DualStudentAvatars from '../DualStudentAvatars';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
import { EpoNotenGradeTable } from './EpoNotenGradeTable';
import {
  epoNotenCardSx,
  epoNotenCompactBtnSx,
  epoNotenCompactIconBtnSx,
  epoNotenCompactIconSx,
  epoNotenInsetBoxSx,
  epoNotenPanelHeaderSx,
  epoNotenBigNumberSx,
  epoNotenPalette,
  epoNotenStudentGhostPanelSx,
} from './epoNotenUi';

type GroupInfo = { id: string; name: string; studentCount: number };

type RoundListItem = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  publishedAt: string | null;
  stats: { submitted: number; graded: number; released: number; goals: number };
  activeGroups: { id: string; name: string }[];
};

export function EpoNotenTeacherView() {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [round, setRound] = useState<EpoNotenRound | null>(null);
  const [students, setStudents] = useState<EpoNotenEntry[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teacherScores, setTeacherScores] = useState<number[]>(normalizeCategoryScores([]));
  const [teacherGrade, setTeacherGrade] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('EPO 1');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newGroupIds, setNewGroupIds] = useState<string[]>([]);
  const [publishOnCreate, setPublishOnCreate] = useState(true);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  /** null = alle Gruppen in der SuS-Liste, sonst nur diese Lerngruppe */
  const [studentListGroupFilter, setStudentListGroupFilter] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const res = await apiGetSafe('/api/epo-noten/list');
    if (!res?.ok) throw new Error('Liste konnte nicht geladen werden');
    const data = await res.json();
    setRounds(Array.isArray(data.rounds) ? data.rounds : []);
    setGroups(Array.isArray(data.groups) ? data.groups : []);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setRound(null);
      setStudents([]);
      return;
    }
    const res = await apiGetSafe(`/api/epo-noten/${id}`);
    if (!res?.ok) throw new Error('Runde konnte nicht geladen werden');
    const data = await res.json();
    setRound(data.round as EpoNotenRound);
    setStudents(Array.isArray(data.students) ? data.students : []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await loadList();
      if (selectedId) await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }, [loadDetail, loadList, selectedId]);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedId && rounds.length > 0) setSelectedId(rounds[0].id);
  }, [rounds, selectedId]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId).catch(() => setError('Detail konnte nicht geladen werden'));
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!round) {
      setStudentListGroupFilter(null);
      return;
    }
    if (round.groupIds.length === 0) {
      setStudentListGroupFilter(null);
      return;
    }
    setStudentListGroupFilter((prev) => {
      if (prev && round.groupIds.includes(prev)) return prev;
      return round.groupIds[0];
    });
  }, [round?.id, round?.groupIds.join('|')]);

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId) ?? null;

  const selectStudentListGroup = (gid: string) => {
    setStudentListGroupFilter(gid);
    if (selectedStudent?.groupId && selectedStudent.groupId !== gid) {
      setSelectedStudentId('');
    }
  };

  const skipRasterGradeSyncRef = useRef(false);
  const teacherScoresDirtyRef = useRef(false);
  const prevSelectedStudentIdRef = useRef('');
  const teacherScoresRef = useRef(teacherScores);
  teacherScoresRef.current = teacherScores;
  const teacherGradeRef = useRef(teacherGrade);
  teacherGradeRef.current = teacherGrade;
  const teacherSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!selectedStudentId) {
      if (prevSelectedStudentIdRef.current !== '') {
        prevSelectedStudentIdRef.current = '';
        teacherScoresDirtyRef.current = false;
      }
      teacherScoresRef.current = normalizeCategoryScores([]);
      setTeacherScores(normalizeCategoryScores([]));
      teacherGradeRef.current = '';
      setTeacherGrade('');
      return;
    }

    const entry = students.find((s) => s.studentId === selectedStudentId);

    if (selectedStudentId !== prevSelectedStudentIdRef.current) {
      prevSelectedStudentIdRef.current = selectedStudentId;
      teacherScoresDirtyRef.current = false;
      const mode =
        entry?.groupId && round ? assessmentModeForGroup(round, entry.groupId) : 'note';
      const scores = teacherFormScoresFromEntry(entry);
      teacherScoresRef.current = scores;
      setTeacherScores(scores);
      const grade = teacherFormGradeFromEntry(entry, mode);
      teacherGradeRef.current = grade;
      setTeacherGrade(grade);
      skipRasterGradeSyncRef.current = true;
      return;
    }

    if (teacherScoresDirtyRef.current || !entry) return;
    const mode =
      entry.groupId && round ? assessmentModeForGroup(round, entry.groupId) : 'note';
    const server = teacherFormScoresFromEntry(entry);
    const local = teacherScoresRef.current;
    if (local.every((s) => s < 0) && server.some((s) => s >= 0)) {
      teacherScoresRef.current = server;
      setTeacherScores(server);
      const grade = teacherFormGradeFromEntry(entry, mode);
      teacherGradeRef.current = grade;
      setTeacherGrade(grade);
      skipRasterGradeSyncRef.current = true;
    }
  }, [selectedStudentId, students, round]);

  const totalTeacher = sumCategoryScores(teacherScores);
  const selectedAssessmentMode: EpoNotenAssessmentMode =
    round && selectedStudent?.groupId
      ? assessmentModeForGroup(round, selectedStudent.groupId)
      : 'note';
  const computedRasterResult = rasterResultFromTotal(selectedAssessmentMode, totalTeacher);

  const persistTeacherEntry = useCallback(
    async (grade: string, scoresSnapshot: number[]) => {
      if (!round || !selectedStudentId) {
        throw new Error('Kein Schüler ausgewählt');
      }
      const scores = normalizeCategoryScores(scoresSnapshot);
      const row = students.find((s) => s.studentId === selectedStudentId);
      const mode =
        row?.groupId && round ? assessmentModeForGroup(round, row.groupId) : selectedAssessmentMode;
      const resolvedGrade =
        grade.trim() ||
        (allCategoriesSelected(scores) ? rasterResultFromTotal(mode, sumCategoryScores(scores)) : '');
      const res = await apiPut(`/api/epo-noten/${round.id}/teacher/${selectedStudentId}`, {
        teacherScores: scores,
        teacherGrade: resolvedGrade,
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Speichern fehlgeschlagen');
      }
      const data = await res.json();
      const entry = data.entry as EpoNotenEntry | undefined;
      if (entry?.studentId) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === entry.studentId ? { ...s, ...entry, groupId: (s as { groupId?: string }).groupId } : s,
          ),
        );
        if (entry.studentId === selectedStudentId) {
          const savedScores = normalizeCategoryScores(entry.teacherScores ?? scores);
          teacherScoresRef.current = savedScores;
          skipRasterGradeSyncRef.current = true;
          setTeacherScores(savedScores);
          const g = entry.teacherGrade || resolvedGrade;
          teacherGradeRef.current = g;
          setTeacherGrade(g);
        }
      }
      return entry;
    },
    [round, selectedStudentId, students, selectedAssessmentMode],
  );

  const saveTeacherDraftNow = useCallback((): Promise<void> => {
    if (!teacherScoresDirtyRef.current || !round || !selectedStudentId) {
      return teacherSaveChainRef.current;
    }
    setDraftStatus('saving');
    teacherSaveChainRef.current = teacherSaveChainRef.current
      .then(async () => {
        while (teacherScoresDirtyRef.current) {
          if (!round || !selectedStudentId) break;
          const scoresSnapshot = [...teacherScoresRef.current];
          const gradeSnapshot = teacherGradeRef.current;
          teacherScoresDirtyRef.current = false;
          await persistTeacherEntry(gradeSnapshot, scoresSnapshot);
          setDraftStatus('saved');
          await loadList();
        }
      })
      .catch((e) => {
        teacherScoresDirtyRef.current = true;
        setDraftStatus('error');
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
        throw e;
      });

    return teacherSaveChainRef.current;
  }, [loadList, persistTeacherEntry, round, selectedStudentId, students]);

  const prefillFromSelfKeyRef = useRef('');

  useEffect(() => {
    if (!round || !selectedStudentId) return;
    const entry = students.find((s) => s.studentId === selectedStudentId);
    if (!entry || entry.teacherReleasedAt) return;
    if (!shouldPrefillTeacherFromSelf(entry)) {
      prefillFromSelfKeyRef.current = '';
      return;
    }
    const key = `${selectedStudentId}:${entry.studentSubmittedAt ?? ''}`;
    if (prefillFromSelfKeyRef.current === key) return;
    prefillFromSelfKeyRef.current = key;
    teacherScoresDirtyRef.current = true;
    void saveTeacherDraftNow().catch(() => undefined);
  }, [round, saveTeacherDraftNow, selectedStudentId, students]);

  useEffect(() => {
    if (!selectedStudent) return;
    if (skipRasterGradeSyncRef.current) {
      skipRasterGradeSyncRef.current = false;
      return;
    }
    if (allCategoriesSelected(teacherScores)) {
      teacherGradeRef.current = computedRasterResult;
      setTeacherGrade(computedRasterResult);
      if (teacherScoresDirtyRef.current) {
        void saveTeacherDraftNow();
      }
    }
  }, [computedRasterResult, saveTeacherDraftNow, selectedStudent, teacherScores]);

  const selectStudent = async (studentId: string) => {
    if (studentId === selectedStudentId) return;
    setError(null);
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      setSelectedStudentId(studentId);
      setDraftStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern vor Schülerwechsel fehlgeschlagen');
    }
  };

  const selectRound = async (roundId: string) => {
    if (roundId === selectedId) return;
    setError(null);
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      setSelectedStudentId('');
      setSelectedId(roundId);
      setDraftStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern vor Rundenwechsel fehlgeschlagen');
    }
  };

  const handleTeacherScoresChange = (scores: number[]) => {
    teacherScoresDirtyRef.current = true;
    teacherScoresRef.current = scores;
    setDraftStatus('saving');
    setTeacherScores(scores);
    void saveTeacherDraftNow().catch(() => undefined);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await apiPost('/api/epo-noten/create', {
        title: newTitle,
        date: newDate,
        groupIds: newGroupIds,
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Erstellen fehlgeschlagen');
      }
      const data = await res.json();
      const newId = data.round?.id as string | undefined;
      if (newId && publishOnCreate && newGroupIds.length > 0) {
        const pub = await apiPost(`/api/epo-noten/${newId}/publish`, { groupIds: newGroupIds });
        if (!pub?.ok) {
          const err = await pub.json().catch(() => ({}));
          throw new Error(
            typeof err.error === 'string'
              ? err.error
              : 'Runde angelegt, aber Freischaltung fehlgeschlagen — bitte „Für Lerngruppe freischalten“ klicken.',
          );
        }
      }
      setCreateOpen(false);
      await loadList();
      if (newId) setSelectedId(newId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const toggleNewGroup = (gid: string) => {
    setNewGroupIds((prev) => (prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]));
  };

  const publish = async () => {
    if (!round) return;
    if (round.groupIds.length === 0) {
      setError('Bitte zuerst mindestens eine Lerngruppe ankreuzen (z. B. Klasse 5a).');
      return;
    }
    setSaving(true);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/publish`, {
        groupIds: round.groupIds.length > 0 ? round.groupIds : undefined,
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Freigabe fehlgeschlagen');
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    if (!round) return;
    setSaving(true);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/unpublish`, {});
      if (!res?.ok) throw new Error('Zurücknehmen fehlgeschlagen');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const saveTeacher = async () => {
    if (!round || !selectedStudentId) return;
    setSaving(true);
    setError(null);
    try {
      teacherScoresDirtyRef.current = true;
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const releaseOne = async () => {
    if (!round || !selectedStudentId) return;
    const scores = teacherScoresRef.current;
    const grade =
      teacherGradeRef.current.trim() ||
      (allCategoriesSelected(scores) ? rasterResultFromTotal(selectedAssessmentMode, sumCategoryScores(scores)) : '');
    if (!grade) {
      setError('Bitte Raster oder Note/MSS-Punkte eintragen, bevor du freigibst.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      teacherScoresDirtyRef.current = true;
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      const res = await apiPost(`/api/epo-noten/${round.id}/release`, { studentIds: [selectedStudentId] });
      if (!res?.ok) throw new Error('Freigabe fehlgeschlagen');
      await loadDetail(round.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const releaseAllInGroup = async (groupId: string) => {
    if (!round) return;
    const studentIds = students
      .filter((s) => s.groupId === groupId && s.teacherGrade?.trim() && !s.teacherReleasedAt)
      .map((s) => s.studentId);
    if (studentIds.length === 0) {
      setError('In diesem Kurs gibt es keine bewerteten SuS, die noch nicht freigegeben sind.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/release`, { studentIds });
      if (!res?.ok) throw new Error('Freigabe fehlgeschlagen');
      await loadDetail(round.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const updateRoundGroups = async (groupIds: string[]) => {
    if (!round) return;
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
    } catch {
      return;
    }
    setRound({ ...round, groupIds });
    const res = await apiPut(`/api/epo-noten/${round.id}`, { groupIds });
    if (!res?.ok) {
      setError('Lerngruppen konnten nicht gespeichert werden');
      await loadDetail(round.id);
      return;
    }
    await loadDetail(round.id);
    await loadList();
  };

  const updateGroupAssessmentMode = async (groupId: string, mode: EpoNotenAssessmentMode) => {
    if (!round) return;
    const assessmentModeByGroup = { ...round.assessmentModeByGroup, [groupId]: mode };
    setRound({ ...round, assessmentModeByGroup });
    const res = await apiPut(`/api/epo-noten/${round.id}`, {
      assessmentModeByGroup: { [groupId]: mode },
    });
    if (!res?.ok) {
      setError('Einstellung konnte nicht gespeichert werden');
      await loadDetail(round.id);
      return;
    }
    await loadDetail(round.id);
  };

  const requestResetAll = () => {
    if (!round) return;
    setResetConfirmOpen(true);
  };

  const confirmResetAll = async () => {
    if (!round) return;
    setResetConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/reset-all`, {});
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Zurücksetzen fehlgeschlagen');
      }
      setSelectedStudentId('');
      await loadDetail(round.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const removeRound = async () => {
    if (!round || !window.confirm('Diese EPO-Runde wirklich löschen?')) return;
    await apiPost(`/api/epo-noten/${round.id}/unpublish`, {});
    await apiDelete(`/api/epo-noten/${round.id}`);
    setSelectedId('');
    await loadList();
  };

  const studentSections = useMemo(() => {
    if (!round) return [];
    const sections: { groupId: string; groupName: string; students: EpoNotenEntry[] }[] = [];
    for (const gid of round.groupIds) {
      const inGroup = students
        .filter((s) => s.groupId === gid)
        .sort((a, b) => a.studentName.localeCompare(b.studentName, 'de'));
      if (inGroup.length === 0) continue;
      sections.push({
        groupId: gid,
        groupName: groups.find((g) => g.id === gid)?.name || gid,
        students: inGroup,
      });
    }
    const orphans = students
      .filter((s) => !s.groupId || !round.groupIds.includes(s.groupId))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, 'de'));
    if (orphans.length > 0) {
      sections.push({ groupId: '__other__', groupName: 'Weitere', students: orphans });
    }
    return sections;
  }, [groups, round, students]);

  const visibleStudentSections = useMemo(() => {
    if (!studentListGroupFilter) return studentSections;
    return studentSections.filter((s) => s.groupId === studentListGroupFilter);
  }, [studentListGroupFilter, studentSections]);

  const activeCourseGroupId =
    studentListGroupFilter && round?.groupIds.includes(studentListGroupFilter)
      ? studentListGroupFilter
      : round?.groupIds[0] ?? null;

  const activeCourseName = activeCourseGroupId
    ? groups.find((g) => g.id === activeCourseGroupId)?.name ?? ''
    : '';

  if (loading && rounds.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedRoundMeta = rounds.find((r) => r.id === selectedId);

  const canReleaseToStudent =
    Boolean(selectedStudentId) &&
    !selectedStudent?.teacherReleasedAt &&
    Boolean(
      teacherGrade.trim() ||
        (allCategoriesSelected(teacherScores) && computedRasterResult),
    );

  return (
    <Stack
      spacing={0.4}
      sx={{
        width: '100%',
        minWidth: 0,
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden',
      }}
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0, fontSize: '0.72rem', flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(112px, 132px) minmax(0, 1fr)' },
          gap: 0.5,
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Card sx={{ ...epoNotenCardSx, borderWidth: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ ...epoNotenPanelHeaderSx, py: 0.25, px: 0.5, justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: epoNotenPalette.heading }}>
              Runden
            </Typography>
            <Tooltip title="Neue Runde">
              <IconButton
                size="small"
                onClick={() => setCreateOpen(true)}
                aria-label="Neue Runde"
                sx={{
                  ...epoNotenCompactIconBtnSx,
                  bgcolor: epoNotenPalette.primary,
                  color: '#fff',
                  borderColor: epoNotenPalette.primary,
                  '&:hover': { bgcolor: '#1565c0', borderColor: '#1565c0' },
                }}
              >
                <AddIcon sx={epoNotenCompactIconSx} />
              </IconButton>
            </Tooltip>
          </Box>
          <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {rounds.map((r) => {
              const active = r.id === selectedId;
              return (
                <ListItemButton
                  key={r.id}
                  selected={active}
                  onClick={() => void selectRound(r.id)}
                  sx={{
                    py: 0.35,
                    px: 0.65,
                    alignItems: 'stretch',
                    flexDirection: 'column',
                    gap: 0.15,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      bgcolor: epoNotenPalette.primaryTint,
                      borderLeft: `3px solid ${epoNotenPalette.primary}`,
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.5} width="100%">
                    <Typography
                      noWrap
                      sx={{ fontWeight: 700, fontSize: '0.8rem', color: epoNotenPalette.textPrimary, flex: 1, minWidth: 0 }}
                    >
                      {r.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={r.publishedAt ? 'live' : 'Entwurf'}
                      color={r.publishedAt ? 'success' : 'default'}
                      sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, flexShrink: 0 }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: epoNotenPalette.textSecondary, lineHeight: 1.2, fontSize: '0.62rem' }}>
                    {r.date} · {r.stats.submitted}/{r.stats.graded}/{r.stats.released}
                  </Typography>
                </ListItemButton>
              );
            })}
            {rounds.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1.25, fontSize: '0.8rem' }}>
                Noch keine Runde.
              </Typography>
            )}
          </List>
        </Card>

        {round ? (
          <Card
            sx={{
              ...epoNotenCardSx,
              borderWidth: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ ...epoNotenPanelHeaderSx, py: 0.25, px: 0.55, gap: 0.35 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: epoNotenPalette.heading, lineHeight: 1.2 }} noWrap>
                  {round.title}
                  {selectedRoundMeta ? (
                    <Typography
                      component="span"
                      sx={{ fontWeight: 600, fontSize: '0.65rem', color: epoNotenPalette.textSecondary, ml: 0.5 }}
                    >
                      · {selectedRoundMeta.date} · {selectedRoundMeta.stats.submitted}/{selectedRoundMeta.stats.graded}
                    </Typography>
                  ) : null}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.35} flexShrink={0}>
                {!round.publishedAt ? (
                  <Tooltip title="Für Lerngruppe freischalten">
                    <span>
                      <IconButton
                        size="small"
                        onClick={publish}
                        disabled={saving}
                        aria-label="Freischalten"
                        sx={{
                          ...epoNotenCompactIconBtnSx,
                          bgcolor: epoNotenPalette.accent,
                          color: '#fff',
                          borderColor: epoNotenPalette.accent,
                          '&:hover': { bgcolor: '#1b5e20', borderColor: '#1b5e20' },
                        }}
                      >
                        <PublishIcon sx={epoNotenCompactIconSx} />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Freischaltung beenden">
                    <span>
                      <IconButton
                        size="small"
                        onClick={unpublish}
                        disabled={saving}
                        aria-label="Freischaltung beenden"
                        sx={epoNotenCompactIconBtnSx}
                      >
                        <UnpublishedIcon sx={epoNotenCompactIconSx} />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="Meine Bewertung freigeben (an ausgewählten SuS)">
                  <span>
                    <IconButton
                      size="small"
                      onClick={releaseOne}
                      disabled={saving || !canReleaseToStudent}
                      aria-label="Meine Bewertung freigeben"
                      sx={{
                        ...epoNotenCompactIconBtnSx,
                        bgcolor: canReleaseToStudent ? epoNotenPalette.primary : undefined,
                        color: canReleaseToStudent ? '#fff' : undefined,
                        borderColor: canReleaseToStudent ? epoNotenPalette.primary : undefined,
                        '&:hover': canReleaseToStudent
                          ? { bgcolor: '#1565c0', borderColor: '#1565c0' }
                          : undefined,
                      }}
                    >
                      <LockOpenIcon sx={epoNotenCompactIconSx} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Alle SuS zurücksetzen (Selbsteinschätzung erneut möglich)">
                  <span>
                    <IconButton
                      size="small"
                      onClick={requestResetAll}
                      disabled={saving}
                      aria-label="Alle zurücksetzen"
                      sx={{
                        ...epoNotenCompactIconBtnSx,
                        color: '#e65100',
                        borderColor: 'rgba(230, 81, 0, 0.45)',
                        '&:hover': { bgcolor: 'rgba(245, 124, 0, 0.1)' },
                      }}
                    >
                      <RestartAltIcon sx={epoNotenCompactIconSx} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Runde löschen">
                  <IconButton
                    size="small"
                    onClick={removeRound}
                    aria-label="Löschen"
                    sx={{
                      ...epoNotenCompactIconBtnSx,
                      color: '#c62828',
                      borderColor: 'rgba(198, 40, 40, 0.35)',
                      '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.08)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={epoNotenCompactIconSx} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Box sx={{ px: 0.5, py: 0.4, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
              {!round.publishedAt && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    color: round.groupIds.length === 0 ? 'info.main' : 'warning.main',
                    lineHeight: 1.2,
                    mb: 0.35,
                  }}
                >
                  {round.groupIds.length === 0
                    ? 'Mindestens einen Kurs hinzufügen, dann freischalten (↗).'
                    : 'Noch nicht live — Freischalten (↗).'}
                </Typography>
              )}

              {groups.some((g) => !round.groupIds.includes(g.id)) && (
                <Stack direction="row" flexWrap="wrap" gap={0.35} alignItems="center" sx={{ mb: round.groupIds.length > 0 ? 0.45 : 0 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', mr: 0.25 }}>
                    Kurs hinzufügen:
                  </Typography>
                  {groups
                    .filter((g) => !round.groupIds.includes(g.id))
                    .map((g) => (
                      <Chip
                        key={g.id}
                        size="small"
                        icon={<AddIcon sx={{ fontSize: '0.85rem !important' }} />}
                        label={g.name}
                        clickable
                        onClick={() => updateRoundGroups([...round.groupIds, g.id])}
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
                      />
                    ))}
                </Stack>
              )}

              {round.groupIds.length > 0 && (
                <Stack spacing={0.35}>
                  <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary' }}>
                    Kurs wählen — Note/MSS gilt jeweils für diesen Kurs
                  </Typography>
                  {round.groupIds.map((gid) => {
                    const g = groups.find((x) => x.id === gid);
                    const mode = assessmentModeForGroup(round, gid);
                    const isActive = activeCourseGroupId === gid;
                    return (
                      <Stack
                        key={gid}
                        direction="row"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={0.4}
                        sx={{
                          py: 0.25,
                          px: 0.35,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: isActive ? epoNotenPalette.primary : 'divider',
                          bgcolor: isActive ? epoNotenPalette.primaryTint : 'rgba(0,0,0,0.02)',
                        }}
                      >
                        <Button
                          size="small"
                          variant={isActive ? 'contained' : 'outlined'}
                          onClick={() => selectStudentListGroup(gid)}
                          sx={{
                            minHeight: 24,
                            py: 0.15,
                            px: 1,
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'none',
                            boxShadow: 'none',
                          }}
                        >
                          {g?.name || gid}
                        </Button>
                        <ToggleButtonGroup
                          exclusive
                          size="small"
                          value={mode}
                          onChange={(_, v: EpoNotenAssessmentMode | null) => {
                            if (!v) return;
                            void updateGroupAssessmentMode(gid, v);
                          }}
                          disabled={saving}
                        >
                          <ToggleButton
                            value="note"
                            sx={{ px: 0.65, py: 0.1, minHeight: 24, fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 }}
                          >
                            Note
                          </ToggleButton>
                          <ToggleButton
                            value="mss"
                            sx={{ px: 0.65, py: 0.1, minHeight: 24, fontSize: '0.65rem', fontWeight: 700, lineHeight: 1 }}
                          >
                            MSS
                          </ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title="Kurs aus dieser Runde entfernen">
                          <IconButton
                            size="small"
                            aria-label={`${g?.name || gid} entfernen`}
                            onClick={() => updateRoundGroups(round.groupIds.filter((id) => id !== gid))}
                            sx={{
                              ...epoNotenCompactIconBtnSx,
                              minWidth: 18,
                              width: 18,
                              height: 18,
                              color: 'text.secondary',
                              borderColor: 'transparent',
                              bgcolor: 'transparent',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.06)', borderColor: 'divider' },
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 11 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                p: 0.5,
              }}
            >
              <Stack spacing={0.5}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(156px, 188px) minmax(0, 1fr)' },
                    gap: 0.5,
                    alignItems: 'start',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.68rem', mb: 0.2, color: epoNotenPalette.heading }}>
                      Schüler
                      {activeCourseName ? (
                        <Typography component="span" sx={{ fontWeight: 600, color: 'text.secondary', ml: 0.5 }}>
                          · {activeCourseName}
                        </Typography>
                      ) : null}
                    </Typography>
                    <List
                      dense
                      sx={{
                        maxHeight: { lg: '38vh', xs: 220 },
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: '#fff',
                        py: 0,
                      }}
                    >
                      {visibleStudentSections.map((section, sectionIndex) => (
                        <React.Fragment key={section.groupId}>
                          {!studentListGroupFilter && (
                            <ListSubheader
                              disableSticky
                              sx={{
                                lineHeight: 1.25,
                                py: 0.45,
                                px: 0.75,
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: epoNotenPalette.heading,
                                bgcolor: epoNotenPalette.sand,
                                borderBottom: '1px solid',
                                borderTop: sectionIndex > 0 ? '1px solid' : undefined,
                                borderColor: 'divider',
                              }}
                            >
                              {section.groupName}
                            </ListSubheader>
                          )}
                          {section.students.map((s, studentIndex) => {
                            const active = s.studentId === selectedStudentId;
                            const isLastInSection = studentIndex === section.students.length - 1;
                            const isLastSection = sectionIndex === visibleStudentSections.length - 1;
                            return (
                              <ListItemButton
                                key={`${section.groupId}-${s.studentId}`}
                                selected={active}
                                onClick={() => void selectStudent(s.studentId)}
                                sx={{
                                  py: 0.35,
                                  px: 0.5,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  ...((isLastInSection && isLastSection) ? { borderBottom: 0 } : {}),
                                }}
                              >
                                <Stack direction="row" alignItems="center" gap={0.45} width="100%" minWidth={0}>
                                  <Box
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    sx={{ flexShrink: 0, lineHeight: 0 }}
                                  >
                                    <DualStudentAvatars
                                      photoOnly
                                      name={s.studentName}
                                      avatarUrl={s.avatarUrl}
                                      photoSize={34}
                                      alwaysShowPhotoSlot={false}
                                    />
                                  </Box>
                                  <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.72rem', flex: 1, minWidth: 0 }}>
                                    {s.studentName}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={s.studentSubmittedAt ? '✓' : '·'}
                                    sx={{ height: 16, minWidth: 22, fontSize: '0.58rem', '& .MuiChip-label': { px: 0.4 } }}
                                    color={s.studentSubmittedAt ? 'success' : 'default'}
                                    variant="outlined"
                                  />
                                  {s.teacherGrade ? (
                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: 'primary.main', flexShrink: 0 }}>
                                      {s.teacherGrade}
                                    </Typography>
                                  ) : null}
                                  {s.teacherReleasedAt ? (
                                    <Chip size="small" label="frei" sx={{ height: 16, fontSize: '0.55rem', '& .MuiChip-label': { px: 0.35 } }} color="secondary" />
                                  ) : null}
                                </Stack>
                              </ListItemButton>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </List>
                    {activeCourseGroupId ? (
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        onClick={() => void releaseAllInGroup(activeCourseGroupId)}
                        disabled={saving}
                        sx={{ ...epoNotenCompactBtnSx, mt: 0.35 }}
                      >
                        Kurs „{activeCourseName}“ freigeben
                      </Button>
                    ) : null}
                  </Box>

                  <Box sx={{ minWidth: 0, width: '100%', maxWidth: 'none' }}>
                    {!selectedStudent ? (
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', py: 0.75, textAlign: 'center' }}>
                        Schüler auswählen
                      </Typography>
                    ) : (
                      <Stack spacing={0.45}>
                        {!selectedStudent.studentSubmittedAt && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                            Noch keine Selbsteinschätzung.
                          </Typography>
                        )}

                        {selectedStudent.studentSubmittedAt ? (
                          <Box
                            sx={{
                              ...epoNotenStudentGhostPanelSx,
                              py: 0.35,
                              px: 0.5,
                              mb: 0.25,
                            }}
                          >
                            <Typography sx={{ fontSize: '0.65rem', lineHeight: 1.3 }} noWrap title={selectedStudent.justification || ''}>
                              <strong>SuS:</strong>{' '}
                              {formatSuggestedGradeDisplay(
                                selectedStudent.groupId
                                  ? assessmentModeForGroup(round, selectedStudent.groupId)
                                  : selectedStudent.suggestedGradeMode,
                                selectedStudent.suggestedGrade,
                              )}
                              {' · '}
                              {selectedStudent.groupId &&
                              assessmentModeForGroup(round, selectedStudent.groupId) === 'mss'
                                ? `${sumCategoryScores(selectedStudent.selfScores)} MSS`
                                : `${sumCategoryScores(selectedStudent.selfScores)} Pkt. → ${selectedStudent.selfGradeFromTable || '—'}`}
                              {selectedStudent.justification
                                ? ` · ${selectedStudent.justification.replace(/\s+/g, ' ').slice(0, 80)}${selectedStudent.justification.length > 80 ? '…' : ''}`
                                : ''}
                            </Typography>
                          </Box>
                        ) : null}

                        <Box sx={{ position: 'relative', width: '100%' }}>
                            {selectedStudent.teacherReleasedAt && (
                              <Typography variant="caption" sx={{ display: 'block', fontSize: '0.62rem', color: 'info.main', mb: 0.25 }}>
                                Freigegeben — Änderungen sieht der SuS beim nächsten Öffnen.
                              </Typography>
                            )}

                            <EpoNotenCategoryGrid
                              compact
                              teacherEmphasis
                              label={
                                selectedStudent.studentSubmittedAt
                                  ? 'Lehrkraft — blau = deine Wahl · lila (transparent) = SuS'
                                  : 'Lehrkraft'
                              }
                              categories={EPO_NOTEN_TEACHER_CATEGORIES}
                              scores={teacherScores}
                              onChange={handleTeacherScoresChange}
                              radioGroupId={selectedStudentId}
                              studentOverlayScores={
                                selectedStudent.studentSubmittedAt
                                  ? normalizeCategoryScores(selectedStudent.selfScores)
                                  : undefined
                              }
                            />

                            {allCategoriesSelected(teacherScores) && (
                              <Box sx={{ mt: 0.35 }}>
                                <EpoNotenGradeTable
                                  mode={selectedAssessmentMode}
                                  highlightMinPoints={
                                    selectedAssessmentMode === 'note'
                                      ? minPointsThresholdForTotal(totalTeacher)
                                      : null
                                  }
                                  highlightExactPoints={
                                    selectedAssessmentMode === 'mss' ? totalTeacher : null
                                  }
                                />
                              </Box>
                            )}

                            <Box
                              sx={{
                                ...epoNotenInsetBoxSx,
                                mt: 0.35,
                                p: 0.65,
                                bgcolor: '#fff',
                                position: 'relative',
                                zIndex: 2,
                              }}
                            >
                              <Typography sx={{ fontWeight: 800, fontSize: '0.68rem', mb: 0.25, color: epoNotenPalette.heading }}>
                                {selectedAssessmentMode === 'mss' ? 'MSS-Punkte (0–15)' : 'EPO-Note'}
                              </Typography>
                              <Typography
                                sx={{
                                  ...epoNotenBigNumberSx,
                                  fontSize: '1.45rem',
                                  color: teacherGrade.trim() || allCategoriesSelected(teacherScores)
                                    ? epoNotenPalette.primary
                                    : 'text.disabled',
                                }}
                              >
                                {teacherGrade.trim() ||
                                  (allCategoriesSelected(teacherScores) ? computedRasterResult : '—')}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.35, color: 'text.secondary', lineHeight: 1.35 }}>
                                {allCategoriesSelected(teacherScores)
                                  ? selectedAssessmentMode === 'mss'
                                    ? `Aus deinem Raster: ${totalTeacher} MSS-Punkte (wird automatisch gespeichert)`
                                    : `Aus deinem Raster: ${totalTeacher} Punkte (wird automatisch gespeichert)`
                                  : selectedAssessmentMode === 'mss'
                                    ? 'Raster vervollständigen — dann erscheinen die MSS-Punkte hier.'
                                    : 'Raster vervollständigen — dann erscheint die Note hier.'}
                              </Typography>
                            </Box>

                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  textAlign: 'right',
                                  display: 'block',
                                  color:
                                    draftStatus === 'error'
                                      ? 'error.main'
                                      : draftStatus === 'saved'
                                        ? 'success.main'
                                        : 'text.secondary',
                                  fontWeight: 600,
                                }}
                              >
                                {draftStatus === 'saving'
                                  ? 'Speichert…'
                                  : draftStatus === 'saved'
                                    ? 'Gespeichert'
                                    : draftStatus === 'error'
                                      ? 'Speichern fehlgeschlagen — bitte „Speichern“ erneut tippen'
                                      : 'Raster wird automatisch gespeichert'}
                              </Typography>
                              {!selectedStudent.teacherReleasedAt && (
                                <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => void saveTeacher()}
                                    disabled={saving || draftStatus === 'saving'}
                                    sx={epoNotenCompactBtnSx}
                                  >
                                    Speichern
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => void releaseOne()}
                                    disabled={saving || !canReleaseToStudent}
                                    sx={epoNotenCompactBtnSx}
                                  >
                                    An SuS abschicken
                                  </Button>
                                </Stack>
                              )}
                            </Stack>
                        </Box>

                        {(selectedStudent.goalsSubmittedAt ||
                          selectedStudent.goal?.trim() ||
                          selectedStudent.goalAction?.trim()) && (
                          <Box
                            sx={{
                              ...epoNotenInsetBoxSx,
                              bgcolor: 'rgba(46, 125, 50, 0.06)',
                              borderColor: 'rgba(46, 125, 50, 0.2)',
                              p: 0.75,
                            }}
                          >
                            <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', mb: 0.25, color: 'text.secondary' }}>
                              Ziele (SuS)
                              {!selectedStudent.goalsSubmittedAt && (
                                <Typography component="span" sx={{ fontWeight: 500, fontSize: '0.65rem', ml: 0.35 }}>
                                  · noch nicht abgeschickt
                                </Typography>
                              )}
                            </Typography>
                            <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                              <strong>Ziel:</strong> {selectedStudent.goal?.trim() || '—'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.8rem', mt: 0.35, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                              <strong>Handlung:</strong> {selectedStudent.goalAction?.trim() || '—'}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Card>
        ) : (
          <Box
            sx={{
              ...epoNotenInsetBoxSx,
              py: 4,
              textAlign: 'center',
              color: 'text.secondary',
              fontSize: '0.85rem',
            }}
          >
            Runde links wählen oder „Neue Runde“ anlegen.
          </Box>
        )}
      </Box>

      <Dialog open={resetConfirmOpen} onClose={() => !saving && setResetConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={dialogCloseTitleSx}>
          Alle SuS zurücksetzen?
          <DialogCloseIconButton onClose={() => !saving && setResetConfirmOpen(false)} disabled={saving} />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.8rem' }}>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </Alert>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              Für die Runde <strong>{round?.title}</strong> werden alle Einträge gelöscht:
            </Typography>
            <Typography component="ul" variant="body2" sx={{ m: 0, pl: 2.25, fontSize: '0.82rem', color: 'text.secondary' }}>
              <li>Selbsteinschätzungen der Schüler</li>
              <li>deine Bewertungen und Noten</li>
              <li>Freigaben und Ziele</li>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
              Danach können die SuS ihre Selbsteinschätzung erneut abgeben.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button size="small" onClick={() => setResetConfirmOpen(false)} disabled={saving} sx={epoNotenCompactBtnSx}>
            Abbrechen
          </Button>
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={() => void confirmResetAll()}
            disabled={saving}
            sx={epoNotenCompactBtnSx}
          >
            Ja, alle zurücksetzen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={dialogCloseTitleSx}>
          Neue EPO-Runde
          <DialogCloseIconButton onClose={() => setCreateOpen(false)} />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Titel (z. B. EPO 1)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} fullWidth />
            <TextField label="Datum" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <Typography variant="subtitle2">Lerngruppen</Typography>
            {groups.map((g) => {
              const checked = newGroupIds.includes(g.id);
              return (
                <Box
                  key={g.id}
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleNewGroup(g.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.35,
                    px: 0.5,
                    mx: -0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox checked={checked} tabIndex={-1} disableRipple sx={{ p: 0.25, pointerEvents: 'none' }} />
                  <Typography variant="body2">{g.name}</Typography>
                </Box>
              );
            })}
            <Box
              role="checkbox"
              aria-checked={publishOnCreate}
              aria-disabled={newGroupIds.length === 0}
              onClick={() => {
                if (newGroupIds.length === 0) return;
                setPublishOnCreate((v) => !v);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.35,
                px: 0.5,
                mx: -0.5,
                borderRadius: 1,
                cursor: newGroupIds.length === 0 ? 'default' : 'pointer',
                opacity: newGroupIds.length === 0 ? 0.5 : 1,
                userSelect: 'none',
                '&:hover': newGroupIds.length === 0 ? undefined : { bgcolor: 'action.hover' },
              }}
            >
              <Checkbox
                checked={publishOnCreate}
                disabled={newGroupIds.length === 0}
                tabIndex={-1}
                disableRipple
                sx={{ p: 0.25, pointerEvents: 'none' }}
              />
              <Typography variant="body2">Direkt für SuS freischalten (empfohlen)</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button size="small" onClick={() => setCreateOpen(false)} sx={epoNotenCompactBtnSx}>
            Abbrechen
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !newTitle.trim()}
            sx={epoNotenCompactBtnSx}
          >
            Anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
