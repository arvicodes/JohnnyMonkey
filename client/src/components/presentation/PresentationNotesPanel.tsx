import React, { useCallback, useEffect, useRef } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { DeleteOutline as TrashIcon } from '@mui/icons-material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import { sanitizePastedHtml, normalizeNotesHtml, handlePresentationTabKey } from '../../lib/presentationRichText';

export type NotesFieldKey = 'materialHtml' | 'preparationHtml' | 'speakerNotesHtml';

interface NoteZoneProps {
  fieldKey: NotesFieldKey;
  label: string;
  html?: string;
  plain?: string;
  active?: boolean;
  readOnly?: boolean;
  placeholder: string;
  flexGrow?: number;
  onChange: (html: string, plain: string) => void;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
  onMoveToTrash?: (fieldKey: NotesFieldKey) => void;
}

const NoteZone: React.FC<NoteZoneProps> = ({
  fieldKey,
  label,
  html,
  plain,
  active,
  readOnly,
  placeholder,
  flexGrow = 1,
  onChange,
  onEditorFocus,
  onEditorBlur,
  onMoveToTrash,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const displayHtml = normalizeNotesHtml(html || textToHtml(plain || ''));

  const persistContent = useCallback(
    (rawHtml: string, normalize = false) => {
      const nextHtml = normalize ? normalizeNotesHtml(rawHtml) : rawHtml;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el || readOnly || e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    handlePresentationTabKey(el, e.shiftKey);
    persistContent(el.innerHTML, false);
  };

  return (
    <Box
      sx={{
        flex: `${flexGrow} 1 0`,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        sx={{
          px: 1.25,
          pt: 0.75,
          pb: 0.35,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        {!readOnly && onMoveToTrash && (
          <Tooltip title="In Papierkorb verschieben">
            <IconButton
              size="small"
              onClick={() => onMoveToTrash(fieldKey)}
              sx={{ width: 22, height: 22, color: PRES_EDITOR_UI.textMuted }}
            >
              <TrashIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
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
        onKeyDown={handleKeyDown}
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
          '& ul, & ol': { m: 0, pl: '1.25em', mb: 0.5, listStylePosition: 'outside' },
          '& ul': { listStyleType: 'disc' },
          '& ul ul': { listStyleType: 'circle' },
          '& ul ul ul': { listStyleType: 'square' },
          '& ol': { listStyleType: 'decimal' },
          '& ol ol': { listStyleType: 'lower-alpha' },
          '& li': { mb: 0.25, display: 'list-item' },
          '& li > ul, & li > ol': { mt: 0.25, mb: 0 },
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
  materialHtml?: string;
  materialPlain?: string;
  preparationHtml?: string;
  preparationPlain?: string;
  speakerHtml?: string;
  speakerPlain?: string;
  activeField?: NotesFieldKey | null;
  readOnly?: boolean;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
  onMaterialChange: (html: string, plain: string) => void;
  onPreparationChange: (html: string, plain: string) => void;
  onSpeakerChange: (html: string, plain: string) => void;
  onMoveNotesToTrash?: (fieldKey: NotesFieldKey) => void;
}

const PresentationNotesPanel: React.FC<PresentationNotesPanelProps> = ({
  materialHtml,
  materialPlain,
  preparationHtml,
  preparationPlain,
  speakerHtml,
  speakerPlain,
  activeField,
  readOnly,
  onEditorFocus,
  onEditorBlur,
  onMaterialChange,
  onPreparationChange,
  onSpeakerChange,
  onMoveNotesToTrash,
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
        fieldKey="materialHtml"
        label="Material"
        html={materialHtml}
        plain={materialPlain}
        active={activeField === 'materialHtml'}
        readOnly={readOnly}
        flexGrow={1}
        placeholder="Arbeitsblätter, Links, Dateien…"
        onChange={onMaterialChange}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
        onMoveToTrash={onMoveNotesToTrash}
      />
      <NoteZone
        fieldKey="preparationHtml"
        label="Setup"
        html={preparationHtml}
        plain={preparationPlain}
        active={activeField === 'preparationHtml'}
        readOnly={readOnly}
        flexGrow={1}
        placeholder="Raum, Technik, Vorbereitung vor der Stunde…"
        onChange={onPreparationChange}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
        onMoveToTrash={onMoveNotesToTrash}
      />
      <NoteZone
        fieldKey="speakerNotesHtml"
        label="Sprechakte"
        html={speakerHtml}
        plain={speakerPlain}
        active={activeField === 'speakerNotesHtml'}
        readOnly={readOnly}
        flexGrow={1.15}
        placeholder="Was du sagst, Posen, Timing…"
        onChange={onSpeakerChange}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
        onMoveToTrash={onMoveNotesToTrash}
      />
    </Box>
  );
};

export default PresentationNotesPanel;
