import React, { useCallback, useEffect, useState } from 'react';
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
import { apiDelete, apiGetSafe, apiPost, apiPut } from '../../lib/api';
import {
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenRound,
  allCategoriesSelected,
  assessmentModeForGroup,
  formatSuggestedGradeDisplay,
  gradeFromTotalPoints,
  type EpoNotenAssessmentMode,
  normalizeCategoryScores,
  sumCategoryScores,
} from '../../lib/epoNotenShared';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
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

  useEffect(() => {
    if (!selectedStudent) {
      setTeacherScores(normalizeCategoryScores([]));
      setTeacherGrade('');
      return;
    }
    setTeacherScores(normalizeCategoryScores(selectedStudent.teacherScores));
    setTeacherGrade(selectedStudent.teacherGrade || '');
  }, [selectedStudent]);

  const totalTeacher = sumCategoryScores(teacherScores);
  const computedGrade = gradeFromTotalPoints(totalTeacher);

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

  const persistTeacherEntry = async (grade: string) => {
    if (!round || !selectedStudentId) return false;
    const res = await apiPut(`/api/epo-noten/${round.id}/teacher/${selectedStudentId}`, {
      teacherScores,
      teacherGrade: grade,
    });
    if (!res?.ok) throw new Error('Speichern fehlgeschlagen');
    return true;
  };

  const saveTeacher = async () => {
    if (!round || !selectedStudentId) return;
    setSaving(true);
    setError(null);
    try {
      await persistTeacherEntry(teacherGrade.trim());
      await loadDetail(round.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const releaseOne = async () => {
    if (!round || !selectedStudentId) return;
    const grade = teacherGrade.trim();
    if (!grade) {
      setError('Bitte die EPO-Note eintragen, bevor du abschickst.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persistTeacherEntry(grade);
      const res = await apiPost(`/api/epo-noten/${round.id}/release`, { studentIds: [selectedStudentId] });
      if (!res?.ok) throw new Error('Abschicken fehlgeschlagen');
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

  const resetAllStudents = async () => {
    if (!round) return;
    if (
      !window.confirm(
        'Alle Einträge dieser Runde zurücksetzen? SuS können ihre Selbsteinschätzung dann erneut ausfüllen.',
      )
    ) {
      return;
    }
    setSaving(true);
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

  if (loading && rounds.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const selectedRoundMeta = rounds.find((r) => r.id === selectedId);

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
                  onClick={() => setSelectedId(r.id)}
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
                      {students.map((s) => {
                        const active = s.studentId === selectedStudentId;
                        return (
                          <ListItemButton
                            key={s.studentId}
                            selected={active}
                            onClick={() => setSelectedStudentId(s.studentId)}
                            sx={{
                              py: 0.45,
                              px: 0.75,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              '&:last-child': { borderBottom: 0 },
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
                                  <Chip size="small" label="frei" sx={{ height: 18, fontSize: '0.6rem' }} color="secondary" />
                                ) : null}
                              </Stack>
                            </Stack>
                          </ListItemButton>
                        );
                      })}
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
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={resetAllStudents}
                        disabled={saving}
                        sx={epoNotenCompactBtnSx}
                      >
                        Alle zurücksetzen
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
                              Raster {sumCategoryScores(selectedStudent.selfScores)} Pkt. →{' '}
                              {selectedStudent.selfGradeFromTable || '—'}
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
                              onChange={setTeacherScores}
                              studentOverlayScores={
                                selectedStudent.studentSubmittedAt
                                  ? normalizeCategoryScores(selectedStudent.selfScores)
                                  : undefined
                              }
                            />

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
                                Deine EPO-Note (eigenständig)
                              </Typography>
                              <TextField
                                label="EPO-Note eintragen"
                                size="small"
                                value={teacherGrade}
                                onChange={(e) => setTeacherGrade(e.target.value)}
                                placeholder="z. B. 2+ oder 3−"
                                fullWidth
                                helperText={`Nur Vorschlag aus Raster: ${totalTeacher} Punkte → ${computedGrade} (wird nicht automatisch übernommen)`}
                                sx={{
                                  '& .MuiInputBase-root': { fontSize: '0.95rem', fontWeight: 700 },
                                  '& .MuiInputLabel-root': { fontSize: '0.78rem' },
                                }}
                              />
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setTeacherGrade(computedGrade)}
                                disabled={saving || !allCategoriesSelected(teacherScores)}
                                sx={{ mt: 0.35, px: 0, minHeight: 24, fontSize: '0.68rem', fontWeight: 700 }}
                              >
                                Vorschlag aus Raster übernehmen ({computedGrade})
                              </Button>
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={saveTeacher}
                            disabled={saving}
                            sx={{ ...epoNotenCompactBtnSx, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
                          >
                            Speichern
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={releaseOne}
                            disabled={saving || !teacherGrade.trim()}
                            sx={{ ...epoNotenCompactBtnSx, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
                          >
                            An SuS abschicken
                          </Button>
                        </Stack>

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
