import {
  htmlToPlain,
  loadJsonFile,
  lessonFolderPath,
  saveJsonFile,
  type PresentationAnnotations,
  type PresentationDeck,
  type PresentationSlide,
  type PresentationStroke,
  type SlideElement,
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

export function isPlayPhotoElement(el: SlideElement): boolean {
  const name = (el.src || '').split(/[/\\]/).pop() || '';
  return el.type === 'image' && /^play-foto-/i.test(name);
}

export function stripPlayLayerFromSlide(slide: PresentationSlide): PresentationSlide {
  const hadInk = (slide.inkStrokes?.length ?? 0) > 0;
  const elements = (slide.elements || []).filter((el) => !isPlayPhotoElement(el));
  const strippedPhotos = elements.length !== (slide.elements || []).length;
  if (!hadInk && !strippedPhotos) return slide;
  const { inkStrokes: _ink, ...rest } = slide;
  return { ...rest, elements };
}

export function migratePlayLayerIntoVariants(
  deck: PresentationDeck,
  variants: PresentationPlayVariants,
  annotations: PresentationAnnotations,
): { deck: PresentationDeck; variants: PresentationPlayVariants; changed: boolean } {
  let variantsNext = variants;
  let changed = false;
  const slides = deck.slides.map((slide) => {
    const playPhotos = (slide.elements || []).filter(isPlayPhotoElement);
    const existing = variantsNext.bySlideId[slide.id];
    if (playPhotos.length) {
      const base = existing?.slide ?? slide;
      const have = new Set((base.elements || []).map((el) => el.id));
      const mergedEls = [
        ...(base.elements || []),
        ...playPhotos.filter((photo) => !have.has(photo.id)),
      ];
      variantsNext = upsertPlaySlideVariant(
        variantsNext,
        { ...base, elements: mergedEls },
        annotations.bySlideId[slide.id] ?? existing?.strokes ?? [],
      );
      changed = true;
      return stripPlayLayerFromSlide(slide);
    }
    if ((slide.inkStrokes?.length ?? 0) > 0) {
      changed = true;
      return stripPlayLayerFromSlide(slide);
    }
    return slide;
  });
  if (!changed) return { deck, variants, changed: false };
  return { deck: { ...deck, slides }, variants: variantsNext, changed: true };
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

export function removePlaySlideVariant(
  prev: PresentationPlayVariants,
  slideId: string,
): PresentationPlayVariants {
  if (!prev.bySlideId[slideId]) return prev;
  const { [slideId]: _removed, ...bySlideId } = prev.bySlideId;
  return {
    ...prev,
    updatedAt: new Date().toISOString(),
    bySlideId,
  };
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
        slide: cloneJson(slide),
        strokes: cloneJson(strokes),
      },
    },
  };
}

function playSlideHasContent(slide: PresentationSlide | undefined | null): boolean {
  if (!slide) return false;
  if ((slide.elements || []).length > 0) return true;
  if ((slide.inkStrokes || []).length > 0) return true;
  const texts = [
    slide.titleHtml,
    slide.title,
    slide.bodyHtml,
    slide.body,
    slide.bodyLeftHtml,
    slide.bodyRightHtml,
    slide.subtitleHtml,
  ];
  return texts.some((html) => htmlToPlain(html || '').trim().length > 0);
}

/** Play-Kopien speichern oft die Folie ohne Einblend-Nummern — Animation von der Master-Folie behalten. */
function mergeMasterAnimationOntoPlaySlide(
  master: PresentationSlide,
  playSlide: PresentationSlide,
): PresentationSlide {
  const masterById = new Map((master.elements || []).map((el) => [el.id, el]));
  const elements = (playSlide.elements || []).map((el) => {
    const fromMaster = masterById.get(el.id);
    if (!fromMaster) return el;
    const masterHasAnim =
      fromMaster.animationSet === true || (fromMaster.revealStep != null && fromMaster.revealStep > 0);
    const playHasAnim = el.animationSet === true || (el.revealStep != null && el.revealStep > 0);
    if (!masterHasAnim || playHasAnim) return el;
    return {
      ...el,
      revealStep: fromMaster.revealStep,
      animationSet: fromMaster.animationSet,
    };
  });
  const revealEnabled =
    playSlide.revealEnabled === false && master.revealEnabled === true
      ? true
      : playSlide.revealEnabled;
  const zoneRevealSteps =
    playSlide.zoneRevealSteps && Object.keys(playSlide.zoneRevealSteps).length > 0
      ? playSlide.zoneRevealSteps
      : master.zoneRevealSteps;
  return {
    ...playSlide,
    elements,
    revealEnabled,
    zoneRevealSteps,
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
      // Leere Play-Kopie (oft versehentlich gespeichert) darf die echte Folie nicht auswischen.
      if (!playSlideHasContent(variant.slide) && playSlideHasContent(slide)) {
        return slide;
      }
      const merged = mergeMasterAnimationOntoPlaySlide(slide, cloneJson(variant.slide));
      return {
        ...merged,
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
