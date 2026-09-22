export type UserRole = 'Directoria' | 'Supervisor' | 'Colaborador' | 'Gerencia';
export type ChecklistStatus = 'Pending' | 'InProgress' | 'Completed' | 'Approved';
export type DayOfWeekName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type ScheduleFrequencyType = 'Daily' | 'Weekly' | 'Monthly';
export type TaskExecutionMode = 'Scheduled' | 'Continuous';
export type TaskExecutionStatus = 'Pending' | 'Completed' | 'Skipped';

export interface ScheduleInput {
  frequencyType: ScheduleFrequencyType;
  intervalValue: number;
  weekDay?: DayOfWeekName | null;
  dayOfMonth?: number | null;
  timeOfDay: string;
  executionOrder: number;
}

export interface ScheduleDto extends ScheduleInput {
  id: string;
  active: boolean;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  areaIds: string[];
}

export interface AreaDto {
  id: string;
  name: string;
}

export interface AssetDto {
  id: string;
  name: string;
  type: string;
  areaId: string;
  active: boolean;
}

export interface ChecklistTaskDto {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  executionMode: TaskExecutionMode;
  schedules: ScheduleDto[];
}

export interface ChecklistTaskInput {
  name: string;
  description?: string | null;
  order: number;
  executionMode: TaskExecutionMode;
  schedules: ScheduleInput[];
}

export interface ChecklistTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  areaId: string;
  estimatedDurationMinutes: number;
  schedules: ScheduleDto[];
  tasks: ChecklistTaskDto[];
  assetIds: string[];
}

export interface ChecklistTemplateListItemDto {
  id: string;
  name: string;
  areaId: string;
  estimatedDurationMinutes: number;
  scheduleCount: number;
  taskCount: number;
  assetCount: number;
}

export interface ChecklistTaskExecutionDto {
  id: string;
  taskId: string;
  taskName: string;
  order: number;
  status: TaskExecutionStatus;
  scheduledForUtc?: string | null;
  executedAtUtc?: string | null;
  comment?: string | null;
  assignedUserId?: string | null;
  createdByUserId?: string | null;
  executedByUserId?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  evidenceCount: number;
}

export interface UpcomingOccurrenceDto {
  templateId: string;
  templateName: string;
  assetId: string;
  assetName: string;
  date: string;
  scheduledTime: string;
  alreadyGenerated: boolean;
}

export interface ChecklistInstanceDetailDto {
  id: string;
  templateId: string;
  templateName: string;
  assetId: string;
  assetName: string;
  date: string;
  status: ChecklistStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  durationSeconds?: number | null;
  taskExecutions: ChecklistTaskExecutionDto[];
}

export interface ChecklistInstanceListItemDto {
  id: string;
  templateName: string;
  assetId: string;
  assetName: string;
  areaId: string;
  date: string;
  status: ChecklistStatus;
  durationSeconds?: number | null;
}

export interface MyAssignedTaskItemDto {
  instanceId: string;
  templateName: string;
  assetId: string;
  assetName: string;
  date: string;
  taskExecutionId: string;
  taskName: string;
  scheduledForUtc?: string | null;
  status: TaskExecutionStatus;
}

export interface DashboardReportDto {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  approved: number;
  overdue: number;
  averageDurationSeconds?: number | null;
  completionRatePercent: number;
}

export interface ByDateReportItemDto {
  date: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  approved: number;
  averageDurationSeconds?: number | null;
}

export interface ByAreaReportItemDto {
  areaId: string;
  areaName: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  approved: number;
  averageDurationSeconds?: number | null;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}
