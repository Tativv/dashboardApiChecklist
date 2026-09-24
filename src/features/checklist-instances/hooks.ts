import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { InstanceFilters } from './api';

const KEY = ['checklist-instances'];

export function useInstances(filters: InstanceFilters = {}, enabled = true) {
  return useQuery({ queryKey: [...KEY, filters], queryFn: () => api.listInstances(filters), enabled });
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

export function useGenerateScheduled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => api.generateScheduled(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useDeleteInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteInstance,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY })
  });
}

export function useUpcomingOccurrences(from: string, to: string) {
  return useQuery({
    queryKey: [...KEY, 'upcoming', from, to],
    queryFn: () => api.getUpcomingOccurrences(from, to)
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

export function useFinishInstance() {
  return useInstanceAction(api.finishInstance);
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

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskExecutionId }: { instanceId: string; taskExecutionId: string }) =>
      api.startTask(instanceId, taskExecutionId),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
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
      input: { comment?: string | null };
    }) => api.completeTask(instanceId, taskExecutionId, input),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    }
  });
}

export function useReviewTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskExecutionId }: { instanceId: string; taskExecutionId: string }) =>
      api.reviewTask(instanceId, taskExecutionId),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
      qc.invalidateQueries({ queryKey: KEY });
    }
  });
}

export function useRestartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskExecutionId }: { instanceId: string; taskExecutionId: string }) =>
      api.restartTask(instanceId, taskExecutionId),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    }
  });
}

export function useTaskComments(instanceId: string, taskExecutionId: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, instanceId, 'tasks', taskExecutionId, 'comments'],
    queryFn: () => api.listTaskComments(instanceId, taskExecutionId),
    enabled
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ instanceId, taskExecutionId, text }: { instanceId: string; taskExecutionId: string; text: string }) =>
      api.addTaskComment(instanceId, taskExecutionId, text),
    onSuccess: (_data, { instanceId, taskExecutionId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId, 'tasks', taskExecutionId, 'comments'] });
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
    }
  });
}

export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      instanceId,
      taskExecutionId,
      userId
    }: {
      instanceId: string;
      taskExecutionId: string;
      userId: string | null;
    }) => api.assignTask(instanceId, taskExecutionId, userId),
    onSuccess: (_data, { instanceId }) => {
      qc.invalidateQueries({ queryKey: [...KEY, instanceId] });
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['my-assigned-tasks'] });
    }
  });
}

export function useMyAssignedTasks(date?: string) {
  return useQuery({
    queryKey: ['my-assigned-tasks', date],
    queryFn: () => api.getMyAssignedTasks(date)
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
