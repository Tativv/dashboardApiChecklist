import { http } from '@/lib/http';
import {
  ChecklistTaskInput,
  ChecklistTemplateDto,
  ChecklistTemplateListItemDto,
  CustomRecurrenceMode,
  DayOfWeekName,
  RecurrenceIntervalUnit
} from '@/types/api';

export interface TemplateInput {
  name: string;
  description?: string | null;
  areaId: string;
  recurrenceType: string;
  estimatedDurationMinutes: number;
  scheduledTime: string;
  recurrenceStartDate?: string | null;
  customRecurrenceMode?: CustomRecurrenceMode | null;
  recurrenceIntervalValue?: number | null;
  recurrenceIntervalUnit?: RecurrenceIntervalUnit | null;
  recurrenceDaysOfWeek?: DayOfWeekName[] | null;
  tasks: ChecklistTaskInput[];
}

export interface ConfigureAssetsInput {
  assetIds: string[];
}

export interface ConfigureAssetsResult {
  assetCount: number;
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

export async function configureTemplateAssets(id: string, input: ConfigureAssetsInput): Promise<ConfigureAssetsResult> {
  const { data } = await http.put<ConfigureAssetsResult>(`/checklist-templates/${id}/assets`, input);
  return data;
}
