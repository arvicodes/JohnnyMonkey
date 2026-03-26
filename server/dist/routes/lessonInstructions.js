"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/** GET alle gespeicherten Anweisungs-Overrides für einen Lehrer */
router.get('/teacher/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;
        if (!(teacherId === null || teacherId === void 0 ? void 0 : teacherId.trim()))
            return res.status(400).json({ error: 'teacherId fehlt' });
        const list = await prisma.teacherLessonInstruction.findMany({
            where: { teacherId },
            select: { lessonPath: true, content: true, updatedAt: true }
        });
        const byPath = {};
        for (const row of list) {
            try {
                byPath[row.lessonPath] = JSON.parse(row.content || '{}');
            }
            catch {
                byPath[row.lessonPath] = {};
            }
        }
        return res.json(byPath);
    }
    catch (e) {
        console.error('Error fetching lesson instructions:', e);
        return res.status(500).json({ error: (e === null || e === void 0 ? void 0 : e.message) || 'Serverfehler' });
    }
});
/** PUT eine Stunde speichern (lessonPath + content-Overrides) */
router.put('/', async (req, res) => {
    try {
        const { teacherId, lessonPath, content } = req.body;
        if (!(teacherId === null || teacherId === void 0 ? void 0 : teacherId.trim()) || lessonPath == null || lessonPath === '') {
            return res.status(400).json({ error: 'teacherId und lessonPath sind erforderlich' });
        }
        const contentStr = typeof content === 'object' ? JSON.stringify(content) : String(content !== null && content !== void 0 ? content : '{}');
        await prisma.teacherLessonInstruction.upsert({
            where: {
                teacherId_lessonPath: { teacherId, lessonPath: String(lessonPath) }
            },
            create: { teacherId, lessonPath: String(lessonPath), content: contentStr },
            update: { content: contentStr, updatedAt: new Date() }
        });
        return res.json({ ok: true });
    }
    catch (e) {
        console.error('Error saving lesson instructions:', e);
        return res.status(500).json({ error: (e === null || e === void 0 ? void 0 : e.message) || 'Serverfehler' });
    }
});
exports.default = router;
//# sourceMappingURL=lessonInstructions.js.map