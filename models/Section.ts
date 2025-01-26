import mongoose from 'mongoose';
import { z } from 'zod';

// Content schemas for each section type (for reference/documentation)
export const HomeContent = z.object({
  headline: z.string(),
  description: z.string()
});

export const AboutContent = z.object({
  description: z.string(),
  highlights: z.array(z.string())
});

export const ExperienceEntry = z.object({
  title: z.string(),
  company: z.string(),
  period: z.string(),
  description: z.string().optional(),
  responsibilities: z.array(z.string())
});

export const ExperienceContent = z.object({
  experiences: z.array(ExperienceEntry)
});

export const EducationEntry = z.object({
  institution: z.string(),
  degree: z.string(),
  period: z.string(),
  description: z.string()
});

export const EducationContent = z.object({
  education: z.array(EducationEntry)
});

export const SkillsContent = z.object({
  description: z.string()
});

export const BlogContent = z.object({
  description: z.string(),
  featured: z.boolean().optional()
});

export const ContactContent = z.object({
  email: z.string(),
  city: z.string(),
  social: z.object({
    github: z.string().url(),
    linkedin: z.string().url()
  })
});

// Main section schema (flexible for both creation and updates)
export const SectionSchema = z.object({
  title: z.string(),
  order: z.number(),
  visible: z.boolean(),
  content: z.record(z.any()).default({})
});

// Types
export type Section = z.infer<typeof SectionSchema>;
export type HomeContent = z.infer<typeof HomeContent>;
export type AboutContent = z.infer<typeof AboutContent>;
export type ExperienceContent = z.infer<typeof ExperienceContent>;
export type EducationContent = z.infer<typeof EducationContent>;
export type SkillsContent = z.infer<typeof SkillsContent>;
export type BlogContent = z.infer<typeof BlogContent>;
export type ContactContent = z.infer<typeof ContactContent>;

// Mongoose schema
const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, required: true },
  visible: { type: Boolean, required: true, default: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  timestamps: true,
  collection: 'sections'
});

// Delete the model if it exists to prevent OverwriteModelError
if (mongoose.models.Section) {
  delete mongoose.models.Section;
}

export const SectionModel = mongoose.model('Section', sectionSchema); 