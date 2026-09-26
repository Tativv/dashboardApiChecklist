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

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const REPORT_ICON_PATHS = {
  hotel:
    'M3 21h18M5 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17M15 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12M8 6h1M11 6h1M8 10h1M11 10h1M8 14h1M11 14h1',
  checklist: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  phone:
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  chart: 'M3 3v18h18M8 17V10M13 17V6M18 17v-4',
  users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
} as const;

const REPORT_TYPES: { key: ReportTypeKey; label: string; description: string; icon: string; bg: string; color: string }[] = [
  {
    key: 'operacional-geral',
    label: 'Operacional Geral',
    description: 'Visão consolidada da operação no período.',
    icon: REPORT_ICON_PATHS.hotel,
    bg: '#def7ec',
    color: '#16794e'
  },
  {
    key: 'checklists',
    label: 'Checklists',
    description: 'Volume e cumprimento de checklists por dia.',
    icon: REPORT_ICON_PATHS.checklist,
    bg: '#e9efff',
    color: '#3766f5'
  },
  {
    key: 'ordens-servico',
    label: 'Ordens de Serviço',
    description: 'Ordens atrasadas e em execução.',
    icon: REPORT_ICON_PATHS.wrench,
    bg: '#fff4d6',
    color: '#9a6700'
  },
  {
    key: 'chamados',
    label: 'Chamados',
    description: 'Chamados por prioridade, área e responsável.',
    icon: REPORT_ICON_PATHS.phone,
    bg: '#f0ecff',
    color: '#5b3fd6'
  },
  {
    key: 'desempenho-area',
    label: 'Desempenho por Área',
    description: 'Cumprimento de checklists por área.',
    icon: REPORT_ICON_PATHS.chart,
    bg: '#e0f7fa',
    color: '#0e7490'
  },
  {
    key: 'produtividade',
    label: 'Produtividade de Colaboradores',
    description: 'Indicadores de desempenho da equipe.',
    icon: REPORT_ICON_PATHS.users,
    bg: '#fce7f3',
    color: '#be185d'
  }
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
                <div className="report-type-card-top">
                  <span className="report-type-icon" style={{ background: r.bg, color: r.color }}>
                    <Icon path={r.icon} size={17} />
                  </span>
                  <span className="report-type-radio" aria-hidden="true">
                    <i />
                  </span>
                </div>
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
