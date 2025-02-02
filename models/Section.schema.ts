import { z } from 'zod';

export const HomeContent = z.object({
  headline: z.string(),
  description: z.string()
});

export const AboutContent = z.object({
  description: z.string(),
  highlights: z.array(z.string())
});

export const EducationContent = z.object({
  education: z.array(z.object({
      institution: z.string(),
      degree: z.string(),
      period: z.string(),
      description: z.string()
    }))
});

export const ProjectsContent = z.any();

export const ExperienceContent = z.object({
  experiences: z.array(z.object({
      company: z.string(),
      period: z.string(),
      responsibilities: z.array(z.string()),
      title: z.string()
    }))
});

export const SkillsContent = z.object({
  description: z.string()
});

export const BlogContent = z.object({
  description: z.string(),
  featured: z.boolean()
});

export const ContactContent = z.object({
  email: z.string(),
  city: z.string(),
  social: z.object({
    github: z.string(),
    linkedin: z.string()
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
export type HomeContent = z.infer<typeof HomeContent>;
export type AboutContent = z.infer<typeof AboutContent>;
export type EducationContent = z.infer<typeof EducationContent>;
export type ProjectsContent = z.infer<typeof ProjectsContent>;
export type ExperienceContent = z.infer<typeof ExperienceContent>;
export type SkillsContent = z.infer<typeof SkillsContent>;
export type BlogContent = z.infer<typeof BlogContent>;
export type ContactContent = z.infer<typeof ContactContent>;
export type Section = z.infer<typeof SectionSchema>;
