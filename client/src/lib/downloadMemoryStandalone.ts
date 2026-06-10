import type { MemoryPlayBootstrap } from './memoryStorage';
import { memoryBackLogoUrl } from './memoryAssets';

const downloadFileName = 'ki-memory-spiel.html';

async function fetchBackLogoDataUrl(): Promise<string | undefined> {
  try {
    const response = await fetch(memoryBackLogoUrl, { cache: 'no-store' });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function downloadMemoryStandaloneHtml(bootstrap: MemoryPlayBootstrap): Promise<void> {
  const base = process.env.PUBLIC_URL || '';
  const backLogoUrl = await fetchBackLogoDataUrl();
  const response = await fetch(`${base}/ki-spiele/memory-play-standalone.html`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Export-Datei konnte nicht geladen werden.');
  }

  let html = await response.text();
  const bootstrapLiteral = JSON.stringify({ ...bootstrap, backLogoUrl });

  if (!html.includes('var embeddedBootstrap = null;')) {
    throw new Error('Export-Vorlage ist ungültig.');
  }

  html = html.replace('var embeddedBootstrap = null;', `var embeddedBootstrap = ${bootstrapLiteral};`);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
