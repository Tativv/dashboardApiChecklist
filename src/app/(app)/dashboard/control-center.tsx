'use client';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useAreas } from '@/features/areas/hooks';
import { roleLabel } from '@/components/ui/status-badge';
import { todayIso } from '@/lib/format';
import {
  buildControlCenterData,
  SECTOR_STATUS_LABEL,
  SECTOR_STATUS_COLOR,
  type AreaMetrics,
  type ServiceOrder,
  type OpenCall,
  type ActivityEvent,
  type SectorStatus
} from '@/features/control-center/mock';

type KpiKind = 'checklists' | 'serviceOrders' | 'calls' | 'operation';

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  checklist: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  gauge: 'M12 2v4M4.93 4.93l2.83 2.83M2 12h4M2.85 15.5l3.68-1.36M12 8a5 5 0 1 0 4.9 6H16a4 4 0 1 0-4-4z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  chevron: 'M9 18l6-6-6-6',
  clock: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 5v5l4 2',
  close: 'M18 6L6 18M6 6l12 12'
} as const;

function activityIconAndColor(type: ActivityEvent['type']): { path: string; color: string } {
  switch (type) {
    case 'checklist_finished':
    case 'checklist_reviewed':
      return { path: ICONS.checklist, color: '#3766f5' };
    case 'service_order_started':
    case 'service_order_finished':
      return { path: ICONS.wrench, color: '#d97706' };
    case 'call_opened':
    case 'call_closed':
      return { path: ICONS.phone, color: '#7c3aed' };
  }
}

