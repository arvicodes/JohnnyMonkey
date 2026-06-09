import type { StorySite } from './storySitesStorage';
import {
  MONTH_LABELS,
  TIMELINE_CATEGORY_COLUMNS,
  TIMELINE_SEASON_META,
  getStorySiteCategoryDef,
  getSiteTimelineIsoDate,
  getSiteTimelineDay,
  getSiteTimelineDayFraction,
  getCategoryTimelineColumnIndex,
  getMonthSeason,
  groupSitesByYearAndMonth,
  resolveStorySiteCategory,
  type StorySiteCategoryId,
  type TimelineSeasonId,
} from './storySiteCategories';
import { formatIsoDateDe } from './storyPageDate';
import { STORY_SCRAPBOOK_BG, STORY_TIMELINE_MAX_WIDTH } from './storyPageLayout';
import { renderStorySitePreviewHtml, STORY_SITE_PREVIEW_STYLES } from './storySitePreviewHtml';

const OVERVIEW_ID = 'page-overview';

const AXIS_WIDTH = 80;
const CARD_MAX_WIDTH = 178;
const MAX_DAY_HORIZONTAL_OFFSET = 52;

const SEASON_SYMBOL: Record<TimelineSeasonId, string> = {
  winter: '❄',
  spring: '✿',
  summer: '☀',
  autumn: '🍂',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function siteAnchorId(siteId: string): string {
  return `site-${siteId}`;
}

function categoryChip(categoryId: StorySiteCategoryId): string {
  const cat = getStorySiteCategoryDef(categoryId);
  return `<span class="cat-chip" style="background:${cat.bg};border-color:${cat.border};color:${cat.text}"><span class="cat-dot" style="background:${cat.color}"></span>${escapeHtml(cat.shortLabel)}</span>`;
}

function renderCategoryHeader(year: number): string {
  const left = TIMELINE_CATEGORY_COLUMNS.filter((id) => getCategoryTimelineColumnIndex(id) <= 1);
  const right = TIMELINE_CATEGORY_COLUMNS.filter((id) => getCategoryTimelineColumnIndex(id) >= 3);
  return `<div class="timeline-row header-row">
    <div class="side side-grid">${left.map((id) => `<div class="side-cell">${categoryChip(id)}</div>`).join('')}</div>
    <div class="axis axis-year"><span class="year-label">${year}</span></div>
    <div class="side side-grid">${right.map((id) => `<div class="side-cell">${categoryChip(id)}</div>`).join('')}</div>
  </div>`;
}

function horizontalOffsetStyle(col: 0 | 1 | 3 | 4, dayFraction: number): string {
  if (col <= 1) return `margin-left:${dayFraction * MAX_DAY_HORIZONTAL_OFFSET}px`;
  return `margin-right:${(1 - dayFraction) * MAX_DAY_HORIZONTAL_OFFSET}px`;
}

function renderCard(
  site: StorySite,
  align: 'left' | 'right',
  col: 0 | 1 | 3 | 4,
  year: number,
  month: number,
  origin: string,
): string {
  const cat = getStorySiteCategoryDef(resolveStorySiteCategory(site));
  const dayFraction = getSiteTimelineDayFraction(site, year, month);
  const accent = align === 'right' ? `border-right:3px solid ${cat.color}` : `border-left:3px solid ${cat.color}`;
  const alignCls = align === 'right' ? 'card-right' : 'card-left';
  const href = `#${siteAnchorId(site.id)}`;
  return `<div class="card-slot ${alignCls}" style="${horizontalOffsetStyle(col, dayFraction)}">
    <a class="card" href="${href}" style="background:${cat.bg};border-color:${cat.border};color:${cat.text};box-shadow:0 2px 8px ${cat.border};${accent}">
      <div class="card-title">${escapeHtml(site.name)}</div>
      <div class="card-date">${escapeHtml(formatIsoDateDe(getSiteTimelineIsoDate(site)))}</div>
    </a>
  </div>`;
}

function renderColumn(
  col: 0 | 1 | 3 | 4,
  sites: StorySite[],
  year: number,
  month: number,
  origin: string,
): string {
  const align: 'left' | 'right' = col === 0 || col === 3 ? 'left' : 'right';
  const sorted = [...sites].sort((a, b) => getSiteTimelineIsoDate(a).localeCompare(getSiteTimelineIsoDate(b)));
  const parts: string[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const site = sorted[index];
    const day = getSiteTimelineDay(site);
    const prevDay = index > 0 ? getSiteTimelineDay(sorted[index - 1]) : 1;
    const lead = index === 0 ? Math.max(0, day - 1) : Math.max(1, day - prevDay);
    const spacerH = index === 0 ? Math.min(36, lead * 3) : Math.min(28, lead * 3);
    if (spacerH > 0) parts.push(`<div class="v-spacer" style="height:${spacerH}px"></div>`);
    parts.push(renderCard(site, align, col, year, month, origin));
  }

  return `<div class="col col-${col}">${parts.join('')}</div>`;
}

function renderMonthAxis(month: number): string {
  const season = getMonthSeason(month);
  const meta = TIMELINE_SEASON_META[season];
  return `<div class="axis axis-month" style="background:${meta.axisBg};border-left-color:${meta.axisBorder};border-right-color:${meta.axisBorder}" title="${MONTH_LABELS[month - 1]} · ${meta.label}">
    <div class="axis-icon" style="background:${meta.iconRing};border-color:${meta.axisBorder};color:${meta.iconColor}">${SEASON_SYMBOL[season]}</div>
    <div class="axis-month-label" style="color:${meta.iconColor}">${MONTH_LABELS[month - 1]}</div>
  </div>`;
}

function renderMonthRow(year: number, month: number, monthSites: StorySite[], origin: string): string {
  const season = getMonthSeason(month);
  const meta = TIMELINE_SEASON_META[season];
  const hasEntries = monthSites.length > 0;
  const bg = hasEntries ? meta.rowBg : meta.emptyRowBg;
  const minH = hasEntries ? Math.max(62, 68 + Math.max(0, monthSites.length - 1) * 10) : 62;

  const byColumn = new Map<0 | 1 | 3 | 4, StorySite[]>();
  for (const col of [0, 1, 3, 4] as const) byColumn.set(col, []);
  for (const site of monthSites) {
    const col = getCategoryTimelineColumnIndex(resolveStorySiteCategory(site));
    byColumn.get(col)!.push(site);
  }

  return `<div class="month-row" style="background:${bg};min-height:${minH}px">
    <div class="side side-grid side-left">
      ${renderColumn(0, byColumn.get(0) ?? [], year, month, origin)}
      ${renderColumn(1, byColumn.get(1) ?? [], year, month, origin)}
    </div>
    ${renderMonthAxis(month)}
    <div class="side side-grid side-right">
      ${renderColumn(3, byColumn.get(3) ?? [], year, month, origin)}
      ${renderColumn(4, byColumn.get(4) ?? [], year, month, origin)}
    </div>
  </div>`;
}

function renderYearBlock(year: number, monthsMap: Map<number, StorySite[]>, origin: string): string {
  const monthsHtml = MONTH_LABELS.map((_, i) => renderMonthRow(year, i + 1, monthsMap.get(i + 1) ?? [], origin)).join('');
  return `<section class="year-block">
    <div class="year-head">${renderCategoryHeader(year)}</div>
    ${monthsHtml}
  </section>`;
}

function renderTimeline(sites: StorySite[], origin: string): string {
  const byYearMonth = groupSitesByYearAndMonth(sites);
  const years = [...byYearMonth.keys()];
  if (years.length === 0) {
    return '<div class="empty">Noch keine Einträge in der Timeline.</div>';
  }
  return years.map((year) => renderYearBlock(year, byYearMonth.get(year) ?? new Map(), origin)).join('');
}

function renderSiteSection(site: StorySite, origin: string): string {
  return `<div class="shell-site" id="${siteAnchorId(site.id)}">
    <div class="preview-sticky-toolbar">
      <a class="back-link" href="#${OVERVIEW_ID}" aria-label="Zurück zur Übersicht">←</a>
      <span class="preview-toolbar-title">${escapeHtml(site.name)}</span>
    </div>
    <div class="preview-viewport">${renderStorySitePreviewHtml(site, origin)}</div>
  </div>`;
}

function renderSiteSections(sites: StorySite[], origin: string): string {
  const unique = new Map<string, StorySite>();
  for (const site of sites) unique.set(site.id, site);
  return [...unique.values()]
    .sort((a, b) => getSiteTimelineIsoDate(a).localeCompare(getSiteTimelineIsoDate(b)))
    .map((site) => renderSiteSection(site, origin))
    .join('');
}

const STYLES = `
  * { box-sizing: border-box; }
  body.page { margin: 0; background: #f5efe4; color: #4e342e; font-family: Roboto, system-ui, sans-serif; }
  .page-pad { min-height: 100vh; padding: 12px 8px 24px; }
  .shell {
    max-width: ${STORY_TIMELINE_MAX_WIDTH}px;
    margin: 0 auto;
    border: 1.5px solid rgba(93, 64, 55, 0.18);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 16px rgba(93, 64, 55, 0.08);
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 4px 12px;
    background: ${STORY_SCRAPBOOK_BG};
    border-bottom: 1px solid rgba(93, 64, 55, 0.1);
    font-size: 13px;
    font-weight: 700;
    color: #4e342e;
  }
  .toolbar-sun { color: #f57f17; font-size: 18px; line-height: 1; }
  .content { padding: 10px 6px 14px; }
  .year-block + .year-block { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(93, 64, 55, 0.1); }
  .year-head {
    background: ${STORY_SCRAPBOOK_BG};
    border-bottom: 1px solid rgba(93, 64, 55, 0.1);
    padding: 10px 2px;
  }
  .timeline-row { display: flex; flex-direction: row; align-items: stretch; width: 100%; }
  .side { flex: 1; min-width: 0; }
  .side-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px; padding: 4px 2px; align-self: stretch; }
  .side-cell { display: flex; justify-content: center; align-items: center; min-width: 0; }
  .side-left .col, .side-right .col { min-width: 0; min-height: 100%; display: flex; flex-direction: column; justify-content: flex-start; padding: 0 3px; }
  .col-0, .col-3 { align-items: flex-start; }
  .col-1, .col-4 { align-items: flex-end; }
  .axis { width: ${AXIS_WIDTH}px; flex-shrink: 0; align-self: stretch; }
  .axis-year {
    display: flex; align-items: center; justify-content: center;
    background: rgba(250, 246, 238, 0.85);
    border-left: 1.5px solid rgba(93, 64, 55, 0.12);
    border-right: 1.5px solid rgba(93, 64, 55, 0.12);
    min-height: 28px; padding: 4px 2px;
  }
  .year-label {
    font-family: "Segoe Script", "Snell Roundhand", "Bradley Hand", cursive;
    font-weight: 700; font-size: 1.25rem; color: #4e342e; line-height: 1.1; text-align: center;
  }
  .axis-month {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
    border-left-style: solid; border-right-style: solid; border-left-width: 1.5px; border-right-width: 1.5px;
    padding: 6px 3px;
  }
  .axis-icon {
    width: 28px; height: 28px; border-radius: 50%; border: 1px solid;
    display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1;
  }
  .axis-month-label { font-weight: 800; font-size: 10.88px; letter-spacing: 0.04em; line-height: 1.1; text-align: center; }
  .cat-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px; border: 1px solid;
    box-shadow: 0 1px 4px rgba(93, 64, 55, 0.08);
    font-size: 10.88px; font-weight: 800; line-height: 1;
  }
  .cat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .month-row {
    display: flex; flex-direction: row; align-items: stretch; width: 100%;
    border-bottom: 1px solid rgba(93, 64, 55, 0.08);
  }
  .v-spacer { width: 100%; flex-shrink: 0; }
  .card-slot { width: 100%; max-width: ${CARD_MAX_WIDTH}px; }
  .card-left { margin-right: auto; }
  .card-right { margin-left: auto; }
  a.card {
    width: 100%; max-width: ${CARD_MAX_WIDTH}px;
    border-radius: 6px; border: 1.5px solid;
    padding: 5px 8px; overflow: hidden;
    display: block; text-decoration: none; color: inherit; cursor: pointer;
  }
  a.card:hover { box-shadow: 0 4px 14px rgba(93, 64, 55, 0.18) !important; }
  .card-title {
    font-weight: 800; font-size: 12.48px; line-height: 1.25;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .card-date { font-size: 9.92px; font-weight: 600; opacity: 0.9; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .empty {
    margin: 24px 12px; padding: 32px 16px; text-align: center;
    border-radius: 12px; border: 1px dashed rgba(93, 64, 55, 0.25);
    background: ${STORY_SCRAPBOOK_BG}; color: rgba(0, 0, 0, 0.6); font-size: 14px;
  }
  ${STORY_SITE_PREVIEW_STYLES}
`;

export function buildStoriesPageDownloadHtml(sites: StorySite[], origin: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stories · PAGE</title>
  <style>${STYLES}</style>
</head>
<body class="page">
  <div class="page-pad">
    <div class="shell shell-overview" id="${OVERVIEW_ID}">
      <div class="toolbar"><span class="toolbar-sun">☀</span> Stories · PAGE</div>
      <div class="content">${renderTimeline(sites, origin)}</div>
    </div>
    ${renderSiteSections(sites, origin)}
  </div>
</body>
</html>`;
}

export function downloadStoriesPageHtml(sites: StorySite[]): void {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const html = buildStoriesPageDownloadHtml(sites, origin);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `stories-page-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
