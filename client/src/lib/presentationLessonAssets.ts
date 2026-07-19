/** Johnny-Präsentation: exportierte Folien-PDFs — sollen als Unterrichtsmaterial erscheinen. */
export const LESSON_PRESENTATION_PDF_ORIGINAL = 'Praesentation_Original.pdf';
export const LESSON_PRESENTATION_PDF_EDITED = 'Praesentation_bearbeitet.pdf';

const LESSON_IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|bmp|heic|avif|tiff?)$/i;
const LESSON_INPUT_DOCS_RE = /\.(pdf|pptx?|odp|docx?|odt|rtf)$/i;

/** Alle Johnny-Export-PDFs: Original, bearbeitet und benannte Kopien (Praesentation_Name.pdf). */
export function isJohnnyPresentationExportPdf(name: string): boolean {
  const n = (name || '').trim();
  return /^Praesentation_.+\.pdf$/i.test(n);
}

/** Interne JSON — nicht als Arbeitsmaterial listen. */
export function isLessonPresentationSystemFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return false;
  if (/^Praesentation\.(deck|annotations|version)(\.[^/\\]+)*\.json$/i.test(n)) return true;
  return false;
}

export function isLessonPresentationMaterialPdf(name: string): boolean {
  return isJohnnyPresentationExportPdf(name);
}

export function labelForLessonPresentationMaterialPdf(name: string): string | null {
  if (!isJohnnyPresentationExportPdf(name)) return null;
  return johnnyPresentationVersionLabel(name);
}

/** Kurzlabel für Stundenablauf: Original | bearbeitet | Mein Name */
export function johnnyPresentationVersionLabel(name: string): string {
  const n = (name || '').trim();
  if (n === LESSON_PRESENTATION_PDF_ORIGINAL) return 'Original';
  if (n === LESSON_PRESENTATION_PDF_EDITED) return 'bearbeitet';
  const m = n.match(/^Praesentation_(.+)\.pdf$/i);
  if (m) return m[1].replace(/_/g, ' ').trim() || n;
  return n;
}

/** Zusatz für benannte PDF-Kopie → `Praesentation_<Zusatz>.pdf` (nicht „Original“). */
export function buildNamedJohnnyPresentationPdfName(label: string): string | null {
  const s = (label || '')
    .replace(/[\[\]\/\\:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 120);
  if (!s) return null;
  if (/^original$/i.test(s)) return null;
  if (/^bearbeitet$/i.test(s)) return null;
  return `Praesentation_${s}.pdf`;
}

/** Slug aus PDF-Namen: Praesentation_2026_2.pdf → 2026_2 */
export function namedVersionSlugFromPdfName(name: string): string | null {
  const n = (name || '').trim();
  if (!n || n === LESSON_PRESENTATION_PDF_ORIGINAL || n === LESSON_PRESENTATION_PDF_EDITED) {
    return null;
  }
  const m = n.match(/^Praesentation_(.+)\.pdf$/i);
  return m?.[1] || null;
}

/** Slug aus Anzeige-Label: „2026 2“ → 2026_2 */
export function namedVersionSlugFromLabel(label: string): string | null {
  const pdf = buildNamedJohnnyPresentationPdfName(label);
  return pdf ? namedVersionSlugFromPdfName(pdf) : null;
}

/** Interner Snapshot: Praesentation.version.2026_2.json */
export function namedVersionSnapshotFilename(slug: string): string {
  const safe = (slug || '').replace(/[\\/]/g, '').trim();
  return `Praesentation.version.${safe}.json`;
}

export type JohnnyPresentationVersion = {
  name: string;
  path: string;
  label: string;
  kind: 'original' | 'edited' | 'named';
};

/** Original ist fest; alle anderen Praesentation_*-PDFs (inkl. erste selbst gespeicherte) dürfen weg. */
export function canDeleteJohnnyPresentationVersion(
  version: Pick<JohnnyPresentationVersion, 'kind' | 'name'>
): boolean {
  if (version.kind === 'original') return false;
  if (version.name === LESSON_PRESENTATION_PDF_ORIGINAL) return false;
  return isJohnnyPresentationExportPdf(version.name);
}

function johnnyPresentationVersionKind(name: string): JohnnyPresentationVersion['kind'] {
  if (name === LESSON_PRESENTATION_PDF_ORIGINAL) return 'original';
  if (name === LESSON_PRESENTATION_PDF_EDITED) return 'edited';
  return 'named';
}

function johnnyPresentationVersionRank(name: string): number {
  if (name === LESSON_PRESENTATION_PDF_ORIGINAL) return 0;
  if (name === LESSON_PRESENTATION_PDF_EDITED) return 1;
  // Benannte Versionen stehen an der Stelle von „bearbeitet“
  return 1;
}

/** Sortiert: Original links, dann bearbeitet bzw. benannte Versionen. */
export function listJohnnyPresentationVersions(
  files: { name?: string; path?: string; type?: string }[]
): JohnnyPresentationVersion[] {
  const list: JohnnyPresentationVersion[] = [];
  for (const f of files) {
    const name = (f.name || '').trim();
    if (!isJohnnyPresentationExportPdf(name)) continue;
    if (f.type && f.type !== 'file') continue;
    list.push({
      name,
      path: f.path || name,
      label: johnnyPresentationVersionLabel(name),
      kind: johnnyPresentationVersionKind(name),
    });
  }
  // Benannte Version ersetzt „bearbeitet“ in der Anzeige (kein Doppel: bearbeitet | 2026)
  const hasNamed = list.some((v) => v.kind === 'named');
  const visible = hasNamed ? list.filter((v) => v.kind !== 'edited') : list;
  return visible.sort((a, b) => {
    const ra = johnnyPresentationVersionRank(a.name);
    const rb = johnnyPresentationVersionRank(b.name);
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label, 'de');
  });
}

function sanitizeLessonFileStem(name: string): string {
  return (name || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Download-Dateiname für Schüler: Stundenname statt Praesentation_*.pdf */
export function lessonPresentationDownloadFilename(
  lessonName: string,
  variant: 'original' | 'edited'
): string {
  const stem = sanitizeLessonFileStem(lessonName) || 'Praesentation';
  return variant === 'edited' ? `${stem} bearbeitet.pdf` : `${stem}.pdf`;
}

/**
 * Bilder und interne Präsentationsdateien — nicht in der Dashboard-Materialliste.
 * Unterrichtsmaterial sind nur die exportierten Praesentation_*-PDFs (siehe isLessonPresentationMaterialPdf).
 */
export function isLessonPresentationAssetFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return false;
  if (isLessonPresentationSystemFile(n)) return true;
  if (isLessonPresentationMaterialPdf(n)) return false;
  if (LESSON_IMAGE_EXT_RE.test(n)) return true;
  return false;
}

/** Dateien, die Schüler in der Stunden-Materialliste sehen und herunterladen dürfen. */
export function isStudentVisibleLessonMaterialFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n || n.startsWith('~$')) return false;
  if (isLessonPresentationSystemFile(n)) return false;
  if (isLessonPresentationMaterialPdf(n)) return true;
  if (LESSON_IMAGE_EXT_RE.test(n)) return false;
  if (LESSON_INPUT_DOCS_RE.test(n)) return true;
  if (/\.wb$/i.test(n)) return true;
  return false;
}
