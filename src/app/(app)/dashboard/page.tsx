'use client';
import Link from 'next/link';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import { useDashboardReport } from '@/features/reports/hooks';
import { useInstances } from '@/features/checklist-instances/hooks';
import { StatusBadge, isOverdue } from '@/components/ui/status-badge';
import { formatDuration, todayIso } from '@/lib/format';

function K({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-change">{note}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canSeeReports = isSupervisorOrAbove(user?.role);
  const today = todayIso();

  const dashboardQuery = useDashboardReport({ today }, canSeeReports);
  const todayInstances = useInstances({ fromDate: today, toDate: today });

  const report = dashboardQuery.data;
  const tasksDone = report ? report.tasksCompleted + report.tasksReviewed : 0;
  const tasksCompletionRatePercent = report && report.tasksTotal > 0 ? Math.round((tasksDone * 100) / report.tasksTotal) : 0;
  const list = todayInstances.data ?? [];

  return (
    <div className="page">
      <h1 className="page-title">Olá, {user?.name?.split(' ')[0] ?? ''}</h1>
      <p className="page-subtitle">Este é o status operacional do hotel hoje.</p>

      {canSeeReports ? (
        <div className="kpis">
          <K label="Tarefas" value={report ? String(report.tasksTotal) : '—'} />
          <K label="Pendentes" value={report ? String(report.tasksPending) : '—'} />
          <K label="Em andamento" value={report ? String(report.tasksInProgress) : '—'} />
          <K label="Concluídas" value={report ? String(report.tasksCompleted) : '—'} />
          <K label="Revisadas" value={report ? String(report.tasksReviewed) : '—'} />
          <K
            label="Taxa de conclusão"
            value={report ? `${tasksCompletionRatePercent}%` : '—'}
            note={report ? `${tasksDone}/${report.tasksTotal} concluídas` : undefined}
          />
          <K label="Duração média" value={report ? formatDuration(report.averageTaskDurationSeconds) : '—'} />
          <K label="Vencidas" value={report ? String(report.tasksOverdue) : '—'} />
        </div>
      ) : null}

      <div className="grid">
        <section className="card">
          <h2 className="card-title">Checklists de hoje</h2>
          <p className="card-sub">{list.length} programados para hoje</p>
          {todayInstances.isLoading && <p className="muted">Carregando…</p>}
          {list.length > 0 && (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {list.map((x) => (
                <div className="activity" key={x.id}>
                  <i className="activity-dot" />
                  <div style={{ flex: 1 }}>
                    <p>
                      <Link href={`/checklists/${x.id}`}>{x.templateName}</Link> · {x.assetName}
                    </p>
                    <small>
                      <StatusBadge status={x.status} overdue={isOverdue(x.status, x.date)} />
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!todayInstances.isLoading && list.length === 0 && (
            <div className="card empty">Nenhum checklist programado para hoje.</div>
          )}
        </section>
      </div>
    </div>
  );
}
