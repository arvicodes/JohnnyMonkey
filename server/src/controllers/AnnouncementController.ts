import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  FOLDER_ANNOUNCEMENT_AUTHOR_ID,
  createFolderAnnouncement,
  deleteFolderAnnouncement,
  findFolderSlugByAnnouncementId,
  getFolderAnnouncementReadIds,
  loadFolderAnnouncementListItems,
  loadFolderAnnouncements,
  markFolderAnnouncementRead,
  readFolderFlyerHtml,
  setFolderAnnouncementPublished,
  updateFolderAnnouncement,
} from '../utils/folderAnnouncements';

const prisma = new PrismaClient();

const ANNOUNCEMENT_INDEX_PATH = '__announcements_index__';
const announcementDataPath = (id: string) => `__announcements_a_${id}__`;

type AnnouncementLink = {
  label: string;
  url: string;
};

type AnnouncementPayload = {
  id: string;
  title: string;
  body: string;
  links: AnnouncementLink[];
  publishedAt: string | null;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
};

type AnnouncementIndexPayload = {
  version: 1;
  announcements: Array<{
    id: string;
    title: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

const emptyIndex = (): AnnouncementIndexPayload => ({
  version: 1,
  announcements: [],
});

const parseIndex = (raw: string | null | undefined): AnnouncementIndexPayload => {
  if (!raw) return emptyIndex();
  try {
    const parsed = JSON.parse(raw) as AnnouncementIndexPayload;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.announcements)) return emptyIndex();
    return parsed;
  } catch {
    return emptyIndex();
  }
};

const parseAnnouncement = (raw: string | null | undefined): AnnouncementPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AnnouncementPayload;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.title !== 'string') return null;
    if (typeof parsed.body !== 'string') parsed.body = '';
    if (!Array.isArray(parsed.links)) parsed.links = [];
    if (!Array.isArray(parsed.readBy)) parsed.readBy = [];
    return parsed;
  } catch {
    return null;
  }
};

const normalizeLinks = (raw: unknown): AnnouncementLink[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const label = typeof (item as AnnouncementLink).label === 'string' ? (item as AnnouncementLink).label.trim() : '';
      const url = typeof (item as AnnouncementLink).url === 'string' ? (item as AnnouncementLink).url.trim() : '';
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((item): item is AnnouncementLink => Boolean(item));
};

const getUserByLoginCode = async (req: Request) => {
  const raw = req.headers['x-login-code'] as string | undefined;
  const loginCode = typeof raw === 'string' ? raw.trim() : '';
  if (!loginCode) return null;
  let user = await prisma.user.findUnique({
    where: { loginCode },
    select: { id: true, name: true, role: true },
  });
  if (!user) {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; role: string }>>(
      Prisma.sql`SELECT id, name, role FROM User WHERE lower(loginCode) = lower(${loginCode}) LIMIT 1`,
    );
    user = rows[0] ?? null;
  }
  return user;
};

const readRow = async (teacherId: string, lessonPath: string) => {
  const row = await prisma.teacherLessonInstruction.findUnique({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
    select: { content: true },
  });
  return row?.content ?? null;
};

const writeRow = async (teacherId: string, lessonPath: string, content: string) => {
  await prisma.teacherLessonInstruction.upsert({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
    create: { teacherId, lessonPath, content },
    update: { content },
  });
};

const deleteRow = async (teacherId: string, lessonPath: string) => {
  await prisma.teacherLessonInstruction.deleteMany({
    where: { teacherId, lessonPath },
  });
};

const loadTeacherIndex = async (teacherId: string) =>
  parseIndex(await readRow(teacherId, ANNOUNCEMENT_INDEX_PATH));

const saveIndex = async (teacherId: string, index: AnnouncementIndexPayload) => {
  await writeRow(teacherId, ANNOUNCEMENT_INDEX_PATH, JSON.stringify(index));
};

const loadAnnouncement = async (teacherId: string, id: string) => {
  const raw = await readRow(teacherId, announcementDataPath(id));
  return parseAnnouncement(raw);
};

const saveAnnouncement = async (teacherId: string, data: AnnouncementPayload) => {
  data.updatedAt = new Date().toISOString();
  await writeRow(teacherId, announcementDataPath(data.id), JSON.stringify(data));
  return data;
};

