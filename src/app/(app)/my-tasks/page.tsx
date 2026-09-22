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
          <h1 className="page-title">Mis tareas</h1>
          <p className="page-subtitle">Las tareas que tienes asignadas para el día seleccionado.</p>
        </div>
        <input type="date" className="btn btn-secondary" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tarea</th>
              <th>Checklist / Activo</th>
              <th>Horario</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasksQuery.isLoading && (
              <tr>
                <td colSpan={5} className="muted">
                  Cargando…
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
                <td className="muted">{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Continua'}</td>
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
                  No tienes tareas asignadas para {formatDate(date)}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
