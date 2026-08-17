import { useEffect } from 'react';
import { handlePresentationListShortcutKey } from '../lib/presentationRichText';

function findContentEditableFromSelection(): HTMLElement | null {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  if (!node) return null;
  const start =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  if (!start) return null;
  const el = start.closest('[contenteditable]') as HTMLElement | null;
  if (!el) return null;
  if (el.getAttribute('contenteditable') === 'false') return null;
  if (!el.isContentEditable) return null;
  return el;
}

/**
 * Appweit: `*` / `-` / `1.` + Leertaste in jedem contentEditable → Liste.
 * Capture-Phase + Selection (zuverlässiger als event.target).
 */
export default function GlobalMarkdownListShortcut() {
  useEffect(() => {
    const resolveEditor = (fallbackTarget: EventTarget | null): HTMLElement | null => {
      let el = findContentEditableFromSelection();
      if (el) return el;
      if (!(fallbackTarget instanceof Node)) return null;
      let walk: HTMLElement | null =
        fallbackTarget.nodeType === Node.ELEMENT_NODE
          ? (fallbackTarget as HTMLElement)
          : fallbackTarget.parentElement;
      while (walk) {
        if (walk.isContentEditable) return walk;
        walk = walk.parentElement;
      }
      return null;
    };

    const tryConvert = (e: Event, editor: HTMLElement | null) => {
      if (!editor) return;
      if (!handlePresentationListShortcutKey(e as KeyboardEvent, editor)) return;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      tryConvert(e, resolveEditor(e.target));
    };

    // beforeinput: manche Browser/IME melden Space zuverlässiger hier
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType !== 'insertText' || e.data !== ' ') return;
      if (e.defaultPrevented) return;
      const editor = resolveEditor(e.target);
      if (!editor) return;
      if (!handlePresentationListShortcutKey(
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          preventDefault: () => e.preventDefault(),
          stopPropagation: () => e.stopPropagation(),
        },
        editor,
      )) {
        return;
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('beforeinput', onBeforeInput, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('beforeinput', onBeforeInput, true);
    };
  }, []);

  return null;
}
