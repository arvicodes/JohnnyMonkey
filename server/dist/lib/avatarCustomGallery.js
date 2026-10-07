"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_AVATAR_CUSTOM_PHOTOS = void 0;
exports.parseAvatarCustomGalleryRaw = parseAvatarCustomGalleryRaw;
exports.resolveAvatarCustomGallery = resolveAvatarCustomGallery;
exports.resolveAvatarCustomActiveId = resolveAvatarCustomActiveId;
exports.displayUrlForCustomPhoto = displayUrlForCustomPhoto;
exports.syncLegacyCustomFields = syncLegacyCustomFields;
exports.serializeAvatarCustomGallery = serializeAvatarCustomGallery;
exports.appendCustomPhoto = appendCustomPhoto;
exports.updateCustomPhotoEdit = updateCustomPhotoEdit;
exports.clearCustomPhotoEdit = clearCustomPhotoEdit;
exports.removeCustomPhoto = removeCustomPhoto;
const uuid_1 = require("uuid");
exports.MAX_AVATAR_CUSTOM_PHOTOS = 12;
function parseAvatarCustomGalleryRaw(raw) {
    if (!(raw === null || raw === void 0 ? void 0 : raw.trim()))
        return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed))
            return [];
        const out = [];
        for (const item of parsed) {
            if (!item || typeof item !== 'object')
                continue;
            const id = String(item.id || '').trim();
            const base = String(item.base || '').trim();
            if (!id || !base)
                continue;
            const edit = item.edit;
            out.push({
                id,
                base,
                edit: edit ? String(edit).trim() : null,
            });
        }
        return out;
    }
    catch {
        return [];
    }
}
/** Legacy avatarUrlCustom → Galerie, falls noch leer. */
function resolveAvatarCustomGallery(user) {
    var _a, _b;
    let gallery = parseAvatarCustomGalleryRaw(user.avatarCustomGallery);
    if (gallery.length === 0 && user.avatarUrlCustom) {
        gallery = [
            {
                id: ((_a = user.avatarCustomActiveId) === null || _a === void 0 ? void 0 : _a.trim()) || (0, uuid_1.v4)(),
                base: user.avatarUrlCustom,
                edit: (_b = user.avatarEditCustom) !== null && _b !== void 0 ? _b : null,
            },
        ];
    }
    return gallery;
}
function resolveAvatarCustomActiveId(user, gallery) {
    var _a, _b, _c;
    const active = (_a = user.avatarCustomActiveId) === null || _a === void 0 ? void 0 : _a.trim();
    if (active && gallery.some((g) => g.id === active))
        return active;
    return (_c = (_b = gallery[gallery.length - 1]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : null;
}
function displayUrlForCustomPhoto(photo) {
    var _a;
    return (((_a = photo.edit) === null || _a === void 0 ? void 0 : _a.trim()) || photo.base).trim();
}
function syncLegacyCustomFields(gallery, activeId) {
    var _a;
    const item = (activeId && gallery.find((g) => g.id === activeId)) || gallery[0];
    if (!item)
        return { avatarUrlCustom: null, avatarEditCustom: null };
    return {
        avatarUrlCustom: item.base,
        avatarEditCustom: (_a = item.edit) !== null && _a !== void 0 ? _a : null,
    };
}
function serializeAvatarCustomGallery(gallery) {
    return JSON.stringify(gallery);
}
function appendCustomPhoto(gallery, baseUrl) {
    const newId = (0, uuid_1.v4)();
    return {
        gallery: [...gallery, { id: newId, base: baseUrl, edit: null }],
        newId,
    };
}
function updateCustomPhotoEdit(gallery, photoId, editUrl) {
    return gallery.map((p) => (p.id === photoId ? { ...p, edit: editUrl } : p));
}
function clearCustomPhotoEdit(gallery, photoId) {
    return gallery.map((p) => (p.id === photoId ? { ...p, edit: null } : p));
}
function removeCustomPhoto(gallery, photoId) {
    return gallery.filter((p) => p.id !== photoId);
}
//# sourceMappingURL=avatarCustomGallery.js.map