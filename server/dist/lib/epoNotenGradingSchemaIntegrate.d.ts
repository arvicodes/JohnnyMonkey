import { PrismaClient } from '@prisma/client';
export type EpoAssessmentMode = 'mss' | 'note';
export declare function leafCategoryNamesFromSchemaStructure(structure: string | null | undefined): string[];
/** Rundentitel → exakter Kategoriename im Notenschema (z. B. „EPO 1“). */
export declare function matchEpoCategoryName(roundTitle: string, schemaLeaves: string[]): string;
export declare function parseTeacherGradeForSchemaStorage(raw: string, mode: EpoAssessmentMode): number | null;
export type EpoIntegrateEntry = {
    studentId: string;
    groupId?: string;
    teacherReleasedAt?: string | null;
    teacherGrade?: string | null;
};
export declare function integrateReleasedEpoRoundIntoGradingSchema(prisma: PrismaClient, params: {
    groupId: string;
    roundTitle: string;
    assessmentMode: EpoAssessmentMode;
    entries: EpoIntegrateEntry[];
    studentIdsInGroup: string[];
}): Promise<{
    count: number;
    categoryName: string;
    schemaId: string;
} | null>;
//# sourceMappingURL=epoNotenGradingSchemaIntegrate.d.ts.map