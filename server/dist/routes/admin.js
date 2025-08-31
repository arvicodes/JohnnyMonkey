"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all database content
router.get('/db-content', async (req, res) => {
    try {
        const [users, learningGroups, subjects, notes] = await Promise.all([
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
});
exports.default = router;
//# sourceMappingURL=admin.js.map