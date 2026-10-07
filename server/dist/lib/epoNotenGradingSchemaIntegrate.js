"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leafCategoryNamesFromSchemaStructure = leafCategoryNamesFromSchemaStructure;
exports.matchEpoCategoryName = matchEpoCategoryName;
exports.parseTeacherGradeForSchemaStorage = parseTeacherGradeForSchemaStorage;
exports.integrateReleasedEpoRoundIntoGradingSchema = integrateReleasedEpoRoundIntoGradingSchema;
const gradeScale_1 = require("./gradeScale");
function leafCategoryNamesFromSchemaStructure(structure) {
    if (!(structure === null || structure === void 0 ? void 0 : structure.trim()))
        return [];
    try {
        const nodes = JSON.parse(structure);
        if (!Array.isArray(nodes))
            return [];
        const out = [];
        const walk = (node) => {
            var _a, _b;
            if ((_a = node.children) === null || _a === void 0 ? void 0 : _a.length)
                node.children.forEach(walk);
            else if ((_b = node.name) === null || _b === void 0 ? void 0 : _b.trim())
                out.push(node.name.trim());
        };
        nodes.forEach(walk);
        return out;
    }
    catch {
        return [];
    }
}
/** Rundentitel → exakter Kategoriename im Notenschema (z. B. „EPO 1“). */
function matchEpoCategoryName(roundTitle, schemaLeaves) {
    var _a;
    const title = roundTitle.trim();
    const titleNorm = title.toLowerCase();
    const leaves = schemaLeaves.filter(Boolean);
    const epoLeaves = leaves.filter((n) => n.toLowerCase().includes('epo'));
    const exactEpo = epoLeaves.find((n) => n.trim().toLowerCase() === titleNorm);
    if (exactEpo)
        return exactEpo;
    const exactAny = leaves.find((n) => n.trim().toLowerCase() === titleNorm);
    if (exactAny)
        return exactAny;
    const period = (_a = titleNorm.match(/epo\s*(\d+)/)) === null || _a === void 0 ? void 0 : _a[1];
    if (period) {
        const byPeriod = epoLeaves.find((n) => {
            const compact = n.toLowerCase().replace(/\s+/g, '');
            return compact === `epo${period}` || n.toLowerCase().includes(`epo ${period}`);
        });
        if (byPeriod)
            return byPeriod;
    }
    return title || 'EPO';
}
function parseTeacherGradeForSchemaStorage(raw, mode) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    if (mode === 'mss') {
        const n = parseFloat(trimmed.replace(',', '.').replace(/[^\d.,-]/g, ''));
        return Number.isFinite(n) ? n : null;
    }
    const normalized = trimmed.replace(/−/g, '-');
    if (gradeScale_1.GRADE_TENDENCY_TO_NUMERIC[normalized] !== undefined) {
        return gradeScale_1.GRADE_TENDENCY_TO_NUMERIC[normalized];
    }
    const n = parseFloat(trimmed.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}
async function integrateReleasedEpoRoundIntoGradingSchema(prisma, params) {
    var _a;
    const schema = await prisma.gradingSchema.findFirst({
        where: { groupId: params.groupId },
        select: { id: true, structure: true },
    });
    if (!schema)
        return null;
    const leaves = leafCategoryNamesFromSchemaStructure(schema.structure);
    const categoryName = matchEpoCategoryName(params.roundTitle, leaves);
    const gradeRows = [];
    for (const studentId of params.studentIdsInGroup) {
        const entry = params.entries.find((e) => e.studentId === studentId && (e.groupId === params.groupId || !e.groupId));
        if (!(entry === null || entry === void 0 ? void 0 : entry.teacherReleasedAt) || !((_a = entry.teacherGrade) === null || _a === void 0 ? void 0 : _a.trim()))
            continue;
        const gradeVal = parseTeacherGradeForSchemaStorage(entry.teacherGrade, params.assessmentMode);
        if (gradeVal == null)
            continue;
        gradeRows.push({ studentId, grade: gradeVal, weight: 1 });
    }
    if (gradeRows.length === 0)
        return { count: 0, categoryName, schemaId: schema.id };
    await Promise.all(gradeRows.map((row) => prisma.grade.upsert({
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
    })));
    return { count: gradeRows.length, categoryName, schemaId: schema.id };
}
//# sourceMappingURL=epoNotenGradingSchemaIntegrate.js.map