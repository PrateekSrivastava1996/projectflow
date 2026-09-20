import { apiClient } from "./client";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export async function getProjects(
  accessToken: string,
  organizationId: string
): Promise<Project[]> {
  const response = await apiClient.get<{
    projects: Project[];
  }>("/api/projects", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.projects;
}

export async function createProject(
  accessToken: string,
  organizationId: string,
  data: {
    name: string;
    description?: string;
  }
): Promise<Project> {
  const response = await apiClient.post<{
    project: Project;
  }>("/api/projects", data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.project;
}

export async function getProject(
  accessToken: string,
  organizationId: string,
  projectId: string
): Promise<Project> {
  const response = await apiClient.get<{
    project: Project;
  }>(`/api/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.project;
}