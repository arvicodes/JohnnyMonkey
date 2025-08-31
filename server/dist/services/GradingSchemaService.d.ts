interface GradeNode {
    name: string;
    weight: number;
    children?: GradeNode[];
}
export declare class GradingSchemaService {
    validateSchema(schema: GradeNode): boolean;
    parseSchemaString(schemaStr: string): GradeNode;
    formatSchemaToString(schema: GradeNode): string;
}
export {};
//# sourceMappingURL=GradingSchemaService.d.ts.map