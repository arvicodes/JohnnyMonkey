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
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { apiGetSafe, apiPost } from '../lib/api';
import { ExcursionProtocolStudentList } from '../components/excursion-protocol/ExcursionProtocolStudentList';
import { ExcursionProtocolStudentView } from '../components/excursion-protocol/ExcursionProtocolStudentView';
import { ExcursionProtocolSubmissionDetail } from '../components/excursion-protocol/ExcursionProtocolSubmissionDetail';
import { ExcursionProtocolTeacherView } from '../components/excursion-protocol/ExcursionProtocolTeacherView';
import {
  compactIconBtnSx,
  compactIconSx,
  pageShellSx,
  protocolPageBgSx,
  protocolPalette,
} from '../components/excursion-protocol/excursionProtocolUi';
import {
  DEFAULT_RATING_CRITERIA,
  DEFAULT_REFLECTION_QUESTIONS,
  formatEditDeadlineLabel,
  type ExcursionActivity,
  type ExcursionAvailableSession,
  type ExcursionProtocolSubmission,
  type ExcursionRating,
} from '../lib/excursionProtocolTypes';

type SessionInfo = {
  id?: string;
  title: string;
  date: string;
  editDeadline?: string | null;
  reflectionQuestions: [string, string, string];
  ratingCriteria: string[];
};

type SubmitMeta = {
  teacherId: string;
  lessonPath: string;
  excursionId: string;
};

const emptyActivity = (): ExcursionActivity => ({ content: '' });

const cardPaddingSx = { p: { xs: 1.25, sm: 1.5 }, '&:last-child': { pb: { xs: 1.25, sm: 1.5 } } };

function detectIsTeacher(): boolean {
  const teacherId = localStorage.getItem('teacherId');
  const studentId = localStorage.getItem('studentId');
  if (teacherId && !studentId) return true;
  if (studentId && !teacherId) return false;
  return Boolean(teacherId);
}

