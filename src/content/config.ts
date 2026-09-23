import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['go', 'distributed-systems', 'rust', 'quantum', 'cryptography', 'ai']),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    canonicalUrl: z.string().optional(),
    externalUrl: z.string().optional(),
    readingTime: z.string().optional(),
  }),
});

const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['active', 'completed', 'archived']),
    technologies: z.array(z.string()),
    github: z.string().optional(),
    liveUrl: z.string().optional(),
    featured: z.boolean().default(false),
    category: z.string().optional(),
    metrics: z.array(z.string()).optional(),
    order: z.number().default(0),
  }),
});

const labsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['go', 'rust', 'quantum', 'cryptography', 'distributed-systems', 'ai']),
    status: z.enum(['experiment', 'active', 'completed']),
    technologies: z.array(z.string()),
    github: z.string().optional(),
    demoUrl: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const learnCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    track: z.string(),
    module: z.string().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'all']).default('beginner'),
    duration: z.number().optional(),
    prerequisites: z.array(z.string()).default([]),
    concepts: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    interactive: z.object({
      type: z.string(),
      enabled: z.boolean().default(true),
    }).optional(),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  blog: blogCollection,
  projects: projectsCollection,
  labs: labsCollection,
  learn: learnCollection,
};

