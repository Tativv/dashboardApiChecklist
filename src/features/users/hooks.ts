import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { UserFilters } from './api';

const KEY = ['users'];

export function useUsers(filters: UserFilters = {}, enabled = true) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => api.listUsers(filters), enabled });
}

export function useUser(id?: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getUser(id as string),
    enabled: enabled && !!id,
    retry: false
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { name: string; role: string; areaIds: string[] } }) =>
      api.updateUser(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}
