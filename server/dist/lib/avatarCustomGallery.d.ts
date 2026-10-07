export declare const MAX_AVATAR_CUSTOM_PHOTOS = 12;
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
export declare function parseAvatarCustomGalleryRaw(raw: string | null | undefined): AvatarCustomPhoto[];
/** Legacy avatarUrlCustom → Galerie, falls noch leer. */
export declare function resolveAvatarCustomGallery(user: AvatarCustomGalleryUser): AvatarCustomPhoto[];
export declare function resolveAvatarCustomActiveId(user: AvatarCustomGalleryUser, gallery: AvatarCustomPhoto[]): string | null;
export declare function displayUrlForCustomPhoto(photo: AvatarCustomPhoto): string;
export declare function syncLegacyCustomFields(gallery: AvatarCustomPhoto[], activeId: string | null): {
    avatarUrlCustom: string | null;
    avatarEditCustom: string | null;
};
export declare function serializeAvatarCustomGallery(gallery: AvatarCustomPhoto[]): string;
export declare function appendCustomPhoto(gallery: AvatarCustomPhoto[], baseUrl: string): {
    gallery: AvatarCustomPhoto[];
    newId: string;
};
export declare function updateCustomPhotoEdit(gallery: AvatarCustomPhoto[], photoId: string, editUrl: string): AvatarCustomPhoto[];
export declare function clearCustomPhotoEdit(gallery: AvatarCustomPhoto[], photoId: string): AvatarCustomPhoto[];
export declare function removeCustomPhoto(gallery: AvatarCustomPhoto[], photoId: string): AvatarCustomPhoto[];
//# sourceMappingURL=avatarCustomGallery.d.ts.map