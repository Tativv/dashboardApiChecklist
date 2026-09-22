import { http } from '@/lib/http';
import {
  ChecklistInstanceDetailDto,
  ChecklistInstanceListItemDto,
  ChecklistStatus,
  MyAssignedTaskItemDto,
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

export async function startInstance(id: string) {
  const { data } = await http.post(`/checklist-instances/${id}/start`);
  return data;
}

export async function finishInstance(id: string) {
  const { data } = await http.post(`/checklist-instances/${id}/finish`);
  return data;
}

export async function approveInstance(id: string) {
  const { data } = await http.post(`/checklist-instances/${id}/approve`);
  return data;
}

export async function reopenInstance(id: string, reason?: string) {
  const { data } = await http.post(`/checklist-instances/${id}/reopen`, { reason: reason ?? null });
  return data;
}

export async function completeTask(
  instanceId: string,
  taskExecutionId: string,
  input: { completed: boolean; comment?: string | null }
) {
  const { data } = await http.post(
    `/checklist-instances/${instanceId}/tasks/${taskExecutionId}/complete`,
    input
  );
  return data;
}

export async function assignTask(instanceId: string, taskExecutionId: string, userId: string | null) {
  const { data } = await http.post(
    `/checklist-instances/${instanceId}/tasks/${taskExecutionId}/assign`,
    { userId }
  );
  return data as { id: string; assignedUserId?: string | null; createdByUserId?: string | null };
}

export async function getMyAssignedTasks(date?: string): Promise<MyAssignedTaskItemDto[]> {
  const { data } = await http.get<MyAssignedTaskItemDto[]>('/checklist-instances/my-tasks', {
    params: date ? { date } : {}
  });
  return data;
}

export async function uploadEvidence(instanceId: string, taskExecutionId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post(
    `/checklist-instances/${instanceId}/tasks/${taskExecutionId}/evidence`,
    formData
  );
  return data as { id: string; fileName: string; contentType: string; fileSizeBytes: number; uploadedAt: string };
}

export async function fetchEvidenceBlobUrl(evidenceId: string): Promise<string> {
  const { data } = await http.get(`/checklist-instances/evidence/${evidenceId}`, { responseType: 'blob' });
  return URL.createObjectURL(data as Blob);
}
