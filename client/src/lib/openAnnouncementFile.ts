import { flyerPageUrl, gitInternPathForBriefeFile } from './announcementPaths';

/** HTML / Material aus Ankündigungs-Ordner öffnen */
export async function openAnnouncementFile(relativePath: string, folderSlug?: string): Promise<void> {
  const normalized = relativePath.replace(/\\/g, '/').trim();
  const lower = normalized.toLowerCase();

  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    const slug =
      folderSlug ||
      normalized.split('/').filter(Boolean).slice(-2, -1)[0] ||
      '';
    if (slug) {
      const url = flyerPageUrl(slug);
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) window.location.assign(url);
      return;
    }
  }

  const gitPath = gitInternPathForBriefeFile(normalized);
  const staticUrl = `/api/file-system-paths/static/${gitPath
    .replace(/^git-intern\//, '')
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/')}`;

  try {
    if (lower.endsWith('.md') || lower.endsWith('.txt')) {
      const res = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(gitPath)}`);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    const w = window.open(staticUrl, '_blank', 'noopener,noreferrer');
    if (!w) window.location.assign(staticUrl);
  } catch {
    window.alert('Datei konnte nicht geöffnet werden.');
  }
}
