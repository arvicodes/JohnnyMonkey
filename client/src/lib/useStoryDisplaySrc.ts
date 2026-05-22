import { useEffect, useRef, useState } from 'react';
import { displayStoryImageSrc } from './storyPageLayout';
import { dataUrlToBlobUrl } from './storyImageUtils';

function isApiStoryMediaUrl(url: string): boolean {
  return /\/api\/story-sites\/[^/]+\/media\//i.test(url);
}

export type StoryDisplaySrcState = {
  displaySrc: string;
  /** Lädt gerade (API-Fetch oder data:-Umwandlung). */
  pending: boolean;
};

/**
 * Stabile Anzeige-URL: data: → blob:, /api/… → per Fetch als blob: (zuverlässiger als langes <img src>).
 */
export function useStoryDisplaySrc(src: string): StoryDisplaySrcState {
  const trimmed = src?.trim() || '';
  const [displaySrc, setDisplaySrc] = useState('');
  const [pending, setPending] = useState(!!trimmed);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }

    if (!trimmed) {
      setDisplaySrc('');
      setPending(false);
      return;
    }

    const resolved = displayStoryImageSrc(trimmed);
    let cancelled = false;

    const finish = (url: string) => {
      if (cancelled) return;
      setDisplaySrc(url);
      setPending(false);
    };

    setPending(true);

    if (resolved.startsWith('data:image/')) {
      const blob = dataUrlToBlobUrl(resolved);
      if (blob) {
        blobRef.current = blob;
        finish(blob);
      } else {
        finish(resolved);
      }
      return () => {
        cancelled = true;
        if (blobRef.current) {
          URL.revokeObjectURL(blobRef.current);
          blobRef.current = null;
        }
      };
    }

    if (isApiStoryMediaUrl(resolved)) {
      void fetch(resolved, { cache: 'default', credentials: 'same-origin' })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          blobRef.current = objectUrl;
          finish(objectUrl);
        })
        .catch(() => {
          finish(resolved);
        });
      return () => {
        cancelled = true;
        if (blobRef.current) {
          URL.revokeObjectURL(blobRef.current);
          blobRef.current = null;
        }
      };
    }

    finish(resolved);
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  return { displaySrc, pending };
}
