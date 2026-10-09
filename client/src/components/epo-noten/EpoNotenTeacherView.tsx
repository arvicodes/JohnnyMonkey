import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  IconButton,
  List,
  ListItemButton,
  ListSubheader,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import { EpoJaFeatureButtons } from './EpoJaFeatureButtons';
import { EpoCourseGroupIconActions } from './EpoCourseGroupIconActions';
import {
  epoDisplayJaFlags,
  epoEntryJaFlags,
  epoGroupJaFlags,
  epoGroupNoteOnly,
  epoJaFlagsToEntryFields,
  epoStudentNoteOnlyFlow,
  epoJaFeatureGroupShellSx,
  type EpoJaFlags,
} from '../../lib/epoGroupJaFlags';
import { apiDelete, apiGetSafe, apiPost, apiPut } from '../../lib/api';
import {
  EPO_ROUND2_REMINDER,
  epoReminderDismissStorageKey,
  shouldShowEpoRound2Reminder,
} from '../../lib/epoNotenTeacherReminders';
import { isPassiveStudentId, parsePassiveStudentIds } from '../../lib/passiveStudents';
import {
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenRound,
  allCategoriesSelected,
  isEpoGroupCompleted,
  isEpoRoundCompleted,
  isEpoGroupPublished,
  assessmentModeForGroup,
  compareEpoStudentListOrder,
  epoGroupUsesMssPoints,
  rasterResultFromTotal,
  studentSelfAssessmentDisplay,
  type EpoNotenAssessmentMode,
  normalizeCategoryScores,
  shouldPrefillTeacherFromSelf,
  epoRoundedPoints,
  epoEffectiveVariantIdForGroup,
  epoGroupUsesRaster,
  epoTeacherUsesRaster,
  formatEpoPointsDisplay,
  emptyCategoryScores,
  teacherFormGradeFromEntry,
  teacherFormScoresFromEntry,
  studentEpoPendingKind,
  studentEpoPendingDetail,
} from '../../lib/epoNotenShared';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import DualStudentAvatars from '../DualStudentAvatars';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
import { EpoNotenTeacherStudentStatusChip } from './EpoNotenStudentStatusChip';
import { EPO_VARIANT2_ID } from '../../lib/epoNotenVariantPresets';
import {
  epoNotenCardSx,
  epoNotenCompactBtnSx,
  epoNotenToolbarOutlinedBtnSx,
  epoNotenCompactIconBtnSx,
  epoNotenCompactIconSx,
  epoNotenInsetBoxSx,
  epoNotenBigNumberSx,
  epoNotenPalette,
  epoNotenStudentGoalDisplaySx,
  epoNotenBitteAusfuellenRowSx,
  epoNotenFertigRowSx,
  epoNotenBitteAusfuellenAlertSx,
} from './epoNotenUi';

type GroupInfo = {
  id: string;
  name: string;
  studentCount: number;
  passiveStudentIds?: string[];
  students?: { id: string; name: string }[];
};

type RoundListItem = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  publishedAt: string | null;
  variantId?: string | null;
  groupMeta?: Record<string, { publishedAt?: string | null; completedAt?: string | null }>;
  stats: { submitted: number; graded: number; released: number; goals: number };
  activeGroups: { id: string; name: string }[];
};

type PriorEpoGradeItem = {
  roundTitle: string;
  roundDate: string;
  grade: string;
  assessmentMode: EpoNotenAssessmentMode;
};

function formatPriorEpoGradesNotes(items: PriorEpoGradeItem[]): string {
  return items
    .map((p) => (p.assessmentMode === 'mss' ? `${p.grade} P.` : p.grade))
    .join(' · ');
}

