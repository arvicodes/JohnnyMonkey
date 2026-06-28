import { flyerApiUrl } from './announcementPaths';

export async function folderHasFlyerHtml(folderSlug: string): Promise<boolean> {
  try {
    const src = flyerApiUrl(folderSlug, 'embed');
    const res = await fetch(src, { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) return true;
    const text = await res.text();
    return text.trim().length > 0 && /<\s*html/i.test(text);
  } catch {
    return false;
  }
}
