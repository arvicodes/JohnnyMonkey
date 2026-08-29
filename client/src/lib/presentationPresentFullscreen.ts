/** iPad/iPhone Safari: natives Fullscreen ist unzuverlässig — visuelles Viewport nutzen. */

export function isIosSafariLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPod|iPad/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function webkitFsElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return doc.webkitFullscreenElement ?? null;
}

export function isPresentNativeFullscreen(el: HTMLElement | null): boolean {
  if (!el) return false;
  return document.fullscreenElement === el || webkitFsElement() === el;
}

export function exitPresentFullscreen(): void {
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  if (document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => undefined);
    return;
  }
  if (webkitFsElement()) doc.webkitExitFullscreen?.();
}

export function isAnyNativeFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenElement || webkitFsElement());
}

let lastFullscreenChangeAt = 0;
let lastLeftPresentToEditorAt = 0;
let ignoreNextFullscreenExit = false;

/** Browser feuert beim Verlassen von Vollbild oft ein synthetisches Escape. */
export function markPresentFullscreenChange(): void {
  lastFullscreenChangeAt = Date.now();
}

export function isRecentPresentFullscreenChange(withinMs = 450): boolean {
  return Date.now() - lastFullscreenChangeAt < withinMs;
}

/** Vollbild-Knopf: FS aus, aber in Play bleiben. */
export function markIgnoreNextFullscreenExit(): void {
  ignoreNextFullscreenExit = true;
}

export function consumeIgnoreNextFullscreenExit(): boolean {
  if (!ignoreNextFullscreenExit) return false;
  ignoreNextFullscreenExit = false;
  return true;
}

/** Nach Play→Editor: synthetisches Escape nicht als „zurück zur Stunde“ werten. */
export function markLeftPresentToEditor(): void {
  lastLeftPresentToEditorAt = Date.now();
  markPresentFullscreenChange();
}

export function isRecentLeavePresentToEditor(withinMs = 800): boolean {
  return Date.now() - lastLeftPresentToEditorAt < withinMs;
}

/**
 * Natives Fullscreen — muss in derselben User-Geste (Klick/Play) laufen.
 * Ohne Geste lehnt der Browser ab. Bereits aktiver FS wird nicht gewechselt.
 * iPad/iPhone: API ist unzuverlässig und reißt Stiftstriche ab — nur visualViewport.
 */
export function requestPresentFullscreen(el?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  if (isIosSafariLike()) return;
  if (isAnyNativeFullscreen()) return;
  const target = el ?? document.documentElement;
  const node = target as HTMLElement & {
    webkitRequestFullscreen?: (opts?: FullscreenOptions) => Promise<void> | void;
  };
  const opts: FullscreenOptions = { navigationUI: 'hide' };
  try {
    if (typeof target.requestFullscreen === 'function') {
      const result = target.requestFullscreen(opts);
      if (result && typeof result.catch === 'function') {
        void result.catch(() => undefined);
      }
      return;
    }
    const webkit = node.webkitRequestFullscreen?.bind(target);
    if (!webkit) return;
    const result = webkit(opts);
    if (result && typeof (result as Promise<void>).catch === 'function') {
      void (result as Promise<void>).catch(() => undefined);
    }
  } catch {
    /* Safari: NotAllowedError / iOS ohne Support */
  }
}

type VvBox = { left: number; top: number; width: number; height: number };

function readRawViewportBox(): VvBox {
  if (isAnyNativeFullscreen()) {
    const fs = (document.fullscreenElement || webkitFsElement()) as HTMLElement | null;
    const width = Math.max(1, fs?.clientWidth || window.innerWidth);
    const height = Math.max(1, fs?.clientHeight || window.innerHeight);
    return { left: 0, top: 0, width, height };
  }
  const vv = window.visualViewport;
  const innerW = Math.max(1, window.innerWidth);
  const innerH = Math.max(1, window.innerHeight);
  if (!vv) {
    return { left: 0, top: 0, width: innerW, height: innerH };
  }
  const vvW = Math.max(1, Math.round(vv.width));
  const vvH = Math.max(1, Math.round(vv.height));
  if (isIosSafariLike()) {
    return {
      left: Math.round(vv.offsetLeft),
      top: Math.round(vv.offsetTop),
      width: Math.min(innerW, vvW),
      height: Math.min(innerH, vvH),
    };
  }
  return {
    left: Math.round(vv.offsetLeft),
    top: Math.round(vv.offsetTop),
    width: vvW,
    height: vvH,
  };
}

