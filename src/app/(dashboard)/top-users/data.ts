
import { z } from 'zod';

export const topUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  appsPurchased: z.number(),
  packages: z.array(z.object({
    name: z.string(),
    iconUrl: z.string().url(),
  })),
});

export type TopUser = z.infer<typeof topUserSchema>;
