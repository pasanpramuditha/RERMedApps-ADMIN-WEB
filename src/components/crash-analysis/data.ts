import { z } from 'zod';

export const crashReportSchema = z.object({
  id: z.string(),
  error: z.string(),
  location: z.string(),
  appVersion: z.string(),
  platform: z.enum(['Apple', 'Android']),
  devices: z.number(),
  users: z.number(),
  lastOccurred: z.string(),
});

export type CrashReport = z.infer<typeof crashReportSchema>;

export const crashReports: CrashReport[] = [
    {
        id: "CRASH-001",
        error: "NullPointerException",
        location: "com.rer.medapps.MainActivity:24",
        appVersion: "v2.3.1",
        platform: "Android",
        devices: 120,
        users: 95,
        lastOccurred: "2024-07-29 14:30",
    },
    {
        id: "CRASH-002",
        error: "Fatal error: Unexpectedly found nil",
        location: "DashboardViewController.swift:112",
        appVersion: "v2.3.0",
        platform: "Apple",
        devices: 88,
        users: 72,
        lastOccurred: "2024-07-29 11:05",
    },
    {
        id: "CRASH-003",
        error: "ArrayIndexOutOfBoundsException",
        location: "com.rer.medapps.utils.ChartHelper:87",
        appVersion: "v2.3.1",
        platform: "Android",
        devices: 54,
        users: 43,
        lastOccurred: "2024-07-28 22:15",
    },
    {
        id: "CRASH-004",
        error: "SIGSEGV",
        location: "libsystem_kernel.dylib",
        appVersion: "v2.2.5",
        platform: "Apple",
        devices: 32,
        users: 30,
        lastOccurred: "2024-07-27 09:00",
    },
    {
        id: "CRASH-005",
        error: "IllegalStateException: Fragment not attached",
        location: "com.rer.medapps.fragments.ProfileFragment:56",
        appVersion: "v2.3.1",
        platform: "Android",
        devices: 15,
        users: 15,
        lastOccurred: "2024-07-29 16:40",
    },
     {
        id: "CRASH-006",
        error: "Could not cast value of type '__NSCFNumber' to 'NSString'",
        location: "SettingsViewModel.swift:203",
        appVersion: "v2.3.0",
        platform: "Apple",
        devices: 10,
        users: 8,
        lastOccurred: "2024-07-26 18:00",
    },
];
