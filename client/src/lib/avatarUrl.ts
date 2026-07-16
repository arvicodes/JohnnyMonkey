/** Normalize stored avatar paths so they load via the CRA `/api` proxy. */
export function resolveAvatarUrl(avatarUrl?: string | null): string | undefined {
  const raw = avatarUrl?.trim();
  if (!raw) return undefined;
  if (raw.startsWith('/uploads/avatars/')) {
    return raw.replace('/uploads/avatars/', '/api/avatars/');
  }
  return raw;
}