export default function ExcursionProtocolPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = useMemo(() => detectIsTeacher(), []);

  const [loading, setLoading] = useState(!isTeacher);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [editDeadline, setEditDeadline] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [availableSessions, setAvailableSessions] = useState<ExcursionAvailableSession[]>([]);
  const [submitMeta, setSubmitMeta] = useState<SubmitMeta | null>(null);
  const [mySubmission, setMySubmission] = useState<ExcursionProtocolSubmission | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [teacherNameForStudent, setTeacherNameForStudent] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activities, setActivities] = useState<ExcursionActivity[]>([emptyActivity()]);
  const [reflection, setReflection] = useState({ learned: '', highlight: '', openQuestion: '' });
  const [ratings, setRatings] = useState<ExcursionRating[]>([]);

  const selectedExcursionId = searchParams.get('id') || '';

  const reflectionQuestions = session?.reflectionQuestions ?? DEFAULT_REFLECTION_QUESTIONS;
  const ratingCriteria = session?.ratingCriteria ?? DEFAULT_RATING_CRITERIA;

  const populateFormFromSubmission = useCallback((submission: ExcursionProtocolSubmission) => {
    setActivities(submission.activities.length > 0 ? submission.activities : [emptyActivity()]);
    setReflection(submission.reflection);
    setRatings(submission.ratings);
  }, []);

  const resetEmptyForm = useCallback(
    (criteria: string[] = ratingCriteria) => {
      setActivities([emptyActivity()]);
      setReflection({ learned: '', highlight: '', openQuestion: '' });
      setRatings(criteria.map((criterion) => ({ criterion, score: 0 })));
    },
    [ratingCriteria],
  );

  const applyStudentData = useCallback(
    (data: Record<string, unknown>, excursionIdOverride?: string, silent = false) => {
      const pubAt = typeof data?.publishedAt === 'string' ? data.publishedAt.trim() : '';
      setPublishedAt(pubAt || null);
      setEditDeadline(typeof data?.editDeadline === 'string' ? data.editDeadline : null);
      setCanEdit(data?.canEdit !== false);

      const sessions = Array.isArray(data?.sessions) ? (data.sessions as ExcursionAvailableSession[]) : [];
      setAvailableSessions(sessions);

      if (data?.session && typeof data.session === 'object') {
        const s = data.session as SessionInfo;
        setSession(s);
      } else {
        setSession(null);
      }

      const tid = typeof data?.teacherId === 'string' ? data.teacherId : '';
      const lp = typeof data?.lessonPath === 'string' ? data.lessonPath : '';
      const eid =
        excursionIdOverride ||
        (typeof data?.excursionId === 'string' ? data.excursionId : '') ||
        (typeof (data?.session as { id?: string })?.id === 'string' ? (data.session as { id: string }).id : '');

      if (tid && lp && eid && pubAt) {
        setSubmitMeta({ teacherId: tid, lessonPath: lp, excursionId: eid });
      } else {
        setSubmitMeta(null);
      }

      setTeacherNameForStudent(typeof data?.teacherName === 'string' ? data.teacherName : '');

      const mine = (data?.mySubmission as ExcursionProtocolSubmission | null) ?? null;
      setMySubmission(mine);

      if (silent) return;

      if (mine && !isEditing) {
        populateFormFromSubmission(mine);
        return;
      }

      if (!mine && pubAt && data?.session) {
        const criteria =
          ((data.session as SessionInfo).ratingCriteria || DEFAULT_RATING_CRITERIA);
        resetEmptyForm(criteria);
      }
    },
    [isEditing, populateFormFromSubmission, resetEmptyForm],
  );

  const loadCurrent = useCallback(
    async (silent = false, excursionId?: string) => {
      if (isTeacher) return;
      if (!silent) setLoading(true);
      try {
        const q = excursionId ? `?excursionId=${encodeURIComponent(excursionId)}` : '';
        const response = await apiGetSafe(`/api/excursion-protocol/current${q}`);
        if (!response) {
          if (!silent) setLoadError('Bitte zuerst am Dashboard anmelden.');
          return;
        }
        if (!response.ok) {
          if (!silent) {
            setLoadError(
              response.status === 404
                ? 'API noch nicht verfügbar — bitte den Server neu starten.'
                : 'Protokoll konnte nicht geladen werden.',
            );
          }
          return;
        }
        setLoadError(null);
        const data = await response.json();
        applyStudentData(data, excursionId, silent);
      } catch {
        setSession(null);
        setPublishedAt(null);
        if (!silent) setLoadError('Protokoll konnte nicht geladen werden.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isTeacher, applyStudentData],
  );

  useEffect(() => {
    if (isTeacher) return;
    void loadCurrent(false, selectedExcursionId || undefined);
  }, [isTeacher, loadCurrent, selectedExcursionId]);

  useEffect(() => {
    if (isTeacher) return;
    const id = window.setInterval(
      () => void loadCurrent(true, selectedExcursionId || undefined),
      5000,
    );
    return () => window.clearInterval(id);
  }, [isTeacher, loadCurrent, selectedExcursionId]);

  useEffect(() => {
    if (isTeacher) return;
    setIsEditing(false);
    setSubmitError(null);
  }, [isTeacher, selectedExcursionId]);

  useEffect(() => {
    if (ratings.length === 0 && ratingCriteria.length > 0 && (isEditing || !mySubmission)) {
      setRatings(ratingCriteria.map((criterion) => ({ criterion, score: 0 })));
    }
  }, [ratingCriteria, ratings.length, isEditing, mySubmission]);

  const formatDisplayDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  const formatShortDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return isoDate;
    }
  };

  const selectSession = (s: ExcursionAvailableSession) => {
    setSearchParams({ id: s.id });
  };

  const startEditing = () => {
    if (!mySubmission || !canEdit) return;
    populateFormFromSubmission(mySubmission);
    setIsEditing(true);
    setSubmitError(null);
  };

  const showForm = Boolean(selectedExcursionId && (!mySubmission || isEditing));
  const showSubmissionDetail = Boolean(selectedExcursionId && mySubmission && !isEditing);

  const handleSubmit = async () => {
    const validActivities = activities.filter((a) => a.content.trim());
    if (validActivities.length === 0) {
      setSubmitError('Bitte mindestens eine Aktivität eintragen.');
      return;
    }
    if (validActivities.some((a) => !a.activityRating || a.activityRating < 1)) {
      setSubmitError('Bitte jede Aktivität mit einem Vibe bewerten (🤩 bis 😴).');
      return;
    }
    if (!reflection.learned.trim() && !reflection.highlight.trim() && !reflection.openQuestion.trim()) {
      setSubmitError('Bitte mindestens eine Reflexionsfrage beantworten.');
      return;
    }
    if (ratings.some((r) => r.score < 1)) {
      setSubmitError('Bitte alle Kriterien mit 1–5 Sternen bewerten.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        activities: validActivities,
        reflection,
        ratings: ratings.filter((r) => r.score >= 1),
      };
      if (submitMeta) {
        body.teacherId = submitMeta.teacherId;
        body.lessonPath = submitMeta.lessonPath;
        body.excursionId = submitMeta.excursionId;
      } else if (session?.id && publishedAt) {
        body.excursionId = session.id;
      }
      const response = await apiPost('/api/excursion-protocol/submit', body);
      if (!response.ok) {
        let msg = 'Speichern fehlgeschlagen.';
        try {
          const err = await response.json();
          if (typeof err?.error === 'string') msg = err.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setIsEditing(false);
      await loadCurrent(false, selectedExcursionId || undefined);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isTeacher && loading && availableSessions.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: protocolPalette.background }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={protocolPageBgSx}>
      <Box sx={{ ...pageShellSx, py: { xs: 1.25, sm: 1.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
            width: '100%',
          }}
        >
          <Tooltip title="Dashboard">
            <IconButton
              onClick={() => navigate('/dashboard')}
              aria-label="Zurück"
              sx={{ ...compactIconBtnSx, bgcolor: 'white', border: '1px solid', borderColor: 'divider' }}
            >
              <ArrowBackIcon sx={compactIconSx} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              color: protocolPalette.heading,
              textAlign: 'center',
              flex: 1,
              px: 1,
              fontSize: { xs: '0.9rem', sm: '1rem' },
              lineHeight: 1.25,
            }}
          >
            {isTeacher ? 'Protokoll' : 'Meine Tagesprotokolle'}
          </Typography>
          <Box sx={{ width: 32, flexShrink: 0 }} />
        </Box>

        <Box sx={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
          {loadError && (
            <Typography variant="body2" color="warning.main" sx={{ mb: 2, textAlign: 'center' }}>
              {loadError}
            </Typography>
          )}

          {isTeacher ? (
            <ExcursionProtocolTeacherView formatDisplayDate={formatDisplayDate} />
          ) : availableSessions.length === 0 ? (
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
              <CardContent sx={{ ...cardPaddingSx, py: 6, textAlign: 'center' }}>
                <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: protocolPalette.heading }}>
                  Noch kein Protokoll freigegeben
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
                  Deine Lehrkraft muss die Exkursion erst freigeben. Dann erscheinen hier deine Protokolle.
                </Typography>
                <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ mt: 3, textTransform: 'none' }}>
                  Zurück zum Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={2}>
              <ExcursionProtocolStudentList
                sessions={availableSessions}
                selectedId={selectedExcursionId}
                onSelect={selectSession}
                formatShortDate={formatShortDate}
              />

              {!selectedExcursionId ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                  Wähle ein Protokoll aus der Liste.
                </Typography>
              ) : !publishedAt || !session ? (
                <CircularProgress size={24} sx={{ display: 'block', mx: 'auto' }} />
              ) : (
                <Stack spacing={1.25}>
                  {editDeadline && (
                    <Alert severity="info" sx={{ py: 0.25 }}>
                      {formatEditDeadlineLabel(editDeadline)}
                    </Alert>
                  )}

                  {showSubmissionDetail && mySubmission && (
                    <>
                      <ExcursionProtocolSubmissionDetail
                        submission={mySubmission}
                        reflectionQuestions={reflectionQuestions}
                        title="Deine Abgabe"
                        subtitle={
                          mySubmission.submittedAt
                            ? `Abgegeben am ${new Date(mySubmission.submittedAt).toLocaleString('de-DE')}`
                            : undefined
                        }
                      />
                      {canEdit ? (
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={startEditing}
                          sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                        >
                          Bearbeiten
                        </Button>
                      ) : (
                        <Alert severity="warning" sx={{ py: 0.25 }}>
                          Der Bearbeitungszeitraum ist abgelaufen.
                        </Alert>
                      )}
                    </>
                  )}

                  {showForm && (
                    <ExcursionProtocolStudentView
                      sessionTitle={session.title}
                      sessionDate={session.date}
                      teacherName={teacherNameForStudent}
                      reflectionQuestions={reflectionQuestions}
                      activities={activities}
                      reflection={reflection}
                      ratings={ratings}
                      submitting={submitting}
                      submitError={submitError}
                      isResubmit={Boolean(mySubmission)}
                      onActivitiesChange={setActivities}
                      onReflectionChange={setReflection}
                      onRatingsChange={setRatings}
                      onSubmit={() => void handleSubmit()}
                      formatDisplayDate={formatDisplayDate}
                    />
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}
