export declare const EPO_VARIANTS_PATH = "__epo_noten_variants__";
export declare const DEFAULT_EPO_VARIANT_ID = "default";
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
export declare function builtInVariantsStore(): EpoNotenVariantsStore;
/** Feste Zettel — eingebaute Varianten immer mit aktuellem Text/Gewichtung. */
export declare function ensureBuiltInVariants(store: EpoNotenVariantsStore): EpoNotenVariantsStore;
export declare function defaultVariantsStore(): EpoNotenVariantsStore;
export declare function parseVariantsStore(raw: string | null | undefined): EpoNotenVariantsStore;
export declare function resolveVariant(store: EpoNotenVariantsStore, variantId: string | null | undefined): EpoNotenVariantSheet;
export declare function normalizeVariantSheet(v: {
    id: string;
    name: string;
    categoryTitles?: unknown;
    categoryWeightsPercent?: unknown;
    studentCategories?: unknown;
    teacherCategories?: unknown;
}): EpoNotenVariantSheet;
export declare function createVariantFromBase(store: EpoNotenVariantsStore, name: string, copyFromId?: string): EpoNotenVariantSheet;
//# sourceMappingURL=epoNotenVariants.d.ts.map