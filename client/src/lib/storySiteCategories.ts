import type { StorySite } from './storySitesStorage';
import { getStoryStartPage } from './storySitesStorage';
import { parseStoryPageDate } from './storyPageDate';

export type StorySiteCategoryId = 'urlaub' | 'fahrten' | 'fortbildung' | 'erasmus';

export type StorySiteCategoryDef = {
  id: StorySiteCategoryId;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  text: string;
};

export const STORY_SITE_CATEGORIES: StorySiteCategoryDef[] = [
  {
    id: 'urlaub',
    label: 'Urlaub',
    shortLabel: 'Urlaub',
    color: '#00897b',
    bg: 'rgba(0, 137, 123, 0.16)',
    border: 'rgba(0, 137, 123, 0.45)',
    text: '#00695c',
  },
  {
    id: 'fahrten',
    label: 'Fahrten & Exkursionen',
    shortLabel: 'Fahrten',
    color: '#558b2f',
    bg: 'rgba(85, 139, 47, 0.16)',
    border: 'rgba(85, 139, 47, 0.45)',
    text: '#33691e',
  },
  {
    id: 'fortbildung',
    label: 'Fortbildungen',
    shortLabel: 'Fortbildung',
    color: '#5e35b1',
    bg: 'rgba(94, 53, 177, 0.16)',
    border: 'rgba(94, 53, 177, 0.45)',
    text: '#4527a0',
  },
  {
    id: 'erasmus',
    label: 'Erasmus+',
    shortLabel: 'Erasmus+',
    color: '#ef6c00',
    bg: 'rgba(239, 108, 0, 0.16)',
    border: 'rgba(239, 108, 0, 0.45)',
    text: '#e65100',
  },
];

const CATEGORY_BY_ID = Object.fromEntries(
  STORY_SITE_CATEGORIES.map((c) => [c.id, c]),
) as Record<StorySiteCategoryId, StorySiteCategoryDef>;

export function getStorySiteCategoryDef(id: StorySiteCategoryId | undefined | null): StorySiteCategoryDef {
  if (id && CATEGORY_BY_ID[id]) return CATEGORY_BY_ID[id];
  return CATEGORY_BY_ID.fahrten;
}

export function isStorySiteCategoryId(v: unknown): v is StorySiteCategoryId {
  return typeof v === 'string' && v in CATEGORY_BY_ID;
}

/** Kategorie aus Titel/Ordner erraten — nur Anzeige, bis du explizit speicherst. */
export function inferStorySiteCategory(site: Pick<StorySite, 'name' | 'erasmusFolder' | 'country'>): StorySiteCategoryId {
  const text = `${site.name} ${site.erasmusFolder ?? ''} ${site.country ?? ''}`.toLowerCase();
  if (/urlaub|mallorca|surfcamp|trekking|norderney|osterurlaub/.test(text)) return 'urlaub';
  if (/erasmus|teaching assignment|mobilität/.test(text)) return 'erasmus';
  if (/fortbildung|calisthenics|mathe|studientag|vallendar/.test(text)) return 'fortbildung';
  if (/exkursion|fahrt|xlab|karneval|charlons|charlons/.test(text)) return 'fahrten';
  return 'fahrten';
}

export function resolveStorySiteCategory(site: StorySite): StorySiteCategoryId {
  return site.category ?? inferStorySiteCategory(site);
}

/** Spalten-Reihenfolge für Kopfzeile (links → rechts). */
export const TIMELINE_CATEGORY_COLUMNS: StorySiteCategoryId[] = [
  'fortbildung',
  'erasmus',
  'fahrten',
  'urlaub',
];

/** Spaltenindex im 5-Spalten-Raster (Mitte = Achse). */
export function getCategoryTimelineColumnIndex(id: StorySiteCategoryId): 0 | 1 | 3 | 4 {
  switch (id) {
    case 'fortbildung':
      return 0;
    case 'erasmus':
      return 1;
    case 'fahrten':
      return 3;
    case 'urlaub':
      return 4;
    default:
      return 3;
  }
}

