import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const KEY = ['areas'];

export function useAreas() {
  return useQuery({ queryKey: KEY, queryFn: api.listAreas });
}

export function useArea(id?: string) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => api.getArea(id as string), enabled: !!id });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createArea,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string } }) => api.updateArea(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteArea,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}
