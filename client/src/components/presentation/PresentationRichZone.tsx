import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { filterHtmlByRevealStep } from '../../lib/presentationReveal';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { isApplyingDeckHistory } from '../../lib/presentationEditorHistory';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import {
  animationParagraphBadgeSx,
  animBlockIndexInRoot,
  collectAnimBlocksInRoot,
  findAnimBlockFromHit,
} from '../../lib/presentationAnimation';
import type { HtmlAnimField } from '../../lib/presentationAnimation';
import { sanitizePresentationHtml, handlePresentationTabKey, replaceArrowShortcutsNearCursor, handlePresentationListShortcutKey, presentationPasteHtml, wrapOrphanRootInlineContent } from '../../lib/presentationRichText';
import {
  tryStartTableResizeFromPointer,
  updateTableResizeHoverCursor,
} from '../../lib/presentationTableResize';
import { PRESENTATION_DEFAULT_FONT_FAMILY } from '../../lib/presentationFonts';
import { isPenPointer } from '../../lib/presentationDrawTools';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';
import { PRESENTATION_CONTENT_FONT_PX } from '../../lib/presentationFontSize';
import { presentationNestedListSx } from '../../lib/presentationListStyles';
import '../../styles/presentationLists.css';

export type RichZoneVariant = 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';
export type RichZoneAlign = 'left' | 'center' | 'right' | 'justify';

const VARIANT_FONT: Record<RichZoneVariant, number> = {
  title: 42,
  hero: 64,
  subtitle: 28,
  body: PRESENTATION_CONTENT_FONT_PX,
  quote: 34,
  caption: 16,
};

const VARIANT_DEFAULT_COLOR: Record<RichZoneVariant, string> = {
  title: JOHNNY_PRESENTATION.textPrimary,
  hero: JOHNNY_PRESENTATION.textPrimary,
  subtitle: JOHNNY_PRESENTATION.textPrimary,
  body: JOHNNY_PRESENTATION.textPrimary,
  quote: JOHNNY_PRESENTATION.textPrimary,
  caption: JOHNNY_PRESENTATION.textMuted,
};

/** Inhaltsfelder: Blocksatz. Titel/Hero behalten links/zentriert. */
export function resolveRichZoneAlign(
  variant: RichZoneVariant,
  align?: RichZoneAlign,
): RichZoneAlign {
  if (align === 'center' || align === 'right' || align === 'justify') return align;
  if (variant === 'body') return 'justify';
  return align || 'left';
}

interface PresentationRichZoneProps {
  html?: string;
  plain?: string;
  onChange?: (html: string, plain: string) => void;
  scale: number;
  editable?: boolean;
  placeholder?: string;
  variant?: RichZoneVariant;
  italic?: boolean;
  align?: RichZoneAlign;
  onEditorFocus?: (el: HTMLElement) => void;
  minHeight?: number;
  flex?: number;
  revealStep?: number;
  revealEnabled?: boolean;
  animationEditMode?: boolean;
  animationFieldKey?: HtmlAnimField;
  selectedAnimationTarget?: string | null;
  onAnimationTargetClick?: (itemId: string | null) => void;
  exportSnapshot?: boolean;
  pointerEvents?: 'auto' | 'none';
  htmlField?: string;
  slideId?: string;
  allowScroll?: boolean;
}

function isEmptyDisplayHtml(html: string): boolean {
  const t = html.trim();
  return !t || t === '<p></p>' || t === '<p><br></p>';
}

