import React, { useMemo } from 'react';
import { Box } from '@mui/material';

type Props = { source: string; compact?: boolean; large?: boolean; instruction?: boolean };

const HTML_TAG_RE = /<[a-z!/][\s\S]*>/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Macht den im RichTextEditor erzeugten HTML-Inhalt für die große Folienansicht sicher
 * und skaliert die Schriftgrößen relativ:
 * - entfernt <script>/<style>/<iframe> und on*-Handler
 * - wandelt absolute `font-size: X rem` in relatives `Xem` um, damit die Editor-Größen
 *   (klein/normal/groß/sehr groß) zur großen Folienschrift passen statt sie zu verkleinern
 * - Klartext (ohne HTML-Tags) wird escaped und Zeilenumbrüche zu <br>
 */
function prepareHeroBodyHtml(raw: string): string {
  if (!raw || !raw.trim()) return '';

  if (!HTML_TAG_RE.test(raw)) {
    return escapeHtml(raw).replace(/\r?\n/g, '<br>');
  }

  let html = raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, '');

  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((n) => n.remove());
    div.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      const scaled = style.replace(
        /font-size\s*:\s*([\d.]+)rem/gi,
        (_m, num) => `font-size: ${num}em`,
      );
      el.setAttribute('style', scaled);
    });
    html = div.innerHTML;
  } catch {
    /* Fallback: roher (bereits grob bereinigter) String */
  }

  return html;
}

/**
 * Rendert Folientext aus dem RichTextEditor (HTML mit Farben, Fett, Größen, Ausrichtung …).
 * Ersetzt den früheren reinen Markdown-Renderer und bleibt zu altem Klartext kompatibel.
 */
export function HeroSlideRichBody({ source, compact = false, large = false, instruction = false }: Props) {
  const html = useMemo(() => prepareHeroBodyHtml(source ?? ''), [source]);

  return (
    <Box
      sx={{
        typography: instruction ? 'h5' : large ? 'h6' : compact ? 'body2' : 'body1',
        fontSize: instruction
          ? { xs: '1.35rem', sm: '1.55rem', md: '1.7rem' }
          : large
            ? { xs: '1.08rem', sm: '1.22rem' }
            : compact
              ? '0.92rem'
              : undefined,
        lineHeight: instruction ? 1.45 : large ? 1.6 : compact ? 1.55 : 1.65,
        color: instruction || large ? 'text.primary' : undefined,
        fontWeight: 400,
        '& p': { mb: instruction ? 1.15 : 1, '&:last-child': { mb: 0 } },
        '& strong, & b': { fontWeight: instruction ? 800 : 700 },
        '& em, & i': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline', textUnderlineOffset: '2px' },
        '& del, & s, & strike': { textDecoration: 'line-through', opacity: 0.95 },
        '& ul, & ol': { pl: instruction ? 2.75 : 2.5, mb: 1 },
        '& li': { mb: instruction ? 0.5 : 0.35 },
        '& h1, & h2, & h3': { fontWeight: 800, mb: 0.75, mt: 0.5 },
        '& h1': { typography: instruction ? 'h4' : 'h5' },
        '& h2': { typography: instruction ? 'h5' : 'h6' },
        '& h3': { typography: instruction ? 'h6' : 'subtitle1' },
        '& a': { color: '#1565c0', textDecoration: 'underline', textUnderlineOffset: '2px' },
        '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
