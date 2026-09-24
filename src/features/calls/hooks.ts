import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { CallFilters } from './api';

const KEY = ['calls'];

export function useCalls(filters: CallFilters = {}) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => api.listCalls(filters) });
}

export function useCall(id?: string) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => api.getCall(id as string), enabled: !!id });
}

export function useCreateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createCall,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useAssignCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) => api.assignCall(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useStartCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.startCall,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useFinishCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.finishCall,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useCallComments(callId: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, callId, 'comments'],
    queryFn: () => api.listCallComments(callId),
    enabled
  });
}

export function useAddCallComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, text, file }: { callId: string; text?: string | null; file?: File | null }) =>
      api.addCallComment(callId, { text, file }),
    onSuccess: (_data, { callId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, callId, 'comments'] });
      qc.invalidateQueries({ queryKey: [...KEY, callId] });
      qc.invalidateQueries({ queryKey: KEY });
    }
  });
}
