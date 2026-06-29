export type AnnouncementImage = {
  url: string;
  caption?: string;
};

export type AnnouncementLayoutId =
  | 'hero'
  | 'magazine'
  | 'gallery'
  | 'accent'
  | 'mosaic'
  | 'grid2'
  | 'grid3'
  | 'strip'
  | 'stack';

export type AnnouncementLayoutMeta = {
  id: AnnouncementLayoutId;
  name: string;
  description: string;
  accent: string;
  previewGradient: string;
};

export const ANNOUNCEMENT_LAYOUTS: AnnouncementLayoutMeta[] = [
  {
    id: 'hero',
    name: 'Hero-Banner',
    description: 'Großes Bild oben, Titel & Text darunter — ideal für Events',
    accent: '#00838f',
    previewGradient: 'linear-gradient(180deg, #00838f 0%, #004d40 100%)',
  },
  {
    id: 'magazine',
    name: 'Magazin',
    description: 'Bild links, Text rechts — klassisch & übersichtlich',
    accent: '#3949ab',
    previewGradient: 'linear-gradient(135deg, #e3f2fd 0%, #3949ab 100%)',
  },
  {
    id: 'gallery',
    name: 'Bildergalerie',
    description: 'Titel, Text und mehrere Bilder nebeneinander',
    accent: '#7b1fa2',
    previewGradient: 'linear-gradient(135deg, #f3e5f5 0%, #7b1fa2 100%)',
  },
  {
    id: 'accent',
    name: 'Akzent-Streifen',
    description: 'Farbiger Kopf, Bild & Infos in Karten',
    accent: '#f57c00',
    previewGradient: 'linear-gradient(135deg, #fff3e0 0%, #f57c00 100%)',
  },
  {
    id: 'mosaic',
    name: 'Collage',
    description: 'Ein großes Bild + kleine Fotos daneben',
    accent: '#00897b',
    previewGradient: 'linear-gradient(135deg, #e0f2f1 0%, #00695c 100%)',
  },
  {
    id: 'grid2',
    name: '2-Spalten',
    description: 'Bilder gleichmäßig in zwei Spalten',
    accent: '#5e35b1',
    previewGradient: 'linear-gradient(135deg, #ede7f6 0%, #5e35b1 100%)',
  },
  {
    id: 'grid3',
    name: '3-Spalten',
    description: 'Kompaktes 3-Spalten-Gitter',
    accent: '#1565c0',
    previewGradient: 'linear-gradient(135deg, #e3f2fd 0%, #1565c0 100%)',
  },
  {
    id: 'strip',
    name: 'Bilder-Streifen',
    description: 'Horizontal scrollbar — viele Fotos nebeneinander',
    accent: '#c2185b',
    previewGradient: 'linear-gradient(135deg, #fce4ec 0%, #c2185b 100%)',
  },
  {
    id: 'stack',
    name: 'Untereinander',
    description: 'Jedes Bild volle Breite unter dem Text',
    accent: '#558b2f',
    previewGradient: 'linear-gradient(135deg, #f1f8e9 0%, #558b2f 100%)',
  },
];

export type LayoutBuildInput = {
  layoutId: AnnouncementLayoutId;
  /** Plain text fallback (Absätze) */
  text: string;
  /** Formatierter HTML-Text — bleibt erhalten (Listen, Farben, …) */
  htmlBody?: string;
  images: string[];
};

function bodyContainsRichHtml(raw: string): boolean {
  return /<(p|br|div|span|strong|b|em|i|u|ul|ol|li|h[1-6]|font|img)\b/i.test((raw ?? '').trim());
}

function layoutTextContent(input: LayoutBuildInput): string {
  const html = input.htmlBody?.trim();
  if (html) return html;
  return textToParagraphs(input.text);
}

