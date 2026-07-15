import {
  isLessonPresentationMaterialPdf,
  LESSON_PRESENTATION_PDF_ORIGINAL,
  labelForLessonPresentationMaterialPdf,
} from './presentationLessonAssets';

/** Gespeicherte Bearbeitungen: „Stamm_Zusatz.pdf“ im gleichen Ordner (Legacy: „… [Bearbeitung: …].pdf“). */

const BEARBEITUNG_SUFFIX_RE = /\[Bearbeitung:\s*(.+?)\]\s*\.pdf$/i;

/** Folien-relevante Endungen (Gruppierung Stamm + Zusatz auch für Bilder/Präsentation). */
export const FOLIEN_EXT = new Set(['pdf', 'pptx', 'ppt', 'odp', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp']);

export function isBearbeitungVersionFileName(fileName: string): boolean {
  return /\.pdf$/i.test(fileName) && BEARBEITUNG_SUFFIX_RE.test(fileName);
}

/** Stamm für neue Speicherungen: Dateiname ohne Endung, Legacy „… [Bearbeitung: …].pdf“ → Stamm davor. */
export function getStemForSave(fileName: string): string {
  const m = fileName.match(/^(.+?)\s*\[Bearbeitung:\s*.+\]\s*\.pdf$/i);
  if (m) return m[1].trim();
  const base = fileName.replace(/\.[^.]+$/, '');
  return base.trim() || fileName;
}

export function sanitizeFilenameSuffix(raw: string): string {
  const s = raw.replace(/[\[\]\/\\:*?"<>|]/g, '').trim().slice(0, 120);
  return s || 'Version';
}

/** z. B. Unterlagen_mitNotizen.pdf — Stamm wie Original (ohne Endung), Zusatz nur angehängt. */
export function buildStemSuffixPdfName(stem: string, suffix: string): string {
  const safeStem = (stem || 'folien').trim() || 'folien';
  const s = sanitizeFilenameSuffix(suffix);
  return `${safeStem}_${s}.pdf`;
}

/** Stamm exakt oder beliebige Fortsetzung „Stamm_…“ (alle Varianten einer Hauptdatei). */
function stemMatchesPrefix(stem: string, base: string): boolean {
  const sl = stem.toLowerCase();
  const bl = base.toLowerCase();
  if (bl === sl) return true;
  return bl.startsWith(sl + '_');
}

/** Suffix nach „Stamm_“ (Groß/Kleinschreibung egal). */
function suffixAfterStem(stem: string, base: string): string {
  const sl = stem.toLowerCase();
  const bl = base.toLowerCase();
  const pre = `${sl}_`;
  if (!bl.startsWith(pre)) return '';
  return base.slice(pre.length);
}

function hasExactStemFile(stem: string, bases: string[]): boolean {
  const sl = stem.toLowerCase();
  return bases.some((b) => b.toLowerCase() === sl);
}

/**
 * Kurze Stämme (z. B. „Kap“) + verschiedene reine Zahl-Suffixe nicht zusammenlegen
 * (Kap_6 vs Kap_7), während längere Namen (Battleground_1 vs Battleground_2) gruppiert bleiben.
 */
function rejectShortStemNumericVariations(stem: string, bases: string[]): boolean {
  if (stem.length >= 4) return false;
  const sl = stem.toLowerCase();
  const suffixes = bases
    .filter((b) => b.toLowerCase() !== sl && stemMatchesPrefix(stem, b))
    .map((b) => suffixAfterStem(stem, b));
  if (suffixes.length < 2) return false;
  const allNumeric = suffixes.every((s) => /^\d+$/.test(s));
  if (!allNumeric) return false;
  return new Set(suffixes).size > 1;
}

/**
 * Ordnet jede Datei einem gemeinsamen Stamm zu (eine Zeile „Hauptname“, Rest im Dropdown).
 * Kürzester passender Präfix-Stamm zuerst (z. B. Battleground für Battleground_notes_final).
 */
export function computeCanonicalStemForFiles(files: { name: string }[]): Map<string, string> {
  const names = files.map((f) => f.name);
  const bases = names.map((n) => n.replace(/\.[^.]+$/, ''));

  const result = new Map<string, string>();

  for (const name of names) {
    const mLegacy = name.match(/^(.+?)\s*\[Bearbeitung:\s*.+\]\s*\.pdf$/i);
    if (mLegacy) {
      result.set(name, mLegacy[1].trim());
      continue;
    }

    const base = name.replace(/\.[^.]+$/, '');
    const ext = name.split('.').pop()?.toLowerCase();
    if (!ext || !FOLIEN_EXT.has(ext)) {
      result.set(name, base);
      continue;
    }

    const parts = base.split('_');
    if (parts.length < 2) {
      result.set(name, base);
      continue;
    }

    let chosenStem: string | null = null;
    for (let k = 1; k < parts.length; k++) {
      const s = parts.slice(0, k).join('_');
      if (!stemMatchesPrefix(s, base)) continue;

      const count = bases.filter((b) => stemMatchesPrefix(s, b)).length;

      if (s === base) {
        chosenStem = s;
        break;
      }
      if (hasExactStemFile(s, bases)) {
        chosenStem = s;
        break;
      }
      if (count >= 2 && !rejectShortStemNumericVariations(s, bases)) {
        chosenStem = s;
        break;
      }
    }

    result.set(name, chosenStem !== null ? chosenStem : base);
  }

  /** Eine Schreibweise pro Gruppe (erster Treffer in Namensreihenfolge). */
  const stemDisplayByKey = new Map<string, string>();
  for (const name of names) {
    const stem = result.get(name);
    if (stem === undefined) continue;
    const key = stem.toLowerCase();
    if (!stemDisplayByKey.has(key)) stemDisplayByKey.set(key, stem);
  }
  for (const name of names) {
    const stem = result.get(name);
    if (stem === undefined) continue;
    const canon = stemDisplayByKey.get(stem.toLowerCase());
    if (canon !== undefined) result.set(name, canon);
  }

  return result;
}

/**
 * Nur-Kopien (Stamm_Zusatz.pdf, [Bearbeitung: …]) — nicht in Dateilisten zeigen, nur im Folien-Dropdown.
 * allFilesInFolder: alle Dateinamen derselben Ordner-Ebene (für Stammerkennung).
 */
export function isDerivedFolienVersionFile(fileName: string, allFilesInFolder: { name: string }[]): boolean {
  if (isLessonPresentationMaterialPdf(fileName)) return false;
  if (!allFilesInFolder.length) return false;
  const stemMap = computeCanonicalStemForFiles(allFilesInFolder);
  const canonical = stemMap.get(fileName) ?? fileName.replace(/\.[^.]+$/, '');
  const base = fileName.replace(/\.[^.]+$/, '');
  return base.toLowerCase() !== canonical.toLowerCase();
}

export function labelForFolienOption(file: { name: string }, groupStem?: string): string {
  const presLabel = labelForLessonPresentationMaterialPdf(file.name);
  if (presLabel) return presLabel;
  const m1 = file.name.match(BEARBEITUNG_SUFFIX_RE);
  if (m1) return `Bearbeitung: ${m1[1].trim()}`;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '');
  if (ext && FOLIEN_EXT.has(ext) && groupStem) {
    const rest = suffixAfterStem(groupStem, base);
    if (rest) return `Kopie: ${rest}`;
  }
  if (ext && FOLIEN_EXT.has(ext)) {
    const m2 = file.name.match(/^(.+)_(.+)\.[^.]+$/i);
    if (m2) return `Kopie: ${m2[2]}`;
  }
  return `Original (${file.name})`;
}

export function isFolienFileName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && FOLIEN_EXT.has(ext);
}

export function sortFolienVariants<T extends { file: { name: string } }>(
  variants: T[],
  groupStem: string
): T[] {
  const stem = groupStem || '';
  const sk = stem.toLowerCase();
  const deriveRank = (n: string) => {
    if (isBearbeitungVersionFileName(n)) return 1;
    const nl = n.toLowerCase();
    if (stem && nl.startsWith(sk + '_')) {
      const e = n.split('.').pop()?.toLowerCase();
      if (e && FOLIEN_EXT.has(e)) return 1;
    }
    return 0;
  };
  return [...variants].sort((a, b) => {
    const aV = deriveRank(a.file.name);
    const bV = deriveRank(b.file.name);
    if (aV !== bV) return aV - bV;
    return a.file.name.localeCompare(b.file.name, 'de');
  });
}

/** Elternverzeichnis für git-intern/… oder absolute Pfade (Backslashes → Slash). */
export function parentDirGitPath(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/');
  const i = norm.lastIndexOf('/');
  return i > 0 ? norm.slice(0, i) : '';
}

/** Gruppiert Dateien nach kanonischem Basisnamen (Stamm) — eine Zeile pro logischem Dokument. */
export function groupFilesByBaseName(files: { name?: string }[]): {
  baseName: string;
  versions: { ext: string; file: any }[];
}[] {
  const stemMap = computeCanonicalStemForFiles(files.map((f) => ({ name: f.name || '' })));
  const map = new Map<string, { ext: string; file: any }[]>();
  for (const file of files) {
    const name = file.name || '';
    const baseName = (stemMap.get(name) ?? name.replace(/\.[^.]+$/, '')) || name;
    const ext = (name.match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
    if (!map.has(baseName)) map.set(baseName, []);
    map.get(baseName)!.push({ ext, file });
  }
  return Array.from(map.entries()).map(([baseName, versions]) => ({ baseName, versions }));
}

export function getPdfFromGroup(versions: { ext: string; file: any }[], groupBaseName: string) {
  const pdfs = versions.filter((v) => v.ext === 'pdf');
  const presOriginal = pdfs.find((v) => v.file.name === LESSON_PRESENTATION_PDF_ORIGINAL);
  if (presOriginal) return presOriginal.file;
  const exact = pdfs.find((v) => v.file.name.replace(/\.[^.]+$/, '') === groupBaseName);
  if (exact) return exact.file;
  const orig = pdfs.find(
    (v) =>
      !isBearbeitungVersionFileName(v.file.name) &&
      !v.file.name.toLowerCase().startsWith(groupBaseName.toLowerCase() + '_')
  );
  return orig?.file || pdfs[0]?.file || null;
}

/** Für SuS-Freigabe: PDF bevorzugt, sonst erste Datei nach PDF-zuerst-Sortierung (z. B. nur DOCX). */
export function getShareFileForGroup(versions: { ext: string; file: any }[], groupBaseName: string) {
  const pdf = getPdfFromGroup(versions, groupBaseName);
  if (pdf) return pdf;
  const sorted = [...versions].sort((a, b) =>
    a.ext.toLowerCase() === 'pdf' ? -1 : b.ext.toLowerCase() === 'pdf' ? 1 : 0
  );
  return sorted[0]?.file || null;
}
