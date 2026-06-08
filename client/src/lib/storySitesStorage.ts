import {
  readAllSitesFromDb,
  putSiteInDb,
  deleteSiteFromDb,
  readLegacyLocalStorageRaw,
  clearLegacyLocalStorage,
} from './storySitesDb';
import {
  collectPageImages,
  pageHasApiStoryMedia,
  pageHasLoadableDataImages,
} from './storyPageLayout';
import { addDaysToStoryPageDate } from './storyPageDate';
import type { StorySiteCategoryId } from './storySiteCategories';
import { isStorySiteCategoryId } from './storySiteCategories';

export type StoryPage = {
  id: string;
  title: string;
  subtitle: string;
  dateStr: string;
  location: string;
  /** @deprecated — nur noch für alte Daten; nutze galleryImages */
  heroImage: string;
  /** Bilder für die rechte Spalte (mehrere möglich) */
  galleryImages: string[];
  bodyHtml: string;
  /** Thematische Seite: Text über volle Breite, keine Polaroid-Spalte rechts */
  fullWidth?: boolean;
  /** Kleines Bild links neben dem Seitentitel (Vorschau) */
  titleImageLeft?: string;
  /** Kleines Bild rechts neben dem Seitentitel (Vorschau) */
  titleImageRight?: string;
};

export type StorySite = {
  id: string;
  name: string;
  category?: StorySiteCategoryId;
  timelineDate?: string;
  /** Land für Erasmus-Ordner (Schema: Jahr - Monat - Land - Titel) */
  country?: string;
  /** Relativer Pfad unter J-M-Reihen, z. B. Erasmus/2026 - 05 - Kroatien - Teaching Assignment */
  erasmusFolder?: string;
  /** Lokaler Ordner mit Quellfotos (iCloud-Export o. ä.) */
  imageSourceFolder?: string;
  pages: StoryPage[];
  createdAt: string;
  updatedAt: string;
};

const PREVIEW_SNAPSHOT_PREFIX = 'johnnyMonkey_storySitePreview:';
const PREVIEW_SNAPSHOT_TIME_PREFIX = 'johnnyMonkey_storySitePreviewAt:';
export const STORY_SITES_UPDATED_EVENT = 'johnnyMonkey_storySites_updated';

let sitesCache: StorySite[] = [];
let storageReady = false;
let storageReadyPromise: Promise<void> | null = null;

export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function emptyPage(overrides?: Partial<StoryPage>): StoryPage {
  const id = newId();
  return {
    id,
    title: overrides?.title ?? 'Neue Unterseite',
    subtitle: overrides?.subtitle ?? '',
    dateStr:
      overrides?.dateStr ??
      new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }),
    location: overrides?.location ?? '',
    heroImage: overrides?.heroImage ?? '',
    galleryImages: overrides?.galleryImages ?? (overrides?.heroImage ? [overrides.heroImage] : []),
    bodyHtml: overrides?.bodyHtml ?? '',
    titleImageLeft: overrides?.titleImageLeft ?? '',
    titleImageRight: overrides?.titleImageRight ?? '',
  };
}

function normalizePage(raw: unknown, index: number): StoryPage {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<StoryPage>;
  return {
    id: typeof p.id === 'string' && p.id ? p.id : newId(),
    title: typeof p.title === 'string' ? p.title : `Seite ${index + 1}`,
    subtitle: typeof p.subtitle === 'string' ? p.subtitle : '',
    dateStr: typeof p.dateStr === 'string' ? p.dateStr : '',
    location: typeof p.location === 'string' ? p.location : '',
    ...(() => {
      let galleryImages: string[] = [];
      if (Array.isArray(p.galleryImages)) {
        galleryImages = p.galleryImages.filter((x): x is string => typeof x === 'string' && !!x.trim());
      }
      if (galleryImages.length === 0 && typeof p.heroImage === 'string' && p.heroImage.trim()) {
        galleryImages = [p.heroImage.trim()];
      }
      return {
        galleryImages,
        heroImage: galleryImages[0] ?? '',
      };
    })(),
    bodyHtml: typeof p.bodyHtml === 'string' ? p.bodyHtml : '',
    fullWidth: p.fullWidth === true,
    titleImageLeft: typeof p.titleImageLeft === 'string' ? p.titleImageLeft.trim() : '',
    titleImageRight: typeof p.titleImageRight === 'string' ? p.titleImageRight.trim() : '',
  };
}

