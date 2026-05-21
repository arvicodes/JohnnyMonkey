import React, { useRef } from 'react';
import { flushSync } from 'react-dom';
import { TextField, type TextFieldProps } from '@mui/material';

function wrapSelection(
  text: string,
  selStart: number,
  selEnd: number,
  open: string,
  close: string
): { next: string; focusStart: number; focusEnd: number } {
  const inner = text.slice(selStart, selEnd);
  const next = text.slice(0, selStart) + open + inner + close + text.slice(selEnd);
  const focusStart = selStart + open.length;
  const focusEnd = focusStart + inner.length;
  return { next, focusStart, focusEnd };
}

export type SlideTextFieldWithFormatShortcutsProps = Omit<TextFieldProps, 'onChange' | 'multiline'> & {
  value: string;
  /** Nur der neue Gesamttext (controlled) */
  onChange: (value: string) => void;
  multiline?: true;
};

/**
 * Mehrzeiliges Textfeld mit Strg/Cmd+B (fett), Strg/Cmd+I (kursiv), Strg/Cmd+U (unterstreichen als `<u>`).
 */
export function SlideTextFieldWithFormatShortcuts({
  value,
  onChange,
  multiline = true,
  ...rest
}: SlideTextFieldWithFormatShortcutsProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const applyWrap = (open: string, close: string) => {
    const el = inputRef.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const { next, focusStart, focusEnd } = wrapSelection(value, start, end, open, close);
    flushSync(() => {
      onChange(next);
    });
    queueMicrotask(() => {
      const ta = inputRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(focusStart, focusEnd);
      }
    });
  };

  return (
    <TextField
      {...rest}
      multiline={multiline}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputRef={inputRef}
      onKeyDown={(e) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        if (e.altKey) return;
        const k = e.key.toLowerCase();
        if (k === 'b') {
          e.preventDefault();
          applyWrap('**', '**');
        } else if (k === 'i') {
          e.preventDefault();
          applyWrap('*', '*');
        } else if (k === 'u') {
          e.preventDefault();
          applyWrap('<u>', '</u>');
        }
      }}
    />
  );
}
