const STORAGE_PREFIX = 'ka-correction-mss-grade:';

export function defaultGradingUsesMss(groupName: string): boolean {
  const n = (groupName || '').trim();
  return /informatik\s+gk/i.test(n) || /mathe\s+lk/i.test(n);
}

export function readMssGradingPreference(groupId: string, groupName: string): boolean {
  if (!groupId) return defaultGradingUsesMss(groupName);
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${groupId}`);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* ignore */
  }
  return defaultGradingUsesMss(groupName);
}

export function writeMssGradingPreference(groupId: string, useMss: boolean): void {
  if (!groupId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${groupId}`, useMss ? '1' : '0');
  } catch {
    /* ignore */
  }
}