function writeViewportVars(box: VvBox, el?: HTMLElement | null): void {
  const root = document.documentElement;
  const apply = (node: HTMLElement) => {
    node.style.setProperty('--present-vv-left', `${box.left}px`);
    node.style.setProperty('--present-vv-top', `${box.top}px`);
    node.style.setProperty('--present-vv-width', `${box.width}px`);
    node.style.setProperty('--present-vv-height', `${box.height}px`);
  };
  apply(root);
  if (el) apply(el);
}

/** Safari-Leiste / Bounce: Folie nicht mitziehen. Split View und Drehen bleiben drin. */
function createViewportStabilizer(onCommit: (box: VvBox) => void) {
  let stable: VvBox | null = null;
  let shrinkTimer = 0;
  const ios = isIosSafariLike();

  const commit = (box: VvBox) => {
    stable = box;
    onCommit(box);
  };

  const followOffset = (raw: VvBox) => {
    if (!stable) return;
    if (
      Math.abs(raw.left - stable.left) > 2 ||
      Math.abs(raw.top - stable.top) > 2
    ) {
      commit({ ...stable, left: raw.left, top: raw.top });
    }
  };

  return {
    push(raw: VvBox) {
      if (viewportFrozen) return;
      if (!stable) {
        commit(raw);
        return;
      }
      const flipped = raw.width > raw.height !== stable.width > stable.height;
      if (flipped) {
        if (shrinkTimer) window.clearTimeout(shrinkTimer);
        shrinkTimer = 0;
        commit(raw);
        return;
      }
      const dw = raw.width - stable.width;
      const dh = raw.height - stable.height;
      if (ios && Math.abs(dw) < 80 && Math.abs(dh) < 90) {
        if (shrinkTimer) {
          window.clearTimeout(shrinkTimer);
          shrinkTimer = 0;
        }
        followOffset(raw);
        return;
      }
      if (dh >= -16 && dw >= -16) {
        if (shrinkTimer) {
          window.clearTimeout(shrinkTimer);
          shrinkTimer = 0;
        }
        if (dh > 10 || dw > 10) {
          commit(raw);
          return;
        }
        followOffset(raw);
        return;
      }
      if (shrinkTimer) window.clearTimeout(shrinkTimer);
      shrinkTimer = window.setTimeout(() => {
        shrinkTimer = 0;
        if (viewportFrozen) return;
        commit(raw);
      }, 320);
    },
    dispose() {
      if (shrinkTimer) window.clearTimeout(shrinkTimer);
    },
  };
}

let viewportFrozen = false;

/** Entry Ticket / Overlay: Viewport nicht mehr nachziehen (Safari-Leiste). */
export function freezePresentViewport(frozen: boolean): void {
  viewportFrozen = frozen;
  if (!frozen || typeof document === 'undefined') return;
  const vv = window.visualViewport;
  writeViewportVars({
    left: 0,
    top: 0,
    width: Math.max(1, Math.round(vv?.width || window.innerWidth)),
    height: Math.max(1, Math.round(vv?.height || window.innerHeight)),
  });
  const body = document.body;
  body.style.top = '0px';
}

export function isPresentViewportFrozen(): boolean {
  return viewportFrozen;
}

const IMMERSIVE_CLASS = 'present-immersive';

