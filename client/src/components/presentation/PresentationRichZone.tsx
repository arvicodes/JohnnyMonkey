import React, { useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { filterHtmlByRevealStep } from '../../lib/presentationReveal';
import { isFormatBarInteracting, isPresentationFormatUiTarget } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection, clearSavedSelection } from '../../lib/presentationFontSize';
import { sanitizePastedHtml, sanitizePresentationHtml, execFormat } from '../../lib/presentationRichText';

export type RichZoneVariant = 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';

const VARIANT_FONT: Record<RichZoneVariant, number> = {
  title: 42,
  hero: 64,
  subtitle: 28,
  body: 26,
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
  align?: 'left' | 'center' | 'right';
  onEditorFocus?: (el: HTMLElement) => void;
  minHeight?: number;
  flex?: number;
  revealStep?: number;
  revealEnabled?: boolean;
}

const PresentationRichZone: React.FC<PresentationRichZoneProps> = ({
  html,
  plain,
  onChange,
  scale,
  editable = false,
  placeholder = 'Hier tippen…',
  variant = 'body',
  align = 'left',
  onEditorFocus,
  minHeight,
  flex,
  revealStep = 999,
  revealEnabled = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const zoneBasePx = VARIANT_FONT[variant];
  const baseFont = zoneBasePx * scale;
  const rawHtml = sanitizePresentationHtml(html || textToHtml(plain || ''));
  const displayHtml =
    !editable && revealEnabled
      ? filterHtmlByRevealStep(rawHtml, revealStep, true)
      : rawHtml;

  const syncFromProps = useCallback(() => {
    const el = ref.current;
    if (!el || editingRef.current) return;
    const next = displayHtml || `<p><br></p>`;
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [displayHtml]);

  useEffect(() => {
    syncFromProps();
  }, [syncFromProps]);

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
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const el = ref.current;
    if (!el || e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    execFormat(el, e.shiftKey ? 'outdent' : 'indent');
    handleInput();
  };

  const richSx = {
    fontSize: `${baseFont}px`,
    lineHeight: variant === 'title' ? 1.15 : 1.55,
    fontWeight: variant === 'title' || variant === 'hero' ? 700 : 400,
    fontStyle: variant === 'quote' ? 'italic' : 'normal',
    textAlign: align,
    width: '100%',
    minWidth: 0,
    minHeight: minHeight ? `${minHeight * scale}px` : undefined,
    flex: flex ?? undefined,
    outline: 'none',
    wordBreak: 'break-word' as const,
    overflow: 'hidden',
    color: VARIANT_DEFAULT_COLOR[variant],
    '& p': { m: 0, mb: `${6 * scale}px` },
    '& p:last-child': { mb: 0 },
    '& ul, & ol': {
      m: 0,
      pl: `${28 * scale}px`,
      mb: `${8 * scale}px`,
      listStylePosition: 'outside',
    },
    '& ul': { listStyleType: 'disc' },
    '& ul ul': { listStyleType: 'circle' },
    '& ul ul ul': { listStyleType: 'square' },
    '& ol': { listStyleType: 'decimal' },
    '& ol ol': { listStyleType: 'lower-alpha' },
    '& ol ol ol': { listStyleType: 'lower-roman' },
    '& li': {
      mb: `${4 * scale}px`,
      display: 'list-item',
    },
    '& li > ul, & li > ol': {
      mt: `${4 * scale}px`,
      mb: 0,
    },
    '& span[style], & mark': { backgroundClip: 'padding-box' },
    '& [data-pres-fs]': { lineHeight: 'inherit' },
    '& [data-pres-color]': { lineHeight: 'inherit' },
    '& [data-pres-highlight]': { lineHeight: 'inherit' },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      borderRadius: `${6 * scale}px`,
      display: 'block',
      my: `${8 * scale}px`,
    },
    '& [data-reveal-step].pres-reveal-visible': {
      animation: 'presRevealIn 0.35s ease-out',
    },
    '& mark': { borderRadius: `${2 * scale}px`, px: `${2 * scale}px` },
    '&:empty:before': editable
      ? {
          content: `"${placeholder}"`,
          color: 'rgba(0,0,0,0.28)',
          pointerEvents: 'none',
        }
      : undefined,
  };

  if (!editable) {
    if (!displayHtml.trim() || displayHtml === '<p></p>' || displayHtml === '<p><br></p>') {
      return null;
    }
    return (
      <Box
        sx={richSx}
        dangerouslySetInnerHTML={{ __html: displayHtml }}
      />
    );
  }

  return (
    <Box
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-pres-rich-zone
      data-pres-base-fs={String(zoneBasePx)}
      onFocus={() => {
        editingRef.current = true;
        if (ref.current) onEditorFocus?.(ref.current);
      }}
      onBlur={(e) => {
        if (isFormatBarInteracting()) return;
        const next = e.relatedTarget as HTMLElement | null;
        if (isPresentationFormatUiTarget(next)) return;
        editingRef.current = false;
        handleInput();
      }}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!isFormatBarInteracting()) clearSavedSelection();
      }}
      sx={{
        ...richSx,
        cursor: 'text',
        borderRadius: `${4 * scale}px`,
        '&:focus': {
          outline: `2px dashed rgba(46,125,50,0.45)`,
          outlineOffset: `${2 * scale}px`,
        },
      }}
    />
  );
};

export default PresentationRichZone;
