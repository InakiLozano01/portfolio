import mongoose from 'mongoose';
import { z } from 'zod';

const localizedString = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

// Zod schema for validation (server-side version)
export const BlogSchema = z.object({
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
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().min(1, 'Subtitle is required'),
  content: z.string().min(1, 'Content is required'),
  footer: z.string().optional(),
  bibliography: z.string().optional(),
  // Blog PDF assets
  pdf_en: z.string().optional(),
  pdf_es: z.string().optional(),
  // Common fields
  published: z.boolean().default(false),
  slug: z.string().min(1, 'Slug is required'),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Type for TypeScript
export type Blog = {
  _id: string;
} & z.infer<typeof BlogSchema>;

// Mongoose schema (server-side only)
const blogSchema = new mongoose.Schema({
  // Legacy single-language fields
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  content: { type: String, required: true },
  footer: { type: String },
  bibliography: { type: String },
  // Bilingual fields
  title_en: { type: String, required: true },
  title_es: { type: String, required: true },
  subtitle_en: { type: String, required: true },
  subtitle_es: { type: String, required: true },
  content_en: { type: String, required: true },
  content_es: { type: String, required: true },
  footer_en: { type: String },
  footer_es: { type: String },
  bibliography_en: { type: String },
  bibliography_es: { type: String },
  // Blog PDF assets
  pdf_en: { type: String },
  pdf_es: { type: String },
  // Common fields
  published: { type: Boolean, default: false },
  slug: { type: String, required: true },
  tags: { type: [String], default: [] }
}, {
  timestamps: true
});

// Define the document interface
export interface IBlog extends mongoose.Document {
  title: string;
  subtitle: string;
  content: string;
  footer?: string;
  bibliography?: string;
  title_en: string;
  title_es: string;
  subtitle_en: string;
  subtitle_es: string;
  content_en: string;
  content_es: string;
  footer_en?: string;
  footer_es?: string;
  bibliography_en?: string;
  bibliography_es?: string;
  pdf_en?: string;
  pdf_es?: string;
  published: boolean;
  slug: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Only create the model on the server side
const BlogModel = (mongoose.models.Blog || mongoose.model<IBlog>('Blog', blogSchema)) as mongoose.Model<IBlog>;

export default BlogModel; 
