'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAreas } from '@/features/areas/hooks';
import { useDashboardReport, useByAreaReport } from '@/features/reports/hooks';
import { useCalls } from '@/features/calls/hooks';
import { useInstances, useInstance } from '@/features/checklist-instances/hooks';
import { useUsers } from '@/features/users/hooks';
import { todayIso, formatDate, formatDateTime } from '@/lib/format';
import { CallDetailModal, statusLabel as CALL_STATUS_LABEL, statusClass as CALL_STATUS_CLASS } from '../calls/shared';
import type { ChecklistTaskExecutionDto } from '@/types/api';
import {
  buildControlCenterData,
  SECTOR_STATUS_LABEL,
  SECTOR_STATUS_COLOR,
  type AreaMetrics,
  type ServiceOrder,
  type OpenCall,
  type ActivityEvent,
  type SectorStatus,
  type MockPriority,
  type RealAreaChecklistStat
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
  close: 'M18 6L6 18M6 6l12 12',
  area: 'M12 21s7-7.09 7-12a7 7 0 0 0-14 0c0 4.91 7 12 7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  hotel:
    'M3 21h18M5 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17M15 21V9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12M8 6h1M11 6h1M8 10h1M11 10h1M8 14h1M11 14h1'
} as const;

const AREA_ICON_PATHS = {
  utensils: 'M6 2v6a2 2 0 0 0 4 0V2M8 8v14M17 2c-1.5 1-2 3-2 5s.5 3 2 4v9',
  waves: 'M2 6c1 1 2 1 3 1s2-1 3-1 2 1 3 1 2-1 3-1 2 1 3 1 2-1 3-1M2 12c1 1 2 1 3 1s2-1 3-1 2 1 3 1 2-1 3-1 2 1 3 1 2-1 3-1M2 18c1 1 2 1 3 1s2-1 3-1 2 1 3 1 2-1 3-1 2 1 3 1 2-1 3-1',
  bed: 'M2 4v16M2 12h20v8M2 12V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4M14 12V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  leaf: 'M4 20c8 0 16-4 16-16-8 0-16 6-16 16zM8 16c2-2 6-6 12-12',
  shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  dumbbell: 'M4 9v6M20 9v6M2 11v2M22 11v2M6 12h12',
  car: 'M3 17h1a2 2 0 0 0 4 0h8a2 2 0 0 0 4 0h1v-4l-2-5H5L3 13zM7 10h10'
} as const;

const AREA_ICON_RULES: { keywords: string[]; path: string; bg: string; color: string }[] = [
  { keywords: ['cozinha', 'alimento', 'bebida', 'restaurante', 'bar'], path: AREA_ICON_PATHS.utensils, bg: '#fff4d6', color: '#9a6700' },
  { keywords: ['piscina', 'lazer', 'spa', 'wellness'], path: AREA_ICON_PATHS.waves, bg: '#e0f7fa', color: '#0e7490' },
  { keywords: ['governan', 'housekeeping', 'quarto', 'apartamento'], path: AREA_ICON_PATHS.bed, bg: '#f0ecff', color: '#5b3fd6' },
  { keywords: ['recep', 'concierge'], path: AREA_ICON_PATHS.bell, bg: '#e9efff', color: '#3766f5' },
  { keywords: ['manuten', 'eletric', 'hidraul', 'engenharia'], path: ICONS.wrench, bg: '#fff4d6', color: '#9a6700' },
  { keywords: ['jardim', 'paisag', 'externa', 'externo'], path: AREA_ICON_PATHS.leaf, bg: '#def7ec', color: '#16794e' },
  { keywords: ['seguran'], path: AREA_ICON_PATHS.shield, bg: '#ffebe9', color: '#c43c35' },
  { keywords: ['academia', 'fitness', 'ginasio'], path: AREA_ICON_PATHS.dumbbell, bg: '#e9efff', color: '#3766f5' },
  { keywords: ['estacionamento', 'garagem'], path: AREA_ICON_PATHS.car, bg: '#f1f3f7', color: '#475467' }
];

function areaIcon(name: string): { path: string; bg: string; color: string } {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const rule = AREA_ICON_RULES.find((r) => r.keywords.some((k) => normalized.includes(k)));
  return rule ?? { path: ICONS.area, bg: '#eef1f6', color: '#475467' };
}

function shiftDateIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
          Distribuição por área disponível na seção "Desempenho por áreas". Dados reais do relatório de checklists de
          hoje.
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

function AreaChecklistTaskRow({ task, userNameById }: { task: ChecklistTaskExecutionDto; userNameById: Map<string, string> }) {
  const isDone = task.status === 'Completed' || task.status === 'Reviewed';
  const isTaskOverdue = !isDone && !!task.scheduledForUtc && new Date(task.scheduledForUtc).getTime() < Date.now();
  const responsibleId = task.executedByUserId ?? task.assignedUserId ?? null;
  const responsibleName = responsibleId ? (userNameById.get(responsibleId) ?? 'Não identificado') : 'Não designado';

  return (
    <div className="list-card">
      <div className="list-card-top">
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={'cc-task-checkbox' + (isDone ? ' done' : '')}>{isDone && <Icon path={ICONS.checklist} size={11} />}</span>
          <span className="list-card-title" style={{ fontWeight: isDone ? 500 : 600 }}>
            {task.taskName}
          </span>
        </span>
      </div>
      {isTaskOverdue && (
        <div className="list-card-meta" style={{ marginTop: 8 }}>
          <span className="status overdue">Atrasada</span>
          <span>Responsável: {responsibleName}</span>
        </div>
      )}
    </div>
  );
}

