import { requireUser } from "@/lib/session";
import { listNotifications, unreadCount } from "@/services/notification-service";
import { NotificationDropdown } from "@/components/nav/NotificationDropdown";

export async function NotificationBell() {
  const user = await requireUser();
  const [items, count] = await Promise.all([listNotifications(user.id), unreadCount(user.id)]);
  return <NotificationDropdown count={count} items={items.map((n) => ({ id: n.id, message: n.message, read: !!n.readAt }))} />;
}
