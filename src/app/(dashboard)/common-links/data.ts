
import { z } from 'zod';

export const commonLinkSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  link: z.string().url("Please enter a valid URL"),
});

export type CommonLink = z.infer<typeof commonLinkSchema>;
