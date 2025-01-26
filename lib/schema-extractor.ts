import { writeFile } from 'fs/promises';
import { join } from 'path';
import { connectToDatabase } from './mongodb';
import { SectionModel } from '@/models/Section';

function generateZodSchema(obj: any, indent = ''): string {
    if (Array.isArray(obj)) {
        if (obj.length === 0) return 'z.array(z.any())';
        const itemSchema = generateZodSchema(obj[0], indent + '  ');
        return `z.array(${itemSchema})`;
    }

    if (typeof obj === 'object' && obj !== null) {
        const entries = Object.entries(obj);
        if (entries.length === 0) return 'z.object({})';

        const properties = entries.map(([key, value]) => {
            const schema = generateZodSchema(value, indent + '  ');
            return `${indent}  ${key}: ${schema}`;
        }).join(',\n');

        return `z.object({\n${properties}\n${indent}})`;
    }

    switch (typeof obj) {
        case 'string': return 'z.string()';
        case 'number': return 'z.number()';
        case 'boolean': return 'z.boolean()';
        default: return 'z.any()';
    }
}

export async function extractAndSaveSchemas() {
    try {
        await connectToDatabase();
        const sections = await SectionModel.find().sort({ order: 1 });

        // Group sections by title
        const schemasByType = sections.reduce((acc, section) => {
            const title = section.title.toLowerCase();
            if (!acc[title]) {
                acc[title] = section.content;
            }
            return acc;
        }, {} as Record<string, any>);

        // Generate schema content
        let schemaContent = `import { z } from 'zod';\n\n`;

        // Add each content type schema
        for (const [type, content] of Object.entries(schemasByType)) {
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            const schema = generateZodSchema(content);
            schemaContent += `export const ${typeName}Content = ${schema};\n\n`;
        }

        // Add the main section schema
        schemaContent += `
// Main section schema (flexible for both creation and updates)
export const SectionSchema = z.object({
    title: z.string(),
    order: z.number(),
    visible: z.boolean(),
    content: z.record(z.any()).default({})
});

// Types
${Object.keys(schemasByType).map(type => {
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            return `export type ${typeName}Content = z.infer<typeof ${typeName}Content>;`;
        }).join('\n')}
export type Section = z.infer<typeof SectionSchema>;
`;

        // Save to a temporary file first
        const tempPath = join(process.cwd(), 'models', 'Section.schema.ts');
        await writeFile(tempPath, schemaContent, 'utf-8');

        console.log('Successfully extracted and saved section schemas');
        return true;
    } catch (error) {
        console.error('Failed to extract schemas:', error);
        return false;
    }
} 