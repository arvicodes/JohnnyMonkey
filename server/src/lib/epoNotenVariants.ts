import { randomUUID } from 'crypto';

export const EPO_VARIANTS_PATH = '__epo_noten_variants__';
export const DEFAULT_EPO_VARIANT_ID = 'default';

const DEFAULT_STUDENT: string[] = [
  'Ich trage häufig mit qualitativ passenden (nicht notwendigerweise richtigen!) Beiträgen zum Unterricht bei.',
  'Ich konzentriere meine Aufmerksamkeit im Unterricht auf das Thema und höre konzentriert, ohne Ablenkungen von/durch Nachbarn, den Beiträgen anderer zu.',
  'In eigenen Arbeitsphasen beginne ich zügig, und arbeite konzentriert und strukturiert bis zum Ende.',
  'Mein Material habe ich dabei, bereit und meine Hausaufgaben sind erledigt und liegen vor. Ich schreib ordentlich mit.',
  'Ich verhalte mich im Unterricht angemessen ruhig, melde mich, wenn ich etwas sagen möchte und spreche nur, wenn ich an der Reihe bin.',
];

const DEFAULT_TEACHER: string[] = [
  'Du trägst häufig mit qualitativ passenden (nicht notwendigerweise richtigen!) Beiträgen zum Unterricht bei.',
  'Du konzentrierst deine Aufmerksamkeit im Unterricht auf das Thema und hörst konzentriert, ohne Ablenkungen von/durch Nachbarn, den Beiträgen anderer zu.',
  'In eigenen Arbeitsphasen beginnst du zügig, und arbeitest konzentriert und strukturiert bis zum Ende.',
  'Dein Material hast du dabei, bereit und deine Hausaufgaben sind erledigt und liegen vor. Du schreibst ordentlich mit.',
  'Du verhältst dich im Unterricht angemessen ruhig, meldest dich, wenn du etwas sagen möchtest und sprichst nur, wenn du an der Reihe bist.',
];

export type EpoNotenVariantSheet = {
  id: string;
  name: string;
  /** Kurztitel pro Bereich (Tabellenzeile „Bereich“) */
  categoryTitles?: string[];
  /** Gewichtung in % — muss 100 ergeben, sonst wird gleich gewichtet */
  categoryWeightsPercent?: number[];
  studentCategories: string[];
  teacherCategories: string[];
};

export type EpoNotenVariantsStore = {
  version: 1;
  variants: EpoNotenVariantSheet[];
};

export function defaultVariantsStore(): EpoNotenVariantsStore {
  return {
    version: 1,
    variants: [
      {
        id: DEFAULT_EPO_VARIANT_ID,
        name: 'Standard',
        studentCategories: [...DEFAULT_STUDENT],
        teacherCategories: [...DEFAULT_TEACHER],
      },
    ],
  };
}

const normalizeLines = (raw: unknown, fallback: string[]): string[] => {
  const base = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 5 }, (_, i) => {
    const t = typeof base[i] === 'string' ? String(base[i]).trim() : '';
    return t || fallback[i] || '';
  });
};

const normalizeWeights = (raw: unknown): number[] | undefined => {
  if (!Array.isArray(raw) || raw.length !== 5) return undefined;
  const w = raw.map((x) => Math.round(Number(x)));
  if (!w.every((n) => Number.isFinite(n) && n > 0)) return undefined;
  if (w.reduce((a, b) => a + b, 0) !== 100) return undefined;
  return w;
};

const normalizeTitles = (raw: unknown, fallback: string[]): string[] => {
  const base = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 5 }, (_, i) => {
    const t = typeof base[i] === 'string' ? String(base[i]).trim() : '';
    return t || fallback[i] || `Bereich ${i + 1}`;
  });
};

export function parseVariantsStore(raw: string | null | undefined): EpoNotenVariantsStore {
  const def = defaultVariantsStore();
  if (!raw) return def;
  try {
    const parsed = JSON.parse(raw) as EpoNotenVariantsStore;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.variants)) return def;
    const variants: EpoNotenVariantSheet[] = [];
    for (const v of parsed.variants) {
      if (!v || typeof v.id !== 'string' || typeof v.name !== 'string') continue;
      const studentCategories = normalizeLines(v.studentCategories, DEFAULT_STUDENT);
      variants.push({
        id: v.id,
        name: v.name.trim() || 'Variante',
        categoryTitles: normalizeTitles(v.categoryTitles, studentCategories.map((_, i) => `Bereich ${i + 1}`)),
        categoryWeightsPercent: normalizeWeights(v.categoryWeightsPercent),
        studentCategories,
        teacherCategories: normalizeLines(v.teacherCategories, DEFAULT_TEACHER),
      });
    }
    if (!variants.some((v) => v.id === DEFAULT_EPO_VARIANT_ID)) {
      variants.unshift(def.variants[0]);
    }
    return { version: 1, variants };
  } catch {
    return def;
  }
}

export function resolveVariant(
  store: EpoNotenVariantsStore,
  variantId: string | null | undefined,
): EpoNotenVariantSheet {
  const id = variantId?.trim() || DEFAULT_EPO_VARIANT_ID;
  return store.variants.find((v) => v.id === id) ?? store.variants[0]!;
}

export function normalizeVariantSheet(v: {
  id: string;
  name: string;
  categoryTitles?: unknown;
  categoryWeightsPercent?: unknown;
  studentCategories?: unknown;
  teacherCategories?: unknown;
}): EpoNotenVariantSheet {
  const studentCategories = normalizeLines(v.studentCategories, DEFAULT_STUDENT);
  return {
    id: v.id,
    name: v.name.trim() || 'Variante',
    categoryTitles: normalizeTitles(
      v.categoryTitles,
      studentCategories.map((_, i) => `Bereich ${i + 1}`),
    ),
    categoryWeightsPercent: normalizeWeights(v.categoryWeightsPercent),
    studentCategories,
    teacherCategories: normalizeLines(v.teacherCategories, DEFAULT_TEACHER),
  };
}

export function createVariantFromBase(
  store: EpoNotenVariantsStore,
  name: string,
  copyFromId?: string,
): EpoNotenVariantSheet {
  const src = resolveVariant(store, copyFromId || DEFAULT_EPO_VARIANT_ID);
  return {
    id: randomUUID(),
    name: name.trim() || 'Neue Variante',
    studentCategories: [...src.studentCategories],
    teacherCategories: [...src.teacherCategories],
  };
}
