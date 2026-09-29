import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import TuneIcon from '@mui/icons-material/Tune';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { apiDelete, apiGetSafe, apiPost, apiPut } from '../../lib/api';
import { isPassiveStudentId, parsePassiveStudentIds } from '../../lib/passiveStudents';
import {
  EPO_NOTEN_TEACHER_CATEGORIES,
  type EpoNotenEntry,
  type EpoNotenRound,
  type EpoNotenVariantSheet,
  allCategoriesSelected,
  isEpoGroupCompleted,
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
  formatEpoPointsDisplay,
  teacherFormGradeFromEntry,
  teacherFormScoresFromEntry,
  studentEpoPendingKind,
  studentEpoPendingDetail,
} from '../../lib/epoNotenShared';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import DualStudentAvatars from '../DualStudentAvatars';
import { EpoNotenCategoryGrid } from './EpoNotenCategoryGrid';
import { EpoNotenVariantsDialog } from './EpoNotenVariantsDialog';
import {
  epoNotenCardSx,
  epoNotenCompactBtnSx,
  epoNotenCompactIconBtnSx,
  epoNotenCompactIconSx,
  epoNotenInsetBoxSx,
  epoNotenBigNumberSx,
  epoNotenPalette,
  epoNotenStudentGoalDisplaySx,
  epoNotenBitteAusfuellenChipSx,
  epoNotenBitteAusfuellenRowSx,
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
  const [publishOnCreate, setPublishOnCreate] = useState(true);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  /** null = ganze Runde, sonst nur diese Lerngruppe */
  const [resetGroupId, setResetGroupId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  /** null = alle Gruppen in der SuS-Liste, sonst nur diese Lerngruppe */
  const [studentListGroupFilter, setStudentListGroupFilter] = useState<string | null>(null);

  const [passiveSaving, setPassiveSaving] = useState(false);
  const [variants, setVariants] = useState<EpoNotenVariantSheet[]>([]);
  const [teacherCategories, setTeacherCategories] = useState<string[]>(EPO_NOTEN_TEACHER_CATEGORIES);
  const [categoryTitles, setCategoryTitles] = useState<string[]>([]);
  const [categoryWeightsPercent, setCategoryWeightsPercent] = useState<number[] | undefined>();
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [courseToAdd, setCourseToAdd] = useState('');

  const loadVariants = useCallback(async () => {
    const res = await apiGetSafe('/api/epo-noten/variants');
    if (!res?.ok) return;
    const data = await res.json();
    setVariants(Array.isArray(data.variants) ? data.variants : []);
  }, []);

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
    if (Array.isArray(data.teacherCategories) && data.teacherCategories.length > 0) {
      setTeacherCategories(data.teacherCategories as string[]);
    } else {
      setTeacherCategories(EPO_NOTEN_TEACHER_CATEGORIES);
    }
    setCategoryTitles(Array.isArray(data.categoryTitles) ? (data.categoryTitles as string[]) : []);
    setCategoryWeightsPercent(
      Array.isArray(data.categoryWeightsPercent) ? (data.categoryWeightsPercent as number[]) : undefined,
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
    loadVariants();
  }, []);

  useEffect(() => {
    if (!selectedId && rounds.length > 0) setSelectedId(rounds[0].id);
  }, [rounds, selectedId]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId).catch(() => setError('Detail konnte nicht geladen werden'));
    }
  }, [selectedId, loadDetail]);

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

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId) ?? null;

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

  const sortStudentsForGroup = useCallback(
    (list: EpoNotenEntry[]) =>
      [...list].sort((a, b) =>
        compareEpoStudentListOrder(a, b, Boolean(round?.publishedAt), allPassiveStudentIds, (e) =>
          isStudentGroupLive(e),
        ),
      ),
    [allPassiveStudentIds, isStudentGroupLive, round?.publishedAt],
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

  const addCourseFromDropdown = async () => {
    if (!round || !courseToAdd || round.groupIds.includes(courseToAdd)) return;
    const gid = courseToAdd;
    setCourseToAdd('');
    await updateRoundGroups([...round.groupIds, gid]);
    selectStudentListGroup(gid);
  };

  useEffect(() => {
    if (
      studentListGroupFilter &&
      selectedStudent?.groupId &&
      selectedStudent.groupId !== studentListGroupFilter
    ) {
      setSelectedStudentId('');
    }
  }, [studentListGroupFilter, selectedStudent?.groupId]);

  const skipRasterGradeSyncRef = useRef(false);
  const teacherScoresDirtyRef = useRef(false);
  const prevSelectedStudentIdRef = useRef('');
  const teacherScoresRef = useRef(teacherScores);
  teacherScoresRef.current = teacherScores;
  const teacherGradeRef = useRef(teacherGrade);
  teacherGradeRef.current = teacherGrade;
  const teacherSaveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!selectedStudentId) {
      if (prevSelectedStudentIdRef.current !== '') {
        prevSelectedStudentIdRef.current = '';
        teacherScoresDirtyRef.current = false;
      }
      teacherScoresRef.current = normalizeCategoryScores([]);
      setTeacherScores(normalizeCategoryScores([]));
      teacherGradeRef.current = '';
      setTeacherGrade('');
      return;
    }

    const entry = students.find((s) => s.studentId === selectedStudentId);

    if (selectedStudentId !== prevSelectedStudentIdRef.current) {
      prevSelectedStudentIdRef.current = selectedStudentId;
      teacherScoresDirtyRef.current = false;
      const mode = entry?.groupId ? groupMode(entry.groupId) : 'note';
      const scores = teacherFormScoresFromEntry(entry);
      teacherScoresRef.current = scores;
      setTeacherScores(scores);
      const grade = teacherFormGradeFromEntry(entry, mode, categoryWeightsPercent);
      teacherGradeRef.current = grade;
      setTeacherGrade(grade);
      skipRasterGradeSyncRef.current = true;
      return;
    }

    if (teacherScoresDirtyRef.current || !entry) return;
    const mode = entry.groupId ? groupMode(entry.groupId) : 'note';
    const server = teacherFormScoresFromEntry(entry);
    const local = teacherScoresRef.current;
    if (local.every((s) => s < 0) && server.some((s) => s >= 0)) {
      teacherScoresRef.current = server;
      setTeacherScores(server);
      const grade = teacherFormGradeFromEntry(entry, mode, categoryWeightsPercent);
      teacherGradeRef.current = grade;
      setTeacherGrade(grade);
      skipRasterGradeSyncRef.current = true;
    }
  }, [categoryWeightsPercent, selectedStudentId, students, round]);

  const totalTeacher = epoRoundedPoints(teacherScores, categoryWeightsPercent);
  const selectedAssessmentMode: EpoNotenAssessmentMode =
    selectedStudent?.groupId ? groupMode(selectedStudent.groupId) : 'note';
  const computedRasterResult = rasterResultFromTotal(selectedAssessmentMode, totalTeacher);

  const persistTeacherEntry = useCallback(
    async (grade: string, scoresSnapshot: number[]) => {
      if (!round || !selectedStudentId) {
        throw new Error('Kein Schüler ausgewählt');
      }
      const scores = normalizeCategoryScores(scoresSnapshot);
      const row = students.find((s) => s.studentId === selectedStudentId);
      const mode = row?.groupId ? groupMode(row.groupId) : selectedAssessmentMode;
      const resolvedGrade =
        grade.trim() ||
        (allCategoriesSelected(scores)
          ? rasterResultFromTotal(mode, epoRoundedPoints(scores, categoryWeightsPercent))
          : '');
      const res = await apiPut(`/api/epo-noten/${round.id}/teacher/${selectedStudentId}`, {
        teacherScores: scores,
        teacherGrade: resolvedGrade,
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
            s.studentId === entry.studentId ? { ...s, ...entry, groupId: (s as { groupId?: string }).groupId } : s,
          ),
        );
        if (entry.studentId === selectedStudentId) {
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
    [round, selectedStudentId, students, selectedAssessmentMode],
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

  const prefillFromSelfKeyRef = useRef('');

  useEffect(() => {
    if (!round || !selectedStudentId) return;
    const entry = students.find((s) => s.studentId === selectedStudentId);
    if (!entry || entry.teacherReleasedAt) return;
    if (!shouldPrefillTeacherFromSelf(entry)) {
      prefillFromSelfKeyRef.current = '';
      return;
    }
    const key = `${selectedStudentId}:${entry.studentSubmittedAt ?? ''}`;
    if (prefillFromSelfKeyRef.current === key) return;
    prefillFromSelfKeyRef.current = key;
    teacherScoresDirtyRef.current = true;
    void saveTeacherDraftNow().catch(() => undefined);
  }, [round, saveTeacherDraftNow, selectedStudentId, students]);

  useEffect(() => {
    if (!selectedStudent) return;
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
  }, [computedRasterResult, saveTeacherDraftNow, selectedStudent, teacherScores]);

  const selectStudent = async (studentId: string) => {
    if (studentId === selectedStudentId) return;
    setError(null);
    try {
      await saveTeacherDraftNow();
      await teacherSaveChainRef.current;
      setSelectedStudentId(studentId);
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
      setSelectedId(roundId);
      setDraftStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern vor Rundenwechsel fehlgeschlagen');
    }
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

  const publishGroup = async (groupId: string) => {
    if (!round) return;
    setSaving(true);
    try {
      const res = await apiPost(`/api/epo-noten/${round.id}/publish-group`, { groupId });
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

  const updateRoundVariant = async (variantId: string) => {
    if (!round) return;
    const res = await apiPut(`/api/epo-noten/${round.id}`, { variantId });
    if (!res?.ok) {
      setError('Variante konnte nicht gespeichert werden');
      return;
    }
    await loadDetail(round.id);
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
      }
      if (!resetGroupId) {
        setSelectedStudentId('');
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

  const removeRound = async () => {
    if (!round || !window.confirm('Diese EPO-Runde wirklich löschen?')) return;
    await apiPost(`/api/epo-noten/${round.id}/unpublish`, {});
    await apiDelete(`/api/epo-noten/${round.id}`);
    setSelectedId('');
    await loadList();
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

  const releasableCountInGroup = useCallback(
    (groupId: string) => {
      if (!round || groupId === '__other__') return 0;
      const mode = groupMode(groupId);
      const passive = passiveIdsForGroup(groupId);
      return students.filter((s) => {
        if (s.groupId !== groupId || s.teacherReleasedAt) return false;
        if (isPassiveStudentId(s.studentId, passive)) return false;
        return Boolean(teacherFormGradeFromEntry(s, mode, categoryWeightsPercent).trim());
      }).length;
    },
    [categoryWeightsPercent, groupMode, passiveIdsForGroup, round, students],
  );

  const releaseAllInGroup = async (groupId: string) => {
    if (!round || groupId === '__other__') return;
    const groupName = groups.find((g) => g.id === groupId)?.name ?? 'Lerngruppe';
    const n = releasableCountInGroup(groupId);
    if (n === 0) {
      setError(
        `In „${groupName}“ gibt es keine fertigen Bewertungen, die noch nicht freigegeben sind (Raster vollständig ausfüllen).`,
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
        maxHeight: 'calc(100vh - 40px)',
        overflow: 'hidden',
      }}
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ py: 0, fontSize: '0.72rem', flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 380px) minmax(0, 1fr)' },
          gap: 0.5,
          alignItems: 'stretch',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Card sx={{ ...epoNotenCardSx, borderWidth: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
              const publishedCount =
                roundForCourses?.groupIds.filter((gid) => isEpoGroupPublished(roundForCourses, gid)).length ?? 0;
              const completedCount =
                roundForCourses?.groupIds.filter((gid) => isEpoGroupCompleted(roundForCourses, gid)).length ?? 0;
              return (
                <React.Fragment key={r.id}>
                  <ListItemButton
                    selected={active}
                    onClick={() => void selectRound(r.id)}
                    sx={{
                      py: 0.35,
                      px: 0.65,
                      alignItems: 'stretch',
                      flexDirection: 'column',
                      gap: 0.15,
                      borderBottom: active && roundForCourses ? 'none' : '1px solid',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        bgcolor: epoNotenPalette.primaryTint,
                        borderLeft: `3px solid ${epoNotenPalette.primary}`,
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.5} width="100%">
                      <Typography
                        noWrap
                        sx={{ fontWeight: 700, fontSize: '0.8rem', color: epoNotenPalette.textPrimary, flex: 1, minWidth: 0 }}
                      >
                        {r.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={r.publishedAt ? 'live' : 'Entwurf'}
                        color={r.publishedAt ? 'success' : 'default'}
                        sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, flexShrink: 0 }}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: epoNotenPalette.textSecondary, lineHeight: 1.2, fontSize: '0.62rem' }}>
                      {r.date} · {r.stats.submitted}/{r.stats.graded}/{r.stats.released} (abgegeben/bewertet/frei)
                    </Typography>
                  </ListItemButton>
                  {active && roundForCourses && (
                    <Box
                      sx={{
                        pl: 2.25,
                        pr: 0.75,
                        pb: 0.75,
                        pt: 0.25,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'rgba(25, 118, 210, 0.04)',
                        borderLeft: `3px solid ${epoNotenPalette.primary}`,
                      }}
                    >
                      <Stack direction="row" alignItems="center" gap={0.35} flexWrap="wrap" sx={{ mb: 0.5 }}>
                        <FormControl size="small" sx={{ minWidth: 0, flex: 1 }}>
                          <InputLabel id="epo-round-variant-label" sx={{ fontSize: '0.7rem' }}>
                            Variante
                          </InputLabel>
                          <Select
                            labelId="epo-round-variant-label"
                            label="Variante"
                            value={roundForCourses.variantId || 'default'}
                            onChange={(e) => void updateRoundVariant(String(e.target.value))}
                            sx={{ fontSize: '0.72rem', height: 32 }}
                          >
                            {(variants.length > 0 ? variants : [{ id: 'default', name: 'Standard' }]).map((v) => (
                              <MenuItem key={v.id} value={v.id} sx={{ fontSize: '0.78rem' }}>
                                {v.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Tooltip title="Variantenzettel">
                          <IconButton size="small" onClick={() => setVariantsOpen(true)} sx={epoNotenCompactIconBtnSx}>
                            <TuneIcon sx={epoNotenCompactIconSx} />
                          </IconButton>
                        </Tooltip>
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
                          <IconButton size="small" onClick={() => void removeRound()} sx={{ ...epoNotenCompactIconBtnSx, color: '#c62828' }}>
                            <DeleteOutlineIcon sx={epoNotenCompactIconSx} />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: epoNotenPalette.textSecondary, mb: 0.35, pl: 0.5 }}>
                        Kurse · {publishedCount} live · {completedCount} fertig
                      </Typography>

                      <List dense disablePadding sx={{ pl: 0.5 }}>
                        {roundForCourses.groupIds.map((gid) => {
                          const g = groups.find((x) => x.id === gid);
                          const published = isEpoGroupPublished(roundForCourses, gid);
                          const completed = isEpoGroupCompleted(roundForCourses, gid);
                          const st = groupCourseStats(gid);
                          const courseSelected = studentListGroupFilter === gid;
                          return (
                            <ListItemButton
                              key={gid}
                              selected={courseSelected}
                              onClick={() => selectStudentListGroup(gid)}
                              sx={{
                                py: 0.45,
                                px: 0.5,
                                mb: 0.35,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: completed ? 'success.light' : courseSelected ? 'primary.light' : 'divider',
                                bgcolor: completed
                                  ? 'rgba(46, 125, 50, 0.12)'
                                  : courseSelected
                                    ? 'rgba(25, 118, 210, 0.1)'
                                    : '#fff',
                                '&.Mui-selected': {
                                  bgcolor: 'rgba(25, 118, 210, 0.14)',
                                },
                              }}
                            >
                              <Checkbox
                                size="small"
                                checked={completed}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(_, checked) => void setGroupCompleted(gid, checked)}
                                disabled={saving}
                                sx={{ p: 0, mr: 0.35 }}
                                inputProps={{ 'aria-label': `${g?.name || gid} fertig` }}
                              />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.25 }} noWrap>
                                  {g?.name || gid}
                                </Typography>
                                <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                                  {published ? 'live' : 'nicht frei'} · {st.submitted}/{st.total} abgegeben
                                </Typography>
                              </Box>
                              {!published && (
                                <Tooltip title="Kurs freischalten">
                                  <IconButton
                                    size="small"
                                    aria-label="Freischalten"
                                    disabled={saving}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void publishGroup(gid);
                                    }}
                                    sx={{
                                      ...epoNotenCompactIconBtnSx,
                                      bgcolor: epoNotenPalette.accent,
                                      color: '#fff',
                                    }}
                                  >
                                    <PublishIcon sx={{ fontSize: '0.85rem' }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </ListItemButton>
                          );
                        })}
                      </List>

                      {groups.some((g) => !roundForCourses.groupIds.includes(g.id)) && (
                        <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ mt: 0.5, pl: 0.5 }}>
                          <FormControl size="small" fullWidth>
                            <InputLabel id="epo-add-course-label" sx={{ fontSize: '0.72rem' }}>
                              Kurs hinzufügen
                            </InputLabel>
                            <Select
                              labelId="epo-add-course-label"
                              label="Kurs hinzufügen"
                              value={courseToAdd}
                              onChange={(e) => setCourseToAdd(String(e.target.value))}
                              sx={{ fontSize: '0.78rem' }}
                            >
                              <MenuItem value="">
                                <em>— wählen —</em>
                              </MenuItem>
                              {groups
                                .filter((g) => !roundForCourses.groupIds.includes(g.id))
                                .map((g) => (
                                  <MenuItem key={g.id} value={g.id} sx={{ fontSize: '0.8rem' }}>
                                    {g.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!courseToAdd || saving}
                            onClick={() => void addCourseFromDropdown()}
                            sx={{ ...epoNotenCompactBtnSx, flexShrink: 0, mb: 0.15 }}
                          >
                            +
                          </Button>
                        </Stack>
                      )}
                    </Box>
                  )}
                </React.Fragment>
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
                gap: 1,
                flexWrap: 'wrap',
                px: 1.25,
                py: 0.65,
                bgcolor: '#fff',
                borderBottom: `1px solid ${epoNotenPalette.border}`,
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: epoNotenPalette.heading, flex: 1, minWidth: 0 }} noWrap>
                {activeCourseName}
              </Typography>
              <Button
                size="small"
                color="warning"
                startIcon={<RestartAltIcon />}
                disabled={saving}
                onClick={() => requestReset(activeCourseGroupId)}
                sx={epoNotenCompactBtnSx}
              >
                Zurücksetzen
              </Button>
              {epoGroupUsesMssPoints(activeCourseName) ? (
                <Chip size="small" label="MSS-Punkte (0–15)" color="primary" variant="outlined" />
              ) : (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={groupMode(activeCourseGroupId)}
                  onChange={(_, v: EpoNotenAssessmentMode | null) => {
                    if (!v) return;
                    void updateGroupAssessmentMode(activeCourseGroupId, v);
                  }}
                  disabled={saving}
                  aria-label="Punkte oder Note"
                  sx={{
                    bgcolor: '#fff',
                    '& .MuiToggleButton-root': {
                      px: 1.5,
                      py: 0.35,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textTransform: 'none',
                    },
                  }}
                >
                  <ToggleButton value="note">Note</ToggleButton>
                  <ToggleButton value="mss">Punkte (MSS)</ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                p: 0.5,
              }}
            >
              <Stack spacing={0.5}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(168px, 200px) minmax(0, 1fr)' },
                    gap: 0.5,
                    alignItems: 'start',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', mb: 0.35, color: 'text.secondary' }}>
                      Schüler
                    </Typography>
                    <List
                      dense
                      sx={{
                        maxHeight: { lg: '38vh', xs: 220 },
                        overflow: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: '#fff',
                        py: 0,
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
                                fontSize: '0.68rem',
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
                            const active = s.studentId === selectedStudentId;
                            const isLastInSection = studentIndex === section.students.length - 1;
                            const isLastSection = sectionIndex === visibleStudentSections.length - 1;
                            const passive = isPassiveStudentId(
                              s.studentId,
                              section.groupId !== '__other__'
                                ? passiveIdsForGroup(section.groupId)
                                : [...allPassiveStudentIds],
                            );
                            const live = isStudentGroupLive(s);
                            const pendingKind = !passive && live ? studentEpoPendingKind(s, true) : null;
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
                                onClick={() => void selectStudent(s.studentId)}
                                sx={{
                                  py: 0.5,
                                  px: 0.5,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  opacity: passive ? 0.42 : 1,
                                  filter: passive ? 'grayscale(0.35)' : undefined,
                                  ...(pendingKind ? epoNotenBitteAusfuellenRowSx : {}),
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
                                  <Chip
                                    size="small"
                                    label={
                                      passive
                                        ? 'Abwesend'
                                        : pendingKind
                                          ? 'Bitte ausfüllen'
                                          : s.studentSubmittedAt
                                            ? '✓'
                                            : '—'
                                    }
                                    sx={{
                                      height: 18,
                                      minWidth: passive || pendingKind ? 72 : 22,
                                      fontSize: '0.58rem',
                                      '& .MuiChip-label': { px: 0.4 },
                                      ...(pendingKind ? epoNotenBitteAusfuellenChipSx : {}),
                                    }}
                                    color={
                                      passive
                                        ? 'default'
                                        : pendingKind
                                          ? 'warning'
                                          : s.studentSubmittedAt
                                            ? 'success'
                                            : 'default'
                                    }
                                    variant={
                                      passive
                                        ? 'outlined'
                                        : pendingKind || s.studentSubmittedAt
                                          ? 'filled'
                                          : 'outlined'
                                    }
                                  />
                                  {gradeLabel ? (
                                    <Typography
                                      sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: s.teacherReleasedAt ? 'success.main' : 'primary.main',
                                        flexShrink: 0,
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
                        {selectedStudent.groupId ? (
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={0.75}
                            flexWrap="wrap"
                            sx={{ mb: 0.25 }}
                          >
                            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
                              {selectedStudent.studentName}
                            </Typography>
                            <Button
                              size="small"
                              variant={
                                isPassiveStudentId(
                                  selectedStudent.studentId,
                                  passiveIdsForGroup(selectedStudent.groupId),
                                )
                                  ? 'contained'
                                  : 'outlined'
                              }
                              color={
                                isPassiveStudentId(
                                  selectedStudent.studentId,
                                  passiveIdsForGroup(selectedStudent.groupId),
                                )
                                  ? 'inherit'
                                  : 'warning'
                              }
                              onClick={() => void toggleSelectedStudentPassive()}
                              disabled={passiveSaving || saving}
                              sx={epoNotenCompactBtnSx}
                            >
                              {passiveSaving
                                ? 'Speichern…'
                                : isPassiveStudentId(
                                      selectedStudent.studentId,
                                      passiveIdsForGroup(selectedStudent.groupId),
                                    )
                                  ? 'Wieder aktiv'
                                  : 'Länger abwesend'}
                            </Button>
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
                            const pending = studentEpoPendingKind(selectedStudent, true);
                            if (!pending) return null;
                            return (
                              <Alert severity="warning" sx={epoNotenBitteAusfuellenAlertSx}>
                                <strong>Bitte ausfüllen</strong> — SuS muss noch{' '}
                                {studentEpoPendingDetail(pending)} abgeben.
                              </Alert>
                            );
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

                        <Box sx={{ position: 'relative', width: '100%' }}>
                            {selectedStudent.teacherReleasedAt && (
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 0.35 }}>
                                Freigegeben — Änderungen sieht der SuS beim nächsten Öffnen.
                              </Typography>
                            )}

                            <EpoNotenCategoryGrid
                              compact
                              teacherEmphasis
                              label={selectedStudent.studentSubmittedAt ? 'Deine Bewertung (lila = SuS)' : 'Deine Bewertung'}
                              categories={teacherCategories}
                              categoryTitles={categoryTitles}
                              categoryWeightsPercent={categoryWeightsPercent}
                              scores={teacherScores}
                              onChange={handleTeacherScoresChange}
                              radioGroupId={selectedStudentId}
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
                              {selectedStudent.groupId &&
                                releasableCountInGroup(selectedStudent.groupId) > 0 && (
                                <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => void releaseAllInGroup(selectedStudent.groupId!)}
                                    disabled={
                                      saving || releasableCountInGroup(selectedStudent.groupId) === 0
                                    }
                                    sx={epoNotenCompactBtnSx}
                                  >
                                    Lerngruppe freigeben ({releasableCountInGroup(selectedStudent.groupId)})
                                  </Button>
                                </Stack>
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
                          <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', mb: 0.35, color: epoNotenPalette.heading }}>
                            Ziele (SuS)
                            {selectedStudent.goalsSubmittedAt ? (
                              <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.65rem', ml: 0.5, color: 'success.main' }}>
                                abgeschickt
                              </Typography>
                            ) : selectedStudent.teacherReleasedAt ? (
                              <Typography component="span" sx={{ fontWeight: 600, fontSize: '0.65rem', ml: 0.5, color: 'text.secondary' }}>
                                · noch offen
                              </Typography>
                            ) : null}
                          </Typography>
                          {!selectedStudent.teacherReleasedAt ? (
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4 }}>
                              Sichtbar, sobald du die Bewertung an den SuS geschickt hast.
                            </Typography>
                          ) : selectedStudent.goalsSubmittedAt ||
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
                          ) : (
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.4 }}>
                              Der SuS hat noch keine Ziele eingetragen.
                            </Typography>
                          )}
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

      <EpoNotenVariantsDialog
        open={variantsOpen}
        onClose={() => setVariantsOpen(false)}
        onChanged={() => {
          void loadVariants();
          if (selectedId) void loadDetail(selectedId);
        }}
      />
    </Stack>
  );
}
