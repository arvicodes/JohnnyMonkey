import {
  decorateEntryTicketDisplayHtml,
  entryTicketHasImage,
  entryTicketLooksLikeHtml,
  sanitizeEntryTicketHtml,
  unwrapEntryTicketCardLayout,
} from './entryTicketRichText';

export type EntryTicketFlashcardPrintTask = {
  category?: string;
  prompt: string;
  solution: string;
};

const CARDS_PER_PAGE = 8; // 2 Spalten × 4 Zeilen auf A4
const COLS = 2;

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML für eine einzelne Karte „versiegeln“:
 * - Tags schließen / balancieren (verhindert, dass die nächste Karte verschluckt wird)
 * - Layout-Wrapper & Floats entfernen (kein Überlaufen in Nachbarkarten)
 */
function sealHtmlForPrintCard(value: string): string {
  const raw = value || '';
  if (!raw.trim()) return '<span class="empty">—</span>';

  if (!entryTicketLooksLikeHtml(raw) && !/<img\b/i.test(raw)) {
    return decorateEntryTicketDisplayHtml(raw) || '<span class="empty">—</span>';
  }

  const sanitized = unwrapEntryTicketCardLayout(sanitizeEntryTicketHtml(raw));
  if (typeof document === 'undefined') {
    return decorateEntryTicketDisplayHtml(raw) || '<span class="empty">—</span>';
  }

  const holder = document.createElement('div');
  holder.innerHTML = sanitized;

  // Layout-Wrapper auflösen
  holder.querySelectorAll('[data-et-layout]').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  // Floats/absolute Breiten entschärfen — sonst rutscht Inhalt in die Nachbarkarte
  holder.querySelectorAll('img').forEach((img) => {
    img.style.float = 'none';
    img.style.display = 'block';
    img.style.width = 'auto';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '34mm';
    img.style.height = 'auto';
    img.style.margin = '2mm auto';
    img.removeAttribute('data-et-place');
  });

  holder.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    if (el.style.float) el.style.float = 'none';
    if (el.style.position === 'absolute' || el.style.position === 'fixed') {
      el.style.position = 'static';
    }
  });

  const out = holder.innerHTML.trim();
  if (!out) return '<span class="empty">—</span>';
  return out;
}