/** Text aus Editor: HTML beibehalten, sonst Plaintext. */
export function bodyContentForLayout(bodyHtml: string): { text: string; htmlBody?: string } {
  const trimmed = (bodyHtml ?? '').trim();
  if (!trimmed) return { text: '' };
  if (hasAnnouncementLayout(trimmed)) {
    return { text: htmlToPlainText(trimmed) };
  }
  if (bodyContainsRichHtml(trimmed)) {
    return { text: '', htmlBody: trimmed };
  }
  return { text: htmlToPlainText(trimmed) || trimmed };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToParagraphs(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
}

function imgTag(url: string, alt: string, extraClass = ''): string {
  const safeUrl = url.replace(/"/g, '&quot;');
  return `<img class="jm-ann-img ${extraClass}" src="${safeUrl}" alt="${esc(alt)}" loading="lazy" />`;
}

function thumbRow(rest: string[]): string {
  if (!rest.length) return '';
  return `<div class="jm-ann-thumb-row">${rest.map((u, i) => imgTag(u, `Bild ${i + 2}`, 'jm-ann-thumb')).join('')}</div>`;
}

function imageGrid(allImgs: string[], className: string): string {
  if (!allImgs.length) return '';
  return `<div class="${className}">${allImgs.map((u, i) => `<figure class="jm-ann-figure">${imgTag(u, `Bild ${i + 1}`, 'jm-ann-gallery-img')}</figure>`).join('')}</div>`;
}

export function buildAnnouncementLayoutHtml(input: LayoutBuildInput): string {
  const { layoutId, images } = input;
  const textBlock = layoutTextContent(input);
  const hero = images[0];
  const rest = images.slice(1);
  const allImgs = images.length ? images : [];

  if (layoutId === 'hero') {
    return `<div class="jm-announcement-layout jm-layout-hero" data-layout="hero">
  ${hero ? `<div class="jm-ann-hero">${imgTag(hero, 'Bild 1', 'jm-ann-hero-img')}</div>` : ''}
  <div class="jm-ann-body">
    <div class="jm-ann-text">${textBlock}</div>
    ${thumbRow(rest)}
  </div>
</div>`;
  }

  if (layoutId === 'magazine') {
    return `<div class="jm-announcement-layout jm-layout-magazine" data-layout="magazine">
  <div class="jm-ann-split">
    ${hero ? `<div class="jm-ann-split-media">${imgTag(hero, 'Bild 1', 'jm-ann-split-img')}</div>` : ''}
    <div class="jm-ann-split-content">
      <div class="jm-ann-text">${textBlock}</div>
    </div>
  </div>
  ${thumbRow(rest)}
</div>`;
  }

  if (layoutId === 'gallery') {
    return `<div class="jm-announcement-layout jm-layout-gallery" data-layout="gallery">
  <div class="jm-ann-text">${textBlock}</div>
  ${imageGrid(allImgs, 'jm-ann-gallery')}
</div>`;
  }

  if (layoutId === 'mosaic') {
    return `<div class="jm-announcement-layout jm-layout-mosaic" data-layout="mosaic">
  <div class="jm-ann-text">${textBlock}</div>
  ${allImgs.length ? `<div class="jm-ann-mosaic">
    ${hero ? `<div class="jm-ann-mosaic-main">${imgTag(hero, 'Bild 1', 'jm-ann-mosaic-main-img')}</div>` : ''}
    ${rest.length ? `<div class="jm-ann-mosaic-side">${rest.map((u, i) => imgTag(u, `Bild ${i + 2}`, 'jm-ann-mosaic-thumb')).join('')}</div>` : ''}
  </div>` : ''}
</div>`;
  }

  if (layoutId === 'grid2') {
    return `<div class="jm-announcement-layout jm-layout-grid2" data-layout="grid2">
  <div class="jm-ann-text">${textBlock}</div>
  ${imageGrid(allImgs, 'jm-ann-gallery jm-ann-grid-2')}
</div>`;
  }

  if (layoutId === 'grid3') {
    return `<div class="jm-announcement-layout jm-layout-grid3" data-layout="grid3">
  <div class="jm-ann-text">${textBlock}</div>
  ${imageGrid(allImgs, 'jm-ann-gallery jm-ann-grid-3')}
</div>`;
  }

  if (layoutId === 'strip') {
    return `<div class="jm-announcement-layout jm-layout-strip" data-layout="strip">
  <div class="jm-ann-text">${textBlock}</div>
  ${allImgs.length ? `<div class="jm-ann-strip">${allImgs.map((u, i) => imgTag(u, `Bild ${i + 1}`, 'jm-ann-strip-img')).join('')}</div>` : ''}
</div>`;
  }

  if (layoutId === 'stack') {
    return `<div class="jm-announcement-layout jm-layout-stack" data-layout="stack">
  <div class="jm-ann-text">${textBlock}</div>
  ${allImgs.length ? `<div class="jm-ann-stack">${allImgs.map((u, i) => imgTag(u, `Bild ${i + 1}`, 'jm-ann-stack-img')).join('')}</div>` : ''}
</div>`;
  }

  // accent
  return `<div class="jm-announcement-layout jm-layout-accent" data-layout="accent">
  <div class="jm-ann-accent-body">
    ${hero ? `<div class="jm-ann-accent-media">${imgTag(hero, 'Bild 1', 'jm-ann-accent-img')}</div>` : ''}
    <div class="jm-ann-accent-card">
      <div class="jm-ann-text">${textBlock}</div>
    </div>
  </div>
  ${thumbRow(rest)}
</div>`;
}

export function htmlToPlainText(html: string): string {
  if (!html?.trim()) return '';
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

export function extractImageUrlsFromHtml(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

export function hasAnnouncementLayout(html: string): boolean {
  return /jm-announcement-layout/i.test(html ?? '');
}

const LAYOUT_ID_VALUES = new Set<string>(ANNOUNCEMENT_LAYOUTS.map((l) => l.id));

export function extractLayoutIdFromStoredBody(html: string): AnnouncementLayoutId | null {
  const match = html.match(/data-layout=["']([a-z0-9]+)["']/i);
  const id = match?.[1];
  return id && LAYOUT_ID_VALUES.has(id) ? (id as AnnouncementLayoutId) : null;
}

function isProtokollLogoImgTag(tag: string): boolean {
  return /data-protokoll-logo/i.test(tag);
}

/** Entfernt Bilder und Editor-Hüllen — Protokoll-Logo (data-protokoll-logo) bleibt. */
export function stripImagesFromEditorHtml(html: string): string {
  if (!html?.trim()) return '';
  let out = html
    .replace(/<span[^>]*class="[^"]*editor-image-wrap[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<img([^>]*)>/gi, (match, attrs) => (isProtokollLogoImgTag(attrs) ? `<img${attrs}>` : ''));
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = out;
    div.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('data-protokoll-logo')) img.remove();
    });
    out = div.innerHTML;
  }
  return out.trim();
}

/** Gespeicherter Ankündigungstext → reiner Editor-Inhalt (ohne Layout-Hülle & Bilder). */
export function extractEditorHtmlFromStoredBody(storedBody: string): string {
  const trimmed = (storedBody ?? '').trim();
  if (!trimmed) return '';

  if (hasAnnouncementLayout(trimmed)) {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = trimmed;
      const textEl = div.querySelector('.jm-ann-text');
      if (textEl) return stripImagesFromEditorHtml(textEl.innerHTML);
    }
    const match = trimmed.match(/<div class="jm-ann-text"[^>]*>([\s\S]*?)<\/div>/i);
    if (match?.[1]) return stripImagesFromEditorHtml(match[1]);
  }

  return stripImagesFromEditorHtml(trimmed);
}

/** Editor-Inhalt + Bilder/Layout → gespeichertes HTML für Schüler:innen. */
export function composeStoredBodyFromEditor(input: {
  editorHtml: string;
  layoutId: AnnouncementLayoutId | null;
  images: string[];
}): string {
  const editorHtml = stripImagesFromEditorHtml(input.editorHtml);
  if (!input.layoutId) return editorHtml;

  const content = bodyContentForLayout(editorHtml);
  return buildAnnouncementLayoutHtml({
    layoutId: input.layoutId,
    text: content.text,
    htmlBody: content.htmlBody,
    images: input.images,
  });
}
