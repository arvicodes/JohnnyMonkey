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
  Divider,
  FormControlLabel,
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
  sumCategoryScores,
} from '../../lib/epoNotenShared';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
import { EpoNotenGradeTable } from './EpoNotenGradeTable';
import {
  epoNotenCardSx,
  epoNotenCompactBtnSx,
  epoNotenCompactIconBtnSx,
  epoNotenCompactIconSx,
  epoNotenInsetBoxSx,
  epoNotenPanelHeaderSx,
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

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId) ?? null;

  const skipRasterGradeSyncRef = useRef(false);
  const teacherScoresDirtyRef = useRef(false);
  const prevSelectedStudentIdRef = useRef('');
  const teacherScoresRef = useRef(teacherScores);
  teacherScoresRef.current = teacherScores;
  const teacherGradeRef = useRef(teacherGrade);
  teacherGradeRef.current = teacherGrade;
  const teacherSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (selectedStudentId !== prevSelectedStudentIdRef.current) {
      teacherScoresDirtyRef.current = false;
      prevSelectedStudentIdRef.current = selectedStudentId;
    }
    if (!selectedStudentId) {
      setTeacherScores(normalizeCategoryScores([]));
      setTeacherGrade('');
      return;
    }
    if (teacherScoresDirtyRef.current) return;
    const entry = students.find((s) => s.studentId === selectedStudentId);
    setTeacherScores(normalizeCategoryScores(entry?.teacherScores));
    setTeacherGrade(entry?.teacherGrade || '');
    skipRasterGradeSyncRef.current = true;
  }, [selectedStudentId, students]);

  const totalTeacher = sumCategoryScores(teacherScores);
  const selectedAssessmentMode: EpoNotenAssessmentMode =
    round && selectedStudent?.groupId
      ? assessmentModeForGroup(round, selectedStudent.groupId)
      : 'note';
  const computedRasterResult = rasterResultFromTotal(selectedAssessmentMode, totalTeacher);

  const persistTeacherEntry = useCallback(
    async (grade: string) => {
      if (!round || !selectedStudentId) {
        throw new Error('Kein Schüler ausgewählt');
      }
      const scores = teacherScoresRef.current;
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
    const row = students.find((s) => s.studentId === selectedStudentId);
    if (row?.teacherReleasedAt) return teacherSaveChainRef.current;

    setDraftStatus('saving');
    teacherSaveChainRef.current = teacherSaveChainRef.current
      .then(async () => {
        while (teacherScoresDirtyRef.current) {
          if (!round || !selectedStudentId) break;
          const current = students.find((s) => s.studentId === selectedStudentId);
          if (current?.teacherReleasedAt) break;
          teacherScoresDirtyRef.current = false;
          await persistTeacherEntry(teacherGradeRef.current);
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
    if (!round || !selectedStudentId || selectedStudent?.teacherReleasedAt) return;
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

  const releaseAll = async () => {
    if (!round) return;
    setSaving(true);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/release`, { all: true });
      if (!res?.ok) throw new Error('Freigabe fehlgeschlagen');
      await loadDetail(round.id);
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
    <Stack spacing={1.25} sx={{ width: '100%', minWidth: 0 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0.25 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minHeight: 26 }}>
        <Typography
          sx={{
            flex: 1,
            fontWeight: 800,
            fontSize: '0.78rem',
            color: epoNotenPalette.heading,
            minWidth: 0,
          }}
        >
          EPO — Lehrer
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
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(128px, 156px) minmax(0, 1fr)' },
          gap: 1,
          alignItems: 'start',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}
      >
        <Card sx={{ ...epoNotenCardSx, borderWidth: 1 }}>
          <Box sx={{ ...epoNotenPanelHeaderSx, py: 0.55 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: epoNotenPalette.heading }}>
              Runden
            </Typography>
          </Box>
          <List dense disablePadding sx={{ maxHeight: { md: 'calc(100vh - 220px)' }, overflow: 'auto' }}>
            {rounds.map((r) => {
              const active = r.id === selectedId;
              return (
                <ListItemButton
                  key={r.id}
                  selected={active}
                  onClick={() => void selectRound(r.id)}
                  sx={{
                    py: 0.65,
                    px: 1,
                    alignItems: 'stretch',
                    flexDirection: 'column',
                    gap: 0.35,
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
                      sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: epoNotenPalette.textSecondary, lineHeight: 1.3 }}>
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
          <Card sx={{ ...epoNotenCardSx, borderWidth: 1, minWidth: 0 }}>
            <Box sx={epoNotenPanelHeaderSx}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: epoNotenPalette.heading }} noWrap>
                  {round.title}
                </Typography>
                {selectedRoundMeta && (
                  <Typography variant="caption" sx={{ color: epoNotenPalette.textSecondary }}>
                    {selectedRoundMeta.date} · abgegeben {selectedRoundMeta.stats.submitted} · bewertet{' '}
                    {selectedRoundMeta.stats.graded}
                  </Typography>
                )}
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

            <Box sx={{ p: 1.1 }}>
              <Stack spacing={1}>
                {!round.publishedAt && round.groupIds.length > 0 && (
                  <Alert severity="warning" sx={{ py: 0, fontSize: '0.78rem' }}>
                    Noch nicht für SuS sichtbar — oben grünen Button (Hochladen) tippen.
                  </Alert>
                )}
                {!round.publishedAt && round.groupIds.length === 0 && (
                  <Alert severity="info" sx={{ py: 0, fontSize: '0.78rem' }}>
                    Mindestens eine Lerngruppe wählen, dann freischalten.
                  </Alert>
                )}

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: epoNotenPalette.textSecondary }}>
                    Lerngruppen
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.35 }}>
                    {groups.map((g) => {
                      const on = round.groupIds.includes(g.id);
                      return (
                        <Chip
                          key={g.id}
                          size="small"
                          label={`${g.name} (${g.studentCount})`}
                          clickable
                          onClick={() => {
                            const next = on
                              ? round.groupIds.filter((id) => id !== g.id)
                              : [...round.groupIds, g.id];
                            updateRoundGroups(next);
                          }}
                          variant={on ? 'filled' : 'outlined'}
                          sx={{
                            height: 26,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            bgcolor: on ? epoNotenPalette.primaryTint : undefined,
                            borderColor: on ? epoNotenPalette.primary : undefined,
                          }}
                        />
                      );
                    })}
                  </Stack>
                  {round.groupIds.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: epoNotenPalette.textSecondary }}>
                        Bewertungsart pro Gruppe
                      </Typography>
                      {round.groupIds.map((gid) => {
                        const g = groups.find((x) => x.id === gid);
                        const mode = assessmentModeForGroup(round, gid);
                        return (
                          <Stack
                            key={gid}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={0.75}
                            flexWrap="wrap"
                            sx={{
                              py: 0.35,
                              px: 0.5,
                              borderRadius: 1,
                              bgcolor: 'rgba(0,0,0,0.02)',
                            }}
                          >
                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, minWidth: 0 }}>
                              {g?.name || gid}
                            </Typography>
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
                              <ToggleButton value="note" sx={{ px: 0.85, py: 0.15, fontSize: '0.68rem', fontWeight: 700 }}>
                                Note
                              </ToggleButton>
                              <ToggleButton value="mss" sx={{ px: 0.85, py: 0.15, fontSize: '0.68rem', fontWeight: 700 }}>
                                MSS 0–15
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </Box>

                <Divider />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(132px, 160px) minmax(0, 1fr)' },
                    gap: 1,
                    alignItems: 'start',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', mb: 0.5, color: epoNotenPalette.heading }}>
                      Schüler
                    </Typography>
                    <List
                      dense
                      sx={{
                        maxHeight: 320,
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.25,
                        bgcolor: '#fff',
                        py: 0,
                      }}
                    >
                      {studentSections.map((section, sectionIndex) => (
                        <React.Fragment key={section.groupId}>
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
                          {section.students.map((s, studentIndex) => {
                            const active = s.studentId === selectedStudentId;
                            const isLastInSection = studentIndex === section.students.length - 1;
                            const isLastSection = sectionIndex === studentSections.length - 1;
                            return (
                              <ListItemButton
                                key={`${section.groupId}-${s.studentId}`}
                                selected={active}
                                onClick={() => void selectStudent(s.studentId)}
                                sx={{
                                  py: 0.45,
                                  px: 0.75,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  ...((isLastInSection && isLastSection) ? { borderBottom: 0 } : {}),
                                }}
                              >
                                <Stack spacing={0.15} width="100%" minWidth={0}>
                                  <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.78rem' }}>
                                    {s.studentName}
                                  </Typography>
                                  <Stack direction="row" flexWrap="wrap" gap={0.35}>
                                    <Chip
                                      size="small"
                                      label={s.studentSubmittedAt ? 'SuS ✓' : 'offen'}
                                      sx={{ height: 18, fontSize: '0.6rem' }}
                                      color={s.studentSubmittedAt ? 'success' : 'default'}
                                      variant="outlined"
                                    />
                                    {s.teacherGrade ? (
                                      <Chip
                                        size="small"
                                        label={`Note ${s.teacherGrade}`}
                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                        color="primary"
                                        variant="outlined"
                                      />
                                    ) : null}
                                    {s.teacherReleasedAt ? (
                                      <Chip
                                        size="small"
                                        label="frei"
                                        sx={{ height: 18, fontSize: '0.6rem' }}
                                        color="secondary"
                                      />
                                    ) : null}
                                  </Stack>
                                </Stack>
                              </ListItemButton>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </List>
                    <Stack spacing={0.5} sx={{ mt: 0.65 }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        onClick={releaseAll}
                        disabled={saving}
                        sx={epoNotenCompactBtnSx}
                      >
                        Alle bewerteten freigeben
                      </Button>
                    </Stack>
                  </Box>

                  <Box sx={{ minWidth: 0, width: '100%', maxWidth: 'none' }}>
                    {!selectedStudent ? (
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', py: 2, textAlign: 'center' }}>
                        Schüler auswählen
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {!selectedStudent.studentSubmittedAt && (
                          <Alert severity="info" sx={{ py: 0, fontSize: '0.72rem' }}>
                            Noch keine Selbsteinschätzung.
                          </Alert>
                        )}

                        {selectedStudent.studentSubmittedAt ? (
                          <Box sx={{ ...epoNotenStudentGhostPanelSx, opacity: 0.62, mb: 0.65 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.68rem', mb: 0.35, color: '#7b1fa2' }}>
                              SuS — Noteneinschätzung (nur Anzeige)
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', lineHeight: 1.35 }}>
                              <strong>
                                {formatSuggestedGradeDisplay(
                                  selectedStudent.groupId
                                    ? assessmentModeForGroup(round, selectedStudent.groupId)
                                    : selectedStudent.suggestedGradeMode,
                                  selectedStudent.suggestedGrade,
                                )}
                              </strong>
                              {' · '}
                              Raster{' '}
                              {selectedStudent.groupId
                                ? assessmentModeForGroup(round, selectedStudent.groupId) === 'mss'
                                  ? `${sumCategoryScores(selectedStudent.selfScores)} MSS-Pkt.`
                                  : `${sumCategoryScores(selectedStudent.selfScores)} Pkt. → ${selectedStudent.selfGradeFromTable || '—'}`
                                : `${sumCategoryScores(selectedStudent.selfScores)} Pkt.`}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', mt: 0.45, whiteSpace: 'pre-wrap', lineHeight: 1.35 }}>
                              {selectedStudent.justification || '—'}
                            </Typography>
                          </Box>
                        ) : null}

                        <Box sx={{ position: 'relative', width: '100%' }}>
                            <EpoNotenCategoryGrid
                              compact
                              label={
                                selectedStudent.studentSubmittedAt
                                  ? 'Lehrkraft (lila = SuS-Wahl)'
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
                              <Box sx={{ mt: 0.75 }}>
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
                                mt: 0.75,
                                bgcolor: '#fff',
                                position: 'relative',
                                zIndex: 2,
                              }}
                            >
                              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', mb: 0.75, color: epoNotenPalette.heading }}>
                                {selectedAssessmentMode === 'mss' ? 'MSS-Punkte (0–15)' : 'EPO-Note'}
                              </Typography>
                              <TextField
                                label={selectedAssessmentMode === 'mss' ? 'MSS-Punkte' : 'EPO-Note'}
                                size="small"
                                value={teacherGrade}
                                onChange={(e) => {
                                  teacherScoresDirtyRef.current = true;
                                  const raw = e.target.value;
                                  const next =
                                    selectedAssessmentMode === 'mss'
                                      ? raw.replace(/[^\d]/g, '').slice(0, 2)
                                      : raw;
                                  teacherGradeRef.current = next;
                                  setTeacherGrade(next);
                                  setDraftStatus('saving');
                                  void saveTeacherDraftNow().catch(() => undefined);
                                }}
                                placeholder={selectedAssessmentMode === 'mss' ? 'z. B. 11' : 'z. B. 2+ oder 3−'}
                                fullWidth
                                inputMode={selectedAssessmentMode === 'mss' ? 'numeric' : 'text'}
                                helperText={
                                  allCategoriesSelected(teacherScores)
                                    ? selectedAssessmentMode === 'mss'
                                      ? `Aus Raster: ${totalTeacher} MSS-Punkte (automatisch, anpassbar)`
                                      : `Aus Raster: ${totalTeacher} Punkte → ${computedRasterResult} (automatisch, anpassbar)`
                                    : selectedAssessmentMode === 'mss'
                                      ? 'Raster vervollständigen oder MSS-Punkte manuell eintragen'
                                      : 'Raster vervollständigen oder Note manuell eintragen'
                                }
                                sx={{
                                  '& .MuiInputBase-root': { fontSize: '0.95rem', fontWeight: 700 },
                                  '& .MuiInputLabel-root': { fontSize: '0.78rem' },
                                }}
                              />
                            </Box>

                            {!selectedStudent.teacherReleasedAt && (
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
                              </Stack>
                            )}
                        </Box>

                        {selectedStudent.teacherReleasedAt && (
                          <Box sx={{ ...epoNotenInsetBoxSx, bgcolor: epoNotenPalette.accentTint }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', mb: 0.35 }}>
                              Ziele (SuS)
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.76rem' }}>
                              {selectedStudent.goal || '—'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.76rem', mt: 0.35 }}>
                              {selectedStudent.goalAction || '—'}
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
            {groups.map((g) => (
              <FormControlLabel
                key={g.id}
                control={<Checkbox checked={newGroupIds.includes(g.id)} onChange={() => toggleNewGroup(g.id)} />}
                label={g.name}
              />
            ))}
            <FormControlLabel
              control={
                <Checkbox
                  checked={publishOnCreate}
                  onChange={(e) => setPublishOnCreate(e.target.checked)}
                  disabled={newGroupIds.length === 0}
                />
              }
              label="Direkt für SuS freischalten (empfohlen)"
            />
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
