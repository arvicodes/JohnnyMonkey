"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudent = exports.requireTeacher = exports.authenticateUser = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function findUserByLoginCode(raw) {
    var _a;
    const loginCode = String(raw !== null && raw !== void 0 ? raw : '').trim();
    if (!loginCode)
        return null;
    const exact = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, name: true, role: true },
    });
    if (exact)
        return exact;
    const rows = await prisma.$queryRaw(client_1.Prisma.sql `SELECT id FROM User WHERE lower(loginCode) = lower(${loginCode}) LIMIT 1`);
    const id = (_a = rows[0]) === null || _a === void 0 ? void 0 : _a.id;
    if (!id)
        return null;
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, role: true },
    });
}
// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const loginCode = req.headers['x-login-code'] || req.query.loginCode || req.body.loginCode;
        if (!String(loginCode !== null && loginCode !== void 0 ? loginCode : '').trim()) {
            return res.status(401).json({ error: 'Login-Code erforderlich' });
        }
        const user = await findUserByLoginCode(loginCode);
        if (!user) {
            return res.status(401).json({ error: 'Ungültiger Login-Code' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentifizierungsfehler' });
    }
};
exports.authenticateUser = authenticateUser;
// Teacher role middleware
const requireTeacher = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    if (req.user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer haben Zugriff' });
    }
    next();
};
exports.requireTeacher = requireTeacher;
// Student role middleware
const requireStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Nur Schüler haben Zugriff' });
    }
    next();
};
exports.requireStudent = requireStudent;
//# sourceMappingURL=auth.js.map