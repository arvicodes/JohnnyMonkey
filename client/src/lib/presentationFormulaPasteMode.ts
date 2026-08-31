/** Formel-Einfügemodus in Folien-Text (Word/LaTeX/HTML/PowerPoint). */

export const FORMULA_PASTE_MODE_KEY = 'jm-presentation-formula-paste-v1';
export const FORMULA_PASTE_MODE_EVENT = 'johnny:formula-paste-mode';

export function isPresentationFormulaPasteMode(): boolean {
  try {
    return localStorage.getItem(FORMULA_PASTE_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPresentationFormulaPasteMode(on: boolean): void {
  try {
    localStorage.setItem(FORMULA_PASTE_MODE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(FORMULA_PASTE_MODE_EVENT, { detail: { on } }));
}
