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

function isMeaningfulOrphan(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return Boolean(node.textContent?.replace(/\u00a0/g, ' ').trim());
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as Element;
  if (el.tagName === 'BR') return false;
  if (LIST_TAGS.has(el.tagName)) return true;
  if (el.tagName === 'IMG') return true;
  const text = el.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
  if (text) return true;
  return Boolean(el.querySelector('img, ul, ol'));
}

function removeStrayBlocksInLists(root: ParentNode) {
  Array.from(root.querySelectorAll('ul, ol')).forEach((list) => {
    Array.from(list.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.textContent?.replace(/\u00a0/g, ' ').trim()) node.remove();
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      if (el.tagName === 'LI' || LIST_TAGS.has(el.tagName)) return;
      if (!isMeaningfulOrphan(node)) el.remove();
    });
  });
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
      if (!isMeaningfulOrphan(node)) return;
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
    if (liHasContent(li)) return;
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
    if (!el.hasAttribute('data-pres-list-level')) {
      el.style.removeProperty('list-style-type');
    }
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

function liHasContent(li: Element): boolean {
  const text = li.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
  if (text) return true;
  return Boolean(li.querySelector(':scope > ul, :scope > ol, img'));
}

function placeCaretInListItem(li: HTMLLIElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(li);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function getListItemFromSelection(editor: HTMLElement): HTMLLIElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
  if (!(node instanceof Element)) return null;
  const li = node.closest('li');
  if (!li || !editor.contains(li)) return null;
  return li;
}

/** ul > li ohne eigenen Text, nur Unterliste → eine Ebene hochziehen (Doppel-Bullets). */
function flattenRedundantListNesting(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('li')).forEach((li) => {
      const sub = li.querySelector(':scope > ul, :scope > ol');
      if (!sub) return;

      let ownText = '';
      Array.from(li.childNodes).forEach((node) => {
        if (node === sub) return;
        if (node.nodeType === Node.TEXT_NODE) {
          ownText += node.textContent ?? '';
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as Element;
        if (!LIST_TAGS.has(el.tagName)) ownText += el.textContent ?? '';
      });
      if (ownText.replace(/\u00a0/g, ' ').trim()) return;

      const parent = li.parentElement;
      if (!parent) return;
      while (sub.firstChild) parent.insertBefore(sub.firstChild, li);
      sub.remove();
      li.remove();
      changed = true;
    });
  }
}

const MAX_LIST_LEVEL = 8;
const LIST_INDENT_PX = 28;
const LIST_LEVEL_MARKERS = ['disc', 'circle', 'square', 'disc', 'circle', 'square', 'disc', 'circle'];

export function getListItemLevel(li: HTMLLIElement): number {
  const raw = parseInt(li.getAttribute('data-pres-list-level') || '', 10);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  let depth = 0;
  let parent = li.parentElement;
  while (parent) {
    if (isList(parent) && parent.parentElement?.closest('li')) depth += 1;
    parent = parent.parentElement;
  }
  return depth;
}

export function applyListItemLevel(li: HTMLLIElement, level: number) {
  const safe = Math.max(0, Math.min(MAX_LIST_LEVEL, level));
  if (safe <= 0) {
    li.removeAttribute('data-pres-list-level');
    li.style.removeProperty('margin-left');
    li.style.removeProperty('list-style-type');
    return;
  }
  li.setAttribute('data-pres-list-level', String(safe));
  li.style.marginLeft = `${safe * LIST_INDENT_PX}px`;
  li.style.listStyleType = LIST_LEVEL_MARKERS[safe - 1] || 'disc';
}

function outermostListForItem(li: HTMLLIElement, editor: HTMLElement): HTMLUListElement | HTMLOListElement | null {
  let outer: HTMLUListElement | HTMLOListElement | null = null;
  let current: Element | null = li.parentElement;
  while (current && editor.contains(current)) {
    if (isList(current)) outer = current as HTMLUListElement | HTMLOListElement;
    current = current.parentElement;
  }
  return outer;
}

/** Verschachtelte li in die Hauptliste heben (Outline-Level bleibt erhalten). */
function hoistListItemToOuterList(li: HTMLLIElement, editor: HTMLElement) {
  const outer = outermostListForItem(li, editor);
  const parentList = li.parentElement;
  if (!outer || !parentList || !isList(parentList) || parentList === outer) return;

  const parentLi = parentList.closest('li');
  const ref = parentLi?.nextSibling ?? null;
  outer.insertBefore(li, ref);

  if (!parentList.querySelector('li')) parentList.remove();
}

/** Einrücken per Outline-Level — funktioniert auch beim ersten Punkt. */
export function indentListItemInEditor(editor: HTMLElement): boolean {
  const li = getListItemFromSelection(editor);
  if (!li) return false;

  const level = getListItemLevel(li);
  if (level >= MAX_LIST_LEVEL) {
    placeCaretInListItem(li);
    return true;
  }

  applyListItemLevel(li, level + 1);
  hoistListItemToOuterList(li, editor);
  normalizeListsInPlace(editor);
  placeCaretInListItem(li);
  return true;
}

/** Ausrücken per Outline-Level oder aus verschachtelter Liste heben. */
export function outdentListItemInEditor(editor: HTMLElement): boolean {
  const li = getListItemFromSelection(editor);
  if (!li) return false;

  const level = getListItemLevel(li);
  if (level > 0) {
    applyListItemLevel(li, level - 1);
    placeCaretInListItem(li);
    return true;
  }

  const parentList = li.parentElement;
  if (!parentList || !isList(parentList)) return false;
  const parentLi = parentList.closest('li');
  if (!parentLi) return false;
  const outerList = parentLi.parentElement;
  if (!outerList || !isList(outerList)) return false;

  const parentLevel = getListItemLevel(parentLi);
  outerList.insertBefore(li, parentLi.nextSibling);
  applyListItemLevel(li, parentLevel);

  if (!parentList.querySelector('li')) parentList.remove();
  normalizeListsInPlace(editor);
  placeCaretInListItem(li);
  return true;
}

function syncLegacyNestedListLevels(root: ParentNode) {
  Array.from(root.querySelectorAll('li')).forEach((li) => {
    if (li.hasAttribute('data-pres-list-level')) return;
    const depth = getListItemLevel(li);
    if (depth > 0) applyListItemLevel(li, depth);
  });
}

export function normalizeListsInPlace(root: ParentNode) {
  if (typeof document === 'undefined') return;
  unwrapIllegalSpanBlocks(root);
  removeStrayBlocksInLists(root);
  fixDirectNestedLists(root);
  hoistOrphanListItems(root);
  flattenRedundantListNesting(root);
  syncLegacyNestedListLevels(root);
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
