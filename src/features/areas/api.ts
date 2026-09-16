import { http } from '@/lib/http';
import { AreaDto } from '@/types/api';

export async function listAreas(): Promise<AreaDto[]> {
  const { data } = await http.get<AreaDto[]>('/areas/');
  return data;
}

export async function getArea(id: string): Promise<AreaDto> {
  const { data } = await http.get<AreaDto>(`/areas/${id}`);
  return data;
}

export async function createArea(input: { name: string }): Promise<AreaDto> {
  const { data } = await http.post<AreaDto>('/areas/', input);
  return data;
}

export async function updateArea(id: string, input: { name: string }): Promise<AreaDto> {
  const { data } = await http.put<AreaDto>(`/areas/${id}`, input);
  return data;
}

export async function deleteArea(id: string): Promise<void> {
  await http.delete(`/areas/${id}`);
}
