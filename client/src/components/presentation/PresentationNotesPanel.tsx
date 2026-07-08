import React, { useCallback, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { normalizeRichHtml } from '../../lib/presentationRichText';

interface PresentationNotesPanelProps {
  html?: string;
  plain?: string;
  onChange: (html: string, plain: string) => void;
  onEditorFocus: (el: HTMLElement) => void;
  onEditorBlur?: () => void;
  active?: boolean;
  readOnly?: boolean;
}

const PresentationNotesPanel: React.FC<PresentationNotesPanelProps> = ({
  html,
  plain,
  onChange,
  onEditorFocus,
  onEditorBlur,
  active,
  readOnly,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const displayHtml = normalizeRichHtml(html || textToHtml(plain || ''));

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    const next = displayHtml || '<p><br></p>';
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [displayHtml]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  return (
    <Box
      sx={{
        borderTop: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        bgcolor: PRES_EDITOR_UI.panelBg,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 88,
        maxHeight: 128,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          px: 1.5,
          pt: 0.5,
          pb: 0.25,
          color: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
        }}
      >
        Sprecher-notizen
      </Typography>
      <Box
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onFocus={() => {
          if (readOnly) return;
          editingRef.current = true;
          if (ref.current) onEditorFocus(ref.current);
        }}
        onBlur={() => {
          if (readOnly) return;
          editingRef.current = false;
          if (ref.current) onChange(ref.current.innerHTML, htmlToPlain(ref.current.innerHTML));
          onEditorBlur?.();
        }}
        sx={{
          flex: 1,
          mx: 1,
          mb: 0.75,
          px: 1.25,
          py: 0.5,
          overflowY: 'auto',
          outline: 'none',
          fontSize: 13,
          lineHeight: 1.55,
          borderRadius: 1,
          border: '1px solid',
          borderColor: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.barBorder,
          bgcolor: readOnly ? PRES_EDITOR_UI.accentSoft : '#fff',
          cursor: readOnly ? 'default' : 'text',
          color: PRES_EDITOR_UI.text,
          '& p': { m: 0, mb: 0.5 },
          '& li': { mb: 0.25 },
          '& ul, & ol': { m: 0, pl: 2, mb: 0.5 },
          '& mark': { borderRadius: 0.5 },
          '&:empty:before': {
            content: '"Notizen für diese Folie…"',
            color: PRES_EDITOR_UI.textMuted,
          },
        }}
      />
    </Box>
  );
};

export default PresentationNotesPanel;
