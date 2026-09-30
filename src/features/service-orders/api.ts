import { http } from '@/lib/http';
import { ServiceOrderCommentDto, ServiceOrderDto, ServiceOrderListItemDto, ServiceOrderPriority, ServiceOrderStatus } from '@/types/api';

export interface ServiceOrderFilters {
  areaId?: string;
  assetId?: string;
  status?: ServiceOrderStatus | 'Todos';
  priority?: ServiceOrderPriority | 'Todas';
  assignedUserId?: string;
}

export interface CreateServiceOrderInput {
  areaId: string;
  assetId: string;
  subject: string;
  description?: string | null;
  priority: ServiceOrderPriority;
  dueAtUtc: string;
}

export async function listServiceOrders(filters: ServiceOrderFilters = {}): Promise<ServiceOrderListItemDto[]> {
  const params = {
    ...filters,
    status: filters.status === 'Todos' ? undefined : filters.status,
    priority: filters.priority === 'Todas' ? undefined : filters.priority
  };
  const { data } = await http.get<ServiceOrderListItemDto[]>('/service-orders/', { params });
  return data;
}

export async function getServiceOrder(id: string): Promise<ServiceOrderDto> {
  const { data } = await http.get<ServiceOrderDto>(`/service-orders/${id}`);
  return data;
}

export async function createServiceOrder(input: CreateServiceOrderInput): Promise<ServiceOrderDto> {
  const { data } = await http.post<ServiceOrderDto>('/service-orders/', input);
  return data;
}

export async function updateServiceOrder(id: string, input: CreateServiceOrderInput): Promise<ServiceOrderDto> {
  const { data } = await http.put<ServiceOrderDto>(`/service-orders/${id}`, input);
  return data;
}

export async function assignServiceOrder(id: string, userId: string | null) {
  const { data } = await http.post(`/service-orders/${id}/assign`, { userId });
  return data as { id: string; assignedUserId?: string | null; assignedUserName?: string | null };
}

export async function startServiceOrder(id: string) {
  const { data } = await http.post(`/service-orders/${id}/start`);
  return data as { id: string; status: ServiceOrderStatus; startedAt?: string | null };
}

export async function finishServiceOrder(id: string) {
  const { data } = await http.post(`/service-orders/${id}/finish`);
  return data as { id: string; status: ServiceOrderStatus; completedAt?: string | null; durationSeconds?: number | null };
}

export async function deleteServiceOrder(id: string): Promise<void> {
  await http.delete(`/service-orders/${id}`);
}

export async function listServiceOrderComments(serviceOrderId: string): Promise<ServiceOrderCommentDto[]> {
  const { data } = await http.get<ServiceOrderCommentDto[]>(`/service-orders/${serviceOrderId}/comments`);
  return data;
}

export async function addServiceOrderComment(
  serviceOrderId: string,
  input: { text?: string | null; file?: File | null }
): Promise<ServiceOrderCommentDto> {
  const formData = new FormData();
  if (input.text) formData.append('text', input.text);
  if (input.file) formData.append('file', input.file);
  const { data } = await http.post<ServiceOrderCommentDto>(`/service-orders/${serviceOrderId}/comments`, formData);
  return data;
}

export async function fetchServiceOrderCommentFileBlobUrl(commentId: string): Promise<string> {
  const { data } = await http.get(`/service-orders/comments/${commentId}/file`, { responseType: 'blob' });
  return URL.createObjectURL(data as Blob);
}
