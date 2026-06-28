"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const client_1 = require("@prisma/client");
const folderAnnouncements_1 = require("../utils/folderAnnouncements");
const prisma = new client_1.PrismaClient();
const ANNOUNCEMENT_INDEX_PATH = '__announcements_index__';
const announcementDataPath = (id) => `__announcements_a_${id}__`;
const emptyIndex = () => ({
    version: 1,
    announcements: [],
});
const parseIndex = (raw) => {
    if (!raw)
        return emptyIndex();
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.announcements))
            return emptyIndex();
        return parsed;
    }
    catch {
        return emptyIndex();
    }
};
const parseAnnouncement = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.id !== 'string' || typeof parsed.title !== 'string')
            return null;
        if (typeof parsed.body !== 'string')
            parsed.body = '';
        if (!Array.isArray(parsed.links))
            parsed.links = [];
        if (!Array.isArray(parsed.readBy))
            parsed.readBy = [];
        return parsed;
    }
    catch {
        return null;
    }
};
const normalizeLinks = (raw) => {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((item) => {
        if (!item || typeof item !== 'object')
            return null;
        const label = typeof item.label === 'string' ? item.label.trim() : '';
        const url = typeof item.url === 'string' ? item.url.trim() : '';
        if (!label || !url)
            return null;
        return { label, url };
    })
        .filter((item) => Boolean(item));
};
const getUserByLoginCode = async (req) => {
    var _a;
    const raw = req.headers['x-login-code'];
    const loginCode = typeof raw === 'string' ? raw.trim() : '';
    if (!loginCode)
        return null;
    let user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, name: true, role: true },
    });
    if (!user) {
        const rows = await prisma.$queryRaw(client_1.Prisma.sql `SELECT id, name, role FROM User WHERE lower(loginCode) = lower(${loginCode}) LIMIT 1`);
        user = (_a = rows[0]) !== null && _a !== void 0 ? _a : null;
    }
    return user;
};
const readRow = async (teacherId, lessonPath) => {
    var _a;
    const row = await prisma.teacherLessonInstruction.findUnique({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        select: { content: true },
    });
    return (_a = row === null || row === void 0 ? void 0 : row.content) !== null && _a !== void 0 ? _a : null;
};
const writeRow = async (teacherId, lessonPath, content) => {
    await prisma.teacherLessonInstruction.upsert({
        where: { teacherId_lessonPath: { teacherId, lessonPath } },
        create: { teacherId, lessonPath, content },
        update: { content },
    });
};
const deleteRow = async (teacherId, lessonPath) => {
    await prisma.teacherLessonInstruction.deleteMany({
        where: { teacherId, lessonPath },
    });
};
const loadTeacherIndex = async (teacherId) => parseIndex(await readRow(teacherId, ANNOUNCEMENT_INDEX_PATH));
const saveIndex = async (teacherId, index) => {
    await writeRow(teacherId, ANNOUNCEMENT_INDEX_PATH, JSON.stringify(index));
};
const loadAnnouncement = async (teacherId, id) => {
    const raw = await readRow(teacherId, announcementDataPath(id));
    return parseAnnouncement(raw);
};
const saveAnnouncement = async (teacherId, data) => {
    data.updatedAt = new Date().toISOString();
    await writeRow(teacherId, announcementDataPath(data.id), JSON.stringify(data));
    return data;
};
const syncIndexEntry = (index, data) => {
    const entry = {
        id: data.id,
        title: data.title,
        publishedAt: data.publishedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
    const i = index.announcements.findIndex((e) => e.id === data.id);
    if (i >= 0)
        index.announcements[i] = entry;
    else
        index.announcements.push(entry);
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
        if (!(data === null || data === void 0 ? void 0 : data.publishedAt))
            return null;
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
        .filter((item) => Boolean(item));
    const folderItems = (0, folderAnnouncements_1.loadFolderAnnouncements)().map((item) => ({
        ...item,
        isRead: false,
    }));
    return [...folderItems, ...dbItems].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};
const toListItem = async (teacherId, meta) => {
    var _a, _b, _c;
    const data = await loadAnnouncement(teacherId, meta.id);
    return {
        ...meta,
        body: (_a = data === null || data === void 0 ? void 0 : data.body) !== null && _a !== void 0 ? _a : '',
        links: (_b = data === null || data === void 0 ? void 0 : data.links) !== null && _b !== void 0 ? _b : [],
        readCount: (_c = data === null || data === void 0 ? void 0 : data.readBy.length) !== null && _c !== void 0 ? _c : 0,
        isPublished: Boolean(meta.publishedAt),
    };
};
class AnnouncementController {
    static async list(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            return res.json({ announcements: (0, folderAnnouncements_1.loadFolderAnnouncementListItems)() });
        }
        catch (error) {
            console.error('Announcement list error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden der Ankündigungen' });
        }
    }
    /** Legt Ordner unter J-M-Reihen/Ankündigungen & Briefe/ an */
    static async createFolder(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : '';
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const folderName = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.folderName) === 'string' ? req.body.folderName.trim() : '';
            const body = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.body) === 'string' ? req.body.body.trim() : '';
            const announcement = (0, folderAnnouncements_1.createFolderAnnouncement)({
                title,
                folderName: folderName || undefined,
                body,
                authorName: user.name,
            });
            return res.json({ success: true, announcement });
        }
        catch (error) {
            console.error('Announcement createFolder error:', error);
            const msg = error instanceof Error ? error.message : 'Fehler beim Erstellen';
            return res.status(500).json({ error: msg });
        }
    }
    static async updateFolder(req, res) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const folderSlug = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            if (!folderSlug)
                return res.status(400).json({ error: 'Ordner fehlt' });
            const announcement = (0, folderAnnouncements_1.updateFolderAnnouncement)(folderSlug, {
                title: typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title : undefined,
                body: typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.body) === 'string' ? req.body.body : undefined,
                links: Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.links) ? req.body.links : undefined,
                images: Array.isArray((_d = req.body) === null || _d === void 0 ? void 0 : _d.images) ? req.body.images : undefined,
                layoutId: ((_e = req.body) === null || _e === void 0 ? void 0 : _e.layoutId) === null
                    ? null
                    : typeof ((_f = req.body) === null || _f === void 0 ? void 0 : _f.layoutId) === 'string'
                        ? req.body.layoutId
                        : undefined,
            });
            return res.json({ success: true, announcement });
        }
        catch (error) {
            console.error('Announcement updateFolder error:', error);
            const msg = error instanceof Error ? error.message : 'Fehler beim Speichern';
            return res.status(error instanceof Error && error.message.includes('nicht gefunden') ? 404 : 500).json({ error: msg });
        }
    }
    static async publishFolder(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const folderSlug = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            if (!folderSlug)
                return res.status(400).json({ error: 'Ordner fehlt' });
            const unpublish = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.unpublish) === true;
            const announcement = (0, folderAnnouncements_1.setFolderAnnouncementPublished)(folderSlug, !unpublish);
            return res.json({ success: true, announcement, published: !unpublish });
        }
        catch (error) {
            console.error('Announcement publishFolder error:', error);
            const msg = error instanceof Error ? error.message : 'Fehler beim Veröffentlichen';
            return res.status(404).json({ error: msg });
        }
    }
    static async removeFolder(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const folderSlug = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            if (!folderSlug)
                return res.status(400).json({ error: 'Ordner fehlt' });
            (0, folderAnnouncements_1.deleteFolderAnnouncement)(folderSlug);
            return res.json({ success: true });
        }
        catch (error) {
            console.error('Announcement removeFolder error:', error);
            const msg = error instanceof Error ? error.message : 'Fehler beim Löschen';
            return res.status(404).json({ error: msg });
        }
    }
    static async create(req, res) {
        return AnnouncementController.createFolder(req, res);
    }
    static async update(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
            if (!id)
                return res.status(400).json({ error: 'ID fehlt' });
            const existing = await loadAnnouncement(user.id, id);
            if (!existing)
                return res.status(404).json({ error: 'Ankündigung nicht gefunden' });
            const title = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.title) === 'string' ? req.body.title.trim() : existing.title;
            if (!title)
                return res.status(400).json({ error: 'Titel ist erforderlich' });
            const next = {
                ...existing,
                title,
                body: typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.body) === 'string' ? req.body.body.trim() : existing.body,
                links: Array.isArray((_c = req.body) === null || _c === void 0 ? void 0 : _c.links) ? normalizeLinks(req.body.links) : existing.links,
            };
            await saveAnnouncement(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            await saveIndex(user.id, index);
            return res.json({ success: true, announcement: next });
        }
        catch (error) {
            console.error('Announcement update error:', error);
            return res.status(500).json({ error: 'Fehler beim Speichern' });
        }
    }
    static async publishById(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
            if (!id)
                return res.status(400).json({ error: 'ID fehlt' });
            const existing = await loadAnnouncement(user.id, id);
            if (!existing)
                return res.status(404).json({ error: 'Ankündigung nicht gefunden' });
            const unpublish = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.unpublish) === true;
            const publishedAt = unpublish ? null : new Date().toISOString();
            const next = { ...existing, publishedAt };
            await saveAnnouncement(user.id, next);
            const index = await loadTeacherIndex(user.id);
            syncIndexEntry(index, next);
            await saveIndex(user.id, index);
            return res.json({
                success: true,
                publishedAt,
                announcement: next,
            });
        }
        catch (error) {
            console.error('Announcement publish error:', error);
            return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
        }
    }
    static async remove(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
            if (!id)
                return res.status(400).json({ error: 'ID fehlt' });
            const existing = await loadAnnouncement(user.id, id);
            if (!existing)
                return res.status(404).json({ error: 'Ankündigung nicht gefunden' });
            await deleteRow(user.id, announcementDataPath(id));
            const index = await loadTeacherIndex(user.id);
            index.announcements = index.announcements.filter((e) => e.id !== id);
            await saveIndex(user.id, index);
            return res.json({ success: true });
        }
        catch (error) {
            console.error('Announcement remove error:', error);
            return res.status(500).json({ error: 'Fehler beim Löschen' });
        }
    }
    static async getCurrent(req, res) {
        try {
            res.set('Cache-Control', 'private, no-store, must-revalidate');
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
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
            const readIds = (0, folderAnnouncements_1.getFolderAnnouncementReadIds)(user.id);
            for (const row of rows) {
                const data = parseAnnouncement(row.content);
                if (!(data === null || data === void 0 ? void 0 : data.publishedAt))
                    continue;
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
        }
        catch (error) {
            console.error('Announcement getCurrent error:', error);
            return res.status(500).json({ error: 'Fehler beim Laden' });
        }
    }
    static async markRead(req, res) {
        var _a, _b, _c;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            const teacherId = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.teacherId) === 'string' ? req.body.teacherId.trim() : '';
            const announcementId = typeof ((_b = req.body) === null || _b === void 0 ? void 0 : _b.announcementId) === 'string' ? req.body.announcementId.trim() : '';
            if (!teacherId || !announcementId) {
                return res.status(400).json({ error: 'teacherId und announcementId erforderlich' });
            }
            if (teacherId === folderAnnouncements_1.FOLDER_ANNOUNCEMENT_AUTHOR_ID) {
                const folderSlug = typeof ((_c = req.body) === null || _c === void 0 ? void 0 : _c.folderSlug) === 'string'
                    ? req.body.folderSlug.trim()
                    : (0, folderAnnouncements_1.findFolderSlugByAnnouncementId)(announcementId);
                if (!folderSlug) {
                    return res.status(404).json({ error: 'Ordner-Ankündigung nicht gefunden' });
                }
                (0, folderAnnouncements_1.markFolderAnnouncementRead)(folderSlug, announcementId, user.id);
                return res.json({ success: true });
            }
            const data = await loadAnnouncement(teacherId, announcementId);
            if (!(data === null || data === void 0 ? void 0 : data.publishedAt)) {
                return res.status(404).json({ error: 'Ankündigung nicht gefunden oder nicht freigegeben' });
            }
            if (!data.readBy.includes(user.id)) {
                data.readBy.push(user.id);
                await saveAnnouncement(teacherId, data);
            }
            return res.json({ success: true });
        }
        catch (error) {
            console.error('Announcement markRead error:', error);
            return res.status(500).json({ error: 'Fehler beim Markieren' });
        }
    }
    /** HTML-Flyer aus Ordner ausliefern (Vorschau & Druck) */
    static async serveFlyer(req, res) {
        try {
            const raw = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            const folderSlug = raw ? decodeURIComponent(raw) : '';
            if (!folderSlug)
                return res.status(400).send('Ordner fehlt');
            const modeRaw = typeof req.query.mode === 'string' ? req.query.mode.trim().toLowerCase() : '';
            const previewMode = modeRaw === 'embed' || modeRaw === 'fullscreen' ? modeRaw : 'default';
            const html = (0, folderAnnouncements_1.readFolderFlyerHtml)(folderSlug, previewMode);
            if (!html) {
                return res.status(404).send('Kein Flyer (.html) in diesem Ordner gefunden.');
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
            return res.send(html);
        }
        catch (error) {
            console.error('Announcement serveFlyer error:', error);
            return res.status(500).send('Flyer konnte nicht geladen werden.');
        }
    }
    static async getFlyerDesign(req, res) {
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const raw = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            const folderSlug = raw ? decodeURIComponent(raw) : '';
            if (!folderSlug)
                return res.status(400).json({ error: 'Ordner fehlt' });
            const document = (0, folderAnnouncements_1.readFolderFlyerDesign)(folderSlug);
            if (!document)
                return res.status(404).json({ error: 'Noch kein Flyer-Design gespeichert' });
            return res.json({ document });
        }
        catch (error) {
            console.error('Announcement getFlyerDesign error:', error);
            return res.status(500).json({ error: 'Design konnte nicht geladen werden' });
        }
    }
    static async saveFlyerDesign(req, res) {
        var _a, _b;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const raw = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            const folderSlug = raw ? decodeURIComponent(raw) : '';
            if (!folderSlug)
                return res.status(400).json({ error: 'Ordner fehlt' });
            const html = typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.html) === 'string' ? req.body.html : '';
            const document = (_b = req.body) === null || _b === void 0 ? void 0 : _b.document;
            if (!html.trim())
                return res.status(400).json({ error: 'HTML fehlt' });
            if (!document || typeof document !== 'object')
                return res.status(400).json({ error: 'Design fehlt' });
            (0, folderAnnouncements_1.saveFolderFlyerStudio)(folderSlug, html, document);
            return res.json({ success: true });
        }
        catch (error) {
            console.error('Announcement saveFlyerDesign error:', error);
            const msg = error instanceof Error ? error.message : 'Speichern fehlgeschlagen';
            return res.status(500).json({ error: msg });
        }
    }
    static async uploadFolderImage(req, res) {
        var _a;
        try {
            const user = await getUserByLoginCode(req);
            if (!user)
                return res.status(401).json({ error: 'Nicht angemeldet' });
            if (user.role !== 'TEACHER')
                return res.status(403).json({ error: 'Nur Lehrkräfte' });
            const raw = typeof req.params.folderSlug === 'string' ? req.params.folderSlug.trim() : '';
            const folderSlug = raw ? decodeURIComponent(raw) : '';
            if (!folderSlug)
                return res.status(400).json({ error: 'Ordner fehlt' });
            const file = req.file;
            if (!((_a = file === null || file === void 0 ? void 0 : file.buffer) === null || _a === void 0 ? void 0 : _a.length))
                return res.status(400).json({ error: 'Kein Bild' });
            const saved = (0, folderAnnouncements_1.saveFolderAnnouncementImage)(folderSlug, file.buffer, file.originalname || 'bild.jpg');
            return res.json({ url: saved.url, filename: saved.filename });
        }
        catch (error) {
            console.error('Announcement uploadFolderImage error:', error);
            const msg = error instanceof Error ? error.message : 'Upload fehlgeschlagen';
            return res.status(500).json({ error: msg });
        }
    }
}
exports.AnnouncementController = AnnouncementController;
//# sourceMappingURL=AnnouncementController.js.map