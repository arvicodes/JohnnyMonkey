import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GridOnIcon from '@mui/icons-material/GridOn';
import PostAddIcon from '@mui/icons-material/PostAdd';
import {
  buildExamGridTaskHtml,
  createBlankExamGridTask,
  demoNatuerlicheZahlenTask1,
  extractExamTaskHtml,
  parseExamGridTaskFromExamHtml,
  type ExamGridTaskSpec,
  type GridQuadrant,
  type GridSubsection,
} from '../../lib/examGridTaskBuilder';

type Props = {
  open: boolean;
  filePath: string;
  initialTaskNumber?: number;
  /** Bereits in der Prüfung vorhandene Aufgaben-Nrn. (für „Aufgabe hinzufügen“). */
  existingTaskNumbers?: number[];
  onClose: () => void;
  onSaved: () => void;
  onNotify?: (message: string, severity: 'success' | 'error') => void;
};

const QUADRANT_LABEL: Record<GridQuadrant, string> = {
  tl: 'Oben links',
  tr: 'Oben rechts',
  bl: 'Unten links',
  br: 'Unten rechts',
};

const SOLUTION_HELPER = 'Mehrere Lösungen mit / trennen (z. B. 66700 / 66 700)';

const rowTrashSx = {
  p: 0.2,
  minWidth: 24,
  width: 24,
  height: 24,
  flexShrink: 0,
  alignSelf: 'center',
  color: 'error.main',
};

