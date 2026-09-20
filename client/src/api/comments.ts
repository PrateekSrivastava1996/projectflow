import { apiClient } from "./client";

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export async function getTaskComments(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string
): Promise<TaskComment[]> {
  const response = await apiClient.get<{
    comments: TaskComment[];
  }>(`/api/projects/${projectId}/tasks/${taskId}/comments`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.comments;
}

export async function createTaskComment(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string,
  content: string
): Promise<TaskComment> {
  const response = await apiClient.post<{
    comment: TaskComment;
  }>(
    `/api/projects/${projectId}/tasks/${taskId}/comments`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-organization-id": organizationId,
      },
    }
  );

  return response.data.comment;
}

export async function updateTaskComment(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  content: string
): Promise<TaskComment> {
  const response = await apiClient.patch<{
    comment: TaskComment;
  }>(
    `/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-organization-id": organizationId,
      },
    }
  );

  return response.data.comment;
}

export async function deleteTaskComment(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string
): Promise<void> {
  await apiClient.delete(
    `/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-organization-id": organizationId,
      },
    }
  );
}
