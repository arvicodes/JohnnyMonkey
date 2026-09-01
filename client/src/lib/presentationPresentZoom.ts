/** Zoom-Faktor für Präsentations-/Play-Ansicht (über Fit-Scale). */

export const PRESENT_ZOOM_MIN = 1;
export const PRESENT_ZOOM_MAX = 3;
export const PRESENT_ZOOM_STEP = 0.25;

export function clampPresentZoom(zoom: number): number {
  const stepped = Math.round(zoom / PRESENT_ZOOM_STEP) * PRESENT_ZOOM_STEP;
  return Math.min(PRESENT_ZOOM_MAX, Math.max(PRESENT_ZOOM_MIN, Number(stepped.toFixed(2))));
}

/** Kontinuierlich (Trackpad-Pinch) — ohne Raster. */
export function clampPresentZoomSmooth(zoom: number): number {
  return Math.min(PRESENT_ZOOM_MAX, Math.max(PRESENT_ZOOM_MIN, zoom));
}

export function presentZoomIn(zoom: number): number {
  return clampPresentZoom(zoom + PRESENT_ZOOM_STEP);
}

export function presentZoomOut(zoom: number): number {
  return clampPresentZoom(zoom - PRESENT_ZOOM_STEP);
}

export function presentZoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/** Button-Steuerung: auf 25%-Raster snappen; Trackpad bleibt flüssig. */
export function snapPresentZoom(zoom: number): number {
  return clampPresentZoom(zoom);
}

/**
 * Trackpad-Pinch auf macOS/Chrome: `wheel` mit `ctrlKey` und deltaY.
 * Positives deltaY → herauszoomen.
 */
export function presentZoomFromWheelDelta(zoom: number, deltaY: number): number {
  // Sanfte Exponential-Kurve — fühlt sich wie System-Pinch an
  const factor = Math.exp(-deltaY * 0.008);
  return clampPresentZoomSmooth(zoom * factor);
}

/**
 * Tastatur: `+`/`=` reinzoomen, `-` raus, `0` zurück auf 100%.
 * Ctrl/Cmd optional. Nicht in Eingabefeldern.
 * @returns true wenn behandelt
 */
export function handlePresentZoomHotkey(
  e: KeyboardEvent,
  zoom: number,
  setZoom: (next: number) => void,
): boolean {
  const t = e.target as HTMLElement | null;
  if (t) {
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) {
      return false;
    }
  }
  const key = e.key;
  const zoomIn = key === '+' || key === '=' || (e.code === 'Equal' && (e.ctrlKey || e.metaKey));
  const zoomOut = key === '-' || key === '_' || (e.code === 'Minus' && (e.ctrlKey || e.metaKey));
  const zoomReset = key === '0' && !e.altKey;

  if (zoomIn) {
    e.preventDefault();
    e.stopPropagation();
    setZoom(presentZoomIn(zoom));
    return true;
  }
  if (zoomOut) {
    e.preventDefault();
    e.stopPropagation();
    setZoom(presentZoomOut(zoom));
    return true;
  }
  if (zoomReset && (e.ctrlKey || e.metaKey || key === '0')) {
    if (e.ctrlKey || e.metaKey || key === '0') {
      e.preventDefault();
      e.stopPropagation();
      setZoom(1);
      return true;
    }
  }
  return false;
}

/**
 * Wheel/Pinch auf einem Stage-Element: Trackpad-Pinch (ctrlKey) oder Ctrl+Mausrad.
 * Nutzt zoomRef, damit der Listener nicht bei jedem Zoom neu gebunden werden muss.
 */
export type PresentZoomOrigin = { clientX: number; clientY: number };
export type PresentPan = { x: number; y: number };

export function centerPresentPan(
  hostW: number,
  hostH: number,
  slideW: number,
  slideH: number,
  zoom: number,
): PresentPan {
  return {
    x: (hostW - slideW * zoom) / 2,
    y: (hostH - slideH * zoom) / 2,
  };
}

/** Zoom um einen Punkt in Host-Koordinaten, Pan so nachziehen, dass der Punkt liegen bleibt. */
export function panAfterPresentZoom(args: {
  pan: PresentPan;
  oldZoom: number;
  newZoom: number;
  originInHost: { x: number; y: number };
}): PresentPan {
  const oldZ = Math.max(0.001, args.oldZoom);
  const contentX = (args.originInHost.x - args.pan.x) / oldZ;
  const contentY = (args.originInHost.y - args.pan.y) / oldZ;
  return {
    x: args.originInHost.x - contentX * args.newZoom,
    y: args.originInHost.y - contentY * args.newZoom,
  };
}

