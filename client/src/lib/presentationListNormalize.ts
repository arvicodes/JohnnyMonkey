/** Bereinigt und repariert Listen-HTML (Paste, Einzug, Unterpunkte). */

const LIST_TAGS = new Set(['UL', 'OL']);
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
]);

function isList(el: Element | null | undefined): el is HTMLUListElement | HTMLOListElement {
  return !!el && LIST_TAGS.has(el.tagName);
}

function unwrapElement(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function unwrapIllegalSpanBlocks(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('span, font')).forEach((wrap) => {
      const hasBlockChild = Array.from(wrap.children).some((child) =>
        BLOCK_TAGS.has(child.tagName)
      );
      if (!hasBlockChild) return;
      unwrapElement(wrap);
      changed = true;
    });
  }
}

/** ul/ol direkt in ul/ol → innere Liste in li einbetten. */
function fixDirectNestedLists(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('ul, ol')).forEach((list) => {
      const parent = list.parentElement;
      if (!isList(parent)) return;
      const li = document.createElement('li');
      parent.insertBefore(li, list);
      li.appendChild(list);
      changed = true;
    });
  }
}

function hoistOrphanListItems(root: ParentNode) {
  Array.from(root.querySelectorAll('ul, ol')).forEach((list) => {
    const orphanNodes: Node[] = [];
    Array.from(list.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.replace(/\u00a0/g, ' ').trim()) orphanNodes.push(node);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.tagName === 'LI') return;
      if (LIST_TAGS.has(el.tagName)) return;
      orphanNodes.push(node);
    });
    if (!orphanNodes.length) return;
    const li = document.createElement('li');
    list.insertBefore(li, orphanNodes[0]);
    orphanNodes.forEach((node) => li.appendChild(node));
  });
}

function removeEmptyListItems(root: ParentNode) {
  Array.from(root.querySelectorAll('li')).forEach((li) => {
    const text = li.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
    if (text) return;
    if (li.querySelector('ul, ol, img')) return;
    li.remove();
  });
}

function stripListPasteClasses(root: ParentNode) {
  root.querySelectorAll('.ul1, .ol1, .li1, .s1, .Apple-converted-space').forEach((el) => {
    el.removeAttribute('class');
  });
}

function normalizeListElementStyles(root: ParentNode) {
  root.querySelectorAll('ul, ol, li').forEach((node) => {
    const el = node as HTMLElement;
    el.style.removeProperty('list-style-type');
    el.style.removeProperty('list-style');
    if (el.tagName === 'UL' || el.tagName === 'OL') {
      el.style.removeProperty('margin');
      el.style.removeProperty('margin-left');
      el.style.removeProperty('padding');
    }
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
}

function removeEmptyLists(root: ParentNode) {
  Array.from(root.querySelectorAll('ul, ol')).forEach((list) => {
    if (!list.querySelector('li') && !list.textContent?.replace(/\u00a0/g, ' ').trim()) {
      list.remove();
    }
  });
}

export function normalizeListsInPlace(root: ParentNode) {
  if (typeof document === 'undefined') return;
  unwrapIllegalSpanBlocks(root);
  fixDirectNestedLists(root);
  hoistOrphanListItems(root);
  removeEmptyListItems(root);
  removeEmptyLists(root);
  stripListPasteClasses(root);
  normalizeListElementStyles(root);
}

export function normalizePresentationLists(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  normalizeListsInPlace(doc.body);
  return doc.body.innerHTML;
}
