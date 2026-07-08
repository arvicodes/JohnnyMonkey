import React, { useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatListBulleted,
  FormatListNumbered,
  FormatColorFill,
  ImageOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import { HIGHLIGHT_PRESETS, TEXT_COLOR_PRESETS } from '../../lib/presentationTheme';
import { markSelectionRevealStep, nextRevealStepForEditor } from '../../lib/presentationReveal';

const FONT_SIZES = [
  { label: 'Klein', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Groß', value: '4' },
  { label: 'Titel', value: '5' },
  { label: 'Hero', value: '6' },
  { label: 'Riesig', value: '7' },
];

interface PresentationFormatBarProps {
  activeEditor: HTMLElement | null;
  disabled?: boolean;
  onInsertImage?: () => void;
  onEditorChanged?: () => void;
}

function runCmd(editor: HTMLElement | null, cmd: string, value?: string) {
  if (!editor) return;
  editor.focus();
  document.execCommand(cmd, false, value);
}

const PresentationFormatBar: React.FC<PresentationFormatBarProps> = ({
  activeEditor,
  disabled,
  onInsertImage,
  onEditorChanged,
}) => {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(null);

  const btnSx = {
    color: disabled || !activeEditor ? '#666' : '#ddd',
    p: 0.4,
    '&:hover': { bgcolor: '#3c3c3c' },
  };

  const applyAndNotify = (fn: () => void) => {
    fn();
    onEditorChanged?.();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
      <Tooltip title="Fett">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'bold'))}>
            <FormatBold sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Kursiv">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'italic'))}>
            <FormatItalic sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Unterstrichen">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'underline'))}>
            <FormatUnderlined sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Durchgestrichen">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'strikeThrough'))}>
            <FormatStrikethrough sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#444', mx: 0.25 }} />

      <Tooltip title="Aufzählung">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'insertUnorderedList'))}>
            <FormatListBulleted sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Nummerierung">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'insertOrderedList'))}>
            <FormatListNumbered sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#444', mx: 0.25 }} />

      <Tooltip title="Links">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'justifyLeft'))}>
            <FormatAlignLeft sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Zentriert">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'justifyCenter'))}>
            <FormatAlignCenter sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Rechts">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => runCmd(activeEditor, 'justifyRight'))}>
            <FormatAlignRight sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#444', mx: 0.25 }} />

      <Select
        size="small"
        defaultValue="3"
        disabled={disabled || !activeEditor}
        onChange={(e) => applyAndNotify(() => runCmd(activeEditor, 'fontSize', e.target.value))}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          color: '#ccc',
          fontSize: 11,
          height: 28,
          minWidth: 72,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
        }}
      >
        {FONT_SIZES.map((f) => (
          <MenuItem key={f.value} value={f.value} dense>
            {f.label}
          </MenuItem>
        ))}
      </Select>

      <Tooltip title="Textfarbe">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onClick={(e) => setColorAnchor(e.currentTarget)}
          >
            <FormatColorFill sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, maxWidth: 180 }}>
          {TEXT_COLOR_PRESETS.map((c) => (
            <Box
              key={c}
              onClick={() => {
                applyAndNotify(() => runCmd(activeEditor, 'foreColor', c));
                setColorAnchor(null);
              }}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: c,
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>
      </Popover>

      <Tooltip title="Markierung / Hintergrund">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onClick={(e) => setHighlightAnchor(e.currentTarget)}
          >
            <Box sx={{ width: 14, height: 14, bgcolor: '#FFF59D', borderRadius: 0.5 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(highlightAnchor)}
        anchorEl={highlightAnchor}
        onClose={() => setHighlightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75, maxWidth: 180 }}>
          {HIGHLIGHT_PRESETS.map((c) => (
            <Box
              key={c}
              onClick={() => {
                applyAndNotify(() => runCmd(activeEditor, 'backColor', c));
                setHighlightAnchor(null);
              }}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: c,
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>
      </Popover>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#444', mx: 0.25 }} />

      <Tooltip title="Als Einblend-Schritt markieren">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              applyAndNotify(() => {
                if (!activeEditor) return;
                const step = nextRevealStepForEditor(activeEditor.innerHTML);
                markSelectionRevealStep(activeEditor, step);
              })
            }
          >
            <VisibilityOutlined sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      {onInsertImage && (
        <>
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#444', mx: 0.25 }} />
          <Tooltip title="Bild einfügen">
            <span>
              <IconButton
                size="small"
                disabled={disabled || !activeEditor}
                sx={btnSx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={onInsertImage}
              >
                <ImageOutlined sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}

      {!activeEditor && (
        <Typography variant="caption" sx={{ color: '#777', ml: 0.5, fontSize: 10 }}>
          Textbereich auf Folie anklicken
        </Typography>
      )}
    </Box>
  );
};

export default PresentationFormatBar;
