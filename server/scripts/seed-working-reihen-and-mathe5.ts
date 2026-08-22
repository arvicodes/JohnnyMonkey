/**
 * Seed: Arbeits-Reihen + Entry-Ticket Mathe 5 / Pfad-Normalisierung in die lokale DB.
 * Run: npx ts-node --transpile-only scripts/seed-working-reihen-and-mathe5.ts
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEACHER_ID = '01ed6e10-397e-446c-9254-2ad7fd4ec777';
const CUSTOM_SETS_PATH = '__entry_ticket_custom_sets__';
const WORKING_REIHEN_PATH = '__dashboard_working_reihen__';

const WORKING_REIHEN = [
  'git-intern/Informatik/MSS Grundthemen/11-04 KI',
  'git-intern/Mathe/Klasse 5',
  'git-intern/Mathe/MSS 12 LK/12-01 Matrizen',
];

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

function toPortable(raw: string): string {
  let p = normalizePath(raw);
  if (!p) return '';
  if (p === '__allgemein__' || p === '__fuer_spaeter__') return p;
  const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
  for (const m of markers) {
    const i = p.indexOf(m);
    if (i >= 0) {
      const rest = p.slice(i + m.length).replace(/^\/+/, '');
      return rest ? `git-intern/${rest}` : 'git-intern';
    }
  }
  if (p.startsWith('/app/J-M-Reihen/')) {
    return `git-intern/${p.slice('/app/J-M-Reihen/'.length)}`;
  }
  if (p.startsWith('Mathe/') || p.startsWith('Informatik/')) {
    return `git-intern/${p}`;
  }
  return p;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

type Lesson = {
  id?: string;
  lessonName: string;
  lessonKey?: string;
  topicName?: string;
  tasks?: unknown[];
};

type CustomSet = {
  id: string;
  name: string;
  reihePath?: string;
  notes?: string;
  lessons: Lesson[];
};

function isStundeFolderName(name: string): boolean {
  const t = (name || '').trim();
  if (!t || t.startsWith('.')) return false;
  if (/^(Kap\.?\s*\d+|Kapitel\s*\d+)/i.test(t)) return false;
  if (/^\d{1,2}[-–\s]\d{2}(\b|\s|$)/.test(t)) return false;
  if (/^\d+\s+/.test(t) && !/^\d+\.\d+/.test(t)) return false;
  if (/^Rohdat/i.test(t) || /Sicherheitskopie/i.test(t) || /BACKUP/i.test(t)) return false;
  if (/wochenaufgaben/i.test(t)) return false;
  return true;
}

function collectStunden(
  absDir: string,
  portableBase: string,
  topicName: string | undefined,
  out: { lessonName: string; lessonKey: string; topicName?: string }[],
): void {
  if (!fs.existsSync(absDir)) return;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    const name = ent.name;
    const absChild = path.join(absDir, name);
    const portableChild = `${portableBase}/${name}`;

    if (/wochenaufgaben/i.test(name) || /^Grafiken$/i.test(name)) continue;

    if (/^(Kap\.?\s*\d+|Kapitel\s*\d+)/i.test(name) || (/^\d+\s+/.test(name) && !/^\d+\.\d+/.test(name))) {
      collectStunden(absChild, portableChild, name, out);
      continue;
    }
    if (isStundeFolderName(name)) {
      out.push({ lessonName: name, lessonKey: portableChild, topicName });
      continue;
    }
    collectStunden(absChild, portableChild, topicName, out);
  }
}

function mergeLessonsIntoSet(
  set: CustomSet,
  reihePath: string,
  discovered: { lessonName: string; lessonKey: string; topicName?: string }[],
): CustomSet {
  set.reihePath = reihePath;
  const byKey = new Map<string, Lesson>();
  const byName = new Map<string, Lesson>();
  for (const L of set.lessons || []) {
    if (L.lessonKey) byKey.set(normalizePath(L.lessonKey), L);
    if (L.lessonName) byName.set(L.lessonName.trim().toLowerCase(), L);
  }

  const general = set.lessons.find(
    (l) => l.lessonKey === '__allgemein__' || (l.lessonName || '').toLowerCase() === 'allgemein',
  );
  const later = set.lessons.find(
    (l) =>
      l.lessonKey === '__fuer_spaeter__' ||
      (l.lessonName || '').toLowerCase().includes('später') ||
      (l.lessonName || '').toLowerCase().includes('spaeter'),
  );

  const middle: Lesson[] = [];
  const discoveredKeys = new Set(discovered.map((d) => normalizePath(d.lessonKey)));
  for (const d of discovered) {
    const existing =
      byKey.get(normalizePath(d.lessonKey)) ||
      byKey.get(toPortable(d.lessonKey)) ||
      byName.get(d.lessonName.trim().toLowerCase());
    if (existing) {
      existing.lessonKey = d.lessonKey;
      existing.lessonName = d.lessonName;
      if (d.topicName) existing.topicName = d.topicName;
      middle.push(existing);
    } else {
      middle.push({
        id: makeId('ls'),
        lessonName: d.lessonName,
        lessonKey: d.lessonKey,
        topicName: d.topicName,
        tasks: [],
      });
    }
  }

  // Keep other non-special lessons with tasks that weren't rediscovered
  const used = new Set(middle.map((m) => m.id));
  for (const L of set.lessons) {
    if (L === general || L === later) continue;
    if (used.has(L.id)) continue;
    const key = L.lessonKey ? toPortable(L.lessonKey) : '';
    if (key === '__allgemein__' || key === '__fuer_spaeter__') continue;
    if (/wochenaufgaben/i.test(key) || /\/Grafiken$/i.test(key) || /^Grafiken$/i.test(L.lessonName || '')) {
      continue; // drop junk folders
    }
    if (discoveredKeys.has(key)) continue;
    if (middle.some((m) => m.lessonName === L.lessonName && !(L.tasks && L.tasks.length))) continue;
    if (L.lessonKey) L.lessonKey = toPortable(L.lessonKey);
    if (/wissen\s+aus\s+der\s+11/i.test(L.lessonName || '')) {
      if (general) {
        const seen = new Set(
          (general.tasks || []).map((t) => `${(t.prompt || '').trim()}\n${(t.solution || '').trim()}`),
        );
        for (const t of L.tasks || []) {
          const k = `${(t.prompt || '').trim()}\n${(t.solution || '').trim()}`;
          if (seen.has(k)) continue;
          seen.add(k);
          general.tasks = [...(general.tasks || []), t];
        }
      }
      continue;
    }
    // Keep if it has tasks
    if ((L.tasks && L.tasks.length > 0) || !key) {
      middle.push(L);
    }
  }

  middle.sort((a, b) =>
    (a.lessonName || '').localeCompare(b.lessonName || '', 'de', { numeric: true }),
  );

  const nextLessons: Lesson[] = [];
  if (general) {
    general.lessonKey = '__allgemein__';
    general.lessonName = general.lessonName || 'Allgemein';
    nextLessons.push(general);
  } else {
    nextLessons.push({
      id: makeId('ls'),
      lessonName: 'Allgemein',
      lessonKey: '__allgemein__',
      topicName: 'Allgemein',
      tasks: [],
    });
  }
  nextLessons.push(...middle);
  if (later) {
    later.lessonKey = '__fuer_spaeter__';
    later.lessonName = later.lessonName || 'Für später';
    nextLessons.push(later);
  } else {
    nextLessons.push({
      id: makeId('ls'),
      lessonName: 'Für später',
      lessonKey: '__fuer_spaeter__',
      topicName: 'Für später',
      tasks: [],
    });
  }
  set.lessons = nextLessons;
  return set;
}

function normalizeSetPaths(set: CustomSet): CustomSet {
  if (set.reihePath) set.reihePath = toPortable(set.reihePath);
  for (const L of set.lessons || []) {
    if (L.lessonKey) L.lessonKey = toPortable(L.lessonKey);
  }
  return set;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../..');
  const jmReihen = path.join(repoRoot, 'J-M-Reihen');

  // 1) Working Reihen
  await prisma.teacherLessonInstruction.upsert({
    where: {
      teacherId_lessonPath: { teacherId: TEACHER_ID, lessonPath: WORKING_REIHEN_PATH },
    },
    create: {
      teacherId: TEACHER_ID,
      lessonPath: WORKING_REIHEN_PATH,
      content: JSON.stringify({ paths: WORKING_REIHEN, updatedAt: new Date().toISOString() }),
    },
    update: {
      content: JSON.stringify({ paths: WORKING_REIHEN, updatedAt: new Date().toISOString() }),
    },
  });
  console.log('Working Reihen seeded:', WORKING_REIHEN.length);

  // 2) Custom sets
  const row = await prisma.teacherLessonInstruction.findUnique({
    where: {
      teacherId_lessonPath: { teacherId: TEACHER_ID, lessonPath: CUSTOM_SETS_PATH },
    },
  });
  if (!row?.content) {
    throw new Error('No custom sets row found');
  }
  const parsed = JSON.parse(row.content) as { sets: CustomSet[] };
  const sets = Array.isArray(parsed.sets) ? parsed.sets : [];

  for (const set of sets) {
    normalizeSetPaths(set);
  }

  const mathe5 = sets.find((s) => (s.name || '').trim().toLowerCase() === 'mathe 5');
  if (mathe5) {
    const abs = path.join(jmReihen, 'Mathe', 'Klasse 5');
    const portable = 'git-intern/Mathe/Klasse 5';
    const discovered: { lessonName: string; lessonKey: string; topicName?: string }[] = [];
    collectStunden(abs, portable, undefined, discovered);
    mergeLessonsIntoSet(mathe5, portable, discovered);
    console.log(
      `Mathe 5: reihePath=${mathe5.reihePath}, lessons=${mathe5.lessons.length}, stunden=${discovered.length}`,
    );
  } else {
    console.warn('Mathe 5 set not found — creating');
    const abs = path.join(jmReihen, 'Mathe', 'Klasse 5');
    const portable = 'git-intern/Mathe/Klasse 5';
    const discovered: { lessonName: string; lessonKey: string; topicName?: string }[] = [];
    collectStunden(abs, portable, undefined, discovered);
    const created: CustomSet = {
      id: `c_${Date.now().toString(36)}`,
      name: 'Mathe 5',
      reihePath: portable,
      lessons: [],
    };
    mergeLessonsIntoSet(created, portable, discovered);
    sets.push(created);
  }

  const ki = sets.find((s) => (s.name || '').trim().toLowerCase() === 'ki');
  if (ki) {
    const abs = path.join(jmReihen, 'Informatik', 'MSS Grundthemen', '11-04 KI');
    const portable = 'git-intern/Informatik/MSS Grundthemen/11-04 KI';
    const discovered: { lessonName: string; lessonKey: string; topicName?: string }[] = [];
    collectStunden(abs, portable, undefined, discovered);
    mergeLessonsIntoSet(ki, portable, discovered);
    console.log(`KI: reihePath=${ki.reihePath}, lessons=${ki.lessons.length}, stunden=${discovered.length}`);
  }

  const lk = sets.find((s) => (s.name || '').trim().toLowerCase() === 'lk mathe');
  if (lk) {
    const abs = path.join(jmReihen, 'Mathe', 'MSS 12 LK', '12-01 Matrizen');
    const portable = 'git-intern/Mathe/MSS 12 LK/12-01 Matrizen';
    if (fs.existsSync(abs)) {
      const discovered: { lessonName: string; lessonKey: string; topicName?: string }[] = [];
      collectStunden(abs, portable, undefined, discovered);
      mergeLessonsIntoSet(lk, portable, discovered);
      console.log(
        `LK Mathe: reihePath=${lk.reihePath}, lessons=${lk.lessons.length}, stunden=${discovered.length}`,
      );
    } else {
      lk.reihePath = portable;
      console.log('LK Mathe: set reihePath only (folder missing?)');
    }
  }

  await prisma.teacherLessonInstruction.update({
    where: {
      teacherId_lessonPath: { teacherId: TEACHER_ID, lessonPath: CUSTOM_SETS_PATH },
    },
    data: {
      content: JSON.stringify({ sets }),
    },
  });
  console.log('Custom sets updated:', sets.map((s) => `${s.name}(${s.lessons?.length || 0})`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
