import type { StoryPage, StorySite } from './storySitesStorage';
import { isStoryDayPageTitle, partitionStoryPages } from './storySitesStorage';
import {
  collectPageImages,
  normalizePageForPreview,
  splitStoryBodyHtml,
  storyPageAnchorId,
  STORY_BEIGE,
  STORY_SCRAPBOOK_BG,
  STORY_THEMATIC_ROW_BG,
  resolveStoryImageSrc,
} from './storyPageLayout';
import {
  STORY_SNIPPET_CLASS,
  STORY_SNIPPET_DELETE_BTN_CLASS,
  STORY_SNIPPET_DRAG_BTN_CLASS,
  STORY_SNIPPET_HANDLE_CLASS,
  STORY_SNIPPET_RESIZE_BTN_CLASS,
} from './storyHighlightSnippets';
import { formatStoryPageDateWithWeekday } from './storyPageDate';

const POLAROID_ROTATIONS = [-2, 2, -1.5, 2, 1.5, -2];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function absolutizeMediaSrc(src: string, origin: string): string {
  const resolved = resolveStoryImageSrc(src);
  if (!resolved) return '';
  if (/^(https?:|data:|blob:)/i.test(resolved)) return resolved;
  if (resolved.startsWith('/')) return `${origin}${resolved}`;
  return resolved;
}

