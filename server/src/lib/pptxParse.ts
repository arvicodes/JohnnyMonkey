import AdmZip from 'adm-zip';
import path from 'path';

export type ParsedPptxBox =
  | {
      kind: 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      html: string;
      fillColor?: string | null;
      strokeColor?: string | null;
      fontSizePt?: number | null;
      bold?: boolean;
      color?: string | null;
    }
  | {
      kind: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      name: string;
      mime: string;
      base64: string;
    }
  | {
      kind: 'shape';
      x: number;
      y: number;
      w: number;
      h: number;
      fillColor?: string | null;
      strokeColor?: string | null;
      shapeKind: 'rect' | 'ellipse' | 'line' | 'arrow';
    };

export type ParsedPptxSlide = {
  index: number;
  title: string;
  notes: string;
  boxes: ParsedPptxBox[];
  backgroundColor?: string | null;
  /** Legacy-Felder für ältere Clients */
  bodyLines: string[];
  images: Array<{ name: string; mime: string; base64: string }>;
};

export type ParsedPptx = {
  fileName: string;
  slideCount: number;
  slideWidthEmu: number;
  slideHeightEmu: number;
  slides: ParsedPptxSlide[];
};

type RectEmu = { x: number; y: number; w: number; h: number };

type GroupXfrm = {
  off: { x: number; y: number };
  ext: { cx: number; cy: number };
  chOff: { x: number; y: number };
  chExt: { cx: number; cy: number };
};

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

const DEFAULT_SLIDE_CX = 12192000;
const DEFAULT_SLIDE_CY = 6858000;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function emuToPct(rect: RectEmu, slideCx: number, slideCy: number): { x: number; y: number; w: number; h: number } {
  return {
    x: clampPct((rect.x / slideCx) * 100),
    y: clampPct((rect.y / slideCy) * 100),
    w: clampPct((rect.w / slideCx) * 100),
    h: clampPct((rect.h / slideCy) * 100),
  };
}

function parseAttrNumber(tag: string, name: string): number | null {
  const m = tag.match(new RegExp(`\\b${name}="(-?\\d+)"`, 'i'));
  return m ? Number(m[1]) : null;
}

function parseXfrmBlock(xml: string): RectEmu | null {
  // Nur das echte a:xfrm — nicht a:extLst/a:ext (Office speichert dort uris ohne cx/cy).
  const xfrm = xml.match(/<a:xfrm\b[^>]*>[\s\S]*?<\/a:xfrm>/i)?.[0] || xml;
  const off = xfrm.match(/<a:off\b[^>]*\/?>/i)?.[0];
  const ext = xfrm.match(/<a:ext\b[^>]*\/?>/i)?.[0];
  if (!off || !ext) return null;
  const x = parseAttrNumber(off, 'x');
  const y = parseAttrNumber(off, 'y');
  const w = parseAttrNumber(ext, 'cx');
  const h = parseAttrNumber(ext, 'cy');
  if (x == null || y == null || w == null || h == null) return null;
  return { x, y, w, h };
}

function parseGroupXfrm(grpSpPrXml: string): GroupXfrm | null {
  const offTag = grpSpPrXml.match(/<a:off\b[^>]*\/?>/i)?.[0];
  const extTag = grpSpPrXml.match(/<a:ext\b[^>]*\/?>/i)?.[0];
  const chOffTag = grpSpPrXml.match(/<a:chOff\b[^>]*\/?>/i)?.[0];
  const chExtTag = grpSpPrXml.match(/<a:chExt\b[^>]*\/?>/i)?.[0];
  if (!offTag || !extTag) return null;
  const ox = parseAttrNumber(offTag, 'x');
  const oy = parseAttrNumber(offTag, 'y');
  const ecx = parseAttrNumber(extTag, 'cx');
  const ecy = parseAttrNumber(extTag, 'cy');
  if (ox == null || oy == null || ecx == null || ecy == null) return null;
  return {
    off: { x: ox, y: oy },
    ext: { cx: ecx, cy: ecy },
    chOff: {
      x: chOffTag ? parseAttrNumber(chOffTag, 'x') ?? 0 : 0,
      y: chOffTag ? parseAttrNumber(chOffTag, 'y') ?? 0 : 0,
    },
    chExt: {
      cx: chExtTag ? parseAttrNumber(chExtTag, 'cx') ?? ecx : ecx,
      cy: chExtTag ? parseAttrNumber(chExtTag, 'cy') ?? ecy : ecy,
    },
  };
}

