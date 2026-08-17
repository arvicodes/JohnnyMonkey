/**
 * Einmalig lokal: Schnellnotizen + Pfade in die DB bringen.
 *   cd server && npx ts-node scripts/migrate-local-state-into-db.ts
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  SCRATCH_PAD_DB_PATH,
  scratchPadUserFolderKey,
  writeScratchPad,
  type ScratchPadPayload,
} from '../src/utils/teacherScratchPadStore';

const prisma = new PrismaClient();

const MAC_ROOT = '/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/';
const APP_ROOT = '/app/J-M-Reihen/';

function toGitInternPath(raw: string): string {
  let p = String(raw || '').replace(/\\/g, '/').trim();
  if (!p) return p;
  if (p.startsWith(MAC_ROOT)) p = `git-intern/${p.slice(MAC_ROOT.length)}`;
  else if (p.startsWith(APP_ROOT)) p = `git-intern/${p.slice(APP_ROOT.length)}`;
  else if (p.startsWith('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/')) {
    p = `git-intern/${p.slice('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/'.length)}`;
  }
  // NFC for umlauts consistency
  return p.normalize('NFC');
}

function rewriteEmbeddedPaths(text: string): string {
  return text
    .split(MAC_ROOT)
    .join('git-intern/')
    .split(APP_ROOT)
    .join('git-intern/')
    .split('/Users/verachrist/Documents/MEINE_APP/JohnnyMonkey/J-M-Reihen/')
    .join('git-intern/');
}

async function migrateScratchPad() {
  const teacher = await prisma.user.findFirst({
    where: { role: 'TEACHER', loginCode: 'Pan8' },
  });
  if (!teacher) throw new Error('Lehrkraft Pan8 nicht gefunden');

  const key = scratchPadUserFolderKey(teacher.id, teacher.name);
  const livePath = path.join(
    process.cwd(),
    '..',
    'J-M-Reihen',
    'Lehrer-Schnellnotizen',
    key,
    'latest.json'
  );
  const altLive = path.resolve(__dirname, '../../../J-M-Reihen/Lehrer-Schnellnotizen', key, 'latest.json');
  const filePath = fs.existsSync(livePath) ? livePath : altLive;
  if (!fs.existsSync(filePath)) {
    console.warn('Keine Notiz-Datei gefunden unter', filePath);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ScratchPadPayload;
  if (!Array.isArray(raw.pages)) throw new Error('Notiz-Datei ohne pages');

  const payload: ScratchPadPayload = {
    ...raw,
    userId: teacher.id,
    userName: teacher.name,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    savedAt: new Date().toISOString(),
  };

  await prisma.teacherLessonInstruction.upsert({
    where: {
      teacherId_lessonPath: { teacherId: teacher.id, lessonPath: SCRATCH_PAD_DB_PATH },
    },
    create: {
      teacherId: teacher.id,
      lessonPath: SCRATCH_PAD_DB_PATH,
      content: JSON.stringify(payload),
    },
    update: {
      content: JSON.stringify(payload),
    },
  });
  writeScratchPad(key, payload);
  console.log('✅ Schnellnotizen in DB:', SCRATCH_PAD_DB_PATH, 'pages=', payload.pages.length);
}

async function normalizeInstructionPaths() {
  const rows = await prisma.teacherLessonInstruction.findMany();
  let pathChanged = 0;
  let contentChanged = 0;
  let merged = 0;

  for (const row of rows) {
    const newPath = toGitInternPath(row.lessonPath);
    const newContent = rewriteEmbeddedPaths(row.content || '{}');
    const pathNeeds = newPath !== row.lessonPath;
    const contentNeeds = newContent !== row.content;

    if (!pathNeeds && !contentNeeds) continue;

    if (pathNeeds) {
      const existing = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: { teacherId: row.teacherId, lessonPath: newPath },
        },
      });
      if (existing && existing.id !== row.id) {
        // Behalte den neueren/längeren Content, lösche Duplikat mit Mac-Pfad
        const prefer =
          (existing.content || '').length >= (newContent || '').length ? existing.content : newContent;
        const preferRewritten = rewriteEmbeddedPaths(prefer || '{}');
        await prisma.teacherLessonInstruction.update({
          where: { id: existing.id },
          data: { content: preferRewritten },
        });
        await prisma.teacherLessonInstruction.delete({ where: { id: row.id } });
        merged += 1;
        continue;
      }
      await prisma.teacherLessonInstruction.update({
        where: { id: row.id },
        data: {
          lessonPath: newPath,
          content: contentNeeds ? newContent : row.content,
        },
      });
      pathChanged += 1;
      if (contentNeeds) contentChanged += 1;
    } else if (contentNeeds) {
      await prisma.teacherLessonInstruction.update({
        where: { id: row.id },
        data: { content: newContent },
      });
      contentChanged += 1;
    }
  }
  console.log('✅ Pfade normalisiert:', { pathChanged, contentChanged, merged });
}

async function main() {
  await migrateScratchPad();
  await normalizeInstructionPaths();
  const sets = await prisma.teacherLessonInstruction.findFirst({
    where: { lessonPath: '__entry_ticket_custom_sets__' },
  });
  if (sets) {
    const parsed = JSON.parse(sets.content || '{}');
    console.log(
      '✅ Entry-Ticket-Sets:',
      (parsed.sets || []).map((s: { name?: string; lessons?: unknown[] }) => ({
        name: s.name,
        lessons: (s.lessons || []).length,
        tasks: (s.lessons || []).reduce(
          (n: number, l: { tasks?: unknown[] }) => n + ((l.tasks || []).length || 0),
          0
        ),
      }))
    );
  }
  for (const name of ['Klasse 5a', 'Klasse 5c']) {
    const g = await prisma.learningGroup.findFirst({ where: { name } });
    if (!g) continue;
    const count = await prisma.user.count({
      where: { role: 'STUDENT', groups: { some: { id: g.id } } },
    });
    console.log(`ℹ️  ${name}: ${count} SuS in DB (0 = noch kein Import)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