function ProgressBar({ percent, color = 'var(--blue)' }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="cc-progress">
      <div className="cc-progress-fill" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

function Gauge({ percent, status }: { percent: number; status: SectorStatus }) {
  const color = SECTOR_STATUS_COLOR[status];
  return (
    <div
      className="cc-gauge"
      style={{ background: `conic-gradient(${color} ${percent * 3.6}deg, #edf0f5 0deg)` }}
    >
      <div className="cc-gauge-inner">
        <b>{percent}%</b>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SectorStatus }) {
  return (
    <span className="cc-status-pill" style={{ color: SECTOR_STATUS_COLOR[status], background: SECTOR_STATUS_COLOR[status] + '1a' }}>
      {SECTOR_STATUS_LABEL[status]}
    </span>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 640
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          <button type="button" className="modal-close" onClick={onClose} title="Fechar">
            <Icon path={ICONS.close} size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiDetailModal({ kind, data, onClose }: { kind: KpiKind; data: ReturnType<typeof buildControlCenterData>; onClose: () => void }) {
  if (kind === 'checklists') {
    const s = data.checklistsSummary;
    return (
      <ModalShell title="Checklists — visão geral" subtitle="Todas as áreas · hoje" onClose={onClose}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="kpi-label">Total programados</div>
            <div className="kpi-value">{s.totalToday}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Taxa de conclusão</div>
            <div className="kpi-value">{s.completionRate}%</div>
          </div>
          <div className="card">
            <div className="kpi-label">Concluídos</div>
            <div className="kpi-value">{s.completed}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Áreas com pendências críticas</div>
            <div className="kpi-value">{s.overdue}</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Distribuição por área disponível na seção "Desempenho por áreas". Dados de demonstração — serão substituídos
          pelo relatório real de checklists por data/área.
        </p>
      </ModalShell>
    );
  }

  if (kind === 'serviceOrders') {
    const s = data.serviceOrdersSummary;
    return (
      <ModalShell title="Ordens de Serviço — visão geral" subtitle="Todas as áreas" onClose={onClose}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="kpi-label">Abertas</div>
            <div className="kpi-value">{s.open}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Em andamento</div>
            <div className="kpi-value">{s.inProgress}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Concluídas (semana)</div>
            <div className="kpi-value">{s.completedThisWeek}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Atrasadas</div>
            <div className="kpi-value">{s.overdue}</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Tempo médio de resolução: <b>{s.avgResolutionHours}h</b>. Veja a lista completa na tabela "Ordens de Serviço
          atrasadas". Módulo ainda não existe no backend — estrutura pronta para integração futura.
        </p>
      </ModalShell>
    );
  }

  if (kind === 'calls') {
    const s = data.callsSummary;
    return (
      <ModalShell title="Chamados — visão geral" subtitle="Todas as áreas" onClose={onClose}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="kpi-label">Em aberto</div>
            <div className="kpi-value">{s.open}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Em andamento</div>
            <div className="kpi-value">{s.inProgress}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Prioridade alta</div>
            <div className="kpi-value">{s.highPriority}</div>
          </div>
          <div className="card">
            <div className="kpi-label">Tempo médio de resposta</div>
            <div className="kpi-value">{s.avgResponseMinutes} min</div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Veja a lista completa na tabela "Chamados em aberto" abaixo.
        </p>
      </ModalShell>
    );
  }

  const s = data.operationSummary;
  return (
    <ModalShell title="Operação Geral" subtitle="Panorama consolidado do resort" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card">
          <div className="kpi-label">Índice de saúde operacional</div>
          <div className="kpi-value">{s.healthScore}%</div>
        </div>
        <div className="card">
          <div className="kpi-label">Setores normais</div>
          <div className="kpi-value">
            {s.sectorsNormal}/{s.sectorsTotal}
          </div>
        </div>
        <div className="card">
          <div className="kpi-label">Alertas críticos</div>
          <div className="kpi-value">{s.criticalAlerts}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Colaboradores online</div>
          <div className="kpi-value">{s.staffOnline}</div>
        </div>
      </div>
    </ModalShell>
  );
}

const AREA_TABS = ['Resumo', 'Checklists', 'Ordens de Serviço', 'Chamados', 'Histórico'] as const;
type AreaTab = (typeof AREA_TABS)[number];

function AreaDetailModal({ area, onClose }: { area: AreaMetrics; onClose: () => void }) {
  const [tab, setTab] = useState<AreaTab>('Resumo');

  return (
    <ModalShell title={area.areaName} subtitle="Visão operacional da área" onClose={onClose} maxWidth={720}>
      <div className="cc-tabs">
        {AREA_TABS.map((t) => (
          <button key={t} type="button" className={'cc-tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resumo' && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          <Gauge percent={area.complianceRate} status={area.status} />
          <div style={{ display: 'grid', gap: 10, flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Status geral</span>
              <StatusPill status={area.status} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Checklists pendentes</span>
              <b>{area.pendingChecklists}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Chamados abertos</span>
              <b>{area.openCalls}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">Ordens de serviço atrasadas</span>
              <b>{area.overdueServiceOrders}</b>
            </div>
          </div>
        </div>
      )}

      {tab === 'Checklists' && (
        <div style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {area.pendingChecklists} checklist(s) pendente(s) nesta área hoje.
          </p>
          <div className="card-list">
            {Array.from({ length: Math.max(1, area.pendingChecklists) }).map((_, i) => (
              <div className="list-card" key={i}>
                <div className="list-card-top">
                  <span className="list-card-title">Checklist diário — Setor {area.areaName}</span>
                  <span className="status pending">Pendente</span>
                </div>
                <div className="list-card-meta" style={{ marginTop: 8 }}>
                  <span>Turno {i % 2 === 0 ? 'manhã' : 'tarde'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Ordens de Serviço' && (
        <div style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {area.overdueServiceOrders} ordem(ns) de serviço atrasada(s) nesta área.
          </p>
          {area.overdueServiceOrders === 0 && <div className="card empty">Nenhuma ordem atrasada nesta área.</div>}
        </div>
      )}

      {tab === 'Chamados' && (
        <div style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {area.openCalls} chamado(s) em aberto nesta área.
          </p>
          {area.openCalls === 0 && <div className="card empty">Nenhum chamado em aberto nesta área.</div>}
        </div>
      )}

      {tab === 'Histórico' && (
        <div className="timeline" style={{ marginTop: 16 }}>
          <div className="timeline-item event">
            <span className="timeline-dot" />
            <div className="timeline-text">Índice de cumprimento atingiu {area.complianceRate}% nos últimos 7 dias.</div>
            <div className="timeline-meta">
              <span>Atualizado automaticamente</span>
            </div>
          </div>
          <div className="timeline-item event">
            <span className="timeline-dot" />
            <div className="timeline-text">Última auditoria de área concluída sem pendências críticas.</div>
            <div className="timeline-meta">
              <span>há 5 dias</span>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function ServiceOrderDetailModal({ order, onClose }: { order: ServiceOrder; onClose: () => void }) {
  return (
    <ModalShell title={order.description} subtitle={`${order.assetName} · ${order.areaName}`} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Responsável
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{order.responsibleName}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Prioridade
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{order.priority}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Última execução
          </div>
          <div style={{ fontSize: 14, marginTop: 2 }}>{order.lastExecutionLabel}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            Próxima execução
          </div>
          <div style={{ fontSize: 14, marginTop: 2, color: '#c43c35', fontWeight: 600 }}>{order.nextExecutionLabel}</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Motivo do atraso
        </div>
        <p style={{ fontSize: 14, marginTop: 4 }}>{order.overdueReason}</p>
      </div>
      <div style={{ marginTop: 18 }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
          Histórico
        </div>
        <div className="timeline">
          {order.history.map((h, i) => (
            <div className="timeline-item event" key={i}>
              <span className="timeline-dot" />
              <div className="timeline-text">{h.event}</div>
              <div className="timeline-meta">
                <span>{h.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function CallMockDetailModal({ call, onClose }: { call: OpenCall; onClose: () => void }) {
  const [comments, setComments] = useState(call.comments);
  const [text, setText] = useState('');

  function addComment() {
    if (!text.trim()) return;
    setComments((prev) => [...prev, { author: 'Você', timeLabel: 'agora', text: text.trim() }]);
    setText('');
  }

  return (
    <ModalShell title={call.subject} subtitle={`${call.areaFrom} → ${call.areaTo}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span className="status overdue">{call.priority}</span>
        <span className="status progress">Aberto há {call.timeOpenLabel}</span>
      </div>
      <div className="timeline">
        {comments.map((c, i) => (
          <div className="timeline-item comment" key={i}>
            <span className="timeline-dot" />
            <div className="timeline-text">&quot;{c.text}&quot;</div>
            <div className="timeline-meta">
              <b>{c.author}</b>
              <span>·</span>
              <span>{c.timeLabel}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adicionar um comentário (demonstração local)…"
          rows={2}
          style={{ width: '100%', resize: 'vertical' }}
        />
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={addComment} disabled={!text.trim()}>
            Comentar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ActivityDetailModal({ event, onClose }: { event: ActivityEvent; onClose: () => void }) {
  return (
    <ModalShell title={event.title} subtitle={`${event.areaName} · ${event.timeLabel}`} onClose={onClose}>
      <p className="muted" style={{ fontSize: 13 }}>
        Evento de demonstração — quando o módulo correspondente estiver conectado, este card abrirá o checklist real
        relacionado.
      </p>
    </ModalShell>
  );
}

export function ControlCenter() {
  const user = useAuthStore((s) => s.user);
  const areasQuery = useAreas();
  const [date, setDate] = useState(todayIso());
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [openKpi, setOpenKpi] = useState<KpiKind | null>(null);
  const [openArea, setOpenArea] = useState<AreaMetrics | null>(null);
  const [openServiceOrder, setOpenServiceOrder] = useState<ServiceOrder | null>(null);
  const [openCall, setOpenCall] = useState<OpenCall | null>(null);
  const [openActivity, setOpenActivity] = useState<ActivityEvent | null>(null);

  const data = useMemo(() => buildControlCenterData(areasQuery.data ?? []), [areasQuery.data]);

  function onActivityClick(ev: ActivityEvent) {
    if (ev.relatedKind === 'serviceOrder') {
      const so = data.serviceOrders.find((s) => s.id === ev.relatedId);
      if (so) return setOpenServiceOrder(so);
    } else if (ev.relatedKind === 'call') {
      const c = data.openCalls.find((c) => c.id === ev.relatedId);
      if (c) return setOpenCall(c);
    }
    setOpenActivity(ev);
  }

  const donutBackground = `conic-gradient(
    ${SECTOR_STATUS_COLOR.Normal} 0 ${(data.operationSummary.sectorsNormal / Math.max(1, data.operationSummary.sectorsTotal)) * 360}deg,
    ${SECTOR_STATUS_COLOR.Atencao} 0 ${((data.operationSummary.sectorsNormal + data.areaMetrics.filter((a) => a.status === 'Atencao').length) / Math.max(1, data.operationSummary.sectorsTotal)) * 360}deg,
    ${SECTOR_STATUS_COLOR.Critico} 0 360deg
  )`;

  return (
    <div className="page cc-page">
      <div className="cc-header">
        <div>
          <div className="cc-header-eyebrow">Vale Suíço Resort</div>
          <h1 className="cc-header-title">Centro de Controle Operacional</h1>
        </div>
        <div className="cc-header-controls">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="cc-header-user">
            <span className="avatar">{user?.name ? user.name.slice(0, 2).toUpperCase() : 'DI'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name ?? 'Diretoria'}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{user ? roleLabel(user.role) : 'Diretoria'}</div>
            </div>
          </div>
          <button
            type="button"
            className="cc-refresh-btn"
            onClick={() => setLastUpdated(new Date())}
            title="Atualizar"
          >
            <Icon path={ICONS.refresh} size={14} />
            <span>
              Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        </div>
      </div>

      <div className="cc-kpi-grid">
        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('checklists')}>
          <div className="cc-kpi-top">
            <span className="cc-kpi-icon" style={{ background: '#e9efff', color: '#3766f5' }}>
              <Icon path={ICONS.checklist} />
            </span>
            <span className={'cc-kpi-trend ' + (data.checklistsSummary.trendVsYesterday >= 0 ? 'up' : 'down')}>
              {data.checklistsSummary.trendVsYesterday >= 0 ? '+' : ''}
              {data.checklistsSummary.trendVsYesterday}% vs ontem
            </span>
          </div>
          <div className="cc-kpi-title">Checklists</div>
          <div className="cc-kpi-value">{data.checklistsSummary.completionRate}%</div>
          <ProgressBar percent={data.checklistsSummary.completionRate} color="#3766f5" />
          <div className="cc-kpi-foot">
            <span>
              {data.checklistsSummary.completed}/{data.checklistsSummary.totalToday} concluídos hoje
            </span>
            {data.checklistsSummary.overdue > 0 && <span className="cc-kpi-alert">{data.checklistsSummary.overdue} áreas em alerta</span>}
          </div>
        </button>

        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('serviceOrders')}>
          <div className="cc-kpi-top">
            <span className="cc-kpi-icon" style={{ background: '#fff4d6', color: '#9a6700' }}>
              <Icon path={ICONS.wrench} />
            </span>
            <span className="cc-kpi-trend down">{data.serviceOrdersSummary.overdue} atrasadas</span>
          </div>
          <div className="cc-kpi-title">Ordens de Serviço</div>
          <div className="cc-kpi-value">{data.serviceOrdersSummary.open}</div>
          <ProgressBar percent={100 - (data.serviceOrdersSummary.overdue * 100) / Math.max(1, data.serviceOrdersSummary.open)} color="#d97706" />
          <div className="cc-kpi-foot">
            <span>{data.serviceOrdersSummary.inProgress} em andamento</span>
            <span>Resolução média {data.serviceOrdersSummary.avgResolutionHours}h</span>
          </div>
        </button>

        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('calls')}>
          <div className="cc-kpi-top">
            <span className="cc-kpi-icon" style={{ background: '#f0ecff', color: '#5b3fd6' }}>
              <Icon path={ICONS.phone} />
            </span>
            {data.callsSummary.highPriority > 0 && <span className="cc-kpi-alert">{data.callsSummary.highPriority} alta prioridade</span>}
          </div>
          <div className="cc-kpi-title">Chamados</div>
          <div className="cc-kpi-value">{data.callsSummary.open}</div>
          <ProgressBar percent={Math.max(10, 100 - data.callsSummary.open * 8)} color="#7c3aed" />
          <div className="cc-kpi-foot">
            <span>{data.callsSummary.inProgress} em atendimento</span>
            <span>Resposta média {data.callsSummary.avgResponseMinutes}min</span>
          </div>
        </button>

        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('operation')}>
          <div className="cc-kpi-top">
            <span className="cc-kpi-icon" style={{ background: '#def7ec', color: '#16794e' }}>
              <Icon path={ICONS.gauge} />
            </span>
            {data.operationSummary.criticalAlerts > 0 && <span className="cc-kpi-alert">{data.operationSummary.criticalAlerts} alertas</span>}
          </div>
          <div className="cc-kpi-title">Operação Geral</div>
          <div className="cc-kpi-value">{data.operationSummary.healthScore}%</div>
          <ProgressBar percent={data.operationSummary.healthScore} color="#16a34a" />
          <div className="cc-kpi-foot">
            <span>
              {data.operationSummary.sectorsNormal}/{data.operationSummary.sectorsTotal} setores normais
            </span>
            <span>{data.operationSummary.staffOnline} colaboradores online</span>
          </div>
        </button>
      </div>

      <h2 className="cc-section-title">Desempenho por áreas</h2>
      <div className="cc-area-grid">
        {data.areaMetrics.map((a) => (
          <button type="button" className="cc-area-card" key={a.areaId} onClick={() => setOpenArea(a)}>
            <Gauge percent={a.complianceRate} status={a.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="cc-area-card-top">
                <span className="list-card-title" style={{ fontSize: 13 }}>
                  {a.areaName}
                </span>
                <StatusPill status={a.status} />
              </div>
              <div className="cc-area-card-stats">
                <span>{a.pendingChecklists} pendentes</span>
                <span>{a.openCalls} chamados</span>
                <span>{a.overdueServiceOrders} O.S. atrasadas</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="cc-bottom-grid" style={{ marginTop: 26 }}>
        <div style={{ display: 'grid', gap: 20 }}>
          <section className="card">
            <h2 className="card-title">Ordens de Serviço atrasadas</h2>
            <p className="card-sub">Priorize pelo maior tempo de atraso</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Ativo</th>
                    <th>Dias em atraso</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueServiceOrders.map((o) => (
                    <tr key={o.id} className="cc-row" onClick={() => setOpenServiceOrder(o)}>
                      <td>
                        <b>{o.description}</b>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {o.areaName}
                        </div>
                      </td>
                      <td className="muted">{o.assetName}</td>
                      <td>
                        <span className="status overdue">{o.daysOverdue}d</span>
                      </td>
                      <td className="muted">{o.responsibleName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Chamados em aberto</h2>
            <p className="card-sub">Toque em um chamado para ver o histórico completo</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>De → Para</th>
                    <th>Tempo aberto</th>
                    <th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openCalls.map((c) => (
                    <tr key={c.id} className="cc-row" onClick={() => setOpenCall(c)}>
                      <td>
                        <b>{c.subject}</b>
                      </td>
                      <td className="muted">
                        {c.areaFrom} → {c.areaTo}
                      </td>
                      <td className="muted">{c.timeOpenLabel}</td>
                      <td>
                        <span className={'status ' + (c.priority === 'Alta' ? 'overdue' : c.priority === 'Media' ? 'progress' : 'ready')}>
                          {c.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="card">
          <h2 className="card-title">Status dos Setores</h2>
          <p className="card-sub">Distribuição geral do resort</p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 18px' }}>
            <div className="cc-donut" style={{ background: donutBackground }}>
              <div className="cc-donut-inner">
                <b>{data.operationSummary.sectorsTotal}</b>
                <span>setores</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(['Normal', 'Atencao', 'Critico'] as SectorStatus[]).map((status) => {
              const count = data.areaMetrics.filter((a) => a.status === status).length;
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: SECTOR_STATUS_COLOR[status], display: 'inline-block' }} />
                  <span style={{ flex: 1 }}>{SECTOR_STATUS_LABEL[status]}</span>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <h2 className="card-title">Atividade Recente</h2>
        <p className="card-sub">Eventos em tempo real de todos os módulos</p>
        <div className="timeline">
          {data.activity.map((ev) => {
            const { path, color } = activityIconAndColor(ev.type);
            return (
              <button type="button" key={ev.id} className="cc-activity-item" onClick={() => onActivityClick(ev)}>
                <span className="cc-activity-icon" style={{ background: color + '1a', color }}>
                  <Icon path={path} size={14} />
                </span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13 }}>{ev.title}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {ev.areaName} · {ev.timeLabel}
                  </div>
                </div>
                <Icon path={ICONS.chevron} size={14} />
              </button>
            );
          })}
        </div>
      </section>

      {openKpi && <KpiDetailModal kind={openKpi} data={data} onClose={() => setOpenKpi(null)} />}
      {openArea && <AreaDetailModal area={openArea} onClose={() => setOpenArea(null)} />}
      {openServiceOrder && <ServiceOrderDetailModal order={openServiceOrder} onClose={() => setOpenServiceOrder(null)} />}
      {openCall && <CallMockDetailModal call={openCall} onClose={() => setOpenCall(null)} />}
      {openActivity && <ActivityDetailModal event={openActivity} onClose={() => setOpenActivity(null)} />}
    </div>
  );
}
