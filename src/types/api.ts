export type UserRole = 'Admin' | 'Supervisor' | 'Operator' | 'Manager';
export type ChecklistStatus = 'Pending' | 'InProgress' | 'Completed' | 'Approved';
export type RecurrenceType = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type CustomRecurrenceMode = 'Interval' | 'DaysOfWeek';
export type RecurrenceIntervalUnit = 'Days' | 'Weeks' | 'Months';
export type DayOfWeekName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
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
}

export interface ChecklistTaskInput {
  name: string;
  description?: string | null;
  order: number;
}

export interface ChecklistTemplateDto {
  id: string;
  name: string;
  description?: string | null;
  areaId: string;
  recurrenceType: RecurrenceType;
  estimatedDurationMinutes: number;
  scheduledTime: string;
  recurrenceStartDate: string;
  customRecurrenceMode?: CustomRecurrenceMode | null;
  recurrenceIntervalValue?: number | null;
  recurrenceIntervalUnit?: RecurrenceIntervalUnit | null;
  recurrenceDaysOfWeek: DayOfWeekName[];
  tasks: ChecklistTaskDto[];
  assetIds: string[];
}

export interface ChecklistTemplateListItemDto {
  id: string;
  name: string;
  areaId: string;
  recurrenceType: RecurrenceType;
  estimatedDurationMinutes: number;
  scheduledTime: string;
  taskCount: number;
  assetCount: number;
}

export interface ChecklistTaskExecutionDto {
  id: string;
  taskId: string;
  taskName: string;
  order: number;
  completed: boolean;
  completedAt?: string | null;
  comment?: string | null;
  evidenceCount: number;
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
  assignedUserId?: string | null;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
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
  assignedUserId?: string | null;
  durationSeconds?: number | null;
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
