import { v4 as uuidv4 } from 'uuid';

export const MAX_AVATAR_CUSTOM_PHOTOS = 12;

export type AvatarCustomPhoto = {
  id: string;
  base: string;
  edit?: string | null;
};

export type AvatarCustomGalleryUser = {
  avatarCustomGallery?: string | null;
  avatarCustomActiveId?: string | null;
  avatarUrlCustom?: string | null;
  avatarEditCustom?: string | null;
};

export function parseAvatarCustomGalleryRaw(raw: string | null | undefined): AvatarCustomPhoto[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: AvatarCustomPhoto[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const id = String((item as AvatarCustomPhoto).id || '').trim();
      const base = String((item as AvatarCustomPhoto).base || '').trim();
      if (!id || !base) continue;
      const edit = (item as AvatarCustomPhoto).edit;
      out.push({
        id,
        base,
        edit: edit ? String(edit).trim() : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Legacy avatarUrlCustom → Galerie, falls noch leer. */
export function resolveAvatarCustomGallery(user: AvatarCustomGalleryUser): AvatarCustomPhoto[] {
  let gallery = parseAvatarCustomGalleryRaw(user.avatarCustomGallery);
  if (gallery.length === 0 && user.avatarUrlCustom) {
    gallery = [
      {
        id: user.avatarCustomActiveId?.trim() || uuidv4(),
        base: user.avatarUrlCustom,
        edit: user.avatarEditCustom ?? null,
      },
    ];
  }
  return gallery;
}

export function resolveAvatarCustomActiveId(
  user: AvatarCustomGalleryUser,
  gallery: AvatarCustomPhoto[],
): string | null {
  const active = user.avatarCustomActiveId?.trim();
  if (active && gallery.some((g) => g.id === active)) return active;
  return gallery[gallery.length - 1]?.id ?? null;
}

export function displayUrlForCustomPhoto(photo: AvatarCustomPhoto): string {
  return (photo.edit?.trim() || photo.base).trim();
}

export function syncLegacyCustomFields(
  gallery: AvatarCustomPhoto[],
  activeId: string | null,
): { avatarUrlCustom: string | null; avatarEditCustom: string | null } {
  const item = (activeId && gallery.find((g) => g.id === activeId)) || gallery[0];
  if (!item) return { avatarUrlCustom: null, avatarEditCustom: null };
  return {
    avatarUrlCustom: item.base,
    avatarEditCustom: item.edit ?? null,
  };
}

export function serializeAvatarCustomGallery(gallery: AvatarCustomPhoto[]): string {
  return JSON.stringify(gallery);
}

export function appendCustomPhoto(
  gallery: AvatarCustomPhoto[],
  baseUrl: string,
): { gallery: AvatarCustomPhoto[]; newId: string } {
  const newId = uuidv4();
  return {
    gallery: [...gallery, { id: newId, base: baseUrl, edit: null }],
    newId,
  };
}

export function updateCustomPhotoEdit(
  gallery: AvatarCustomPhoto[],
  photoId: string,
  editUrl: string,
): AvatarCustomPhoto[] {
  return gallery.map((p) => (p.id === photoId ? { ...p, edit: editUrl } : p));
}

export function clearCustomPhotoEdit(gallery: AvatarCustomPhoto[], photoId: string): AvatarCustomPhoto[] {
  return gallery.map((p) => (p.id === photoId ? { ...p, edit: null } : p));
}

export function removeCustomPhoto(gallery: AvatarCustomPhoto[], photoId: string): AvatarCustomPhoto[] {
  return gallery.filter((p) => p.id !== photoId);
}
