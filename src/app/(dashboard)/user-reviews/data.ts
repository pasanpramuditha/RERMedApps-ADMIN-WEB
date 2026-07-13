import { z } from 'zod';

export const reviewSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  rating: z.number().min(0).max(5),
  text: z.string(),
  lastModified: z.string(),
  appVersion: z.string(),
  status: z.enum(['Published', 'Pending', 'Hidden']),
});

export type Review = z.infer<typeof reviewSchema>;
