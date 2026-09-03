"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTextPptx = buildTextPptx;
const adm_zip_1 = __importDefault(require("adm-zip"));
/** Minimales PPTX (Textfolien), öffnet in PowerPoint, Keynote und Preview. */
function xmlEscape(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function paragraph(text, sizePt, bold) {
    const sz = Math.round(sizePt * 100);
    const b = bold ? ' b="1"' : '';
    const lines = String(text || '').split('\n');
    return lines
        .map((line, i) => {
        const t = xmlEscape(line || ' ');
        return (`<a:p>${i > 0 ? '<a:pPr/>' : ''}` +
            `<a:r><a:rPr lang="de-DE" sz="${sz}"${b} dirty="0"/>` +
            `<a:t>${t}</a:t></a:r></a:p>`);
    })
        .join('');
}
function textBox(id, name, x, y, cx, cy, inner) {
    return (`<p:sp>` +
        `<p:nvSpPr><p:cNvPr id="${id}" name="${name}"/>` +
        `<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
        `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
        `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
        `<p:txBody><a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/>${inner}</p:txBody>` +
        `</p:sp>`);
}
function slideXml(title, body) {
    const titleInner = paragraph(title || 'Folie', 28, true);
    const bodyInner = paragraph((body || '').slice(0, 3500) || ' ', 16, false);
    return (`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
        `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
        `<p:cSld><p:spTree>` +
        `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
        `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>` +
        `<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
        textBox(2, 'Titel', 457200, 228600, 8229600, 1143000, titleInner) +
        textBox(3, 'Text', 457200, 1600200, 8229600, 4800600, bodyInner) +
        `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
}
function buildTextPptx(slides) {
    const list = slides.length ? slides.slice(0, 400) : [{ title: 'JohnnyMonkey', body: '' }];
    const zip = new adm_zip_1.default();
    const overrides = list
        .map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ` +
        `ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
        .join('');
    zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/ppt/presentation.xml" ` +
        `ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` +
        overrides +
        `</Types>`));
    zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>` +
        `</Relationships>`));
    const sldIdLst = list
        .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`)
        .join('');
    zip.addFile('ppt/presentation.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
        `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
        `saveSubsetFonts="1">` +
        `<p:sldIdLst>${sldIdLst}</p:sldIdLst>` +
        `<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>` +
        `<p:notesSz cx="6858000" cy="9144000"/>` +
        `</p:presentation>`));
    const presRels = list
        .map((_, i) => `<Relationship Id="rId${i + 1}" ` +
        `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" ` +
        `Target="slides/slide${i + 1}.xml"/>`)
        .join('');
    zip.addFile('ppt/_rels/presentation.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `${presRels}</Relationships>`));
    list.forEach((slide, i) => {
        zip.addFile(`ppt/slides/slide${i + 1}.xml`, Buffer.from(slideXml(slide.title, slide.body)));
    });
    return zip.toBuffer();
}
//# sourceMappingURL=simpleTextPptx.js.map