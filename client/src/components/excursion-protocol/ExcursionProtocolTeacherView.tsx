import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { ExcursionProtocolSubmissionDetail } from './ExcursionProtocolSubmissionDetail';
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import {
  compactIconSx,
  protocolActionBarSx,
  protocolBtnAccentSx,
  protocolBtnDangerSx,
  protocolBtnDraftSx,
  protocolBtnGhostSx,
  protocolBtnPublishSx,
  protocolBtnToggleSx,
  protocolCardSx,
  protocolEditorCardSx,
  protocolFieldSx,
  protocolGroupChipSx,
  protocolIconBtnSx,
  protocolListItemSx,
  protocolPalette,
  protocolSectionLabelSx,
  protocolStatusChipSx,
} from './excursionProtocolUi';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import {
  DEFAULT_RATING_CRITERIA,
  DEFAULT_REFLECTION_QUESTIONS,
  formatEditDeadlineLabel,
  type ExcursionListItem,
  type ExcursionProtocolSubmission,
  type ExcursionStudentRosterEntry,
  type ExcursionTeacherGroup,
} from '../../lib/excursionProtocolTypes';

const cardPaddingSx = { p: { xs: 1, sm: 1.25 }, '&:last-child': { pb: { xs: 1, sm: 1.25 } } };

const titleDateRowSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
  gap: 1,
  alignItems: 'start',
};

const criteriaGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
  gap: 0.75,
};

const groupChipGridSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.5,
};

const toDatetimeLocal = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyDraft = (allGroupIds: string[] = []) => ({
  title: '',
  date: new Date().toISOString().slice(0, 10),
  groupIds: [...allGroupIds],
  criteria: [...DEFAULT_RATING_CRITERIA],
  editDeadline: '',
});

type Props = {
  formatDisplayDate: (isoDate: string) => string;
};

