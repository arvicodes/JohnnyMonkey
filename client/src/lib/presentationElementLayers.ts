import type { SlideElement } from './presentationDeck';

export type ElementStackLayer = 'background' | 'foreground';
export type ElementLayerAction = 'front' | 'back' | 'forward' | 'backward';

export function getElementStackLayer(element: SlideElement): ElementStackLayer {
  return element.stackLayer ?? 'foreground';
}

export function splitElementsByStackLayer(elements: SlideElement[] | undefined): {
  background: SlideElement[];
  foreground: SlideElement[];
} {
  const list = elements ?? [];
  return {
    background: list.filter((el) => getElementStackLayer(el) === 'background'),
    foreground: list.filter((el) => getElementStackLayer(el) !== 'background'),
  };
}

export function reorderSlideElements(
  elements: SlideElement[],
  elementId: string,
  action: ElementLayerAction,
): SlideElement[] | null {
  const target = elements.find((el) => el.id === elementId);
  if (!target) return null;

  const layer = getElementStackLayer(target);
  const inLayer = [...elements]
    .filter((el) => getElementStackLayer(el) === layer)
    .sort((a, b) => a.zIndex - b.zIndex || elements.indexOf(a) - elements.indexOf(b));
  const index = inLayer.findIndex((el) => el.id === elementId);
  if (index < 0) return null;

  let newIndex = index;
  if (action === 'front') newIndex = inLayer.length - 1;
  else if (action === 'back') newIndex = 0;
  else if (action === 'forward') newIndex = Math.min(inLayer.length - 1, index + 1);
  else newIndex = Math.max(0, index - 1);

  if (newIndex === index) return null;

  const moved = [...inLayer];
  const [item] = moved.splice(index, 1);
  moved.splice(newIndex, 0, item);
  const zById = new Map(moved.map((el, i) => [el.id, i + 1]));

  return elements.map((el) =>
    getElementStackLayer(el) === layer && zById.has(el.id)
      ? { ...el, zIndex: zById.get(el.id)! }
      : el,
  );
}

const LAYER_ORDER: ElementStackLayer[] = ['background', 'foreground'];

/** Verschiebt ein Element eine Ebene nach vorne/hinten — auch zwischen Hintergrund und Vordergrund. */
export function stepElementStackLayer(
  elements: SlideElement[],
  elementId: string,
  direction: 'forward' | 'backward',
): SlideElement[] | null {
  const target = elements.find((el) => el.id === elementId);
  if (!target) return null;

  const layer = getElementStackLayer(target);
  const layerIndex = LAYER_ORDER.indexOf(layer);
  const inLayer = [...elements]
    .filter((el) => getElementStackLayer(el) === layer)
    .sort((a, b) => a.zIndex - b.zIndex || elements.indexOf(a) - elements.indexOf(b));
  const index = inLayer.findIndex((el) => el.id === elementId);

  if (direction === 'forward') {
    if (index < inLayer.length - 1) {
      return reorderSlideElements(elements, elementId, 'forward');
    }
    if (layer === 'background') {
      return setElementStackLayerInSlide(elements, elementId, 'foreground');
    }
    return null;
  }

  if (index > 0) {
    return reorderSlideElements(elements, elementId, 'backward');
  }
  if (layer === 'foreground') {
    return setElementStackLayerInSlide(elements, elementId, 'background');
  }
  return null;
}

export function setElementStackLayerInSlide(
  elements: SlideElement[],
  elementId: string,
  stackLayer: ElementStackLayer,
): SlideElement[] {
  const target = elements.find((el) => el.id === elementId);
  if (!target || getElementStackLayer(target) === stackLayer) return elements;

  const inTargetLayer = elements.filter((el) => getElementStackLayer(el) === stackLayer);
  const maxZ = inTargetLayer.reduce((max, el) => Math.max(max, el.zIndex), 0);

  return elements.map((el) =>
    el.id === elementId ? { ...el, stackLayer, zIndex: maxZ + 1 } : el,
  );
}
