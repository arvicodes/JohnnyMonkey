/** Verhindert Editor-Blur/Sync beim Klick auf die Formatleiste (relatedTarget oft null). */
let interacting = false;

export function setFormatBarInteracting(value: boolean) {
  interacting = value;
}

export function isFormatBarInteracting(): boolean {
  return interacting;
}

/** Format-Popover/Menüs (Portal) zur Formatleiste zählen. */
export const PRESENTATION_FORMAT_UI_BLUR_SELECTOR =
  '[data-presentation-format-bar], [data-presentation-format-ui], [data-presentation-table-tools]';

export const PRESENTATION_FORMAT_UI_SELECTOR = PRESENTATION_FORMAT_UI_BLUR_SELECTOR;

export function isPresentationFormatUiTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest(PRESENTATION_FORMAT_UI_SELECTOR);
}

/** Dialoge/Modals der Präsentation (Formel, Link, …) — Tastatur nicht an Editor weiterleiten. */
export function isPresentationModalTypingActive(): boolean {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    if (active.closest('[data-pres-formula-dialog], [data-presentation-format-ui], .MuiDialog-root')) {
      return true;
    }
  }
  return Boolean(document.querySelector('[data-pres-formula-dialog][data-open="true"]'));
}
