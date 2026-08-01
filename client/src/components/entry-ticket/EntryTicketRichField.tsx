import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Popover, Tooltip } from '@mui/material';
import {
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  FormatColorText as FormatColorTextIcon,
  FormatColorFill as FormatColorFillIcon,
} from '@mui/icons-material';
import {
  entryTicketLooksLikeHtml,
  normalizeEntryTicketFieldValue,
} from '../../lib/entryTicketRichText';

const TEXT_COLORS = [
  '#1a237e',
  '#000000',
  '#c62828',
  '#ef6c00',
  '#2e7d32',
  '#1565c0',
  '#6a1b9a',
  '#00838f',
  '#ad1457',
];

const HIGHLIGHT_COLORS = [
  '#fff59d',
  '#c5e1a5',
  '#90caf9',
  '#f8bbd0',
  '#ffcc80',
  '#ce93d8',
  'transparent',
];

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Sanfter Hintergrund, z. B. für Antwort-Felder */
  softBg?: string;
  minHeight?: number;
};

function toEditorHtml(value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (entryTicketLooksLikeHtml(v)) return v;
  return v
    .split('\n')
    .map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') || '<br>'}</p>`)
    .join('');
}

export function EntryTicketRichField({
  value,
  onChange,
  placeholder = '',
  softBg = '#ffffff',
  minHeight = 52,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const nextHtml = toEditorHtml(value);
    if (el.innerHTML !== nextHtml) {
      el.innerHTML = nextHtml;
    }
    lastEmitted.current = value;
  }, [value]);

  // Erstes Mount: Inhalt setzen
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!el.innerHTML) {
      el.innerHTML = toEditorHtml(value);
      lastEmitted.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const next = normalizeEntryTicketFieldValue(el.innerHTML);
    lastEmitted.current = next;
    onChange(next);
  };

  const runCommand = (command: string, commandValue?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand(command, false, commandValue);
    } catch {
      /* ignore */
    }
    emitChange();
  };

  const toolBtnSx = {
    width: 24,
    height: 24,
    p: 0,
    borderRadius: 0.6,
    border: '1px solid #d0d7f0',
    color: '#3949ab',
    bgcolor: '#fff',
    '&:hover': { bgcolor: 'rgba(57,73,171,0.08)', borderColor: '#9fa8da' },
  } as const;

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        borderRadius: 1,
        border: '1px solid #d9e0ff',
        bgcolor: softBg,
        overflow: 'hidden',
        boxSizing: 'border-box',
        '&:focus-within': { borderColor: '#5c6bc0', boxShadow: '0 0 0 2px rgba(92,107,192,0.18)' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.3,
          px: 0.4,
          py: 0.25,
          borderBottom: '1px solid #e8ecf8',
          bgcolor: 'rgba(255,255,255,0.72)',
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Tooltip title="Fett">
          <IconButton size="small" aria-label="Fett" onClick={() => runCommand('bold')} sx={toolBtnSx}>
            <FormatBoldIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Kursiv">
          <IconButton size="small" aria-label="Kursiv" onClick={() => runCommand('italic')} sx={toolBtnSx}>
            <FormatItalicIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Unterstrichen">
          <IconButton
            size="small"
            aria-label="Unterstrichen"
            onClick={() => runCommand('underline')}
            sx={toolBtnSx}
          >
            <FormatUnderlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Textfarbe">
          <IconButton
            size="small"
            aria-label="Textfarbe"
            onClick={(e) => setColorAnchor(e.currentTarget)}
            sx={toolBtnSx}
          >
            <FormatColorTextIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Hintergrund">
          <IconButton
            size="small"
            aria-label="Hintergrundfarbe"
            onClick={(e) => setHighlightAnchor(e.currentTarget)}
            sx={toolBtnSx}
          >
            <FormatColorFillIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={placeholder || 'Text'}
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        sx={{
          minHeight,
          px: 0.75,
          py: 0.45,
          fontSize: '0.78rem',
          lineHeight: 1.35,
          color: '#1a237e',
          outline: 'none',
          cursor: 'text',
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: '#9aa3bd',
            pointerEvents: 'none',
          },
          '& p': { m: 0 },
          '& b, & strong': { fontWeight: 800 },
        }}
      />

      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 0.75, maxWidth: 160 }}>
          {TEXT_COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => {
                runCommand('foreColor', c);
                setColorAnchor(null);
              }}
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: c,
                border: '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
            />
          ))}
        </Box>
      </Popover>

      <Popover
        open={Boolean(highlightAnchor)}
        anchorEl={highlightAnchor}
        onClose={() => setHighlightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 0.75, maxWidth: 160 }}>
          {HIGHLIGHT_COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => {
                if (c === 'transparent') {
                  runCommand('removeFormat');
                } else {
                  runCommand('hiliteColor', c);
                  // Fallback für ältere Browser
                  runCommand('backColor', c);
                }
                setHighlightAnchor(null);
              }}
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                bgcolor: c === 'transparent' ? '#fff' : c,
                border: '1px solid rgba(0,0,0,0.25)',
                cursor: 'pointer',
                position: 'relative',
                ...(c === 'transparent'
                  ? {
                      '&::after': {
                        content: '"/"',
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#c62828',
                        fontWeight: 800,
                        fontSize: 12,
                      },
                    }
                  : null),
              }}
            />
          ))}
        </Box>
      </Popover>
    </Box>
  );
}
