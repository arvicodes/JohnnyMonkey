import {
  defaultSmartieCustomMix,
  normalizeSmartieCards,
  smartieVersion1,
  smartieVersion2,
  type SmartieColorCard,
} from './smartiesData';

export type { SmartieColorCard };
export { smartieVersion1, smartieVersion2, defaultSmartieCustomMix, normalizeSmartieCards };

export type SmartieVersionId = 'v1' | 'v2' | 'custom';
export type SmartieSavedPreset = { id: string; name: string; cards: SmartieColorCard[] };

export const smartieCustomMixStorageKey = 'ki-games-smarties-custom-mix';
export const smartiePresetsStorageKey = 'ki-games-smarties-saved-presets';
export const smartiePresetsBackupKey = 'ki-games-smarties-saved-presets-backup';
export const smartieVersionStorageKey = 'ki-games-smarties-version';

function parsePresetEntry(raw: unknown, index: number): SmartieSavedPreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as { id?: unknown; name?: unknown; cards?: unknown };
  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : `smartie-preset-recovered-${index}`;
  const name =
    typeof entry.name === 'string' && entry.name.trim()
      ? entry.name.trim()
      : typeof entry.name === 'number'
        ? String(entry.name)
        : `Version ${index + 1}`;
  return {
    id,
    name,
    cards: normalizeSmartieCards(entry.cards as SmartieColorCard[]),
  };
}

function tryParsePresetsRaw(raw: string | null): { presets: SmartieSavedPreset[]; selectedId: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { presets?: unknown; selectedId?: unknown };
    const source = Array.isArray(parsed.presets) ? parsed.presets : Array.isArray(parsed) ? parsed : [];
    const presets = source
      .map((entry, index) => parsePresetEntry(entry, index))
      .filter((entry): entry is SmartieSavedPreset => entry !== null);
    if (!presets.length) return null;
    const selectedId =
      typeof parsed.selectedId === 'string' && presets.some((preset) => preset.id === parsed.selectedId)
        ? parsed.selectedId
        : presets[0].id;
    return { presets, selectedId };
  } catch {
    return null;
  }
}

function loadLegacyCustomSmartieMix(): SmartieColorCard[] {
  if (typeof window === 'undefined') return defaultSmartieCustomMix();
  try {
    const raw = window.localStorage.getItem(smartieCustomMixStorageKey);
    if (!raw) return defaultSmartieCustomMix();
    return normalizeSmartieCards(JSON.parse(raw) as SmartieColorCard[]);
  } catch {
    return defaultSmartieCustomMix();
  }
}

function fallbackPresetState(): { presets: SmartieSavedPreset[]; selectedId: string } {
  const preset: SmartieSavedPreset = {
    id: 'default-mix',
    name: 'Meine Mixversion',
    cards: loadLegacyCustomSmartieMix(),
  };
  return { presets: [preset], selectedId: preset.id };
}

export function loadSmartieVersion(): SmartieVersionId {
  if (typeof window === 'undefined') return 'v1';
  const raw = window.localStorage.getItem(smartieVersionStorageKey);
  if (raw === 'v1' || raw === 'v2' || raw === 'custom') return raw;
  return 'v1';
}

export function loadSmartiePresetsState(): { presets: SmartieSavedPreset[]; selectedId: string } {
  if (typeof window === 'undefined') return fallbackPresetState();

  const fromPrimary = tryParsePresetsRaw(window.localStorage.getItem(smartiePresetsStorageKey));
  if (fromPrimary) return fromPrimary;

  const fromBackup = tryParsePresetsRaw(window.localStorage.getItem(smartiePresetsBackupKey));
  if (fromBackup) {
    persistSmartiePresetsState(fromBackup.presets, fromBackup.selectedId, { skipBackup: true });
    return fromBackup;
  }

  return fallbackPresetState();
}

export function persistSmartiePresetsState(
  presets: SmartieSavedPreset[],
  selectedId: string,
  options?: { skipBackup?: boolean }
) {
  if (typeof window === 'undefined') return;
  try {
    if (!options?.skipBackup) {
      const existing = window.localStorage.getItem(smartiePresetsStorageKey);
      if (existing) {
        window.localStorage.setItem(smartiePresetsBackupKey, existing);
      }
    }
    window.localStorage.setItem(smartiePresetsStorageKey, JSON.stringify({ presets, selectedId }));
  } catch {
    /* ignore */
  }
}

export function persistSmartieCustomMix(customMix: SmartieColorCard[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(smartieCustomMixStorageKey, JSON.stringify(customMix));
  } catch {
    /* ignore */
  }
}

export function persistSmartieVersion(version: SmartieVersionId) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(smartieVersionStorageKey, version);
  } catch {
    /* ignore */
  }
}

export function getSmartieQuestions(version: SmartieVersionId, customMix: SmartieColorCard[]): SmartieColorCard[] {
  if (version === 'v1') return smartieVersion1;
  if (version === 'v2') return smartieVersion2;
  return customMix;
}

export function readSmartiesBootstrapForExport(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const version = window.localStorage.getItem(smartieVersionStorageKey);
    const presetsParsed =
      tryParsePresetsRaw(window.localStorage.getItem(smartiePresetsStorageKey)) ||
      tryParsePresetsRaw(window.localStorage.getItem(smartiePresetsBackupKey));
    const customMixRaw = window.localStorage.getItem(smartieCustomMixStorageKey);

    if (!presetsParsed && !customMixRaw && !version) return null;

    return {
      version: version === 'v1' || version === 'v2' || version === 'custom' ? version : 'v1',
      presets: presetsParsed?.presets ?? [],
      selectedId: presetsParsed?.selectedId ?? 'default-mix',
      customMix: customMixRaw ? JSON.parse(customMixRaw) : null,
    };
  } catch {
    return null;
  }
}

