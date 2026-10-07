import { EXAM_VERSIONS_META_RE } from './examVersionPaths';

export const EXAM_SUBMISSION_ALIASES_RE = /<!--\s*EXAM_SUBMISSION_ALIASES\s*(\[[\s\S]*?\])\s*-->/;

export function parseExamSubmissionAliases(html: string): string[] {
  const m = html.match(EXAM_SUBMISSION_ALIASES_RE);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function appendExamSubmissionAlias(html: string, aliasPath: string): string {
  const alias = String(aliasPath || '').trim().replace(/\\/g, '/');
  if (!alias) return html;
  const existing = parseExamSubmissionAliases(html);
  const lower = new Set(
    existing.flatMap((a) => {
      const n = a.replace(/\\/g, '/');
      const base = n.split('/').pop() || n;
      return [n.toLowerCase(), base.toLowerCase()];
    }),
  );
  const base = alias.split('/').pop() || alias;
  if (lower.has(alias.toLowerCase()) || lower.has(base.toLowerCase())) return html;

  const next = [...existing, alias];
  const comment = `<!-- EXAM_SUBMISSION_ALIASES ${JSON.stringify(next)} -->`;
  if (EXAM_SUBMISSION_ALIASES_RE.test(html)) {
    return html.replace(EXAM_SUBMISSION_ALIASES_RE, comment);
  }
  if (EXAM_VERSIONS_META_RE.test(html)) {
    return html.replace(EXAM_VERSIONS_META_RE, (m) => `${m}\n    ${comment}`);
  }
  return html.replace(/<head>/i, `<head>\n    ${comment}`);
}

export function expandSubmissionAliasPaths(aliases: string[]): string[] {
  const out = new Set<string>();
  for (const raw of aliases) {
    const n = String(raw || '').trim().replace(/\\/g, '/');
    if (!n) continue;
    out.add(n);
    out.add(n.toLowerCase());
    const base = n.split('/').pop() || n;
    out.add(base);
    out.add(base.toLowerCase());
    const noExt = base.replace(/\.(html|htm)$/i, '');
    out.add(noExt);
    out.add(noExt.toLowerCase());
  }
  return [...out];
}

export function storedKaPathMatchesRequest(
  requestPath: string,
  storedPath: string,
  aliases: string[],
  pathMatches: (stored: string) => boolean,
): boolean {
  if (pathMatches(storedPath)) return true;
  const storedNorm = (storedPath || '').replace(/\\/g, '/');
  const storedBase = (storedNorm.split('/').pop() || storedNorm).toLowerCase();
  for (const alias of expandSubmissionAliasPaths(aliases)) {
    const a = alias.toLowerCase();
    if (storedNorm.toLowerCase() === a || storedBase === a) return true;
    if (storedNorm.toLowerCase().endsWith('/' + a)) return true;
    if (pathMatches(alias)) return true;
  }
  return false;
}
