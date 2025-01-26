import mongoose from 'mongoose';
import { z } from 'zod';

// Zod schema for validation (server-side version)
export const BlogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().min(1, 'Subtitle is required'),
  content: z.string().min(1, 'Content is required'),
  footer: z.string().optional(),
  bibliography: z.string().optional(),
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
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  content: { type: String, required: true },
  footer: { type: String },
  bibliography: { type: String },
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
  published: boolean;
  slug: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Only create the model on the server side
const BlogModel = (mongoose.models.Blog || mongoose.model<IBlog>('Blog', blogSchema)) as mongoose.Model<IBlog>;

export default BlogModel; 