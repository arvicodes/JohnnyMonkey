"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingSchemaService = void 0;
class GradingSchemaService {
    validateSchema(schema) {
        // Validate that weights sum up to 1 at each level
        if (schema.children) {
            const weightSum = schema.children.reduce((sum, child) => sum + child.weight, 0);
            if (Math.abs(weightSum - 1) > 0.0001) { // Using small epsilon for floating point comparison
                return false;
            }
            return schema.children.every(child => this.validateSchema(child));
        }
        return true;
    }
    parseSchemaString(schemaStr) {
        const lines = schemaStr.split('\n');
        const root = { name: lines[0].trim(), weight: 1, children: [] };
        let currentPath = [root];
        let currentIndent = 0;
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim())
                continue;
            const indent = line.search(/\S/);
            const [name, weightStr] = line.trim().split('(');
            const weight = parseFloat(weightStr.replace(')', ''));
            const node = {
                name: name.trim(),
                weight: weight,
                children: []
            };
            if (indent > currentIndent) {
                currentPath[currentPath.length - 1].children = currentPath[currentPath.length - 1].children || [];
                currentPath[currentPath.length - 1].children.push(node);
            }
            else if (indent === currentIndent) {
                currentPath[currentPath.length - 2].children.push(node);
            }
            else {
                const steps = (currentIndent - indent) / 2;
                currentPath = currentPath.slice(0, -steps);
                currentPath[currentPath.length - 1].children.push(node);
            }
            currentPath = [...currentPath.slice(0, -1), node];
            currentIndent = indent;
        }
        return root;
    }
    formatSchemaToString(schema, indent = 0) {
        let result = ' '.repeat(indent) + schema.name;
        if (schema.weight !== 1) {
            result += ` (${schema.weight})`;
        }
        result += '\n';
        if (schema.children) {
            for (const child of schema.children) {
                result += this.formatSchemaToString(child, indent + 2);
            }
        }
        return result;
    }
}
exports.GradingSchemaService = GradingSchemaService;
