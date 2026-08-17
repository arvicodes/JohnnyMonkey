import { slideImageUrl } from './presentationDeck';

export type MediaRenderMode = 'iframe' | 'video';

export type ResolvedMediaEmbed = {
  mode: MediaRenderMode;
  src: string;
};

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://local');
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/')[2] || null;
      }
      const v = u.searchParams.get('v');
      if (v) return v;
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://local');
    if (!u.hostname.includes('vimeo.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function originBase(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

/** YouTube/Vimeo/MP4/App-Pfad → iframe oder <video>. */
export function resolveMediaEmbed(rawUrl?: string): ResolvedMediaEmbed | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  const yt = youtubeId(trimmed);
  if (yt) {
    return {
      mode: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1`,
    };
  }

  const vimeo = vimeoId(trimmed);
  if (vimeo) {
    return { mode: 'iframe', src: `https://player.vimeo.com/video/${vimeo}` };
  }

  if (isDirectVideoUrl(trimmed)) {
    const src = /^https?:\/\//i.test(trimmed) ? trimmed : slideImageUrl(trimmed);
    return { mode: 'video', src };
  }

  if (trimmed.startsWith('/')) {
    return { mode: 'iframe', src: `${originBase()}${trimmed}` };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { mode: 'iframe', src: trimmed };
  }

  return { mode: 'video', src: slideImageUrl(trimmed) };
}

export function slideHasFullscreenMedia(slide: {
  layout?: string;
  elements?: { type: string; w?: number; h?: number }[];
}): boolean {
  if (slide.layout !== 'blank' && slide.layout !== 'blank-full') return false;
  return (
    slide.elements?.some(
      (el) =>
        (el.type === 'video' || el.type === 'embed') &&
        (el.w ?? 0) >= 80 &&
        (el.h ?? 0) >= 80,
    ) ?? false
  );
}
