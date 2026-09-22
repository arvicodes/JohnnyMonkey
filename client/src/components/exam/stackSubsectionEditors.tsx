import React from 'react';
import { Box, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { GridSubsection, RichPartBlock } from '../../lib/examGridTaskBuilder';

type RowFill = (subIndex: number, rowIndex: number) => Record<string, unknown>;

function collectRomanTableInputs(sub: Extract<GridSubsection, { kind: 'roman-table' }>) {
  if (sub.layout === 'triple-grid' && sub.gridRows?.length) {
    const out: { answerId: string; solution: string; label: string }[] = [];
    for (const row of sub.gridRows) {
      for (const cell of row.cells) {
        const push = (
          slot:
            | { kind: 'input-roman'; answerId: string; solution: string }
            | { kind: 'input-decimal'; answerId: string; solution: string },
        ) => {
          out.push({
            answerId: slot.answerId,
            solution: slot.solution,
            label: slot.kind === 'input-roman' ? 'Römisch' : 'Dezimal',
          });
        };
        if (cell.kind === 'input-roman' || cell.kind === 'input-decimal') push(cell);
        else if (cell.kind === 'pair') {
          if (cell.left.kind === 'input-roman' || cell.left.kind === 'input-decimal') push(cell.left);
          if (cell.right.kind === 'input-roman' || cell.right.kind === 'input-decimal') push(cell.right);
        }
      }
    }
    return out;
  }
  return (sub.gaps ?? []).map((g) => ({
    answerId: g.answerId,
    solution: g.solution,
    label: g.roman || 'Lücke',
  }));
}

type Props = {
  sub: GridSubsection;
  subIndex: number;
  updateSub: (id: string, patch: Partial<GridSubsection>) => void;
  editorRowFill: RowFill;
};

export function StackSubsectionFields({ sub, subIndex, updateSub, editorRowFill }: Props) {
  if (sub.kind === 'paragraph') {
    return (
      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        label="Absatz"
        value={sub.text}
        onChange={(e) => updateSub(sub.id, { text: e.target.value })}
        sx={{ mb: 1, ...editorRowFill(subIndex, 0) }}
      />
    );
  }

  if (sub.kind === 'standalone-image') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label="Bild-URL"
          value={sub.src}
          onChange={(e) => updateSub(sub.id, { src: e.target.value })}
        />
        <TextField
          fullWidth
          size="small"
          label="Alt-Text"
          value={sub.alt || ''}
          onChange={(e) => updateSub(sub.id, { alt: e.target.value })}
        />
      </Box>
    );
  }

  if (sub.kind === 'life-dates') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {sub.entries.map((entry, i) => (
          <Box key={i} sx={editorRowFill(subIndex, i)}>
            <TextField
              fullWidth
              size="small"
              label="Name"
              value={entry.heading}
              onChange={(e) => {
                const entries = [...sub.entries];
                entries[i] = { ...entry, heading: e.target.value };
                updateSub(sub.id, { entries });
              }}
              sx={{ mb: 0.5 }}
            />
            <TextField
              fullWidth
              multiline
              size="small"
              label="Anzeige (Zeilen)"
              value={entry.lines}
              onChange={(e) => {
                const entries = [...sub.entries];
                entries[i] = { ...entry, lines: e.target.value };
                updateSub(sub.id, { entries });
              }}
              sx={{ mb: 0.5 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Beschriftung Eingabefeld"
              value={entry.inputLabel ?? ''}
              onChange={(e) => {
                const entries = [...sub.entries];
                entries[i] = { ...entry, inputLabel: e.target.value };
                updateSub(sub.id, { entries });
              }}
              sx={{ mb: 0.5 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Musterlösung"
              value={entry.solution}
              onChange={(e) => {
                const entries = [...sub.entries];
                entries[i] = { ...entry, solution: e.target.value };
                updateSub(sub.id, { entries });
              }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (sub.kind === 'roman-table') {
    const gapRows = collectRomanTableInputs(sub);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {gapRows.map((gap, i) => (
          <Box key={gap.answerId || i} sx={{ display: 'flex', gap: 1, ...editorRowFill(subIndex, i) }}>
            <TextField
              size="small"
              label="Feld"
              value={gap.label}
              disabled
              sx={{ width: 100 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Lösung"
              value={gap.solution}
              onChange={(e) => {
                if (sub.layout === 'triple-grid' && sub.gridRows) {
                  const gridRows = sub.gridRows.map((row) => ({
                    cells: row.cells.map((c) => {
                      if (
                        (c.kind === 'input-roman' || c.kind === 'input-decimal') &&
                        c.answerId === gap.answerId
                      ) {
                        return { ...c, solution: e.target.value };
                      }
                      if (c.kind === 'pair') {
                        return {
                          ...c,
                          left:
                            (c.left.kind === 'input-roman' || c.left.kind === 'input-decimal') &&
                            c.left.answerId === gap.answerId
                              ? { ...c.left, solution: e.target.value }
                              : c.left,
                          right:
                            (c.right.kind === 'input-roman' || c.right.kind === 'input-decimal') &&
                            c.right.answerId === gap.answerId
                              ? { ...c.right, solution: e.target.value }
                              : c.right,
                        };
                      }
                      return c;
                    }),
                  }));
                  updateSub(sub.id, { gridRows });
                } else if (sub.gaps) {
                  const gaps = [...sub.gaps];
                  const g = gaps[i];
                  if (g) gaps[i] = { ...g, solution: e.target.value };
                  updateSub(sub.id, { gaps });
                }
              }}
            />
          </Box>
        ))}
      </Box>
    );
  }

  if (sub.kind === 'rich-part') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sub.blocks.map((block, i) => (
          <RichBlockEditor
            key={i}
            block={block}
            subIndex={subIndex}
            rowIndex={i}
            editorRowFill={editorRowFill}
            onChange={(next) => {
              const blocks = [...sub.blocks];
              blocks[i] = next;
              updateSub(sub.id, { blocks });
            }}
          />
        ))}
      </Box>
    );
  }

  if (sub.kind === 'number-line') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          label="Hinweis für Schüler"
          value={sub.hint}
          onChange={(e) => updateSub(sub.id, { hint: e.target.value })}
        />
        {sub.fixed.map((f, i) => (
          <TextField
            key={f.answerId}
            fullWidth
            size="small"
            label={`Pfeil ${i + 1} — Lösung`}
            value={f.solution}
            onChange={(e) => {
              const fixed = [...sub.fixed];
              fixed[i] = { ...f, solution: e.target.value };
              updateSub(sub.id, { fixed });
            }}
            sx={editorRowFill(subIndex, i)}
          />
        ))}
        {sub.chips.map((c, i) => (
          <TextField
            key={c.answerId}
            fullWidth
            size="small"
            label={`${c.label} — Lösung`}
            value={c.solution}
            onChange={(e) => {
              const chips = [...sub.chips];
              chips[i] = { ...c, solution: e.target.value };
              updateSub(sub.id, { chips });
            }}
            sx={editorRowFill(subIndex, i + 10)}
          />
        ))}
      </Box>
    );
  }

  return null;
}

function RichBlockEditor({
  block,
  subIndex,
  rowIndex,
  editorRowFill,
  onChange,
}: {
  block: RichPartBlock;
  subIndex: number;
  rowIndex: number;
  editorRowFill: RowFill;
  onChange: (b: RichPartBlock) => void;
}) {
  const sx = editorRowFill(subIndex, rowIndex);

  if (block.type === 'p' || block.type === 'quote') {
    return (
      <TextField
        fullWidth
        multiline
        minRows={block.type === 'quote' ? 3 : 1}
        size="small"
        label={block.type === 'quote' ? 'Zitat' : 'Text'}
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        sx={sx}
      />
    );
  }

  if (block.type === 'field') {
    return (
      <Box sx={sx}>
        <TextField
          fullWidth
          size="small"
          label="Feld-Beschriftung"
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          sx={{ mb: 0.5 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Musterlösung"
          value={block.solution}
          onChange={(e) => onChange({ ...block, solution: e.target.value })}
        />
      </Box>
    );
  }

  if (block.type === 'place-table') {
    return (
      <Box sx={sx}>
        <Box sx={{ fontSize: 12, mb: 0.5 }}>Stellenwerttafel — Lösungen</Box>
        {block.cells.map((cell, ci) => (
          <TextField
            key={cell.answerId}
            size="small"
            label={block.headers[ci] || `Spalte ${ci + 1}`}
            value={cell.solution}
            onChange={(e) => {
              const cells = [...block.cells];
              cells[ci] = { ...cell, solution: e.target.value };
              onChange({ ...block, cells });
            }}
            sx={{ mr: 1, mb: 0.5, width: 72 }}
          />
        ))}
      </Box>
    );
  }

  if (block.type === 'inline-field') {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', ...sx }}>
        <TextField size="small" label="Text davor" value={block.before} onChange={(e) => onChange({ ...block, before: e.target.value })} sx={{ flex: 1, minWidth: 120 }} />
        <TextField size="small" label="Lösung" value={block.solution} onChange={(e) => onChange({ ...block, solution: e.target.value })} sx={{ width: 100 }} />
        <TextField size="small" label="Text danach" value={block.after} onChange={(e) => onChange({ ...block, after: e.target.value })} sx={{ flex: 1, minWidth: 80 }} />
      </Box>
    );
  }

  if (block.type === 'help') {
    return (
      <Box sx={{ ...sx, p: 1, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
        <Box sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Hilfestellung (Texte editierbar)</Box>
        {block.paragraphs.map((p, pi) => (
          <TextField
            key={pi}
            fullWidth
            multiline
            size="small"
            label={`Absatz ${pi + 1}`}
            value={p}
            onChange={(e) => {
              const paragraphs = [...block.paragraphs];
              paragraphs[pi] = e.target.value;
              onChange({ ...block, paragraphs });
            }}
            sx={{ mb: 0.5 }}
          />
        ))}
      </Box>
    );
  }

  return null;
}

export function RichPartAddBlockButton({
  sub,
  updateSub,
}: {
  sub: Extract<GridSubsection, { kind: 'rich-part' }>;
  updateSub: (id: string, patch: Partial<GridSubsection>) => void;
}) {
  return (
    <Button
      size="small"
      startIcon={<AddIcon />}
      onClick={() =>
        updateSub(sub.id, {
          blocks: [...sub.blocks, { type: 'p', text: '' }],
        })
      }
    >
      Textblock
    </Button>
  );
}
