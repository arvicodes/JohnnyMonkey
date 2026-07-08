import React, { useCallback, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { htmlToPlain, textToHtml } from '../../lib/presentationDeck';
import { filterHtmlByRevealStep } from '../../lib/presentationReveal';

export type RichZoneVariant = 'title' | 'hero' | 'subtitle' | 'body' | 'quote' | 'caption';

const VARIANT_FONT: Record<RichZoneVariant, number> = {
  title: 42,
  hero: 64,
  subtitle: 28,
  body: 26,
  quote: 34,
  caption: 16,
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
  const baseFont = VARIANT_FONT[variant] * scale;
  const rawHtml = html || textToHtml(plain || '');
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

  const handleInput = () => {
    const el = ref.current;
    if (!el || !onChange) return;
    onChange(el.innerHTML, htmlToPlain(el.innerHTML));
  };

  const richSx = {
    fontSize: `${baseFont}px`,
    lineHeight: variant === 'title' ? 1.15 : 1.55,
    fontWeight: variant === 'title' || variant === 'hero' ? 700 : 400,
    fontStyle: variant === 'quote' ? 'italic' : 'normal',
    color: variant === 'caption' ? '#757575' : variant === 'subtitle' ? '#616161' : '#424242',
    textAlign: align,
    width: '100%',
    minHeight: minHeight ? `${minHeight * scale}px` : undefined,
    flex: flex ?? undefined,
    outline: 'none',
    wordBreak: 'break-word' as const,
    '& p': { m: 0, mb: `${6 * scale}px` },
    '& p:last-child': { mb: 0 },
    '& ul, & ol': { m: 0, pl: `${28 * scale}px`, mb: `${8 * scale}px` },
    '& li': { mb: `${4 * scale}px` },
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
      onFocus={() => {
        editingRef.current = true;
        if (ref.current) onEditorFocus?.(ref.current);
      }}
      onBlur={() => {
        editingRef.current = false;
        handleInput();
      }}
      onInput={handleInput}
      onMouseDown={(e) => e.stopPropagation()}
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
