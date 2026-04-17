import { PROMISE_WITH_RESOLVERS_WORKER_IIFE } from '../promiseWithResolversPolyfill';

let cachedWorkerSrc: string | null = null;

/**
 * pdfjs worker läuft in eigenem Kontext – Main-Thread-Polyfill reicht nicht.
 * Worker-Skript = Polyfill + offizieller pdf.worker (per fetch).
 */
export async function ensurePdfjsWorkerWithPolyfill(pdfjsLib: typeof import('pdfjs-dist')): Promise<void> {
  if (cachedWorkerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = cachedWorkerSrc;
    return;
  }
  let workerText: string;
  try {
    const url = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error('worker fetch failed');
    workerText = await res.text();
  } catch {
    const cdnUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const res = await fetch(cdnUrl);
    if (!res.ok) throw new Error('pdf.worker CDN fetch failed');
    workerText = await res.text();
  }
  const blob = new Blob([PROMISE_WITH_RESOLVERS_WORKER_IIFE + '\n' + workerText], {
    type: 'application/javascript',
  });
  cachedWorkerSrc = URL.createObjectURL(blob);
  pdfjsLib.GlobalWorkerOptions.workerSrc = cachedWorkerSrc;
}
