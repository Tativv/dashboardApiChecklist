'use client';
import Link from 'next/link';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import { useDashboardReport, useByDateReport, useByAreaReport } from '@/features/reports/hooks';
import { useInstances, useMyAssignedTasks } from '@/features/checklist-instances/hooks';
import { StatusBadge, TaskExecutionStatusBadge, isOverdue } from '@/components/ui/status-badge';
import { formatDuration, formatTime, todayIso, daysAgoIso } from '@/lib/format';
import { ByDateReportItemDto } from '@/types/api';

function K({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-change">{note}</div>}
    </div>
  );
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function TrendChart({ items }: { items: ByDateReportItemDto[] }) {
  const max = Math.max(1, ...items.map((i) => i.tasksTotal));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, marginTop: 6 }}>
        {items.map((i) => {
          const done = i.tasksCompleted + i.tasksReviewed;
          return (
            <div key={i.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <div
                title={`${done}/${i.tasksTotal} tarefas concluídas`}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 90,
                  background: '#edf0f5',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(i.tasksTotal / max) * 100}%`, background: '#dbe3fb' }}
                />
                <div
                  style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(done / max) * 100}%`, background: 'var(--blue)' }}
                />
              </div>
              <span className="muted" style={{ fontSize: 10 }}>
                {shortDay(i.date)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--blue)', display: 'inline-block' }} /> Concluídas
        </span>
        <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i style={{ width: 10, height: 10, borderRadius: 3, background: '#dbe3fb', display: 'inline-block' }} /> Total
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canSeeReports = isSupervisorOrAbove(user?.role);
  const today = todayIso();

  const dashboardQuery = useDashboardReport({ today }, canSeeReports);
  const trendQuery = useByDateReport({ fromDate: daysAgoIso(13), toDate: today }, canSeeReports);
  const areaQuery = useByAreaReport({ fromDate: daysAgoIso(6), toDate: today }, canSeeReports);
  const todayInstances = useInstances({ fromDate: today, toDate: today });
  const myTasksQuery = useMyAssignedTasks(today);

  const report = dashboardQuery.data;
  const tasksDone = report ? report.tasksCompleted + report.tasksReviewed : 0;
  const tasksCompletionRatePercent = report && report.tasksTotal > 0 ? Math.round((tasksDone * 100) / report.tasksTotal) : 0;
  const list = todayInstances.data ?? [];
  const myTasks = myTasksQuery.data ?? [];
  const trend = trendQuery.data ?? [];

  const areas = [...(areaQuery.data ?? [])]
    .filter((a) => a.tasksTotal > 0)
    .sort((a, b) => {
      const rateA = (a.tasksCompleted + a.tasksReviewed) / a.tasksTotal;
      const rateB = (b.tasksCompleted + b.tasksReviewed) / b.tasksTotal;
      return rateA - rateB;
    });

  return (
    <div className="page">
      <h1 className="page-title">Olá, {user?.name?.split(' ')[0] ?? ''}</h1>
      <p className="page-subtitle">Este é o status operacional do hotel hoje.</p>

      {canSeeReports && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <K label="Tarefas hoje" value={report ? String(report.tasksTotal) : '—'} />
            <K
              label="Taxa de conclusão"
              value={report ? `${tasksCompletionRatePercent}%` : '—'}
              note={report ? `${tasksDone}/${report.tasksTotal} concluídas` : undefined}
            />
            <K label="Duração média" value={report ? formatDuration(report.averageTaskDurationSeconds) : '—'} />
            <K label="Vencidas" value={report ? String(report.tasksOverdue) : '—'} />
          </div>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: -9 }}>
            <K label="Pendentes" value={report ? String(report.tasksPending) : '—'} />
            <K label="Em andamento" value={report ? String(report.tasksInProgress) : '—'} />
            <K label="Concluídas" value={report ? String(report.tasksCompleted) : '—'} />
            <K label="Revisadas" value={report ? String(report.tasksReviewed) : '—'} />
          </div>

          <div className="grid" style={{ marginTop: 5 }}>
            <section className="card">
              <h2 className="card-title">Tendência de tarefas</h2>
              <p className="card-sub">Últimos 14 dias</p>
              {trendQuery.isLoading && <p className="muted">Carregando…</p>}
              {!trendQuery.isLoading && trend.length > 0 && <TrendChart items={trend} />}
              {!trendQuery.isLoading && trend.length === 0 && <div className="card empty">Ainda sem dados.</div>}
            </section>
            <section className="card">
              <h2 className="card-title">Por área</h2>
              <p className="card-sub">Conclusão de tarefas nos últimos 7 dias</p>
              {areaQuery.isLoading && <p className="muted">Carregando…</p>}
              {!areaQuery.isLoading &&
                areas.map((a) => {
                  const done = a.tasksCompleted + a.tasksReviewed;
                  const pct = a.tasksTotal === 0 ? 0 : Math.round((done * 100) / a.tasksTotal);
                  return (
                    <div className="bar-row" key={a.areaId}>
                      <span>{a.areaName}</span>
                      <div className="bar">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                      <b>{pct}%</b>
                    </div>
                  );
                })}
              {!areaQuery.isLoading && areas.length === 0 && <div className="card empty">Ainda sem dados.</div>}
            </section>
          </div>
        </>
      )}

      <div className="grid" style={{ marginTop: canSeeReports ? 20 : 0 }}>
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

        <section className="card">
          <h2 className="card-title">Minhas tarefas de hoje</h2>
          <p className="card-sub">{myTasks.length} designadas a você</p>
          {myTasksQuery.isLoading && <p className="muted">Carregando…</p>}
          {myTasks.length > 0 && (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {myTasks.map((t) => (
                <div className="activity" key={t.taskExecutionId}>
                  <i className="activity-dot" />
                  <div style={{ flex: 1 }}>
                    <p>
                      <Link href={`/checklists/${t.instanceId}`}>{t.taskName}</Link> · {t.templateName}
                    </p>
                    <small>
                      <TaskExecutionStatusBadge status={t.status} />
                      {t.scheduledForUtc && <span className="muted"> · {formatTime(t.scheduledForUtc)}</span>}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!myTasksQuery.isLoading && myTasks.length === 0 && (
            <div className="card empty">Nenhuma tarefa designada a você hoje.</div>
          )}
        </section>
      </div>
    </div>
  );
}
