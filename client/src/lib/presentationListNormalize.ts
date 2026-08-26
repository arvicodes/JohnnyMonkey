/** Bereinigt und repariert Listen-HTML (Paste, Einzug, Unterpunkte). */

import {
  isPresentationOlStyleId,
  PRES_OL_ATTR,
  PRESENTATION_MAX_LIST_LEVEL,
  type PresentationOlStyleId,
} from './presentationListStyles';

const LIST_TAGS = new Set(['UL', 'OL']);
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
]);

function isList(el: Element | null | undefined): el is HTMLUListElement | HTMLOListElement {
  return !!el && LIST_TAGS.has(el.tagName);
}

function listTagName(list: HTMLUListElement | HTMLOListElement): 'ul' | 'ol' {
  return list.tagName === 'OL' ? 'ol' : 'ul';
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

/** ul/ol direkt in ul/ol → an den vorherigen Punkt hängen (Einrückung), sonst in li packen. */
function fixDirectNestedLists(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('ul, ol')).forEach((list) => {
      const parent = list.parentElement;
      if (!isList(parent)) return;
      const prev = list.previousElementSibling;
      if (prev && prev.tagName === 'LI') {
        prev.appendChild(list);
        changed = true;
        return;
      }
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
    el.style.removeProperty('list-style-type');
    el.style.removeProperty('list-style');
    if (el.tagName === 'LI') {
      el.style.removeProperty('margin-left');
      el.removeAttribute('data-pres-list-level');
    }
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

/** ul > li ohne eigenen Text, nur Unterliste → hochziehen, aber nicht wenn davor ein Punkt steht (dann ist es Einrückung). */
function flattenRedundantListNesting(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('li')).forEach((li) => {
      const sub = li.querySelector(':scope > ul, :scope > ol');
      if (!sub) return;
      if (li.previousElementSibling) return;

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

const MAX_LIST_LEVEL = PRESENTATION_MAX_LIST_LEVEL;

export function getListNestingDepth(li: HTMLLIElement): number {
  let depth = 0;
  let parent = li.parentElement;
  while (parent) {
    if (isList(parent) && parent.parentElement?.closest('li')) depth += 1;
    parent = parent.parentElement;
  }
  return depth;
}

/** @deprecated Nur noch für Lesen alter gespeicherter Inhalte. */
export function getListItemLevel(li: HTMLLIElement): number {
  return getListNestingDepth(li);
}

function getOrCreateSubList(parentLi: HTMLLIElement, list: HTMLUListElement | HTMLOListElement) {
  const tag = listTagName(list);
  let subList = parentLi.querySelector(`:scope > ${tag}`) as HTMLUListElement | HTMLOListElement | null;
  if (!subList) {
    subList = document.createElement(tag) as HTMLUListElement;
    parentLi.appendChild(subList);
  }
  return subList;
}

/** Altes flaches Outline-Modell (data-pres-list-level / margin-left) → echte Unterlisten. */
function convertFlatOutlineInList(list: HTMLUListElement | HTMLOListElement) {
  const items = Array.from(list.children).filter((n): n is HTMLLIElement => n.tagName === 'LI');
  if (!items.length) return;
  const levels = items.map(outlineLevelOfLi);
  if (!levels.some((level) => level > 0) && !items.some((li) => li.hasAttribute('data-pres-list-level'))) {
    return;
  }

  const lastAtLevel: (HTMLLIElement | null)[] = [];

  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    const level = levels[i];
    li.removeAttribute('data-pres-list-level');
    li.style.removeProperty('margin-left');
    li.style.removeProperty('padding-left');

    if (level === 0) {
      lastAtLevel.length = 0;
      lastAtLevel[0] = li;
      continue;
    }

    const parentLi = lastAtLevel[level - 1] ?? lastAtLevel[lastAtLevel.length - 1] ?? null;
    if (!parentLi || parentLi === li) {
      lastAtLevel[0] = li;
      lastAtLevel.length = 1;
      continue;
    }

    const subList = getOrCreateSubList(parentLi, list);
    subList.appendChild(li);
    lastAtLevel[level] = li;
    lastAtLevel.length = level + 1;
  }
}

function convertFlatOutlineLists(root: ParentNode) {
  Array.from(root.querySelectorAll('ul, ol')).forEach((list) => {
    if (isList(list)) convertFlatOutlineInList(list);
  });
}

/** Einrücken: echter Unterpunkt in verschachtelter ul/ol unter dem vorherigen Punkt. */
export function indentListItemInEditor(editor: HTMLElement): boolean {
  const li = getListItemFromSelection(editor);
  if (!li) return false;

  if (getListNestingDepth(li) >= MAX_LIST_LEVEL - 1) {
    placeCaretInListItem(li);
    return true;
  }

  const parentList = li.parentElement;
  if (!parentList || !isList(parentList)) return false;

  const prevLi = li.previousElementSibling as HTMLLIElement | null;
  if (!prevLi || prevLi.tagName !== 'LI') {
    placeCaretInListItem(li);
    return false;
  }

  const subList = getOrCreateSubList(prevLi, parentList);
  subList.appendChild(li);
  normalizeListsInPlace(editor);
  placeCaretInListItem(li);
  return true;
}

/** Ausrücken: Punkt eine Ebene nach oben in die übergeordnete Liste. */
export function outdentListItemInEditor(editor: HTMLElement): boolean {
  const li = getListItemFromSelection(editor);
  if (!li) return false;

  const parentList = li.parentElement;
  if (!parentList || !isList(parentList)) return false;

  const parentLi = parentList.closest('li');
  if (!parentLi) return false;

  const grandList = parentLi.parentElement;
  if (!grandList || !isList(grandList)) return false;

  grandList.insertBefore(li, parentLi.nextSibling);
  if (!parentList.querySelector('li')) parentList.remove();

  normalizeListsInPlace(editor);
  placeCaretInListItem(li);
  return true;
}

export function getCurrentPresentationOlStyle(editor: HTMLElement | null): PresentationOlStyleId | null {
  if (!editor) return null;
  const li = getListItemFromSelection(editor);
  const list = li?.parentElement;
  if (!list || list.tagName !== 'OL' || !editor.contains(list)) return null;
  const raw = list.getAttribute(PRES_OL_ATTR);
  if (isPresentationOlStyleId(raw)) return raw;
  return 'decimal';
}

/** Nummerierte Liste anlegen oder Nummerierungsart der aktuellen Liste setzen. */
export function applyOrderedListStyle(editor: HTMLElement, styleId: PresentationOlStyleId): boolean {
  if (!editor) return false;
  const existingLi = getListItemFromSelection(editor);
  const existingList = existingLi?.parentElement;
  if (!existingList || existingList.tagName !== 'OL') {
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* ignore */
    }
    document.execCommand('insertOrderedList', false);
    normalizeListsInPlace(editor);
  }
  const li = getListItemFromSelection(editor);
  const list = li?.parentElement;
  if (!list || list.tagName !== 'OL') return false;
  list.setAttribute(PRES_OL_ATTR, styleId);
  normalizeListsInPlace(editor);
  if (li) placeCaretInListItem(li);
  return true;
}

export type PastedListLine = {
  ordered: boolean;
  rest: string;
  level: number;
  olStyle?: PresentationOlStyleId;
};

const UNORDERED_MARKER_RE = /^\s*([*•●○◦▪▫·∙‣■□–—\-])\s+(.*)$/;
const UNORDERED_MARKER_ONLY_RE = /^\s*([*•●○◦▪▫·∙‣■□–—\-])\s*$/;
const ORDERED_MARKER_RE = /^\s*(\d+)[.)]\s+(.*)$/;
const ORDERED_MARKER_ONLY_RE = /^\s*(\d+)[.)]\s*$/;
const PAREN_ALPHA_RE = /^\s*\(([a-zA-Z])\)\s+(.*)$/;
const PAREN_ALPHA_ONLY_RE = /^\s*\(([a-zA-Z])\)\s*$/;
const ALPHA_PAREN_RE = /^\s*([a-zA-Z])\)\s+(.*)$/;
const ALPHA_PAREN_ONLY_RE = /^\s*([a-zA-Z])\)\s*$/;
const ALPHA_DOT_RE = /^\s*([a-zA-Z])\.\s+(.*)$/;
const ALPHA_DOT_ONLY_RE = /^\s*([a-zA-Z])\.\s*$/;

