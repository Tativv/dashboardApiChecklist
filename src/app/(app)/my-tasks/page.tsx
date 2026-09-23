'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMyAssignedTasks } from '@/features/checklist-instances/hooks';
import { TaskExecutionStatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatTime, todayIso } from '@/lib/format';

export default function MyTasksPage() {
  const [date, setDate] = useState(todayIso());
  const tasksQuery = useMyAssignedTasks(date);
  const tasks = tasksQuery.data ?? [];

  return (
    <div className="page">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Minhas tarefas</h1>
          <p className="page-subtitle">As tarefas designadas a você no dia selecionado.</p>
        </div>
        <input type="date" className="btn btn-secondary" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tarefa</th>
              <th>Checklist / Ativo</th>
              <th>Horário</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasksQuery.isLoading && (
              <tr>
                <td colSpan={5} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={t.taskExecutionId}>
                <td>
                  <b>{t.taskName}</b>
                </td>
                <td>
                  {t.templateName} · {t.assetName}
                </td>
                <td className="muted">{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua'}</td>
                <td>
                  <TaskExecutionStatusBadge status={t.status} />
                </td>
                <td className="actions">
                  <Link href={`/checklists/${t.instanceId}`}>Ver checklist</Link>
                </td>
              </tr>
            ))}
            {!tasksQuery.isLoading && tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Você não tem tarefas designadas para {formatDate(date)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
