import type { AvatarCustomPhoto } from './avatarCustomGallery';
import { resolveCustomPhotoDisplayUrl } from './avatarCustomGallery';

/** Normalize stored avatar paths so they load via the CRA `/api` proxy. */
export function resolveAvatarUrl(avatarUrl?: string | null): string | undefined {
  const raw = avatarUrl?.trim();
  if (!raw) return undefined;
  if (raw.startsWith('/uploads/avatars/')) {
    return raw.replace('/uploads/avatars/', '/api/avatars/');
  }
  return raw;
}

export type AvatarPhotoSlot = 'primary' | 'alt' | 'custom';

export function parseAvatarPhotoSlot(raw?: string | null): AvatarPhotoSlot {
  if (raw === 'alt') return 'alt';
  if (raw === 'custom') return 'custom';
  return 'primary';
}

export type AvatarPhotoLayers = {
  primary?: string | null;
  alt?: string | null;
  custom?: string | null;
};

export function resolveSlotPhotoUrl(
  slot: AvatarPhotoSlot,
  bases: AvatarPhotoLayers,
  edits: AvatarPhotoLayers = {},
): string | undefined {
  const base =
    slot === 'primary' ? bases.primary : slot === 'alt' ? bases.alt : bases.custom;
  const edit =
    slot === 'primary' ? edits.primary : slot === 'alt' ? edits.alt : edits.custom;
  return resolveAvatarUrl(edit) || resolveAvatarUrl(base);
}

export function slotHasEdit(slot: AvatarPhotoSlot, edits: AvatarPhotoLayers): boolean {
  const edit =
    slot === 'primary' ? edits.primary : slot === 'alt' ? edits.alt : edits.custom;
  return Boolean(resolveAvatarUrl(edit));
}

export function resolveActiveAvatarUrl(
  avatarUrl?: string | null,
  avatarUrlAlt?: string | null,
  slot?: string | null,
  avatarUrlCustom?: string | null,
  edits: AvatarPhotoLayers = {},
  avatarCustomGallery: AvatarCustomPhoto[] = [],
  avatarCustomActiveId?: string | null,
): string | undefined {
  const activeSlot = parseAvatarPhotoSlot(slot);
  if (activeSlot === 'custom' && avatarCustomGallery.length > 0) {
    const item =
      (avatarCustomActiveId &&
        avatarCustomGallery.find((p) => p.id === avatarCustomActiveId)) ||
      avatarCustomGallery[avatarCustomGallery.length - 1];
    const fromGallery = item
      ? resolveCustomPhotoDisplayUrl(item, resolveAvatarUrl)
      : undefined;
    if (fromGallery) return fromGallery;
  }
  const bases: AvatarPhotoLayers = {
    primary: avatarUrl,
    alt: avatarUrlAlt,
    custom: avatarUrlCustom,
  };
  const fromSlot = resolveSlotPhotoUrl(activeSlot, bases, edits);
  if (fromSlot) return fromSlot;
  return (
    resolveSlotPhotoUrl('custom', bases, edits) ||
    resolveSlotPhotoUrl('primary', bases, edits) ||
    resolveSlotPhotoUrl('alt', bases, edits)
  );
}