function indentLevelFromLeadingWhitespace(line: string): number {
  const expanded = line.replace(/\t/g, '    ');
  const spaces = expanded.match(/^( *)/)?.[1].length ?? 0;
  return Math.min(MAX_LIST_LEVEL - 1, Math.floor(spaces / 2));
}

function alphaOlStyle(letter: string, kind: 'dot' | 'paren' | 'paren-wrap'): PresentationOlStyleId {
  if (kind === 'paren-wrap') return 'paren-alpha';
  if (kind === 'paren') return 'alpha-paren';
  return letter === letter.toUpperCase() ? 'upper-alpha' : 'lower-alpha';
}

/** Plain-Text- oder Absatzzeile → Listen-Marker, sonst null. */
export function parsePastedListLine(line: string): PastedListLine | null {
  const t = line.replace(/\u00a0/g, ' ');
  const level = indentLevelFromLeadingWhitespace(t);
  const bullet = t.match(UNORDERED_MARKER_RE);
  if (bullet) return { ordered: false, rest: bullet[2], level };
  const parenAlpha = t.match(PAREN_ALPHA_RE);
  if (parenAlpha) {
    return { ordered: true, rest: parenAlpha[2], level, olStyle: 'paren-alpha' };
  }
  const alphaParen = t.match(ALPHA_PAREN_RE);
  if (alphaParen) {
    return { ordered: true, rest: alphaParen[2], level, olStyle: 'alpha-paren' };
  }
  const ordered = t.match(ORDERED_MARKER_RE);
  if (ordered) return { ordered: true, rest: ordered[2], level, olStyle: 'decimal' };
  const alphaDot = t.match(ALPHA_DOT_RE);
  if (alphaDot) {
    return {
      ordered: true,
      rest: alphaDot[2],
      level,
      olStyle: alphaOlStyle(alphaDot[1], 'dot'),
    };
  }
  if (UNORDERED_MARKER_ONLY_RE.test(t)) return { ordered: false, rest: '', level };
  if (PAREN_ALPHA_ONLY_RE.test(t)) return { ordered: true, rest: '', level, olStyle: 'paren-alpha' };
  if (ALPHA_PAREN_ONLY_RE.test(t)) return { ordered: true, rest: '', level, olStyle: 'alpha-paren' };
  if (ORDERED_MARKER_ONLY_RE.test(t)) return { ordered: true, rest: '', level, olStyle: 'decimal' };
  const alphaOnly = t.match(ALPHA_DOT_ONLY_RE);
  if (alphaOnly) {
    return { ordered: true, rest: '', level, olStyle: alphaOlStyle(alphaOnly[1], 'dot') };
  }
  return null;
}

