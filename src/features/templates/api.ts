import { http } from '@/lib/http';
import { ChecklistTaskInput, ChecklistTemplateDto, ChecklistTemplateListItemDto } from '@/types/api';

export interface TemplateInput {
  name: string;
  description?: string | null;
  areaId: string;
  recurrenceType: string;
  estimatedDurationMinutes: number;
  tasks: ChecklistTaskInput[];
}

export interface ApplyToAssetsInput {
  assetIds: string[];
  date?: string | null;
  assignedUserId?: string | null;
}

export interface ApplyToAssetsResult {
  created: number;
  skipped: number;
  createdInstanceIds: string[];
}

export async function listTemplates(areaId?: string): Promise<ChecklistTemplateListItemDto[]> {
  const { data } = await http.get<ChecklistTemplateListItemDto[]>('/checklist-templates/', {
    params: areaId ? { areaId } : {}
  });
  return data;
}

export async function getTemplate(id: string): Promise<ChecklistTemplateDto> {
  const { data } = await http.get<ChecklistTemplateDto>(`/checklist-templates/${id}`);
  return data;
}

export async function createTemplate(input: TemplateInput): Promise<ChecklistTemplateDto> {
  const { data } = await http.post<ChecklistTemplateDto>('/checklist-templates/', input);
  return data;
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<ChecklistTemplateDto> {
  const { data } = await http.put<ChecklistTemplateDto>(`/checklist-templates/${id}`, input);
  return data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await http.delete(`/checklist-templates/${id}`);
}

export async function applyTemplateToAssets(id: string, input: ApplyToAssetsInput): Promise<ApplyToAssetsResult> {
  const { data } = await http.post<ApplyToAssetsResult>(`/checklist-templates/${id}/apply-to-assets`, input);
  return data;
}
