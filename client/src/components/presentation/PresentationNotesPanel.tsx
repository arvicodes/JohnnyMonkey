import React, { useCallback, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import { sanitizePastedHtml, stripNotesBlockIndent } from '../../lib/presentationRichText';

export type NotesFieldKey = 'preparationHtml' | 'speakerNotesHtml';

interface NoteZoneProps {
  fieldKey: NotesFieldKey;
  label: string;
  html?: string;
  plain?: string;
  active?: boolean;
  readOnly?: boolean;
  placeholder: string;
  onChange: (html: string, plain: string) => void;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
}

const NoteZone: React.FC<NoteZoneProps> = ({
  fieldKey,
  label,
  html,
  plain,
  active,
  readOnly,
  placeholder,
  onChange,
  onEditorFocus,
  onEditorBlur,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const displayHtml = stripNotesBlockIndent(html || textToHtml(plain || ''));

  const persistContent = useCallback(
    (rawHtml: string, normalize = false) => {
      const nextHtml = normalize ? stripNotesBlockIndent(rawHtml) : rawHtml;
      if (ref.current && nextHtml !== ref.current.innerHTML) {
        ref.current.innerHTML = nextHtml;
      }
      onChange(nextHtml, htmlToPlain(nextHtml));
    },
    [onChange]
  );

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    const next = displayHtml || '<p><br></p>';
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [displayHtml]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  useEffect(() => {
    const el = ref.current;
    if (!el || readOnly) return undefined;
    const onMouseUp = () => captureEditorSelection(el);
    el.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mouseup', onMouseUp);
    };
  }, [readOnly, displayHtml]);

  const handleInput = () => {
    if (!ref.current || readOnly) return;
    persistContent(ref.current.innerHTML, false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el || readOnly) return;
    const pastedHtml = e.clipboardData.getData('text/html');
    const pastedText = e.clipboardData.getData('text/plain');
    const content = pastedHtml
      ? sanitizePastedHtml(pastedHtml)
      : textToHtml(pastedText);
    el.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* ignore */
    }
    document.execCommand('insertHTML', false, content || '<p><br></p>');
    persistContent(el.innerHTML, false);
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          px: 1.25,
          pt: 0.75,
          pb: 0.35,
          color: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Box
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-pres-rich-zone
        data-pres-notes-zone="true"
        data-pres-base-fs="12"
        data-notes-field={fieldKey}
        onFocus={() => {
          if (readOnly) return;
          editingRef.current = true;
          if (ref.current) onEditorFocus(fieldKey, ref.current);
        }}
        onBlur={(e) => {
          if (readOnly) return;

          const next = e.relatedTarget as HTMLElement | null;
          const toFormatBar =
            isFormatBarInteracting() || isPresentationFormatUiTarget(next);
          const toSiblingNote = !!next?.closest('[data-notes-field]');

          if (toFormatBar) return;

          if (ref.current) {
            persistContent(ref.current.innerHTML, true);
          }

          editingRef.current = false;

          if (toSiblingNote) return;

          onEditorBlur?.();
        }}
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseDown={() => {
          if (!isFormatBarInteracting()) clearSavedSelection();
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          mx: 1,
          mb: 0.75,
          px: 1,
          py: 0.5,
          overflowY: 'auto',
          outline: 'none',
          fontSize: 12,
          lineHeight: 1.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.barBorder,
          bgcolor: readOnly ? PRES_EDITOR_UI.accentSoft : '#fff',
          cursor: readOnly ? 'default' : 'text',
          color: PRES_EDITOR_UI.text,
          wordBreak: 'break-word',
          '& p, & div': { m: 0, mb: 0.5, ml: 0, pl: 0, textIndent: 0 },
          '& blockquote': { m: 0, mb: 0.5, ml: 0, pl: '0.75em', borderLeft: '2px solid #ccc' },
          '& ul, & ol': { m: 0, pl: '1.25em', mb: 0.5 },
          '& li': { mb: 0.25 },
          '& mark': { borderRadius: 0.5 },
          '& [data-pres-fs]': { lineHeight: 'inherit' },
          '& [data-pres-color]': { lineHeight: 'inherit' },
          '& [data-pres-highlight]': { lineHeight: 'inherit' },
          '& b, & strong': { fontWeight: 700 },
          '& i, & em': { fontStyle: 'italic' },
          '& u': { textDecoration: 'underline' },
          '&:empty:before': {
            content: `"${placeholder}"`,
            color: PRES_EDITOR_UI.textMuted,
            fontStyle: 'italic',
          },
        }}
      />
    </Box>
  );
};

interface PresentationNotesPanelProps {
  preparationHtml?: string;
  preparationPlain?: string;
  speakerHtml?: string;
  speakerPlain?: string;
  activeField?: NotesFieldKey | null;
  readOnly?: boolean;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
  onPreparationChange: (html: string, plain: string) => void;
  onSpeakerChange: (html: string, plain: string) => void;
}

const PresentationNotesPanel: React.FC<PresentationNotesPanelProps> = ({
  preparationHtml,
  preparationPlain,
  speakerHtml,
  speakerPlain,
  activeField,
  readOnly,
  onEditorFocus,
  onEditorBlur,
  onPreparationChange,
  onSpeakerChange,
}) => {
  return (
    <Box
      sx={{
        width: 272,
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: PRES_EDITOR_UI.panelBg,
        borderLeft: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        overflow: 'hidden',
      }}
    >
      <NoteZone
        fieldKey="preparationHtml"
        label="Vorbereitung & Material"
        html={preparationHtml}
        plain={preparationPlain}
        active={activeField === 'preparationHtml'}
        readOnly={readOnly}
        placeholder="Material, Links, Vorbereitung…"
        onChange={onPreparationChange}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
      />
      <NoteZone
        fieldKey="speakerNotesHtml"
        label="Sprechakte"
        html={speakerHtml}
        plain={speakerPlain}
        active={activeField === 'speakerNotesHtml'}
        readOnly={readOnly}
        placeholder="Was du sagst, Posen, Timing…"
        onChange={onSpeakerChange}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
      />
    </Box>
  );
};

export default PresentationNotesPanel;
