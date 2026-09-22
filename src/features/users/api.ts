import { http } from '@/lib/http';
import { UserDto } from '@/types/api';

export interface UserFilters {
  active?: boolean;
  role?: string;
}

export async function listUsers(filters: UserFilters = {}): Promise<UserDto[]> {
  const { data } = await http.get<UserDto[]>('/users/', { params: filters });
  return data;
}

export async function getUser(id: string): Promise<UserDto> {
  const { data } = await http.get<UserDto>(`/users/${id}`);
  return data;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  areaIds: string[];
}): Promise<UserDto> {
  const { data } = await http.post<UserDto>('/users/', input);
  return data;
}

export async function updateUser(
  id: string,
  input: { name: string; role: string; areaIds: string[] }
): Promise<UserDto> {
  const { data } = await http.put<UserDto>(`/users/${id}`, input);
  return data;
}

export async function deactivateUser(id: string): Promise<void> {
  await http.post(`/users/${id}/deactivate`);
}