function RowDeleteButton({
  onClick,
  disabled,
  label = 'Zeile löschen',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      sx={rowTrashSx}
    >
      <DeleteIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}

const KIND_LABEL: Record<GridSubsection['kind'], string> = {
  'round-lines': 'Zeilen mit Lücke (runden …)',
  compare: 'Vergleichszeichen',
  sort: 'Sortieren (Zahlenliste)',
  'one-line': 'Eine Zeile Antwort',
  'bullet-blanks': 'Aufzählung mit Lücken',
  cloze: 'Lückentext (___)',
};

function newSubsection(kind: GridSubsection['kind']): GridSubsection {
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const base = { id, letter: 'X', title: 'Titel', quadrant: 'tl' as GridQuadrant };
  switch (kind) {
    case 'round-lines':
      return { ...base, kind, lines: [{ text: 'Zahl … =', solution: '' }] };
    case 'compare':
      return { ...base, kind, rows: [{ left: '1', right: '2', solution: '<' }] };
    case 'sort':
      return { ...base, kind, given: '1, 2, 3', solution: '1, 2, 3' };
    case 'one-line':
      return { ...base, kind, prompt: '…', solution: '' };
    case 'bullet-blanks':
      return { ...base, kind, items: [{ text: '…:', solution: '' }] };
    case 'cloze':
      return { ...base, kind, template: 'Text mit ___ Lücke.', solutions: [''] };
    default:
      return { ...base, kind: 'one-line', prompt: '', solution: '' };
  }
}

function nextTaskNumber(current: number, existing: number[] | undefined): number {
  const nums = new Set([...(existing || []).map((n) => Number(n) || 0), current]);
  return Math.max(0, ...nums) + 1;
}

export default function ExamGridTaskBuilderDialog({
  open,
  filePath,
  initialTaskNumber = 1,
  existingTaskNumbers,
  onClose,
  onSaved,
  onNotify,
}: Props) {
  const [spec, setSpec] = useState<ExamGridTaskSpec>(() => ({
    ...demoNatuerlicheZahlenTask1(),
    taskNumber: initialTaskNumber,
  }));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setError(null);

    if (!filePath) {
      setSpec({ ...demoNatuerlicheZahlenTask1(), taskNumber: initialTaskNumber });
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/file-system-paths/read-html?filePath=${encodeURIComponent(filePath)}`,
        );
        if (!res.ok) throw new Error('Prüfungsdatei konnte nicht geladen werden');
        const html = await res.text();
        const parsed = parseExamGridTaskFromExamHtml(html, initialTaskNumber);
        if (parsed) {
          setSpec(parsed);
        } else if (extractExamTaskHtml(html, initialTaskNumber)) {
          setSpec(createBlankExamGridTask(initialTaskNumber));
        } else {
          setSpec({ ...demoNatuerlicheZahlenTask1(), taskNumber: initialTaskNumber });
        }
      } catch {
        setSpec({ ...demoNatuerlicheZahlenTask1(), taskNumber: initialTaskNumber });
        setError('Gespeicherte Aufgabe konnte nicht geladen werden — Demo-Vorlage angezeigt.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, filePath, initialTaskNumber]);

  const built = useMemo(() => buildExamGridTaskHtml(spec), [spec]);

  const updateSub = (id: string, patch: Partial<GridSubsection>) => {
    setSpec((prev) => ({
      ...prev,
      subsections: prev.subsections.map((s) => (s.id === id ? { ...s, ...patch } as GridSubsection : s)),
    }));
  };

  const removeSub = (id: string) => {
    setSpec((prev) => ({ ...prev, subsections: prev.subsections.filter((s) => s.id !== id) }));
  };

  const persistSpec = async (specToSave: ExamGridTaskSpec, builtPayload: ReturnType<typeof buildExamGridTaskHtml>) => {
    if (!filePath) return false;
    const fieldCount = Object.keys(builtPayload.correctAnswers).length;
    const res = await fetch('/api/file-system-paths/upsert-examination-grid-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
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
    if (!filePath) {
      const msg = 'Keine Prüfungsdatei gewählt — bitte zuerst eine KA-Datei öffnen.';
      setError(msg);
      onNotify?.(msg, 'error');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persistSpec(spec, built);
      onNotify?.(`Aufgabe ${spec.taskNumber} in der Prüfung gespeichert.`, 'success');
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
      setError(msg);
      onNotify?.(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const taskNumbersForNext = useMemo(
    () => [...(existingTaskNumbers || []), spec.taskNumber],
    [existingTaskNumbers, spec.taskNumber],
  );
  const nextAufgabeNumber = useMemo(
    () => nextTaskNumber(spec.taskNumber, taskNumbersForNext),
    [spec.taskNumber, taskNumbersForNext],
  );

  const saveAndAddAufgabe = async () => {
    if (!filePath) {
      const msg = 'Keine Prüfungsdatei gewählt — bitte zuerst eine KA-Datei öffnen.';
      setError(msg);
      onNotify?.(msg, 'error');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persistSpec(spec, built);
      const next = nextTaskNumber(spec.taskNumber, taskNumbersForNext);
      onNotify?.(`Aufgabe ${spec.taskNumber} gespeichert — weiter mit Aufgabe ${next}.`, 'success');
      onSaved();
      setSpec(createBlankExamGridTask(next));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
      setError(msg);
      onNotify?.(msg, 'error');
    } finally {
      setSaving(false);
    }
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
        <GridOnIcon color="primary" />
        <Typography component="span" variant="h6" sx={{ flex: 1, fontSize: '1.1rem' }}>
          Raster-Aufgabe (2×2) bearbeiten
        </Typography>
        {filePath ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon />}
            onClick={() =>
              window.open(
                `/api/file-system-paths/read-html?filePath=${encodeURIComponent(filePath)}`,
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            Prüfung öffnen (Header &amp; Leiste)
          </Button>
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
          gap: 0,
          p: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            px: 3,
            py: 2,
          }}
        >
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">Gespeicherte Aufgabe wird geladen…</Typography>
          </Box>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Aufgaben-Nr."
            type="number"
            size="small"
            value={spec.taskNumber}
            onChange={(e) => setSpec((p) => ({ ...p, taskNumber: Math.max(1, Number(e.target.value) || 1) }))}
            sx={{ width: 110 }}
          />
          <TextField
            label="Punkte (Anzeige)"
            type="number"
            size="small"
            value={spec.points}
            onChange={(e) => setSpec((p) => ({ ...p, points: Math.max(1, Number(e.target.value) || 1) }))}
            sx={{ width: 130 }}
          />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>AFB</InputLabel>
            <Select
              label="AFB"
              value={spec.afbLevel}
              onChange={(e) => setSpec((p) => ({ ...p, afbLevel: Number(e.target.value) as 1 | 2 | 3 }))}
            >
              <MenuItem value={1}>I</MenuItem>
              <MenuItem value={2}>II</MenuItem>
              <MenuItem value={3}>III</MenuItem>
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSpec({ ...demoNatuerlicheZahlenTask1(), taskNumber: spec.taskNumber })}
          >
            Beispiel „Natürliche Zahlen“ laden
          </Button>
        </Box>

        <Typography variant="subtitle2" color="text.secondary">
          Nur der <strong>Inhalt von Aufgabe {spec.taskNumber}</strong> liegt im 2×2-Raster. Beim Speichern bleiben
          Prüfungskopf, linke Leiste (Timer, Druck, Abgeben) und Fußzeile der Datei unverändert. Teile A–G in die
          vier Kästchen legen. <code>___</code> = Lücke. {SOLUTION_HELPER}
        </Typography>

        {spec.subsections.map((sub) => (
          <Box
            key={sub.id}
            sx={{
              position: 'relative',
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              p: 2,
              pr: 4.5,
              bgcolor: '#fafafa',
            }}
          >
            <IconButton
              size="small"
              color="error"
              onClick={() => removeSub(sub.id)}
              aria-label="Teil löschen"
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                p: 0.2,
                width: 24,
                height: 24,
              }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, alignItems: 'center', pr: 1 }}>
              <TextField
                label="Buchstabe"
                size="small"
                value={sub.letter}
                onChange={(e) => updateSub(sub.id, { letter: e.target.value })}
                sx={{ width: 72 }}
              />
              <TextField
                label="Titel"
                size="small"
                fullWidth
                sx={{ flex: '1 1 200px' }}
                value={sub.title}
                onChange={(e) => updateSub(sub.id, { title: e.target.value })}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Kästchen</InputLabel>
                <Select
                  label="Kästchen"
                  value={sub.quadrant}
                  onChange={(e) => updateSub(sub.id, { quadrant: e.target.value as GridQuadrant })}
                >
                  {(Object.keys(QUADRANT_LABEL) as GridQuadrant[]).map((q) => (
                    <MenuItem key={q} value={q}>{QUADRANT_LABEL[q]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Typ</InputLabel>
                <Select
                  label="Typ"
                  value={sub.kind}
                  onChange={(e) => {
                    const kind = e.target.value as GridSubsection['kind'];
                    const fresh = newSubsection(kind);
                    updateSub(sub.id, { ...fresh, id: sub.id, letter: sub.letter, title: sub.title, quadrant: sub.quadrant });
                  }}
                >
                  {(Object.keys(KIND_LABEL) as GridSubsection['kind'][]).map((k) => (
                    <MenuItem key={k} value={k}>{KIND_LABEL[k]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {sub.kind === 'round-lines' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sub.lines.map((line, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <TextField
                      size="small"
                      label="Zeile"
                      value={line.text}
                      onChange={(e) => {
                        const lines = [...sub.lines];
                        lines[i] = { ...lines[i], text: e.target.value };
                        updateSub(sub.id, { lines });
                      }}
                      sx={{ flex: 2, minWidth: 0 }}
                    />
                    <TextField
                      size="small"
                      label="Lösung"
                      value={line.solution}
                      onChange={(e) => {
                        const lines = [...sub.lines];
                        lines[i] = { ...lines[i], solution: e.target.value };
                        updateSub(sub.id, { lines });
                      }}
                      helperText={i === 0 ? SOLUTION_HELPER : undefined}
                      FormHelperTextProps={{ sx: { m: 0, fontSize: '0.65rem' } }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <RowDeleteButton
                      disabled={sub.lines.length <= 1}
                      onClick={() => updateSub(sub.id, { lines: sub.lines.filter((_, j) => j !== i) })}
                    />
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => updateSub(sub.id, { lines: [...sub.lines, { text: '', solution: '' }] })}
                >
                  Zeile
                </Button>
              </Box>
            )}

            {sub.kind === 'compare' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sub.rows.map((row, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 0.5, flexWrap: 'nowrap', alignItems: 'center' }}>
                    <TextField
                      size="small"
                      label="Links"
                      value={row.left}
                      onChange={(e) => {
                        const rows = [...sub.rows];
                        rows[i] = { ...rows[i], left: e.target.value };
                        updateSub(sub.id, { rows });
                      }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <FormControl size="small" sx={{ width: 84, flexShrink: 0 }}>
                      <InputLabel>Lösung</InputLabel>
                      <Select
                        label="Lösung"
                        value={row.solution}
                        onChange={(e) => {
                          const rows = [...sub.rows];
                          rows[i] = { ...rows[i], solution: e.target.value as '<' | '>' | '=' };
                          updateSub(sub.id, { rows });
                        }}
                      >
                        <MenuItem value="<">&lt;</MenuItem>
                        <MenuItem value=">">&gt;</MenuItem>
                        <MenuItem value="=">=</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="Rechts"
                      value={row.right}
                      onChange={(e) => {
                        const rows = [...sub.rows];
                        rows[i] = { ...rows[i], right: e.target.value };
                        updateSub(sub.id, { rows });
                      }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <RowDeleteButton
                      disabled={sub.rows.length <= 1}
                      onClick={() => updateSub(sub.id, { rows: sub.rows.filter((_, j) => j !== i) })}
                    />
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => updateSub(sub.id, { rows: [...sub.rows, { left: '', right: '', solution: '<' }] })}
                >
                  Vergleichszeile
                </Button>
              </Box>
            )}

            {sub.kind === 'sort' && (
              <>
                <TextField fullWidth size="small" label="Gegeben (Zahlen)" value={sub.given} onChange={(e) => updateSub(sub.id, { given: e.target.value })} sx={{ mb: 1 }} />
                <TextField
                  fullWidth
                  size="small"
                  label="Lösung (sortiert)"
                  value={sub.solution}
                  onChange={(e) => updateSub(sub.id, { solution: e.target.value })}
                  helperText={SOLUTION_HELPER}
                />
              </>
            )}

            {sub.kind === 'one-line' && (
              <>
                <TextField fullWidth size="small" label="Aufgabentext / Zahl" value={sub.prompt} onChange={(e) => updateSub(sub.id, { prompt: e.target.value })} sx={{ mb: 1 }} />
                <TextField
                  fullWidth
                  size="small"
                  label="Lösung"
                  value={sub.solution}
                  onChange={(e) => updateSub(sub.id, { solution: e.target.value })}
                  helperText={SOLUTION_HELPER}
                />
              </>
            )}

            {sub.kind === 'bullet-blanks' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sub.items.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                    <TextField
                      size="small"
                      label="Text vor Lücke"
                      value={item.text}
                      onChange={(e) => {
                        const items = [...sub.items];
                        items[i] = { ...items[i], text: e.target.value };
                        updateSub(sub.id, { items });
                      }}
                      sx={{ flex: 2, minWidth: 0 }}
                    />
                    <TextField
                      size="small"
                      label="Lösung"
                      value={item.solution}
                      onChange={(e) => {
                        const items = [...sub.items];
                        items[i] = { ...items[i], solution: e.target.value };
                        updateSub(sub.id, { items });
                      }}
                      helperText={i === 0 ? SOLUTION_HELPER : undefined}
                      FormHelperTextProps={{ sx: { m: 0, fontSize: '0.65rem' } }}
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <RowDeleteButton
                      disabled={sub.items.length <= 1}
                      onClick={() => updateSub(sub.id, { items: sub.items.filter((_, j) => j !== i) })}
                    />
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => updateSub(sub.id, { items: [...sub.items, { text: '', solution: '' }] })}
                >
                  Punkt
                </Button>
              </Box>
            )}

            {sub.kind === 'cloze' && (
              <>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                  label="Lückentext (___ = Lücke)"
                  value={sub.template}
                  onChange={(e) => {
                    const template = e.target.value;
                    const gapCount = (template.match(/___/g) || []).length;
                    const solutions = [...sub.solutions];
                    while (solutions.length < gapCount) solutions.push('');
                    while (solutions.length > gapCount) solutions.pop();
                    updateSub(sub.id, { template, solutions });
                  }}
                  sx={{ mb: 1 }}
                />
                {sub.solutions.map((sol, i) => (
                  <TextField
                    key={i}
                    fullWidth
                    size="small"
                    label={`Lösung Lücke ${i + 1}`}
                    value={sol}
                    onChange={(e) => {
                      const solutions = [...sub.solutions];
                      solutions[i] = e.target.value;
                      updateSub(sub.id, { solutions });
                    }}
                    helperText={SOLUTION_HELPER}
                    sx={{ mb: 1 }}
                  />
                ))}
              </>
            )}
          </Box>
        ))}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() =>
              setSpec((p) => ({
                ...p,
                subsections: [...p.subsections, newSubsection('round-lines')],
              }))
            }
          >
            Teil hinzufügen (A, B, C …)
          </Button>
          <Button
            startIcon={<PostAddIcon />}
            variant="outlined"
            color="secondary"
            disabled={saving || !filePath}
            onClick={() => void saveAndAddAufgabe()}
          >
            Aufgabe hinzufügen (nächste Nr.)
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
          „Aufgabe hinzufügen“ speichert die aktuelle Aufgabe {spec.taskNumber} und öffnet Aufgabe{' '}
          {nextAufgabeNumber} (leer).
        </Typography>

        </Box>

        <Box
          sx={{
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            maxHeight: '42%',
            bgcolor: '#f5f5f5',
          }}
        >
          <Typography variant="subtitle2" sx={{ px: 3, pt: 1.5, pb: 0.5, flexShrink: 0 }}>
            Vorschau (nur Aufgaben-Inhalt — ohne Prüfungs-Rahmen)
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 120,
              mx: 3,
              mb: 2,
              border: '1px solid #ccc',
              borderRadius: 1,
              p: 1,
              bgcolor: '#fff',
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              fontSize: 13,
              overscrollBehavior: 'contain',
            }}
            dangerouslySetInnerHTML={{ __html: built.taskHtml }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexShrink: 0 }}>
        <Button onClick={onClose} disabled={saving}>Abbrechen</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving || loading || !filePath}>
          {saving ? 'Speichern…' : 'In Prüfung speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
