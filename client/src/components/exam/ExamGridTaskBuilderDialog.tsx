import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PostAddIcon from '@mui/icons-material/PostAdd';
import GridOnIcon from '@mui/icons-material/GridOn';
import ExamVersionTabsBar from './ExamVersionTabsBar';
import GridTaskEditorPanel from './GridTaskEditorPanel';
import {
  createBlankExamGridTask,
  demoNatuerlicheZahlenTask1,
  buildExamGridTaskHtml,
  type ExamGridTaskSpec,
} from '../../lib/examGridTaskBuilder';
import { loadGridTaskSpecsFromExamHtml } from '../../lib/loadGridTaskSpecsFromExamHtml';

type Props = {
  open: boolean;
  filePath: string;
  initialTaskNumber?: number;
  existingTaskNumbers?: number[];
  onClose: () => void;
  onSaved: () => void;
  onNotify?: (message: string, severity: 'success' | 'error') => void;
};

function nextTaskNumberFromSpecs(specs: ExamGridTaskSpec[], extra: number[] | undefined): number {
  const nums = new Set([
    ...specs.map((s) => s.taskNumber),
    ...(extra || []).map((n) => Number(n) || 0),
  ]);
  return Math.max(0, ...nums) + 1;
}

const TASK_OUTER_SX = {
  border: '3px solid #1565c0',
  borderRadius: 2,
  p: 2,
  mb: 3,
  bgcolor: '#f8fbff',
  boxShadow: '0 2px 8px rgba(21, 101, 192, 0.12)',
};

const compactIconBtnSx = {
  p: 0,
  minWidth: 28,
  width: 28,
  height: 28,
};

