import { useEffect, useState } from 'react';

function webkitFsElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return doc.webkitFullscreenElement ?? null;
}

/** Host für D/N-FABs: im Präsentations-Vollbild am FS-Element, sonst am body. */
export function getTeacherFabPortalHost(): HTMLElement {
  if (typeof document === 'undefined') {
    return null as unknown as HTMLElement;
  }
  const fs = document.fullscreenElement || webkitFsElement();
  if (fs instanceof HTMLElement) return fs;
  return document.body;
}

export function useTeacherFabPortalHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? getTeacherFabPortalHost() : null,
  );

  useEffect(() => {
    const sync = () => setHost(getTeacherFabPortalHost());
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  return host;
}
