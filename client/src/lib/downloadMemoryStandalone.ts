import type { MemoryPlayBootstrap } from './memoryStorage';

const downloadFileName = 'ki-memory-spiel.html';

export async function downloadMemoryStandaloneHtml(bootstrap: MemoryPlayBootstrap): Promise<void> {
  const base = process.env.PUBLIC_URL || '';
  const response = await fetch(`${base}/ki-spiele/memory-play-standalone.html`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Export-Datei konnte nicht geladen werden.');
  }

  let html = await response.text();
  const bootstrapLiteral = JSON.stringify(bootstrap);

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
