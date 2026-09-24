import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { EpoNotenGradeTable } from '../components/epo-noten/EpoNotenGradeTable';
import { EpoNotenStudentRoundList } from '../components/epo-noten/EpoNotenStudentRoundList';
import { EpoNotenStudentSelfWizard } from '../components/epo-noten/EpoNotenStudentSelfWizard';
import {
  epoNotenCardSx,
  epoNotenPageBgSx,
  epoNotenPageShellSx,
  epoNotenPalette,
  epoNotenStudentSurfaceSx,
  epoNotenStudentGoalDisplaySx,
  epoNotenStudentGoalFieldSx,
  epoNotenStudentGoalHintSx,
  epoNotenStudentGoalLabelSx,
  epoNotenStudentGoalsHeaderSx,
  epoNotenStudentGoalsShellSx,
} from '../components/epo-noten/epoNotenUi';
import {
  EPO_NOTEN_STUDENT_CATEGORIES,
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenStudentSession,
  emptyCategoryScores,
  minPointsThresholdForTotal,
  normalizeCategoryScores,
  rasterResultFromTotal,
  sumCategoryScores,
  type EpoNotenAssessmentMode,
} from '../lib/epoNotenShared';

function detectIsTeacher(): boolean {
  const teacherId = localStorage.getItem('teacherId');
  const studentId = localStorage.getItem('studentId');
  if (teacherId && !studentId) return true;
  if (studentId && !teacherId) return false;
  return Boolean(teacherId);
}

