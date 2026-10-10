import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Card,
  CardContent,
  Grid,
  Stack,
  Tooltip,
  FormControlLabel,
  Switch,
  Checkbox,
  ButtonGroup,
} from '@mui/material';
import { epoNotenToolbarOutlinedBtnSx } from './epo-noten/epoNotenUi';
import { isExamCorrectionDraft, setExamCorrectionDraft } from '../lib/examCorrectionDraft';
import {
  isExamCorrectionFinished,
  setExamCorrectionFinished,
} from '../lib/examCorrectionFinished';
import {
  isExamCorrectionReleased,
  setExamCorrectionReleased,
} from '../lib/examCorrectionReleased';
import { 
  CheckCircle, 
  Cancel, 
  ArrowBack, 
  ArrowForward, 
  AccessTime,
  Grade,
  Edit,
  Save,
  Close,
  BarChart,
  Description,
  FileDownload,
  Visibility,
  Email,
  LocalHospital,
  RestartAlt,
} from '@mui/icons-material';
import { teacherIdFromStorage } from '../lib/lessonExamBeacon';
import { openExamHtmlInNewTab } from '../lib/openExamHtml';
import { buildExamReviewedHtml } from '../lib/examReviewedView';
import { downloadCombinedExamReviewsPdf } from '../lib/examReviewPdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import DreierprobeModal from './DreierprobeModal';
import {
  compareExamFieldIds,
  examAnswerMatches,
  expandLegacyDateAnswers,
  formatExamCorrect,
  parseExamAnswerKey,
  sortExamAnswerFieldIds,
} from '../lib/examAnswerKey';
import {
  buildExamDollarAnswerKeyFromHtml,
  examHtmlUsesDollarAuthoring,
  isPlaceholderLegacyExamKey,
  remapExamDollarSubmissionToSynthetic,
} from '../lib/examDollarCorrection';
import { examAnswerScoreFraction } from '../lib/examMcPartialScore';
import { huKiFieldAutoPoints, isHuKiMssExamPath } from '../lib/huKiMssExamScoring';
import {
  examGradeLabelForCorrection,
  examGradeNumericForCorrection,
  formatExamClassAverageDecimal,
} from '../lib/examGradeLabel';
import { gradePercentDisplayRanges, scoreToGradeTendency, tendencyToAsciiLabel } from '../lib/gradeScale';
import { filterLearningGroupsForExamFile } from '../lib/examLearningGroupFilter';
import {
  examBaseGitPath,
  normalizeVersionLetter,
  resolveExamHtmlReadPath,
  versionLetterFromKaPath,
} from '../lib/examVersionPaths';
import { resetExamSession } from '../lib/examSessionReset';
import ExamFullResetConfirmDialog from './exam/ExamFullResetConfirmDialog';
import ExamCorrectionLiveReview from './exam/ExamCorrectionLiveReview';
import MakeupExamStartDialog from './exam/MakeupExamStartDialog';
import { submissionHasFilledAnswers } from '../lib/examSubmissionAnswers';
import { fetchLessonExamBeacon, stopLessonExam } from '../lib/lessonExamBeacon';

interface KASubmission {
  id: string;
  kaFilePath?: string;
  versionLetter?: string;
  student: {
    id: string;
    name: string;
    loginCode: string;
  };
  submittedAt: string;
  expiredAt?: string;
  status: string;
  answers: string; // JSON string
  autoPoints: number;
  totalPoints: number;
  markedSick?: boolean;
  corrections: KACorrection[];
}

interface KACorrection {
  id: string;
  taskNumber: string;
  manualPoints?: number;
  comment?: string;
}

interface KACorrectionModeProps {
  kaFilePath: string;
  onClose: () => void;
  groupId?: string | null;
  /** Eingebettet in ExamCorrectionModeShell — volle Höhe der rechten Spalte. */
  embedded?: boolean;
}

type CorrectionMode = 'by-student' | 'by-task';

const submissionStudentName = (submission: KASubmission | null | undefined): string =>
  submission?.student?.name ?? 'Schüler/in';

const submissionVersionLetter = (submission: KASubmission | null | undefined, fallbackPath: string): string => {
  if (!submission) return 'A';
  if (submission.versionLetter) return submission.versionLetter;
  return versionLetterFromKaPath(submission.kaFilePath || fallbackPath);
};

const correctionStorageKey = (submissionId: string, fieldKey: string): string =>
  `${submissionId}_${fieldKey}`;

const REVIEW_COMPLETE_TASK = '__review_complete__';
const GENERAL_COMMENT_TASK = '__general_comment__';
const PURPLE_REVIEW = '#7b1fa2';

const kaCorrectionToolbarBtnSx = {
  ...epoNotenToolbarOutlinedBtnSx,
  minHeight: 30,
  py: 0.35,
  px: 0.85,
  fontSize: '0.7rem',
  '& .MuiButton-startIcon': {
    marginRight: 0.3,
    marginLeft: 0,
    '& > *:nth-of-type(1)': { fontSize: 14 },
  },
} as const;

const kaCorrectionToolbarGroupSx = {
  flexShrink: 0,
  maxWidth: '100%',
  '& .MuiButtonGroup-grouped': {
    ...kaCorrectionToolbarBtnSx,
    minWidth: 0,
    width: 'max-content',
  },
} as const;

const kaWorkflowCheckboxSx = {
  p: 0.25,
  '& .MuiSvgIcon-root': { fontSize: 17 },
} as const;

const kaWorkflowControlSx = {
  m: 0,
  mr: 0.2,
  '& .MuiFormControlLabel-label': {
    fontSize: '0.7rem',
    fontWeight: 700,
    lineHeight: 1.15,
  },
} as const;

const kaNavIconBtnSx = { p: 0.35, width: 28, height: 28 } as const;
const PARTIAL_CREDIT_BG = '#fff9c4';
const PARTIAL_CREDIT_BORDER = '#fff176';
const PARTIAL_CREDIT_TEXT = '#f57f17';
const SICK_HIGHLIGHT_BG = '#fffde7';
const SICK_BORDER = '#fbc02d';

