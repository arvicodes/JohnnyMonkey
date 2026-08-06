/** Schriftarten für Präsentations-Editoren (Formatleiste). Aptos + Consolas zuerst. */

export type PresentationFontOption = {
  label: string;
  value: string;
};

export const PRESENTATION_FONT_FAMILIES: PresentationFontOption[] = [
  { label: 'Aptos', value: '"Aptos", "Segoe UI", Calibri, Arial, sans-serif' },
  { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
  { label: 'Segoe UI', value: '"Segoe UI", system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
];

/** Standard-Schrift für Tippen & Einfügen in Folien. */
export const PRESENTATION_DEFAULT_FONT_FAMILY = PRESENTATION_FONT_FAMILIES[0].value;

export function presentationFontLabel(value: string): string {
  if (!value) return 'Standard';
  return PRESENTATION_FONT_FAMILIES.find((f) => f.value === value)?.label ?? 'Schrift';
}

export function getEditorSelectionFontFamily(editor: HTMLElement | null): string {
  if (!editor) return '';
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return '';

  let node: Node | null = sel.anchorNode;
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      const stored = node.getAttribute('data-pres-font');
      if (stored) return stored;
    }
    node = node.parentNode;
  }
  return '';
}
