import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  DeleteOutline as TrashIcon,
  ChevronRight as HideNotesIcon,
  StickyNote2Outlined as NotesIcon,
} from '@mui/icons-material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import { presentationNestedListSx, presentationNotesTableSx } from '../../lib/presentationListStyles';
import { sanitizePastedHtml, normalizeNotesHtml, handlePresentationTabKey, replaceArrowShortcutsNearCursor, tryMarkdownListShortcut, insertImageHtmlAtCursor } from '../../lib/presentationRichText';
import {
  enhancePresentationNotesImages,
  presentationNotesImageEditorSx,
  serializePresentationNotesHtml,
} from '../../lib/presentationNotesImages';
import {
  tryStartTableResizeFromPointer,
  updateTableResizeHoverCursor,
} from '../../lib/presentationTableResize';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

/** Ein Notizfeld (früher Material / Setup / Sprechakte). Legacy-Keys bleiben für Papierkorb. */
export type NotesFieldKey = 'materialHtml' | 'preparationHtml' | 'speakerNotesHtml';

const NOTES_WIDTH_STORAGE_KEY = 'johnny-pres-notes-width';
const NOTES_WIDTH_DEFAULT = 320;
const NOTES_WIDTH_MIN = 240;
const NOTES_WIDTH_MAX = 920;

function clampNotesWidth(raw: number): number {
  const viewportMax =
    typeof window === 'undefined'
      ? NOTES_WIDTH_MAX
      : Math.min(NOTES_WIDTH_MAX, Math.max(NOTES_WIDTH_MIN, Math.round(window.innerWidth * 0.62)));
  if (!Number.isFinite(raw)) return NOTES_WIDTH_DEFAULT;
  return Math.min(viewportMax, Math.max(NOTES_WIDTH_MIN, Math.round(raw)));
}

function loadNotesWidth(): number {
  try {
    const n = Number(localStorage.getItem(NOTES_WIDTH_STORAGE_KEY));
    return clampNotesWidth(n);
  } catch {
    return NOTES_WIDTH_DEFAULT;
  }
}

