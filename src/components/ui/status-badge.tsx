import { ChecklistStatus, DayOfWeekName, ScheduleFrequencyType, TaskExecutionStatus } from '@/types/api';
import { todayIso } from '@/lib/format';

const statusClass: Record<ChecklistStatus, string> = {
  Pending: 'pending',
  InProgress: 'progress',
  Completed: 'approved'
};

export const statusLabel: Record<ChecklistStatus, string> = {
  Pending: 'Pendente',
  InProgress: 'Em andamento',
  Completed: 'Concluído'
};

export function isOverdue(status: ChecklistStatus, date: string): boolean {
  if (status !== 'Pending' && status !== 'InProgress') return false;
  return date < todayIso();
}

export function StatusBadge({ status, overdue }: { status: ChecklistStatus; overdue?: boolean }) {
  if (overdue) {
    return <span className="status overdue">Vencido</span>;
  }
  return <span className={'status ' + statusClass[status]}>{statusLabel[status]}</span>;
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    Directoria: 'Diretoria',
    Supervisor: 'Supervisor',
    Colaborador: 'Colaborador',
    Gerencia: 'Gerência'
  };
  return labels[role] ?? role;
}

export function frequencyTypeLabel(frequencyType: ScheduleFrequencyType | string): string {
  const labels: Record<string, string> = {
    Daily: 'Diária',
    Weekly: 'Semanal',
    Monthly: 'Mensal'
  };
  return labels[frequencyType] ?? frequencyType;
}

export function weekDayLabel(weekDay: DayOfWeekName | string): string {
  const labels: Record<string, string> = {
    Sunday: 'Domingo',
    Monday: 'Segunda',
    Tuesday: 'Terça',
    Wednesday: 'Quarta',
    Thursday: 'Quinta',
    Friday: 'Sexta',
    Saturday: 'Sábado'
  };
  return labels[weekDay] ?? weekDay;
}

const taskExecutionStatusClass: Record<TaskExecutionStatus, string> = {
  Pending: 'pending',
  InProgress: 'progress',
  Completed: 'done',
  Reviewed: 'approved'
};

export const taskExecutionStatusLabel: Record<TaskExecutionStatus, string> = {
  Pending: 'Pendente',
  InProgress: 'Em andamento',
  Completed: 'Concluída',
  Reviewed: 'Revisada'
};

export function TaskExecutionStatusBadge({ status }: { status: TaskExecutionStatus }) {
  return <span className={'status ' + taskExecutionStatusClass[status]}>{taskExecutionStatusLabel[status]}</span>;
}
