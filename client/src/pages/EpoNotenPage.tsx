import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { apiGetSafe, apiPost } from '../lib/api';
import { EpoNotenTeacherView } from '../components/epo-noten/EpoNotenTeacherView';
import { EpoNotenCategoryGrid } from '../components/epo-noten/EpoNotenCategoryGrid';
import { EpoNotenStudentRoundList } from '../components/epo-noten/EpoNotenStudentRoundList';
import { EpoNotenStudentSelfWizard } from '../components/epo-noten/EpoNotenStudentSelfWizard';
import { epoNotenCardSx, epoNotenPageBgSx, epoNotenPalette } from '../components/epo-noten/epoNotenUi';
import {
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenStudentSession,
  gradeFromTotalPoints,
  emptyCategoryScores,
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

const compactIconBtn = {
  p: 0.25,
  minWidth: 28,
  width: 28,
  height: 28,
};

export default function EpoNotenPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = useMemo(() => detectIsTeacher(), []);

  const [loading, setLoading] = useState(!isTeacher);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<EpoNotenStudentSession[]>([]);
  const [myEntry, setMyEntry] = useState<EpoNotenEntry | null>(null);
  const [roundMeta, setRoundMeta] = useState<{ id: string; title: string; date: string; groupName: string } | null>(
    null,
  );
  const [canEditSelf, setCanEditSelf] = useState(false);
  const [canEditGoals, setCanEditGoals] = useState(false);
  const [teacherId, setTeacherId] = useState('');

  const [suggestedGrade, setSuggestedGrade] = useState('');
  const [justification, setJustification] = useState('');
  const [selfScores, setSelfScores] = useState(emptyCategoryScores());
  const [selfGradeFromTable, setSelfGradeFromTable] = useState('');
  const [goal, setGoal] = useState('');
  const [goalAction, setGoalAction] = useState('');

  const selectedRoundId = searchParams.get('roundId') || '';
  const showStudentList = !isTeacher && !selectedRoundId;

  const populateFromEntry = useCallback((entry: EpoNotenEntry | null) => {
    setSuggestedGrade(entry?.suggestedGrade || '');
    setJustification(entry?.justification || '');
    setSelfScores(
      entry?.selfScores?.length ? normalizeCategoryScores(entry.selfScores) : emptyCategoryScores(),
    );
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

      if (selectedRoundId) {
        setMyEntry((data.myEntry as EpoNotenEntry) || null);
        setCanEditSelf(Boolean(data.canEditSelf));
        setCanEditGoals(Boolean(data.canEditGoals));
        setTeacherId(typeof data.teacherId === 'string' ? data.teacherId : '');
        if (data.round && typeof data.round === 'object') {
          const r = data.round as { id: string; title: string; date: string; groupName: string };
          setRoundMeta(r);
        } else {
          const fromList = list.find((s) => s.id === selectedRoundId);
          if (fromList) {
            setRoundMeta({
              id: fromList.id,
              title: fromList.title,
              date: fromList.date,
              groupName: fromList.groupName,
            });
          }
        }
        populateFromEntry((data.myEntry as EpoNotenEntry) || null);
      } else {
        setMyEntry(null);
        setRoundMeta(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }, [populateFromEntry, selectedRoundId]);

  useEffect(() => {
    if (!isTeacher) loadStudent();
  }, [isTeacher, loadStudent, selectedRoundId]);

  const openRound = (id: string) => {
    setSearchParams({ roundId: id });
  };

  const backToList = () => {
    setSearchParams({});
  };

  const submitSelf = useCallback(async () => {
    const total = sumCategoryScores(selfScores);
    const gradeTable = gradeFromTotalPoints(total);
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/submit-self', {
        roundId: roundMeta?.id || selectedRoundId,
        teacherId,
        suggestedGrade,
        justification,
        selfScores,
        selfGradeFromTable: gradeTable,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Speichern fehlgeschlagen');
      }
      setSelfGradeFromTable(gradeTable);
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
          justifyContent="space-between"
          sx={{ mb: 1, minHeight: 32 }}
        >
          {!isTeacher && selectedRoundId ? (
            <IconButton onClick={backToList} aria-label="Zur Liste" size="small" sx={{ ...compactIconBtn, ml: -0.25 }}>
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : (
            <Box sx={{ width: 28 }} />
          )}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              color: epoNotenPalette.primary,
              fontSize: '0.88rem',
              flex: 1,
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              px: 0.5,
            }}
          >
            EPO-Noten
          </Typography>
          <IconButton
            onClick={() => navigate('/')}
            aria-label="Schließen"
            size="small"
            sx={{ ...compactIconBtn, mr: -0.25 }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
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
            ) : showStudentList ? (
              <EpoNotenStudentRoundList sessions={sessions} onSelect={openRound} />
            ) : (
              <>
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
