const BRIEFE_DIR = 'Ankündigungen & Briefe';

export function flyerPageUrl(folderSlug: string): string {
  return `/ankuendigungen/flyer/${encodeURIComponent(folderSlug)}`;
}

export function flyerStudioUrl(folderSlug: string, title?: string): string {
  const base = `/ankuendigungen/flyer-studio/${encodeURIComponent(folderSlug)}`;
  if (!title?.trim()) return base;
  return `${base}?title=${encodeURIComponent(title.trim())}`;
}

export function announcementStudentPreviewPageUrl(): string {
  return '/ankuendigungen/schuelervorschau';
}

export type FlyerPreviewMode = 'default' | 'embed' | 'fullscreen';

export function flyerApiUrl(folderSlug: string, mode: FlyerPreviewMode = 'default'): string {
  const base = `/api/announcements/folder/${encodeURIComponent(folderSlug)}/flyer`;
  if (mode === 'default') return base;
  return `${base}?mode=${mode}`;
}

export function gitInternPathForBriefeFile(relativePath: string): string {
  const p = relativePath.replace(/\\/g, '/').trim();
  if (p.startsWith('git-intern/')) return p;
  if (p.startsWith('J-M-Reihen/')) return `git-intern/${p.slice('J-M-Reihen/'.length)}`;
  if (p.startsWith(`${BRIEFE_DIR}/`)) return `git-intern/${p}`;
  return `git-intern/${BRIEFE_DIR}/${p}`;
}

export function staticAssetBaseForFolder(folderSlug: string): string {
  const rel = `${BRIEFE_DIR}/${folderSlug}/`;
  return `/api/file-system-paths/static/${rel
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')}/`;
}
