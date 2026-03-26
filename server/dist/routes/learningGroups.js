"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all learning groups (for testing purposes)
router.get('/', async (req, res) => {
    try {
        const groups = await prisma.learningGroup.findMany({
            include: {
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// WICHTIG: Spezifische Routen müssen VOR den allgemeinen Routen kommen!
// Get all learning groups for a teacher
router.get('/teacher/:id', async (req, res) => {
    var _a;
    try {
        const teacherId = req.params.id;
        console.log('📚 Fetching groups for teacher:', teacherId);
        if (!teacherId || teacherId.trim() === '') {
            return res.status(400).json({
                error: 'Invalid teacher ID',
                message: 'Teacher ID ist erforderlich'
            });
        }
        // Lade Gruppen OHNE seatingOrder und statisticsOrder im select
        // (falls Prisma Client veraltet ist und diese Felder nicht kennt)
        const groups = await prisma.learningGroup.findMany({
            where: { teacherId: teacherId },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                teacherId: true,
                period1Hours: true,
                period2Hours: true,
                // seatingOrder und statisticsOrder werden separat geladen (falls Prisma Client veraltet ist)
                // seatingOrder: true,
                // statisticsOrder: true,
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        console.log('📊 Found', groups.length, 'groups for teacher', teacherId);
        // Lade seatingOrder und statisticsOrder separat für jede Gruppe (mit Fehlerbehandlung)
        // Verwende Promise.allSettled, damit ein Fehler bei einer Gruppe nicht alle anderen blockiert
        const groupsWithStatsResults = await Promise.allSettled(groups.map(async (group) => {
            var _a, _b, _c;
            // Prüfe zuerst, ob Prisma Client die Felder kennt
            // Wenn nicht, setze direkt auf null ohne Fehler zu werfen
            try {
                // Versuche beide Felder auf einmal zu laden
                const fullGroup = await prisma.learningGroup.findUnique({
                    where: { id: group.id },
                    select: {
                        seatingOrder: true,
                        statisticsOrder: true
                    }
                });
                return {
                    ...group,
                    seatingOrder: (fullGroup === null || fullGroup === void 0 ? void 0 : fullGroup.seatingOrder) || null,
                    statisticsOrder: (fullGroup === null || fullGroup === void 0 ? void 0 : fullGroup.statisticsOrder) || null
                };
            }
            catch (e) {
                // Prüfe ob es ein "Unknown field" Fehler ist (Prisma Client veraltet)
                const isUnknownFieldError = ((_a = e === null || e === void 0 ? void 0 : e.message) === null || _a === void 0 ? void 0 : _a.includes('Unknown field')) ||
                    ((_b = e === null || e === void 0 ? void 0 : e.message) === null || _b === void 0 ? void 0 : _b.includes('seatingOrder')) ||
                    ((_c = e === null || e === void 0 ? void 0 : e.message) === null || _c === void 0 ? void 0 : _c.includes('statisticsOrder'));
                if (isUnknownFieldError) {
                    // Prisma Client ist veraltet - setze einfach auf null ohne Warnung
                    // (wird automatisch behoben, wenn Container neu gebaut wird)
                    return {
                        ...group,
                        seatingOrder: null,
                        statisticsOrder: null
                    };
                }
                // Für andere Fehler: Versuche einzeln zu laden (Fallback)
                try {
                    const seatingOrderGroup = await prisma.learningGroup.findUnique({
                        where: { id: group.id },
                        select: { seatingOrder: true }
                    });
                    const statisticsOrderGroup = await prisma.learningGroup.findUnique({
                        where: { id: group.id },
                        select: { statisticsOrder: true }
                    });
                    return {
                        ...group,
                        seatingOrder: (seatingOrderGroup === null || seatingOrderGroup === void 0 ? void 0 : seatingOrderGroup.seatingOrder) || null,
                        statisticsOrder: (statisticsOrderGroup === null || statisticsOrderGroup === void 0 ? void 0 : statisticsOrderGroup.statisticsOrder) || null
                    };
                }
                catch (e2) {
                    // Wenn auch das fehlschlägt, setze beide auf null
                    return {
                        ...group,
                        seatingOrder: null,
                        statisticsOrder: null
                    };
                }
            }
        }));
        // Extrahiere erfolgreiche Ergebnisse, bei Fehlern verwende Fallback
        const groupsWithStats = groupsWithStatsResults.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            else {
                // Fallback: Gruppe ohne seatingOrder und statisticsOrder zurückgeben
                console.warn(`⚠️ Fehler beim Laden von seatingOrder/statisticsOrder für Gruppe ${groups[index].id}:`, result.reason);
                return {
                    ...groups[index],
                    seatingOrder: null,
                    statisticsOrder: null
                };
            }
        });
        console.log('✅ Found', groupsWithStats.length, 'groups for teacher');
        res.json(groupsWithStats);
    }
    catch (error) {
        console.error('❌ Error fetching teacher groups:', error);
        console.error('❌ Error details:', {
            message: error === null || error === void 0 ? void 0 : error.message,
            code: error === null || error === void 0 ? void 0 : error.code,
            stack: (_a = error === null || error === void 0 ? void 0 : error.stack) === null || _a === void 0 ? void 0 : _a.substring(0, 500)
        });
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler beim Laden der Gruppen'
        });
    }
});
// Get all learning groups for a student
// WICHTIG: Diese Route muss VOR der /:id Route kommen!
router.get('/student/:id', async (req, res) => {
    var _a;
    try {
        console.log('👤 Fetching groups for student:', req.params.id);
        const groups = await prisma.learningGroup.findMany({
            where: {
                students: {
                    some: {
                        id: req.params.id
                    }
                }
            },
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        console.log('✅ Found', groups.length, 'groups for student');
        res.json(groups);
    }
    catch (error) {
        console.error('❌ Error fetching student groups:', error);
        console.error('❌ Error details:', {
            message: error === null || error === void 0 ? void 0 : error.message,
            code: error === null || error === void 0 ? void 0 : error.code,
            stack: (_a = error === null || error === void 0 ? void 0 : error.stack) === null || _a === void 0 ? void 0 : _a.substring(0, 500)
        });
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler beim Laden der Gruppen'
        });
    }
});
// WICHTIG: Alle spezifischen Routen müssen VOR der allgemeinen /:id Route kommen!
// Get available students for a group (before /:id)
router.get('/:groupId/available-students', async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await prisma.learningGroup.findUnique({
            where: { id: groupId },
            include: { students: { select: { id: true } } }
        });
        if (!group) {
            return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
        }
        const studentIdsInGroup = new Set(group.students.map(s => s.id));
        const allStudents = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: {
                id: true,
                name: true,
                loginCode: true,
                avatarEmoji: true
            },
            orderBy: { loginCode: 'asc' }
        });
        const availableStudents = allStudents.filter(s => !studentIdsInGroup.has(s.id));
        res.json(availableStudents);
    }
    catch (error) {
        console.error('Error fetching available students:', error);
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
});
// Get assignments for a group (before /:id)
router.get('/:groupId/assignments', async (req, res) => {
    try {
        const { groupId } = req.params;
        const assignments = await prisma.groupAssignment.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    }
    catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
});
// Gemeinsames Eingabefeld pro Gruppe + Stunde (für SuS sichtbar, Lehrkraft kann anzeigen)
router.get('/:groupId/lesson-shared-input', async (req, res) => {
    var _a, _b;
    try {
        const { groupId } = req.params;
        const lessonPath = typeof req.query.lessonPath === 'string' ? req.query.lessonPath : '';
        if (!groupId || !lessonPath) {
            return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
        }
        const row = await prisma.lessonSharedInput.findUnique({
            where: { groupId_lessonPath: { groupId, lessonPath } }
        });
        return res.json({ content: (_a = row === null || row === void 0 ? void 0 : row.content) !== null && _a !== void 0 ? _a : '', updatedAt: (_b = row === null || row === void 0 ? void 0 : row.updatedAt) !== null && _b !== void 0 ? _b : null });
    }
    catch (error) {
        console.error('Error fetching lesson shared input:', error);
        res.status(500).json({ error: (error === null || error === void 0 ? void 0 : error.message) || 'Serverfehler' });
    }
});
router.put('/:groupId/lesson-shared-input', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { lessonPath, content } = req.body;
        if (!groupId || lessonPath == null || lessonPath === '') {
            return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
        }
        const updated = await prisma.lessonSharedInput.upsert({
            where: { groupId_lessonPath: { groupId, lessonPath: String(lessonPath) } },
            create: { groupId, lessonPath: String(lessonPath), content: String(content !== null && content !== void 0 ? content : '') },
            update: { content: String(content !== null && content !== void 0 ? content : ''), updatedAt: new Date() }
        });
        return res.json({ content: updated.content, updatedAt: updated.updatedAt });
    }
    catch (error) {
        console.error('Error updating lesson shared input:', error);
        res.status(500).json({ error: (error === null || error === void 0 ? void 0 : error.message) || 'Serverfehler' });
    }
});
// Freigabe für gemeinsames Eingabefeld (Toggle)
router.post('/:groupId/lesson-shared-input-share/toggle', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { lessonPath } = req.body;
        if (!groupId || !lessonPath) {
            return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
        }
        const existing = await prisma.lessonSharedInputShare.findUnique({
            where: { groupId_lessonPath: { groupId, lessonPath: String(lessonPath) } }
        });
        if (existing) {
            await prisma.lessonSharedInputShare.delete({ where: { id: existing.id } });
            return res.json({ shared: false });
        }
        else {
            await prisma.lessonSharedInputShare.create({
                data: { groupId, lessonPath: String(lessonPath) }
            });
            return res.json({ shared: true });
        }
    }
    catch (error) {
        console.error('Error toggling lesson shared input share:', error);
        res.status(500).json({ error: (error === null || error === void 0 ? void 0 : error.message) || 'Serverfehler' });
    }
});
// Get all shared lesson paths for a group
router.get('/:groupId/lesson-shared-input-shares', async (req, res) => {
    try {
        const { groupId } = req.params;
        const shares = await prisma.lessonSharedInputShare.findMany({
            where: { groupId },
            select: { lessonPath: true }
        });
        return res.json(shares.map(s => s.lessonPath));
    }
    catch (error) {
        console.error('Error fetching lesson shared input shares:', error);
        res.status(500).json({ error: (error === null || error === void 0 ? void 0 : error.message) || 'Serverfehler' });
    }
});
// Get a single learning group by ID (MUST BE LAST among GET routes with :id)
router.get('/:id', async (req, res) => {
    try {
        const group = await prisma.learningGroup.findUnique({
            where: { id: req.params.id },
            include: {
                teacher: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        if (!group) {
            return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
        }
        res.json(group);
    }
    catch (error) {
        console.error('Error fetching learning group:', error);
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
});
// Update a learning group
router.put('/:id', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name ist erforderlich' });
        }
        const group = await prisma.learningGroup.update({
            where: { id: req.params.id },
            data: { name: name.trim() },
            include: {
                teacher: true,
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.json(group);
    }
    catch (error) {
        console.error('Error updating learning group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Create a new learning group
router.post('/', async (req, res) => {
    const { name, teacherId } = req.body;
    try {
        const group = await prisma.learningGroup.create({
            data: {
                name,
                teacher: {
                    connect: { id: teacherId }
                }
            },
            include: {
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Add students to a learning group
router.post('/:id/students', async (req, res) => {
    const { studentIds } = req.body;
    try {
        const group = await prisma.learningGroup.update({
            where: { id: req.params.id },
            data: {
                students: {
                    connect: studentIds.map((id) => ({ id }))
                }
            },
            include: {
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Remove a student from a learning group
router.delete('/:groupId/students/:studentId', async (req, res) => {
    try {
        const group = await prisma.learningGroup.update({
            where: { id: req.params.groupId },
            data: {
                students: {
                    disconnect: { id: req.params.studentId }
                }
            },
            include: {
                students: {
                    orderBy: { loginCode: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        loginCode: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Zuordnung von Inhalten zu Lerngruppen
router.post('/:groupId/assign', async (req, res) => {
    const { type, refId } = req.body;
    try {
        const assignment = await prisma.groupAssignment.create({
            data: {
                groupId: req.params.groupId,
                type,
                refId,
            },
        });
        res.json(assignment);
    }
    catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
});
router.delete('/:groupId/assign', async (req, res) => {
    const { type, refId } = req.body;
    try {
        const deleted = await prisma.groupAssignment.deleteMany({
            where: {
                groupId: req.params.groupId,
                type,
                refId,
            },
        });
        res.json({ deleted: deleted.count });
    }
    catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({
            error: 'Server error',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
});
// Delete a learning group by ID
router.delete('/:id', async (req, res) => {
    try {
        // Zuerst alle zugehörigen GroupAssignments löschen
        await prisma.groupAssignment.deleteMany({ where: { groupId: req.params.id } });
        // Dann alle zugehörigen GradingSchemas löschen
        await prisma.gradingSchema.deleteMany({ where: { groupId: req.params.id } });
        // Jetzt die Lerngruppe selbst löschen
        await prisma.learningGroup.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get assigned folders for a learning group
router.get('/:id/folders', async (req, res) => {
    try {
        const groupId = req.params.id;
        const assignments = await prisma.groupAssignment.findMany({
            where: {
                groupId: groupId,
                type: 'FOLDER'
            },
            select: {
                refId: true
            }
        });
        // Convert refId to folder paths
        const folders = assignments.map(assignment => ({
            path: assignment.refId
        }));
        res.json(folders);
    }
    catch (error) {
        console.error('Error fetching assigned folders:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Assign a folder to a learning group
router.post('/:id/folders', async (req, res) => {
    try {
        const groupId = req.params.id;
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'Pfad ist erforderlich' });
        }
        // Check if folder is already assigned
        const existingAssignment = await prisma.groupAssignment.findFirst({
            where: {
                groupId: groupId,
                type: 'FOLDER',
                refId: path
            }
        });
        if (existingAssignment) {
            return res.status(400).json({ error: 'Ordner ist bereits zugeordnet' });
        }
        // Create new assignment
        const assignment = await prisma.groupAssignment.create({
            data: {
                groupId: groupId,
                type: 'FOLDER',
                refId: path
            }
        });
        res.json(assignment);
    }
    catch (error) {
        console.error('Error assigning folder:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Remove a folder assignment from a learning group
router.delete('/:id/folders/:path(*)', async (req, res) => {
    try {
        const groupId = req.params.id;
        const folderPath = req.params.path;
        // Find and delete the assignment
        const assignment = await prisma.groupAssignment.findFirst({
            where: {
                groupId: groupId,
                type: 'FOLDER',
                refId: folderPath
            }
        });
        if (!assignment) {
            return res.status(404).json({ error: 'Ordner-Zuordnung nicht gefunden' });
        }
        await prisma.groupAssignment.delete({
            where: { id: assignment.id }
        });
        res.json({ message: 'Ordner-Zuordnung erfolgreich entfernt' });
    }
    catch (error) {
        console.error('Error removing folder assignment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=learningGroups.js.map