export function clampPresentPan(
  pan: PresentPan,
  hostW: number,
  hostH: number,
  slideW: number,
  slideH: number,
  zoom: number,
): PresentPan {
  const w = slideW * zoom;
  const h = slideH * zoom;
  const margin = 80;
  const minX = Math.min(margin, hostW) - w;
  const maxX = hostW - Math.min(margin, hostW);
  const minY = Math.min(margin, hostH) - h;
  const maxY = hostH - Math.min(margin, hostH);
  return {
    x: Math.min(maxX, Math.max(minX, pan.x)),
    y: Math.min(maxY, Math.max(minY, pan.y)),
  };
}

export function attachPresentTrackpadZoom(
  el: HTMLElement | null,
  zoomRef: { current: number },
  setZoom: (next: number, origin?: PresentZoomOrigin) => void,
): () => void {
  if (!el) return () => undefined;

  const onWheel = (e: WheelEvent) => {
    // macOS-Trackpad-Pinch kommt als wheel + ctrlKey
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    const next = presentZoomFromWheelDelta(zoomRef.current, e.deltaY);
    if (Math.abs(next - zoomRef.current) < 0.001) return;
    setZoom(next, { clientX: e.clientX, clientY: e.clientY });
  };

  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}

function isStylusTouch(t: Touch): boolean {
  return (t as Touch & { touchType?: string }).touchType === 'stylus';
}

function fingerTouchList(touches: TouchList): Touch[] {
  return Array.from(touches).filter((t) => !isStylusTouch(t));
}

function touchDistance(touches: Touch[] | TouchList): number {
  const list = Array.isArray(touches) ? touches : fingerTouchList(touches);
  if (list.length < 2) return 0;
  const a = list[0];
  const b = list[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Zwei-Finger-Pinch auf dem iPad (und anderen Touch-Geräten).
 * Capture-Phase: greift auch, wenn die Zeichen-Canvas oben liegt.
 * `enabledRef`: z. B. aus während Zeichenmodus (Handauflage darf keinen Zoom starten).
 */
export type PresentPinchOptions = {
  /** z. B. beide Finger auf einem gewählten Foto — dann Foto-Größe statt Bühnen-Zoom. */
  skipIf?: (fingers: Touch[]) => boolean;
};

export function attachPresentTouchPinchZoom(
  el: HTMLElement | null,
  zoomRef: { current: number },
  setZoom: (next: number, origin?: PresentZoomOrigin) => void,
  enabledRef?: { current: boolean },
  options?: PresentPinchOptions,
): () => void {
  if (!el) return () => undefined;

  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinching = false;
  const skipIf = options?.skipIf;

  const isEnabled = () => enabledRef?.current !== false;

  const onTouchStart = (e: TouchEvent) => {
    if (!isEnabled()) {
      pinching = false;
      pinchStartDist = 0;
      return;
    }
    const fingers = fingerTouchList(e.touches);
    if (fingers.length === 2) {
      if (skipIf?.(fingers)) {
        pinching = false;
        pinchStartDist = 0;
        return;
      }
      pinchStartDist = touchDistance(fingers);
      pinchStartZoom = zoomRef.current;
      pinching = pinchStartDist > 8;
    } else if (fingers.length < 2) {
      pinching = false;
      pinchStartDist = 0;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isEnabled()) {
      pinching = false;
      return;
    }
    const fingers = fingerTouchList(e.touches);
    if (!pinching || fingers.length !== 2 || pinchStartDist < 8) return;
    e.preventDefault();
    const d = touchDistance(fingers);
    if (d < 1) return;
    const next = clampPresentZoomSmooth(pinchStartZoom * (d / pinchStartDist));
    if (Math.abs(next - zoomRef.current) < 0.001) return;
    setZoom(next, {
      clientX: (fingers[0].clientX + fingers[1].clientX) / 2,
      clientY: (fingers[0].clientY + fingers[1].clientY) / 2,
    });
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (fingerTouchList(e.touches).length < 2) {
      pinching = false;
      pinchStartDist = 0;
    }
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  el.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
  el.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });

  return () => {
    el.removeEventListener('touchstart', onTouchStart, true);
    el.removeEventListener('touchmove', onTouchMove, true);
    el.removeEventListener('touchend', onTouchEnd, true);
    el.removeEventListener('touchcancel', onTouchEnd, true);
  };
}
