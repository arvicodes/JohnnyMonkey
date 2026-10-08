import { randomUUID } from 'crypto';
import { EPO_NO_VARIANT_ID, EPO_VARIANT2_ID, EPO_VARIANT2_WEIGHTED_PRESET } from './epoNotenVariantPresets';

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

const builtInVariant1 = (): EpoNotenVariantSheet =>
  normalizeVariantSheet({
    id: DEFAULT_EPO_VARIANT_ID,
    name: 'Variante 1 (klassisch)',
    studentCategories: DEFAULT_STUDENT,
    teacherCategories: DEFAULT_TEACHER,
  });

const builtInVariant2 = (): EpoNotenVariantSheet =>
  normalizeVariantSheet({
    id: EPO_VARIANT2_ID,
    name: EPO_VARIANT2_WEIGHTED_PRESET.name,
    categoryTitles: EPO_VARIANT2_WEIGHTED_PRESET.categoryTitles,
    categoryWeightsPercent: EPO_VARIANT2_WEIGHTED_PRESET.categoryWeightsPercent,
    studentCategories: EPO_VARIANT2_WEIGHTED_PRESET.studentCategories,
    teacherCategories: EPO_VARIANT2_WEIGHTED_PRESET.teacherCategories,
  });

export function builtInVariantsStore(): EpoNotenVariantsStore {
  return {
    version: 1,
    variants: [builtInVariant1(), builtInVariant2()],
  };
}

/** Feste Zettel — eingebaute Varianten immer mit aktuellem Text/Gewichtung. */
export function ensureBuiltInVariants(store: EpoNotenVariantsStore): EpoNotenVariantsStore {
  const builtIn = builtInVariantsStore();
  const extra = store.variants.filter(
    (v) => v.id !== DEFAULT_EPO_VARIANT_ID && v.id !== EPO_VARIANT2_ID,
  );
  return {
    version: 1,
    variants: [...builtIn.variants, ...extra],
  };
}

export function defaultVariantsStore(): EpoNotenVariantsStore {
  return builtInVariantsStore();
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
    return ensureBuiltInVariants({ version: 1, variants });
  } catch {
    return def;
  }
}

export function resolveVariant(
  store: EpoNotenVariantsStore,
  variantId: string | null | undefined,
): EpoNotenVariantSheet {
  const id = variantId?.trim() || EPO_VARIANT2_ID;
  return store.variants.find((v) => v.id === id) ?? store.variants[0]!;
}

/** Gewählter EPO-Zettel pro Lerngruppe — ohne Fallback auf Variante 2. */
export function effectiveEpoVariantIdForGroup(
  payload: { variantId?: string | null; variantIdByGroup?: Record<string, string> },
  groupId?: string | null,
): string | null {
  if (groupId) {
    const per = payload.variantIdByGroup?.[groupId];
    if (per === EPO_NO_VARIANT_ID || per === '') return null;
    if (per && String(per).trim()) return String(per).trim();
  }
  const roundDefault = payload.variantId?.trim();
  if (roundDefault === EPO_NO_VARIANT_ID) return null;
  if (roundDefault && roundDefault !== DEFAULT_EPO_VARIANT_ID) return roundDefault;
  return EPO_VARIANT2_ID;
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
