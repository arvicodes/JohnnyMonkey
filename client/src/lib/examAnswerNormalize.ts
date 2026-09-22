/** Gemeinsame Antwort-Normalisierung für KA-HTML und Lösungsvarianten. */

/** Zusätzliche Schreibweisen für große Zahlen (Leerzeichen / ohne / deutsche Tausenderpunkte). */
export function germanNumberAnswerVariants(raw: string): string[] {
  const base = String(raw || '').trim();
  if (!base || !/^[\d\s.,]+$/.test(base)) return [];

  const digitsOnly = base.replace(/[\s.,]/g, '');
  if (!digitsOnly || !/^\d+$/.test(digitsOnly)) return [];

  const out = new Set<string>();
  const add = (v: string) => {
    const t = v.trim();
    if (t) out.add(t);
  };

  add(digitsOnly);
  const spaced = digitsOnly.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
  add(spaced);
  const dotThousands = digitsOnly.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  add(dotThousands);

  return [...out];
}

/** Wird in KA-HTML als `normalizeAnswer` eingebettet (build-ka-druckmaterial.mjs). */
export function normalizeAnswerJsSource(): string {
  return `function normalizeAnswer(raw) {
            let s = String(raw || '')
                .trim()
                .toLowerCase()
                .replace(/[₂₁₀]/g, '')
                .replace(/[_\\-–—]/g, '')
                .replace(/[()]/g, '')
                .replace(/ä/g, 'ae')
                .replace(/ö/g, 'oe')
                .replace(/ü/g, 'ue')
                .replace(/ß/g, 'ss');
            const compact = s.replace(/\\s+/g, '');
            if (/^\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}$/.test(compact)) {
                return compact;
            }
            s = compact;
            if (/^[\\d.,]+$/.test(s)) {
                s = s.replace(/[.,]/g, '');
            }
            return s;
        }`;
}
