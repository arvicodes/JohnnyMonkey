/** HTML-Hilfen für formatierte Entry-Ticket-Karten (Frage/Lösung). */

export type EntryTicketCardLayout = 'flow' | 'split-left' | 'split-right';
export type EntryTicketImagePlace = 'block' | 'inline' | 'float-left' | 'float-right';
export type EntryTicketImageAlign = 'left' | 'center' | 'right';

export function entryTicketLooksLikeHtml(value: string): boolean {
  return /<(span|strong|b|u|i|em|br|div|p|font|img)\b/i.test((value || '').trim());
}

export function entryTicketHasImage(value: string): boolean {
  return /<img\b/i.test(value || '');
}

/** Fett/Kursiv/Unterstrichen/Farben — auch wenn Browser `span style=...` nutzt. */
export function entryTicketHasRichFormatting(value: string): boolean {
  const v = value || '';
  if (/<(strong|b|u|i|em|font)\b/i.test(v)) return true;
  return /style\s*=\s*["'][^"']*(?:font-weight|font-style|text-decoration|color|background(?:-color)?)\s*:/i.test(v);
}

export function entryTicketPlainText(value: string): string {
  const raw = value || '';
  if (!entryTicketLooksLikeHtml(raw)) return raw.replace(/\u00a0/g, ' ').trim();
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function entryTicketHasText(value: string): boolean {
  return entryTicketPlainText(value).length > 0;
}

/** Text oder eingebettetes Bild zählt als Inhalt. */
export function entryTicketHasContent(value: string): boolean {
  return entryTicketHasText(value) || entryTicketHasImage(value);
}

function clampEtWidthPct(n: number): number {
  if (!Number.isFinite(n)) return 45;
  return Math.min(100, Math.max(15, Math.round(n)));
}

function etSizeIdForWidth(widthPct: number): 's' | 'm' | 'l' | 'xl' {
  const presets: Array<{ id: 's' | 'm' | 'l' | 'xl'; w: number }> = [
    { id: 's', w: 25 },
    { id: 'm', w: 45 },
    { id: 'l', w: 70 },
    { id: 'xl', w: 100 },
  ];
  let best: 's' | 'm' | 'l' | 'xl' = 'm';
  let bestDist = Infinity;
  for (const p of presets) {
    const d = Math.abs(p.w - widthPct);
    if (d < bestDist) {
      bestDist = d;
      best = p.id;
    }
  }
  return best;
}

function normalizeImagePlace(raw: string | null | undefined): EntryTicketImagePlace {
  const v = (raw || '').toLowerCase();
  if (v === 'inline' || v === 'float-left' || v === 'float-right' || v === 'block') return v;
  return 'block';
}

export function buildEtImgStyle(
  widthPct: number,
  align: EntryTicketImageAlign,
  place: EntryTicketImagePlace = 'block',
): string {
  const w = clampEtWidthPct(widthPct);
  if (place === 'inline') {
    return `width: ${w}%; max-width: 100%; height: auto; display: inline-block; vertical-align: middle; object-fit: contain; margin: 0 0.35em;`;
  }
  if (place === 'float-left') {
    return `width: ${w}%; max-width: 100%; height: auto; display: block; float: left; object-fit: contain; margin: 0.2em 0.75em 0.35em 0;`;
  }
  if (place === 'float-right') {
    return `width: ${w}%; max-width: 100%; height: auto; display: block; float: right; object-fit: contain; margin: 0.2em 0 0.35em 0.75em;`;
  }
  const margins =
    align === 'left'
      ? 'margin-left: 0; margin-right: auto'
      : align === 'right'
        ? 'margin-left: auto; margin-right: 0'
        : 'margin-left: auto; margin-right: auto';
  return `width: ${w}%; max-width: 100%; height: auto; display: block; object-fit: contain; ${margins}`;
}

function sanitizeImgTag(tag: string): string {
  const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || tag.match(/\bsrc\s*=\s*([^\s>]+)/i);
  if (!srcMatch) return '';
  const src = srcMatch[1].trim();
  if (!/^(data:image\/[a-z0-9+.-]+;base64,|https?:\/\/|\/)/i.test(src)) return '';
  const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
  const alt = (altMatch?.[1] || '').replace(/"/g, '');
  const styleMatch = tag.match(/\bstyle\s*=\s*["']([^"']*)["']/i);
  const styleRaw = styleMatch ? sanitizeImgStyleAttr(styleMatch[1]) : '';
  const sizeMatch = tag.match(/\bdata-et-size\s*=\s*["']?(s|m|l|xl)["']?/i);
  const alignMatch = tag.match(/\bdata-et-align\s*=\s*["']?(left|center|right)["']?/i);
  const widthMatch = tag.match(/\bdata-et-width\s*=\s*["']?(\d{1,3})["']?/i);
  const placeMatch = tag.match(/\bdata-et-place\s*=\s*["']?(block|inline|float-left|float-right)["']?/i);

  let widthPct: number | null = widthMatch ? clampEtWidthPct(Number(widthMatch[1])) : null;
  if (widthPct == null) {
    const wm = styleRaw.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)%/i);
    if (wm) widthPct = clampEtWidthPct(Number(wm[1]));
  }
  if (widthPct == null && sizeMatch) {
    const presetW = { s: 25, m: 45, l: 70, xl: 100 }[sizeMatch[1].toLowerCase() as 's' | 'm' | 'l' | 'xl'];
    if (presetW) widthPct = presetW;
  }
  if (widthPct == null) widthPct = 45;

  let align: EntryTicketImageAlign = 'center';
  if (alignMatch) {
    align = alignMatch[1].toLowerCase() as EntryTicketImageAlign;
  } else {
    const ml = styleRaw.match(/(?:^|;)\s*margin-left\s*:\s*([^;]+)/i)?.[1]?.trim() || '';
    const mr = styleRaw.match(/(?:^|;)\s*margin-right\s*:\s*([^;]+)/i)?.[1]?.trim() || '';
    const isAuto = (v: string) => v === 'auto';
    const isZero = (v: string) => v === '0' || v === '0px';
    if (isAuto(ml) && isZero(mr)) align = 'right';
    else if (isZero(ml) && isAuto(mr)) align = 'left';
  }

  let place = normalizeImagePlace(placeMatch?.[1]);
  if (!placeMatch) {
    const floatVal = styleRaw.match(/(?:^|;)\s*float\s*:\s*([^;]+)/i)?.[1]?.trim().toLowerCase();
    if (floatVal === 'left') place = 'float-left';
    else if (floatVal === 'right') place = 'float-right';
    else if (/display\s*:\s*inline-block/i.test(styleRaw)) place = 'inline';
  }

  const sizeId = sizeMatch ? sizeMatch[1].toLowerCase() : etSizeIdForWidth(widthPct);
  const style = buildEtImgStyle(widthPct, align, place);
  return `<img src="${src}" alt="${alt}" style="${style}" data-et-size="${sizeId}" data-et-align="${align}" data-et-width="${widthPct}" data-et-place="${place}" />`;
}

/** Sichere style-Werte für Bilder (Größe/Position). */
function sanitizeImgStyleAttr(style: string): string {
  const kept: string[] = [];
  for (const part of (style || '').split(';')) {
    const [rawProp, ...rest] = part.split(':');
    if (!rawProp || rest.length === 0) continue;
    const prop = rawProp.trim().toLowerCase();
    let val = rest.join(':').trim().replace(/\s*!important\s*$/i, '').trim();
    if (!val) continue;
    if (
      prop === 'width' ||
      prop === 'max-width' ||
      prop === 'height' ||
      prop === 'max-height' ||
      prop === 'display' ||
      prop === 'margin' ||
      prop === 'margin-left' ||
      prop === 'margin-right' ||
      prop === 'margin-top' ||
      prop === 'margin-bottom' ||
      prop === 'object-fit' ||
      prop === 'float' ||
      prop === 'vertical-align'
    ) {
      if (/expression|url\s*\(|javascript:/i.test(val)) continue;
      kept.push(`${prop}: ${val}`);
    }
  }
  return kept.join('; ');
}

/** Sichere style-Werte für Textformatierung behalten. */
function sanitizeStyleAttr(style: string): string {
  const kept: string[] = [];
  for (const part of (style || '').split(';')) {
    const [rawProp, ...rest] = part.split(':');
    if (!rawProp || rest.length === 0) continue;
    const prop = rawProp.trim().toLowerCase();
    const val = rest.join(':').trim();
    if (!val) continue;
    if (
      prop === 'font-weight' ||
      prop === 'font-style' ||
      prop === 'text-decoration' ||
      prop === 'color' ||
      prop === 'background-color' ||
      prop === 'background'
    ) {
      if (/expression|url\s*\(|javascript:/i.test(val)) continue;
      kept.push(`${prop}: ${val}`);
    }
  }
  return kept.join('; ');
}

function sanitizeFormattingTag(tag: string, name: string): string {
  const isClose = /^<\//.test(tag);
  if (isClose) return `</${name}>`;
  const styleMatch = tag.match(/\bstyle\s*=\s*["']([^"']*)["']/i);
  const colorMatch = tag.match(/\bcolor\s*=\s*["']?([^"'\s>]+)["']?/i);
  const faceMatch = name === 'font' ? tag.match(/\bface\s*=\s*["']([^"']+)["']/i) : null;
  const attrs: string[] = [];
  if (styleMatch) {
    const style = sanitizeStyleAttr(styleMatch[1]);
    if (style) attrs.push(`style="${style}"`);
  }
  if (name === 'font' && colorMatch) {
    const c = colorMatch[1].replace(/"/g, '');
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) || /^[a-z]+$/i.test(c)) {
      attrs.push(`color="${c}"`);
    }
  }
  if (faceMatch) {
    attrs.push(`face="${faceMatch[1].replace(/"/g, '')}"`);
  }
  return attrs.length ? `<${name} ${attrs.join(' ')}>` : `<${name}>`;
}

function sanitizeLayoutDivOpen(tag: string): string {
  const layoutMatch = tag.match(
    /\bdata-et-layout\s*=\s*["']?(flow|split-left|split-right|img-left|img-right)["']?/i,
  );
  if (!layoutMatch) return '<div>';
  const raw = layoutMatch[1].toLowerCase();
  const token =
    raw === 'split-left' || raw === 'img-left'
      ? 'img-left'
      : raw === 'split-right' || raw === 'img-right'
        ? 'img-right'
        : 'flow';
  if (token === 'flow') return '<div>';
  return `<div data-et-layout="${token}">`;
}

/** Erlaubt nur Basis-Formatierung (Fett/Kursiv/Unterstrichen/Farben/Absätze/Bilder). */
export function sanitizeEntryTicketHtml(html: string): string {
  const imgs: string[] = [];
  // Bilder zuerst herauslösen — sonst könnten globale Regexes Base64-Daten beschädigen
  let out = (html || '').replace(/<img\b[^>]*>/gi, (tag) => {
    const clean = sanitizeImgTag(tag);
    if (!clean) return '';
    const token = `\uE000IMG${imgs.length}\uE001`;
    imgs.push(clean);
    return token;
  });
  out = out
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*contenteditable\s*=\s*["']?(?:true|false)["']?/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // data-et-* (Bildgröße/-position/Layout) behalten, andere data-* entfernen
    .replace(/\s*data-(?!et-)[a-z0-9-]+\s*=\s*["'][^"']*["']/gi, '');

  // Layout-Wrapper normalisieren
  out = out.replace(/<div\b[^>]*>/gi, (tag) => {
    if (/\bdata-et-layout\b/i.test(tag)) return sanitizeLayoutDivOpen(tag);
    return '<div>';
  });

  // Formatierungs-Tags inkl. style/color normalisieren (Attribute whitelisten)
  out = out.replace(/<\/?(strong|b|u|i|em|span|font)\b[^>]*>/gi, (tag, name) =>
    sanitizeFormattingTag(tag, String(name).toLowerCase()),
  );

  return out.replace(/\uE000IMG(\d+)\uE001/g, (_, i) => imgs[Number(i)] || '');
}

/** Speichern: leeres Editor-HTML → '', Formatierung/Bilder immer als HTML behalten. */
export function normalizeEntryTicketFieldValue(htmlOrText: string): string {
  const raw = (htmlOrText || '').trim();
  if (!entryTicketHasContent(raw)) return '';
  if (!entryTicketLooksLikeHtml(raw)) return raw;
  if (
    entryTicketHasRichFormatting(raw) ||
    entryTicketHasImage(raw) ||
    /\bdata-et-layout\b/i.test(raw)
  ) {
    return sanitizeEntryTicketHtml(raw);
  }
  const plain = entryTicketPlainText(raw);
  // Nur einfacher Absatz ohne Formatierung → als Plaintext speichern
  const stripped = raw
    .replace(/^<p>/i, '')
    .replace(/<\/p>$/i, '')
    .replace(/<br\s*\/?>/gi, '')
    .trim();
  if (stripped === plain || stripped === escapeXml(plain)) return plain;
  return sanitizeEntryTicketHtml(raw);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Kartensplit / Fluss aus dem HTML lesen. */
export function readEntryTicketCardLayout(html: string): EntryTicketCardLayout {
  const m = (html || '').match(
    /\bdata-et-layout\s*=\s*["']?(flow|split-left|split-right|img-left|img-right)["']?/i,
  );
  if (!m) return 'flow';
  const v = m[1].toLowerCase();
  if (v === 'img-left' || v === 'split-left') return 'split-left';
  if (v === 'img-right' || v === 'split-right') return 'split-right';
  return 'flow';
}

/** Äußeren Layout-Wrapper entfernen (Inhalt behalten). */
export function unwrapEntryTicketCardLayout(html: string): string {
  const trimmed = (html || '').trim();
  if (!trimmed) return '';
  const full = trimmed.match(
    /^<div\b[^>]*\bdata-et-layout\s*=\s*["']?(?:flow|split-left|split-right|img-left|img-right)["']?[^>]*>/i,
  );
  if (full) {
    // Von außen nach innen: öffnendes Layout-div + passendes schließendes </div> am Ende
    const withoutOpen = trimmed.slice(full[0].length);
    const closed = withoutOpen.replace(/<\/div>\s*$/i, '');
    return closed.trim();
  }
  return trimmed;
}

/** Layout setzen (flow = kein Wrapper). */
export function setEntryTicketCardLayout(html: string, layout: EntryTicketCardLayout): string {
  const inner = unwrapEntryTicketCardLayout(html);
  if (!entryTicketHasContent(inner)) return '';
  if (layout === 'flow') return normalizeEntryTicketFieldValue(inner);
  // Kurze Alias-Werte speichern (robuster in Attributen)
  const token = layout === 'split-left' ? 'img-left' : 'img-right';
  return normalizeEntryTicketFieldValue(`<div data-et-layout="${token}">${inner}</div>`);
}

/** Bilder und Text für Split-Ansicht trennen. */
export function splitEntryTicketMediaAndText(html: string): { mediaHtml: string; textHtml: string } {
  const raw = unwrapEntryTicketCardLayout(sanitizeEntryTicketHtml(html || ''));
  const imgs: string[] = [];
  let text = raw.replace(/<img\b[^>]*>/gi, (tag) => {
    imgs.push(tag);
    return '';
  });
  text = text
    .replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .replace(/(?:<br\s*\/?>\s*)+$/gi, '')
    .trim();
  return {
    mediaHtml: imgs.join(''),
    textHtml: text,
  };
}

/**
 * Farbe für Anzeige-Zähler: relativ zum Maximum in der aktuellen Liste.
 * 0 = grau, niedrig = grün, hoch = rot → Sprünge sind sofort erkennbar.
 */
export function entryTicketShowCountStyle(
  count: number,
  maxCount = 0,
): { color: string; bgcolor: string } {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n <= 0) {
    return { color: '#78909c', bgcolor: 'transparent' };
  }
  const max = Math.max(1, Math.floor(Number(maxCount) || 0), n);
  const t = Math.min(1, n / max);
  // klare Stufen statt weicher HSL-Verlauf
  if (t <= 0.34) {
    return { color: '#1b5e20', bgcolor: '#c8e6c9' };
  }
  if (t <= 0.67) {
    return { color: '#e65100', bgcolor: '#ffe0b2' };
  }
  return { color: '#b71c1c', bgcolor: '#ffcdd2' };
}
