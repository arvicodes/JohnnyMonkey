import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  buildExamGridTaskHtml,
  filterExamGridTaskForVersion,
  type ExamGridTaskSpec,
  type GridQuadrant,
  type GridSubsection,
} from '../../lib/examGridTaskBuilder';
import {
  applyAutoSubsectionLetters,
  subsectionGetsLetter,
} from '../../lib/examGridEditorLabels';
import { StackSubsectionFields } from './stackSubsectionEditors';

export type Props = {
  spec: ExamGridTaskSpec;
  onChange: (next: ExamGridTaskSpec) => void;
  previewExpanded: boolean;
  onTogglePreview: () => void;
  /** Prüfungsversionen A/B/C … (leer = keine Varianten-UI). */
  examVersionLetters?: string[];
  /** Aktuell bearbeitete Variante (Tab oben). */
  activeVersionLetter?: string;
  onDuplicateSubToVariant?: (subId: string, letter: string) => void;
  onMoveSubToVariant?: (subId: string, letter: string) => void;
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
  choice: 'Multiple Choice (eine Antwort)',
  'multi-select': 'Multi-Select (mehrere Antworten)',
  'one-line': 'Antwort eingeben (kurz)',
  cloze: 'Lückentext (___)',
  sort: 'Sortieren',
  'bullet-blanks': 'Stichpunkte mit Lücken',
  paragraph: 'Absatz (nur Text)',
  'standalone-image': 'Bild',
  'round-lines': 'Mehrere Zeilen mit Lücke',
  compare: 'Vergleichen (<, >, =)',
  'life-dates': 'Lebensdaten (Mathe-Vorlage)',
  'roman-table': 'Römische Zahlen (Tabelle)',
  'rich-part': 'Text & Felder (Mathe-Vorlage)',
  'number-line': 'Zahlenstrahl (interaktiv)',
};

/** Im Raster zuerst allgemeine Aufgabentypen, darunter Mathe-Sonderformen. */
const TASK_TYPE_GROUPS: { label: string; kinds: GridSubsection['kind'][] }[] = [
  {
    label: 'Aufgabentypen',
    kinds: [
      'choice',
      'multi-select',
      'one-line',
      'cloze',
      'sort',
      'bullet-blanks',
      'paragraph',
      'standalone-image',
    ],
  },
  {
    label: 'Mathe / Druckmaterial-Vorlagen',
    kinds: ['round-lines', 'compare', 'life-dates', 'roman-table', 'rich-part', 'number-line'],
  },
];

const STACK_KINDS: GridSubsection['kind'][] = [
  'paragraph',
  'standalone-image',
  'life-dates',
  'roman-table',
  'rich-part',
  'number-line',
];

