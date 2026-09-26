'use client';
import { useState } from 'react';
import { useAreas } from '@/features/areas/hooks';
import { getDashboardReport, getByDateReport, getByAreaReport } from '@/features/reports/api';
import { listCalls } from '@/features/calls/api';
import { listUsers } from '@/features/users/api';
import { buildControlCenterData } from '@/features/control-center/mock';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PdfPreviewModal } from '@/components/pdf-preview-modal';
import { toApiError } from '@/lib/api-error';
import { todayIso, daysAgoIso } from '@/lib/format';
import {
  buildOperacionalGeralReportPdf,
  buildByDateReportPdf,
  buildByAreaReportPdf,
  buildServiceOrdersReportPdf,
  buildCallsReportPdf,
  buildProdutividadeReportPdf,
  GeneratedPdf
} from '@/lib/pdf';

type ReportTypeKey = 'operacional-geral' | 'checklists' | 'ordens-servico' | 'chamados' | 'desempenho-area' | 'produtividade';
type PeriodKey = 'today' | '7d' | '15d' | 'month' | 'custom';

const REPORT_TYPES: { key: ReportTypeKey; label: string; description: string }[] = [
  { key: 'operacional-geral', label: 'Operacional Geral', description: 'Visão consolidada da operação no período.' },
  { key: 'checklists', label: 'Checklists', description: 'Volume e cumprimento de checklists por dia.' },
  { key: 'ordens-servico', label: 'Ordens de Serviço', description: 'Ordens atrasadas e em execução.' },
  { key: 'chamados', label: 'Chamados', description: 'Chamados por prioridade, área e responsável.' },
  { key: 'desempenho-area', label: 'Desempenho por Área', description: 'Cumprimento de checklists por área.' },
  { key: 'produtividade', label: 'Produtividade de Colaboradores', description: 'Indicadores de desempenho da equipe.' }
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '15d', label: 'Últimos 15 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'custom', label: 'Personalizado' }
];

function firstDayOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function DiretoriaReports() {
  const areasQuery = useAreas();
  const [reportType, setReportType] = useState<ReportTypeKey | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeneratedPdf | null>(null);

  function resolveRange(): { fromDate: string; toDate: string } {
    if (period === 'today') return { fromDate: todayIso(), toDate: todayIso() };
    if (period === '7d') return { fromDate: daysAgoIso(6), toDate: todayIso() };
    if (period === '15d') return { fromDate: daysAgoIso(14), toDate: todayIso() };
    if (period === 'month') return { fromDate: firstDayOfMonthIso(), toDate: todayIso() };
    return { fromDate: customFrom, toDate: customTo };
  }

  const canVisualize = reportType !== null && (period !== 'custom' || (!!customFrom && !!customTo && customFrom <= customTo));

  async function onVisualizar() {
    if (!reportType) return;
    setError(null);
    setLoading(true);
    try {
      const { fromDate, toDate } = resolveRange();
      let pdf: GeneratedPdf | null = null;

      if (reportType === 'operacional-geral') {
        const report = await getDashboardReport({ fromDate, toDate });
        pdf = buildOperacionalGeralReportPdf(report, fromDate, toDate);
      } else if (reportType === 'checklists') {
        const rows = await getByDateReport({ fromDate, toDate });
        pdf = buildByDateReportPdf(rows, fromDate, toDate);
      } else if (reportType === 'desempenho-area') {
        const rows = await getByAreaReport({ fromDate, toDate });
        pdf = buildByAreaReportPdf(rows, fromDate, toDate);
      } else if (reportType === 'chamados') {
        const calls = await listCalls({});
        const filtered = calls.filter((c) => {
          const day = c.createdAtUtc.slice(0, 10);
          return day >= fromDate && day <= toDate;
        });
        pdf = buildCallsReportPdf(filtered, fromDate, toDate);
      } else if (reportType === 'ordens-servico') {
        const data = buildControlCenterData(areasQuery.data ?? []);
        pdf = buildServiceOrdersReportPdf(data.serviceOrders, fromDate, toDate);
      } else if (reportType === 'produtividade') {
        const users = await listUsers({ active: true });
        pdf = buildProdutividadeReportPdf(users, fromDate, toDate);
      }

      if (pdf) setPreview(pdf);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Relatórios</h1>
      <p className="page-subtitle">Selecione o tipo de relatório e o período para gerar o PDF.</p>

      <ErrorBanner message={error} />

      <div className="reports-layout">
        <section className="card">
          <h2 className="card-title">Tipo de Relatório</h2>
          <p className="card-sub">Escolha uma categoria</p>
          <div className="report-type-grid">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={'report-type-card' + (reportType === r.key ? ' selected' : '')}
                onClick={() => setReportType(r.key)}
              >
                <b>{r.label}</b>
                <span>{r.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Período</h2>
          <p className="card-sub">Intervalo de datas do relatório</p>
          <div className="period-options">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={'period-option' + (period === p.key ? ' selected' : '')}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="form-grid" style={{ marginTop: 14, gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label>Data Inicial</label>
                <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="field">
                <label>Data Final</label>
                <input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary" disabled={!canVisualize || loading} onClick={onVisualizar}>
          {loading ? 'Gerando…' : 'Visualizar Relatório'}
        </button>
      </div>

      {preview && <PdfPreviewModal pdf={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
