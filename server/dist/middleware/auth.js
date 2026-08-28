"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudent = exports.requireTeacher = exports.authenticateUser = void 0;
const client_1 = require("@prisma/client");
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const prisma = new client_1.PrismaClient();
// Authentication middleware
const authenticateUser = async (req, res, next) => {
    try {
        const loginCode = req.headers['x-login-code'] || req.query.loginCode || req.body.loginCode;
        if (!String(loginCode !== null && loginCode !== void 0 ? loginCode : '').trim()) {
            return res.status(401).json({ error: 'Login-Code erforderlich' });
        }
        const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
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