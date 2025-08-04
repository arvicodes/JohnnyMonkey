interface GradeNode {
  name: string;
  weight: number;
  children?: GradeNode[];
}

export class GradingSchemaService {
  validateSchema(schema: GradeNode): boolean {
    // Only validate the root level - it should sum to 100%
    // Child levels can have any weights as they represent absolute percentages
    if (schema.children && schema.children.length > 0) {
      const weightSum = schema.children.reduce((sum, child) => sum + child.weight, 0);
      
      if (Math.abs(weightSum - 100) > 0.01) {
        return false;
      }
    }
    return true;
  }

  parseSchemaString(schemaStr: string): GradeNode {
    // Check if the string is JSON format (old format)
    if (schemaStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(schemaStr);
        return parsed;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid JSON format: ${errorMessage}`);
      }
    }

    // Handle text format (new format)
    const lines = schemaStr.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Empty schema string');
    }

    const root: GradeNode = { name: lines[0].trim(), weight: 100, children: [] };
    const stack: { node: GradeNode; indent: number }[] = [{ node: root, indent: -1 }];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
      
      if (!match) {
        throw new Error(`Invalid line format: ${line}`);
      }

      const [, name, weightStr] = match;
      const weight = parseFloat(weightStr);

      if (isNaN(weight) || weight < 0) {
        throw new Error(`Invalid weight: ${weightStr}`);
      }

      const node: GradeNode = {
        name: name.trim(),
        weight: weight,
        children: []
      };

      // Find the correct parent based on indentation
      // Pop nodes from stack until we find the right parent level
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      // Add as child to the current top of stack
      const parent = stack[stack.length - 1].node;
      parent.children!.push(node);

      // Push this node onto the stack for potential children
      stack.push({ node, indent });
    }

    return root;
  }

  formatSchemaToString(schema: GradeNode): string {
    const formatNode = (node: GradeNode, indent: number = 0): string => {
      const line = ' '.repeat(indent) + `${node.name} (${node.weight}%)`;
      
      if (node.children && node.children.length > 0) {
        const childLines = node.children.map(child => formatNode(child, indent + 2));
        return line + '\n' + childLines.join('\n');
      }
      
      return line;
    };

    return formatNode(schema);
  }
} 