export function olStyleFromMarker(raw: string): PresentationOlStyleId | null {
  const t = raw.replace(/\u00a0/g, ' ').trim();
  if (!t) return null;
  if (/^\(\d+\)$/.test(t) || /^\d+[.)]$/.test(t)) return 'decimal';
  if (/^\([a-zA-Z]\)$/.test(t)) return 'paren-alpha';
  if (/^[a-zA-Z]\)$/.test(t)) return 'alpha-paren';
  if (/^[a-z]\.$/.test(t)) return 'lower-alpha';
  if (/^[A-Z]\.$/.test(t)) return 'upper-alpha';
  if (/^[ivxlcdm]+\.$/i.test(t) && t.length > 2) return 'lower-roman';
  return null;
}

function parseMarginToLevel(style: string): number | null {
  const m = style.match(/(?:margin-left|padding-left)\s*:\s*([\d.]+)\s*(pt|px|cm|mm|em)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] || 'px').toLowerCase();
  let px = n;
  if (unit === 'pt') px = n * (96 / 72);
  else if (unit === 'cm') px = n * 37.8;
  else if (unit === 'mm') px = n * 3.78;
  else if (unit === 'em') px = n * 16;
  if (px < 12) return null;
  // Tab: 28px; Word oft 36pt. round(px/36) hält beides als mindestens Ebene 1.
  return Math.min(MAX_LIST_LEVEL - 1, Math.max(1, Math.round(px / 36)));
}

function outlineLevelOfLi(li: HTMLLIElement): number {
  const attr = li.getAttribute('data-pres-list-level');
  if (attr != null && attr !== '') {
    const n = parseInt(attr, 10);
    if (Number.isFinite(n)) return Math.max(0, Math.min(MAX_LIST_LEVEL - 1, n));
  }
  const style = `${li.getAttribute('style') || ''} ${li.style?.cssText || ''}`;
  return parseMarginToLevel(style) ?? 0;
}

