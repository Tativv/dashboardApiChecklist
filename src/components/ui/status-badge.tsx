import { ChecklistStatus, DayOfWeekName, ScheduleFrequencyType, TaskExecutionStatus } from '@/types/api';

const statusClass: Record<ChecklistStatus, string> = {
  Pending: 'pending',
  InProgress: 'progress',
  Completed: 'done',
  Approved: 'approved'
};

const statusLabel: Record<ChecklistStatus, string> = {
  Pending: 'Pendiente',
  InProgress: 'En progreso',
  Completed: 'Finalizado',
  Approved: 'Aprobado'
};

export function isOverdue(status: ChecklistStatus, date: string): boolean {
  if (status !== 'Pending' && status !== 'InProgress') return false;
  return date < new Date().toISOString().slice(0, 10);
}

export function StatusBadge({ status, overdue }: { status: ChecklistStatus; overdue?: boolean }) {
  if (overdue) {
    return <span className="status overdue">Vencido</span>;
  }
  return <span className={'status ' + statusClass[status]}>{statusLabel[status]}</span>;
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    Admin: 'Administrador',
    Supervisor: 'Supervisor',
    Operator: 'Operador',
    Manager: 'Gerente'
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
  Completed: 'done',
  Skipped: 'progress'
};

const taskExecutionStatusLabel: Record<TaskExecutionStatus, string> = {
  Pending: 'Pendente',
  Completed: 'Concluída',
  Skipped: 'Pulada'
};

export function TaskExecutionStatusBadge({ status }: { status: TaskExecutionStatus }) {
  return <span className={'status ' + taskExecutionStatusClass[status]}>{taskExecutionStatusLabel[status]}</span>;
}
