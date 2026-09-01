import type { PresentationStroke } from './presentationDeck';

const MAX_STROKES = 400;
const MAX_POINTS = 800;

function parsePoint(raw: unknown): { x: number; y: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const x = typeof row.x === 'number' ? row.x : Number(row.x);
  const y = typeof row.y === 'number' ? row.y : Number(row.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function parseEntryTicketInk(raw: unknown): PresentationStroke[] {
  if (!Array.isArray(raw)) return [];
  const out: PresentationStroke[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const pointsRaw = Array.isArray(row.points) ? row.points : [];
    const points = pointsRaw.map(parsePoint).filter(Boolean) as { x: number; y: number }[];
    if (points.length === 0) continue;
    const color = typeof row.color === 'string' && row.color.trim() ? row.color.trim() : '#263238';
    const lineWidth =
      typeof row.lineWidth === 'number' && Number.isFinite(row.lineWidth) ? row.lineWidth : 3;
    const mode = row.mode === 'marker' ? 'marker' : row.mode === 'pen' ? 'pen' : undefined;
    const shape =
      row.shape === 'line' ||
      row.shape === 'rect' ||
      row.shape === 'ellipse' ||
      row.shape === 'arrow' ||
      row.shape === 'curved-arrow'
        ? row.shape
        : undefined;
    const holes = Array.isArray(row.holes)
      ? row.holes
          .map((hole) =>
            Array.isArray(hole)
              ? (hole.map(parsePoint).filter(Boolean) as { x: number; y: number }[])
              : [],
          )
          .filter((h) => h.length > 0)
      : undefined;
    out.push({
      id:
        typeof row.id === 'string' && row.id.trim()
          ? row.id.trim()
          : `s-${Date.now()}-${out.length}`,
      points: points.slice(0, MAX_POINTS),
      color: color.slice(0, 32),
      lineWidth,
      ...(mode ? { mode } : {}),
      ...(typeof row.markerOpacity === 'number' && Number.isFinite(row.markerOpacity)
        ? { markerOpacity: row.markerOpacity }
        : {}),
      ...(shape ? { shape } : {}),
      ...(typeof row.rotation === 'number' && Number.isFinite(row.rotation)
        ? { rotation: row.rotation }
        : {}),
      ...(typeof row.arrowHeadSize === 'number' && Number.isFinite(row.arrowHeadSize)
        ? { arrowHeadSize: row.arrowHeadSize }
        : {}),
      ...(typeof row.curveBend === 'number' && Number.isFinite(row.curveBend)
        ? { curveBend: row.curveBend }
        : {}),
      ...(row.filled === true ? { filled: true } : {}),
      ...(holes && holes.length > 0 ? { holes } : {}),
    });
    if (out.length >= MAX_STROKES) break;
  }
  return out;
}

export function parseEntryTicketInkMap(raw: unknown): Record<string, PresentationStroke[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, PresentationStroke[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || key.length > 200) continue;
    const strokes = parseEntryTicketInk(value);
    if (strokes.length > 0) out[key] = strokes;
  }
  return out;
}

export function entryTicketCardInkKey(sourceKey: string | undefined | null): string {
  return sourceKey ? `card:${sourceKey}` : '';
}

export const ENTRY_TICKET_SOLUTION_INK_KEY = 'slide:solutions';

export function inkFingerprint(strokes: PresentationStroke[] | undefined): string {
  if (!strokes?.length) return '';
  return strokes
    .map((s) => `${s.id}:${s.points.length}:${s.color}:${s.lineWidth}`)
    .join('|');
}

function inkPointCount(strokes: PresentationStroke[] | undefined): number {
  if (!strokes?.length) return 0;
  return strokes.reduce((n, s) => n + (s.points?.length || 0), 0);
}

/** Pro Fläche die vollständigere Zeichnung behalten (Tablet ↔ Laptop). */
export function mergePlayInkMaps(
  a?: Record<string, PresentationStroke[]>,
  b?: Record<string, PresentationStroke[]>,
): Record<string, PresentationStroke[]> | undefined {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  if (keys.size === 0) return undefined;
  const out: Record<string, PresentationStroke[]> = {};
  for (const key of keys) {
    const sa = a?.[key];
    const sb = b?.[key];
    const pick = inkPointCount(sb) > inkPointCount(sa) ? sb : sa;
    if (pick?.length) out[key] = pick;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
