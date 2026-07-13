
import { UserNotificationConsole } from '@/components/push-notifications/user-notification-console';
import { getApps } from '../apps/actions';

export const dynamic = 'force-dynamic';

export default async function PushNotificationsPage() {
  const apps = await getApps();
  const androidApps = apps
    .filter((app) => app.isActive && app.os.toLowerCase().includes('android'))
    .map((app) => ({
      id: app.id,
      name: app.name,
      icon_url: app.icon_url,
      package_name: app.package_name,
      db_name: app.db_name,
    }));

  return <UserNotificationConsole apps={androidApps} />;
}
