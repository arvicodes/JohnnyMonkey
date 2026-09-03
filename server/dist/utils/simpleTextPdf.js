"use strict";
/** Kleines PDF mit Helvetica (WinAnsi) — für Notizen, Tickets und Folientext. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTextPdf = buildTextPdf;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const TITLE_SIZE = 16;
const BODY_SIZE = 11;
const LINE = 15;
const WINANSI = {
    Ä: 0xc4,
    Ö: 0xd6,
    Ü: 0xdc,
    ä: 0xe4,
    ö: 0xf6,
    ü: 0xfc,
    ß: 0xdf,
    '€': 0x80,
    '„': 0x84,
    '“': 0x93,
    '”': 0x94,
    '–': 0x96,
    '—': 0x97,
    '…': 0x85,
    '’': 0x92,
    '‘': 0x91,
};
function toWinAnsi(text) {
    let out = '';
    for (const ch of String(text || '')) {
        const code = ch.charCodeAt(0);
        if (ch === '\\' || ch === '(' || ch === ')') {
            out += `\\${ch}`;
            continue;
        }
        if (code === 10 || code === 13) {
            out += ' ';
            continue;
        }
        if (code >= 32 && code <= 126) {
            out += ch;
            continue;
        }
        const mapped = WINANSI[ch];
        if (mapped != null) {
            out += `\\${mapped.toString(8).padStart(3, '0')}`;
            continue;
        }
        out += '?';
    }
    return out;
}
function wrapLine(text, maxChars) {
    const raw = String(text || '').replace(/\r/g, '');
    const lines = [];
    for (const paragraph of raw.split('\n')) {
        const words = paragraph.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            lines.push('');
            continue;
        }
        let cur = '';
        for (const word of words) {
            const next = cur ? `${cur} ${word}` : word;
            if (next.length > maxChars && cur) {
                lines.push(cur);
                if (word.length > maxChars) {
                    for (let i = 0; i < word.length; i += maxChars) {
                        lines.push(word.slice(i, i + maxChars));
                    }
                    cur = '';
                }
                else {
                    cur = word;
                }
            }
            else if (next.length > maxChars) {
                for (let i = 0; i < next.length; i += maxChars) {
                    lines.push(next.slice(i, i + maxChars));
                }
                cur = '';
            }
            else {
                cur = next;
            }
        }
        if (cur)
            lines.push(cur);
    }
    return lines.length ? lines : [''];
}
function buildTextPdf(docTitle, blocks) {
    const maxChars = 88;
    const pages = [];
    let current = [];
    const maxY = PAGE_H - MARGIN;
    let y = PAGE_H - MARGIN;
    const pushLine = (line) => {
        if (y - LINE < MARGIN) {
            pages.push(current);
            current = [];
            y = PAGE_H - MARGIN;
        }
        current.push(line);
        y -= LINE;
    };
    pushLine({ text: docTitle || 'JohnnyMonkey', size: TITLE_SIZE, bold: true });
    pushLine({ text: '', size: BODY_SIZE, bold: false });
    for (const block of blocks) {
        const title = String(block.title || '').trim();
        const body = String(block.body || '').trim();
        if (title) {
            pushLine({ text: '', size: BODY_SIZE, bold: false });
            for (const line of wrapLine(title, maxChars)) {
                pushLine({ text: line, size: 13, bold: true });
            }
        }
        if (body) {
            for (const line of wrapLine(body, maxChars)) {
                pushLine({ text: line, size: BODY_SIZE, bold: false });
            }
        }
        if (y < maxY * 0.18) {
            pages.push(current);
            current = [];
            y = PAGE_H - MARGIN;
        }
    }
    if (current.length)
        pages.push(current);
    if (pages.length === 0)
        pages.push([{ text: docTitle, size: TITLE_SIZE, bold: true }]);
    const objects = [];
    const add = (body) => {
        objects.push(body);
        return objects.length;
    };
    const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds = [];
    for (const page of pages) {
        let stream = 'BT\n';
        let first = true;
        for (const line of page) {
            const font = line.bold ? 'F2' : 'F1';
            const escaped = toWinAnsi(line.text);
            if (first) {
                stream += `/${font} ${line.size} Tf\n${MARGIN} ${PAGE_H - MARGIN} Td\n(${escaped}) Tj\n`;
                first = false;
            }
            else {
                stream += `/${font} ${line.size} Tf\n0 -${LINE} Td\n(${escaped}) Tj\n`;
            }
        }
        stream += 'ET\n';
        const streamId = add(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`);
        const pageId = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
            `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
            `/Contents ${streamId} 0 R >>`);
        pageIds.push(pageId);
    }
    const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    // Parent nachziehen
    objects[pagesId - 1] = objects[pagesId - 1];
    for (let i = 0; i < pageIds.length; i += 1) {
        objects[pageIds[i] - 1] = objects[pageIds[i] - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
    }
    const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 0; i < objects.length; i += 1) {
        offsets.push(Buffer.byteLength(pdf, 'latin1'));
        pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefAt = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
}
//# sourceMappingURL=simpleTextPdf.js.map