function AreaChecklistInstanceCard({
  instanceId,
  templateName,
  assetName,
  userNameById
}: {
  instanceId: string;
  templateName: string;
  assetName: string;
  userNameById: Map<string, string>;
}) {
  const detail = useInstance(instanceId);
  const tasks = [...(detail.data?.taskExecutions ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>{templateName}</b>
        <span className="muted" style={{ fontSize: 12 }}>
          {assetName}
        </span>
      </div>
      {detail.isLoading && <p className="muted" style={{ fontSize: 12 }}>Carregando…</p>}
      <div className="card-list">
        {tasks.map((t) => (
          <AreaChecklistTaskRow key={t.id} task={t} userNameById={userNameById} />
        ))}
      </div>
    </div>
  );
}

function AreaChecklistsTab({ areaId }: { areaId: string }) {
  const today = todayIso();
  const instancesQuery = useInstances({ areaId, fromDate: today, toDate: today });
  const usersQuery = useUsers({ active: true });
  const userNameById = useMemo(() => new Map((usersQuery.data ?? []).map((u) => [u.id, u.name])), [usersQuery.data]);
  const instances = instancesQuery.data ?? [];

  return (
    <div style={{ marginTop: 16 }}>
      {instancesQuery.isLoading && <p className="muted" style={{ fontSize: 13 }}>Carregando…</p>}
      {!instancesQuery.isLoading && instances.length === 0 && (
        <div className="card empty">Nenhum checklist programado para hoje nesta área.</div>
      )}
      <div style={{ display: 'grid', gap: 20 }}>
        {instances.map((i) => (
          <AreaChecklistInstanceCard key={i.id} instanceId={i.id} templateName={i.templateName} assetName={i.assetName} userNameById={userNameById} />
        ))}
      </div>
    </div>
  );
}

const AREA_NAMES_WITHOUT_CALL_LIST = ['manutencao', 'governanca'];

function normalizeAreaName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function AreaCallsTab({ area, onViewCall }: { area: AreaMetrics; onViewCall: (id: string) => void }) {
  const callsQuery = useCalls({ areaId: area.areaId });
  const showRealList = !AREA_NAMES_WITHOUT_CALL_LIST.includes(normalizeAreaName(area.areaName));

  if (!showRealList) {
    return (
      <div style={{ marginTop: 16 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          {area.openCalls} chamado(s) em aberto nesta área.
        </p>
        {area.openCalls === 0 && <div className="card empty">Nenhum chamado em aberto nesta área.</div>}
      </div>
    );
  }

  const calls = (callsQuery.data ?? []).filter((c) => c.status !== 'Finished');

  return (
    <div style={{ marginTop: 16 }}>
      {callsQuery.isLoading && <p className="muted" style={{ fontSize: 13 }}>Carregando…</p>}
      {!callsQuery.isLoading && calls.length === 0 && <div className="card empty">Nenhum chamado em aberto nesta área.</div>}
      {calls.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Aberto por</th>
                <th>Status</th>
                <th>Prioridade</th>
                <th>Aberto em</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="cc-row" onClick={() => onViewCall(c.id)}>
                  <td>
                    <b>{c.subject}</b>
                  </td>
                  <td className="muted">{c.createdByUserName}</td>
                  <td>
                    <span className={'status ' + CALL_STATUS_CLASS[c.status]}>{CALL_STATUS_LABEL[c.status]}</span>
                  </td>
                  <td>
                    <span className={'status ' + (c.priority === 'Alta' ? 'overdue' : c.priority === 'Media' ? 'progress' : 'ready')}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="muted">{formatDateTime(c.createdAtUtc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AreaDetailModal({ area, onClose, onViewCall }: { area: AreaMetrics; onClose: () => void; onViewCall: (id: string) => void }) {
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

      {tab === 'Checklists' && <AreaChecklistsTab areaId={area.areaId} />}

      {tab === 'Ordens de Serviço' && (
        <div style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {area.overdueServiceOrders} ordem(ns) de serviço atrasada(s) nesta área.
          </p>
          {area.overdueServiceOrders === 0 && <div className="card empty">Nenhuma ordem atrasada nesta área.</div>}
        </div>
      )}

      {tab === 'Chamados' && <AreaCallsTab area={area} onViewCall={onViewCall} />}

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

function AllAreasModal({ areas, onSelect, onClose }: { areas: AreaMetrics[]; onSelect: (a: AreaMetrics) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const filtered = term ? areas.filter((a) => a.areaName.toLowerCase().includes(term)) : areas;

  return (
    <ModalShell title="Todas as áreas" subtitle={`${areas.length} áreas configuradas`} onClose={onClose} maxWidth={780}>
      <input
        type="search"
        className="search"
        placeholder="Buscar área…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 16 }}
      />
      {filtered.length === 0 && <div className="card empty">Nenhuma área encontrada.</div>}
      <div className="cc-area-grid">
        {filtered.map((a) => {
          const icon = areaIcon(a.areaName);
          return (
            <button type="button" className="cc-area-card" key={a.areaId} onClick={() => onSelect(a)}>
              <Gauge percent={a.complianceRate} status={a.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="cc-area-card-top">
                  <span className="list-card-title" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="cc-area-card-v-icon" style={{ background: icon.bg, color: icon.color }}>
                      <Icon path={icon.path} size={12} />
                    </span>
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
          );
        })}
      </div>
    </ModalShell>
  );
}


function ActivityHistoryModal({
  events,
  onSelect,
  onClose
}: {
  events: ActivityEvent[];
  onSelect: (ev: ActivityEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Histórico de atividade" subtitle={`${events.length} eventos`} onClose={onClose}>
      <div className="timeline">
        {events.map((ev) => {
          const { path, color } = activityIconAndColor(ev.type);
          return (
            <button type="button" key={ev.id} className="cc-activity-item" onClick={() => onSelect(ev)}>
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
    </ModalShell>
  );
}

export function ControlCenter() {
  const areasQuery = useAreas();
  const [date, setDate] = useState(todayIso());
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [openKpi, setOpenKpi] = useState<KpiKind | null>(null);
  const [openArea, setOpenArea] = useState<AreaMetrics | null>(null);
  const [openServiceOrder, setOpenServiceOrder] = useState<ServiceOrder | null>(null);
  const [openCallId, setOpenCallId] = useState<string | null>(null);
  const [openActivity, setOpenActivity] = useState<ActivityEvent | null>(null);
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [showActivityHistory, setShowActivityHistory] = useState(false);

  const dashboardReportQuery = useDashboardReport({ today: date });
  const byAreaReportQuery = useByAreaReport({ fromDate: shiftDateIso(date, -6), toDate: date });
  const callsQuery = useCalls({});

  const dayLabel = date === todayIso() ? 'hoje' : formatDate(date);

  function onRefresh() {
    areasQuery.refetch();
    dashboardReportQuery.refetch();
    byAreaReportQuery.refetch();
    callsQuery.refetch();
    setLastUpdated(new Date());
  }

  const areaChecklistStats: RealAreaChecklistStat[] = useMemo(
    () =>
      (byAreaReportQuery.data ?? []).map((a) => ({
        areaId: a.areaId,
        complianceRate: a.tasksTotal > 0 ? Math.round(((a.tasksCompleted + a.tasksReviewed) * 100) / a.tasksTotal) : 100,
        pendingChecklists: a.tasksPending
      })),
    [byAreaReportQuery.data]
  );

  const data = useMemo(() => {
    const report = dashboardReportQuery.data;
    return buildControlCenterData(areasQuery.data ?? [], {
      areaChecklistStats,
      calls: callsQuery.data ?? [],
      checklistsSummary: report
        ? {
            totalToday: report.tasksTotal,
            completed: report.tasksCompleted + report.tasksReviewed,
            overdue: (byAreaReportQuery.data ?? []).filter((a) => a.tasksPending > 3).length,
            trendVsYesterday: 0
          }
        : undefined
    });
  }, [areasQuery.data, dashboardReportQuery.data, byAreaReportQuery.data, callsQuery.data, areaChecklistStats]);

  const priorityWeight: Record<MockPriority, number> = { Alta: 3, Media: 2, Baixa: 1 };
  const sortedCalls = useMemo(
    () => [...data.openCalls].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]),
    [data.openCalls]
  );
  const visibleAreas = data.areaMetrics.slice(0, 6);
  const visibleServiceOrders = data.overdueServiceOrders.slice(0, 5);
  const visibleCalls = sortedCalls.slice(0, 5);
  const visibleActivity = data.activity.slice(0, 5);

  const searchParams = useSearchParams();
  useEffect(() => {
    const open = searchParams.get('open');
    if (open === 'checklists' || open === 'serviceOrders' || open === 'calls' || open === 'operation') {
      setOpenKpi(open);
    }
  }, [searchParams]);

  function onActivityClick(ev: ActivityEvent) {
    if (ev.relatedKind === 'serviceOrder') {
      const so = data.serviceOrders.find((s) => s.id === ev.relatedId);
      if (so) return setOpenServiceOrder(so);
    } else if (ev.relatedKind === 'call') {
      const c = data.openCalls.find((c) => c.id === ev.relatedId);
      if (c) return setOpenCallId(c.id);
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
      <div className="cc-header-plain">
        <h1 className="cc-header-title-plain">Centro de Controle Operacional</h1>
      </div>

      <section className="card cc-toolbar-card">
        <div className="cc-toolbar-card-inner">
          <button type="button" className="cc-refresh-inline" onClick={onRefresh} title="Atualizar">
            <Icon path={ICONS.refresh} size={15} />
            <span>
              Atualizado em{' '}
              {lastUpdated.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
          <div className="cc-date-field">
            <label htmlFor="cc-date-input">Ver dados de</label>
            <input id="cc-date-input" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </section>

      <div className="cc-kpi-grid">
        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('checklists')}>
          <div className="cc-kpi-top">
            <div className="cc-kpi-top-left">
              <span className="cc-kpi-icon" style={{ background: '#e9efff', color: '#3766f5' }}>
                <Icon path={ICONS.checklist} />
              </span>
              <span className="cc-kpi-title">Checklists</span>
            </div>
            <span className="cc-kpi-corner-value">{data.checklistsSummary.completionRate}%</span>
          </div>
          <div className="cc-kpi-cols">
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Concluídos</span>
              <b>{data.checklistsSummary.completed}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Pendentes</span>
              <b>{data.checklistsSummary.totalToday - data.checklistsSummary.completed}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Em alerta</span>
              <b>{data.checklistsSummary.overdue}</b>
            </div>
          </div>
          <ProgressBar percent={data.checklistsSummary.completionRate} color="#3766f5" />
          <div className="cc-kpi-total">Total: {data.checklistsSummary.totalToday} para {dayLabel}</div>
        </button>

        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('serviceOrders')}>
          <div className="cc-kpi-top">
            <div className="cc-kpi-top-left">
              <span className="cc-kpi-icon" style={{ background: '#fff4d6', color: '#9a6700' }}>
                <Icon path={ICONS.wrench} />
              </span>
              <span className="cc-kpi-title">Ordens de Serviço</span>
            </div>
            <span className="cc-kpi-corner-value">{data.serviceOrdersSummary.open}</span>
          </div>
          <div className="cc-kpi-cols">
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Em andamento</span>
              <b>{data.serviceOrdersSummary.inProgress}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Atrasadas</span>
              <b>{data.serviceOrdersSummary.overdue}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Concluídas</span>
              <b>{data.serviceOrdersSummary.completedThisWeek}</b>
            </div>
          </div>
          <ProgressBar percent={100 - (data.serviceOrdersSummary.overdue * 100) / Math.max(1, data.serviceOrdersSummary.open)} color="#d97706" />
          <div className="cc-kpi-total">Total: {data.serviceOrdersSummary.open} no mês</div>
        </button>

        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('calls')}>
          <div className="cc-kpi-top">
            <div className="cc-kpi-top-left">
              <span className="cc-kpi-icon" style={{ background: '#f0ecff', color: '#5b3fd6' }}>
                <Icon path={ICONS.phone} />
              </span>
              <span className="cc-kpi-title">Chamados</span>
            </div>
            <span className="cc-kpi-corner-value">{data.callsSummary.open}</span>
          </div>
          <div className="cc-kpi-cols">
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Abertos</span>
              <b>{data.callsSummary.open}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Em andamento</span>
              <b>{data.callsSummary.inProgress}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Finalizados</span>
              <b>{data.callsSummary.closedThisWeek}</b>
            </div>
          </div>
          <ProgressBar percent={Math.max(10, 100 - data.callsSummary.open * 8)} color="#7c3aed" />
          <div className="cc-kpi-total">Total: {data.callsSummary.open} no mês</div>
        </button>

        <button type="button" className="cc-kpi-card" onClick={() => setOpenKpi('operation')}>
          <div className="cc-kpi-top">
            <div className="cc-kpi-top-left">
              <span className="cc-kpi-icon" style={{ background: '#def7ec', color: '#16794e' }}>
                <Icon path={ICONS.hotel} />
              </span>
              <span className="cc-kpi-title">Operação Geral</span>
            </div>
            <span className="cc-kpi-corner-value">{data.operationSummary.healthScore}%</span>
          </div>
          <div className="cc-kpi-cols">
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Setores normais</span>
              <b>
                {data.operationSummary.sectorsNormal}/{data.operationSummary.sectorsTotal}
              </b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Alertas críticos</span>
              <b>{data.operationSummary.criticalAlerts}</b>
            </div>
            <div className="cc-kpi-col">
              <span className="cc-kpi-col-label">Online</span>
              <b>{data.operationSummary.staffOnline}</b>
            </div>
          </div>
          <ProgressBar percent={data.operationSummary.healthScore} color="#16a34a" />
          <div className="cc-kpi-total">Total: {data.operationSummary.sectorsTotal} setores monitorados</div>
        </button>
      </div>

      <div className="cc-desempenho-grid" style={{ marginTop: 26 }}>
        <section className="card cc-desempenho-card">
          <div className="cc-card-header-row">
            <h2 className="card-title" style={{ margin: 0 }}>
              Desempenho por áreas
            </h2>
            {data.areaMetrics.length > 6 && (
              <button type="button" className="cc-link-btn" onClick={() => setShowAllAreas(true)}>
                Ver todas as áreas
              </button>
            )}
          </div>
          {areasQuery.isLoading && <p className="muted" style={{ fontSize: 13 }}>Carregando áreas…</p>}
          {!areasQuery.isLoading && data.areaMetrics.length === 0 && (
            <div className="card empty">
              Nenhuma área configurada ainda.{' '}
              <Link href="/areas" className="cc-link-btn" style={{ display: 'inline' }}>
                Configurar áreas
              </Link>
            </div>
          )}
          <div className="cc-area-grid-v">
            {visibleAreas.map((a) => {
              const icon = areaIcon(a.areaName);
              return (
                <button type="button" className="cc-area-card-v" key={a.areaId} onClick={() => setOpenArea(a)}>
                  <div className="cc-area-card-v-head">
                    <span className="cc-area-card-v-icon" style={{ background: icon.bg, color: icon.color }}>
                      <Icon path={icon.path} size={13} />
                    </span>
                    <span>{a.areaName}</span>
                  </div>
                  <Gauge percent={a.complianceRate} status={a.status} />
                  <div className="cc-area-card-v-status">
                    <i style={{ background: SECTOR_STATUS_COLOR[a.status] }} />
                    <span>{SECTOR_STATUS_LABEL[a.status]}</span>
                  </div>
                  <div className="cc-area-card-v-stats">
                    <span>{a.pendingChecklists} pendentes</span>
                    <span>{a.overdueServiceOrders} O.S. atrasadas</span>
                    <span>{a.openCalls} chamados abertos</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card cc-sectors-card">
          <h2 className="card-title" style={{ margin: 0 }}>
            Status dos Setores
          </h2>
          <div className="cc-sectors-donut-wrap">
            <div className="cc-donut" style={{ background: donutBackground }}>
              <div className="cc-donut-inner">
                <b>{data.operationSummary.sectorsTotal}</b>
                <span>setores</span>
              </div>
            </div>
          </div>
          <div className="cc-sectors-legend-v">
            {(['Normal', 'Atencao', 'Critico'] as SectorStatus[]).map((status) => {
              const count = data.areaMetrics.filter((a) => a.status === status).length;
              return (
                <div key={status} className="cc-sectors-legend-item">
                  <i style={{ background: SECTOR_STATUS_COLOR[status] }} />
                  <span>{SECTOR_STATUS_LABEL[status]}</span>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="cc-bottom-grid-3" style={{ marginTop: 20 }}>
        <section className="card cc-bottom-card">
          <div className="cc-card-header-row">
            <h2 className="card-title">Ordens de Serviço</h2>
            <Link href="/service-orders" className="cc-link-btn">
              Ver Todas
            </Link>
          </div>
          <div className="table-wrap cc-bottom-card-body">
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
                {visibleServiceOrders.map((o) => (
                  <tr key={o.id} className="cc-row" onClick={() => setOpenServiceOrder(o)}>
                    <td>
                      <b>{o.description}</b>
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

        <section className="card cc-bottom-card">
          <div className="cc-card-header-row">
            <h2 className="card-title">Chamados em aberto</h2>
            <Link href="/calls" className="cc-link-btn">
              Ver todos
            </Link>
          </div>
          <div className="table-wrap cc-bottom-card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {visibleCalls.map((c) => (
                  <tr key={c.id} className="cc-row" onClick={() => setOpenCallId(c.id)}>
                    <td>
                      <b>{c.subject}</b>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {c.areaName}
                      </div>
                    </td>
                    <td>
                      <span className={'status ' + CALL_STATUS_CLASS[c.status]}>{CALL_STATUS_LABEL[c.status]}</span>
                    </td>
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

        <section className="card cc-bottom-card">
          <div className="cc-card-header-row">
            <div>
              <h2 className="card-title">Atividade Recente</h2>
              <p className="card-sub">Últimos eventos de todos os módulos</p>
            </div>
            {data.activity.length > 5 && (
              <button type="button" className="cc-link-btn" onClick={() => setShowActivityHistory(true)}>
                Ver histórico
              </button>
            )}
          </div>
          <div className="timeline cc-bottom-card-body">
            {visibleActivity.map((ev) => {
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
      </div>

      {openKpi && <KpiDetailModal kind={openKpi} data={data} onClose={() => setOpenKpi(null)} />}
      {openArea && (
        <AreaDetailModal
          area={openArea}
          onClose={() => setOpenArea(null)}
          onViewCall={(id) => {
            setOpenArea(null);
            setOpenCallId(id);
          }}
        />
      )}
      {openServiceOrder && <ServiceOrderDetailModal order={openServiceOrder} onClose={() => setOpenServiceOrder(null)} />}
      {openCallId && <CallDetailModal id={openCallId} onClose={() => setOpenCallId(null)} />}
      {openActivity && <ActivityDetailModal event={openActivity} onClose={() => setOpenActivity(null)} />}
      {showAllAreas && (
        <AllAreasModal
          areas={data.areaMetrics}
          onSelect={(a) => {
            setShowAllAreas(false);
            setOpenArea(a);
          }}
          onClose={() => setShowAllAreas(false)}
        />
      )}
      {showActivityHistory && (
        <ActivityHistoryModal
          events={data.activity}
          onSelect={(ev) => {
            setShowActivityHistory(false);
            onActivityClick(ev);
          }}
          onClose={() => setShowActivityHistory(false)}
        />
      )}
    </div>
  );
}
