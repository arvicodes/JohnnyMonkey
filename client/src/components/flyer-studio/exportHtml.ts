import { FLYER_PAGE_H, FLYER_PAGE_W } from './constants';
import type { FlyerDocument, FlyerElement, FlyerPage } from './types';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageBackgroundStyle(page: FlyerPage): string {
  if (page.backgroundGradient) return page.backgroundGradient;
  return page.background;
}

function elementStyle(el: FlyerElement): string {
  const parts = [
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.width}px`,
    `height:${el.height}px`,
    `z-index:${el.zIndex}`,
    `transform:rotate(${el.rotation}deg)`,
    `opacity:${el.opacity ?? 1}`,
  ];
  return parts.join(';');
}

function renderElement(el: FlyerElement): string {
  const base = `class="jm-el" style="position:absolute;${elementStyle(el)}"`;
  if (el.type === 'text') {
    const style = [
      `font-size:${el.fontSize ?? 18}px`,
      `font-family:${el.fontFamily ?? 'system-ui,sans-serif'}`,
      `font-weight:${el.fontWeight ?? 400}`,
      `font-style:${el.fontStyle ?? 'normal'}`,
      `color:${el.color ?? '#1c1c1c'}`,
      `text-align:${el.textAlign ?? 'left'}`,
      `line-height:${el.lineHeight ?? 1.4}`,
      `letter-spacing:${el.letterSpacing ?? 0}px`,
      'white-space:pre-wrap',
      'word-break:break-word',
    ].join(';');
    const text = escapeHtml(el.text ?? '').replace(/\n/g, '<br>');
    return `<div ${base}><div style="${style}">${text}</div></div>`;
  }
  if (el.type === 'rect') {
    const style = [
      `width:100%`,
      `height:100%`,
      `background:${el.fill ?? '#cccccc'}`,
      `border-radius:${el.borderRadius ?? 0}px`,
      el.stroke ? `border:${el.strokeWidth ?? 1}px solid ${el.stroke}` : 'border:none',
    ].join(';');
    return `<div ${base}><div style="${style}"></div></div>`;
  }
  if (el.type === 'circle') {
    const style = [
      `width:100%`,
      `height:100%`,
      `background:${el.fill ?? '#cccccc'}`,
      'border-radius:50%',
      el.stroke ? `border:${el.strokeWidth ?? 1}px solid ${el.stroke}` : 'border:none',
    ].join(';');
    return `<div ${base}><div style="${style}"></div></div>`;
  }
  if (el.type === 'image' && el.src) {
    return `<div ${base}><img src="${el.src.replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:${el.borderRadius ?? 0}px;display:block;" /></div>`;
  }
  if (el.type === 'line') {
    const style = [
      `width:100%`,
      `height:0`,
      `border-top:${el.strokeWidth ?? 3}px solid ${el.stroke ?? el.fill ?? '#1c1c1c'}`,
      'position:absolute',
      'top:50%',
    ].join(';');
    return `<div ${base}><div style="${style}"></div></div>`;
  }
  return '';
}

export function exportFlyerHtml(doc: FlyerDocument): string {
  const title = escapeHtml(doc.title || 'Flyer');
  const pagesHtml = doc.pages
    .map((page) => {
      const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
      const els = sorted.map(renderElement).join('\n');
      const bg = pageBackgroundStyle(page);
      return `<div class="page" style="background:${bg};">
${els}
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root { --page-w: 210mm; --page-h: 297mm; --faint: #e8e6e1; --ink: #1c1c1c; --white: #fff; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #e8e6e1; color: var(--ink); -webkit-font-smoothing: antialiased; }
    .toolbar { position: sticky; top: 0; z-index: 20; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 10px 16px; background: var(--white); border-bottom: 1px solid var(--faint); }
    .toolbar button { border: 1px solid var(--ink); background: var(--white); color: var(--ink); font-size: 0.8rem; font-weight: 500; padding: 7px 14px; border-radius: 4px; cursor: pointer; }
    .toolbar button.primary { background: var(--ink); color: var(--white); border-color: var(--ink); }
    .pages { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px 12px 40px; }
    .page { width: var(--page-w); min-height: var(--page-h); position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
    .jm-el { transform-origin: top left; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .pages { padding: 0; gap: 0; }
      .page { box-shadow: none; page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" class="primary" onclick="window.print()">Drucken / PDF</button>
    <span>Erstellt mit Johnny Flyer Studio</span>
  </div>
  <div class="pages">
${pagesHtml}
  </div>
</body>
</html>`;
}

export function documentPixelSize() {
  return { w: FLYER_PAGE_W, h: FLYER_PAGE_H };
}
