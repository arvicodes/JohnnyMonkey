import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { fetchFsDirectory, fsDirectoryChildren } from '../../lib/fsTreeCache';
import { buildExamStartPayload } from '../../lib/examStartConfig';
import { examBaseGitPath } from '../../lib/examVersionPaths';
import { startLessonExam, teacherIdFromStorage } from '../../lib/lessonExamBeacon';
import {
  ExamStartAdvancedSection,
  useExamStartAdvancedState,
} from '../dashboard/ExamStartDialogContent';

type SickStudent = { id: string; name: string };

type MakeupExamStartDialogProps = {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  kaFilePath: string;
  sickStudents: SickStudent[];
  onStarted: () => void;
};

function isExamVariantFile(name: string): boolean {
  return /__[A-Z]\.html?$/i.test(name || '');
}

function isExamHtmlName(name: string): boolean {
  return /^(KA|QZ|HU|HÜ|HÜ)_/i.test(name || '');
}

export default function MakeupExamStartDialog({
  open,
  onClose,
  groupId,
  groupName,
  kaFilePath,
  sickStudents,
  onStarted,
}: MakeupExamStartDialogProps) {
  const [examOptions, setExamOptions] = useState<Array<{ path: string; name: string }>>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sickIds = useMemo(() => sickStudents.map((s) => s.id), [sickStudents]);
  const advanced = useExamStartAdvancedState(groupId ? [groupId] : []);

  const lessonFolder = useMemo(() => {
    const p = (kaFilePath || '').replace(/\\/g, '/').trim();
    const slash = p.lastIndexOf('/');
    return slash >= 0 ? p.slice(0, slash) : p;
  }, [kaFilePath]);

  useEffect(() => {
    if (!open) return;
    const base = examBaseGitPath(kaFilePath);
    setSelectedPath(base || kaFilePath);
    setError(null);
  }, [open, kaFilePath]);

  useEffect(() => {
    if (!open || !lessonFolder) return;
    let cancelled = false;
    setLoadingExams(true);
    void fetchFsDirectory(lessonFolder)
      .then((root) => {
        if (cancelled) return;
        const children = fsDirectoryChildren(root);
        const opts = children
          .filter((n) => n.type === 'file' && n.name && /\.html?$/i.test(n.name))
          .filter((n) => isExamHtmlName(n.name!) && !isExamVariantFile(n.name!))
          .map((n) => {
            const name = n.name || '';
            const path = (n.path || `${lessonFolder}/${name}`).replace(/\\/g, '/');
            return { path, name };
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'de'));
        setExamOptions(opts.length ? opts : [{ path: examBaseGitPath(kaFilePath), name: kaFilePath.split('/').pop() || 'Prüfung' }]);
      })
      .catch(() => {
        if (!cancelled) {
          setExamOptions([{ path: examBaseGitPath(kaFilePath), name: kaFilePath.split('/').pop() || 'Prüfung' }]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExams(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, lessonFolder, kaFilePath]);

  useEffect(() => {
    if (!open || !groupId || !sickIds.length) return;
    advanced.patchGroupConfig(groupId, { studentIds: sickIds, versionCount: 1 });
  }, [open, groupId, sickIds.join('|')]);

  const startMakeup = useCallback(async () => {
    if (!groupId || !selectedPath || !sickIds.length) return;
    setBusy(true);
    setError(null);
    try {
      const teacherId = teacherIdFromStorage();
      if (!teacherId) throw new Error('Bitte zuerst anmelden.');
      const perGroup = advanced.buildConfigForStart();
      const cfg = perGroup[groupId] || {};
      perGroup[groupId] = {
        ...cfg,
        studentIds: sickIds,
        makeupSession: true,
      };
      const examConfig = buildExamStartPayload([groupId], perGroup);
      await startLessonExam({
        teacherId,
        groupIds: [groupId],
        filePath: selectedPath,
        lessonPath: lessonFolder,
        examConfig,
      });
      onStarted();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Start fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }, [groupId, selectedPath, sickIds, advanced, lessonFolder, onStarted, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nachschrift starten</DialogTitle>
      <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Nur für kranke SuS in <strong>{groupName}</strong>. Sie sehen die Prüfung wie beim
          normalen Start (Version wählbar) und können abgeben; danach korrigierst du hier — gelber
          Krank-Rand bleibt, die Note wird angezeigt.
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Krank ({sickStudents.length}):{' '}
          {sickStudents.map((s) => s.name).join(', ') || '—'}
        </Typography>
        {loadingExams ? (
          <CircularProgress size={22} sx={{ alignSelf: 'center', my: 1 }} />
        ) : (
          <FormControl size="small" fullWidth>
            <InputLabel id="makeup-exam-select-label">Prüfung</InputLabel>
            <Select
              labelId="makeup-exam-select-label"
              label="Prüfung"
              value={selectedPath}
              onChange={(e) => setSelectedPath(String(e.target.value))}
            >
              {examOptions.map((o) => (
                <MenuItem key={o.path} value={o.path}>
                  {o.name.replace(/\.html?$/i, '')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {groupId ? (
          <ExamStartAdvancedSection
            groups={[{ id: groupId, name: groupName }]}
            selectedGroupIds={[groupId]}
            advanced={advanced}
          />
        ) : null}
        {error ? (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Abbrechen</Button>
        <Button
          variant="contained"
          disabled={busy || !selectedPath || !sickIds.length}
          onClick={() => void startMakeup()}
          sx={{ bgcolor: '#f9a825', color: '#1a1a1a', '&:hover': { bgcolor: '#f57f17', color: '#fff' } }}
        >
          {busy ? 'Startet…' : 'Nachschrift starten'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
