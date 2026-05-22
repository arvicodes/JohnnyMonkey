import { STORY_SNIPPET_CLASS } from './storyHighlightSnippets';

/** Story-Texte standardmäßig im Blocksatz (leer bleibt leer). */
export function normalizeStoryBodyHtml(html: string): string {
  const raw = html?.trim() ?? '';
  if (!raw || raw === '<br>' || raw === '<br/>') return '';

  const div = document.createElement('div');
  div.innerHTML = raw;

  div.querySelectorAll(`.${STORY_SNIPPET_CLASS}`).forEach((el) => {
    let style = el.getAttribute('style') ?? '';
    style = style.replace(/text-align\s*:\s*justify\s*;?/gi, '').trim();
    const next = style ? `${style}; text-align: left` : 'text-align: left';
    el.setAttribute('style', next);
  });

  const blocks = div.querySelectorAll('p, div, li');
  if (blocks.length === 0) {
    const p = document.createElement('p');
    p.setAttribute('style', 'text-align: justify');
    p.innerHTML = raw;
    div.innerHTML = '';
    div.appendChild(p);
    return div.innerHTML;
  }

  blocks.forEach((el) => {
    if (el.classList.contains('story-snippet')) return;
    if (el.tagName === 'DIV' && el.querySelector('p')) return;
    let style = el.getAttribute('style') ?? '';
    style = style
      .replace(/text-align\s*:\s*(?:left|center|right)\s*;?/gi, '')
      .replace(/;\s*;/g, ';')
      .trim()
      .replace(/^;+|;+$/g, '');
    const next = style ? `${style}; text-align: justify` : 'text-align: justify';
    el.setAttribute('style', next);
    el.setAttribute('align', 'justify');
  });

  return div.innerHTML;
}
