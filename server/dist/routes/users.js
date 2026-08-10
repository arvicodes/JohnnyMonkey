"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const imageToJpeg_1 = require("../utils/imageToJpeg");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const AVATAR_DIR = path_1.default.join(__dirname, '../../uploads/avatars');
/** Served under /api so the CRA proxy always forwards the image. */
const AVATAR_URL_PREFIX = '/api/avatars';
if (!fs_1.default.existsSync(AVATAR_DIR)) {
    fs_1.default.mkdirSync(AVATAR_DIR, { recursive: true });
}
function deleteAvatarFileIfLocal(avatarUrl) {
    if (!avatarUrl)
        return;
    const prefixes = ['/api/avatars/', '/uploads/avatars/'];
    const prefix = prefixes.find((p) => avatarUrl.startsWith(p));
    if (!prefix)
        return;
    const filename = path_1.default.basename(avatarUrl);
    if (!filename || filename.includes('..'))
        return;
    const fullPath = path_1.default.join(AVATAR_DIR, filename);
    try {
        if (fs_1.default.existsSync(fullPath))
            fs_1.default.unlinkSync(fullPath);
    }
    catch (err) {
        console.warn('Could not delete old avatar file:', err);
    }
}
const userSelect = {
    id: true,
    name: true,
    role: true,
    loginCode: true,
    avatarEmoji: true,
    avatarUrl: true,
    profileColor: true,
};
const avatarUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/heic',
            'image/heif',
        ];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const heicByName = ['.heic', '.heif'].includes(ext);
        if (allowed.includes(file.mimetype) || heicByName) {
            cb(null, true);
        }
        else {
            cb(new Error('Nur Bilddateien sind erlaubt (JPEG, PNG, GIF, WebP, HEIC).'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});
/** Rewrite legacy /uploads/avatars/… URLs to /api/avatars/… for the CRA proxy. */
function normalizeAvatarUrl(avatarUrl) {
    if (!avatarUrl)
        return null;
    if (avatarUrl.startsWith('/uploads/avatars/')) {
        return avatarUrl.replace('/uploads/avatars/', '/api/avatars/');
    }
    return avatarUrl;
}
function withNormalizedAvatar(user) {
    var _a;
    return { ...user, avatarUrl: normalizeAvatarUrl((_a = user.avatarUrl) !== null && _a !== void 0 ? _a : null) };
}
// Get all users (for teachers only)
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: userSelect,
            orderBy: { name: 'asc' },
        });
        res.json(users.map(withNormalizedAvatar));
    }
    catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
