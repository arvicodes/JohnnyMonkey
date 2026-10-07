import { PrismaClient } from '@prisma/client';
import { GRADE_TENDENCY_TO_NUMERIC, type GradeTendency } from './gradeScale';
export type EpoAssessmentMode = 'mss' | 'note';

type SchemaTreeNode = { name: string; children?: SchemaTreeNode[] };

export function leafCategoryNamesFromSchemaStructure(structure: string | null | undefined): string[] {
  if (!structure?.trim()) return [];
  try {
    const nodes = JSON.parse(structure) as SchemaTreeNode[];
    if (!Array.isArray(nodes)) return [];
    const out: string[] = [];
    const walk = (node: SchemaTreeNode) => {
      if (node.children?.length) node.children.forEach(walk);
      else if (node.name?.trim()) out.push(node.name.trim());
    };
    nodes.forEach(walk);
    return out;
  } catch {
    return [];
  }
}

/** Rundentitel → exakter Kategoriename im Notenschema (z. B. „EPO 1“). */
export function matchEpoCategoryName(roundTitle: string, schemaLeaves: string[]): string {
  const title = roundTitle.trim();
  const titleNorm = title.toLowerCase();
  const leaves = schemaLeaves.filter(Boolean);
  const epoLeaves = leaves.filter((n) => n.toLowerCase().includes('epo'));

  const exactEpo = epoLeaves.find((n) => n.trim().toLowerCase() === titleNorm);
  if (exactEpo) return exactEpo;

  const exactAny = leaves.find((n) => n.trim().toLowerCase() === titleNorm);
  if (exactAny) return exactAny;

  const period = titleNorm.match(/epo\s*(\d+)/)?.[1];
  if (period) {
    const byPeriod = epoLeaves.find((n) => {
      const compact = n.toLowerCase().replace(/\s+/g, '');
      return compact === `epo${period}` || n.toLowerCase().includes(`epo ${period}`);
    });
    if (byPeriod) return byPeriod;
  }

  return title || 'EPO';
}

export function parseTeacherGradeForSchemaStorage(
  raw: string,
  mode: EpoAssessmentMode,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (mode === 'mss') {
    const n = parseFloat(trimmed.replace(',', '.').replace(/[^\d.,-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  const normalized = trimmed.replace(/−/g, '-') as GradeTendency;
  if (GRADE_TENDENCY_TO_NUMERIC[normalized] !== undefined) {
    return GRADE_TENDENCY_TO_NUMERIC[normalized];
  }
  const n = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export type EpoIntegrateEntry = {
  studentId: string;
  groupId?: string;
  teacherReleasedAt?: string | null;
  teacherGrade?: string | null;
};

export async function integrateReleasedEpoRoundIntoGradingSchema(
  prisma: PrismaClient,
  params: {
    groupId: string;
    roundTitle: string;
    assessmentMode: EpoAssessmentMode;
    entries: EpoIntegrateEntry[];
    studentIdsInGroup: string[];
  },
): Promise<{ count: number; categoryName: string; schemaId: string } | null> {
  const schema = await prisma.gradingSchema.findFirst({
    where: { groupId: params.groupId },
    select: { id: true, structure: true },
  });
  if (!schema) return null;

  const leaves = leafCategoryNamesFromSchemaStructure(schema.structure);
  const categoryName = matchEpoCategoryName(params.roundTitle, leaves);
  const gradeRows: { studentId: string; grade: number; weight: number }[] = [];

  for (const studentId of params.studentIdsInGroup) {
    const entry = params.entries.find(
      (e) => e.studentId === studentId && (e.groupId === params.groupId || !e.groupId),
    );
    if (!entry?.teacherReleasedAt || !entry.teacherGrade?.trim()) continue;
    const gradeVal = parseTeacherGradeForSchemaStorage(entry.teacherGrade, params.assessmentMode);
    if (gradeVal == null) continue;
    gradeRows.push({ studentId, grade: gradeVal, weight: 1 });
  }

  if (gradeRows.length === 0) return { count: 0, categoryName, schemaId: schema.id };

  await Promise.all(
    gradeRows.map((row) =>
      prisma.grade.upsert({
        where: {
          studentId_schemaId_categoryName: {
            studentId: row.studentId,
            schemaId: schema.id,
            categoryName,
          },
        },
        update: {
          grade: parseFloat(row.grade.toFixed(1)),
          weight: row.weight,
        },
        create: {
          studentId: row.studentId,
          schemaId: schema.id,
          categoryName,
          grade: parseFloat(row.grade.toFixed(1)),
          weight: row.weight,
        },
      }),
    ),
  );

  return { count: gradeRows.length, categoryName, schemaId: schema.id };
}
