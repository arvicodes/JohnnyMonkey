/** Verhindert Editor-Blur/Sync beim Klick auf die Formatleiste (relatedTarget oft null). */
let interacting = false;

export function setFormatBarInteracting(value: boolean) {
  interacting = value;
}

export function isFormatBarInteracting(): boolean {
  return interacting;
}

/** Format-Popover/Menüs (Portal) zur Formatleiste zählen. */
export const PRESENTATION_FORMAT_UI_SELECTOR =
  '[data-presentation-format-bar], [data-presentation-format-ui], [data-presentation-table-tools]';

export function isPresentationFormatUiTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.closest(PRESENTATION_FORMAT_UI_SELECTOR);
}
