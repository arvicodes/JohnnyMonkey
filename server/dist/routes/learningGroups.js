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
// Get all learning groups for a teacher
router.get('/teacher/:id', async (req, res) => {
    try {
        const groups = await prisma.learningGroup.findMany({
            where: { teacherId: req.params.id },
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
// Get all learning groups for a student
router.get('/student/:id', async (req, res) => {
    try {
        const groups = await prisma.learningGroup.findMany({
            where: {
                students: {
                    some: {
                        id: req.params.id
                    }
                }
            },
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
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get a single learning group by ID
router.get('/:id', async (req, res) => {
    try {
        const group = await prisma.learningGroup.findUnique({
            where: { id: req.params.id },
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
        if (!group) {
            return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
        }
        res.json(group);
    }
    catch (error) {
        console.error('Error fetching learning group:', error);
        res.status(500).json({ error: 'Server error' });
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
// Get all available students (not in the specific group)
router.get('/:groupId/available-students', async (req, res) => {
    const { groupId } = req.params;
    try {
        // Get the current group's students
        const currentGroup = await prisma.learningGroup.findUnique({
            where: { id: groupId },
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
        if (!currentGroup) {
            return res.status(404).json({ message: 'Lerngruppe nicht gefunden' });
        }
        // Get all students not in this group
        const availableStudents = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                AND: {
                    id: {
                        notIn: currentGroup.students.map(student => student.id)
                    }
                }
            },
            select: {
                id: true,
                name: true,
                loginCode: true,
                avatarEmoji: true
            }
        });
        res.json(availableStudents);
    }
    catch (error) {
        console.error('Error fetching available students:', error);
        res.status(500).json({ message: 'Server-Fehler beim Laden der verfügbaren Schüler' });
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
        res.status(500).json({ error: 'Server error' });
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
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/:groupId/assignments', async (req, res) => {
    try {
        const assignments = await prisma.groupAssignment.findMany({
            where: { groupId: req.params.groupId },
        });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
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