function newSubsection(kind: GridSubsection['kind']): GridSubsection {
  const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const base = { id, letter: '', title: '', quadrant: 'tl' as GridQuadrant };
  switch (kind) {
    case 'round-lines':
      return { ...base, kind, lines: [{ text: 'Zahl … =', solution: '' }] };
    case 'compare':
      return { ...base, kind, rows: [{ left: '1', right: '2', solution: '<' }] };
    case 'sort':
      return { ...base, kind, given: '1, 2, 3', solution: '1, 2, 3' };
    case 'one-line':
      return { ...base, kind, prompt: '…', solution: '' };
    case 'choice':
      return {
        ...base,
        kind,
        prompt: 'Frage …',
        options: [
          { label: 'Antwort A', value: 'A' },
          { label: 'Antwort B', value: 'B' },
          { label: 'Antwort C', value: 'C' },
        ],
        solution: 'A',
      };
    case 'multi-select':
      return {
        ...base,
        kind,
        prompt: 'Wähle alle zutreffenden …',
        options: [
          { label: '…', value: '1' },
          { label: '…', value: '2' },
        ],
        solution: '1|2',
      };
    case 'bullet-blanks':
      return { ...base, kind, items: [{ text: '…:', solution: '' }] };
    case 'cloze':
      return { ...base, kind, template: 'Text mit ___ Lücke.', solutions: [''] };
    case 'paragraph':
      return { ...base, letter: '', title: '', kind, text: '' };
    case 'standalone-image':
      return { ...base, letter: '', title: '', kind, src: '', alt: '' };
    case 'life-dates':
      return {
        ...base,
        kind,
        entries: [{ heading: '', lines: '', answerId: 'a0a', solution: '' }],
      };
    case 'roman-table':
      return {
        ...base,
        letter: 'B',
        title: 'Fülle die Lücken wie im unten stehenden Beispiel aus.',
        kind,
        layout: 'triple-grid',
        examples: [
          { roman: 'XXIX', decimal: '29' },
          { roman: 'XXX', decimal: '30' },
          { roman: 'XXXI', decimal: '31' },
        ],
        gridRows: [
          {
            cells: [
              { kind: 'input-roman', answerId: 'a0a', solution: '' },
              { kind: 'input-roman', answerId: 'a0b', solution: '' },
              { kind: 'decimal', text: '50' },
            ],
          },
          {
            cells: [
              { kind: 'roman', text: 'XCIV' },
              { kind: 'input-decimal', answerId: 'a0c', solution: '' },
              { kind: 'input-decimal', answerId: 'a0d', solution: '' },
            ],
          },
        ],
      };
    case 'rich-part':
      return { ...base, kind, blocks: [{ type: 'p', text: '' }] };
    case 'number-line':
      return {
        ...base,
        letter: '',
        title: '',
        kind,
        hint: '',
        min: 0,
        max: 100,
        step: 1,
        bg: '',
        fixed: [],
        chips: [],
      };
    default:
      return { ...base, kind: 'one-line', prompt: '', solution: '' };
  }
}

