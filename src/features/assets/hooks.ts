import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { AssetFilters } from './api';

const KEY = ['assets'];

export function useAssets(filters: AssetFilters = {}) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => api.listAssets(filters) });
}

export function useAsset(id?: string) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => api.getAsset(id as string), enabled: !!id });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof api.updateAsset>[1] }) =>
      api.updateAsset(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAsset,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}