function looksLikeListMarkerText(raw: string): boolean {
  const s = raw.replace(/\u00a0/g, ' ').trim();
  if (!s) return false;
  if (/^[•●○◦▪▫·∙‣■□–—*]$/.test(s)) return true;
  if (/^\d+[.)]$/.test(s) || /^\(\d+\)$/.test(s)) return true;
  if (/^\([a-zA-Z]\)$/.test(s) || /^[a-zA-Z][.)]$/.test(s)) return true;
  return false;
}

function isMsoIgnoreMarker(el: HTMLElement): boolean {
  const st = `${el.getAttribute('style') || ''} ${el.getAttribute('class') || ''}`;
  const text = (el.textContent || '').replace(/\u00a0/g, ' ').trim();
  if (/mso-list:\s*Ignore/i.test(st) && text.length <= 12) return true;
  if (!el.children.length && looksLikeListMarkerText(text)) return true;
  return false;
}

function extractMarkerText(el: HTMLElement): string {
  const ignore = Array.from(el.querySelectorAll('span')).find((span) =>
    isMsoIgnoreMarker(span as HTMLElement),
  );
  const raw = (ignore?.textContent || el.textContent || '').replace(/\u00a0/g, ' ');
  return raw.trim();
}

function isListCandidateBlock(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (tag !== 'P' && tag !== 'DIV') return false;
  if (tag === 'DIV') {
    const hasBlockChild = Array.from(el.children).some((child) =>
      BLOCK_TAGS.has(child.tagName),
    );
    if (hasBlockChild) return false;
  }
  if (el.querySelector('ul, ol, table')) return false;
  return true;
}

function pastedListInfo(
  el: HTMLElement,
): { ordered: boolean; level: number; olStyle?: PresentationOlStyleId } | null {
  if (!isListCandidateBlock(el)) return null;
  const cls = el.getAttribute('class') || '';
  const style = `${el.getAttribute('style') || ''} ${(el as HTMLElement).style?.cssText || ''}`;
  const isMso = /MsoList/i.test(cls) || /mso-list\s*:/i.test(style);

  let level = 0;
  const lm = style.match(/level\s*(\d+)/i) || cls.match(/level(\d+)/i);
  if (lm) level = Math.max(0, parseInt(lm[1], 10) - 1);
  else {
    const fromMargin = parseMarginToLevel(style);
    if (fromMargin != null) level = fromMargin;
  }
  level = Math.min(MAX_LIST_LEVEL - 1, level);

  if (isMso) {
    const hasIgnoreMarker = Array.from(el.querySelectorAll('span')).some((span) =>
      isMsoIgnoreMarker(span as HTMLElement),
    );
    const parsed = parsePastedListLine(el.textContent || '');
    // Word rückt Formeln oft als MsoListParagraph ein — ohne Marker keine Liste.
    if (!hasIgnoreMarker && !parsed) return null;
    const marker = extractMarkerText(el);
    const olStyle = parsed?.olStyle || olStyleFromMarker(marker) || undefined;
    const ordered = Boolean(parsed?.ordered || olStyle);
    return { ordered, level: parsed?.level ?? level, olStyle };
  }

  const parsed = parsePastedListLine(el.textContent || '');
  if (!parsed) return null;
  return { ordered: parsed.ordered, level: parsed.level || level, olStyle: parsed.olStyle };
}

function stripListMarkerHtml(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('span').forEach((span) => {
    if (isMsoIgnoreMarker(span as HTMLElement)) span.remove();
  });
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode();
  if (first?.textContent) {
    first.textContent = first.textContent
      .replace(/^[\s\u00a0]*/, '')
      .replace(/^[*•●○◦▪▫·∙‣■□–—\-]\s+/, '')
      .replace(/^\([a-zA-Z0-9]+\)\s+/, '')
      .replace(/^[a-zA-Z]\)\s+/, '')
      .replace(/^\(?\d+[.)]\s+/, '')
      .replace(/^[a-zA-Z]\.\s+/, '');
  }
  return clone.innerHTML.trim();
}

export type NestedListItem = {
  ordered: boolean;
  level: number;
  html: string;
  olStyle?: PresentationOlStyleId;
};