const syncIndexEntry = (index: AnnouncementIndexPayload, data: AnnouncementPayload) => {
  const entry = {
    id: data.id,
    title: data.title,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  const i = index.announcements.findIndex((e) => e.id === data.id);
  if (i >= 0) index.announcements[i] = entry;
  else index.announcements.push(entry);
  index.announcements.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

const loadAllPublishedAnnouncements = async () => {
  const rows = await prisma.teacherLessonInstruction.findMany({
    where: { lessonPath: { startsWith: '__announcements_a_' } },
    select: {
      content: true,
      teacherId: true,
      teacher: { select: { name: true } },
    },
  });

  const dbItems = rows
    .map((row) => {
      const data = parseAnnouncement(row.content);
      if (!data?.publishedAt) return null;
      return {
        id: data.id,
        title: data.title,
        body: data.body,
        links: data.links,
        publishedAt: data.publishedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        authorId: row.teacherId,
        authorName: row.teacher.name,
        isRead: false,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const folderItems = loadFolderAnnouncements().map((item) => ({
    id: item.id,
    title: item.title,
    body: item.body,
    links: item.links,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    authorId: item.authorId,
    authorName: item.authorName,
    isRead: false,
    fromFolder: true as const,
    folderSlug: item.folderSlug,
  }));

  return [...folderItems, ...dbItems].sort(
    (a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime(),
  );
};

const toListItem = async (teacherId: string, meta: AnnouncementIndexPayload['announcements'][0]) => {
  const data = await loadAnnouncement(teacherId, meta.id);
  return {
    ...meta,
    body: data?.body ?? '',
    links: data?.links ?? [],
    readCount: data?.readBy.length ?? 0,
    isPublished: Boolean(meta.publishedAt),
  };
};

export class AnnouncementController {
  static async list(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      return res.json({ announcements: loadFolderAnnouncementListItems() });
    } catch (error) {
      console.error('Announcement list error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Ankündigungen' });
    }
  }

  /** Legt Ordner unter J-M-Reihen/Ankündigungen & Briefe/ an */
  static async createFolder(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      const folderName = typeof req.body?.folderName === 'string' ? req.body.folderName.trim() : '';
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

      const announcement = createFolderAnnouncement({
        title,
        folderName: folderName || undefined,
        body,
        authorName: user.name,
      });

      return res.json({ success: true, announcement });
    } catch (error) {
      console.error('Announcement createFolder error:', error);
      const msg = error instanceof Error ? error.message : 'Fehler beim Erstellen';
      return res.status(500).json({ error: msg });
    }
  }

  static async updateFolder(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const folderSlug = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
      if (!folderSlug) return res.status(400).json({ error: 'Ordner fehlt' });

      const announcement = updateFolderAnnouncement(folderSlug, {
        title: typeof req.body?.title === 'string' ? req.body.title : undefined,
        body: typeof req.body?.body === 'string' ? req.body.body : undefined,
        links: Array.isArray(req.body?.links) ? req.body.links : undefined,
      });

      return res.json({ success: true, announcement });
    } catch (error) {
      console.error('Announcement updateFolder error:', error);
      const msg = error instanceof Error ? error.message : 'Fehler beim Speichern';
      return res.status(error instanceof Error && error.message.includes('nicht gefunden') ? 404 : 500).json({ error: msg });
    }
  }

  static async publishFolder(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const folderSlug = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
      if (!folderSlug) return res.status(400).json({ error: 'Ordner fehlt' });

      const unpublish = req.body?.unpublish === true;
      const announcement = setFolderAnnouncementPublished(folderSlug, !unpublish);

      return res.json({ success: true, announcement, published: !unpublish });
    } catch (error) {
      console.error('Announcement publishFolder error:', error);
      const msg = error instanceof Error ? error.message : 'Fehler beim Veröffentlichen';
      return res.status(404).json({ error: msg });
    }
  }

  static async removeFolder(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const folderSlug = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
      if (!folderSlug) return res.status(400).json({ error: 'Ordner fehlt' });

      deleteFolderAnnouncement(folderSlug);
      return res.json({ success: true });
    } catch (error) {
      console.error('Announcement removeFolder error:', error);
      const msg = error instanceof Error ? error.message : 'Fehler beim Löschen';
      return res.status(404).json({ error: msg });
    }
  }

  static async create(req: Request, res: Response) {
    return AnnouncementController.createFolder(req, res);
  }

  static async update(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      if (!id) return res.status(400).json({ error: 'ID fehlt' });

      const existing = await loadAnnouncement(user.id, id);
      if (!existing) return res.status(404).json({ error: 'Ankündigung nicht gefunden' });

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      const next: AnnouncementPayload = {
        ...existing,
        title,
        body: typeof req.body?.body === 'string' ? req.body.body.trim() : existing.body,
        links: Array.isArray(req.body?.links) ? normalizeLinks(req.body.links) : existing.links,
      };

      await saveAnnouncement(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      await saveIndex(user.id, index);

      return res.json({ success: true, announcement: next });
    } catch (error) {
      console.error('Announcement update error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async publishById(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      if (!id) return res.status(400).json({ error: 'ID fehlt' });

      const existing = await loadAnnouncement(user.id, id);
      if (!existing) return res.status(404).json({ error: 'Ankündigung nicht gefunden' });

      const unpublish = req.body?.unpublish === true;
      const publishedAt = unpublish ? null : new Date().toISOString();
      const next: AnnouncementPayload = { ...existing, publishedAt };

      await saveAnnouncement(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      await saveIndex(user.id, index);

      return res.json({
        success: true,
        publishedAt,
        announcement: next,
      });
    } catch (error) {
      console.error('Announcement publish error:', error);
      return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      if (!id) return res.status(400).json({ error: 'ID fehlt' });

      const existing = await loadAnnouncement(user.id, id);
      if (!existing) return res.status(404).json({ error: 'Ankündigung nicht gefunden' });

      await deleteRow(user.id, announcementDataPath(id));
      const index = await loadTeacherIndex(user.id);
      index.announcements = index.announcements.filter((e) => e.id !== id);
      await saveIndex(user.id, index);

      return res.json({ success: true });
    } catch (error) {
      console.error('Announcement remove error:', error);
      return res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }

  static async getCurrent(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      if (user.role === 'TEACHER') {
        const index = await loadTeacherIndex(user.id);
        const publishedGlobal = await loadAllPublishedAnnouncements();
        return res.json({
          teacherId: user.id,
          announcementCount: index.announcements.length,
          publishedCount: index.announcements.filter((a) => a.publishedAt).length,
          globalPublishedCount: publishedGlobal.length,
        });
      }

      const all = await loadAllPublishedAnnouncements();
      const announcements = all.map((a) => ({
        ...a,
        isRead: false,
      }));

      const rows = await prisma.teacherLessonInstruction.findMany({
        where: { lessonPath: { startsWith: '__announcements_a_' } },
        select: { content: true, teacherId: true },
      });

      const readIds = getFolderAnnouncementReadIds(user.id);
      for (const row of rows) {
        const data = parseAnnouncement(row.content);
        if (!data?.publishedAt) continue;
        if (data.readBy.includes(user.id)) {
          readIds.add(`${row.teacherId}::${data.id}`);
        }
      }

      const withRead = announcements.map((a) => ({
        ...a,
        isRead: readIds.has(`${a.authorId}::${a.id}`),
      }));

      const unreadCount = withRead.filter((a) => !a.isRead).length;

      return res.json({
        announcements: withRead,
        unreadCount,
        hasPublished: withRead.length > 0,
      });
    } catch (error) {
      console.error('Announcement getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  static async markRead(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      const teacherId = typeof req.body?.teacherId === 'string' ? req.body.teacherId.trim() : '';
      const announcementId = typeof req.body?.announcementId === 'string' ? req.body.announcementId.trim() : '';
      if (!teacherId || !announcementId) {
        return res.status(400).json({ error: 'teacherId und announcementId erforderlich' });
      }

      if (teacherId === FOLDER_ANNOUNCEMENT_AUTHOR_ID) {
        const folderSlug =
          typeof req.body?.folderSlug === 'string'
            ? req.body.folderSlug.trim()
            : findFolderSlugByAnnouncementId(announcementId);
        if (!folderSlug) {
          return res.status(404).json({ error: 'Ordner-Ankündigung nicht gefunden' });
        }
        markFolderAnnouncementRead(folderSlug, announcementId, user.id);
        return res.json({ success: true });
      }

      const data = await loadAnnouncement(teacherId, announcementId);
      if (!data?.publishedAt) {
        return res.status(404).json({ error: 'Ankündigung nicht gefunden oder nicht freigegeben' });
      }

      if (!data.readBy.includes(user.id)) {
        data.readBy.push(user.id);
        await saveAnnouncement(teacherId, data);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Announcement markRead error:', error);
      return res.status(500).json({ error: 'Fehler beim Markieren' });
    }
  }

  /** HTML-Flyer aus Ordner ausliefern (Vorschau & Druck) */
  static async serveFlyer(req: Request, res: Response) {
    try {
      const raw = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
      const folderSlug = raw ? decodeURIComponent(raw) : '';
      if (!folderSlug) return res.status(400).send('Ordner fehlt');

      const html = readFolderFlyerHtml(folderSlug);
      if (!html) {
        return res.status(404).send('Kein Flyer (.html) in diesem Ordner gefunden.');
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      console.error('Announcement serveFlyer error:', error);
      return res.status(500).send('Flyer konnte nicht geladen werden.');
    }
  }
}