export function normalizeStorySite(raw: unknown): StorySite | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<StorySite>;
  if (typeof o.id !== 'string' || !o.id) return null;
  const now = new Date().toISOString();
  const pagesRaw = Array.isArray(o.pages) ? o.pages : [];
  const pages = pagesRaw.length > 0 ? pagesRaw.map(normalizePage) : [emptyPage({ title: 'Startseite' })];
  return {
    id: o.id,
    name: typeof o.name === 'string' && o.name.trim() ? o.name : 'Neue Website',
    category: isStorySiteCategoryId(o.category) ? o.category : undefined,
    timelineDate: typeof o.timelineDate === 'string' ? o.timelineDate.trim() : undefined,
    country: typeof o.country === 'string' ? o.country : '',
    erasmusFolder: typeof o.erasmusFolder === 'string' ? o.erasmusFolder : undefined,
    imageSourceFolder: typeof o.imageSourceFolder === 'string' ? o.imageSourceFolder : '',
    pages,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : now,
  };
}

function normalizeSitesList(raw: unknown[]): StorySite[] {
  return raw.map(normalizeStorySite).filter((s): s is StorySite => s !== null);
}

function dispatchSitesUpdated(): void {
  window.dispatchEvent(new CustomEvent(STORY_SITES_UPDATED_EVENT, { detail: { sites: sitesCache } }));
}

async function hydrateFromIndexedDb(): Promise<void> {
  const rows = await readAllSitesFromDb();
  sitesCache = normalizeSitesList(rows);
}

async function migrateLegacyLocalStorage(): Promise<void> {
  const raw = readLegacyLocalStorageRaw();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      clearLegacyLocalStorage();
      return;
    }
    const legacy = normalizeSitesList(parsed);
    for (const site of legacy) {
      const i = sitesCache.findIndex((s) => s.id === site.id);
      if (i >= 0) sitesCache[i] = site;
      else sitesCache.push(site);
      await putSiteInDb(site);
    }
    clearLegacyLocalStorage();
  } catch {
    /* behalten falls IDB leer war */
  }
}

/** IndexedDB laden (einmalig) — vor loadSites/getSiteById aufrufen. */
export async function ensureStorySitesStorageReady(): Promise<void> {
  if (storageReady) return;
  if (storageReadyPromise) return storageReadyPromise;
  storageReadyPromise = (async () => {
    try {
      await hydrateFromIndexedDb();
      await migrateLegacyLocalStorage();
    } catch (e) {
      console.warn('Story-Sites IndexedDB:', e);
      const raw = readLegacyLocalStorageRaw();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) sitesCache = normalizeSitesList(parsed);
        } catch {
          sitesCache = [];
        }
      }
    }
    storageReady = true;
  })();
  return storageReadyPromise;
}