export function EpoNotenTeacherView() {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [round, setRound] = useState<EpoNotenRound | null>(null);
  const [students, setStudents] = useState<EpoNotenEntry[]>([]);
  const [priorEpoGrades, setPriorEpoGrades] = useState<Record<string, PriorEpoGradeItem[]>>({});
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentGroupId, setSelectedStudentGroupId] = useState('');
  const [teacherScores, setTeacherScores] = useState<number[]>(normalizeCategoryScores([]));
  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherJustification, setTeacherJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('EPO 1');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newGroupIds, setNewGroupIds] = useState<string[]>([]);
  const [publishOnCreate, setPublishOnCreate] = useState(true);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  /** null = ganze Runde, sonst nur diese Lerngruppe */
  const [resetGroupId, setResetGroupId] = useState<string | null>(null);
  const [deleteRoundConfirmOpen, setDeleteRoundConfirmOpen] = useState(false);
  const [deleteRoundConfirmText, setDeleteRoundConfirmText] = useState('');
  const DELETE_ROUND_CONFIRM_PHRASE = 'LÖSCHEN';
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  /** null = alle Gruppen in der SuS-Liste, sonst nur diese Lerngruppe */
  const [studentListGroupFilter, setStudentListGroupFilter] = useState<string | null>(null);

  const [passiveSaving, setPassiveSaving] = useState(false);
  const [groupUsesRaster, setGroupUsesRaster] = useState(true);
  const [teacherCategories, setTeacherCategories] = useState<string[]>(EPO_NOTEN_TEACHER_CATEGORIES);
  const [categoryTitles, setCategoryTitles] = useState<string[]>([]);
  const [categoryWeightsPercent, setCategoryWeightsPercent] = useState<number[] | undefined>();
  const [courseToAdd, setCourseToAdd] = useState('');
  const [expandedRoundIds, setExpandedRoundIds] = useState<Record<string, boolean>>({});
  const [epoRound2ReminderDismissed, setEpoRound2ReminderDismissed] = useState(() => {
    try {
      return localStorage.getItem(epoReminderDismissStorageKey(EPO_ROUND2_REMINDER.id)) === '1';
    } catch {
      return false;
    }
  });

  const showEpoRound2Reminder = useMemo(
    () => shouldShowEpoRound2Reminder(rounds, epoRound2ReminderDismissed),
    [rounds, epoRound2ReminderDismissed],
  );

  const dismissEpoRound2Reminder = () => {
    setEpoRound2ReminderDismissed(true);
    try {
      localStorage.setItem(epoReminderDismissStorageKey(EPO_ROUND2_REMINDER.id), '1');
    } catch {
      /* ignore */
    }
  };

  const loadList = useCallback(async () => {
    const res = await apiGetSafe('/api/epo-noten/list');
    if (!res?.ok) throw new Error('Liste konnte nicht geladen werden');
    const data = await res.json();
    setRounds(Array.isArray(data.rounds) ? data.rounds : []);
    setGroups(Array.isArray(data.groups) ? data.groups : []);
  }, []);

  const loadDetail = useCallback(async (id: string, groupId?: string | null) => {
    if (!id) {
      setRound(null);
      setStudents([]);
      return;
    }
    const q = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    const res = await apiGetSafe(`/api/epo-noten/${id}${q}`);
    if (!res?.ok) throw new Error('Runde konnte nicht geladen werden');
    const data = await res.json();
    setRound(data.round as EpoNotenRound);
    setStudents(Array.isArray(data.students) ? data.students : []);
    const loadedRound = data.round as EpoNotenRound;
    const rasterGroupId = groupId?.trim() || undefined;
    setGroupUsesRaster(
      rasterGroupId && loadedRound
        ? epoTeacherUsesRaster(loadedRound, rasterGroupId)
        : data.useRaster !== false,
    );
    if (data.useRaster !== false && Array.isArray(data.teacherCategories) && data.teacherCategories.length > 0) {
      setTeacherCategories(data.teacherCategories as string[]);
    } else {
      setTeacherCategories(EPO_NOTEN_TEACHER_CATEGORIES);
    }
    setCategoryTitles(Array.isArray(data.categoryTitles) ? (data.categoryTitles as string[]) : []);
    setCategoryWeightsPercent(
      Array.isArray(data.categoryWeightsPercent) ? (data.categoryWeightsPercent as number[]) : undefined,
    );
    const prior = data.priorEpoGrades;
    setPriorEpoGrades(
      prior && typeof prior === 'object' && !Array.isArray(prior)
        ? (prior as Record<string, PriorEpoGradeItem[]>)
        : {},
    );
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
      loadDetail(selectedId, studentListGroupFilter).catch(() => setError('Detail konnte nicht geladen werden'));
    }
  }, [selectedId, studentListGroupFilter, loadDetail]);

  useEffect(() => {
    if (!round) {
      setStudentListGroupFilter(null);
      return;
    }
    if (round.groupIds.length === 0) {
      setStudentListGroupFilter(null);
      return;
    }
    setStudentListGroupFilter((prev) => {
      if (prev && round.groupIds.includes(prev)) return prev;
      return round.groupIds[0] ?? null;
    });
    setCourseToAdd('');
  }, [round?.id, round?.groupIds.join('|')]);

  const findStudentRow = useCallback(
    (studentId: string, groupId?: string | null) => {
      if (!studentId) return null;
      const gid = groupId || selectedStudentGroupId || studentListGroupFilter;
      if (gid) {
        return students.find((s) => s.studentId === studentId && s.groupId === gid) ?? null;
      }
      return students.find((s) => s.studentId === studentId) ?? null;
    },
    [students, selectedStudentGroupId, studentListGroupFilter],
  );

  const selectedStudent = findStudentRow(selectedStudentId, selectedStudentGroupId);

  const selectedPriorEpoNotes = useMemo(() => {
    if (!selectedStudent?.groupId || !selectedStudentId) return '';
    const items = priorEpoGrades[`${selectedStudentId}:${selectedStudent.groupId}`];
    if (!items?.length) return '';
    return formatPriorEpoGradesNotes(items);
  }, [priorEpoGrades, selectedStudent?.groupId, selectedStudentId]);

  const groupMode = useCallback(
    (groupId: string): EpoNotenAssessmentMode => {
      const name = groups.find((g) => g.id === groupId)?.name;
      return assessmentModeForGroup(round, groupId, name);
    },
    [groups, round],
  );

  const isStudentGroupLive = useCallback(
    (entry: EpoNotenEntry) => {
      if (!round) return false;
      const gid = entry.groupId;
      if (!gid) return Boolean(round.publishedAt);
      return isEpoGroupPublished(round, gid);
    },
    [round],
  );

  const passiveIdsForGroup = useCallback(
    (groupId: string) => parsePassiveStudentIds(groups.find((g) => g.id === groupId)?.passiveStudentIds),
    [groups],
  );

  const allPassiveStudentIds = useMemo(() => {
    const s = new Set<string>();
    for (const gid of round?.groupIds ?? []) {
      for (const id of passiveIdsForGroup(gid)) s.add(id);
    }
    return s;
  }, [passiveIdsForGroup, round?.groupIds]);

  const groupJaFlagsFor = useCallback(
    (groupId: string | undefined): EpoJaFlags => {
      if (!round || !groupId) return { self: true, raster: true, goals: true };
      return epoGroupJaFlags(round, groupId);
    },
    [round],
  );

  const usesRasterForEntry = useCallback(
    (e: EpoNotenEntry) => {
      if (!round || !e.groupId) return groupUsesRaster;
      const g = groupJaFlagsFor(e.groupId);
      if (epoStudentNoteOnlyFlow(e, g)) return false;
      return epoTeacherUsesRaster(round, e.groupId);
    },
    [groupJaFlagsFor, groupUsesRaster, round],
  );

  const sortStudentsForGroup = useCallback(
    (list: EpoNotenEntry[]) =>
      [...list].sort((a, b) =>
        compareEpoStudentListOrder(
          a,
          b,
          Boolean(round?.publishedAt),
          allPassiveStudentIds,
          (e) => isStudentGroupLive(e),
          usesRasterForEntry,
        ),
      ),
    [allPassiveStudentIds, isStudentGroupLive, round?.publishedAt, usesRasterForEntry],
  );

  const updatePassiveStudentsForGroup = async (groupId: string, studentIds: string[]) => {
    setPassiveSaving(true);
    setError(null);
    try {
      const res = await apiPut(`/api/learning-groups/${groupId}/passive-students`, {
        studentIds,
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Speichern fehlgeschlagen');
      }
      const updated = await res.json();
      const nextIds = parsePassiveStudentIds(updated.passiveStudentIds);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, passiveStudentIds: nextIds } : g)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setPassiveSaving(false);
    }
  };

  const toggleSelectedStudentPassive = async () => {
    if (!selectedStudent?.groupId) return;
    const gid = selectedStudent.groupId;
    const current = passiveIdsForGroup(gid);
    const isPassive = isPassiveStudentId(selectedStudent.studentId, current);
    const next = isPassive
      ? current.filter((id) => id !== selectedStudent.studentId)
      : [...current, selectedStudent.studentId];
    await updatePassiveStudentsForGroup(gid, next);
  };

  const selectStudentListGroup = (gid: string) => {
    setStudentListGroupFilter(gid);
  };

  const addCourseById = async (gid: string) => {
    if (!round || !gid || round.groupIds.includes(gid)) return;
    await updateRoundGroups([...round.groupIds, gid]);
    selectStudentListGroup(gid);
    setCourseToAdd('');
  };

  useEffect(() => {
    if (!studentListGroupFilter || !selectedStudentId) return;
    const row = students.find(
      (s) => s.studentId === selectedStudentId && s.groupId === studentListGroupFilter,
    );
    if (row) {
      if (selectedStudentGroupId !== studentListGroupFilter) {
        setSelectedStudentGroupId(studentListGroupFilter);
      }
      return;
    }
    setSelectedStudentId('');
    setSelectedStudentGroupId('');
  }, [studentListGroupFilter, selectedStudentId, selectedStudentGroupId, students]);

  const skipRasterGradeSyncRef = useRef(false);
  const teacherScoresDirtyRef = useRef(false);
  const prevSelectionKeyRef = useRef('');
  const teacherScoresRef = useRef(teacherScores);
  teacherScoresRef.current = teacherScores;
  const teacherGradeRef = useRef(teacherGrade);
  teacherGradeRef.current = teacherGrade;
  const teacherJustificationRef = useRef(teacherJustification);
  teacherJustificationRef.current = teacherJustification;
  const teacherSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!selectedStudentId) {
      if (prevSelectionKeyRef.current !== '') {
        prevSelectionKeyRef.current = '';
        teacherScoresDirtyRef.current = false;
      }
      teacherScoresRef.current = normalizeCategoryScores([]);
      setTeacherScores(normalizeCategoryScores([]));
      teacherGradeRef.current = '';
      setTeacherGrade('');
      teacherJustificationRef.current = '';
      setTeacherJustification('');
      return;
    }

    const entry = findStudentRow(selectedStudentId, selectedStudentGroupId);
    const selectionKey = `${entry?.groupId ?? selectedStudentGroupId}:${selectedStudentId}`;

    if (selectionKey !== prevSelectionKeyRef.current) {
      prevSelectionKeyRef.current = selectionKey;
      teacherScoresDirtyRef.current = false;
      const mode = entry?.groupId ? groupMode(entry.groupId) : 'note';
      const usesRaster = entry ? usesRasterForEntry(entry) : groupUsesRaster;
      const scores = teacherFormScoresFromEntry(entry ?? undefined, usesRaster);
      teacherScoresRef.current = scores;
      setTeacherScores(scores);
      const grade = teacherFormGradeFromEntry(entry ?? undefined, mode, categoryWeightsPercent, usesRaster);
      teacherGradeRef.current = grade;
      setTeacherGrade(grade);
      const just = entry?.teacherJustification?.trim() ?? '';
      teacherJustificationRef.current = just;
      setTeacherJustification(just);
      skipRasterGradeSyncRef.current = true;
      return;
    }

    if (teacherScoresDirtyRef.current || !entry) return;
    if (skipServerScoreSyncRef.current) {
      skipServerScoreSyncRef.current = false;
      return;
    }
    const mode = entry.groupId ? groupMode(entry.groupId) : 'note';
    const usesRaster = usesRasterForEntry(entry);
    const server = teacherFormScoresFromEntry(entry, usesRaster);
    const local = teacherScoresRef.current;
    if (local.every((s) => s < 0) && server.some((s) => s >= 0)) {
      teacherScoresRef.current = server;
      setTeacherScores(server);
      const grade = teacherFormGradeFromEntry(entry, mode, categoryWeightsPercent, usesRaster);
      teacherGradeRef.current = grade;
      setTeacherGrade(grade);
      skipRasterGradeSyncRef.current = true;
    }
  }, [categoryWeightsPercent, findStudentRow, groupUsesRaster, selectedStudentGroupId, selectedStudentId, students, round, usesRasterForEntry]);

  const totalTeacher = epoRoundedPoints(teacherScores, categoryWeightsPercent);
  const selectedAssessmentMode: EpoNotenAssessmentMode =
    selectedStudent?.groupId ? groupMode(selectedStudent.groupId) : 'note';
  const computedRasterResult = rasterResultFromTotal(selectedAssessmentMode, totalTeacher);

  const skipServerScoreSyncRef = useRef(false);

  const persistTeacherEntry = useCallback(
    async (grade: string, scoresSnapshot: number[], options?: { revokeRelease?: boolean }) => {
      if (!round || !selectedStudentId) {
        throw new Error('Kein Schüler ausgewählt');
      }
      const scores = normalizeCategoryScores(scoresSnapshot);
      const row = findStudentRow(selectedStudentId, selectedStudentGroupId);
      const mode = row?.groupId ? groupMode(row.groupId) : selectedAssessmentMode;
      const groupFlags = row?.groupId ? groupJaFlagsFor(row.groupId) : null;
      const noteOnly = row && groupFlags ? epoStudentNoteOnlyFlow(row, groupFlags) : false;
      const usesRaster = row ? usesRasterForEntry(row) : false;
      const resolvedGrade = noteOnly || !usesRaster
        ? grade.trim()
        : grade.trim() ||
          (allCategoriesSelected(scores)
            ? rasterResultFromTotal(mode, epoRoundedPoints(scores, categoryWeightsPercent))
            : '');
      const syncGroupFields =
        groupFlags && epoGroupNoteOnly(groupFlags) ? epoJaFlagsToEntryFields(groupFlags) : {};
      const res = await apiPut(`/api/epo-noten/${round.id}/teacher/${selectedStudentId}`, {
        groupId: row?.groupId,
        teacherScores: noteOnly ? emptyCategoryScores() : scores,
        teacherGrade: resolvedGrade,
        teacherJustification: teacherJustificationRef.current,
        ...syncGroupFields,
        ...(options?.revokeRelease ? { revokeRelease: true } : {}),
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Speichern fehlgeschlagen');
      }
      const data = await res.json();
      const entry = data.entry as EpoNotenEntry | undefined;
      if (entry?.studentId) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === entry.studentId && s.groupId === row?.groupId
              ? { ...s, ...entry, groupId: (s as { groupId?: string }).groupId }
              : s,
          ),
        );
        if (entry.studentId === selectedStudentId && row?.groupId === selectedStudentGroupId) {
          const savedScores = normalizeCategoryScores(entry.teacherScores ?? scores);
          teacherScoresRef.current = savedScores;
          skipRasterGradeSyncRef.current = true;
          setTeacherScores(savedScores);
          const g = entry.teacherGrade || resolvedGrade;
          teacherGradeRef.current = g;
          setTeacherGrade(g);
        }
      }
      return entry;
    },
    [categoryWeightsPercent, findStudentRow, groupJaFlagsFor, groupMode, round, selectedStudentGroupId, selectedStudentId, usesRasterForEntry],
  );

  const saveTeacherDraftNow = useCallback((): Promise<void> => {
    if (!teacherScoresDirtyRef.current || !round || !selectedStudentId) {
      return teacherSaveChainRef.current;
    }
    setDraftStatus('saving');
    teacherSaveChainRef.current = teacherSaveChainRef.current
      .then(async () => {
        while (teacherScoresDirtyRef.current) {
          if (!round || !selectedStudentId) break;
          const scoresSnapshot = [...teacherScoresRef.current];
          const gradeSnapshot = teacherGradeRef.current;
          teacherScoresDirtyRef.current = false;
          await persistTeacherEntry(gradeSnapshot, scoresSnapshot);
          setDraftStatus('saved');
          await loadList();
        }
      })
      .catch((e) => {
        teacherScoresDirtyRef.current = true;
        setDraftStatus('error');
        setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
        throw e;
      });

    return teacherSaveChainRef.current;
  }, [loadList, persistTeacherEntry, round, selectedStudentId, students]);

  const clearTeacherAssessment = useCallback(async () => {
    const row = findStudentRow(selectedStudentId, selectedStudentGroupId);
    if (!round || !selectedStudentId || !row?.groupId) return;
    const empty = emptyCategoryScores();
    teacherScoresRef.current = empty;
    setTeacherScores(empty);
    teacherGradeRef.current = '';
    setTeacherGrade('');
    teacherScoresDirtyRef.current = true;
    skipRasterGradeSyncRef.current = true;
    skipServerScoreSyncRef.current = true;
    setDraftStatus('saving');
    setError(null);
    try {
      await persistTeacherEntry('', empty, { revokeRelease: true });
      teacherScoresDirtyRef.current = false;
      setDraftStatus('saved');
      await loadList();
      if (round.id) await loadDetail(round.id, row.groupId);
    } catch (e) {
      teacherScoresDirtyRef.current = true;
      setDraftStatus('error');
      setError(e instanceof Error ? e.message : 'Leeren fehlgeschlagen');
    }
  }, [findStudentRow, loadDetail, loadList, persistTeacherEntry, round, selectedStudentId]);

  const prefillFromSelfKeyRef = useRef('');

  useEffect(() => {
    if (!round || !selectedStudentId) return;
    const entry = findStudentRow(selectedStudentId, selectedStudentGroupId);
    if (!entry || entry.teacherReleasedAt || entry.teacherGradeOnly) return;
    if (!usesRasterForEntry(entry)) return;
    if (!shouldPrefillTeacherFromSelf(entry)) {
      prefillFromSelfKeyRef.current = '';
      return;
    }
    const key = `${selectedStudentId}:${entry.studentSubmittedAt ?? ''}`;
    if (prefillFromSelfKeyRef.current === key) return;
    prefillFromSelfKeyRef.current = key;
    teacherScoresDirtyRef.current = true;
    void saveTeacherDraftNow().catch(() => undefined);
  }, [findStudentRow, round, saveTeacherDraftNow, selectedStudentId, students, usesRasterForEntry]);

  useEffect(() => {
    if (!selectedStudent || selectedStudent.teacherGradeOnly) return;
    if (!selectedStudent.groupId || !round || !usesRasterForEntry(selectedStudent)) return;
    if (skipRasterGradeSyncRef.current) {
      skipRasterGradeSyncRef.current = false;
      return;
    }
    if (allCategoriesSelected(teacherScores)) {
      teacherGradeRef.current = computedRasterResult;
      setTeacherGrade(computedRasterResult);
      if (teacherScoresDirtyRef.current) {
        void saveTeacherDraftNow();
      }
    }
  }, [computedRasterResult, round, saveTeacherDraftNow, selectedStudent, teacherScores, usesRasterForEntry]);

  const selectStudent = async (studentId: string, groupId: string) => {
    if (studentId === selectedStudentId && groupId === selectedStudentGroupId) return;
    setError(null);
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      setSelectedStudentId(studentId);
      setSelectedStudentGroupId(groupId);
      setDraftStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern vor Schülerwechsel fehlgeschlagen');
    }
  };

  const selectRound = async (roundId: string) => {
    if (roundId === selectedId) return;
    setError(null);
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      setSelectedStudentId('');
      setSelectedStudentGroupId('');
      setSelectedId(roundId);
      setExpandedRoundIds((prev) => ({ ...prev, [roundId]: true }));
      setDraftStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern vor Rundenwechsel fehlgeschlagen');
    }
  };

  const applyStudentEpoFeatures = async (flags: EpoJaFlags) => {
    if (!round || !selectedStudent?.groupId) return;
    setSaving(true);
    setError(null);
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      const fields = epoJaFlagsToEntryFields(flags);
      const res = await apiPut(`/api/epo-noten/${round.id}/teacher/${selectedStudent.studentId}`, {
        groupId: selectedStudent.groupId,
        teacherScores: teacherScoresRef.current,
        teacherGrade: teacherGradeRef.current,
        teacherJustification: teacherJustificationRef.current,
        ...fields,
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Speichern fehlgeschlagen');
      }
      const data = await res.json();
      const entry = data.entry as EpoNotenEntry | undefined;
      if (entry?.studentId) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === entry.studentId && s.groupId === selectedStudent.groupId
              ? { ...s, ...entry, groupId: s.groupId }
              : s,
          ),
        );
      }
      await loadDetail(round.id, studentListGroupFilter ?? selectedStudent.groupId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const handleTeacherJustificationChange = (value: string) => {
    teacherJustificationRef.current = value;
    setTeacherJustification(value);
    teacherScoresDirtyRef.current = true;
    setDraftStatus('saving');
    void saveTeacherDraftNow().catch(() => undefined);
  };

  const handleTeacherGradeManualChange = (value: string) => {
    teacherGradeRef.current = value;
    setTeacherGrade(value);
    teacherScoresDirtyRef.current = true;
    setDraftStatus('saving');
    void saveTeacherDraftNow().catch(() => undefined);
  };

  const handleTeacherScoresChange = (scores: number[]) => {
    teacherScoresDirtyRef.current = true;
    teacherScoresRef.current = scores;
    setDraftStatus('saving');
    setTeacherScores(scores);
    void saveTeacherDraftNow().catch(() => undefined);
  };

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

  const setGroupCompleted = async (groupId: string, completed: boolean) => {
    if (!round) return;
    setSaving(true);
    try {
      const res = await apiPut(`/api/epo-noten/${round.id}/group-meta`, { groupId, completed });
      if (!res?.ok) throw new Error('Status konnte nicht gespeichert werden');
      const data = await res.json();
      if (data.round) setRound(data.round as EpoNotenRound);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const updateGroupEpoFeatures = async (groupId: string, flags: EpoJaFlags) => {
    if (!round || !groupId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiPut(`/api/epo-noten/${round.id}/group-meta`, {
        groupId,
        epoFeatures: { self: flags.self, raster: flags.raster, goals: flags.goals },
      });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Einstellung konnte nicht gespeichert werden');
      }
      const data = await res.json();
      if (data.round) setRound(data.round as EpoNotenRound);
      await loadDetail(round.id, groupId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Einstellung konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const updateGroupVariant = async (groupId: string, variantId: string) => {
    if (!round || !groupId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiPut(`/api/epo-noten/${round.id}/group-meta`, { groupId, variantId });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Variante konnte nicht gespeichert werden');
      }
      const data = await res.json();
      if (data.round) setRound(data.round as EpoNotenRound);
      await loadDetail(round.id, groupId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Variante konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const setGroupActive = async (groupId: string, active: boolean) => {
    if (!round) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiPut(`/api/epo-noten/${round.id}/group-meta`, { groupId, active });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Status konnte nicht gespeichert werden');
      }
      const data = await res.json();
      if (data.round) setRound(data.round as EpoNotenRound);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const updateRoundGroups = async (groupIds: string[]) => {
    if (!round) return;
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
    } catch {
      return;
    }
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

  const requestReset = (groupId: string | null) => {
    if (!round) return;
    setResetGroupId(groupId);
    setResetConfirmOpen(true);
  };

  const resetGroupName =
    resetGroupId ? groups.find((g) => g.id === resetGroupId)?.name || resetGroupId : '';

  const transferGradesToSchema = async (groupId: string) => {
    if (!round || !groupId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/integrate-grading-schema`, {
        groupId,
      });
      const data = await res.json().catch(() => ({}));
      if (!res?.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Übertragen fehlgeschlagen');
      }
      const count = typeof data.count === 'number' ? data.count : 0;
      const cat = typeof data.categoryName === 'string' ? data.categoryName : round.title;
      window.alert(`${count} Noten ins Notenschema übernommen (Kategorie „${cat}“).`);
      await loadDetail(round.id, studentListGroupFilter ?? groupId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = async () => {
    if (!round) return;
    setResetConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      const body = resetGroupId ? { groupId: resetGroupId } : {};
      const res = await apiPost(`/api/epo-noten/${round.id}/reset-all`, body);
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Zurücksetzen fehlgeschlagen');
      }
      if (
        resetGroupId &&
        selectedStudent?.groupId &&
        selectedStudent.groupId === resetGroupId
      ) {
        setSelectedStudentId('');
        setSelectedStudentGroupId('');
      }
      if (!resetGroupId) {
        setSelectedStudentId('');
        setSelectedStudentGroupId('');
      }
      setResetGroupId(null);
      await loadDetail(round.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteRoundConfirm = () => {
    setDeleteRoundConfirmText('');
    setDeleteRoundConfirmOpen(true);
  };

  const removeRound = async () => {
    if (!round || deleteRoundConfirmText.trim() !== DELETE_ROUND_CONFIRM_PHRASE) return;
    setDeleteRoundConfirmOpen(false);
    setDeleteRoundConfirmText('');
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/epo-noten/${round.id}/unpublish`, {});
      const res = await apiDelete(`/api/epo-noten/${round.id}`);
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Löschen fehlgeschlagen');
      }
      setSelectedId('');
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen');
    } finally {
      setSaving(false);
    }
  };

  const studentsForList = useMemo(() => {
    if (!round || round.groupIds.length !== 1) return students;
    const gid = round.groupIds[0];
    return students.map((s) => (s.groupId ? s : { ...s, groupId: gid }));
  }, [round, students]);

  const studentSections = useMemo(() => {
    if (!round) return [];
    const sections: { groupId: string; groupName: string; students: EpoNotenEntry[] }[] = [];
    for (const gid of round.groupIds) {
      const inGroup = sortStudentsForGroup(studentsForList.filter((s) => s.groupId === gid));
      sections.push({
        groupId: gid,
        groupName: groups.find((g) => g.id === gid)?.name || gid,
        students: inGroup,
      });
    }
    const orphans = sortStudentsForGroup(
      studentsForList.filter((s) => !s.groupId || !round.groupIds.includes(s.groupId)),
    );
    if (orphans.length > 0) {
      sections.push({ groupId: '__other__', groupName: 'Weitere', students: orphans });
    }
    return sections;
  }, [groups, round, studentsForList, sortStudentsForGroup]);

  const visibleStudentSections = useMemo(() => {
    if (!studentListGroupFilter) return studentSections;
    const match = studentSections.find((s) => s.groupId === studentListGroupFilter);
    if (match) return [match];
    const groupName =
      groups.find((g) => g.id === studentListGroupFilter)?.name || studentListGroupFilter;
    return [
      {
        groupId: studentListGroupFilter,
        groupName,
        students: sortStudentsForGroup(
          studentsForList.filter((s) => s.groupId === studentListGroupFilter),
        ),
      },
    ];
  }, [groups, studentListGroupFilter, studentSections, studentsForList, sortStudentsForGroup]);

  const activeCourseGroupId =
    studentListGroupFilter && round?.groupIds.includes(studentListGroupFilter)
      ? studentListGroupFilter
      : round?.groupIds[0] ?? null;

  const activeCourseName = activeCourseGroupId
    ? groups.find((g) => g.id === activeCourseGroupId)?.name ?? ''
    : '';

  const gradedCountInGroup = useCallback(
    (groupId: string) => {
      if (!round || groupId === '__other__') return 0;
      const mode = groupMode(groupId);
      const passive = passiveIdsForGroup(groupId);
      return students.filter((s) => {
        if (s.groupId !== groupId) return false;
        if (isPassiveStudentId(s.studentId, passive)) return false;
        return Boolean(
          teacherFormGradeFromEntry(s, mode, categoryWeightsPercent, usesRasterForEntry(s)).trim(),
        );
      }).length;
    },
    [categoryWeightsPercent, groupMode, passiveIdsForGroup, round, students, usesRasterForEntry],
  );

  const releaseAllInGroup = async (groupId: string) => {
    if (!round || groupId === '__other__') return;
    const groupName = groups.find((g) => g.id === groupId)?.name ?? 'Lerngruppe';
    const n = gradedCountInGroup(groupId);
    if (n === 0) {
      const noteOnly = epoGroupNoteOnly(groupJaFlagsFor(groupId));
      setError(
        noteOnly
          ? `In „${groupName}“ fehlt noch mindestens eine Note — bitte eintragen und speichern.`
          : `In „${groupName}“ gibt es keine fertigen Bewertungen, die noch nicht freigegeben sind (Raster vollständig ausfüllen).`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      teacherScoresDirtyRef.current = true;
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      const res = await apiPost(`/api/epo-noten/${round.id}/release`, { groupId });
      if (!res?.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Freigabe fehlgeschlagen');
      }
      const data = await res.json().catch(() => ({}));
      const released = typeof data.releasedCount === 'number' ? data.releasedCount : n;
      if (released === 0) {
        setError('Es wurde niemand freigegeben — bitte Bewertungen speichern und Raster prüfen.');
      }
      await loadDetail(round.id);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const groupCourseStats = useCallback(
    (gid: string) => {
      const rows = students.filter((s) => s.groupId === gid);
      const total = rows.length;
      const submitted = rows.filter((s) => s.studentSubmittedAt).length;
      const released = rows.filter((s) => s.teacherReleasedAt).length;
      return { total, submitted, released };
    },
    [students],
  );

  if (loading && rounds.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack
      spacing={0.4}
      sx={{
        width: '100%',
        minWidth: 0,
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {showEpoRound2Reminder ? (
        <Alert
          severity="warning"
          onClose={dismissEpoRound2Reminder}
          sx={{ py: 0.35, fontSize: '0.78rem', flexShrink: 0, alignItems: 'center' }}
        >
          <strong>{EPO_ROUND2_REMINDER.title}</strong> — {EPO_ROUND2_REMINDER.body}
        </Alert>
      ) : null}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0, fontSize: '0.72rem', flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(270px, 342px) minmax(0, 1fr)' },
          gridTemplateRows: '1fr',
          gap: 0.5,
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          flex: 1,
          minHeight: 0,
          height: '100%',
        }}
      >
        <Card
          sx={{
            ...epoNotenCardSx,
            borderWidth: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: '100%',
            alignSelf: 'stretch',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 0.75,
              py: 0.4,
              borderBottom: `1px solid ${epoNotenPalette.border}`,
              bgcolor: '#fff',
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', color: epoNotenPalette.heading }}>
              Runden
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
          </Box>
          <List dense disablePadding sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {rounds.map((r) => {
              const active = r.id === selectedId;
              const roundForCourses = active && round ? round : null;
              const expanded = Boolean(expandedRoundIds[r.id]);
              const roundSnapshot = active && round ? round : r;
              const roundAllFertig = isEpoRoundCompleted(roundSnapshot);
              return (
                <Accordion
                  key={r.id}
                  expanded={expanded}
                  onChange={(_, exp) => {
                    setExpandedRoundIds((prev) => ({ ...prev, [r.id]: exp }));
                    if (exp && r.id !== selectedId) void selectRound(r.id);
                  }}
                  disableGutters
                  elevation={0}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: roundAllFertig ? epoNotenPalette.fertigBorder : 'divider',
                    bgcolor: roundAllFertig
                      ? active
                        ? epoNotenPalette.fertigBgSelected
                        : epoNotenPalette.fertigBg
                      : active
                        ? epoNotenPalette.primaryTint
                        : 'transparent',
                    '&:before': { display: 'none' },
                    ...(roundAllFertig
                      ? { borderLeft: `3px solid ${epoNotenPalette.fertigAccent}` }
                      : active
                        ? { borderLeft: `3px solid ${epoNotenPalette.primary}` }
                        : {}),
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      minHeight: 40,
                      py: 0,
                      px: 0.65,
                      '& .MuiAccordionSummary-content': { my: 0.35 },
                    }}
                  >
                    <Stack width="100%" spacing={0.15} minWidth={0}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.5} width="100%">
                        <Typography
                          noWrap
                          sx={{ fontWeight: 700, fontSize: '0.8rem', color: epoNotenPalette.textPrimary, flex: 1, minWidth: 0 }}
                        >
                          {r.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={roundAllFertig ? 'fertig' : r.publishedAt ? 'live' : 'Entwurf'}
                          color={roundAllFertig || r.publishedAt ? 'success' : 'default'}
                          sx={{
                            height: 16,
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            ...(roundAllFertig
                              ? { bgcolor: epoNotenPalette.fertigChipBg, color: '#fff' }
                              : {}),
                          }}
                        />
                      </Stack>
                      <Typography variant="caption" sx={{ color: epoNotenPalette.textSecondary, lineHeight: 1.2, fontSize: '0.62rem' }}>
                        {r.date} · {r.stats.submitted}/{r.stats.graded}/{r.stats.released} (abgegeben/bewertet/frei)
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, py: 0, display: active && roundForCourses ? 'block' : 'none' }}>
                    {active && roundForCourses && (
                    <Box
                      sx={{
                        pl: 2.25,
                        pr: 0.75,
                        pb: 0.75,
                        pt: 0.25,
                        bgcolor: roundAllFertig
                          ? 'rgba(46, 125, 50, 0.06)'
                          : 'rgba(25, 118, 210, 0.04)',
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={0.35} sx={{ mb: 0.5, width: '100%' }}>
                        {!roundForCourses.publishedAt ? (
                          <Tooltip title="Runde freischalten">
                            <IconButton
                              size="small"
                              onClick={() => void publish()}
                              disabled={saving}
                              sx={{
                                ...epoNotenCompactIconBtnSx,
                                bgcolor: epoNotenPalette.accent,
                                color: '#fff',
                              }}
                            >
                              <PublishIcon sx={epoNotenCompactIconSx} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Freischaltung beenden">
                            <IconButton size="small" onClick={() => void unpublish()} disabled={saving} sx={epoNotenCompactIconBtnSx}>
                              <UnpublishedIcon sx={epoNotenCompactIconSx} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Runde löschen">
                          <IconButton size="small" onClick={() => openDeleteRoundConfirm()} sx={{ ...epoNotenCompactIconBtnSx, color: '#c62828' }}>
                            <DeleteOutlineIcon sx={epoNotenCompactIconSx} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: epoNotenPalette.textSecondary, mb: 0.35, pl: 0.5 }}>
                        Kurse · aktiv / fertig / startet noch
                      </Typography>

                      <List dense disablePadding sx={{ pl: 0.5 }}>
                        {roundForCourses.groupIds.map((gid) => {
                          const g = groups.find((x) => x.id === gid);
                          const published = isEpoGroupPublished(roundForCourses, gid);
                          const completed = isEpoGroupCompleted(roundForCourses, gid);
                          const starting = !published && !completed;
                          const activeLive = published && !completed;
                          const st = groupCourseStats(gid);
                          const courseSelected = studentListGroupFilter === gid;
                          const rowBorder = completed
                            ? epoNotenPalette.fertigBorder
                            : activeLive
                              ? '#f9a825'
                              : courseSelected
                                ? 'primary.light'
                                : 'divider';
                          const rowBg = completed
                            ? epoNotenPalette.fertigBg
                            : activeLive
                              ? 'rgba(255, 193, 7, 0.22)'
                              : courseSelected
                                ? 'rgba(25, 118, 210, 0.1)'
                                : '#fff';
                          return (
                            <ListItemButton
                              key={gid}
                              selected={courseSelected}
                              onClick={() => selectStudentListGroup(gid)}
                              sx={{
                                py: 0.45,
                                px: 0.5,
                                mb: 0.35,
                                alignItems: 'center',
                                display: 'grid',
                                gridTemplateColumns: 'auto minmax(0, 1fr) minmax(0, 3.5rem)',
                                columnGap: 0.4,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: rowBorder,
                                bgcolor: rowBg,
                                '&.Mui-selected': {
                                  bgcolor: completed
                                    ? epoNotenPalette.fertigBgSelected
                                    : activeLive
                                      ? 'rgba(255, 193, 7, 0.28)'
                                      : 'rgba(25, 118, 210, 0.14)',
                                },
                              }}
                            >
                              <Box onClick={(e) => e.stopPropagation()}>
                                <EpoCourseGroupIconActions
                                  saving={saving}
                                  completed={completed}
                                  gradedCount={gradedCountInGroup(gid)}
                                  schemaIntegrated={Boolean(
                                    roundForCourses.groupMeta?.[gid]?.schemaIntegratedAt,
                                  )}
                                  onRelease={() => void releaseAllInGroup(gid)}
                                  onSchema={() => void transferGradesToSchema(gid)}
                                />
                              </Box>
                              <Box sx={{ minWidth: 0, pr: 0.25 }}>
                                <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.25 }} noWrap>
                                  {g?.name || gid}
                                </Typography>
                                <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', mt: 0.15 }}>
                                  {starting ? 'startet noch · ' : ''}
                                  {st.submitted}/{st.total} abgegeben
                                </Typography>
                              </Box>
                              <Stack
                                alignItems="flex-end"
                                spacing={0}
                                onClick={(e) => e.stopPropagation()}
                                sx={{ minWidth: 0, width: '100%', maxWidth: '3.5rem' }}
                              >
                                <Stack direction="row" alignItems="center" spacing={0.1} justifyContent="flex-end">
                                  <Checkbox
                                    size="small"
                                    checked={completed}
                                    disabled={saving}
                                    onChange={(_, checked) => void setGroupCompleted(gid, checked)}
                                    sx={{ p: 0, color: completed ? epoNotenPalette.fertigAccent : undefined }}
                                    inputProps={{ 'aria-label': `${g?.name || gid} fertig` }}
                                  />
                                  <Typography
                                    sx={{
                                      fontSize: '0.58rem',
                                      fontWeight: 700,
                                      minWidth: 25,
                                      color: completed ? epoNotenPalette.fertigAccent : 'text.primary',
                                    }}
                                  >
                                    fertig
                                  </Typography>
                                </Stack>
                              </Stack>
                            </ListItemButton>
                          );
                        })}
                      </List>

                      {groups.some((g) => !roundForCourses.groupIds.includes(g.id)) && (
                        <Box sx={{ mt: 1.35, pl: 0.5, width: 'calc(100% - 4px)' }}>
                          <Typography
                            component="label"
                            htmlFor="epo-add-course-select"
                            sx={{
                              display: 'block',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: 'text.secondary',
                              mb: 0.35,
                            }}
                          >
                            Kurs hinzufügen
                          </Typography>
                          <Select
                            id="epo-add-course-select"
                            size="small"
                            fullWidth
                            value={courseToAdd}
                            displayEmpty
                            disabled={saving}
                            onChange={(e) => {
                              const v = String(e.target.value);
                              if (v) void addCourseById(v);
                            }}
                            renderValue={(v) => {
                              if (!v) {
                                return (
                                  <Typography component="span" sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                                    Kurs wählen…
                                  </Typography>
                                );
                              }
                              return groups.find((g) => g.id === v)?.name ?? v;
                            }}
                            sx={{
                              fontSize: '0.78rem',
                              width: '100%',
                              '& .MuiSelect-select': { py: 0.65 },
                            }}
                          >
                            {groups
                              .filter((g) => !roundForCourses.groupIds.includes(g.id))
                              .map((g) => (
                                <MenuItem key={g.id} value={g.id} sx={{ fontSize: '0.8rem' }}>
                                  {g.name}
                                </MenuItem>
                              ))}
                          </Select>
                        </Box>
                      )}
                    </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
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
          <Card
            sx={{
              ...epoNotenCardSx,
              borderWidth: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              height: '100%',
              alignSelf: 'stretch',
              overflow: 'hidden',
            }}
          >
            {!studentListGroupFilter || !activeCourseGroupId ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 280 }}>
                  {round.groupIds.length === 0
                    ? 'Links einen Kurs zur Runde hinzufügen.'
                    : 'Links einen Kurs anklicken — hier erscheinen nur die SuS dieses Kurses.'}
                </Typography>
              </Box>
            ) : (
            <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.65,
                flexWrap: 'nowrap',
                px: 1.25,
                py: 0.65,
                bgcolor: '#fff',
                borderBottom: `1px solid ${epoNotenPalette.border}`,
                overflowX: 'auto',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: epoNotenPalette.heading,
                  flex: '0 1 auto',
                  minWidth: 48,
                  maxWidth: '28%',
                }}
                noWrap
              >
                {activeCourseName}
              </Typography>
              {activeCourseGroupId ? (
                <Box sx={{ ...epoJaFeatureGroupShellSx, flexShrink: 1, minWidth: 0, gap: 0.35 }}>
                  <Tooltip title="Raster-Variante (Standard: Variante 2)">
                    <Select
                      id="epo-round-variant-select"
                      size="small"
                      value={
                        epoEffectiveVariantIdForGroup(round, activeCourseGroupId) === 'default'
                          ? 'default'
                          : EPO_VARIANT2_ID
                      }
                      onChange={(e) => void updateGroupVariant(activeCourseGroupId, String(e.target.value))}
                      disabled={
                        saving ||
                        (() => {
                          const f = epoGroupJaFlags(round, activeCourseGroupId);
                          return !f.self && !f.raster;
                        })()
                      }
                      renderValue={(v) => {
                        const isLegacy = v === 'default';
                        return (
                          <Typography
                            component="span"
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: isLegacy ? 600 : 700,
                              color: isLegacy ? 'text.disabled' : 'text.primary',
                              fontStyle: isLegacy ? 'italic' : 'normal',
                            }}
                          >
                            {isLegacy ? 'Variante 1 (alt)' : 'Variante 2'}
                          </Typography>
                        );
                      }}
                      aria-label="EPO-Zettel (Variante)"
                      sx={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        bgcolor: '#fff',
                        flexShrink: 0,
                        minWidth: 0,
                        width: 'auto',
                        height: 28,
                        borderRadius: 1,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: epoNotenPalette.border },
                        '& .MuiSelect-select': { py: 0.25, pr: '28px !important', pl: 0.75 },
                      }}
                    >
                      <MenuItem value={EPO_VARIANT2_ID} sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                        Variante 2 (gewichtet)
                      </MenuItem>
                      <MenuItem
                        value="default"
                        sx={{ fontSize: '0.82rem', color: 'text.secondary', fontStyle: 'italic' }}
                      >
                        Variante 1 (klassisch, alt)
                      </MenuItem>
                    </Select>
                  </Tooltip>
                  <EpoJaFeatureButtons
                    size="course"
                    disabled={saving}
                    value={epoGroupJaFlags(round, activeCourseGroupId)}
                    onChange={(flags) => void updateGroupEpoFeatures(activeCourseGroupId, flags)}
                  />
                </Box>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                disabled={saving || !activeCourseGroupId}
                onClick={() => requestReset(activeCourseGroupId)}
                startIcon={<RestartAltIcon />}
                sx={{
                  ...epoNotenToolbarOutlinedBtnSx,
                  color: '#e65100',
                  borderColor: 'rgba(230, 81, 0, 0.45)',
                  '&:hover': { bgcolor: 'rgba(245, 124, 0, 0.08)', borderColor: '#e65100' },
                }}
              >
                Kurs zurücksetzen
              </Button>
              {(() => {
                const mssLocked = epoGroupUsesMssPoints(activeCourseName);
                const modeValue = groupMode(activeCourseGroupId);
                return (
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={modeValue}
                    onChange={(_, v: EpoNotenAssessmentMode | null) => {
                      if (!v || mssLocked) return;
                      void updateGroupAssessmentMode(activeCourseGroupId, v);
                    }}
                    disabled={saving}
                    aria-label="Punkte oder Note"
                    sx={{
                      bgcolor: '#fff',
                      flexShrink: 0,
                      '& .MuiToggleButton-root': {
                        px: 1.1,
                        py: 0.25,
                        minHeight: 28,
                        lineHeight: 1.2,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  >
                    <ToggleButton value="note" disabled={mssLocked}>
                      Note
                    </ToggleButton>
                    <ToggleButton value="mss" disabled={mssLocked}>
                      Punkte (MSS)
                    </ToggleButton>
                  </ToggleButtonGroup>
                );
              })()}
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                p: 0.5,
                pb: 0.5,
                boxSizing: 'border-box',
              }}
            >
              <Stack spacing={0.5} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Box
                  sx={{
                    display: 'grid',
                    flex: 1,
                    minHeight: 0,
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(222px, 266px) minmax(0, 1fr)' },
                    gap: 0.5,
                    alignItems: 'stretch',
                    height: '100%',
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                      flex: 1,
                      height: '100%',
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', mb: 0.35, color: 'text.secondary', flexShrink: 0 }}>
                      Schüler
                    </Typography>
                    <List
                      dense
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        height: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: '#fff',
                        py: 0,
                        alignSelf: 'stretch',
                      }}
                    >
                      {visibleStudentSections.map((section, sectionIndex) => (
                        <React.Fragment key={section.groupId}>
                          {!studentListGroupFilter && (
                            <ListSubheader
                              disableSticky
                              sx={{
                                lineHeight: 1.25,
                                py: 0.45,
                                px: 0.75,
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                color: epoNotenPalette.heading,
                                bgcolor: epoNotenPalette.sand,
                                borderBottom: '1px solid',
                                borderTop: sectionIndex > 0 ? '1px solid' : undefined,
                                borderColor: 'divider',
                              }}
                            >
                              {section.groupName}
                            </ListSubheader>
                          )}
                          {section.students.length === 0 ? (
                            <ListItemButton dense disabled sx={{ py: 0.5, px: 0.75, opacity: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Keine Schüler geladen — Seite neu laden oder Kurs erneut zur Runde hinzufügen.
                              </Typography>
                            </ListItemButton>
                          ) : null}
                          {section.students.map((s, studentIndex) => {
                            const rowGroupId =
                              section.groupId === '__other__' ? s.groupId || '' : section.groupId;
                            const active =
                              s.studentId === selectedStudentId && rowGroupId === selectedStudentGroupId;
                            const isLastInSection = studentIndex === section.students.length - 1;
                            const isLastSection = sectionIndex === visibleStudentSections.length - 1;
                            const passive = isPassiveStudentId(
                              s.studentId,
                              section.groupId !== '__other__'
                                ? passiveIdsForGroup(section.groupId)
                                : [...allPassiveStudentIds],
                            );
                            const live = isStudentGroupLive(s);
                            const sectionUsesRaster =
                              round && section.groupId !== '__other__'
                                ? epoGroupUsesRaster(round, section.groupId)
                                : groupUsesRaster;
                            const rowGroupFlags =
                              round && section.groupId !== '__other__'
                                ? groupJaFlagsFor(section.groupId)
                                : null;
                            const goalsWaivedForRow =
                              Boolean(s.goalsWaived) || (rowGroupFlags ? !rowGroupFlags.goals : false);
                            const pendingKind = !passive && live
                              ? studentEpoPendingKind(s, true, {
                                  usesRaster: sectionUsesRaster,
                                  goalsWaived: goalsWaivedForRow,
                                })
                              : null;
                            const suFertig = !passive && live && !pendingKind;
                            const rowMode =
                              s.groupId && round ? groupMode(s.groupId) : selectedAssessmentMode;
                            const gradeLabel = s.teacherGrade
                              ? rowMode === 'mss'
                                ? `${s.teacherGrade} P.`
                                : s.teacherGrade
                              : null;
                            return (
                              <ListItemButton
                                key={`${section.groupId}-${s.studentId}`}
                                selected={active}
                                onClick={() => void selectStudent(s.studentId, rowGroupId)}
                                sx={{
                                  py: 0.5,
                                  px: 0.5,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  opacity: passive ? 0.42 : 1,
                                  filter: passive ? 'grayscale(0.35)' : undefined,
                                  ...(pendingKind ? epoNotenBitteAusfuellenRowSx : {}),
                                  ...(suFertig ? epoNotenFertigRowSx : {}),
                                  ...((isLastInSection && isLastSection) ? { borderBottom: 0 } : {}),
                                }}
                              >
                                <Stack direction="row" alignItems="center" gap={0.6} width="100%" minWidth={0}>
                                  <Box
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    sx={{ flexShrink: 0, lineHeight: 0 }}
                                  >
                                    <DualStudentAvatars
                                      photoOnly
                                      photoFraming="portrait"
                                      name={s.studentName}
                                      avatarUrl={s.avatarUrl}
                                      photoSize={44}
                                      alwaysShowPhotoSlot
                                    />
                                  </Box>
                                  <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.72rem', flex: 1, minWidth: 0 }}>
                                    {s.studentName}
                                  </Typography>
                                  <EpoNotenTeacherStudentStatusChip
                                    passive={passive}
                                    withoutSelfAssessment={s.withoutSelfAssessment}
                                    teacherGradeOnly={s.teacherGradeOnly}
                                    pendingKind={pendingKind}
                                    studentSubmittedAt={s.studentSubmittedAt}
                                  />
                                  {gradeLabel ? (
                                    <Typography
                                      sx={{
                                        fontSize: '1.28rem',
                                        fontWeight: 900,
                                        fontVariantNumeric: 'tabular-nums',
                                        lineHeight: 1,
                                        color: gradeLabel
                                          ? epoNotenPalette.fertigAccent
                                          : 'text.disabled',
                                        flexShrink: 0,
                                        minWidth: '2rem',
                                        textAlign: 'right',
                                      }}
                                    >
                                      {gradeLabel}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </ListItemButton>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </List>
                  </Box>

                  <Box sx={{ minWidth: 0, width: '100%', maxWidth: 'none' }}>
                    {!selectedStudent ? (
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', py: 0.75, textAlign: 'center' }}>
                        Schüler auswählen
                      </Typography>
                    ) : (
                      <Stack spacing={0.45}>
                        {selectedPriorEpoNotes ? (
                          <Typography
                            sx={{
                              alignSelf: 'stretch',
                              textAlign: 'right',
                              color: 'text.secondary',
                              fontSize: '0.72rem',
                              lineHeight: 1.2,
                              mb: -0.15,
                            }}
                          >
                            alte Epo:{' '}
                            <Typography
                              component="span"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: 'text.primary',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {selectedPriorEpoNotes}
                            </Typography>
                          </Typography>
                        ) : null}
                        {selectedStudent.groupId ? (
                          <Stack spacing={0.35} sx={{ mb: 0.25 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                              {selectedStudent.studentName}
                            </Typography>
                            {(() => {
                              const passive = isPassiveStudentId(
                                selectedStudent.studentId,
                                passiveIdsForGroup(selectedStudent.groupId),
                              );
                              const modeLocked = saving || passiveSaving;
                              const groupFlags = groupJaFlagsFor(selectedStudent.groupId);
                              return (
                                <EpoJaFeatureButtons
                                  size="student"
                                  disabled={modeLocked || passive}
                                  value={epoDisplayJaFlags(selectedStudent, groupFlags)}
                                  onChange={(flags) => void applyStudentEpoFeatures(flags)}
                                  absent={{
                                    active: passive,
                                    disabled: passiveSaving || saving || modeLocked,
                                    onToggle: () => void toggleSelectedStudentPassive(),
                                  }}
                                />
                              );
                            })()}
                          </Stack>
                        ) : null}
                        {selectedStudent.groupId &&
                        isPassiveStudentId(
                          selectedStudent.studentId,
                          passiveIdsForGroup(selectedStudent.groupId),
                        ) ? (
                          <Alert severity="info" sx={{ py: 0.35, fontSize: '0.72rem' }}>
                            Länger abwesend — in der Liste unten, ausgegraut, ohne „Bitte ausfüllen“.
                          </Alert>
                        ) : null}
                        {isStudentGroupLive(selectedStudent) &&
                          selectedStudent?.groupId &&
                          !isPassiveStudentId(
                            selectedStudent.studentId,
                            passiveIdsForGroup(selectedStudent.groupId),
                          ) &&
                          (() => {
                            if (selectedStudent.goalsWaived) return null;
                            const selfPending =
                              !selectedStudent.withoutSelfAssessment &&
                              !selectedStudent.teacherGradeOnly &&
                              !selectedStudent.studentSubmittedAt;
                            const goalsPending =
                              Boolean(selectedStudent.teacherReleasedAt) &&
                              !selectedStudent.goalsSubmittedAt &&
                              !selectedStudent.goalsWaived;
                            const alerts: React.ReactNode[] = [];
                            if (selfPending) {
                              alerts.push(
                                <Alert key="self" severity="warning" sx={epoNotenBitteAusfuellenAlertSx}>
                                  <strong>Bitte ausfüllen</strong> — SuS muss noch{' '}
                                  {studentEpoPendingDetail('self')} abgeben.
                                </Alert>,
                              );
                            }
                            if (goalsPending && !selfPending) {
                              alerts.push(
                                <Alert key="goals" severity="warning" sx={epoNotenBitteAusfuellenAlertSx}>
                                  <strong>Bitte ausfüllen</strong> — SuS muss noch{' '}
                                  {studentEpoPendingDetail('goals')} abgeben.
                                </Alert>,
                              );
                            }
                            if (alerts.length === 0) return null;
                            return <Stack spacing={0.5}>{alerts}</Stack>;
                          })()}
                        {!selectedStudent.studentSubmittedAt &&
                          !isStudentGroupLive(selectedStudent) && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                            Runde noch nicht für SuS freigeschaltet.
                          </Typography>
                        )}

                        {selectedStudent.studentSubmittedAt ? (
                          <Typography
                            sx={{
                              fontSize: '0.78rem',
                              lineHeight: 1.45,
                              color: 'text.secondary',
                              mb: 0.5,
                              borderLeft: `3px solid ${epoNotenPalette.border}`,
                              pl: 1,
                            }}
                          >
                            <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              SuS:{' '}
                            </Typography>
                            {studentSelfAssessmentDisplay(
                              selectedStudent,
                              selectedStudent.groupId
                                ? groupMode(selectedStudent.groupId)
                                : 'note',
                            )}
                            {selectedStudent.groupId &&
                            groupMode(selectedStudent.groupId) === 'mss'
                              ? ` · Raster ${formatEpoPointsDisplay(selectedStudent.selfScores, categoryWeightsPercent)} P.`
                              : ` · Raster ${formatEpoPointsDisplay(selectedStudent.selfScores, categoryWeightsPercent)} → ${selectedStudent.selfGradeFromTable || '—'}`}
                            {selectedStudent.justification ? (
                              <>
                                <br />
                                <Typography component="span" sx={{ fontStyle: 'italic' }}>
                                  {selectedStudent.justification}
                                </Typography>
                              </>
                            ) : null}
                          </Typography>
                        ) : null}

                        <Box sx={{ width: '100%' }}>
                            {(selectedStudent.groupId &&
                              epoStudentNoteOnlyFlow(
                                selectedStudent,
                                groupJaFlagsFor(selectedStudent.groupId),
                              )) ||
                            !(selectedStudent.groupId && round && epoTeacherUsesRaster(round, selectedStudent.groupId)) ? (
                              <Stack spacing={1} sx={{ mt: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  <Tooltip
                                    title={
                                      selectedStudent.teacherReleasedAt
                                        ? 'Bewertung leeren und Freigabe zurücknehmen'
                                        : 'Bewertung leeren'
                                    }
                                  >
                                    <span>
                                      <IconButton
                                        size="small"
                                        aria-label="Bewertung leeren"
                                        disabled={saving}
                                        onClick={() => void clearTeacherAssessment()}
                                        sx={{
                                          p: 0.25,
                                          width: 26,
                                          height: 26,
                                          color: 'text.secondary',
                                          '&:hover': { color: 'text.primary', bgcolor: 'rgba(0,0,0,0.04)' },
                                        }}
                                      >
                                        <PanoramaFishEyeIcon sx={{ fontSize: '1.05rem' }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Box>
                                <TextField
                                  size="small"
                                  fullWidth
                                  label={selectedAssessmentMode === 'mss' ? 'MSS-Punkte' : 'Note'}
                                  value={teacherGrade}
                                  onChange={(e) => handleTeacherGradeManualChange(e.target.value)}
                                  disabled={Boolean(selectedStudent.teacherReleasedAt)}
                                  sx={{ '& .MuiInputBase-root': { fontSize: '0.9rem', fontWeight: 700 } }}
                                />
                                <TextField
                                  size="small"
                                  fullWidth
                                  label="Bemerkung (optional)"
                                  value={teacherJustification}
                                  onChange={(e) => handleTeacherJustificationChange(e.target.value)}
                                  multiline
                                  minRows={2}
                                  helperText={
                                    selectedStudent.teacherReleasedAt
                                      ? 'Auch nach Freigabe bearbeitbar — SuS sieht die Bemerkung.'
                                      : undefined
                                  }
                                  sx={{ mt: 0.5, '& .MuiInputBase-root': { fontSize: '0.82rem' } }}
                                />
                              </Stack>
                            ) : (
                              <>
                                <EpoNotenCategoryGrid
                                  compact
                                  teacherEmphasis
                                  label={
                                    selectedStudent.studentSubmittedAt
                                      ? 'Deine Bewertung (lila = SuS)'
                                      : selectedStudent.withoutSelfAssessment
                                        ? 'Deine Bewertung (oS)'
                                        : 'Deine Bewertung'
                                  }
                                  headerAction={
                                    <Tooltip
                                      title={
                                        selectedStudent.teacherReleasedAt
                                          ? 'Raster leeren und Freigabe zurücknehmen'
                                          : 'Raster leeren'
                                      }
                                    >
                                      <span>
                                        <IconButton
                                          size="small"
                                          aria-label="Raster leeren"
                                          disabled={saving}
                                          onClick={() => void clearTeacherAssessment()}
                                          sx={{
                                            p: 0.25,
                                            width: 26,
                                            height: 26,
                                            color: '#0d47a1',
                                            opacity: 0.85,
                                            '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.35)' },
                                          }}
                                        >
                                          <PanoramaFishEyeIcon sx={{ fontSize: '1.05rem' }} />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  }
                                  categories={teacherCategories}
                                  categoryTitles={categoryTitles}
                                  categoryWeightsPercent={categoryWeightsPercent}
                                  scores={teacherScores}
                                  onChange={handleTeacherScoresChange}
                                  radioGroupId={`${selectedStudentGroupId}-${selectedStudentId}`}
                                  studentOverlayScores={
                                    selectedStudent.studentSubmittedAt
                                      ? normalizeCategoryScores(selectedStudent.selfScores)
                                      : undefined
                                  }
                                />

                                <Stack
                                  direction="row"
                                  alignItems="baseline"
                                  justifyContent="space-between"
                                  flexWrap="wrap"
                                  gap={0.5}
                                  sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${epoNotenPalette.border}` }}
                                >
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>
                                    {selectedAssessmentMode === 'mss' ? 'MSS' : 'Note'}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      ...epoNotenBigNumberSx,
                                      fontSize: '1.2rem',
                                      color: teacherGrade.trim() || allCategoriesSelected(teacherScores)
                                        ? epoNotenPalette.primary
                                        : 'text.disabled',
                                    }}
                                  >
                                    {teacherGrade.trim() ||
                                      (allCategoriesSelected(teacherScores) ? computedRasterResult : '—')}
                                  </Typography>
                                </Stack>
                                <TextField
                                  size="small"
                                  fullWidth
                                  label="Bemerkung (optional)"
                                  value={teacherJustification}
                                  onChange={(e) => handleTeacherJustificationChange(e.target.value)}
                                  multiline
                                  minRows={2}
                                  helperText={
                                    selectedStudent.teacherReleasedAt
                                      ? 'Auch nach Freigabe bearbeitbar — SuS sieht die Bemerkung.'
                                      : undefined
                                  }
                                  sx={{ mt: 1, '& .MuiInputBase-root': { fontSize: '0.82rem' } }}
                                />
                              </>
                            )}

                            <Stack spacing={0.5} sx={{ mt: 1 }}>
                              {draftStatus !== 'idle' && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    textAlign: 'right',
                                    display: 'block',
                                    color:
                                      draftStatus === 'error'
                                        ? 'error.main'
                                        : draftStatus === 'saved'
                                          ? 'success.main'
                                          : 'text.secondary',
                                    fontWeight: 600,
                                  }}
                                >
                                  {draftStatus === 'saving'
                                    ? 'Speichert…'
                                    : draftStatus === 'saved'
                                      ? 'Gespeichert'
                                      : 'Automatisches Speichern fehlgeschlagen — bitte erneut ändern oder Seite neu laden'}
                                </Typography>
                              )}
                            </Stack>
                        </Box>

                        <Box
                          sx={{
                            ...epoNotenInsetBoxSx,
                            bgcolor: 'rgba(46, 125, 50, 0.06)',
                            borderColor: 'rgba(46, 125, 50, 0.25)',
                            p: 0.75,
                            mt: 0.5,
                          }}
                        >
                          <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: epoNotenPalette.heading }}>
                            Ziele (SuS)
                            {selectedStudent.goalsSubmittedAt ? (
                              <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.65rem', ml: 0.5, color: 'success.main' }}>
                                abgeschickt
                              </Typography>
                            ) : selectedStudent.goalsWaived ? (
                              <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.65rem', ml: 0.5, color: 'text.secondary' }}>
                                · nicht erforderlich
                              </Typography>
                            ) : selectedStudent.teacherReleasedAt ? (
                              <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.65rem', ml: 0.5, color: 'text.secondary' }}>
                                · noch offen
                              </Typography>
                            ) : null}
                          </Typography>
                          {!selectedStudent.teacherReleasedAt
                            ? null
                            : selectedStudent.goalsSubmittedAt ||
                            selectedStudent.goal?.trim() ||
                            selectedStudent.goalAction?.trim() ? (
                            <Stack spacing={0.5}>
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                  Ziel
                                </Typography>
                                <Box sx={{ ...epoNotenStudentGoalDisplaySx, mt: 0.25, fontSize: '0.82rem', p: 0.75 }}>
                                  {selectedStudent.goal?.trim() || '—'}
                                </Box>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                  Handlung
                                </Typography>
                                <Box sx={{ ...epoNotenStudentGoalDisplaySx, mt: 0.25, fontSize: '0.82rem', p: 0.75 }}>
                                  {selectedStudent.goalAction?.trim() || '—'}
                                </Box>
                              </Box>
                            </Stack>
                          ) : null}
                        </Box>
                      </Stack>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Box>
            </>
            )}
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

      <Dialog
        open={deleteRoundConfirmOpen}
        onClose={() => {
          if (!saving) {
            setDeleteRoundConfirmOpen(false);
            setDeleteRoundConfirmText('');
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={dialogCloseTitleSx}>
          EPO-Runde endgültig löschen?
          <DialogCloseIconButton
            onClose={() => {
              if (!saving) {
                setDeleteRoundConfirmOpen(false);
                setDeleteRoundConfirmText('');
              }
            }}
            disabled={saving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.25 }}>
            <Alert severity="error" sx={{ py: 0.55, fontSize: '0.8rem', fontWeight: 600 }}>
              Alle Daten dieser Runde werden unwiderruflich gelöscht.
            </Alert>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              Runde: <strong>{round?.title}</strong>
              {round?.date ? ` · ${round.date}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              Einträge aller Kurse und SuS in dieser Runde (Selbsteinschätzungen, Bewertungen, Freigaben, Ziele) gehen
              verloren.
            </Typography>
            <TextField
              size="small"
              fullWidth
              autoComplete="off"
              label={`Zum Bestätigen „${DELETE_ROUND_CONFIRM_PHRASE}“ eingeben`}
              value={deleteRoundConfirmText}
              onChange={(e) => setDeleteRoundConfirmText(e.target.value)}
              disabled={saving}
              sx={{ mt: 0.5, '& .MuiInputBase-root': { fontSize: '0.88rem' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button
            size="small"
            onClick={() => {
              setDeleteRoundConfirmOpen(false);
              setDeleteRoundConfirmText('');
            }}
            disabled={saving}
            sx={epoNotenCompactBtnSx}
          >
            Abbrechen
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
            onClick={() => void removeRound()}
            disabled={saving || deleteRoundConfirmText.trim() !== DELETE_ROUND_CONFIRM_PHRASE}
            sx={epoNotenCompactBtnSx}
          >
            Runde löschen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetConfirmOpen}
        onClose={() => {
          if (!saving) {
            setResetConfirmOpen(false);
            setResetGroupId(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={dialogCloseTitleSx}>
          {resetGroupId ? `Kurs „${resetGroupName}“ zurücksetzen?` : 'Alle SuS zurücksetzen?'}
          <DialogCloseIconButton
            onClose={() => {
              if (!saving) {
                setResetConfirmOpen(false);
                setResetGroupId(null);
              }
            }}
            disabled={saving}
          />
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Alert severity="warning" sx={{ py: 0.5, fontSize: '0.8rem' }}>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </Alert>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {resetGroupId ? (
                <>
                  Für <strong>{resetGroupName}</strong> in der Runde <strong>{round?.title}</strong> werden alle
                  Einträge dieser SuS gelöscht:
                </>
              ) : (
                <>
                  Für die Runde <strong>{round?.title}</strong> werden alle Einträge gelöscht:
                </>
              )}
            </Typography>
            <Typography component="ul" variant="body2" sx={{ m: 0, pl: 2.25, fontSize: '0.82rem', color: 'text.secondary' }}>
              <li>Selbsteinschätzungen der Schüler</li>
              <li>deine Bewertungen und Noten</li>
              <li>Freigaben und Ziele</li>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>
              Danach können die SuS ihre Selbsteinschätzung erneut abgeben.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button
            size="small"
            onClick={() => {
              setResetConfirmOpen(false);
              setResetGroupId(null);
            }}
            disabled={saving}
            sx={epoNotenCompactBtnSx}
          >
            Abbrechen
          </Button>
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={() => void confirmReset()}
            disabled={saving}
            sx={epoNotenCompactBtnSx}
          >
            {resetGroupId ? 'Ja, Kurs zurücksetzen' : 'Ja, alle zurücksetzen'}
          </Button>
        </DialogActions>
      </Dialog>

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
            {groups.map((g) => {
              const checked = newGroupIds.includes(g.id);
              return (
                <Box
                  key={g.id}
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleNewGroup(g.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.35,
                    px: 0.5,
                    mx: -0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox checked={checked} tabIndex={-1} disableRipple sx={{ p: 0.25, pointerEvents: 'none' }} />
                  <Typography variant="body2">{g.name}</Typography>
                </Box>
              );
            })}
            <Box
              role="checkbox"
              aria-checked={publishOnCreate}
              aria-disabled={newGroupIds.length === 0}
              onClick={() => {
                if (newGroupIds.length === 0) return;
                setPublishOnCreate((v) => !v);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.35,
                px: 0.5,
                mx: -0.5,
                borderRadius: 1,
                cursor: newGroupIds.length === 0 ? 'default' : 'pointer',
                opacity: newGroupIds.length === 0 ? 0.5 : 1,
                userSelect: 'none',
                '&:hover': newGroupIds.length === 0 ? undefined : { bgcolor: 'action.hover' },
              }}
            >
              <Checkbox
                checked={publishOnCreate}
                disabled={newGroupIds.length === 0}
                tabIndex={-1}
                disableRipple
                sx={{ p: 0.25, pointerEvents: 'none' }}
              />
              <Typography variant="body2">Direkt für SuS freischalten (empfohlen)</Typography>
            </Box>
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
