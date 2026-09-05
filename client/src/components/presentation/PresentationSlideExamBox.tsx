/**
 * Prüfung an einer Folie: anhängen/neu anlegen, Start/Öffnen/Lösen,
 * plus Korrektur und Fragen bearbeiten.
 * Dateien liegen im Stundenordner als KA_/KU_/HU_/QZ_*.html.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  fetchLessonFolderLinkableFiles,
  type LessonFolderFsItem,
} from '../../lib/presentationLessonFileLink';
import { isLessonCorrectionFileName } from '../../lib/openLessonFolderFile';
import type { SlideExam } from '../../lib/presentationDeck';
import {
  fetchLessonExamBeacon,
  openExamHtmlInTab,
  startLessonExam,
  stopLessonExam,
  teacherIdFromStorage,
} from '../../lib/lessonExamBeacon';
import { DialogCloseIconButton, dialogCloseTitleSx } from '../ui/dialog-close-icon-button';
import KACorrectionMode from '../KACorrectionMode';

const EXAM_RED = '#c62828';
const EXAM_TYPES = [
  { value: 'KA', label: 'Klassenarbeit', minutes: 60 },
  { value: 'KU', label: 'Kursarbeit', minutes: 90 },
  { value: 'HU', label: 'Hausaufgabenüberprüfung', minutes: 15 },
  { value: 'QZ', label: 'Quiz', minutes: 5 },
] as const;

type ExamType = (typeof EXAM_TYPES)[number]['value'];

function examLabel(name: string): string {
  return (name || '').replace(/\.(html|htm)$/i, '');
}

function examFolderPath(lessonPath: string): string {
  const p = (lessonPath || '').replace(/\\/g, '/').replace(/\/$/, '');
  if (p.startsWith('git-intern/')) return p;
  if (p.startsWith('J-M-Reihen/')) return `git-intern/${p.slice('J-M-Reihen/'.length)}`;
  return p;
}

type ExamQuestion = {
  taskNumber: number;
  questionText: string;
  questionType: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
};

type Props = {
  exam?: SlideExam;
  lessonPath?: string;
  groupId?: string;
  onChange?: (next: SlideExam | undefined) => void;
  /** Rechter Teil des Doppelbuttons: Übung an diese Folie hängen. */
  onAttachInteractiveExercise?: () => void;
  hasInteractiveExercise?: boolean;
  onMessage?: (text: string) => void;
  compact?: boolean;
};

const headerBtnSx = {
  minWidth: 0,
  height: 24,
  px: 0.85,
  py: 0,
  fontSize: '0.62rem',
  fontWeight: 800,
  lineHeight: 1,
  textTransform: 'none' as const,
  color: '#fff',
  borderColor: 'rgba(255,255,255,0.35)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.55)' },
  '&.Mui-disabled': { color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.18)' },
};

