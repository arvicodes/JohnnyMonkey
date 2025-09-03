"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Debug: Log environment variables
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', ((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.length) || 0);
console.log('DATABASE_URL starts with postgresql:', (_b = process.env.DATABASE_URL) === null || _b === void 0 ? void 0 : _b.startsWith('postgresql://'));
// Debug: Try to create PrismaClient
let prisma;
try {
    console.log('🔧 Creating PrismaClient...');
    prisma = new client_1.PrismaClient();
    console.log('✅ PrismaClient created successfully');
}
catch (error) {
    console.error('❌ Failed to create PrismaClient:', error);
    throw error;
}
// Login route
router.post('/login', async (req, res) => {
    var _a;
    const { loginCode } = req.body;
    console.log('Login attempt with code:', loginCode);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('DATABASE_URL length:', ((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.length) || 0);
    try {
        const user = await prisma.user.findUnique({
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
});
exports.default = router;
//# sourceMappingURL=auth.js.map