const URLAUB_UNLOCK_KEY = 'johnnyMonkey_storiesUrlaubUnlocked';

export function isUrlaubCategoryUnlocked(): boolean {
  try {
    return sessionStorage.getItem(URLAUB_UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockUrlaubCategory(password: string): boolean {
  if (password.trim().toLowerCase() !== 'sonnenurlaub') return false;
  try {
    sessionStorage.setItem(URLAUB_UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
  return true;
}

export function lockUrlaubCategory(): void {
  try {
    sessionStorage.removeItem(URLAUB_UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** Timeline-Position aus Startseiten- bzw. Seiten-Datum (kein separates Timeline-Feld). */
export function getSiteTimelineIsoDate(site: StorySite): string {
  const startPage = getStoryStartPage(site.pages);
  if (startPage?.dateStr?.trim()) {
    const iso = parseStoryPageDate(startPage.dateStr);
    if (iso) return iso;
  }
  for (const p of site.pages) {
    const iso = parseStoryPageDate(p.dateStr);
    if (iso) return iso;
  }
  return site.createdAt.slice(0, 10);
}

export function getSiteTimelineYear(site: StorySite): number {
  return parseInt(getSiteTimelineIsoDate(site).slice(0, 4), 10) || new Date().getFullYear();
}

export function getSiteTimelineMonth(site: StorySite): number {
  const m = parseInt(getSiteTimelineIsoDate(site).slice(5, 7), 10);
  return m >= 1 && m <= 12 ? m : 1;
}

export function getSiteTimelineDay(site: StorySite): number {
  const d = parseInt(getSiteTimelineIsoDate(site).slice(8, 10), 10);
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : 1;
}

export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 30;
  return new Date(year, month, 0).getDate();
}

/** 0 = Monatsanfang, 1 = Monatsende */
export function getSiteTimelineDayFraction(site: StorySite, year: number, month: number): number {
  const iso = getSiteTimelineIsoDate(site);
  const siteYear = parseInt(iso.slice(0, 4), 10);
  const siteMonth = parseInt(iso.slice(5, 7), 10);
  if (siteYear !== year || siteMonth !== month) return 0.5;
  const daysInMonth = getDaysInMonth(year, month);
  if (daysInMonth <= 1) return 0;
  const day = getSiteTimelineDay(site);
  return Math.max(0, Math.min(1, (day - 1) / (daysInMonth - 1)));
}

export function getMonthSeasonBg(month: number): string {
  return TIMELINE_SEASON_META[getMonthSeason(month)].rowBg;
}

export type TimelineSeasonId = 'winter' | 'spring' | 'summer' | 'autumn';

export function getMonthSeason(month: number): TimelineSeasonId {
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

export const TIMELINE_SEASON_META: Record<
  TimelineSeasonId,
  {
    label: string;
    iconColor: string;
    rowBg: string;
    emptyRowBg: string;
    axisBg: string;
    axisBorder: string;
    iconRing: string;
  }
> = {
  winter: {
    label: 'Winter',
    iconColor: '#1565c0',
    rowBg: 'rgba(100, 181, 246, 0.12)',
    emptyRowBg: 'rgba(100, 181, 246, 0.2)',
    axisBg: 'linear-gradient(180deg, rgba(100, 181, 246, 0.45) 0%, rgba(187, 222, 251, 0.3) 100%)',
    axisBorder: 'rgba(21, 101, 192, 0.35)',
    iconRing: 'rgba(21, 101, 192, 0.2)',
  },
  spring: {
    label: 'Frühling',
    iconColor: '#2e7d32',
    rowBg: 'rgba(102, 187, 106, 0.13)',
    emptyRowBg: 'rgba(102, 187, 106, 0.2)',
    axisBg: 'linear-gradient(180deg, rgba(102, 187, 106, 0.42) 0%, rgba(200, 230, 201, 0.28) 100%)',
    axisBorder: 'rgba(27, 94, 32, 0.32)',
    iconRing: 'rgba(27, 94, 32, 0.18)',
  },
  summer: {
    label: 'Sommer',
    iconColor: '#f9a825',
    rowBg: 'rgba(255, 213, 79, 0.15)',
    emptyRowBg: 'rgba(255, 213, 79, 0.22)',
    axisBg: 'linear-gradient(180deg, rgba(255, 213, 79, 0.5) 0%, rgba(255, 236, 179, 0.32) 100%)',
    axisBorder: 'rgba(245, 127, 23, 0.35)',
    iconRing: 'rgba(245, 127, 23, 0.2)',
  },
  autumn: {
    label: 'Herbst',
    iconColor: '#e65100',
    rowBg: 'rgba(255, 167, 38, 0.13)',
    emptyRowBg: 'rgba(255, 167, 38, 0.2)',
    axisBg: 'linear-gradient(180deg, rgba(255, 167, 38, 0.45) 0%, rgba(255, 204, 128, 0.3) 100%)',
    axisBorder: 'rgba(230, 81, 0, 0.32)',
    iconRing: 'rgba(230, 81, 0, 0.18)',
  },
};

export function groupSitesByYearAndMonth(sites: StorySite[]): Map<number, Map<number, StorySite[]>> {
  const byYear = new Map<number, Map<number, StorySite[]>>();
  for (const site of sites) {
    const year = getSiteTimelineYear(site);
    const month = getSiteTimelineMonth(site);
    let months = byYear.get(year);
    if (!months) {
      months = new Map();
      byYear.set(year, months);
    }
    const list = months.get(month) ?? [];
    list.push(site);
    months.set(month, list);
  }
  for (const months of byYear.values()) {
    for (const [month, list] of months) {
      list.sort((a, b) => getSiteTimelineIsoDate(a).localeCompare(getSiteTimelineIsoDate(b)));
      months.set(month, list);
    }
  }
  return new Map([...byYear.entries()].sort(([a], [b]) => a - b));
}

export function isoToYearFraction(iso: string): number {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return 0.5;
  const start = new Date(y, 0, 1);
  const date = new Date(y, m - 1, d);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInYear = isLeap ? 366 : 365;
  return Math.max(0, Math.min(1, dayOfYear / (daysInYear - 1)));
}

export const SEASON_BANDS = [
  { key: 'winter', label: 'Winter', from: 0, to: 0.2, color: 'rgba(144, 202, 249, 0.22)' },
  { key: 'fruehling', label: 'Frühling', from: 0.2, to: 0.45, color: 'rgba(129, 199, 132, 0.22)' },
  { key: 'sommer', label: 'Sommer', from: 0.45, to: 0.7, color: 'rgba(255, 213, 79, 0.28)' },
  { key: 'herbst', label: 'Herbst', from: 0.7, to: 0.88, color: 'rgba(255, 183, 77, 0.25)' },
  { key: 'winter2', label: 'Winter', from: 0.88, to: 1, color: 'rgba(144, 202, 249, 0.22)' },
] as const;

export const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

/** Nur explizit als Urlaub markierte Einträge ausblenden — alles andere bleibt sichtbar. */
export function filterSitesForDisplay(
  sites: StorySite[],
  urlaubUnlocked: boolean,
): StorySite[] {
  return sites.filter((s) => {
    const cat = resolveStorySiteCategory(s);
    if (cat === 'urlaub' && !urlaubUnlocked) return false;
    return true;
  });
}

export function groupSitesByYear(sites: StorySite[]): Map<number, StorySite[]> {
  const map = new Map<number, StorySite[]>();
  for (const site of sites) {
    const year = getSiteTimelineYear(site);
    const list = map.get(year) ?? [];
    list.push(site);
    map.set(year, list);
  }
  for (const [year, list] of map) {
    list.sort((a, b) => getSiteTimelineIsoDate(a).localeCompare(getSiteTimelineIsoDate(b)));
    map.set(year, list);
  }
  return new Map([...map.entries()].sort(([a], [b]) => a - b));
}
