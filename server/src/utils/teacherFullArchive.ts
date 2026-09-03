import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import { JM_TEACHER_BACKUP_DIR } from './jmTeacherBackup';
import { FOLIEN_ALLE_BACKUP_DIR_NAME } from './folienAlleBackup';
import { SCRATCH_PAD_BACKUP_ROOT_NAME, SCRATCH_PAD_LIVE_DIR_NAME } from './teacherScratchPadStore';
import { buildTextPdf, type PdfBlock } from './simpleTextPdf';
import { buildTextPptx, type PptxSlide } from './simpleTextPptx';

const DOWNLOADS_DIR_NAME = 'Backup - Downloads';
const MAX_COPY_BYTES = 40 * 1024 * 1024;
const DECK_NAME = 'Praesentation.deck.json';
const DECK_ORIGINAL = 'Praesentation.deck.original.json';
const ANNOTATIONS = 'Praesentation.annotations.json';
const PLAY_VARIANTS = 'Praesentation.play-variants.json';

const DOC_EXT = new Set([
  '.pdf',
  '.pptx',
  '.ppt',
  '.odp',
  '.html',
  '.htm',
]);

function projectRoot(): string {
  const fromEnv = process.env.LOCAL_MATERIALS_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  return path.resolve(__dirname, '../../..');
}