function persistNotesWidth(width: number) {
  try {
    localStorage.setItem(NOTES_WIDTH_STORAGE_KEY, String(width));
  } catch {
    /* ignore */
  }
}

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
  onMoveToTrash?: (fieldKey: NotesFieldKey) => void;
  /** Bild hochladen → Anzeige-URL (read-image API) */
  onUploadImage?: (file: File) => Promise<string | null>;
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
  onMoveToTrash,
  onUploadImage,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);
  const displayHtml = normalizeNotesHtml(html || textToHtml(plain || ''));

  const persistContent = useCallback(
    (rawHtml: string, normalize = false, writeBack = false) => {
      const nextHtml = normalize ? normalizeNotesHtml(rawHtml) : rawHtml;
      if (writeBack && ref.current && nextHtml !== ref.current.innerHTML) {
        ref.current.innerHTML = nextHtml;
      }
      onChange(nextHtml, htmlToPlain(nextHtml));
    },
    [onChange]
  );

  const persistFromEditor = useCallback(
    (normalize = false, writeBack = false) => {
      if (!ref.current) return;
      persistContent(serializePresentationNotesHtml(ref.current), normalize, writeBack);
    },
    [persistContent]
  );

  const enhanceImages = useCallback(() => {
    enhancePresentationNotesImages(ref.current, () => persistFromEditor(false, false));
  }, [persistFromEditor]);

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!ref.current || readOnly || !onUploadImage) return;
      if (!file.type.startsWith('image/')) return;
      const src = await onUploadImage(file);
      if (!src) return;
      ref.current.focus();
      insertImageHtmlAtCursor(ref.current, src, file.name);
      enhanceImages();
      persistFromEditor(false, false);
    },
    [onUploadImage, persistFromEditor, enhanceImages, readOnly]
  );

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    const next = displayHtml || '<p><br></p>';
    if (el.innerHTML !== next) el.innerHTML = next;
    if (!readOnly) enhanceImages();
  }, [displayHtml, enhanceImages, readOnly]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  useEffect(() => {
    const el = ref.current;
    if (!el || readOnly) return undefined;
    const onMouseUp = () => captureEditorSelection(el);
    el.addEventListener('mouseup', onMouseUp);
    const mo = new MutationObserver(() => enhanceImages());
    mo.observe(el, { childList: true, subtree: true });
    enhanceImages();
    return () => {
      el.removeEventListener('mouseup', onMouseUp);
      mo.disconnect();
    };
  }, [readOnly, displayHtml, enhanceImages]);

  const handleInput = () => {
    if (!ref.current || readOnly) return;
    replaceArrowShortcutsNearCursor(ref.current);
    persistFromEditor(false, false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const el = ref.current;
    if (!el || readOnly) return;

    const imageItem = Array.from(e.clipboardData.items || []).find(
      (it) => it.kind === 'file' && it.type.startsWith('image/')
    );
    const imageFile =
      imageItem?.getAsFile() ||
      Array.from(e.clipboardData.files || []).find((f) => f.type.startsWith('image/'));

    if (imageFile && onUploadImage) {
      e.preventDefault();
      void insertImageFile(imageFile);
      return;
    }

    e.preventDefault();
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
    enhanceImages();
    persistFromEditor(false, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el || readOnly) return;
    if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (tryMarkdownListShortcut(el)) {
        e.preventDefault();
        e.stopPropagation();
        persistFromEditor(false, false);
        return;
      }
    }
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    handlePresentationTabKey(el, e.shiftKey);
    persistFromEditor(false, false);
  };

  return (
    <Box
      sx={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {!readOnly && onUploadImage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void insertImageFile(f);
                  e.target.value = '';
                }}
              />
              <Tooltip title="Bild einfügen">
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (ref.current) onEditorFocus(fieldKey, ref.current);
                    fileInputRef.current?.click();
                  }}
                  sx={{ width: 22, height: 22, color: PRES_EDITOR_UI.textMuted }}
                >
                  <ImageOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
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
      </Box>
      <Box
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-pres-rich-zone
        data-pres-notes-zone="true"
        data-pres-base-fs="13"
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

          if (toFormatBar) return;
          if (ref.current?.getAttribute('data-pres-notes-dragging') === '1') {
            editingRef.current = true;
            return;
          }

          if (ref.current) {
            persistFromEditor(true, false);
          }

          editingRef.current = false;
          onEditorBlur?.();
        }}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          if (readOnly || !onUploadImage) return;
          if (![...e.dataTransfer.types].includes('Files')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          if (readOnly || !onUploadImage) return;
          const file = Array.from(e.dataTransfer.files || []).find((f) =>
            f.type.startsWith('image/')
          );
          if (!file) return;
          e.preventDefault();
          e.stopPropagation();
          void insertImageFile(file);
        }}
        onMouseDown={(e) => {
          if (!isFormatBarInteracting()) clearSavedSelection();
          if (readOnly) return;
          const hit = e.target as HTMLElement | null;
          if (hit?.closest?.('[data-pres-notes-img-wrap], .pres-notes-img-wrap')) return;
          if (
            tryStartTableResizeFromPointer(ref.current, e, {
              onDone: () => {
                persistFromEditor(true, false);
                if (ref.current) ref.current.style.cursor = '';
              },
            })
          ) {
            e.preventDefault();
          }
        }}
        onMouseMove={(e) => {
          if (readOnly) return;
          updateTableResizeHoverCursor(ref.current, e.clientX, e.clientY);
        }}
        onMouseLeave={() => {
          if (ref.current) ref.current.style.cursor = '';
        }}
        sx={{
          flex: 1,
          minHeight: 0,
          mx: 1,
          mb: 1,
          px: 1.25,
          py: 1,
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
          wordBreak: 'break-word',
          '& p, & div': { m: 0, mb: 0.5, ml: 0, pl: 0, textIndent: 0 },
          '& blockquote': { m: 0, mb: 0.5, ml: 0, pl: '0.75em', borderLeft: '2px solid #ccc' },
          '& li > p': { display: 'block', listStyle: 'none' },
          ...presentationNestedListSx({
            scale: 1,
            listPaddingPx: '1.25em',
            itemGapPx: 2,
            listGapPx: 4,
          }),
          ...presentationNotesTableSx(),
          ...presentationNotesImageEditorSx(),
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
  speakerHtml?: string;
  speakerPlain?: string;
  activeField?: NotesFieldKey | null;
  readOnly?: boolean;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
  onSpeakerChange: (html: string, plain: string) => void;
  onMoveNotesToTrash?: (fieldKey: NotesFieldKey) => void;
  /** Bild hochladen → Anzeige-URL für Notizen */
  onUploadImage?: (file: File) => Promise<string | null>;
  /** Notizleiste ausblenden (mehr Platz für die Folie). */
  onHide?: () => void;
}

const PresentationNotesPanel: React.FC<PresentationNotesPanelProps> = ({
  speakerHtml,
  speakerPlain,
  activeField,
  readOnly,
  onEditorFocus,
  onEditorBlur,
  onSpeakerChange,
  onMoveNotesToTrash,
  onUploadImage,
  onHide,
}) => {
  const [panelWidth, setPanelWidth] = useState(loadNotesWidth);
  const resizeRef = useRef<{ pointerId: number; startX: number; startW: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startW: panelWidth,
    };
    setResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [panelWidth]);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = resizeRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const next = clampNotesWidth(drag.startW + (drag.startX - e.clientX));
    setPanelWidth(next);
  }, []);

  const endResize = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const drag = resizeRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    resizeRef.current = null;
    setResizing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setPanelWidth((w) => {
      const next = clampNotesWidth(w);
      persistNotesWidth(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!resizing) return undefined;
    const prev = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prev;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizing]);

  return (
    <Box
      sx={{
        width: panelWidth,
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: PRES_EDITOR_UI.panelBg,
        borderLeft: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Notizfeld breiter oder schmaler ziehen"
        aria-valuenow={panelWidth}
        aria-valuemin={NOTES_WIDTH_MIN}
        aria-valuemax={NOTES_WIDTH_MAX}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={endResize}
        onPointerCancel={endResize}
        onDoubleClick={() => {
          const next = NOTES_WIDTH_DEFAULT;
          setPanelWidth(next);
          persistNotesWidth(next);
        }}
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 8,
          zIndex: 3,
          cursor: 'col-resize',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover .pres-notes-resize-bar, &:focus-visible .pres-notes-resize-bar': {
            bgcolor: PRES_EDITOR_UI.accent,
            opacity: 1,
          },
        }}
      >
        <Box
          className="pres-notes-resize-bar"
          sx={{
            width: 3,
            height: 36,
            borderRadius: 999,
            bgcolor: resizing ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.panelBorder,
            opacity: resizing ? 1 : 0.85,
            pointerEvents: 'none',
          }}
        />
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          px: 1,
          py: 0.35,
          borderBottom: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
          bgcolor: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <NotesIcon sx={{ fontSize: 14, color: PRES_EDITOR_UI.textMuted }} />
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: PRES_EDITOR_UI.textMuted,
              letterSpacing: 0.02,
            }}
          >
            Notizen
          </Typography>
        </Box>
        {onHide && (
          <Tooltip title="Notizen ausblenden">
            <IconButton
              size="small"
              onClick={onHide}
              aria-label="Notizen ausblenden"
              sx={{
                width: 26,
                height: 26,
                color: PRES_EDITOR_UI.textMuted,
                '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, color: PRES_EDITOR_UI.accent },
              }}
            >
              <HideNotesIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <NoteZone
        fieldKey="speakerNotesHtml"
        label="Notizen"
        html={speakerHtml}
        plain={speakerPlain}
        active={activeField === 'speakerNotesHtml'}
        readOnly={readOnly}
        placeholder="Material, Setup, Sprechakte, Timing…"
        onChange={onSpeakerChange}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
        onMoveToTrash={onMoveNotesToTrash}
        onUploadImage={onUploadImage}
      />
    </Box>
  );
};

export default PresentationNotesPanel;
