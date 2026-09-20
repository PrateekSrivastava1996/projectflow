import { apiClient } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  organizations: {
    id: string;
    name: string;
    slug: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
  }[];
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/api/auth/login", data);
console.log(response, ':::data');

  return response.data;
}
