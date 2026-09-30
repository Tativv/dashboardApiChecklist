import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { ServiceOrderFilters } from './api';

const KEY = ['service-orders'];

export function useServiceOrders(filters: ServiceOrderFilters = {}) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => api.listServiceOrders(filters) });
}

export function useServiceOrder(id?: string) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => api.getServiceOrder(id as string), enabled: !!id });
}

export function useCreateServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createServiceOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useAssignServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) => api.assignServiceOrder(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useStartServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.startServiceOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useFinishServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.finishServiceOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useDeleteServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteServiceOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useServiceOrderComments(serviceOrderId: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, serviceOrderId, 'comments'],
    queryFn: () => api.listServiceOrderComments(serviceOrderId),
    enabled
  });
}

export function useAddServiceOrderComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceOrderId, text, file }: { serviceOrderId: string; text?: string | null; file?: File | null }) =>
      api.addServiceOrderComment(serviceOrderId, { text, file }),
    onSuccess: (_data, { serviceOrderId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, serviceOrderId, 'comments'] });
      qc.invalidateQueries({ queryKey: [...KEY, serviceOrderId] });
      qc.invalidateQueries({ queryKey: KEY });
    }
  });
}