export default function ExamGridTaskBuilderDialog({
  open,
  filePath,
  initialTaskNumber = 1,
  existingTaskNumbers,
  onClose,
  onSaved,
  onNotify,
}: Props) {
  const [specs, setSpecs] = useState<ExamGridTaskSpec[]>(() => [
    createBlankExamGridTask(initialTaskNumber),
  ]);
  const [activeFilePath, setActiveFilePath] = useState(filePath);
  const [previewOpenByTask, setPreviewOpenByTask] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedKeyRef = React.useRef('');

  React.useEffect(() => {
    if (open) setActiveFilePath(filePath);
  }, [open, filePath]);

  React.useEffect(() => {
    if (!open) {
      loadedKeyRef.current = '';
      return;
    }

    const loadKey = `${activeFilePath}|${initialTaskNumber}`;
    if (loadedKeyRef.current === loadKey) return;
    loadedKeyRef.current = loadKey;
    setError(null);
    setPreviewOpenByTask({});

    if (!activeFilePath) {
      setSpecs([createBlankExamGridTask(initialTaskNumber)]);
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(activeFilePath)}`,
        );
        if (!res.ok) throw new Error('Prüfungsdatei konnte nicht geladen werden');
        const html = await res.text();
        setSpecs(loadGridTaskSpecsFromExamHtml(html, initialTaskNumber));
      } catch {
        setSpecs([{ ...demoNatuerlicheZahlenTask1(), taskNumber: initialTaskNumber }]);
        setError('Gespeicherte Aufgabe konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, activeFilePath, initialTaskNumber]);

  const persistSpec = async (
    specToSave: ExamGridTaskSpec,
    builtPayload: ReturnType<typeof buildExamGridTaskHtml>,
  ) => {
    if (!activeFilePath) return false;
    const fieldCount = Object.keys(builtPayload.correctAnswers).length;
    const res = await fetch('/api/file-system-paths/upsert-examination-grid-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: activeFilePath,
        taskNumber: specToSave.taskNumber,
        taskHtml: builtPayload.taskHtml,
        correctAnswers: builtPayload.correctAnswers,
        totalPoints: Math.max(specToSave.points, fieldCount),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data.details ? `: ${data.details}` : '';
      throw new Error((data.error || 'Speichern fehlgeschlagen') + detail);
    }
    return true;
  };

  const save = async () => {
    if (!activeFilePath) {
      const msg = 'Keine Prüfungsdatei gewählt.';
      setError(msg);
      onNotify?.(msg, 'error');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const s of specs) {
        await persistSpec(s, buildExamGridTaskHtml(s));
      }
      onNotify?.(
        specs.length === 1
          ? `Aufgabe ${specs[0].taskNumber} gespeichert.`
          : `${specs.length} Aufgaben gespeichert.`,
        'success',
      );
      onSaved();
      loadedKeyRef.current = '';
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
      setError(msg);
      onNotify?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addAufgabe = () => {
    const next = nextTaskNumberFromSpecs(specs, existingTaskNumbers);
    setSpecs((prev) => [...prev, createBlankExamGridTask(next)]);
  };

  const applyDemoToFirst = () => {
    setSpecs((prev) => {
      if (!prev.length) return [{ ...demoNatuerlicheZahlenTask1(), taskNumber: initialTaskNumber }];
      return prev.map((s, i) =>
        i === 0 ? { ...demoNatuerlicheZahlenTask1(), taskNumber: s.taskNumber } : s,
      );
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: '96vh', sm: '90vh' },
          maxHeight: '96vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          position: 'relative',
          pr: 5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          flexShrink: 0,
          pb: 1.25,
        }}
      >
        <GridOnIcon color="primary" sx={{ fontSize: 22 }} />
        <Typography component="span" variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
          2×2 Raster
        </Typography>
        <Button
          size="small"
          variant="outlined"
          disabled={loading || saving}
          onClick={applyDemoToFirst}
          sx={{
            minWidth: 0,
            width: 'auto',
            minHeight: 24,
            height: 24,
            py: 0,
            px: 0.5,
            fontSize: '0.62rem',
            lineHeight: 1,
            textTransform: 'none',
            flexShrink: 0,
          }}
        >
          Beispiel
        </Button>
        {activeFilePath ? (
          <Tooltip title="Prüfung öffnen">
            <IconButton
              size="small"
              onClick={() =>
                window.open(
                  `/api/file-system-paths/read-html?filePath=${encodeURIComponent(activeFilePath)}`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
              aria-label="Prüfung öffnen"
              sx={{ position: 'absolute', top: 4, right: 4, ...compactIconBtnSx }}
            >
              <OpenInNewIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            px: 3,
            py: 2,
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={22} />
              <Typography variant="body2">Lade Aufgaben…</Typography>
            </Box>
          ) : null}
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}
          {activeFilePath ? (
            <ExamVersionTabsBar
              compact
              filePath={activeFilePath}
              disabled={loading || saving}
              onActiveFilePathChange={(path) => {
                setActiveFilePath(path);
                loadedKeyRef.current = '';
              }}
            />
          ) : null}

          {specs.map((spec, taskIdx) => (
            <Box key={`task-${spec.taskNumber}-${taskIdx}`} sx={TASK_OUTER_SX}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, color: '#1565c0', mb: 1.5, fontSize: '1rem' }}
              >
                Aufgabe {spec.taskNumber}
              </Typography>
              <GridTaskEditorPanel
                spec={spec}
                onChange={(next) =>
                  setSpecs((prev) => prev.map((s, i) => (i === taskIdx ? next : s)))
                }
                previewExpanded={Boolean(previewOpenByTask[taskIdx])}
                onTogglePreview={() =>
                  setPreviewOpenByTask((prev) => ({ ...prev, [taskIdx]: !prev[taskIdx] }))
                }
              />
            </Box>
          ))}

          <Button
            startIcon={<PostAddIcon />}
            variant="outlined"
            color="secondary"
            disabled={saving || !activeFilePath}
            onClick={addAufgabe}
            sx={{ mb: 1 }}
          >
            Aufgabe hinzufügen
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexShrink: 0 }}>
        <Button onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving || loading || !activeFilePath}>
          {saving ? 'Speichern…' : 'In Prüfung speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
