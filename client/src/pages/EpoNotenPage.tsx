import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
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
import { EpoNotenStudentSelfWizard } from '../components/epo-noten/EpoNotenStudentSelfWizard';
import { epoNotenCardSx, epoNotenPageBgSx, epoNotenPalette } from '../components/epo-noten/epoNotenUi';
import {
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

  const populateFromEntry = useCallback((entry: EpoNotenEntry | null) => {
    setSuggestedGrade(entry?.suggestedGrade || '');
    setJustification(entry?.justification || '');
    setSelfScores(normalizeCategoryScores(entry?.selfScores));
    setSelfGradeFromTable(
      entry?.selfGradeFromTable || gradeFromTotalPoints(sumCategoryScores(entry?.selfScores)),
    );
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

  const submitSelf = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/submit-self', {
        roundId: roundMeta?.id || selectedRoundId,
        teacherId,
        suggestedGrade,
        justification,
        selfScores,
        selfGradeFromTable: selfGradeFromTable || gradeFromTotalPoints(sumCategoryScores(selfScores)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Speichern fehlgeschlagen');
      }
      await loadStudent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
      throw e;
    } finally {
      setSubmitting(false);
    }
  }, [
    justification,
    loadStudent,
    roundMeta?.id,
    selectedRoundId,
    selfGradeFromTable,
    selfScores,
    suggestedGrade,
    teacherId,
  ]);

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
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ mb: 1, minHeight: 36 }}
        >
          <IconButton
            onClick={() => navigate(-1)}
            aria-label="Zurück"
            size="small"
            sx={{ p: 0.5, ml: -0.5 }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 800,
              color: epoNotenPalette.primary,
              fontSize: '0.95rem',
              lineHeight: 1.2,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            EPO-Noten
          </Typography>
        </Stack>

        {isTeacher ? (
          <EpoNotenTeacherView />
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={1.25}>
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
                    sx={{ fontSize: '0.85rem' }}
                  >
                    {sessions.map((s) => (
                      <MenuItem key={`${s.id}-${s.groupId}`} value={s.id}>
                        {s.title} ({s.groupName})
                      </MenuItem>
                    ))}
                  </Select>
                )}

                {roundMeta && (
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {roundMeta.title} · {roundMeta.date} · {roundMeta.groupName}
                  </Typography>
                )}

                {(phase === 'self' || phase === 'wait') && (
                  <EpoNotenStudentSelfWizard
                    locked={phase === 'wait' || !canEditSelf}
                    submitting={submitting}
                    suggestedGrade={suggestedGrade}
                    justification={justification}
                    selfScores={selfScores}
                    selfGradeFromTable={selfGradeFromTable}
                    onSuggestedGradeChange={setSuggestedGrade}
                    onJustificationChange={setJustification}
                    onSelfScoresChange={setSelfScores}
                    onSelfGradeFromTableChange={setSelfGradeFromTable}
                    onSubmit={submitSelf}
                    startAtDone={phase === 'wait'}
                  />
                )}

                {(phase === 'goals' || phase === 'done') && myEntry && (
                  <>
                    <Box sx={epoNotenCardSx}>
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 800 }}>
                          Einschätzung deiner Lehrkraft
                        </Typography>
                        <EpoNotenCategoryGrid
                          categories={EPO_NOTEN_TEACHER_CATEGORIES}
                          scores={normalizeCategoryScores(myEntry.teacherScores)}
                          readOnly
                        />
                        <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 800, color: epoNotenPalette.accent }}>
                          Deine EPO-Note: {myEntry.teacherGrade || '—'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={epoNotenCardSx}>
                      <Box sx={{ p: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 800 }}>
                          Dein Ziel für den nächsten Zeitraum
                        </Typography>
                        <TextField
                          label="Ein konkretes Ziel"
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          disabled={!canEditGoals || phase === 'done'}
                          multiline
                          minRows={2}
                          fullWidth
                          size="small"
                          sx={{ mb: 1.5 }}
                        />
                        <TextField
                          label="Eine konkrete Handlung dazu"
                          value={goalAction}
                          onChange={(e) => setGoalAction(e.target.value)}
                          disabled={!canEditGoals || phase === 'done'}
                          multiline
                          minRows={2}
                          fullWidth
                          size="small"
                        />
                        {canEditGoals && phase === 'goals' && (
                          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button size="small" variant="contained" onClick={() => void submitGoals()} disabled={submitting}>
                              Ziele speichern
                            </Button>
                          </Box>
                        )}
                        {phase === 'done' && (
                          <Alert sx={{ mt: 1.5 }} severity="info">
                            Deine Ziele sind gespeichert und bleiben hier sichtbar.
                          </Alert>
                        )}
                      </Box>
                    </Box>
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
