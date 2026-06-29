/** VEL-Kopf wie in der Word-Vorlage (Logo + Vereinsname). */
const PUBLIC = process.env.PUBLIC_URL || '';

export const VEREIN_PROTOKOLL_LOGO_URL = `${PUBLIC}/announcement-vorlagen/verein/vel-logo.png`;

export const VEREIN_PROTOKOLL_HEADER_TITLE = 'Verein für Leibeserziehungen Lahnstein 1970 e.V.';

/** Logo-Breite/Höhe laut Word-Vorlage (inline drawing, ~2,18 × 2,91 cm). */
export const VEREIN_PROTOKOLL_LOGO_WIDTH = '2.18cm';

export const vereinProtokollLogoHtml = () =>
  `<p class="proto-p proto-logo"><img src="${VEREIN_PROTOKOLL_LOGO_URL}" alt="${VEREIN_PROTOKOLL_HEADER_TITLE}" data-protokoll-logo="true" width="82" height="110" /></p>`;

export const vereinProtokollHeaderTitleHtml = () =>
  `<p class="proto-p proto-header-title"><strong>${VEREIN_PROTOKOLL_HEADER_TITLE}</strong></p>`;

/** Bestehende Protokoll-HTML: VEL-Logo und Kopfzeile ergänzen bzw. korrigieren. */
export function ensureVereinProtokollHeader(html: string): string {
  if (!html.includes('vel-protokoll')) return html;

  let result = html;

  if (!/data-protokoll-logo/.test(result)) {
    if (/<p class="proto-p proto-logo">[\s\S]*?<img/i.test(result)) {
      result = result.replace(
        /(<p class="proto-p proto-logo">[\s\S]*?<img)([^>]*?)(\/?>)/i,
        '$1 data-protokoll-logo="true"$2$3',
      );
    } else if (/<p class="proto-p proto-logo">[\s\S]*?<\/p>/i.test(result)) {
      result = result.replace(/<p class="proto-p proto-logo">[\s\S]*?<\/p>/i, vereinProtokollLogoHtml());
    } else {
      result = result.replace(
        '<div class="vel-protokoll">',
        `<div class="vel-protokoll">\n${vereinProtokollLogoHtml()}\n${vereinProtokollHeaderTitleHtml()}\n`,
      );
    }
  }

  if (!/proto-header-title/.test(result)) {
    if (/<p class="proto-p proto-logo">[\s\S]*?<\/p>/i.test(result)) {
      result = result.replace(
        /(<p class="proto-p proto-logo">[\s\S]*?<\/p>)/i,
        `$1\n${vereinProtokollHeaderTitleHtml()}`,
      );
    } else {
      result = result.replace(
        '<div class="vel-protokoll">',
        `<div class="vel-protokoll">\n${vereinProtokollLogoHtml()}\n${vereinProtokollHeaderTitleHtml()}\n`,
      );
    }
  }

  return result;
}
