import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { filterHtmlByRevealStep } from '../../lib/presentationReveal';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import { normalizeListsInPlace } from '../../lib/presentationListNormalize';
import {
  animationParagraphBadgeSx,
  animBlockIndexInRoot,
  collectAnimBlocksInRoot,
  findAnimBlockFromHit,
} from '../../lib/presentationAnimation';
import type { HtmlAnimField } from '../../lib/presentationAnimation';
import { sanitizePastedHtml, sanitizePresentationHtml, handlePresentationTabKey } from '../../lib/presentationRichText';
import { PRESENTATION_CONTENT_FONT_PX } from '../../lib/presentationFontSize';
import { presentationNestedListSx } from '../../lib/presentationListStyles';
import '../../styles/presentationLists.css';

export type RichZoneVariant = 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';

const VARIANT_FONT: Record<RichZoneVariant, number> = {
  title: 42,
  hero: 64,
  subtitle: 28,
  body: PRESENTATION_CONTENT_FONT_PX,
  quote: 34,
  caption: 16,
};

const VARIANT_DEFAULT_COLOR: Record<RichZoneVariant, string> = {
  title: '#424242',
  hero: '#424242',
  subtitle: '#616161',
  body: '#424242',
  quote: '#424242',
  caption: '#757575',
};

interface PresentationRichZoneProps {
  html?: string;
  plain?: string;
  onChange?: (html: string, plain: string) => void;
  scale: number;
  editable?: boolean;
  placeholder?: string;
  variant?: RichZoneVariant;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
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
}

function isEmptyDisplayHtml(html: string): boolean {
  const t = html.trim();
  return !t || t === '<p></p>' || t === '<p><br></p>';
}

function buildRichSx(
  variant: RichZoneVariant,
  scale: number,
  align: 'left' | 'center' | 'right',
  minHeight: number | undefined,
  flex: number | undefined,
  animationEditMode: boolean,
  editable: boolean,
  placeholder: string,
  zoneBasePx: number,
  italic = false,
  exportSnapshot = false
) {
  const baseFont = zoneBasePx * scale;
  return {
    fontSize: `${baseFont}px`,
    lineHeight: variant === 'title' ? 1.15 : 1.55,
    fontWeight: variant === 'title' || variant === 'hero' ? 700 : 400,
    fontStyle: italic ? 'italic' : 'normal',
    textAlign: align,
    width: '100%',
    minWidth: 0,
    minHeight: minHeight ? `${minHeight * scale}px` : undefined,
    flex: flex ?? undefined,
    outline: 'none',
    wordBreak: 'break-word' as const,
    overflow: exportSnapshot ? 'visible' : 'hidden',
    color: VARIANT_DEFAULT_COLOR[variant],
    '& p': { m: 0, mb: `${6 * scale}px` },
    '& p:last-child': { mb: 0 },
    '& li > p': { display: 'block', listStyle: 'none' },
    ...presentationNestedListSx({ scale }),
    '& span[style], & mark': { backgroundClip: 'padding-box' },
    '& [data-pres-fs]': { lineHeight: 'inherit' },
    '& [data-pres-font]': { lineHeight: 'inherit' },
    '& [data-pres-color]': { lineHeight: 'inherit' },
    '& [data-pres-highlight]': { lineHeight: 'inherit' },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      borderRadius: `${6 * scale}px`,
      display: 'block',
      my: `${8 * scale}px`,
      backgroundColor: 'transparent',
      backgroundImage: 'none',
    },
    '& [data-reveal-step].pres-reveal-enter': {
      animation: 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
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
    exportSnapshot
  );

  return (
    <Box
      data-pres-rich-zone
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
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
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
    syncFromProps();
  }, [editable, syncFromProps]);

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
    onChange(el.innerHTML, htmlToPlain(el.innerHTML));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    const pastedHtml = e.clipboardData.getData('text/html');
    const pastedText = e.clipboardData.getData('text/plain');
    const content = pastedHtml ? sanitizePastedHtml(pastedHtml) : textToHtml(pastedText);
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
    if (!el || e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
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
    exportSnapshot
  );

  if (!editable) {
    if (isEmptyDisplayHtml(displayHtml)) return null;
    return (
      <Box
        ref={ref}
        data-pres-rich-zone
        data-pres-base-fs={String(zoneBasePx)}
        onPointerDown={animationEditMode ? handleAnimationClick : undefined}
        sx={{
          ...richSx,
          cursor: animationEditMode ? 'pointer' : undefined,
          userSelect: animationEditMode ? 'none' : undefined,
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
      data-pres-base-fs={String(zoneBasePx)}
      onFocus={() => {
        if (animationEditMode) {
          ref.current?.blur();
          return;
        }
        editingRef.current = true;
        if (ref.current) {
          normalizeListsInPlace(ref.current);
          onEditorFocus?.(ref.current);
        }
      }}
      onBlur={(e) => {
        if (animationEditMode) return;
        if (isFormatBarInteracting()) return;
        const next = e.relatedTarget as HTMLElement | null;
        if (isPresentationFormatUiTarget(next)) return;
        editingRef.current = false;
        handleInput();
      }}
      onPaste={(e) => {
        if (animationEditMode) {
          e.preventDefault();
          return;
        }
        handlePaste(e);
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
        e.stopPropagation();
        if (!isFormatBarInteracting()) clearSavedSelection();
      }}
      sx={{
        ...richSx,
        cursor: animationEditMode ? 'pointer' : 'text',
        borderRadius: `${4 * scale}px`,
        userSelect: animationEditMode ? 'none' : undefined,
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