const PresentationSlideExamBox: React.FC<Props> = ({
  exam,
  lessonPath,
  groupId,
  onChange,
  onAttachInteractiveExercise,
  hasInteractiveExercise = false,
  onMessage,
  compact = true,
}) => {
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const [examFiles, setExamFiles] = useState<LessonFolderFsItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runningPath, setRunningPath] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<ExamType>('HU');
  const [newName, setNewName] = useState('');
  const [newMinutes, setNewMinutes] = useState(15);
  const [creating, setCreating] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [pickedGroupId, setPickedGroupId] = useState('');
  const [groupPickOpen, setGroupPickOpen] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const canEdit = typeof onChange === 'function';
  const gid = (pickedGroupId || groupId || '').trim();
  const examPath = (exam?.path || '').replace(/\\/g, '/');
  const isRunning = Boolean(runningPath && examPath && runningPath === examPath);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const loginCode = localStorage.getItem('loginCode') || '';
      const res = await fetch('/api/learning-groups', {
        headers: { 'Content-Type': 'application/json', 'x-login-code': loginCode },
      });
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = (await res.json()) as Array<{ id?: string; name?: string }>;
      setGroups(
        (Array.isArray(data) ? data : [])
          .filter((g) => g.id)
          .map((g) => ({ id: String(g.id), name: g.name || 'Lerngruppe' })),
      );
    } catch {
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const loadExamFiles = useCallback(async () => {
    if (!lessonPath) {
      setExamFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const all = await fetchLessonFolderLinkableFiles(lessonPath);
      setExamFiles(
        all.filter((f) => /\.(html|htm)$/i.test(f.name) && isLessonCorrectionFileName(f.name)),
      );
    } catch {
      setExamFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [lessonPath]);

  useEffect(() => {
    if (addAnchor) void loadExamFiles();
  }, [addAnchor, loadExamFiles]);

  useEffect(() => {
    if (!gid) {
      setRunningPath(null);
      return undefined;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchLessonExamBeacon(gid);
        if (cancelled) return;
        setRunningPath(status.active && status.filePath ? status.filePath.replace(/\\/g, '/') : null);
      } catch {
        /* ignore */
      }
    };
    void poll();
    const t = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [gid]);

  const attach = (file: { path: string; name: string }) => {
    onChange?.({ path: file.path.replace(/\\/g, '/'), name: file.name });
    setAddAnchor(null);
    onMessage?.(`Prüfung „${examLabel(file.name)}“ an diese Folie gehängt`);
  };

  const startForGroup = async (groupIdToUse: string) => {
    if (!examPath) return;
    const teacherId = teacherIdFromStorage();
    if (!teacherId) {
      onMessage?.('Bitte zuerst anmelden.');
      return;
    }
    const useGid = groupIdToUse.trim();
    if (!useGid) {
      await loadGroups();
      setGroupPickOpen(true);
      return;
    }
    setBusy(true);
    try {
      if (isRunning && gid === useGid) {
        await stopLessonExam({ teacherId, groupId: useGid });
        setRunningPath(null);
        onMessage?.('Prüfung beendet');
      } else {
        const started = await startLessonExam({
          teacherId,
          groupId: useGid,
          filePath: examPath,
          lessonPath,
        });
        setPickedGroupId(useGid);
        setRunningPath((started.filePath || examPath).replace(/\\/g, '/'));
        onMessage?.('Prüfung gestartet — SuS der Lerngruppe sehen Vollbild');
      }
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : 'Prüfung Start/Stop fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const toggleRun = async () => {
    if (isRunning) {
      await startForGroup(gid);
      return;
    }
    await startForGroup(gid);
  };

  const createExam = async () => {
    const name = newName.trim();
    const folder = examFolderPath(lessonPath || '');
    if (!name || !folder) {
      onMessage?.('Name und Stundenordner werden gebraucht.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/file-system-paths/create-examination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType: newType,
          fileName: name,
          folderPath: folder,
          title: name,
          durationMinutes: newMinutes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fileName?: string;
        filePath?: string;
        absolutePath?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Prüfung konnte nicht erstellt werden');
      const createdName = data.fileName || `${newType}_${name}.html`;
      const createdPath = data.absolutePath || data.filePath || '';
      if (!createdPath) throw new Error('Keine Datei zurückgegeben');
      attach({ path: createdPath, name: createdName });
      setCreateOpen(false);
      setNewName('');
      onMessage?.(`Prüfung „${examLabel(createdName)}“ erstellt und angehängt`);
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : 'Erstellen fehlgeschlagen');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = async () => {
    if (!examPath) return;
    setEditOpen(true);
    setEditingQuestion(null);
    setLoadingQuestions(true);
    try {
      const res = await fetch(
        `/api/file-system-paths/get-examination-questions?filePath=${encodeURIComponent(examPath)}`,
      );
      if (!res.ok) throw new Error('Fragen konnten nicht geladen werden');
      const data = (await res.json()) as { questions?: ExamQuestion[]; title?: string };
      setQuestions(data.questions || []);
      setExamTitle(data.title || examLabel(exam?.name || ''));
    } catch (e) {
      setQuestions([]);
      onMessage?.(e instanceof Error ? e.message : 'Fragen laden fehlgeschlagen');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const saveQuestion = async () => {
    if (!editingQuestion || !examPath) return;
    setSavingQuestion(true);
    try {
      const res = await fetch('/api/file-system-paths/update-single-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: examPath,
          taskNumber: editingQuestion.taskNumber,
          questionText: editingQuestion.questionText,
          questionType: editingQuestion.questionType,
          options: editingQuestion.options || [],
          correctAnswer: editingQuestion.correctAnswer || '',
          explanation: editingQuestion.explanation || '',
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Speichern fehlgeschlagen');
      }
      setQuestions((prev) =>
        prev.map((q) => (q.taskNumber === editingQuestion.taskNumber ? editingQuestion : q)),
      );
      setEditingQuestion(null);
      onMessage?.('Frage gespeichert');
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSavingQuestion(false);
    }
  };

  if (!exam && !canEdit) return null;

  const openCreate = () => {
    setAddAnchor(null);
    setNewType('HU');
    setNewMinutes(15);
    setNewName('');
    setCreateOpen(true);
  };

  const addMenu = (
    <Menu
      anchorEl={addAnchor}
      open={Boolean(addAnchor)}
      onClose={() => setAddAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <MenuItem onClick={openCreate} sx={{ fontWeight: 800, color: EXAM_RED }}>
        Neue Prüfung erstellen…
      </MenuItem>
      <Divider />
      <MenuItem disabled sx={{ opacity: 1, fontSize: '0.72rem', whiteSpace: 'normal', maxWidth: 280 }}>
        Vorhandene Dateien aus diesem Stundenordner (KA_/KU_/HU_/QZ_)
      </MenuItem>
      {loadingFiles ? (
        <MenuItem disabled>Lade Prüfungsdateien…</MenuItem>
      ) : examFiles.length === 0 ? (
        <MenuItem disabled>Noch keine Prüfungs-HTML hier</MenuItem>
      ) : (
        examFiles.map((f) => (
          <MenuItem key={f.path} onClick={() => attach(f)}>
            {examLabel(f.name)}
          </MenuItem>
        ))
      )}
    </Menu>
  );

  const createDialog = (
    <Dialog
      open={createOpen}
      onClose={() => !creating && setCreateOpen(false)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ ...dialogCloseTitleSx, bgcolor: EXAM_RED, color: '#fff' }}>
        Neue Prüfung
        <DialogCloseIconButton
          onClose={() => setCreateOpen(false)}
          disabled={creating}
          sx={{ color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          iconSx={{ color: '#fff' }}
        />
      </DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Wird im aktuellen Stundenordner als HTML angelegt (KA_/KU_/HU_/QZ_) und an diese Folie
          gehängt.
        </Typography>
        <FormGroup row sx={{ gap: 0.5 }}>
          {EXAM_TYPES.map((opt) => (
            <FormControlLabel
              key={opt.value}
              control={
                <Checkbox
                  size="small"
                  checked={newType === opt.value}
                  onChange={() => {
                    setNewType(opt.value);
                    setNewMinutes(opt.minutes);
                  }}
                />
              }
              label={opt.label}
              sx={{ mr: 0.5, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
            />
          ))}
        </FormGroup>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Name (ohne Präfix)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="z. B. binaer-und-roemische-zahlen"
          helperText={`Datei wird ${newType}_${newName.trim() || '…'}.html`}
        />
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Zeit (Minuten)"
          value={newMinutes}
          onChange={(e) => setNewMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
          inputProps={{ min: 1, step: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateOpen(false)} disabled={creating}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          disabled={creating || !newName.trim() || !lessonPath}
          onClick={() => void createExam()}
          sx={{ bgcolor: EXAM_RED, '&:hover': { bgcolor: '#b71c1c' } }}
        >
          {creating ? <CircularProgress size={16} color="inherit" /> : 'Erstellen'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const correctionDialog = (
    <Dialog
      open={correctionOpen}
      onClose={() => setCorrectionOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogContent sx={{ p: 0 }}>
        {correctionOpen && examPath ? (
          <KACorrectionMode kaFilePath={examPath} onClose={() => setCorrectionOpen(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );

  const editDialog = (
    <Dialog open={editOpen} onClose={() => !savingQuestion && setEditOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={dialogCloseTitleSx}>
        Fragen bearbeiten
        <DialogCloseIconButton onClose={() => setEditOpen(false)} disabled={savingQuestion} />
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {loadingQuestions ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 3 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">Lade Fragen…</Typography>
          </Box>
        ) : questions.length === 0 ? null : editingQuestion ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 0.5 }}>
            <Typography variant="subtitle2">Aufgabe {editingQuestion.taskNumber}</Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Fragentext"
              value={editingQuestion.questionText}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
              }
            />
            {editingQuestion.questionType === 'multiple-choice' ? (
              <TextField
                fullWidth
                label="Richtige Antwort"
                value={editingQuestion.correctAnswer || ''}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })
                }
              />
            ) : null}
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Erklärung"
              value={editingQuestion.explanation || ''}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
              }
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5 }}>
            {examTitle ? (
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {examTitle}
              </Typography>
            ) : null}
            {questions.map((q) => (
              <Button
                key={q.taskNumber}
                onClick={() => setEditingQuestion(q)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: '#333',
                  border: '1px solid #eee',
                }}
              >
                Aufgabe {q.taskNumber}
                {q.questionText ? ` — ${q.questionText.slice(0, 48)}` : ''}
              </Button>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {editingQuestion ? (
          <>
            <Button onClick={() => setEditingQuestion(null)} disabled={savingQuestion}>
              Zurück
            </Button>
            <Button variant="contained" onClick={() => void saveQuestion()} disabled={savingQuestion}>
              {savingQuestion ? <CircularProgress size={16} color="inherit" /> : 'Speichern'}
            </Button>
          </>
        ) : (
          <Button onClick={() => setEditOpen(false)}>Schließen</Button>
        )}
      </DialogActions>
    </Dialog>
  );

  if (!exam) {
    const exerciseAccent = '#F9A825';
    return (
      <Box data-pres-exam-box="1" sx={{ flexShrink: 0, mx: compact ? 0.85 : 0, mt: 0.15, mb: 0.25 }}>
        <ButtonGroup
          size="small"
          variant="text"
          sx={{
            '& .MuiButtonGroup-grouped': {
              minWidth: 0,
              height: 26,
              px: 0.55,
              fontSize: '0.62rem',
              fontWeight: 800,
              textTransform: 'none',
              lineHeight: 1.1,
            },
          }}
        >
          <Button
            onClick={(e) => {
              setLoadingFiles(true);
              setAddAnchor(e.currentTarget);
            }}
            sx={{
              color: EXAM_RED,
              '&:hover': { bgcolor: '#ffebee' },
            }}
          >
            Prüfung an diese Folie
          </Button>
          {onAttachInteractiveExercise ? (
            <Button
              disabled={hasInteractiveExercise}
              onClick={() => onAttachInteractiveExercise()}
              title={
                hasInteractiveExercise
                  ? 'Interaktive Übung ist bereits angebunden'
                  : 'Interaktive Übung an diese Folie'
              }
              sx={{
                color: hasInteractiveExercise ? alpha(exerciseAccent, 0.45) : '#E65100',
                bgcolor: alpha(exerciseAccent, hasInteractiveExercise ? 0.12 : 0.28),
                borderLeft: `1px solid ${alpha(exerciseAccent, 0.55)} !important`,
                '&:hover': {
                  bgcolor: alpha(exerciseAccent, 0.42),
                },
                '&.Mui-disabled': {
                  color: alpha('#E65100', 0.4),
                  bgcolor: alpha(exerciseAccent, 0.1),
                },
              }}
            >
              Interaktive Übung an diese Folie
            </Button>
          ) : null}
        </ButtonGroup>
        {addMenu}
        {createDialog}
      </Box>
    );
  }

  return (
    <Box
      data-pres-exam-box="1"
      sx={{
        flexShrink: 0,
        borderRadius: compact ? 1.5 : 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(EXAM_RED, 0.45)}`,
        background: `linear-gradient(180deg, ${alpha('#ef5350', 0.22)} 0%, ${alpha('#ffebee', 0.96)} 38%, #fff5f5 100%)`,
        mx: compact ? 0.85 : 0,
        mt: compact ? 0.15 : 0,
        mb: compact ? 0.35 : 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.7,
          py: 0.45,
          bgcolor: alpha(EXAM_RED, 0.92),
          color: '#fff',
        }}
      >
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: 0.4,
            bgcolor: 'rgba(255,255,255,0.22)',
            fontSize: 9,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          P
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
          <ButtonGroup
            size="small"
            variant="outlined"
            sx={{
              width: '100%',
              '& .MuiButtonGroup-grouped': { minWidth: 0, flex: 1 },
            }}
          >
            <Button
              disabled={busy}
              onClick={() => void toggleRun()}
              title={isRunning ? 'Prüfung beenden' : 'Prüfung starten (Vollbild bei SuS)'}
              sx={{
                ...headerBtnSx,
                ...(isRunning
                  ? { bgcolor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.5)' }
                  : {}),
              }}
            >
              {busy ? <CircularProgress size={11} color="inherit" /> : isRunning ? 'STOP' : 'START'}
            </Button>
            <Button onClick={() => openExamHtmlInTab(exam.path)} sx={headerBtnSx}>
              Öffnen
            </Button>
            {canEdit ? (
              <Button
                onClick={() => {
                  onChange?.(undefined);
                  onMessage?.('Prüfung von dieser Folie gelöst');
                }}
                sx={headerBtnSx}
              >
                Lösen
              </Button>
            ) : null}
          </ButtonGroup>
          <ButtonGroup
            size="small"
            variant="outlined"
            sx={{
              width: '100%',
              '& .MuiButtonGroup-grouped': { minWidth: 0, flex: 1 },
            }}
          >
            <Button onClick={() => setCorrectionOpen(true)} sx={headerBtnSx}>
              Korrektur
            </Button>
            <Button onClick={() => void openEdit()} sx={headerBtnSx}>
              Bearbeiten
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      <Box sx={{ px: 0.85, py: 0.5 }}>
        <Typography
          sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#5d1a1a', lineHeight: 1.25 }}
          noWrap
          title={exam.name}
        >
          {examLabel(exam.name)}
        </Typography>
      </Box>
      {createDialog}
      {correctionDialog}
      {editDialog}
      <Dialog
        open={groupPickOpen}
        onClose={() => setGroupPickOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={dialogCloseTitleSx}>
          Lerngruppe
          <DialogCloseIconButton onClose={() => setGroupPickOpen(false)} />
        </DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {loadingGroups ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={18} />
            </Box>
          ) : groups.length === 0 ? (
            <Typography variant="body2">Keine Lerngruppe gefunden.</Typography>
          ) : (
            groups.map((g) => (
              <Button
                key={g.id}
                onClick={() => {
                  setGroupPickOpen(false);
                  void startForGroup(g.id);
                }}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {g.name}
              </Button>
            ))
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PresentationSlideExamBox;
