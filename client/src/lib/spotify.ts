export type SpotifyResourceType =
  | 'track'
  | 'album'
  | 'playlist'
  | 'artist'
  | 'episode'
  | 'show';

export type SpotifyResource = {
  type: SpotifyResourceType;
  id: string;
  embedUrl: string;
};

const SPOTIFY_TYPES: SpotifyResourceType[] = [
  'track',
  'album',
  'playlist',
  'artist',
  'episode',
  'show',
];

const buildEmbedUrl = (type: SpotifyResourceType, id: string) =>
  `https://open.spotify.com/embed/${type}/${id}`;

/**
 * Erkennt Spotify-Links (open.spotify.com inkl. /intl-xx/ Präfix, mit ?si=… Parametern)
 * und Spotify-URIs (spotify:track:ID) und liefert die offizielle Embed-URL zurück.
 * Gibt null zurück, wenn es kein Spotify-Link ist (z. B. direkter mp3-Link).
 */
export function parseSpotifyUrl(raw: string): SpotifyResource | null {
  if (!raw || typeof raw !== 'string') return null;
  let value = raw.trim();
  if (!value) return null;

  // Falls ein kompletter <iframe …>-Einbettungscode eingefügt wurde: src extrahieren
  const iframeSrc = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc) value = iframeSrc[1];

  const uriMatch = value.match(
    /^spotify:(track|album|playlist|artist|episode|show):([a-zA-Z0-9]+)/i,
  );
  if (uriMatch) {
    const type = uriMatch[1].toLowerCase() as SpotifyResourceType;
    const id = uriMatch[2];
    return { type, id, embedUrl: buildEmbedUrl(type, id) };
  }

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    if (!/(^|\.)spotify\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const typeIndex = parts.findIndex((p) =>
      SPOTIFY_TYPES.includes(p.toLowerCase() as SpotifyResourceType),
    );
    if (typeIndex === -1) return null;
    const type = parts[typeIndex].toLowerCase() as SpotifyResourceType;
    const id = (parts[typeIndex + 1] ?? '').split('?')[0];
    if (!id) return null;
    return { type, id, embedUrl: buildEmbedUrl(type, id) };
  } catch {
    return null;
  }
}

export function isSpotifyUrl(raw: string): boolean {
  return parseSpotifyUrl(raw) !== null;
}
