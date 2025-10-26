"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all users (for teachers only)
const getAllUsers = async (req, res) => {
    try {
        // User is already authenticated and verified as teacher by middleware
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                role: true,
                loginCode: true,
                avatarEmoji: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
// Get current user (myself)
const getCurrentUser = async (req, res) => {
    try {
        // req.user is set by authenticateUser middleware
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                role: true,
                loginCode: true,
                avatarEmoji: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
// Get a single user by ID
const getUserById = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                role: true,
                loginCode: true,
                avatarEmoji: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
// Get all learning groups for a teacher
const getTeacherGroups = async (req, res) => {
    try {
        const groups = await prisma.learningGroup.findMany({
            where: { teacherId: req.params.id },
            include: { students: true },
        });
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
// Get all learning groups for a student
const getStudentGroups = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                learningGroups: {
                    include: {
                        teacher: true,
                        students: true,
                    },
                },
            },
        });
        res.json((user === null || user === void 0 ? void 0 : user.learningGroups) || []);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
// Update user avatar emoji
const updateUserAvatarEmoji = async (req, res) => {
    try {
        const { avatarEmoji } = req.body;
        if (!avatarEmoji) {
            return res.status(400).json({ error: 'Avatar emoji is required' });
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { avatarEmoji },
            select: {
                id: true,
                name: true,
                role: true,
                loginCode: true,
                avatarEmoji: true
            }
        });
        res.json(user);
    }
    catch (error) {
        console.error('Error updating user avatar emoji:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
router.get('/', auth_1.authenticateUser, auth_1.requireTeacher, getAllUsers);
router.get('/me', auth_1.authenticateUser, getCurrentUser);
router.get('/:id', auth_1.authenticateUser, getUserById);
router.put('/:id/avatar-emoji', auth_1.authenticateUser, updateUserAvatarEmoji);
router.get('/teacher/:id/groups', auth_1.authenticateUser, auth_1.requireTeacher, getTeacherGroups);
router.get('/student/:id/groups', auth_1.authenticateUser, getStudentGroups);
exports.default = router;
//# sourceMappingURL=users.js.map