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
export function attachPresentTrackpadZoom(
  el: HTMLElement | null,
  zoomRef: { current: number },
  setZoom: (next: number) => void,
): () => void {
  if (!el) return () => undefined;

  const onWheel = (e: WheelEvent) => {
    // macOS-Trackpad-Pinch kommt als wheel + ctrlKey
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    const next = presentZoomFromWheelDelta(zoomRef.current, e.deltaY);
    if (Math.abs(next - zoomRef.current) < 0.001) return;
    setZoom(next);
  };

  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}

function touchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Zwei-Finger-Pinch auf dem iPad (und anderen Touch-Geräten).
 * Capture-Phase: greift auch, wenn die Zeichen-Canvas oben liegt.
 */
export function attachPresentTouchPinchZoom(
  el: HTMLElement | null,
  zoomRef: { current: number },
  setZoom: (next: number) => void,
): () => void {
  if (!el) return () => undefined;

  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinching = false;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDist = touchDistance(e.touches);
      pinchStartZoom = zoomRef.current;
      pinching = pinchStartDist > 8;
    } else if (e.touches.length < 2) {
      pinching = false;
      pinchStartDist = 0;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!pinching || e.touches.length !== 2 || pinchStartDist < 8) return;
    e.preventDefault();
    const d = touchDistance(e.touches);
    if (d < 1) return;
    const next = clampPresentZoomSmooth(pinchStartZoom * (d / pinchStartDist));
    if (Math.abs(next - zoomRef.current) < 0.001) return;
    setZoom(next);
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
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
