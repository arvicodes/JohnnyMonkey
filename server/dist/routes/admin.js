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
// Get all database content
router.get('/db-content', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [users, learningGroups, subjects, notes] = yield Promise.all([
            prisma.user.findMany({
                include: {
                    learningGroups: true,
                    teacherGroups: true
                }
            }),
            prisma.learningGroup.findMany({
                include: {
                    teacher: true,
                    students: true
                }
            }),
            prisma.subject.findMany({
                include: {
                    teacher: true,
                    blocks: {
                        include: {
                            units: {
                                include: {
                                    topics: {
                                        include: {
                                            lessons: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.note.findMany({
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: [
                    { order: 'asc' },
                    { updatedAt: 'desc' }
                ]
            })
        ]);
        res.json({ users, learningGroups, subjects, notes });
    }
    catch (error) {
        console.error('Error fetching database content:', error);
        res.status(500).json({ error: 'Server error' });
    }
}));
exports.default = router;
