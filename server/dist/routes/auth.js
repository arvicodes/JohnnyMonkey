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
// Login route
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { loginCode } = req.body;
    console.log('Login attempt with code:', loginCode);
    try {
        const user = yield prisma.user.findUnique({
            where: { loginCode },
            include: {
                learningGroups: true,
            },
        });
        if (!user) {
            console.log('Invalid login code:', loginCode);
            res.status(401).json({ message: 'Ungültiger Login-Code' });
            return;
        }
        res.json({
            message: 'Login erfolgreich',
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                groups: user.learningGroups.map(group => ({
                    id: group.id,
                    name: group.name
                }))
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server-Fehler' });
    }
}));
exports.default = router;
