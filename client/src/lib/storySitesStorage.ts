import {
  readAllSitesFromDb,
  putSiteInDb,
  deleteSiteFromDb,
  readLegacyLocalStorageRaw,
  clearLegacyLocalStorage,
} from './storySitesDb';
import { collectPageImages, pageHasLoadableDataImages } from './storyPageLayout';

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
};

export type StorySite = {
  id: string;
  name: string;
  /** Land für Erasmus-Ordner (Schema: Jahr - Monat - Land - Titel) */
  country?: string;
  /** Relativer Pfad unter J-M-Reihen, z. B. Erasmus/2026 - 05 - Spanien - Bericht */
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

export type StorySiteServerSaveResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

export async function saveSiteToServer(site: StorySite): Promise<StorySiteServerSaveResult> {
  const normalized = normalizeStorySite(site);
  if (!normalized) return { ok: false, error: 'Ungültige Website-Daten' };
  const body = JSON.stringify(normalized);
  if (body.length > 45_000_000) {
    return {
      ok: false,
      error: 'Website ist zu groß für den Server — bitte weniger oder kleinere Bilder verwenden.',
    };
  }
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 300_000);
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
      return { ok: true };
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
        'Speichern hat zu lange gedauert (Zeitüberschreitung). Lokal ist gespeichert — Server mit npm run dev neu starten und erneut speichern.';
    }
    console.warn('Story-Sites Server-Speichern:', error);
    return { ok: false, status: res.status, error };
  } catch (e) {
    const msg =
      e instanceof DOMException && e.name === 'AbortError'
        ? 'Speichern abgebrochen (Zeitüberschreitung) — lokal gespeichert, bitte erneut versuchen.'
        : e instanceof TypeError
          ? 'Keine Verbindung zum Server — läuft „npm run dev“ (API Port 3003)?'
          : e instanceof Error
            ? e.message
            : 'Netzwerkfehler';
    console.warn('Story-Sites Server-Speichern:', msg);
    return { ok: false, error: msg };
  }
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
  let snapshotSite = site;
  if (serverResult.ok) {
    const refreshed = await fetchSiteFromServer(site.id);
    if (refreshed) snapshotSite = refreshed;
  }
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

function countSiteImages(site: StorySite): number {
  return site.pages.reduce((n, p) => n + collectPageImages(p).length, 0);
}

function pickPageForPreview(a: StoryPage, b: StoryPage): StoryPage {
  const aData = pageHasLoadableDataImages(a);
  const bData = pageHasLoadableDataImages(b);
  if (aData && !bData) return a;
  if (bData && !aData) return b;
  return collectPageImages(a).length >= collectPageImages(b).length ? a : b;
}

/** Lokale + Server-Version zusammenführen (data:-URLs bevorzugt). */
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

  // Snapshot aus „Vorschau öffnen“ (localStorage, alle Tabs) — hat meist data:-URLs
  if (snap && countSiteImages(snap) > 0) {
    try {
      const writtenAt = localStorage.getItem(`${PREVIEW_SNAPSHOT_TIME_PREFIX}${id}`);
      const snapAge = writtenAt ? Date.now() - Date.parse(writtenAt) : 0;
      if (!writtenAt || snapAge < 30 * 60 * 1000) return snap;
    } catch {
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

export function addPageToSite(site: StorySite): StorySite {
  return {
    ...site,
    pages: [...site.pages, emptyPage()],
  };
}

export function removePageFromSite(site: StorySite, pageId: string): StorySite {
  if (site.pages.length <= 1) return site;
  return {
    ...site,
    pages: site.pages.filter((p) => p.id !== pageId),
  };
}

export function movePage(site: StorySite, pageId: string, dir: -1 | 1): StorySite {
  const idx = site.pages.findIndex((p) => p.id === pageId);
  if (idx < 0) return site;
  const j = idx + dir;
  if (j < 0 || j >= site.pages.length) return site;
  const pages = site.pages.slice();
  [pages[idx], pages[j]] = [pages[j], pages[idx]];
  return { ...site, pages };
}

export function updatePage(site: StorySite, pageId: string, patch: Partial<StoryPage>): StorySite {
  return {
    ...site,
    pages: site.pages.map((p) => (p.id === pageId ? { ...p, ...patch, id: p.id } : p)),
  };
}