export function ExcursionProtocolTeacherView({ formatDisplayDate }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [excursions, setExcursions] = useState<ExcursionListItem[]>([]);
  const [groups, setGroups] = useState<ExcursionTeacherGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draftGroupIds, setDraftGroupIds] = useState<string[]>([]);
  const [draftCriteria, setDraftCriteria] = useState<string[]>([...DEFAULT_RATING_CRITERIA]);
  const [draftEditDeadline, setDraftEditDeadline] = useState('');

  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [teacherSubmissions, setTeacherSubmissions] = useState<ExcursionProtocolSubmission[]>([]);
  const [studentRoster, setStudentRoster] = useState<ExcursionStudentRosterEntry[]>([]);
  const [rosterPendingCount, setRosterPendingCount] = useState(0);
  const [rosterTitle, setRosterTitle] = useState('');
  const [reflectionQuestions, setReflectionQuestions] =
    useState<[string, string, string]>(DEFAULT_REFLECTION_QUESTIONS);

  const selected = excursions.find((e) => e.id === selectedId) ?? null;
  const isNew = selectedId === '__new__';

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiGet('/api/excursion-protocol/list');
      if (!response.ok) throw new Error('Laden fehlgeschlagen');
      const data = await response.json();
      setExcursions(Array.isArray(data?.excursions) ? data.excursions : []);
      setGroups(Array.isArray(data?.groups) ? data.groups : []);
      setLoadError(null);
    } catch {
      if (!silent) setLoadError('Protokolle konnten nicht geladen werden.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList(false);
  }, [loadList]);

  useEffect(() => {
    if (isNew && groups.length > 0 && draftGroupIds.length === 0) {
      setDraftGroupIds(groups.map((g) => g.id));
    }
  }, [isNew, groups, draftGroupIds.length]);

  const resetDraft = (item?: ExcursionListItem | null) => {
    if (!item) {
      const d = emptyDraft(groups.map((g) => g.id));
      setDraftTitle(d.title);
      setDraftDate(d.date);
      setDraftGroupIds(d.groupIds);
      setDraftCriteria(d.criteria);
      setDraftEditDeadline(d.editDeadline);
      return;
    }
    setDraftTitle(item.title);
    setDraftDate(item.date);
    setDraftGroupIds([...item.groupIds]);
    setDraftCriteria(
      item.ratingCriteria?.length ? [...item.ratingCriteria] : [...DEFAULT_RATING_CRITERIA],
    );
    setDraftEditDeadline(toDatetimeLocal(item.editDeadline));
  };

  const startNew = () => {
    setSelectedId('__new__');
    resetDraft(null);
    setSuccessMsg(null);
  };

  const selectExcursion = (item: ExcursionListItem) => {
    setSelectedId(item.id);
    resetDraft(item);
    setSuccessMsg(null);
  };

  const toggleGroup = (groupId: string) => {
    setDraftGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  const selectAllGroups = () => setDraftGroupIds(groups.map((g) => g.id));
  const clearAllGroups = () => setDraftGroupIds([]);

  const handleSave = async () => {
    if (!draftTitle.trim()) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const payload = {
        title: draftTitle.trim(),
        date: draftDate,
        groupIds: draftGroupIds,
        ratingCriteria: draftCriteria.filter((c) => c.trim()),
        reflectionQuestions: DEFAULT_REFLECTION_QUESTIONS,
        editDeadline: draftEditDeadline ? new Date(draftEditDeadline).toISOString() : null,
      };

      if (isNew) {
        const response = await apiPost('/api/excursion-protocol/create', payload);
        if (!response.ok) throw new Error('Erstellen fehlgeschlagen');
        const result = await response.json();
        const newId = typeof result?.excursion?.id === 'string' ? result.excursion.id : '';
        await loadList(true);
        if (newId) {
          setSelectedId(newId);
        }
        setSuccessMsg('Protokoll als Entwurf gespeichert.');
      } else if (selectedId) {
        const response = await apiPut(`/api/excursion-protocol/${selectedId}`, payload);
        if (!response.ok) throw new Error('Speichern fehlgeschlagen');
        await loadList(true);
        setSuccessMsg('Änderungen gespeichert.');
      }
    } catch {
      setLoadError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftTitle.trim()) return;
    if (draftGroupIds.length === 0) {
      setLoadError('Bitte mindestens eine Lerngruppe auswählen.');
      return;
    }
    setPublishing(true);
    setSuccessMsg(null);
    try {
      let excursionId = selectedId;
      if (isNew || !excursionId) {
        const createRes = await apiPost('/api/excursion-protocol/create', {
          title: draftTitle.trim(),
          date: draftDate,
          groupIds: draftGroupIds,
          ratingCriteria: draftCriteria.filter((c) => c.trim()),
          editDeadline: draftEditDeadline ? new Date(draftEditDeadline).toISOString() : null,
        });
        if (!createRes.ok) throw new Error('Erstellen fehlgeschlagen');
        const created = await createRes.json();
        excursionId = typeof created?.excursion?.id === 'string' ? created.excursion.id : '';
      } else {
        const updateRes = await apiPut(`/api/excursion-protocol/${excursionId}`, {
          title: draftTitle.trim(),
          date: draftDate,
          groupIds: draftGroupIds,
          ratingCriteria: draftCriteria.filter((c) => c.trim()),
          editDeadline: draftEditDeadline ? new Date(draftEditDeadline).toISOString() : null,
        });
        if (!updateRes.ok) throw new Error('Speichern fehlgeschlagen');
      }

      if (!excursionId) throw new Error('Keine ID');

      const pubRes = await apiPost(`/api/excursion-protocol/${excursionId}/publish`, {
        groupIds: draftGroupIds,
      });
      if (!pubRes.ok) throw new Error('Freigabe fehlgeschlagen');

      setSelectedId(excursionId);
      await loadList(true);
      const names = groups.filter((g) => draftGroupIds.includes(g.id)).map((g) => g.name);
      setSuccessMsg(
        names.length > 0
          ? `Freigegeben für: ${names.join(', ')} — Schüler dieser Gruppen sehen das Protokoll im Dashboard.`
          : 'Protokoll freigegeben.',
      );
      setLoadError(null);
    } catch {
      setLoadError('Freigabe fehlgeschlagen — bitte erneut versuchen.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isNew) return;
    if (!window.confirm('Protokoll wirklich löschen? Abgaben gehen verloren.')) return;
    try {
      const response = await apiDelete(`/api/excursion-protocol/${selectedId}`);
      if (!response.ok) throw new Error('Löschen fehlgeschlagen');
      setSelectedId(null);
      resetDraft(null);
      await loadList(true);
      setSuccessMsg('Protokoll gelöscht.');
    } catch {
      setLoadError('Löschen fehlgeschlagen.');
    }
  };

  const loadTeacherSubmissions = async (excursionId: string, title: string) => {
    try {
      const response = await apiGet(`/api/excursion-protocol/submissions?excursionId=${encodeURIComponent(excursionId)}`);
      if (!response.ok) return;
      const data = await response.json();
      setTeacherSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
      setStudentRoster(Array.isArray(data?.roster) ? data.roster : []);
      setRosterPendingCount(typeof data?.pendingCount === 'number' ? data.pendingCount : 0);
      setRosterTitle(title);
      if (Array.isArray(data?.session?.reflectionQuestions)) {
        const rq = data.session.reflectionQuestions as string[];
        setReflectionQuestions([
          rq[0] || DEFAULT_REFLECTION_QUESTIONS[0],
          rq[1] || DEFAULT_REFLECTION_QUESTIONS[1],
          rq[2] || DEFAULT_REFLECTION_QUESTIONS[2],
        ]);
      }
      setSelectedSubmissionId(null);
      setSubmissionsDialogOpen(true);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.25}>
        {loadError && (
          <Typography variant="caption" color="warning.main" sx={{ textAlign: 'center', display: 'block' }}>
            {loadError}
          </Typography>
        )}
        {successMsg && (
          <Box
            sx={{
              px: 1.25,
              py: 0.75,
              borderRadius: 2,
              textAlign: 'center',
              bgcolor: 'rgba(46,125,50,0.1)',
              border: '1px solid rgba(46,125,50,0.25)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: protocolPalette.success }}>
              {successMsg}
            </Typography>
          </Box>
        )}

        <Card elevation={0} sx={protocolCardSx}>
          <CardContent sx={cardPaddingSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: protocolPalette.deep, flex: 1, minWidth: 0 }}>
                Protokolle
              </Typography>
              <Box sx={{ ...protocolActionBarSx(1, 72), flexShrink: 0 }}>
                <Button size="small" variant="contained" onClick={startNew} sx={protocolBtnAccentSx}>
                  + Neu
                </Button>
              </Box>
            </Stack>

            {excursions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Noch keine Protokolle.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {excursions.map((item, listIndex) => (
                  <Box
                    key={item.id}
                    onClick={() => selectExcursion(item)}
                    sx={protocolListItemSx(selectedId === item.id, listIndex)}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="flex-start">
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" sx={{ fontWeight: 800, color: protocolPalette.deep }}>
                            {item.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={item.isPublished ? '● Live' : 'Entwurf'}
                            sx={protocolStatusChipSx(item.isPublished)}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>
                          {formatDisplayDate(item.date)}
                          {item.groupNames.length > 0 && ` · ${item.groupNames.join(', ')}`}
                          {item.isPublished && ` · ${item.submissionCount}/${item.totalStudents}`}
                        </Typography>
                      </Box>
                      {item.isPublished && (
                        <Tooltip title="Schülerübersicht">
                          <IconButton
                            size="small"
                            aria-label="Schülerübersicht"
                            onClick={(e) => {
                              e.stopPropagation();
                              void loadTeacherSubmissions(item.id, item.title);
                            }}
                            sx={{ ...protocolIconBtnSx, flexShrink: 0, ml: 'auto' }}
                          >
                            <VisibilityIcon sx={compactIconSx} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {(selectedId || isNew) && (
          <Card elevation={0} sx={protocolEditorCardSx}>
            <CardContent sx={cardPaddingSx}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: protocolPalette.deep }}>
                {isNew ? '✦ Neues Protokoll' : selected?.isPublished ? 'Bearbeiten' : 'Entwurf'}
              </Typography>
              <Stack spacing={1.25}>
                <Box sx={titleDateRowSx}>
                  <TextField
                    size="small"
                    label="Titel"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    fullWidth
                    placeholder="z. B. Tagesexkursion Museum"
                    sx={protocolFieldSx}
                  />
                  <TextField
                    size="small"
                    label="Datum"
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    sx={{ ...protocolFieldSx, width: { xs: '100%', sm: 148 } }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box>
                  <TextField
                    size="small"
                    label="Bearbeiten erlaubt bis (optional)"
                    type="datetime-local"
                    value={draftEditDeadline}
                    onChange={(e) => setDraftEditDeadline(e.target.value)}
                    fullWidth
                    helperText={
                      draftEditDeadline
                        ? formatEditDeadlineLabel(new Date(draftEditDeadline).toISOString())
                        : 'Leer = Schüler können abgegebene Protokolle jederzeit bearbeiten'
                    }
                    sx={protocolFieldSx}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} sx={{ mb: 0.5 }}>
                    <Typography component="span" sx={{ ...protocolSectionLabelSx, mb: 0, flex: 1 }}>
                      Lerngruppen
                      {draftGroupIds.length === 0 && (
                        <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 0.75, fontWeight: 600 }}>
                          (min. 1)
                        </Typography>
                      )}
                    </Typography>
                    {groups.length > 0 && (
                      <Box sx={{ ...protocolActionBarSx(2, 128), flexShrink: 0 }}>
                        <Button size="small" onClick={selectAllGroups} sx={protocolBtnToggleSx(true)}>
                          Alle
                        </Button>
                        <Button size="small" onClick={clearAllGroups} sx={protocolBtnToggleSx(false)}>
                          Keine
                        </Button>
                      </Box>
                    )}
                  </Stack>
                  {groups.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      Keine Lerngruppen.
                    </Typography>
                  ) : (
                    <Box sx={groupChipGridSx}>
                      {groups.map((g, groupIndex) => {
                        const on = draftGroupIds.includes(g.id);
                        return (
                          <Chip
                            key={g.id}
                            size="small"
                            label={`${g.name} (${g.studentCount})`}
                            onClick={() => toggleGroup(g.id)}
                            sx={protocolGroupChipSx(on, groupIndex)}
                          />
                        );
                      })}
                    </Box>
                  )}
                </Box>

                <Box>
                  <Typography sx={protocolSectionLabelSx}>Bewertungskriterien</Typography>
                  <Box sx={criteriaGridSx}>
                    {draftCriteria.map((criterion, index) => (
                      <TextField
                        key={`crit-${index}`}
                        size="small"
                        value={criterion}
                        onChange={(e) => {
                          const next = [...draftCriteria];
                          next[index] = e.target.value;
                          setDraftCriteria(next);
                        }}
                        fullWidth
                        sx={protocolFieldSx}
                      />
                    ))}
                  </Box>
                  <Box sx={{ ...protocolActionBarSx(1, 120), mt: 0.5 }}>
                    <Button
                      size="small"
                      onClick={() => setDraftCriteria((prev) => [...prev, ''])}
                      sx={protocolBtnGhostSx}
                    >
                      + Kriterium
                    </Button>
                  </Box>
                </Box>

                <Box sx={protocolActionBarSx(isNew ? 2 : 3, 320)}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void handleSave()}
                    disabled={saving || !draftTitle.trim()}
                    sx={protocolBtnDraftSx}
                  >
                    {saving ? '…' : 'Entwurf'}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => void handlePublish()}
                    disabled={publishing || !draftTitle.trim() || draftGroupIds.length === 0}
                    sx={protocolBtnPublishSx}
                  >
                    {publishing ? '…' : 'Freigeben'}
                  </Button>
                  {!isNew && selectedId && (
                    <Button
                      size="small"
                      onClick={() => void handleDelete()}
                      sx={protocolBtnDangerSx}
                    >
                      Löschen
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <Dialog
        open={submissionsDialogOpen}
        onClose={() => {
          setSubmissionsDialogOpen(false);
          setSelectedSubmissionId(null);
        }}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { width: 'min(1400px, 98vw)', maxHeight: '92vh' } }}
      >
        <DialogTitle sx={{ ...dialogCloseTitleSx }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Schülerübersicht — {rosterTitle}
          </Typography>
          <DialogCloseIconButton onClose={() => setSubmissionsDialogOpen(false)} />
        </DialogTitle>
        <DialogContent dividers>
          {studentRoster.length === 0 ? (
            <Typography color="text.secondary">Keine Schüler in den gewählten Gruppen.</Typography>
          ) : selectedSubmissionId ? (
            <Stack spacing={1.5}>
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => setSelectedSubmissionId(null)}
                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
              >
                Zurück zur Liste
              </Button>
              {(() => {
                const sub =
                  teacherSubmissions.find((s) => s.studentId === selectedSubmissionId) ??
                  studentRoster.find((e) => e.studentId === selectedSubmissionId)?.submission;
                if (!sub) {
                  return <Typography color="text.secondary">Abgabe nicht gefunden.</Typography>;
                }
                const rosterEntry = studentRoster.find((e) => e.studentId === sub.studentId);
                return (
                  <ExcursionProtocolSubmissionDetail
                    submission={sub}
                    reflectionQuestions={reflectionQuestions}
                    title={sub.studentName}
                    subtitle={[
                      rosterEntry?.groupName,
                      sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('de-DE') : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                );
              })()}
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {teacherSubmissions.length} abgegeben · {rosterPendingCount} noch offen · {studentRoster.length} Schüler
                gesamt
              </Typography>
              <Stack spacing={0.75}>
                {studentRoster.map((entry) => (
                  <Box
                    key={`${entry.groupId}-${entry.studentId}`}
                    onClick={() => {
                      if (entry.submitted && entry.submission) {
                        setSelectedSubmissionId(entry.studentId);
                      }
                    }}
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: entry.submitted ? 'success.light' : 'divider',
                      bgcolor: entry.submitted ? 'rgba(76,175,80,0.06)' : 'rgba(0,0,0,0.02)',
                      cursor: entry.submitted ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                      '&:hover': entry.submitted
                        ? { borderColor: 'success.main', boxShadow: '0 2px 8px rgba(76,175,80,0.15)' }
                        : undefined,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {entry.studentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {entry.groupName}
                          {entry.submittedAt
                            ? ` · ${new Date(entry.submittedAt).toLocaleString('de-DE')}`
                            : ''}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={entry.submitted ? 'Abgabe ansehen' : 'Noch offen'}
                        color={entry.submitted ? 'success' : 'default'}
                        sx={{ fontWeight: 600, flexShrink: 0 }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmissionsDialogOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
