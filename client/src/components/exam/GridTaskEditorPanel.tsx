import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  buildExamGridTaskHtml,
  type ExamGridTaskSpec,
  type GridQuadrant,
  type GridSubsection,
} from '../../lib/examGridTaskBuilder';

export type Props = {
  spec: ExamGridTaskSpec;
  onChange: (next: ExamGridTaskSpec) => void;
  previewExpanded: boolean;
  onTogglePreview: () => void;
};

const QUADRANT_LABEL: Record<GridQuadrant, string> = {
  tl: 'Oben links',
  tr: 'Oben rechts',
  bl: 'Unten links',
  br: 'Unten rechts',
};

/** Nur im Raster-Editor — Teile & Zeilen farblich unterscheiden. */
const EDITOR_SUBSECTION_FILLS = [
  { main: '#dbeafe', rowA: '#eff6ff', rowB: '#bfdbfe', border: '#2563eb' },
  { main: '#ede9fe', rowA: '#f5f3ff', rowB: '#ddd6fe', border: '#7c3aed' },
  { main: '#d1fae5', rowA: '#ecfdf5', rowB: '#a7f3d0', border: '#059669' },
  { main: '#ffedd5', rowA: '#fff7ed', rowB: '#fed7aa', border: '#ea580c' },
  { main: '#fce7f3', rowA: '#fdf2f8', rowB: '#fbcfe8', border: '#db2777' },
  { main: '#cffafe', rowA: '#ecfeff', rowB: '#a5f3fc', border: '#0891b2' },
  { main: '#fef9c3', rowA: '#fefce8', rowB: '#fde047', border: '#ca8a04' },
];

function editorSubsectionShell(subIndex: number) {
  const c = EDITOR_SUBSECTION_FILLS[subIndex % EDITOR_SUBSECTION_FILLS.length];
  return {
    bgcolor: c.main,
    border: `2px solid ${c.border}`,
  };
}

function editorRowFill(subIndex: number, rowIndex: number) {
  const c = EDITOR_SUBSECTION_FILLS[subIndex % EDITOR_SUBSECTION_FILLS.length];
  return {
    bgcolor: rowIndex % 2 === 0 ? c.rowA : c.rowB,
    borderRadius: 1,
    px: 0.5,
    py: 0.35,
  };
}

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

