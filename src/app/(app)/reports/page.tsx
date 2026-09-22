'use client';
import { useState } from 'react';
import { useByDateReport, useByAreaReport } from '@/features/reports/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { formatDate, formatDuration, daysAgoIso, todayIso } from '@/lib/format';

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(daysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso());
  const byDate = useByDateReport({ fromDate, toDate });
  const byArea = useByAreaReport({ fromDate, toDate });

  return (
    <RequireRole roles={['Directoria', 'Supervisor', 'Gerencia']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Reportes</h1>
            <p className="page-subtitle">Desempeño operativo por fecha y por área.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="date" className="btn btn-secondary" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="btn btn-secondary" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <div className="grid">
          <section className="card">
            <h2 className="card-title">Por fecha</h2>
            <p className="card-sub">Volumen y cumplimiento diario</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Pendiente</th>
                    <th>En progreso</th>
                    <th>Finalizado</th>
                    <th>Aprobado</th>
                    <th>Duración prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {(byDate.data ?? []).map((r) => (
                    <tr key={r.date}>
                      <td>{formatDate(r.date)}</td>
                      <td>{r.total}</td>
                      <td>{r.pending}</td>
                      <td>{r.inProgress}</td>
                      <td>{r.completed}</td>
                      <td>{r.approved}</td>
                      <td>{formatDuration(r.averageDurationSeconds)}</td>
                    </tr>
                  ))}
                  {byDate.isLoading && (
                    <tr>
                      <td colSpan={7} className="muted">
                        Cargando…
                      </td>
                    </tr>
                  )}
                  {!byDate.isLoading && (byDate.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">
                        Sin datos para el período seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Por área</h2>
            <p className="card-sub">Distribución por área operativa</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th>Total</th>
                    <th>Finalizado</th>
                    <th>Aprobado</th>
                    <th>Duración prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {(byArea.data ?? []).map((r) => (
                    <tr key={r.areaId}>
                      <td>{r.areaName}</td>
                      <td>{r.total}</td>
                      <td>{r.completed}</td>
                      <td>{r.approved}</td>
                      <td>{formatDuration(r.averageDurationSeconds)}</td>
                    </tr>
                  ))}
                  {byArea.isLoading && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Cargando…
                      </td>
                    </tr>
                  )}
                  {!byArea.isLoading && (byArea.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Sin datos para el período seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </RequireRole>
  );
}
