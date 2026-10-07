import { Router, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateUser, requireTeacher } from '../middleware/auth';
import { uploadBufferToJpegBuffer } from '../utils/imageToJpeg';
import { loginCodeTaken, toStoredLoginCode } from '../utils/loginCodeCrypto';
import {
  appendCustomPhoto,
  clearCustomPhotoEdit,
  MAX_AVATAR_CUSTOM_PHOTOS,
  removeCustomPhoto,
  resolveAvatarCustomActiveId,
  resolveAvatarCustomGallery,
  serializeAvatarCustomGallery,
  syncLegacyCustomFields,
  updateCustomPhotoEdit,
  type AvatarCustomPhoto,
} from '../lib/avatarCustomGallery';

const router = Router();
const prisma = new PrismaClient();

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');
/** Served under /api so the CRA proxy always forwards the image. */
const AVATAR_URL_PREFIX = '/api/avatars';

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

function deleteAvatarFileIfLocal(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return;
  const prefixes = ['/api/avatars/', '/uploads/avatars/'];
  const prefix = prefixes.find((p) => avatarUrl.startsWith(p));
  if (!prefix) return;
  const filename = path.basename(avatarUrl);
  if (!filename || filename.includes('..')) return;
  const fullPath = path.join(AVATAR_DIR, filename);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
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
} as const;

type AvatarPhotoSlotName = 'primary' | 'alt' | 'custom';

function parseAvatarTargetSlot(raw: unknown): AvatarPhotoSlotName {
  const s = String(raw || '').trim();
  if (s === 'primary' || s === 'alt' || s === 'custom') return s;
  return 'custom';
}

function editFieldForSlot(
  slot: AvatarPhotoSlotName,
  customMode: string,
): 'avatarEditPrimary' | 'avatarEditAlt' | 'avatarEditCustom' | 'avatarUrlCustom' {
  if (slot === 'primary') return 'avatarEditPrimary';
  if (slot === 'alt') return 'avatarEditAlt';
  if (customMode === 'base') return 'avatarUrlCustom';
  return 'avatarEditCustom';
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
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
    const ext = path.extname(file.originalname).toLowerCase();
    const heicByName = ['.heic', '.heif'].includes(ext);
    if (allowed.includes(file.mimetype) || heicByName) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt (JPEG, PNG, GIF, WebP, HEIC).'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** Rewrite legacy /uploads/avatars/… URLs to /api/avatars/… for the CRA proxy. */
function normalizeAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('/uploads/avatars/')) {
    return avatarUrl.replace('/uploads/avatars/', '/api/avatars/');
  }
  return avatarUrl;
}

function normalizeGalleryPhoto(photo: AvatarCustomPhoto): AvatarCustomPhoto {
  return {
    id: photo.id,
    base: normalizeAvatarUrl(photo.base) || photo.base,
    edit: normalizeAvatarUrl(photo.edit) ?? null,
  };
}

function withNormalizedAvatar<
  T extends {
    avatarUrl?: string | null;
    avatarUrlAlt?: string | null;
    avatarUrlCustom?: string | null;
    avatarEditPrimary?: string | null;
    avatarEditAlt?: string | null;
    avatarEditCustom?: string | null;
    avatarCustomGallery?: string | null;
    avatarCustomActiveId?: string | null;
  },
>(user: T): T & { avatarCustomGallery: AvatarCustomPhoto[]; avatarCustomActiveId: string | null } {
  const gallery = resolveAvatarCustomGallery(user).map(normalizeGalleryPhoto);
  const activeId = resolveAvatarCustomActiveId(user, gallery);
  const legacy = syncLegacyCustomFields(gallery, activeId);
  return {
    ...user,
    avatarUrl: normalizeAvatarUrl(user.avatarUrl ?? null),
    avatarUrlAlt: normalizeAvatarUrl(user.avatarUrlAlt ?? null),
    avatarUrlCustom: normalizeAvatarUrl(legacy.avatarUrlCustom),
    avatarEditPrimary: normalizeAvatarUrl(user.avatarEditPrimary ?? null),
    avatarEditAlt: normalizeAvatarUrl(user.avatarEditAlt ?? null),
    avatarEditCustom: normalizeAvatarUrl(legacy.avatarEditCustom),
    avatarCustomGallery: gallery,
    avatarCustomActiveId: activeId,
  };
}

