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
// Get a single user by ID
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                name: true,
                role: true,
                loginCode: true
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
});
// Get all learning groups for a teacher
const getTeacherGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groups = yield prisma.learningGroup.findMany({
            where: { teacherId: req.params.id },
            include: { students: true },
        });
        res.json(groups);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// Get all learning groups for a student
const getStudentGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
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
});
router.get('/:id', getUserById);
router.get('/teacher/:id/groups', getTeacherGroups);
router.get('/student/:id/groups', getStudentGroups);
exports.default = router;