const compactIconBtn = {
  p: 0,
  minWidth: 24,
  width: 24,
  height: 24,
  borderRadius: 1,
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
  const [assessmentMode, setAssessmentMode] = useState<EpoNotenAssessmentMode>('note');
  const [justification, setJustification] = useState('');
  const [selfScores, setSelfScores] = useState(emptyCategoryScores());
  const [selfGradeFromTable, setSelfGradeFromTable] = useState('');
  const [goal, setGoal] = useState('');
  const [goalAction, setGoalAction] = useState('');

  const selfFormDirtyRef = useRef(false);

  const selectedRoundId = searchParams.get('roundId') || '';
  const showStudentList = !isTeacher && !selectedRoundId;

  const populateFromEntry = useCallback(
    (entry: EpoNotenEntry | null, mode: EpoNotenAssessmentMode) => {
      if (!selfFormDirtyRef.current) {
        setSuggestedGrade(entry?.suggestedGrade || '');
        setJustification(entry?.justification || '');
        setSelfScores(
          entry?.selfScores?.length ? normalizeCategoryScores(entry.selfScores) : emptyCategoryScores(),
        );
        const pts = sumCategoryScores(entry?.selfScores);
        if (entry?.selfScores?.length) {
          const fromEntry = entry.selfGradeFromTable?.trim();
          setSelfGradeFromTable(fromEntry || rasterResultFromTotal(mode, pts));
        } else {
          setSelfGradeFromTable('');
        }
      }
      setGoal(entry?.goal || '');
      setGoalAction(entry?.goalAction || '');
    },
    [],
  );

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
        const myEntryLoaded = (data.myEntry as EpoNotenEntry) || null;
        setMyEntry(myEntryLoaded);
        setCanEditSelf(Boolean(data.canEditSelf));
        setCanEditGoals(Boolean(data.canEditGoals));
        setTeacherId(typeof data.teacherId === 'string' ? data.teacherId : '');

        const fromList = list.find((s) => s.id === selectedRoundId);
        let mode: EpoNotenAssessmentMode = 'note';

        if (data.round && typeof data.round === 'object') {
          const r = data.round as {
            id: string;
            title: string;
            date: string;
            groupName: string;
            assessmentMode?: EpoNotenAssessmentMode;
          };
          setRoundMeta({ id: r.id, title: r.title, date: r.date, groupName: r.groupName });
          mode = r.assessmentMode === 'mss' ? 'mss' : 'note';
        } else if (fromList) {
          setRoundMeta({
            id: fromList.id,
            title: fromList.title,
            date: fromList.date,
            groupName: fromList.groupName,
          });
          mode = fromList.assessmentMode === 'mss' ? 'mss' : 'note';
        }

        if (!data.round && !fromList) {
          mode = myEntryLoaded?.suggestedGradeMode === 'mss' ? 'mss' : 'note';
        }

        setAssessmentMode(mode);
        populateFromEntry(myEntryLoaded, mode);
      } else {
        setMyEntry(null);
        setRoundMeta(null);
        setAssessmentMode('note');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }, [populateFromEntry, selectedRoundId]);

  useEffect(() => {
    selfFormDirtyRef.current = false;
  }, [selectedRoundId]);

  useEffect(() => {
    if (!isTeacher) loadStudent();
  }, [isTeacher, loadStudent, selectedRoundId]);

  const openRound = (id: string) => {
    selfFormDirtyRef.current = false;
    setSearchParams({ roundId: id });
  };

  const backToList = () => {
    setSearchParams({});
  };

  const submitSelf = useCallback(async () => {
    const total = sumCategoryScores(selfScores);
    const gradeTable = rasterResultFromTotal(assessmentMode, total);
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
      selfFormDirtyRef.current = false;
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
    assessmentMode,
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
    <Box sx={{ ...epoNotenPageBgSx, py: isTeacher ? 0.35 : epoNotenPageBgSx.py }}>
      <Box sx={epoNotenPageShellSx}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: isTeacher ? 0.25 : 0.65, minHeight: isTeacher ? 22 : 26 }}
        >
          {!isTeacher && selectedRoundId ? (
            <IconButton onClick={backToList} aria-label="Zur Liste" size="small" sx={{ ...compactIconBtn, ml: -0.25 }}>
              <ArrowBackIcon sx={{ fontSize: 15 }} />
            </IconButton>
          ) : (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 800,
                color: epoNotenPalette.primary,
                fontSize: isTeacher ? '0.8rem' : '0.88rem',
                minWidth: 0,
                pl: isTeacher ? 0.25 : 0,
              }}
            >
              {isTeacher ? 'EPO — Lehrer' : ''}
            </Typography>
          )}
          {!isTeacher && (
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
          )}
          {isTeacher && <Box sx={{ flex: 1 }} />}
          <IconButton
            onClick={() => navigate('/')}
            aria-label="Schließen"
            size="small"
            sx={{ ...compactIconBtn, mr: -0.25 }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Stack>

        {isTeacher ? (
          <EpoNotenTeacherView />
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={1.25} sx={{ width: '100%' }}>
            {error && <Alert severity="error">{error}</Alert>}

            {sessions.length === 0 ? (
              <Alert severity="info">Sobald deine Lehrkraft eine EPO-Runde freischaltet, erscheint sie hier.</Alert>
            ) : showStudentList ? (
              <EpoNotenStudentRoundList sessions={sessions} onSelect={openRound} />
            ) : (
              <>
                {sessions.find((s) => s.id === (roundMeta?.id || selectedRoundId))?.isArchived && (
                  <Alert severity="info" sx={{ py: 0.75 }}>
                    Diese ältere Runde ist abgeschlossen — nur noch ansehen.
                  </Alert>
                )}
                {roundMeta && (
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.secondary', width: '100%', textAlign: 'center' }}
                  >
                    {roundMeta.title} · {roundMeta.date} · {roundMeta.groupName}
                  </Typography>
                )}

                {(phase === 'self' || phase === 'wait') && (
                  <EpoNotenStudentSelfWizard
                    key={`${selectedRoundId}-${assessmentMode}`}
                    locked={phase === 'wait' || !canEditSelf}
                    submitting={submitting}
                    assessmentMode={assessmentMode}
                    suggestedGrade={suggestedGrade}
                    justification={justification}
                    selfScores={selfScores}
                    selfGradeFromTable={selfGradeFromTable}
                    onSuggestedGradeChange={(v) => {
                      selfFormDirtyRef.current = true;
                      setSuggestedGrade(v);
                    }}
                    onJustificationChange={(v) => {
                      selfFormDirtyRef.current = true;
                      setJustification(v);
                    }}
                    onSelfScoresChange={(v) => {
                      selfFormDirtyRef.current = true;
                      setSelfScores(v);
                    }}
                    onSelfGradeFromTableChange={setSelfGradeFromTable}
                    onSubmit={submitSelf}
                    startAtDone={phase === 'wait'}
                  />
                )}

                {(phase === 'goals' || phase === 'done') && myEntry && (
                  <>
                    <Box
                      sx={{
                        ...epoNotenStudentSurfaceSx,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 1,
                      }}
                    >
                      <Box sx={{ ...epoNotenCardSx, minWidth: 0 }}>
                        <Box sx={{ p: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 800 }}>
                            Deine Selbsteinschätzung
                          </Typography>
                          <EpoNotenCategoryGrid
                            compact
                            radioGroupId={`sus-self-${selectedRoundId}`}
                            categories={EPO_NOTEN_STUDENT_CATEGORIES}
                            scores={normalizeCategoryScores(myEntry.selfScores)}
                            readOnly
                          />
                          <Box sx={{ mt: 1 }}>
                            <EpoNotenGradeTable
                              mode={assessmentMode}
                              highlightMinPoints={
                                assessmentMode === 'note'
                                  ? minPointsThresholdForTotal(sumCategoryScores(myEntry.selfScores))
                                  : null
                              }
                              highlightExactPoints={
                                assessmentMode === 'mss' ? sumCategoryScores(myEntry.selfScores) : null
                              }
                            />
                          </Box>
                          <Typography sx={{ mt: 1, fontWeight: 800, fontSize: '0.9rem', color: epoNotenPalette.primary }}>
                            {assessmentMode === 'mss' ? 'Deine MSS-Punkte (Raster): ' : 'Deine Note (Raster): '}
                            {myEntry.selfGradeFromTable || rasterResultFromTotal(assessmentMode, sumCategoryScores(myEntry.selfScores))}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ ...epoNotenCardSx, minWidth: 0 }}>
                        <Box sx={{ p: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.75, fontWeight: 800 }}>
                            Einschätzung deiner Lehrkraft
                          </Typography>
                          <EpoNotenCategoryGrid
                            compact
                            radioGroupId={`sus-teacher-${selectedRoundId}`}
                            categories={EPO_NOTEN_TEACHER_CATEGORIES}
                            scores={normalizeCategoryScores(myEntry.teacherScores)}
                            readOnly
                          />
                          <Box sx={{ mt: 1 }}>
                            <EpoNotenGradeTable
                              mode={assessmentMode}
                              highlightMinPoints={
                                assessmentMode === 'note'
                                  ? minPointsThresholdForTotal(sumCategoryScores(myEntry.teacherScores))
                                  : null
                              }
                              highlightExactPoints={
                                assessmentMode === 'mss' ? sumCategoryScores(myEntry.teacherScores) : null
                              }
                            />
                          </Box>
                          <Typography sx={{ mt: 1, fontWeight: 800, fontSize: '0.9rem', color: epoNotenPalette.accent }}>
                            {assessmentMode === 'mss' ? 'MSS-Punkte (Lehrkraft): ' : 'EPO-Note (Lehrkraft): '}
                            {myEntry.teacherGrade || '—'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        ...epoNotenCardSx,
                        ...epoNotenStudentSurfaceSx,
                        ...epoNotenStudentGoalsShellSx,
                      }}
                    >
                      <Box sx={epoNotenStudentGoalsHeaderSx}>
                        <Typography
                          component="h2"
                          sx={{
                            fontWeight: 900,
                            fontSize: { xs: '1.35rem', sm: '1.55rem' },
                            color: epoNotenPalette.heading,
                            lineHeight: 1.25,
                          }}
                        >
                          Mein Ziel für den nächsten Zeitraum
                        </Typography>
                        <Typography sx={{ ...epoNotenStudentGoalHintSx, mt: 0.75, mb: 0 }}>
                          Formuliere dein Ziel und deine Handlung groß und klar — du kannst sie hier jederzeit
                          wieder ansehen.
                        </Typography>
                      </Box>

                      <Stack spacing={2.75} sx={{ p: { xs: 2, sm: 2.5 } }}>
                        {canEditGoals && phase === 'goals' ? (
                          <>
                            <Box>
                              <Typography component="label" sx={epoNotenStudentGoalLabelSx}>
                                1. Mein konkretes Ziel
                              </Typography>
                              <Typography sx={epoNotenStudentGoalHintSx}>
                                Was willst du im nächsten Zeitraum erreichen?
                              </Typography>
                              <TextField
                                aria-label="Mein konkretes Ziel"
                                placeholder="z. B. Ich will in Mathe sicherer mit Brüchen werden …"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                multiline
                                minRows={3}
                                fullWidth
                                sx={epoNotenStudentGoalFieldSx}
                              />
                            </Box>
                            <Box>
                              <Typography component="label" sx={epoNotenStudentGoalLabelSx}>
                                2. Meine konkrete Handlung dazu
                              </Typography>
                              <Typography sx={epoNotenStudentGoalHintSx}>
                                Was machst du dafür ganz konkret?
                              </Typography>
                              <TextField
                                aria-label="Meine konkrete Handlung"
                                placeholder="z. B. Jeden Tag 15 Minuten üben und in der Stunde öfter mitmachen …"
                                value={goalAction}
                                onChange={(e) => setGoalAction(e.target.value)}
                                multiline
                                minRows={4}
                                fullWidth
                                sx={epoNotenStudentGoalFieldSx}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <Button
                                size="large"
                                variant="contained"
                                color="success"
                                onClick={() => void submitGoals()}
                                disabled={submitting}
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '1rem',
                                  px: 3,
                                  py: 1.1,
                                  borderRadius: 2,
                                }}
                              >
                                Ziele speichern
                              </Button>
                            </Box>
                          </>
                        ) : (
                          <>
                            <Box>
                              <Typography sx={epoNotenStudentGoalLabelSx}>Mein konkretes Ziel</Typography>
                              <Box sx={epoNotenStudentGoalDisplaySx} role="region" aria-label="Gespeichertes Ziel">
                                {goal.trim() || '—'}
                              </Box>
                            </Box>
                            <Box>
                              <Typography sx={epoNotenStudentGoalLabelSx}>Meine konkrete Handlung dazu</Typography>
                              <Box sx={epoNotenStudentGoalDisplaySx} role="region" aria-label="Gespeicherte Handlung">
                                {goalAction.trim() || '—'}
                              </Box>
                            </Box>
                            {phase === 'done' && (
                              <Alert severity="success" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                Deine Ziele sind gespeichert — sie bleiben hier groß sichtbar, damit du sie im Blick
                                behältst.
                              </Alert>
                            )}
                          </>
                        )}
                      </Stack>
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
