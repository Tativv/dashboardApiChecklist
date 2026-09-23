import { http } from '@/lib/http';
import { CallDto, CallListItemDto, CallPriority, CallStatus } from '@/types/api';

export interface CallFilters {
  areaId?: string;
  status?: CallStatus | 'Todos';
  priority?: CallPriority | 'Todas';
  assignedUserId?: string;
}

export interface CreateCallInput {
  areaId: string;
  subject: string;
  description?: string | null;
  priority: CallPriority;
}

export async function listCalls(filters: CallFilters = {}): Promise<CallListItemDto[]> {
  const params = {
    ...filters,
    status: filters.status === 'Todos' ? undefined : filters.status,
    priority: filters.priority === 'Todas' ? undefined : filters.priority
  };
  const { data } = await http.get<CallListItemDto[]>('/calls/', { params });
  return data;
}

export async function getCall(id: string): Promise<CallDto> {
  const { data } = await http.get<CallDto>(`/calls/${id}`);
  return data;
}

export async function createCall(input: CreateCallInput): Promise<CallDto> {
  const { data } = await http.post<CallDto>('/calls/', input);
  return data;
}

export async function assignCall(id: string, userId: string | null) {
  const { data } = await http.post(`/calls/${id}/assign`, { userId });
  return data as { id: string; assignedUserId?: string | null; assignedUserName?: string | null };
}

export async function startCall(id: string) {
  const { data } = await http.post(`/calls/${id}/start`);
  return data as { id: string; status: CallStatus; startedAt?: string | null };
}

export async function finishCall(id: string) {
  const { data } = await http.post(`/calls/${id}/finish`);
  return data as { id: string; status: CallStatus; completedAt?: string | null; durationSeconds?: number | null };
}
