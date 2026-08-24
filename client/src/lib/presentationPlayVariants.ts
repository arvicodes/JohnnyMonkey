import {
  loadJsonFile,
  lessonFolderPath,
  normalizeSlide,
  saveJsonFile,
  type PresentationDeck,
  type PresentationSlide,
  type PresentationStroke,
} from './presentationDeck';

export const PLAY_VARIANTS_FILENAME = 'Praesentation.play-variants.json';

export type PlaySlideVariant = {
  updatedAt: string;
  slide: PresentationSlide;
  strokes: PresentationStroke[];
};

export type PresentationPlayVariants = {
  version: 1;
  lessonPath: string;
  updatedAt: string;
  bySlideId: Record<string, PlaySlideVariant>;
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function playVariantsFilePath(lessonPath: string): string {
  return `${lessonFolderPath(lessonPath)}/${PLAY_VARIANTS_FILENAME}`;
}

export function createEmptyPlayVariants(lessonPath: string): PresentationPlayVariants {
  return {
    version: 1,
    lessonPath: lessonFolderPath(lessonPath),
    updatedAt: new Date().toISOString(),
    bySlideId: {},
  };
}

export function hasPlaySlideVariant(
  variants: PresentationPlayVariants | null | undefined,
  annotationsBySlideId: Record<string, PresentationStroke[]> | undefined,
  slideId: string,
): boolean {
  if (variants?.bySlideId[slideId]) return true;
  return (annotationsBySlideId?.[slideId]?.length ?? 0) > 0;
}

export function playVariantSlideIds(
  variants: PresentationPlayVariants | null | undefined,
  annotationsBySlideId: Record<string, PresentationStroke[]> | undefined,
): string[] {
  const ids = new Set<string>();
  if (variants?.bySlideId) {
    for (const id of Object.keys(variants.bySlideId)) {
      if (variants.bySlideId[id]) ids.add(id);
    }
  }
  if (annotationsBySlideId) {
    for (const [id, strokes] of Object.entries(annotationsBySlideId)) {
      if (strokes?.length) ids.add(id);
    }
  }
  return Array.from(ids);
}

export function upsertPlaySlideVariant(
  prev: PresentationPlayVariants,
  slide: PresentationSlide,
  strokes: PresentationStroke[] = [],
): PresentationPlayVariants {
  const now = new Date().toISOString();
  return {
    ...prev,
    updatedAt: now,
    bySlideId: {
      ...prev.bySlideId,
      [slide.id]: {
        updatedAt: now,
        slide: normalizeSlide(cloneJson(slide)),
        strokes: cloneJson(strokes),
      },
    },
  };
}

export function applyPlayVariantsToDeck(
  deck: PresentationDeck,
  variants: PresentationPlayVariants | null | undefined,
): PresentationDeck {
  const by = variants?.bySlideId;
  if (!by || !Object.keys(by).length) return deck;
  return {
    ...deck,
    slides: deck.slides.map((slide) => {
      const variant = by[slide.id];
      if (!variant?.slide) return slide;
      return {
        ...normalizeSlide(cloneJson(variant.slide)),
        id: slide.id,
        order: slide.order,
      };
    }),
  };
}

export async function loadPresentationPlayVariants(
  lessonPath: string,
): Promise<PresentationPlayVariants> {
  const loaded = await loadJsonFile<PresentationPlayVariants>(playVariantsFilePath(lessonPath));
  if (loaded?.bySlideId && typeof loaded.bySlideId === 'object') {
    return {
      version: 1,
      lessonPath: lessonFolderPath(lessonPath),
      updatedAt: loaded.updatedAt || new Date().toISOString(),
      bySlideId: loaded.bySlideId,
    };
  }
  return createEmptyPlayVariants(lessonPath);
}

export async function savePresentationPlayVariants(
  lessonPath: string,
  variants: PresentationPlayVariants,
): Promise<void> {
  const payload: PresentationPlayVariants = {
    ...variants,
    version: 1,
    lessonPath: lessonFolderPath(lessonPath),
    updatedAt: new Date().toISOString(),
  };
  await saveJsonFile(lessonPath, PLAY_VARIANTS_FILENAME, payload);
}
