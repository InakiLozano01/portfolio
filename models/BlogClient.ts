'use client';

import { z } from 'zod';

// Helper to enforce trimmed strings for required bilingual fields
const localizedString = (label: string) =>
    z
        .string({ required_error: `${label} is required` })
        .trim()
        .min(1, `${label} is required`);

// Zod schema for validation (client-side version)
export const BlogSchema = z.object({
    _id: z.string().optional(),
    // Bilingual fields (primary source of truth)
    title_en: localizedString('English title'),
    title_es: localizedString('Spanish title'),
    subtitle_en: localizedString('English subtitle'),
    subtitle_es: localizedString('Spanish subtitle'),
    content_en: localizedString('English content'),
    content_es: localizedString('Spanish content'),
    footer_en: z.string().optional(),
    footer_es: z.string().optional(),
    bibliography_en: z.string().optional(),
    bibliography_es: z.string().optional(),
    // Legacy single-language fields (kept for backward compatibility)
    title: z.string(),
    subtitle: z.string(),
    content: z.string(),
    footer: z.string().optional(),
    bibliography: z.string().optional(),
    // PDFs
    pdf_en: z.string().optional(),
    pdf_es: z.string().optional(),
    published: z.boolean(),
    slug: z.string(),
    tags: z.array(z.string()),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

// Type for TypeScript
export type Blog = z.infer<typeof BlogSchema>; 