/** html/body nicht mitziehen — sonst Safari-Leisten und Bounce. */
export function lockPresentDocumentScroll(): () => void {
  const html = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    htmlOverscroll: html.style.overscrollBehavior,
    bodyOverscroll: body.style.overscrollBehavior,
    bodyPosition: body.style.position,
    bodyWidth: body.style.width,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyTop: body.style.top,
  };
  html.classList.add(IMMERSIVE_CLASS);
  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  window.scrollTo(0, 0);

  return () => {
    html.classList.remove(IMMERSIVE_CLASS);
    html.style.overflow = prev.htmlOverflow;
    html.style.overscrollBehavior = prev.htmlOverscroll;
    body.style.overflow = prev.bodyOverflow;
    body.style.overscrollBehavior = prev.bodyOverscroll;
    body.style.position = prev.bodyPosition;
    body.style.width = prev.bodyWidth;
    body.style.left = prev.bodyLeft;
    body.style.right = prev.bodyRight;
    body.style.top = prev.bodyTop;
    window.scrollTo(scrollX, scrollY);
  };
}

function isPresentScrollTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        '[data-present-scroll], .MuiDialog-root, .MuiModal-root, textarea, input, [contenteditable="true"]',
      ),
    )
  );
}

export function attachPresentViewportFill(
  el: HTMLElement | null,
  onChange?: () => void,
): () => void {
  let raf = 0;
  const stabilizer = createViewportStabilizer((box) => {
    writeViewportVars(box, el);
    onChange?.();
  });

  const applyRaw = () => {
    if (viewportFrozen) return;
    if (window.scrollY !== 0 || window.scrollX !== 0) {
      window.scrollTo(0, 0);
    }
    stabilizer.push(readRawViewportBox());
  };
  const schedule = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      applyRaw();
    });
  };

  const orientationRetries = [0, 80, 200, 450, 800];
  const orientationTimers: number[] = [];
  const onOrientation = () => {
    orientationTimers.splice(0).forEach((id) => window.clearTimeout(id));
    orientationRetries.forEach((ms) => {
      orientationTimers.push(window.setTimeout(applyRaw, ms));
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && isPresentScrollTarget(e.target)) return;
    // Canvas/Stift: preventDefault hier bricht Pointer-Events (Fullscreen + Zeichnen).
    if (e.target instanceof Element && e.target.closest('canvas, [data-pres-stage]')) return;
    e.preventDefault();
  };
  const onGesture = (e: Event) => {
    e.preventDefault();
  };
  const onPageShow = () => schedule();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') schedule();
  };

  applyRaw();
  const vv = window.visualViewport;
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', onOrientation);
  window.addEventListener('pageshow', onPageShow);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('fullscreenchange', schedule);
  document.addEventListener('webkitfullscreenchange' as 'fullscreenchange', schedule);
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  document.addEventListener('gesturestart', onGesture, { passive: false } as AddEventListenerOptions);
  document.addEventListener('gesturechange', onGesture, { passive: false } as AddEventListenerOptions);
  document.addEventListener('gestureend', onGesture, { passive: false } as AddEventListenerOptions);
  vv?.addEventListener('resize', schedule);
  vv?.addEventListener('scroll', schedule);
  const unlock = lockPresentDocumentScroll();
  applyRaw();

  return () => {
    if (raf) window.cancelAnimationFrame(raf);
    orientationTimers.forEach((id) => window.clearTimeout(id));
    stabilizer.dispose();
    window.removeEventListener('resize', schedule);
    window.removeEventListener('orientationchange', onOrientation);
    window.removeEventListener('pageshow', onPageShow);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('fullscreenchange', schedule);
    document.removeEventListener('webkitfullscreenchange' as 'fullscreenchange', schedule);
    document.removeEventListener('touchmove', onTouchMove, true);
    document.removeEventListener('gesturestart', onGesture);
    document.removeEventListener('gesturechange', onGesture);
    document.removeEventListener('gestureend', onGesture);
    vv?.removeEventListener('resize', schedule);
    vv?.removeEventListener('scroll', schedule);
    unlock();
  };
}