export default function GridTaskEditorPanel({
  spec,
  onChange,
  previewExpanded,
  onTogglePreview,
  examVersionLetters = [],
  activeVersionLetter = 'A',
  onDuplicateSubToVariant,
  onMoveSubToVariant,
}: Props) {
  const previewSpec = useMemo(() => {
    if (!activeVersionLetter || examVersionLetters.length <= 1) return spec;
    return filterExamGridTaskForVersion(spec, activeVersionLetter);
  }, [spec, activeVersionLetter, examVersionLetters.length]);

  const built = useMemo(() => buildExamGridTaskHtml(previewSpec), [previewSpec]);

  const commitSpec = (next: ExamGridTaskSpec) => {
    onChange(applyAutoSubsectionLetters(next));
  };

  const updateSub = (id: string, patch: Partial<GridSubsection>) => {
    commitSpec({
      ...spec,
      subsections: spec.subsections.map((s) =>
        s.id === id ? ({ ...s, ...patch } as GridSubsection) : s,
      ),
    });
  };

  const removeSub = (id: string) => {
    commitSpec({ ...spec, subsections: spec.subsections.filter((s) => s.id !== id) });
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              {subsectionGetsLetter(sub) ? (
                <Typography component="div" sx={{ fontWeight: 800, fontSize: 15, mb: 1 }}>
                  {sub.letter})
                </Typography>
              ) : null}

          {sub.kind === 'round-lines' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Frage / Anweisung"
                value={sub.title}
                onChange={(e) => updateSub(sub.id, { title: e.target.value })}
                sx={{ ...editorRowFill(subIndex, -1) }}
              />
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
              <TextField
                fullWidth
                size="small"
                label="Frage / Anweisung"
                value={sub.title}
                onChange={(e) => updateSub(sub.id, { title: e.target.value })}
                sx={{ mb: 1 }}
              />
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

          {STACK_KINDS.includes(sub.kind) && (
            <StackSubsectionFields
              sub={sub}
              subIndex={subIndex}
              updateSub={updateSub}
              editorRowFill={editorRowFill}
            />
          )}

          {(sub.kind === 'choice' || sub.kind === 'multi-select') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Frage / Aufgabenstellung"
                value={sub.prompt}
                onChange={(e) => updateSub(sub.id, { prompt: e.target.value })}
                sx={{ ...editorRowFill(subIndex, 0) }}
              />
              {sub.options.map((opt, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex',
                    gap: 0.5,
                    flexWrap: 'nowrap',
                    alignItems: 'flex-start',
                    ...editorRowFill(subIndex, i + 1),
                  }}
                >
                  <TextField
                    size="small"
                    label="Kürzel"
                    value={opt.value}
                    onChange={(e) => {
                      const options = [...sub.options];
                      options[i] = { ...options[i], value: e.target.value };
                      updateSub(sub.id, { options });
                    }}
                    sx={{ width: 72, flexShrink: 0 }}
                  />
                  <TextField
                    size="small"
                    label="Antworttext"
                    value={opt.label}
                    onChange={(e) => {
                      const options = [...sub.options];
                      options[i] = { ...options[i], label: e.target.value };
                      updateSub(sub.id, { options });
                    }}
                    sx={{ flex: 1, minWidth: 0 }}
                  />
                  <RowDeleteButton
                    disabled={sub.options.length <= 2}
                    onClick={() =>
                      updateSub(sub.id, { options: sub.options.filter((_, j) => j !== i) })
                    }
                    label="Antwort löschen"
                  />
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  const nextLetter = String.fromCharCode(65 + sub.options.length);
                  updateSub(sub.id, {
                    options: [...sub.options, { label: '', value: nextLetter }],
                  });
                }}
              >
                Antwortoption
              </Button>
              {sub.kind === 'choice' ? (
                <FormControl size="small" sx={{ maxWidth: 220, ...editorRowFill(subIndex, 99) }}>
                  <InputLabel>Richtige Antwort</InputLabel>
                  <Select
                    label="Richtige Antwort"
                    value={sub.solution}
                    onChange={(e) => updateSub(sub.id, { solution: e.target.value })}
                  >
                    {sub.options.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.value}: {o.label || '—'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  label="Richtige Antworten (Kürzel mit |)"
                  value={sub.solution}
                  onChange={(e) => updateSub(sub.id, { solution: e.target.value })}
                  helperText="z. B. A|C"
                  sx={editorRowFill(subIndex, 100)}
                />
              )}
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
                sx={{ mb: spec.layout === 'stack' ? 1 : 0 }}
              />
              {spec.layout === 'stack' ? (
                <TextField
                  fullWidth
                  size="small"
                  label="Einheit (z. B. km/h)"
                  value={sub.suffix || ''}
                  onChange={(e) => updateSub(sub.id, { suffix: e.target.value })}
                />
              ) : null}
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

            <Box
              sx={{
                flex: '0 0 200px',
                width: 200,
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <FormControl size="small" fullWidth>
                <InputLabel>Fragentyp</InputLabel>
                <Select
                  label="Fragentyp"
                  value={sub.kind}
                  onChange={(e) => {
                    const kind = e.target.value as GridSubsection['kind'];
                    const fresh = newSubsection(kind);
                    updateSub(sub.id, {
                      ...fresh,
                      id: sub.id,
                      title: sub.title,
                      quadrant: sub.quadrant,
                      image: sub.image,
                      ...('prompt' in sub && 'prompt' in fresh
                        ? { prompt: (sub as { prompt?: string }).prompt }
                        : {}),
                    });
                  }}
                >
                  {TASK_TYPE_GROUPS.flatMap((group) => [
                    <ListSubheader key={`h-${group.label}`} sx={{ lineHeight: 2, fontWeight: 800 }}>
                      {group.label}
                    </ListSubheader>,
                    ...group.kinds.map((k) => (
                      <MenuItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
              {spec.layout !== 'stack' ? (
                <FormControl size="small" fullWidth>
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
              ) : null}
              <TextField
                label="Bild (optional)"
                size="small"
                fullWidth
                value={sub.image?.src || ''}
                onChange={(e) => {
                  const src = e.target.value.trim();
                  updateSub(sub.id, {
                    image: src ? { src, align: sub.image?.align || 'left' } : undefined,
                  });
                }}
                placeholder="/material/…"
              />
              <FormControl size="small" fullWidth disabled={!sub.image?.src}>
                <InputLabel>Bildposition</InputLabel>
                <Select
                  label="Bildposition"
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
              {sub.kind === 'sort' ? (
                <FormControl size="small" fullWidth>
                  <InputLabel>Bearbeitung</InputLabel>
                  <Select
                    label="Bearbeitung"
                    value={sub.interaction || 'text'}
                    onChange={(e) =>
                      updateSub(sub.id, { interaction: e.target.value as 'text' | 'drag' })
                    }
                  >
                    <MenuItem value="text">Freitext (Komma)</MenuItem>
                    <MenuItem value="drag">Ziehen &amp; Slots</MenuItem>
                  </Select>
                </FormControl>
              ) : null}
              {examVersionLetters.length > 1 && subsectionGetsLetter(sub) ? (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel id={`variant-scope-${sub.id}`}>Für Variante</InputLabel>
                    <Select
                      labelId={`variant-scope-${sub.id}`}
                      multiple
                      label="Für Variante"
                      value={
                        sub.variantLetters?.length
                          ? sub.variantLetters
                          : examVersionLetters
                      }
                      onChange={(e) => {
                        const picked = e.target.value as string[];
                        const allSelected = examVersionLetters.every((L) => picked.includes(L));
                        updateSub(sub.id, {
                          variantLetters:
                            allSelected && picked.length === examVersionLetters.length
                              ? undefined
                              : [...picked].sort(),
                        });
                      }}
                      renderValue={(sel) => (sel as string[]).join(', ')}
                    >
                      {examVersionLetters.map((L) => (
                        <MenuItem key={L} value={L}>
                          Variante {L}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {sub.variantLetters?.length &&
                  !sub.variantLetters.includes(activeVersionLetter) ? (
                    <Typography variant="caption" color="warning.main" sx={{ lineHeight: 1.3 }}>
                      In Variante {activeVersionLetter} ausgeblendet (beim Speichern)
                    </Typography>
                  ) : null}
                  {examVersionLetters.filter((L) => L !== activeVersionLetter).length > 0 ? (
                    <FormControl size="small" fullWidth>
                      <InputLabel id={`variant-action-${sub.id}`}>Variante B/C …</InputLabel>
                      <Select
                        labelId={`variant-action-${sub.id}`}
                        label="Variante B/C …"
                        value=""
                        displayEmpty
                        onChange={(e) => {
                          const raw = String(e.target.value);
                          const m = raw.match(/^(dup|mov)-([A-Z])$/);
                          if (!m) return;
                          const [, mode, letter] = m;
                          if (mode === 'dup') onDuplicateSubToVariant?.(sub.id, letter);
                          else onMoveSubToVariant?.(sub.id, letter);
                        }}
                      >
                        <MenuItem value="" disabled>
                          Aktion wählen…
                        </MenuItem>
                        <ListSubheader sx={{ lineHeight: 2, fontWeight: 800 }}>
                          Duplizieren / verschieben
                        </ListSubheader>
                        {examVersionLetters
                          .filter((L) => L !== activeVersionLetter)
                          .flatMap((L) => [
                            <MenuItem key={`dup-${sub.id}-${L}`} value={`dup-${L}`}>
                              Duplizieren nach {L}
                            </MenuItem>,
                            <MenuItem key={`mov-${sub.id}-${L}`} value={`mov-${L}`}>
                              Verschieben nach {L}
                            </MenuItem>,
                          ])}
                      </Select>
                    </FormControl>
                  ) : null}
                </>
              ) : null}
            </Box>
          </Box>
        </Box>
      ))}

      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        onClick={() =>
          commitSpec({
            ...spec,
            subsections: [
              ...spec.subsections,
              newSubsection(spec.layout === 'stack' ? 'paragraph' : 'choice'),
            ],
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
