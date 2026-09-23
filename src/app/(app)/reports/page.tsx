'use client';
import { useEffect, useState } from 'react';
import { useByDateReport, useByAreaReport } from '@/features/reports/hooks';
import { useAssets } from '@/features/assets/hooks';
import { useInstances, useInstance } from '@/features/checklist-instances/hooks';
import { useUsers } from '@/features/users/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { daysAgoIso, todayIso } from '@/lib/format';
import { generateByAreaReportPdf, generateByDateReportPdf, generateDailySummaryPdf } from '@/lib/pdf';

type ReportKey = 'by-date' | 'by-area' | 'daily-summary';

const reportCards: { key: ReportKey; title: string; description: string }[] = [
  { key: 'by-date', title: 'Por Data', description: 'Volume e cumprimento diário no período selecionado.' },
  { key: 'by-area', title: 'Por Área', description: 'Distribuição de checklists por área operacional.' },
  { key: 'daily-summary', title: 'Resumo Diário Operacional', description: 'Checklist completa de um turno, pronta para impressão.' }
];

function ByDatePanel() {
  const [fromDate, setFromDate] = useState(daysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso());
  const byDate = useByDateReport({ fromDate, toDate });
  const rows = byDate.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button
          type="button"
          className="btn btn-primary"
          disabled={byDate.isLoading || rows.length === 0}
          onClick={() => generateByDateReportPdf(rows, fromDate, toDate)}
        >
          Gerar PDF
        </button>
      </div>
      {byDate.isLoading && <p className="muted" style={{ marginTop: 10 }}>Carregando…</p>}
      {!byDate.isLoading && rows.length === 0 && (
        <p className="muted" style={{ marginTop: 10 }}>Sem dados para o período selecionado.</p>
      )}
    </div>
  );
}

function ByAreaPanel() {
  const [fromDate, setFromDate] = useState(daysAgoIso(30));
  const [toDate, setToDate] = useState(todayIso());
  const byArea = useByAreaReport({ fromDate, toDate });
  const rows = byArea.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button
          type="button"
          className="btn btn-primary"
          disabled={byArea.isLoading || rows.length === 0}
          onClick={() => generateByAreaReportPdf(rows, fromDate, toDate)}
        >
          Gerar PDF
        </button>
      </div>
      {byArea.isLoading && <p className="muted" style={{ marginTop: 10 }}>Carregando…</p>}
      {!byArea.isLoading && rows.length === 0 && (
        <p className="muted" style={{ marginTop: 10 }}>Sem dados para o período selecionado.</p>
      )}
    </div>
  );
}

function DailySummaryPanel() {
  const assets = useAssets({ active: true });
  const users = useUsers({});
  const [assetId, setAssetId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [instanceId, setInstanceId] = useState('');

  const matches = useInstances({ assetId, fromDate: date, toDate: date }, !!assetId && !!date);
  const instance = useInstance(instanceId || undefined);

  useEffect(() => {
    setInstanceId('');
  }, [assetId, date]);

  const matchList = matches.data ?? [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          <option value="">Selecione o ativo</option>
          {(assets.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {assetId && (
        <div style={{ marginTop: 10 }}>
          {matches.isLoading && <p className="muted">Buscando checklists…</p>}
          {!matches.isLoading && matchList.length === 0 && (
            <p className="muted">Nenhuma checklist encontrada para esse ativo e data.</p>
          )}
          {!matches.isLoading && matchList.length > 0 && (
            <select value={instanceId} onChange={(e) => setInstanceId(e.target.value)}>
              <option value="">Selecione a checklist</option>
              {matchList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.templateName} — {m.status}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!instanceId || !instance.data || !users.data}
          onClick={() => instance.data && users.data && generateDailySummaryPdf(instance.data, users.data)}
        >
          Gerar PDF
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [active, setActive] = useState<ReportKey | null>(null);

  return (
    <RequireRole roles={['Directoria', 'Supervisor', 'Gerencia']}>
      <div className="page">
        <div className="toolbar">
          <div>
            <h1 className="page-title">Relatórios</h1>
            <p className="page-subtitle">Selecione um relatório para gerar o PDF.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
          {reportCards.map((r) => (
            <button
              key={r.key}
              type="button"
              className="card"
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                border: active === r.key ? '2px solid #547bf7' : '1px solid var(--line)'
              }}
              onClick={() => setActive(active === r.key ? null : r.key)}
            >
              <h2 className="card-title">{r.title}</h2>
              <p className="card-sub" style={{ marginBottom: 0 }}>
                {r.description}
              </p>
            </button>
          ))}
        </div>

        {active && (
          <section className="card">
            <h2 className="card-title">{reportCards.find((r) => r.key === active)?.title}</h2>
            <div style={{ marginTop: 12 }}>
              {active === 'by-date' && <ByDatePanel />}
              {active === 'by-area' && <ByAreaPanel />}
              {active === 'daily-summary' && <DailySummaryPanel />}
            </div>
          </section>
        )}
      </div>
    </RequireRole>
  );
}
