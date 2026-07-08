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
  FormatColorText,
  ImageOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';
import { HIGHLIGHT_PRESETS, TEXT_COLOR_PRESETS } from '../../lib/presentationTheme';
import { markSelectionRevealStep, nextRevealStepForEditor } from '../../lib/presentationReveal';
import {
  applyFontSize,
  applyHighlightColor,
  applyTextColor,
  bookmarkSelection,
  clearInlineFormatting,
  execFormat,
} from '../../lib/presentationRichText';

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
  contextLabel?: string;
  onInsertImage?: () => void;
  onEditorChanged?: () => void;
}

const PresentationFormatBar: React.FC<PresentationFormatBarProps> = ({
  activeEditor,
  disabled,
  contextLabel,
  onInsertImage,
  onEditorChanged,
}) => {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(null);

  const btnSx = {
    color: disabled || !activeEditor ? '#999' : '#444',
    p: 0.4,
    '&:hover': { bgcolor: '#e8e8e8' },
  };

  const applyAndNotify = (fn: () => void) => {
    bookmarkSelection(activeEditor);
    fn();
    onEditorChanged?.();
  };

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}
      onMouseDown={() => bookmarkSelection(activeEditor)}
    >
      {contextLabel && (
        <Typography variant="caption" sx={{ color: '#2E7D32', fontSize: 10, fontWeight: 700, mr: 0.5, minWidth: 52 }}>
          {contextLabel}
        </Typography>
      )}

      <Tooltip title="Fett">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'bold'))}>
            <FormatBold sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Kursiv">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'italic'))}>
            <FormatItalic sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Unterstrichen">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'underline'))}>
            <FormatUnderlined sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Durchgestrichen">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'strikeThrough'))}>
            <FormatStrikethrough sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />

      <Tooltip title="Aufzählung">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'insertUnorderedList'))}>
            <FormatListBulleted sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Nummerierung">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'insertOrderedList'))}>
            <FormatListNumbered sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />

      <Tooltip title="Links">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyLeft'))}>
            <FormatAlignLeft sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Zentriert">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyCenter'))}>
            <FormatAlignCenter sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Rechts">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyRight'))}>
            <FormatAlignRight sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />

      <Select
        size="small"
        defaultValue="3"
        disabled={disabled || !activeEditor}
        onChange={(e) => applyAndNotify(() => applyFontSize(activeEditor, e.target.value))}
        onMouseDown={(e) => e.stopPropagation()}
        sx={{
          color: '#444',
          fontSize: 11,
          height: 28,
          minWidth: 72,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
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
            onMouseDown={(e) => {
              e.preventDefault();
              bookmarkSelection(activeEditor);
            }}
            onClick={(e) => setColorAnchor(e.currentTarget)}
          >
            <FormatColorText sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, maxWidth: 200 }}>
          <Box
            onMouseDown={(e) => {
              e.preventDefault();
              bookmarkSelection(activeEditor);
              applyAndNotify(() => clearInlineFormatting(activeEditor, 'color'));
              setColorAnchor(null);
            }}
            sx={{
              mb: 0.75,
              py: 0.35,
              px: 0.75,
              borderRadius: 1,
              border: '1px dashed #bbb',
              fontSize: 11,
              color: '#666',
              cursor: 'pointer',
              textAlign: 'center',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Farbe entfernen
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {TEXT_COLOR_PRESETS.map((c) => (
            <Box
              key={c}
              onMouseDown={(e) => {
                e.preventDefault();
                bookmarkSelection(activeEditor);
                applyAndNotify(() => applyTextColor(activeEditor, c));
                setColorAnchor(null);
              }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: c,
                border: c === '#FFFFFF' ? '1px solid #999' : '1px solid #ccc',
                cursor: 'pointer',
              }}
            />
          ))}
          </Box>
        </Box>
      </Popover>

      <Tooltip title="Markierung">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => {
              e.preventDefault();
              bookmarkSelection(activeEditor);
            }}
            onClick={(e) => setHighlightAnchor(e.currentTarget)}
          >
            <Box sx={{ width: 14, height: 14, bgcolor: '#FFF59D', borderRadius: 0.5, border: '1px solid #888' }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(highlightAnchor)}
        anchorEl={highlightAnchor}
        onClose={() => setHighlightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, maxWidth: 200 }}>
          <Box
            onMouseDown={(e) => {
              e.preventDefault();
              bookmarkSelection(activeEditor);
              applyAndNotify(() => clearInlineFormatting(activeEditor, 'highlight'));
              setHighlightAnchor(null);
            }}
            sx={{
              mb: 0.75,
              py: 0.35,
              px: 0.75,
              borderRadius: 1,
              border: '1px dashed #bbb',
              fontSize: 11,
              color: '#666',
              cursor: 'pointer',
              textAlign: 'center',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Markierung entfernen
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {HIGHLIGHT_PRESETS.map((c) => (
            <Box
              key={c}
              onMouseDown={(e) => {
                e.preventDefault();
                bookmarkSelection(activeEditor);
                applyAndNotify(() => applyHighlightColor(activeEditor, c));
                setHighlightAnchor(null);
              }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                bgcolor: c,
                border: '1px solid #ccc',
                cursor: 'pointer',
              }}
            />
          ))}
          </Box>
        </Box>
      </Popover>

      {onInsertImage && (
        <>
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />
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
          <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />
        </>
      )}

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

      {!activeEditor && (
        <Typography variant="caption" sx={{ color: '#888', ml: 0.5, fontSize: 10 }}>
          Folie oder Notizen anklicken
        </Typography>
      )}
    </Box>
  );
};

export default PresentationFormatBar;
