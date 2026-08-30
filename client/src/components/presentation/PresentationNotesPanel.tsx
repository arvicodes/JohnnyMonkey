import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  DeleteOutline as TrashIcon,
  ChevronRight as HideNotesIcon,
  StickyNote2Outlined as NotesIcon,
  Edit as PenIcon,
  Keyboard as KeyboardIcon,
  AutoFixOff as EraserIcon,
  ClearAll as ClearInkIcon,
} from '@mui/icons-material';
import { htmlToPlain, textToHtml, type PresentationNotesInkStroke } from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import { presentationNotesHighlightSx, restampNotesHighlights, restampNotesHighlightsHtml } from '../../lib/presentationTheme';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { isApplyingDeckHistory } from '../../lib/presentationEditorHistory';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import { presentationNestedListSx, presentationNotesTableSx } from '../../lib/presentationListStyles';
import { sanitizePastedHtml, normalizeNotesHtml, handlePresentationTabKey, replaceArrowShortcutsNearCursor, tryMarkdownListShortcut, insertImageHtmlAtCursor } from '../../lib/presentationRichText';
import {
  enhancePresentationNotesImages,
  presentationNotesImageEditorSx,
  serializePresentationNotesHtml,
  placeNotesCaretInTypingHost,
  placeNotesCaretAtPoint,
  selectAllNotesContent,
  notesClipboardHtml,
  unwrapJohnnyNotesCopyHtml,
  wrapJohnnyNotesCopyHtml,
  handleNotesImageDeleteKey,
  clearNotesImageSelection,
  toggleNotesImageFrame,
} from '../../lib/presentationNotesImages';
import { isImageFrameShortcut } from '../../lib/presentationImageFrames';
import {
  tryStartTableResizeFromPointer,
  updateTableResizeHoverCursor,
} from '../../lib/presentationTableResize';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { clipboardHasImage, clipboardPrefersRichText, collectPasteImages } from '../../lib/goodNotesClipboard';
import PresentationNotesInkCanvas, { type NotesInkMode } from './PresentationNotesInkCanvas';
import '../../styles/presentationLists.css';

/** Ein Notizfeld (früher Material / Setup / Sprechakte). Legacy-Keys bleiben für Papierkorb. */
export type NotesFieldKey = 'materialHtml' | 'preparationHtml' | 'speakerNotesHtml';

const NOTES_WIDTH_STORAGE_KEY = 'johnny-pres-notes-width';
const NOTES_WIDTH_DEFAULT = 320;
const NOTES_WIDTH_MIN = 240;
const NOTES_WIDTH_MAX = 920;

const NOTES_INK_COLORS = [
  { label: 'Schwarz', value: '#111827' },
  { label: 'Grau', value: '#546e7a' },
  { label: 'Rot', value: '#c62828' },
  { label: 'Orange', value: '#ef6c00' },
  { label: 'Grün', value: '#2e7d32' },
  { label: 'Blau', value: '#1565c0' },
  { label: 'Violett', value: '#6a1b9a' },
] as const;

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
  slideId?: string;
  active?: boolean;
  readOnly?: boolean;
  placeholder: string;
  onChange: (html: string, plain: string) => void;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
  onMoveToTrash?: (fieldKey: NotesFieldKey) => void;
  /** Vor Löschen/Einfügen: aktuellen Deck-Stand in die Rückgängig-Liste legen. */
  onBeforeDiscreteEdit?: () => void;
  /** Bild hochladen → Anzeige-URL (read-image API) */
  onUploadImage?: (file: File) => Promise<string | null>;
  inkStrokes?: PresentationNotesInkStroke[];
  inkMode: NotesInkMode;
  inkColor: string;
  onInkChange?: (strokes: PresentationNotesInkStroke[]) => void;
}