function defaultAvatarPhotoSlot(user: {
  avatarUrl: string | null;
  avatarUrlAlt: string | null;
  avatarUrlCustom: string | null;
  avatarCustomGallery?: string | null;
}): string {
  if (user.avatarUrl) return 'primary';
  if (user.avatarUrlAlt) return 'alt';
  if (resolveAvatarCustomGallery(user).length > 0 || user.avatarUrlCustom) return 'custom';
  return 'primary';
}

function parseCustomGalleryId(raw: unknown): string | null {
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
} as const;

// Get all users (for teachers only)
const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { name: 'asc' },
    });

    res.json(users.map(withNormalizedAvatar));
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user (myself)
const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(withNormalizedAvatar(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get a single user by ID
const getUserById: RequestHandler = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(withNormalizedAvatar(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all learning groups for a teacher
const getTeacherGroups: RequestHandler = async (req, res) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      where: { teacherId: req.params.id },
      include: { students: true },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all learning groups for a student
const getStudentGroups: RequestHandler = async (req, res) => {
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
    res.json(user?.learningGroups || []);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user avatar emoji (Bild bleibt erhalten – beide existieren parallel)
const updateUserAvatarEmoji: RequestHandler = async (req, res) => {
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
  } catch (error) {
    console.error('Error updating user avatar emoji:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProfileAppearance: RequestHandler = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Nur das eigene Profil kann bearbeitet werden' });
    }

    const { avatarEmoji, profileColor } = req.body as {
      avatarEmoji?: string;
      profileColor?: string | null;
    };

    const data: { avatarEmoji?: string; profileColor?: string | null } = {};
    if (typeof avatarEmoji === 'string' && avatarEmoji.trim()) {
      data.avatarEmoji = avatarEmoji.trim();
    }
    if (profileColor === null || profileColor === '') {
      data.profileColor = null;
    } else if (typeof profileColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(profileColor.trim())) {
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
  } catch (error) {
    console.error('Error updating profile appearance:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const uploadAvatarImage: RequestHandler = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur das eigene Avatar-Bild kann hochgeladen werden' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isHeic = ['.heic', '.heif'].includes(ext);

    let buffer: Buffer;
    try {
      buffer = isHeic
        ? await uploadBufferToJpegBuffer(req.file.buffer, req.file.originalname, 512)
        : req.file.buffer;
    } catch (err) {
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
    const finalName = `${uuidv4()}${finalExt}`;
    fs.writeFileSync(path.join(AVATAR_DIR, finalName), buffer);

    const avatarUrl = `${AVATAR_URL_PREFIX}/${finalName}`;

    const isStudent = req.user.role === 'STUDENT' && req.user.id === req.params.id;

    if (isStudent) {
      const targetSlot = parseAvatarTargetSlot(req.body?.targetSlot);
      const customMode = String(req.body?.customMode || 'edit').trim() === 'base' ? 'base' : 'edit';
      const customGalleryId = parseCustomGalleryId(req.body?.customGalleryId);

      const existing = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          ...galleryUserSelect,
          avatarEditPrimary: true,
          avatarEditAlt: true,
        },
      });

      if (targetSlot === 'custom' && customMode === 'base') {
        const gallery = resolveAvatarCustomGallery(existing ?? {});
        if (gallery.length >= MAX_AVATAR_CUSTOM_PHOTOS) {
          return res.status(400).json({
            error: `Maximal ${MAX_AVATAR_CUSTOM_PHOTOS} eigene Fotos möglich.`,
          });
        }
        const { gallery: nextGallery, newId } = appendCustomPhoto(gallery, avatarUrl);
        const legacy = syncLegacyCustomFields(nextGallery, newId);
        const user = await prisma.user.update({
          where: { id: req.params.id },
          data: {
            avatarCustomGallery: serializeAvatarCustomGallery(nextGallery),
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
        const gallery = resolveAvatarCustomGallery(existing ?? {});
        const photoId =
          customGalleryId || resolveAvatarCustomActiveId(existing ?? {}, gallery);
        if (!photoId || !gallery.some((p) => p.id === photoId)) {
          return res.status(400).json({ error: 'Eigenes Foto nicht gefunden' });
        }
        const prevEdit = gallery.find((p) => p.id === photoId)?.edit;
        deleteAvatarFileIfLocal(prevEdit);
        const nextGallery = updateCustomPhotoEdit(gallery, photoId, avatarUrl);
        const activeId = resolveAvatarCustomActiveId(existing ?? {}, nextGallery);
        const legacy = syncLegacyCustomFields(nextGallery, activeId);
        const user = await prisma.user.update({
          where: { id: req.params.id },
          data: {
            avatarCustomGallery: serializeAvatarCustomGallery(nextGallery),
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
      const data: Record<string, string | null> = { [updateField]: avatarUrl };
      const prev = existing?.[updateField as keyof typeof existing];
      deleteAvatarFileIfLocal(prev as string | null | undefined);

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
    deleteAvatarFileIfLocal(existing?.avatarUrl);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { avatarUrl },
      select: userSelect,
    });

    res.json(withNormalizedAvatar(user));
  } catch (error) {
    console.error('Error uploading avatar image:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteAvatarImage: RequestHandler = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur das eigene Avatar-Bild kann entfernt werden' });
    }
    const slot = parseAvatarTargetSlot(
      (req.body as { slot?: string })?.slot ?? (req.query as { slot?: string })?.slot,
    );
    const customGalleryId = parseCustomGalleryId(
      (req.body as { customGalleryId?: string })?.customGalleryId,
    );
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        ...galleryUserSelect,
        role: true,
      },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (req.user.role === 'STUDENT') {
      if (slot === 'custom') {
        const gallery = resolveAvatarCustomGallery(existing);
        if (gallery.length === 0) {
          return res.status(400).json({ error: 'Kein eigenes Foto vorhanden' });
        }
        const removeId =
          customGalleryId || resolveAvatarCustomActiveId(existing, gallery) || gallery[0].id;
        const photo = gallery.find((p) => p.id === removeId);
        if (!photo) return res.status(404).json({ error: 'Eigenes Foto nicht gefunden' });
        deleteAvatarFileIfLocal(photo.base);
        deleteAvatarFileIfLocal(photo.edit);
        const nextGallery = removeCustomPhoto(gallery, removeId);
        const nextActiveId =
          nextGallery.length > 0
            ? nextGallery.find((p) => p.id === existing.avatarCustomActiveId)?.id ||
              nextGallery[nextGallery.length - 1].id
            : null;
        const legacy = syncLegacyCustomFields(nextGallery, nextActiveId);
        const user = await prisma.user.update({
          where: { id: req.params.id },
          data: {
            avatarCustomGallery:
              nextGallery.length > 0 ? serializeAvatarCustomGallery(nextGallery) : null,
            avatarCustomActiveId: nextActiveId,
            avatarUrlCustom: legacy.avatarUrlCustom,
            avatarEditCustom: legacy.avatarEditCustom,
            avatarPhotoSlot: defaultAvatarPhotoSlot({
              avatarUrl: existing.avatarUrl,
              avatarUrlAlt: existing.avatarUrlAlt,
              avatarUrlCustom: legacy.avatarUrlCustom,
              avatarCustomGallery:
                nextGallery.length > 0 ? serializeAvatarCustomGallery(nextGallery) : null,
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
  } catch (error) {
    console.error('Error deleting avatar image:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetAvatarPhotoEdit: RequestHandler = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur das eigene Profilbild kann zurückgesetzt werden' });
    }
    const slot = parseAvatarTargetSlot((req.body as { slot?: string })?.slot);
    const customGalleryId = parseCustomGalleryId(
      (req.body as { customGalleryId?: string })?.customGalleryId,
    );

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        avatarEditPrimary: true,
        avatarEditAlt: true,
        avatarEditCustom: true,
        ...galleryUserSelect,
      },
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (slot === 'custom') {
      const gallery = resolveAvatarCustomGallery(existing);
      const photoId =
        customGalleryId || resolveAvatarCustomActiveId(existing, gallery);
      const photo = gallery.find((p) => p.id === photoId);
      if (!photo?.edit) {
        return res.status(400).json({ error: 'Keine Bearbeitung zum Zurücksetzen' });
      }
      deleteAvatarFileIfLocal(photo.edit);
      const nextGallery = clearCustomPhotoEdit(gallery, photoId!);
      const activeId = resolveAvatarCustomActiveId(existing, nextGallery);
      const legacy = syncLegacyCustomFields(nextGallery, activeId);
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          avatarCustomGallery: serializeAvatarCustomGallery(nextGallery),
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
  } catch (error) {
    console.error('Error resetting avatar edit:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateAvatarPhotoSlot: RequestHandler = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur das eigene Profilbild kann gewählt werden' });
    }
    const slot = String((req.body as { slot?: string })?.slot || '').trim();
    const customGalleryId = parseCustomGalleryId(
      (req.body as { customGalleryId?: string })?.customGalleryId,
    );
    if (slot !== 'primary' && slot !== 'alt' && slot !== 'custom') {
      return res.status(400).json({ error: 'slot muss primary, alt oder custom sein' });
    }
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: galleryUserSelect,
    });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (slot === 'alt' && !existing.avatarUrlAlt) {
      return res.status(400).json({ error: 'Kein zweites Foto vorhanden' });
    }
    if (slot === 'primary' && !existing.avatarUrl) {
      return res.status(400).json({ error: 'Kein erstes Foto vorhanden' });
    }
    const gallery = resolveAvatarCustomGallery(existing);
    if (slot === 'custom' && gallery.length === 0) {
      return res.status(400).json({ error: 'Kein eigenes Foto vorhanden' });
    }
    const data: {
      avatarPhotoSlot: string;
      avatarCustomActiveId?: string | null;
      avatarCustomGallery?: string | null;
      avatarUrlCustom?: string | null;
      avatarEditCustom?: string | null;
    } = { avatarPhotoSlot: slot };
    if (slot === 'custom') {
      const activeId =
        (customGalleryId && gallery.some((p) => p.id === customGalleryId)
          ? customGalleryId
          : null) || resolveAvatarCustomActiveId(existing, gallery);
      if (!activeId) {
        return res.status(400).json({ error: 'Kein eigenes Foto vorhanden' });
      }
      const legacy = syncLegacyCustomFields(gallery, activeId);
      data.avatarCustomActiveId = activeId;
      data.avatarUrlCustom = legacy.avatarUrlCustom;
      data.avatarEditCustom = legacy.avatarEditCustom;
      if (gallery.length > 0 && !existing.avatarCustomGallery) {
        data.avatarCustomGallery = serializeAvatarCustomGallery(gallery);
      }
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: userSelect,
    });
    res.json(withNormalizedAvatar(user));
  } catch (error) {
    console.error('Error updating avatar photo slot:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateStudentCredentials: RequestHandler = async (req, res) => {
  try {
    if (req.user?.role !== 'TEACHER') {
      return res.status(403).json({ error: 'Nur Lehrkräfte können Schülerdaten ändern' });
    }

    const { name, loginCode } = req.body as { name?: string; loginCode?: string };
    const data: { name?: string; loginCode?: string } = {};

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
      const conflict = await loginCodeTaken(prisma, plainLoginCode, req.params.id);
      if (conflict) {
        return res.status(409).json({
          error: `Login-Code bereits vergeben`,
        });
      }
      data.loginCode = toStoredLoginCode(plainLoginCode);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: userSelect,
    });
    res.json(
      withNormalizedAvatar({
        ...user,
        loginCode: plainLoginCode || '',
      }),
    );
  } catch (error) {
    console.error('Error updating student credentials:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/', authenticateUser, requireTeacher, getAllUsers);
router.get('/me', authenticateUser, getCurrentUser);
router.get('/:id', authenticateUser, getUserById);
router.put('/:id/credentials', authenticateUser, requireTeacher, updateStudentCredentials);
router.put('/:id/avatar-emoji', authenticateUser, updateUserAvatarEmoji);
router.put('/:id/avatar-photo-slot', authenticateUser, updateAvatarPhotoSlot);
router.put('/:id/avatar-photo-edit-reset', authenticateUser, resetAvatarPhotoEdit);
router.put('/:id/profile-appearance', authenticateUser, updateProfileAppearance);
router.post(
  '/:id/avatar-image',
  authenticateUser,
  (req, res, next) => {
    avatarUpload.single('image')(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
        return res.status(400).json({ error: message });
      }
      next();
    });
  },
  uploadAvatarImage,
);
router.delete('/:id/avatar-image', authenticateUser, deleteAvatarImage);
router.get('/teacher/:id/groups', authenticateUser, requireTeacher, getTeacherGroups);
router.get('/student/:id/groups', authenticateUser, getStudentGroups);

export default router;