function jmReihenRoot(): string {
  if (process.env.JM_REIHEN_PATH && fs.existsSync(process.env.JM_REIHEN_PATH)) {
    return process.env.JM_REIHEN_PATH;
  }
  const base = process.env.LOCAL_MATERIALS_PATH;
  if (base) {
    const candidate = path.join(base, 'J-M-Reihen');
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(projectRoot(), 'J-M-Reihen');
}

function berlinStamp(d = new Date()): string {
  const fmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}_${get('hour')}-${get('minute')}`;
}

function zipSafe(rel: string): string {
  return String(rel || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.\.\//g, '')
    .replace(/\/{2,}/g, '/');
}

function htmlToPlain(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' [Bild] ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function copyFileIntoZip(zip: AdmZip, abs: string, zipPath: string, seen: Set<string>): boolean {
  const dest = zipSafe(zipPath);
  if (!dest || seen.has(dest)) return false;
  try {
    const st = fs.statSync(abs);
    if (!st.isFile() || st.size <= 0 || st.size > MAX_COPY_BYTES) return false;
    zip.addLocalFile(abs, path.posix.dirname(dest), path.posix.basename(dest));
    seen.add(dest);
    return true;
  } catch {
    return false;
  }
}

function addBuffer(zip: AdmZip, zipPath: string, buf: Buffer, seen: Set<string>): void {
  const dest = zipSafe(zipPath);
  if (!dest || seen.has(dest)) return;
  zip.addFile(dest, buf);
  seen.add(dest);
}

function walkFiles(dir: string, acc: string[], depth = 0): void {
  if (depth > 12 || !fs.existsSync(dir)) return;
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = path.join(dir, name);
    let st: fs.Stats;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(full, acc, depth + 1);
    else if (st.isFile()) acc.push(full);
  }
}

function newestFiles(files: string[], keep: number): string[] {
  return files
    .map((full) => {
      try {
        return { full, mtime: fs.statSync(full).mtimeMs };
      } catch {
        return { full, mtime: 0 };
      }
    })
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, keep)
    .map((x) => x.full);
}

type DeckSlide = {
  title?: string;
  subtitle?: string;
  body?: string;
  titleHtml?: string;
  subtitleHtml?: string;
  bodyHtml?: string;
  bodyLeft?: string;
  bodyRight?: string;
  bodyLeftHtml?: string;
  bodyRightHtml?: string;
  speakerNotes?: string;
  speakerNotesHtml?: string;
  elements?: Array<{ html?: string; titleHtml?: string }>;
};

type DeckJson = {
  title?: string;
  lessonPath?: string;
  slides?: DeckSlide[];
};

function slidePlain(slide: DeckSlide, index: number): { title: string; body: string } {
  const title =
    htmlToPlain(slide.titleHtml || '') ||
    String(slide.title || '').trim() ||
    `Folie ${index + 1}`;
  const parts = [
    htmlToPlain(slide.subtitleHtml || '') || slide.subtitle,
    htmlToPlain(slide.bodyHtml || '') || slide.body,
    htmlToPlain(slide.bodyLeftHtml || '') || slide.bodyLeft,
    htmlToPlain(slide.bodyRightHtml || '') || slide.bodyRight,
    ...(slide.elements || []).map((el) =>
      [htmlToPlain(el.titleHtml || ''), htmlToPlain(el.html || '')].filter(Boolean).join('\n')
    ),
    htmlToPlain(slide.speakerNotesHtml || '') || slide.speakerNotes
      ? `Notizen:\n${htmlToPlain(slide.speakerNotesHtml || '') || slide.speakerNotes}`
      : '',
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  return { title, body: parts.join('\n\n') };
}

function findLiveDecks(jmRoot: string): string[] {
  const skip = new Set([
    JM_TEACHER_BACKUP_DIR.notes,
    JM_TEACHER_BACKUP_DIR.slides,
    JM_TEACHER_BACKUP_DIR.tickets,
    DOWNLOADS_DIR_NAME,
    FOLIEN_ALLE_BACKUP_DIR_NAME,
    SCRATCH_PAD_LIVE_DIR_NAME,
    'Backup - Folien',
  ]);
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 10) return;
    let names: string[] = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (name.startsWith('.')) continue;
      const full = path.join(dir, name);
      let st: fs.Stats;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (depth === 0 && skip.has(name)) continue;
        walk(full, depth + 1);
      } else if (name === DECK_NAME) {
        found.push(full);
      }
    }
  };
  walk(jmRoot, 0);
  return found.sort();
}

function lessonZipFolder(jmRoot: string, deckFile: string): string {
  const rel = path.relative(jmRoot, path.dirname(deckFile)).replace(/\\/g, '/');
  return zipSafe(`Praesentationen/${rel || 'ohne-fach'}`);
}

function addExistingDocs(zip: AdmZip, lessonDir: string, zipFolder: string, seen: Set<string>): number {
  let n = 0;
  let names: string[] = [];
  try {
    names = fs.readdirSync(lessonDir);
  } catch {
    return 0;
  }
  for (const name of names) {
    const ext = path.extname(name).toLowerCase();
    if (!DOC_EXT.has(ext)) continue;
    if (copyFileIntoZip(zip, path.join(lessonDir, name), `${zipFolder}/${name}`, seen)) n += 1;
  }
  return n;
}

function addGeneratedDeckExports(zip: AdmZip, deckFile: string, zipFolder: string, seen: Set<string>): void {
  const raw = readJson(deckFile) as DeckJson | null;
  const slides = Array.isArray(raw?.slides) ? raw!.slides! : [];
  const title = String(raw?.title || path.basename(path.dirname(deckFile)) || 'Präsentation');
  const pptSlides: PptxSlide[] = slides.length
    ? slides.map((s, i) => slidePlain(s, i))
    : [{ title, body: 'Keine Folien in der Datei.' }];
  const pdfBlocks: PdfBlock[] = [
    { title: 'Pfad', body: String(raw?.lessonPath || path.dirname(deckFile)) },
    ...pptSlides.map((s) => ({ title: s.title, body: s.body })),
  ];
  addBuffer(zip, `${zipFolder}/Praesentation-Text.pdf`, buildTextPdf(title, pdfBlocks), seen);
  addBuffer(zip, `${zipFolder}/Praesentation-Text.pptx`, buildTextPptx(pptSlides), seen);
}

type NotePage = { title?: string; text?: string };
type NotesPayload = { pages?: NotePage[]; updatedAt?: string; savedAt?: string };

function notesBlocks(payload: NotesPayload | null, fallbackTitle: string): PdfBlock[] {
  const pages = Array.isArray(payload?.pages) ? payload!.pages! : [];
  if (!pages.length) return [{ title: fallbackTitle, body: 'Keine Notizen gefunden.' }];
  return pages.map((p, i) => ({
    title: String(p.title || '').trim() || `Notiz ${i + 1}`,
    body: htmlToPlain(p.text || '') || '(leer)',
  }));
}

function notesPptx(payload: NotesPayload | null): PptxSlide[] {
  return notesBlocks(payload, 'Notizen').map((b) => ({
    title: b.title || 'Notiz',
    body: b.body || '',
  }));
}

function notesHtml(payload: NotesPayload | null): string {
  const pages = Array.isArray(payload?.pages) ? payload!.pages! : [];
  const when = payload?.savedAt || payload?.updatedAt || '';
  const inner = pages
    .map((p, i) => {
      const title = String(p.title || '').trim() || `Notiz ${i + 1}`;
      return `<section><h2>${escapeHtml(title)}</h2>${p.text || '<p>(leer)</p>'}</section>`;
    })
    .join('\n');
  return (
    `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"/>` +
    `<title>Lehrer-Notizen</title>` +
    `<style>body{font-family:Georgia,serif;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.45}` +
    `h1{font-size:1.4rem}h2{margin-top:2rem;border-bottom:1px solid #ccc}` +
    `img{max-width:100%}</style></head><body>` +
    `<h1>Lehrer-Notizen</h1>` +
    (when ? `<p>Stand: ${escapeHtml(when)}</p>` : '') +
    inner +
    `</body></html>`
  );
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type TicketTask = { category?: string; prompt?: string; solution?: string };
type TicketLesson = { lessonName?: string; topicName?: string; tasks?: TicketTask[] };
type TicketSet = { name?: string; notes?: string; lessons?: TicketLesson[] };
type TicketsPayload = { sets?: TicketSet[] };

