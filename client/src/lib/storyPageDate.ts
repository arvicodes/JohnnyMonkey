const GERMAN_MONTHS: Record<string, string> = {
  januar: '01',
  jan: '01',
  februar: '02',
  feb: '02',
  märz: '03',
  mar: '03',
  maerz: '03',
  april: '04',
  apr: '04',
  mai: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  november: '11',
  nov: '11',
  dezember: '12',
  dez: '12',
};

function toIso(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Unterseiten-Datum (z. B. „21. Mai 2026“) → YYYY-MM-DD */
export function parseStoryPageDate(dateStr: string): string | null {
  const s = dateStr?.trim();
  if (!s) return null;

  const dmyNamed = s.match(/^(\d{1,2})\.\s*([A-Za-zäöüÄÖÜß.]+)\s+(\d{4})$/i);
  if (dmyNamed) {
    const day = parseInt(dmyNamed[1], 10);
    const monKey = dmyNamed[2].toLowerCase().replace(/\./g, '');
    const year = parseInt(dmyNamed[3], 10);
    const month = GERMAN_MONTHS[monKey];
    if (month) return toIso(year, parseInt(month, 10), day);
  }

  const dmyNumeric = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyNumeric) {
    return toIso(
      parseInt(dmyNumeric[3], 10),
      parseInt(dmyNumeric[2], 10),
      parseInt(dmyNumeric[1], 10),
    );
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return toIso(parseInt(iso[1], 10), parseInt(iso[2], 10), parseInt(iso[3], 10));
  }

  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  return null;
}

export function formatIsoDateDe(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ];
  const mi = parseInt(m[2], 10) - 1;
  return `${parseInt(m[3], 10)}. ${months[mi] ?? m[2]} ${m[1]}`;
}
