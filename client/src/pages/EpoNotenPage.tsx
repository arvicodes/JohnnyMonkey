import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiGetSafe, apiPost } from '../lib/api';
import { EpoNotenTeacherView } from '../components/epo-noten/EpoNotenTeacherView';
import { EpoNotenCategoryGrid } from '../components/epo-noten/EpoNotenCategoryGrid';
import { epoNotenCardSx, epoNotenPageBgSx, epoNotenPalette } from '../components/epo-noten/epoNotenUi';
import {
  EPO_NOTEN_POINTS_TO_GRADE,
  EPO_NOTEN_STUDENT_CATEGORIES,
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenStudentSession,
  gradeFromTotalPoints,
  normalizeCategoryScores,
  sumCategoryScores,
} from '../lib/epoNotenShared';

function detectIsTeacher(): boolean {
  const teacherId = localStorage.getItem('teacherId');
  const studentId = localStorage.getItem('studentId');
  if (teacherId && !studentId) return true;
  if (studentId && !teacherId) return false;
  return Boolean(teacherId);
}

export default function EpoNotenPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = useMemo(() => detectIsTeacher(), []);

  const [loading, setLoading] = useState(!isTeacher);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<EpoNotenStudentSession[]>([]);
  const [myEntry, setMyEntry] = useState<EpoNotenEntry | null>(null);
  const [roundMeta, setRoundMeta] = useState<{ id: string; title: string; date: string; groupName: string } | null>(null);
  const [canEditSelf, setCanEditSelf] = useState(false);
  const [canEditGoals, setCanEditGoals] = useState(false);
  const [teacherId, setTeacherId] = useState('');

  const [suggestedGrade, setSuggestedGrade] = useState('');
  const [justification, setJustification] = useState('');
  const [selfScores, setSelfScores] = useState(normalizeCategoryScores([]));
  const [selfGradeFromTable, setSelfGradeFromTable] = useState('');
  const [goal, setGoal] = useState('');
  const [goalAction, setGoalAction] = useState('');

  const selectedRoundId = searchParams.get('roundId') || '';

  const totalSelf = sumCategoryScores(selfScores);

  useEffect(() => {
    setSelfGradeFromTable(gradeFromTotalPoints(totalSelf));
  }, [totalSelf]);

  const populateFromEntry = useCallback((entry: EpoNotenEntry | null) => {
    setSuggestedGrade(entry?.suggestedGrade || '');
    setJustification(entry?.justification || '');
    setSelfScores(normalizeCategoryScores(entry?.selfScores));
    setSelfGradeFromTable(entry?.selfGradeFromTable || gradeFromTotalPoints(sumCategoryScores(entry?.selfScores)));
    setGoal(entry?.goal || '');
    setGoalAction(entry?.goalAction || '');
  }, []);

  const loadStudent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = selectedRoundId ? `?roundId=${encodeURIComponent(selectedRoundId)}` : '';
      const res = await apiGetSafe(`/api/epo-noten/current${q}`);
      if (!res?.ok) throw new Error('Daten konnten nicht geladen werden');
      const data = await res.json();
      const list = Array.isArray(data.sessions) ? (data.sessions as EpoNotenStudentSession[]) : [];
      setSessions(list);
      setMyEntry((data.myEntry as EpoNotenEntry) || null);
      setCanEditSelf(Boolean(data.canEditSelf));
      setCanEditGoals(Boolean(data.canEditGoals));
      setTeacherId(typeof data.teacherId === 'string' ? data.teacherId : '');
      if (data.round && typeof data.round === 'object') {
        const r = data.round as { id: string; title: string; date: string; groupName: string };
        setRoundMeta(r);
        if (!selectedRoundId && r.id) {
          setSearchParams({ roundId: r.id }, { replace: true });
        }
      }
      populateFromEntry((data.myEntry as EpoNotenEntry) || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }, [populateFromEntry, selectedRoundId, setSearchParams]);

  useEffect(() => {
    if (!isTeacher) loadStudent();
  }, [isTeacher, loadStudent, selectedRoundId]);

  const onSelectRound = (id: string) => {
    setSearchParams({ roundId: id });
  };

  const submitSelf = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/submit-self', {
        roundId: roundMeta?.id || selectedRoundId,
        teacherId,
        suggestedGrade,
        justification,
        selfScores,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Speichern fehlgeschlagen');
      }
      await loadStudent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  const submitGoals = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/submit-goals', {
        roundId: roundMeta?.id || selectedRoundId,
        teacherId,
        goal,
        goalAction,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Speichern fehlgeschlagen');
      }
      await loadStudent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  const phase = useMemo(() => {
    if (!myEntry?.studentSubmittedAt) return 'self';
    if (!myEntry?.teacherReleasedAt) return 'wait';
    if (!myEntry?.goalsSubmittedAt) return 'goals';
    return 'done';
  }, [myEntry]);

  return (
    <Box sx={epoNotenPageBgSx}>
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Zurück">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 800, color: epoNotenPalette.primary }}>
            EPO-Noten · Epochale Mitarbeit
          </Typography>
        </Stack>

        {isTeacher ? (
          <EpoNotenTeacherView />
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            {sessions.length === 0 ? (
              <Alert severity="info">Sobald deine Lehrkraft eine EPO-Runde freischaltet, erscheint sie hier.</Alert>
            ) : (
              <>
                {sessions.length > 1 && (
                  <Select
                    size="small"
                    fullWidth
                    value={roundMeta?.id || selectedRoundId}
                    onChange={(e) => onSelectRound(String(e.target.value))}
                  >
                    {sessions.map((s) => (
                      <MenuItem key={`${s.id}-${s.groupId}`} value={s.id}>
                        {s.title} ({s.groupName})
                      </MenuItem>
                    ))}
                  </Select>
                )}

                {roundMeta && (
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {roundMeta.title} · {roundMeta.date} · {roundMeta.groupName}
                  </Typography>
                )}

                {phase === 'self' && (
                  <Card sx={epoNotenCardSx}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="h6">Deine Selbsteinschätzung</Typography>
                        <TextField
                          label="Notenvorschlag für deine aktuelle EPO-Note"
                          value={suggestedGrade}
                          onChange={(e) => setSuggestedGrade(e.target.value)}
                          disabled={!canEditSelf}
                          fullWidth
                        />
                        <TextField
                          label="Kurze Begründung"
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          disabled={!canEditSelf}
                          multiline
                          minRows={3}
                          fullWidth
                        />
                        <EpoNotenCategoryGrid
                          categories={EPO_NOTEN_STUDENT_CATEGORIES}
                          scores={selfScores}
                          onChange={setSelfScores}
                          readOnly={!canEditSelf}
                        />
                        <Typography variant="body2">
                          Gesamtpunktzahl: <strong>{totalSelf}</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <TableMini />
                          <TextField
                            label="Note aus Tabelle"
                            value={selfGradeFromTable}
                            onChange={(e) => setSelfGradeFromTable(e.target.value)}
                            disabled={!canEditSelf}
                            sx={{ minWidth: 140 }}
                          />
                        </Box>
                        {canEditSelf && (
                          <Button variant="contained" onClick={submitSelf} disabled={submitting}>
                            Abgeben
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {phase === 'wait' && (
                  <Alert severity="success">
                    Deine Selbsteinschätzung ist abgegeben. Warte auf die Bewertung deiner Lehrkraft.
                  </Alert>
                )}

                {(phase === 'goals' || phase === 'done') && myEntry && (
                  <>
                    <Card sx={epoNotenCardSx}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>Einschätzung deiner Lehrkraft</Typography>
                        <EpoNotenCategoryGrid
                          categories={EPO_NOTEN_TEACHER_CATEGORIES}
                          scores={normalizeCategoryScores(myEntry.teacherScores)}
                          readOnly
                        />
                        <Typography variant="h5" sx={{ mt: 2, fontWeight: 800, color: epoNotenPalette.accent }}>
                          Deine EPO-Note: {myEntry.teacherGrade || '—'}
                        </Typography>
                      </CardContent>
                    </Card>

                    <Card sx={epoNotenCardSx}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>Dein Ziel für den nächsten Zeitraum</Typography>
                        <TextField
                          label="Ein konkretes Ziel"
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          disabled={!canEditGoals || phase === 'done'}
                          multiline
                          minRows={2}
                          fullWidth
                          sx={{ mb: 2 }}
                        />
                        <TextField
                          label="Eine konkrete Handlung dazu"
                          value={goalAction}
                          onChange={(e) => setGoalAction(e.target.value)}
                          disabled={!canEditGoals || phase === 'done'}
                          multiline
                          minRows={2}
                          fullWidth
                        />
                        {canEditGoals && phase === 'goals' && (
                          <Button sx={{ mt: 2 }} variant="contained" onClick={submitGoals} disabled={submitting}>
                            Ziele speichern
                          </Button>
                        )}
                        {phase === 'done' && (
                          <Alert sx={{ mt: 2 }} severity="info">Deine Ziele sind gespeichert und bleiben hier sichtbar.</Alert>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function TableMini() {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minWidth: 120 }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>Punkte → Note</Typography>
      {EPO_NOTEN_POINTS_TO_GRADE.map((row) => (
        <Typography key={row.minPoints} variant="caption" display="block">
          ≥ {row.minPoints}: {row.grade}
        </Typography>
      ))}
    </Box>
  );
}
