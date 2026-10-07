export type AvatarCustomPhoto = {
  id: string;
  base: string;
  edit?: string | null;
};

export function parseAvatarCustomGalleryFromApi(raw: unknown): AvatarCustomPhoto[] {
  if (Array.isArray(raw)) {
    const out: AvatarCustomPhoto[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const id = String((item as AvatarCustomPhoto).id || '').trim();
      const base = String((item as AvatarCustomPhoto).base || '').trim();
      if (!id || !base) continue;
      const edit = (item as AvatarCustomPhoto).edit;
      out.push({ id, base, edit: edit ? String(edit).trim() : null });
    }
    return out;
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseAvatarCustomGalleryFromApi(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function resolveCustomPhotoDisplayUrl(
  photo: AvatarCustomPhoto,
  resolveUrl: (u?: string | null) => string | undefined,
): string | undefined {
  return resolveUrl(photo.edit) || resolveUrl(photo.base);
}
