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

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Bilder und Schriftarten laden, bevor html2canvas die Folie erfasst. */
export async function waitForSlideRenderAssets(slide: PresentationSlide): Promise<void> {
  const urls = collectSlideImageUrls(slide);
  await Promise.all(urls.map(preloadImage));
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export async function waitForDomImages(root: ParentNode): Promise<void> {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
}
