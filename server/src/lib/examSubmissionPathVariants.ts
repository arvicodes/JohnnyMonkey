import { baseStemFromStem, fileStemFromName, variantStem } from './examVersionPaths';

/**
 * Pfad-Varianten für Abgaben: Lehrer übergibt oft den vollen Ordnerpfad,
 * SuS speichern meist nur den Dateinamen (z. B. HU_….html).
 */
export function getPossibleKaSubmissionPaths(filePath: string): string[] {
  const normalized = (filePath || '').replace(/\\/g, '/').trim();
  const base = normalized.split('/').pop() || normalized;
  const withoutExt = base.replace(/\.(html|htm)$/i, '');
  const stem = withoutExt.replace(/^(KA_|KU_|HÜ_|HU_|QZ_)/i, '');
  const candidates = new Set<string>();

  const add = (p: string) => {
    const v = (p || '').trim();
    if (!v) return;
    candidates.add(v);
    const noExt = v.replace(/\.(html|htm)$/i, '');
    candidates.add(noExt);
    if (!/\.(html|htm)$/i.test(v)) {
      candidates.add(`${v}.html`);
      candidates.add(`${v}.htm`);
    }
  };

  add(normalized);
  add(base);
  add(withoutExt);
  const familyStem = baseStemFromStem(withoutExt);
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const variantFileStem = variantStem(familyStem, letter);
    add(variantFileStem);
    for (const pref of ['KA_', 'KU_', 'HÜ_', 'HU_', 'QZ_', '']) {
      add(`${pref}${variantFileStem.replace(/^(KA_|KU_|HÜ_|HU_|QZ_)/i, '')}`);
    }
  }
  for (const pref of ['KA_', 'KU_', 'HÜ_', 'HU_', 'QZ_', '']) {
    add(`${pref}${stem}`);
  }

  return [...candidates];
}
