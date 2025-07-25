"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../generated/prisma");
const router = (0, express_1.Router)();
const prisma = new prisma_1.PrismaClient();
// Get all learning groups for a teacher
router.get('/teacher/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groups = yield prisma.learningGroup.findMany({
            where: { teacherId: req.params.id },
            include: { students: true }
        });
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Get all learning groups for a student
router.get('/student/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groups = yield prisma.learningGroup.findMany({
            where: {
                students: {
                    some: {
                        id: req.params.id
                    }
                }
            },
            include: {
                teacher: true,
                students: true
            }
        });
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Get a single learning group by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const group = yield prisma.learningGroup.findUnique({
            where: { id: req.params.id },
            include: {
                teacher: true,
                students: true
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
}));
// Create a new learning group
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, teacherId } = req.body;
    try {
        const group = yield prisma.learningGroup.create({
            data: {
                name,
                teacher: {
                    connect: { id: teacherId }
                }
            },
            include: { students: true }
        });
        res.json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Add students to a learning group
router.post('/:id/students', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { studentIds } = req.body;
    try {
        const group = yield prisma.learningGroup.update({
            where: { id: req.params.id },
            data: {
                students: {
                    connect: studentIds.map((id) => ({ id }))
                }
            },
            include: { students: true }
        });
        res.json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Remove a student from a learning group
router.delete('/:groupId/students/:studentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const group = yield prisma.learningGroup.update({
            where: { id: req.params.groupId },
            data: {
                students: {
                    disconnect: { id: req.params.studentId }
                }
            },
            include: { students: true }
        });
        res.json(group);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Get all available students (not in the specific group)
router.get('/:groupId/available-students', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupId } = req.params;
    try {
        // Get the current group's students
        const currentGroup = yield prisma.learningGroup.findUnique({
            where: { id: groupId },
            include: { students: true }
        });
        if (!currentGroup) {
            return res.status(404).json({ message: 'Lerngruppe nicht gefunden' });
        }
        // Get all students not in this group
        const availableStudents = yield prisma.user.findMany({
            where: {
                role: 'STUDENT',
                AND: {
                    id: {
                        notIn: currentGroup.students.map(student => student.id)
                    }
                }
            }
        });
        res.json(availableStudents);
    }
    catch (error) {
        console.error('Error fetching available students:', error);
        res.status(500).json({ message: 'Server-Fehler beim Laden der verfügbaren Schüler' });
    }
}));
// Zuordnung von Inhalten zu Lerngruppen
router.post('/:groupId/assign', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, refId } = req.body;
    try {
        const assignment = yield prisma.groupAssignment.create({
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
}));
router.delete('/:groupId/assign', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, refId } = req.body;
    try {
        const deleted = yield prisma.groupAssignment.deleteMany({
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
}));
router.get('/:groupId/assignments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignments = yield prisma.groupAssignment.findMany({
            where: { groupId: req.params.groupId },
        });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Delete a learning group by ID
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Zuerst alle zugehörigen GroupAssignments löschen
        yield prisma.groupAssignment.deleteMany({ where: { groupId: req.params.id } });
        // Dann alle zugehörigen GradingSchemas löschen
        yield prisma.gradingSchema.deleteMany({ where: { groupId: req.params.id } });
        // Jetzt die Lerngruppe selbst löschen
        yield prisma.learningGroup.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}));
exports.default = router;
