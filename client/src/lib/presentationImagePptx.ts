import JSZip from 'jszip';

/** Browser-taugliches PPTX: eine PNG pro Folie (inkl. erweiterter Höhe). */

const EMU = 914400;
const BASE_CX = Math.round(13.333 * EMU); // 16:9 Breite (Zoll)

function xmlEscape(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notesParagraphs(text: string): string {
  const lines = String(text || '').split('\n').slice(0, 120);
  if (!lines.length) return paragraph(' ', 14, false);
  return lines.map((line, i) => paragraph(line || ' ', 14, false, i > 0)).join('');
}

function paragraph(text: string, sizePt: number, bold: boolean, extraP = false): string {
  const sz = Math.round(sizePt * 100);
  const b = bold ? ' b="1"' : '';
  const t = xmlEscape(text);
  return (
    `<a:p>${extraP ? '<a:pPr/>' : ''}` +
    `<a:r><a:rPr lang="de-DE" sz="${sz}"${b} dirty="0"/>` +
    `<a:t>${t}</a:t></a:r></a:p>`
  );
}

function slidePictureXml(cx: number, cy: number, picId: number, imageRelId: number): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree>` +
    `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>` +
    `<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
    `<p:pic>` +
    `<p:nvPicPr><p:cNvPr id="${picId}" name="Folie"/>` +
    `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="rId${imageRelId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
    `</p:pic>` +
    `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
  );
}

function notesSlideXml(body: string): string {
  const inner = notesParagraphs(body.slice(0, 8000));
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree>` +
    `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>` +
    `<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
    `<p:sp>` +
    `<p:nvSpPr><p:cNvPr id="2" name="Notizen"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="360000" y="360000"/><a:ext cx="6400800" cy="7808400"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${inner}</p:txBody>` +
    `</p:sp>` +
    `</p:spTree></p:cSld></p:notes>`
  );
}

export type ImagePptxSlideInput = {
  png: Uint8Array;
  widthPx: number;
  heightPx: number;
  notes?: string;
};

export async function buildImagePptxBlob(slides: ImagePptxSlideInput[]): Promise<Blob> {
  const list = slides.length ? slides : [];
  if (!list.length) throw new Error('Keine Folien für PPTX');

  let maxCy = Math.round((7.5 * EMU) as number);
  for (const s of list) {
    const aspect = s.heightPx / Math.max(1, s.widthPx);
    const cy = Math.round(BASE_CX * aspect);
    if (cy > maxCy) maxCy = cy;
  }

  const zip = new JSZip();
  const slideCount = list.length;
  const hasNotes = list.some((s) => (s.notes || '').trim());

  const overrides: string[] = [
    `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>`,
  ];
  for (let i = 0; i < slideCount; i++) {
    overrides.push(
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    );
    if (hasNotes) {
      overrides.push(
        `<Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`,
      );
    }
  }

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/>` +
      overrides.join('') +
      `</Types>`,
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>` +
      `</Relationships>`,
  );

  const sldIdLst = list.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`).join('');
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
      `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
      `<p:sldIdLst>${sldIdLst}</p:sldIdLst>` +
      `<p:sldSz cx="${BASE_CX}" cy="${maxCy}"/>` +
      `<p:notesSz cx="6858000" cy="9144000"/>` +
      `</p:presentation>`,
  );

  const presRels = list
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
    )
    .join('');
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels}</Relationships>`,
  );

  for (let i = 0; i < list.length; i++) {
    const slide = list[i];
    const imageName = `image${i + 1}.png`;
    const aspect = slide.heightPx / Math.max(1, slide.widthPx);
    const imgCy = Math.round(BASE_CX * aspect);

    zip.file(`ppt/media/${imageName}`, slide.png);

    const slideRels: string[] = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageName}"/>`,
    ];
    if (hasNotes && (slide.notes || '').trim()) {
      slideRels.push(
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${i + 1}.xml"/>`,
      );
    }
    zip.file(
      `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slideRels.join('')}</Relationships>`,
    );

    zip.file(`ppt/slides/slide${i + 1}.xml`, slidePictureXml(BASE_CX, imgCy, 4, 1));

    if (hasNotes && (slide.notes || '').trim()) {
      zip.file(`ppt/notesSlides/notesSlide${i + 1}.xml`, notesSlideXml(slide.notes || ''));
      zip.file(
        `ppt/notesSlides/_rels/notesSlide${i + 1}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${i + 1}.xml"/>` +
          `</Relationships>`,
      );
    }
  }

  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

export function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG konnte nicht erzeugt werden'));
        return;
      }
      blob
        .arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(reject);
    }, 'image/png');
  });
}