const NoteZone: React.FC<NoteZoneProps> = ({
  fieldKey,
  label,
  html,
  plain,
  slideId,
  active,
  readOnly,
  placeholder,
  onChange,
  onEditorFocus,
  onEditorBlur,
  onMoveToTrash,
  onBeforeDiscreteEdit,
  onUploadImage,
  inkStrokes,
  inkMode,
  inkColor,
  onInkChange,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);
  const rawDisplay = html || textToHtml(plain || '');
  const displayHtml = restampNotesHighlightsHtml(
    /tabindex=|autoid=|role="(?:list|document|heading)"|Item\.Message|x_divtagdefaultwrapper|_rp_/i.test(
      rawDisplay,
    )
      ? normalizeNotesHtml(rawDisplay)
      : rawDisplay,
  );
  const healedFromRef = useRef<string | null>(null);

  const persistContent = useCallback(
    (rawHtml: string, normalize = false, writeBack = false) => {
      if (isApplyingDeckHistory()) return;
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
      restampNotesHighlights(ref.current);
      persistContent(serializePresentationNotesHtml(ref.current), normalize, writeBack);
    },
    [persistContent]
  );

  const enhanceImages = useCallback(() => {
    enhancePresentationNotesImages(ref.current, () => persistFromEditor(false, false));
  }, [persistFromEditor]);

  const insertImageFile = useCallback(
    async (file: File, at?: { x: number; y: number }) => {
      if (!ref.current || readOnly || !onUploadImage) return;
      if (file.type && !file.type.startsWith('image/')) return;
      const src = await onUploadImage(file);
      if (!src || !ref.current) return;
      onBeforeDiscreteEdit?.();
      ref.current.focus({ preventScroll: true });
      if (at) placeNotesCaretAtPoint(ref.current, at.x, at.y);
      insertImageHtmlAtCursor(ref.current, src, file.name);
      enhanceImages();
      persistFromEditor(false, false);
    },
    [onUploadImage, persistFromEditor, enhanceImages, readOnly, onBeforeDiscreteEdit]
  );

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    if (document.activeElement === el || el.contains(document.activeElement)) return;
    if (el.getAttribute('data-pres-notes-dragging') === '1') return;
    const next = displayHtml || '<p><br></p>';
    if (el.innerHTML !== next) el.innerHTML = next;
    if (!readOnly) enhanceImages();
    restampNotesHighlights(el);
  }, [displayHtml, enhanceImages, readOnly]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  useEffect(() => {
    if (readOnly) return;
    const original = html || '';
    if (healedFromRef.current === original) return;
    const dirty =
      /tabindex=|autoid=|role="(?:list|document|heading)"|Item\.Message|x_divtagdefaultwrapper|_rp_/i.test(
        original,
      );
    if (!dirty) {
      healedFromRef.current = original;
      return;
    }
    healedFromRef.current = original;
    const cleaned = displayHtml || '<p><br></p>';
    onChange(cleaned, htmlToPlain(cleaned));
  }, [html, displayHtml, onChange, readOnly]);

  useEffect(() => {
    const el = ref.current;
    if (!el || readOnly) return undefined;
    const onMouseUp = () => captureEditorSelection(el);
    el.addEventListener('mouseup', onMouseUp);
    const mo = new MutationObserver(() => {
      if (editingRef.current) return;
      if (el.getAttribute('data-pres-notes-dragging') === '1') return;
      enhanceImages();
    });
    mo.observe(el, { childList: true, subtree: true });
    if (!editingRef.current) enhanceImages();
    return () => {
      el.removeEventListener('mouseup', onMouseUp);
      mo.disconnect();
    };
  }, [readOnly, enhanceImages]);

  useEffect(() => {
    const el = ref.current;
    if (!el || readOnly || !onUploadImage) return undefined;
    const onPasteCapture = (e: ClipboardEvent) => {
      const copiedHtml = e.clipboardData?.getData('text/html') || '';
      if (unwrapJohnnyNotesCopyHtml(copiedHtml) != null) return;
      if (!clipboardHasImage(e.clipboardData) || clipboardPrefersRichText(e.clipboardData)) return;
      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        const files = await collectPasteImages(e.clipboardData);
        const unique: File[] = [];
        const seen = new Set<string>();
        for (const file of files) {
          const key = `${file.size}:${file.type || 'image'}`;
          if (seen.has(key)) continue;
          seen.add(key);
          unique.push(file);
        }
        for (const file of unique) await insertImageFile(file);
      })();
    };
    el.addEventListener('paste', onPasteCapture, true);
    return () => el.removeEventListener('paste', onPasteCapture, true);
  }, [readOnly, onUploadImage, insertImageFile]);

  const handleInput = () => {
    if (!ref.current || readOnly) return;
    replaceArrowShortcutsNearCursor(ref.current);
    persistFromEditor(false, false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const el = ref.current;
    if (!el || readOnly) return;
    const pastedHtml = e.clipboardData.getData('text/html');
    const internalHtml = unwrapJohnnyNotesCopyHtml(pastedHtml);
    if (
      internalHtml == null &&
      clipboardHasImage(e.clipboardData) &&
      onUploadImage &&
      !clipboardPrefersRichText(e.clipboardData)
    ) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const content =
      internalHtml != null
        ? internalHtml
        : pastedHtml
          ? normalizeNotesHtml(sanitizePastedHtml(pastedHtml))
          : textToHtml(pastedText);
    onBeforeDiscreteEdit?.();
    el.focus();
    const tpl = document.createElement('template');
    tpl.innerHTML = content || '<p><br></p>';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const last = tpl.content.lastChild;
      range.insertNode(tpl.content);
      if (last) {
        range.setStartAfter(last);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      el.appendChild(tpl.content);
    }
    enhancePresentationNotesImages(el, () => persistFromEditor(false, false), {
      skipDedupe: internalHtml != null,
    });
    persistFromEditor(false, false);
  };

  const handleCopy = (e: React.ClipboardEvent) => {
    const el = ref.current;
    if (!el || readOnly) return;
    const html = notesClipboardHtml(el);
    if (!html.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    e.clipboardData.setData('text/html', wrapJohnnyNotesCopyHtml(html));
    e.clipboardData.setData('text/plain', htmlToPlain(html));
  };

  const handleCut = (e: React.ClipboardEvent) => {
    handleCopy(e);
    if (!e.defaultPrevented) return;
    onBeforeDiscreteEdit?.();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    sel.getRangeAt(0).deleteContents();
    persistFromEditor(false, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el || readOnly) return;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      e.stopPropagation();
      selectAllNotesContent(el);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (handleNotesImageDeleteKey(el, e.key, onBeforeDiscreteEdit)) {
        e.preventDefault();
        e.stopPropagation();
        persistFromEditor(false, false);
        return;
      }
    }
    if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (tryMarkdownListShortcut(el)) {
        e.preventDefault();
        e.stopPropagation();
        persistFromEditor(false, false);
        return;
      }
    }
    if (isImageFrameShortcut(e)) {
      if (toggleNotesImageFrame(el)) {
        onBeforeDiscreteEdit?.();
        e.preventDefault();
        e.stopPropagation();
        persistFromEditor(false, false);
      }
      return;
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
                <IconButton
                  size="small"
                  aria-label="Bild einfügen"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (ref.current) onEditorFocus(fieldKey, ref.current);
                    fileInputRef.current?.click();
                  }}
                  sx={{ width: 22, height: 22, color: PRES_EDITOR_UI.textMuted }}
                >
                  <ImageOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </>
          )}
          {!readOnly && onMoveToTrash && (
              <IconButton
                size="small"
                aria-label="In Papierkorb verschieben"
                onClick={() => onMoveToTrash(fieldKey)}
                sx={{ width: 22, height: 22, color: PRES_EDITOR_UI.textMuted }}
              >
                <TrashIcon sx={{ fontSize: 14 }} />
              </IconButton>
          )}
        </Box>
      </Box>
      <Box
        ref={hostRef}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          mx: 1,
          mb: 1,
          overflow: 'hidden',
          touchAction: inkMode === 'text' ? 'auto' : 'none',
        }}
      >
      <Box
        ref={ref}
        contentEditable={!readOnly && inkMode === 'text'}
        suppressContentEditableWarning
        data-pres-rich-zone
        data-pres-notes-zone="true"
        data-pres-slide-id={slideId || undefined}
        data-pres-html-field={fieldKey}
        data-pres-base-fs="13"
        data-notes-field={fieldKey}
        onFocus={() => {
          if (readOnly) return;
          editingRef.current = true;
          if (ref.current) onEditorFocus(fieldKey, ref.current);
        }}
        onFocusCapture={(e) => {
          if (readOnly) return;
          const hit = e.target as HTMLElement | null;
          if (!hit || hit === ref.current) return;
          if (hit.getAttribute('tabindex') == null) return;
          e.stopPropagation();
          ref.current?.focus();
        }}
        onBlur={(e) => {
          if (readOnly) return;

          if (isApplyingDeckHistory()) {
            editingRef.current = false;
            return;
          }

          const next = e.relatedTarget as HTMLElement | null;
          const toFormatBar =
            isFormatBarInteracting() || isPresentationFormatUiTarget(next);

          if (toFormatBar) return;
          if (ref.current?.getAttribute('data-pres-notes-dragging') === '1') {
            editingRef.current = true;
            return;
          }

          if (ref.current) {
            persistFromEditor(false, false);
          }

          editingRef.current = false;
          onEditorBlur?.();
        }}
        onInput={handleInput}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCut}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => {
          if (readOnly || !onUploadImage) return;
          if (![...e.dataTransfer.types].includes('Files')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (ref.current) placeNotesCaretAtPoint(ref.current, e.clientX, e.clientY);
        }}
        onDrop={(e) => {
          if (readOnly || !onUploadImage) return;
          const file = Array.from(e.dataTransfer.files || []).find((f) =>
            f.type.startsWith('image/')
          );
          if (!file) return;
          e.preventDefault();
          e.stopPropagation();
          const at = { x: e.clientX, y: e.clientY };
          if (ref.current) placeNotesCaretAtPoint(ref.current, at.x, at.y);
          void insertImageFile(file, at);
        }}
        onMouseDown={(e) => {
          if (!isFormatBarInteracting()) clearSavedSelection();
          if (readOnly) return;
          const hit = e.target as HTMLElement | null;
          if (hit?.closest?.('[data-pres-notes-img-wrap], .pres-notes-img-wrap')) return;
          if (ref.current) clearNotesImageSelection(ref.current);
          if (
            tryStartTableResizeFromPointer(ref.current, e, {
              onDone: () => {
                persistFromEditor(true, false);
                if (ref.current) ref.current.style.cursor = '';
              },
            })
          ) {
            e.preventDefault();
            return;
          }
          const el = ref.current;
          if (!el) return;
          const lockedEl = hit?.closest?.('[contenteditable="false"]') as HTMLElement | null;
          const locked = Boolean(lockedEl && el.contains(lockedEl));
          const onBareEditor = hit === el;
          if (locked || onBareEditor) {
            e.preventDefault();
            placeNotesCaretInTypingHost(el);
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
          inset: 0,
          zIndex: 1,
          minHeight: 0,
          px: 1.25,
          py: 1,
          overflowY: 'auto',
          outline: 'none',
          fontSize: 13,
          lineHeight: 1.55,
          userSelect: inkMode === 'text' ? 'text' : 'none',
          WebkitUserSelect: inkMode === 'text' ? 'text' : 'none',
          pointerEvents: inkMode === 'text' ? 'auto' : 'none',
          touchAction: 'pan-y',
          borderRadius: 1,
          border: '1px solid',
          borderColor: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.barBorder,
          bgcolor: readOnly ? PRES_EDITOR_UI.accentSoft : '#fff',
          cursor: readOnly ? 'default' : inkMode === 'text' ? 'text' : 'default',
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
          ...presentationNotesHighlightSx(),
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
          position: 'absolute',
        }}
      />
        <PresentationNotesInkCanvas
          hostRef={hostRef}
          editorRef={ref}
          strokes={inkStrokes || []}
          mode={readOnly ? 'text' : inkMode}
          color={inkColor}
          readOnly={readOnly}
          onChange={onInkChange}
          onBeforeStroke={onBeforeDiscreteEdit}
        />
      </Box>
    </Box>
  );
};