function buildRichSx(
  variant: RichZoneVariant,
  scale: number,
  align: RichZoneAlign,
  minHeight: number | undefined,
  flex: number | undefined,
  animationEditMode: boolean,
  editable: boolean,
  placeholder: string,
  zoneBasePx: number,
  italic = false,
  exportSnapshot = false,
  allowScroll = false,
) {
  const baseFont = zoneBasePx * scale;
  const resolvedAlign = resolveRichZoneAlign(variant, align);
  return {
    fontSize: `${baseFont}px`,
    fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
    lineHeight: variant === 'title' ? 1.15 : 1.55,
    fontWeight: variant === 'title' || variant === 'hero' ? 700 : 400,
    fontStyle: italic ? 'italic' : 'normal',
    textAlign: resolvedAlign,
    width: '100%',
    minWidth: 0,
    minHeight: minHeight ? `${minHeight * scale}px` : undefined,
    flex: flex ?? undefined,
    outline: 'none',
    wordBreak: 'break-word' as const,
    overflow: exportSnapshot ? 'visible' : allowScroll ? 'auto' : 'hidden',
    color: VARIANT_DEFAULT_COLOR[variant],
    '& p': {
      mt: 0,
      mr: 0,
      mb: `${6 * scale}px`,
      textAlign: resolvedAlign === 'justify' ? 'justify' : undefined,
    },
    '& p:last-child': { mb: 0 },
    '& li > p': { display: 'block', listStyle: 'none' },
    ...presentationNestedListSx({
      scale,
      listTextAlign: 'start',
      itemTextAlign: resolvedAlign === 'justify' ? 'justify' : undefined,
    }),
    '& span[style], & mark': { backgroundClip: 'padding-box' },
    '& [data-pres-fs]': { lineHeight: 'inherit' },
    '& [data-pres-font]': { lineHeight: 'inherit' },
    '& [data-pres-color]': { lineHeight: 'inherit' },
    '& [data-pres-highlight]': { lineHeight: 'inherit' },
    '& img': {
      maxWidth: '100%',
      backgroundColor: 'transparent',
      backgroundImage: 'none',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      tableLayout: 'fixed',
    },
    '& th, & td': {
      wordBreak: 'break-word',
      position: 'relative',
    },
    '& [data-reveal-step].pres-reveal-enter': {
      animation: 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
    },
    '& .pres-reveal-hidden, & [data-reveal-step].pres-reveal-hidden': {
      display: 'none !important',
      visibility: 'hidden',
      pointerEvents: 'none',
    },
    '& mark': { borderRadius: `${2 * scale}px`, px: `${2 * scale}px` },
    ...animationParagraphBadgeSx(scale, animationEditMode),
    '&:empty:before': editable
      ? {
          content: `"${placeholder}"`,
          color: 'rgba(0,0,0,0.28)',
          pointerEvents: 'none',
        }
      : undefined,
  };
}

