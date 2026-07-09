import React, { useCallback, useEffect, useState } from 'react';
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
  Remove as RemoveIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { HIGHLIGHT_PRESETS, TEXT_COLOR_PRESETS } from '../../lib/presentationTheme';
import { setFormatBarInteracting } from '../../lib/presentationFormatBarGuard';
import { markSelectionRevealStep, nextRevealStepForEditor } from '../../lib/presentationReveal';
import {
  applyFontSizePx,
  applyHighlightColor,
  applyTextColor,
  bookmarkSelection,
  clearInlineFormatting,
  execFormat,
  getEditorFontSizeSteps,
  getSelectionFontSizePx,
  nudgeFontSize,
  stashEditorSelection,
} from '../../lib/presentationRichText';

const MOD_LABEL = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘' : 'Strg';

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
  const [fontPx, setFontPx] = useState<number | ''>('');

  const fontSteps = activeEditor ? getEditorFontSizeSteps(activeEditor) : [];

  const syncFontSize = useCallback(() => {
    if (!activeEditor) {
      setFontPx('');
      return;
    }
    setFontPx(getSelectionFontSizePx(activeEditor) ?? '');
  }, [activeEditor]);

  useEffect(() => {
    syncFontSize();
    if (!activeEditor) return undefined;
    const persistSelection = () => bookmarkSelection(activeEditor);
    const onSelectionChange = () => {
      bookmarkSelection(activeEditor);
      syncFontSize();
    };
    activeEditor.addEventListener('keyup', persistSelection);
    activeEditor.addEventListener('mouseup', persistSelection);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      activeEditor.removeEventListener('keyup', persistSelection);
      activeEditor.removeEventListener('mouseup', persistSelection);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [activeEditor, syncFontSize]);

  const btnSx = {
    color: disabled || !activeEditor ? '#999' : '#444',
    p: 0.4,
    '&:hover': { bgcolor: '#e8e8e8' },
  };

  const applyAndNotify = (fn: () => void, refreshSize = false) => {
    if (!activeEditor) return;
    setFormatBarInteracting(true);
    stashEditorSelection(activeEditor);
    fn();
    if (refreshSize) syncFontSize();
    onEditorChanged?.();
    window.setTimeout(() => setFormatBarInteracting(false), 0);
  };

  const preventToolbarFocus = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const isSelectTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el?.closest('.MuiSelect-root, .MuiPopover-root, .MuiMenu-root, [role="listbox"]');
  };

  const handleNudge = (dir: 1 | -1) => {
    setFormatBarInteracting(true);
    stashEditorSelection(activeEditor);
    const px = nudgeFontSize(activeEditor, dir);
    if (px != null) {
      syncFontSize();
      onEditorChanged?.();
    }
    window.setTimeout(() => setFormatBarInteracting(false), 0);
  };

  const beginFormatBarInteraction = () => {
    setFormatBarInteracting(true);
    stashEditorSelection(activeEditor);
  };

  return (
    <Box
      data-presentation-format-bar
      sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}
      onPointerDownCapture={() => beginFormatBarInteraction()}
      onMouseDownCapture={() => stashEditorSelection(activeEditor)}
      onMouseDown={(e) => {
        if (!isSelectTarget(e.target)) preventToolbarFocus(e);
      }}
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

      <Tooltip title={`Kleiner (${MOD_LABEL}+[)`}>
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={{ ...btnSx, width: 26, height: 26 }}
            onMouseDown={(e) => {
              preventToolbarFocus(e);
              if (disabled || !activeEditor) return;
              handleNudge(-1);
            }}
          >
            <RemoveIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Select
        size="small"
        value={fontPx === '' ? '' : String(fontPx)}
        displayEmpty
        disabled={disabled || !activeEditor}
        onChange={(e) => {
          const px = parseInt(e.target.value, 10);
          if (!Number.isFinite(px)) return;
          applyAndNotify(() => applyFontSizePx(activeEditor, px), true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        renderValue={(v) => (v ? `${v} px` : 'Größe')}
        sx={{
          color: '#444',
          fontSize: 11,
          height: 28,
          minWidth: 76,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        }}
      >
        <MenuItem value="" disabled dense>
          Schriftgröße
        </MenuItem>
        {fontSteps.map((px) => (
          <MenuItem key={px} value={String(px)} dense>
            {px} px
          </MenuItem>
        ))}
      </Select>

      <Tooltip title={`Größer (${MOD_LABEL}+])`}>
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={{ ...btnSx, width: 26, height: 26 }}
            onMouseDown={(e) => {
              preventToolbarFocus(e);
              if (disabled || !activeEditor) return;
              handleNudge(1);
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />

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
        onClose={() => {
          setColorAnchor(null);
          setFormatBarInteracting(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box data-presentation-format-ui sx={{ p: 1, maxWidth: 200 }}>
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
        onClose={() => {
          setHighlightAnchor(null);
          setFormatBarInteracting(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box data-presentation-format-ui sx={{ p: 1, maxWidth: 200 }}>
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

    </Box>
  );
};

export default PresentationFormatBar;
