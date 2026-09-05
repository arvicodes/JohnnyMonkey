import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import {
  DeleteOutline as TrashIcon,
  ChevronRight as HideNotesIcon,
  Mic as MicIcon,
} from '@mui/icons-material';
import { htmlToPlain, textToHtml, type PresentationStroke, type SlideAudioTrack, type SlideExam, type SlideInteractiveExercise, type SlidePrintMaterial } from '../../lib/presentationDeck';
import {
  migrateNotesInkCssToSlideSpace,
  notesInkNeedsHostMigration,
} from '../../lib/presentationDeck';
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
  insertHtmlIntoOpenNotesEditor,
  placeNotesCaretInTypingHost,
  placeNotesCaretAtPoint,
  selectAllNotesContent,
  notesClipboardHtml,
  unwrapJohnnyNotesCopyHtml,
  wrapJohnnyNotesCopyHtml,
  handleNotesImageDeleteKey,
  clearNotesImageSelection,
  applyNotesImageFrameShortcut,
  type NotesImageToSlidePayload,
} from '../../lib/presentationNotesImages';
import { isImageFrameShortcut } from '../../lib/presentationImageFrames';
import {
  tryStartTableResizeFromPointer,
  updateTableResizeHoverCursor,
} from '../../lib/presentationTableResize';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import {
  NOTES_LESSON_TEMPLATE_HTML,
  NOTES_LESSON_TEMPLATE_LABEL,
  notesHtmlLooksEmpty,
} from '../../lib/presentationNotesTemplates';
import { clipboardHasImage, clipboardPrefersRichText, collectPasteImages } from '../../lib/goodNotesClipboard';
import { type PresentationDrawTool } from '../../lib/presentationDrawTools';
import PresentationDrawOverlay from './PresentationDrawOverlay';
import MaterialCrate from '../MaterialCrate';
import PresentationSlideExamBox from './PresentationSlideExamBox';
import PresentationSlideExerciseBox from './PresentationSlideExerciseBox';
import '../../styles/presentationLists.css';

/** Ein Notizfeld (früher Material / Setup / Sprechakte). Legacy-Keys bleiben für Papierkorb. */
export type NotesFieldKey = 'materialHtml' | 'preparationHtml' | 'speakerNotesHtml';

const NOTES_WIDTH_STORAGE_KEY = 'johnny-pres-notes-width';
const NOTES_WIDTH_DEFAULT = 320;
const NOTES_WIDTH_MIN = 240;
const NOTES_WIDTH_MAX = 920;

