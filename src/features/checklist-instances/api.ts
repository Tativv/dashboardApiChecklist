import { http } from '@/lib/http';
import {
  ChecklistInstanceDetailDto,
  ChecklistInstanceListItemDto,
  ChecklistStatus,
  MyAssignedTaskItemDto,
  TaskCommentDto,
  UpcomingOccurrenceDto
} from '@/types/api';

export interface InstanceFilters {
  fromDate?: string;
  toDate?: string;
  areaId?: string;
  assetId?: string;
  status?: ChecklistStatus | 'Todos';
}

export async function listInstances(filters: InstanceFilters = {}): Promise<ChecklistInstanceListItemDto[]> {
  const params = { ...filters, status: filters.status === 'Todos' ? undefined : filters.status };
  const { data } = await http.get<ChecklistInstanceListItemDto[]>('/checklist-instances/', { params });
  return data;
}

export async function getInstance(id: string): Promise<ChecklistInstanceDetailDto> {
  const { data } = await http.get<ChecklistInstanceDetailDto>(`/checklist-instances/${id}`);
  return data;
}

export async function createInstance(input: {
  templateId: string;
  assetId: string;
  date: string;
}): Promise<{ id: string }> {
  const { data } = await http.post('/checklist-instances/', input);
  return data;
}

export async function deleteInstance(id: string): Promise<void> {
  await http.delete(`/checklist-instances/${id}`);
}

export async function generateScheduled(date?: string): Promise<{ date: string; created: number; skipped: number }> {
  const { data } = await http.post('/checklist-instances/generate-scheduled', null, { params: date ? { date } : {} });
  return data;
}

export async function getUpcomingOccurrences(from: string, to: string): Promise<UpcomingOccurrenceDto[]> {
  const { data } = await http.get<UpcomingOccurrenceDto[]>('/checklist-instances/upcoming', { params: { from, to } });
  return data;
}

export async function finishInstance(id: string) {
  const { data } = await http.post(`/checklist-instances/${id}/finish`);
  return data;
}

export async function reopenInstance(id: string, reason?: string) {
  const { data } = await http.post(`/checklist-instances/${id}/reopen`, { reason: reason ?? null });
  return data;
}

export async function startTask(instanceId: string, taskExecutionId: string) {
  const { data } = await http.post(`/checklist-instances/${instanceId}/tasks/${taskExecutionId}/start`);
  return data;
}

export async function completeTask(instanceId: string, taskExecutionId: string, input: { comment?: string | null }) {
  const { data } = await http.post(
    `/checklist-instances/${instanceId}/tasks/${taskExecutionId}/complete`,
    input
  );
  return data;
}

export async function reviewTask(instanceId: string, taskExecutionId: string) {
  const { data } = await http.post(`/checklist-instances/${instanceId}/tasks/${taskExecutionId}/review`);
  return data;
}

export async function restartTask(instanceId: string, taskExecutionId: string) {
  const { data } = await http.post(`/checklist-instances/${instanceId}/tasks/${taskExecutionId}/restart`);
  return data;
}

export async function listTaskComments(instanceId: string, taskExecutionId: string): Promise<TaskCommentDto[]> {
  const { data } = await http.get<TaskCommentDto[]>(`/checklist-instances/${instanceId}/tasks/${taskExecutionId}/comments`);
  return data;
}

export async function addTaskComment(
  instanceId: string,
  taskExecutionId: string,
  input: { text?: string | null; file?: File | null }
): Promise<TaskCommentDto> {
  const formData = new FormData();
  if (input.text) formData.append('text', input.text);
  if (input.file) formData.append('file', input.file);
  const { data } = await http.post<TaskCommentDto>(
    `/checklist-instances/${instanceId}/tasks/${taskExecutionId}/comments`,
    formData
  );
  return data;
}

export async function fetchTaskCommentFileBlobUrl(commentId: string): Promise<string> {
  const { data } = await http.get(`/checklist-instances/comments/${commentId}/file`, { responseType: 'blob' });
  return URL.createObjectURL(data as Blob);
}

export async function assignTask(instanceId: string, taskExecutionId: string, userId: string | null) {
  const { data } = await http.post(`/checklist-instances/${instanceId}/tasks/${taskExecutionId}/assign`, { userId });
  return data as { id: string; assignedUserId?: string | null; createdByUserId?: string | null };
}

export async function getMyAssignedTasks(date?: string): Promise<MyAssignedTaskItemDto[]> {
  const { data } = await http.get<MyAssignedTaskItemDto[]>('/checklist-instances/my-tasks', {
    params: date ? { date } : {}
  });
  return data;
}