/** Deutsche Anzeige: 0,5 / 1 / 1,25 */
function formatExamPointsDisplay(n: number): string {
  if (n == null || Number.isNaN(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return rounded
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

function isPartialCreditScore(achieved: number, max: number): boolean {
  return max > 0 && achieved > 0 && achieved < max - 1e-9;
}

function parsePointsInput(raw: string): number | undefined {
  const inputValue = raw.trim().toLowerCase();
  if (inputValue === 'x' || inputValue === '') return undefined;
  const numValue = parseFloat(inputValue);
  return !Number.isNaN(numValue) ? numValue : undefined;
}

type ExamGroupTab = {
  id: string;
  name: string;
  students: Array<{ id: string; name: string; loginCode: string }>;
};

function lessonPathFromKaFilePath(kaFilePath: string): string {
  const p = (kaFilePath || '').replace(/\\/g, '/').trim();
  const idx = p.lastIndexOf('/');
  if (idx <= 0) return p;
  return p.slice(0, idx);
}

function isReviewCompleteFlag(submission: KASubmission | null | undefined): boolean {
  return Boolean(
    submission?.corrections?.some(
      (c) =>
        c.taskNumber === REVIEW_COMPLETE_TASK &&
        c.manualPoints != null &&
        Number(c.manualPoints) > 0,
    ),
  );
}

function hasManualCorrectionWork(submission: KASubmission | null | undefined): boolean {
  return Boolean(
    submission?.corrections?.some((c) => {
      if (
        c.taskNumber === REVIEW_COMPLETE_TASK ||
        c.taskNumber === '3_comment' ||
        c.taskNumber === GENERAL_COMMENT_TASK
      ) {
        return false;
      }
      return c.manualPoints != null || Boolean(c.comment?.trim());
    }),
  );
}

function hasDraftCorrectionWork(
  submissionId: string,
  corrections: Record<string, { points?: number; comment?: string; constructionPoints?: number }>,
): boolean {
  const prefix = `${submissionId}_`;
  return Object.entries(corrections).some(([key, val]) => {
    if (!key.startsWith(prefix)) return false;
    const taskNumber = key.slice(prefix.length);
    if (taskNumber === REVIEW_COMPLETE_TASK) return false;
    if (taskNumber === '3_comment' || taskNumber === GENERAL_COMMENT_TASK) {
      return Boolean(val.comment?.trim());
    }
    if (/^3[a-d]$/.test(taskNumber)) {
      return val.constructionPoints !== undefined && val.constructionPoints !== null;
    }
    return val.points !== undefined && val.points !== null;
  });
}

function shouldShowPurpleReviewRing(submission: KASubmission | null | undefined): boolean {
  if (!submission) return false;
  return hasManualCorrectionWork(submission) || isReviewCompleteFlag(submission);
}

const KACorrectionMode: React.FC<KACorrectionModeProps> = ({
  kaFilePath,
  onClose,
  groupId = null,
  embedded = false,
}) => {
  const [examMarkedFinished, setExamMarkedFinished] = useState(() =>
    isExamCorrectionFinished(kaFilePath),
  );
  const [examMarkedDraft, setExamMarkedDraft] = useState(() => isExamCorrectionDraft(kaFilePath));
  const [examMarkedReleased, setExamMarkedReleased] = useState(() =>
    isExamCorrectionReleased(kaFilePath),
  );

  useEffect(() => {
    setExamMarkedFinished(isExamCorrectionFinished(kaFilePath));
    setExamMarkedDraft(isExamCorrectionDraft(kaFilePath));
    setExamMarkedReleased(isExamCorrectionReleased(kaFilePath));
  }, [kaFilePath]);
  const [submissions, setSubmissions] = useState<KASubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CorrectionMode>('by-student');
  const [selectedSubmission, setSelectedSubmission] = useState<KASubmission | null>(null);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [corrections, setCorrections] = useState<Record<string, { points?: number; comment?: string; constructionPoints?: number }>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [fullResetOpen, setFullResetOpen] = useState(false);
  const [showDreierprobe, setShowDreierprobe] = useState(false);
  const [dreierprobeEmailTab, setDreierprobeEmailTab] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [examGroups, setExamGroups] = useState<ExamGroupTab[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [learningGroupStudents, setLearningGroupStudents] = useState<Array<{ id: string; name: string; loginCode: string }>>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [reviewPdfBusy, setReviewPdfBusy] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [examAnswers, setExamAnswers] = useState<Record<string, any>>({});
  const [examDollarHtml, setExamDollarHtml] = useState('');
  const [examPoints, setExamPoints] = useState<Record<string, number>>({});
  const [examMaxPoints, setExamMaxPoints] = useState(0);
  const [useGeometryTask3, setUseGeometryTask3] = useState(false);
  const [answerKeyOpen, setAnswerKeyOpen] = useState(false);
  const [answerKeyDraft, setAnswerKeyDraft] = useState<Record<string, string>>({});
  const [fieldPointsDraft, setFieldPointsDraft] = useState<Record<string, number>>({});
  const [answerKeySaving, setAnswerKeySaving] = useState(false);
  const [resetStudentOpen, setResetStudentOpen] = useState(false);
  const [resetStudentBusy, setResetStudentBusy] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [answerEdits, setAnswerEdits] = useState<Record<string, string>>({});
  const [creatingManualSubmission, setCreatingManualSubmission] = useState(false);
  const [tabThroughAnswersOnly, setTabThroughAnswersOnly] = useState(() => {
    try {
      return localStorage.getItem('kaCorrectionTabThroughAnswersOnly') === '1';
    } catch {
      return false;
    }
  });
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionDraft, setVersionDraft] = useState('');
  const [versionPassword, setVersionPassword] = useState('');
  const [versionChangeError, setVersionChangeError] = useState<string | null>(null);
  const [versionChangeBusy, setVersionChangeBusy] = useState(false);
  const [makeupDialogOpen, setMakeupDialogOpen] = useState(false);
  const [makeupBeaconBusy, setMakeupBeaconBusy] = useState(false);
  const [groupExamBeacon, setGroupExamBeacon] = useState({
    active: false,
    filePath: null as string | null,
    beaconId: null as string | null,
    makeupSession: false,
  });

  useEffect(() => {
    try {
      localStorage.setItem('kaCorrectionTabThroughAnswersOnly', tabThroughAnswersOnly ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [tabThroughAnswersOnly]);

  // Helper-Funktion: Bestimmt den Dateityp für Texte
  const getFileTypeName = (): string => {
    const fileName = kaFilePath.split('/').pop() || kaFilePath;
    if (fileName.startsWith('KA_')) {
      return 'Klassenarbeit';
    } else if (fileName.startsWith('HÜ_') || fileName.startsWith('HU_')) {
      return 'Hausaufgabenüberprüfung';
    } else if (fileName.startsWith('QZ_')) {
      return 'Quiz';
    }
    return 'Klassenarbeit'; // Fallback
  };

  useEffect(() => {
    loadSubmissions();
  }, [kaFilePath]);

  useEffect(() => {
    let cancelled = false;
    const loadKey = async () => {
      try {
        const res = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`,
        );
        if (!res.ok) throw new Error('html');
        const html = await res.text();
        if (cancelled) return;
        setExamDollarHtml(examHtmlUsesDollarAuthoring(html) ? html : '');
        const parsed = parseExamAnswerKey(html);
        const dollarKey = examHtmlUsesDollarAuthoring(html)
          ? buildExamDollarAnswerKeyFromHtml(html)
          : null;
        const useDollar =
          dollarKey &&
          (Object.keys(parsed.answers).length === 0 || isPlaceholderLegacyExamKey(parsed));
        if (useDollar && dollarKey) {
          setExamAnswers(dollarKey.answers);
          setExamPoints(dollarKey.points);
          setExamMaxPoints(dollarKey.maxPoints);
          setUseGeometryTask3(false);
          return;
        }
        if (Object.keys(parsed.answers).length > 0) {
          setExamAnswers(parsed.answers);
          setExamPoints(parsed.points);
          setExamMaxPoints(parsed.maxPoints);
          setUseGeometryTask3(parsed.isGeometry);
          return;
        }
      } catch {
        /* Datei ohne Schlüssel */
      }
      if (cancelled) return;
      if (/geometr/i.test(kaFilePath)) {
        setExamAnswers(GEOMETRY_ANSWERS);
        setExamPoints(GEOMETRY_POINTS);
        setExamMaxPoints(25);
        setUseGeometryTask3(true);
      } else {
        setExamAnswers({});
        setExamPoints({});
        setExamMaxPoints(0);
        setUseGeometryTask3(false);
      }
    };
    void loadKey();
    return () => {
      cancelled = true;
    };
  }, [kaFilePath]);

  const groupSubmissions = useMemo(() => {
    const ids = new Set(learningGroupStudents.map((s) => s.id));
    return submissions.filter((s) => ids.has(s.student?.id));
  }, [submissions, learningGroupStudents]);

  const submissionByStudentId = useMemo(() => {
    const map = new Map<string, KASubmission>();
    groupSubmissions.forEach((s) => {
      if (s.student?.id) map.set(s.student.id, s);
    });
    return map;
  }, [groupSubmissions]);

  const sickStudentsInGroup = useMemo(
    () =>
      learningGroupStudents
        .filter((s) => submissionByStudentId.get(s.id)?.markedSick)
        .map((s) => ({ id: s.id, name: s.name })),
    [learningGroupStudents, submissionByStudentId],
  );

  const refreshGroupExamBeacon = useCallback(() => {
    if (!activeGroupId) return;
    void fetchLessonExamBeacon(activeGroupId).then((st) =>
      setGroupExamBeacon({
        active: st.active,
        filePath: st.filePath,
        beaconId: st.beaconId,
        makeupSession: Boolean(st.makeupSession),
      }),
    );
  }, [activeGroupId]);

  useEffect(() => {
    refreshGroupExamBeacon();
    const t = window.setInterval(refreshGroupExamBeacon, 8000);
    return () => window.clearInterval(t);
  }, [refreshGroupExamBeacon]);

  const stopMakeupExam = async () => {
    if (!activeGroupId || makeupBeaconBusy) return;
    setMakeupBeaconBusy(true);
    try {
      const teacherId = teacherIdFromStorage();
      if (!teacherId) throw new Error('Nicht angemeldet');
      await stopLessonExam({ teacherId, groupIds: [activeGroupId] });
      refreshGroupExamBeacon();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nachschrift konnte nicht beendet werden');
    } finally {
      setMakeupBeaconBusy(false);
    }
  };

  const loadExamGroups = useCallback(async () => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const teacherId = teacherIdFromStorage();
      const lessonPath = lessonPathFromKaFilePath(kaFilePath);

      const response = await fetch('/api/learning-groups', {
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
      });
      if (!response.ok) return;

      const allGroups = (await response.json()) as Array<{
        id: string;
        name: string;
        students?: Array<{ id: string; name: string; loginCode: string }>;
      }>;

      let matchedIds: string[] = [];
      if (teacherId && lessonPath) {
        const pathRes = await fetch(
          `/api/learning-groups/groups-for-path?path=${encodeURIComponent(lessonPath)}&teacherId=${encodeURIComponent(teacherId)}`,
        );
        if (pathRes.ok) {
          const data = (await pathRes.json()) as { groupIds?: string[] };
          matchedIds = (data.groupIds || []).filter(Boolean);
        }
      }

      let matched = allGroups.filter((g) => matchedIds.includes(g.id));
      if (matched.length === 0 && groupId) {
        matched = allGroups.filter((g) => g.id === groupId);
      }
      if (matched.length === 0) {
        const subIds = new Set(submissions.map((s) => s.student?.id).filter(Boolean));
        matched = allGroups.filter((g) => g.students?.some((s) => subIds.has(s.id)));
      }

      if (teacherId && kaFilePath) {
        try {
          const histRes = await fetch(
            `/api/learning-groups/exam-sessions/history?teacherId=${encodeURIComponent(teacherId)}&filePath=${encodeURIComponent(kaFilePath)}`,
            { headers: { 'x-login-code': loginCode } },
          );
          if (histRes.ok) {
            const hist = (await histRes.json()) as { sessions?: Array<{ groupId?: string }> };
            const histIds = [
              ...new Set((hist.sessions || []).map((s) => s.groupId).filter(Boolean) as string[]),
            ];
            if (histIds.length > 0) {
              const byHistory = matched.filter((g) => histIds.includes(g.id));
              if (byHistory.length > 0) matched = byHistory;
            }
          }
        } catch {
          /* Historie optional */
        }
      }

      matched = filterLearningGroupsForExamFile(matched, kaFilePath);

      const tabs: ExamGroupTab[] = matched
        .map((g) => ({
          id: g.id,
          name: g.name || 'Lerngruppe',
          students: g.students || [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

      setExamGroups(tabs);

      setExamGroups(tabs);
      setActiveGroupId((prev) => {
        if (prev && tabs.some((t) => t.id === prev)) return prev;
        if (groupId && tabs.some((t) => t.id === groupId)) return groupId;
        return tabs[0]?.id || '';
      });
    } catch (error) {
      console.error('Fehler beim Laden der Lerngruppen:', error);
    }
  }, [kaFilePath, groupId, submissions.length]);

  useEffect(() => {
    void loadExamGroups();
  }, [loadExamGroups]);

  useEffect(() => {
    const active = examGroups.find((g) => g.id === activeGroupId);
    setLearningGroupStudents(active?.students || []);
  }, [examGroups, activeGroupId]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const loginCode = (
        localStorage.getItem('loginCode') ||
        sessionStorage.getItem('loginCode') ||
        ''
      ).trim();

      if (!loginCode) {
        setSubmissions([]);
        setError('Nicht angemeldet — bitte neu einloggen, dann Korrektur erneut öffnen.');
        return;
      }

      console.log('🔍 Lade Abgaben für:', kaFilePath);
      const qs = new URLSearchParams({
        kaFilePath: kaFilePath.trim(),
        loginCode,
      });

      const response = await fetch(`/api/ka-corrections/submissions?${qs.toString()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fehler beim Laden:', response.status, errorText);
        setSubmissions([]);
        if (response.status === 401) {
          setError('Anmeldung abgelaufen — bitte neu einloggen, dann Korrektur erneut öffnen.');
        } else if (response.status === 403) {
          setError('Keine Berechtigung für Abgaben (Lehrer-Login nötig).');
        } else {
          setError(`Abgaben konnten nicht geladen werden (${response.status}).`);
        }
        return;
      }

      const data = await response.json();
      console.log('✅ Abgaben geladen:', data.submissions?.length || 0, 'Abgaben gefunden');
      console.log('📋 Daten:', data);
      setSubmissions(data.submissions || []);
      
      // Lade alle Korrekturen für alle Submissions in den State (für aufgabenweise Ansicht)
      const allCorrections: Record<string, { points?: number; comment?: string; constructionPoints?: number }> = {};
      data.submissions?.forEach((submission: KASubmission) => {
        submission.corrections?.forEach((corr: KACorrection) => {
          if (corr.taskNumber === REVIEW_COMPLETE_TASK) return;
          const correctionKey = `${submission.id}_${corr.taskNumber}`;
          // Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d): manualPoints sind die Konstruktionspunkte
          if (corr.taskNumber.match(/^3[a-d]$/)) {
            allCorrections[correctionKey] = {
              constructionPoints: corr.manualPoints,
              comment: corr.comment || ''
            };
          } else if (
            corr.taskNumber === '3_comment' ||
            corr.taskNumber === GENERAL_COMMENT_TASK
          ) {
            allCorrections[correctionKey] = {
              comment: corr.comment || '',
            };
          } else {
            // Für andere Aufgaben: manualPoints sind die normalen Punkte
            allCorrections[correctionKey] = {
              points: corr.manualPoints,
              comment: corr.comment || ''
            };
          }
        });
      });
      setCorrections(allCorrections);
    } catch (err) {
      console.error('Fehler beim Laden der Abgaben:', err);
      // Kein Fehler setzen, sondern einfach leere Liste
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCorrections = async (submissionId: string) => {
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const response = await fetch(`/api/ka-corrections/submissions/${submissionId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Korrekturen');
      }

      const data = await response.json();
      const submission = data.submission;
      
      if (submission) {
        setSelectedSubmission(submission);
        setSubmissions((prev) =>
          prev.map((s) => (s.id === submission.id ? { ...s, ...submission } : s)),
        );
        // Lade bestehende Korrekturen - verwende das gleiche Key-Format wie loadSubmissions
        // Aktualisiere nur die Korrekturen für diesen Schüler, überschreibe nicht den gesamten State
        // Wichtig: Setze Werte aus der DB, auch wenn sie bereits im State sind (beim Neuladen)
        // Aber nur wenn der Wert im State undefined ist, um lokale Änderungen zu erhalten
        setCorrections(prev => {
          const updated = { ...prev };
        submission.corrections?.forEach((corr: KACorrection) => {
            if (corr.taskNumber === REVIEW_COMPLETE_TASK) return;
            const correctionKey = `${submission.id}_${corr.taskNumber}`;
            // Setze Wert aus DB, wenn Key nicht existiert oder Wert im State undefined ist
            const currentValue = updated[correctionKey];
            if (currentValue === undefined || 
                (corr.taskNumber.match(/^3[a-d]$/) && currentValue.constructionPoints === undefined) ||
                (!corr.taskNumber.match(/^3[a-d]$/) &&
                  corr.taskNumber !== '3_comment' &&
                  corr.taskNumber !== GENERAL_COMMENT_TASK &&
                  currentValue.points === undefined) ||
                ((corr.taskNumber === '3_comment' ||
                  corr.taskNumber === GENERAL_COMMENT_TASK) &&
                  currentValue?.comment === undefined)) {
          // Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d): manualPoints sind die Konstruktionspunkte
          if (corr.taskNumber.match(/^3[a-d]$/)) {
                updated[correctionKey] = {
                  ...currentValue,
              constructionPoints: corr.manualPoints,
                  comment: corr.comment || currentValue?.comment || ''
                };
              } else if (
                corr.taskNumber === '3_comment' ||
                corr.taskNumber === GENERAL_COMMENT_TASK
              ) {
                updated[correctionKey] = {
                  ...currentValue,
                  comment: corr.comment || '',
                };
              } else {
            // Für andere Aufgaben: manualPoints sind die normalen Punkte
                updated[correctionKey] = {
                  ...currentValue,
            points: corr.manualPoints,
                  comment: corr.comment || currentValue?.comment || ''
          };
              }
          }
        });
          return updated;
        });
      }
    } catch (err) {
      console.error('Error loading corrections:', err);
    }
  };

  const saveCorrection = async (taskNumber: string, points?: number, comment?: string, submissionIdOverride?: string) => {
    const targetSubmissionId = submissionIdOverride || selectedSubmission?.id;
    if (!targetSubmissionId) {
      console.error('Keine Submission-ID verfügbar');
      alert('Fehler: Keine Abgabe ausgewählt');
      return;
    }

    try {
      setSaving(true);
      const loginCode = localStorage.getItem('loginCode') || '';
      
      if (!loginCode) {
        throw new Error('Nicht angemeldet');
      }

      // Validiere Punkte: Für Aufgabe 3 Teilaufgaben (3a, 3b, 3c, 3d) sind nur 0-2 erlaubt
      let validatedPoints: number | undefined = points;
      if (taskNumber.match(/^3[a-d]$/)) {
        if (validatedPoints !== undefined && validatedPoints !== null) {
          // Wenn Wert außerhalb des Bereichs: nicht speichern (undefined setzen)
          if (validatedPoints < 0 || validatedPoints > 2) {
            validatedPoints = undefined;
          }
        }
      }

      const requestBody = {
        submissionId: targetSubmissionId,
        taskNumber,
        manualPoints: validatedPoints !== undefined && validatedPoints !== null ? validatedPoints : null,
        comment: comment || ''
      };

      console.log('💾 Speichere Korrektur:', requestBody);

      const response = await fetch('/api/ka-corrections/corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Fehler beim Speichern der Korrektur';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        console.error('❌ API Fehler:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Korrektur gespeichert:', data);

      const correctionKey = correctionStorageKey(targetSubmissionId, taskNumber);
      const storedPoints = validatedPoints;
      if (taskNumber === REVIEW_COMPLETE_TASK) {
        /* nur in submission.corrections, nicht im Feld-State */
      } else if (taskNumber.match(/^3[a-d]$/)) {
        setCorrections((prev) => ({
          ...prev,
          [correctionKey]: { ...prev[correctionKey], constructionPoints: storedPoints, comment },
        }));
      } else if (taskNumber === '3_comment' || taskNumber === GENERAL_COMMENT_TASK) {
        setCorrections((prev) => ({
          ...prev,
          [correctionKey]: { ...prev[correctionKey], comment: comment || '' },
        }));
      } else {
        setCorrections((prev) => ({
          ...prev,
          [correctionKey]: { ...prev[correctionKey], points: storedPoints, comment },
        }));
      }

      const patchSubmission = (sub: KASubmission): KASubmission => {
        const updatedCorrections = sub.corrections ? [...sub.corrections] : [];
        const idx = updatedCorrections.findIndex((c) => c.taskNumber === taskNumber);
        const row: KACorrection = {
          id:
            idx >= 0
              ? updatedCorrections[idx].id
              : typeof data.correction?.id === 'string'
                ? data.correction.id
                : '',
          taskNumber,
          manualPoints:
            storedPoints !== undefined && storedPoints !== null ? storedPoints : undefined,
          comment: comment || '',
        };
        if (idx >= 0) {
          if (taskNumber === REVIEW_COMPLETE_TASK && storedPoints == null) {
            updatedCorrections.splice(idx, 1);
          } else {
            updatedCorrections[idx] = { ...updatedCorrections[idx], ...row };
          }
        } else if (taskNumber !== REVIEW_COMPLETE_TASK || storedPoints != null) {
          updatedCorrections.push(row);
        }
        return {
          ...sub,
          corrections: updatedCorrections,
          autoPoints: typeof data.autoPoints === 'number' ? data.autoPoints : sub.autoPoints,
          totalPoints: typeof data.totalPoints === 'number' ? data.totalPoints : sub.totalPoints,
        };
      };

      if (submissionIdOverride) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === submissionIdOverride ? patchSubmission(sub) : sub)),
        );
        if (selectedSubmission?.id === submissionIdOverride) {
          setSelectedSubmission(patchSubmission(selectedSubmission));
        }
      } else if (selectedSubmission) {
        const updatedSubmission = patchSubmission(selectedSubmission);
        setSelectedSubmission(updatedSubmission);
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === selectedSubmission.id ? updatedSubmission : sub)),
        );
      }
    } catch (err) {
      console.error('❌ Fehler beim Speichern der Korrektur:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      alert(`Fehler beim Speichern der Korrektur:\n\n${errorMessage}\n\nBitte öffnen Sie die Browser-Konsole für weitere Details.`);
    } finally {
      setSaving(false);
    }
  };

  const selectStudentAtIndex = (index: number) => {
    const student = learningGroupStudents[index];
    if (!student) return;
    const sub = submissionByStudentId.get(student.id);
    if (sub) {
      setSelectedSubmission(sub);
      void loadCorrections(sub.id);
    } else {
      setSelectedSubmission(null);
      setAnswerEdits({});
    }
  };

  const createManualSubmissionForCurrentStudent = async () => {
    const student = learningGroupStudents[currentStudentIndex];
    if (!student || creatingManualSubmission) return;
    setCreatingManualSubmission(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const res = await fetch('/api/ka-corrections/submissions/create-for-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
        body: JSON.stringify({ kaFilePath, studentId: student.id, answers: {} }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Abgabe konnte nicht angelegt werden');
      }
      const data = await res.json();
      const submission = data.submission as KASubmission;
      if (!submission?.id) throw new Error('Ungültige Server-Antwort');
      setSubmissions((prev) => {
        if (prev.some((s) => s.id === submission.id)) {
          return prev.map((s) => (s.id === submission.id ? { ...s, ...submission } : s));
        }
        return [...prev, submission];
      });
      setSelectedSubmission(submission);
      await loadCorrections(submission.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Anlegen der Abgabe');
    } finally {
      setCreatingManualSubmission(false);
    }
  };

  const handleGroupTabChange = (groupIdNext: string) => {
    setActiveGroupId(groupIdNext);
    setCurrentStudentIndex(0);
  };

  useEffect(() => {
    if (learningGroupStudents.length === 0) {
      setSelectedSubmission(null);
      return;
    }
    setCurrentStudentIndex(0);
    selectStudentAtIndex(0);
  }, [activeGroupId]);

  /** Abgaben kommen oft nach dem ersten Schüler-Sync — dann trotzdem Korrektur-Leiste zeigen. */
  useEffect(() => {
    const student = learningGroupStudents[currentStudentIndex];
    if (!student) return;
    const sub = submissionByStudentId.get(student.id);
    if (sub) {
      if (selectedSubmission?.id !== sub.id) {
        setSelectedSubmission(sub);
        void loadCorrections(sub.id);
      }
      return;
    }
    if (selectedSubmission?.student?.id === student.id) {
      setSelectedSubmission(null);
    }
  }, [submissions, currentStudentIndex, learningGroupStudents, submissionByStudentId]);

  const toggleReviewComplete = async (submission: KASubmission) => {
    const finished = isReviewCompleteFlag(submission);
    await saveCorrection(
      REVIEW_COMPLETE_TASK,
      finished ? undefined : 1,
      '',
      submission.id,
    );
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const res = await fetch(`/api/ka-corrections/submissions/${submission.id}`, {
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
      });
      if (!res.ok) return;
      const data = await res.json();
      const fresh = data.submission as KASubmission | undefined;
      if (!fresh?.id) return;
      setSubmissions((prev) => prev.map((s) => (s.id === fresh.id ? fresh : s)));
      if (selectedSubmission?.id === fresh.id) {
        setSelectedSubmission(fresh);
      }
    } catch {
      /* patchSubmission reicht meist */
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < learningGroupStudents.length - 1) {
      const nextIndex = currentStudentIndex + 1;
      setCurrentStudentIndex(nextIndex);
      selectStudentAtIndex(nextIndex);
    }
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      const prevIndex = currentStudentIndex - 1;
      setCurrentStudentIndex(prevIndex);
      selectStudentAtIndex(prevIndex);
    }
  };

  const handleFullResetConfirm = async () => {
    try {
      setResetting(true);
      const pathForReset = examBaseGitPath(kaFilePath);
      const result = await resetExamSession(pathForReset, { restartTimer: true });
      alert(`✅ ${result.message}`);
      setFullResetOpen(false);
      await loadSubmissions();
    } catch (error) {
      console.error('Fehler beim Zurücksetzen:', error);
      alert(error instanceof Error ? error.message : 'Fehler beim Zurücksetzen der Abgaben');
    } finally {
      setResetting(false);
    }
  };

  const parseAnswers = (answersJson: string) => {
    try {
      return JSON.parse(answersJson);
    } catch {
      return {};
    }
  };

  const answersForCorrectionGrouping = (answersJson: string): Record<string, unknown> => {
    const raw = parseAnswers(answersJson) as Record<string, unknown>;
    if (!examDollarHtml) return raw;
    const hasDollar = Object.keys(raw).some((k) => k.startsWith('examDollar_'));
    if (!hasDollar) return raw;
    return remapExamDollarSubmissionToSynthetic(raw, examDollarHtml);
  };

  const GEOMETRY_POINTS: Record<string, number> = {
    a1a: 1, a1b: 1, a1c: 1, a1d: 1, a1e: 1, a1f: 1, a1g: 1, a1h: 1,
    a2a: 1, a2b: 1, a2c: 1,
    'a3a_x': 0.25, 'a3a_y': 0.25, 'a3b_x': 0.25, 'a3b_y': 0.25, 'a3c_x': 0.25, 'a3c_y': 0.25,
    'a3d_x': 0.25, 'a3d_y': 0.25, 'a3e_x': 0.25, 'a3e_y': 0.25, 'a3f_x': 0.25, 'a3f_y': 0.25,
    'a3g_x': 0.25, 'a3g_y': 0.25, 'a3h_x': 0.25, 'a3h_y': 0.25, 'a3i_x': 0.25, 'a3i_y': 0.25,
    'a3j_x': 0.25, 'a3j_y': 0.25, 'a3k_x': 0.25, 'a3k_y': 0.25, 'a3l_x': 0.25, 'a3l_y': 0.25
  };

  const GEOMETRY_ANSWERS: Record<string, any> = {
    a1a: 'Mittelsenkrechte',
    a1b: 'Winkelhalbierende',
    a1c: 'Achsenspiegelung',
    a1d: 'Punktspiegelung',
    a1e: 'Verschiebung',
    a1f: 'Drehung',
    a1g: 'Kongruenzabbildung',
    a1h: 'Doppelspiegelung',
    a2a: 'b',
    a2b: 'a',
    a2c: 'a',
    'a3a_x': -6, 'a3a_y': -4,
    'a3b_x': -3, 'a3b_y': -7,
    'a3c_x': -4, 'a3c_y': -2,
    'a3d_x': -4, 'a3d_y': -6,
    'a3e_x': -7, 'a3e_y': -3,
    'a3f_x': -2, 'a3f_y': -4,
    'a3g_x': 2, 'a3g_y': 7,
    'a3h_x': 5, 'a3h_y': 10,
    'a3i_x': 4, 'a3i_y': 5,
    'a3j_x': 10, 'a3j_y': -6,
    'a3k_x': 7, 'a3k_y': -9,
    'a3l_x': 8, 'a3l_y': -4
  };

  const pointsDistribution: Record<string, number> = examPoints;
  const correctAnswers: Record<string, any> = examAnswers;

  // Hilfsfunktion: Formatiert taskId zu "A1 a" Format
  const formatTaskId = (taskId: string): string => {
    // Beispiel: "a1a" -> "A1 a", "a2b" -> "A2 b", "a3a_x" -> "A3 a x"
    const datePart = taskId.match(/^a(\d+)([a-z])_(d|m|y)$/i);
    if (datePart) {
      const partLabel = datePart[3].toLowerCase() === 'd' ? 'Tag' : datePart[3].toLowerCase() === 'm' ? 'Monat' : 'Jahr';
      return `A${datePart[1]} ${datePart[2].toLowerCase()} ${partLabel}`;
    }
    const match = taskId.match(/^a(\d+)([a-z])(?:_([xy]))?$/);
    if (match) {
      const taskNum = match[1];
      const subTask = match[2].toUpperCase();
      const coord = match[3] ? ` ${match[3]}` : '';
      return `A${taskNum} ${subTask.toLowerCase()}${coord}`;
    }
    // Fallback: Großbuchstaben mit Leerzeichen
    return taskId.replace(/([a-z])(\d)/g, '$1 $2').toUpperCase();
  };

  // Hilfsfunktion: Prüft ob eine Antwort richtig ist (ignoriert Groß-/Kleinschreibung)
  const isAnswerCorrect = (taskId: string, studentAnswer: any): boolean => {
    const correctAnswer = correctAnswers[taskId];
    if (correctAnswer === undefined) return false;
    if (taskId.includes('_x') || taskId.includes('_y')) {
      const studentNum = parseFloat(String(studentAnswer || ''));
      const correctNum = parseFloat(String(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer));
      return !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
    }
    return examAnswerMatches(correctAnswer, studentAnswer);
  };

  // Gruppiere Koordinaten von Aufgabe 3 nach Teilaufgaben (a, b, c, d)
  const groupTask3BySubtask = (task3Answers: Array<{ taskId: string; answer: any; isCorrect?: boolean; points?: number }>) => {
    const subtasks: Record<string, Array<{ taskId: string; answer: any; isCorrect?: boolean; points?: number }>> = {
      'a': [],
      'b': [],
      'c': [],
      'd': []
    };

    task3Answers.forEach(({ taskId, answer, isCorrect, points }) => {
      // a3a_x, a3a_y, a3b_x, a3b_y, a3c_x, a3c_y → a
      // a3d_x, a3d_y, a3e_x, a3e_y, a3f_x, a3f_y → b
      // a3g_x, a3g_y, a3h_x, a3h_y, a3i_x, a3i_y → c
      // a3j_x, a3j_y, a3k_x, a3k_y, a3l_x, a3l_y → d
      if (taskId.match(/a3[a-c][_xy]/)) {
        subtasks['a'].push({ taskId, answer, isCorrect, points });
      } else if (taskId.match(/a3[d-f][_xy]/)) {
        subtasks['b'].push({ taskId, answer, isCorrect, points });
      } else if (taskId.match(/a3[g-i][_xy]/)) {
        subtasks['c'].push({ taskId, answer, isCorrect, points });
      } else if (taskId.match(/a3[j-l][_xy]/)) {
        subtasks['d'].push({ taskId, answer, isCorrect, points });
      }
    });

    return subtasks;
  };

  // Gruppiere Antworten nach Aufgaben (alle Felder aus Lösungsschlüssel, auch leere Radios)
  const groupAnswersByTask = (answers: Record<string, any>) => {
    const grouped: Record<
      string,
      Array<{ taskId: string; answer: any; isCorrect?: boolean; points?: number }>
    > = {};

    const expanded = expandLegacyDateAnswers(answers, Object.keys(correctAnswers)) as Record<string, unknown>;
    const legacyDateBases = new Set(
      Object.keys(correctAnswers)
        .map((id) => id.match(/^(a\d+[a-z])_(d|m|y)$/i)?.[1])
        .filter((id): id is string => Boolean(id)),
    );

    const addField = (taskId: string, answer: unknown) => {
      if (legacyDateBases.has(taskId) && correctAnswers[taskId] === undefined) return;
      const taskMatch = taskId.match(/a(\d+)/);
      if (!taskMatch) return;
      const taskNum = taskMatch[1];
      if (!grouped[taskNum]) grouped[taskNum] = [];
      if (grouped[taskNum].some((x) => x.taskId === taskId)) return;
      grouped[taskNum].push({
        taskId,
        answer: answer ?? '',
        isCorrect: isAnswerCorrect(taskId, answer),
        points: pointsDistribution[taskId] ?? 1,
      });
    };

    Object.entries(expanded).forEach(([taskId, answer]) => addField(taskId, answer));
    Object.keys(correctAnswers).forEach((taskId) => addField(taskId, expanded[taskId]));

    Object.keys(grouped).forEach((taskNum) => {
      grouped[taskNum].sort((a, b) => compareExamFieldIds(a.taskId, b.taskId));
    });

    return grouped;
  };

  const answerFieldTabIndex = useMemo(() => {
    const map = new Map<string, number>();
    if (!tabThroughAnswersOnly || !selectedSubmission) return map;
    const parsed = answersForCorrectionGrouping(selectedSubmission.answers);
    const fieldIds = sortExamAnswerFieldIds(
      Array.from(new Set([...Object.keys(parsed), ...Object.keys(correctAnswers)])),
    ).filter((taskId) => {
      const taskMatch = taskId.match(/a(\d+)/);
      if (!taskMatch) return false;
      if (taskMatch[1] === '3' && useGeometryTask3) return false;
      return true;
    });
    fieldIds.forEach((taskId, idx) => map.set(taskId, idx + 1));
    return map;
  }, [
    tabThroughAnswersOnly,
    selectedSubmission?.id,
    selectedSubmission?.answers,
    examAnswers,
    useGeometryTask3,
    examDollarHtml,
  ]);

  const tabIndexForAnswerField = (taskId: string): number | undefined => {
    if (!tabThroughAnswersOnly) return undefined;
    return answerFieldTabIndex.get(taskId) ?? -1;
  };

  const tabIndexSkipWhenAnswersOnly: number | undefined = tabThroughAnswersOnly ? -1 : undefined;

  const sumTaskPoints = (
    taskAnswers: Array<{ taskId: string; answer?: unknown; isCorrect?: boolean; points?: number }>,
    submission: KASubmission,
  ) => {
    let totalPoints = 0;
    let achievedPoints = 0;
    let autoPoints = 0;
    let manualPoints = 0;

    taskAnswers.forEach(({ taskId, isCorrect, answer, points: fieldMax }) => {
      const maxPoints = fieldMax ?? pointsDistribution[taskId] ?? 1;
      totalPoints += maxPoints;
      const key = correctionStorageKey(submission.id, taskId);
      const correction = corrections[key] || {};
      const saved = submission.corrections?.find((c) => c.taskNumber === taskId);
      const manual =
        correction.points !== undefined && correction.points !== null
          ? Number(correction.points)
          : saved?.manualPoints != null
            ? Number(saved.manualPoints)
            : undefined;

      if (manual !== undefined && !Number.isNaN(manual)) {
        manualPoints += manual;
        achievedPoints += manual;
      } else {
        const correctAnswer = correctAnswers[taskId];
        const custom =
          correctAnswer !== undefined
            ? huKiFieldAutoPoints(kaFilePath, taskId, correctAnswer, answer, maxPoints)
            : null;
        const frac =
          correctAnswer !== undefined
            ? examAnswerScoreFraction(correctAnswer, answer)
            : isCorrect === true
              ? 1
              : 0;
        const pts = custom != null ? custom : maxPoints * frac;
        if (pts > 0) autoPoints += pts;
        achievedPoints += pts;
      }
    });

    return { totalPoints, achievedPoints, autoPoints, manualPoints };
  };

  const liveAchievedTotal = (submission: KASubmission): number => {
    const answers = answersForCorrectionGrouping(submission.answers);
    const grouped = groupAnswersByTask(answers);
    let sum = 0;
    Object.entries(grouped).forEach(([taskNum, taskAnswers]) => {
      if (taskNum === '3' && useGeometryTask3) {
        const subtasks = groupTask3BySubtask(taskAnswers);
        ['a', 'b', 'c', 'd'].forEach((subtaskLetter) => {
          const subtaskAnswers = subtasks[subtaskLetter] || [];
          if (subtaskAnswers.length === 0) return;
          const coordinateAchieved = subtaskAnswers.reduce((s, item) => {
            if (item.isCorrect === true) {
              return s + (pointsDistribution[item.taskId] || 0);
            }
            return s;
          }, 0);
          const subtaskKey = `3${subtaskLetter}`;
          const subtaskCorrectionKey = correctionStorageKey(submission.id, subtaskKey);
          const subtaskCorrection = corrections[subtaskCorrectionKey] || {};
          const saved = submission.corrections?.find((c) => c.taskNumber === subtaskKey);
          let constructionPoints =
            subtaskCorrection.constructionPoints !== undefined &&
            subtaskCorrection.constructionPoints !== null
              ? Number(subtaskCorrection.constructionPoints)
              : saved?.manualPoints != null
                ? Number(saved.manualPoints)
                : 0;
          if (constructionPoints < 0) constructionPoints = 0;
          if (constructionPoints > 2) constructionPoints = 2;
          sum += coordinateAchieved + constructionPoints;
        });
      } else {
        const r = sumTaskPoints(taskAnswers, submission);
        sum +=
          isHuKiMssExamPath(kaFilePath) && taskNum === '1'
            ? Math.max(0, r.achievedPoints)
            : r.achievedPoints;
      }
    });
    return sum;
  };

  const canOpenStudentPreview = (submission: KASubmission | null | undefined): boolean =>
    Boolean(
      submission &&
        (isReviewCompleteFlag(submission) ||
          hasManualCorrectionWork(submission) ||
          hasDraftCorrectionWork(submission.id, corrections)),
    );

  const correctionsForPreview = (submission: KASubmission) => {
    const map = new Map<
      string,
      { taskNumber: string; manualPoints: number | null; comment: string | null }
    >();
    (submission.corrections || [])
      .filter((c) => c.taskNumber !== REVIEW_COMPLETE_TASK)
      .forEach((c) => {
        map.set(c.taskNumber, {
          taskNumber: c.taskNumber,
          manualPoints: c.manualPoints ?? null,
          comment: c.comment ?? null,
        });
      });
    const prefix = `${submission.id}_`;
    Object.entries(corrections).forEach(([key, val]) => {
      if (!key.startsWith(prefix)) return;
      const taskNumber = key.slice(prefix.length);
      if (taskNumber === REVIEW_COMPLETE_TASK) return;
      if (taskNumber === '3_comment' || taskNumber === GENERAL_COMMENT_TASK) {
        if (val.comment) {
          map.set(taskNumber, {
            taskNumber,
            manualPoints: null,
            comment: val.comment,
          });
        }
        return;
      }
      if (/^3[a-d]$/.test(taskNumber)) {
        const pts =
          val.constructionPoints !== undefined && val.constructionPoints !== null
            ? Number(val.constructionPoints)
            : null;
        map.set(taskNumber, {
          taskNumber,
          manualPoints: pts,
          comment: val.comment ?? map.get(taskNumber)?.comment ?? null,
        });
        return;
      }
      const pts = val.points !== undefined && val.points !== null ? Number(val.points) : null;
      map.set(taskNumber, {
        taskNumber,
        manualPoints: pts,
        comment: val.comment ?? map.get(taskNumber)?.comment ?? null,
      });
    });
    return Array.from(map.values());
  };

  const activeLearningGroupName =
    examGroups.find((g) => g.id === activeGroupId)?.name?.trim() || '';

  const buildReviewHtmlForSubmission = async (submission: KASubmission): Promise<string> => {
    const answers = answersForCorrectionGrouping(submission.answers) as Record<string, unknown>;
    const previewCorrections = correctionsForPreview(submission);
    const maxPts = calculateMaxTotalPoints();
    const totalForPreview = liveAchievedTotal(submission);
    const reviewFilePath = resolveExamHtmlReadPath(
      submission.kaFilePath,
      kaFilePath,
      submission.versionLetter ?? submissionVersionLetter(submission, kaFilePath),
    );
    return buildExamReviewedHtml({
      filePath: reviewFilePath,
      title: reviewFilePath.split('/').pop() || 'Prüfung',
      answers,
      corrections: previewCorrections,
      gradeLabel: gradeForSubmission(submission, totalForPreview, maxPts),
      totalPoints: totalForPreview,
      maxPoints: maxPts,
      classAverageText: classAverageLabelForGroup,
      studentName: submissionStudentName(submission),
      learningGroupName: activeLearningGroupName,
      teacherCorrectionMode: true,
    });
  };

  const getFieldCorrectionForDialog = useCallback(
    (taskId: string) => {
      if (!selectedSubmission) return {};
      const key = correctionStorageKey(selectedSubmission.id, taskId);
      const fromState = corrections[key];
      const saved = selectedSubmission.corrections?.find((c) => c.taskNumber === taskId);
      if (/^3[a-d]$/.test(taskId)) {
        return {
          points: fromState?.constructionPoints ?? saved?.manualPoints ?? undefined,
          comment: fromState?.comment ?? saved?.comment ?? '',
        };
      }
      return {
        points: fromState?.points ?? saved?.manualPoints ?? undefined,
        comment: fromState?.comment ?? saved?.comment ?? '',
      };
    },
    [selectedSubmission, corrections],
  );

  const openStudentPreview = async () => {
    if (!selectedSubmission || !canOpenStudentPreview(selectedSubmission)) return;
    setPreviewLoading(true);
    try {
      const html = await buildReviewHtmlForSubmission(selectedSubmission);
      setPreviewTitle(submissionStudentName(selectedSubmission));
      setPreviewHtml(html);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Vorschau konnte nicht geladen werden');
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadAllCorrectedReviewsPdf = async () => {
    const ready = groupSubmissions.filter((s) => canOpenStudentPreview(s));
    if (ready.length === 0) {
      alert('Noch keine fertig korrigierten Abgaben in dieser Gruppe.');
      return;
    }
    setReviewPdfBusy(true);
    try {
      const pages = await Promise.all(ready.map((s) => buildReviewHtmlForSubmission(s)));
      const base =
        (kaFilePath.split('/').pop() || 'Pruefung').replace(/\.(html|htm)$/i, '') || 'Pruefung';
      const grp = activeLearningGroupName ? `_${activeLearningGroupName}` : '';
      await downloadCombinedExamReviewsPdf(pages, `${base}${grp}_alle_korrigiert`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sammel-PDF konnte nicht erstellt werden');
    } finally {
      setReviewPdfBusy(false);
    }
  };

  // Aufgaben mit Rechenweg (müssen manuell korrigiert werden) — Aufgabe 3 nur bei Geometrie-Koordinaten
  const tasksWithRechenweg = useGeometryTask3
    ? ['3', '4', '5', '6', '7', '8', '9']
    : ['4', '5', '6', '7', '8', '9'];

  const calculateGrade = (achieved: number, total: number): string =>
    examGradeLabelForCorrection(achieved, total);

  const gradeForSubmission = (
    submission: KASubmission | null | undefined,
    achieved: number,
    max: number,
  ): string => {
    if (submission?.markedSick && !submissionHasFilledAnswers(submission.answers)) return 'K';
    return calculateGrade(achieved, max);
  };

  const groupAnswerFieldIdsByTask = (answerIds: string[]) => {
    const grouped: Record<string, string[]> = {};
    sortExamAnswerFieldIds(answerIds).forEach((id) => {
      const m = id.match(/^a(\d+)/i);
      if (!m) return;
      const taskNum = m[1];
      if (!grouped[taskNum]) grouped[taskNum] = [];
      grouped[taskNum].push(id);
    });
    return grouped;
  };

  const answerKeyFieldsByTask = useMemo(() => {
    const ids = sortExamAnswerFieldIds(
      Array.from(new Set([...Object.keys(answerKeyDraft), ...Object.keys(examAnswers)])),
    );
    return groupAnswerFieldIdsByTask(ids);
  }, [answerKeyDraft, examAnswers]);

  const openAnswerKeyEditor = () => {
    const draft: Record<string, string> = {};
    Object.entries(examAnswers).forEach(([k, v]) => {
      draft[k] = formatExamCorrect(v);
    });
    const allIds = sortExamAnswerFieldIds(
      Array.from(new Set([...Object.keys(examAnswers), ...Object.keys(draft)])),
    );
    const byTask = groupAnswerFieldIdsByTask(allIds);
    const fieldPts: Record<string, number> = {};
    Object.values(byTask).forEach((fields) => {
      fields.forEach((id) => {
        fieldPts[id] = examPoints[id] ?? 1;
      });
    });
    setAnswerKeyDraft(draft);
    setFieldPointsDraft(fieldPts);
    setAnswerKeyOpen(true);
  };

  const saveAnswerKey = async () => {
    setAnswerKeySaving(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const payload: Record<string, string | string[] | number> = {};
      Object.entries(answerKeyDraft).forEach(([k, v]) => {
        const trimmed = v.trim();
        if (trimmed.includes('/')) {
          payload[k] = trimmed.split('/').map((s) => s.trim()).filter(Boolean);
        } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          payload[k] = Number(trimmed);
        } else {
          payload[k] = trimmed;
        }
      });
      const res = await fetch('/api/ka-corrections/answer-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
        body: JSON.stringify({
          kaFilePath,
          answers: payload,
          fieldPoints: fieldPointsDraft,
        }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      const data = await res.json();
      setExamAnswers({ ...examAnswers, ...payload });
      try {
        const htmlRes = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`,
        );
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          const parsed = parseExamAnswerKey(html);
          setExamPoints(parsed.points);
          setExamMaxPoints(parsed.maxPoints);
        }
      } catch {
        /* Anzeige aktualisiert sich beim nächsten Laden */
      }
      setAnswerKeyOpen(false);
      await loadSubmissions();
      if (selectedSubmission) await loadCorrections(selectedSubmission.id);
      alert(`Musterlösung gespeichert — ${data.recalculated ?? 0} Abgabe(n) neu bewertet.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setAnswerKeySaving(false);
    }
  };

  const recalculateAllSubmissions = async () => {
    setRecalculating(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const res = await fetch('/api/ka-corrections/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
        body: JSON.stringify({ kaFilePath }),
      });
      if (!res.ok) throw new Error('Neubewertung fehlgeschlagen');
      const data = await res.json();
      await loadSubmissions();
      if (selectedSubmission) await loadCorrections(selectedSubmission.id);
      alert(`${data.recalculated ?? 0} Abgabe(n) neu bewertet.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler bei der Neubewertung');
    } finally {
      setRecalculating(false);
    }
  };

  const saveStudentAnswerField = async (taskId: string, value: string) => {
    if (!selectedSubmission) return;
    const parsed = answersForCorrectionGrouping(selectedSubmission.answers);
    const next = { ...parsed, [taskId]: value };
    const loginCode = localStorage.getItem('loginCode') || '';
    const res = await fetch(`/api/ka-corrections/submissions/${selectedSubmission.id}/answers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
      body: JSON.stringify({ answers: next }),
    });
    if (!res.ok) {
      alert('Abgabe konnte nicht gespeichert werden');
      return;
    }
    const data = await res.json();
    const updated = data.submission as KASubmission;
    const merged: KASubmission = {
      ...selectedSubmission,
      ...updated,
      student: updated.student ?? selectedSubmission.student,
      corrections: updated.corrections ?? selectedSubmission.corrections,
    };
    setSelectedSubmission(merged);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === merged.id ? { ...s, ...merged } : s)),
    );
    setAnswerEdits((prev) => {
      const copy = { ...prev };
      delete copy[taskId];
      return copy;
    });
  };

  const calculateMaxTotalPoints = (): number => {
    if (examMaxPoints > 0) return examMaxPoints;
    const fromDist = Object.values(pointsDistribution).reduce((sum, n) => sum + (Number(n) || 0), 0);
    return fromDist > 0 ? fromDist : 0;
  };

  const maxTotalPoints = calculateMaxTotalPoints();
  const selectedLiveTotal = selectedSubmission ? liveAchievedTotal(selectedSubmission) : 0;

  const correctionReviewRefreshKey = useMemo(() => {
    if (!selectedSubmission) return '';
    return `${selectedSubmission.id}:${selectedSubmission.answers}:${JSON.stringify(corrections)}:${maxTotalPoints}`;
  }, [selectedSubmission?.id, selectedSubmission?.answers, corrections, maxTotalPoints]);

  const mergeSubmissionIntoState = (updated: KASubmission, studentId?: string) => {
    const student =
      updated.student ||
      (studentId ? learningGroupStudents.find((s) => s.id === studentId) : undefined);
    const merged: KASubmission = student ? { ...updated, student } : updated;
    setSubmissions((prev) => {
      if (prev.some((s) => s.id === merged.id)) {
        return prev.map((s) => (s.id === merged.id ? { ...s, ...merged } : s));
      }
      return [...prev, merged];
    });
    if (
      selectedSubmission?.id === merged.id ||
      (studentId && learningGroupStudents[currentStudentIndex]?.id === studentId)
    ) {
      setSelectedSubmission(merged);
    }
  };

  const toggleMarkedSick = async (submission: KASubmission, markedSick: boolean) => {
    const loginCode = teacherLoginCode();
    if (!loginCode) {
      alert('Nicht angemeldet — bitte neu einloggen.');
      return;
    }
    if (
      !markedSick &&
      submission.markedSick &&
      !submissionHasFilledAnswers(submission.answers)
    ) {
      setSaving(true);
      try {
        await deleteSubmissionById(submission.id);
        await loadSubmissions();
        selectStudentAtIndex(currentStudentIndex);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Zurücksetzen fehlgeschlagen');
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ka-corrections/submissions/${submission.id}/marked-sick`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-login-code': loginCode,
        },
        body: JSON.stringify({ markedSick }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      const data = await res.json();
      const updated = data.submission as KASubmission;
      mergeSubmissionIntoState(updated, submission.student?.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Krank-Status konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const setMarkedSickForStudent = async (studentId: string, markedSick: boolean) => {
    const existing = submissionByStudentId.get(studentId);
    if (existing) {
      await toggleMarkedSick(existing, markedSick);
      return;
    }
    if (!markedSick) return;
    const loginCode = localStorage.getItem('loginCode') || '';
    if (!loginCode) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ka-corrections/submissions/create-for-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
        body: JSON.stringify({ kaFilePath, studentId, answers: {}, markedSick: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || 'Speichern fehlgeschlagen');
      }
      const data = await res.json();
      const submission = data.submission as KASubmission;
      if (!submission?.id) throw new Error('Ungültige Server-Antwort');
      mergeSubmissionIntoState(submission, studentId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Krank-Status konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const teacherLoginCode = () =>
    (localStorage.getItem('loginCode') || sessionStorage.getItem('loginCode') || '').trim();

  const deleteSubmissionById = async (submissionId: string) => {
    const loginCode = teacherLoginCode();
    if (!loginCode) {
      throw new Error('Nicht angemeldet — bitte neu einloggen.');
    }
    const res = await fetch(`/api/ka-corrections/submissions/${submissionId}/reset`, {
      method: 'POST',
      headers: { 'x-login-code': loginCode },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Zurücksetzen fehlgeschlagen');
  };

  const resetSelectedStudent = async () => {
    if (!selectedSubmission) return;
    setResetStudentBusy(true);
    try {
      await deleteSubmissionById(selectedSubmission.id);
      setResetStudentOpen(false);
      await loadSubmissions();
      selectStudentAtIndex(currentStudentIndex);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Zurücksetzen fehlgeschlagen');
    } finally {
      setResetStudentBusy(false);
    }
  };

  const openVersionDialog = () => {
    if (!selectedSubmission) return;
    setVersionDraft(submissionVersionLetter(selectedSubmission, kaFilePath));
    setVersionPassword('');
    setVersionChangeError(null);
    setVersionDialogOpen(true);
  };

  const saveSubmissionVersion = async () => {
    if (!selectedSubmission) return;
    const letter = normalizeVersionLetter(versionDraft);
    if (!letter) {
      setVersionChangeError('Bitte einen Buchstaben A–Z eingeben.');
      return;
    }
    const loginCode = localStorage.getItem('loginCode') || '';
    if (!loginCode) return;
    setVersionChangeBusy(true);
    setVersionChangeError(null);
    try {
      const res = await fetch(
        `/api/ka-corrections/submissions/${selectedSubmission.id}/exam-version`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-login-code': loginCode,
          },
          body: JSON.stringify({
            versionLetter: letter,
            masterPassword: versionPassword,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Version konnte nicht geändert werden');
      }
      const updated = data.submission as KASubmission;
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      setSelectedSubmission(updated);
      setVersionDialogOpen(false);
      void loadCorrections(updated.id);
    } catch (e) {
      setVersionChangeError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setVersionChangeBusy(false);
    }
  };

  const missingGroupStudents = useMemo(() => {
    const submitted = new Set(groupSubmissions.map((s) => s.student.id));
    return learningGroupStudents.filter((s) => !submitted.has(s.id));
  }, [groupSubmissions, learningGroupStudents]);

  const classAverageLabelForGroup = useMemo(() => {
    const subs = groupSubmissions.filter(
      (s) => typeof s.totalPoints === 'number' && !s.markedSick,
    );
    if (subs.length < 2 || maxTotalPoints <= 0) return undefined;
    const gradeNums = subs.map((s) =>
      examGradeNumericForCorrection(liveAchievedTotal(s), maxTotalPoints),
    );
    const avgGrade = gradeNums.reduce((a, g) => a + g, 0) / gradeNums.length;
    return formatExamClassAverageDecimal(avgGrade);
  }, [groupSubmissions, corrections, maxTotalPoints, examMaxPoints, examPoints, useGeometryTask3, kaFilePath]);

  // Punkte-zu-Note-Zuordnung für Tooltip
  const getGradeScale = (total: number, currentPoints?: number): React.ReactNode => {
    const currentGrade =
      currentPoints !== undefined && total > 0
        ? tendencyToAsciiLabel(scoreToGradeTendency(currentPoints, total))
        : '';

    const ranges = gradePercentDisplayRanges();

    const scale = ranges.map((range) => {
      const minPoints = range.minPercent === 0 ? 0 : Math.ceil(total * (range.minPercent / 100));
      const maxPoints = range.maxPercent === 100 ? total : Math.floor(total * (range.maxPercent / 100));
      const isCurrent = currentGrade === range.label;
      return { range, minPoints, maxPoints, isCurrent };
    });

    // Erstelle JSX-Elemente mit farblicher Hervorhebung
    const result: React.ReactNode[] = [];
    scale.forEach((item, index) => {
      const { range, minPoints, maxPoints, isCurrent } = item;
      const lineContent = `${range.label}: ${minPoints} - ${maxPoints} Punkte${isCurrent ? ' ← Aktuell' : ''}`;
      
      result.push(
        <Box
          key={`grade-${range.label}`}
          component="div"
          sx={{
            backgroundColor: isCurrent ? '#e3f2fd' : 'transparent',
            color: isCurrent ? '#1976d2' : 'inherit',
            fontWeight: isCurrent ? 600 : 400,
            padding: '2px 4px',
            borderRadius: isCurrent ? '4px' : '0',
            display: 'block',
            minHeight: '20px',
            lineHeight: '1.6'
          }}
        >
          {lineContent}
        </Box>
      );
      
      // Leerzeile nach 1-, 2-, 3-, 4-, 5-
      if (range.label === '1-' || range.label === '2-' || range.label === '3-' || range.label === '4-' || range.label === '5-') {
        result.push(<Box key={`spacer-${index}`} component="div" sx={{ height: '4px', display: 'block', flexShrink: 0 }} />);
      }
    });

    return (
      <Box 
        component="div" 
        sx={{ 
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {result}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={onClose} sx={{ mt: 2 }}>Zurück</Button>
      </Box>
    );
  }

  // Keine Blockade mehr - Modal wird immer angezeigt

  const handleOpenKA = async () => {
    try {
      if (!openExamHtmlInNewTab(kaFilePath)) {
        window.location.assign(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`,
        );
      }
    } catch (error) {
      console.error('Fehler beim Öffnen der Klassenarbeit:', error);
      alert(`Fehler beim Öffnen der ${getFileTypeName()}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const exportToWord = async (includeSolutions: boolean) => {
    try {
      const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(kaFilePath)}`);
      
      if (!response.ok) {
        throw new Error(`Fehler beim Laden: ${response.status}`);
      }

      const htmlContent = await response.text();
      
      // Erstelle ein temporäres DOM-Element zum Parsen
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Entferne Lösungsteile, wenn ohne Musterlösung
      if (!includeSolutions) {
        const solutions = doc.querySelectorAll('.solution');
        solutions.forEach(sol => sol.remove());
      }

      // Entferne Scripts und Styles
      doc.querySelectorAll('script, style').forEach(el => el.remove());
      
      const fileName = kaFilePath.split('/').pop()?.replace('.html', '') || 'klassenarbeit';
      
      // Hilfsfunktion: Erstellt TextRun mit Aptos-Schriftart
      const createTextRun = (text: string, options?: { bold?: boolean; italics?: boolean; size?: number; color?: string }) => {
        return new TextRun({
          text,
          font: 'Aptos',
          bold: options?.bold,
          italics: options?.italics,
          size: options?.size || 22, // 11pt = 22 half-points
          color: options?.color || '1a1a1a' // Dunkles Grau statt Schwarz
        });
      };
      
      // Erstelle Word-Dokument
      const paragraphs: Paragraph[] = [];
      
      // Header-Bereich
      const header = doc.querySelector('.header');
      if (header) {
        const headerTitle = header.querySelector('.header-title')?.textContent?.trim();
        const headerDate = header.querySelector('.header-date')?.textContent?.trim();
        const headerBottom = header.querySelector('.header-bottom');
        const headerName = header.querySelector('.header-name');
        
        if (headerTitle) {
      paragraphs.push(
        new Paragraph({
              children: [createTextRun(headerTitle, { bold: true, size: 32, color: '1565C0' })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
              spacing: { after: 240, line: 360 }
            })
          );
        }
        
        if (headerDate) {
          paragraphs.push(
            new Paragraph({
              children: [createTextRun(headerDate, { bold: true, size: 24, color: '1565C0' })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240, line: 300 }
            })
          );
        }
        
        if (headerBottom) {
          const bottomText = Array.from(headerBottom.children)
            .map(child => child.textContent?.trim())
            .filter(Boolean)
            .join(' • ');
          if (bottomText) {
            paragraphs.push(
              new Paragraph({
                children: [createTextRun(bottomText, { bold: true, size: 20, color: '2E7D32' })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 240, line: 280 }
              })
            );
          }
        }
        
        if (headerName) {
          const nameText = headerName.textContent?.trim();
          if (nameText) {
            paragraphs.push(
              new Paragraph({
                children: [createTextRun(nameText, { size: 22 })],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 360, line: 300 }
              })
            );
          }
        }
      }

      // Info-Box
      const infoBox = doc.querySelector('.info-box');
      if (infoBox) {
        const infoTitle = infoBox.querySelector('strong')?.textContent?.trim();
        const infoList = infoBox.querySelectorAll('li');
        
        if (infoTitle) {
          paragraphs.push(
            new Paragraph({
              children: [
                createTextRun('ℹ️ ', { size: 24, color: 'D32F2F' }),
                createTextRun(infoTitle, { bold: true, size: 24, color: 'D32F2F' })
              ],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: infoList.length > 0 ? 0 : 120, line: 300 },
              indent: { left: 200 },
              border: {
                top: {
                  color: 'D32F2F',
                  size: 12,
                  style: 'single'
                },
                left: {
                  color: 'D32F2F',
                  size: 12,
                  style: 'single'
                },
                right: {
                  color: 'D32F2F',
                  size: 12,
                  style: 'single'
                }
              }
            })
          );
        }
        
        infoList.forEach((li, index) => {
          const text = li.textContent?.trim();
          if (text) {
            const isLast = index === infoList.length - 1;
            paragraphs.push(
              new Paragraph({
                children: [
                  createTextRun('• ', { size: 22, color: 'D32F2F' }),
                  createTextRun(text, { size: 22 })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: isLast ? 120 : 80, line: 280 },
                indent: { left: 400 },
                border: {
                  left: {
                    color: 'D32F2F',
                    size: 12,
                    style: 'single'
                  },
                  right: {
                    color: 'D32F2F',
                    size: 12,
                    style: 'single'
                  },
                  ...(isLast ? {
                    bottom: {
                      color: 'D32F2F',
                      size: 12,
                      style: 'single'
                    }
                  } : {})
                }
              })
            );
          }
        });
        
        paragraphs.push(
          new Paragraph({
            text: '',
            spacing: { after: 360 }
          })
        );
      }

      // Extrahiere alle Aufgaben
      const tasks = doc.querySelectorAll('.task');
      tasks.forEach((task) => {
        const taskHeader = task.querySelector('.task-header');
        const taskNumber = taskHeader?.querySelector('.task-number')?.textContent?.trim();
        const taskContent = task.querySelector('.task-content');
        
        if (taskNumber) {
          // Trenne Aufgabenname und Punkteangabe
          const match = taskNumber.match(/^(.*?)\s*(\(.*?\))$/);
          let runs: TextRun[] = [];
          
          if (match) {
            const taskName = match[1].trim(); // z.B. "Aufgabe 1"
            const pointsInfo = match[2]; // z.B. "(8 Punkte - je 1 Punkt pro Lücke)"
            
            runs.push(createTextRun(taskName, { bold: true, size: 26, color: '1565C0' }));
            runs.push(createTextRun(' ', { size: 26 }));
            runs.push(createTextRun(pointsInfo, { bold: false, size: 18, color: '999999' }));
          } else {
            // Fallback: Wenn kein Klammer-Teil gefunden wird
            runs.push(createTextRun(taskNumber, { bold: true, size: 26, color: '1565C0' }));
          }
          
          paragraphs.push(
            new Paragraph({
              children: runs,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 480, after: 240, line: 320 }
            })
          );
        }
        
        if (taskContent) {
          // Alle Absätze im task-content - mit spezieller Behandlung für Input-Felder
          const allParagraphs = taskContent.querySelectorAll('p');
          allParagraphs.forEach(p => {
            // Prüfe ob es ein Lösungsparagraph ist
            const isSolution = p.closest('.solution');
            if (isSolution && !includeSolutions) return;
            
            // Wenn es ein Lösungsparagraph ist, wird er separat verarbeitet - überspringe hier
            if (isSolution) return;
            
            // Prüfe ob der Absatz Input-Felder enthält (Lückentext)
            const hasInputs = p.querySelector('input[type="text"]');
            
            if (hasInputs) {
              // Spezielle Behandlung für Lückentext-Absätze
              const runs: TextRun[] = [];
              const processNodeWithInputs = (node: Node): void => {
                if (node.nodeType === Node.TEXT_NODE) {
                  const text = node.textContent || '';
                  if (text) {
                    runs.push(createTextRun(text));
                  }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  if (element.tagName === 'INPUT' && element.getAttribute('type') === 'text') {
                    // Erstelle unterstrichene Lücke
                    const placeholder = element.getAttribute('placeholder') || '_____________';
                    const gapLength = Math.max(placeholder.length, 15);
                    const gapText = '_'.repeat(gapLength);
                    runs.push(new TextRun({
                      text: gapText,
                      font: 'Aptos',
                      underline: { type: 'single', color: '64B5F6' },
                      color: '64B5F6',
                      size: 22
                    }));
                    runs.push(createTextRun(' ')); // Leerzeichen nach Lücke
                  } else if (element.tagName === 'STRONG' || element.tagName === 'B') {
                    // Verarbeite Kindknoten, um Leerzeichen zu erhalten
                    Array.from(element.childNodes).forEach(processNodeWithInputs);
                  } else if (element.tagName === 'EM' || element.tagName === 'I') {
                    // Verarbeite Kindknoten, um Leerzeichen zu erhalten
                    Array.from(element.childNodes).forEach(processNodeWithInputs);
                  } else {
                    Array.from(element.childNodes).forEach(processNodeWithInputs);
                  }
                }
              };
              Array.from(p.childNodes).forEach(processNodeWithInputs);
              
              if (runs.length > 0) {
              paragraphs.push(
                new Paragraph({
                    children: runs,
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 180, line: 300 }
                })
              );
            }
            } else {
              // Normale Absätze ohne Input-Felder
              const text = p.textContent?.trim();
              if (text) {
                // Prüfe auf fettgedruckte Teile
                const boldElements = p.querySelectorAll('strong');
                if (boldElements.length > 0 || p.querySelector('em')) {
                  // Erstelle TextRun-Array für gemischte Formatierung
                  const runs: TextRun[] = [];
                  let currentText = p.innerHTML;
                  
                  // Einfache Lösung: Extrahiere Text und markiere <strong> als fett
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = currentText;
                  const processNode = (node: Node, isBold = false, isItalic = false): void => {
                    if (node.nodeType === Node.TEXT_NODE) {
                      const text = node.textContent || '';
                      if (text) {
                        runs.push(createTextRun(text, { bold: isBold, italics: isItalic }));
                      }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                      const element = node as Element;
                      if (element.tagName === 'STRONG' || element.tagName === 'B') {
                        // Verarbeite Kindknoten mit bold-Flag, um Leerzeichen zu erhalten
                        Array.from(element.childNodes).forEach(child => processNode(child, true, isItalic));
                      } else if (element.tagName === 'EM' || element.tagName === 'I') {
                        // Verarbeite Kindknoten mit italic-Flag, um Leerzeichen zu erhalten
                        Array.from(element.childNodes).forEach(child => processNode(child, isBold, true));
                      } else {
                        Array.from(element.childNodes).forEach(child => processNode(child, isBold, isItalic));
                      }
                    }
                  };
                  Array.from(tempDiv.childNodes).forEach((node) => processNode(node));
                  
                  if (runs.length > 0) {
                    paragraphs.push(
                      new Paragraph({
                        children: runs,
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 180, line: 300 }
                      })
                    );
                  }
                } else {
                  paragraphs.push(
                    new Paragraph({
                      children: [createTextRun(text, { size: 22 })],
                      alignment: AlignmentType.JUSTIFIED,
                      spacing: { after: 180, line: 300 }
                    })
                  );
                }
              }
            }
          });
          
          // Input-Gruppen (Fragen mit Eingabefeldern)
          const inputGroups = taskContent.querySelectorAll('.input-group');
          inputGroups.forEach((group) => {
            const label = group.querySelector('label');
            if (label) {
              const labelText = label.textContent?.trim();
              if (labelText) {
                // Entferne Radio-Button-Markierungen aus dem Text
                const cleanText = labelText.replace(/^\s*[a-z]\)\s*/, '').trim();
              paragraphs.push(
                new Paragraph({
                    children: [createTextRun(cleanText, { bold: true, size: 22 })],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 120, line: 300 }
                  })
                );
              }
              
              // Radio-Buttons oder Checkboxen
              const options = group.querySelectorAll('label');
              options.forEach(option => {
                const input = option.querySelector('input[type="radio"], input[type="checkbox"]');
                if (input) {
                  const optionText = option.textContent?.trim().replace(/^\s*[a-z]\)\s*/, '').trim();
                  if (optionText) {
                    paragraphs.push(
                      new Paragraph({
                        children: [createTextRun(`○ ${optionText}`, { size: 22, color: '64B5F6' })],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 80, line: 280 },
                        indent: { left: 400 }
                      })
                    );
                  }
                }
              });
              
              // Text-Input-Felder
              const textInputs = group.querySelectorAll('input[type="text"]');
              if (textInputs.length > 0) {
                const placeholder = textInputs[0].getAttribute('placeholder') || '_____________';
                paragraphs.push(
                  new Paragraph({
                    children: [createTextRun(`[${placeholder}]`, { size: 22, color: '64B5F6' })],
                    spacing: { after: 120, line: 300 },
                    indent: { left: 400 }
                  })
                );
              }
              
              // Number-Input-Felder (Koordinaten) - als schöne Koordinaten-Formatierung
              const numberInputs = group.querySelectorAll('input[type="number"]');
              if (numberInputs.length > 0) {
                // Gruppiere Koordinaten nach Punkten (A, B, C, etc.)
                const coordGroups: { point: string; x?: string; y?: string }[] = [];
                numberInputs.forEach((input) => {
                  const id = input.getAttribute('id') || '';
                  const match = id.match(/a\d+([a-z])_([xy])/);
                  if (match) {
                    const pointLetter = match[1];
                    const coord = match[2];
                    const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97)); // a->A, b->B, etc.
                    const pointIndex = pointName.charCodeAt(0) - 65;
                    const subscript = pointIndex > 0 ? String(pointIndex + 1) : '';
                    const fullPointName = `P${subscript || ''}`;
                    
                    let group = coordGroups.find(g => g.point === fullPointName);
                    if (!group) {
                      group = { point: fullPointName };
                      coordGroups.push(group);
                    }
                    
                    const placeholder = input.getAttribute('placeholder') || coord;
                    if (coord === 'x') {
                      group.x = placeholder;
                    } else if (coord === 'y') {
                      group.y = placeholder;
                    }
                  }
                });
                
                if (coordGroups.length > 0) {
                  const coordText = coordGroups.map(g => {
                    const xGap = '_'.repeat(Math.max(g.x?.length || 3, 5));
                    const yGap = '_'.repeat(Math.max(g.y?.length || 3, 5));
                    return `${g.point}(${xGap}|${yGap})`;
                  }).join(', ');
                  
                  const runs: TextRun[] = [];
                  coordGroups.forEach((g, idx) => {
                    if (idx > 0) runs.push(createTextRun(', '));
                    runs.push(createTextRun(g.point + '(', { size: 22 }));
                    const xGap = '_'.repeat(Math.max(g.x?.length || 3, 5));
                    runs.push(new TextRun({
                      text: xGap,
                      font: 'Aptos',
                      underline: { type: 'single', color: '64B5F6' },
                      color: '64B5F6',
                      size: 22
                    }));
                    runs.push(createTextRun('|', { size: 22 }));
                    const yGap = '_'.repeat(Math.max(g.y?.length || 3, 5));
                    runs.push(new TextRun({
                      text: yGap,
                      font: 'Aptos',
                      underline: { type: 'single', color: '64B5F6' },
                      color: '64B5F6',
                      size: 22
                    }));
                    runs.push(createTextRun(')', { size: 22 }));
                  });
                  
                  paragraphs.push(
                    new Paragraph({
                      children: runs,
                      alignment: AlignmentType.JUSTIFIED,
                      spacing: { after: 120, line: 300 },
                      indent: { left: 400 }
                    })
                  );
                }
              }
            }
          });

          // Rechenweg-Hinweis
          const rechenweg = taskContent.querySelector('.rechenweg-required');
          if (rechenweg) {
            const rechenwegText = rechenweg.textContent?.trim();
            if (rechenwegText) {
            paragraphs.push(
              new Paragraph({
                  children: [
                    createTextRun('⚠️ ', { size: 24, color: 'F57C00' }),
                    createTextRun(rechenwegText, { bold: true, size: 22, color: 'F57C00' })
                  ],
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { before: 120, after: 240, line: 300 },
                  indent: { left: 200 }
                })
              );
            }
          }
          
          // SVG-Grafiken (als schöner Hinweis)
          const svgs = taskContent.querySelectorAll('svg');
          if (svgs.length > 0) {
              paragraphs.push(
                new Paragraph({
                children: [
                  createTextRun('📐 ', { size: 24 }),
                  createTextRun('Koordinatensystem mit Konstruktion', { 
                    bold: true, 
                    size: 22, 
                    color: '1976D2' 
                  }),
                  createTextRun(' - siehe Original-Datei für vollständige Grafik', { 
                    size: 20, 
                    color: '666666', 
                    italics: true 
                  })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 240, after: 240, line: 300 },
                indent: { left: 400 }
              })
            );
          }

          // Lösung (nur wenn includeSolutions)
          if (includeSolutions) {
            const solution = taskContent.querySelector('.solution');
            if (solution) {
              // Entferne h4-Überschriften "Musterlösung:" aus der Lösung
              const h4Elements = solution.querySelectorAll('h4');
              h4Elements.forEach(h4 => {
                if (h4.textContent?.trim().toLowerCase().includes('musterlösung')) {
                  h4.remove();
                }
              });
              
              const solutionParagraphs = solution.querySelectorAll('p');
              solutionParagraphs.forEach((p) => {
                const text = p.textContent?.trim();
                if (text) {
                  // Prüfe auf fettgedruckte Teile
                  const boldElements = p.querySelectorAll('strong');
                  if (boldElements.length > 0 || p.querySelector('em')) {
                    const runs: TextRun[] = [];
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = p.innerHTML;
                    const processNode = (node: Node, isBold = false, isItalic = false): void => {
                      if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent || '';
                        if (text) {
                          runs.push(createTextRun(text, { bold: isBold, italics: isItalic, color: 'D32F2F' }));
                        }
                      } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        if (element.tagName === 'STRONG' || element.tagName === 'B') {
                          // Verarbeite Kindknoten mit bold-Flag, um Leerzeichen zu erhalten
                          Array.from(element.childNodes).forEach(child => processNode(child, true, isItalic));
                        } else if (element.tagName === 'EM' || element.tagName === 'I') {
                          // Verarbeite Kindknoten mit italic-Flag, um Leerzeichen zu erhalten
                          Array.from(element.childNodes).forEach(child => processNode(child, isBold, true));
                        } else {
                          Array.from(element.childNodes).forEach(child => processNode(child, isBold, isItalic));
                        }
                      }
                    };
                    Array.from(tempDiv.childNodes).forEach((node) => processNode(node));
                    
                    if (runs.length > 0) {
                  paragraphs.push(
                    new Paragraph({
                          children: runs,
                          alignment: AlignmentType.JUSTIFIED,
                          spacing: { after: 120, line: 300 }
                        })
                      );
                    }
                  } else {
                  paragraphs.push(
                    new Paragraph({
                        children: [createTextRun(text, { size: 22, color: 'D32F2F' })],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: { after: 120, line: 300 }
                    })
                  );
                  }
                }
              });
            }
          }

          paragraphs.push(
            new Paragraph({
              text: '',
              spacing: { after: 400 }
            })
          );
        }
      });

      // Erstelle das Word-Dokument mit professioneller Formatierung
      const wordDoc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 2.54cm = 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: paragraphs
        }],
        styles: {
          default: {
            document: {
              run: {
                font: 'Aptos',
                size: 22, // 11pt
                color: '1a1a1a' // Dunkles Grau statt Schwarz
              },
              paragraph: {
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                  line: 300, // 1.5 line spacing
                  lineRule: 'auto'
                }
              }
            }
          }
        }
      });

      // Generiere und speichere
      const blob = await Packer.toBlob(wordDoc);
      const exportFileName = `${fileName}${includeSolutions ? '_mit_Musterloesung' : '_ohne_Musterloesung'}.docx`;
      saveAs(blob, exportFileName);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      throw error;
    }
  };

  const exportBothWordVersions = async () => {
    try {
      setExporting(true);
      // Lade beide Versionen nacheinander
      await exportToWord(false);
      // Kurze Verzögerung, damit der Browser beide Downloads verarbeiten kann
      await new Promise(resolve => setTimeout(resolve, 500));
      await exportToWord(true);
      // Erfolgreich - kein Popup mehr
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      alert(`Fehler beim Exportieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box
      sx={{
        p: 1,
        bgcolor: '#f5f7fa',
        ...(embedded
          ? {
              width: '100%',
              boxSizing: 'border-box',
            }
          : { minHeight: '100vh' }),
      }}
    >
      {/* Header — fest oben (Vollbild), Entwurf/fertig immer sichtbar */}
      <Card
        sx={{
          mb: 1,
          bgcolor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexShrink: 0,
          ...(embedded ? { position: 'sticky', top: 0, zIndex: 30 } : {}),
        }}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            flexWrap="wrap"
            sx={{ rowGap: 0.35 }}
          >
            <Box sx={{ minWidth: 0, flexShrink: 0, maxWidth: { xs: '100%', sm: 140 } }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.88rem', lineHeight: 1.2 }}
              >
                📝 Korrekturmodus
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                title={kaFilePath}
                sx={{ fontSize: '0.68rem', display: 'block' }}
              >
                {kaFilePath.split('/').pop() || kaFilePath}
                {submissions.length > 0
                  ? ` · ${submissions.length} Abg.`
                  : ' · keine Abg.'}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: '1 1 280px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                gap: 0.35,
                minWidth: 0,
                overflowX: 'auto',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={examMarkedDraft}
                      onChange={(_, checked) => {
                        setExamCorrectionDraft(kaFilePath, checked);
                        setExamMarkedDraft(checked);
                        if (checked) {
                          setExamCorrectionFinished(kaFilePath, false);
                          setExamMarkedFinished(false);
                          setExamCorrectionReleased(kaFilePath, false);
                          setExamMarkedReleased(false);
                        }
                      }}
                      sx={{
                        ...kaWorkflowCheckboxSx,
                        color: '#9e9e9e',
                        '&.Mui-checked': { color: '#757575' },
                      }}
                    />
                  }
                  label="Entwurf"
                  sx={{
                    ...kaWorkflowControlSx,
                    '& .MuiFormControlLabel-label': {
                      ...kaWorkflowControlSx['& .MuiFormControlLabel-label'],
                      color: examMarkedDraft ? '#757575' : '#616161',
                    },
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={examMarkedReleased}
                      onChange={(_, checked) => {
                        setExamCorrectionReleased(kaFilePath, checked);
                        setExamMarkedReleased(checked);
                        if (checked) {
                          setExamCorrectionDraft(kaFilePath, false);
                          setExamMarkedDraft(false);
                          setExamCorrectionFinished(kaFilePath, false);
                          setExamMarkedFinished(false);
                        }
                      }}
                      sx={{
                        ...kaWorkflowCheckboxSx,
                        color: '#9e9e9e',
                        '&.Mui-checked': { color: '#7b1fa2' },
                      }}
                    />
                  }
                  label="Korrektur frei"
                  sx={{
                    ...kaWorkflowControlSx,
                    '& .MuiFormControlLabel-label': {
                      ...kaWorkflowControlSx['& .MuiFormControlLabel-label'],
                      color: examMarkedReleased ? '#7b1fa2' : '#616161',
                    },
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={examMarkedFinished}
                      onChange={(_, checked) => {
                        setExamCorrectionFinished(kaFilePath, checked);
                        setExamMarkedFinished(checked);
                        if (checked) {
                          setExamCorrectionDraft(kaFilePath, false);
                          setExamMarkedDraft(false);
                        }
                      }}
                      sx={{
                        ...kaWorkflowCheckboxSx,
                        color: '#9e9e9e',
                        '&.Mui-checked': { color: '#43a047' },
                      }}
                    />
                  }
                  label="fertig"
                  sx={{
                    ...kaWorkflowControlSx,
                    '& .MuiFormControlLabel-label': {
                      ...kaWorkflowControlSx['& .MuiFormControlLabel-label'],
                      color: examMarkedFinished ? '#43a047' : '#616161',
                    },
                  }}
                />
              </Box>
              {sickStudentsInGroup.length > 0 ? (
                groupExamBeacon.active && groupExamBeacon.makeupSession ? (
                  <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    onClick={() => void stopMakeupExam()}
                    disabled={makeupBeaconBusy}
                    sx={{
                      ...kaCorrectionToolbarBtnSx,
                      mr: 0.35,
                      borderColor: '#f9a825 !important',
                      color: '#e65100',
                      '&:hover': { bgcolor: 'rgba(249, 168, 37, 0.12)' },
                    }}
                  >
                    {makeupBeaconBusy ? '…' : 'Nachschrift beenden'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (!activeGroupId) {
                        alert('Bitte oben eine Lerngruppe wählen.');
                        return;
                      }
                      setMakeupDialogOpen(true);
                    }}
                    sx={{
                      ...kaCorrectionToolbarBtnSx,
                      mr: 0.35,
                      borderColor: '#f9a825 !important',
                      color: '#e65100',
                      '&:hover': { bgcolor: 'rgba(249, 168, 37, 0.12)' },
                    }}
                  >
                    Nachschrift ({sickStudentsInGroup.length})
                  </Button>
                )
              ) : null}
              <ButtonGroup size="small" variant="outlined" sx={kaCorrectionToolbarGroupSx}>
                <Button
                  onClick={handleOpenKA}
                  startIcon={<Description sx={{ fontSize: 13 }} />}
                  tabIndex={-1}
                >
                  KA öffnen
                </Button>
                <Button
                  onClick={() => void exportBothWordVersions()}
                  startIcon={<FileDownload sx={{ fontSize: 13 }} />}
                  disabled={exporting}
                  tabIndex={-1}
                >
                  {exporting ? 'Export…' : 'Word'}
                </Button>
                {Object.keys(examAnswers).length > 0 ? (
                  <>
                    <Button
                      onClick={openAnswerKeyEditor}
                      startIcon={<Edit sx={{ fontSize: 13 }} />}
                      tabIndex={-1}
                    >
                      Musterlösung
                    </Button>
                    <Button
                      onClick={() => void recalculateAllSubmissions()}
                      disabled={recalculating || submissions.length === 0}
                      tabIndex={-1}
                    >
                      {recalculating ? 'Bewerte…' : 'Neu bewerten'}
                    </Button>
                  </>
                ) : null}
                {submissions.length > 0 ? (
                  <>
                    <Tooltip
                      title={
                        selectedSubmission && !canOpenStudentPreview(selectedSubmission)
                          ? 'Teilpunkte vergeben oder Doppelklick auf Schüler:in (Bewertung fertig)'
                          : 'Schüleransicht mit Korrektur'
                      }
                    >
                      <span style={{ display: 'inline-flex' }}>
                        <Button
                          onClick={() => void openStudentPreview()}
                          startIcon={<Visibility sx={{ fontSize: 14 }} />}
                          disabled={
                            previewLoading ||
                            !selectedSubmission ||
                            !canOpenStudentPreview(selectedSubmission)
                          }
                          tabIndex={-1}
                          sx={{
                            ...kaCorrectionToolbarBtnSx,
                            borderColor: `${PURPLE_REVIEW} !important`,
                            color: PURPLE_REVIEW,
                            '&:hover': {
                              borderColor: `${PURPLE_REVIEW} !important`,
                              bgcolor: 'rgba(123, 31, 162, 0.06)',
                            },
                          }}
                        >
                          {previewLoading ? 'Vorschau…' : 'Vorschau'}
                        </Button>
                      </span>
                    </Tooltip>
                    <Button
                      onClick={() => void downloadAllCorrectedReviewsPdf()}
                      startIcon={<FileDownload sx={{ fontSize: 14 }} />}
                      disabled={reviewPdfBusy || groupSubmissions.length === 0}
                      tabIndex={-1}
                      sx={{
                        ...kaCorrectionToolbarBtnSx,
                        borderColor: `${PURPLE_REVIEW} !important`,
                        color: PURPLE_REVIEW,
                        '&:hover': {
                          borderColor: `${PURPLE_REVIEW} !important`,
                          bgcolor: 'rgba(123, 31, 162, 0.06)',
                        },
                      }}
                    >
                      {reviewPdfBusy ? 'PDF…' : 'Alle als PDF'}
                    </Button>
                    <Button
                      onClick={() => setShowDreierprobe(true)}
                      variant="contained"
                      color="primary"
                      startIcon={<BarChart sx={{ fontSize: 14 }} />}
                      tabIndex={-1}
                      sx={{
                        ...kaCorrectionToolbarBtnSx,
                        minWidth: 0,
                        width: 'max-content',
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' },
                      }}
                    >
                      Dreierprobe
                    </Button>
                    {missingGroupStudents.length > 0 ? (
                      <Button
                        onClick={() => {
                          setDreierprobeEmailTab(true);
                          setShowDreierprobe(true);
                        }}
                        startIcon={<Email sx={{ fontSize: 13 }} />}
                        tabIndex={-1}
                        sx={{
                          borderColor: '#f57c00 !important',
                          color: '#e65100',
                          '&:hover': {
                            borderColor: '#f57c00 !important',
                            bgcolor: 'rgba(245, 124, 0, 0.08)',
                          },
                        }}
                      >
                        Fehlende ({missingGroupStudents.length})
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => setFullResetOpen(true)}
                      color="error"
                      disabled={resetting}
                      tabIndex={-1}
                    >
                      Alles zurücksetzen
                    </Button>
                  </>
                ) : null}
              </ButtonGroup>
            </Box>
            <IconButton
              onClick={onClose}
              tabIndex={-1}
              sx={{
                p: 0.4,
                minWidth: 30,
                width: 30,
                height: 30,
                flexShrink: 0,
                ml: 'auto',
                '& .MuiSvgIcon-root': { fontSize: 19 },
              }}
            >
              <Close sx={{ width: '100%', height: '100%' }} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>

      <Box>

      {examGroups.length > 1 && (
        <Tabs
          value={activeGroupId}
          onChange={(_, v) => handleGroupTabChange(String(v))}
          sx={{
            mb: 1,
            minHeight: 36,
            bgcolor: '#fff',
            borderRadius: 1,
            px: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            '& .MuiTab-root': { minHeight: 36, fontWeight: 700, textTransform: 'none', fontSize: '0.82rem' },
          }}
        >
          {examGroups.map((g) => (
            <Tab
              key={g.id}
              value={g.id}
              label={`${g.name} (${g.students.length})`}
              tabIndex={-1}
            />
          ))}
        </Tabs>
      )}

      {/* Breadcrumb-Liste aller Schüler der aktiven Lerngruppe */}
      {learningGroupStudents.length > 0 && (
        <Box sx={{ 
          mb: 0.75, 
          p: 0.5, 
          bgcolor: '#fff', 
          borderRadius: 1, 
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          alignItems: 'center'
        }}>
          {learningGroupStudents.map((student, index) => {
            const submission = submissionByStudentId.get(student.id);
            const hasSubmission = Boolean(submission);
            const isSelected = currentStudentIndex === index;
            const purpleRing = hasSubmission && shouldShowPurpleReviewRing(submission);
            const reviewFinished = hasSubmission && isReviewCompleteFlag(submission);
            const isSick = Boolean(submission?.markedSick);
            
            // Prüfe ob alle Korrekturfelder von mir ausgefüllt sind
            const checkAllFieldsFilled = () => {
              if (!submission) return false;
              // Bestimme welche Aufgaben vorhanden sind basierend auf den Antworten des Schülers
              const answers = answersForCorrectionGrouping(submission.answers);
              const existingTasks = new Set<string>();
              Object.keys(answers).forEach(taskId => {
                const match = taskId.match(/a(\d+)/);
                if (match) {
                  existingTasks.add(match[1]);
                }
              });
              
              // Prüfe nur Aufgaben, die manuell korrigiert werden müssen (tasksWithRechenweg)
              // Aufgabe 1 und 2 werden automatisch korrigiert, daher nicht prüfen
              
              // Prüfe Aufgabe 3: Alle 4 Teilaufgaben (3a, 3b, 3c, 3d) müssen Konstruktionspunkte haben
              // Aber nur wenn Aufgabe 3 vorhanden ist
              // Verwende die gleiche Logik wie in der aufgabenweisen Ansicht (Zeile 2963-2967)
              let allTask3Filled = true;
              if (existingTasks.has('3')) {
                const subtaskKeys = ['3a', '3b', '3c', '3d'];
                allTask3Filled = subtaskKeys.filter(subtask => {
                  // Verwende den gleichen Key-Format wie in der aufgabenweisen Ansicht
                  const subtaskKey = `${submission.id}_${subtask}`;
                  // Verwende die gleiche Logik wie in der aufgabenweisen Ansicht: || {} für Fallback
                  const subtaskCorrection = corrections[subtaskKey] || {};
                  return subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null;
                }).length === subtaskKeys.length;
              }
              
              // Prüfe andere Aufgaben mit Rechenweg (4, 5, 6, 7, 8, 9): Punkte müssen gesetzt sein
              // Nur wenn die Aufgabe vorhanden ist UND manuell korrigiert werden muss
              const tasksNeedingManualCorrection: string[] = [];
              if (existingTasks.has('3')) {
                tasksNeedingManualCorrection.push('3');
              }
              // Prüfe auch andere Aufgaben mit Rechenweg, falls vorhanden
              ['4', '5', '6', '7', '8', '9'].forEach(taskNum => {
                if (existingTasks.has(taskNum)) {
                  tasksNeedingManualCorrection.push(taskNum);
                }
              });
              
              // Prüfe ob alle Aufgaben mit Rechenweg von mir korrigiert wurden
              const allTasksFilled = tasksNeedingManualCorrection.every(taskNum => {
                if (taskNum === '3' && useGeometryTask3) {
                  return allTask3Filled;
                } else {
                  const parsed = answersForCorrectionGrouping(submission.answers);
                  const fieldIds = Object.keys(parsed).filter((id) => {
                    const m = id.match(/a(\d+)/);
                    return m && m[1] === taskNum;
                  });
                  if (fieldIds.length === 0) return true;
                  return fieldIds.every((fieldId) => {
                    const key = correctionStorageKey(submission.id, fieldId);
                    const c = corrections[key] || {};
                    const saved = submission.corrections?.find((sc) => sc.taskNumber === fieldId);
                    const pts = c.points ?? saved?.manualPoints;
                    return pts !== undefined && pts !== null;
                  });
                }
              });
              
              // Wenn keine Aufgaben mit Rechenweg vorhanden sind, gelte als ausgefüllt (nichts zu korrigieren)
              return tasksNeedingManualCorrection.length === 0 || allTasksFilled;
            };
            
            const allFieldsFilled = checkAllFieldsFilled();
            const hasSomeFieldsFilled = () => {
              if (!submission) return false;
              const prefix = `${submission.id}_`;
              return Object.entries(corrections).some(([key, val]) => {
                if (!key.startsWith(prefix)) return false;
                return (
                  (val.points !== undefined && val.points !== null) ||
                  (val.constructionPoints !== undefined && val.constructionPoints !== null)
                );
              });
            };
            
            const someFieldsFilled = hasSomeFieldsFilled();
            
            const displayName = (student.name || '').trim() || 'Schüler/in';
            
            // Berechne Note
            const grade = submission
              ? gradeForSubmission(
                  submission,
                  liveAchievedTotal(submission),
                  maxTotalPoints,
                )
              : '–';
            
            // Bestimme Farbe basierend auf Note
            const getGradeColor = (gradeStr: string): string => {
              if (gradeStr === 'K') return '#f9a825';
              if (gradeStr === '-' || !gradeStr) return '#666';
              const gradeNum = parseFloat(gradeStr.replace(/[+-]/g, ''));
              if (gradeNum <= 1.3) return '#2e7d32'; // Grün für 1, 1+, 1-
              if (gradeNum <= 2.3) return '#4caf50'; // Hellgrün für 2, 2+, 2-
              if (gradeNum <= 3.3) return '#ff9800'; // Orange für 3, 3+, 3-
              if (gradeNum <= 4.3) return '#f57c00'; // Dunkelorange für 4, 4+, 4-
              if (gradeNum <= 5.3) return '#f44336'; // Rot für 5, 5+, 5-
              return '#c62828'; // Dunkelrot für 6
            };
            
            const gradeColor = getGradeColor(grade);
            
            return (
              <Chip
                key={student.id}
                label={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span
                      style={{
                        color: !hasSubmission
                          ? '#b71c1c'
                          : reviewFinished || allFieldsFilled
                            ? PURPLE_REVIEW
                            : '#f57c00',
                      }}
                    >
                      {displayName}
                    </span>
                    {hasSubmission ? (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          lineHeight: 1.1,
                          padding: '1px 7px',
                          borderRadius: 6,
                          color: reviewFinished ? PURPLE_REVIEW : gradeColor,
                          backgroundColor: reviewFinished
                            ? 'rgba(123, 31, 162, 0.12)'
                            : `${gradeColor}22`,
                          border: `2px solid ${reviewFinished ? PURPLE_REVIEW : gradeColor}`,
                          boxShadow: `0 1px 2px ${gradeColor}33`,
                        }}
                      >
                        {grade}
                      </span>
                    ) : null}
                  </Box>
                }
                onClick={(e) => {
                  if (e.detail > 1) return;
                  setCurrentStudentIndex(index);
                  if (!submission) {
                    setSelectedSubmission(null);
                    return;
                  }
                  if (selectedSubmission?.id === submission.id) return;
                  setSelectedSubmission(submission);
                  void loadCorrections(submission.id);
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!submission) return;
                  setCurrentStudentIndex(index);
                  setSelectedSubmission(submission);
                  void toggleReviewComplete(submission);
                }}
                title={
                  !hasSubmission
                    ? 'Keine Abgabe'
                    : isSick
                      ? 'Krank — zählt nicht im Klassenschnitt'
                      : reviewFinished
                        ? 'Bewertung fertig (Doppelklick zum Zurücknehmen)'
                        : 'Doppelklick: Bewertung als fertig markieren'
                }
                tabIndex={-1}
                sx={{
                  height: 'auto',
                  minHeight: 24,
                  fontSize: '0.7rem',
                  fontWeight: isSelected ? 600 : 400,
                  bgcolor: isSick
                    ? SICK_HIGHLIGHT_BG
                    : !hasSubmission
                      ? '#ffebee'
                      : reviewFinished
                        ? '#f3e5f5'
                        : allFieldsFilled
                          ? '#e8f5e9'
                          : '#fff3e0',
                  color: !hasSubmission ? '#b71c1c' : '#1a1a1a',
                  opacity: hasSubmission ? 1 : 0.85,
                  border: isSick
                    ? `2px solid ${SICK_BORDER}`
                    : isSelected
                      ? '2px solid #1976d2'
                      : purpleRing
                        ? `2px solid ${PURPLE_REVIEW}`
                        : hasSubmission
                          ? allFieldsFilled
                            ? '1px solid #4caf50'
                            : '1px solid #ffb74d'
                          : '1px solid #ef9a9a',
                  cursor: hasSubmission ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: hasSubmission ? 'translateY(-1px)' : undefined,
                    boxShadow: hasSubmission ? '0 2px 4px rgba(0,0,0,0.1)' : undefined,
                  },
                  '& .MuiChip-label': {
                    padding: '2px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    whiteSpace: 'normal',
                    lineHeight: 1.2,
                  },
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Tabs */}
      {(groupSubmissions.length > 0 || learningGroupStudents.length > 0) && (
      <Tabs 
        value={mode} 
        onChange={(_, v) => setMode(v)} 
        TabIndicatorProps={{ tabIndex: -1 }}
        sx={{ 
            mb: 1,
            minHeight: 36,
          '& .MuiTab-root': {
              minHeight: 36,
            fontWeight: 600,
            textTransform: 'none',
              fontSize: '0.8rem',
              py: 0.5,
              px: 1
          },
          '& .Mui-selected': {
            color: '#1976d2'
          }
        }}
        indicatorColor="primary"
      >
        <Tab label="👤 Schülerweise" value="by-student" tabIndex={-1} />
        <Tab label="📋 Aufgabenweise" value="by-task" tabIndex={-1} />
      </Tabs>
      )}

      {mode === 'by-student' && learningGroupStudents.length > 0 && (
        <Box>
          {!selectedSubmission ? (
            <Card sx={{ mb: 0.75, bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ py: 0.7, px: 0.85, '&:last-child': { pb: 0.7 } }}>
                {(() => {
                  const student = learningGroupStudents[currentStudentIndex];
                  const placeholderSub = student
                    ? submissionByStudentId.get(student.id)
                    : undefined;
                  return (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.55}
                      flexWrap="wrap"
                      sx={{ rowGap: 0.4 }}
                    >
                      <IconButton
                        onClick={handlePreviousStudent}
                        disabled={currentStudentIndex === 0}
                        size="small"
                        tabIndex={-1}
                        sx={kaNavIconBtnSx}
                      >
                        <ArrowBack sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.72rem', minWidth: 40 }}
                      >
                        {currentStudentIndex + 1}/{learningGroupStudents.length}
                      </Typography>
                      <IconButton
                        onClick={handleNextStudent}
                        disabled={currentStudentIndex === learningGroupStudents.length - 1}
                        size="small"
                        tabIndex={-1}
                        sx={kaNavIconBtnSx}
                      >
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </IconButton>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, fontSize: '0.8rem', flex: '1 1 120px', minWidth: 0 }}
                        noWrap
                      >
                        {student?.name || 'Schüler/in'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                        {placeholderSub ? 'nur Krank-Eintrag' : 'keine Abgabe'}
                      </Typography>
                      {placeholderSub ? (
                        <Tooltip title="Abgabe zurücksetzen">
                          <span>
                            <IconButton
                              size="small"
                              disabled={resetStudentBusy}
                              onClick={() => {
                                setSelectedSubmission(placeholderSub);
                                setResetStudentOpen(true);
                              }}
                              tabIndex={-1}
                              sx={{ ...kaNavIconBtnSx, color: '#ed6c02' }}
                            >
                              <RestartAlt sx={{ fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : null}
                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={Boolean(placeholderSub?.markedSick)}
                            disabled={saving}
                            onChange={(_, on) => {
                              if (student) void setMarkedSickForStudent(student.id, on);
                            }}
                          />
                        }
                        label={
                          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.2 }}>
                            <LocalHospital sx={{ fontSize: 15, color: '#f9a825' }} />
                            <Typography component="span" sx={{ fontSize: '0.68rem', fontWeight: 700 }}>
                              Krank
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, ml: 0.25 }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        disabled={creatingManualSubmission}
                        onClick={() => void createManualSubmissionForCurrentStudent()}
                        startIcon={
                          creatingManualSubmission ? (
                            <CircularProgress size={13} color="inherit" />
                          ) : (
                            <Edit sx={{ fontSize: 14 }} />
                          )
                        }
                        tabIndex={-1}
                        sx={{
                          ...kaCorrectionToolbarBtnSx,
                          minHeight: 28,
                          boxShadow: 'none',
                          ml: { xs: 0, sm: 'auto' },
                        }}
                      >
                        {creatingManualSubmission ? '…' : 'Abgabe erfassen'}
                      </Button>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
          <>
          <Card sx={{ mb: 0.75, bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ py: 0.7, px: 0.85, '&:last-child': { pb: 0.7 } }}>
              <Box
                display="flex"
                alignItems="center"
                gap={0.55}
                flexWrap="wrap"
                sx={{ rowGap: 0.4 }}
              >
                <IconButton
                  onClick={handlePreviousStudent}
                  disabled={currentStudentIndex === 0}
                  size="small"
                  tabIndex={-1}
                  sx={kaNavIconBtnSx}
                >
                  <ArrowBack sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.72rem', minWidth: 40 }}
                >
                  {currentStudentIndex + 1}/{learningGroupStudents.length}
                </Typography>
                <IconButton
                  onClick={handleNextStudent}
                  disabled={currentStudentIndex === learningGroupStudents.length - 1}
                  size="small"
                  tabIndex={-1}
                  sx={kaNavIconBtnSx}
                >
                  <ArrowForward sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, fontSize: '0.8rem', flex: '1 1 100px', minWidth: 0 }}
                  noWrap
                >
                  {submissionStudentName(selectedSubmission)}
                </Typography>
                <Tooltip title="Prüfungsversion (Masterpasswort)">
                  <Chip
                    label={submissionVersionLetter(selectedSubmission, kaFilePath)}
                    size="small"
                    onClick={openVersionDialog}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      height: 24,
                      minWidth: 28,
                      bgcolor: '#e3f2fd',
                      color: '#1565c0',
                      border: '1px solid #1565c0',
                      cursor: 'pointer',
                      '& .MuiChip-label': { px: 0.65 },
                    }}
                  />
                </Tooltip>
                <Tooltip title="Abgabe zurücksetzen">
                  <span>
                    <IconButton
                      size="small"
                      disabled={resetStudentBusy}
                      onClick={() => setResetStudentOpen(true)}
                      tabIndex={-1}
                      sx={{ ...kaNavIconBtnSx, color: '#ed6c02' }}
                    >
                      <RestartAlt sx={{ fontSize: 17 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={Boolean(selectedSubmission.markedSick)}
                      disabled={saving}
                      onChange={(_, on) => {
                        const sid = selectedSubmission.student?.id;
                        if (sid) void setMarkedSickForStudent(sid, on);
                        else void toggleMarkedSick(selectedSubmission, on);
                      }}
                    />
                  }
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.2 }}>
                      <LocalHospital sx={{ fontSize: 15, color: '#f9a825' }} />
                      <Typography component="span" sx={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        Krank
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
                <Chip
                  size="small"
                  label={`${formatExamPointsDisplay(selectedLiveTotal)}/${formatExamPointsDisplay(maxTotalPoints)}`}
                  sx={{
                    height: 24,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: '#c8e6c9',
                    color: '#2e7d32',
                    '& .MuiChip-label': { px: 0.65 },
                  }}
                />
                <Tooltip
                  title={
                    selectedSubmission.markedSick
                      ? 'Krank — keine Note'
                      : (
                        <Box component="div" sx={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                          {getGradeScale(maxTotalPoints, selectedLiveTotal)}
                        </Box>
                      )
                  }
                  arrow
                  placement="top"
                >
                  <Chip
                    size="small"
                    label={gradeForSubmission(
                      selectedSubmission,
                      selectedLiveTotal,
                      maxTotalPoints,
                    )}
                    sx={{
                      height: 24,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      bgcolor: selectedSubmission.markedSick ? '#fff8e1' : '#1976d2',
                      color: selectedSubmission.markedSick ? '#f57f17' : '#fff',
                      border: selectedSubmission.markedSick ? '1px solid #fbc02d' : undefined,
                      cursor: 'help',
                      '& .MuiChip-label': { px: 0.7 },
                    }}
                  />
                </Tooltip>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={tabThroughAnswersOnly}
                      onChange={(_, checked) => setTabThroughAnswersOnly(checked)}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 600 }}>Tab Felder</Typography>
                  }
                  sx={{
                    m: 0,
                    ml: { xs: 0, sm: 'auto' },
                    '& .MuiFormControlLabel-label': { lineHeight: 1.1 },
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {selectedSubmission.markedSick &&
          !submissionHasFilledAnswers(selectedSubmission.answers) ? (
            <Alert severity="warning" sx={{ mb: 0.75, py: 0.5, fontSize: '0.75rem' }}>
              Krank, noch keine (Nachschrift-)Abgabe — Prüfung unten zur manuellen Korrektur /
              Punkte. Live-Nachschrift: Button <strong>Nachschrift</strong> oben.
            </Alert>
          ) : null}
          <ExamCorrectionLiveReview
            refreshKey={correctionReviewRefreshKey}
            buildHtml={() => buildReviewHtmlForSubmission(selectedSubmission)}
            getFieldCorrection={getFieldCorrectionForDialog}
            onSaveGeneralComment={(comment) => {
              const generalKey = correctionStorageKey(
                selectedSubmission.id,
                GENERAL_COMMENT_TASK,
              );
              setCorrections((prev) => ({
                ...prev,
                [generalKey]: { ...prev[generalKey], comment },
              }));
              void saveCorrection(
                GENERAL_COMMENT_TASK,
                undefined,
                comment,
                selectedSubmission.id,
              );
            }}
            onSaveField={(taskId, points, comment) => {
              void saveCorrection(taskId, points, comment, selectedSubmission.id);
            }}
          />

          </>
                          )}
                                  </Box>
      )}

      {mode === 'by-task' && (
        <Box>
          <Typography variant="caption" sx={{ mb: 0.75, fontWeight: 600, color: '#1a1a1a', fontSize: '0.8rem', display: 'block' }}>
            📋 Aufgabenweise Korrektur
          </Typography>
          
          {tasksWithRechenweg.map(taskNum => {
            const taskFieldIds = sortExamAnswerFieldIds(
              Object.keys(correctAnswers).filter((taskId) => {
                const match = taskId.match(/a(\d+)/);
                return match && match[1] === taskNum;
              }),
            );
            const taskSubmissions = groupSubmissions.map(sub => {
              const answers = answersForCorrectionGrouping(sub.answers);
              const taskAnswers = taskFieldIds.map((taskId) => ({
                taskId,
                answer: answers[taskId] ?? '',
              }));

              return {
                submission: sub,
                answers: taskAnswers
              };
            }).filter(item => item.answers.length > 0);

            if (taskSubmissions.length === 0) return null;

            return (
              <Card key={taskNum} sx={{ mb: 1, bgcolor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                  <Box display="flex" alignItems="center" gap={0.5} mb={0.75}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '0.8rem' }}>
                      Aufgabe {taskNum}
                    </Typography>
                    <Chip
                      label="✏️"
                      size="small"
                      sx={{ 
                        bgcolor: '#fff3e0', 
                        color: '#f57c00',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 20
                      }}
                    />
                  </Box>
                  
                  <TableContainer>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 0.75, fontSize: '0.75rem' } }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          {taskNum === '3' && useGeometryTask3 ? (
                            <>
                              <TableCell sx={{ fontWeight: 700, width: '12%', fontSize: '0.7rem' }}>Schüler</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3a</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3b</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3c</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '18%', fontSize: '0.7rem' }}>A3d</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: '16%', fontSize: '0.7rem' }}>Kommentar</TableCell>
                            </>
                          ) : (
                            <>
                          <TableCell sx={{ fontWeight: 700, width: '20%', fontSize: '0.7rem' }}>Schüler</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '30%', fontSize: '0.7rem' }}>Antwort</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '15%', fontSize: '0.7rem' }}>Pkt.</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: '35%', fontSize: '0.7rem' }}>Kommentar</TableCell>
                            </>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {taskSubmissions.map(({ submission, answers }, idx) => {
                          // Für Aufgabe 3: Zeige Teilaufgaben (a, b, c, d) separat, aber Kommentar nur einmal
                          if (taskNum === '3' && useGeometryTask3) {
                            const subtasks = groupTask3BySubtask(answers.map(({ taskId, answer }) => {
                              const parsedAnswers = parseAnswers(submission.answers);
                              const isCorrect = parsedAnswers[taskId]?.isCorrect;
                              return { taskId, answer, isCorrect };
                            }));
                            
                            // Kommentar für die ganze Aufgabe 3 (nur einmal pro Schüler)
                            const task3CommentKey = '3_comment';
                            const task3CommentCorrectionKey = `${submission.id}_${task3CommentKey}`;
                            // Lade Kommentar aus State oder aus submission.corrections
                            // Wichtig: Nur Fallback verwenden, wenn Key nicht im State existiert (nicht wenn Wert undefined ist)
                            const savedTask3Comment = submission.corrections?.find(c => c.taskNumber === task3CommentKey);
                            const task3Comment = corrections[task3CommentCorrectionKey] !== undefined
                              ? corrections[task3CommentCorrectionKey]
                              : {
                                  comment: savedTask3Comment?.comment || ''
                                };
                            
                            // Formatiere korrekte Koordinaten
                            const formatCorrectCoordinates = (subtaskAnswers: Array<{ taskId: string; answer: any; isCorrect?: boolean }>) => {
                              const points: Record<string, { x?: any; y?: any }> = {};
                              subtaskAnswers.forEach(({ taskId }) => {
                                const correctAnswer = correctAnswers[taskId];
                                if (correctAnswer !== undefined) {
                                  const pointMatch = taskId.match(/a3([a-l])/);
                                  if (pointMatch) {
                                    const pointLetter = pointMatch[1];
                                    const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97));
                                    if (!points[pointName]) points[pointName] = {};
                                    if (taskId.includes('_x')) {
                                      points[pointName].x = correctAnswer;
                                    } else if (taskId.includes('_y')) {
                                      points[pointName].y = correctAnswer;
                                    }
                                  }
                                }
                              });
                              return Object.entries(points)
                                .map(([pointName, coords]) => {
                                  const x = coords.x !== undefined ? coords.x : '?';
                                  const y = coords.y !== undefined ? coords.y : '?';
                                  return `${pointName}(${x}|${y})`;
                                })
                                .join(', ');
                            };
                            
                            // Prüfe ob alle Felder für diese Aufgabe ausgefüllt sind
                            const subtaskKeys = ['3a', '3b', '3c', '3d'];
                            const filledFields = subtaskKeys.filter(subtask => {
                              const subtaskKey = `${submission.id}_${subtask}`;
                              const subtaskCorrection = corrections[subtaskKey] || {};
                              return subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null;
                            });
                            const allFieldsFilled = filledFields.length === subtaskKeys.length;
                            const someFieldsFilled = filledFields.length > 0 && filledFields.length < subtaskKeys.length;
                            
                            // Render-Funktion für eine Teilaufgabe
                            const renderSubtask = (subtask: string) => {
                              const subtaskAnswers = subtasks[subtask] || [];
                              if (subtaskAnswers.length === 0) return null;
                              
                              const subtaskKey = `3${subtask}`;
                              const subtaskCorrectionKey = `${submission.id}_${subtaskKey}`;
                              // Lade Korrektur aus State oder aus submission.corrections
                              // Wichtig: Nur Fallback verwenden, wenn Key nicht im State existiert (nicht wenn Wert undefined ist)
                              const savedCorrection = submission.corrections?.find(c => c.taskNumber === subtaskKey);
                              const subtaskCorrection = corrections[subtaskCorrectionKey] !== undefined
                                ? corrections[subtaskCorrectionKey]
                                : {
                                    constructionPoints: savedCorrection?.manualPoints,
                                    comment: savedCorrection?.comment || ''
                                  };
                              
                              // Berechne Koordinatenpunkte (automatisch)
                              const coordinateAchieved = subtaskAnswers.reduce((sum, item) => {
                                const maxPoints = pointsDistribution[item.taskId] || 0;
                                if (item.isCorrect === true) {
                                  return sum + maxPoints;
                                }
                                return sum;
                              }, 0);
                              
                              // Konstruktionspunkte (manuell)
                              let constructionAchieved = subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null 
                                ? subtaskCorrection.constructionPoints 
                                : 0;
                              // Validiere: nur Werte zwischen 0 und 2 erlauben
                              if (constructionAchieved < 0) constructionAchieved = 0;
                              if (constructionAchieved > 2) constructionAchieved = 2;
                              
                              const achievedPoints = coordinateAchieved + constructionAchieved;
                              const coordinatePoints = subtaskAnswers.reduce((sum, item) => {
                                return sum + (pointsDistribution[item.taskId] || 0);
                              }, 0);
                              const totalPoints = coordinatePoints + 2; // 1.5 + 2 = 3.5
                              
                              // Bestimme Hintergrundfarbe basierend auf Bewertung
                              const allCorrect = subtaskAnswers.every(item => item.isCorrect === true);
                              const someCorrect = subtaskAnswers.some(item => item.isCorrect === true);
                              
                              return (
                                <Box>
                                  {/* Header: Teilaufgabe + Punkte + Status */}
                                  <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap" mb={0.25}>
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontWeight: 700, 
                                        color: '#1976d2', 
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      A3 {subtask}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#666', fontSize: '0.65rem' }}>
                                      {formatExamPointsDisplay(achievedPoints)} /{' '}
                                      {formatExamPointsDisplay(totalPoints)}
                                    </Typography>
                                    <Box display="flex" gap={0.25} alignItems="center">
                                      {allCorrect && (
                                        <Chip
                                          label="✓"
                                          size="small"
                                          sx={{ 
                                            bgcolor: '#4caf50', 
                                            color: '#fff',
                                            height: 18,
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            '& .MuiChip-label': { px: 0.5 }
                                          }}
                                        />
                                      )}
                                      {!allCorrect && someCorrect && (
                                        <Chip
                                          label="~"
                                          size="small"
                                          sx={{ 
                                            bgcolor: '#ff9800', 
                                            color: '#fff',
                                            height: 18,
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            '& .MuiChip-label': { px: 0.5 }
                                          }}
                                        />
                                      )}
                                      {!someCorrect && subtaskAnswers.length > 0 && (
                                        <Chip
                                          label="✗"
                                          size="small"
                                          sx={{ 
                                            bgcolor: '#f44336', 
                                            color: '#fff', 
                                            height: 18,
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            '& .MuiChip-label': { px: 0.5 }
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                  
                                  {/* Koordinaten Anzeige */}
                                  <Box sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.5)',
                                    p: 0.25,
                                    borderRadius: 0.25,
                                    mb: 0.5,
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    minHeight: 24
                                  }}>
                                    <Typography variant="caption" sx={{ 
                                      fontFamily: 'monospace',
                                      fontSize: '0.7rem',
                                      lineHeight: 1.2
                                    }}>
                                      {(() => {
                                        // Gruppiere x und y Koordinaten nach Punkt
                                        const points: Record<string, { x?: any; y?: any; xCorrect?: boolean; yCorrect?: boolean }> = {};
                                        subtaskAnswers.forEach(({ taskId, answer, isCorrect }) => {
                                          const pointMatch = taskId.match(/a3([a-l])/);
                                          if (pointMatch) {
                                            const pointLetter = pointMatch[1];
                                            const pointName = String.fromCharCode(65 + (pointLetter.charCodeAt(0) - 97));
                                            if (!points[pointName]) points[pointName] = {};
                                            if (taskId.includes('_x')) {
                                              points[pointName].x = answer;
                                              points[pointName].xCorrect = isCorrect;
                                            } else if (taskId.includes('_y')) {
                                              points[pointName].y = answer;
                                              points[pointName].yCorrect = isCorrect;
                                            }
                                          }
                                        });
                                        
                                        // Formatiere als P(x|y) mit Farben
                                        return Object.entries(points).map(([pointName, coords], idx) => {
                                          const x = coords.x !== undefined && coords.x !== null && coords.x !== '' ? coords.x : '?';
                                          const y = coords.y !== undefined && coords.y !== null && coords.y !== '' ? coords.y : '?';
                                          const xColor = coords.xCorrect === true ? '#2e7d32' : coords.xCorrect === false ? '#c62828' : '#1a1a1a';
                                          const yColor = coords.yCorrect === true ? '#2e7d32' : coords.yCorrect === false ? '#c62828' : '#1a1a1a';
                                          
                                          return (
                                            <span key={pointName}>
                                              {idx > 0 && ', '}
                                              {pointName}(
                                              <span style={{ color: xColor }}>{x}</span>|
                                              <span style={{ color: yColor }}>{y}</span>)
                                            </span>
                                          );
                                        });
                                      })()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                      fontFamily: 'monospace',
                                      fontSize: '0.6rem',
                                      fontStyle: 'italic',
                                      lineHeight: 1.2,
                                      color: '#2e7d32',
                                      display: 'block',
                                      mt: 0.25
                                    }}>
                                      {formatCorrectCoordinates(subtaskAnswers)}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Eingabefeld: Konstruktionspunkte */}
                                  <Box sx={{ mt: 0.5 }}>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                      <Box sx={{ position: 'relative', width: 100 }}>
                                        <TextField
                                          label="Konstruktion"
                                          type="number"
                                          value={subtaskCorrection.constructionPoints ?? ''}
                                          onChange={(e) => {
                                            const inputValue = e.target.value.trim().toLowerCase();
                                            let value: number | undefined = undefined;
                                            
                                            // Wenn "x" eingegeben wird, leere das Feld
                                            if (inputValue === 'x') {
                                              value = undefined;
                                            } else if (inputValue === '') {
                                              value = undefined;
                          } else {
                                              const numValue = parseFloat(e.target.value);
                                              if (!isNaN(numValue)) {
                                                // Validiere: nur Werte zwischen 0 und 2 erlauben
                                                if (numValue >= 0 && numValue <= 2) {
                                                  value = numValue;
                                                }
                                                // Wenn Wert außerhalb des Bereichs: ignorieren (nicht setzen)
                                              }
                                            }
                                            
                                            // Nur setzen, wenn Wert gültig ist, leer oder "x"
                                            if (value !== undefined || e.target.value === '' || inputValue === 'x') {
                                              setCorrections(prev => ({
                                                ...prev,
                                                [subtaskCorrectionKey]: { ...prev[subtaskCorrectionKey], constructionPoints: value }
                                              }));
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const currentCorrection = corrections[subtaskCorrectionKey] || {};
                                            let constructionPoints = currentCorrection.constructionPoints;
                                            
                                            // Prüfe den aktuellen Wert im TextField
                                            const inputValue = e.target.value.trim().toLowerCase();
                                            
                                            // Wenn "x" eingegeben wurde, leere das Feld
                                            if (inputValue === 'x') {
                                              constructionPoints = undefined;
                                              // Aktualisiere den State
                                              setCorrections(prev => ({
                                                ...prev,
                                                [subtaskCorrectionKey]: { ...prev[subtaskCorrectionKey], constructionPoints: undefined }
                                              }));
                                              // Leere das TextField
                                              e.target.value = '';
                                            } else if (inputValue !== '') {
                                              const numValue = parseFloat(inputValue);
                                              if (!isNaN(numValue)) {
                                                // Validiere: nur Werte zwischen 0 und 2 erlauben
                                                if (numValue >= 0 && numValue <= 2) {
                                                  constructionPoints = numValue;
                                                  // Aktualisiere den State mit dem neuen Wert
                                                  setCorrections(prev => ({
                                                    ...prev,
                                                    [subtaskCorrectionKey]: { ...prev[subtaskCorrectionKey], constructionPoints }
                                                  }));
                                                } else {
                                                  // Ungültiger Wert: auf vorherigen Wert zurücksetzen oder undefined
                                                  constructionPoints = currentCorrection.constructionPoints;
                                                  // Setze das TextField auf den gültigen Wert zurück
                                                  e.target.value = constructionPoints !== undefined ? String(constructionPoints) : '';
                                                }
                                              }
                                            }
                                            
                                            // Speichere nur, wenn ein gültiger Wert vorhanden ist (oder undefined für "x")
                                            if (constructionPoints === undefined || (constructionPoints !== null && constructionPoints >= 0 && constructionPoints <= 2)) {
                                              saveCorrection(subtaskKey, constructionPoints, currentCorrection.comment, submission.id);
                                            }
                                          }}
                                          inputProps={{ min: 0, max: 2, step: 0.5 }}
                                          tabIndex={idx * 5 + (subtask === 'a' ? 1 : subtask === 'b' ? 2 : subtask === 'c' ? 3 : 4)}
                                          size="small"
                                          sx={{ 
                                            width: 100,
                                            '& .MuiOutlinedInput-root': {
                                              bgcolor: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '#e8f5e9' : '#ffebee',
                                              border: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336',
                                              fontSize: '0.7rem',
                                              height: 32,
                                              '&:hover': {
                                                border: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336'
                                              },
                                              '&.Mui-focused': {
                                                border: (subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) ? '2px solid #4caf50' : '2px solid #f44336'
                                              }
                                            },
                                            '& .MuiInputLabel-root': {
                                              fontSize: '0.65rem'
                                            }
                                          }}
                                        />
                                        {(subtaskCorrection.constructionPoints !== undefined && subtaskCorrection.constructionPoints !== null && !isNaN(subtaskCorrection.constructionPoints) && subtaskCorrection.constructionPoints >= 0 && subtaskCorrection.constructionPoints <= 2) && (
                                          <CheckCircle 
                                            sx={{ 
                                              position: 'absolute',
                                              right: 4,
                                              top: '50%',
                                              transform: 'translateY(-50%)',
                                              fontSize: 18,
                                              color: '#4caf50'
                                            }}
                                          />
                                        )}
                                      </Box>
                                      <Typography variant="caption" sx={{ color: '#9c27b0', fontSize: '0.7rem', fontWeight: 500 }}>
                                        max: 2
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              );
                            };

                          return (
                            <TableRow 
                              key={submission.id}
                              sx={{ 
                                '&:nth-of-type(even)': { bgcolor: '#fafafa' },
                                '&:hover': { bgcolor: '#f0f0f0' }
                              }}
                            >
                              <TableCell>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.7rem',
                                      color: allFieldsFilled ? '#2e7d32' : (someFieldsFilled ? '#f57c00' : '#d32f2f'),
                                      bgcolor: allFieldsFilled ? 'transparent' : (someFieldsFilled ? '#fff3e0' : 'transparent'),
                                      px: someFieldsFilled ? 0.5 : 0,
                                      py: someFieldsFilled ? 0.25 : 0,
                                      borderRadius: someFieldsFilled ? 0.5 : 0
                                    }}
                                  >
                                    {submissionStudentName(submission)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('a')}
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('b')}
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('c')}
                                </TableCell>
                                <TableCell>
                                  {renderSubtask('d')}
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    multiline
                                    rows={4}
                                    value={task3Comment.comment ?? ''}
                                    onChange={(e) => {
                                      setCorrections(prev => ({
                                        ...prev,
                                        [task3CommentCorrectionKey]: { ...prev[task3CommentCorrectionKey], comment: e.target.value }
                                      }));
                                    }}
                                    onBlur={() => {
                                      const correction = corrections[task3CommentCorrectionKey] || {};
                                      saveCorrection(task3CommentKey, undefined, correction.comment, submission.id);
                                    }}
                                    tabIndex={idx * 5 + 5}
                                    size="small"
                                    fullWidth
                                    placeholder="Kommentar für die gesamte Aufgabe 3..."
                                    sx={{ 
                                      '& .MuiOutlinedInput-root': {
                                        bgcolor: '#e3f2fd',
                                        border: '2px solid #9c27b0',
                                        fontSize: '0.7rem',
                                        '&:hover': {
                                          border: '2px solid #7b1fa2'
                                        },
                                        '&.Mui-focused': {
                                          border: '2px solid #7b1fa2'
                                        }
                                      },
                                      '& .MuiInputLabel-root': {
                                        fontSize: '0.65rem'
                                      }
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Pro Teilaufgabe (a3a, a4b, …) eigene Punkte/Kommentare
                          return answers.map(({ taskId, answer }, answerIdx) => {
                            const fieldCorrectionKey = correctionStorageKey(submission.id, taskId);
                            const savedField = submission.corrections?.find(
                              (c) => c.taskNumber === taskId,
                            );
                            const fieldState =
                              corrections[fieldCorrectionKey] !== undefined
                                ? corrections[fieldCorrectionKey]
                                : {
                                    points: savedField?.manualPoints,
                                    comment: savedField?.comment || '',
                                  };
                            const fieldFilled =
                              fieldState.points !== undefined && fieldState.points !== null;

                            return (
                              <TableRow
                                key={`${submission.id}-${taskId}`}
                                sx={{
                                  '&:nth-of-type(even)': { bgcolor: '#fafafa' },
                                  '&:hover': { bgcolor: '#f0f0f0' },
                                }}
                              >
                                <TableCell>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      color: fieldFilled ? '#2e7d32' : '#f57c00',
                                      bgcolor: fieldFilled ? 'transparent' : '#fff3e0',
                                      px: !fieldFilled ? 0.5 : 0,
                                      py: !fieldFilled ? 0.25 : 0,
                                      borderRadius: !fieldFilled ? 0.5 : 0,
                                    }}
                                  >
                                    {answerIdx === 0 ? submissionStudentName(submission) : ''}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      color: '#1976d2',
                                      fontSize: '0.65rem',
                                      display: 'block',
                                    }}
                                  >
                                    {formatTaskId(taskId)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontFamily: 'monospace',
                                      fontWeight: answer ? 500 : 400,
                                      color: answer ? '#1a1a1a' : '#d32f2f',
                                      fontSize: '0.7rem',
                                      display: 'block',
                                    }}
                                  >
                                    {String(answer) || '(leer)'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ position: 'relative', width: '70px' }}>
                                    <TextField
                                      type="number"
                                      value={fieldState.points ?? ''}
                                      onChange={(e) => {
                                        const inputValue = e.target.value.trim().toLowerCase();
                                        let value: number | undefined;
                                        if (inputValue === 'x' || inputValue === '') {
                                          value = undefined;
                                        } else {
                                          const numValue = parseFloat(e.target.value);
                                          value = !isNaN(numValue) ? numValue : undefined;
                                        }
                                        setCorrections((prev) => ({
                                          ...prev,
                                          [fieldCorrectionKey]: { ...prev[fieldCorrectionKey], points: value },
                                        }));
                                      }}
                                      onBlur={(e) =>
                                        void saveCorrection(
                                          taskId,
                                          parsePointsInput((e.target as HTMLInputElement).value),
                                          fieldState.comment,
                                          submission.id,
                                        )
                                      }
                                      inputProps={{ min: 0, max: 10, step: 0.25 }}
                                      size="small"
                                      sx={{
                                        width: '70px',
                                        '& .MuiOutlinedInput-root': {
                                          bgcolor:
                                            fieldFilled ? '#e8f5e9' : '#ffebee',
                                          border: fieldFilled
                                            ? '2px solid #4caf50'
                                            : '2px solid #f44336',
                                          fontSize: '0.7rem',
                                          pr: fieldFilled ? 3 : 1,
                                        },
                                      }}
                                    />
                                    {fieldFilled ? (
                                      <CheckCircle
                                        sx={{
                                          position: 'absolute',
                                          right: 4,
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          fontSize: 16,
                                          color: '#4caf50',
                                        }}
                                      />
                                    ) : null}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    multiline
                                    rows={1}
                                    value={fieldState.comment ?? ''}
                                    onChange={(e) => {
                                      setCorrections((prev) => ({
                                        ...prev,
                                        [fieldCorrectionKey]: {
                                          ...prev[fieldCorrectionKey],
                                          comment: e.target.value,
                                        },
                                      }));
                                    }}
                                    onBlur={() =>
                                      saveCorrection(
                                        taskId,
                                        fieldState.points,
                                        fieldState.comment,
                                        submission.id,
                                      )
                                    }
                                    size="small"
                                    fullWidth
                                    placeholder="..."
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        bgcolor: '#fff',
                                        fontSize: '0.7rem',
                                      },
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog
        open={answerKeyOpen}
        onClose={() => !answerKeySaving && setAnswerKeyOpen(false)}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        sx={{ zIndex: (t) => t.zIndex.modal + 24 }}
      >
        <DialogTitle>Musterlösung bearbeiten</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Änderungen werden in der Prüfungs-HTML gespeichert und alle Abgaben neu bewertet. Punkte
            gelten je Teilaufgabe (jedes Antwortfeld).
          </Typography>
          {Object.keys(answerKeyFieldsByTask)
            .sort((a, b) => Number(a) - Number(b))
            .map((taskNum) => {
              const fieldIds = answerKeyFieldsByTask[taskNum];
              return (
                <Box
                  key={taskNum}
                  sx={{
                    border: '1px solid #e3e3e3',
                    borderRadius: 1.5,
                    p: 1.5,
                    bgcolor: '#fafafa',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Aufgabe {taskNum}
                    <Typography component="span" variant="caption" sx={{ ml: 1, color: '#666' }}>
                      Summe {fieldIds.reduce((s, id) => s + (Number(fieldPointsDraft[id]) || 0), 0)} Punkte
                    </Typography>
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {fieldIds.map((taskId) => (
                      <Box key={taskId} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          label={formatTaskId(taskId)}
                          size="small"
                          value={answerKeyDraft[taskId] ?? ''}
                          onChange={(e) =>
                            setAnswerKeyDraft((prev) => ({ ...prev, [taskId]: e.target.value }))
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Punkte"
                          type="number"
                          size="small"
                          value={fieldPointsDraft[taskId] ?? 1}
                          onChange={(e) => {
                            const n = Math.max(0, Number(e.target.value) || 0);
                            setFieldPointsDraft((prev) => ({ ...prev, [taskId]: n }));
                          }}
                          inputProps={{ min: 0, step: 1 }}
                          sx={{ width: 100 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerKeyOpen(false)} disabled={answerKeySaving}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void saveAnswerKey()} disabled={answerKeySaving}>
            {answerKeySaving ? 'Speichern…' : 'Speichern & neu bewerten'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewHtml)}
        onClose={() => setPreviewHtml(null)}
        fullScreen
        disableEnforceFocus
        sx={{ zIndex: (t) => t.zIndex.modal + 24 }}
        PaperProps={{
          sx: {
            bgcolor: '#f3f3f3',
            display: 'flex',
            flexDirection: 'column',
            m: 0,
            borderRadius: 0,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            py: 0.35,
            pl: 1.5,
            pr: 0.5,
            minHeight: 40,
            bgcolor: '#fff',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
            Vorschau: {previewTitle}
          </Typography>
          <IconButton
            type="button"
            aria-label="Schließen"
            onClick={() => setPreviewHtml(null)}
            size="small"
            sx={{ width: 28, height: 28, flexShrink: 0 }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {previewHtml ? (
            <iframe
              title={previewTitle}
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetStudentOpen}
        onClose={() => !resetStudentBusy && setResetStudentOpen(false)}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
        sx={{ zIndex: (t) => t.zIndex.modal + 24 }}
      >
        <DialogTitle>Schüler zurücksetzen?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Die Abgabe von <strong>{submissionStudentName(selectedSubmission)}</strong> wird gelöscht.
            Korrektur und Punkte dieser Person fallen weg. Nach einem Neuladen der Prüfung kann sie
            erneut bearbeitet werden, solange die Zeit noch läuft.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetStudentOpen(false)} disabled={resetStudentBusy}>
            Abbrechen
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={resetStudentBusy || !selectedSubmission}
            onClick={() => void resetSelectedStudent()}
          >
            {resetStudentBusy ? 'Lösche…' : 'Ja, zurücksetzen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={versionDialogOpen}
        onClose={() => setVersionDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
        sx={{ zIndex: (t) => t.zIndex.modal + 24 }}
      >
        <DialogTitle>Prüfungsversion ändern</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Wenn sich ein Schüler vertippt hat: richtigen Buchstaben eintragen. Masterpasswort erforderlich.
          </Typography>
          <TextField
            fullWidth
            label="Buchstabe"
            value={versionDraft}
            onChange={(e) => setVersionDraft(e.target.value)}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 2 }}
          />
          <TextField
            fullWidth
            type="password"
            label="Masterpasswort"
            value={versionPassword}
            onChange={(e) => setVersionPassword(e.target.value)}
            error={Boolean(versionChangeError)}
            helperText={versionChangeError || ' '}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialogOpen(false)} disabled={versionChangeBusy}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={() => void saveSubmissionVersion()} disabled={versionChangeBusy}>
            {versionChangeBusy ? 'Speichern…' : 'Version speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      </Box>

      <ExamFullResetConfirmDialog
        open={fullResetOpen}
        onClose={() => setFullResetOpen(false)}
        onConfirm={handleFullResetConfirm}
        busy={resetting}
        examLabel={kaFilePath.split('/').pop() || kaFilePath}
      />

      <MakeupExamStartDialog
        open={makeupDialogOpen}
        onClose={() => setMakeupDialogOpen(false)}
        groupId={activeGroupId}
        groupName={examGroups.find((g) => g.id === activeGroupId)?.name || 'Lerngruppe'}
        kaFilePath={kaFilePath}
        sickStudents={sickStudentsInGroup}
        onStarted={() => {
          refreshGroupExamBeacon();
          void loadSubmissions();
        }}
      />

      {/* Dreierprobe Modal */}
      <DreierprobeModal
        open={showDreierprobe}
        onClose={() => {
          setShowDreierprobe(false);
          setDreierprobeEmailTab(false);
        }}
        initialEmailTab={dreierprobeEmailTab}
        kaFilePath={kaFilePath}
        submissions={submissions}
        examGroups={examGroups}
        groupId={activeGroupId || groupId}
        groupStudents={learningGroupStudents}
        maxTotalPoints={maxTotalPoints}
      />
    </Box>
  );
};

export default KACorrectionMode;