const EMPTY_NOTES_STROKES: PresentationStroke[] = [];

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
  /** Notiz-Bild auf die Folie ziehen. */
  onMoveImageToSlide?: (payload: NotesImageToSlidePayload) => boolean | Promise<boolean>;
  onHide?: () => void;
  onOpenAudio?: () => void;
  hasAudio?: boolean;
  inkStrokes?: PresentationStroke[];
  /** Tippen erlaubt, wenn Stift-Modus aus oder Lasso ohne Capture. */
  textEditing: boolean;
  inkTool: PresentationDrawTool;
  inkColor: string;
  inkLineWidth: number;
  inkMarkerOpacity: number;
  inkInteractive: boolean;
  passThroughNonPen: boolean;
  selectedStrokeIds?: string[];
  onSelectedStrokeIdsChange?: (ids: string[]) => void;
  onInkChange?: (strokes: PresentationStroke[]) => void;
  onInkStart?: () => void;
  onNotesPointerActivate?: () => void;
  inkSpace?: 'css' | 'slide';
  onMigratedInk?: (strokes: PresentationStroke[]) => void;
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
  onHide,
  onOpenAudio,
  hasAudio,
  onBeforeDiscreteEdit,
  onUploadImage,
  onMoveImageToSlide,
  inkStrokes,
  textEditing,
  inkTool,
  inkColor,
  inkLineWidth,
  inkMarkerOpacity,
  inkInteractive,
  passThroughNonPen,
  selectedStrokeIds,
  onSelectedStrokeIdsChange,
  onInkChange,
  onInkStart,
  onNotesPointerActivate,
  inkSpace,
  onMigratedInk,
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
    enhancePresentationNotesImages(ref.current, () => persistFromEditor(false, false), {
      onMoveToSlide: onMoveImageToSlide,
    });
  }, [persistFromEditor, onMoveImageToSlide]);

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

  const insertLessonTemplate = useCallback(() => {
    if (!ref.current || readOnly) return;
    onBeforeDiscreteEdit?.();
    const el = ref.current;
    el.focus({ preventScroll: true });
    const current = serializePresentationNotesHtml(el);
    if (notesHtmlLooksEmpty(current)) {
      el.innerHTML = NOTES_LESSON_TEMPLATE_HTML;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      insertHtmlIntoOpenNotesEditor(NOTES_LESSON_TEMPLATE_HTML);
    }
    persistFromEditor(true, true);
  }, [readOnly, onBeforeDiscreteEdit, persistFromEditor]);

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    if (document.activeElement === el || el.contains(document.activeElement)) return;
    if (el.getAttribute('data-pres-notes-dragging') === '1') return;
    // Ausgewähltes Notiz-Bild behalten, während die Werkzeugleiste bedient wird
    if (el.querySelector(`.pres-notes-img-wrap.pres-notes-img-selected`)) return;
    const next = displayHtml || '<p><br></p>';
    if (el.innerHTML !== next) el.innerHTML = next;
    if (!readOnly) enhanceImages();
    restampNotesHighlights(el);
  }, [displayHtml, enhanceImages, readOnly]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

  useEffect(() => {
    if (readOnly || !onMigratedInk) return;
    if (inkSpace === 'slide') return;
    if (!notesInkNeedsHostMigration(inkStrokes, inkSpace)) return;
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const source = inkStrokes?.length ? inkStrokes : [];
    onMigratedInk(migrateNotesInkCssToSlideSpace(source, rect.width, rect.height));
  }, [readOnly, inkSpace, inkStrokes, onMigratedInk]);

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
      onMoveToSlide: onMoveImageToSlide,
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
      if (applyNotesImageFrameShortcut(el)) {
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
          {!readOnly && (
            <Tooltip title={`${NOTES_LESSON_TEMPLATE_LABEL} einsetzen`}>
              <IconButton
                size="small"
                aria-label={`${NOTES_LESSON_TEMPLATE_LABEL} einsetzen`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (ref.current) onEditorFocus(fieldKey, ref.current);
                  insertLessonTemplate();
                }}
                sx={{ width: 22, height: 22, color: PRES_EDITOR_UI.textMuted }}
              >
                <AssignmentOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
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
          {onOpenAudio && (
            <Tooltip title={hasAudio ? 'Ton öffnen' : 'Einsprechen'}>
              <IconButton
                size="small"
                aria-label={hasAudio ? 'Ton öffnen' : 'Einsprechen'}
                onClick={onOpenAudio}
                sx={{
                  width: 22,
                  height: 22,
                  color: hasAudio ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.textMuted,
                }}
              >
                <MicIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
          {onHide && (
            <Tooltip title="Notizen einklappen">
              <IconButton
                size="small"
                aria-label="Notizen einklappen"
                onClick={onHide}
                sx={{ width: 22, height: 22, color: PRES_EDITOR_UI.textMuted }}
              >
                <HideNotesIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Box
        ref={hostRef}
        onPointerDownCapture={() => {
          onNotesPointerActivate?.();
        }}
        sx={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          mx: 1,
          mb: 1,
          overflow: 'hidden',
          touchAction: textEditing ? 'auto' : 'none',
        }}
      >
      <Box
        ref={ref}
        contentEditable={!readOnly && textEditing}
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

          if (toFormatBar) {
            // Notiz-Bildauswahl + Editor-Zustand halten, während die Folien-Werkzeuge genutzt werden
            editingRef.current = true;
            return;
          }
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
          userSelect: textEditing ? 'text' : 'none',
          WebkitUserSelect: textEditing ? 'text' : 'none',
          pointerEvents: textEditing ? 'auto' : 'none',
          touchAction: 'pan-y',
          borderRadius: 1,
          border: '1px solid',
          borderColor: active ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.barBorder,
          bgcolor: readOnly ? PRES_EDITOR_UI.accentSoft : '#fff',
          cursor: readOnly ? 'default' : textEditing ? 'text' : 'default',
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
        <PresentationDrawOverlay
          fillContainer
          strokes={inkStrokes?.length ? inkStrokes : EMPTY_NOTES_STROKES}
          onStrokesChange={(next) => {
            onBeforeDiscreteEdit?.();
            onInkChange?.(next);
          }}
          enabled
          interactive={!readOnly && inkInteractive}
          readOnly={readOnly}
          passThroughNonPen={passThroughNonPen}
          onInkStart={onInkStart}
          slideId={slideId || 'notes'}
          tool={inkTool}
          strokeColor={inkColor}
          lineWidth={inkLineWidth}
          markerOpacity={inkMarkerOpacity}
          selectedStrokeIds={selectedStrokeIds}
          onSelectedStrokeIdsChange={onSelectedStrokeIdsChange}
          scale={1}
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
  /** Notiz-Bild zurück auf die Folie ziehen. */
  onMoveImageToSlide?: (payload: NotesImageToSlidePayload) => boolean | Promise<boolean>;
  /** Notizleiste ausblenden (mehr Platz für die Folie). */
  onHide?: () => void;
  audioTrack?: SlideAudioTrack;
  onOpenAudio?: () => void;
  inkStrokes?: PresentationStroke[];
  inkSpace?: 'css' | 'slide';
  inkTool?: PresentationDrawTool;
  inkColor?: string;
  inkLineWidth?: number;
  inkMarkerOpacity?: number;
  inkEditActive?: boolean;
  selectedStrokeIds?: string[];
  onSelectedStrokeIdsChange?: (ids: string[]) => void;
  onInkChange?: (strokes: PresentationStroke[]) => void;
  onInkStart?: () => void;
  onNotesActivate?: () => void;
  onMigratedInk?: (strokes: PresentationStroke[]) => void;
  lessonPath?: string;
  printMaterials?: SlidePrintMaterial[];
  onPrintMaterialsChange?: (next: SlidePrintMaterial[]) => void;
  slideExam?: SlideExam;
  onSlideExamChange?: (next: SlideExam | undefined) => void;
  slideInteractiveExercise?: SlideInteractiveExercise | null;
  onSlideInteractiveExerciseChange?: (next: SlideInteractiveExercise | undefined) => void;
  slideIdForExercise?: string;
  groupId?: string;
  onMessage?: (text: string) => void;
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
  onMoveImageToSlide,
  onHide,
  audioTrack,
  onOpenAudio,
  inkStrokes,
  inkSpace,
  inkTool = 'pen',
  inkColor = '#1565c0',
  inkLineWidth = 3,
  inkMarkerOpacity = 0.45,
  inkEditActive = false,
  selectedStrokeIds,
  onSelectedStrokeIdsChange,
  onInkChange,
  onInkStart,
  onNotesActivate,
  onMigratedInk,
  lessonPath,
  printMaterials,
  onPrintMaterialsChange,
  slideExam,
  onSlideExamChange,
  slideInteractiveExercise,
  onSlideInteractiveExerciseChange,
  slideIdForExercise,
  groupId,
  onMessage,
}) => {
  const [panelWidth, setPanelWidth] = useState(loadNotesWidth);
  const resizeRef = useRef<{ pointerId: number; startX: number; startW: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  /** Stift an → Notizfeld zeichnet (wie Folie); Stift aus → tippen, Pencil schaltet an. */
  const textEditing = !inkEditActive;
  const inkInteractive = !readOnly;
  const passThroughNonPen = !inkEditActive;

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
      {onPrintMaterialsChange ? (
        <MaterialCrate
          files={printMaterials || []}
          lessonPath={lessonPath}
          onChange={onPrintMaterialsChange}
          onMessage={onMessage}
        />
      ) : null}
      {onSlideExamChange ? (
        <PresentationSlideExamBox
          exam={slideExam}
          lessonPath={lessonPath}
          groupId={groupId}
          onChange={onSlideExamChange}
          onMessage={onMessage}
          hasInteractiveExercise={Boolean(slideInteractiveExercise)}
          onAttachInteractiveExercise={
            onSlideInteractiveExerciseChange
              ? () =>
                  onSlideInteractiveExerciseChange({
                    id: `ex-${Date.now()}`,
                    title: 'Interaktive Übung',
                    packId: 'roman-numerals',
                    topics: [],
                  })
              : undefined
          }
        />
      ) : null}
      {slideInteractiveExercise ? (
        <PresentationSlideExerciseBox
          exercise={slideInteractiveExercise}
          slideId={slideIdForExercise || slideId}
          lessonPath={lessonPath}
          groupId={groupId}
          onMessage={onMessage}
        />
      ) : null}
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
        onMoveImageToSlide={onMoveImageToSlide}
        onHide={onHide}
        onOpenAudio={onOpenAudio}
        hasAudio={Boolean(audioTrack?.path)}
        inkStrokes={inkStrokes}
        textEditing={textEditing}
        inkTool={inkTool}
        inkColor={inkColor}
        inkLineWidth={inkLineWidth}
        inkMarkerOpacity={inkMarkerOpacity}
        inkInteractive={inkInteractive}
        passThroughNonPen={passThroughNonPen}
        selectedStrokeIds={selectedStrokeIds}
        onSelectedStrokeIdsChange={onSelectedStrokeIdsChange}
        onInkChange={onInkChange}
        onInkStart={onInkStart}
        onNotesPointerActivate={onNotesActivate}
        inkSpace={inkSpace}
        onMigratedInk={onMigratedInk}
      />
    </Box>
  );
};

export default PresentationNotesPanel;
