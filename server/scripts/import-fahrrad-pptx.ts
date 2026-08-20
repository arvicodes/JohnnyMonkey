import fs from 'fs';
import path from 'path';
import { parsePptxBuffer } from '../src/lib/pptxParse';

const pptxPath = process.argv[2];
const physicalDir =
  '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/Mathe/MSS 12 LK/12-01 Matrizen/01 Basiswissen/01.07 Prozesse Fahhrad';
const lessonPath =
  'git-intern/Mathe/MSS 12 LK/12-01 Matrizen/01 Basiswissen/01.07 Prozesse Fahhrad';

const ENTRY_HTML =
  `<p style="text-align:center;margin:0;line-height:1">` +
  `<a href="/entry-ticket?jm=lesson-entry" data-pres-entry-ticket="1" ` +
  `title="Entry Ticket dieser Stunde" ` +
  `style="display:flex;align-items:center;justify-content:center;` +
  `width:100%;height:100%;min-height:52px;border-radius:12px;` +
  `background:linear-gradient(135deg,#1e88e5 0%,#3949ab 100%);` +
  `color:#fff !important;text-decoration:none;font-weight:800;` +
  `font-size:42px;border:2px solid rgba(33,150,243,0.55);` +
  `box-sizing:border-box;box-shadow:0 2px 8px rgba(25,118,210,0.28)">E</a></p>`;

function rid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const parsed = parsePptxBuffer(fs.readFileSync(pptxPath), path.basename(pptxPath));
const imported = parsed.slides[0];
if (!imported) throw new Error('Keine Folie in der PPTX');

fs.mkdirSync(physicalDir, { recursive: true });

const written = new Map<string, string>();
const elements: Array<Record<string, unknown>> = [];
let z = 1;

for (const box of imported.boxes) {
  const id = rid(`el-pptx-${z}`);
  if (box.kind === 'image') {
    const key = `${box.name}|${box.base64.slice(0, 24)}`;
    let src = written.get(key);
    if (!src) {
      const ext = path.extname(box.name) || '.png';
      const safe = `pptx-${written.size + 1}-${path.basename(box.name, ext).replace(/[^\w.-]+/g, '_')}${ext}`;
      fs.writeFileSync(path.join(physicalDir, safe), Buffer.from(box.base64, 'base64'));
      src = `${lessonPath}/${safe}`;
      written.set(key, src);
    }
    elements.push({
      id: `${id}-img`,
      type: 'image',
      x: Math.round(box.x * 100) / 100,
      y: Math.round(box.y * 100) / 100,
      w: Math.round(Math.max(box.w, 1) * 100) / 100,
      h: Math.round(Math.max(box.h, 1) * 100) / 100,
      src,
      imageFit: 'contain',
      zIndex: z++,
      stackLayer: 'foreground',
    });
    continue;
  }
  if (box.kind === 'shape') {
    elements.push({
      id: `${id}-shape`,
      type: 'shape',
      x: Math.round(box.x * 100) / 100,
      y: Math.round(box.y * 100) / 100,
      w: Math.round(Math.max(box.w, 0.6) * 100) / 100,
      h: Math.round(Math.max(box.h, 0.6) * 100) / 100,
      shapeKind: box.shapeKind || 'arrow',
      fillColor: box.fillColor || undefined,
      strokeColor: box.strokeColor || '#212121',
      strokeWidth: box.shapeKind === 'arrow' || box.shapeKind === 'line' ? 3 : 2,
      zIndex: z++,
      stackLayer: 'background',
    });
    continue;
  }
  elements.push({
    id: `${id}-text`,
    type: 'text',
    x: Math.round(box.x * 100) / 100,
    y: Math.round(box.y * 100) / 100,
    w: Math.round(Math.max(box.w, 1) * 100) / 100,
    h: Math.round(Math.max(box.h, 1) * 100) / 100,
    html: box.html || '<p></p>',
    fillColor: box.fillColor || undefined,
    strokeColor: box.strokeColor || undefined,
    zIndex: z++,
    stackLayer: 'foreground',
  });
}

const titleSlide = {
  layout: 'title-slide',
  title: 'Guten Morgen!',
  body: 'Prozesse Fahrrad',
  speakerNotes: '',
  preparationNotes: '',
  materialNotes: '',
  subtitle: 'Prozesse Fahrrad',
  bodyLeft: '',
  bodyRight: '',
  imagePath: '',
  imageCaption: '',
  bodyStyle: 'plain',
  titleAlign: 'center',
  accentColor: '#2E7D32',
  titleHtml: '<p>Guten Morgen!</p>',
  bodyHtml: '<p>Prozesse Fahrrad</p>',
  subtitleHtml: '<p>Prozesse Fahrrad</p>',
  bodyLeftHtml: '',
  bodyRightHtml: '',
  imageCaptionHtml: '',
  speakerNotesHtml: '',
  preparationHtml: '',
  materialHtml: '',
  elements: [
    {
      id: rid('el-start-img'),
      type: 'image',
      x: 31.720945573258426,
      y: 6.555859751303066,
      w: 31.831176939326497,
      h: 37.65493697478992,
      src: 'git-intern/Informatik/MSS Grundthemen/11-04 KI/01 Basiswissen/01.02 Orga/Adobe Express - file.png',
      zIndex: 1,
      imageFit: 'contain',
    },
    {
      id: 'el-start-entry-ticket',
      type: 'text',
      x: 90.2,
      y: 2.2,
      w: 7.6,
      h: 10.5,
      zIndex: 40,
      stackLayer: 'foreground',
      html: ENTRY_HTML,
    },
  ],
  transition: 'fade',
  revealEnabled: true,
  zoneRevealSteps: {},
  id: rid('slide'),
  order: 0,
};

const contentSlide = {
  speakerNotes: imported.notes || '',
  layout: 'blank-full',
  subtitle: '',
  bodyLeft: '',
  bodyRight: '',
  imagePath: '',
  imageCaption: '',
  bodyStyle: 'plain',
  titleAlign: 'left',
  accentColor: '#2E7D32',
  title: 'Prozesse Fahrrad',
  body: '',
  hiddenLayoutZones: ['bodyHtml'],
  titleHtml: '',
  bodyHtml: '',
  subtitleHtml: '',
  bodyLeftHtml: '',
  bodyRightHtml: '',
  imageCaptionHtml: '',
  speakerNotesHtml: '',
  preparationHtml: '',
  materialHtml: '',
  elements,
  transition: 'fade',
  revealEnabled: true,
  zoneRevealSteps: {},
  id: rid('slide'),
  order: 1,
};

const deck = {
  version: 1,
  title: '01.07 Prozesse Fahrrad',
  lessonPath,
  updatedAt: new Date().toISOString(),
  defaultTransition: 'fade',
  slides: [titleSlide, contentSlide],
};

const json = JSON.stringify(deck, null, 2);
fs.writeFileSync(path.join(physicalDir, 'Praesentation.deck.json'), json);
fs.writeFileSync(path.join(physicalDir, 'Praesentation.deck.original.json'), json);

const pptxDest = path.join(physicalDir, 'Prozesse Fahrrad.pptx');
fs.copyFileSync(pptxPath, pptxDest);

console.log(
  JSON.stringify(
    {
      dir: physicalDir,
      images: written.size,
      elements: elements.length,
      kinds: imported.boxes.reduce((acc: Record<string, number>, b) => {
        acc[b.kind] = (acc[b.kind] || 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2,
  ),
);
