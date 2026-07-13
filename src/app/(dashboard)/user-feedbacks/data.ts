import { z } from 'zod';

export const feedbackSchema = z.object({
  id: z.string(),
  appId: z.string(),
  appName: z.string(),
  appIcon: z.string().url(),
  platform: z.enum(['iOS', 'Android', 'Unknown']),
  appVersion: z.string(),
  feedback: z.string(), 
  dateTime: z.string(), 
  email: z.string().email(),
  languageCode: z.string(),
  status: z.enum(['Pending', 'Replied', 'Archived', 'Resolved']),
  dbName: z.string(),
});

export type Feedback = z.infer<typeof feedbackSchema>;
