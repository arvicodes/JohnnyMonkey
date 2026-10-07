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
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const avatarCustomGallery_1 = require("../lib/avatarCustomGallery");
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
    avatarUrlAlt: true,
    avatarUrlCustom: true,
    avatarEditPrimary: true,
    avatarEditAlt: true,
    avatarEditCustom: true,
    avatarCustomGallery: true,
    avatarCustomActiveId: true,
    avatarPhotoSlot: true,
    profileColor: true,
};
function parseAvatarTargetSlot(raw) {
    const s = String(raw || '').trim();
    if (s === 'primary' || s === 'alt' || s === 'custom')
        return s;
    return 'custom';
}
function editFieldForSlot(slot, customMode) {
    if (slot === 'primary')
        return 'avatarEditPrimary';
    if (slot === 'alt')
        return 'avatarEditAlt';
    if (customMode === 'base')
        return 'avatarUrlCustom';
    return 'avatarEditCustom';
}
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
function normalizeGalleryPhoto(photo) {
    var _a;
    return {
        id: photo.id,
        base: normalizeAvatarUrl(photo.base) || photo.base,
        edit: (_a = normalizeAvatarUrl(photo.edit)) !== null && _a !== void 0 ? _a : null,
    };
}
function withNormalizedAvatar(user) {
    var _a, _b, _c, _d;
    const gallery = (0, avatarCustomGallery_1.resolveAvatarCustomGallery)(user).map(normalizeGalleryPhoto);
    const activeId = (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(user, gallery);
    const legacy = (0, avatarCustomGallery_1.syncLegacyCustomFields)(gallery, activeId);
    return {
        ...user,
        avatarUrl: normalizeAvatarUrl((_a = user.avatarUrl) !== null && _a !== void 0 ? _a : null),
        avatarUrlAlt: normalizeAvatarUrl((_b = user.avatarUrlAlt) !== null && _b !== void 0 ? _b : null),
        avatarUrlCustom: normalizeAvatarUrl(legacy.avatarUrlCustom),
        avatarEditPrimary: normalizeAvatarUrl((_c = user.avatarEditPrimary) !== null && _c !== void 0 ? _c : null),
        avatarEditAlt: normalizeAvatarUrl((_d = user.avatarEditAlt) !== null && _d !== void 0 ? _d : null),
        avatarEditCustom: normalizeAvatarUrl(legacy.avatarEditCustom),
        avatarCustomGallery: gallery,
        avatarCustomActiveId: activeId,
    };
}
function defaultAvatarPhotoSlot(user) {
    if (user.avatarUrl)
        return 'primary';
    if (user.avatarUrlAlt)
        return 'alt';
    if ((0, avatarCustomGallery_1.resolveAvatarCustomGallery)(user).length > 0 || user.avatarUrlCustom)
        return 'custom';
    return 'primary';
}
function parseCustomGalleryId(raw) {
    const id = String(raw || '').trim();
    return id || null;
}
const galleryUserSelect = {
    avatarCustomGallery: true,
    avatarCustomActiveId: true,
    avatarUrlCustom: true,
    avatarEditCustom: true,
    avatarUrl: true,
    avatarUrlAlt: true,
};
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
    var _a, _b, _c, _d;
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
        const isStudent = req.user.role === 'STUDENT' && req.user.id === req.params.id;
        if (isStudent) {
            const targetSlot = parseAvatarTargetSlot((_a = req.body) === null || _a === void 0 ? void 0 : _a.targetSlot);
            const customMode = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.customMode) || 'edit').trim() === 'base' ? 'base' : 'edit';
            const customGalleryId = parseCustomGalleryId((_c = req.body) === null || _c === void 0 ? void 0 : _c.customGalleryId);
            const existing = await prisma.user.findUnique({
                where: { id: req.params.id },
                select: {
                    ...galleryUserSelect,
                    avatarEditPrimary: true,
                    avatarEditAlt: true,
                },
            });
            if (targetSlot === 'custom' && customMode === 'base') {
                const gallery = (0, avatarCustomGallery_1.resolveAvatarCustomGallery)(existing !== null && existing !== void 0 ? existing : {});
                if (gallery.length >= avatarCustomGallery_1.MAX_AVATAR_CUSTOM_PHOTOS) {
                    return res.status(400).json({
                        error: `Maximal ${avatarCustomGallery_1.MAX_AVATAR_CUSTOM_PHOTOS} eigene Fotos möglich.`,
                    });
                }
                const { gallery: nextGallery, newId } = (0, avatarCustomGallery_1.appendCustomPhoto)(gallery, avatarUrl);
                const legacy = (0, avatarCustomGallery_1.syncLegacyCustomFields)(nextGallery, newId);
                const user = await prisma.user.update({
                    where: { id: req.params.id },
                    data: {
                        avatarCustomGallery: (0, avatarCustomGallery_1.serializeAvatarCustomGallery)(nextGallery),
                        avatarCustomActiveId: newId,
                        avatarPhotoSlot: 'custom',
                        avatarUrlCustom: legacy.avatarUrlCustom,
                        avatarEditCustom: legacy.avatarEditCustom,
                    },
                    select: userSelect,
                });
                return res.json(withNormalizedAvatar(user));
            }
            if (targetSlot === 'custom' && customMode === 'edit') {
                const gallery = (0, avatarCustomGallery_1.resolveAvatarCustomGallery)(existing !== null && existing !== void 0 ? existing : {});
                const photoId = customGalleryId || (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(existing !== null && existing !== void 0 ? existing : {}, gallery);
                if (!photoId || !gallery.some((p) => p.id === photoId)) {
                    return res.status(400).json({ error: 'Eigenes Foto nicht gefunden' });
                }
                const prevEdit = (_d = gallery.find((p) => p.id === photoId)) === null || _d === void 0 ? void 0 : _d.edit;
                deleteAvatarFileIfLocal(prevEdit);
                const nextGallery = (0, avatarCustomGallery_1.updateCustomPhotoEdit)(gallery, photoId, avatarUrl);
                const activeId = (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(existing !== null && existing !== void 0 ? existing : {}, nextGallery);
                const legacy = (0, avatarCustomGallery_1.syncLegacyCustomFields)(nextGallery, activeId);
                const user = await prisma.user.update({
                    where: { id: req.params.id },
                    data: {
                        avatarCustomGallery: (0, avatarCustomGallery_1.serializeAvatarCustomGallery)(nextGallery),
                        avatarCustomActiveId: activeId,
                        avatarPhotoSlot: 'custom',
                        avatarUrlCustom: legacy.avatarUrlCustom,
                        avatarEditCustom: legacy.avatarEditCustom,
                    },
                    select: userSelect,
                });
                return res.json(withNormalizedAvatar(user));
            }
            const updateField = editFieldForSlot(targetSlot, customMode);
            const data = { [updateField]: avatarUrl };
            const prev = existing === null || existing === void 0 ? void 0 : existing[updateField];
            deleteAvatarFileIfLocal(prev);
            const user = await prisma.user.update({
                where: { id: req.params.id },
                data,
                select: userSelect,
            });
            return res.json(withNormalizedAvatar(user));
        }
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
    var _a, _b, _c, _d, _e;
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur das eigene Avatar-Bild kann entfernt werden' });
        }
        const slot = parseAvatarTargetSlot((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.slot) !== null && _b !== void 0 ? _b : (_c = req.query) === null || _c === void 0 ? void 0 : _c.slot);
        const customGalleryId = parseCustomGalleryId((_d = req.body) === null || _d === void 0 ? void 0 : _d.customGalleryId);
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                ...galleryUserSelect,
                role: true,
            },
        });
        if (!existing)
            return res.status(404).json({ error: 'User not found' });
        if (req.user.role === 'STUDENT') {
            if (slot === 'custom') {
                const gallery = (0, avatarCustomGallery_1.resolveAvatarCustomGallery)(existing);
                if (gallery.length === 0) {
                    return res.status(400).json({ error: 'Kein eigenes Foto vorhanden' });
                }
                const removeId = customGalleryId || (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(existing, gallery) || gallery[0].id;
                const photo = gallery.find((p) => p.id === removeId);
                if (!photo)
                    return res.status(404).json({ error: 'Eigenes Foto nicht gefunden' });
                deleteAvatarFileIfLocal(photo.base);
                deleteAvatarFileIfLocal(photo.edit);
                const nextGallery = (0, avatarCustomGallery_1.removeCustomPhoto)(gallery, removeId);
                const nextActiveId = nextGallery.length > 0
                    ? ((_e = nextGallery.find((p) => p.id === existing.avatarCustomActiveId)) === null || _e === void 0 ? void 0 : _e.id) ||
                        nextGallery[nextGallery.length - 1].id
                    : null;
                const legacy = (0, avatarCustomGallery_1.syncLegacyCustomFields)(nextGallery, nextActiveId);
                const user = await prisma.user.update({
                    where: { id: req.params.id },
                    data: {
                        avatarCustomGallery: nextGallery.length > 0 ? (0, avatarCustomGallery_1.serializeAvatarCustomGallery)(nextGallery) : null,
                        avatarCustomActiveId: nextActiveId,
                        avatarUrlCustom: legacy.avatarUrlCustom,
                        avatarEditCustom: legacy.avatarEditCustom,
                        avatarPhotoSlot: defaultAvatarPhotoSlot({
                            avatarUrl: existing.avatarUrl,
                            avatarUrlAlt: existing.avatarUrlAlt,
                            avatarUrlCustom: legacy.avatarUrlCustom,
                            avatarCustomGallery: nextGallery.length > 0 ? (0, avatarCustomGallery_1.serializeAvatarCustomGallery)(nextGallery) : null,
                        }),
                    },
                    select: userSelect,
                });
                return res.json(withNormalizedAvatar(user));
            }
            if (slot === 'primary' && !existing.avatarUrlAlt && existing.avatarUrl) {
                deleteAvatarFileIfLocal(existing.avatarUrl);
                const user = await prisma.user.update({
                    where: { id: req.params.id },
                    data: { avatarUrl: null, avatarPhotoSlot: 'primary' },
                    select: userSelect,
                });
                return res.json(withNormalizedAvatar(user));
            }
            return res.status(403).json({
                error: 'Lehrer-Fotos können nicht entfernt werden. „Eigenes“ Foto kann entfernt werden.',
            });
        }
        deleteAvatarFileIfLocal(existing.avatarUrl);
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
const resetAvatarPhotoEdit = async (req, res) => {
    var _a, _b;
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur das eigene Profilbild kann zurückgesetzt werden' });
        }
        const slot = parseAvatarTargetSlot((_a = req.body) === null || _a === void 0 ? void 0 : _a.slot);
        const customGalleryId = parseCustomGalleryId((_b = req.body) === null || _b === void 0 ? void 0 : _b.customGalleryId);
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: {
                avatarEditPrimary: true,
                avatarEditAlt: true,
                avatarEditCustom: true,
                ...galleryUserSelect,
            },
        });
        if (!existing)
            return res.status(404).json({ error: 'User not found' });
        if (slot === 'custom') {
            const gallery = (0, avatarCustomGallery_1.resolveAvatarCustomGallery)(existing);
            const photoId = customGalleryId || (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(existing, gallery);
            const photo = gallery.find((p) => p.id === photoId);
            if (!(photo === null || photo === void 0 ? void 0 : photo.edit)) {
                return res.status(400).json({ error: 'Keine Bearbeitung zum Zurücksetzen' });
            }
            deleteAvatarFileIfLocal(photo.edit);
            const nextGallery = (0, avatarCustomGallery_1.clearCustomPhotoEdit)(gallery, photoId);
            const activeId = (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(existing, nextGallery);
            const legacy = (0, avatarCustomGallery_1.syncLegacyCustomFields)(nextGallery, activeId);
            const user = await prisma.user.update({
                where: { id: req.params.id },
                data: {
                    avatarCustomGallery: (0, avatarCustomGallery_1.serializeAvatarCustomGallery)(nextGallery),
                    avatarUrlCustom: legacy.avatarUrlCustom,
                    avatarEditCustom: legacy.avatarEditCustom,
                },
                select: userSelect,
            });
            return res.json(withNormalizedAvatar(user));
        }
        const editField = slot === 'primary' ? 'avatarEditPrimary' : 'avatarEditAlt';
        const prev = existing[editField];
        if (!prev) {
            return res.status(400).json({ error: 'Keine Bearbeitung zum Zurücksetzen' });
        }
        deleteAvatarFileIfLocal(prev);
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { [editField]: null },
            select: userSelect,
        });
        res.json(withNormalizedAvatar(user));
    }
    catch (error) {
        console.error('Error resetting avatar edit:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
const updateAvatarPhotoSlot = async (req, res) => {
    var _a, _b;
    try {
        if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
            return res.status(403).json({ error: 'Nur das eigene Profilbild kann gewählt werden' });
        }
        const slot = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.slot) || '').trim();
        const customGalleryId = parseCustomGalleryId((_b = req.body) === null || _b === void 0 ? void 0 : _b.customGalleryId);
        if (slot !== 'primary' && slot !== 'alt' && slot !== 'custom') {
            return res.status(400).json({ error: 'slot muss primary, alt oder custom sein' });
        }
        const existing = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: galleryUserSelect,
        });
        if (!existing)
            return res.status(404).json({ error: 'User not found' });
        if (slot === 'alt' && !existing.avatarUrlAlt) {
            return res.status(400).json({ error: 'Kein zweites Foto vorhanden' });
        }
        if (slot === 'primary' && !existing.avatarUrl) {
            return res.status(400).json({ error: 'Kein erstes Foto vorhanden' });
        }
        const gallery = (0, avatarCustomGallery_1.resolveAvatarCustomGallery)(existing);
        if (slot === 'custom' && gallery.length === 0) {
            return res.status(400).json({ error: 'Kein eigenes Foto vorhanden' });
        }
        const data = { avatarPhotoSlot: slot };
        if (slot === 'custom') {
            const activeId = (customGalleryId && gallery.some((p) => p.id === customGalleryId)
                ? customGalleryId
                : null) || (0, avatarCustomGallery_1.resolveAvatarCustomActiveId)(existing, gallery);
            if (!activeId) {
                return res.status(400).json({ error: 'Kein eigenes Foto vorhanden' });
            }
            const legacy = (0, avatarCustomGallery_1.syncLegacyCustomFields)(gallery, activeId);
            data.avatarCustomActiveId = activeId;
            data.avatarUrlCustom = legacy.avatarUrlCustom;
            data.avatarEditCustom = legacy.avatarEditCustom;
            if (gallery.length > 0 && !existing.avatarCustomGallery) {
                data.avatarCustomGallery = (0, avatarCustomGallery_1.serializeAvatarCustomGallery)(gallery);
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
        console.error('Error updating avatar photo slot:', error);
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
        const plainLoginCode = data.loginCode;
        if (plainLoginCode) {
            const conflict = await (0, loginCodeCrypto_1.loginCodeTaken)(prisma, plainLoginCode, req.params.id);
            if (conflict) {
                return res.status(409).json({
                    error: `Login-Code bereits vergeben`,
                });
            }
            data.loginCode = (0, loginCodeCrypto_1.toStoredLoginCode)(plainLoginCode);
        }
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data,
            select: userSelect,
        });
        res.json(withNormalizedAvatar({
            ...user,
            loginCode: plainLoginCode || '',
        }));
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
router.put('/:id/avatar-photo-slot', auth_1.authenticateUser, updateAvatarPhotoSlot);
router.put('/:id/avatar-photo-edit-reset', auth_1.authenticateUser, resetAvatarPhotoEdit);
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