function applyGroupTransform(local: RectEmu, group: GroupXfrm | null): RectEmu {
  if (!group) return local;
  const sx = group.chExt.cx ? group.ext.cx / group.chExt.cx : 1;
  const sy = group.chExt.cy ? group.ext.cy / group.chExt.cy : 1;
  return {
    x: group.off.x + (local.x - group.chOff.x) * sx,
    y: group.off.y + (local.y - group.chOff.y) * sy,
    w: local.w * sx,
    h: local.h * sy,
  };
}

type ThemeColors = Record<string, string>;

const FALLBACK_THEME: ThemeColors = {
  dk1: '#000000',
  dk2: '#1F4E79',
  lt1: '#FFFFFF',
  lt2: '#F2F2F2',
  accent1: '#4472C4',
  accent2: '#ED7D31',
  accent3: '#A5A5A5',
  accent4: '#FFC000',
  accent5: '#5B9BD5',
  accent6: '#70AD47',
  hlink: '#0563C1',
  folHlink: '#954F72',
  tx1: '#000000',
  tx2: '#44546A',
  bg1: '#FFFFFF',
  bg2: '#E7E6E6',
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '').match(/^([0-9A-Fa-f]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clampByte(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** OOXML tint/shade/lumMod/lumOff grob anwenden */
function applyColorTransforms(hex: string, transformXml: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  let { r, g, b } = rgb;
  const tint = transformXml.match(/<a:tint[^>]*val="(\d+)"/i);
  const shade = transformXml.match(/<a:shade[^>]*val="(\d+)"/i);
  const lumMod = transformXml.match(/<a:lumMod[^>]*val="(\d+)"/i);
  const lumOff = transformXml.match(/<a:lumOff[^>]*val="(-?\d+)"/i);
  if (tint) {
    const t = Number(tint[1]) / 100000;
    r = r + (255 - r) * t;
    g = g + (255 - g) * t;
    b = b + (255 - b) * t;
  }
  if (shade) {
    const s = Number(shade[1]) / 100000;
    r *= s;
    g *= s;
    b *= s;
  }
  if (lumMod) {
    const m = Number(lumMod[1]) / 100000;
    r *= m;
    g *= m;
    b *= m;
  }
  if (lumOff) {
    const o = Number(lumOff[1]) / 100000;
    r += 255 * o;
    g += 255 * o;
    b += 255 * o;
  }
  return rgbToHex(r, g, b);
}

function loadThemeColors(zip: AdmZip): ThemeColors {
  const colors: ThemeColors = { ...FALLBACK_THEME };
  const entry =
    zip.getEntry('ppt/theme/theme1.xml') ||
    zip.getEntry('ppt\\theme\\theme1.xml') ||
    zip.getEntries().find((e) => /ppt\/theme\/theme\d+\.xml$/i.test(e.entryName.replace(/\\/g, '/')));
  if (!entry) return colors;
  const xml = entry.getData().toString('utf8');
  const clrScheme = xml.match(/<a:clrScheme[\s>][\s\S]*?<\/a:clrScheme>/i)?.[0] || '';
  for (const m of clrScheme.matchAll(/<a:([a-z0-9]+)>([\s\S]*?)<\/a:\1>/gi)) {
    const name = m[1];
    const body = m[2];
    const srgb = body.match(/<a:srgbClr[^>]*val="([0-9A-Fa-f]{6})"/i);
    const sys = body.match(/<a:sysClr[^>]*lastClr="([0-9A-Fa-f]{6})"/i);
    const hex = srgb?.[1] || sys?.[1];
    if (hex) colors[name] = `#${hex.toUpperCase()}`;
  }
  // Aliase
  if (colors.dk1) colors.tx1 = colors.dk1;
  if (colors.lt1) colors.bg1 = colors.lt1;
  if (colors.dk2) colors.tx2 = colors.dk2;
  if (colors.lt2) colors.bg2 = colors.lt2;
  return colors;
}

function extractSrgb(xml: string, theme: ThemeColors): string | null {
  const srgb = xml.match(/<a:srgbClr\b([^>]*)>([\s\S]*?)<\/a:srgbClr>|<a:srgbClr\b([^/]*)\/>/i);
  if (srgb) {
    const attrs = srgb[1] || srgb[3] || '';
    const inner = srgb[2] || '';
    const val = (attrs.match(/\bval="([0-9A-Fa-f]{6})"/i) || [])[1];
    if (val) return applyColorTransforms(`#${val.toUpperCase()}`, attrs + inner);
  }
  const scheme = xml.match(/<a:schemeClr\b([^>]*)>([\s\S]*?)<\/a:schemeClr>|<a:schemeClr\b([^/]*)\/>/i);
  if (scheme) {
    const attrs = scheme[1] || scheme[3] || '';
    const inner = scheme[2] || '';
    const name = (attrs.match(/\bval="([^"]+)"/i) || [])[1];
    if (!name) return null;
    const base = theme[name] || FALLBACK_THEME[name];
    if (!base) return null;
    return applyColorTransforms(base, attrs + inner);
  }
  const sys = xml.match(/<a:sysClr[^>]*lastClr="([0-9A-Fa-f]{6})"/i);
  if (sys) return `#${sys[1].toUpperCase()}`;
  return null;
}

function extractFillColor(spXml: string, theme: ThemeColors): string | null {
  if (/<a:noFill\s*\/>/i.test(spXml.match(/<p:spPr[\s>][\s\S]*?<\/p:spPr>/i)?.[0] || '')) {
    return null;
  }
  const solid = spXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/i);
  if (solid) return extractSrgb(solid[1], theme);
  return null;
}

function extractStrokeColor(spXml: string, theme: ThemeColors): string | null {
  const ln = spXml.match(/<a:ln[\s>][\s\S]*?<\/a:ln>/i);
  if (!ln) return null;
  if (/<a:noFill\s*\/>/i.test(ln[0])) return null;
  return extractSrgb(ln[0], theme);
}

function extractFontSizePt(spXml: string): number | null {
  const sz =
    spXml.match(/<a:rPr[^>]*\bsz="(\d+)"/i) ||
    spXml.match(/<a:defRPr[^>]*\bsz="(\d+)"/i) ||
    spXml.match(/<a:endParaRPr[^>]*\bsz="(\d+)"/i);
  if (!sz) return null;
  return Number(sz[1]) / 100;
}

function defaultFontPtForPlaceholder(phType: string | null): number {
  const t = (phType || '').toLowerCase();
  if (t === 'ctrTitle' || t === 'title') return 32;
  if (t === 'subTitle') return 20;
  if (t === 'body' || t === 'obj') return 18;
  return 16;
}

function paragraphsToHtml(
  txBodyXml: string,
  theme: ThemeColors,
  fallbackFontPt: number | null,
): { html: string; plainLines: string[]; bold: boolean; color: string | null; fontSizePt: number | null } {
  const paras = [...txBodyXml.matchAll(/<a:p[\s>][\s\S]*?<\/a:p>/gi)].map((m) => m[0]);
  const plainLines: string[] = [];
  let anyBold = false;
  let color: string | null = null;
  let fontSizePt: number | null = fallbackFontPt;
  const htmlParts: string[] = [];

  const bodyDefSz = txBodyXml.match(/<a:defRPr[^>]*\bsz="(\d+)"/i);
  if (bodyDefSz && fontSizePt == null) fontSizePt = Number(bodyDefSz[1]) / 100;

  for (const p of paras) {
    const buFont = /<a:buFont|<a:buChar|<a:buAutoNum/i.test(p);
    const lvl = Number((p.match(/<a:pPr[^>]*\blvl="(\d+)"/i) || [])[1] || 0);
    const pAlign = ((p.match(/<a:pPr[^>]*\balgn="([^"]+)"/i) || [])[1] || '').toLowerCase();
    const endSz = p.match(/<a:endParaRPr[^>]*\bsz="(\d+)"/i);
    const paraDefaultSz = endSz ? Number(endSz[1]) / 100 : fontSizePt;
    const runs = [...p.matchAll(/<a:r[\s>][\s\S]*?<\/a:r>/gi)].map((m) => m[0]);
    // auch Feld-Texte (Foliennummer etc.) überspringen wenn leer
    if (runs.length === 0) continue;

    let lineHtml = '';
    let linePlain = '';
    for (const r of runs) {
      const t = r.match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/i);
      if (!t) continue;
      const text = decodeXmlEntities(t[1]);
      if (!text) continue;
      const rPr = r.match(/<a:rPr([^>]*)>/i);
      const attrs = rPr?.[1] || '';
      const bold = /\bb="1"/.test(attrs) || /<a:b\s*\/>/.test(r);
      const italic = /\bi="1"/.test(attrs);
      const sz = attrs.match(/\bsz="(\d+)"/);
      const runColor = extractSrgb(r, theme);
      const pt = sz ? Math.round(Number(sz[1]) / 100) : paraDefaultSz ? Math.round(paraDefaultSz) : null;
      if (bold) anyBold = true;
      if (runColor && !color) color = runColor;
      if (pt && (fontSizePt == null || pt > fontSizePt)) fontSizePt = pt;

      let inner = escapeHtml(text);
      if (bold) inner = `<strong>${inner}</strong>`;
      if (italic) inner = `<em>${inner}</em>`;
      if (pt && pt >= 8 && pt <= 96) {
        inner = `<span data-pres-fs="${pt}" style="font-size:${pt}px">${inner}</span>`;
      }
      if (runColor) {
        inner = `<span data-pres-color="${runColor}" style="color:${runColor}">${inner}</span>`;
      }
      lineHtml += inner;
      linePlain += text;
    }
    const trimmed = linePlain.replace(/\s+/g, ' ').trim();
    if (!trimmed && !lineHtml) continue;
    plainLines.push(trimmed);

    const alignStyle =
      pAlign === 'ctr' || pAlign === 'center'
        ? ' style="text-align:center"'
        : pAlign === 'r' || pAlign === 'right'
          ? ' style="text-align:right"'
          : '';
    const pad = lvl > 0 ? ` style="margin-left:${lvl * 1.2}em"` : '';
    if (buFont) {
      htmlParts.push(`<li${pad || alignStyle}>${lineHtml || escapeHtml(trimmed)}</li>`);
    } else {
      htmlParts.push(`<p${alignStyle || pad}>${lineHtml || escapeHtml(trimmed)}</p>`);
    }
  }

  let html = '';
  let inList = false;
  for (const part of htmlParts) {
    if (part.startsWith('<li')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += part;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += part;
    }
  }
  if (inList) html += '</ul>';

  if (!htmlParts.length) {
    const math = [...txBodyXml.matchAll(/<m:t(?:\s[^>]*)?>([\s\S]*?)<\/m:t>/gi)]
      .map((m) => decodeXmlEntities(m[1]).replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (math.length) {
      const joined = math.join('');
      html = `<p style="text-align:center"><span data-pres-fs="20" style="font-size:20px">${escapeHtml(joined)}</span></p>`;
      plainLines.push(joined);
      if (fontSizePt == null) fontSizePt = 20;
    }
  }

  // Wenn gar keine data-pres-fs gesetzt: gesamten Block mit Fallback wrappen
  if (html && fontSizePt && !/data-pres-fs=/.test(html)) {
    const pt = Math.round(fontSizePt);
    if (pt >= 8 && pt <= 96) {
      html = `<div data-pres-fs="${pt}" style="font-size:${pt}px">${html}</div>`;
    }
  }

  return { html, plainLines, bold: anyBold, color, fontSizePt };
}

function parseRelTargets(relsXml: string): Map<string, string> {
  const map = new Map<string, string>();
  const re =
    /<Relationship[^>]*\bId="(rId\d+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>|<Relationship[^>]*\bTarget="([^"]+)"[^>]*\bId="(rId\d+)"[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml))) {
    const id = m[1] || m[4];
    const target = m[2] || m[3];
    if (id && target) map.set(id, target.replace(/\\/g, '/'));
  }
  return map;
}

function resolveZipEntry(zip: AdmZip, mediaTarget: string): AdmZip.IZipEntry | null {
  const cleaned = mediaTarget.replace(/^\.\.\//g, '').replace(/^\//, '');
  const candidates = [
    cleaned,
    path.posix.join('ppt', cleaned.replace(/^ppt\//, '')),
    path.posix.normalize(`ppt/slides/${mediaTarget}`),
    `ppt/media/${path.posix.basename(cleaned)}`,
  ];
  for (const c of candidates) {
    const entry = zip.getEntry(c) || zip.getEntry(c.replace(/\//g, '\\'));
    if (entry && !entry.isDirectory) return entry;
  }
  const base = path.posix.basename(cleaned).toLowerCase();
  for (const e of zip.getEntries()) {
    const n = e.entryName.replace(/\\/g, '/').toLowerCase();
    if (n.endsWith('/' + base) || n === base) return e;
  }
  return null;
}

type PlaceholderGeom = { type: string; idx: string; rect: RectEmu };

function loadPlaceholdersFromXml(xml: string): PlaceholderGeom[] {
  const out: PlaceholderGeom[] = [];
  for (const m of xml.matchAll(/<p:sp[\s>][\s\S]*?<\/p:sp>/gi)) {
    const sp = m[0];
    const ph = sp.match(/<p:ph([^>]*)\/?>/i);
    if (!ph) continue;
    const type = ((ph[1].match(/\btype="([^"]+)"/i) || [])[1] || 'body').toLowerCase();
    const idx = (ph[1].match(/\bidx="([^"]+)"/i) || [])[1] || '0';
    const rect = parseXfrmBlock(sp);
    if (!rect || (rect.w === 0 && rect.h === 0)) continue;
    out.push({ type, idx, rect });
  }
  return out;
}

function resolveThemeOrLayoutPath(zip: AdmZip, relTarget: string, fromDir: string): AdmZip.IZipEntry | null {
  const cleaned = relTarget.replace(/\\/g, '/');
  const candidates = [
    cleaned.replace(/^\.\.\//, 'ppt/'),
    path.posix.normalize(path.posix.join(fromDir, cleaned)),
    `ppt/slideLayouts/${path.posix.basename(cleaned)}`,
    `ppt/slideMasters/${path.posix.basename(cleaned)}`,
  ];
  for (const c of candidates) {
    const e = zip.getEntry(c) || zip.getEntry(c.replace(/\//g, '\\'));
    if (e && !e.isDirectory) return e;
  }
  return null;
}

function loadLayoutPlaceholders(zip: AdmZip, layoutRelTarget: string): PlaceholderGeom[] {
  const entry = resolveThemeOrLayoutPath(zip, layoutRelTarget, 'ppt/slides');
  if (!entry) return [];
  const layoutXml = entry.getData().toString('utf8');
  let placeholders = loadPlaceholdersFromXml(layoutXml);

  // Master-Platzhalter ergänzen (Layout überschreibt)
  const layoutRelsPath = entry.entryName.replace(/\\/g, '/').replace(/([^/]+)$/, '_rels/$1.rels');
  const layoutRels =
    zip.getEntry(layoutRelsPath) || zip.getEntry(layoutRelsPath.replace(/\//g, '\\'));
  if (layoutRels) {
    const relMap = parseRelTargets(layoutRels.getData().toString('utf8'));
    for (const [, target] of relMap) {
      if (!/slideMaster/i.test(target)) continue;
      const master = resolveThemeOrLayoutPath(zip, target, 'ppt/slideLayouts');
      if (!master) continue;
      const masterPh = loadPlaceholdersFromXml(master.getData().toString('utf8'));
      for (const mph of masterPh) {
        if (!placeholders.some((p) => p.type === mph.type && p.idx === mph.idx)) {
          placeholders.push(mph);
        }
      }
      break;
    }
  }
  return placeholders;
}

function findPlaceholderRect(
  placeholders: PlaceholderGeom[],
  phAttrs: string,
): RectEmu | null {
  const type = ((phAttrs.match(/\btype="([^"]+)"/i) || [])[1] || 'body').toLowerCase();
  const idx = (phAttrs.match(/\bidx="([^"]+)"/i) || [])[1] || '0';
  const exact = placeholders.find((p) => p.type === type && p.idx === idx);
  if (exact) return exact.rect;
  const byType = placeholders.find((p) => p.type === type);
  if (byType) return byType.rect;
  if (type === 'ctrTitle' || type === 'title') {
    return placeholders.find((p) => p.type === 'ctrTitle' || p.type === 'title')?.rect || null;
  }
  return placeholders.find((p) => p.type === 'body' || p.type === 'obj')?.rect || null;
}

function shapeLooksLikeBox(_spXml: string, fill: string | null): boolean {
  return Boolean(fill);
}

function extractSlideBackground(slideXml: string, theme: ThemeColors): string | null {
  const bg = slideXml.match(/<p:bg[\s>][\s\S]*?<\/p:bg>/i)?.[0];
  if (!bg) return null;
  if (/<a:noFill\s*\/>/i.test(bg)) return null;
  const solid = bg.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/i);
  if (solid) return extractSrgb(solid[1], theme);
  return null;
}

function tableToHtml(tblXml: string, theme: ThemeColors): string {
  const rows = [...tblXml.matchAll(/<a:tr[\s>][\s\S]*?<\/a:tr>/gi)].map((m) => m[0]);
  if (!rows.length) return '';
  let html = '<table style="width:100%;border-collapse:collapse">';
  for (const row of rows) {
    html += '<tr>';
    const cells = [...row.matchAll(/<a:tc[\s>][\s\S]*?<\/a:tc>/gi)].map((m) => m[0]);
    for (const cell of cells) {
      const { html: cellHtml, plainLines } = paragraphsToHtml(cell, theme, 14);
      const text = cellHtml || plainLines.map((l) => `<p>${escapeHtml(l)}</p>`).join('') || '&nbsp;';
      html += `<td style="border:1px solid #ccc;padding:4px;vertical-align:top">${text}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function extractTopLevelBlocks(xml: string, tag: 'p:sp' | 'p:pic' | 'p:grpSp' | 'p:graphicFrame' | 'p:cxnSp'): string[] {
  const open = new RegExp(`<${tag}([\\s>])`, 'gi');
  const closeTag = `</${tag}>`;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const start = m.index;
    let depth = 1;
    let i = open.lastIndex;
    const openRe = new RegExp(`<${tag}[\\s>]`, 'gi');
    const closeRe = new RegExp(`</${tag}>`, 'gi');
    while (depth > 0 && i < xml.length) {
      openRe.lastIndex = i;
      closeRe.lastIndex = i;
      const nextOpen = openRe.exec(xml);
      const nextClose = closeRe.exec(xml);
      if (!nextClose) break;
      if (nextOpen && nextOpen.index < nextClose.index) {
        depth += 1;
        i = nextOpen.index + 1;
      } else {
        depth -= 1;
        i = nextClose.index + closeTag.length;
        if (depth === 0) {
          blocks.push(xml.slice(start, i));
        }
      }
    }
  }
  return blocks;
}

function stripMcFallback(xml: string): string {
  return xml.replace(/<mc:Fallback\b[^>]*>[\s\S]*?<\/mc:Fallback>/gi, '');
}
function stripGroupBlocks(xml: string): string {
  let out = xml;
  const blocks = extractTopLevelBlocks(xml, 'p:grpSp');
  for (const b of blocks) {
    out = out.replace(b, '');
  }
  return out;
}

function extractShapeBoxes(
  xml: string,
  zip: AdmZip,
  relMap: Map<string, string>,
  placeholders: PlaceholderGeom[],
  group: GroupXfrm | null,
  slideCx: number,
  slideCy: number,
  theme: ThemeColors,
  boxes: ParsedPptxBox[],
): void {
  for (const grp of extractTopLevelBlocks(xml, 'p:grpSp')) {
    const grpPr = grp.match(/<p:grpSpPr[\s>][\s\S]*?<\/p:grpSpPr>/i)?.[0] || '';
    const nested = parseGroupXfrm(grpPr);
    let combined: GroupXfrm | null = nested;
    if (nested && group) {
      const sx = group.chExt.cx ? group.ext.cx / group.chExt.cx : 1;
      const sy = group.chExt.cy ? group.ext.cy / group.chExt.cy : 1;
      combined = {
        off: {
          x: group.off.x + (nested.off.x - group.chOff.x) * sx,
          y: group.off.y + (nested.off.y - group.chOff.y) * sy,
        },
        ext: { cx: nested.ext.cx * sx, cy: nested.ext.cy * sy },
        chOff: nested.chOff,
        chExt: nested.chExt,
      };
    }
    const inner = grp
      .replace(/^<p:grpSp[\s>][\s\S]*?<\/p:nvGrpSpPr>/i, '')
      .replace(/<\/p:grpSp>$/i, '');
    extractShapeBoxes(
      inner,
      zip,
      relMap,
      placeholders,
      combined || group,
      slideCx,
      slideCy,
      theme,
      boxes,
    );
  }

  const flat = stripGroupBlocks(xml);

  for (const pic of extractTopLevelBlocks(flat, 'p:pic')) {
    let rect = parseXfrmBlock(pic);
    if (!rect) continue;
    rect = applyGroupTransform(rect, group);
    const embed = (pic.match(/r:embed="(rId\d+)"/i) || [])[1];
    if (!embed) continue;
    const target = relMap.get(embed);
    if (!target || /^https?:\/\//i.test(target)) continue;
    const media = resolveZipEntry(zip, target);
    if (!media) continue;
    const ext = path.extname(media.entryName).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) continue;
    const data = media.getData();
    if (!data?.length || data.length > 12 * 1024 * 1024) continue;
    const pct = emuToPct(rect, slideCx, slideCy);
    if (pct.w < 0.5 || pct.h < 0.5) continue;
    boxes.push({
      kind: 'image',
      ...pct,
      name: path.basename(media.entryName),
      mime,
      base64: data.toString('base64'),
    });
  }

  for (const cxn of extractTopLevelBlocks(flat, 'p:cxnSp')) {
    let rect = parseXfrmBlock(cxn);
    if (!rect || rect.w <= 0 || rect.h <= 0) continue;
    rect = applyGroupTransform(rect, group);
    const pct = emuToPct(rect, slideCx, slideCy);
    if (pct.w < 0.2 && pct.h < 0.2) continue;
    const stroke = extractStrokeColor(cxn, theme) || '#212121';
    const hasArrow = /<a:tailEnd|<a:headEnd/i.test(cxn);
    boxes.push({
      kind: 'shape',
      x: pct.x,
      y: pct.y,
      w: Math.max(pct.w, 0.6),
      h: Math.max(pct.h, 0.6),
      fillColor: null,
      strokeColor: stroke,
      shapeKind: hasArrow ? 'arrow' : 'line',
    });
  }

  for (const frame of extractTopLevelBlocks(flat, 'p:graphicFrame')) {
    let rect = parseXfrmBlock(frame);
    if (!rect || rect.w <= 0 || rect.h <= 0) continue;
    rect = applyGroupTransform(rect, group);
    const pct = emuToPct(rect, slideCx, slideCy);
    if (pct.w < 0.5 || pct.h < 0.5) continue;
    const tbl = frame.match(/<a:tbl[\s>][\s\S]*?<\/a:tbl>/i)?.[0];
    if (!tbl) continue;
    const html = tableToHtml(tbl, theme);
    if (!html) continue;
    boxes.push({
      kind: 'text',
      ...pct,
      html,
      fillColor: null,
      strokeColor: null,
      fontSizePt: 14,
      bold: false,
      color: null,
    });
  }

  for (const sp of extractTopLevelBlocks(flat, 'p:sp')) {
    let rect = parseXfrmBlock(sp);
    const ph = sp.match(/<p:ph([^>]*)\/?>/i);
    const phType = ph ? ((ph[1].match(/\btype="([^"]+)"/i) || [])[1] || 'body') : null;
    if ((!rect || (rect.w === 0 && rect.h === 0)) && ph) {
      rect = findPlaceholderRect(placeholders, ph[1]) || null;
    }
    if (!rect || rect.w <= 0 || rect.h <= 0) continue;
    rect = applyGroupTransform(rect, group);
    const pct = emuToPct(rect, slideCx, slideCy);
    if (pct.w < 0.4 || pct.h < 0.4) continue;

    const spPr = sp.match(/<p:spPr[\s>][\s\S]*?<\/p:spPr>/i)?.[0] || '';
    const fill = extractFillColor(spPr, theme) || extractFillColor(sp, theme);
    const stroke = extractStrokeColor(sp, theme) || extractStrokeColor(spPr, theme);
    const txBody = sp.match(/<p:txBody[\s>][\s\S]*?<\/p:txBody>/i)?.[0];
    const prst = (sp.match(/<a:prstGeom[^>]*prst="([^"]+)"/i) || [])[1] || 'rect';
    const isEllipse = /ellipse|circle/i.test(prst);

    if (txBody) {
      const fallbackPt = defaultFontPtForPlaceholder(phType);
      const { html, plainLines, bold, color, fontSizePt } = paragraphsToHtml(
        txBody,
        theme,
        fallbackPt,
      );
      if (html.trim() || plainLines.length) {
        // Fill gehört zum Textfeld selbst — keine Extra-Form darunter (sonst doppelte Boxen)
        boxes.push({
          kind: 'text',
          ...pct,
          html: html || plainLines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
          fillColor: fill && !(pct.w > 95 && pct.h > 95) ? fill : null,
          strokeColor: stroke,
          fontSizePt: fontSizePt || extractFontSizePt(sp) || fallbackPt,
          bold,
          color,
        });
        continue;
      }
    }

    if (fill && shapeLooksLikeBox(sp, fill)) {
      if (pct.w > 95 && pct.h > 95) continue; // Folienhintergrund separat
      boxes.push({
        kind: 'shape',
        ...pct,
        fillColor: fill,
        strokeColor: stroke,
        shapeKind: isEllipse ? 'ellipse' : 'rect',
      });
    }
  }
}

function listSlideEntries(zip: AdmZip): AdmZip.IZipEntry[] {
  return zip
    .getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName.replace(/\\/g, '/')))
    .sort((a, b) => {
      const na = Number((a.entryName.match(/slide(\d+)/i) || [])[1] || 0);
      const nb = Number((b.entryName.match(/slide(\d+)/i) || [])[1] || 0);
      return na - nb;
    });
}

function readSlideSize(zip: AdmZip): { cx: number; cy: number } {
  const entry = zip.getEntry('ppt/presentation.xml') || zip.getEntry('ppt\\presentation.xml');
  if (!entry) return { cx: DEFAULT_SLIDE_CX, cy: DEFAULT_SLIDE_CY };
  const xml = entry.getData().toString('utf8');
  const m = xml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
  if (!m) return { cx: DEFAULT_SLIDE_CX, cy: DEFAULT_SLIDE_CY };
  return { cx: Number(m[1]) || DEFAULT_SLIDE_CX, cy: Number(m[2]) || DEFAULT_SLIDE_CY };
}

function dedupeTinyOverlaps(boxes: ParsedPptxBox[]): ParsedPptxBox[] {
  // Drop empty decorative shapes fully covered by later content? Keep all for fidelity.
  return boxes.filter((b) => {
    if (b.kind === 'text' && !b.html.replace(/<[^>]+>/g, '').trim()) return false;
    return b.w >= 0.5 && b.h >= 0.5;
  });
}

/**
 * PPTX → positionierte Boxen (Text / Bild / Form) in % der Folie.
 * Layout der PPTX wird räumlich übernommen; Johnny-Stil kommt beim Einfügen.
 */
export function parsePptxBuffer(buffer: Buffer, fileName = 'import.pptx'): ParsedPptx {
  const zip = new AdmZip(buffer);
  const { cx: slideCx, cy: slideCy } = readSlideSize(zip);
  const theme = loadThemeColors(zip);
  const slideEntries = listSlideEntries(zip);
  const slides: ParsedPptxSlide[] = [];

  for (let i = 0; i < slideEntries.length; i++) {
    const entry = slideEntries[i];
    const slidePath = entry.entryName.replace(/\\/g, '/');
    const slideXmlRaw = entry.getData().toString('utf8');
    const slideXml = stripMcFallback(slideXmlRaw);
    const slideNum = (slidePath.match(/slide(\d+)/i) || [])[1] || String(i + 1);

    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsEntry = zip.getEntry(relsPath) || zip.getEntry(relsPath.replace(/\//g, '\\'));
    const relsXml = relsEntry ? relsEntry.getData().toString('utf8') : '';
    const relMap = parseRelTargets(relsXml);

    let placeholders: PlaceholderGeom[] = [];
    for (const [, target] of relMap) {
      if (/slideLayout/i.test(target)) {
        placeholders = loadLayoutPlaceholders(zip, target);
        break;
      }
    }

    const backgroundColor = extractSlideBackground(slideXml, theme);
    const boxes: ParsedPptxBox[] = [];
    extractShapeBoxes(
      slideXml,
      zip,
      relMap,
      placeholders,
      null,
      slideCx,
      slideCy,
      theme,
      boxes,
    );

    const cleanedBoxes = dedupeTinyOverlaps(boxes);

    const textBoxes = cleanedBoxes.filter((b) => b.kind === 'text') as Extract<
      ParsedPptxBox,
      { kind: 'text' }
    >[];
    let title = '';
    if (textBoxes.length) {
      const sorted = [...textBoxes].sort((a, b) => a.y - b.y || b.w * b.h - a.w * a.h);
      title = sorted[0].html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    }

    let notes = '';
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    const notesEntry = zip.getEntry(notesPath) || zip.getEntry(notesPath.replace(/\//g, '\\'));
    if (notesEntry) {
      const { plainLines } = paragraphsToHtml(notesEntry.getData().toString('utf8'), theme, 12);
      notes = plainLines.join('\n').slice(0, 2000);
    }

    const images = cleanedBoxes
      .filter((b): b is Extract<ParsedPptxBox, { kind: 'image' }> => b.kind === 'image')
      .map((b) => ({ name: b.name, mime: b.mime, base64: b.base64 }));

    const bodyLines = textBoxes.slice(title ? 1 : 0).flatMap((b) =>
      b.html
        .replace(/<\/(p|li)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean),
    );

    slides.push({
      index: i,
      title,
      notes,
      boxes: cleanedBoxes,
      backgroundColor,
      bodyLines,
      images,
    });
  }

  return {
    fileName: fileName || 'import.pptx',
    slideCount: slides.length,
    slideWidthEmu: slideCx,
    slideHeightEmu: slideCy,
    slides,
  };
}
