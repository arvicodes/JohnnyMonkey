interface GradeNode {
  name: string;
  weight: number;
  children?: GradeNode[];
}

export class GradingSchemaService {
  validateSchema(schema: GradeNode): boolean {
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

  parseSchemaString(schemaStr: string): GradeNode {
    const lines = schemaStr.split('\n');
    const root: GradeNode = { name: lines[0].trim(), weight: 1, children: [] };
    let currentPath: GradeNode[] = [root];
    let currentIndent = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const [name, weightStr] = line.trim().split('(');
      const weight = parseFloat(weightStr.replace(')', ''));

      const node: GradeNode = {
        name: name.trim(),
        weight: weight,
        children: []
      };

      if (indent > currentIndent) {
        currentPath[currentPath.length - 1].children = currentPath[currentPath.length - 1].children || [];
        currentPath[currentPath.length - 1].children!.push(node);
      } else if (indent === currentIndent) {
        currentPath[currentPath.length - 2].children!.push(node);
      } else {
        const steps = (currentIndent - indent) / 2;
        currentPath = currentPath.slice(0, -steps);
        currentPath[currentPath.length - 1].children!.push(node);
      }

      currentPath = [...currentPath.slice(0, -1), node];
      currentIndent = indent;
    }

    return root;
  }

  formatSchemaToString(schema: GradeNode, indent: number = 0): string {
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