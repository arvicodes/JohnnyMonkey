"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingSchemaService = void 0;
class GradingSchemaService {
    validateSchema(schema) {
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
    parseSchemaString(schemaStr) {
        // Check if the string is JSON format (old format)
        if (schemaStr.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(schemaStr);
                return parsed;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Invalid JSON format: ${errorMessage}`);
            }
        }
        // Handle text format (new format)
        const lines = schemaStr.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            throw new Error('Empty schema string');
        }
        console.log('📋 Parsing schema with', lines.length, 'lines');
        console.log('📄 First few lines:', lines.slice(0, 5));
        const root = { name: lines[0].trim(), weight: 100, children: [] };
        const stack = [{ node: root, indent: -1 }];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim())
                continue;
            const indent = line.search(/\S/);
            const match = line.trim().match(/^(.+?)\s*\((\d+(?:\.\d+)?)%?\)$/);
            if (!match) {
                console.error('❌ Failed to parse line:', line);
                console.error('   Indent:', indent, 'Trimmed:', line.trim());
                throw new Error(`Invalid line format: "${line.trim()}"`);
            }
            const [, name, weightStr] = match;
            const weight = parseFloat(weightStr);
            if (isNaN(weight) || weight < 0) {
                throw new Error(`Invalid weight: ${weightStr}`);
            }
            const node = {
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
            parent.children.push(node);
            // Push this node onto the stack for potential children
            stack.push({ node, indent });
        }
        return root;
    }
    formatSchemaToString(schema) {
        const formatNode = (node, indent = 0) => {
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
exports.GradingSchemaService = GradingSchemaService;
//# sourceMappingURL=GradingSchemaService.js.map