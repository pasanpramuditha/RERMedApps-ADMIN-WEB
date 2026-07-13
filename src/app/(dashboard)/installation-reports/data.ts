
import { z } from 'zod';

export const installationDataSchema = z.object({
  id: z.string(),
  date: z.string(),
  packageName: z.string(),
  dailyDeviceInstalls: z.string(),
  dailyDeviceUninstalls: z.string(),
  dailyDeviceUpgrades: z.string(),
  totalUserInstalls: z.string(),
  dailyUserInstalls: z.string(),
  dailyUserUninstalls: z.string(),
  activeDeviceInstalls: z.string(),
  installEvents: z.string(),
  updateEvents: z.string(),
  uninstallEvents: z.string(),
});

export type InstallationData = z.infer<typeof installationDataSchema>;
