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
  FormatAlignJustify,
  FormatListBulleted,
  FormatListNumbered,
  FormatIndentIncrease,
  FormatIndentDecrease,
  FormatColorText,
  ImageOutlined,
  EmojiEmotions,
  Remove as RemoveIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { HIGHLIGHT_PRESETS, TEXT_COLOR_PRESETS } from '../../lib/presentationTheme';
import { setFormatBarInteracting } from '../../lib/presentationFormatBarGuard';
import {
  applyFontFamily,
  applyFontSizePx,
  applyHighlightColor,
  applyTextColor,
  bookmarkSelection,
  clearFontFamilyInSelection,
  clearInlineFormatting,
  execFormat,
  getEditorFontSizeSteps,
  getSelectionFontSizePx,
  nudgeFontSize,
  stashEditorSelection,
  insertTextAtCursor,
} from '../../lib/presentationRichText';
import { PRESENTATION_EMOJI_GROUPS } from '../../lib/presentationEmojis';
import {
  getEditorSelectionFontFamily,
  PRESENTATION_FONT_FAMILIES,
  presentationFontLabel,
} from '../../lib/presentationFonts';

const MOD_LABEL = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? '⌘' : 'Strg';

/** Sentinel — never use value="" with a disabled MenuItem (MUI Select render loop). */
const FONT_SIZE_PLACEHOLDER = '__pres_font_size__';

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
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [fontPx, setFontPx] = useState<number | ''>('');
  const [fontFamily, setFontFamily] = useState('');

  const fontSteps = activeEditor ? getEditorFontSizeSteps(activeEditor) : [];
  const fontSizeSelectValue =
    fontPx !== '' && fontSteps.includes(Number(fontPx))
      ? String(fontPx)
      : FONT_SIZE_PLACEHOLDER;
  const syncFormatting = useCallback(() => {
    if (!activeEditor) {
      setFontPx((prev) => (prev === '' ? prev : ''));
      setFontFamily((prev) => (prev === '' ? prev : ''));
      return;
    }
    const nextPx = getSelectionFontSizePx(activeEditor) ?? '';
    const nextFamily = getEditorSelectionFontFamily(activeEditor);
    setFontPx((prev) => (prev === nextPx ? prev : nextPx));
    setFontFamily((prev) => (prev === nextFamily ? prev : nextFamily));
  }, [activeEditor]);

  useEffect(() => {
    syncFormatting();
    if (!activeEditor) return undefined;
    const persistSelection = () => bookmarkSelection(activeEditor);
    const onSelectionChange = () => {
      bookmarkSelection(activeEditor);
      syncFormatting();
    };
    activeEditor.addEventListener('keyup', persistSelection);
    activeEditor.addEventListener('mouseup', persistSelection);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      activeEditor.removeEventListener('keyup', persistSelection);
      activeEditor.removeEventListener('mouseup', persistSelection);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [activeEditor, syncFormatting]);

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
    if (refreshSize) syncFormatting();
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
      syncFormatting();
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
      <Tooltip title="Einzug vergrößern (Tab)">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'indent'))}>
            <FormatIndentIncrease sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Einzug verkleinern (Shift+Tab)">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'outdent'))}>
            <FormatIndentDecrease sx={{ fontSize: 17 }} />
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
      <Tooltip title="Blocksatz">
        <span>
          <IconButton size="small" disabled={disabled || !activeEditor} sx={btnSx} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAndNotify(() => execFormat(activeEditor, 'justifyFull'))}>
            <FormatAlignJustify sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation="vertical" flexItem sx={{ borderColor: '#ccc', mx: 0.25 }} />

      <Select
        size="small"
        value={
          fontFamily && PRESENTATION_FONT_FAMILIES.some((f) => f.value === fontFamily)
            ? fontFamily
            : ''
        }
        displayEmpty
        disabled={disabled || !activeEditor}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            applyAndNotify(() => clearFontFamilyInSelection(activeEditor), true);
            return;
          }
          applyAndNotify(() => applyFontFamily(activeEditor, value), true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        renderValue={(v) => presentationFontLabel(v)}
        sx={{
          color: '#444',
          fontSize: 11,
          height: 28,
          minWidth: 88,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        }}
      >
        <MenuItem value="" dense>
          Standard
        </MenuItem>
        {PRESENTATION_FONT_FAMILIES.map((font) => (
          <MenuItem key={font.value} value={font.value} dense sx={{ fontFamily: font.value }}>
            {font.label}
          </MenuItem>
        ))}
      </Select>

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
        value={fontSizeSelectValue}
        disabled={disabled || !activeEditor}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === FONT_SIZE_PLACEHOLDER) return;
          const px = parseInt(raw, 10);
          if (!Number.isFinite(px)) return;
          applyAndNotify(() => applyFontSizePx(activeEditor, px), true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        renderValue={(v) =>
          v && v !== FONT_SIZE_PLACEHOLDER ? `${v} px` : 'Größe'
        }
        sx={{
          color: '#444',
          fontSize: 11,
          height: 28,
          minWidth: 76,
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        }}
      >
        <MenuItem value={FONT_SIZE_PLACEHOLDER} dense sx={{ display: 'none' }}>
          Größe
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
        <Box data-presentation-format-ui sx={{ p: 1, maxWidth: 260 }}>
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
        <Box data-presentation-format-ui sx={{ p: 1, maxWidth: 260 }}>
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

      <Tooltip title="Emoji einfügen">
        <span>
          <IconButton
            size="small"
            disabled={disabled || !activeEditor}
            sx={btnSx}
            onMouseDown={(e) => {
              e.preventDefault();
              bookmarkSelection(activeEditor);
            }}
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
          >
            <EmojiEmotions sx={{ fontSize: 17 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => {
          setEmojiAnchor(null);
          setFormatBarInteracting(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box
          data-presentation-format-ui
          sx={{ p: 1, maxWidth: 280, maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'thin' }}
        >
          {PRESENTATION_EMOJI_GROUPS.map((group, groupIndex) => (
            <Box
              key={group.label}
              sx={{ mb: groupIndex < PRESENTATION_EMOJI_GROUPS.length - 1 ? 0.75 : 0 }}
            >
              <Typography
                variant="caption"
                sx={{ display: 'block', color: '#666', fontSize: 10, fontWeight: 600, mb: 0.35 }}
              >
                {group.label}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35 }}>
                {group.emojis.map((emoji) => (
                  <Box
                    key={emoji}
                    component="button"
                    type="button"
                    aria-label={`Emoji ${emoji}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      bookmarkSelection(activeEditor);
                      applyAndNotify(() => {
                        insertTextAtCursor(activeEditor, emoji);
                      });
                      setEmojiAnchor(null);
                    }}
                    sx={{
                      width: 28,
                      height: 28,
                      p: 0,
                      border: '1px solid transparent',
                      borderRadius: 1,
                      bgcolor: 'transparent',
                      fontSize: 18,
                      lineHeight: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:hover': { bgcolor: '#f0f0f0', borderColor: '#ddd' },
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
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

    </Box>
  );
};

export default PresentationFormatBar;
