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

      <div className="card-list">
        {tasks.map((t) => (
          <div className="list-card" key={t.taskExecutionId}>
            <div className="list-card-top">
              <span className="list-card-title">{t.taskName}</span>
              <TaskExecutionStatusBadge status={t.status} />
            </div>
            <div className="list-card-bottom">
              <div className="list-card-meta">
                <span>
                  {t.templateName} · {t.assetName}
                </span>
                <span>·</span>
                <span>{t.scheduledForUtc ? formatTime(t.scheduledForUtc) : 'Contínua'}</span>
              </div>
              <div className="task-actions">
                <Link href={`/checklists/${t.instanceId}`} className="btn btn-secondary btn-sm">
                  Ver checklist
                </Link>
              </div>
            </div>
          </div>
        ))}
        {tasksQuery.isLoading && <p className="muted">Carregando…</p>}
        {!tasksQuery.isLoading && tasks.length === 0 && (
          <div className="card empty">Você não tem tarefas designadas para {formatDate(date)}.</div>
        )}
      </div>
    </div>
  );
}
