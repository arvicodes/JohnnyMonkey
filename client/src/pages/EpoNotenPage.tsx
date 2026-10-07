import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { apiGetSafe, apiPost } from '../lib/api';
import { EpoNotenTeacherView } from '../components/epo-noten/EpoNotenTeacherView';
import { EpoNotenCategoryGrid } from '../components/epo-noten/EpoNotenCategoryGrid';
import { EpoNotenStudentRoundList } from '../components/epo-noten/EpoNotenStudentRoundList';
import { EpoNotenStudentSelfWizard } from '../components/epo-noten/EpoNotenStudentSelfWizard';
import {
  epoNotenCardSx,
  epoNotenPageBgSx,
  epoNotenPageShellSx,
  epoNotenPalette,
  epoNotenStudentSurfaceSx,
  epoNotenSectionTitleSx,
  epoNotenStudentGoalDisplaySx,
  epoNotenStudentGoalFieldSx,
  epoNotenBigNumberSx,
  epoNotenBitteAusfuellenAlertSx,
} from '../components/epo-noten/epoNotenUi';
import {
  EPO_NOTEN_STUDENT_CATEGORIES,
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenStudentSession,
  emptyCategoryScores,
  epoSummaryHeadline,
  epoGroupUsesMssPoints,
  studentSelfSummaryHeadline,
  epoSummarySubline,
  minPointsThresholdForTotal,
  normalizeCategoryScores,
  epoRoundedPoints,
  formatEpoPointsDisplay,
  rasterResultFromTotal,
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
  const [roundMeta, setRoundMeta] = useState<{
    id: string;
    title: string;
    date: string;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [canEditSelf, setCanEditSelf] = useState(false);
  const [canEditGoals, setCanEditGoals] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [studentCategories, setStudentCategories] = useState<string[]>(EPO_NOTEN_STUDENT_CATEGORIES);
  const [teacherCategoriesView, setTeacherCategoriesView] = useState<string[]>(EPO_NOTEN_TEACHER_CATEGORIES);
  const [categoryTitles, setCategoryTitles] = useState<string[]>([]);
  const [categoryWeightsPercent, setCategoryWeightsPercent] = useState<number[] | undefined>();

  const [suggestedGrade, setSuggestedGrade] = useState('');
  const [assessmentMode, setAssessmentMode] = useState<EpoNotenAssessmentMode>('note');
  const [justification, setJustification] = useState('');
  const [selfScores, setSelfScores] = useState(emptyCategoryScores());
  const [selfGradeFromTable, setSelfGradeFromTable] = useState('');
  const [goal, setGoal] = useState('');
  const [goalAction, setGoalAction] = useState('');

  const selfFormDirtyRef = useRef(false);

  const selectedRoundId = searchParams.get('roundId') || '';
  const selectedGroupId = searchParams.get('groupId') || '';
  const showStudentList = !isTeacher && !selectedRoundId;

  const populateFromEntry = useCallback(
    (
      entry: EpoNotenEntry | null,
      mode: EpoNotenAssessmentMode,
      weights?: number[] | null,
    ) => {
      if (!selfFormDirtyRef.current) {
        setSuggestedGrade(entry?.suggestedGrade || '');
        setJustification(entry?.justification || '');
        setSelfScores(
          entry?.selfScores?.length ? normalizeCategoryScores(entry.selfScores) : emptyCategoryScores(),
        );
        const pts = epoRoundedPoints(entry?.selfScores, weights);
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
      const q = new URLSearchParams();
      if (selectedRoundId) q.set('roundId', selectedRoundId);
      if (selectedGroupId) q.set('groupId', selectedGroupId);
      const qs = q.toString();
      const res = await apiGetSafe(`/api/epo-noten/current${qs ? `?${qs}` : ''}`);
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

        const fromList =
          list.find(
            (s) => s.id === selectedRoundId && (!selectedGroupId || s.groupId === selectedGroupId),
          ) || list.find((s) => s.id === selectedRoundId);
        let mode: EpoNotenAssessmentMode = 'note';
        let weightsForRound: number[] | undefined;

        if (data.round && typeof data.round === 'object') {
          const r = data.round as {
            id: string;
            title: string;
            date: string;
            groupId: string;
            groupName: string;
            assessmentMode?: EpoNotenAssessmentMode;
            studentCategories?: string[];
            teacherCategories?: string[];
            categoryTitles?: string[];
            categoryWeightsPercent?: number[];
          };
          setRoundMeta({
            id: r.id,
            title: r.title,
            date: r.date,
            groupId: r.groupId,
            groupName: r.groupName,
          });
          if (Array.isArray(r.studentCategories) && r.studentCategories.length > 0) {
            setStudentCategories(r.studentCategories);
          } else {
            setStudentCategories(EPO_NOTEN_STUDENT_CATEGORIES);
          }
          if (Array.isArray(r.teacherCategories) && r.teacherCategories.length > 0) {
            setTeacherCategoriesView(r.teacherCategories);
          } else {
            setTeacherCategoriesView(EPO_NOTEN_TEACHER_CATEGORIES);
          }
          setCategoryTitles(Array.isArray(r.categoryTitles) ? r.categoryTitles : []);
          weightsForRound = Array.isArray(r.categoryWeightsPercent) ? r.categoryWeightsPercent : undefined;
          setCategoryWeightsPercent(weightsForRound);
          mode =
            epoGroupUsesMssPoints(r.groupName) || r.assessmentMode === 'mss' ? 'mss' : 'note';
        } else if (fromList) {
          setRoundMeta({
            id: fromList.id,
            title: fromList.title,
            date: fromList.date,
            groupId: fromList.groupId,
            groupName: fromList.groupName,
          });
          mode =
            epoGroupUsesMssPoints(fromList.groupName) || fromList.assessmentMode === 'mss'
              ? 'mss'
              : 'note';
        }

        if (!data.round && !fromList) {
          mode = myEntryLoaded?.suggestedGradeMode === 'mss' ? 'mss' : 'note';
        }

        setAssessmentMode(mode);
        populateFromEntry(myEntryLoaded, mode, weightsForRound);
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
  }, [populateFromEntry, selectedGroupId, selectedRoundId]);

  useEffect(() => {
    selfFormDirtyRef.current = false;
  }, [selectedGroupId, selectedRoundId]);

  useEffect(() => {
    if (!isTeacher) loadStudent();
  }, [isTeacher, loadStudent, selectedGroupId, selectedRoundId]);

  const openRound = (session: EpoNotenStudentSession) => {
    selfFormDirtyRef.current = false;
    setSearchParams({ roundId: session.id, groupId: session.groupId });
  };

  const backToList = () => {
    setSearchParams({});
  };

  const submitSelf = useCallback(async () => {
    const total = epoRoundedPoints(selfScores, categoryWeightsPercent);
    const gradeTable = rasterResultFromTotal(assessmentMode, total);
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/submit-self', {
        roundId: roundMeta?.id || selectedRoundId,
        groupId: roundMeta?.groupId || selectedGroupId,
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
    roundMeta?.groupId,
    roundMeta?.id,
    selectedGroupId,
    selectedRoundId,
    selfScores,
    assessmentMode,
    suggestedGrade,
    teacherId,
    categoryWeightsPercent,
  ]);

  const submitGoals = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost('/api/epo-noten/submit-goals', {
        roundId: roundMeta?.id || selectedRoundId,
        groupId: roundMeta?.groupId || selectedGroupId,
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
    if (
      !myEntry?.studentSubmittedAt &&
      !myEntry?.withoutSelfAssessment &&
      !myEntry?.teacherGradeOnly &&
      !myEntry?.goalsWaived
    )
      return 'self';
    if (!myEntry?.teacherReleasedAt) return 'wait';
    if (!myEntry?.goalsSubmittedAt && !myEntry?.goalsWaived) return 'goals';
    return 'done';
  }, [myEntry]);

  const osWaitOnly =
    Boolean(myEntry?.withoutSelfAssessment || myEntry?.teacherGradeOnly) &&
    !myEntry?.studentSubmittedAt &&
    phase === 'wait';

  return (
    <Box sx={{ ...epoNotenPageBgSx, py: isTeacher ? 0 : epoNotenPageBgSx.py }}>
      <Box sx={epoNotenPageShellSx}>
        {!isTeacher && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.65, minHeight: 26, flexShrink: 0 }}
          >
            {selectedRoundId ? (
              <IconButton onClick={backToList} aria-label="Zur Liste" size="small" sx={{ ...compactIconBtn, ml: -0.25 }}>
                <ArrowBackIcon sx={{ fontSize: 15 }} />
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
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Stack>
        )}

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isTeacher ? (
          <EpoNotenTeacherView />
        ) : loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, flex: 1 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={1.25} sx={{ width: '100%', flex: 1, minHeight: 0, overflow: 'auto' }}>
            {error && <Alert severity="error">{error}</Alert>}

            {sessions.length === 0 ? (
              <Alert severity="info">Sobald deine Lehrkraft eine EPO-Runde freischaltet, erscheint sie hier.</Alert>
            ) : showStudentList ? (
              <EpoNotenStudentRoundList sessions={sessions} onSelect={openRound} />
            ) : (
              <>
                {sessions.find(
                  (s) =>
                    s.id === (roundMeta?.id || selectedRoundId) &&
                    (!selectedGroupId || s.groupId === (roundMeta?.groupId || selectedGroupId)),
                )?.isArchived && (
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

                {phase === 'self' && canEditSelf && (
                  <Alert severity="warning" sx={epoNotenBitteAusfuellenAlertSx}>
                    <strong>Bitte ausfüllen</strong> — EPO-Selbsteinschätzung abgeben.
                  </Alert>
                )}
                {phase === 'goals' && canEditGoals && (
                  <Alert severity="warning" sx={epoNotenBitteAusfuellenAlertSx}>
                    <strong>Bitte ausfüllen</strong> — Ziel und Handlung eintragen.
                  </Alert>
                )}

                {osWaitOnly && (
                  <Alert severity="info" sx={{ py: 0.85 }}>
                    Deine Lehrkraft bewertet ohne Selbsteinschätzung. Du siehst das Ergebnis, sobald es freigegeben ist.
                  </Alert>
                )}

                {(phase === 'self' || (phase === 'wait' && myEntry?.studentSubmittedAt)) && (
                  <EpoNotenStudentSelfWizard
                    key={`${selectedRoundId}-${assessmentMode}`}
                    locked={phase === 'wait' || !canEditSelf}
                    submitting={submitting}
                    assessmentMode={assessmentMode}
                    studentCategories={studentCategories}
                    categoryTitles={categoryTitles}
                    categoryWeightsPercent={categoryWeightsPercent}
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
                  <Stack spacing={1.5} sx={{ width: '100%' }}>
                    {(() => {
                      const selfPts = epoRoundedPoints(myEntry.selfScores, categoryWeightsPercent);
                      const teacherPts = epoRoundedPoints(myEntry.teacherScores, categoryWeightsPercent);
                      const selfHeadline = studentSelfSummaryHeadline(myEntry, assessmentMode);
                      const teacherHeadline = epoSummaryHeadline(
                        assessmentMode,
                        myEntry.teacherGrade || '',
                        teacherPts,
                      );
                      const selfSub = epoSummarySubline(assessmentMode, selfPts);
                      const teacherSub = epoSummarySubline(assessmentMode, teacherPts);
                      return (
                        <Box sx={{ ...epoNotenCardSx, ...epoNotenStudentSurfaceSx, p: 1.5 }}>
                          <Typography sx={{ ...epoNotenSectionTitleSx, fontSize: '1.05rem', mb: 1.25 }}>
                            Dein EPO-Ergebnis
                          </Typography>
                          <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{
                              '& > *': { flex: 1, minWidth: 0 },
                            }}
                          >
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                                border: `1px solid rgba(25, 118, 210, 0.2)`,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                Du
                              </Typography>
                              <Typography sx={{ ...epoNotenBigNumberSx, fontSize: { xs: '1.75rem', sm: '2rem' } }}>
                                {selfHeadline}
                              </Typography>
                              {selfSub && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                  {selfSub}
                                </Typography>
                              )}
                            </Box>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: 'rgba(46, 125, 50, 0.14)',
                                border: `2px solid rgba(46, 125, 50, 0.45)`,
                                boxShadow: '0 2px 8px rgba(46, 125, 50, 0.12)',
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                Lehrkraft
                              </Typography>
                              <Typography
                                sx={{
                                  ...epoNotenBigNumberSx,
                                  fontSize: { xs: '1.75rem', sm: '2rem' },
                                  color: epoNotenPalette.accent,
                                }}
                              >
                                {teacherHeadline}
                              </Typography>
                              {teacherSub && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                  {teacherSub}
                                </Typography>
                              )}
                              {myEntry.teacherJustification?.trim() ? (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, lineHeight: 1.45 }}
                                >
                                  <Typography component="span" sx={{ fontWeight: 700, fontStyle: 'normal' }}>
                                    Bemerkung:{' '}
                                  </Typography>
                                  <Typography component="span" sx={{ fontStyle: 'italic' }}>
                                    {myEntry.teacherJustification.trim()}
                                  </Typography>
                                </Typography>
                              ) : null}
                            </Box>
                          </Stack>

                          <Accordion
                            disableGutters
                            elevation={0}
                            sx={{
                              mt: 1.25,
                              bgcolor: 'transparent',
                              '&:before': { display: 'none' },
                              border: `1px solid ${epoNotenPalette.border}`,
                              borderRadius: 2,
                              overflow: 'hidden',
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, py: 0 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                Raster im Detail anzeigen
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0, px: 1, pb: 1 }}>
                              <Stack spacing={1.25}>
                                <Box>
                                  <EpoNotenCategoryGrid
                                    compact
                                    studentGhost
                                    label="Deine Selbsteinschätzung"
                                    radioGroupId={`sus-self-${selectedRoundId}`}
                                    categories={studentCategories}
                                    categoryTitles={categoryTitles}
                                    categoryWeightsPercent={categoryWeightsPercent}
                                    scores={normalizeCategoryScores(myEntry.selfScores)}
                                    readOnly
                                  />
                                </Box>
                                <Box>
                                  <EpoNotenCategoryGrid
                                    compact
                                    teacherEmphasis
                                    label="Lehrkraft"
                                    radioGroupId={`sus-teacher-${selectedRoundId}`}
                                    categories={teacherCategoriesView}
                                    categoryTitles={categoryTitles}
                                    categoryWeightsPercent={categoryWeightsPercent}
                                    scores={normalizeCategoryScores(myEntry.teacherScores)}
                                    readOnly
                                  />
                                </Box>
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        </Box>
                      );
                    })()}

                    <Box sx={{ ...epoNotenCardSx, ...epoNotenStudentSurfaceSx, p: 1.35 }}>
                      <Typography sx={{ ...epoNotenSectionTitleSx, fontSize: '1.05rem', mb: 1.25 }}>
                        Mein Ziel für den nächsten Zeitraum
                      </Typography>

                      {canEditGoals && phase === 'goals' ? (
                        <Stack spacing={1.5}>
                          <TextField
                            label="Mein konkretes Ziel"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                            sx={epoNotenStudentGoalFieldSx}
                          />
                          <TextField
                            label="Meine konkrete Handlung dazu"
                            value={goalAction}
                            onChange={(e) => setGoalAction(e.target.value)}
                            multiline
                            minRows={3}
                            fullWidth
                            sx={epoNotenStudentGoalFieldSx}
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              variant="contained"
                              onClick={() => void submitGoals()}
                              disabled={submitting}
                              sx={{ fontWeight: 800, px: 2.5 }}
                            >
                              Ziele speichern
                            </Button>
                          </Box>
                        </Stack>
                      ) : myEntry?.goalsWaived ? (
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                          Für dich sind in dieser Runde keine Ziele vorgesehen.
                        </Typography>
                      ) : (
                        <Stack spacing={1.25}>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.secondary', mb: 0.35 }}>
                              Mein Ziel
                            </Typography>
                            <Box sx={epoNotenStudentGoalDisplaySx}>{goal.trim() || '—'}</Box>
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.secondary', mb: 0.35 }}>
                              Meine Handlung
                            </Typography>
                            <Box sx={epoNotenStudentGoalDisplaySx}>{goalAction.trim() || '—'}</Box>
                          </Box>
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        )}
        </Box>
      </Box>
    </Box>
  );
}