function absolutizeBodyHtml(html: string, origin: string): string {
  if (!html) return '';
  return html.replace(/\ssrc=(["'])([^"']+)\1/gi, (_, q, src) => {
    const abs = absolutizeMediaSrc(src, origin);
    return abs ? ` src=${q}${abs}${q}` : '';
  });
}

function pageLabel(page: StoryPage, index: number): string {
  const t = page.title?.trim();
  if (t) return t;
  const d = page.dateStr?.trim();
  if (d) return formatStoryPageDateWithWeekday(d) || d;
  return `Seite ${index + 1}`;
}

function renderTitleSideImage(src: string, side: 'left' | 'right', origin: string): string {
  const abs = absolutizeMediaSrc(src, origin);
  if (!abs) return '';
  const rot = side === 'left' ? '-5deg' : '4deg';
  const mx = side === 'left' ? 'margin-right:2px' : 'margin-left:4px';
  return `<span class="title-side-img title-side-${side}" style="transform:rotate(${rot});${mx}">
    <span class="title-side-polaroid"><img src="${escapeHtml(abs)}" alt="" /></span>
  </span>`;
}

function renderPageHeader(page: StoryPage, origin: string): string {
  const normalized = normalizePageForPreview(page);
  const parts: string[] = [];

  const titleInner = `${normalized.titleImageLeft?.trim() ? renderTitleSideImage(normalized.titleImageLeft, 'left', origin) : ''}
    <span class="page-header-title">${escapeHtml(normalized.title || 'Ohne Titel')}</span>
    ${normalized.titleImageRight?.trim() ? renderTitleSideImage(normalized.titleImageRight, 'right', origin) : ''}`;

  parts.push(`<span class="page-header-title-row">${titleInner}</span>`);

  if (normalized.subtitle?.trim()) {
    parts.push('<span class="page-header-dot">·</span>');
    parts.push(`<span class="page-header-subtitle">${escapeHtml(normalized.subtitle.trim())}</span>`);
  }
  if (normalized.dateStr?.trim()) {
    parts.push('<span class="page-header-dot">·</span>');
    const dateLabel = formatStoryPageDateWithWeekday(normalized.dateStr) || normalized.dateStr.trim();
    parts.push(`<span class="page-header-meta">${escapeHtml(dateLabel)}</span>`);
  }
  if (normalized.location?.trim()) {
    parts.push('<span class="page-header-dot">·</span>');
    parts.push(`<span class="page-header-meta">${escapeHtml(normalized.location.trim())}</span>`);
  }

  return `<div class="page-header">${parts.join('')}</div>`;
}

function renderPolaroid(src: string, rotation: number, origin: string): string {
  const abs = absolutizeMediaSrc(src, origin);
  if (!abs) return '';
  return `<div class="polaroid-wrap">
    <div class="polaroid-frame" style="transform:rotate(${rotation}deg) scale(0.96)">
      <img src="${escapeHtml(abs)}" alt="" loading="lazy" />
    </div>
  </div>`;
}

function renderPhotoColumn(images: string[], origin: string): string {
  if (images.length === 0) {
    return `<div class="photo-column">
      <p class="photo-column-empty">Bilder in der Galerie — sie erscheinen hier rechts als Polaroids.</p>
    </div>`;
  }
  const polaroids = images
    .map((src, i) => renderPolaroid(src, POLAROID_ROTATIONS[i % POLAROID_ROTATIONS.length], origin))
    .join('');
  return `<div class="photo-column"><div class="photo-grid">${polaroids}</div></div>`;
}

function renderPageBlock(page: StoryPage, origin: string): string {
  const normalized = normalizePageForPreview(page);
  const { textHtml } = splitStoryBodyHtml(normalized.bodyHtml || '');
  const fullWidth = !isStoryDayPageTitle(normalized.title) && !!normalized.fullWidth;
  const images = fullWidth ? [] : collectPageImages(normalized);
  const bodyContent = fullWidth
    ? absolutizeBodyHtml(normalized.bodyHtml ?? '', origin)
    : absolutizeBodyHtml(textHtml, origin);

  const textBlock = bodyContent
    ? `<div class="story-preview-html${fullWidth ? '' : ' story-preview-text-only'}">${bodyContent}</div>`
    : '<p class="page-empty-text">Noch kein Text — schreib im Editor.</p>';

  const gridClass = fullWidth ? 'page-grid page-grid-full' : 'page-grid';
  const photoCol = fullWidth ? '' : renderPhotoColumn(images, origin);

  return `<section class="story-preview-section" id="${storyPageAnchorId(page.id)}">
    <span class="washi washi-tl" aria-hidden="true"></span>
    <span class="washi washi-tr" aria-hidden="true"></span>
    <span class="washi washi-bl" aria-hidden="true"></span>
    <span class="washi washi-br" aria-hidden="true"></span>
    <div class="page-inner">
      ${renderPageHeader(page, origin)}
      <div class="${gridClass}">
        <div class="text-column">${textBlock}</div>
        ${photoCol}
      </div>
    </div>
  </section>`;
}

function renderQuickNav(pages: StoryPage[]): string {
  if (pages.length <= 1) return '';
  const { thematic, days } = partitionStoryPages(pages);
  const chips: string[] = [];

  thematic.forEach((p, idx) => {
    chips.push(
      `<a class="quick-nav-chip quick-nav-thematic" href="#${storyPageAnchorId(p.id)}">${escapeHtml(pageLabel(p, idx))}</a>`,
    );
  });
  if (thematic.length > 0 && days.length > 0) {
    chips.push('<span class="quick-nav-break" aria-hidden="true"></span>');
  }
  days.forEach((p, idx) => {
    chips.push(
      `<a class="quick-nav-chip" href="#${storyPageAnchorId(p.id)}">${escapeHtml(pageLabel(p, idx))}</a>`,
    );
  });

  return `<nav class="quick-nav" aria-label="Seiten">${chips.join('')}</nav>`;
}

export function renderStorySitePreviewHtml(site: StorySite, origin: string): string {
  const pagesHtml = site.pages.map((p) => renderPageBlock(p, origin)).join('');
  return `<article class="preview-paper">
    <header class="preview-site-header">
      <h1 class="preview-site-title">${escapeHtml(site.name)}</h1>
      <div class="preview-site-divider" aria-hidden="true"></div>
    </header>
    ${renderQuickNav(site.pages)}
    ${pagesHtml}
  </article>`;
}

export const STORY_SITE_PREVIEW_STYLES = `
  .shell-site {
    display: none;
    min-height: 100vh;
    background: ${STORY_BEIGE.page};
    scroll-margin-top: 12px;
  }
  .shell-site:target { display: block; }
  .page-pad:has(.shell-site:target) .shell-overview { display: none; }
  .preview-sticky-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 4px 12px;
    background: ${STORY_SCRAPBOOK_BG};
    border-bottom: 1px solid rgba(93, 64, 55, 0.1);
    box-shadow: 0 2px 10px rgba(93, 64, 55, 0.06);
  }
  .preview-toolbar-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
    color: #4e342e;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid rgba(93, 64, 55, 0.2);
    background: rgba(255, 255, 255, 0.72);
    color: #4e342e;
    text-decoration: none;
    font-size: 16px;
    line-height: 1;
  }
  .back-link:hover { background: rgba(255, 255, 255, 0.95); }
  .preview-viewport {
    width: 100%;
    max-width: 100%;
    padding: 8px 1% 24px;
    box-sizing: border-box;
  }
  .preview-paper {
    background: ${STORY_SCRAPBOOK_BG};
    padding: 8px 16px 20px;
    width: 100%;
    max-width: 100%;
    box-shadow: 0 16px 40px rgba(93, 64, 55, 0.12);
    overflow-x: hidden;
    box-sizing: border-box;
  }
  @media (min-width: 600px) {
    .preview-paper { padding: 16px 24px 28px; }
  }
  .preview-site-header { text-align: center; margin-bottom: 16px; position: relative; }
  .preview-site-title {
    margin: 0;
    font-family: "Segoe Script", "Snell Roundhand", "Bradley Hand", cursive;
    font-weight: 600;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    color: #4e342e;
    line-height: 1.2;
  }
  .preview-site-divider {
    margin: 12px auto 0;
    width: 120px;
    height: 3px;
    background: rgba(255, 193, 7, 0.6);
    border-radius: 1px;
  }
  .quick-nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    width: 100%;
    margin-bottom: 24px;
    padding: 0 8px;
  }
  .quick-nav-break { flex-basis: 100%; width: 0; height: 0; }
  .quick-nav-chip {
    display: inline-block;
    max-width: 220px;
    padding: 4px 10px;
    border-radius: 16px;
    border: 1px solid rgba(93, 64, 55, 0.25);
    background: rgba(255, 255, 255, 0.55);
    color: #4e342e;
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .quick-nav-chip:hover { background: rgba(255, 255, 255, 0.9); }
  .quick-nav-thematic {
    background: ${STORY_THEMATIC_ROW_BG};
    border-color: rgba(92, 107, 192, 0.35);
  }
  .story-preview-section {
    position: relative;
    margin-bottom: 24px;
    border: 1px solid rgba(141, 110, 99, 0.2);
    border-radius: 4px;
    box-shadow: 0 12px 32px rgba(93, 64, 55, 0.1);
    background: ${STORY_SCRAPBOOK_BG};
    overflow: hidden;
    scroll-margin-top: 72px;
  }
  .washi {
    position: absolute;
    width: 56px;
    height: 18px;
    opacity: 0.75;
    border-radius: 2px;
    z-index: 2;
    pointer-events: none;
  }
  .washi-tl { top: 10px; left: 14px; transform: rotate(-8deg); background: linear-gradient(90deg, rgba(255, 213, 79, 0.9), rgba(255, 193, 7, 0.65)); }
  .washi-tr { top: 12px; right: 18px; transform: rotate(6deg); background: linear-gradient(90deg, rgba(205, 170, 125, 0.85), rgba(161, 136, 127, 0.55)); }
  .washi-bl { bottom: 14px; left: 20px; transform: rotate(5deg); background: linear-gradient(90deg, rgba(205, 170, 125, 0.85), rgba(161, 136, 127, 0.55)); }
  .washi-br { bottom: 10px; right: 14px; transform: rotate(-6deg); background: linear-gradient(90deg, rgba(255, 213, 79, 0.9), rgba(255, 193, 7, 0.65)); }
  .page-inner { padding: 16px 20px 24px; }
  @media (min-width: 600px) { .page-inner { padding: 20px 24px 28px; } }
  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 4px;
    width: 100%;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 2px solid rgba(255, 193, 7, 0.45);
  }
  .page-header-title-row {
    display: inline-flex;
    align-items: center;
    flex-wrap: nowrap;
    max-width: 100%;
    min-width: 0;
  }
  .page-header-title {
    font-family: "Segoe Script", "Snell Roundhand", "Bradley Hand", cursive;
    font-size: clamp(1.1rem, 2.5vw, 1.5rem);
    font-weight: 600;
    color: #5d4037;
    line-height: 1.25;
    min-width: 0;
  }
  .page-header-subtitle {
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: clamp(1.05rem, 2vw, 1.28rem);
    font-weight: 700;
    color: #3e2723;
    letter-spacing: 0.02em;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .page-header-dot { color: #a1887f; flex-shrink: 0; padding: 0 2px; line-height: 1.25; }
  .page-header-meta { font-size: 0.875rem; color: #8d6e63; letter-spacing: 0.02em; white-space: nowrap; line-height: 1.25; }
  .title-side-img { display: inline-block; flex-shrink: 0; vertical-align: middle; width: 48px; }
  .title-side-polaroid {
    display: block;
    background: ${STORY_BEIGE.cream};
    padding: 4px 4px 10px;
    border-radius: 2px;
    box-shadow: 0 2px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.04);
  }
  .title-side-polaroid img { display: block; width: 100%; height: 42px; object-fit: cover; border-radius: 2px; }
  .page-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    width: 100%;
    align-items: start;
  }
  @media (min-width: 900px) {
    .page-grid:not(.page-grid-full) { grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); }
  }
  .text-column { min-width: 0; max-width: 100%; overflow: hidden; }
  .page-empty-text { margin: 0; font-style: italic; color: #8d6e63; font-size: 14px; }
  .story-preview-html {
    color: #4e342e;
    font-size: 0.92rem;
    line-height: 1.65;
    text-align: justify;
  }
  @media (min-width: 900px) { .story-preview-html { font-size: 1rem; } }
  .story-preview-text-only img { display: none; }
  .story-preview-html img { max-width: 100%; height: auto; }
  .story-preview-html p, .story-preview-html div, .story-preview-html li { margin-bottom: 10px; text-align: justify; }
  .story-preview-html ul, .story-preview-html ol { padding-left: 20px; margin-bottom: 10px; }
  .photo-column {
    position: relative;
    min-height: 120px;
    background: rgba(250, 246, 238, 0.85);
    border-radius: 6px;
    border: 1px dashed rgba(141, 110, 99, 0.25);
    padding: 10px 8px 10px 12px;
    overflow: hidden;
    box-sizing: border-box;
  }
  @media (min-width: 900px) { .photo-column { min-height: 160px; padding: 12px; } }
  .photo-column-empty {
    margin: 0;
    text-align: center;
    font-style: italic;
    color: #8d6e63;
    padding: 16px 8px;
    font-size: 14px;
  }
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 10px;
    width: 100%;
  }
  .polaroid-wrap { min-width: 0; max-width: 100%; overflow: hidden; padding: 8px; box-sizing: border-box; }
  .polaroid-frame {
    background: ${STORY_BEIGE.cream};
    padding: 8px 8px 20px;
    border-radius: 2px;
    box-shadow: 0 2px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.04);
    transform-origin: center center;
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }
  .polaroid-frame img {
    display: block;
    width: 100%;
    max-width: 100%;
    aspect-ratio: 4 / 3;
    max-height: 220px;
    object-fit: cover;
  }
  .${STORY_SNIPPET_CLASS} {
    display: inline-flex;
    align-items: flex-start;
    gap: 0.12em;
    width: auto;
    max-width: 11.5rem;
    min-width: 3.5rem;
    margin: 0.2em 0.4em 0.25em 0.1em;
    padding: 0.28em 0.45em 0.32em;
    border-radius: 1px 1px 1px 0;
    font-size: 0.76rem;
    line-height: 1.32;
    font-weight: 500;
    border: 1px solid;
    box-shadow: 1px 2px 4px rgba(93, 64, 55, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.35) inset;
    word-break: break-word;
    box-sizing: border-box;
  }
  .${STORY_SNIPPET_CLASS}--gold { background: #fff9c4; border-color: rgba(251, 192, 45, 0.55); color: #5d4037; transform: rotate(-1.2deg); }
  .${STORY_SNIPPET_CLASS}--sky { background: #e3f2fd; border-color: rgba(66, 165, 245, 0.45); color: #1a237e; transform: rotate(0.8deg); }
  .${STORY_SNIPPET_CLASS}--rose { background: #fce4ec; border-color: rgba(244, 143, 177, 0.55); color: #880e4f; transform: rotate(-0.6deg); }
  .${STORY_SNIPPET_CLASS}--mint { background: #e8f5e9; border-color: rgba(102, 187, 106, 0.5); color: #1b5e20; transform: rotate(1deg); }
  .${STORY_SNIPPET_HANDLE_CLASS},
  .${STORY_SNIPPET_DRAG_BTN_CLASS},
  .${STORY_SNIPPET_DELETE_BTN_CLASS},
  .${STORY_SNIPPET_RESIZE_BTN_CLASS} { display: none !important; }
  html { scroll-behavior: smooth; }
`;