export default function GridTaskEditorPanel({
  spec,
  onChange,
  previewExpanded,
  onTogglePreview,
}: Props) {
  const built = useMemo(() => buildExamGridTaskHtml(spec), [spec]);

  const updateSub = (id: string, patch: Partial<GridSubsection>) => {
    onChange({
      ...spec,
      subsections: spec.subsections.map((s) =>
        s.id === id ? ({ ...s, ...patch } as GridSubsection) : s,
      ),
    });
  };

  const removeSub = (id: string) => {
    onChange({ ...spec, subsections: spec.subsections.filter((s) => s.id !== id) });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Aufgaben-Nr."
          type="number"
          size="small"
          value={spec.taskNumber}
          onChange={(e) =>
            onChange({ ...spec, taskNumber: Math.max(1, Number(e.target.value) || 1) })
          }
          sx={{ width: 110 }}
        />
        <TextField
          label="Punkte (Anzeige)"
          type="number"
          size="small"
          value={spec.points}
          onChange={(e) =>
            onChange({ ...spec, points: Math.max(1, Number(e.target.value) || 1) })
          }
          sx={{ width: 130 }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>AFB</InputLabel>
          <Select
            label="AFB"
            value={spec.afbLevel}
            onChange={(e) =>
              onChange({ ...spec, afbLevel: Number(e.target.value) as 1 | 2 | 3 })
            }
          >
            <MenuItem value={1}>I</MenuItem>
            <MenuItem value={2}>II</MenuItem>
            <MenuItem value={3}>III</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {spec.subsections.map((sub, subIndex) => (
        <Box
          key={sub.id}
          sx={{
            position: 'relative',
            borderRadius: 2,
            p: 2,
            pr: 4.5,
            ...editorSubsectionShell(subIndex),
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
                  <MenuItem key={q} value={q}>
                    {QUADRANT_LABEL[q]}
                  </MenuItem>
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
                  updateSub(sub.id, {
                    ...fresh,
                    id: sub.id,
                    letter: sub.letter,
                    title: sub.title,
                    quadrant: sub.quadrant,
                    image: sub.image,
                  });
                }}
              >
                {(Object.keys(KIND_LABEL) as GridSubsection['kind'][]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, alignItems: 'center' }}>
            <TextField
              label="Bild (URL / material-Pfad, optional)"
              size="small"
              fullWidth
              sx={{ flex: '1 1 220px' }}
              value={sub.image?.src || ''}
              onChange={(e) => {
                const src = e.target.value.trim();
                updateSub(sub.id, {
                  image: src ? { src, align: sub.image?.align || 'left' } : undefined,
                });
              }}
              placeholder="z. B. /material/…/bild.png"
            />
            <FormControl size="small" sx={{ minWidth: 120 }} disabled={!sub.image?.src}>
              <InputLabel>Bild</InputLabel>
              <Select
                label="Bild"
                value={sub.image?.align || 'left'}
                onChange={(e) => {
                  if (!sub.image?.src) return;
                  updateSub(sub.id, {
                    image: { src: sub.image.src, align: e.target.value as 'left' | 'right' },
                  });
                }}
              >
                <MenuItem value="left">links</MenuItem>
                <MenuItem value="right">rechts</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {sub.kind === 'round-lines' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sub.lines.map((line, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'nowrap',
                    alignItems: 'flex-start',
                    ...editorRowFill(subIndex, i),
                  }}
                >
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
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    ...editorRowFill(subIndex, i),
                  }}
                >
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
                onClick={() =>
                  updateSub(sub.id, { rows: [...sub.rows, { left: '', right: '', solution: '<' }] })
                }
              >
                Vergleichszeile
              </Button>
            </Box>
          )}

          {sub.kind === 'sort' && (
            <Box sx={{ ...editorRowFill(subIndex, 0) }}>
              <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                <InputLabel>Bearbeitung</InputLabel>
                <Select
                  label="Bearbeitung"
                  value={sub.interaction || 'text'}
                  onChange={(e) =>
                    updateSub(sub.id, { interaction: e.target.value as 'text' | 'drag' })
                  }
                >
                  <MenuItem value="text">Freitext (Komma-getrennt)</MenuItem>
                  <MenuItem value="drag">Zahlen greifen &amp; in Slots ziehen</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="Gegeben (Zahlen, kommagetrennt)"
                value={sub.given}
                onChange={(e) => updateSub(sub.id, { given: e.target.value })}
                helperText={
                  sub.interaction === 'drag'
                    ? 'Diese Kärtchen erscheinen zum Ziehen; Slots = Anzahl der Lösungswerte.'
                    : undefined
                }
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Lösung (sortiert)"
                value={sub.solution}
                onChange={(e) => updateSub(sub.id, { solution: e.target.value })}
                helperText="Mehrere Varianten mit / trennen"
              />
            </Box>
          )}

          {sub.kind === 'one-line' && (
            <Box sx={{ ...editorRowFill(subIndex, 0) }}>
              <TextField
                fullWidth
                size="small"
                label="Aufgabentext / Zahl"
                value={sub.prompt}
                onChange={(e) => updateSub(sub.id, { prompt: e.target.value })}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Lösung"
                value={sub.solution}
                onChange={(e) => updateSub(sub.id, { solution: e.target.value })}
              />
            </Box>
          )}

          {sub.kind === 'bullet-blanks' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sub.items.map((item, i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start', ...editorRowFill(subIndex, i) }}
                >
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
            <Box sx={{ ...editorRowFill(subIndex, 0) }}>
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
                <Box key={i} sx={{ mb: 1, ...editorRowFill(subIndex, i + 1) }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={`Lösung Lücke ${i + 1}`}
                    value={sol}
                    onChange={(e) => {
                      const solutions = [...sub.solutions];
                      solutions[i] = e.target.value;
                      updateSub(sub.id, { solutions });
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}

      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        onClick={() =>
          onChange({
            ...spec,
            subsections: [...spec.subsections, newSubsection('round-lines')],
          })
        }
      >
        Teil hinzufügen (A, B, C …)
      </Button>

      <Box sx={{ pt: 1 }}>
        <Button
          size="small"
          onClick={onTogglePreview}
          endIcon={previewExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ textTransform: 'none', mb: previewExpanded ? 1 : 0 }}
        >
          Vorschau
        </Button>
        <Collapse in={previewExpanded}>
          <Box
            sx={{
              minHeight: 120,
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
        </Collapse>
      </Box>
    </Box>
  );
}
