import { http } from '@/lib/http';
import { LoginResponse } from '@/types/api';

export async function login(name: string, password: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', { name, password });
  return data;
}
