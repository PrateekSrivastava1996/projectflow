import { apiClient } from "./client";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  labels: TaskLabel[];
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export async function getTasks(
  accessToken: string,
  organizationId: string,
  projectId: string
): Promise<Task[]> {
  const response = await apiClient.get<{
    tasks: Task[];
  }>(`/api/projects/${projectId}/tasks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.tasks;
}

export async function updateTask(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string,
  data: {
    status?: TaskStatus;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
    labels?: {
      name: string;
      color: string;
    }[];
  }
): Promise<Task> {
  const response = await apiClient.patch<{
    task: Task;
  }>(`/api/projects/${projectId}/tasks/${taskId}`, data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.task;
}

export async function createTask(
  accessToken: string,
  organizationId: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    assigneeId?: string | null;
    dueDate?: string | null;
    labels?: {
      name: string;
      color: string;
    }[];
  }
): Promise<Task> {
  const response = await apiClient.post<{
    task: Task;
  }>(`/api/projects/${projectId}/tasks`, data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.task;
}

export async function deleteTask(
  accessToken: string,
  organizationId: string,
  projectId: string,
  taskId: string
): Promise<void> {
  await apiClient.delete(`/api/projects/${projectId}/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });
}
