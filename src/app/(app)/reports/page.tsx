'use client';
import { useState } from 'react';
import { useByDateReport, useByAreaReport } from '@/features/reports/hooks';
import { useAreas } from '@/features/areas/hooks';
import { useInstances } from '@/features/checklist-instances/hooks';
import { getInstance } from '@/features/checklist-instances/api';
import { useUsers } from '@/features/users/hooks';
import { RequireRole } from '@/components/ui/require-role';
import { ErrorBanner } from '@/components/ui/error-banner';
import { toApiError } from '@/lib/api-error';
import { daysAgoIso, todayIso } from '@/lib/format';
import { generateByAreaReportPdf, generateByDateReportPdf, generateFullDailySummaryPdf } from '@/lib/pdf';
import { ChecklistInstanceDetailDto } from '@/types/api';

type ReportKey = 'by-date' | 'by-area' | 'daily-summary';

const reportCards: { key: ReportKey; title: string; description: string }[] = [
  { key: 'by-date', title: 'Por Data', description: 'Volume e cumprimento diário no período selecionado.' },
  { key: 'by-area', title: 'Por Área', description: 'Distribuição de checklists por área operacional.' },
  {
    key: 'daily-summary',
    title: 'Resumo Diário Operacional',
    description: 'Todas as checklists do dia, agrupadas por área e template, prontas para impressão.'
  }
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
  const areas = useAreas();
  const users = useUsers({});
  const [areaId, setAreaId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useInstances({ areaId: areaId || undefined, fromDate: date, toDate: date }, !!date);
  const matchList = matches.data ?? [];

  async function onGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const detailPairs = await Promise.all(matchList.map(async (m) => [m.id, await getInstance(m.id)] as const));
      const details = new Map<string, ChecklistInstanceDetailDto>(detailPairs);
      const areaFilterLabel = areaId ? areas.data?.find((a) => a.id === areaId)?.name : undefined;
      generateFullDailySummaryPdf(matchList, details, areas.data ?? [], users.data ?? [], date, areaFilterLabel);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">Todas as áreas</option>
          {(areas.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button
          type="button"
          className="btn btn-primary"
          disabled={generating || matches.isLoading || matchList.length === 0}
          onClick={onGenerate}
        >
          {generating ? 'Gerando…' : 'Gerar PDF'}
        </button>
      </div>
      <ErrorBanner message={error} />
      {matches.isLoading && <p className="muted" style={{ marginTop: 10 }}>Buscando checklists…</p>}
      {!matches.isLoading && matchList.length === 0 && (
        <p className="muted" style={{ marginTop: 10 }}>Nenhuma checklist encontrada para o filtro selecionado.</p>
      )}
      {!matches.isLoading && matchList.length > 0 && (
        <p className="muted" style={{ marginTop: 10 }}>{matchList.length} checklist(s) encontrada(s) para o PDF.</p>
      )}
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
