import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { InstanceFilters } from './api';

const KEY = ['checklist-instances'];

export function useInstances(filters: InstanceFilters = {}) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => api.listInstances(filters) });
}

export function useInstance(id?: string) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.getInstance(id as string),
    enabled: !!id
  });
}

export function useCreateInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createInstance,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useGenerateDaily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => api.generateDaily(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

function useInstanceAction(fn: (id: string) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    }
  });
}

export function useStartInstance() {
  return useInstanceAction(api.startInstance);
}

export function useFinishInstance() {
  return useInstanceAction(api.finishInstance);
}

export function useApproveInstance() {
  return useInstanceAction(api.approveInstance);
}

export function useReopenInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.reopenInstance(id, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    }
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instanceId,
      taskExecutionId,
      input
    }: {
      instanceId: string;
      taskExecutionId: string;
      input: { completed: boolean; comment?: string | null };
    }) => api.completeTask(instanceId, taskExecutionId, input),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
      qc.invalidateQueries({ queryKey: KEY });
    }
  });
}

export function useUploadEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instanceId,
      taskExecutionId,
      file
    }: {
      instanceId: string;
      taskExecutionId: string;
      file: File;
    }) => api.uploadEvidence(instanceId, taskExecutionId, file),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
    }
  });
}
