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
import { examBaseGitPath, examFamilyKey } from '../../lib/examVersionPaths';

type Props = {
  open: boolean;
  filePath: string;
  initialTaskNumber?: number;
  existingTaskNumbers?: number[];
  onClose: () => void;
  onSaved: () => void;
  onNotify?: (message: string, severity: 'success' | 'error') => void;
  /** Gleicher Pfad wie im Fragen-Dialog — bleibt beim Versionswechsel synchron. */
  onActiveFilePathChange?: (path: string, letter: string) => void;
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

/** Schmale farbige Aufgaben-Tabs (1, 2, 3 …) */
const TASK_TAB_PALETTE = [
  { bg: '#dbeafe', border: '#2563eb', on: '#1d4ed8', fg: '#1e3a8a' },
  { bg: '#ede9fe', border: '#7c3aed', on: '#6d28d9', fg: '#4c1d95' },
  { bg: '#d1fae5', border: '#059669', on: '#047857', fg: '#065f46' },
  { bg: '#ffedd5', border: '#ea580c', on: '#c2410c', fg: '#9a3412' },
  { bg: '#fce7f3', border: '#db2777', on: '#be185d', fg: '#9d174d' },
  { bg: '#cffafe', border: '#0891b2', on: '#0e7490', fg: '#155e75' },
];

export default function ExamGridTaskBuilderDialog({
  open,
  filePath,
  initialTaskNumber = 1,
  existingTaskNumbers,
  onClose,
  onSaved,
  onNotify,
  onActiveFilePathChange,
}: Props) {
  const [specs, setSpecs] = useState<ExamGridTaskSpec[]>(() => [
    createBlankExamGridTask(initialTaskNumber),
  ]);
  const [activeFilePath, setActiveFilePath] = useState(filePath);
  const [previewOpenByTask, setPreviewOpenByTask] = useState<Record<number, boolean>>({});
  const [activeTaskTab, setActiveTaskTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedKeyRef = React.useRef('');
  const loadGenerationRef = React.useRef(0);
  const specsDraftByPathRef = React.useRef<Record<string, ExamGridTaskSpec[]>>({});
  const specsRef = React.useRef(specs);
  specsRef.current = specs;

  const versionMetaPath = React.useMemo(() => examBaseGitPath(filePath), [filePath]);
  const openFamilyRef = React.useRef('');

  React.useEffect(() => {
    if (!open) {
      openFamilyRef.current = '';
      return;
    }
    const family = examFamilyKey(filePath);
    if (openFamilyRef.current !== family) {
      openFamilyRef.current = family;
      specsDraftByPathRef.current = {};
      loadedKeyRef.current = '';
      loadGenerationRef.current += 1;
    }
    setActiveFilePath(filePath);
  }, [open, filePath]);

  const handleVersionPathChange = React.useCallback(
    (path: string, letter: string) => {
      setActiveFilePath((prevPath) => {
        if (prevPath && prevPath !== path) {
          specsDraftByPathRef.current[prevPath] = specsRef.current;
        }
        loadedKeyRef.current = '';
        loadGenerationRef.current += 1;
        return path;
      });
      onActiveFilePathChange?.(path, letter);
    },
    [onActiveFilePathChange],
  );

  React.useEffect(() => {
    if (!open) {
      loadedKeyRef.current = '';
      return;
    }

    const loadKey = `${activeFilePath}|${initialTaskNumber}`;
    if (loadedKeyRef.current === loadKey) return;

    const cached = specsDraftByPathRef.current[activeFilePath];
    if (cached?.length) {
      loadedKeyRef.current = loadKey;
      setSpecs(cached);
      setPreviewOpenByTask({});
      return;
    }

    if (!activeFilePath) {
      setSpecs([createBlankExamGridTask(initialTaskNumber)]);
      return;
    }

    const generation = ++loadGenerationRef.current;
    setError(null);
    setPreviewOpenByTask({});
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(activeFilePath)}`,
        );
        if (!res.ok) throw new Error('Prüfungsdatei konnte nicht geladen werden');
        const html = await res.text();
        if (generation !== loadGenerationRef.current) return;
        const loaded = loadGridTaskSpecsFromExamHtml(html, initialTaskNumber);
        loadedKeyRef.current = loadKey;
        setSpecs(loaded);
        setActiveTaskTab(0);
        specsDraftByPathRef.current[activeFilePath] = loaded;
      } catch {
        if (generation !== loadGenerationRef.current) return;
        const fallback = [{ ...demoNatuerlicheZahlenTask1(), taskNumber: initialTaskNumber }];
        loadedKeyRef.current = loadKey;
        setSpecs(fallback);
        setError('Gespeicherte Aufgabe konnte nicht geladen werden.');
      } finally {
        if (generation === loadGenerationRef.current) setLoading(false);
      }
    })();
  }, [open, activeFilePath, initialTaskNumber]);

  React.useEffect(() => {
    if (activeFilePath && specs.length) {
      specsDraftByPathRef.current[activeFilePath] = specs;
    }
  }, [specs, activeFilePath]);

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
      delete specsDraftByPathRef.current[activeFilePath];
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
    setSpecs((prev) => {
      const nextSpecs = [...prev, createBlankExamGridTask(next)];
      setActiveTaskTab(nextSpecs.length - 1);
      return nextSpecs;
    });
  };

  React.useEffect(() => {
    if (activeTaskTab >= specs.length) {
      setActiveTaskTab(Math.max(0, specs.length - 1));
    }
  }, [activeTaskTab, specs.length]);

  const insertDemoExample = () => {
    const next = nextTaskNumberFromSpecs(specs, existingTaskNumbers);
    setSpecs((prev) => [...prev, { ...demoNatuerlicheZahlenTask1(), taskNumber: next }]);
    onNotify?.(`Beispiel als Aufgabe ${next} eingefügt — deine bisherigen Aufgaben bleiben unverändert.`, 'success');
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
        <Tooltip title="Beispiel als neue Aufgabe einfügen (bestehende bleiben)">
          <Button
            size="small"
            variant="outlined"
            disabled={loading || saving}
            onClick={insertDemoExample}
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
        </Tooltip>
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
              filePath={versionMetaPath}
              activeVariantPath={activeFilePath}
              disabled={loading || saving}
              onActiveFilePathChange={handleVersionPathChange}
            />
          ) : null}

          {specs.length > 0 ? (
            <Box
              role="tablist"
              aria-label="Aufgaben"
              sx={{
                display: 'inline-flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: '3px',
                mb: 1,
                py: 0.25,
              }}
            >
              {specs.map((s, i) => {
                const pal = TASK_TAB_PALETTE[i % TASK_TAB_PALETTE.length];
                const active = activeTaskTab === i;
                return (
                  <Tooltip key={`tab-${s.taskNumber}-${i}`} title={`Aufgabe ${s.taskNumber}`}>
                    <Box
                      component="button"
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={`Aufgabe ${s.taskNumber}`}
                      onClick={() => setActiveTaskTab(i)}
                      sx={{
                        flex: '0 0 auto',
                        width: 20,
                        minWidth: 20,
                        height: 20,
                        p: 0,
                        m: 0,
                        border: `1.5px solid ${active ? pal.on : pal.border}`,
                        borderRadius: '3px',
                        bgcolor: active ? pal.on : pal.bg,
                        color: active ? '#fff' : pal.fg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        lineHeight: 1,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: active ? `0 0 0 1px ${pal.on}40` : 'none',
                        '&:hover': {
                          bgcolor: active ? pal.on : pal.bg,
                          filter: active ? 'brightness(1.05)' : 'brightness(0.97)',
                        },
                      }}
                    >
                      {s.taskNumber}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ) : null}

          {specs[activeTaskTab] ? (
            <Box key={`task-${specs[activeTaskTab].taskNumber}-${activeTaskTab}`} sx={TASK_OUTER_SX}>
              <GridTaskEditorPanel
                spec={specs[activeTaskTab]}
                onChange={(next) =>
                  setSpecs((prev) => prev.map((s, i) => (i === activeTaskTab ? next : s)))
                }
                previewExpanded={Boolean(previewOpenByTask[activeTaskTab])}
                onTogglePreview={() =>
                  setPreviewOpenByTask((prev) => ({
                    ...prev,
                    [activeTaskTab]: !prev[activeTaskTab],
                  }))
                }
              />
            </Box>
          ) : null}

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
