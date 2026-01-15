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
    var _a, _b;
    let { loginCode } = req.body;
    console.log('🔐 Login attempt with code (raw):', loginCode);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('DATABASE_URL length:', ((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.length) || 0);
    try {
        if (!loginCode) {
            console.log('❌ No login code provided');
            return res.status(400).json({ message: 'Login-Code ist erforderlich' });
        }
        // Trim whitespace und normalisiere
        loginCode = String(loginCode).trim();
        console.log('🔐 Login code (trimmed):', loginCode);
        console.log('🔐 Login code length:', loginCode.length);
        // Versuche zuerst exakte Übereinstimmung
        console.log('🔍 Searching for user with loginCode (exact):', loginCode);
        let user = await prisma.user.findUnique({
            where: { loginCode: loginCode },
            include: {
                learningGroups: {
                    select: {
                        id: true,
                        name: true
                    }
                },
            },
        });
        // Falls nicht gefunden, versuche case-insensitive Suche
        if (!user) {
            console.log('⚠️ Exact match not found, trying case-insensitive search...');
            // Suche alle Benutzer und vergleiche case-insensitive
            const allUsers = await prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    loginCode: true,
                    role: true
                }
            });
            const matchedUser = allUsers.find(u => u.loginCode && u.loginCode.toLowerCase() === loginCode.toLowerCase());
            if (matchedUser) {
                console.log('✅ Found user with case-insensitive match:', matchedUser.loginCode, '->', matchedUser.name);
                // Lade den vollständigen Benutzer mit learningGroups
                user = await prisma.user.findUnique({
                    where: { id: matchedUser.id },
                    include: {
                        learningGroups: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                    },
                });
            }
        }
        if (!user) {
            console.log('❌ Invalid login code:', loginCode);
            // Debug: Zeige alle verfügbaren Login-Codes (nur erste 10)
            const sampleUsers = await prisma.user.findMany({
                select: { loginCode: true, name: true },
                take: 10
            });
            console.log('📋 Sample login codes in database:', sampleUsers.map(u => `${u.loginCode} (${u.name})`));
            return res.status(401).json({ message: 'Ungültiger Login-Code' });
        }
        console.log('✅ User found:', user.id, user.name, user.role);
        console.log('📚 Learning groups:', ((_b = user.learningGroups) === null || _b === void 0 ? void 0 : _b.length) || 0);
        console.log('📚 Learning groups data:', JSON.stringify(user.learningGroups, null, 2));
        // Handle both students and teachers - students might not have learningGroups
        // Also handle case where learningGroups might be undefined or null
        let groups = [];
        if (user.learningGroups && Array.isArray(user.learningGroups)) {
            groups = user.learningGroups.map((group) => ({
                id: group.id,
                name: group.name
            }));
        }
        res.json({
            message: 'Login erfolgreich',
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                groups: groups
            }
        });
    }
    catch (error) {
        console.error('❌ Login error:', error);
        console.error('Error message:', error === null || error === void 0 ? void 0 : error.message);
        console.error('Error stack:', error === null || error === void 0 ? void 0 : error.stack);
        res.status(500).json({
            message: 'Server-Fehler',
            error: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler',
            code: (error === null || error === void 0 ? void 0 : error.code) || 'UNKNOWN'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map