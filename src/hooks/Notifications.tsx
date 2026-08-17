import { useMutation, useQuery } from "convex/react";
import { api } from "../convexClient";
import { AppNotification } from "../schema";

type ServerNotification = Omit<AppNotification, "createdAt"> & {
  createdAt: number;
};

export const useNotifications = () => {
  const serverNotifications = useQuery(api.app.notifications, {}) as
    | ServerNotification[]
    | undefined;
  const markRead = useMutation(api.app.markNotificationRead);
  const markAllRead = useMutation(api.app.markAllNotificationsRead);

  const notifications: AppNotification[] = (serverNotifications ?? []).map(
    (notification) => ({
      ...notification,
      createdAt: new Date(notification.createdAt),
    })
  );

  return {
    notifications,
    isLoading: serverNotifications === undefined,
    unreadCount: notifications.filter((n) => !n.read).length,
    markRead,
    markAllRead,
  };
};
