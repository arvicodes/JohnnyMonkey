import type { PresentationSlide } from './presentationDeck';
import { slideImageUrl } from './presentationDeck';

function collectSlideImageUrls(slide: PresentationSlide): string[] {
  const urls = new Set<string>();
  if (slide.imagePath) urls.add(slideImageUrl(slide.imagePath));
  for (const el of slide.elements ?? []) {
    if (el.type === 'image' && el.src) urls.add(slideImageUrl(el.src));
  }
  return [...urls].filter(Boolean);
}

function preloadImage(url: string, timeoutMs = 12_000): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => resolve();
    const timer = window.setTimeout(finish, timeoutMs);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      window.clearTimeout(timer);
      finish();
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish();
    };
    img.src = url;
  });
}

/** Bilder und Schriftarten laden, bevor html2canvas die Folie erfasst. */
export async function waitForSlideRenderAssets(slide: PresentationSlide): Promise<void> {
  const urls = collectSlideImageUrls(slide);
  await Promise.all(urls.map(preloadImage));
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((r) => window.setTimeout(r, 3000)),
    ]);
  } catch {
    /* ignore */
  }
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export async function waitForDomImages(root: ParentNode, timeoutMs = 10_000): Promise<void> {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          const done = () => resolve();
          const timer = window.setTimeout(done, timeoutMs);
          const src = (img.getAttribute('src') || '').trim();
          if (!src) {
            window.clearTimeout(timer);
            done();
            return;
          }
          if (img.complete) {
            window.clearTimeout(timer);
            done();
            return;
          }
          img.addEventListener(
            'load',
            () => {
              window.clearTimeout(timer);
              done();
            },
            { once: true },
          );
          img.addEventListener(
            'error',
            () => {
              window.clearTimeout(timer);
              done();
            },
            { once: true },
          );
        }),
    ),
  );
}