// Get current user (myself)
const getCurrentUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: userSelect,
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(withNormalizedAvatar(user));
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
            select: userSelect,
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(withNormalizedAvatar(user));
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
// Update user avatar emoji (Bild bleibt erhalten – beide existieren parallel)
const updateUserAvatarEmoji = async (req, res) => {
    try {
        const { avatarEmoji } = req.body;
        if (!avatarEmoji) {
            return res.status(400).json({ error: 'Avatar emoji is required' });
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { avatarEmoji },
            select: userSelect,
        });
        res.json(withNormalizedAvatar(user));
    }
    catch (error) {
        console.error('Error updating user avatar emoji:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
const updateProfileAppearance = async (req, res) => {
    try {
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ error: 'Nur das eigene Profil kann bearbeitet werden' });
        }
        const { avatarEmoji, profileColor } = req.body;
        const data = {};
        if (typeof avatarEmoji === 'string' && avatarEmoji.trim()) {
            data.avatarEmoji = avatarEmoji.trim();
        }
        if (profileColor === null || profileColor === '') {
            data.profileColor = null;
        }
        else if (typeof profileColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(profileColor.trim())) {
            data.profileColor = profileColor.trim();
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Keine gültigen Profildaten' });
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: userSelect,
        });
        res.json(withNormalizedAvatar(user));
    }
    catch (error) {
        console.error('Error updating profile appearance:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
const uploadAvatarImage = async (req, res) => {
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur das eigene Avatar-Bild kann hochgeladen werden' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Kein Bild hochgeladen' });
        }
        const ext = path_1.default.extname(req.file.originalname).toLowerCase();
        const isHeic = ['.heic', '.heif'].includes(ext);
        let buffer;
        try {
            buffer = isHeic
                ? await (0, imageToJpeg_1.uploadBufferToJpegBuffer)(req.file.buffer, req.file.originalname, 512)
                : req.file.buffer;
        }
        catch (err) {
            console.error('Avatar image convert error:', err);
            return res.status(400).json({ error: 'Bild konnte nicht verarbeitet werden' });
        }
        const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const finalExt = isHeic
            ? '.jpg'
            : allowedExt.includes(ext)
                ? ext === '.jpeg'
                    ? '.jpg'
                    : ext
                : '.jpg';
        const finalName = `${(0, uuid_1.v4)()}${finalExt}`;
        fs_1.default.writeFileSync(path_1.default.join(AVATAR_DIR, finalName), buffer);
        const avatarUrl = `${AVATAR_URL_PREFIX}/${finalName}`;
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { avatarUrl: true },
        });
        deleteAvatarFileIfLocal(existing === null || existing === void 0 ? void 0 : existing.avatarUrl);
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { avatarUrl },
            select: userSelect,
        });
        res.json(withNormalizedAvatar(user));
    }
    catch (error) {
        console.error('Error uploading avatar image:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
const deleteAvatarImage = async (req, res) => {
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur das eigene Avatar-Bild kann entfernt werden' });
        }
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { avatarUrl: true },
        });
        deleteAvatarFileIfLocal(existing === null || existing === void 0 ? void 0 : existing.avatarUrl);
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { avatarUrl: null },
            select: userSelect,
        });
        res.json(withNormalizedAvatar(user));
    }
    catch (error) {
        console.error('Error deleting avatar image:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
const updateStudentCredentials = async (req, res) => {
    var _a;
    try {
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur Lehrkräfte können Schülerdaten ändern' });
        }
        const { name, loginCode } = req.body;
        const data = {};
        if (typeof name === 'string' && name.trim()) {
            const parts = name.trim().split(/\s+/).filter(Boolean);
            data.name =
                parts.length <= 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1]}`;
        }
        if (typeof loginCode === 'string' && loginCode.trim()) {
            data.loginCode = loginCode.trim();
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Name oder Login-Code erforderlich' });
        }
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, role: true },
        });
        if (!existing || existing.role !== 'STUDENT') {
            return res.status(404).json({ error: 'Schüler nicht gefunden' });
        }
        if (data.loginCode) {
            const conflict = await prisma.user.findFirst({
                where: { loginCode: data.loginCode, NOT: { id: req.params.id } },
                select: { id: true, name: true },
            });
            if (conflict) {
                return res.status(409).json({
                    error: `Login-Code bereits vergeben (${conflict.name})`,
                });
            }
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: userSelect,
        });
        res.json(withNormalizedAvatar(user));
    }
    catch (error) {
        console.error('Error updating student credentials:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
router.get('/', auth_1.authenticateUser, auth_1.requireTeacher, getAllUsers);
router.get('/me', auth_1.authenticateUser, getCurrentUser);
router.get('/:id', auth_1.authenticateUser, getUserById);
router.put('/:id/credentials', auth_1.authenticateUser, auth_1.requireTeacher, updateStudentCredentials);
router.put('/:id/avatar-emoji', auth_1.authenticateUser, updateUserAvatarEmoji);
router.put('/:id/profile-appearance', auth_1.authenticateUser, updateProfileAppearance);
router.post('/:id/avatar-image', auth_1.authenticateUser, (req, res, next) => {
    avatarUpload.single('image')(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
            return res.status(400).json({ error: message });
        }
        next();
    });
}, uploadAvatarImage);
router.delete('/:id/avatar-image', auth_1.authenticateUser, deleteAvatarImage);
router.get('/teacher/:id/groups', auth_1.authenticateUser, auth_1.requireTeacher, getTeacherGroups);
router.get('/student/:id/groups', auth_1.authenticateUser, getStudentGroups);
exports.default = router;
//# sourceMappingURL=users.js.map