import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  mobile: z.string().optional(),
  avatarUrl: z.string().url(),
  createdDate: z.string(),
  lastLogin: z.string(),
  status: z.enum(['Active', 'Disabled']),
  navigation_visibility_json: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