function ticketBlocks(payload: TicketsPayload | null): PdfBlock[] {
  const sets = Array.isArray(payload?.sets) ? payload!.sets! : [];
  if (!sets.length) return [{ title: 'Entry Tickets', body: 'Keine Sets gefunden.' }];
  const blocks: PdfBlock[] = [];
  for (const set of sets) {
    const lessons = Array.isArray(set.lessons) ? set.lessons : [];
    const notes = htmlToPlain(set.notes || '');
    blocks.push({
      title: set.name || 'Set',
      body: notes ? `Lehrer-Notizen zum Set:\n${notes}` : `${lessons.length} Stunden`,
    });
    for (const lesson of lessons) {
      const tasks = Array.isArray(lesson.tasks) ? lesson.tasks : [];
      if (!tasks.length) continue;
      const body = tasks
        .map((t, i) => {
          const q = htmlToPlain(t.prompt || '');
          const a = htmlToPlain(t.solution || '');
          return `${i + 1}. [${t.category || 'Frage'}] ${q}${a ? `\n   Lösung: ${a}` : ''}`;
        })
        .join('\n\n');
      blocks.push({
        title: `${set.name || 'Set'} · ${lesson.topicName ? `${lesson.topicName} · ` : ''}${lesson.lessonName || 'Stunde'}`,
        body,
      });
    }
  }
  return blocks;
}

function ticketPptx(payload: TicketsPayload | null): PptxSlide[] {
  return ticketBlocks(payload).map((b) => ({ title: b.title || 'Ticket', body: b.body || '' }));
}

function addDirFiles(
  zip: AdmZip,
  dir: string,
  zipPrefix: string,
  seen: Set<string>,
  opts?: { onlyExt?: string[]; keepNewest?: number; nameIncludes?: string }
): number {
  if (!fs.existsSync(dir)) return 0;
  const files: string[] = [];
  walkFiles(dir, files);
  let list = files;
  if (opts?.onlyExt) {
    const allow = new Set(opts.onlyExt.map((e) => e.toLowerCase()));
    list = list.filter((f) => allow.has(path.extname(f).toLowerCase()));
  }
  if (opts?.nameIncludes) {
    const needle = opts.nameIncludes.toLowerCase();
    list = list.filter((f) => path.basename(f).toLowerCase().includes(needle));
  }
  if (opts?.keepNewest) list = newestFiles(list, opts.keepNewest);
  let n = 0;
  for (const full of list) {
    const rel = path.relative(dir, full).replace(/\\/g, '/');
    if (copyFileIntoZip(zip, full, `${zipPrefix}/${rel}`, seen)) n += 1;
  }
  return n;
}

export function ensureDownloadsDir(): string {
  const dir = path.join(jmReihenRoot(), DOWNLOADS_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  const readme = path.join(dir, 'README.txt');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      'Zusätzliche Sicherungen: ZIP vom Dashboard-Button „Alles sichern“\n' +
        'und Extra-Kopien der Notizen/Tickets.\n' +
        'Die Live-Dateien (Lehrer-Schnellnotizen, Präsentationen) werden hier nur kopiert, nie überschrieben.\n',
      'utf8'
    );
  }
  return dir;
}

