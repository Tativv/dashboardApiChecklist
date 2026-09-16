'use client';
import Link from 'next/link';
import { useAuthStore, isSupervisorOrAbove } from '@/features/auth/store';
import { useDashboardReport, useByAreaReport } from '@/features/reports/hooks';
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

  const dashboardQuery = useDashboardReport({}, canSeeReports);
  const byAreaQuery = useByAreaReport({}, canSeeReports);
  const todayInstances = useInstances({ fromDate: today, toDate: today });

  const report = dashboardQuery.data;
  const byArea = byAreaQuery.data ?? [];
  const list = todayInstances.data ?? [];

  return (
    <div className="page">
      <h1 className="page-title">Hola, {user?.name?.split(' ')[0] ?? ''}</h1>
      <p className="page-subtitle">Aquí está el estado operativo del hotel hoy.</p>

      {canSeeReports ? (
        <div className="kpis">
          <K label="Total" value={report ? String(report.total) : '—'} />
          <K label="Pendientes" value={report ? String(report.pending) : '—'} />
          <K
            label="Finalizados"
            value={report ? `${report.completed + report.approved}/${report.total}` : '—'}
            note={report ? `${report.completionRatePercent}% completado` : undefined}
          />
          <K label="Duración promedio" value={report ? formatDuration(report.averageDurationSeconds) : '—'} />
          <K label="Vencidos" value={report ? String(report.overdue) : '—'} />
        </div>
      ) : null}

      <div className="grid">
        {canSeeReports && (
          <section className="card">
            <h2 className="card-title">Checklists por área</h2>
            <p className="card-sub">Totales acumulados en el período</p>
            {byAreaQuery.isLoading && <p className="muted">Cargando…</p>}
            {byArea.map((a) => {
              const pct = a.total === 0 ? 0 : Math.round(((a.completed + a.approved) * 100) / a.total);
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
            {!byAreaQuery.isLoading && byArea.length === 0 && <div className="card empty">Sin datos aún.</div>}
          </section>
        )}
        <section className="card">
          <h2 className="card-title">Checklists de hoy</h2>
          <p className="card-sub">{list.length} programados para hoy</p>
          {todayInstances.isLoading && <p className="muted">Cargando…</p>}
          {list.slice(0, 8).map((x) => (
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
          {!todayInstances.isLoading && list.length === 0 && (
            <div className="card empty">No hay checklists programados para hoy.</div>
          )}
        </section>
      </div>
    </div>
  );
}
