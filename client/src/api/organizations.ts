import { apiClient } from "./client";

export interface OrganizationUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface OrganizationMembership {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: OrganizationUser;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  memberships: OrganizationMembership[];
}

export async function getCurrentOrganization(
  accessToken: string,
  organizationId: string
) {
  const response = await apiClient.get<{
    organization: Organization;
  }>("/api/organizations/current", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.organization;
}

export async function getOrganizationMembers(
  accessToken: string,
  organizationId: string
): Promise<OrganizationMembership[]> {
  const response = await apiClient.get<{
    members: OrganizationMembership[];
  }>("/api/organizations/members", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-organization-id": organizationId,
    },
  });

  return response.data.members;
}