/** Extra-Kopie der aktuellen Notizen und Tickets — Live-Dateien bleiben unberührt. */
export function writeExtraNotesTicketsCopy(): string {
  const stamp = berlinStamp();
  const dest = path.join(ensureDownloadsDir(), `${stamp}_extra`);
  fs.mkdirSync(dest, { recursive: true });
  const jm = jmReihenRoot();
  const notesLive = path.join(jm, SCRATCH_PAD_LIVE_DIR_NAME);
  const ticketsLive = path.join(jm, JM_TEACHER_BACKUP_DIR.tickets, 'latest.json');
  const notesBackup = path.join(projectRoot(), SCRATCH_PAD_BACKUP_ROOT_NAME);

  const copyIf = (from: string, toName: string) => {
    if (!fs.existsSync(from) || !fs.statSync(from).isFile()) return;
    fs.copyFileSync(from, path.join(dest, toName));
  };

  if (fs.existsSync(notesLive)) {
    const liveNotes: string[] = [];
    walkFiles(notesLive, liveNotes);
    liveNotes.forEach((full) => {
      if (path.basename(full) !== 'latest.json') return;
      const rel = path.relative(notesLive, full).replace(/[\\/]/g, '__');
      fs.copyFileSync(full, path.join(dest, `Notizen-live__${rel}`));
    });
  }
  copyIf(ticketsLive, 'Tickets-latest.json');
  if (fs.existsSync(notesBackup)) {
    const files: string[] = [];
    walkFiles(notesBackup, files);
    for (const full of files) {
      if (path.basename(full) !== 'latest.json') continue;
      if (full.includes(`${path.sep}_extra-sicherung`)) continue;
      const rel = path.relative(notesBackup, full).replace(/[\\/]/g, '__');
      fs.copyFileSync(full, path.join(dest, `Notizen-sicherheit__${rel}`));
    }
  }

  fs.writeFileSync(
    path.join(dest, 'LESE-MICH.txt'),
    `Extra-Kopie ${stamp} (Europe/Berlin).\n` +
      'Nur Kopien. Die gelben Notizen und die Präsentationen wurden nicht überschrieben.\n',
    'utf8'
  );
  return dest;
}

export type TeacherFullArchiveResult = {
  zipPath: string;
  fileName: string;
  extraCopyDir: string;
  counts: {
    presentations: number;
    notesFiles: number;
    ticketFiles: number;
    existingDocs: number;
  };
};

