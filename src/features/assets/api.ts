import { http } from '@/lib/http';
import { AssetDto } from '@/types/api';

export interface AssetFilters {
  areaId?: string;
  active?: boolean;
}

export async function listAssets(filters: AssetFilters = {}): Promise<AssetDto[]> {
  const { data } = await http.get<AssetDto[]>('/assets/', { params: filters });
  return data;
}

export async function getAsset(id: string): Promise<AssetDto> {
  const { data } = await http.get<AssetDto>(`/assets/${id}`);
  return data;
}

export async function createAsset(input: { name: string; type: string; areaId: string }): Promise<AssetDto> {
  const { data } = await http.post<AssetDto>('/assets/', input);
  return data;
}

export async function updateAsset(
  id: string,
  input: { name: string; type: string; areaId: string; active: boolean }
): Promise<AssetDto> {
  const { data } = await http.put<AssetDto>(`/assets/${id}`, input);
  return data;
}

export async function deleteAsset(id: string): Promise<void> {
  await http.delete(`/assets/${id}`);
}
