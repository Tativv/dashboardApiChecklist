import { ChecklistStatus } from '@/types/api';

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

export function recurrenceLabel(recurrence: string): string {
  const labels: Record<string, string> = {
    Daily: 'Diaria',
    Weekly: 'Semanal',
    Monthly: 'Mensual',
    Custom: 'Personalizada'
  };
  return labels[recurrence] ?? recurrence;
}
