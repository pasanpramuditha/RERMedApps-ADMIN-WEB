import { z } from 'zod';

export const appleInstallRowSchema = z.object({
  date: z.string().optional(),
  name: z.string().optional(),
  creator: z.string().optional(),
  type: z.string().optional(),
  platforms: z.string().optional(),
  appleId: z.string().optional(),
  units: z.number().optional(),
});

export type AppleInstallRow = z.infer<typeof appleInstallRowSchema>;

export const appleInstallReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}$/),
  days: z.array(z.object({
    date: z.string(),
    itemCount: z.number(),
    totalUnits: z.number(),
    items: z.array(z.object({
      appleId: z.string(),
      units: z.number(),
    })),
  })),
});

export type AppleInstallReport = z.infer<typeof appleInstallReportSchema>;
