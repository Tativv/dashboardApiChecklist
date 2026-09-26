import { http } from '@/lib/http';
import { LoginResponse } from '@/types/api';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await http.put('/users/me/password', input);
}
