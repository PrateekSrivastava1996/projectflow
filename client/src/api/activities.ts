import { apiClient } from "./client";

export interface TaskActivity {
  id: string;
  action: string;
  details: string | null;
  taskId: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export async function getTaskActivities(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string
): Promise<TaskActivity[]> {
  const response = await apiClient.get<{
    activities: TaskActivity[];
  }>(`/api/projects/${projectId}/tasks/${taskId}/activities`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.activities;
}