function setOlStyle(list: HTMLElement, style?: PresentationOlStyleId) {
  if (list.tagName !== 'OL') return;
  if (style && style !== 'decimal') list.setAttribute(PRES_OL_ATTR, style);
  else list.removeAttribute(PRES_OL_ATTR);
}

export function buildNestedListFromItems(items: NestedListItem[]): HTMLElement {
  const minLevel = Math.min(...items.map((it) => it.level));
  const normalized = items.map((it) => ({
    ...it,
    level: Math.max(0, it.level - minLevel),
  }));
  const root = document.createElement(normalized[0].ordered ? 'ol' : 'ul');
  const stack: { list: HTMLElement; ordered: boolean; level: number }[] = [
    { list: root, ordered: normalized[0].ordered, level: 0 },
  ];
  setOlStyle(root, normalized[0].olStyle);
  let lastLi: HTMLLIElement | null = null;

  for (const item of normalized) {
    while (stack.length > 1 && stack[stack.length - 1].level > item.level) {
      stack.pop();
    }

    let top = stack[stack.length - 1];
    if (item.level > top.level) {
      if (!lastLi) {
        lastLi = document.createElement('li');
        lastLi.innerHTML = '<br>';
        top.list.appendChild(lastLi);
      }
      const sub = document.createElement(item.ordered ? 'ol' : 'ul');
      setOlStyle(sub, item.olStyle);
      lastLi.appendChild(sub);
      stack.push({ list: sub, ordered: item.ordered, level: item.level });
      top = stack[stack.length - 1];
    } else if (top.ordered !== item.ordered) {
      const sibling = document.createElement(item.ordered ? 'ol' : 'ul');
      setOlStyle(sibling, item.olStyle);
      const host = top.list.parentElement;
      if (host && host.tagName === 'LI') host.appendChild(sibling);
      else top.list.after(sibling);
      stack[stack.length - 1] = {
        list: sibling,
        ordered: item.ordered,
        level: top.level,
      };
      top = stack[stack.length - 1];
    }

    const li = document.createElement('li');
    li.innerHTML = item.html.trim() ? item.html : '<br>';
    top.list.appendChild(li);
    lastLi = li;
  }
  return root;
}

function nodeDepth(el: Element): number {
  let d = 0;
  let parent = el.parentElement;
  while (parent) {
    d += 1;
    parent = parent.parentElement;
  }
  return d;
}

function convertSiblingListBlocks(container: HTMLElement): boolean {
  const children = Array.from(container.children) as HTMLElement[];
  for (let i = 0; i < children.length; i++) {
    const info = pastedListInfo(children[i]);
    if (!info) continue;

    const items: NestedListItem[] = [];
    let j = i;
    while (j < children.length) {
      const next = pastedListInfo(children[j]);
      if (!next) break;
      items.push({
        ordered: next.ordered,
        level: next.level,
        html: stripListMarkerHtml(children[j]),
        olStyle: next.olStyle,
      });
      j += 1;
    }
    if (!items.length) continue;

    const list = buildNestedListFromItems(items);
    children[i].replaceWith(list);
    for (let k = i + 1; k < j; k++) children[k].remove();
    return true;
  }
  return false;
}

/**
 * Word (`MsoListParagraph` / `mso-list`) und Textmarker (`•`, `1.`) → echte ul/ol.
 * Vor dem Entfernen der Word-Klassen aufrufen.
 */
export function convertPastedListParagraphs(root: HTMLElement) {
  if (typeof document === 'undefined') return;
  const containers = [
    root,
    ...Array.from(root.querySelectorAll('div, td, th, blockquote')),
  ].filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.tagName === 'UL' || el.tagName === 'OL') return false;
    return true;
  });
  containers.sort((a, b) => nodeDepth(b) - nodeDepth(a));
  containers.forEach((container) => {
    let guard = 0;
    while (guard++ < 80 && convertSiblingListBlocks(container)) {
      /* weitere Geschwistergruppen */
    }
  });
}

export function normalizeListsInPlace(root: ParentNode) {
  if (typeof document === 'undefined') return;
  unwrapIllegalSpanBlocks(root);
  removeStrayBlocksInLists(root);
  fixDirectNestedLists(root);
  hoistOrphanListItems(root);
  convertFlatOutlineLists(root);
  flattenRedundantListNesting(root);
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
