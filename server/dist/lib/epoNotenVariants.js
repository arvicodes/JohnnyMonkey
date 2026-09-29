"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EPO_VARIANT_ID = exports.EPO_VARIANTS_PATH = void 0;
exports.builtInVariantsStore = builtInVariantsStore;
exports.ensureBuiltInVariants = ensureBuiltInVariants;
exports.defaultVariantsStore = defaultVariantsStore;
exports.parseVariantsStore = parseVariantsStore;
exports.resolveVariant = resolveVariant;
exports.normalizeVariantSheet = normalizeVariantSheet;
exports.createVariantFromBase = createVariantFromBase;
const crypto_1 = require("crypto");
const epoNotenVariantPresets_1 = require("./epoNotenVariantPresets");
exports.EPO_VARIANTS_PATH = '__epo_noten_variants__';
exports.DEFAULT_EPO_VARIANT_ID = 'default';
const DEFAULT_STUDENT = [
    'Ich trage häufig mit qualitativ passenden (nicht notwendigerweise richtigen!) Beiträgen zum Unterricht bei.',
    'Ich konzentriere meine Aufmerksamkeit im Unterricht auf das Thema und höre konzentriert, ohne Ablenkungen von/durch Nachbarn, den Beiträgen anderer zu.',
    'In eigenen Arbeitsphasen beginne ich zügig, und arbeite konzentriert und strukturiert bis zum Ende.',
    'Mein Material habe ich dabei, bereit und meine Hausaufgaben sind erledigt und liegen vor. Ich schreib ordentlich mit.',
    'Ich verhalte mich im Unterricht angemessen ruhig, melde mich, wenn ich etwas sagen möchte und spreche nur, wenn ich an der Reihe bin.',
];
const DEFAULT_TEACHER = [
    'Du trägst häufig mit qualitativ passenden (nicht notwendigerweise richtigen!) Beiträgen zum Unterricht bei.',
    'Du konzentrierst deine Aufmerksamkeit im Unterricht auf das Thema und hörst konzentriert, ohne Ablenkungen von/durch Nachbarn, den Beiträgen anderer zu.',
    'In eigenen Arbeitsphasen beginnst du zügig, und arbeitest konzentriert und strukturiert bis zum Ende.',
    'Dein Material hast du dabei, bereit und deine Hausaufgaben sind erledigt und liegen vor. Du schreibst ordentlich mit.',
    'Du verhältst dich im Unterricht angemessen ruhig, meldest dich, wenn du etwas sagen möchtest und sprichst nur, wenn du an der Reihe bist.',
];
const builtInVariant1 = () => normalizeVariantSheet({
    id: exports.DEFAULT_EPO_VARIANT_ID,
    name: 'Variante 1 (klassisch)',
    studentCategories: DEFAULT_STUDENT,
    teacherCategories: DEFAULT_TEACHER,
});
const builtInVariant2 = () => normalizeVariantSheet({
    id: epoNotenVariantPresets_1.EPO_VARIANT2_ID,
    name: epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.name,
    categoryTitles: epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.categoryTitles,
    categoryWeightsPercent: epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.categoryWeightsPercent,
    studentCategories: epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.studentCategories,
    teacherCategories: epoNotenVariantPresets_1.EPO_VARIANT2_WEIGHTED_PRESET.teacherCategories,
});
function builtInVariantsStore() {
    return {
        version: 1,
        variants: [builtInVariant1(), builtInVariant2()],
    };
}
/** Feste Zettel — eingebaute Varianten immer mit aktuellem Text/Gewichtung. */
function ensureBuiltInVariants(store) {
    const builtIn = builtInVariantsStore();
    const extra = store.variants.filter((v) => v.id !== exports.DEFAULT_EPO_VARIANT_ID && v.id !== epoNotenVariantPresets_1.EPO_VARIANT2_ID);
    return {
        version: 1,
        variants: [...builtIn.variants, ...extra],
    };
}
function defaultVariantsStore() {
    return builtInVariantsStore();
}
const normalizeLines = (raw, fallback) => {
    const base = Array.isArray(raw) ? raw : [];
    return Array.from({ length: 5 }, (_, i) => {
        const t = typeof base[i] === 'string' ? String(base[i]).trim() : '';
        return t || fallback[i] || '';
    });
};
const normalizeWeights = (raw) => {
    if (!Array.isArray(raw) || raw.length !== 5)
        return undefined;
    const w = raw.map((x) => Math.round(Number(x)));
    if (!w.every((n) => Number.isFinite(n) && n > 0))
        return undefined;
    if (w.reduce((a, b) => a + b, 0) !== 100)
        return undefined;
    return w;
};
const normalizeTitles = (raw, fallback) => {
    const base = Array.isArray(raw) ? raw : [];
    return Array.from({ length: 5 }, (_, i) => {
        const t = typeof base[i] === 'string' ? String(base[i]).trim() : '';
        return t || fallback[i] || `Bereich ${i + 1}`;
    });
};
function parseVariantsStore(raw) {
    const def = defaultVariantsStore();
    if (!raw)
        return def;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.variants))
            return def;
        const variants = [];
        for (const v of parsed.variants) {
            if (!v || typeof v.id !== 'string' || typeof v.name !== 'string')
                continue;
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
    }
    catch {
        return def;
    }
}
function resolveVariant(store, variantId) {
    var _a;
    const id = (variantId === null || variantId === void 0 ? void 0 : variantId.trim()) || exports.DEFAULT_EPO_VARIANT_ID;
    return (_a = store.variants.find((v) => v.id === id)) !== null && _a !== void 0 ? _a : store.variants[0];
}
function normalizeVariantSheet(v) {
    const studentCategories = normalizeLines(v.studentCategories, DEFAULT_STUDENT);
    return {
        id: v.id,
        name: v.name.trim() || 'Variante',
        categoryTitles: normalizeTitles(v.categoryTitles, studentCategories.map((_, i) => `Bereich ${i + 1}`)),
        categoryWeightsPercent: normalizeWeights(v.categoryWeightsPercent),
        studentCategories,
        teacherCategories: normalizeLines(v.teacherCategories, DEFAULT_TEACHER),
    };
}
function createVariantFromBase(store, name, copyFromId) {
    const src = resolveVariant(store, copyFromId || exports.DEFAULT_EPO_VARIANT_ID);
    return {
        id: (0, crypto_1.randomUUID)(),
        name: name.trim() || 'Neue Variante',
        studentCategories: [...src.studentCategories],
        teacherCategories: [...src.teacherCategories],
    };
}
//# sourceMappingURL=epoNotenVariants.js.map