export function createEmptySite(): StorySite {
  const now = new Date().toISOString();
  const start = emptyPage({ title: 'Startseite', subtitle: '' });
  return {
    id: newId(),
    name: 'Neue Website',
    pages: [start],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadSites(): StorySite[] {
  return [...sitesCache];
}

export async function saveSiteLocally(site: StorySite): Promise<void> {
  await ensureStorySitesStorageReady();
  const normalized = normalizeStorySite(site);
  if (!normalized) throw new Error('Ungültige Website');
  const next = { ...normalized, updatedAt: new Date().toISOString() };
  const i = sitesCache.findIndex((s) => s.id === next.id);
  if (i >= 0) sitesCache[i] = next;
  else sitesCache.push(next);
  await putSiteInDb(next);
  dispatchSitesUpdated();
}

export function getSiteById(id: string): StorySite | undefined {
  return sitesCache.find((s) => s.id === id);
}

export async function upsertSite(site: StorySite): Promise<void> {
  await saveSiteLocally(site);
}

export async function deleteSiteById(id: string): Promise<void> {
  await ensureStorySitesStorageReady();
  sitesCache = sitesCache.filter((s) => s.id !== id);
  await deleteSiteFromDb(id);
  dispatchSitesUpdated();
}

const SAVE_TIMEOUT_MS = 600_000;
const SAVE_MAX_ATTEMPTS = 2;

export type StorySiteServerSaveResult = {
  ok: boolean;
  status?: number;
  error?: string;
  site?: StorySite;
};

export async function saveSiteToServer(site: StorySite): Promise<StorySiteServerSaveResult> {
  const normalized = normalizeStorySite(site);
  if (!normalized) return { ok: false, error: 'Ungültige Website-Daten' };
  const body = JSON.stringify(normalized);
  if (body.length > 45_000_000) {
    return {
      ok: false,
      error: 'Website ist zu groß für den Server — bitte weniger oder kleinere Bilder verwenden.',
      site: normalized,
    };
  }

  let lastError = 'Netzwerkfehler';

  for (let attempt = 1; attempt <= SAVE_MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
      const res = await fetch(`/api/story-sites/${encodeURIComponent(normalized.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      window.clearTimeout(timer);

      if (res.ok) {
        try {
          const data = (await res.json()) as { erasmusFolder?: string | null };
          if (data?.erasmusFolder && typeof data.erasmusFolder === 'string') {
            normalized.erasmusFolder = data.erasmusFolder;
            await saveSiteLocally(normalized);
          }
        } catch {
          /* ignore */
        }
        return { ok: true, site: normalized };
      }

      let error = `Server antwortete mit ${res.status}`;
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) error = data.error;
      } catch {
        /* ignore */
      }
      if (res.status === 404) {
        error = 'API nicht gefunden — Server neu starten (npm run dev im Projektroot).';
      } else if (res.status === 504 || res.status === 408) {
        error =
          'Speichern hat zu lange gedauert. Lokal ist gespeichert — bitte kurz warten und erneut speichern (Strg+S).';
      }
      lastError = error;
      console.warn(`Story-Sites Server-Speichern (Versuch ${attempt}/${SAVE_MAX_ATTEMPTS}):`, error);

      const retryable = res.status === 504 || res.status === 408 || res.status >= 500;
      if (retryable && attempt < SAVE_MAX_ATTEMPTS) {
        await new Promise((r) => window.setTimeout(r, 2000));
        continue;
      }
      return { ok: false, status: res.status, error, site: normalized };
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === 'AbortError'
          ? 'Speichern abgebrochen (Zeitüberschreitung) — lokal gespeichert, bitte erneut versuchen.'
          : e instanceof TypeError
            ? 'Keine Verbindung zum Server — läuft „npm run dev“ (API Port 3003)?'
            : e instanceof Error
              ? e.message
              : 'Netzwerkfehler';
      lastError = msg;
      console.warn(`Story-Sites Server-Speichern (Versuch ${attempt}/${SAVE_MAX_ATTEMPTS}):`, msg);

      const retryable =
        e instanceof DOMException && e.name === 'AbortError'
          ? true
          : e instanceof TypeError;
      if (retryable && attempt < SAVE_MAX_ATTEMPTS) {
        await new Promise((r) => window.setTimeout(r, 2000));
        continue;
      }
      return { ok: false, error: msg, site: normalized };
    }
  }

  return { ok: false, error: lastError, site: normalized };
}

/** Lokal (IndexedDB) und parallel auf dem Server. */
export async function persistSite(
  site: StorySite,
): Promise<{ localOk: boolean; serverOk: boolean; serverError?: string; site: StorySite }> {
  let localOk = true;
  try {
    await saveSiteLocally(site);
  } catch (e) {
    console.warn('Story-Sites lokal speichern:', e);
    localOk = false;
  }
  const serverResult = await saveSiteToServer(site);
  const snapshotSite = serverResult.site ?? normalizeStorySite(site) ?? site;
  writePreviewSnapshot(snapshotSite);
  return { localOk, serverOk: serverResult.ok, serverError: serverResult.error, site: snapshotSite };
}

/** Website vom Server (Bilder als data:-URL eingebettet). */
export async function fetchSiteHydratedFromServer(id: string): Promise<StorySite | null> {
  try {
    const res = await fetch(`/api/story-sites/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return normalizeStorySite(await res.json());
  } catch {
    return null;
  }
}

export async function fetchSiteFromServer(id: string): Promise<StorySite | null> {
  try {
    const res = await fetch(`/api/story-sites/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const site = normalizeStorySite(data);
    if (site) {
      try {
        await saveSiteLocally(site);
      } catch {
        /* Server-Kopie reicht */
      }
    }
    return site;
  } catch {
    return null;
  }
}

/** Lokal leer oder fehlende IDs: Websites vom Server nachladen. */
export async function syncSitesFromServer(): Promise<number> {
  await ensureStorySitesStorageReady();
  try {
    const res = await fetch('/api/story-sites');
    if (!res.ok) return 0;
    const list = (await res.json()) as { id?: string }[];
    let imported = 0;
    const importAll = sitesCache.length === 0;
    for (const item of list) {
      const id = item.id?.trim();
      if (!id || id === 'does-not-exist' || id.startsWith('test-') || id.startsWith('big-')) continue;
      if (!importAll && getSiteById(id)) continue;
      const site = await fetchSiteFromServer(id);
      if (site) imported += 1;
    }
    return imported;
  } catch {
    return 0;
  }
}

/** @deprecated Nutze syncSitesFromServer */
export async function syncAllSitesFromServerIfEmpty(): Promise<number> {
  return syncSitesFromServer();
}

function countSiteImages(site: StorySite): number {
  return site.pages.reduce((n, p) => n + collectPageImages(p).length, 0);
}

/** Lokale Seite vs. Server: Server-Medien schlagen veraltete data:-URLs. */
function pickPageForPreview(local: StoryPage, server: StoryPage): StoryPage {
  if (pageHasApiStoryMedia(server)) return server;
  const localData = pageHasLoadableDataImages(local);
  const serverData = pageHasLoadableDataImages(server);
  if (localData && !serverData) return local;
  if (serverData && !localData) return server;
  if (!localData && !serverData) return server;
  return collectPageImages(local).length >= collectPageImages(server).length ? local : server;
}

/** Editor: Server als Basis (Medien-Dateien), lokale Ergänzungen nur für fehlende Unterseiten. */
export function mergeSiteForEditor(local: StorySite, server: StorySite): StorySite {
  const serverIds = new Set(server.pages.map((p) => p.id));
  const extraLocal = local.pages.filter((p) => !serverIds.has(p.id));
  const updatedAt =
    Date.parse(local.updatedAt) >= Date.parse(server.updatedAt) ? local.updatedAt : server.updatedAt;
  return {
    ...server,
    name: local.name || server.name,
    category: local.category ?? server.category,
    country: local.country || server.country,
    imageSourceFolder: local.imageSourceFolder || server.imageSourceFolder,
    pages: [...server.pages, ...extraLocal],
    updatedAt,
  };
}

/** Vorschau-Tab: lokale + Server-Version (data:-URLs nur wenn Server keine API-Medien hat). */
export function mergeSitesForPreview(primary: StorySite, secondary: StorySite): StorySite {
  const byId = new Map(secondary.pages.map((p) => [p.id, p]));
  const pages = primary.pages.map((serverPage) => {
    const other = byId.get(serverPage.id);
    if (!other) return serverPage;
    return pickPageForPreview(serverPage, other);
  });
  for (const p of secondary.pages) {
    if (!pages.some((x) => x.id === p.id)) pages.push(p);
  }
  const updatedAt =
    Date.parse(primary.updatedAt) >= Date.parse(secondary.updatedAt)
      ? primary.updatedAt
      : secondary.updatedAt;
  return { ...primary, name: primary.name || secondary.name, pages, updatedAt };
}

function pickLocalCandidate(snap: StorySite | null, local: StorySite | undefined): StorySite | null {
  if (snap && local) {
    const snapT = Date.parse(snap.updatedAt || '0') || 0;
    const localT = Date.parse(local.updatedAt || '0') || 0;
    return localT >= snapT ? local : snap;
  }
  return snap ?? local ?? null;
}

export async function loadSiteForPreview(id: string): Promise<StorySite | null> {
  await ensureStorySitesStorageReady();

  const snap = readPreviewSnapshot(id);
  const local = getSiteById(id);
  const offline = pickLocalCandidate(snap, local);

  /** Server-Medien haben Vorrang vor frischem Snapshot (sonst „Medien nicht geladen“ bei Tag 2 …). */
  let serverForSnap: StorySite | null = null;
  try {
    const res = await fetch(`/api/story-sites/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) serverForSnap = normalizeStorySite(await res.json());
  } catch {
    /* offline */
  }

  if (snap && countSiteImages(snap) > 0) {
    try {
      const writtenAt = localStorage.getItem(`${PREVIEW_SNAPSHOT_TIME_PREFIX}${id}`);
      const snapAge = writtenAt ? Date.now() - Date.parse(writtenAt) : 0;
      if (!writtenAt || snapAge < 30 * 60 * 1000) {
        if (serverForSnap?.pages.some((p) => pageHasApiStoryMedia(p))) {
          return mergeSitesForPreview(snap, serverForSnap);
        }
        return snap;
      }
    } catch {
      if (serverForSnap?.pages.some((p) => pageHasApiStoryMedia(p))) {
        return mergeSitesForPreview(snap, serverForSnap);
      }
      return snap;
    }
  }

  if (
    offline &&
    countSiteImages(offline) > 0 &&
    offline.pages.some((p) => pageHasLoadableDataImages(p))
  ) {
    return offline;
  }

  try {
    const res = await fetch(`/api/story-sites/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) {
      const fromServer = normalizeStorySite(await res.json());
      if (fromServer) {
        let merged = fromServer;
        if (offline) merged = mergeSitesForPreview(offline, fromServer);
        try {
          await saveSiteLocally(merged);
        } catch {
          /* optional */
        }
        return merged;
      }
    }
  } catch {
    /* offline */
  }

  if (offline) return offline;
  return fetchSiteFromServer(id);
}

const PREVIEW_SNAPSHOT_MAX_CHARS = 1_500_000;

export function writePreviewSnapshot(site: StorySite): void {
  try {
    const json = JSON.stringify(site);
    if (json.length > PREVIEW_SNAPSHOT_MAX_CHARS) return;
    const now = new Date().toISOString();
    // localStorage: auch im neuen Vorschau-Tab lesbar (sessionStorage ist tab-isoliert!)
    localStorage.setItem(`${PREVIEW_SNAPSHOT_PREFIX}${site.id}`, json);
    localStorage.setItem(`${PREVIEW_SNAPSHOT_TIME_PREFIX}${site.id}`, now);
    sessionStorage.setItem(`${PREVIEW_SNAPSHOT_PREFIX}${site.id}`, json);
  } catch {
    /* ignore quota */
  }
}

export function readPreviewSnapshot(id: string): StorySite | null {
  const key = `${PREVIEW_SNAPSHOT_PREFIX}${id}`;
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      const site = normalizeStorySite(JSON.parse(raw));
      if (site) return site;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Veralteten Vorschau-Snapshot löschen (enthält oft defekte data:-Galerien). */
export function clearPreviewSnapshot(id: string): void {
  try {
    localStorage.removeItem(`${PREVIEW_SNAPSHOT_PREFIX}${id}`);
    localStorage.removeItem(`${PREVIEW_SNAPSHOT_TIME_PREFIX}${id}`);
    sessionStorage.removeItem(`${PREVIEW_SNAPSHOT_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
}

function defaultsForNextPage(site: StorySite): Partial<StoryPage> {
  const last = site.pages[site.pages.length - 1];
  const nextIndex = site.pages.length + 1;
  if (!last) {
    return { title: `Tag ${nextIndex}` };
  }
  const titleMatch = last.title.trim().match(/^Tag\s*(\d+)\s*$/i);
  const title = titleMatch ? `Tag ${parseInt(titleMatch[1], 10) + 1}` : `Tag ${nextIndex}`;
  return {
    title,
    subtitle: '',
    dateStr: addDaysToStoryPageDate(last.dateStr, 1),
    location: last.location?.trim() ?? '',
    bodyHtml: '',
    galleryImages: [],
    heroImage: '',
  };
}

export function addPageToSite(site: StorySite): StorySite {
  return {
    ...site,
    pages: [...site.pages, emptyPage(defaultsForNextPage(site))],
  };
}

export function removePageFromSite(site: StorySite, pageId: string): StorySite {
  if (site.pages.length <= 1) return site;
  return {
    ...site,
    pages: site.pages.filter((p) => p.id !== pageId),
  };
}

/** Titel „Startseite“ — Landing mit Übersicht der Unterseiten. */
export function isStoryStartPageTitle(title: string): boolean {
  return /^startseite$/i.test(title.trim());
}

export function getStoryStartPage(pages: StoryPage[]): StoryPage | undefined {
  return pages.find((p) => isStoryStartPageTitle(p.title));
}

export function getStoryOverviewPages(pages: StoryPage[]): StoryPage[] {
  return pages.filter((p) => !isStoryStartPageTitle(p.title));
}

/** Titel wie „Tag 1“, „Tag 12“ — Tagebuch-Tag; alles andere gilt als thematische Unterseite. */
export function isStoryDayPageTitle(title: string): boolean {
  return /^Tag\s*\d+\s*$/i.test(title.trim());
}

export function partitionStoryPages(pages: StoryPage[]): { thematic: StoryPage[]; days: StoryPage[] } {
  const thematic: StoryPage[] = [];
  const days: StoryPage[] = [];
  for (const p of pages) {
    if (isStoryDayPageTitle(p.title)) days.push(p);
    else thematic.push(p);
  }
  return { thematic, days };
}

export function mergeStoryPagePartitions(thematic: StoryPage[], days: StoryPage[]): StoryPage[] {
  return [...thematic, ...days];
}

export function normalizeStoryPageOrder(site: StorySite): StorySite {
  const { thematic, days } = partitionStoryPages(site.pages);
  return { ...site, pages: mergeStoryPagePartitions(thematic, days) };
}

function reorderPageList(pages: StoryPage[], activeId: string, overId: string): StoryPage[] {
  const oldIndex = pages.findIndex((p) => p.id === activeId);
  const newIndex = pages.findIndex((p) => p.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return pages;
  const next = pages.slice();
  const [removed] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, removed);
  return next;
}

export function movePage(site: StorySite, pageId: string, dir: -1 | 1): StorySite {
  const page = site.pages.find((p) => p.id === pageId);
  if (!page) return site;
  const { thematic, days } = partitionStoryPages(site.pages);
  const list = isStoryDayPageTitle(page.title) ? days : thematic;
  const idx = list.findIndex((p) => p.id === pageId);
  const j = idx + dir;
  if (j < 0 || j >= list.length) return site;
  const next = list.slice();
  [next[idx], next[j]] = [next[j], next[idx]];
  return {
    ...site,
    pages: isStoryDayPageTitle(page.title)
      ? mergeStoryPagePartitions(thematic, next)
      : mergeStoryPagePartitions(next, days),
  };
}

/** Unterseiten per Drag-and-Drop umsortieren (activeId → overId, nur innerhalb einer Gruppe). */
export function reorderPagesInGroup(
  site: StorySite,
  group: 'thematic' | 'days',
  activeId: string,
  overId: string,
): StorySite {
  const { thematic, days } = partitionStoryPages(site.pages);
  const list = group === 'thematic' ? thematic : days;
  const reordered = reorderPageList(list, activeId, overId);
  if (reordered === list) return site;
  return {
    ...site,
    pages:
      group === 'thematic'
        ? mergeStoryPagePartitions(reordered, days)
        : mergeStoryPagePartitions(thematic, reordered),
  };
}

/** @deprecated Nutze reorderPagesInGroup — behält globale Reihenfolge bei. */
export function reorderPages(site: StorySite, activeId: string, overId: string): StorySite {
  const oldIndex = site.pages.findIndex((p) => p.id === activeId);
  const newIndex = site.pages.findIndex((p) => p.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return site;
  const pages = site.pages.slice();
  const [removed] = pages.splice(oldIndex, 1);
  pages.splice(newIndex, 0, removed);
  return { ...site, pages };
}

export function updatePage(site: StorySite, pageId: string, patch: Partial<StoryPage>): StorySite {
  return {
    ...site,
    pages: site.pages.map((p) => (p.id === pageId ? { ...p, ...patch, id: p.id } : p)),
  };
}