export async function buildTeacherFullArchive(): Promise<TeacherFullArchiveResult> {
  const extraCopyDir = writeExtraNotesTicketsCopy();
  const jm = jmReihenRoot();
  const root = projectRoot();
  const zip = new AdmZip();
  const seen = new Set<string>();
  const stamp = berlinStamp();
  const fileName = `JohnnyMonkey-Alles_${stamp}.zip`;

  const decks = findLiveDecks(jm);
  let existingDocs = 0;
  for (const deckFile of decks) {
    const zipFolder = lessonZipFolder(jm, deckFile);
    const lessonDir = path.dirname(deckFile);
    copyFileIntoZip(zip, deckFile, `${zipFolder}/${DECK_NAME}`, seen);
    copyFileIntoZip(zip, path.join(lessonDir, DECK_ORIGINAL), `${zipFolder}/${DECK_ORIGINAL}`, seen);
    copyFileIntoZip(zip, path.join(lessonDir, ANNOTATIONS), `${zipFolder}/${ANNOTATIONS}`, seen);
    copyFileIntoZip(zip, path.join(lessonDir, PLAY_VARIANTS), `${zipFolder}/${PLAY_VARIANTS}`, seen);
    existingDocs += addExistingDocs(zip, lessonDir, zipFolder, seen);
    addGeneratedDeckExports(zip, deckFile, zipFolder, seen);
  }

  const notesLiveDir = path.join(jm, SCRATCH_PAD_LIVE_DIR_NAME);
  let notesFiles = addDirFiles(zip, notesLiveDir, 'Notizen/live', seen, { onlyExt: ['.json'] });
  notesFiles += addDirFiles(zip, path.join(root, SCRATCH_PAD_BACKUP_ROOT_NAME), 'Notizen/Sicherheitskopien', seen, {
    onlyExt: ['.json'],
  });
  notesFiles += addDirFiles(zip, path.join(jm, JM_TEACHER_BACKUP_DIR.notes), 'Notizen/Backup-Notizen', seen, {
    onlyExt: ['.json', '.txt'],
  });

  const liveNotesFiles: string[] = [];
  if (fs.existsSync(notesLiveDir)) walkFiles(notesLiveDir, liveNotesFiles);
  const firstNotes = liveNotesFiles.find((f) => path.basename(f) === 'latest.json');
  const notesPayload = (firstNotes ? readJson(firstNotes) : null) as NotesPayload | null;
  addBuffer(zip, 'Notizen/Notizen.pdf', buildTextPdf('Lehrer-Notizen', notesBlocks(notesPayload, 'Notizen')), seen);
  addBuffer(zip, 'Notizen/Notizen.pptx', buildTextPptx(notesPptx(notesPayload)), seen);
  addBuffer(zip, 'Notizen/Notizen.html', Buffer.from(notesHtml(notesPayload), 'utf8'), seen);

  const ticketsDir = path.join(jm, JM_TEACHER_BACKUP_DIR.tickets);
  let ticketFiles = addDirFiles(zip, ticketsDir, 'Entry-Tickets/Backup', seen, { onlyExt: ['.json', '.txt'] });
  const ticketsLatest = path.join(ticketsDir, 'latest.json');
  const ticketsPayload = (fs.existsSync(ticketsLatest) ? readJson(ticketsLatest) : null) as TicketsPayload | null;
  addBuffer(
    zip,
    'Entry-Tickets/Entry-Tickets.pdf',
    buildTextPdf('Entry Tickets', ticketBlocks(ticketsPayload)),
    seen
  );
  addBuffer(zip, 'Entry-Tickets/Entry-Tickets.pptx', buildTextPptx(ticketPptx(ticketsPayload)), seen);

  addDirFiles(zip, path.join(jm, FOLIEN_ALLE_BACKUP_DIR_NAME), 'Praesentationen/_Folien-ALLE-BACKUP', seen, {
    onlyExt: ['.json'],
    keepNewest: 40,
  });
  addDirFiles(zip, path.join(jm, JM_TEACHER_BACKUP_DIR.slides), 'Praesentationen/_Backup-Folien', seen, {
    onlyExt: ['.json'],
    keepNewest: 20,
  });
  addDirFiles(zip, path.join(root, 'Presentation-Sicherheitskopien'), 'Praesentationen/_Sicherheitskopien', seen, {
    onlyExt: ['.json'],
    nameIncludes: 'latest',
  });

  const inhalt =
    `JohnnyMonkey — Alles sichern (${stamp}, Europe/Berlin)\n\n` +
    `Präsentationen (live): ${decks.length}\n` +
    `Bereits vorhandene PDF/PPTX aus den Stundenordnern: ${existingDocs}\n` +
    `Zusätzlich je Präsentation: Praesentation-Text.pdf und Praesentation-Text.pptx (Text der Folien).\n` +
    `Notizen-Dateien: ${notesFiles}\n` +
    `Entry-Ticket-Dateien: ${ticketFiles}\n\n` +
    `Ordner:\n` +
    `  Praesentationen/   Live-Decks + Text-PDF/PPTX + vorhandene PDF/PPTX\n` +
    `  Notizen/           PDF, PPTX, HTML + live JSON + Sicherheitskopien\n` +
    `  Entry-Tickets/     PDF, PPTX + Backup-JSON\n\n` +
    `Eine Extra-Kopie liegt außerdem hier auf dem Rechner:\n` +
    `  ${extraCopyDir}\n\n` +
    `Die Live-Notizen und Live-Folien wurden beim Packen nicht überschrieben.\n`;
  addBuffer(zip, '00-INHALT.txt', Buffer.from(inhalt, 'utf8'), seen);

  const downloads = ensureDownloadsDir();
  const zipPath = path.join(downloads, fileName);
  zip.writeZip(zipPath);

  const tmp = path.join(os.tmpdir(), fileName);
  try {
    fs.copyFileSync(zipPath, tmp);
  } catch {
    /* tmp optional */
  }

  return {
    zipPath,
    fileName,
    extraCopyDir,
    counts: {
      presentations: decks.length,
      notesFiles,
      ticketFiles,
      existingDocs,
    },
  };
}

export function teacherFullArchiveDownloadName(): string {
  return `JohnnyMonkey-Alles_${berlinStamp()}.zip`;
}
