import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
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
  gradeFromTotalPoints,
  normalizeCategoryScores,
  sumCategoryScores,
} from '../../lib/epoNotenShared';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
import { epoNotenCardSx, epoNotenPalette } from './epoNotenUi';

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
      if (!res?.ok) throw new Error('Erstellen fehlgeschlagen');
      const data = await res.json();
      setCreateOpen(false);
      await loadList();
      if (data.round?.id) setSelectedId(data.round.id);
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
    setSaving(true);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/publish`, { groupIds: round.groupIds });
      if (!res?.ok) throw new Error('Freigabe fehlgeschlagen');
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
    try {
      const res = await apiPut(`/api/epo-noten/${round.id}/teacher/${selectedStudentId}`, {
        teacherScores,
        teacherGrade: teacherGrade || computedGrade,
      });
      if (!res?.ok) throw new Error('Speichern fehlgeschlagen');
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
    setSaving(true);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/release`, { studentIds: [selectedStudentId] });
      if (!res?.ok) throw new Error('Freigabe fehlgeschlagen');
      await loadDetail(round.id);
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
    const res = await apiPut(`/api/epo-noten/${round.id}`, { groupIds });
    if (!res?.ok) return;
    await refresh();
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

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography variant="h6" sx={{ fontWeight: 800, color: epoNotenPalette.primary, flex: 1 }}>
          EPO-Noten — Lehrerbereich
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
          Neue Runde
        </Button>
      </Stack>

      <Card sx={epoNotenCardSx}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Runden</Typography>
          <List dense disablePadding>
            {rounds.map((r) => (
              <ListItemButton key={r.id} selected={r.id === selectedId} onClick={() => setSelectedId(r.id)}>
                <ListItemText
                  primary={r.title}
                  secondary={`${r.date} · abgegeben ${r.stats.submitted} · bewertet ${r.stats.graded} · freigegeben ${r.stats.released}`}
                />
                {r.publishedAt ? <Chip size="small" color="success" label="freigegeben" /> : <Chip size="small" label="Entwurf" />}
              </ListItemButton>
            ))}
            {rounds.length === 0 && (
              <Typography variant="body2" color="text.secondary">Noch keine Runde angelegt.</Typography>
            )}
          </List>
        </CardContent>
      </Card>

      {round && (
        <Card sx={epoNotenCardSx}>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{round.title}</Typography>
                <Box sx={{ flex: 1 }} />
                {!round.publishedAt ? (
                  <Button startIcon={<PublishIcon />} variant="contained" color="success" onClick={publish} disabled={saving}>
                    Für Lerngruppe freischalten
                  </Button>
                ) : (
                  <Button startIcon={<UnpublishedIcon />} variant="outlined" onClick={unpublish} disabled={saving}>
                    Freischaltung beenden
                  </Button>
                )}
                <IconButton onClick={removeRound} color="error" title="Runde löschen">
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary">Lerngruppen</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {groups.map((g) => (
                    <FormControlLabel
                      key={g.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={round.groupIds.includes(g.id)}
                          onChange={() => {
                            const next = round.groupIds.includes(g.id)
                              ? round.groupIds.filter((id) => id !== g.id)
                              : [...round.groupIds, g.id];
                            updateRoundGroups(next);
                          }}
                        />
                      }
                      label={`${g.name} (${g.studentCount})`}
                    />
                  ))}
                </Stack>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Box sx={{ minWidth: 220, maxWidth: 320 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Schüler</Typography>
                  <List dense sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {students.map((s) => (
                      <ListItemButton
                        key={s.studentId}
                        selected={s.studentId === selectedStudentId}
                        onClick={() => setSelectedStudentId(s.studentId)}
                      >
                        <ListItemText
                          primary={s.studentName}
                          secondary={
                            [
                              s.studentSubmittedAt ? 'SuS ✓' : 'SuS offen',
                              s.teacherGrade ? `Note ${s.teacherGrade}` : 'nicht bewertet',
                              s.teacherReleasedAt ? 'freigegeben' : '',
                            ].filter(Boolean).join(' · ')
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                  <Button fullWidth sx={{ mt: 1 }} variant="outlined" onClick={releaseAll} disabled={saving}>
                    Alle bewerteten freigeben
                  </Button>
                </Box>

                <Box sx={{ flex: 1 }}>
                  {!selectedStudent ? (
                    <Typography color="text.secondary">Schüler auswählen …</Typography>
                  ) : (
                    <Stack spacing={2}>
                      {selectedStudent.studentSubmittedAt ? (
                        <>
                          <Typography variant="subtitle2">Selbsteinschätzung</Typography>
                          <Typography variant="body2">
                            Notenvorschlag: <strong>{selectedStudent.suggestedGrade || '—'}</strong>
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {selectedStudent.justification || '—'}
                          </Typography>
                          <Typography variant="body2">
                            Punkte: {sumCategoryScores(selectedStudent.selfScores)} → Tabelle:{' '}
                            {selectedStudent.selfGradeFromTable || '—'}
                          </Typography>
                        </>
                      ) : (
                        <Alert severity="info">Noch keine Selbsteinschätzung abgegeben.</Alert>
                      )}

                      <EpoNotenCategoryGrid
                        label="Deine Einschätzung (Lehrkraft)"
                        categories={EPO_NOTEN_TEACHER_CATEGORIES}
                        scores={teacherScores}
                        onChange={setTeacherScores}
                      />
                      <Typography variant="body2">
                        Gesamtpunktzahl: <strong>{totalTeacher}</strong> → Note aus Tabelle: <strong>{computedGrade}</strong>
                      </Typography>
                      <TextField
                        label="EPO-Note (finale Note)"
                        size="small"
                        value={teacherGrade}
                        onChange={(e) => setTeacherGrade(e.target.value)}
                        helperText="Wird in die Notenliste übernommen — hier kannst du die Tabelle überschreiben."
                        sx={{ maxWidth: 200 }}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" onClick={saveTeacher} disabled={saving}>
                          Bewertung speichern
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={releaseOne} disabled={saving || !teacherGrade}>
                          An Schüler freigeben
                        </Button>
                      </Stack>

                      {selectedStudent.teacherReleasedAt && (
                        <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="subtitle2">Ziele der Schülerin / des Schülers</Typography>
                          <Typography variant="body2">Ziel: {selectedStudent.goal || '—'}</Typography>
                          <Typography variant="body2">Handlung: {selectedStudent.goalAction || '—'}</Typography>
                        </Box>
                      )}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving || !newTitle.trim()}>
            Anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