interface PresentationNotesPanelProps {
  slideId?: string;
  speakerHtml?: string;
  speakerPlain?: string;
  activeField?: NotesFieldKey | null;
  readOnly?: boolean;
  onEditorFocus: (fieldKey: NotesFieldKey, el: HTMLElement) => void;
  onEditorBlur?: () => void;
  onSpeakerChange: (html: string, plain: string) => void;
  /** Vor Bild löschen/einfügen in den Notizen: Stand für ⌘Z sichern. */
  onBeforeDiscreteEdit?: () => void;
  onMoveNotesToTrash?: (fieldKey: NotesFieldKey) => void;
  /** Bild hochladen → Anzeige-URL für Notizen */
  onUploadImage?: (file: File) => Promise<string | null>;
  /** Notizleiste ausblenden (mehr Platz für die Folie). */
  onHide?: () => void;
  inkStrokes?: PresentationNotesInkStroke[];
  onInkChange?: (strokes: PresentationNotesInkStroke[]) => void;
}

const PresentationNotesPanel: React.FC<PresentationNotesPanelProps> = ({
  slideId,
  speakerHtml,
  speakerPlain,
  activeField,
  readOnly,
  onEditorFocus,
  onEditorBlur,
  onSpeakerChange,
  onBeforeDiscreteEdit,
  onMoveNotesToTrash,
  onUploadImage,
  onHide,
  inkStrokes,
  onInkChange,
}) => {
  const [panelWidth, setPanelWidth] = useState(loadNotesWidth);
  const [inkMode, setInkMode] = useState<NotesInkMode>('text');
  const [inkColor, setInkColor] = useState<string>(NOTES_INK_COLORS[0].value);
  const resizeRef = useRef<{ pointerId: number; startX: number; startW: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startW: panelWidth,
    };
    setResizing(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* iPad: Capture oft unzuverlässig — Window-Listener unten fangen das Ziehen */
    }
  }, [panelWidth]);

  useEffect(() => {
    if (!resizing) return undefined;
    const prev = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    const prevTouch = document.body.style.touchAction;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    const onMove = (ev: PointerEvent) => {
      const drag = resizeRef.current;
      if (!drag || ev.pointerId !== drag.pointerId) return;
      ev.preventDefault();
      setPanelWidth(clampNotesWidth(drag.startW + (drag.startX - ev.clientX)));
    };
    const onUp = (ev: PointerEvent) => {
      const drag = resizeRef.current;
      if (!drag || ev.pointerId !== drag.pointerId) return;
      resizeRef.current = null;
      setResizing(false);
      setPanelWidth((w) => {
        const next = clampNotesWidth(w);
        persistNotesWidth(next);
        return next;
      });
    };

    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      document.body.style.cursor = prev;
      document.body.style.userSelect = prevSelect;
      document.body.style.touchAction = prevTouch;
    };
  }, [resizing]);

  return (
    <Box
      data-pres-notes-drop="1"
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
        'body[data-pres-element-drag] &': {
          outline: `2px dashed ${PRES_EDITOR_UI.accent}`,
          outlineOffset: -3,
          bgcolor: PRES_EDITOR_UI.accentSoft,
        },
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
          WebkitUserSelect: 'none',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover .pres-notes-resize-bar, &:focus-visible .pres-notes-resize-bar': {
            bgcolor: PRES_EDITOR_UI.accent,
            opacity: 1,
          },
          '@media (any-pointer: coarse)': {
            width: 28,
            '& .pres-notes-resize-bar': {
              width: 5,
              height: 56,
              opacity: 1,
            },
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
          borderBottom: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
          bgcolor: '#fff',
        }}
      >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 0.5,
          px: 1,
          py: 0.35,
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.15 }}>
          {!readOnly && (
            <>
              <Tooltip title="Tippen">
                <IconButton
                  size="small"
                  aria-label="Tippen"
                  onClick={() => {
                    setInkMode('text');
                    window.requestAnimationFrame(() => {
                      const el = document.querySelector(
                        '[data-pres-notes-zone="true"]',
                      ) as HTMLElement | null;
                      el?.focus();
                    });
                  }}
                  sx={{
                    width: 26,
                    height: 26,
                    color: inkMode === 'text' ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
                    bgcolor: inkMode === 'text' ? PRES_EDITOR_UI.accentSoft : 'transparent',
                  }}
                >
                  <KeyboardIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Stift (Apple Pencil schreibt immer)">
                <IconButton
                  size="small"
                  aria-label="Stift"
                  onClick={() => setInkMode('pen')}
                  sx={{
                    width: 26,
                    height: 26,
                    color: inkMode === 'pen' ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
                    bgcolor: inkMode === 'pen' ? PRES_EDITOR_UI.accentSoft : 'transparent',
                  }}
                >
                  <PenIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Radierer">
                <IconButton
                  size="small"
                  aria-label="Radierer"
                  onClick={() => setInkMode('eraser')}
                  sx={{
                    width: 26,
                    height: 26,
                    color: inkMode === 'eraser' ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
                    bgcolor: inkMode === 'eraser' ? PRES_EDITOR_UI.accentSoft : 'transparent',
                  }}
                >
                  <EraserIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Alle Stiftstriche löschen">
                <span>
                  <IconButton
                    size="small"
                    aria-label="Stiftstriche löschen"
                    disabled={!inkStrokes?.length}
                    onClick={() => {
                      if (!inkStrokes?.length) return;
                      onBeforeDiscreteEdit?.();
                      onInkChange?.([]);
                    }}
                    sx={{ width: 26, height: 26, color: PRES_EDITOR_UI.textMuted }}
                  >
                    <ClearInkIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        {onHide && (
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
        )}
        </Box>
      </Box>
      {!readOnly && (inkMode === 'pen' || inkMode === 'eraser') && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, pb: 0.45 }}>
          {NOTES_INK_COLORS.map((c) => (
            <Box
              key={c.value}
              component="button"
              type="button"
              title={c.label}
              aria-label={`Stiftfarbe ${c.label}`}
              onClick={() => {
                setInkColor(c.value);
                if (inkMode !== 'pen') setInkMode('pen');
              }}
              sx={{
                width: 14,
                height: 14,
                p: 0,
                borderRadius: '50%',
                border: inkColor === c.value ? '2px solid #263238' : '1px solid rgba(0,0,0,0.22)',
                bgcolor: c.value,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </Box>
      )}
      </Box>
      <NoteZone
        fieldKey="speakerNotesHtml"
        label="Notizen"
        slideId={slideId}
        html={speakerHtml}
        plain={speakerPlain}
        active={activeField === 'speakerNotesHtml'}
        readOnly={readOnly}
        placeholder="Material, Setup, Sprechakte, Timing…"
        onChange={onSpeakerChange}
        onBeforeDiscreteEdit={onBeforeDiscreteEdit}
        onEditorFocus={onEditorFocus}
        onEditorBlur={onEditorBlur}
        onMoveToTrash={onMoveNotesToTrash}
        onUploadImage={onUploadImage}
        inkStrokes={inkStrokes}
        inkMode={inkMode}
        inkColor={inkColor}
        onInkChange={onInkChange}
      />
    </Box>
  );
};

export default PresentationNotesPanel;
