'use client';

import { z } from 'zod';

// Zod schema for validation (client-side version)
export const BlogSchema = z.object({
    _id: z.string().optional(),
    title: z.string(),
    subtitle: z.string(),
    content: z.string(),
    footer: z.string().optional(),
    bibliography: z.string().optional(),
    published: z.boolean(),
    slug: z.string(),
    tags: z.array(z.string()),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

// Type for TypeScript
export type Blog = z.infer<typeof BlogSchema>; 