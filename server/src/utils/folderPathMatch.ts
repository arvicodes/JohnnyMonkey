/** Portable Ordner-Schlüssel (git-intern / J-M-Reihen / Mac-Absolut). */
export function toPortableFolderRef(raw: string): string {
  let portable = String(raw || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
  const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
  for (const m of markers) {
    const i = portable.indexOf(m);
    if (i >= 0) {
      const rest = portable.slice(i + m.length).replace(/^\/+/, '');
      portable = rest ? `git-intern/${rest}` : 'git-intern';
      break;
    }
  }
  return portable;
}

export function portableFolderKey(raw: string): string {
  return toPortableFolderRef(raw).replace(/^git-intern\//, '');
}

export function folderPathsEquivalent(a: string, b: string): boolean {
  const ka = portableFolderKey(a);
  const kb = portableFolderKey(b);
  return Boolean(ka && kb && ka === kb);
}

/** true, wenn assigned den target-Ordner ist oder ihn enthält (Reihe → Stunde). */
export function folderPathCovers(assigned: string, target: string): boolean {
  const a = portableFolderKey(assigned);
  const t = portableFolderKey(target);
  if (!a || !t) return false;
  return t === a || t.startsWith(`${a}/`);
}