function fieldToHtml(value: string): string {
  const raw = value || '';
  if (!raw.trim()) return '<span class="empty">—</span>';
  // Zuerst Operatoren/Umbrüche, bei Bildern zusätzlich Druck-Siegel
  const decorated = decorateEntryTicketDisplayHtml(raw);
  if (!decorated) return '<span class="empty">—</span>';
  if (!entryTicketHasImage(raw)) return decorated;
  return sealHtmlForPrintCard(decorated);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Rückseite: Spalten spiegeln für Duplex an langer Kante (Buch-Wende). */
function mirrorColumnsForDuplex<T>(cards: T[]): T[] {
  const rows: T[][] = [];
  for (let i = 0; i < cards.length; i += COLS) {
    rows.push(cards.slice(i, i + COLS).reverse());
  }
  return rows.flat();
}

function padToPage<T>(cards: T[], filler: T): T[] {
  if (cards.length === 0) return cards;
  const next = [...cards];
  while (next.length % CARDS_PER_PAGE !== 0) next.push(filler);
  return next;
}

function renderCard(opts: {
  index: number;
  category: string;
  bodyHtml: string;
  side: 'front' | 'back';
  blank?: boolean;
}): string {
  const sideLabel = opts.side === 'front' ? 'Frage' : 'Lösung';
  const cat = opts.category ? escapeHtml(opts.category) : 'Entry Ticket';
  // Isolierter Body: zusätzlicher Wrapper fängt kaputtes Markup ab
  return `<article class="card ${opts.side}${opts.blank ? ' blank' : ''}">
  <header>
    <span class="num">${opts.blank ? '' : opts.index}</span>
    <span class="side">${opts.blank ? '' : sideLabel}</span>
    <span class="cat">${opts.blank ? '' : cat}</span>
  </header>
  <div class="body"><div class="body-inner">${opts.blank ? '' : opts.bodyHtml}</div></div>
</article>`;
}

function renderPage(cardsHtml: string, label: string): string {
  return `<section class="page" data-label="${escapeHtml(label)}">
  <div class="sheet">${cardsHtml}</div>
</section>`;
}

export function buildEntryTicketFlashcardPrintHtml(
  tasks: EntryTicketFlashcardPrintTask[],
  options?: { title?: string },
): string {
  const title = escapeHtml(options?.title || 'Entry Ticket – Karteikarten');
  const real = tasks.filter((t) => (t.prompt || '').trim() || (t.solution || '').trim());
  const blank: EntryTicketFlashcardPrintTask = { category: '', prompt: '', solution: '' };
  const padded = padToPage(real, blank);
  const frontPages = chunk(padded, CARDS_PER_PAGE);
  const backPages = frontPages.map((pageCards) => mirrorColumnsForDuplex(pageCards));

  const pagesHtml: string[] = [];
  frontPages.forEach((pageCards, pageIdx) => {
    const fronts = pageCards
      .map((task, i) => {
        const globalIndex = pageIdx * CARDS_PER_PAGE + i + 1;
        const isBlank = task === blank || (!(task.prompt || '').trim() && !(task.solution || '').trim());
        return renderCard({
          index: Math.min(globalIndex, real.length),
          category: task.category || '',
          bodyHtml: fieldToHtml(task.prompt),
          side: 'front',
          blank: isBlank || globalIndex > real.length,
        });
      })
      .join('\n');
    pagesHtml.push(renderPage(fronts, `Fragen ${pageIdx + 1}`));

    const backs = backPages[pageIdx]
      .map((task, i) => {
        // Index aus der gespiegelten Position zurückrechnen
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const originalCol = COLS - 1 - col;
        const originalIndexInPage = row * COLS + originalCol;
        const globalIndex = pageIdx * CARDS_PER_PAGE + originalIndexInPage + 1;
        const isBlank = task === blank || (!(task.prompt || '').trim() && !(task.solution || '').trim());
        return renderCard({
          index: Math.min(globalIndex, real.length),
          category: task.category || '',
          bodyHtml: fieldToHtml(task.solution),
          side: 'back',
          blank: isBlank || globalIndex > real.length,
        });
      })
      .join('\n');
    pagesHtml.push(renderPage(backs, `Lösungen ${pageIdx + 1}`));
  });

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" />
  <style>
    :root {
      --ink: #263238;
      --muted: #78909c;
      --line: #90a4ae;
      --front: #e3f2fd;
      --back: #e8f5e9;
      --page-w: 210mm;
      --page-h: 297mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: var(--ink);
      background: #eceff1;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 20;
      display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center;
      padding: 12px 16px; background: #fff; border-bottom: 1px solid #cfd8dc;
    }
    .toolbar button {
      border: 1px solid #455a64; background: #fff; color: #263238;
      font-size: 0.85rem; font-weight: 600; padding: 8px 14px; border-radius: 6px; cursor: pointer;
    }
    .toolbar button.primary { background: #455a64; color: #fff; }
    .toolbar .hint { font-size: 0.78rem; color: #607d8b; max-width: 42rem; text-align: center; line-height: 1.35; }
    .pages { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 18px 12px 36px; }
    .page {
      width: var(--page-w); height: var(--page-h);
      background: #fff; box-shadow: 0 8px 28px rgba(0,0,0,0.08);
      overflow: hidden; page-break-after: always; break-after: page;
    }
    .sheet {
      width: 100%; height: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(4, minmax(0, 1fr));
    }
    .card {
      border: 1px dashed var(--line);
      padding: 6mm 5mm 5mm;
      display: flex; flex-direction: column; gap: 3mm;
      min-width: 0; min-height: 0;
      overflow: hidden;
      position: relative;
      contain: layout paint;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card.front { background: linear-gradient(180deg, var(--front) 0%, #fff 42%); }
    .card.back { background: linear-gradient(180deg, var(--back) 0%, #fff 42%); }
    .card.blank { background: #fff; border-color: transparent; }
    .card header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 6px;
      font-size: 9pt;
      font-weight: 700;
      color: var(--muted);
      flex-shrink: 0;
    }
    .card .num {
      min-width: 1.4em;
      font-variant-numeric: tabular-nums;
      color: var(--ink);
      font-size: 11pt;
    }
    .card .side {
      justify-self: center;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 8pt;
    }
    .card.front .side { color: #1565c0; }
    .card.back .side { color: #2e7d32; }
    .card .cat {
      max-width: 46%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: right;
      font-weight: 600;
    }
    .card .body {
      flex: 1; min-width: 0; min-height: 0;
      overflow: hidden;
      font-size: 11.5pt; line-height: 1.35; font-weight: 500;
      position: relative;
    }
    .card .body-inner {
      max-height: 100%;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .card.back .body { font-weight: 700; color: #1b5e20; }
    .card .body .empty { color: #b0bec5; font-weight: 600; }
    .card .body .op { font-weight: 800; }
    .card .body .et-op { font-weight: 800; color: #ef6c00; }
    .card .body .et-q { font-weight: 800; color: #c62828; }
    .card .body .et-task-op { font-weight: 800; }
    .card .body .q { font-weight: 800; color: #c62828; }
    .card .body p, .card .body div { margin: 0; max-width: 100%; }
    .card .body * { max-width: 100% !important; float: none !important; }
    .card .body .et-tex,
    .card .body .katex,
    .card .body .katex * { max-width: none !important; float: none !important; }
    .card .body .katex { font-size: 1.05em; }
    .card .body img {
      max-width: 100% !important; max-height: 34mm !important;
      width: auto !important; height: auto !important;
      object-fit: contain; display: block !important;
      margin: 2mm auto !important; border-radius: 2mm;
      float: none !important;
    }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .pages { padding: 0; gap: 0; }
      .page {
        box-shadow: none;
        width: 210mm;
        height: 297mm;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
      }
      .sheet { width: 210mm; height: 297mm; }
      .card { border-color: #9e9e9e; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" class="primary" onclick="window.print()">Drucken / PDF</button>
    <button type="button" onclick="window.parent.postMessage({ type: 'jm-entry-ticket-flashcard-print-close' }, '*')">Schließen</button>
    <p class="hint">
      ${real.length} Karte${real.length === 1 ? '' : 'n'} · Doppelseitig drucken und an der <strong>langen Kante</strong> wenden
      (Fragen vorne, Lösungen hinten). Anschließend entlang der gestrichelten Linien ausschneiden.
    </p>
  </div>
  <div class="pages">
${pagesHtml.join('\n')}
  </div>
</body>
</html>`;
}

const OVERLAY_ID = 'jm-entry-ticket-flashcard-print-overlay';

function removeFlashcardPrintOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();
  window.removeEventListener('message', onFlashcardPrintMessage);
  window.removeEventListener('keydown', onFlashcardPrintKeydown);
}

function onFlashcardPrintMessage(event: MessageEvent) {
  if (event?.data?.type === 'jm-entry-ticket-flashcard-print-close') {
    removeFlashcardPrintOverlay();
  }
}

function onFlashcardPrintKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') removeFlashcardPrintOverlay();
}

/** Öffnet die Druckvorschau im gleichen Fenster (kein Popup → kein Blocker). */
export function openEntryTicketFlashcardPrint(
  tasks: EntryTicketFlashcardPrintTask[],
  options?: { title?: string },
): boolean {
  if (!tasks.length) return false;
  const html = buildEntryTicketFlashcardPrintHtml(tasks, options);

  removeFlashcardPrintOverlay();
  window.addEventListener('message', onFlashcardPrintMessage);
  window.addEventListener('keydown', onFlashcardPrintKeydown);

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute(
    'style',
    [
      'position:fixed',
      'inset:0',
      'z-index:20000',
      'background:#eceff1',
      'display:flex',
      'flex-direction:column',
    ].join(';'),
  );

  const frame = document.createElement('iframe');
  frame.title = options?.title || 'Entry Ticket – Karteikarten';
  frame.setAttribute(
    'style',
    'flex:1;width:100%;height:100%;border:0;background:#eceff1;',
  );
  // srcdoc vermeidet Popup-Blocker und same-origin für print/postMessage
  frame.srcdoc = html;

  overlay.appendChild(frame);
  document.body.appendChild(overlay);
  return true;
}