/** Pure display — no contentEditable sync, no effects (Laptop/review/play). */
const PresentationRichZoneReadonly: React.FC<PresentationRichZoneProps> = ({
  html,
  plain,
  scale,
  variant = 'body',
  italic = false,
  align = 'left',
  minHeight,
  flex,
  revealStep = 999,
  revealEnabled = true,
  exportSnapshot = false,
  pointerEvents,
  allowScroll = false,
}) => {
  const zoneBasePx = VARIANT_FONT[variant];
  const rawHtml = useMemo(
    () => sanitizePresentationHtml(html || textToHtml(plain || '')),
    [html, plain]
  );
  const displayHtml = useMemo(() => {
    const applyRevealFilter = revealEnabled && revealStep < 999;
    return applyRevealFilter ? filterHtmlByRevealStep(rawHtml, revealStep, true) : rawHtml;
  }, [rawHtml, revealEnabled, revealStep]);

  if (isEmptyDisplayHtml(displayHtml)) return null;

  const richSx = buildRichSx(
    variant,
    scale,
    align,
    minHeight,
    flex,
    false,
    false,
    '',
    zoneBasePx,
    italic,
    exportSnapshot,
    allowScroll,
  );

  return (
    <Box
      data-pres-rich-zone
      data-pres-variant={variant}
      data-pres-align={resolveRichZoneAlign(variant, align)}
      data-pres-base-fs={String(zoneBasePx)}
      sx={richSx}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
};

const PresentationRichZoneEditable: React.FC<PresentationRichZoneProps> = ({
  html,
  plain,
  onChange,
  scale,
  editable = false,
  placeholder = 'Hier tippen…',
  variant = 'body',
  italic = false,
  align = 'left',
  onEditorFocus,
  minHeight,
  flex,
  revealStep = 999,
  revealEnabled = true,
  animationEditMode = false,
  animationFieldKey,
  selectedAnimationTarget,
  onAnimationTargetClick,
  exportSnapshot = false,
  pointerEvents,
  htmlField,
  slideId,
  allowScroll = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const inputTimerRef = useRef<number | null>(null);
  const zoneBasePx = VARIANT_FONT[variant];
  const rawHtml = useMemo(
    () => sanitizePresentationHtml(html || textToHtml(plain || '')),
    [html, plain]
  );
  const applyRevealFilter = !editable && !animationEditMode && revealEnabled && revealStep < 999;
  const displayHtml = useMemo(
    () =>
      applyRevealFilter ? filterHtmlByRevealStep(rawHtml, revealStep, true) : rawHtml,
    [applyRevealFilter, rawHtml, revealStep]
  );

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    if (document.activeElement === el || el.contains(document.activeElement)) return;
    const next = displayHtml || `<p><br></p>`;
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [displayHtml]);

  useEffect(() => {
    if (!editable) return;
    editingRef.current = false;
  }, [editable, slideId]);

  useEffect(() => {
    if (!editable) return;
    syncFromProps();
  }, [editable, syncFromProps]);

  /** Orphan-Inline (Text ohne &lt;p&gt;) für Animationsklicks in Absätze packen. */
  useEffect(() => {
    if (!animationEditMode || !ref.current) return;
    const el = ref.current;
    if (!wrapOrphanRootInlineContent(el)) return;
    if (onChange) onChange(el.innerHTML, htmlToPlain(el.innerHTML));
  }, [animationEditMode, animationFieldKey, onChange]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !animationEditMode || !animationFieldKey) return;
    el.querySelectorAll('[data-anim-selected]').forEach((node) => node.removeAttribute('data-anim-selected'));
    if (!selectedAnimationTarget?.startsWith(`paragraph:${animationFieldKey}:`)) return;
    const idx = parseInt(selectedAnimationTarget.split(':')[2] || '0', 10);
    const block = collectAnimBlocksInRoot(el)[idx - 1];
    if (block) block.setAttribute('data-anim-selected', 'true');
  }, [animationEditMode, animationFieldKey, selectedAnimationTarget, displayHtml]);

  const handleAnimationClick = (e: React.PointerEvent) => {
    if (!animationEditMode || !animationFieldKey || !onAnimationTargetClick || !ref.current) return;
    e.preventDefault();
    e.stopPropagation();
    const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const block = findAnimBlockFromHit(ref.current, hit);
    if (!block) return;
    const idx = animBlockIndexInRoot(ref.current, block);
    if (idx > 0) onAnimationTargetClick(`paragraph:${animationFieldKey}:${idx}`);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || !editable) return undefined;
    const capture = () => captureEditorSelection(el);
    el.addEventListener('keyup', capture);
    el.addEventListener('mouseup', capture);
    document.addEventListener('selectionchange', capture);
    return () => {
      el.removeEventListener('keyup', capture);
      el.removeEventListener('mouseup', capture);
      document.removeEventListener('selectionchange', capture);
    };
  }, [editable, displayHtml]);

  const handleInput = () => {
    const el = ref.current;
    if (!el || !onChange) return;
    const html = el.innerHTML;
    // Tippen bleibt lokal im DOM; React-State nur verzögert → weniger Filmstrip-/Deck-Rerenders.
    if (inputTimerRef.current) window.clearTimeout(inputTimerRef.current);
    inputTimerRef.current = window.setTimeout(() => {
      onChange(html, htmlToPlain(html));
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (inputTimerRef.current) window.clearTimeout(inputTimerRef.current);
    };
  }, []);

  const flushInput = useCallback(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    if (inputTimerRef.current) {
      window.clearTimeout(inputTimerRef.current);
      inputTimerRef.current = null;
    }
    onChange(el.innerHTML, htmlToPlain(el.innerHTML));
  }, [onChange]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    const content = presentationPasteHtml(e.clipboardData, {
      fontPx: VARIANT_FONT[variant],
      textAlign: resolveRichZoneAlign(variant, align),
    });
    el.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* ignore */
    }
    document.execCommand('insertHTML', false, content || '<p><br></p>');
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el) return;
    if (handlePresentationListShortcutKey(e, el)) {
      handleInput();
      return;
    }
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    handlePresentationTabKey(el, e.shiftKey);
  };

  const richSx = buildRichSx(
    variant,
    scale,
    align,
    minHeight,
    flex,
    animationEditMode,
    editable,
    placeholder,
    zoneBasePx,
    italic,
    exportSnapshot,
    allowScroll,
  );

  if (!editable) {
    if (isEmptyDisplayHtml(displayHtml)) return null;
    return (
      <Box
        ref={ref}
        data-pres-rich-zone
        data-pres-variant={variant}
        data-pres-align={resolveRichZoneAlign(variant, align)}
        data-pres-base-fs={String(zoneBasePx)}
        onPointerDown={animationEditMode ? handleAnimationClick : undefined}
        sx={{
          ...richSx,
          cursor: animationEditMode ? 'pointer' : undefined,
          userSelect: animationEditMode ? 'none' : undefined,
          pointerEvents,
        }}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
    );
  }

  const textEditing = !animationEditMode;

  return (
    <Box
      ref={ref}
      contentEditable={textEditing}
      suppressContentEditableWarning
      data-pres-rich-zone
      data-pres-variant={variant}
      data-pres-align={resolveRichZoneAlign(variant, align)}
      data-pres-base-fs={String(zoneBasePx)}
      data-pres-html-field={htmlField}
      data-pres-slide-id={slideId}
      onFocus={() => {
        if (animationEditMode) {
          ref.current?.blur();
          return;
        }
        editingRef.current = true;
        if (ref.current) {
          onEditorFocus?.(ref.current);
        }
      }}
      onBlur={(e) => {
        if (animationEditMode) return;
        if (isApplyingDeckHistory()) {
          editingRef.current = false;
          return;
        }
        if (isFormatBarInteracting()) return;
        const next = e.relatedTarget as HTMLElement | null;
        if (isPresentationFormatUiTarget(next)) return;
        editingRef.current = false;
        flushInput();
      }}
      onPaste={(e) => {
        if (animationEditMode) {
          e.preventDefault();
          return;
        }
        handlePaste(e);
      }}
      onDragOver={(e) => {
        // Datei-/URL-Drops gehören auf die Folie als Element — nicht als Inline-Bild im Text
        const types = Array.from(e.dataTransfer?.types ?? []).map((t) => t.toLowerCase());
        if (
          types.includes('files') ||
          types.includes('text/uri-list') ||
          types.includes('text/html') ||
          types.includes('text/x-moz-url') ||
          types.includes('url')
        ) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        const types = Array.from(e.dataTransfer?.types ?? []).map((t) => t.toLowerCase());
        if (
          types.includes('files') ||
          types.includes('text/uri-list') ||
          types.includes('text/html') ||
          types.includes('text/x-moz-url') ||
          types.includes('url')
        ) {
          e.preventDefault();
        }
      }}
      onInput={() => {
        if (animationEditMode) return;
        editingRef.current = true;
        if (replaceArrowShortcutsNearCursor(ref.current)) {
          /* caret already moved */
        }
        handleInput();
      }}
      onKeyDown={(e) => {
        if (animationEditMode) {
          e.preventDefault();
          return;
        }
        handleKeyDown(e);
      }}
      onPointerDown={(e) => {
        if (animationEditMode) {
          handleAnimationClick(e);
          return;
        }
        // Stift: nicht ins Textfeld (iPad Scribble / Caret) — Finger/Maus bleiben zum Tippen.
        if (isPenPointer(e)) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        if (!isFormatBarInteracting()) clearSavedSelection();
        if (
          tryStartTableResizeFromPointer(ref.current, e, {
            onDone: () => {
              flushInput();
              if (ref.current) ref.current.style.cursor = '';
            },
          })
        ) {
          e.preventDefault();
        }
      }}
      onMouseMove={(e) => {
        if (animationEditMode) return;
        updateTableResizeHoverCursor(ref.current, e.clientX, e.clientY);
      }}
      onMouseLeave={() => {
        if (ref.current) ref.current.style.cursor = '';
      }}
      sx={{
        ...richSx,
        cursor: animationEditMode ? 'pointer' : 'text',
        borderRadius: `${4 * scale}px`,
        userSelect: animationEditMode ? 'none' : undefined,
        pointerEvents,
        '&:focus': textEditing
          ? {
              outline: `2px dashed rgba(46,125,50,0.45)`,
              outlineOffset: `${2 * scale}px`,
            }
          : undefined,
      }}
    />
  );
};

const PresentationRichZone: React.FC<PresentationRichZoneProps> = (props) => {
  if (!props.editable && !props.animationEditMode) {
    return <PresentationRichZoneReadonly {...props} />;
  }
  return <PresentationRichZoneEditable {...props} />;
};

export default PresentationRichZone;
