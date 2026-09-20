import { apiClient } from "./client";

export interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  userId: string;
  taskId: string | null;
  createdAt: string;
  task: {
    id: string;
    title: string;
  } | null;
}

export async function getNotifications(
  accessToken: string
): Promise<Notification[]> {
  const response = await apiClient.get<{
    notifications: Notification[];
  }>("/api/notifications", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.notifications;
}

export async function markNotificationAsRead(
  accessToken: string,
  notificationId: string
): Promise<Notification> {
  const response = await apiClient.patch<{
    notification: Notification;
  }>(
    `/api/notifications/${notificationId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data.notification;
}

export async function markAllNotificationsAsRead(
  accessToken: string
): Promise<void> {
  await apiClient.patch(
    "/api/notifications/read-all",
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}
